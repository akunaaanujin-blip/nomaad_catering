// ── ХЯНАХ САМБАР (Борлуулалт → Тойм): KPI карт + график (Chart.js) ──
var DASH_C = ['#3B6FB6', '#14A38B', '#F2A93B', '#8B6CC9', '#E25D6A', '#5BB0E6', '#9AA5B1'];
var _charts = [];
function shortNum(v) { v = Number(v) || 0; var a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + ' сая' : a >= 1e3 ? Math.round(v / 1e3) + ' мян' : String(v); }
function dashCard(icon, color, label, val, sub) {
  return '<div class="dk"><span class="dk-i" style="background:' + color + '1F;color:' + color + '">' + ico(icon) + '</span><div><small>' + label + '</small><b>' + val + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div></div>';
}
function dashView(biz, list, s, bills) {
  var r = range(), from = r[0], to = r[1], days = [], dS = {}, dE = {};
  var d0 = new Date(from + 'T00:00:00'), d1 = new Date(to + 'T00:00:00');
  if ((d1 - d0) / 864e5 > 92) d0 = new Date(d1 - 91 * 864e5);
  for (var d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) days.push(todayStr(d));
  list.forEach(function (x) { var a = Number(x.amount) || 0; if (x.type === 'sale') dS[x.date] = (dS[x.date] || 0) + a; else if (x.type === 'expense') dE[x.date] = (dE[x.date] || 0) + a; });
  var prod = {};
  list.forEach(function (x) { if (x.type === 'sale') { var k = String(x.item).replace(/ \(буцаалт\)$/, ''); prod[k] = (prod[k] || 0) + (Number(x.amount) || 0); } });
  var top = Object.keys(prod).filter(function (k) { return prod[k] > 0; }).sort(function (a, b) { return prod[b] - prod[a]; }).slice(0, 7);
  var nb = Object.keys(bills).length, B = BUSINESSES[biz] || {};
  var D = { days: days.map(function (x) { return x.slice(5); }), sales: days.map(function (x) { return dS[x] || 0; }), exp: days.map(function (x) { return dE[x] || 0; }),
    payL: ['Бэлэн', 'Карт', 'Шилжүүлэг', 'Зээл, урьдчилгаа'], payV: [s.cash, s.card, s.transfer, s.credit], topL: top, topV: top.map(function (k) { return prod[k]; }) };
  var cards = dashCard('sales', DASH_C[0], 'Борлуулалт', fmt(s.sales), nb + ' баримт') + dashCard('reports', DASH_C[1], 'Дундаж баримт', fmt(nb ? Math.round(s.sales / nb) : 0)) +
    dashCard('finance', DASH_C[4], 'Зарлага', fmt(s.exp)) + dashCard('mgmt', DASH_C[3], 'Цэвэр орлого', fmt(s.sales - s.exp));
  var ordCard = '';
  if (B.orders) {
    var os = (window.adminOrders || []).filter(function (o) { return o.biz === biz && o.date >= from && o.date <= to; }), st = {};
    os.forEach(function (o) { st[o.status || 'Шинэ'] = (st[o.status || 'Шинэ'] || 0) + 1; });
    D.ordL = ['Шинэ', 'Буухиад өгсөн', 'Хүргэгдсэн', 'Буцаасан', 'Цуцалсан']; D.ordV = D.ordL.map(function (k) { return st[k] || 0; });
    var wait = (window.adminOrders || []).filter(function (o) { return o.biz === biz && !o.confirmed && !ordDead(o); });
    cards += dashCard('products', DASH_C[2], 'Захиалга', os.length, (st['Хүргэгдсэн'] || 0) + ' хүргэгдсэн') +
      dashCard('cal', DASH_C[5], 'Баталгаажаагүй төлбөр', fmt(wait.reduce(function (a, o) { return a + (Number(o.amount) || 0); }, 0)), wait.length + ' захиалга');
    ordCard = '<div class="ch-card"><h3>Захиалгын төлөв</h3><div class="ch-box sm"><canvas id="chOrd"></canvas></div></div>';
  }
  window.__dash = D;
  return '<div class="dk-grid">' + cards + '</div>' +
    '<div class="ch-grid"><div class="ch-card"><h3>Борлуулалт, зарлага (өдрөөр)</h3><div class="ch-box"><canvas id="chSales"></canvas></div></div>' +
    '<div class="ch-card"><h3>Төлбөрийн хэлбэр</h3><div class="ch-box"><canvas id="chPay"></canvas></div></div></div>' +
    '<div class="ch-grid"><div class="ch-card"><h3>Шилдэг бараа</h3><div class="ch-box sm"><canvas id="chTop"></canvas></div></div>' +
    (ordCard || '<div class="ch-card"><h3>Төлбөрийн хэлбэр (дүн)</h3><div class="ch-box sm"><canvas id="chPayBar"></canvas></div></div>') + '</div>';
}
function drawDash() {
  _charts.forEach(function (c) { try { c.destroy(); } catch (e) {} }); _charts = [];
  var D = window.__dash; if (!D || typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "Inter,-apple-system,'Segoe UI',Roboto,sans-serif"; Chart.defaults.color = '#6B7280'; Chart.defaults.font.size = 11.5;
  var mk = function (id, cfg) { var el = $(id); if (el) _charts.push(new Chart(el, cfg)); };
  var money = { callbacks: { label: function (c) { return (c.dataset.label ? c.dataset.label + ': ' : c.label + ': ') + fmt(c.raw); } } };
  var donut = function (id, L, V) {
    mk(id, { type: 'doughnut', data: { labels: L, datasets: [{ data: V, backgroundColor: DASH_C, borderWidth: 2, borderColor: '#fff' }] },
      options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, padding: 12 } }, tooltip: money } } });
  };
  mk('chSales', { type: 'line', data: { labels: D.days, datasets: [
      { label: 'Борлуулалт', data: D.sales, borderColor: DASH_C[0], backgroundColor: 'rgba(59,111,182,.14)', fill: true, tension: .35, pointRadius: 0, borderWidth: 2.2 },
      { label: 'Зарлага', data: D.exp, borderColor: DASH_C[4], backgroundColor: 'transparent', tension: .35, pointRadius: 0, borderWidth: 1.6, borderDash: [5, 4] }] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }, tooltip: money },
      scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true, grid: { color: '#EEF1F6' }, ticks: { callback: shortNum } } } } });
  donut('chPay', D.payL, D.payV);
  mk('chTop', { type: 'bar', data: { labels: D.topL, datasets: [{ data: D.topV, backgroundColor: DASH_C[0], borderRadius: 6, barThickness: 14 }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: money },
      scales: { x: { beginAtZero: true, grid: { color: '#EEF1F6' }, ticks: { callback: shortNum } }, y: { grid: { display: false } } } } });
  if (D.ordL) donut('chOrd', D.ordL, D.ordV);
  else mk('chPayBar', { type: 'bar', data: { labels: D.payL, datasets: [{ data: D.payV, backgroundColor: DASH_C.slice(0, 4), borderRadius: 6, barThickness: 22 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: money }, scales: { y: { beginAtZero: true, grid: { color: '#EEF1F6' }, ticks: { callback: shortNum } }, x: { grid: { display: false } } } } });
}
