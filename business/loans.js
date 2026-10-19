// ── ЗЭЭЛИЙН БҮРТГЭЛ (авсан / өгсөн), КОМПАНИ ХООРОНД, БАНКНЫ ДАНС ХОЛБОХ ──
// Зээл бүрийн мөнгөн гүйлгээ журналд «#ID» лавлагаатай бичигдэнэ: үндсэн — 3501 (авсан) / 1210 (өгсөн), хүү — 7401 / 5202.

// ── Нийтлэг туслах ──
var _jCache = null;
function Jc() { return _jCache || (_jCache = J()); }   // render бүрт нэг удаа
function hasTag(desc, id) { return !!id && new RegExp('#' + id + '(?![\\w])').test(String(desc || '')); }
function gOpen(html) { $('gBody').innerHTML = html; openSheet('gSheet'); }
function gClose() { closeSheet('gSheet'); }
function cashAccOpts(sel) {
  return ACCOUNTS.filter(function (a) { return a[3] === 'cash'; }).map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === sel ? ' selected' : '') + '>' + esc(a[1]) + '</option>'; }).join('');
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
function loanIntAcc(L) { return L.kind === 'Авсан' ? '7401' : '5202'; }
function loanStat(L, E) {   // got — орсон/олгосон, paid — төлөгдсөн үндсэн, intr — хүү
  var acc = loanAcc(L), ia = loanIntAcc(L), got = 0, paid = 0, intr = 0, last = '';
  (E || Jc()).forEach(function (e) {
    if (!hasTag(e.desc, L.id)) return;
    if (e.dr === acc || e.cr === acc) { var v = (e.dr === acc ? 1 : -1) * e.amount * (L.kind === 'Авсан' ? -1 : 1); if (v > 0) got += v; else paid -= v; last = e.date; }
    else if (e.dr === ia || e.cr === ia) { intr += e.amount; last = e.date; }
  });
  return { got: r0(got), paid: r0(paid), intr: r0(intr), left: r0(got - paid), last: last };
}
function loansView() {
  var E = Jc(), list = loanList(state.biz), b = balances(E, todayStr());
  var sec = function (kind, title, hint) {
    var ls = list.filter(function (l) { return l.kind === kind; }), tot = { amt: 0, got: 0, paid: 0, intr: 0, left: 0 }, taken = kind === 'Авсан';
    var rows = ls.map(function (L) {
      var s = loanStat(L, E), done = s.got > 0.5 && s.left <= 0.5;
      tot.amt += L.amount; tot.got += s.got; tot.paid += s.paid; tot.intr += s.intr; tot.left += s.left;
      var spec = { acc: [loanAcc(L), loanIntAcc(L)], tag: L.id, sign: taken ? -1 : 1, bal: false, t: L.partner + ' — ' + (taken ? 'авсан зээл' : 'өгсөн зээл') };
      var acts = (s.got < L.amount - 0.5 && L.status === 'Идэвхтэй' ? '<button class="mini" onclick="openLoanPay(\'' + L.id + '\',\'disb\')">' + (taken ? 'Мөнгө орсон' : 'Мөнгө өгсөн') + '</button>' : '') +
        (s.left > 0.5 ? '<button class="mini" style="color:var(--accent)" onclick="openLoanPay(\'' + L.id + '\',\'pay\')">' + (taken ? 'Төлөлт' : 'Төлбөр авсан') + '</button>' : '') +
        '<button class="mini" onclick="openLoan(\'' + L.id + '\')">Засах</button>' +
        (done && L.status === 'Идэвхтэй' ? '<button class="mini" onclick="loanStatus(\'' + L.id + '\',\'close\')">Хаах</button>' : '') +
        '<button class="mini" onclick="loanStatus(\'' + L.id + '\',\'cancel\')">Устгах</button>';
      return '<tr><td>' + esc(L.date) + '</td><td><b>' + esc(L.partner) + '</b>' + (L.note ? '<br><small class="muted">' + esc(L.note) + '</small>' : '') + '</td>' +
        '<td class="n">' + mny(L.amount) + '</td><td class="n">' + (L.rate ? L.rate + '%' : '') + '</td><td>' + esc(L.due || '') + (L.payDay ? '<br><small class="muted">сар бүр ' + L.payDay + '-нд</small>' : '') + '</td>' +
        '<td class="n">' + (s.got ? dl(Object.assign({}, spec, { acc: [loanAcc(L)], dir: 1, t: spec.t + ' — ' + (taken ? 'орсон' : 'олгосон') }), mny(s.got)) : '<small class="muted">бүртгэгдээгүй</small>') + '</td>' +
        '<td class="n">' + (s.paid ? dl(Object.assign({}, spec, { acc: [loanAcc(L)], sign: taken ? 1 : -1, dir: 1, t: spec.t + ' — үндсэн төлөлт' }), mny(s.paid)) : '') + '</td>' +
        '<td class="n">' + (s.intr ? dl(Object.assign({}, spec, { acc: [loanIntAcc(L)], sign: taken ? 1 : -1, t: spec.t + ' — хүү' }), mny(s.intr)) : '') + '</td>' +
        '<td class="n"><b>' + mny(s.left) + '</b></td><td>' + (L.status === 'Хаагдсан' || done ? '<span class="tag">Төлөгдсөн</span>' : '<span class="tag b">Идэвхтэй</span>') + '</td>' +
        '<td class="n" style="white-space:nowrap">' + acts + '</td></tr>';
    }).join('');
    var reg = taken ? -(loanCodes().reduce(function (a, k) { return a + (b[k] || 0); }, 0)) : (b['1210'] || 0);   // дансны нийт үлдэгдэл
    var unreg = r0(reg - tot.left);
    return '<div class="card rep"><div class="rep-cap"><b>' + title + '</b><span>' + hint + '</span></div><div class="scroll"><table class="rep-t">' +
      '<tr><th>Огноо</th><th>Харилцагч</th><th class="n">Гэрээний дүн</th><th class="n">Сарын хүү</th><th>Дуусах</th><th class="n">' + (taken ? 'Орсон' : 'Олгосон') + '</th>' +
      '<th class="n">Төлсөн үндсэн</th><th class="n">Хүү</th><th class="n">Үлдэгдэл</th><th>Төлөв</th><th></th></tr>' +
      (rows || '<tr><td colspan="11" class="muted">Бүртгэл алга — «+ ' + (taken ? 'Авсан' : 'Өгсөн') + ' зээл» дарж нэмнэ үү</td></tr>') +
      (ls.length ? '<tr class="tot"><td>Нийт</td><td></td><td class="n">' + mny(tot.amt) + '</td><td></td><td></td><td class="n">' + mny(tot.got) + '</td><td class="n">' + mny(tot.paid) + '</td>' +
        '<td class="n">' + mny(tot.intr) + '</td><td class="n">' + mny(tot.left) + '</td><td></td><td></td></tr>' : '') + '</table></div>' +
      (Math.abs(unreg) >= 1 ? '<p class="rep-note">Бүртгэлгүй (#лавлагаагүй) ' + (taken ? 'авсан' : 'өгсөн') + ' зээлийн үлдэгдэл: <b>' + mny(unreg) + '</b> — өмнө нь «Зээл авсан/төлсөн» гэж шууд бичсэн гүйлгээ.</p>' : '') + '</div>';
  };
  return '<p class="hint">Энд таны бүх зээл, өр бүртгэгдэнэ. Зээл бүрийн мөнгө орсон / төлсөн гүйлгээг «Банкны хуулга»-аас (жагсаалтад зээлийн нэрээр гарна) эсвэл энд «Төлөлт» товчоор бүртгэнэ. ' +
    'Төлөлтийг <b>үндсэн</b> ба <b>хүү</b> гэж салгаснаар зээлийн үлдэгдэл зөв, хүү нь зардалд орно.</p>' +
    sec('Авсан', 'Миний авсан зээл, өр', 'Банк, хүнээс авсан — таны төлөх ёстой') + sec('Өгсөн', 'Миний өгсөн зээл', 'Бусдад өгсөн — танд буцааж өгөх ёстой');
}
function openLoan(id, kind) {
  var L = id ? loanById(id) : null; kind = L ? L.kind : kind || 'Авсан';
  var other = ACCOUNTS.filter(function (a) { return a[3] === 'cash' && a[0] !== '1101' && a[0] !== '10003'; });
  gOpen('<h2>' + (L ? 'Зээл засах' : kind === 'Авсан' ? 'Авсан зээл бүртгэх' : 'Өгсөн зээл бүртгэх') + '</h2>' +
    '<label for="lnKind">Төрөл</label><select id="lnKind"' + (L ? ' disabled' : '') + ' onchange="lnMoneyHint()"><option value="Авсан">Би зээл авсан (миний өр)</option><option value="Өгсөн">Би зээл өгсөн (надад өгөх)</option></select>' +
    '<label for="lnPartner">Харилцагч (банк, хүн, байгууллага)</label><input id="lnPartner" list="lnPartners" placeholder="Жишээ: Хаан банк"><datalist id="lnPartners">' + partnerOptions() + '</datalist>' +
    '<div class="row2"><div><label for="lnDate">Огноо</label><input id="lnDate" type="date"></div><div><label for="lnAmount">Дүн (₮)</label><input id="lnAmount" type="number" min="0" inputmode="numeric"></div></div>' +
    '<div class="row2"><div><label for="lnRate">Сарын хүү (%)</label><input id="lnRate" type="number" min="0" step="any" placeholder="Жишээ: 1.8"></div><div><label for="lnDue">Дуусах огноо</label><input id="lnDue" type="date"></div></div>' +
    '<div class="row2"><div><label for="lnPayDay">Сар бүр төлөх өдөр</label><input id="lnPayDay" type="number" min="1" max="31" placeholder="1–31"></div>' +
    (L ? '<div></div>' : '<div><label style="display:flex;gap:6px;align-items:center;margin-top:26px;font-weight:400"><input type="checkbox" id="lnRemind" checked style="width:auto"> Календарьт сар бүр сануулах</label></div>') + '</div>' +
    (L ? '' : '<label for="lnMoney" id="lnMoneyLabel">Мөнгө</label><select id="lnMoney" onchange="lnMoneyHint()">' +
      '<option value="1101">Харилцах дансаар (одоо бүртгэнэ)</option><option value="10003">Бэлнээр (касс)</option>' +
      other.map(function (a) { return '<option value="' + a[0] + '">' + esc(a[1]) + '</option>'; }).join('') +
      '<option value="later">Банкны хуулгаар дараа тулгана</option><option value="open">Өмнөөс байсан зээл (системээс өмнөх үлдэгдэл)</option></select>' +
      '<p class="muted" id="lnMoneyHint" style="font-size:12.5px;margin-top:6px"></p>') +
    '<label for="lnNote">Тэмдэглэл</label><input id="lnNote" placeholder="Гэрээний дугаар, барьцаа г.м">' +
    '<button class="btn" onclick="saveLoan(' + (L ? '\'' + L.id + '\'' : '') + ')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  $('lnKind').value = kind; $('lnPartner').value = L ? L.partner : ''; $('lnDate').value = L ? L.date : todayStr(); $('lnAmount').value = L ? L.amount : '';
  $('lnRate').value = L && L.rate ? L.rate : ''; $('lnDue').value = L ? L.due : ''; $('lnPayDay').value = L && L.payDay ? L.payDay : ''; $('lnNote').value = L ? L.note : '';
  if (!L) lnMoneyHint();
}
function lnMoneyHint() {
  if (!$('lnMoney')) return;
  var taken = $('lnKind').value === 'Авсан', v = $('lnMoney').value;
  $('lnMoneyLabel').textContent = taken ? 'Мөнгө хаана орсон' : 'Мөнгө хаанаас гарсан';
  $('lnMoneyHint').textContent = v === 'later' ? 'Зээл бүртгэгдэнэ, мөнгө нь банкны хуулгад гарахад «Зээл ' + (taken ? 'орж ирсэн' : 'олгох') + '» гэж сонгож тулгана.' :
    v === 'open' ? 'Системийг ашиглахаас өмнө авсан/өгсөн зээл. «Дүн»-д ОДООГИЙН үлдэгдлийг бичнэ (анхны дүнг тэмдэглэлд).' :
    'Хадгалахад мөнгөн гүйлгээ шууд бичигдэнэ.';
}
function nextPayDate(day) {
  var t = new Date(), y = t.getFullYear(), mo = t.getMonth(), d = Math.min(day, new Date(y, mo + 1, 0).getDate());
  var dt = new Date(y, mo, d); if (todayStr(dt) < todayStr()) { mo++; dt = new Date(y, mo, Math.min(day, new Date(y, mo + 1, 0).getDate())); }
  return todayStr(dt);
}
function saveLoan(id) {
  var L = { biz: state.biz, kind: $('lnKind').value, partner: $('lnPartner').value.trim(), date: $('lnDate').value, amount: Number($('lnAmount').value) || 0,
            rate: Number($('lnRate').value) || 0, due: $('lnDue').value, payDay: Number($('lnPayDay').value) || 0, note: $('lnNote').value.trim() };
  if (L.partner.length < 2) { toast('Харилцагчийн нэрийг бичнэ үү'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(L.date) || !(L.amount > 0)) { toast('Огноо, дүнгээ оруулна уу'); return; }
  if (L.payDay && (L.payDay < 1 || L.payDay > 31)) { toast('Төлөх өдөр 1–31'); return; }
  var money = id ? '' : $('lnMoney').value, remind = !id && $('lnRemind') && $('lnRemind').checked && L.payDay;
  var after = function (lid) {
    var taken = L.kind === 'Авсан', E = [], tag = ' #' + lid;
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
  post({ type: 'admin_loan', loan: L, updateId: id || undefined }, function (err, d) { if (err) { toast('Алдаа: ' + err); return; } after(d.id); });
}
function loanStatus(id, what) {
  var L = loanById(id); if (!L) return;
  var js = journal.filter(function (j) { return hasTag(j.desc, id); });
  if (what === 'cancel' && !confirm('«' + L.partner + '» зээлийг устгах уу?' + (js.length ? '\n\nХолбоотой ' + js.length + ' санхүүгийн бичилт мөн цуцлагдана.' : ''))) return;
  if (what === 'close' && !confirm('«' + L.partner + '» зээлийг төлөгдсөн гэж хаах уу?')) return;
  if (!API_URL) {
    L.status = what === 'cancel' ? 'Устгасан' : 'Хаагдсан';
    if (what === 'cancel') { var ids = {}; js.forEach(function (j) { ids[j.id] = 1; }); journal = journal.filter(function (j) { return !ids[j.id]; }); save('nb_demo_journal', journal); }
    save('nb_demo_loans', window.loans); render(); return;
  }
  var n = 1 + (what === 'cancel' ? js.length : 0), fin = function () { if (--n === 0) { toast(what === 'cancel' ? 'Устгагдлаа' : 'Хаагдлаа'); refresh(); } };
  if (what === 'cancel') js.forEach(function (j) { post({ type: 'admin_journal', cancelId: j.id }, function () { fin(); }); });
  post(what === 'cancel' ? { type: 'admin_loan', cancelId: id } : { type: 'admin_loan', closeId: id }, function () { fin(); });
}
// mode: 'pay' — төлөлт (авсан: би төлнө, өгсөн: надад төлнө), 'disb' — зээлийн мөнгө орсон / олгосон
function openLoanPay(id, mode) {
  var L = loanById(id); if (!L) return;
  var s = loanStat(L), taken = L.kind === 'Авсан', pay = mode === 'pay';
  var title = pay ? (taken ? 'Зээлийн төлөлт' : 'Зээлийн төлбөр авсан') : (taken ? 'Зээлийн мөнгө орсон' : 'Зээл олгосон');
  var intr = pay && L.rate ? Math.round(s.left * L.rate / 100) : 0;
  gOpen('<h2>' + title + '</h2><p class="muted">' + esc(L.partner) + ' · үлдэгдэл ' + mny(s.left) + (L.rate ? ' · сарын хүү ' + L.rate + '%' : '') + '</p>' +
    '<div class="row2"><div><label for="lpDate">Огноо</label><input id="lpDate" type="date" value="' + todayStr() + '"></div>' +
    '<div><label for="lpAcc">' + ((taken ? !pay : pay) ? 'Мөнгө хаана орсон' : 'Мөнгө хаанаас гарсан') + '</label><select id="lpAcc">' + cashAccOpts('1101') + '</select></div></div>' +
    (pay ? '<div class="row2"><div><label for="lpPrin">Үндсэн төлбөр (₮)</label><input id="lpPrin" type="number" min="0" inputmode="numeric" oninput="lpSum()"></div>' +
           '<div><label for="lpInt">Хүү (₮)</label><input id="lpInt" type="number" min="0" inputmode="numeric" value="' + (intr || '') + '" oninput="lpSum()"></div></div>' +
           '<p class="muted" id="lpSumInfo" style="font-size:12.5px"></p>'
         : '<label for="lpPrin">Дүн (₮)</label><input id="lpPrin" type="number" min="0" inputmode="numeric" value="' + Math.max(0, r0(L.amount - s.got)) + '">') +
    '<label for="lpNote">Тэмдэглэл</label><input id="lpNote">' +
    '<button class="btn" onclick="saveLoanPay(\'' + id + '\',\'' + mode + '\')">Бүртгэх</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  if (pay) lpSum();
}
function lpSum() { var p = Number($('lpPrin').value) || 0, i = Number($('lpInt').value) || 0; $('lpSumInfo').textContent = 'Нийт төлбөр: ' + fmt(p + i) + ' (банкны хуулгын дүнтэй таарах ёстой)'; }
function saveLoanPay(id, mode) {
  var L = loanById(id); if (!L) return;
  var prin = Number($('lpPrin').value) || 0, intr = mode === 'pay' ? Number(($('lpInt') || {}).value) || 0 : 0, d = $('lpDate').value;
  if (!(prin + intr > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('Огноо оруулна уу'); return; }
  var taken = L.kind === 'Авсан', dir = mode === 'pay' ? (taken ? 'out' : 'in') : (taken ? 'in' : 'out');
  var le = loanEntries(id, dir, $('lpAcc').value, d, prin + intr, intr, $('lpNote').value.trim());
  if (!le) return;
  postEntries(le.entries, function () { gClose(); toast('Бүртгэгдлээ'); if (API_URL) refresh(); else render(); });
}
// dir: 'in' — мөнгө орсон, 'out' — гарсан. Авсан зээл: in = зээл орсон, out = төлөлт. Өгсөн: out = олгосон, in = төлбөр авсан.
function loanEntries(id, dir, acc, d, amt, intr, note) {
  var L = loanById(id); if (!L) return null;
  var taken = L.kind === 'Авсан', la = loanAcc(L), ia = loanIntAcc(L), tag = ' #' + L.id, E = [], base = note ? note + ' · ' : '';
  var repay = taken ? dir === 'out' : dir === 'in';
  intr = repay ? Math.max(0, Math.min(Number(intr) || 0, amt)) : 0;
  var prin = r0(amt - intr);
  var push = function (dr, cr, a, txt) { if (a > 0) E.push({ biz: L.biz, date: d, dr: dr, cr: cr, amount: r0(a), partner: L.partner, desc: (base + txt + ' · ' + L.partner).slice(0, 170) + tag }); };
  if (repay) {
    push(taken ? la : acc, taken ? acc : la, prin, taken ? 'Зээлийн төлөлт (үндсэн)' : 'Өгсөн зээлийн төлбөр (үндсэн)');
    push(taken ? ia : acc, taken ? acc : ia, intr, taken ? 'Зээлийн хүү' : 'Зээлийн хүүгийн орлого');
  } else push(taken ? acc : la, taken ? la : acc, amt, taken ? 'Зээл авсан' : 'Зээл олгосон');
  return { entries: E, link: (taken ? 'Зээл · ' : 'Өгсөн зээл · ') + L.partner + (intr ? ' (хүү ' + fmt(intr) + ')' : '') };
}
// Банкны хуулгын сонголт: зээлийн чиглэлээр
function loanOpts(biz, isCredit) {
  var out = [];
  loanList(biz).filter(function (L) { return L.status === 'Идэвхтэй'; }).forEach(function (L) {
    var s = loanStat(L), taken = L.kind === 'Авсан';
    var disb = taken ? isCredit : !isCredit;   // зээлийн мөнгө орж/гарч байгаа чиглэл
    if (disb && s.got < L.amount - 0.5) out.push(['L:' + L.id, (taken ? 'Зээл орж ирсэн · ' : 'Зээл олгосон · ') + L.partner + ' (' + mny(L.amount) + ')']);
    if (!disb && s.left > 0.5) out.push(['L:' + L.id, (taken ? 'Зээл төлөх · ' : 'Өгсөн зээлийн төлбөр · ') + L.partner + ' · үлдэгдэл ' + mny(s.left)]);
  });
  return out;
}
function loanIntSuggest(pick, l) {   // зээлийн төлөлт бол хүүгийн санал (сарын хүү × үлдэгдэл), бусад үед null
  if (!pick || pick.indexOf('L:') !== 0) return null;
  var L = loanById(pick.slice(2)); if (!L) return null;
  var repay = L.kind === 'Авсан' ? !l.credit : !!l.credit;
  if (!repay) return null;
  return L.rate ? Math.round(loanStat(L).left * L.rate / 100) : 0;
}
function bankPickChange(id) {
  var l = bankLines.filter(function (x) { return x.id === id; })[0], inp = $('bi_' + id); if (!l || !inp) return;
  var v = loanIntSuggest(bankPick[id], l);
  inp.style.display = v === null ? 'none' : ''; if (v !== null) inp.value = v || '';
}
// Компани хооронд
function icOpts(biz, isCredit) {
  return ALL_KEYS.filter(function (k) { return k !== biz; }).map(function (k) { return ['IC:' + k, (isCredit ? 'Компани хооронд ← ' : 'Компани хооронд → ') + BUSINESSES[k].name]; });
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
        '<td>' + esc(l.acc + ' ' + accName(l.acc)) + '</td><td class="n">' + (l.cfg ? '<small class="muted">тохиргоонд</small>' : '<button class="mini" onclick="delBankLink(\'' + esc(l.no) + '\')">Салгах</button>') + '</td></tr>';
    }).join('') : '<tr><td colspan="5" class="muted">Холбосон данс алга</td></tr>') + '</table></div></div>';
}
function openBankLink(no) {
  gOpen('<h2>Банкны данс холбох</h2>' +
    '<label for="lkNo">Дансны дугаар</label><input id="lkNo" inputmode="numeric" placeholder="Бүтэн дугаар эсвэл сүүлийн 4 орон" value="' + esc(no || '') + '">' +
    '<label for="lkName">Нэр</label><input id="lkName" placeholder="Жишээ: Хаан банк — удирдлага">' +
    '<div class="row2"><div><label for="lkBiz">Компани</label><select id="lkBiz">' + ALL_KEYS.map(function (k) { return '<option value="' + k + '"' + (k === state.biz ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '</select></div>' +
    '<div><label for="lkAcc">Санхүүгийн данс</label><select id="lkAcc">' + cashAccOpts('1101') + '<option value="new">+ Шинэ харилцах данс үүсгэх</option></select></div></div>' +
    '<p class="muted" style="font-size:12.5px;margin-top:6px">Компанийн анхны банкны данс бол «Байгууллагын харилцах (1101)». Хоёр дахь данс бол «Шинэ харилцах данс үүсгэх» — үлдэгдэл нь тусдаа харагдана.</p>' +
    '<button class="btn" onclick="saveBankLink()">Холбох</button><button class="btn ghost" onclick="gClose()">Болих</button>');
}
function saveBankLink() {
  var no = $('lkNo').value.replace(/\D/g, ''), name = $('lkName').value.trim(), biz = $('lkBiz').value, acc = $('lkAcc').value;
  if (no.length < 4) { toast('Дансны дугаарын дор хаяж сүүлийн 4 оронг бичнэ үү'); return; }
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
