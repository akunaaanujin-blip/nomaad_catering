// ═══════════ Сурталчилгаа (Boost) — зардал бүртгэх, ROAS (8-р ээлж) ═══════════
// Удирдлагаас бүртгэсэн зардал: Дт 7120 Зар сурталчилгааны зардал / Кт мөнгөний данс (карт, харилцах) — журналд «Сурталчилгаа · <кампанит ажил> #ADS».
// Ажилтны Boost бүртгэл (Дт 7120 / Кт 3801) хэвээр. ROAS = тухайн хугацааны борлуулалт ÷ зардал.
var ADS_TAG = '#ADS';
function adsCamp(e, rec) {   // 7120 бичилтийн кампанит ажлын нэр
  var m = String(e.desc || '').match(/^Сурталчилгаа · (.*?) #ADS/); if (m) return m[1];
  if (e.doc === 'Сурталчилгаа' && rec[e.ref]) return 'Boost · ' + rec[e.ref].item;
  return 'Бусад (банкаар бичсэн)';
}
function adsOpen() {
  var cos = KEYS.filter(function (k) { return !BUSINESSES[k].finOnly; });
  gOpen('<h2>Сурталчилгааны зардал бүртгэх</h2>' +
    '<label for="adDate">Огноо</label><input id="adDate" type="date" value="' + todayStr() + '">' +
    '<label for="adBiz">Компани</label><select id="adBiz">' + cos.map(function (k) { return '<option value="' + k + '"' + (k === state.biz ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '</select>' +
    '<label for="adCamp">Кампанит ажлын нэр</label><input id="adCamp" placeholder="Жишээ: 11-р сарын хямдрал" maxlength="60">' +
    '<label for="adAmt">Дүн (₮)</label><input id="adAmt" type="number" inputmode="numeric" min="0">' +
    '<label for="adSrc">Төлбөрийн эх үүсвэр</label><select id="adSrc">' + cashCodes().map(function (c) { return '<option value="' + c + '"' + (c === '1101' ? ' selected' : '') + '>' + esc(c + ' ' + accName(c)) + '</option>'; }).join('') + '</select>' +
    '<p class="muted" style="font-size:12.5px;margin-top:8px">Бичилт: Дт 7120 Зар сурталчилгааны зардал / Кт сонгосон мөнгөний данс. Ашиг алдагдлын тайланд орно.</p>' +
    '<div style="margin-top:12px"><button class="btn" onclick="adsSave()">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button></div>');
}
function adsSave() {
  var d = $('adDate').value, biz = $('adBiz').value, camp = $('adCamp').value.trim().replace(/#/g, ''), a = Math.round(Number($('adAmt').value) || 0), src = $('adSrc').value;
  if (!d || !camp || !(a > 0)) { toast('Огноо, кампанит ажлын нэр, дүнгээ бөглөнө үү'); return; }
  if (!confirm('Сурталчилгааны зардал бүртгэх үү?\n\n' + d + ' · ' + BUSINESSES[biz].name + '\n' + camp + ' · ' + fmt(a) + '\nДт 7120 / Кт ' + src + ' ' + accName(src))) return;
  gClose();
  postEntries([{ biz: biz, date: d, dr: '7120', cr: src, amount: a, partner: BOOST_PARTNER, desc: 'Сурталчилгаа · ' + camp + ' ' + ADS_TAG }],
    function () { toast('Сурталчилгааны зардал бүртгэгдлээ'); if (API_URL) refresh(); else render(); });
}
function adsView() {
  var r = range(), f = r[0], t = r[1], Rr = R(), rec = {}; Rr.records.forEach(function (x) { rec[x.id] = x; });
  var cos = KEYS.filter(function (k) { return !BUSINESSES[k].finOnly; }), byCo = [], byCamp = [];
  var roas = function (s, c) { return c > 0 ? (Math.round(s / c * 100) / 100).toFixed(2) + '×' : '—'; };
  cos.forEach(function (biz) {
    var E = buildJournal(biz, Rr), p = plData(E, f, t), C = {}, spend = 0;
    E.forEach(function (e) { if (e.date < f || e.date > t || (e.dr !== '7120' && e.cr !== '7120')) return; var v = e.dr === '7120' ? e.amount : -e.amount; spend += v; var k = adsCamp(e, rec); C[k] = (C[k] || 0) + v; });
    byCo.push({ biz: biz, spend: r0(spend), sales: r0(p.net) });
    Object.keys(C).forEach(function (k) {
      if (Math.abs(C[k]) < 1) return;
      var it = /^Boost · /.test(k) ? k.slice(8) : '', sales = p.net, basis = 'компанийн цэвэр борлуулалт';
      if (it) { sales = Rr.records.filter(function (x) { return x.biz === biz && x.type === 'sale' && x.date >= f && x.date <= t && baseItem(x.item) === it; }).reduce(function (a, x) { return a + (Number(x.amount) || 0); }, 0); basis = 'барааны борлуулалт'; }
      byCamp.push({ biz: biz, camp: k, spend: r0(C[k]), sales: r0(sales), basis: basis });
    });
  });
  byCamp.sort(function (a, b) { return b.spend - a.spend; });
  var tS = byCo.reduce(function (a, x) { return a + x.spend; }, 0), tR = byCo.reduce(function (a, x) { return a + x.sales; }, 0);
  return '<div class="card"><div class="ord-bar"><h2 style="margin:0;flex:1">Сурталчилгаа, ROAS</h2><button class="btn" onclick="adsOpen()">Зардал бүртгэх</button></div>' +
    '<p class="muted" style="margin:6px 0 0">' + f + ' — ' + t + ' · ROAS = борлуулалт ÷ сурталчилгааны зардал (7120). Ажилтны Boost бүртгэл, удирдлагаас бүртгэсэн зардал, банкаар бичсэн 7120 бүгд орно.</p></div>' +
    '<div class="card rep"><div class="rep-cap"><b>Компаниар</b></div><div class="scroll"><table class="rep-t"><tr><th>Компани</th><th class="n">Зардал</th><th class="n">Цэвэр борлуулалт</th><th class="n">ROAS</th></tr>' +
    byCo.map(function (x) { return '<tr><td>' + esc(BUSINESSES[x.biz].name) + '</td><td class="n">' + fmt(x.spend) + '</td><td class="n">' + fmt(x.sales) + '</td><td class="n">' + roas(x.sales, x.spend) + '</td></tr>'; }).join('') +
    '<tr class="tot"><td>Нийт</td><td class="n">' + fmt(tS) + '</td><td class="n">' + fmt(tR) + '</td><td class="n">' + roas(tR, tS) + '</td></tr></table></div></div>' +
    '<div class="card rep"><div class="rep-cap"><b>Кампанит ажлаар</b><span>Boost — тухайн барааны борлуулалт; бусад — компанийн цэвэр борлуулалт</span></div><div class="scroll"><table class="rep-t"><tr><th>Компани</th><th>Кампанит ажил</th><th class="n">Зардал</th><th class="n">Борлуулалт</th><th class="n">ROAS</th></tr>' +
    (byCamp.map(function (x) { return '<tr><td>' + esc(BUSINESSES[x.biz].name) + '</td><td>' + esc(x.camp) + '<br><small class="muted">' + x.basis + '</small></td><td class="n">' + fmt(x.spend) + '</td><td class="n">' + fmt(x.sales) + '</td><td class="n">' + roas(x.sales, x.spend) + '</td></tr>'; }).join('') ||
      '<tr><td colspan="5" class="muted">Энэ хугацаанд сурталчилгааны зардал алга.</td></tr>') + '</table></div></div>';
}

// ═══════════ Boost (тусдаа цэс) — repBoost-ийн boost бүрийн мөрийг дахин ашиглана ═══════════
// Компани: Бүгд / нэг компани; хугацаа: энэ долоо хоног / энэ сар / бүх хугацаа (boost-ийн хугацаа сонгосон үетэй давхцвал)
var BST = { biz: 'all', per: 'month', open: {} };
var BST_SHORT = { cozy: 'Cozy', meat: 'Мах', travel: 'Аялал' };
function bstCos() { return KEYS.filter(function (k) { return !BUSINESSES[k].finOnly && BUSINESSES[k].boost; }); }
function bstName(k) { return BST_SHORT[k] || BUSINESSES[k].name; }
function bstRange() {
  var t = todayStr(), d = new Date(t + 'T00:00:00');
  if (BST.per === 'week') return [addDays(t, -((d.getDay() + 6) % 7)), t];
  if (BST.per === 'month') return [t.slice(0, 8) + '01', t];
  return ['0000-00-00', '9999-12-31'];
}
// 3801 «Сурталчилгаа (Meta)»: банкаар төлсөн дүнг (Дт 3801) хамгийн эртний boost-оос эхлэн хуваарилна
function bstPaid(biz, Rr) {
  var E = buildJournal(biz, Rr), paid = 0, out = {};
  E.forEach(function (e) { if (e.dr === '3801' && e.partner === BOOST_PARTNER) paid += e.amount; if (e.cr === '3801' && e.partner === BOOST_PARTNER && e.doc !== 'Сурталчилгаа') paid -= e.amount; });
  Rr.records.filter(function (x) { return x.biz === biz && x.type === 'boost' && x.date >= BOOST_JR_FROM; })
    .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; })
    .forEach(function (x) { var a = Number(x.amount) || 0; out[x.id] = paid + 0.5 >= a; paid -= a; if (paid < 0) paid = 0; });
  return out;
}
function bstRows(Rr) {
  var r = bstRange(), today = todayStr(), cos = BST.biz === 'all' ? bstCos() : [BST.biz], out = [];
  cos.forEach(function (biz) {
    var rep = repBoost(Rr, biz, '0000-00-00', '9999-12-31'), paid = bstPaid(biz, Rr), ce = costEngine(biz, Rr), P = {};
    (BUSINESSES[biz].products || []).forEach(function (p) { P[p.name] = Number(p.price) || 0; });
    (rep.det || []).forEach(function (d) {
      if (d._from > r[1] || d._to < r[0]) return;
      var x = d._x, a = Number(x.amount) || 0, cost = avgCost(ce, x.item), price = d._q > 0 ? d._sa / d._q : P[x.item] || 0, unit = price - cost;
      out.push({ biz: biz, x: x, d: d, a: a, usd: x.unit === 'USD' ? Number(x.price) || 0 : 0, left: d._run ? Math.round((new Date(boostEnd(x) + 'T00:00:00') - new Date(today + 'T00:00:00')) / 864e5) : 0,
        after: d._gp - a, be: unit > 0 && cost > 0 ? Math.ceil(a / unit) : null, paid: x.date < BOOST_JR_FROM ? null : !!paid[x.id],
        verdict: d._run ? 'Явж байна' : d._nc ? 'Өртөггүй' : d._gp - a >= 0 ? 'Ашигтай' : 'Ашиггүй' });
    });
  });
  return out.sort(function (a, b) { return (b.x.date + b.x.time) < (a.x.date + a.x.time) ? -1 : 1; });
}
function bstSet(k, v) { BST[k] = v; render(); }
function bstToggle(id) { BST.open[id] = !BST.open[id]; render(); }
function boostView() {
  var Rr = R(), L = bstRows(Rr), cos = bstCos();
  var spent = 0, usd = 0, sales = 0, after = 0; L.forEach(function (o) { spent += o.a; usd += o.usd; sales += o.d._sa; after += o.after; });
  var roas = spent > 0 ? (Math.round(sales / spent * 10) / 10) + '×' : '—';
  var seg = function (k, opts) { return '<div class="fn-seg">' + opts.map(function (o) { return '<button class="' + (BST[k] === o[0] ? 'on' : '') + '" onclick="bstSet(\'' + k + '\',\'' + o[0] + '\')">' + o[1] + '</button>'; }).join('') + '</div>'; };
  var flt = '<div class="fn-flt"><span class="fn-fl">Компани</span>' + seg('biz', [['all', 'Бүгд']].concat(cos.map(function (k) { return [k, bstName(k)]; }))) + '</div>' +
    '<div class="fn-flt"><span class="fn-fl">Хугацаа</span>' + seg('per', [['week', 'Энэ долоо хоног'], ['month', 'Энэ сар'], ['all', 'Бүх хугацаа']]) + '</div>';
  var kpi = '<div class="fn-kpis">' +
    '<div class="fn-kpi"><small>Зарцуулсан</small><b>' + fmt(spent) + (usd ? ' <span class="muted" style="font-size:.7em">· $' + (Math.round(usd * 100) / 100) + '</span>' : '') + '</b></div>' +
    '<div class="fn-kpi"><small>Boost-ийн үеийн борлуулалт</small><b>' + fmt(sales) + '</b></div>' +
    '<div class="fn-kpi"><small>Boost-ийн дараах ашиг</small><b class="' + (after < -0.5 ? 'neg' : '') + '">' + mny(after) + '</b></div>' +
    '<div class="fn-kpi"><small>ROAS</small><b>' + roas + '</b></div></div>';
  var nn = function (v) { v = Math.round(Number(v) || 0); return v ? (v < 0 ? '−' + fmt(-v).slice(1) : fmt(v).slice(1)) : '<span class="muted">—</span>'; };   // хүснэгтийн тоо ₮-гүй, 0 → —
  var tag = function (t) { var c = { 'Явж байна': 'b', 'Ашигтай': 'g', 'Ашиггүй': 'r', 'Өртөггүй': 'y' }[t]; return '<span class="st ' + c + '">' + t + '</span>'; };
  var many = BST.biz === 'all' && cos.length > 1, cols = 12 + (many ? 1 : 0);
  var rows = L.map(function (o) {
    var x = o.x, d = o.d, op = BST.open[x.id];
    var main = '<tr class="clk" onclick="bstToggle(' + esc(JSON.stringify(x.id)) + ')">' + (many ? '<td class="nw">' + esc(bstName(o.biz)) + '</td>' : '') +
      '<td style="min-width:150px">' + esc(x.item) + (x.note ? '<br><small class="muted">' + esc(x.note) + '</small>' : '') + '</td><td class="nw">' + esc(x.staff || '') + '</td>' +
      '<td class="nw">' + x.date.slice(5) + ' – ' + d._to.slice(5) + '<br>' + (d._run ? '<small style="color:var(--income)">' + o.left + ' хоног үлдсэн</small>' : '<small class="muted">Дууссан</small>') + '</td>' +
      '<td class="n">' + (o.usd ? '$' + (Math.round(o.usd * 100) / 100) : '') + '</td><td class="n">' + nn(o.a) + '</td>' +
      '<td class="n">' + nn(d._q) + '</td><td class="n">' + nn(d._on) + '</td><td class="n">' + nn(d._sa) + '</td>' +
      '<td class="n">' + (d._nc ? '<span class="muted">—</span>' : nn(d._gp)) + '</td><td class="n' + (o.after < -0.5 ? ' neg' : '') + '">' + nn(o.after) + '</td>' +
      '<td style="min-width:170px">' + tag(o.verdict) + '<br><small class="muted">' + (o.be != null ? o.be + ' ш зарвал нөхнө · одоо ' + r0(d._q) + ' ш' : 'Тэнцэх тоо: өртөггүй') + '</small>' +
        '<br><small class="' + (o.paid === false ? 'neg' : 'muted') + '">' + (o.paid == null ? 'Банкаар (7120)' : o.paid ? 'Төлсөн' : 'Банкаар тулгаагүй') + '</small></td>' +
      '<td class="n"><button class="mini" onclick="event.stopPropagation();cancelRecord(' + esc(JSON.stringify(x.id)) + ')">Цуцлах</button></td></tr>';
    if (!op) return main;
    var sl = d._sl.slice().sort(function (a, b) { return (b.date + b.time) < (a.date + a.time) ? -1 : 1; }), ol = d._ol;
    return main + '<tr class="b"><td colspan="' + cols + '" style="background:var(--bg-2,#F9FAFB)">' +
      '<b>Борлуулалт (' + sl.length + ')</b>' + (sl.length ? '<table class="rep-t" style="margin:4px 0 8px"><tr><th>Огноо</th><th>Ажилтан</th><th class="n">Тоо</th><th>Төлбөр</th><th class="n">Дүн</th></tr>' + sl.map(function (y) {
        return '<tr class="clk" onclick="openBillAdm(' + esc(JSON.stringify(billKey(y))) + ')"><td class="nw">' + y.date + ' ' + esc(y.time || '') + '</td><td>' + esc(y.staff || '') + '</td><td class="n">' + y.qty + '</td><td>' + esc(y.pay || '') + '</td><td class="n">' + fmt(y.amount).slice(1) + '</td></tr>'; }).join('') + '</table>' : ' <span class="muted">— алга</span><br>') +
      '<b>Захиалга (' + ol.length + ')</b>' + (ol.length ? '<table class="rep-t" style="margin:4px 0 0"><tr><th>Огноо</th><th>Утас</th><th>Төлөв</th><th class="n">Дүн</th></tr>' + ol.map(function (w) {
        return '<tr><td class="nw">' + w.date + '</td><td>' + esc(w.phone || '') + '</td><td>' + esc(typeof ordStLabel === 'function' ? ordStLabel(w) : w.status || '') + '</td><td class="n">' + fmt(Number(w.amount) || 0).slice(1) + '</td></tr>'; }).join('') + '</table>' : ' <span class="muted">— алга</span>') +
      '</td></tr>';
  }).join('');
  var head = '<tr>' + (many ? '<th>Компани</th>' : '') + '<th>Бараа</th><th>Ажилтан</th><th>Хугацаа</th><th class="n">$</th><th class="n">₮</th><th class="n">Зарсан ш</th><th class="n">Захиалга</th><th class="n">Борлуулалт</th><th class="n">Нийт ашиг</th><th class="n">Boost-ийн дараах ашиг</th><th>Дүгнэлт</th><th></th></tr>';
  return '<div class="card">' + flt + '</div>' + kpi +
    '<div class="card rep"><div class="scroll"><table class="rep-t bst-t">' + head + (rows || '<tr><td colspan="' + cols + '" class="muted">Энэ хугацаанд boost алга.</td></tr>') + '</table></div>' +
    '<p class="muted" style="font-size:12.5px;margin-top:8px">Нийт ашиг = boost-ийн хугацааны борлуулалт − өртөг; Boost-ийн дараах ашиг = нийт ашиг − boost зардал. Тэнцэх тоо = boost₮ ÷ (зарах үнэ − өртөг). Мөр дээр дарахад тэр хугацааны борлуулалт, захиалга нээгдэнэ. Төлбөр: банкны хуулгаар «3801 Сурталчилгаа төлсөн» гэж тулгасан дүнг эртний boost-оос эхлэн хуваарилна.</p></div>';
}
// Нүүрний «Идэвхтэй boost» карт (тухайн компани)
function boostHomeCard(biz) {
  var t = todayStr(), L = (R().records || []).filter(function (x) { return x.biz === biz && x.type === 'boost' && x.date <= t && boostEnd(x) > t; });
  if (!L.length) return '';
  var sp = L.reduce(function (a, x) { return a + (Number(x.amount) || 0); }, 0), endT = L.filter(function (x) { return boostEnd(x) === addDays(t, 1); }).length;
  return '<div class="card"><div class="bar-row"><h2 style="margin:0">Идэвхтэй boost</h2><button class="link" onclick="BST.biz=state.biz;BST.per=\'all\';navGo(\'sales/boostp\')">Дэлгэрэнгүй →</button></div>' +
    '<div class="fn-kpis" style="margin-top:8px"><div class="fn-kpi"><small>Явж байгаа</small><b>' + L.length + '</b></div><div class="fn-kpi"><small>Нийт зарцуулалт</small><b>' + fmt(sp) + '</b></div>' +
    '<div class="fn-kpi"><small>Өнөөдөр дуусах</small><b>' + endT + '</b></div></div></div>';
}
