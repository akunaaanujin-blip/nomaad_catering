// ── ЗЭЭЛИЙН БҮРТГЭЛ (авсан / өгсөн), КОМПАНИ ХООРОНД, БАНКНЫ ДАНС ХОЛБОХ ──
// Зээл бүрийн мөнгөн гүйлгээ журналд «#ID» лавлагаатай бичигдэнэ: үндсэн — 3501 (авсан) / 1210 (өгсөн), хүү — 7401 / 5202.

// ── Нийтлэг туслах ──
var _jCache = null;
function Jc() { return _jCache || (_jCache = J()); }   // render бүрт нэг удаа
function hasTag(desc, id) { return !!id && new RegExp('#' + id + '(?![\\w])').test(String(desc || '')); }
function gOpen(html) { $('gBody').innerHTML = html; openSheet('gSheet'); }
function gClose() { closeSheet('gSheet'); }
function cashAccOpts(sel) {
  return ACCOUNTS.filter(function (a) { return a[3] === 'cash'; }).map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === sel ? ' selected' : '') + '>' + esc(accName(a[0])) + '</option>'; }).join('');
}
// Журналын бичилтүүд (туршилтын горимд — энэ төхөөрөмжид)
function postEntries(E, cb) {
  if (!E.length) { if (cb) cb(); return; }
  if (!API_URL) {
    E.forEach(function (e, i) { e.id = 'J' + Date.now() + '-' + i + Math.random().toString(36).slice(2, 5); e.by = ownerName; journal.push(e); });
    save('nb_demo_journal', journal); if (cb) cb(); return;
  }
  post({ type: 'admin_journal', by: ownerName, entries: E }, function (err) { if (err) { if (err !== 'locked') toast('Алдаа: ' + err); return; } if (cb) cb(); });
}

// ═══════════ ЗЭЭЛ ═══════════
function loanList(biz) { return (window.loans || []).filter(function (l) { return l.biz === biz && l.status !== 'Устгасан'; }); }
function loanById(id) { return (window.loans || []).filter(function (l) { return l.id === id; })[0]; }
function loanAcc(L) { return L.kind === 'Авсан' ? '3501' : '1210'; }
function loanIntAcc(L) { return L.kind === 'Авсан' ? '7201' : '5202'; }   // 7201 Санхүүгийн зардал (Baaz)
function loanStat(L, E) {   // got — орсон/олгосон, paid — төлөгдсөн үндсэн, intr — хүү
  var fx = L.biz !== 'mgmt' && lnFx(L);
  if (fx) {   // компанийн тогтмол зардал: төлөлт = #ID-тай зардлын (Дт) бичилт
    var fp = 0, fl = '';
    (E || Jc()).forEach(function (e) { if (hasTag(e.desc, L.id) && e.dr === fx.cat) { fp += e.amount; fl = e.date > fl ? e.date : fl; } });
    return { got: L.amount, paid: r0(fp), intr: 0, left: r0(L.amount - fp), last: fl };
  }
  var acc = loanAcc(L), ia = loanIntAcc(L), got = 0, paid = 0, intr = 0, last = '';
  (E || Jc()).forEach(function (e) {
    if (!hasTag(e.desc, L.id)) return;
    if (e.dr === acc || e.cr === acc) { var v = (e.dr === acc ? 1 : -1) * e.amount * (L.kind === 'Авсан' ? -1 : 1); if (v > 0) got += v; else paid -= v; last = e.date; }
    else if (e.dr === ia || e.cr === ia) { intr += e.amount; last = e.date; }
  });
  return { got: r0(got), paid: r0(paid), intr: r0(intr), left: r0(got - paid), last: last };
}
// Хуваарийн мөр бүрийн төлөв: нийт төлсөн (үндсэн + хүү)-ийг хуваарийн дарааллаар хуваана
function loanSched(L, E) {
  var rows = (L.schedule || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }), s = loanStat(L, E), td = todayStr();
  var paid = s.paid + s.intr, cum = 0, next = null, late = { amt: 0, since: '', n: 0 };
  var out = rows.map(function (r) {
    var t = r0(r.p + r.i), prev = cum; cum = r0(cum + t);
    var cov = Math.max(0, Math.min(t, paid - prev)), left = r0(t - cov);
    var st = left <= 0.5 ? 'paid' : cov > 0.5 ? 'part' : 'open';
    if (st !== 'paid') {
      if (r.d < td) { late.amt += left; late.n++; if (!late.since) late.since = r.d; }
      else if (!next) next = { d: r.d, amt: left };
    }
    return { d: r.d, p: r.p, i: r.i, t: t, left: left, st: st, late: st !== 'paid' && r.d < td };
  });
  late.amt = r0(late.amt); late.days = late.since ? Math.round((new Date(td) - new Date(late.since)) / 864e5) : 0;
  if (!next && late.n) next = { d: late.since, amt: late.amt };
  return { rows: out, next: next, late: late, sumP: r0(rows.reduce(function (a, r) { return a + r.p; }, 0)), sumT: r0(rows.reduce(function (a, r) { return a + r.p + r.i; }, 0)) };
}
// Дараагийн төлөлтийн огноо, хоцорсон хоног: хуваарьтай бол түүгээр; үгүй бол «Төлөх өдөр»-өөр (сүүлийн төлөлтөөс хойшх эхний төлөх өдөр)
function loanNextLate(L, sc, s) {
  if (sc.rows.length) return { next: sc.next ? sc.next.d : '', late: sc.late.n ? sc.late.days : 0 };
  if (!L.payDay) return { next: '', late: 0 };
  var from = s.last && s.last > L.date ? s.last : L.date, f = new Date(from + 'T00:00:00'), d = null, td = todayStr();
  for (var k = 0; k < 600; k++) { d = lnAddMon(f, k, L.payDay); if (Math.round((d - f) / 864e5) > 10) break; }   // 10 хоногоос ойр төлсөн бол тэр сарын төлөлт гэж үзнэ
  var nd = todayStr(d);
  return { next: nd, late: nd < td ? Math.round((new Date(td) - new Date(nd)) / 864e5) : 0 };
}
// Төлбөрийг үндсэн / хүү болгож задлах: хуваарь байвал түүгээр (эхлээд хүү, дараа нь үндсэн), үгүй бол нийт дүнгийн харьцаагаар, эсвэл сарын хүүгээр
function loanSplit(L, X, E) {
  var s = loanStat(L, E), rows = (L.schedule || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }), intr = 0, prin = 0, rem = X;
  if (rows.length) {
    var cI = 0, cP = 0;
    rows.forEach(function (r) {
      var pI = cI, pP = cP; cI += r.i; cP += r.p;
      if (rem <= 0.005) return;
      var ri = Math.max(0, Math.min(r.i, cI - Math.max(s.intr, pI))), rp = Math.max(0, Math.min(r.p, cP - Math.max(s.paid, pP)));
      var a = Math.min(rem, ri); intr += a; rem -= a;
      var b = Math.min(rem, rp); prin += b; rem -= b;
    });
    prin += Math.max(0, rem);   // хуваариас илүү төлсөн — үндсэнд (хугацаанаас өмнө төлөх)
  } else if (L.total > L.amount) {
    var leftI = Math.max(0, L.total - L.amount - s.intr);
    intr = Math.min(leftI, Math.round(X * (L.total - L.amount) / L.total)); prin = X - intr;
  } else if (L.rate) { intr = Math.min(X, Math.round(s.left * L.rate / 100)); prin = X - intr; }
  else prin = X;
  return { intr: r0(intr), prin: r0(prin), how: rows.length ? 'хуваарийн дагуу' : L.total > L.amount ? 'нийт дүнгийн харьцаагаар' : L.rate ? 'сарын хүүгээр' : 'хүүгүй' };
}
function openLoanSched(id) {
  var L = loanById(id), sc = loanSched(L), lab = { paid: 'Төлсөн', part: 'Хэсэгчлэн', open: 'Хүлээгдэж' };
  gOpen('<h2>Төлөлтийн хуваарь · ' + esc(L.partner) + '</h2><p class="muted">Нийт ' + mny(sc.sumT) + ' (үндсэн ' + mny(sc.sumP) + ', хүү ' + mny(sc.sumT - sc.sumP) + ')' +
    (sc.late.n ? ' · <b style="color:var(--red)">хоцорсон ' + sc.late.days + ' хоног, ' + mny(sc.late.amt) + '</b>' : '') + '</p>' +
    '<div class="scroll" style="max-height:60vh"><table class="rep-t"><tr><th>№</th><th>Огноо</th><th class="n">Үндсэн</th><th class="n">Хүү</th><th class="n">Нийт</th><th class="n">Үлдсэн</th><th>Төлөв</th></tr>' +
    sc.rows.map(function (r, i) {
      return '<tr' + (r.late ? ' style="background:#FDF2F2"' : '') + '><td>' + (i + 1) + '</td><td>' + r.d + '</td><td class="n">' + mny(r.p) + '</td><td class="n">' + mny(r.i) + '</td><td class="n">' + mny(r.t) + '</td>' +
        '<td class="n">' + (r.left > 0.5 ? mny(r.left) : '') + '</td><td>' + (r.late ? '<span class="tag r">Хоцорсон</span>' : '<span class="tag' + (r.st === 'paid' ? '' : ' b') + '">' + lab[r.st] + '</span>') + '</td></tr>';
    }).join('') + '</table></div><button class="btn ghost" onclick="gClose()">Хаах</button>');
}
function loansView(only) {
  var E = Jc(), list = loanList(state.biz), b = balances(E, todayStr());
  var sec = function (kind, title, hint, fx) {
    var f = state.lnF || 'active', taken = kind === 'Авсан', tot = { amt: 0, got: 0, paid: 0, intr: 0, left: 0 };
    var ls = list.filter(function (l) {   // хаагдсан = төлөгдөж дууссан (устгахгүй, түүх нь үлдэнэ)
      if (l.kind !== kind || !!lnFx(l) !== !!fx) return false;
      var st = loanStat(l, E), closed = l.status === 'Хаагдсан' || (st.got > 0.5 && st.left <= 0.5);
      return f === 'all' || (f === 'closed' ? closed : !closed);
    });
    var rows = ls.map(function (L) {
      var s = loanStat(L, E), done = s.got > 0.5 && s.left <= 0.5, closed = L.status === 'Хаагдсан' || done, sc = loanSched(L, E), nl = loanNextLate(L, sc, s), pf = L.biz === 'mgmt';
      var dl = pf ? function (sp, h) { return h; } : window.dl;   // хувийн санхүү: төлөлт нь журналд биш
      tot.amt += L.amount; tot.got += s.got; tot.paid += s.paid; tot.intr += s.intr; tot.left += s.left;
      var spec = { acc: [loanAcc(L), loanIntAcc(L)], tag: L.id, sign: taken ? -1 : 1, bal: false, t: L.partner + ' — ' + (taken ? 'авсан зээл' : 'өгсөн зээл') };
      var spN = (L.partner === 'Storepay' || fx) && !closed ? spNext(L) : null;
      var acts = (spN ? '<button class="mini" style="color:var(--accent)" onclick="spPay(\'' + L.id + '\')">Төлсөн</button>' : '') + (s.got < 0.5 && L.status === 'Идэвхтэй' ? '<button class="mini" onclick="openLoanPay(\'' + L.id + '\',\'disb\')">' + (taken ? 'Мөнгө орсон' : 'Мөнгө өгсөн') + '</button>' : '') +
        (s.left > 0.5 && !spN ? '<button class="mini" style="color:var(--accent)" onclick="' + (pf ? 'pfLoanPay' : 'openLoanPay') + '(\'' + L.id + '\',\'pay\')">' + (taken ? 'Төлөлт' : 'Төлбөр авсан') + '</button>' : '') +
        (pf ? '<button class="mini" onclick="pfLoanHist(\'' + L.id + '\')">Түүх</button>' : '') +
        (sc.rows.length ? '<button class="mini" onclick="openLoanSched(\'' + L.id + '\')">Хуваарь</button>' : '') +
        '<button class="mini" onclick="openLoan(\'' + L.id + '\')">Засах</button>' +
        (done && L.status === 'Идэвхтэй' ? '<button class="mini" onclick="loanStatus(\'' + L.id + '\',\'close\')">Хаах</button>' : '') +
        (pf ? '<button class="mini" style="color:var(--red)" onclick="pfLoanDel(\'' + L.id + '\')">Устгах</button>' : '');
      return '<tr><td>' + esc(L.date) + '</td><td><b>' + esc(L.partner) + '</b>' + (L.note ? '<br><small class="muted">' + esc(fx ? [fxCatName(L), FX_FREQ[lnFx(L).freq][0]].concat(lnFx(L).note || []).join(' · ') : L.note) + '</small>' : '') +
        (spN ? '<br><small' + (spN.late ? ' style="color:var(--red)"' : '') + '>Дараагийн төлөлт: ' + spDot(spN.d) + ', ' + mny(spN.left) + '</small>' : '') +
        (pf ? '<div class="pf-acts">' + acts + '</div>' : '') + '</td>' +
        '<td class="n">' + mny(L.amount) + (L.total && !fx ? '<br><small class="muted">хүүтэй ' + mny(L.total) + '</small>' : '') + '</td><td class="n">' + (L.rate ? L.rate + '%' : !(L.total > L.amount) && !fx ? '<span class="tag">Хүүгүй</span>' : '') + '</td><td>' + esc(L.due || '') + '</td>' +
        '<td class="n">' + (s.got ? dl(Object.assign({}, spec, { acc: [loanAcc(L)], dir: 1, t: spec.t + ' — ' + (taken ? 'орсон' : 'олгосон') }), mny(s.got)) : '<small class="muted">бүртгэгдээгүй</small>') + '</td>' +
        '<td class="n">' + (s.paid ? dl(Object.assign({}, spec, { acc: [loanAcc(L)], sign: taken ? 1 : -1, dir: 1, t: spec.t + ' — үндсэн төлөлт' }), mny(s.paid)) : '') + '</td>' +
        '<td class="n">' + (s.intr ? dl(Object.assign({}, spec, { acc: [loanIntAcc(L)], sign: taken ? 1 : -1, t: spec.t + ' — хүү' }), mny(s.intr)) : '') + '</td>' +
        '<td class="n"><b>' + (s.got ? dl({ acc: [loanAcc(L)], tag: L.id, sign: taken ? -1 : 1, bal: true, t: L.partner + ' — зээлийн хуулга (үлдэгдэлтэй)' }, mny(s.left)) : mny(s.left)) + '</b>' +
          (s.got > 0.5 ? '<br><small class="muted">' + Math.min(100, Math.round(s.paid / s.got * 100)) + '% төлсөн</small>' : '') + '</td>' +
        '<td class="n">' + (L.monthly ? mny(L.monthly) : sc.rows.length ? '<small class="muted">' + mny(sc.next ? sc.next.amt : 0) + '</small>' : '') + '</td>' +
        '<td class="nw">' + (closed ? '' : nl.next ? esc(nl.next) + (L.payDay ? '<br><small class="muted">сар бүр ' + L.payDay + '-нд</small>' : '') : '') +
          (!closed && !sc.rows.length ? '<br><span class="tag y" title="Хугацаа (сар), эхний төлөлтийн огноогоо оруулбал хуваарь үүснэ">Хуваарь үүсээгүй</span>' : '') + '</td>' +
        '<td class="n">' + (!closed && nl.late > 0 ? '<b style="color:var(--red)">' + nl.late + '</b>' + (sc.late.amt ? '<br><small style="color:var(--red)">' + mny(sc.late.amt) + '</small>' : '') : '') + '</td>' +
        '<td>' + (closed ? '<span class="tag">Хаагдсан</span>' : s.got < 0.5 ? '<span class="tag r">Мөнгө ороогүй</span>' : s.paid > 0.5 ? '<span class="tag b">Хэсэгчлэн төлсөн</span>' : '<span class="tag b">Идэвхтэй</span>') + '</td>' +
        '<td class="n" style="white-space:nowrap">' + (pf ? '' : acts) + '</td></tr>';
    }).join('');
    var reg = taken ? -(loanCodes().reduce(function (a, k) { return a + (b[k] || 0); }, 0)) : (b['1210'] || 0);   // дансны нийт үлдэгдэл
    var unreg = r0(reg - tot.left);
    return '<div class="card rep"><div class="rep-cap"><b>' + title + '</b><span>' + hint + '</span></div><div class="scroll"><table class="rep-t">' +
      '<tr><th>Огноо</th><th>Харилцагч</th><th class="n">Гэрээний дүн</th><th class="n">Сарын хүү</th><th>Дуусах</th><th class="n">' + (taken ? 'Орсон' : 'Олгосон') + '</th>' +
      '<th class="n">Төлсөн үндсэн</th><th class="n">Хүү</th><th class="n">Үлдэгдэл</th><th class="n">Сарын төлөх дүн</th><th>Дараагийн төлөлтийн огноо</th><th class="n">Хоцорсон хоног</th><th>Төлөв</th><th></th></tr>' +
      (rows || '<tr><td colspan="14" class="muted">Бүртгэл алга — «+ ' + (fx ? 'Тогтмол зардал' : (taken ? 'Авсан' : 'Өгсөн') + ' зээл') + '» дарж нэмнэ үү</td></tr>') +
      (ls.length ? '<tr class="tot"><td>Нийт</td><td></td><td class="n">' + mny(tot.amt) + '</td><td></td><td></td><td class="n">' + mny(tot.got) + '</td><td class="n">' + mny(tot.paid) + '</td>' +
        '<td class="n">' + mny(tot.intr) + '</td><td class="n">' + mny(tot.left) + '</td><td></td><td></td><td></td><td></td><td></td></tr>' : '') + '</table></div>' +
      (Math.abs(unreg) >= 1 && state.biz !== 'mgmt' && !fx ? '<p class="rep-note">Бүртгэлгүй (#лавлагаагүй) ' + (taken ? 'авсан' : 'өгсөн') + ' зээлийн үлдэгдэл: <b>' + mny(unreg) + '</b> — өмнө нь «Зээл авсан/төлсөн» гэж шууд бичсэн гүйлгээ.</p>' : '') + '</div>';
  };
  var ft = stBar('Төлөв', [['active', 'Идэвхтэй'], ['closed', 'Хаагдсан'], ['all', 'Бүгд']], state.lnF || 'active', "state.lnF='%'");
  if (only === 'fixed') return ft + sec('Авсан', 'Тогтмол зардал', 'Түрээс, интернэт, даатгал г.м давтагддаг төлбөр', 1);
  if (state.biz === 'mgmt') return ft + (only !== 'Өгсөн' ? sec('Авсан', 'Миний авсан зээл, өр', 'Банк, хүнээс авсан — таны төлөх ёстой') : '') + (only !== 'Авсан' ? sec('Өгсөн', 'Миний өгсөн зээл', 'Бусдад өгсөн — танд буцааж өгөх ёстой') : '');
  return ft + '<p class="hint">Энд таны бүх зээл, өр бүртгэгдэнэ. Зээл бүрийн мөнгө орсон / төлсөн гүйлгээг «Банкны хуулга»-аас (жагсаалтад зээлийн нэрээр гарна) эсвэл энд «Төлөлт» товчоор бүртгэнэ. ' +
    'Зээл бүрт «Төлөх нийт дүн», сар бүрийн <b>төлөлтийн хуваарь</b>-аа оруулбал төлбөр бүр үндсэн, хүү болж автоматаар задарна; хоцорсон төлөлт календарь болон «Миний компаниуд»-д анхааруулга болж гарна.</p>' +
    sec('Авсан', 'Миний авсан зээл, өр', 'Банк, хүнээс авсан — таны төлөх ёстой') + sec('Өгсөн', 'Миний өгсөн зээл', 'Бусдад өгсөн — танд буцааж өгөх ёстой');
}
var lnBank = null;   // банкны мөрөөс үүсгэж буй бол тэр мөр
function openLoanFromBank(lineId) {
  var l = bankLines.filter(function (x) { return x.id === lineId; })[0]; if (!l) return;
  openLoan(null, l.credit ? 'Авсан' : 'Өгсөн', l);
}
function openLoan(id, kind, bankLine) {
  lnBank = bankLine || null;
  var L = id ? loanById(id) : null; kind = L ? L.kind : kind || 'Авсан';
  var other = ACCOUNTS.filter(function (a) { return a[3] === 'cash' && a[0] !== '1101' && a[0] !== '10003'; });
  gOpen('<h2>' + (L ? 'Зээл засах' : kind === 'Авсан' ? 'Авсан зээл бүртгэх' : 'Өгсөн зээл бүртгэх') + '</h2>' +
    (lnBank ? '<p class="rep-note ok">Банкны гүйлгээ: ' + esc(lnBank.date) + ' · ' + (lnBank.credit ? '+' + fmt(lnBank.credit) : '−' + fmt(lnBank.debit)) + ' · «' + esc(lnBank.desc) + '» — хадгалахад энэ гүйлгээ шинэ зээлийн мөнгө болж тулгагдана.</p>' : '') +
    '<label for="lnKind">Төрөл</label><select id="lnKind"' + (L || lnBank ? ' disabled data-lock="1"' : '') + ' onchange="lnMoneyHint()"><option value="Авсан">Би зээл авсан (миний өр)</option><option value="Өгсөн">Би зээл өгсөн (надад өгөх)</option></select>' +
    '<label for="lnSrc">Эх үүсвэр</label><select id="lnSrc" onchange="spSrcSet()"><option value="">Банк, хүн, байгууллага</option><option value="Storepay">Storepay</option><option value="fixed">Тогтмол зардал (түрээс, интернэт, даатгал г.м)</option></select>' +
    '<div id="lnPartWrap"><label for="lnPartner">Харилцагч (банк, хүн, байгууллага)</label><input id="lnPartner" list="lnPartners" placeholder="Жишээ: Хаан банк"><datalist id="lnPartners">' + partnerOptions() + '</datalist></div>' +
    '<div id="lnSp" style="display:none"></div>' +
    ('<div id="lnFx" style="display:none"><div class="row2"><div><label for="fxName">Нэр</label><input id="fxName" placeholder="Жишээ: Байрны түрээс"></div>' +
      '<div><label for="fxCat">Зардлын ангилал</label><select id="fxCat">' + fxCatOpts() + '</select></div></div>' +
      '<div class="row2"><div><label for="fxAmt">Нэг удаагийн дүн (₮)</label><input id="fxAmt" type="number" min="0" inputmode="numeric" oninput="fxRender()"></div>' +
      '<div><label for="fxFreq">Давтамж</label><select id="fxFreq" onchange="fxRender()">' + Object.keys(FX_FREQ).map(function (k) { return '<option value="' + k + '">' + FX_FREQ[k][0] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="row2"><div><label for="fxFirst">Эхний төлөх огноо</label><input id="fxFirst" type="date" onchange="fxRender()"></div>' +
      '<div><label for="fxN">Хэдэн удаа</label><input id="fxN" type="number" min="1" max="120" inputmode="numeric" value="12" oninput="fxRender()"></div></div>' +
      '<p class="muted" id="fxInfo" style="font-size:12.5px;margin-top:6px"></p></div>') +
    '<div id="lnStd">' +
    '<div class="row2"><div><label for="lnDate">Огноо</label><input id="lnDate" type="date" onchange="lnCalc(1)"></div><div><label for="lnAmount">Дүн (₮)</label><input id="lnAmount" type="number" min="0" inputmode="numeric" oninput="lnCalc(1);lnSchedSum()"></div></div>' +
    // Зээлийн тооцоолуур (банкных шиг): хүү, хугацаа, төлөх хэлбэр → хуваарь, сарын төлбөр, нийт хүү автоматаар
    '<label style="display:flex;gap:6px;align-items:center;font-weight:400;margin-top:8px"><input type="checkbox" id="lnFree" style="width:auto" onchange="lnFreeSet()"> Хүүгүй зээл (хүү бодохгүй — төлбөр бүхэлдээ үндсэн)</label>' +
    '<div class="card" style="margin:10px 0;padding:12px"><h2 style="margin:0 0 6px">Зээлийн тооцоолуур</h2>' +
    '<div class="row2"><div><label for="lnRate">Сарын хүү (%)</label><input id="lnRate" type="number" min="0" step="any" placeholder="Жишээ: 1.8" oninput="lnCalc(1)"></div>' +
    '<div><label for="lnTerm">Хугацаа (сар)</label><input id="lnTerm" type="number" min="1" max="600" inputmode="numeric" placeholder="Жишээ: 24" oninput="lnCalc(1)"></div></div>' +
    '<div class="row2"><div><label for="lnMethod">Эргэн төлөлт</label><select id="lnMethod" onchange="lnCalc(1)"><option value="ann">Сар бүр тэнцүү төлбөр</option><option value="eq">Үндсэн төлбөр тэнцүү (буурах)</option></select></div>' +
    '<div><label for="lnFirst">Эхний төлөлтийн огноо</label><input id="lnFirst" type="date" onchange="lnCalc(1)"></div></div>' +
    '<label for="lnDays">Хүү бодох</label><select id="lnDays" onchange="lnCalc(1)"><option value="day">Хоногоор (банк шиг: үлдэгдэл × жилийн хүү ÷ 365 × хоног)</option><option value="mon">Сараар (үлдэгдэл × сарын хүү)</option></select>' +
    '<div id="lnCalcOut" class="fn-kpis" style="margin-top:10px"></div></div>' +
    '<div class="row2"><div><label for="lnTotal">Төлөх нийт дүн (хүүтэй, ₮)</label><input id="lnTotal" type="number" min="0" inputmode="numeric" oninput="lnSchedSum()"></div>' +
    '<div><label for="lnDue">Дуусах огноо</label><input id="lnDue" type="date"></div></div>' +
    '<p id="lnErr" style="display:none;color:var(--red);font-weight:600;margin:6px 0 0">Төлөх нийт дүн (хүүтэй) зээлийн дүнгээс бага байж болохгүй.</p>' +
    '<div class="row2"><div><label for="lnMonthly">Сарын төлөх дүн (₮)</label><input id="lnMonthly" type="number" min="0" inputmode="numeric" oninput="lnMonAuto=!this.value"></div>' +
    '<div><label for="lnPayDay">Төлөх өдөр (сар бүрийн)</label><input id="lnPayDay" type="number" min="1" max="31" inputmode="numeric" placeholder="1–31"></div></div>' +
    '<label>Төлөлтийн хуваарь <small class="muted" style="font-weight:400">(тооцоолуураас автоматаар, эсвэл банкны хуваарийг буулгана — засаж болно)</small></label>' +
    '<div id="lnSched"></div>' +
    '<div class="pg-act" style="margin-top:6px"><button class="b-btn" onclick="lnAuto=false;lnRows.push({d:\'\',p:\'\',i:\'\'});lnSchedRender()">+ Мөр</button>' +
    '<button class="b-btn" onclick="$(\'lnPasteWrap\').style.display=\'\'">Банкны хуваарь буулгах</button>' +
    '<button class="b-btn" onclick="lnRows=[];lnAuto=true;lnSchedRender();lnCalcOutRender()">Цэвэрлэх</button></div>' +
    '<div id="lnPasteWrap" style="display:none;margin-top:6px"><textarea id="lnPaste" rows="5" style="width:100%" placeholder="Банкны хуваарийн хүснэгтийг хуулж буулгана: мөр бүрт огноо, үндсэн, хүү (жишээ: 2026-11-25  83333  15000)"></textarea>' +
      '<button class="b-btn" onclick="lnPasteApply()">Хуваарь болгох</button></div>' +
    '<p class="muted" id="lnSchedInfo" style="font-size:12.5px;margin-top:6px"></p>' +
    (L ? '' : '<label style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" id="lnRemind" checked style="width:auto"> Хуваарьгүй бол календарьт сар бүр сануулах</label>') + '</div>' +
    '<label for="lnPayAcc">Төлөх данс</label><select id="lnPayAcc"><option value="">— сонгоогүй —</option>' + (state.biz === 'mgmt' && typeof pfAccOpts === 'function' ? pfAccOpts('') : cashAccOpts('')) + '</select>' +
    (L || lnBank || state.biz === 'mgmt' ? '' : '<label for="lnMoney" id="lnMoneyLabel">Мөнгө</label><select id="lnMoney" onchange="lnMoneyHint()">' +
      '<option value="1101">Харилцах дансаар (одоо бүртгэнэ)</option><option value="10003">Бэлнээр (касс)</option>' +
      other.map(function (a) { return '<option value="' + a[0] + '">' + esc(a[1]) + '</option>'; }).join('') +
      '<option value="later">Банкны хуулгаар дараа тулгана</option><option value="open">Өмнөөс байсан зээл (системээс өмнөх үлдэгдэл)</option></select>' +
      '<p class="muted" id="lnMoneyHint" style="font-size:12.5px;margin-top:6px"></p>') +
    '<label for="lnNote">Тэмдэглэл</label><input id="lnNote" placeholder="Гэрээний дугаар, барьцаа г.м">' +
    '<button class="btn" onclick="saveLoan(' + (L ? '\'' + L.id + '\'' : '') + ')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>' +
    (L ? (journal.some(function (j) { return hasTag(j.desc, L.id); })
      ? '<p class="muted" style="font-size:12.5px;margin-top:8px">Гүйлгээтэй зээлийг устгахгүй — төлөгдөж дуусахад автоматаар «Хаагдсан» болно, түүх нь хадгалагдана.</p>'
      : '<p style="margin-top:8px"><button class="b-btn" onclick="loanStatus(\'' + L.id + '\',\'cancel\')">Буруу бүртгэсэн бол устгах (гүйлгээгүй)</button></p>') : ''));
  $('lnKind').value = kind; $('lnPartner').value = L ? L.partner : ''; $('lnDate').value = L ? L.date : lnBank ? lnBank.date.slice(0, 10) : todayStr();
  $('lnAmount').value = L ? L.amount : lnBank ? (lnBank.credit || lnBank.debit) : '';
  $('lnRate').value = L && L.rate ? L.rate : ''; $('lnDue').value = L ? L.due : ''; $('lnPayDay').value = L && L.payDay ? L.payDay : ''; $('lnNote').value = L ? L.note : '';
  $('lnTotal').value = L && L.total ? L.total : '';
  $('lnMonthly').value = L && L.monthly ? L.monthly : ''; lnMonAuto = !(L && L.monthly); $('lnPayAcc').value = L && L.payAcc ? L.payAcc : '';
  if (L && L.intMode) $('lnDays').value = L.intMode;
  $('lnFree').checked = !!(L && !L.rate && !(L.total > L.amount)); lnFreeSet(1);
  lnRows = L && L.schedule ? L.schedule.map(function (r) { return { d: r.d, p: r.p, i: r.i }; }) : [];
  lnAuto = !lnRows.length;   // хадгалсан хуваарийг тооцоолуур дарж бичихгүй — гараар «Тооцоолох» дарвал л
  $('lnTerm').value = lnRows.length || ''; $('lnFirst').value = lnRows.length ? lnRows[0].d : '';
  lnSchedRender(); lnCalcOutRender();
  if (!L) lnMoneyHint();
  var sp = L && L.partner === 'Storepay', pl = sp && SP_PLANS.filter(function (x) { return L.note.indexOf('Storepay · ' + x.title) === 0; })[0];
  spSt = { plan: pl ? pl.id : '4x45', open: false };
  if (pl) $('lnNote').value = L.note.slice(('Storepay · ' + pl.title).length).replace(/^ · /, '');
  var fx = lnFx(L);
  if (fx) {
    $('fxName').value = L.partner; $('fxCat').value = fx.cat; $('fxFreq').value = fx.freq; $('fxAmt').value = lnRows.length ? lnRows[0].p : L.monthly;
    $('fxFirst').value = lnRows.length ? lnRows[0].d : L.date; $('fxN').value = lnRows.length || 12; $('lnNote').value = fx.note;
  }
  $('lnSrc').value = sp ? 'Storepay' : fx ? 'fixed' : ''; spSrcSet();
}
var lnRows = [];
function lnSchedRender() {
  $('lnSched').innerHTML = lnRows.length ? '<div class="scroll" style="max-height:240px"><table class="rep-t"><tr><th>№</th><th>Огноо</th><th class="n">Үндсэн</th><th class="n">Хүү</th><th class="n">Нийт</th><th></th></tr>' +
    lnRows.map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td><td><input type="date" value="' + esc(r.d) + '" oninput="lnAuto=false;lnRows[' + i + '].d=this.value" style="width:140px"></td>' +
        '<td class="n"><input type="number" min="0" value="' + r.p + '" oninput="lnAuto=false;lnRows[' + i + '].p=this.value;lnSchedSum()" style="width:110px"></td>' +
        '<td class="n"><input type="number" min="0" value="' + r.i + '" oninput="lnAuto=false;lnRows[' + i + '].i=this.value;lnSchedSum()" style="width:100px"></td>' +
        '<td class="n" id="lnT' + i + '"></td><td><button class="mini" onclick="lnAuto=false;lnRows.splice(' + i + ',1);lnSchedRender();lnCalcOutRender()">✕</button></td></tr>';
    }).join('') + '</table></div>' : '<p class="muted" style="margin:4px 0">Хуваарь оруулаагүй — «Тэнцүү хуваарь үүсгэх», «Excel-ээс буулгах» эсвэл «+ Мөр».</p>';
  lnSchedSum();
}
function lnSchedSum() {
  var sp = 0, st = 0;
  lnRows.forEach(function (r, i) { var p = Number(r.p) || 0, it = Number(r.i) || 0; sp += p; st += p + it; var c = $('lnT' + i); if (c) c.textContent = fmt(p + it).slice(1); });
  var amt = Number($('lnAmount').value) || 0, tot = Number($('lnTotal').value) || 0, w = [];
  if ($('lnErr')) $('lnErr').style.display = tot > 0 && amt > 0 && tot < amt ? '' : 'none';
  if (lnRows.length && amt && Math.abs(sp - amt) > 1) w.push('үндсэний нийлбэр ' + fmt(sp) + ' ≠ зээлийн дүн ' + fmt(amt));
  if (lnRows.length && tot && Math.abs(st - tot) > 1) w.push('хуваарийн нийт ' + fmt(st) + ' ≠ төлөх нийт ' + fmt(tot));
  $('lnSchedInfo').innerHTML = lnRows.length ? lnRows.length + ' төлөлт · үндсэн ' + fmt(sp) + ' · хүү ' + fmt(st - sp) + ' · нийт ' + fmt(st) +
    (w.length ? '<br><span style="color:var(--red)">Анхаар: ' + w.join('; ') + '</span>' : '') : '';
}
// ═══ Зээлийн тооцоолуур (банкных шиг) ═══
// Сар бүр тэнцүү төлбөр: A = P·r / (1 − (1+r)^−n), r = сарын хүү; үндсэн = A − тухайн сарын хүү, сүүлийн сард үлдэгдлийг бүтэн.
// Үндсэн тэнцүү: үндсэн = P / n, хүү үлдэгдлээс (төлбөр сар бүр буурна).
// Хүү хоногоор: үлдэгдэл × (сарын хүү × 12) ÷ 365 × өмнөх төлөлтөөс хойшх хоног (Монголын банкуудын хуваарь ингэж бодогддог).
var lnAuto = true, lnMonAuto = true;
function lnFreeSet(init) {   // хүүгүй: хүү 0, хүү бодох сонголт нуугдана; хуваарь, сарын төлбөр = дүн ÷ хугацаа
  var f = $('lnFree').checked;
  $('lnRate').disabled = f; if (f) $('lnRate').value = '';
  $('lnDays').style.display = $('lnDays').previousElementSibling.style.display = f ? 'none' : '';
  if (!init) lnCalc(1);
}
function lnAddMon(d0, k, day) { var y = d0.getFullYear(), mo = d0.getMonth() + k; return new Date(y, mo, Math.min(day, new Date(y, mo + 1, 0).getDate())); }
function lnCalcRows(P, rate, n, method, first, start, byDay) {
  var r = rate / 100, f = new Date(first + 'T00:00:00'), day = f.getDate(), prev = new Date(start + 'T00:00:00'), bal = P, out = [];
  var A = r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
  for (var k = 0; k < n; k++) {
    var d = lnAddMon(f, k, day), days = Math.max(0, Math.round((d - prev) / 864e5));
    var it = Math.round(byDay ? bal * r * 12 / 365 * days : bal * r);
    var p = k === n - 1 ? Math.round(bal) : Math.round(method === 'eq' ? P / n : Math.max(0, A - it));
    p = Math.min(p, Math.round(bal));
    out.push({ d: todayStr(d), p: p, i: it }); bal -= p; prev = d;
  }
  return out;
}
function lnCalc(auto) {
  if (auto && !lnAuto) { lnCalcOutRender(); return; }   // гараар оруулсан/буулгасан хуваарийг дарж бичихгүй
  var P = Number($('lnAmount').value) || 0, rate = Number($('lnRate').value) || 0, n = Math.round(Number($('lnTerm').value) || 0), start = $('lnDate').value || todayStr();
  if (!(P > 0 && n > 0 && n <= 600)) { if (!auto) toast('Зээлийн дүн, хугацаа (сар)-аа оруулна уу'); lnCalcOutRender(); return; }
  var first = $('lnFirst').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(first) || first <= start) { var s0 = new Date(start + 'T00:00:00'); first = todayStr(lnAddMon(s0, 1, s0.getDate())); $('lnFirst').value = first; }
  lnRows = lnCalcRows(P, rate, n, $('lnMethod').value, first, start, $('lnDays').value === 'day'); lnAuto = true;
  $('lnTotal').value = Math.round(lnRows.reduce(function (a, r) { return a + r.p + r.i; }, 0));
  $('lnDue').value = lnRows[lnRows.length - 1].d; $('lnPayDay').value = Number(first.slice(8, 10));
  if (lnMonAuto || !$('lnMonthly').value) { $('lnMonthly').value = Math.round(lnRows[0].p + lnRows[0].i); lnMonAuto = true; }   // санал — засаж болно
  lnSchedRender(); lnCalcOutRender();
}
function lnFlat(t) { var a = t.slice(0, -1); return a.length && Math.max.apply(null, a) - Math.min.apply(null, a) <= 1; }   // сүүлийн сараас бусад нь тэнцүү
function lnCalcOutRender() {
  var o = $('lnCalcOut'); if (!o) return;
  var rate = Number($('lnRate').value) || 0;
  if (!lnRows.length) { o.innerHTML = '<p class="muted" style="margin:0;font-size:12.5px">Дүн, сарын хүү, хугацаагаа оруулахад хуваарь автоматаар гарна.' + (rate ? ' Жилийн хүү ' + r0(rate * 12) + '%.' : '') + '</p>'; return; }
  var t = lnRows.map(function (r) { return r.p + r.i; }), P = lnRows.reduce(function (a, r) { return a + r.p; }, 0), I = lnRows.reduce(function (a, r) { return a + r.i; }, 0);
  var mn = Math.min.apply(null, t), mx = Math.max.apply(null, t);
  o.innerHTML = [['Сар бүр төлөх', Math.abs(mx - mn) <= 1 ? fmt(mx) : lnFlat(t) ? fmt(t[0]) + '<br><small class="muted">сүүлийн сар ' + fmt(t[t.length - 1]) + '</small>' : fmt(mx) + ' → ' + fmt(mn)], ['Нийт хүү', fmt(I)], ['Нийт төлөх', fmt(P + I)], ['Жилийн хүү', rate ? r0(rate * 12) + '%' : '—']].map(function (k) {
    return '<div class="fn-kpi"><small>' + k[0] + '</small><b>' + k[1] + '</b></div>'; }).join('') +
    (lnAuto ? '' : '<p class="muted" style="margin:6px 0 0;font-size:12.5px;width:100%">Хуваарийг гараар оруулсан. <button class="link" onclick="lnAuto=true;lnCalc()">Тооцоолуураар дахин бодох</button></p>');
}
// Банкны хуваарийг хуулж буулгах: мөр бүрээс огноо, дараагийн 2 тоо (үндсэн, хүү)
function lnPasteApply() {
  var out = [];
  $('lnPaste').value.split(/\r?\n/).forEach(function (ln) {
    var m = ln.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/); if (!m) return;
    var rest = ln.slice(ln.indexOf(m[0]) + m[0].length).trim();
    // Excel-ээс хуулахад баганууд таб-аар (эсвэл 2+ зайгаар) тусгаарлагдана; нүдэн доторх 1,000,000 / 1 000 000-ийг нэг тоо гэж уншина
    var cells = rest.split(/\t|\s{2,}|;|\|/).map(function (c) { return c.trim(); }).filter(Boolean);
    if (cells.length === 1 && /\d\s\d{4,}/.test(cells[0])) cells = cells[0].split(/\s+/);
    var nums = cells.map(function (c) { return Number(c.replace(/[\s,₮]/g, '')); }).filter(function (x) { return isFinite(x) && !isNaN(x); });
    if (nums.length < 1) return;
    out.push({ d: m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2), p: nums[0], i: nums[1] || 0 });
  });
  if (!out.length) { toast('Огноотой мөр олдсонгүй — «огноо  үндсэн  хүү» хэлбэрээр буулгана уу'); return; }
  lnRows = out; lnAuto = false; $('lnPasteWrap').style.display = 'none'; lnSchedRender(); lnCalcOutRender(); toast(out.length + ' мөр орлоо — шалгаарай');
}
function lnMoneyHint() {
  if (!$('lnMoney')) return;
  var taken = $('lnKind').value === 'Авсан', v = $('lnMoney').value;
  $('lnMoneyLabel').textContent = taken ? 'Мөнгө хаана орсон' : 'Мөнгө хаанаас гарсан';
  $('lnMoneyHint').textContent = v === 'later' ? 'Зээл бүртгэгдэнэ, мөнгө нь банкны хуулгад гарахад «Зээл ' + (taken ? 'орж ирсэн' : 'олгох') + '» гэж сонгож тулгана.' :
    v === 'open' ? 'Системийг ашиглахаас өмнө авсан/өгсөн зээл. «Дүн»-д ОДООГИЙН үлдэгдлийг бичнэ (анхны дүнг тэмдэглэлд).' :
    'Хадгалахад мөнгөн гүйлгээ шууд бичигдэнэ.';
}
// ═══ Storepay тооцоолуур ═══
// mode: days — interval хоног тутам, months — сар бүр ижил өдөр; firstOffset — эхний төлөлт хэдэн хоногийн дараа; roundTo — хуваах дүнг доош бүхэлтгэх нэгж
var SP_PLANS = [
  { id: '4x45', badge: '4', color: 'blue', title: '45 хоногт 4 хуваах', note: 'Хүүгүй шимтгэлгүй хувааж төлөх', count: 4, mode: 'days', interval: 15, firstOffset: 0, fee: 0, roundTo: 100 },
  { id: '3x60', badge: '3', color: 'blue', title: '60 хоногт 3 хуваах', note: 'Хүүгүй шимтгэлгүй хувааж төлөх', count: 3, mode: 'days', interval: 30, firstOffset: 0, fee: 0, roundTo: 1000 },
  { id: '5x4m', badge: '5', color: 'blue', title: '4 сард 5 хуваах', note: '50% урьдчилгаа төлөөд, хүүгүй шимтгэлгүй хувааж төлөх', count: 5, mode: 'months', interval: 1, firstOffset: 0, downPercent: 50, fee: 0, roundTo: 100 },
  { id: 'direct', badge: '₮', color: 'navy', title: 'Шууд төлөх', note: 'Шууд SPCFIN бонус урамшуулал', count: 1, mode: 'days', interval: 0, firstOffset: 0, fee: 0, roundTo: 1 },
  { id: '3x30', badge: '3', color: 'green', title: '30 хоногт 3 хуваах', note: 'Хүүгүй шимтгэлгүй хувааж төлөх', count: 3, mode: 'days', interval: 15, firstOffset: 0, fee: 0, roundTo: 1000 },
  { id: '6x75', badge: '6', color: 'blue', title: '75 хоногт 6 хуваах', note: 'Хүүгүй шимтгэлгүй хувааж төлөх', count: 6, mode: 'days', interval: 15, firstOffset: 0, fee: 0, roundTo: 100 },
  { id: '8x105', badge: '8', color: 'blue', title: '105 хоногт 8 хуваах', note: 'Шимтгэл 6.79%', noteColor: 'blue', count: 8, mode: 'days', interval: 15, firstOffset: 0, fee: 6.79, minAmount: 1000000, roundTo: 100 },
  { id: '10x135', badge: '10', color: 'blue', title: '135 хоногт 10 хуваах', note: 'Шимтгэл 8.79%', noteColor: 'blue', count: 10, mode: 'days', interval: 15, firstOffset: 0, fee: 8.79, minAmount: 1000000, roundTo: 100 },
  { id: '4x60', badge: '4', color: 'blue', title: '60 хоногт 4 хуваах', note: 'Урьдчилгаагүй, хүүгүй шимтгэлгүй хуваах', count: 4, mode: 'days', interval: 15, firstOffset: 15, fee: 0, roundTo: 100 },
  { id: '2x30', badge: '2', color: 'green', title: '30 хоногт 2 хуваах', note: 'Урьдчилгаагүй, хүүгүй шимтгэлгүй хувааж төлөх', count: 2, mode: 'days', interval: 15, firstOffset: 15, fee: 0, roundTo: 100 }
];
var spSt = { plan: '4x45', open: false };
function spOn() { return !!$('lnSrc') && $('lnSrc').value === 'Storepay'; }
function spPlan(id) { id = id || spSt.plan; return SP_PLANS.filter(function (x) { return x.id === id; })[0] || SP_PLANS[0]; }
function spPrice() { return Number(String(($('spPrice') || {}).value || '').replace(/[^\d]/g, '')) || 0; }
function spDot(d) { return d.replace(/-/g, '.'); }
// Хуваарь: нийт = үнэ × (1 + шимтгэл); тэнцүү хэсгийг roundTo-гоор доош бүхэлтгэж, үлдэгдлийг эхний төлөлтөд нэмнэ. Шимтгэлийг мөр бүрт харьцаагаар (хүү баганад).
function spCalc(price, start, P) {
  if (!(price > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || (P.minAmount && price < P.minAmount)) return null;
  var total = Math.round(price * (1 + P.fee / 100)), amts = [], down = 0, n = P.count;
  if (P.downPercent) { down = Math.round(total * P.downPercent / 100); amts.push(down); n--; }
  var part = Math.floor((total - down) / n / P.roundTo) * P.roundTo;
  for (var k = 0; k < n; k++) amts.push(part);
  amts[0] += total - amts.reduce(function (a, x) { return a + x; }, 0);
  var s0 = new Date(start + 'T00:00:00'), feeT = total - price, fi = 0;
  var rows = amts.map(function (t, i) {
    var d = P.mode === 'months' ? lnAddMon(s0, i, s0.getDate()) : new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + P.firstOffset + i * P.interval);
    var days = Math.round((d - s0) / 864e5), it = i === amts.length - 1 ? feeT - fi : Math.round(t * feeT / total); fi += it;
    return { d: todayStr(d), t: t, p: t - it, i: it, lab: i === 0 ? (P.firstOffset ? 'Эхний төлөлт' : 'Эхний өдөр') : days + ' дахь өдөр' };
  });
  return { price: price, total: total, fee: feeT, rows: rows };
}
function spSrcSet() {
  var on = spOn(), fx = $('lnSrc').value === 'fixed';
  $('lnStd').style.display = $('lnPartWrap').style.display = on || fx ? 'none' : '';
  $('lnSp').style.display = on ? '' : 'none';
  if ($('lnFx')) $('lnFx').style.display = fx ? '' : 'none';
  ['lnMoney', 'lnMoneyLabel', 'lnMoneyHint'].forEach(function (k) { if ($(k)) $(k).style.display = fx ? 'none' : ''; });   // зардалд мөнгө орохгүй
  ['lnKind', 'lnSrc'].forEach(function (k) { $(k).style.display = $(k).previousElementSibling.style.display = fx ? 'none' : ''; });   // тогтмол зардал — өөрийн цэсээс
  if (fx) { var h = $('gBody').querySelector('h2'); if (h && h.textContent.indexOf('Зээл') < 0) h.textContent = 'Тогтмол зардал бүртгэх'; else if (h) h.textContent = 'Тогтмол зардал засах'; }
  if (fx) { if (!$('fxFirst').value) $('fxFirst').value = todayStr(); fxRender(); }
  if (on || fx) { $('lnKind').value = 'Авсан'; $('lnKind').disabled = true; } else if (!$('lnKind').dataset.lock) $('lnKind').disabled = false;
  if (on && !$('spPrice')) {
    $('lnSp').innerHTML = '<div class="stp-box"><div class="stp-card"><label for="spPrice">Үнийн дүн</label><div class="stp-amt"><input id="spPrice" inputmode="numeric" autocomplete="off" placeholder="0" oninput="spFmt(this);spRender()"><span>₮</span></div>' +
      '<p id="spMin" class="stp-min" style="display:none"></p>' +
      '<label for="spDate">Худалдан авалт хийх өдөр</label><input id="spDate" type="date" onchange="spRender()"></div>' +
      '<div class="stp-card"><label>Хуваан төлөх нөхцөл</label><div id="spPick"></div></div><div id="spOut"></div></div>';
    $('spPrice').value = Number($('lnAmount').value) ? Number($('lnAmount').value).toLocaleString('en-US') : '';
    $('spDate').value = $('lnDate').value || todayStr();
  }
  if (on) spRender();
}
function spFmt(el) { var v = el.value.replace(/[^\d]/g, ''); el.value = v ? Number(v).toLocaleString('en-US') : ''; }
function spOpt(P, radio) {
  return '<div class="stp-opt' + (radio && P.id === spSt.plan ? ' on' : '') + '"' + (radio ? ' onclick="spSt.plan=\'' + P.id + '\';spSt.open=false;spRender()"' : '') + '>' +
    '<span class="stp-badge ' + P.color + '">' + P.badge + '</span><span class="stp-txt"><b>' + esc(P.title) + '</b><small' + (P.noteColor ? ' class="c-' + P.noteColor + '"' : '') + '>' + esc(P.note) + '</small></span>' +
    (radio ? '<span class="stp-radio"></span>' : '<span class="stp-caret">▾</span>') + '</div>';
}
function spRender() {
  var P = spPlan(), price = spPrice(), low = P.minAmount && price > 0 && price < P.minAmount;
  $('spPick').innerHTML = spSt.open ? '<div class="stp-list">' + SP_PLANS.map(function (x) { return spOpt(x, true); }).join('') + '</div>'
    : '<div onclick="spSt.open=true;spRender()" style="cursor:pointer">' + spOpt(P, false) + '</div>';
  $('spMin').style.display = low ? '' : 'none'; $('spMin').textContent = low ? 'Доод дүн ' + P.minAmount.toLocaleString('en-US') + ' ₮' : '';
  var sc = spCalc(price, $('spDate').value, P);
  $('spOut').innerHTML = sc ? '<div class="stp-card">' + sc.rows.map(function (r, i) {
      return '<div class="stp-row"><span class="stp-no">' + (i + 1) + '</span><span class="stp-d">' + spDot(r.d) + '<small>' + r.lab + '</small></span><b>' + r.t.toLocaleString('en-US') + '₮</b></div>';
    }).join('') + '<div class="stp-tot">' + (sc.fee ? '<span>Шимтгэл: ' + sc.fee.toLocaleString('en-US') + '₮</span>' : '') + '<span>Нийт төлөх дүн: <b>' + sc.total.toLocaleString('en-US') + '₮</b></span></div></div>' : '';
}
// ═══ Тогтмол зардал (хувийн санхүү) ═══
// Зээл шиг бүртгэнэ: дүн × удаа = нийт, хуваарь давтамжаар; тэмдэглэл «Тогтмол зардал · ангилал · давтамж · …». Төлөлт нь тухайн зардлын ангилалд зарлага болно, өрөнд орохгүй.
var FX_FREQ = { m: ['Сар бүр', 1], w: ['7 хоног тутам', 0], q: ['Улирал бүр', 3], y: ['Жил бүр', 12] };
function lnFx(L) {
  var a = L && String(L.note || '').split(' · ');
  return a && a[0] === 'Тогтмол зардал' && FX_FREQ[a[2]] ? { cat: a[1], freq: a[2], note: a.slice(3).join(' · ') } : null;
}
function fxCalc() {
  var amt = Math.round(Number($('fxAmt').value) || 0), n = Math.round(Number($('fxN').value) || 0), f = $('fxFirst').value, st = FX_FREQ[$('fxFreq').value][1];
  if (!(amt > 0) || !(n >= 1 && n <= 120) || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return null;
  var d0 = new Date(f + 'T00:00:00'), out = [];
  for (var k = 0; k < n; k++) out.push({ d: todayStr(st ? lnAddMon(d0, k * st, d0.getDate()) : new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 7 * k)), p: amt, i: 0 });
  return out;
}
function fxCatOpts() {   // хувийн санхүү — зарлагын ангилал, компани — зардлын данс
  if (state.biz === 'mgmt') return pfCats('exp').filter(function (c) { return PF_SYS.exp.indexOf(c) < 0; }).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  return ACCOUNTS.filter(function (a) { return a[2] === 'exp' && /^71/.test(a[0]); }).map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === '7114' ? ' selected' : '') + '>' + a[0] + ' ' + esc(a[1]) + '</option>'; }).join('');
}
function fxCatName(L) { var fx = lnFx(L); if (!fx) return ''; var a = ACCOUNTS.filter(function (x) { return x[0] === fx.cat; })[0]; return a ? a[1] : fx.cat; }
// Компанийн тогтмол зардлын төлөлт: Дт зардлын данс / Кт мөнгөний данс, «#ID» лавлагаатай
function fxPayCo(id, r) {
  var L = loanById(id); if (!L) return;
  gOpen('<h2>Тогтмол зардал төлөх</h2><p class="muted">' + esc(L.partner) + ' · ' + esc(fxCatName(L)) + ' · үлдэгдэл ' + mny(loanStat(L).left) + '</p>' +
    '<div class="row2"><div><label for="lpDate">Огноо</label><input id="lpDate" type="date" value="' + todayStr() + '"></div>' +
    '<div><label for="lpAcc">Мөнгө хаанаас гарсан</label><select id="lpAcc">' + cashAccOpts(L.payAcc || '1101') + '</select></div></div>' +
    '<label for="lpTot">Төлсөн дүн (₮)</label><input id="lpTot" type="number" min="0" inputmode="numeric" value="' + (r ? r.left : L.monthly || '') + '">' +
    '<label for="lpNote">Тэмдэглэл</label><input id="lpNote">' +
    '<button class="btn" onclick="fxPaySave(\'' + id + '\')">Бүртгэх</button><button class="btn ghost" onclick="gClose()">Болих</button>');
}
function fxPaySave(id) {
  var L = loanById(id), fx = lnFx(L), amt = Number($('lpTot').value) || 0, d = $('lpDate').value, note = $('lpNote').value.trim();
  if (!(amt > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('Огноо оруулна уу'); return; }
  var closes = loanStat(L).left - amt <= 0.5;
  postEntries([{ biz: L.biz, date: d, dr: fx.cat, cr: $('lpAcc').value, amount: r0(amt), partner: L.partner, desc: ('Тогтмол зардал · ' + L.partner + (note ? ' · ' + note : '')).slice(0, 170) + ' #' + L.id }], function () {
    gClose();
    if (closes) { loanClose(id, function () { toast('Бүртгэгдлээ — бүх төлбөр төлөгдөж хаагдлаа'); }); return; }
    toast('Бүртгэгдлээ'); if (API_URL) refresh(); else render();
  });
}
function fxRender() {
  var r = fxCalc();
  $('fxInfo').textContent = r ? r.length + ' удаа × ' + fmt(r[0].p) + ' = ' + fmt(r.length * r[0].p) + ' · ' + spDot(r[0].d) + ' – ' + spDot(r[r.length - 1].d) : '';
}
// Дараагийн төлөгдөөгүй хуваарийн мөр (хоцорсныг оруулна)
function spNext(L) { return loanSched(L).rows.filter(function (r) { return r.st !== 'paid'; })[0] || null; }
function spPay(id) {   // «Төлсөн»: дараагийн хуваарийн дүнгээр төлөлтийн цонх (хэрэглэгч шалгаад хадгална)
  var L = loanById(id), r = spNext(L); if (!L) return;
  if (L.biz === 'mgmt') { pfLoanPay(id, 'pay'); if (r && $('lpTot')) { $('lpTot').value = r.left; lppCalc(); } }
  else if (lnFx(L)) fxPayCo(id, r);
  else { openLoanPay(id, 'pay'); if (r && $('lpTot')) { $('lpTot').value = r.left; lpAuto(id); } }
}
function nextPayDate(day) {
  var t = new Date(), y = t.getFullYear(), mo = t.getMonth(), d = Math.min(day, new Date(y, mo + 1, 0).getDate());
  var dt = new Date(y, mo, d); if (todayStr(dt) < todayStr()) { mo++; dt = new Date(y, mo, Math.min(day, new Date(y, mo + 1, 0).getDate())); }
  return todayStr(dt);
}
function saveLoan(id) {
  var sp = spOn(), spP = sp && spPlan();
  if (sp) {   // Storepay: хуваарь, нийт дүн тооцоолуураас
    var sc = spCalc(spPrice(), $('spDate').value, spP);
    if (!sc) { toast(spPrice() > 0 ? 'Энэ нөхцлийн доод дүн ' + fmt(spP.minAmount) : 'Үнийн дүн, огноогоо оруулна уу'); return; }
    $('lnKind').value = 'Авсан'; $('lnPartner').value = 'Storepay'; $('lnDate').value = $('spDate').value; $('lnAmount').value = sc.price;
    $('lnRate').value = ''; $('lnTotal').value = sc.total; $('lnDue').value = sc.rows[sc.rows.length - 1].d; $('lnPayDay').value = ''; $('lnMonthly').value = '';
    lnRows = sc.rows.map(function (r) { return { d: r.d, p: r.p, i: r.i }; });
  }
  var fx = $('lnSrc') && $('lnSrc').value === 'fixed';
  if (fx) {   // тогтмол зардал: дүн × удаа = нийт, хуваарь давтамжаар
    var fr = fxCalc();
    if ($('fxName').value.trim().length < 2) { toast('Зардлын нэрийг бичнэ үү'); return; }
    if (!fr) { toast('Дүн, эхний огноо, хэдэн удаа (1–120)-гаа оруулна уу'); return; }
    $('lnKind').value = 'Авсан'; $('lnPartner').value = $('fxName').value.trim(); $('lnDate').value = fr[0].d; $('lnAmount').value = fr.length * fr[0].p;
    $('lnRate').value = ''; $('lnTotal').value = fr.length * fr[0].p; $('lnDue').value = fr[fr.length - 1].d; $('lnMonthly').value = fr[0].p;
    $('lnPayDay').value = $('fxFreq').value === 'w' ? '' : Number(fr[0].d.slice(8, 10)); lnRows = fr;
  }
  var L = { biz: state.biz, kind: $('lnKind').value, partner: $('lnPartner').value.trim(), date: $('lnDate').value, amount: Number($('lnAmount').value) || 0,
            rate: Number($('lnRate').value) || 0, due: $('lnDue').value, payDay: Number($('lnPayDay').value) || 0, note: $('lnNote').value.trim(),
            total: Number($('lnTotal').value) || 0, monthly: Number($('lnMonthly').value) || 0, payAcc: $('lnPayAcc').value, intMode: $('lnDays').value,
            schedule: lnRows.filter(function (r) { return /^\d{4}-\d{2}-\d{2}$/.test(r.d) && (Number(r.p) || Number(r.i)); }).map(function (r) { return { d: r.d, p: Number(r.p) || 0, i: Number(r.i) || 0 }; }) };
  if (lnRows.some(function (r) { return (Number(r.p) || Number(r.i)) && !/^\d{4}-\d{2}-\d{2}$/.test(r.d); })) { toast('Хуваарийн мөр бүрт огноо оруулна уу'); return; }
  if (!L.due && L.schedule.length) L.due = L.schedule.map(function (r) { return r.d; }).sort().pop();
  if (L.partner.length < 2) { toast('Харилцагчийн нэрийг бичнэ үү'); return; }
  if (L.total > 0 && L.total < L.amount) { $('lnErr').style.display = ''; $('lnErr').scrollIntoView({ block: 'center' }); toast('Төлөх нийт дүн (хүүтэй) зээлийн дүнгээс бага байна'); return; }
  if (fx) { L.intMode = ''; L.note = ['Тогтмол зардал', $('fxCat').value, $('fxFreq').value].concat(L.note ? [L.note] : []).join(' · ').slice(0, 200); }
  if (sp) { L.intMode = ''; L.note = ('Storepay · ' + spP.title + (L.note ? ' · ' + L.note : '')).slice(0, 200); }
  if (!L.monthly && L.schedule.length && !sp) L.monthly = Math.round(L.schedule[0].p + L.schedule[0].i);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(L.date) || !(L.amount > 0)) { toast('Огноо, дүнгээ оруулна уу'); return; }
  if (L.payDay && (L.payDay < 1 || L.payDay > 31)) { toast('Төлөх өдөр 1–31'); return; }
  var bl = id ? null : lnBank, money = id || bl || fx || !$('lnMoney') ? '' : $('lnMoney').value, remind = !id && !L.schedule.length && $('lnRemind') && $('lnRemind').checked && L.payDay;   // хуваарьтай бол календарь өөрөө харуулна
  if (bl && Math.abs((bl.credit || bl.debit) - L.amount) > 0.5 && !confirm('Зээлийн дүн (' + fmt(L.amount) + ') банкны гүйлгээнээс (' + fmt(bl.credit || bl.debit) + ') өөр байна. Банкны дүнгээр мөнгө нь бүртгэгдэнэ. Үргэлжлүүлэх үү?')) return;
  var after = function (lid) {
    var taken = L.kind === 'Авсан', E = [], tag = ' #' + lid;
    if (bl) {   // банкны мөрийг энэ зээлийн мөнгө болгож тулгана
      var info = bankAcctInfo(bl.acct), acc = info ? info.acc : '1101', amt = bl.credit || bl.debit;
      E.push({ biz: L.biz, date: bl.date.slice(0, 10), dr: taken ? acc : '1210', cr: taken ? '3501' : acc, amount: amt, partner: L.partner,
               desc: (bl.desc.slice(0, 80) + ' · ' + (taken ? 'Зээл авсан' : 'Зээл олгосон') + ' · ' + L.partner).slice(0, 170) + tag });
      var upd = [{ id: bl.id, status: 'Тулгасан', link: (taken ? 'Зээл · ' : 'Өгсөн зээл · ') + L.partner + ' #' + lid }];
      if (!API_URL) upd.forEach(function (u) { bankLines.forEach(function (x) { if (x.id === u.id) { x.status = u.status; x.link = u.link; } }); }), save('nb_demo_bank', bankLines);
      else post({ type: 'admin_bank', by: ownerName, updates: upd }, function () {});
    }
    if (money === 'open') E.push({ biz: L.biz, date: L.date, dr: taken ? '4201' : '1210', cr: taken ? '3501' : '4201', amount: L.amount, partner: L.partner, desc: 'Зээлийн эхний үлдэгдэл · ' + L.partner + tag });
    else if (money && money !== 'later') E.push({ biz: L.biz, date: L.date, dr: taken ? money : '1210', cr: taken ? '3501' : money, amount: L.amount, partner: L.partner, desc: (taken ? 'Зээл авсан' : 'Зээл олгосон') + ' · ' + L.partner + tag });
    postEntries(E, function () {
      if (remind) {
        var rm = { date: nextPayDate(L.payDay), title: (taken ? 'Зээл төлөх · ' : 'Зээлийн төлбөр авах · ') + L.partner, kind: taken ? 'Зээл төлөх' : 'Авлага авах', amount: 0,
                   partner: L.partner, co: L.biz, repeat: 'Сар бүр', note: 'Зээлийн бүртгэлээс' };
        if (!API_URL) { reminders.push(Object.assign({ id: 'R' + Date.now(), status: 'Хүлээгдэж' }, rm)); save('nb_demo_rem', reminders); }
        else post({ type: 'admin_reminder', reminder: rm }, function () {});
      }
      gClose(); toast(id ? 'Хадгалагдлаа' : 'Зээл бүртгэгдлээ'); if (API_URL) refresh(); else render();
    });
  };
  if (!API_URL) {
    window.loans = window.loans || [];
    if (id) { var cur = loanById(id); Object.assign(cur, L); } else { L.id = 'L' + Date.now(); L.status = 'Идэвхтэй'; window.loans.push(L); }
    save('nb_demo_loans', window.loans); after(id || L.id); return;
  }
  post({ type: 'admin_loan', loan: L, updateId: id || undefined }, function (err, d) { if (err) { toast(err === 'total' ? 'Төлөх нийт дүн (хүүтэй) зээлийн дүнгээс бага байна' : 'Алдаа: ' + err); return; } after(d.id); });
}
function loanStatus(id, what) {
  var L = loanById(id); if (!L) return;
  var js = journal.filter(function (j) { return hasTag(j.desc, id); });
  var bl = (typeof bankLines !== 'undefined' ? bankLines : []).filter(function (x) { return hasTag(x.link, id); });
  if (what === 'cancel' && (js.length || (typeof pfLoanTx === 'function' && pfLoanTx(id).length))) { toast('Гүйлгээтэй зээлийг устгах боломжгүй — төлөгдөж дуусахад «Хаагдсан» болно'); return; }
  if (what === 'cancel' && !confirm('«' + L.partner + '» зээлийг устгах уу?' + (js.length ? '\n\nХолбоотой ' + js.length + ' санхүүгийн бичилт мөн цуцлагдана.' : '') +
    (bl.length ? '\n' + bl.length + ' банкны гүйлгээ дахин «Тулгах» жагсаалтад орно.' : ''))) return;
  if (what === 'close' && !confirm('«' + L.partner + '» зээлийг төлөгдсөн гэж хаах уу?')) return;
  if (!API_URL) {
    L.status = what === 'cancel' ? 'Устгасан' : 'Хаагдсан';
    if (what === 'cancel') { var ids = {}; js.forEach(function (j) { ids[j.id] = 1; }); journal = journal.filter(function (j) { return !ids[j.id]; }); save('nb_demo_journal', journal);
      bl.forEach(function (x) { x.status = 'Шинэ'; x.link = ''; }); save('nb_demo_bank', bankLines); }
    save('nb_demo_loans', window.loans); gClose(); render(); return;
  }
  gClose();
  var n = 1 + (what === 'cancel' ? js.length + (bl.length ? 1 : 0) : 0), fin = function () { if (--n === 0) { toast(what === 'cancel' ? 'Устгагдлаа' : 'Хаагдлаа'); refresh(); } };
  if (what === 'cancel') js.forEach(function (j) { post({ type: 'admin_journal', cancelId: j.id }, function () { fin(); }); });
  if (what === 'cancel' && bl.length) post({ type: 'admin_bank', by: ownerName, updates: bl.map(function (x) { return { id: x.id, status: 'Шинэ', link: '' }; }) }, function () { fin(); });
  post(what === 'cancel' ? { type: 'admin_loan', cancelId: id } : { type: 'admin_loan', closeId: id }, function () { fin(); });
}
// mode: 'pay' — төлөлт (авсан: би төлнө, өгсөн: надад төлнө), 'disb' — зээлийн мөнгө орсон / олгосон
function openLoanPay(id, mode) {
  var L = loanById(id); if (!L) return;
  var s = loanStat(L), taken = L.kind === 'Авсан', pay = mode === 'pay';
  var title = pay ? (taken ? 'Зээлийн төлөлт' : 'Зээлийн төлбөр авсан') : (taken ? 'Зээлийн мөнгө орсон' : 'Зээл олгосон');
  var sc = loanSched(L);
  gOpen('<h2>' + title + '</h2><p class="muted">' + esc(L.partner) + ' · үлдэгдэл ' + mny(s.left) + (L.rate ? ' · сарын хүү ' + L.rate + '%' : '') + '</p>' +
    '<div class="row2"><div><label for="lpDate">Огноо</label><input id="lpDate" type="date" value="' + todayStr() + '"></div>' +
    '<div><label for="lpAcc">' + ((taken ? !pay : pay) ? 'Мөнгө хаана орсон' : 'Мөнгө хаанаас гарсан') + '</label><select id="lpAcc">' + cashAccOpts('1101') + '</select></div></div>' +
    (pay ? '<label for="lpTot">Төлсөн дүн (₮)</label><input id="lpTot" type="number" min="0" inputmode="numeric" value="' + (sc.next ? sc.next.amt : L.monthly || '') + '" oninput="lpAuto(\'' + id + '\')">' +
           '<div class="row2"><div><label for="lpPrin">Үүнээс үндсэн</label><input id="lpPrin" type="number" min="0" inputmode="numeric" oninput="lpSum()"></div>' +
           '<div><label for="lpInt">Үүнээс хүү</label><input id="lpInt" type="number" min="0" inputmode="numeric" oninput="lpSum()"></div></div>' +
           '<p class="muted" id="lpSumInfo" style="font-size:12.5px"></p>'
         : '<label for="lpPrin">Дүн (₮)</label><input id="lpPrin" type="number" min="0" inputmode="numeric" value="' + Math.max(0, r0(L.amount - s.got)) + '">') +
    '<label for="lpNote">Тэмдэглэл</label><input id="lpNote">' +
    '<button class="btn" onclick="saveLoanPay(\'' + id + '\',\'' + mode + '\')">Бүртгэх</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  if (pay) lpAuto(id);
}
function lpAuto(id) {
  var L = loanById(id), x = Number($('lpTot').value) || 0, sp = loanSplit(L, x);
  $('lpPrin').value = x ? sp.prin : ''; $('lpInt').value = x ? sp.intr : ''; lpSum(sp.how);
}
function lpSum(how) { var p = Number($('lpPrin').value) || 0, i = Number($('lpInt').value) || 0; $('lpSumInfo').textContent = 'Үндсэн ' + fmt(p) + ' + хүү ' + fmt(i) + ' = ' + fmt(p + i) + (how ? ' · ' + how + ' задлав (засаж болно)' : ''); }
function saveLoanPay(id, mode) {
  var L = loanById(id); if (!L) return;
  var prin = Number($('lpPrin').value) || 0, intr = mode === 'pay' ? Number(($('lpInt') || {}).value) || 0 : 0, d = $('lpDate').value;
  if (!(prin + intr > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('Огноо оруулна уу'); return; }
  var taken = L.kind === 'Авсан', dir = mode === 'pay' ? (taken ? 'out' : 'in') : (taken ? 'in' : 'out');
  var le = loanEntries(id, dir, $('lpAcc').value, d, prin + intr, intr, $('lpNote').value.trim());
  if (!le) return;
  postEntries(le.entries, function () {
    gClose();
    if (le.closes) { loanClose(id, function () { toast('Бүртгэгдлээ — зээл бүрэн төлөгдөж хаагдлаа'); }); return; }
    toast('Бүртгэгдлээ'); if (API_URL) refresh(); else render();
  });
}
// dir: 'in' — мөнгө орсон, 'out' — гарсан. Авсан зээл: in = зээл орсон, out = төлөлт. Өгсөн: out = олгосон, in = төлбөр авсан.
function loanEntries(id, dir, acc, d, amt, intr, note) {
  var L = loanById(id); if (!L) return null;
  var taken = L.kind === 'Авсан', la = loanAcc(L), ia = loanIntAcc(L), tag = ' #' + L.id, E = [], base = note ? note + ' · ' : '';
  var repay = taken ? dir === 'out' : dir === 'in';
  if (repay && (intr === null || intr === undefined)) intr = loanSplit(L, amt).intr;   // хуваарь / нийт дүнгээр автоматаар
  intr = repay ? Math.max(0, Math.min(Number(intr) || 0, amt)) : 0;
  var prin = r0(amt - intr);
  var push = function (dr, cr, a, txt) { if (a > 0) E.push({ biz: L.biz, date: d, dr: dr, cr: cr, amount: r0(a), partner: L.partner, desc: (base + txt + ' · ' + L.partner).slice(0, 170) + tag }); };
  if (repay) {
    push(taken ? la : acc, taken ? acc : la, prin, taken ? 'Зээлийн төлөлт (үндсэн)' : 'Өгсөн зээлийн төлбөр (үндсэн)');
    push(taken ? ia : acc, taken ? acc : ia, intr, taken ? 'Зээлийн хүү' : 'Зээлийн хүүгийн орлого');
  } else push(taken ? acc : la, taken ? la : acc, amt, taken ? 'Зээл авсан' : 'Зээл олгосон');
  var closes = repay && loanStat(L).left - prin <= 0.5;   // энэ төлөлтөөр бүрэн төлөгдвөл зээл хаагдана
  return { entries: E, closes: closes, link: (taken ? 'Зээл · ' : 'Өгсөн зээл · ') + L.partner + (intr ? ' (хүү ' + fmt(intr) + ')' : '') + ' #' + L.id };
}
function loanClose(id, cb) {
  var L = loanById(id); if (!L) return;
  if (!API_URL) { L.status = 'Хаагдсан'; save('nb_demo_loans', window.loans); render(); if (cb) cb(); return; }
  post({ type: 'admin_loan', closeId: id }, function () { if (cb) cb(); refresh(); });
}
// Банкны хуулгын сонголт: зээлийн чиглэлээр
// Банкны хуулгын сонголт: «Зээл хаах» — үүссэн зээлээс (төлөлт), «Зээл үүсгэх» — шинэ зээл эсвэл бүртгэсэн зээлийн мөнгө орж/гарсан
function loanOpts(biz, isCredit) {
  var close = [], make = [];
  loanList(biz).filter(function (L) { return L.status === 'Идэвхтэй'; }).forEach(function (L) {
    var s = loanStat(L), taken = L.kind === 'Авсан';
    var disb = taken ? isCredit : !isCredit;   // зээлийн мөнгө орж/гарч байгаа чиглэл
    if (!disb && s.left > 0.5) close.push(['L:' + L.id, (taken ? 'Төлөх · ' : 'Төлбөр авах · ') + L.partner + ' · үлдэгдэл ' + mny(s.left), 'Зээл хаах (үүссэн зээлээс)']);
    if (disb && s.got < 0.5) make.push(['L:' + L.id, (taken ? 'Бүртгэсэн зээл орж ирсэн · ' : 'Бүртгэсэн зээл олгосон · ') + L.partner + ' (' + mny(L.amount) + ')', 'Зээл үүсгэх']);
  });
  make.unshift(['LN:new', isCredit ? '+ Шинэ зээл үүсгэх (би авсан)' : '+ Шинэ зээл үүсгэх (би өгсөн)', 'Зээл үүсгэх']);
  return close.concat(make);
}
function loanIntSuggest(pick, l) {   // зээлийн төлөлт бол автомат задаргааны тайлбар, бусад үед null
  if (!pick || pick.indexOf('L:') !== 0) return null;
  var L = loanById(pick.slice(2)); if (!L) return null;
  var repay = L.kind === 'Авсан' ? !l.credit : !!l.credit;
  if (!repay) return null;
  var sp = loanSplit(L, l.credit || l.debit);
  return 'үндсэн ' + fmt(sp.prin) + ' + хүү ' + fmt(sp.intr) + ' (' + sp.how + ')';
}
function bankPickChange(id) {
  var l = bankLines.filter(function (x) { return x.id === id; })[0], el = $('bi_' + id); if (!l || !el) return;
  var v = loanIntSuggest(bankPick[id], l);
  el.style.display = v === null ? 'none' : ''; el.textContent = v || '';
}
// Компани хооронд
function icOpts(biz, isCredit) {
  return ORIG_ALL.filter(function (k) { return k !== biz; }).map(function (k) { return ['IC:' + k, (isCredit ? 'Компани хооронд ← ' : 'Компани хооронд → ') + BUSINESSES[k].name]; });
}

// ═══════════ БАНКНЫ ДАНС ХОЛБОХ ═══════════
// Дансны бүтэн дугаар зөвхөн таны Apps Script-ийн Script Properties-д хадгалагдана (нийтийн кодонд бичигдэхгүй).
function maskNo(no) { no = String(no || ''); return no.length > 4 ? '****' + no.slice(-4) : no; }
function bankLinkView() {
  var links = window.bankLinks || [], cfg = Object.keys(BANK_ACCOUNTS).map(function (k) { return { no: k, biz: BANK_ACCOUNTS[k].biz, acc: BANK_ACCOUNTS[k].acc, name: BANK_ACCOUNTS[k].name, cfg: true }; })
    .filter(function (c) { return !links.some(function (l) { return String(l.no).slice(-4) === c.no; }); });
  var all = links.concat(cfg);
  var mine = all.filter(function (l) { return l.biz === state.biz; });
  return '<p class="hint">Банкны данс бүрийг аль компанийнх (эсвэл удирдлагынх) болохыг энд холбоно. Хуулга оруулахад гүйлгээ тэр компанийн санхүүд автоматаар орно. ' +
    'Нэг компанид хэд хэдэн данс холбож болно — данс бүрт тусдаа санхүүгийн данс (1101, 1102…) өгвөл үлдэгдэл нь тусдаа харагдана.</p>' +
    (!mine.length ? '<div class="card notice"><b>' + esc(BUSINESSES[state.biz].name) + '-д холбосон данс алга.</b> «+ Данс холбох» дарж ' + (state.biz === 'mgmt' ? 'удирдлагын' : 'энэ компанийн') + ' дансаа холбоно уу.</div>' : '') +
    '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Данс</th><th>Нэр</th><th>Компани</th><th>Санхүүгийн данс</th><th></th></tr>' +
    (all.length ? all.map(function (l) {
      return '<tr' + (l.biz === state.biz ? ' class="b"' : '') + '><td>' + esc(maskNo(l.no)) + '</td><td>' + esc(l.name || '') + '</td><td>' + esc((BUSINESSES[l.biz] || {}).name || l.biz) + '</td>' +
        '<td>' + esc(l.acc + ' ' + (cashLinkName(l.acc, l.biz) || accName(l.acc))) + '</td><td class="n">' + (l.cfg ? '<small class="muted">тохиргоонд</small>' : '<button class="mini" onclick="delBankLink(\'' + esc(l.no) + '\')">Салгах</button>') + '</td></tr>';
    }).join('') : '<tr><td colspan="5" class="muted">Холбосон данс алга</td></tr>') + '</table></div></div>';
}
function openBankLink(no, acc0) {
  var ex = no ? allBankLinks().filter(function (l) { return String(l.no) === String(no); })[0] : null;
  gOpen('<h2>Банкны данс холбох</h2>' +
    '<label for="lkNo">Дансны дугаар</label><input id="lkNo" inputmode="numeric" placeholder="Бүтэн дугаар эсвэл сүүлийн 4 орон" value="' + esc(no || '') + '">' +
    '<label for="lkName">Нэр</label><input id="lkName" placeholder="Жишээ: Хаан банк — удирдлага" value="' + esc(ex ? ex.name : '') + '">' +
    '<div class="row2"><div><label for="lkBiz">Компани</label><select id="lkBiz" onchange="$(\'lkAcc\').innerHTML=lkAccOpts(this.value,$(\'lkAcc\').value,$(\'lkNo\').value)">' + ALL_KEYS.map(function (k) { return '<option value="' + k + '"' + (k === (ex ? ex.biz : state.biz) ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '</select></div>' +
    '<div><label for="lkAcc">Санхүүгийн данс</label><select id="lkAcc">' + lkAccOpts(ex ? ex.biz : state.biz, ex ? ex.acc : acc0 || '1101', no) + '</select></div></div>' +
    '<p class="muted" style="font-size:12.5px;margin-top:6px">Компанийн анхны банкны данс бол «Байгууллагын харилцах (1101)». Хоёр дахь данс бол «Шинэ харилцах данс үүсгэх» — үлдэгдэл нь тусдаа харагдана.</p>' +
    '<button class="btn" onclick="saveBankLink()">Холбох</button><button class="btn ghost" onclick="gClose()">Болих</button>');
}
// Тухайн компанийн харилцах дансууд: аль банкны данс холбогдсоныг харуулж, өөр банкны данстай нь сонгуулахгүй (нэг санхүүгийн дансанд нэг банкны данс)
function lkAccOpts(biz, sel, no) {
  no = String(no || '').replace(/\D/g, '');
  return ACCOUNTS.filter(function (a) { return a[3] === 'cash' && a[0] !== '10003' && a[0] !== '110106'; }).map(function (a) {
    var other = allBankLinks().filter(function (l) { return l.biz === biz && l.acc === a[0] && String(l.no).slice(-4) !== no.slice(-4); })[0];
    return '<option value="' + a[0] + '"' + (other ? ' disabled' : '') + (a[0] === sel && !other ? ' selected' : '') + '>' + a[0] + ' ' + esc(other ? (other.name || maskNo(other.no)) + ' — холбогдсон' : (cashLinkName(a[0], biz) || 'Харилцах (чөлөөтэй)')) + '</option>';
  }).join('') + '<option value="new">+ Шинэ харилцах данс үүсгэх</option>';
}
function saveBankLink() {
  var no = $('lkNo').value.replace(/\D/g, ''), name = $('lkName').value.trim(), biz = $('lkBiz').value, acc = $('lkAcc').value;
  if (no.length < 4) { toast('Дансны дугаарын дор хаяж сүүлийн 4 оронг бичнэ үү'); return; }
  var dup = allBankLinks().filter(function (l) { return l.biz === biz && l.acc === acc && String(l.no).slice(-4) !== no.slice(-4); })[0];
  if (dup) { toast(acc + ' дансанд ' + maskNo(dup.no) + ' холбогдсон байна — «Шинэ харилцах данс үүсгэх»-ийг сонгоно уу'); return; }
  var done = function () {
    var links = (window.bankLinks || []).filter(function (l) { return l.no !== no; }).concat([{ no: no, biz: biz, acc: acc, name: name || 'Банк ' + maskNo(no) }]);
    window.bankLinks = links;
    if (!API_URL) { save('nb_demo_banklinks', links); gClose(); render(); toast('Холбогдлоо — хуулгаа оруулна уу'); return; }
    post({ type: 'admin_setting', key: 'banklinks', value: links }, function (err) { if (err) { toast('Алдаа: ' + err); return; } gClose(); toast('Холбогдлоо — хуулгаа оруулна уу'); refresh(); });
  };
  if (acc !== 'new') { done(); return; }
  var code = ''; for (var i = 2; i <= 9; i++) { if (!ACC['110' + i]) { code = '110' + i; break; } }
  if (!code) { toast('Шинэ данс үүсгэх код дууссан — «Дансны төлөвлөгөө»-өөс гараар нэмнэ үү'); return; }
  acc = code;
  accountsX = accountsX.filter(function (a) { return a.code !== code; }).concat([{ code: code, name: (name || 'Харилцах') + ' ' + maskNo(no), type: 'asset', cash: true }]);
  applyCustomAccounts(accountsX);
  if (!API_URL) { save('nb_demo_accx', accountsX); done(); return; }
  post({ type: 'admin_setting', key: 'accounts', value: accountsX }, function (err) { if (err) { toast('Алдаа: ' + err); return; } done(); });
}
function delBankLink(no) {
  if (!confirm('Энэ дансыг салгах уу? (Өмнө оруулсан гүйлгээ хэвээр үлдэнэ)')) return;
  var links = (window.bankLinks || []).filter(function (l) { return l.no !== no; }); window.bankLinks = links;
  if (!API_URL) { save('nb_demo_banklinks', links); render(); return; }
  post({ type: 'admin_setting', key: 'banklinks', value: links }, function (err) { toast(err ? 'Алдаа: ' + err : 'Салгалаа'); refresh(); });
}
