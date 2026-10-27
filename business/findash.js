// ── САНХҮҮ → ҮР ДҮН: өнгөлөг самбар (KPI карт + график). Зөвхөн энэ хуудсанд, .fd- class-тай ──
var FD_C = { in: '#16A34A', out: '#3B82F6', profit: '#F97316', cash: '#0EA5E9', red: '#E11D48', pie: ['#3B82F6', '#22C55E', '#EAB308', '#F97316', '#A855F7', '#EC4899', '#14B8A6', '#94A3B8'] };
var FD_I = {
  in: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  out: '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/>',
  profit: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
  cash: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>',
  pct: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
};
var _fdCharts = [];
function fdIco(k) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + FD_I[k] + '</svg>'; }
function fdShort(v) { v = Number(v) || 0; var a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + ' сая' : a >= 1e3 ? Math.round(v / 1e3) + ' мян' : String(Math.round(v)); }
function fdChg(cur, prev, goodUp) {
  if (!prev) return '<em class="fd-ch">— <span>өмнөх үе хоосон</span></em>';
  var p = Math.round((cur - prev) / Math.abs(prev) * 100), up = p >= 0, good = up === goodUp;
  return '<em class="fd-ch ' + (good ? 'up' : 'dn') + '">' + (up ? '↑ ' : '↓ ') + Math.abs(p) + '% <span>өмнөх үеэс</span></em>';
}
function fdCard(k, color, label, val, chg) {
  return '<div class="fd-k" style="--c:' + color + '"><span class="fd-i">' + fdIco(k) + '</span><div><small>' + label + '</small><b>' + val + '</b>' + (chg || '') + '</div></div>';
}
// p — plData (энэ үе), f..t — хугацаа, E — журнал
function finDash(E, p, f, t, fl, PLA) {
  var cash = cashCodes(), REV = ['5101', '5102'];
  var d0 = new Date(f + 'T00:00:00'), d1 = new Date(t + 'T00:00:00'), days = Math.round((d1 - d0) / 864e5) + 1;
  var pt = todayStr(new Date(d0 - 864e5)), pf = todayStr(new Date(d0 - days * 864e5)), q = plData(E, pf, pt);
  var cost = p.cogs + p.expT, qcost = q.cogs + q.expT, mg = p.net ? Math.round(p.profit / p.net * 1000) / 10 : 0, qmg = q.net ? q.profit / q.net * 100 : 0;
  var flow = function (a, b) { var i = 0, o = 0; drillLines({ acc: cash, from: a, to: b, sign: 1 }, E).lines.forEach(function (x) { if (x.v > 0) i += x.v; else o -= x.v; }); return [i, o]; };
  var cf = flow(f, t), qf = flow(pf, pt);
  // 12 сар
  var y = yearOf(), ms = monthsOf(y), M = { l: [], inc: [], cost: [], prof: [], cin: [], cout: [], bal: [] };
  ms.forEach(function (mm) {
    var a = mm + '-01', b = lastDayOf(mm), x = plData(E, a, b), c = flow(a, b), bb = balances(E, b);
    M.l.push(Number(mm.slice(5)) + '-р сар'); M.inc.push(Math.round(x.net + x.other)); M.cost.push(Math.round(x.cogs + x.expT)); M.prof.push(Math.round(x.profit));
    M.cin.push(Math.round(c[0])); M.cout.push(Math.round(c[1])); M.bal.push(Math.round(cash.reduce(function (s, k) { return s + (bb[k] || 0); }, 0)));
  });
  while (M.l.length > 1 && !M.inc[0] && !M.cost[0] && !M.cin[0] && !M.cout[0]) Object.keys(M).forEach(function (k) { M[k].shift(); });
  var ex = p.exps.slice().sort(function (a, b) { return b.v - a.v; }), exL = [], exV = [];
  if (p.cogs > 0) { exL.push('Барааны өртөг'); exV.push(Math.round(p.cogs)); }
  ex.forEach(function (x, i) { if (i < 6) { exL.push(EXP_SHORT[x.code] || x.name); exV.push(Math.round(x.v)); } });
  var rest = ex.slice(6).reduce(function (s, x) { return s + x.v; }, 0); if (rest > 0) { exL.push('Бусад'); exV.push(Math.round(rest)); }
  window.__fin = { M: M, exL: exL, exV: exV, tot: cost };
  var tot = cost || 1, top = [];
  if (p.cogs > 0) top.push({ n: 'Барааны өртөг', v: p.cogs, s: fl(['6101'], 1, 'item', 'Барааны өртөг') });
  ex.forEach(function (x) { top.push({ n: EXP_SHORT[x.code] || x.name, v: x.v, s: fl([x.code], 1, 'cat', EXP_SHORT[x.code] || x.name) }); });
  top.sort(function (a, b) { return b.v - a.v; }); top = top.slice(0, 10);
  var bar = function (v, c) { return '<span class="fd-bar"><i style="width:' + Math.max(2, Math.round(v / tot * 100)) + '%;background:' + c + '"></i></span>'; };
  return '<div class="fd">' +
    '<div class="fd-kg">' +
      fdCard('in', FD_C.in, 'Нийт орлого', dl(fl(REV.concat(['6001', '5201', '5202']), -1, 'item', 'Орлого'), mny(p.net + p.other)), fdChg(p.net + p.other, q.net + q.other, true)) +
      fdCard('out', FD_C.out, 'Нийт зардал', dl(fl(['6101'].concat(accsOf('exp')), 1, 'acc', 'Зардал (өртөг орсон)'), mny(cost)), fdChg(cost, qcost, false)) +
      fdCard('profit', p.profit >= 0 ? FD_C.profit : FD_C.red, 'Цэвэр ашиг', dl(fl(PLA, -1, 'acc', 'Цэвэр ашиг'), mny(p.profit)), fdChg(p.profit, q.profit, true)) +
      fdCard('cash', FD_C.cash, 'Мөнгөн урсгал (цэвэр)', dl(fl(cash, 1, 'type', 'Мөнгөн урсгал', { dir: 1 }), mny(cf[0] - cf[1])), fdChg(cf[0] - cf[1], qf[0] - qf[1], true)) +
      fdCard('pct', '#A855F7', 'Ашгийн хувь', mg + '%', q.net ? '<em class="fd-ch ' + (mg >= qmg ? 'up' : 'dn') + '">' + (mg >= qmg ? '↑ ' : '↓ ') + Math.abs(Math.round((mg - qmg) * 10) / 10) + ' пункт <span>өмнөх үеэс</span></em>' : '') +
    '</div>' +
    '<div class="fd-g2"><div class="fd-c"><h3><span class="fd-n" style="background:' + FD_C.in + '">1</span>' + y + ' он: сар бүрийн орлого, зардал, ашиг</h3><div class="fd-box"><canvas id="fdYear"></canvas></div></div>' +
      '<div class="fd-c"><h3><span class="fd-n" style="background:' + FD_C.out + '">2</span>Зардлын бүтэц</h3><div class="fd-box"><canvas id="fdExp"></canvas></div></div></div>' +
    '<div class="fd-g2"><div class="fd-c"><h3><span class="fd-n" style="background:' + FD_C.cash + '">3</span>Мөнгөн урсгал: орсон, гарсан, үлдэгдэл</h3><div class="fd-box"><canvas id="fdCash"></canvas></div></div>' +
      '<div class="fd-c"><h3><span class="fd-n" style="background:' + FD_C.profit + '">4</span>Хамгийн их зардал (TOP 10)</h3><table class="fd-t">' +
      (top.length ? top.map(function (x, i) { return '<tr><td class="fd-r">' + (i + 1) + '</td><td>' + esc(x.n) + bar(x.v, FD_C.pie[i % FD_C.pie.length]) + '</td><td class="n">' + dl(x.s, mny(x.v)) + '</td></tr>'; }).join('') : '<tr><td class="muted">Зардал алга</td></tr>') +
      '</table></div></div>' +
  '</div>';
}
function drawFin() {
  _fdCharts.forEach(function (c) { try { c.destroy(); } catch (e) {} }); _fdCharts = [];
  var D = window.__fin; if (!D || typeof Chart === 'undefined') return;
  var mk = function (id, cfg) { var el = $(id); if (el) _fdCharts.push(new Chart(el, cfg)); };
  var money = { callbacks: { label: function (c) { return (c.dataset.label || c.label) + ': ' + fmt(c.raw); } } };
  var leg = { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, padding: 12, font: { size: 12 } } };
  var ax = { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#EEF2F7' }, ticks: { callback: fdShort } } };
  Chart.defaults.font.family = "Inter,-apple-system,'Segoe UI',Roboto,sans-serif"; Chart.defaults.color = '#64748B';
  if (D.daily) mk('fdDaily', { type: 'bar', data: { labels: D.daily.l, datasets: [{ label: 'Орлого', data: D.daily.v, backgroundColor: FD_C.in, borderRadius: 4, maxBarThickness: 22 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: money }, scales: ax } });
  if (D.M) mk('fdYear', { data: { labels: D.M.l, datasets: [
      { type: 'line', label: 'Ашиг', data: D.M.prof, borderColor: FD_C.profit, backgroundColor: FD_C.profit, tension: .3, pointRadius: 3, borderWidth: 2.5, order: 0 },
      { type: 'bar', label: 'Орлого', data: D.M.inc, backgroundColor: FD_C.in, borderRadius: 4, maxBarThickness: 18, order: 1 },
      { type: 'bar', label: 'Зардал', data: D.M.cost, backgroundColor: FD_C.out, borderRadius: 4, maxBarThickness: 18, order: 1 }] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: leg, tooltip: money }, scales: ax } });
  var center = { id: 'fdCenter', afterDraw: function (c) {
    var a = c.chartArea, x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2, k = c.ctx; k.save(); k.textAlign = 'center';
    k.fillStyle = '#0F172A'; k.font = '700 17px Inter,sans-serif'; k.fillText(fdShort(D.tot), x, y + 2);
    k.fillStyle = '#64748B'; k.font = '12px Inter,sans-serif'; k.fillText('нийт зардал', x, y + 19); k.restore(); } };
  if (D.exV) mk('fdExp', { type: 'doughnut', data: { labels: D.exL, datasets: [{ data: D.exV, backgroundColor: FD_C.pie, borderWidth: 2, borderColor: '#fff' }] },
    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, padding: 9, font: { size: 12 },
      generateLabels: function (c) { var s = D.exV.reduce(function (a, v) { return a + v; }, 0) || 1; return Chart.overrides.doughnut.plugins.legend.labels.generateLabels(c).map(function (l, i) { l.text += '  ' + Math.round(D.exV[i] / s * 100) + '%'; return l; }); } } }, tooltip: money } },
    plugins: D.exV && D.exV.length ? [center] : [] });
  if (D.M) mk('fdCash', { data: { labels: D.M.l, datasets: [
      { type: 'line', label: 'Мөнгөний үлдэгдэл', data: D.M.bal, borderColor: FD_C.profit, backgroundColor: FD_C.profit, tension: .3, pointRadius: 3, borderWidth: 2.5, order: 0 },
      { type: 'bar', label: 'Орсон', data: D.M.cin, backgroundColor: FD_C.in, borderRadius: 4, maxBarThickness: 18, order: 1 },
      { type: 'bar', label: 'Гарсан', data: D.M.cout, backgroundColor: FD_C.out, borderRadius: 4, maxBarThickness: 18, order: 1 }] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: leg, tooltip: money }, scales: ax } });
}

// ── Захирлын шинжилгээ: үзүүлэлт бүрд төлөв + нэг өгүүлбэр (Excel «Автомат шинжилгээ» шиг) ──
var FD_GROUPS = [['Хүн хүч', ['7101', '7102', '7001', '7002']], ['Бараа, логистик', ['6101', '7117', '7118', '7123', '7124', '7421', '7017', '7018']], ['Үйл ажиллагаа', ['7114', '7111', '7112', '7113', '7105', '7106', '7116', '7014', '7011', '7012', '7013', '7304', '7305']],
  ['Маркетинг', ['7120', '7020', '7119']], ['Санхүү, захиргаа', ['7201', '7122', '7404', '7401', '7022']]];
function fdGroupOf(code) { var g = FD_GROUPS.filter(function (x) { return x[1].indexOf(code) >= 0; })[0]; return g ? g[0] : 'Санхүү, захиргаа'; }
function fdCosts(p) {   // барааны өртөг + бүх зардал, ангилал тус бүр
  var L = []; if (p.cogs > 0) L.push({ code: '6101', n: 'Барааны өртөг', v: p.cogs });
  p.exps.forEach(function (x) { if (x.v > 0) L.push({ code: x.code, n: EXP_SHORT[x.code] || x.name, v: x.v }); });
  return L.sort(function (a, b) { return b.v - a.v; });
}
function fdSt(c, t) { return '<span class="fd-st" style="--c:' + c + '">' + t + '</span>'; }
function fdAnalysis(E, p, f, t) {
  var inc = p.net + p.other, cost = p.cogs + p.expT, rows = [];
  if (!inc && !cost) return '';
  var mg = inc ? p.profit / inc : 0, pc = function (v) { return Math.round(v * 100) + '%'; };
  rows.push(['Ашгийн байдал', pc(mg), p.profit < 0 ? fdSt(FD_C.red, 'Алдагдал') : mg < 0.1 ? fdSt('#D97706', 'Бага') : fdSt(FD_C.in, 'Сайн'),
    p.profit < 0 ? 'Зардал орлогоос ' + mny(-p.profit) + '-өөр их байна.' : 'Орлогын ' + pc(mg) + ' нь цэвэр ашиг болж үлдсэн.']);
  var cr = inc ? cost / inc : 0;
  rows.push(['Зардлын харьцаа', pc(cr), cr > 0.9 ? fdSt(FD_C.red, 'Өндөр') : cr > 0.75 ? fdSt('#D97706', 'Анхаарах') : fdSt(FD_C.in, 'Хэвийн'),
    'Орлогын 100 төгрөг тутмаас ' + Math.round(cr * 100) + ' төгрөг нь зардалд (өртөг орсон) гарсан.']);
  var C = fdCosts(p);
  if (C.length && cost > 0) { var sh = C[0].v / cost;
    rows.push(['Хамгийн том зардал', esc(C[0].n), sh > 0.5 ? fdSt('#D97706', pc(sh) + ' эзэлнэ') : fdSt(FD_C.in, pc(sh) + ' эзэлнэ'), '«' + esc(C[0].n) + '» нийт зардлын ' + pc(sh) + '-ийг эзэлж байна.']); }
  var it = {}; drillLines({ acc: ['5101', '5102', '6001'], from: f, to: t, sign: -1, grp: 'item' }, E).lines.forEach(function (x) { it[x.key] = (it[x.key] || 0) + x.v; });
  var ks = Object.keys(it).filter(function (k) { return it[k] > 0; }).sort(function (a, b) { return it[b] - it[a]; });
  if (ks.length && p.net > 0) { var top = it[ks[0]] / p.net;
    rows.push(['Орлогын төвлөрөл', esc(ks[0]), top > 0.7 ? fdSt('#D97706', 'Төвлөрсөн') : fdSt(FD_C.in, 'Тархсан'),
      'Хамгийн их борлогдсон «' + esc(ks[0]) + '» нийт борлуулалтын ' + pc(top) + '. ' + ks.length + ' төрлийн бараа зарагдсан.']); }
  return '<div class="fd-c" style="margin-bottom:16px"><h3><span class="fd-n" style="background:#A855F7">★</span>Товч дүгнэлт</h3><table class="fd-t fd-an">' +
    '<tr><th>Үзүүлэлт</th><th>Утга</th><th>Төлөв</th><th>Тайлбар</th></tr>' +
    rows.map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td><td class="muted">' + r[3] + '</td></tr>'; }).join('') + '</table></div>';
}

// ── 12 сарын дүн: ирэх саруудын таамаглал (сарын дундаж × өсөлт) ──
function fdForecast(E, y) {
  var ms = monthsOf(y).filter(function (mm) { return mm < todayStr().slice(0, 7); }), n = 0, si = 0, sc = 0;
  ms.forEach(function (mm) { var x = plData(E, mm + '-01', lastDayOf(mm)), i = x.net + x.other, c = x.cogs + x.expT; if (i || c) { n++; si += i; sc += c; } });
  if (!n) return '';
  var g = Number(state.fcG); if (isNaN(g) || state.fcG === undefined) g = 0;
  var ai = si / n, ac = sc / n, k = function (m) { return Math.pow(1 + g / 100, m); };
  var cell = function (v) { return '<td class="n' + (v < 0 ? ' neg' : '') + '">' + mny(v) + '</td>'; };
  var row = function (lab, a) { return '<tr><td><b>' + lab + '</b></td>' + cell(a) + cell(a * k(3)) + cell(a * k(6)) + cell(a * k(12)) + '</tr>'; };
  return '<div class="fd-c" style="margin-top:16px"><h3><span class="fd-n" style="background:' + FD_C.profit + '">↗</span>Ирэх саруудын таамаглал</h3>' +
    '<p class="muted" style="margin:0 0 10px;font-size:13px">Сүүлийн ' + n + ' сарын дунджаар тооцов. Сарын өсөлт: <input type="number" step="1" value="' + g + '" style="width:64px" onchange="state.fcG=this.value;render()"> %</p>' +
    '<table class="fd-t"><tr><th></th><th class="n">Сарын дундаж</th><th class="n">3 сарын дараа</th><th class="n">6 сарын дараа</th><th class="n">12 сарын дараа</th></tr>' +
    row('Орлого', ai) + row('Зардал', ac) + row('Цэвэр ашиг', ai - ac) + '</table></div>';
}

// ── Өдрийн орлого ──
function dailyView() {
  var r = range(), f = r[0], t = r[1], E = J(), d0 = new Date(f + 'T00:00:00'), d1 = new Date(t + 'T00:00:00');
  if ((d1 - d0) / 864e5 > 92) { d0 = new Date(d1 - 91 * 864e5); f = todayStr(d0); }
  var I = {}, O = {}, C = {}, inc = ['5101', '5102', '6001'], oth = ['5201', '5202'], cst = ['6101'].concat(accsOf('exp'));
  drillLines({ acc: inc, from: f, to: t, sign: -1 }, E).lines.forEach(function (x) { I[x.date] = (I[x.date] || 0) + x.v; });
  drillLines({ acc: oth, from: f, to: t, sign: -1 }, E).lines.forEach(function (x) { O[x.date] = (O[x.date] || 0) + x.v; });   // хүүгийн орлого гэх мэт — борлуулалтаас тусад нь
  drillLines({ acc: cst, from: f, to: t, sign: 1 }, E).lines.forEach(function (x) { C[x.date] = (C[x.date] || 0) + x.v; });
  var days = [], WD = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'], run = 0, ti = 0, to = 0, tc = 0, best = null;
  for (var d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) days.push(todayStr(d));
  var hasO = Object.keys(O).length > 0;
  var rows = days.map(function (k) {
    var i = I[k] || 0, o = O[k] || 0, c = C[k] || 0; run += i; ti += i; to += o; tc += c; if (i && (!best || i > I[best])) best = k;
    var spec = function (acc, sign, title) { return { acc: acc, from: k, to: k, sign: sign, grp: 'item', t: title + ' · ' + k }; };
    return '<tr' + (!i && !c && !o ? ' class="muted"' : '') + '><td>' + k.slice(5) + ' <small class="muted">' + WD[new Date(k + 'T00:00:00').getDay()] + '</small></td>' +
      '<td class="n">' + (i ? dl(spec(inc, -1, 'Орлого'), mny(i)) : '') + '</td>' + (hasO ? '<td class="n">' + (o ? dl(spec(oth, -1, 'Бусад орлого'), mny(o)) : '') + '</td>' : '') + '<td class="n">' + (c ? dl(spec(cst, 1, 'Зардал'), mny(c)) : '') + '</td>' +
      '<td class="n' + (i + o - c < 0 ? ' neg' : '') + '">' + (i || c || o ? mny(i + o - c) : '') + '</td><td class="n">' + mny(run) + '</td></tr>';
  }).join('');
  var act = days.filter(function (k) { return I[k]; }).length;
  window.__fin = { daily: { l: days.map(function (k) { return k.slice(5); }), v: days.map(function (k) { return Math.round(I[k] || 0); }) } };
  return '<div class="fd"><div class="fd-kg">' +
    fdCard('in', FD_C.in, 'Борлуулалт (цэвэр)', mny(ti), to ? '<em class="fd-ch">+ бусад орлого ' + mny(to) + '</em>' : '') + fdCard('out', FD_C.out, 'Нийт зардал', mny(tc)) +
    fdCard('profit', FD_C.profit, 'Өдрийн дундаж орлого', mny(act ? ti / act : 0), '<em class="fd-ch">' + act + ' өдөр орлоготой</em>') +
    fdCard('pct', '#A855F7', 'Хамгийн их орлоготой өдөр', best ? best.slice(5) : '—', best ? '<em class="fd-ch">' + mny(I[best]) + '</em>' : '') + '</div>' +
    '<div class="fd-c" style="margin-bottom:16px"><h3><span class="fd-n" style="background:' + FD_C.in + '">1</span>Өдөр бүрийн орлого</h3><div class="fd-box"><canvas id="fdDaily"></canvas></div></div>' +
    '<div class="fd-c"><h3><span class="fd-n" style="background:' + FD_C.out + '">2</span>Өдрөөр</h3><table class="fd-t"><tr><th>Өдөр</th><th class="n">Борлуулалт</th>' + (hasO ? '<th class="n">Бусад орлого</th>' : '') + '<th class="n">Зардал</th><th class="n">Цэвэр</th><th class="n">Хуримтлагдсан орлого</th></tr>' + rows +
    '<tr class="tot"><td><b>Нийт</b></td><td class="n"><b>' + mny(ti) + '</b></td>' + (hasO ? '<td class="n"><b>' + mny(to) + '</b></td>' : '') + '<td class="n"><b>' + mny(tc) + '</b></td><td class="n"><b>' + mny(ti + to - tc) + '</b></td><td></td></tr></table></div></div>';
}

// ── Зардлын задаргаа: бүлэг → ангилал, TOP 10 ──
function expcatView() {
  var r = range(), f = r[0], t = r[1], E = J(), p = plData(E, f, t), C = fdCosts(p), tot = C.reduce(function (a, x) { return a + x.v; }, 0);
  if (!tot) return '<div class="fd-c"><p class="muted">Энэ хугацаанд зардал алга.</p></div>';
  var G = {}, order = [];
  C.forEach(function (x) { var g = fdGroupOf(x.code); if (!G[g]) { G[g] = { v: 0, L: [] }; order.push(g); } G[g].v += x.v; G[g].L.push(x); });
  order.sort(function (a, b) { return G[b].v - G[a].v; });
  var spec = function (x) { return { acc: [x.code], from: f, to: t, sign: 1, grp: x.code === '6101' ? 'item' : 'cat', t: x.n }; };
  var pc = function (v) { return Math.round(v / tot * 1000) / 10 + '%'; }, bar = function (v, c) { return '<span class="fd-bar"><i style="width:' + Math.max(2, Math.round(v / tot * 100)) + '%;background:' + c + '"></i></span>'; };
  window.__fin = { exL: order, exV: order.map(function (g) { return Math.round(G[g].v); }), tot: tot };
  var body = order.map(function (g, i) {
    var col = FD_C.pie[i % FD_C.pie.length];
    return '<tr class="fd-g"><td><span class="fd-dot" style="background:' + col + '"></span><b>' + g + '</b></td><td class="n"><b>' + mny(G[g].v) + '</b></td><td class="n"><b>' + pc(G[g].v) + '</b></td></tr>' +
      G[g].L.map(function (x) { return '<tr><td style="padding-left:24px">' + esc(x.n) + bar(x.v, col) + '</td><td class="n">' + dl(spec(x), mny(x.v)) + '</td><td class="n muted">' + pc(x.v) + '</td></tr>'; }).join('');
  }).join('');
  return '<div class="fd"><div class="fd-g2"><div class="fd-c"><h3><span class="fd-n" style="background:' + FD_C.out + '">1</span>Бүлэг, ангиллаар</h3><table class="fd-t">' +
    '<tr><th>Зардал</th><th class="n">Дүн</th><th class="n">Хувь</th></tr>' + body + '<tr class="tot"><td><b>Нийт зардал</b></td><td class="n"><b>' + mny(tot) + '</b></td><td class="n">100%</td></tr></table></div>' +
    '<div class="fd-c"><h3><span class="fd-n" style="background:' + FD_C.profit + '">2</span>Зардлын бүтэц</h3><div class="fd-box"><canvas id="fdExp"></canvas></div></div></div>' +
    '<div class="fd-c"><h3><span class="fd-n" style="background:' + FD_C.red + '">3</span>Хамгийн их зардал (TOP 10)</h3><table class="fd-t">' +
    C.slice(0, 10).map(function (x, i) { return '<tr><td class="fd-r">' + (i + 1) + '</td><td>' + esc(x.n) + ' <small class="muted">· ' + fdGroupOf(x.code) + '</small>' + bar(x.v, FD_C.pie[i % FD_C.pie.length]) + '</td><td class="n">' + dl(spec(x), mny(x.v)) + '</td><td class="n muted">' + pc(x.v) + '</td></tr>'; }).join('') +
    '</table></div></div>';
}

// ── Мөнгөний данс: компани бүрийн касс, банкны данс жинхэнэ нэрээрээ (нэр нь «Банкны данс холбох»-д хадгалагдана) ──
function allBankLinks() {
  var links = window.bankLinks || [];
  return links.concat(Object.keys(BANK_ACCOUNTS).map(function (k) { return { no: k, biz: BANK_ACCOUNTS[k].biz, acc: BANK_ACCOUNTS[k].acc, name: BANK_ACCOUNTS[k].name, cfg: true }; })
    .filter(function (c) { return !links.some(function (l) { return String(l.no).slice(-4) === c.no; }); }));
}
function cashLinkName(code, biz) {   // accName() үүнийг ашиглана — тухайн компанийн дансыг нэрээр нь
  biz = biz || (typeof state !== 'undefined' && state.biz); if (!biz) return '';
  var L = allBankLinks().filter(function (l) { return l.biz === biz && l.acc === code; });
  return L.length === 1 ? L[0].name : '';
}
var CASH_SHORT = { '10003': 'Касс (бэлэн мөнгө)', '110106': 'Пос (картын төлбөр)' };
function cashAccView() {
  var r = range(), f = r[0], t = r[1], E = J(), biz = state.biz, td = todayStr();
  var pre = todayStr(new Date(new Date(f + 'T00:00:00') - 864e5)), b0 = balances(E, pre), b1 = balances(E, t < td ? t : td);
  var links = allBankLinks().filter(function (l) { return l.biz === biz; });
  var rows = cashCodes().map(function (k) {
    var fl = { i: 0, o: 0 }; drillLines({ acc: [k], from: f, to: t, sign: 1 }, E).lines.forEach(function (x) { if (x.v > 0) fl.i += x.v; else fl.o -= x.v; });
    var L = links.filter(function (l) { return l.acc === k; });
    return { k: k, L: L, o: b0[k] || 0, i: fl.i, out: fl.o, c: b1[k] || 0, used: L.length || Math.abs(b1[k] || 0) >= 1 || fl.i || fl.o || k === '10003' };
  }).filter(function (x) { return x.used; });
  var tot = { o: 0, i: 0, out: 0, c: 0 }; rows.forEach(function (x) { tot.o += x.o; tot.i += x.i; tot.out += x.out; tot.c += x.c; });
  var sp = function (k, title, x) { return Object.assign({ acc: [k], from: f, to: t, sign: 1, grp: 'type', t: title }, x || {}); };
  var body = rows.map(function (x, n) {
    var nm = x.L.length === 1 ? x.L[0].name : CASH_SHORT[x.k] || accName(x.k), col = FD_C.pie[n % FD_C.pie.length];
    var sub = x.L.length ? x.L.map(function (l) { return maskNo(l.no); }).join(', ') + ' · ' : '';
    var act = x.L.length ? x.L.map(function (l) { return '<button class="mini" onclick="openBankLink(\'' + jsq(l.no) + '\')">Нэр засах</button>'; }).join('') :
      x.k === '10003' || x.k === '110106' ? '' : '<button class="mini" onclick="openBankLink(\'\',\'' + x.k + '\')">Банкны данс холбох</button>';
    return '<tr><td><span class="fd-dot" style="background:' + col + '"></span><b>' + esc(nm) + '</b><br><small class="muted" style="padding-left:18px">' + esc(sub) + 'код ' + x.k + '</small></td>' +
      '<td class="n">' + mny(x.o) + '</td><td class="n" style="color:' + FD_C.in + '">' + (x.i ? dl(sp(x.k, nm + ' — орсон', { dir: 1 }), '+' + mny(x.i)) : '') + '</td>' +
      '<td class="n" style="color:' + FD_C.red + '">' + (x.out ? dl(sp(x.k, nm + ' — гарсан', { sign: -1, dir: 1 }), '−' + mny(x.out)) : '') + '</td>' +
      '<td class="n' + (x.c < -0.5 ? ' neg' : '') + '"><b>' + dl(sp(x.k, nm + ' — хуулга', { bal: true, grp: '' }), mny(x.c)) + '</b></td><td class="n" style="white-space:nowrap">' + act + '</td></tr>';
  }).join('');
  var neg = rows.filter(function (x) { return x.c < -0.5; });
  return '<div class="fd"><div class="fd-kg">' + rows.map(function (x, n) {
      var nm = x.L.length === 1 ? x.L[0].name : CASH_SHORT[x.k] || accName(x.k);
      return fdCard(x.k === '10003' ? 'cash' : x.k === '110106' ? 'pct' : 'in', FD_C.pie[n % FD_C.pie.length], esc(nm), mny(x.c));
    }).join('') + fdCard('profit', '#0F172A', 'Нийт мөнгө', mny(tot.c)) + '</div>' +
    '<div class="fd-c"><h3><span class="fd-n" style="background:' + FD_C.cash + '">1</span>Данс тус бүрээр (' + f + ' — ' + t + ')</h3><div class="scroll"><table class="fd-t">' +
    '<tr><th>Данс</th><th class="n">Эхний үлдэгдэл</th><th class="n">Орсон</th><th class="n">Гарсан</th><th class="n">Эцсийн үлдэгдэл</th><th></th></tr>' + body +
    '<tr class="tot"><td><b>Нийт</b></td><td class="n"><b>' + mny(tot.o) + '</b></td><td class="n"><b>+' + mny(tot.i) + '</b></td><td class="n"><b>−' + mny(tot.out) + '</b></td><td class="n"><b>' + mny(tot.c) + '</b></td><td></td></tr></table></div>' +
    (neg.length ? '<p class="muted" style="font-size:13px;margin:10px 0 0">Хасах үлдэгдэлтэй данс байна — эхний үлдэгдэл оруулаагүй эсвэл зарим гүйлгээ дутуу бичигдсэн байж магадгүй.</p>' : '') + '</div></div>';
}

// ── Дансны хуулга: данс хайж сонгох (код, нэрээр) — данс бүрийн үлдэгдэлтэй, дарахад тэр дансны хуулга ──
function ledgerPicker() {
  var b = balances(J(), todayStr()), used = {};
  J().forEach(function (e) { used[e.dr] = 1; used[e.cr] = 1; });
  var zeros = 0;   // гүйлгээгүй, эсвэл үлдэгдэл 0 дансыг нууна (сонгосон нь үлдэнэ)
  var cash = cashCodes().reduce(function (a, k) { return a + (b[k] || 0); }, 0);
  var item = function (code, name, v, on) {
    return '<button class="lp-i' + (on ? ' on' : '') + '" data-q="' + esc((code + ' ' + name).toLowerCase()) + '" onclick="state.acc=\'' + code + '\';render()"><span><b>' + esc(code === 'cashall' ? '' : code) + '</b> ' + esc(name) +
      '</span><em class="' + (v < -0.5 ? 'neg' : '') + '">' + (v === null ? '' : mny(v)) + '</em></button>';
  };
  var list = item('cashall', 'Бүх мөнгөний данс (касс + банк) — нэгдсэн', cash, state.acc === 'cashall') + ACCOUNTS.filter(function (a) { return a[0] !== '0000'; }).map(function (a) {
    var v = (b[a[0]] || 0) * (debitNormal(a[0]) ? 1 : -1);
    return { a: a, v: v, u: used[a[0]] };
  }).filter(function (x) { var keep = x.u && (Math.abs(x.v) >= 0.5 || state.accZero) || state.acc === x.a[0]; if (!keep) zeros++; return keep; })
    .sort(function (x, y) { return (x.a[0] < y.a[0] ? -1 : 1); }).map(function (x) {
    return item(x.a[0], accName(x.a[0]), x.u ? x.v : null, state.acc === x.a[0]) ;
  }).join('');
  var cur = state.acc === 'cashall' ? 'Бүх мөнгөний данс (нэгдсэн)' : state.acc + ' ' + accName(state.acc);
  return '<div class="card lp"><div class="lp-h"><span class="muted">Данс:</span> <b>' + esc(cur) + '</b>' +
    '<input id="lpQ" type="search" placeholder="Данс хайх — код эсвэл нэр (жишээ: 1201, авлага, хаан)" oninput="lpFilter(this.value)"></div>' +
    '<div class="lp-l" id="lpL">' + list + '</div><p class="muted" style="font-size:12px;margin:6px 0 0">Зөвхөн гүйлгээтэй, үлдэгдэлтэй данс. Данс дээр дарвал доор тэр дансны хуулга гарна. ' + (zeros ? zeros + ' данс (гүйлгээгүй / 0 үлдэгдэл) нуугдсан. ' : '') + '<label style="margin-left:6px"><input type="checkbox"' + (state.accZero ? ' checked' : '') + ' onchange="state.accZero=this.checked;render()"> 0 үлдэгдэлтэй, гүйлгээтэйг харуулах</label></p></div>';
}
function lpFilter(q) {
  q = String(q || '').toLowerCase().trim();
  [].forEach.call(document.querySelectorAll('#lpL .lp-i'), function (el) { el.style.display = !q || el.dataset.q.indexOf(q) >= 0 ? '' : 'none'; });
}
