// ═══════════ Сурталчилгаа (Boost) — зардал бүртгэх, ROAS (8-р ээлж) ═══════════
// Удирдлагаас бүртгэсэн зардал: Дт 7120 Зар сурталчилгааны зардал / Кт мөнгөний данс (карт, харилцах) — журналд «Сурталчилгаа · <кампанит ажил> #ADS».
// Boost нэхэмжлэхийг банкаар төлөхөд Дт 7120 / Кт банк. ROAS = тухайн хугацааны борлуулалт ÷ зардал.
var ADS_TAG = '#ADS';
function adsCamp(e, rec) {   // 7120 бичилтийн кампанит ажлын нэр
  var m = String(e.desc || '').match(/^Сурталчилгаа · (.*?) #ADS/); if (m) return m[1];
  if (e.doc === 'Сурталчилгаа' && rec[e.ref]) return 'Boost · ' + rec[e.ref].item;
  var b = String(e.desc || '').match(/^Boost · (.*?) #BST:/); if (b) return 'Boost · ' + b[1];   // банкаар тулгасан Boost нэхэмжлэх
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
  return '<div class="card"><div class="ord-bar"><p class="muted" style="margin:0;flex:1">ROAS = борлуулалт ÷ сурталчилгааны зардал. Банкаар төлсөн зардал орно.</p><button class="btn" onclick="adsOpen()">Зардал бүртгэх</button></div></div>' +
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
// ═══════════ Boost нэхэмжлэх (BST-…) ═══════════
// Ажилтны boost мөрүүд bill = нэхэмжлэхийн дугаараар нэгдэнэ. Төлсөн эсэх, бодит ₮ — журналын «#BST:<дугаар>» тагтай Дт 7120 бичилтээс
// (банкны хуулгаар тулгахад мөр бүрт «Boost · <бараа> #BST:<дугаар>»). Мөрийн ₮ (amount) нь зөвхөн ханшаар тооцсон урьдчилсан дүн.
var BST_TAG_RE = /#BST:([\w-]+)/;
function bstTag(no) { return '#BST:' + String(no).replace(/^BST-/i, ''); }
function bstNoIn(desc) { var m = String(desc || '').match(/BST-?\s?(\d[\w-]{3,})/i); return m ? 'BST-' + m[1] : ''; }   // банкны гүйлгээний утган дахь дугаар
function bstCoName(k) { return BST_SHORT[k] || (k === 'travel' ? 'NOMAAD' : (BUSINESSES[k] || {}).name || k); }
function bstInvoices(Rr) {
  Rr = Rr || R();
  var by = {}, list = [], J = {};
  (Rr.records || []).forEach(function (x) {
    if (x.type !== 'boost' || !/^BST-/.test(String(x.bill || '')) || x.date < BOOST_JR_FROM) return;
    var v = by[x.bill]; if (!v) { v = by[x.bill] = { no: x.bill, tag: bstTag(x.bill), rows: [], staff: x.staff || '', date: x.date }; list.push(v); }
    v.rows.push(x); if (x.date < v.date) v.date = x.date;
  });
  (window.journal || []).forEach(function (e) { var m = String(e.desc || '').match(BST_TAG_RE); if (m) (J[m[1]] = J[m[1]] || []).push(e); });
  list.forEach(function (v) {
    var E = J[v.tag.slice(5)] || [], cos = {};
    v.rows.forEach(function (x) { x._usd = x.unit === 'USD' ? Number(x.price) || 0 : 0; x._est = Number(x.amount) || 0; x._paid = 0; });
    v.pays = [];
    E.forEach(function (e) {
      if (e.dr !== '7120' && e.cr !== '7120') return;
      var sg = e.dr === '7120' ? 1 : -1, it = (String(e.desc).match(/^Boost · (.*?) #BST:/) || [])[1];
      var rs = v.rows.filter(function (x) { return x.biz === e.biz && x.item === it; }); if (!rs.length) rs = v.rows.filter(function (x) { return x.biz === e.biz; }); if (!rs.length) return;
      var tu = rs.reduce(function (a, x) { return a + x._usd; }, 0);
      rs.forEach(function (x) { x._paid += sg * e.amount * (tu ? x._usd / tu : 1 / rs.length); });
      v.pays.push({ biz: e.biz, date: e.date, amount: sg * e.amount });
    });
    v.rows.forEach(function (x) {
      var c = cos[x.biz] = cos[x.biz] || { biz: x.biz, usd: 0, est: 0, paid: 0, last: '', n: 0 };
      c.usd += x._usd; c.est += x._est; c.paid += x._paid; c.n++;
    });
    v.pays.forEach(function (p) { var c = cos[p.biz]; if (c && p.date > c.last) c.last = p.date; });
    v.cos = Object.keys(cos).map(function (k) { var c = cos[k]; c.usd = Math.round(c.usd * 100) / 100; c.paid = r0(c.paid); c.isPaid = c.paid > 0.5; return c; });
    v.usd = Math.round(v.cos.reduce(function (a, c) { return a + c.usd; }, 0) * 100) / 100;
    v.est = v.cos.reduce(function (a, c) { return a + c.est; }, 0); v.paid = v.cos.reduce(function (a, c) { return a + c.paid; }, 0);
    var np = v.cos.filter(function (c) { return c.isPaid; }), last = np.reduce(function (a, c) { return c.last > a ? c.last : a; }, '');
    v.state = np.length === v.cos.length ? 'paid' : np.length ? 'part' : 'open';
    var nm = function (l) { return l.map(function (c) { return bstCoName(c.biz); }).join(', '); };
    v.status = v.state === 'paid' ? 'Төлсөн · ' + last : v.state === 'part' ? nm(np) + ' төлсөн · ' + nm(v.cos.filter(function (c) { return !c.isPaid; })) + ' төлөгдөөгүй' : 'Төлөгдөөгүй';
  });
  return list.sort(function (a, b) { return a.no < b.no ? 1 : -1; });
}
function bstPaidMap(Rr) { var m = typeof bbPaidMap === 'function' ? bbPaidMap() : {}; bstInvoices(Rr).forEach(function (v) { v.rows.forEach(function (x) { m[x.id] = { paid: x._paid, est: x._est }; }); }); return m; }
function bstImg(no) {
  if (!API_URL) { toast('Зураг зөвхөн сервертэй үед харагдана'); return; }
  post({ type: 'admin_boost', img: no }, function (err, d) {
    if (err || !d || !d.img) { toast(err === 'not_found' ? 'Энэ нэхэмжлэхэд зураг алга' : 'Зураг ачаалсангүй: ' + (err || '')); return; }
    gOpen('<h2>' + esc(no) + ' · Meta баримт</h2><img src="' + esc(d.img) + '" alt="" style="max-width:100%;border-radius:8px"><div style="margin-top:10px"><button class="b-btn" onclick="gClose()">Хаах</button></div>');
  });
}
function bstRows(Rr) {
  var r = bstRange(), today = todayStr(), cos = BST.biz === 'all' ? bstCos() : [BST.biz], out = [], paid = bstPaidMap(Rr);
  cos.forEach(function (biz) {
    var rep = repBoost(Rr, biz, '0000-00-00', '9999-12-31'), ce = costEngine(biz, Rr), P = {};
    (BUSINESSES[biz].products || []).forEach(function (p) { P[p.name] = Number(p.price) || 0; });
    (rep.det || []).forEach(function (d) {
      if (d._from > r[1] || d._to < r[0]) return;
      var x = d._x, legacy = x.date < BOOST_JR_FROM, pm = paid[x.id] || {}, a = legacy ? Number(x.amount) || 0 : r0(pm.paid || 0);   // зөвхөн төлсөн мөр — бодит төлсөн ₮
      if (!(a > 0.5)) return;
      var cost = avgCost(ce, x.item), price = d._q > 0 ? d._sa / d._q : P[x.item] || 0, unit = price - cost;
      out.push({ biz: biz, x: x, d: d, a: a, usd: x.unit === 'USD' ? Number(x.price) || 0 : 0, left: d._run ? Math.round((new Date(boostEnd(x) + 'T00:00:00') - new Date(today + 'T00:00:00')) / 864e5) : 0,
        after: d._gp - a, est: legacy ? a : r0(pm.est || 0), be: unit > 0 && cost > 0 ? Math.ceil(a / unit) : null, legacy: legacy,
        verdict: d._run ? 'Явж байна' : d._nc ? 'Өртөггүй' : d._gp - a >= 0 ? 'Ашигтай' : 'Ашиггүй' });
    });
  });
  return out.sort(function (a, b) { return (b.x.date + b.x.time) < (a.x.date + a.x.time) ? -1 : 1; });
}
function bstSet(k, v) { BST[k] = v; render(); }
function bstToggle(id) { BST.open[id] = !BST.open[id]; render(); }
function boostView() {
  var Rr = R(), L = bstRows(Rr), cos = bstCos(), INV = bstInvoices(Rr), rg = bstRange();
  var spent = 0, usd = 0, sales = 0, after = 0; L.forEach(function (o) { spent += o.a; usd += o.usd; sales += o.d._sa; after += o.after; });
  var roas = spent > 0 ? (Math.round(sales / spent * 10) / 10) + '×' : '—';
  var seg = function (k, opts) { return '<div class="fn-seg">' + opts.map(function (o) { return '<button class="' + (BST[k] === o[0] ? 'on' : '') + '" onclick="bstSet(\'' + k + '\',\'' + o[0] + '\')">' + o[1] + '</button>'; }).join('') + '</div>'; };
  var flt = '<div class="fn-flt"><span class="fn-fl">Компани</span>' + seg('biz', [['all', 'Бүгд']].concat(cos.map(function (k) { return [k, bstName(k)]; }))) + '</div>' +
    '<div class="fn-flt"><span class="fn-fl">Хугацаа</span>' + seg('per', [['week', 'Энэ долоо хоног'], ['month', 'Энэ сар'], ['all', 'Бүх хугацаа']]) + '</div>';
  // Төлөгдөөгүй нэхэмжлэх (сонгосон компанийн мөрөөр): тоо, $
  var mine = function (c) { return BST.biz === 'all' || c.biz === BST.biz; };
  var unp = INV.filter(function (v) { return v.cos.some(function (c) { return mine(c) && !c.isPaid; }); });
  var unpUsd = unp.reduce(function (a, v) { return a + v.cos.reduce(function (b, c) { return b + (mine(c) && !c.isPaid ? c.usd : 0); }, 0); }, 0);
  var unpEst = unp.reduce(function (a, v) { return a + v.cos.reduce(function (b, c) { return b + (mine(c) && !c.isPaid ? c.est : 0); }, 0); }, 0);
  var unpCard = '<div class="fn-kpi"><small>Төлөгдөөгүй нэхэмжлэх</small><b' + (unp.length ? ' class="neg"' : '') + '>' + unp.length + ' · $' + Math.round(unpUsd * 100) / 100 + '</b>' +
    (unpEst ? '<small class="muted">≈ ' + fmt(unpEst) + ' (ханшаар)</small>' : '') + '</div>';
  var kpi = '<div class="fn-kpis">' + unpCard +
    '<div class="fn-kpi"><small>Төлсөн (банкаар)</small><b>' + fmt(spent) + (usd ? ' <span class="muted" style="font-size:.7em">· $' + (Math.round(usd * 100) / 100) + '</span>' : '') + '</b></div>' +
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
      '<td style="min-width:150px">' + tag(o.verdict) + '<br><small class="muted">' + (o.be != null ? o.be + ' ш зарвал нөхнө · одоо ' + r0(d._q) + ' ш' : 'Тэнцэх тоо: өртөггүй') + '</small>' +
        '<br><small class="muted">' + (o.legacy ? 'Банкаар (7120)' : o.a < o.est - 0.5 ? 'Хэсэгчлэн · дутуу ' + fmt(r0(o.est - o.a)) : 'Төлсөн · ' + esc(x.bill || '')) + '</small></td>' +
      '<td class="n nw"><button class="mini" onclick="event.stopPropagation();bstDateOpen(' + esc(JSON.stringify(x.id)) + ')">Огноо засах</button> <button class="mini" onclick="event.stopPropagation();cancelRecord(' + esc(JSON.stringify(x.id)) + ')">Цуцлах</button></td></tr>';
    if (!op) return main;
    var sl = d._sl.slice().sort(function (a, b) { return (b.date + b.time) < (a.date + a.time) ? -1 : 1; }), ol = d._ol;
    return main + '<tr class="b"><td colspan="' + cols + '" style="background:var(--bg-2,#F9FAFB)">' +
      '<b>Борлуулалт (' + sl.length + ')</b>' + (sl.length ? '<table class="rep-t bst-sub" style="margin:4px 0 8px"><tr><th>Огноо</th><th>Ажилтан</th><th class="n">Тоо</th><th>Төлбөр</th><th class="n">Дүн</th></tr>' + sl.map(function (y) {
        return '<tr class="clk" onclick="openBillAdm(' + esc(JSON.stringify(billKey(y))) + ')"><td class="nw">' + y.date + ' ' + esc(y.time || '') + '</td><td>' + esc(y.staff || '') + '</td><td class="n">' + y.qty + '</td><td>' + esc(y.pay || '') + '</td><td class="n">' + fmt(y.amount).slice(1) + '</td></tr>'; }).join('') + '</table>' : ' <span class="muted">— алга</span><br>') +
      '<b>Захиалга (' + ol.length + ')</b>' + (ol.length ? '<table class="rep-t bst-sub" style="margin:4px 0 0"><tr><th>Огноо</th><th>Утас</th><th>Төлөв</th><th class="n">Дүн</th></tr>' + ol.map(function (w) {
        return '<tr><td class="nw">' + w.date + '</td><td>' + esc(w.phone || '') + '</td><td>' + esc(typeof ordStLabel === 'function' ? ordStLabel(w) : w.status || '') + '</td><td class="n">' + fmt(Number(w.amount) || 0).slice(1) + '</td></tr>'; }).join('') + '</table>' : ' <span class="muted">— алга</span>') +
      '</td></tr>';
  }).join('');
  var invL = INV.filter(function (v) { return v.cos.some(mine) && (v.state !== 'paid' || v.rows.some(function (x) { return x.date <= rg[1] && addDays(boostEnd(x), -1) >= rg[0]; })); });
  var invRows = invL.map(function (v) {
    var cs = v.cos.filter(mine);
    return '<tr><td class="nw"><b>' + esc(v.no) + '</b><br><small class="muted">' + esc(v.staff) + '</small></td><td>' + v.rows.filter(function (x) { return mine(x); }).map(function (x) {
        return (many ? bstName(x.biz) + ' · ' : '') + esc(x.item) + ' <small class="muted">$' + x._usd + ' · ' + x.date.slice(5) + '–' + addDays(boostEnd(x), -1).slice(5) + (x.note ? ' · ' + esc(x.note) : '') + (x._paid > 0.5 ? ' · ' + fmt(r0(x._paid)) : '') + '</small>'; }).join('<br>') + '</td>' +
      '<td>' + cs.map(function (c) {
        // Бодит зардал = банкаар төлсөн ₮; ажилтны тооцоолол зөвхөн лавлагаа
        return '<div class="nw">' + bstCoName(c.biz) + ': $' + c.usd + ' — ' + (c.isPaid ? '<span style="color:var(--green)">Төлсөн · ' + c.last + ' · ' + fmt(c.paid) + '</span> <small class="muted">(тооцоолол ' + fmt(c.est) + ')</small>' : '≈' + fmt(c.est).slice(1) + ' · <span class="neg">Төлөгдөөгүй</span>') + '</div>'; }).join('') + '</td>' +
      '<td><span class="st ' + ({ paid: 'g', part: 'y', open: 'r' })[v.state] + '">' + esc(v.status) + '</span></td><td class="n"><button class="mini" onclick="bstImg(' + esc(JSON.stringify(v.no)) + ')">Баримт</button></td></tr>';
  }).join('');
  var invCard = '<div class="card rep"><div class="rep-cap"><b>Нэхэмжлэх</b><span>Төлөгдөөгүй бүгд + энэ хугацааны төлсөн. Банкны хуулгаар «Boost нэхэмжлэх»-ээр тулгана.</span></div><div class="scroll"><table class="rep-t"><tr><th>Дугаар</th><th>Мөр</th><th>Компаниар ($ · ≈₮ ханшаар — төлсөн ₮)</th><th>Төлөв</th><th></th></tr>' +
    (invRows || '<tr><td colspan="5" class="muted">Нэхэмжлэх алга.</td></tr>') + '</table></div></div>';
  var head = '<tr>' + (many ? '<th>Компани</th>' : '') + '<th>Бараа</th><th>Ажилтан</th><th>Хугацаа</th><th class="n">$</th><th class="n">₮</th><th class="n">Зарсан ш</th><th class="n">Захиалга</th><th class="n">Борлуулалт</th><th class="n">Нийт ашиг</th><th class="n">Boost-ийн дараах</th><th>Дүгнэлт</th><th></th></tr>';
  return '<div class="card">' + flt + '<div style="margin-top:8px;text-align:right"><button class="b-btn" onclick="bstReset()">Шинээр эхлүүлэх</button></div></div>' + kpi +
    '<div class="card rep"><div class="scroll"><table class="rep-t bst-t">' + head + (rows || '<tr><td colspan="' + cols + '" class="muted">Энэ хугацаанд төлсөн boost алга.</td></tr>') + '</table></div>' +
    '<p class="muted" style="font-size:12.5px;margin-top:8px">Нийт ашиг = boost-ийн хугацааны борлуулалт − өртөг; Boost-ийн дараах ашиг = нийт ашиг − boost зардал. Тэнцэх тоо = boost₮ ÷ (зарах үнэ − өртөг). Мөр дээр дарахад тэр хугацааны борлуулалт, захиалга нээгдэнэ. Зөвхөн банкаар тулгасан (Төлсөн) нэхэмжлэхийн мөр орно — ₮ нь бодит төлсөн дүн (банкны ₮-ийг нэхэмжлэхийн мөрүүдэд $-ын харьцаагаар хуваасан).</p></div>' + invCard;
}
// Шинээр эхлүүлэх: бүх boost бүртгэлийг цуцална (хогийн саванд — сэргээж болно); банкаар тулгасан 7120 зардал журналд хэвээр
function bstReset() {
  var L = records.filter(function (x) { return x.type === 'boost'; });
  if (!L.length) { toast('Boost бүртгэл алга'); return; }
  if (!confirm('Boost-ийн бүх бүртгэлийг (' + L.length + ' мөр, нэхэмжлэхүүд) устгаж шинээр эхлүүлэх үү?\n\nХогийн саванд орно. Банкаар төлсөн зардал (7120) санхүүд хэвээр үлдэнэ.')) return;
  if (!API_URL) { records = records.filter(function (x) { return x.type !== 'boost'; }); save('nb_records', records); render(); return; }
  var i = 0, bad = 0, next = function () {
    if (i >= L.length) { toast(bad ? bad + ' мөр цуцлагдсангүй — дахин дарна уу' : 'Boost шинээр эхэллээ'); refresh(); return; }
    var x = L[i++]; toast('Устгаж байна… ' + i + '/' + L.length);
    post({ type: 'admin_record', cancelId: x.id, by: ownerName, what: x.date + ' · Boost · ' + x.item + ' (шинээр эхлэх)' }, function (err) { if (err) bad++; next(); });
  };
  next();
}
// Boost-ийн эхэлсэн/дууссан огноог засах — зөвхөн шинжилгээнд (ROAS, борлуулалтын хугацаа); дүн, журнал өөрчлөгдөхгүй
function bstDateOpen(id) {
  var x = R().records.filter(function (y) { return y.id === id; })[0]; if (!x) return;
  gOpen('<h2>Boost-ийн огноо засах</h2><p class="rep-note">' + esc(x.item) + (x.bill ? ' · ' + esc(x.bill) : '') + '</p>' +
    '<p class="muted" style="font-size:12.5px">Зөвхөн шинжилгээнд (борлуулалт, ROAS-ийн хугацаа) — мөнгөн дүн, журналд нөлөөлөхгүй.</p>' +
    '<label for="bdF">Эхэлсэн</label><input type="date" id="bdF" value="' + esc(x.date) + '">' +
    '<label for="bdT">Дууссан</label><input type="date" id="bdT" value="' + esc(addDays(boostEnd(x), -1)) + '">' +
    '<div class="row2" style="margin-top:12px"><button class="b-btn" onclick="gClose()">Болих</button><button class="b-btn primary" onclick="bstDateSave(' + esc(JSON.stringify(id)) + ')">Хадгалах</button></div>');
}
function bstDateSave(id) {
  var f = $('bdF').value, t = $('bdT').value;
  if (!f || !t) { toast('Огноогоо сонгоно уу'); return; }
  if (t < f) { toast('Дууссан огноо эхэлснээс өмнө байна'); return; }
  var qty = Math.round((new Date(t + 'T00:00:00') - new Date(f + 'T00:00:00')) / 864e5) + 1;
  post({ type: 'admin_boost', edit: [{ id: id, date: f, qty: qty }] }, function (err) {
    if (err) { toast(err === 'role' ? 'Энэ компанид эрхгүй' : 'Алдаа: ' + err); return; }
    gClose(); toast('Огноо засагдлаа'); refresh();
  });
}
// Нүүрний «Идэвхтэй boost» карт (тухайн компани; 'all' — бүх компани)
// Нийт зарцуулалт = банкаар төлсөн boost (журналын Дт 7120: #BST нэхэмжлэх + нэхэмжлэхгүй), ажилтны тооцоолсон ₮ биш
function boostHomeCard(biz) {
  var B = biz === 'all' ? KEYS.filter(function (k) { return k !== 'mgmt'; }) : [biz], inB = function (b) { return B.indexOf(b) >= 0; };
  var t = todayStr(), L = (R().records || []).filter(function (x) { return inB(x.biz) && x.type === 'boost' && x.date <= t && boostEnd(x) > t; });
  var sp = (window.journal || []).reduce(function (a, e) { return !inB(e.biz) ? a : a + (e.dr === '7120' ? Number(e.amount) || 0 : 0) - (e.cr === '7120' ? Number(e.amount) || 0 : 0); }, 0);
  if (!L.length) return '';   // идэвхтэй boost байхгүй бол картгүй (шинээр эхэлсний дараа хуучин 7120 харагдахгүй)
  var endT = L.filter(function (x) { return boostEnd(x) === addDays(t, 1); }).length;
  return '<div class="card"><div class="bar-row"><h2 style="margin:0">Идэвхтэй boost</h2><button class="link" onclick="BST.biz=' + (biz === 'all' ? '\'all\'' : 'state.biz') + ';BST.per=\'all\';navGo(\'sales/boostp\')">Дэлгэрэнгүй →</button></div>' +
    '<div class="fn-kpis" style="margin-top:8px"><div class="fn-kpi"><small>Явж байгаа</small><b>' + L.length + '</b></div><div class="fn-kpi"><small>Нийт зарцуулалт (банкаар)</small><b>' + fmt(sp) + '</b></div>' +
    '<div class="fn-kpi"><small>Өнөөдөр дуусах</small><b>' + endT + '</b></div></div></div>';
}
