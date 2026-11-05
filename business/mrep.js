// ═══════════ ЭНГИЙН ТАЙЛАН: Удирдлагын тайлан, Дансны хуулга ═══════════
// Нягтлан биш хүнд: дансны код, дебет, кредит, журналын бичилтгүй. Албан ёсны тайлан зөвхөн «Нягтлан» цэсэнд.

// Журналын дотоод тэмдэглэгээг (#O123, #BGT:…) харуулахгүй
function stmtDesc(d) { return String(d || '').replace(/\s*#\S+/g, '').replace('Захирлын зарлага', 'Удирдлагын зарлага').trim(); }

// Нэг өдрийн бичилтийг банкны хуулгын дарааллаар — журналд цаг байхгүй тул мөр бүрийн үлдэгдэл банктай таарахгүй байсан.
// Холбоо: 1) мөрийн «Бичилт» ID; 2) ижил өдөр, ижил дүн; 3) нэг багц бичилтийн нийлбэр (Boost-ыг бараагаар хуваасан). Эхний үлдэгдэл эхэнд, банкны мөргүй нь өдрийн сүүлд.
function stmtBankOrder(L) {
  var rank = {}, used = {}, done = {};
  var put = function (i, n) { rank[i] = n; used[i] = 1; }, mine = function (l, x) { var inf = bankAcctInfo(l.acct); return inf && inf.acc === x.acc; };
  var B = bankChain(bankLines.filter(function (l) { return l.biz === state.biz && l.status === 'Тулгасан' && !/^Эхний үлдэгдэл/.test(String(l.link)); }));
  B.forEach(function (l, n) {
    String(l.jids || '').split(',').filter(Boolean).forEach(function (id) { L.forEach(function (x, i) { if (x.ref === id && !used[i] && mine(l, x)) { put(i, n); done[n] = 1; } }); });
  });
  var free = function (l, f) { var d = l.date.slice(0, 10), R = []; L.forEach(function (x, i) { if (!used[i] && x.date === d && mine(l, x) && (!f || f(x))) R.push(i); }); return R; };
  B.forEach(function (l, n) {
    if (done[n]) return;
    var v = (Number(l.credit) || 0) - (Number(l.debit) || 0), one = free(l, function (x) { return Math.abs(x.raw - v) < 0.5; });
    if (one.length) { put(one[0], n); done[n] = 1; return; }
    var G = {}; free(l).forEach(function (i) { var k = String(L[i].ref).replace(/-\d+$/, ''); (G[k] = G[k] || []).push(i); });
    Object.keys(G).some(function (k) {
      if (Math.abs(G[k].reduce(function (a, i) { return a + L[i].raw; }, 0) - v) >= 0.5) return false;
      G[k].forEach(function (i) { put(i, n); }); done[n] = 1; return true;
    });
  });
  var key = function (i) { return rank[i] !== undefined ? rank[i] : L[i].other === '4201' ? -1 : 1e9; };
  L.forEach(function (x, i) { if (rank[i] !== undefined) x.bl = B[rank[i]]; });
  return L.map(function (x, i) { return i; }).sort(function (a, b) { return L[a].date < L[b].date ? -1 : L[a].date > L[b].date ? 1 : key(a) - key(b) || a - b; }).map(function (i) { return L[i]; });
}

// ── Дансны хуулга: банкны хуулгын хэлбэрээр — нэг банкны гүйлгээ нэг мөр, банкны цаг, утга, харьцсан данс; хуулгагүй (касс г.м) мөр журналын тайлбараар ──
function repStmt(E, from, to, code) {
  var all = code === 'cashall', A = all ? cashCodes() : [code];
  var d = drillLines({ acc: A, from: from, to: to, sign: 1, bal: true, grp: 'type' }, E), bal = d.open, tin = 0, tout = 0, G = [];
  stmtBankOrder(d.lines).forEach(function (x) {
    var g = G[G.length - 1];
    if (x.bl && g && g.bl === x.bl && g.acc === x.acc) g.v += x.v;   // Boost-ыг бараагаар хуваасан ч банкинд нэг гүйлгээ
    else G.push({ bl: x.bl, acc: x.acc, v: x.v, date: x.date, key: x.key, desc: x.desc });
  });
  var rows = [{ date: from, open: '', in: '', out: '', bal: r0(d.open), desc: 'Эхний үлдэгдэл', party: '', acc: '', type: '', _b: 1 }];
  G.forEach(function (g) {
    var l = g.bl, st = bal; bal += g.v; if (g.v > 0) tin += g.v; else tout -= g.v;
    rows.push({ date: l ? String(l.date).slice(0, 16) : g.date, open: r0(st), in: g.v > 0 ? r0(g.v) : '', out: g.v < 0 ? r0(-g.v) : '', bal: r0(bal),
      desc: l ? l.desc : stmtDesc(g.desc), party: l ? l.party : '', acc: accName(g.acc), type: g.key });
  });
  var cols = [c('date', 'Гүйлгээний огноо')].concat(all ? [c('acc', 'Данс')] : [], [m('open', 'Эхний үлдэгдэл'), m('in', 'Орсон'), m('out', 'Гарсан'), m('bal', 'Эцсийн үлдэгдэл'), c('desc', 'Гүйлгээний утга'), c('party', 'Харьцсан данс'), c('type', 'Төрөл')]);
  var pend = bankLines.filter(function (l) { var inf = bankAcctInfo(l.acct); return l.biz === state.biz && l.status === 'Шинэ' && inf && A.indexOf(inf.acc) >= 0; }).length;
  return { title: 'Дансны хуулга · ' + (all ? 'бүх данс' : accName(code)), cols: cols, rows: rows, hideCount: true, note: pend ? 'Тулгаагүй ' + pend + ' гүйлгээ энд ороогүй — «Банкны хуулга»-д тулгасны дараа орно.' : '', open: r0(d.open), tin: r0(tin), tout: r0(tout), close: r0(bal),
    total: { desc: 'Эцсийн үлдэгдэл', in: r0(tin), out: r0(tout), bal: r0(bal) } };
}
function stmtPre(rep) {
  var b = balances(J(), todayStr()), cur = state.stmtAcc || 'cashall', L = cashCodes().filter(function (k) { return Math.abs(b[k] || 0) >= 0.5 || k === cur || J().some(function (e) { return e.dr === k || e.cr === k; }); });
  var tot = cashCodes().reduce(function (a, k) { return a + (b[k] || 0); }, 0);
  var opt = function (k, n, v) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(n) + ' — ' + mny(v) + '</option>'; };
  var kp = function (l, v, cls) { return '<div class="fn-kpi"><small>' + l + '</small><b class="' + (cls || '') + '">' + mny(v) + '</b></div>'; };
  return '<div class="st-pick"><label>Данс <select onchange="state.stmtAcc=this.value;render()">' + opt('cashall', 'Бүх данс', tot) + L.map(function (k) { return opt(k, accName(k), b[k] || 0); }).join('') + '</select></label></div>' +
    '<div class="fn-kpis">' + kp('Эхний үлдэгдэл', rep.open) + kp('Орсон', rep.tin, 'pos') + kp('Гарсан', rep.tout, 'neg') + kp('Эцсийн үлдэгдэл', rep.close) + '</div>';
}

// ── Удирдлагын тайлан ──
function mrepDebt(E, k, to, n, skip) {   // «Авлага», «Өглөг» хуудасны үлдэгдэлтэй ижил; to — тухайн өдрийн байдлаар, n — нэрсийн тоо
  var td = to || todayStr(), T = DEBT_TABS[k], left = 0, who = {};
  openItems(debtE(E, k, td), debtAccs(k), T[3], td, false).items.forEach(function (it) { if (debtStatus(it) !== 'closed' && it.who !== skip) { var v = it.amt - it.paid; left += v; who[it.who] = (who[it.who] || 0) + v; } });
  return { left: r0(left), top: Object.keys(who).filter(function (w) { return who[w] > 0.5; }).sort(function (a, b) { return who[b] - who[a]; }).slice(0, n || 5).map(function (w) { return [nameTel(w), who[w]]; }) };
}
function mrepData(E, f, t) {
  var td = todayStr(), p = plData(E, f, t), b = balances(E, td), g = function (k) { return b[k] || 0; }, cash = cashCodes();
  var moneyL = cash.filter(function (k) { return Math.abs(g(k)) >= 1; }).map(function (k) { return [accName(k), g(k)]; });
  var exps = p.exps.slice().sort(function (x, y) { return y.v - x.v; }).map(function (x) { return [EXP_SHORT[x.code] || x.name, x.v]; });
  var items = repSalesBy(R(), state.biz, f, t, 'item', function (x) { return !isNonGoods(x.item); }).rows.slice().sort(function (x, y) { return y.net - x.net; }).slice(0, 5).map(function (x) { return [x.key, x.net]; });
  return { p: p, money: cash.reduce(function (a, k) { return a + g(k); }, 0), moneyL: moneyL, exps: exps, items: items, stock: g('1404'), recv: mrepDebt(E, 'r'), payb: mrepDebt(E, 'p'), loan: -loanCodes().reduce(function (a, k) { return a + g(k); }, 0) };
}
function repMgmt(E, f, t) {   // Excel, хэвлэх
  var D = mrepData(E, f, t), p = D.p, rows = [], h = function (n) { rows.push({ name: n, v: '', _b: 1 }); }, l = function (n, v) { rows.push({ name: n, v: r0(v) }); };
  h('Ашиг'); l('Борлуулалт', p.net); l('Барааны өртөг', -p.cogs); l('Зардал', -p.expT); if (p.other) l('Бусад орлого', p.other); l('Ашиг', p.profit);
  h('Зардал юунд гарсан'); D.exps.forEach(function (x) { l(x[0], x[1]); });
  h('Мөнгө (өнөөдөр)'); D.moneyL.forEach(function (x) { l(x[0], x[1]); }); l('Нийт мөнгө', D.money);
  h('Авах, өгөх (өнөөдөр)'); l('Бидэнд өгөх', D.recv.left); l('Бидний өгөх', D.payb.left); if (D.loan > 0.5) l('Зээлийн үлдэгдэл', D.loan); l('Барааны үлдэгдэл (авсан үнээр)', D.stock);
  return { title: 'Удирдлагын тайлан', cols: [c('name', 'Үзүүлэлт'), m('v', 'Дүн')], rows: rows };
}
function mrepView() {
  var r = range(), f = r[0], t = r[1], E = J(), D = mrepData(E, f, t), p = D.p;
  var kp = function (l, v, cls) { return '<div class="fn-kpi"><small>' + l + '</small><b class="' + (cls || '') + '">' + mny(v) + '</b></div>'; };
  var ln = function (n, v, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + esc(n) + '</td><td class="n' + (v < -0.5 ? ' neg' : '') + '">' + mny(v) + '</td></tr>'; };
  var more = function (k, txt) { return '<div class="mr-more"><button class="link" onclick="navGo(\'' + k + '\')">' + txt + ' →</button></div>'; };
  var card = function (h, body, k, txt) { return '<div class="card"><h2>' + h + '</h2><table class="rep-t">' + body + '</table>' + (k ? more(k, txt) : '') + '</div>'; };
  var none = function (txt) { return '<tr><td class="muted">' + txt + '</td><td></td></tr>'; };
  var spent = p.cogs + p.expT;
  var top = D.exps.slice(0, 6), rest = D.exps.slice(6).reduce(function (a, x) { return a + x[1]; }, 0);
  var sent = 'Энэ хугацаанд <b>' + mny(p.net) + '</b>-ийн борлуулалт хийж, <b>' + mny(spent) + '</b> зарцуулаад ' +
    (p.profit >= 0 ? '<b class="pos">' + mny(p.profit) + '</b> ашигтай' : '<b class="neg">' + mny(-p.profit) + '</b> алдагдалтай') + ' ажилласан. Өнөөдөр данснуудад <b>' + mny(D.money) + '</b> байна.';
  return '<div class="fn-kpis">' + kp('Борлуулалт', p.net, 'pos') + kp('Зарцуулсан', spent, 'neg') + kp(p.profit >= 0 ? 'Ашиг' : 'Алдагдал', Math.abs(p.profit), p.profit >= 0 ? 'pos' : 'neg') + kp('Мөнгө (өнөөдөр)', D.money) + '</div>' +
    '<div class="card"><p class="mr-s">' + sent + '</p></div>' +
    '<div class="grid2">' +
      card('Ашиг хэрхэн гарсан', ln('Борлуулалт', p.net) + ln('Барааны өртөг', -p.cogs) + ln('Зардал', -p.expT) + (p.other ? ln('Бусад орлого', p.other) : '') + ln('Ашиг', p.profit, 'tot'), 'finance/months', '12 сарын дүн') +
      card('Зардал юунд гарсан', (top.length ? top.map(function (x) { return ln(x[0], x[1]); }).join('') + (rest > 0.5 ? ln('Бусад', rest) : '') + ln('Нийт', p.expT, 'tot') : none('Зардал алга')), 'finance/expcat', 'Зардлын задаргаа') +
    '</div><div class="grid2">' +
      card('Мөнгө хаана байна', (D.moneyL.length ? D.moneyL.map(function (x) { return ln(x[0], x[1]); }).join('') : none('Мөнгөний үлдэгдэл алга')) + ln('Нийт', D.money, 'tot'), 'finance/stmt', 'Дансны хуулга') +
      card('Хамгийн их зарагдсан бараа', D.items.length ? D.items.map(function (x) { return ln(x[0], x[1]); }).join('') : none('Борлуулалт алга'), 'sales/item', 'Борлуулалтын тайлан') +
    '</div><div class="grid2">' +
      card('Бидэнд өгөх мөнгө', D.recv.top.map(function (x) { return ln(x[0], x[1]); }).join('') + ln('Нийт', D.recv.left, 'tot'), 'finance/recv', 'Авлага') +
      card('Бидний өгөх мөнгө', D.payb.top.map(function (x) { return ln(x[0], x[1]); }).join('') + ln('Нийт', D.payb.left, 'tot') + (D.loan > 0.5 ? ln('Зээлийн үлдэгдэл', D.loan) : ''), 'finance/payb', 'Өглөг') +
    '</div>';
}

// ═══════════ САРЫН ТАЙЛАН ═══════════
// Цаасан «Санхүүгийн дотоод тайлан»-гийн хэлбэрээр: сар бүрийн багана, нэг хэвлэмэл баримт. Бүх тоо журнал, борлуулалтаас — гараар бичихгүй.
// Хүснэгт бүр { t: гарчиг, h: баганууд, r: [{ c: нүднүүд, k: 'tot'|'hd'|'sub' }] } — дэлгэц, хэвлэх, Excel нэг өгөгдлөөс.
var MR_ACC = { '1298': 'Баталгаажаагүй шилжүүлэг', '1404': 'Барааны үлдэгдэл', '1503': 'Барааны урьдчилгаа', '1505': 'Замд яваа бараа', '1208': 'Удирдлагаас авах', '1207': 'Ажилчдаас авах', '3101': 'Өглөг', '3301': 'Цалингийн өглөг', '3402': 'НӨАТ-ын өр',
  '3403': 'НДШ-ийн өглөг', '3404': 'ХХОАТ-ын өглөг', '3802': 'Хэрэглэгчийн урьдчилгаа' };
var MR_SIGN = { travel: { signBoss: 'Г.Мэнх-Учрал', signOps: 'Б.Дэлгэрбат', signAcct: 'Н.Анужин' } };
function mrMoName(m) { return Number(m.slice(5, 7)) + ' сар'; }
function mrMonths() {   // сонгосон сарууд (хамгийн ихдээ 12)
  var cur = todayStr().slice(0, 7), to = state.mrTo || cur, from = state.mrFrom || rvPrevMo(cur), out = [];
  if (from > to) { var x = from; from = to; to = x; }
  for (var m = to; m >= from && out.length < 12; m = rvPrevMo(m)) out.unshift(m);
  return out;
}
function mrTitle(ms) {
  var a = ms[0], b = ms[ms.length - 1], y = a.slice(0, 4), n = function (m) { return Number(m.slice(5, 7)); };
  var per = y !== b.slice(0, 4) ? y + ' оны ' + n(a) + ' сараас ' + b.slice(0, 4) + ' оны ' + n(b) + ' сарын' : y + ' оны ' + (ms.length > 3 ? n(a) + '–' + n(b) : ms.map(n).join(', ')) + ' сарын';
  var nm = BUSINESSES[state.biz].name;
  return nm + (/[а-яөүё]$/i.test(nm) ? 'ийн ' : '-ийн ') + per + ' санхүүгийн дотоод тайлан';
}
function mrSigns() { var c = (window.companyInfo || {})[state.biz] || {}, d = MR_SIGN[state.biz] || {}; return ['signBoss', 'signOps', 'signAcct'].map(function (k) { return c[k] || d[k] || ''; }); }
function mrPct(a, b) { return b ? Math.round(a / b * 1000) / 10 + '%' : '—'; }
function mrChg(a, b) { if (!(b > 0)) return '—'; var v = Math.round((a - b) / b * 1000) / 10; return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%'; }
function mrSum(L) { return L.reduce(function (a, v) { return a + (Number(v) || 0); }, 0); }
// Посын тооцоо: Cozy-ийн картын мөнгө аяллын дэлгүүрийн посоор дамждаг. Нэг мөнгө хоёр компанид тоологдохгүйн тулд
// аяллын дэлгүүрийн мөнгө, өглөгөөс хасна (өөрийн мөнгө биш); Cozy-д банкинд ороогүй хэсгийг «Посын авлага» гэж тусад нь харуулна.
function mrPos(E, to, biz) {
  var who = biz === POS_SHARE.to ? POS_SHARE.pay : POS_SHARE.rec, acc = biz === POS_SHARE.to ? '3101' : '1201', sg = biz === POS_SHARE.to ? -1 : 1, v = 0;
  E.forEach(function (x) { if (x.partner !== who || x.date > to) return; if (x.dr === acc) v += sg * x.amount; if (x.cr === acc) v -= sg * x.amount; });
  return v;
}
function mrData(ms) {
  var biz = state.biz, E = J(), Rr = R(), td = todayStr(), cash = cashCodes(), n = ms.length, many = n > 1, isTo = biz === POS_SHARE.to, isFrom = biz === POS_SHARE.from;
  var M = ms.map(function (mm) {
    var f = mm + '-01', e = lastDayOf(mm), t = e < td ? e : td, p = plData(E, f, t), b = balances(E, t), b0 = balances(E, prevDay(f)), io = { i: {}, o: {} }, spFee = 0, sp = 0;
    drillLines({ acc: cash, from: f, to: t, sign: 1, grp: 'type' }, E).lines.forEach(function (x) { if (x.partner === POS_SHARE.pay) return; var g = x.v > 0 ? io.i : io.o; g[x.key] = (g[x.key] || 0) + Math.abs(x.v); });
    E.forEach(function (x) {
      if (x.partner === 'StorePay' && x.date <= t) { if (x.dr === '1201') sp += x.amount; if (x.cr === '1201') sp -= x.amount; }
      if (x.partner === 'StorePay' && x.date >= f && x.date <= t) { if (ACC[x.dr] && ACC[x.dr].type === 'exp') spFee += x.amount; if (ACC[x.cr] && ACC[x.cr].type === 'exp') spFee -= x.amount; }
    });
    var pos = posBiz(biz) ? mrPos(E, t, biz) : 0, pos0 = isTo ? mrPos(E, prevDay(f), biz) : 0;
    return { m: mm, f: f, t: t, part: t !== e, p: p, b: b, io: io, sp: sp, spFee: spFee, pos: pos, open: mrSum(cash.map(function (k) { return b0[k]; })) - pos0,
      bills: groupBills(salesIn(Rr, biz, f, t)).filter(function (x) { return x.gross > 0; }).length,
      pay: repSalesBy(Rr, biz, f, t, 'pay').rows, cat: repSalesBy(Rr, biz, f, t, 'cat').rows };
  });
  var head = ['Үзүүлэлт'].concat(M.map(function (x) { return mrMoName(x.m); }));
  var cmp = many && !M[n - 1].part;   // дуусаагүй сарыг бүтэн сартай харьцуулахгүй
  var flow = function (name, get, k, noChg) {   // сарын дүн + нийт + сүүлийн 2 сарын өөрчлөлт
    var v = M.map(get), r = [name].concat(v);
    if (many) r.push(mrSum(v)); if (cmp) r.push(noChg ? '' : mrChg(v[n - 1], v[n - 2]));
    return { c: r, k: k };
  };
  var hFlow = head.concat(many ? ['Нийт'] : [], cmp ? ['Өөрчлөлт'] : []);
  // ── Санхүүгийн байдал (сарын эцэст) ──
  var hBal = ['Үзүүлэлт'].concat(M.map(function (x) { return Number(x.t.slice(5, 7)) + ' сарын ' + Number(x.t.slice(8, 10)) + '-нд'; }));
  var rowsOf = function (L, sign) { return L.map(function (a) { return { n: a[1], v: M.map(function (x) { return (x.b[a[0]] || 0) * sign; }), code: a[0] }; }); };
  var live = function (r) { return r.v.some(function (v) { return Math.abs(v) >= 0.5; }); };
  var money = rowsOf(ACCOUNTS.filter(function (a) { return a[3] === 'cash'; }), 1).filter(live), bal = [];
  var other = rowsOf(ACCOUNTS.filter(function (a) { return a[2] === 'asset' && a[3] !== 'cash'; }), 1).filter(live), liab = rowsOf(ACCOUNTS.filter(function (a) { return a[2] === 'liab'; }), -1).filter(live);
  var rec = other.filter(function (r) { return r.code === '1201'; })[0];
  var split = function (name, v, code) {   // авлагаас тусдаа мөр — цаасан тайлан шиг
    if (!rec || !v.some(function (x) { return Math.abs(x) >= 0.5; })) return;
    rec.v = rec.v.map(function (x, i) { return x - v[i]; });
    other.splice(other.indexOf(rec) + 1, 0, { n: name, v: v, code: code });
  };
  split('Төлөгдөөгүй тооцоо (StorePay)', M.map(function (x) { return x.sp; }), 'sp');
  if (isFrom) split('Посын авлага (банкинд ороогүй)', M.map(function (x) { return x.pos; }), 'pos');
  if (isTo && M.some(function (x) { return Math.abs(x.pos) >= 0.5; })) {
    money.push({ n: 'Хасах: ' + BUSINESSES[POS_SHARE.from].name + '-ийн посын мөнгө', v: M.map(function (x) { return -x.pos; }), code: 'pos' });
    liab.forEach(function (r) { if (r.code === '3101') r.v = r.v.map(function (x, i) { return x - M[i].pos; }); });
    liab = liab.filter(live);
  }
  other = other.filter(live);
  var nm = function (r) { return r.code === '1201' ? 'Авлага (бусдаас авах төлбөр)' : MR_ACC[r.code] || r.n; };
  var tot = function (L) { return M.map(function (x, i) { return mrSum(L.map(function (r) { return r.v[i]; })); }); };
  var line = function (r) { bal.push({ c: [nm(r)].concat(r.v) }); };
  var tMoney = tot(money), tOther = tot(other), tA = tMoney.map(function (v, i) { return v + tOther[i]; }), tL = tot(liab);
  bal.push({ c: ['Мөнгө'].concat(M.map(function () { return ''; })), k: 'hd' }); money.forEach(line); bal.push({ c: ['Нийт мөнгө'].concat(tMoney), k: 'sub' });
  bal.push({ c: ['Авлага, бараа, бусад хөрөнгө'].concat(M.map(function () { return ''; })), k: 'hd' }); other.forEach(line);
  bal.push({ c: ['Нийт хөрөнгө'].concat(tA), k: 'tot' });
  liab.forEach(line); bal.push({ c: ['Нийт өглөг, өр төлбөр'].concat(tL), k: 'sub' });
  bal.push({ c: ['Өглөгийн дараах цэвэр үлдэгдэл'].concat(tA.map(function (v, i) { return v - tL[i]; })), k: 'tot' });
  // ── Орлого, ашиг ──
  var P = function (k, s) { return function (x) { return (s || 1) * x.p[k]; }; }, pl = [], hasRet = M.some(function (x) { return x.p.ret; }), hasDisc = M.some(function (x) { return x.p.disc; });
  if (hasRet || hasDisc) pl.push(flow('Борлуулалт', P('sales')));
  if (hasRet) pl.push(flow('Буцаалт', P('ret', -1), '', 1));
  if (hasDisc) pl.push(flow('Хөнгөлөлт', P('disc', -1), '', 1));
  pl.push(flow('Борлуулалтын орлого', P('net'), 'sub'), flow('Барааны өртөг', P('cogs', -1), '', 1), flow('Нийт ашиг', P('gross'), 'sub'), flow('Зардал', P('expT', -1), '', 1));
  if (M.some(function (x) { return x.p.other; })) pl.push(flow('Бусад орлого', P('other'), '', 1));
  pl.push(flow('Цэвэр ашиг (алдагдал)', P('profit'), 'tot'));
  var ratio = function (name, g, all) { var r = [name].concat(M.map(g)); if (many) r.push(all); if (cmp) r.push(''); return { c: r }; };
  var sN = mrSum(M.map(P('net'))), sG = mrSum(M.map(P('gross'))), sP = mrSum(M.map(P('profit'))), sB = mrSum(M.map(function (x) { return x.bills; }));
  pl.push(ratio('Нийт ашгийн хувь', function (x) { return mrPct(x.p.gross, x.p.net); }, mrPct(sG, sN)), ratio('Цэвэр ашгийн хувь', function (x) { return mrPct(x.p.profit, x.p.net); }, mrPct(sP, sN)));
  var cnt = ['Борлуулалтын баримт (ш)'].concat(M.map(function (x) { return String(x.bills); })); if (many) cnt.push(String(sB)); if (cmp) cnt.push(mrChg(M[n - 1].bills, M[n - 2].bills)); pl.push({ c: cnt });
  pl.push(ratio('Дундаж баримт', function (x) { return x.bills ? mny(x.p.net / x.bills) : '—'; }, sB ? mny(sN / sB) : '—'));
  // ── Зардал ──
  var X = {}; M.forEach(function (x, i) { x.p.exps.forEach(function (e) { (X[e.code] = X[e.code] || M.map(function () { return 0; }))[i] = e.v; }); });
  var ex = Object.keys(X).sort(function (a, b) { return mrSum(X[b]) - mrSum(X[a]); }).map(function (k) { return flow(EXP_SHORT[k] || accName(k), function (x, i) { return X[k][i]; }); });
  ex.push(flow('Нийт зардал', P('expT'), 'tot'));
  // ── Мөнгөний урсгал ──
  var keys = function (g) { var o = {}; M.forEach(function (x) { Object.keys(x.io[g]).forEach(function (k) { o[k] = (o[k] || 0) + x.io[g][k]; }); }); return Object.keys(o).filter(function (k) { return k !== 'Данс хооронд' && o[k] >= 0.5; }).sort(function (a, b) { return o[b] - o[a]; }); };
  var cf = [], hCash = head.concat(many ? ['Нийт'] : []), row = function (name, v, k, all) { cf.push({ c: [name].concat(v, many ? [all] : []), k: k }); };
  var part = function (g, label) {
    var K = keys(g), V = M.map(function (x) { return mrSum(K.map(function (k) { return x.io[g][k]; })); });
    row(label, V, 'sub', mrSum(V));
    K.forEach(function (k) { var v = M.map(function (x) { return x.io[g][k] || 0; }); row(k, v, '', mrSum(v)); });
    return V;
  };
  var opens = M.map(function (x) { return x.open; });
  row('Эхний үлдэгдэл', opens, 'sub', opens[0]);
  var vin = part('i', 'Орсон мөнгө'), vout = part('o', 'Гарсан мөнгө'), closes = M.map(function (x, i) { return x.open + vin[i] - vout[i]; });
  row('Эцсийн үлдэгдэл', closes, 'tot', closes[n - 1]);
  // ── Бараа: хугацааны нийтээр ──
  var f0 = M[0].f, t1 = M[n - 1].t, pr = repProfit(Rr, biz, f0, t1), P2 = BUSINESSES[biz].products || [], code = function (k) { var q = P2.filter(function (x) { return x.name === k; })[0]; return q && q.code || ''; };
  var sold = pr.rows.filter(function (r) { return r.cogs !== '' && r.net > 0; }), hasCode = sold.some(function (r) { return code(r.key); }), noCost = pr.rows.filter(function (r) { return r.cogs === '' && r.net > 0; }).length;
  var iHead = ['№'].concat(hasCode ? ['Барааны код'] : [], ['Барааны нэр', 'Тоо ширхэг', 'Нийт нэгж өртөг', 'Борлуулалтын дүн', 'Ашиг']);
  var iTbl = function (t, L) {
    var rows = L.map(function (r, i) { return { c: [String(i + 1)].concat(hasCode ? [code(r.key)] : [], [r.key, String(r.qty), Number(r.cogs), r.net, Number(r.margin)]) }; });
    var g = function (k) { return mrSum(L.map(function (r) { return r[k]; })); };
    if (L.length) rows.push({ c: ['Нийт'].concat(hasCode ? [''] : [], ['', String(r0(g('qty'))), g('cogs'), g('net'), g('margin')]), k: 'tot' });
    return { t: t, h: iHead, r: rows, left: hasCode ? 3 : 2, empty: 'Борлуулалт алга' };
  };
  var pLab = n > 1 ? mrMoName(ms[0]) + ' – ' + mrMoName(ms[n - 1]) + ' ' + ms[n - 1].slice(0, 4) : mrMoName(ms[0]) + ' ' + ms[0].slice(0, 4);
  var best = sold.slice(0, 5), low = sold.slice().sort(function (a, b) { return Number(a.margin) - Number(b.margin); }).filter(function (r) { return best.indexOf(r) < 0; }).slice(0, 5);
  // ── Ангилал ──
  var C = {}; M.forEach(function (x, i) { x.cat.forEach(function (r) { (C[r.key] = C[r.key] || M.map(function () { return 0; }))[i] = r.net; }); });
  var cAll = mrSum(Object.keys(C).map(function (k) { return mrSum(C[k]); }));
  var cat = Object.keys(C).filter(function (k) { return Math.abs(mrSum(C[k])) >= 0.5; }).sort(function (a, b) { return mrSum(C[b]) - mrSum(C[a]); }).map(function (k) {
    return { c: [k].concat(C[k], many ? [mrSum(C[k])] : [], [mrPct(mrSum(C[k]), cAll)]) }; });
  if (cat.length) cat.push({ c: ['Нийт'].concat(M.map(function (x, i) { return mrSum(Object.keys(C).map(function (k) { return C[k][i]; })); }), many ? [cAll] : [], ['100%']), k: 'tot' });
  // ── Төлбөрийн хэлбэр (сар бүр) ──
  var pays = M.map(function (x) {
    var L = x.pay.filter(function (r) { return Math.abs(r.net) >= 0.5; }).sort(function (a, b) { return b.net - a.net; }).map(function (r) {
      var fee = r.key === 'Карт' && posBiz(biz) ? r.net - posNet(r.net) : r.key === 'StorePay' ? x.spFee : 0;
      return { c: [r.key, r.net, fee, r.net - fee] }; });
    var s = function (i) { return mrSum(L.map(function (r) { return r.c[i]; })); };
    if (L.length) L.push({ c: ['Нийт', s(1), s(2), s(3)], k: 'tot' });
    return { t: mrMoName(x.m) + 'ын борлуулалтын төлбөрийн арга', h: ['Төлбөрийн хэлбэр', 'Борлуулалтын дүн', 'Шимтгэл', 'Шимтгэл хасагдсан дүн'], r: L, empty: 'Борлуулалт алга' };
  });
  // ── Авлага, өглөг: сүүлийн өдрийн байдлаар ──
  var debt = function (k, t) { var D = mrepDebt(E, k, t1, 8, isTo && k === 'p' ? POS_SHARE.pay : ''), R2 = D.top.map(function (x) { return { c: [x[0], x[1]] }; }), rest = D.left - mrSum(D.top.map(function (x) { return x[1]; })); if (rest >= 0.5) R2.push({ c: ['Бусад', rest] }); if (R2.length) R2.push({ c: ['Нийт', D.left], k: 'tot' }); return { t: t, h: ['Харилцагч', 'Үлдэгдэл'], r: R2, empty: 'Үлдэгдэл алга' }; };
  // ── Тулгалт: тайлан доторх тоонууд өөр хоорондоо таарч байна уу ──
  var chk = [], bad = function (t) { chk.push(t); }, last = M[n - 1], g1 = function (k) { return last.b[k] || 0; };
  M.forEach(function (x, i) {
    if (Math.abs(closes[i] - tMoney[i]) >= 1) bad(mrMoName(x.m) + ': мөнгөний урсгалын эцсийн үлдэгдэл дансны үлдэгдлээс ' + mny(closes[i] - tMoney[i]) + '-өөр зөрж байна.');
    var fee = posBiz(biz) ? mrSum(x.pay.filter(function (r) { return r.key === 'Карт'; }).map(function (r) { return r.net - posNet(r.net); })) : 0, d = mrSum(x.pay.map(function (r) { return r.net; })) - fee - x.p.net;
    if (Math.abs(d) >= 1) bad(mrMoName(x.m) + ': төлбөрийн хэлбэрийн нийт дүн борлуулалтын орлогоос ' + mny(d) + '-өөр зөрж байна.');
  });
  if (isFrom && Math.abs(g1('110106')) >= 0.5) bad('Cozy-д «Карт (POS)» данс ' + mny(g1('110106')) + ' үлдэгдэлтэй — энэ компанид 0 байх ёстой. Посын мөнгийг «Посын авлага»-аар хаана уу, эс бөгөөс мөнгө, авлага давхар гарна.');
  if (isTo) {
    var pAcc = g1('110106'), d3 = todayStr(new Date(new Date(t1 + 'T00:00:00') - 3 * 864e5)), rc = mrSum(E.filter(function (x) { return x.dr === '110106' && x.cr !== '1101' && x.date > d3 && x.date <= t1; }).map(function (x) { return x.amount; }));
    if (pAcc <= -0.5) bad('«Карт (POS)» данс хасах үлдэгдэлтэй (' + mny(pAcc) + ') — бүртгэснээс их мөнгө дансанд орсон гэж тулгагдсан байна.');
    else if (pAcc > rc + 1) bad('«Карт (POS)» дансанд ' + mny(pAcc) + ' байгаа нь сүүлийн 3 хоногийн картын орлогоос их — банкинд орсон посын мөнгийг тулгаагүй байж болзошгүй, «Нийт мөнгө» тэр хэмжээгээр өндөр гарна.');
  }
  if (posBiz(biz)) {
    var side = mrPos(buildJournal(isTo ? POS_SHARE.from : POS_SHARE.to, Rr), t1, isTo ? POS_SHARE.from : POS_SHARE.to), dif = last.pos - side;
    if (Math.abs(dif) >= 1) bad('Посын тооцоо хоёр компанид зөрж байна: Cozy авлага ' + mny(isTo ? side : last.pos) + ', аяллын дэлгүүр өглөг ' + mny(isTo ? last.pos : side) + ' — нэг талд нь банкаар хаагаагүй.');
  }
  var dbl = bankLines.filter(function (l) { var d = String(l.date).slice(0, 10); return l.biz === biz && l.status === 'Тулгасан' && +l.credit > 0 && d >= f0 && d <= t1 && /(^|[^a-zа-яөүё])(pos|пос)([^a-zа-яөүё]|$)/i.test(String(l.desc)) && /^(5101|5201|5202|Дэлгүүрийн|Захиалга)/.test(String(l.link)); });
  if (dbl.length) bad(dbl.length + ' посын мөнгө (' + mny(mrSum(dbl.map(function (l) { return l.credit; }))) + ') банкнаас орлого болж тулгагдсан — картын борлуулалт аль хэдийн бичигдсэн тул орлого давхардсан байна. «Банк тулгах»-д «Буцаах» дарж, посын тооцоогоор хаана уу.');
  var accSum = function (L) { return mrSum(L.map(function (k) { return g1(k); })); }, dr = mrepDebt(E, 'r', t1, 8), dp = mrepDebt(E, 'p', t1, 8);
  if (Math.abs(dr.left - accSum(['1201', '1209', '1208']) - Math.max(0, g1('1290'))) >= 1) bad('Авлагын жагсаалт (' + mny(dr.left) + ') дансны үлдэгдлээс зөрж байна — илүү төлсөн эсвэл нэргүй бичилт бий.');
  if (Math.abs(dp.left + accSum(['3101', '3802']) + Math.min(0, g1('1290'))) >= 1) bad('Өглөгийн жагсаалт (' + mny(dp.left) + ') дансны үлдэгдлээс зөрж байна — илүү төлсөн эсвэл нэргүй бичилт бий.');
  var asOf = Number(t1.slice(5, 7)) + ' сарын ' + Number(t1.slice(8, 10)) + '-ны байдлаар';
  return { M: M, chk: chk, noCost: noCost, part: M[n - 1].part, t1: t1, groups: [
    [{ t: 'Дансны хураангуй', h: hBal, r: bal }, { t: 'Орлого, ашиг', h: hFlow, r: pl }],
    [{ t: 'Зардал', h: hFlow, r: ex, empty: 'Зардал алга' }, { t: 'Мөнгөний урсгал', h: hCash, r: cf }],
    [iTbl('Ашгийн хамгийн өндөр борлуулалттай 5 бараа · ' + pLab, best), iTbl('Хамгийн бага ашигтай 5 бараа · ' + pLab, low)],
    [{ t: 'Борлуулалт ангиллаар', h: ['Ангилал'].concat(M.map(function (x) { return mrMoName(x.m); }), many ? ['Нийт'] : [], ['Эзлэх хувь']), r: cat, empty: 'Борлуулалт алга' }],
    pays,
    [debt('r', 'Авлага · ' + asOf), debt('p', 'Өглөг · ' + asOf)]
  ] };
}
function mrTable(T) {
  var left = T.left || 1, cell = function (v, i, tag) {
    var num = typeof v === 'number', txt = num ? (Math.abs(v) < 0.5 ? '—' : mny(v)) : esc(v == null ? '' : v);
    return '<' + tag + (i >= left ? ' class="n' + (num && v < -0.5 ? ' neg' : '') + '"' : '') + '>' + txt + '</' + tag + '>'; };
  var body = T.r.length ? T.r.map(function (r) { return '<tr' + (r.k ? ' class="mr-' + r.k + '"' : '') + '>' + r.c.map(function (v, i) { return cell(v, i, 'td'); }).join('') + '</tr>'; }).join('')
    : '<tr><td class="muted" colspan="' + T.h.length + '">' + esc(T.empty || 'Мэдээлэл алга') + '</td></tr>';
  return '<div class="mr-b"><h3>' + esc(T.t) + '</h3><table class="rep-t mr-t"><thead><tr>' + T.h.map(function (v, i) { return cell(v, i, 'th'); }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>';
}
function mrOpts(cur) {
  var td = todayStr().slice(0, 7), first = td, out = '';
  journal.concat(records).forEach(function (x) { if (x.biz === state.biz) { var m = String(x.date).slice(0, 7); if (/^20\d\d-\d\d$/.test(m) && m < first) first = m; } });
  var f2 = rvPrevMo(td); if (f2 < first) first = f2;
  for (var m = td; m >= first; m = rvPrevMo(m)) out += '<option value="' + m + '"' + (m === cur ? ' selected' : '') + '>' + m.slice(0, 4) + ' оны ' + mrMoName(m) + '</option>';
  return out;
}
function monrepView() {
  var ms = mrMonths(), D = mrData(ms), S = mrSigns(), one = ms.length > 3 ? ' one' : '', pend = bankLines.filter(function (l) { return l.biz === state.biz && l.status === 'Шинэ'; }).length;
  var note = [D.part ? 'Сүүлийн сар дуусаагүй — ' + D.t1 + '-ны байдлаар.' : '', pend ? 'Тулгаагүй ' + pend + ' банкны гүйлгээ тайланд ороогүй.' : '', D.noCost ? D.noCost + ' барааны өртөг бүртгэгдээгүй тул барааны ашгийн жагсаалтад ороогүй.' : ''].filter(Boolean).join(' ');
  var sg = function (role, name) { return '<div><span>' + role + '</span><i></i><b>' + esc(name) + '</b></div>'; };
  var grp = function (g) { return '<div class="mr-g' + (g.length < 2 ? ' one' : one) + '">' + g.map(mrTable).join('') + '</div>'; };
  return '<style>@page{size:A4 landscape;margin:10mm}</style><div class="st-pick no-print"><label>Эхний сар <select onchange="state.mrFrom=this.value;render()">' + mrOpts(ms[0]) + '</select></label>' +
      '<label>Сүүлийн сар <select onchange="state.mrTo=this.value;render()">' + mrOpts(ms[ms.length - 1]) + '</select></label></div>' +
    (note ? '<p class="muted no-print mr-note">' + esc(note) + '</p>' : '') +
    '<div class="no-print mr-chk' + (D.chk.length ? ' bad' : '') + '">' + (D.chk.length ? '<b>Тулгалт: ' + D.chk.length + ' зөрүү</b><ul>' + D.chk.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : 'Тулгалт: мөнгө, борлуулалт, посын тооцоо, авлага, өглөг таарч байна.') + '</div>' +
    '<div class="card mr"><h2 class="mr-h">' + esc(mrTitle(ms)) + '</h2>' +
      grp(D.groups[0]) + grp(D.groups[1]) + '<div class="mr-pb"></div>' + grp(D.groups[2]) + grp(D.groups[3]) + '<div class="mr-pb"></div>' + grp(D.groups[4]) + grp(D.groups[5]) +
      '<div class="mr-sign">' + sg('Гүйцэтгэх захирал', S[0]) + sg('Үйл ажиллагаа хариуцсан захирал', S[1]) + sg('Нягтлан', S[2]) + '</div></div>';
}
function repMonRep() {   // Excel — бүх хүснэгт нэг хуудсанд дараалж
  var ms = mrMonths(), D = mrData(ms), W = 0, rows = [], T = [];
  D.groups.forEach(function (g) { g.forEach(function (t) { T.push(t); W = Math.max(W, t.h.length); }); });
  var cols = []; for (var i = 0; i < W; i++) cols.push(i ? m('c' + i, '') : c('c0', ''));
  var put = function (L, b) { var o = {}; L.forEach(function (v, i) { o['c' + i] = typeof v === 'number' ? r0(v) : v; }); if (b) o._b = 1; rows.push(o); };
  T.forEach(function (t) { rows.push({}); put([t.t], 1); put(t.h, 1); t.r.forEach(function (r) { put(r.c, r.k === 'tot' || r.k === 'sub' || r.k === 'hd'); }); });
  return { title: mrTitle(ms), file: 'Сарын тайлан', period: ms[0] + ' — ' + ms[ms.length - 1], cols: cols, rows: rows };
}
