// ── УДИРДЛАГЫН ТОЙМ ── захиралд зориулсан сарын тойм (нэг хуудас, 6 хэсэг)
// Бүх тоо өмнөх сартай (одоогийн сар бол өмнөх сарын мөн өдрүүдтэй), борлуулалт/ашиг нь төлөвлөгөөтэй харьцуулагдана.
// Дүгнэлтийн талбарууд Script Property REVIEW { 'biz|YYYY-MM': { good, issues, next, planProfit } }-д хадгалагдана.

var RV = { mo: todayStr().slice(0, 7), biz: 'all', charts: [] };
function rvMoney(n) { return fmt(n); }   // «₮1,076,000», сөрөг «−₮…»
function rvPct(n) { return n === null || !isFinite(n) ? '—' : (Math.round(n * 10) / 10) + '%'; }
function rvMonthEnd(mo) { return mo + '-' + pad(new Date(Number(mo.slice(0, 4)), Number(mo.slice(5, 7)), 0).getDate()); }
function rvPrevMo(mo) { var d = new Date(Number(mo.slice(0, 4)), Number(mo.slice(5, 7)) - 2, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
// [эхлэх, дуусах] — одоогийн сар бол өнөөдрийг хүртэл; өмнөх үе нь өмнөх сарын мөн тооны өдөр
function rvRanges(mo) {
  var td = todayStr(), f = mo + '-01', t = rvMonthEnd(mo) < td ? rvMonthEnd(mo) : td;
  var pm = rvPrevMo(mo), n = Number(t.slice(8, 10)), pe = rvMonthEnd(pm), pt = pm + '-' + pad(Math.min(n, Number(pe.slice(8, 10))));
  return { f: f, t: t, pf: pm + '-01', pt: t === rvMonthEnd(mo) ? pe : pt, partial: t !== rvMonthEnd(mo) };
}
function rvKeys() { return RV.biz === 'all' ? KEYS : [RV.biz]; }
function rvNotes() { return (window.reviewNotes || {})[RV.biz + '|' + RV.mo] || {}; }

// Нэг үеийн бүх тоо (сонгосон дэлгүүрүүдийг нэгтгэнэ)
function rvCalc(f, t) {
  var o = { sales: 0, cogs: 0, tracked: false, bills: 0, profit: 0, exps: {}, cash: 0, invEnd: 0, invStart: 0, jcogs: 0, shrink: 0, shrinkN: 0,
            cin: 0, cout: 0, day: {}, items: {}, cats: {}, recv: [], pay: [], low: [], dead: [], target: 0 };
  var Rr = R(), cash = cashCodes(), td = todayStr();
  rvKeys().forEach(function (biz) {
    var list = records.filter(function (x) { return x.biz === biz && x.type === 'sale' && x.date >= f && x.date <= t; });
    var ce = costEngine(biz, Rr); if (ce.since) o.tracked = true;
    list.forEach(function (x) {
      var a = Number(x.amount) || 0, cg = Number(ce.rec[x.id] || 0);
      o.sales += a; o.cogs += cg; o.day[x.date] = (o.day[x.date] || 0) + a;
      if (isNonGoods(x.item)) return;
      var nm = baseItem(x.item), it = o.items[nm] = o.items[nm] || { amt: 0, qty: 0, cogs: 0, biz: biz };
      it.amt += a; it.qty += Number(x.qty) || 0; it.cogs += cg;
      var cat = catOf(biz, nm), c = o.cats[cat] = o.cats[cat] || { amt: 0, cogs: 0 };
      c.amt += a; c.cogs += cg;
    });
    groupBills(list).forEach(function (b) { if (b.gross > 0) o.bills++; });
    // санхүү (журналаас)
    var E = buildJournal(biz, Rr), p = plData(E, f, t), b = balances(E, t), b0 = balances(E, prevDay(f));
    o.profit += p.profit; o.jcogs += p.cogs;
    p.exps.forEach(function (x) { o.exps[x.code] = (o.exps[x.code] || 0) + x.v; });
    cash.forEach(function (k) { o.cash += b[k] || 0; });
    o.invEnd += b['1404'] || 0; o.invStart += b0['1404'] || 0;
    E.forEach(function (e) {
      if (e.date < f || e.date > t) return;
      var i = cash.indexOf(e.dr) >= 0, out = cash.indexOf(e.cr) >= 0;
      if (i && !out) o.cin += e.amount; else if (out && !i) o.cout += e.amount;
    });
    moves.forEach(function (m) { var d = String(m.date).slice(0, 10); if (m.biz === biz && m.kind === 'Хасалт' && d >= f && d <= t) { o.shrinkN++; o.shrink += -(ce.mv[m.id] || 0); } });
    if (!o.shrink) o.shrink += (balances(E, t, f)['7421'] || 0);
    // авлага, өглөг (нээлттэй)
    openItems(E, ['1201'], 1, t).items.forEach(function (it) { if (!it.closed) o.recv.push({ who: it.who, left: it.amt - it.paid, date: it.date, biz: biz }); });
    openItems(E, ['3101'], -1, t).items.forEach(function (it) { if (!it.closed) o.pay.push({ who: it.who, left: it.amt - it.paid, date: it.date, biz: biz }); });
    // бараа: дуусаж буй (доод хэмжээнээс бага), зогсонги (30+ хоног хөдөлгөөнгүй) — одоогийн үлдэгдлээр
    if (!BUSINESSES[biz].finOnly) {
      needList(biz).forEach(function (r) { o.low.push({ name: r.name, qty: round2(r.shop + r.wh), min: minOf(biz, r.name), biz: biz }); });
      var last = {}, st = stockData[biz] || {}, cut = todayStr(new Date(new Date(t + 'T00:00:00') - 30 * 864e5));
      records.forEach(function (x) { if (x.biz === biz && x.type === 'sale' && x.date <= t) { var k = baseItem(x.item); if (!last[k] || x.date > last[k]) last[k] = x.date; } });
      moves.forEach(function (m) { var d = String(m.date).slice(0, 10); if (m.biz === biz && d <= t && (!last[m.item] || d > last[m.item])) last[m.item] = d; });
      Object.keys(st).forEach(function (k) {
        var q = round2((st[k].shop || 0) + (st[k].wh || 0)); if (!(q > 0) || isNonGoods(k)) return;
        if (!last[k] || last[k] <= cut) o.dead.push({ name: k, qty: q, last: last[k] || '', val: q * avgCost(ce, k), days: last[k] ? Math.round((new Date(t) - new Date(last[k])) / 864e5) : null, biz: biz });
      });
    }
    o.target += Number(((window.salesTargets || {})[tgtKey(biz, f.slice(0, 7))] || {}).total) || 0;
  });
  o.gross = o.tracked ? o.sales - o.cogs : null;
  o.expT = Object.keys(o.exps).reduce(function (a, k) { return a + o.exps[k]; }, 0);
  return o;
}

function rvDelta(cur, prev, lowerBetter) {
  if (cur === null || prev === null) return '';
  if (!prev) return cur ? '<span class="rv-d ' + (lowerBetter ? 'dn' : 'up') + '">шинэ</span>' : '<span class="rv-d">0%</span>';
  var p = Math.round((cur - prev) / Math.abs(prev) * 1000) / 10, good = lowerBetter ? p <= 0 : p >= 0;
  return '<span class="rv-d ' + (p === 0 ? '' : good ? 'up' : 'dn') + '">' + (p > 0 ? '↑ ' : p < 0 ? '↓ ' : '') + Math.abs(p) + '%</span>';
}
function rvPlan(cur, plan) {
  if (!plan) return '<small class="muted">төлөвлөгөө тавиагүй</small>';
  var p = Math.round(cur / plan * 100);
  return '<small class="' + (p >= 100 ? 'rv-ok' : 'rv-bad') + '">төлөвлөгөө ' + rvMoney(plan) + ' · ' + p + '%</small>';
}
function rvCmp(cur, prev, lowerBetter, fmtFn) {
  return '<div class="rv-cmp">' + rvDelta(cur, prev, lowerBetter) + '<small class="muted">өмнөх: ' + (prev === null ? '—' : (fmtFn || rvMoney)(prev)) + '</small></div>';
}
function rvKpi(label, val, sub) { return '<div class="rv-kpi"><span>' + label + '</span><b>' + val + '</b>' + (sub || '') + '</div>'; }
function rvSec(n, title, body) { return '<section class="rv-sec"><h2><i>' + n + '</i>' + title + '</h2>' + body + '</section>'; }
function rvTable(head, rows, empty) {
  return '<div class="scroll"><table class="rep-t rv-t"><tr>' + head.map(function (h) { return '<th' + (h[1] ? ' class="n"' : '') + '>' + h[0] + '</th>'; }).join('') + '</tr>' +
    (rows.length ? rows.join('') : '<tr><td colspan="' + head.length + '" class="muted">' + (empty || 'Мэдээлэл алга') + '</td></tr>') + '</table></div>';
}
function rvBizTag(b) { return RV.biz === 'all' && BUSINESSES[b] ? ' <small class="muted">· ' + esc(BUSINESSES[b].name) + '</small>' : ''; }

function reviewView() {
  RV.biz = state.biz;   // компанийн дотор — тухайн компанийн тойм
  var r = rvRanges(RV.mo), A = rvCalc(r.f, r.t), P = rvCalc(r.pf, r.pt), N = rvNotes(), td = todayStr();
  var days = Math.round((new Date(r.t) - new Date(r.f)) / 864e5) + 1, pDays = Math.round((new Date(r.pt) - new Date(r.pf)) / 864e5) + 1;
  var months = []; for (var i = 0, m = td.slice(0, 7); i < 12; i++, m = rvPrevMo(m)) months.push(m);
  var tools = '<div class="rv-tools no-print"><label>Сар<select onchange="RV.mo=this.value;render()">' + months.map(function (x) { return '<option' + (x === RV.mo ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
    '<div class="pg-act"><button class="b-btn primary" onclick="rvPdf()">PDF татах</button><button class="b-btn" onclick="window.print()">Хэвлэх</button></div></div>';
  var scope = BUSINESSES[RV.biz].name;
  var head = '<div class="rv-head"><h1>Удирдлагын тойм · ' + RV.mo + '</h1><p class="muted">' + esc(scope) + ' · ' + r.f + ' – ' + r.t +
    ' · харьцуулалт: ' + (r.partial ? 'өмнөх сарын мөн үе (' + r.pf + ' – ' + r.pt + ')' : 'өмнөх сар (' + rvPrevMo(RV.mo) + ')') + '</p></div>';

  // 1. Гол үзүүлэлт
  var planProfit = Number(N.planProfit) || 0, mPct = A.gross !== null && A.sales ? A.gross / A.sales * 100 : null, pmPct = P.gross !== null && P.sales ? P.gross / P.sales * 100 : null;
  var fulfil = A.target ? A.sales / A.target * 100 : null;
  var s1 = '<div class="rv-kpis">' +
    rvKpi('Нийт борлуулалт', rvMoney(A.sales), rvCmp(A.sales, P.sales) + rvPlan(A.sales, A.target)) +
    rvKpi('Бохир ашиг', A.gross === null ? '—' : rvMoney(A.gross), (A.gross === null ? '<small class="muted">өртөг бүртгэлгүй</small>' : '<small class="muted">маржин ' + rvPct(mPct) + '</small>' + rvCmp(A.gross, P.gross))) +
    rvKpi('Цэвэр ашиг', '<span class="' + (A.profit < 0 ? 'rv-bad' : '') + '">' + rvMoney(A.profit) + '</span>', rvCmp(A.profit, P.profit) + rvPlan(A.profit, planProfit)) +
    rvKpi('Мөнгөн хөрөнгө', rvMoney(A.cash), '<small class="muted">' + r.t + '-ны үлдэгдэл</small>' + rvCmp(A.cash, P.cash)) +
    rvKpi('Төлөвлөгөөний биелэлт', fulfil === null ? '—' : '<span class="' + (fulfil >= 100 ? 'rv-ok' : 'rv-bad') + '">' + rvPct(fulfil) + '</span>',
      (A.target ? '<small class="muted">' + rvMoney(A.sales) + ' / ' + rvMoney(A.target) + '</small>' : '<small class="muted">борлуулалтын төлөвлөгөө тавиагүй</small>') +
      (RV.biz !== 'all' ? '<button class="link no-print" onclick="rvEditTarget()">' + (A.target ? 'Засах' : 'Төлөвлөгөө тавих') + '</button>' : '')) + '</div>';

  // 2. Борлуулалт
  var it = Object.keys(A.items).map(function (k) { return { name: k, amt: A.items[k].amt, qty: A.items[k].qty, biz: A.items[k].biz }; });
  rvKeys().forEach(function (biz) { (BUSINESSES[biz].products || []).forEach(function (p) { if (!A.items[p.name] && !isNonGoods(p.name)) it.push({ name: p.name, amt: 0, qty: 0, biz: biz }); }); });
  var top = it.filter(function (x) { return x.amt > 0; }).sort(function (a, b) { return b.amt - a.amt; }).slice(0, 10);
  var worst = it.slice().sort(function (a, b) { return a.amt - b.amt; }).filter(function (x) { return top.indexOf(x) < 0; }).slice(0, 10);
  var pRow = function (x, i) { var pa = P.items[x.name] ? P.items[x.name].amt : 0;
    return '<tr><td>' + (i + 1) + '. ' + esc(x.name) + rvBizTag(x.biz) + '</td><td class="n">' + round2(x.qty) + '</td><td class="n">' + rvMoney(x.amt) + '</td><td class="n">' + rvDelta(x.amt, pa) + '</td></tr>'; };
  var pHead = [['Бүтээгдэхүүн'], ['Тоо', 1], ['Дүн', 1], ['Өмнөхөөс', 1]];
  var avg = A.bills ? A.sales / A.bills : 0, pAvg = P.bills ? P.sales / P.bills : 0;
  var s2 = '<div class="rv-kpis sm">' +
    rvKpi('Сарын нийт дүн', rvMoney(A.sales), rvCmp(A.sales, P.sales)) +
    rvKpi('Өдрийн дундаж', rvMoney(A.sales / days), rvCmp(A.sales / days, P.sales / pDays)) +
    rvKpi('Гүйлгээний тоо', A.bills, rvCmp(A.bills, P.bills, false, String)) +
    rvKpi('Дундаж сагс', rvMoney(avg), rvCmp(avg, pAvg)) + '</div>' +
    '<div class="rv-grid"><div class="rv-card"><h3>Өдөр тутмын борлуулалт <small class="muted">— тасархай: өмнөх үе</small></h3><div class="ch-box"><canvas id="rvDaily"></canvas></div></div>' +
    '<div class="rv-card"><h3>Ангиллаар</h3><div class="ch-box"><canvas id="rvCat"></canvas></div></div></div>' +
    '<div class="rv-grid"><div class="rv-card"><h3>Шилдэг 10 бүтээгдэхүүн</h3>' + rvTable(pHead, top.map(pRow), 'Борлуулалт алга') + '</div>' +
    '<div class="rv-card"><h3>Хамгийн муу 10 бүтээгдэхүүн</h3>' + rvTable(pHead, worst.map(pRow)) + '</div></div>';

  // 3. Ашигт ажиллагаа
  var EG = { rent: ['Түрээс', ['7114', '7014']], wage: ['Цалин (НДШ-тэй)', ['7101', '7102', '7001', '7002']], trans: ['Тээвэр, хүргэлт', ['7117', '7124', '7017']] };
  var eg = function (O, k) { return EG[k][1].reduce(function (a, c2) { return a + (O.exps[c2] || 0); }, 0); };
  var other = function (O) { return O.expT - eg(O, 'rent') - eg(O, 'wage') - eg(O, 'trans'); };
  var eRow = function (label, v, pv) { return '<tr><td>' + label + '</td><td class="n">' + rvMoney(v) + '</td><td class="n">' + (A.sales ? rvPct(v / A.sales * 100) : '—') + '</td><td class="n">' + rvDelta(v, pv, true) + '</td></tr>'; };
  var s3 = '<div class="rv-card"><h3>Үйл ажиллагааны зардал</h3>' + rvTable([['Зардал'], ['Дүн', 1], ['Борлуулалтад', 1], ['Өмнөхөөс', 1]],
      ['rent', 'wage', 'trans'].map(function (k) { return eRow(EG[k][0], eg(A, k), eg(P, k)); }).concat([eRow('Бусад', other(A), other(P)),
        '<tr class="tot"><td>Нийт зардал</td><td class="n">' + rvMoney(A.expT) + '</td><td class="n">' + (A.sales ? rvPct(A.expT / A.sales * 100) : '—') + '</td><td class="n">' + rvDelta(A.expT, P.expT, true) + '</td></tr>'])) + '</div>';

  // 4. Бараа материал
  var avgInv = (A.invStart + A.invEnd) / 2, turn = A.jcogs > 0 ? Math.round(avgInv / A.jcogs * days) : null, pTurn = P.jcogs > 0 ? Math.round((P.invStart + P.invEnd) / 2 / P.jcogs * pDays) : null;
  var dead = A.dead.sort(function (a, b) { return b.val - a.val; }), low = A.low;
  var s4 = '<div class="rv-kpis sm">' +
    rvKpi('Нийт үлдэгдлийн үнэ', rvMoney(A.invEnd), '<small class="muted">өртгөөр</small>' + rvCmp(A.invEnd, P.invEnd)) +
    rvKpi('Эргэлтийн хоног', turn === null ? '—' : turn + ' хоног', rvCmp(turn, pTurn, true, function (v) { return v + ' хоног'; })) +
    rvKpi('Хорогдол, гэмтэл', '<span class="' + (A.shrink > 0 ? 'rv-bad' : '') + '">' + rvMoney(A.shrink) + '</span>', '<small class="muted">' + A.shrinkN + ' удаа хасалт</small>' + rvCmp(A.shrink, P.shrink, true)) +
    rvKpi('Дуусаж буй бараа', '<span class="' + (low.length ? 'rv-bad' : '') + '">' + low.length + '</span>', '<small class="muted">доод хэмжээнээс бага</small>') + '</div>' +
    '<div class="rv-grid"><div class="rv-card"><h3>Зогсонги бараа <small class="muted">(30+ хоног хөдөлгөөнгүй)</small></h3>' +
      rvTable([['Бараа'], ['Үлдэгдэл', 1], ['Сүүлийн хөдөлгөөн', 1], ['Хөлдсөн мөнгө', 1]], dead.slice(0, 15).map(function (x) {
        return '<tr><td>' + esc(x.name) + rvBizTag(x.biz) + '</td><td class="n">' + x.qty + '</td><td class="n">' + (x.last ? x.last + ' (' + x.days + ' хоног)' : 'хөдөлгөөнгүй') + '</td><td class="n">' + (x.val ? rvMoney(x.val) : '—') + '</td></tr>'; })
        .concat(dead.length > 15 ? ['<tr><td colspan="4" class="muted">… бас ' + (dead.length - 15) + ' бараа</td></tr>'] : []), 'Зогсонги бараа алга') + '</div>' +
    '<div class="rv-card"><h3>Дуусаж буй бараа</h3>' + rvTable([['Бараа'], ['Үлдэгдэл', 1], ['Доод хэмжээ', 1]], low.map(function (x) {
        return '<tr class="rv-warn"><td>' + esc(x.name) + rvBizTag(x.biz) + '</td><td class="n">' + x.qty + '</td><td class="n">' + x.min + '</td></tr>'; }), 'Доод хэмжээнээс бага бараа алга') + '</div></div>';

  // 5. Мөнгөн урсгал
  var agg = function (list) { var g = {}; list.forEach(function (x) { var k = x.biz + '|' + x.who, o = g[k] = g[k] || { who: x.who, biz: x.biz, left: 0, date: x.date }; o.left += x.left; if (x.date < o.date) o.date = x.date; });
    return Object.keys(g).map(function (k) { return g[k]; }).filter(function (x) { return x.left >= 1; }).sort(function (a, b) { return b.left - a.left; }); };
  var recv = agg(A.recv), pays = agg(A.pay);
  var dueOf = function (x) { var rm = reminders.filter(function (q) { return q.kind === 'Өглөг төлөх' && q.status === 'Хүлээгдэж' && q.partner === x.who; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0]; return rm ? rm.date : ''; };
  var s5 = '<div class="rv-kpis sm">' +
    rvKpi('Орсон мөнгө', rvMoney(A.cin), rvCmp(A.cin, P.cin)) +
    rvKpi('Гарсан мөнгө', rvMoney(A.cout), rvCmp(A.cout, P.cout, true)) +
    rvKpi('Цэвэр урсгал', '<span class="' + (A.cin - A.cout < 0 ? 'rv-bad' : 'rv-ok') + '">' + rvMoney(A.cin - A.cout) + '</span>', rvCmp(A.cin - A.cout, P.cin - P.cout)) + '</div>' +
    '<div class="rv-grid"><div class="rv-card"><h3>Авлага <small class="muted">— нийт ' + rvMoney(sum(recv, 'left')) + '</small></h3>' +
      rvTable([['Харилцагч'], ['Дүн', 1], ['Хэтэрсэн хоног', 1]], recv.slice(0, 12).map(function (x) {
        var d = Math.round((new Date(r.t) - new Date(x.date)) / 864e5), over = d > 30;
        return '<tr' + (over ? ' class="rv-warn"' : '') + '><td>' + esc(x.who) + rvBizTag(x.biz) + '</td><td class="n">' + rvMoney(x.left) + '</td><td class="n">' + (over ? (d - 30) + ' хоног' : '<small class="muted">' + d + ' хоног болсон</small>') + '</td></tr>'; }), 'Авлага алга') +
      '<small class="muted">30 хоногоос дээш болсон авлагыг хэтэрсэнд тооцов.</small></div>' +
    '<div class="rv-card"><h3>Өглөг <small class="muted">— нийт ' + rvMoney(sum(pays, 'left')) + '</small></h3>' +
      rvTable([['Нийлүүлэгч'], ['Дүн', 1], ['Төлөх огноо', 1]], pays.slice(0, 12).map(function (x) {
        var due = dueOf(x), late = due && due < td;
        return '<tr' + (late ? ' class="rv-warn"' : '') + '><td>' + esc(x.who) + rvBizTag(x.biz) + '</td><td class="n">' + rvMoney(x.left) + '</td><td class="n">' + (due ? due + (late ? ' · хэтэрсэн' : '') : '<small class="muted">тогтоогоогүй</small>') + '</td></tr>'; }), 'Өглөг алга') +
      '<small class="muted">Төлөх огноог Календарь дахь «Өглөг төлөх» сануулгаас авна.</small></div></div>';

  // 6. Дүгнэлт
  var ta = function (id, label, v) { return '<label class="rv-note"><b>' + label + '</b><textarea id="' + id + '" rows="4" placeholder="1.&#10;2.&#10;3.">' + esc(v || '') + '</textarea></label>'; };
  var s8 = '<div class="rv-notes">' + ta('rvGood', 'Сайн байсан 3 зүйл', N.good) + ta('rvIssues', 'Анхаарах 3 асуудал', N.issues) + ta('rvNext', 'Дараагийн сарын зорилт', N.next) + '</div>' +
    '<div class="rv-save no-print"><label>Цэвэр ашгийн төлөвлөгөө (₮)<input id="rvPlanProfit" type="number" min="0" value="' + esc(N.planProfit || '') + '"></label>' +
    '<button class="b-btn primary" onclick="rvSaveNotes()">Хадгалах</button></div>';

  window.__rv = { A: A, P: P, r: r };
  return '<div id="rvDoc" class="rv">' + tools + head +
    rvSec(1, 'Гол үзүүлэлт', s1) + rvSec(2, 'Борлуулалт', s2) + rvSec(3, 'Ашигт ажиллагаа', s3) + rvSec(4, 'Бараа материал', s4) +
    rvSec(5, 'Мөнгөн урсгал', s5) + rvSec(6, 'Дүгнэлт', s8) + '</div>';
}

function rvCharts() {
  RV.charts.forEach(function (c) { try { c.destroy(); } catch (e) {} }); RV.charts = [];
  var D = window.__rv; if (!D || typeof Chart === 'undefined') return;
  var A = D.A, P = D.P, r = D.r, mk = function (id, cfg) { var el = $(id); if (el) RV.charts.push(new Chart(el, cfg)); };
  var money = { callbacks: { label: function (c) { return (c.dataset.label ? c.dataset.label + ': ' : c.label + ': ') + rvMoney(c.raw); } } };
  var days = [], cur = [], prev = [];
  for (var d = new Date(r.f + 'T00:00:00'), i = 0; todayStr(d) <= rvMonthEnd(RV.mo); d.setDate(d.getDate() + 1), i++) {
    var k = todayStr(d), pk = todayStr(new Date(new Date(r.pf + 'T00:00:00').getTime() + i * 864e5));
    days.push(k.slice(8)); cur.push(k <= r.t ? (A.day[k] || 0) : null); prev.push(pk <= rvMonthEnd(rvPrevMo(RV.mo)) ? (P.day[pk] || 0) : null);
  }
  mk('rvDaily', { type: 'line', data: { labels: days, datasets: [
      { label: 'Энэ сар', data: cur, borderColor: DASH_C[0], backgroundColor: 'rgba(59,111,182,.12)', fill: true, tension: .3, pointRadius: 2, borderWidth: 2 },
      { label: 'Өмнөх сар', data: prev, borderColor: '#9AA5B1', tension: .3, pointRadius: 0, borderWidth: 1.5, borderDash: [5, 4] }] },
    options: { maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }, tooltip: money },
      scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true, grid: { color: '#EEF1F6' }, ticks: { callback: shortNum } } } } });
  var cats = Object.keys(A.cats).filter(function (k) { return A.cats[k].amt > 0; }).sort(function (a, b) { return A.cats[b].amt - A.cats[a].amt; });
  mk('rvCat', { type: 'pie', data: { labels: cats, datasets: [{ data: cats.map(function (k) { return Math.round(A.cats[k].amt); }), backgroundColor: DASH_C, borderColor: '#fff', borderWidth: 2 }] },
    options: { maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, padding: 10 } },
      tooltip: { callbacks: { label: function (c) { var t = c.dataset.data.reduce(function (a, v) { return a + v; }, 0); return c.label + ': ' + rvMoney(c.raw) + ' (' + Math.round(c.raw / t * 100) + '%)'; } } } } } });
}

function rvSaveNotes() {
  var key = RV.biz + '|' + RV.mo, all = JSON.parse(JSON.stringify(window.reviewNotes || {}));
  var cut = function (id) { return String($(id).value || '').slice(0, 600); };
  all[key] = { good: cut('rvGood'), issues: cut('rvIssues'), next: cut('rvNext'), 
               planProfit: Math.max(0, Math.round(Number($('rvPlanProfit').value) || 0)) || '' };
  var lim = todayStr(new Date(Date.now() - 400 * 864e5)).slice(0, 7);   // 13 сараас хуучныг цэвэрлэнэ (Script Property хэмжээ хязгаартай)
  Object.keys(all).forEach(function (k) { if (k.split('|')[1] < lim) delete all[k]; });
  window.reviewNotes = all;
  var local = function (msg) { save('nb_review', all); toast(msg); render(); };
  if (!API_URL) return local('Хадгалагдлаа');
  post({ type: 'admin_setting', key: 'review', value: all }, function (err) {
    if (err) local(err === 'too_big' ? 'Текст хэт урт — энэ төхөөрөмжид л хадгалагдлаа' : 'Сервер хүлээж авсангүй — энэ төхөөрөмжид хадгалагдлаа');
    else { save('nb_review', all); toast('Хадгалагдлаа'); render(); }
  });
}
function rvEditTarget() {
  if (RV.mo !== todayStr().slice(0, 7)) { toast('Төлөвлөгөөг зөвхөн энэ сард тавина'); return; }
  editTarget(RV.biz);
}
function rvPdf() {
  var go = function () {
    var el = $('rvDoc'); el.classList.add('rv-pdf');
    html2pdf().set({ margin: [8, 8, 10, 8], filename: 'Удирдлагын тойм ' + RV.mo + (RV.biz === 'all' ? '' : ' ' + BUSINESSES[RV.biz].name) + '.pdf',
      image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.rv-kpi', '.rv-card', 'tr'] } })
      .from(el).save().then(function () { el.classList.remove('rv-pdf'); }, function () { el.classList.remove('rv-pdf'); toast('PDF үүсгэж чадсангүй — «Хэвлэх»-ээр PDF болгож хадгална уу'); });
  };
  if (window.html2pdf) go(); else { toast('PDF бэлдэж байна…'); loadLib('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', go); }
}
