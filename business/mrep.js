// ═══════════ ЭНГИЙН ТАЙЛАН: Удирдлагын тайлан, Дансны хуулга ═══════════
// Нягтлан биш хүнд: дансны код, дебет, кредит, журналын бичилтгүй. Албан ёсны тайлан зөвхөн «Нягтлан» цэсэнд.

// Журналын дотоод тэмдэглэгээг (#O123, #BGT:…) харуулахгүй
function stmtDesc(d) { return String(d || '').replace(/\s*#\S+/g, '').trim(); }

// ── Дансны хуулга: касс, банк — огноо, төрөл, тайлбар, орсон, гарсан, үлдэгдэл ──
function repStmt(E, from, to, code) {
  var all = code === 'cashall', A = all ? cashCodes() : [code];
  var d = drillLines({ acc: A, from: from, to: to, sign: 1, bal: true, grp: 'type' }, E), bal = d.open, tin = 0, tout = 0;
  var rows = [{ date: from, type: '', desc: 'Эхний үлдэгдэл', acc: '', in: '', out: '', bal: r0(d.open), _b: 1 }];
  d.lines.forEach(function (x) {
    bal += x.v; if (x.v > 0) tin += x.v; else tout -= x.v;
    rows.push({ date: x.date, type: x.key, desc: stmtDesc(x.desc), acc: accName(x.acc), in: x.v > 0 ? r0(x.v) : '', out: x.v < 0 ? r0(-x.v) : '', bal: r0(bal) });
  });
  var cols = [c('date', 'Огноо'), c('type', 'Төрөл'), c('desc', 'Тайлбар')].concat(all ? [c('acc', 'Данс')] : [], [m('in', 'Орсон'), m('out', 'Гарсан'), m('bal', 'Үлдэгдэл')]);
  return { title: 'Дансны хуулга · ' + (all ? 'бүх данс' : accName(code)), cols: cols, rows: rows, hideCount: true, open: r0(d.open), tin: r0(tin), tout: r0(tout), close: r0(bal),
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
function mrepDebt(E, k) {   // «Авлага», «Өглөг» хуудасны үлдэгдэлтэй ижил
  var td = todayStr(), T = DEBT_TABS[k], left = 0, who = {};
  openItems(debtE(E, k, td), debtAccs(k), T[3], td, false).items.forEach(function (it) { if (debtStatus(it) !== 'closed') { var v = it.amt - it.paid; left += v; who[it.who] = (who[it.who] || 0) + v; } });
  return { left: r0(left), top: Object.keys(who).filter(function (w) { return who[w] > 0.5; }).sort(function (a, b) { return who[b] - who[a]; }).slice(0, 5).map(function (w) { return [nameTel(w), who[w]]; }) };
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
