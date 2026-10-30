// ═══════════ САНХҮҮГИЙН ПРОГРАМЫН ЦЭС (нэг түвшин) + НҮҮР ХУУДАС ═══════════
// Зүүн талд нэг цэс: бүлгийн гарчиг + хуудсууд. Хуудас бүр зөвхөн НЭГ замаар нээгдэнэ.
// Хуудас доторх «← Нягтлангийн тайлан», бүх тайлангийн dropdown, «Бүх тайлан», «Бусад» хуудсыг хассан.
// Зүйл: [түлхүүр, нэр] — 'mod/sub' (компанийн хуудас), 'home', 'review', 'v:staff', 'v:cal', 'v:docs', 'v:tax:<sub>'.
// admin.js-ийн дараа ачаална (subnavHtml, crumbHtml, pageHead, periodBar, hubBar, companyView, render-ийг давхарлана).

ICONS.gear = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>';
ICONS.bell = '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 003.4 0"/>';
ICONS.money = '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>';

var MNAV = [
  ['Нүүр', 'home', [['home', 'Өнөөдөр'], ['finance/monthly', 'Хийх ажил (сар бүр)'], ['v:cal', 'Календарь']]],
  ['Борлуулалт', 'sales', [['sales/orders', 'Захиалга'], ['sales/shop', 'Баримт'], ['sales/buuhia', 'Хүргэлт'], ['sales/disc', 'Буцаалт, хөнгөлөлт']]],
  ['Бараа', 'products', [['products/catalog', 'Бараа, үнэ'], ['products/stock', 'Үлдэгдэл'], ['products/po', 'Худалдан авалт'], ['products/suppliers', 'Нийлүүлэгчид'],
    ['products/counts', 'Тооллого'], ['products/move', 'Хөдөлгөөн, шилжүүлэг'], ['products/in', 'Орлогын жагсаалт'], ['products/prices', 'Үнийн түүх']]],
  ['Мөнгө', 'money', [['finance/cashacc', 'Данснууд'], ['finance/bank', 'Банкны хуулга, тулгалт'], ['finance/vouchers', 'Кассын гүйлгээ'], ['finance/expenses', 'Зардал, касс хаалт'],
    ['finance/requests', 'Мөнгөний хүсэлт'], ['finance/money', 'Бүх гүйлгээ'], ['finance/ledger', 'Дансны дэлгэрэнгүй']]],
  ['Тооцоо', 'people', [['finance/recv', 'Авлага'], ['finance/payb', 'Өглөг'], ['finance/loans', 'Зээл'], ['finance/payroll', 'Цалин, НДШ'], ['finance/debts', 'Бусад авлага, өглөг'],
    ['finance/partners', 'Харилцагчид'], ['finance/pstmt', 'Харилцагчийн хуулга'], ['finance/assets', 'Үндсэн хөрөнгө']]],
  ['Тайлан', 'reports', [['—', 'Удирдлагын'], ['finance/daily', 'Өдрийн орлого'], ['finance/expcat', 'Зардлын задаргаа'], ['finance/cashflow', 'Мөнгөн урсгал'], ['finance/profit', 'Барааны ашиг'],
    ['finance/months', '12 сарын дүн'], ['review', 'Удирдлагын тойм'],
    ['—', 'Борлуулалтын'], ['sales/item', 'Бараагаар'], ['sales/cat', 'Ангиллаар'], ['sales/pay', 'Төлбөрийн хэлбэрээр'], ['sales/slow', 'Удаан эргэлттэй бараа'], ['sales/boost', 'Сурталчилгааны үр дүн'], ['sales/receipts', 'Бүх баримт'],
    ['—', 'Нягтлангийн'], ['finance/dash', 'Бүртгэлийн шалгалт'], ['finance/journal', 'Журнал'], ['finance/gl', 'Ерөнхий дэвтэр'], ['finance/trial', 'Гүйлгээ баланс'],
    ['finance/balance', 'Санхүүгийн байдал'], ['finance/pl', 'Орлогын тайлан'], ['finance/equity', 'Өмчийн өөрчлөлт'], ['finance/aging_r', 'Авлага, өглөгийн насжилт'], ['finance/cash', 'Касс, харилцах (өдрөөр)']]],
  ['Татвар', 'tax', [['v:tax:calendar', 'Тайлангийн хуанли'], ['v:tax:nd8', 'НДШ тайлан'], ['v:tax:tt11', 'ХХОАТ (ТТ-11)'], ['v:tax:tt02', 'ААНОАТ (ТТ-02)'],
    ['v:tax:ebalance', 'Жилийн тайлан (e-Balance)'], ['v:tax:entpl', 'Нэгтгэсэн орлогын тайлан'], ['sales/ebarimt', 'И-баримт']]],
  ['Тохиргоо', 'gear', [['v:staff', 'Ажилчид, эрх'], ['finance/accounts', 'Дансны төлөвлөгөө'], ['finance/opening', 'Эхний үлдэгдэл'], ['finance/lock', 'Гүйлгээ түгжих'],
    ['finance/close', 'Он хаах, нөөц'], ['finance/api', 'Холболт (буухиа, StorePay)'], ['finance/banklink', 'Банкны данс холбох'], ['finance/digest', 'Өдрийн тойм и-мэйл'],
    ['v:docs', 'Маягт, загвар'], ['finance/glossary', 'Нэр томьёо']]],
];
// Нэг өгөгдлийн өөр харагдац — хуудас доторх таб (4-өөс ихгүй)
var PAGE_TABS = { journal: [['journal', 'Бүх бичилт'], ['entry', 'Гараар бичсэн']], aging_r: [['aging_r', 'Авлага'], ['aging_p', 'Өглөг']] };
PAGE_TABS.entry = PAGE_TABS.journal; PAGE_TABS.aging_p = PAGE_TABS.aging_r;
var NAV_ALIAS = { entry: 'journal', aging_p: 'aging_r' };   // таб бүхий хуудсын цэсний зүйл

// Үг хэллэг (хуудасны гарчиг = цэсний нэр)
(function () {
  var L = {};
  MNAV.forEach(function (g) { g[2].forEach(function (it) { var m = it[0].match(/^(\w+)\/(\w+)$/); if (m) L[m[2]] = it[1]; }); });
  Object.keys(SUBS).forEach(function (mod) { SUBS[mod].forEach(function (s) { if (L[s[0]]) s[1] = L[s[0]]; }); });
  if (ACC['110106']) ACC['110106'].name = 'Карт (POS)';
  ACCOUNTS.forEach(function (a) { if (a[0] === '110106') a[1] = 'Карт (POS)'; });
})();

function navItemOn(k) {
  if (k === 'home') return state.view === 'company' && state.module === 'home';
  if (k === 'review') return state.view === 'company' && state.module === 'review';
  if (k === 'v:staff') return state.view === 'staff';
  if (k === 'v:cal') return state.view === 'cal';
  if (k === 'v:docs') return state.view === 'docs';
  if (k.indexOf('v:tax:') === 0) return state.view === 'tax' && taxState.sub === k.slice(6);
  var m = k.split('/'); if (state.view !== 'company' || state.module !== m[0]) return false;
  var cur = state.sub[m[0]]; return cur === m[1] || NAV_ALIAS[cur] === m[1];
}
function navOk(biz, k) {
  var B = BUSINESSES[biz] || {};
  if (B.finOnly && !/^(finance\/|v:|home$)/.test(k)) return false;   // Удирдлага: зөвхөн санхүү
  if (B.finOnly && /^v:tax:/.test(k)) return false;
  var m = k.match(/^(\w+)\/(\w+)$/); if (m) return subVisible(biz, m[2]);
  if (k === 'v:staff' || k === 'v:docs') return isOwner();
  if (/^v:tax:/.test(k)) return isOwner();
  return true;
}
function navGo(k) {
  if (k === 'home' || k === 'review') { state.view = 'company'; state.module = k; }
  else if (k === 'v:staff') { state.staffBiz = state.biz || state.staffBiz; state.view = 'staff'; }
  else if (k === 'v:cal') { openCal(); return; }
  else if (k === 'v:docs') state.view = 'docs';
  else if (k.indexOf('v:tax:') === 0) { openTax(entOf(state.biz), k.slice(6)); return; }
  else { var m = k.split('/'); state.view = 'company'; state.module = m[0]; state.sub[m[0]] = m[1]; }
  render(); window.scrollTo(0, 0);
}
function navCountOf(k) { var m = k.match(/^\w+\/(\w+)$/); return m ? navCount(m[1]) : 0; }

// Зүүн цэс
subnavHtml = function () {
  var brand = '<div class="fn-brand" onclick="go(\'companies\')" title="Миний компаниуд"><span class="fn-logo">N</span><b>NOMAAD</b></div>';
  if (!state.biz || !BUSINESSES[state.biz] || state.view === 'companies') {
    return brand + '<div class="fn-g"><div class="fn-h"><span>Компаниуд</span></div><ul>' + ALL_KEYS.filter(function (k) { return BUSINESSES[k]; }).map(function (k) {
      return '<li><button onclick="state.module=\'home\';go(\'company\',\'' + k + '\')"><span class="fn-i">' + ico('home') + '</span><span>' + esc(BUSINESSES[k].name) + '</span></button></li>'; }).join('') + '</ul></div>';
  }
  var shut = load('nb_fn_shut', {}), biz = state.biz;
  return brand + MNAV.map(function (g, gi) {
    var items = g[2].filter(function (it) { return it[0] === '—' || navOk(biz, it[0]); });
    var real = items.filter(function (it) { return it[0] !== '—'; });
    if (!real.length) return '';
    var on = real.some(function (it) { return navItemOn(it[0]); });
    var badge = real.reduce(function (a, it) { return a + navCountOf(it[0]); }, 0);
    if (real.length === 1 && g[0] === real[0][1]) {   // нэг хуудастай бүлэг (Нүүр) — шууд холбоос
      return '<div class="fn-g"><button class="fn-top' + (on ? ' on' : '') + '" onclick="navGo(\'' + real[0][0] + '\')"><span class="fn-i">' + ico(g[1]) + '</span><span>' + g[0] + '</span></button></div>';
    }
    var closed = shut[gi] && !on;
    return '<div class="fn-g' + (closed ? ' closed' : '') + '"><button class="fn-h" onclick="fnToggle(' + gi + ')"><span class="fn-i">' + ico(g[1]) + '</span><span>' + g[0] + '</span>' +
      (closed && badge ? '<i class="fn-badge">' + badge + '</i>' : '') + '<svg class="fn-car" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button><ul>' +
      items.map(function (it) {
        if (it[0] === '—') return '<li class="fn-sub">' + it[1] + '</li>';
        var n = navCountOf(it[0]);
        return '<li><button class="' + (navItemOn(it[0]) ? 'on' : '') + '" onclick="navGo(\'' + it[0] + '\')"><span>' + it[1] + '</span>' + (n ? '<i class="fn-badge">' + n + '</i>' : '') + '</button></li>';
      }).join('') + '</ul></div>';
  }).join('');
};
function fnToggle(i) { var s = load('nb_fn_shut', {}); if (s[i]) delete s[i]; else s[i] = 1; save('nb_fn_shut', s); render(); }
railHtml = function () { return ''; };
hubBar = function () { return ''; };

// Дээд мөр: компани солих (breadcrumb-гүй)
crumbHtml = function () {
  if (!state.biz || !BUSINESSES[state.biz] || state.view === 'companies') return '<b>Миний компаниуд</b>';
  return '<select class="fn-co" onchange="if(this.value===\'*\')go(\'companies\');else{state.module=\'home\';go(\'company\',this.value)}">' + ALL_KEYS.filter(function (k) { return BUSINESSES[k]; }).map(function (k) {
    return '<option value="' + k + '"' + (k === state.biz ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '<option value="*">Бүх компани…</option></select>';
};

// Хуудасны дээд хэсэг: гарчиг + 1 өгүүлбэр тайлбар + үйлдэл; таб (нэг өгөгдлийн харагдац)
pageHead = function (title, actions, withPeriod) {
  var sub = state.view === 'company' ? state.sub[state.module] : '', d = state.view === 'company' && state.module !== 'home' && typeof REP_HELP !== 'undefined' ? REP_HELP[sub] || '' : '';
  var T = state.view === 'company' && state.module === 'finance' ? PAGE_TABS[sub] : null;
  return '<div class="pg-head"><div><h1>' + title + '</h1>' + (d ? '<p class="pg-desc">' + d + '</p>' : '') + '</div><div class="pg-act">' + (actions || '') + '</div></div>' +
    (T ? '<div class="tabs fn-tabs">' + T.map(function (t) { return '<button class="' + (t[0] === sub ? 'on' : '') + '" onclick="state.sub.finance=\'' + t[0] + '\';render()">' + t[1] + '</button>'; }).join('') + '</div>' : '') +
    (withPeriod ? periodBar() : '');
};
// Хугацааны сонголт дээд мөрөнд (бүх хуудсанд нэг байрлалд, хуудас солиход хадгалагдана)
var _periodBar = periodBar;
periodBar = function () { window.__usesPeriod = true; return ''; };
function hdPeriod() {
  var r = range();
  return '<select title="Хугацаа" onchange="setPeriod(this.value)">' + PERIODS.map(function (p) { return '<option value="' + p[0] + '"' + (state.period === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select>' +
    '<input type="date" id="pFrom" value="' + (state.period === 'all' ? '' : r[0]) + '" onchange="setDates()" title="Эхлэх"><span class="muted">—</span><input type="date" id="pTo" value="' + r[1] + '" onchange="setDates()" title="Дуусах">';
}

var _companyView = companyView;
companyView = function () {
  if (!state.module || state.module === 'reports' || state.module === 'mgmt') state.module = 'home';
  if (state.module === 'home') return homeView();
  if (state.module === 'finance' && /^(acct|other|setup|simple)$/.test(state.sub.finance)) state.sub.finance = 'daily';   // хассан нэгтгэл хуудас
  return _companyView();
};
var _go = go;
go = function (view, biz) { if (view === 'company' && biz && biz !== state.biz) state.module = 'home'; _go(view, biz); };
var _render = render;
render = function () {
  window.__usesPeriod = false;
  _render();
  if (state.view === 'tax') $('subnav').innerHTML = subnavHtml();   // татварын хуудас ч нэг цэстэй
  $('main').classList.add('has-sub');
  var p = $('hdPer'); if (p) { p.innerHTML = window.__usesPeriod ? hdPeriod() : ''; p.style.display = window.__usesPeriod ? '' : 'none'; }
  bellRender();
};

// ═══════════ АНХААРАХ ЗҮЙЛС (нүүр + хонх) ═══════════
// [текст, тоо, үйлдэл, чухал эсэх] — зөвхөн шийдэх зүйл байвал
function alertsOf(biz) {
  var B = BUSINESSES[biz] || {}, t = todayStr(), out = [], add = function (txt, n, fn, bad) { if (n) out.push({ txt: txt, n: n, fn: fn, bad: !!bad }); };
  add('Банкны ' + navCount('bank') + ' гүйлгээ тулгагдаагүй', navCount('bank'), "navGo('finance/bank')", true);
  var bl = (typeof bankLines !== 'undefined' ? bankLines : []).filter(function (l) { return l.biz === biz; }).map(function (l) { return l.date; }).sort().pop() || '';
  if (bl && bl < todayStr(new Date(Date.now() - 7 * 864e5))) add('Банкны хуулга 7 хоног оруулаагүй (сүүлд ' + bl + ')', 1, "navGo('finance/bank')");
  add(pendRequests(biz).length + ' мөнгөний хүсэлт хүлээгдэж байна', pendRequests(biz).length, "navGo('finance/requests')", true);
  add(pendCounts(biz).length + ' тооллого батлах', pendCounts(biz).length, "navGo('products/counts')");
  if (B.orders) add(navCount('orders') + ' шинэ захиалга илгээгдээгүй', navCount('orders'), "navGo('sales/orders')");
  if (!B.finOnly) {
    var sold = records.some(function (x) { return x.biz === biz && x.type === 'sale' && x.date === t && x.pay === 'Бэлэн'; }),
        closed = records.some(function (x) { return x.biz === biz && x.type === 'close' && x.date === t; });
    if (sold && !closed && new Date().getHours() >= 21) add('Өнөөдрийн касс хаагдаагүй', 1, "navGo('finance/expenses')");
    var st = stockData[biz] || {}, low = Object.keys(st).filter(function (k) { var mn = minOf(biz, k); return mn > 0 && ((st[k].shop || 0) + (st[k].wh || 0)) <= mn; });
    add(low.length + ' бараа дуусах дөхсөн', low.length, "navGo('products/stock')");
    var nc = Object.keys(costEngine(biz, R()).noCost).length;
    add(nc + ' бараа өртөггүй зарагдсан', nc, "navGo('finance/dash')", true);
  }
  // 30 хоногоос удсан авлага
  try {
    var E = J(), lim = todayStr(new Date(Date.now() - 30 * 864e5)), by = {};
    E.forEach(function (e) { if (e.dr === '1201') { var p = by[e.partner] = by[e.partner] || { v: 0, d: e.date }; p.v += e.amount; if (e.date < p.d) p.d = e.date; } else if (e.cr === '1201') { (by[e.partner] = by[e.partner] || { v: 0, d: e.date }).v -= e.amount; } });
    var old = Object.keys(by).filter(function (k) { return by[k].v > 0.5 && by[k].d < lim; }).length;
    add(old + ' харилцагчийн авлага 30 хоногоос удсан', old, "navGo('finance/aging_r')");
  } catch (e) {}
  // Сар хаагдаагүй (дараа сарын 5-аас хойш өмнөх сар түгжигдээгүй)
  var pm = todayStr(new Date(new Date().getFullYear(), new Date().getMonth(), 0));
  if (isOwner() && Number(t.slice(8)) >= 5 && (meta.lock || meta.closed || '') < pm) add('Өмнөх сар (' + pm.slice(0, 7) + ') түгжигдээгүй', 1, "navGo('finance/lock')");
  // Сануулга (хугацаа хэтэрсэн / өнөөдөр), татварын хугацаа (7 хоног)
  reminders.filter(function (r) { return r.status === 'Хүлээгдэж' && r.date <= t; }).forEach(function (r) { add(r.title + (r.amount ? ' · ' + fmt(r.amount) : '') + ' — ' + r.date, 1, "openCal()", r.date < t); });
  if (isOwner() && typeof taxDeadlines === 'function' && !B.finOnly) try {
    var wk = todayStr(new Date(Date.now() + 7 * 864e5));
    taxDeadlines(entOf(biz)).filter(function (d) { return d.date >= t && d.date <= wk; }).forEach(function (d) { add('Татвар: ' + d.name + ' — ' + d.date, 1, "navGo('v:tax:" + (d.go || 'calendar') + "')"); });
  } catch (e) {}
  return out;
}
function bellRender() {
  var b = $('hdBell'); if (!b) return;
  var L = state.biz && BUSINESSES[state.biz] && state.view !== 'companies' ? alertsOf(state.biz) : [];
  b.innerHTML = '<button class="fn-bell" onclick="bellToggle()" title="Мэдэгдэл">' + ico('bell') + (L.length ? '<i class="fn-badge">' + L.length + '</i>' : '') + '</button>' +
    '<div class="fn-pop" id="bellPop"' + (window.__bellOpen ? '' : ' style="display:none"') + '>' + (L.length ? L.map(function (a) {
      return '<button class="fn-al' + (a.bad ? ' bad' : '') + '" onclick="window.__bellOpen=false;' + a.fn + '"><span>' + esc(a.txt) + '</span><b>Шийдэх →</b></button>'; }).join('') : '<p class="muted" style="padding:10px 12px;margin:0">Шийдэх зүйл алга</p>') + '</div>';
}
function bellToggle() { window.__bellOpen = !window.__bellOpen; var p = $('bellPop'); if (p) p.style.display = window.__bellOpen ? '' : 'none'; }
document.addEventListener('click', function (e) { if (window.__bellOpen && !e.target.closest('#hdBell')) { window.__bellOpen = false; var p = $('bellPop'); if (p) p.style.display = 'none'; } });

// ═══════════ НҮҮР: өнөөдөр хийх ажил → KPI → өдрийн график → сүүлийн 10 гүйлгээ ═══════════
function homeView() {
  var biz = state.biz, B = BUSINESSES[biz], t = todayStr(), m0 = t.slice(0, 8) + '01', L = alertsOf(biz), E = J();
  var revA = accsOf('rev'), expA = accsOf('exp').concat(accsOf('cogs'), accsOf('contra'));
  var inR = function (e) { return e.date >= m0 && e.date <= t; }, inc = 0, exp = 0, days = {};
  E.forEach(function (e) {
    if (!inR(e)) return;
    var d = days[e.date] = days[e.date] || { i: 0, x: 0 };
    if (revA.indexOf(e.cr) >= 0) { inc += e.amount; d.i += e.amount; } if (revA.indexOf(e.dr) >= 0) { inc -= e.amount; d.i -= e.amount; }
    if (expA.indexOf(e.dr) >= 0) { exp += e.amount; d.x += e.amount; } if (expA.indexOf(e.cr) >= 0) { exp -= e.amount; d.x -= e.amount; }
  });
  var bal = balances(E, t), cash = cashCodes().reduce(function (a, k) { return a + (bal[k] || 0); }, 0), net = inc - exp;
  var col = function (v) { return v < -0.5 ? ' neg' : v > 0.5 ? ' pos' : ''; };
  var kpis = '<div class="fn-kpis">' + [['Орлого', inc, Math.abs(inc) >= 0.5 ? 'pos' : ''], ['Зардал', exp, Math.abs(exp) >= 0.5 ? 'neg' : ''], ['Цэвэр ашиг', net, col(net).trim()], ['Мөнгөн үлдэгдэл', cash, cash < -0.5 ? 'neg' : '']].map(function (k) {
    return '<div class="fn-kpi"><small>' + k[0] + '</small><b class="' + k[2] + '">' + mny(k[1]) + '</b></div>'; }).join('') + '</div>';
  // Өнөөдөр хийх ажил (шийдэх зүйл + өдөр бүрийн ажил ✓)
  var daily = [];
  if (!B.finOnly) {
    var sold = records.some(function (x) { return x.biz === biz && x.type === 'sale' && x.date === t; }), closed = records.some(function (x) { return x.biz === biz && x.type === 'close' && x.date === t; });
    if (sold) daily.push({ txt: 'Касс хаах', ok: closed, fn: "navGo('finance/expenses')" });
  }
  daily.push({ txt: 'Банкны хуулга тулгах', ok: !navCount('bank'), fn: "navGo('finance/bank')" });
  daily.push({ txt: 'Мөнгөний хүсэлт шийдэх', ok: !pendRequests(biz).length, fn: "navGo('finance/requests')" });
  var todo = '<div class="card"><h2>Өнөөдөр хийх ажил</h2>' + (L.length ? L.map(function (a) {
      return '<div class="fn-todo' + (a.bad ? ' bad' : ' warn') + '"><span class="fn-ck">!</span><span>' + esc(a.txt) + '</span><button class="link" onclick="' + a.fn + '">Шийдэх →</button></div>'; }).join('') : '') +
    daily.filter(function (d) { return d.ok; }).map(function (d) { return '<div class="fn-todo ok"><span class="fn-ck">✓</span><span>' + d.txt + '</span></div>'; }).join('') +
    (!L.length ? '<p class="muted" style="margin:6px 0 0">Шийдэх зүйл алга — бүх ажил хийгдсэн.</p>' : '') + '</div>';
  // Өдрийн орлого, зардлын график (энэ сар)
  var keys = [], mx = 1; for (var d = new Date(m0 + 'T00:00:00'); todayStr(d) <= t; d.setDate(d.getDate() + 1)) keys.push(todayStr(d));
  keys.forEach(function (k) { var v = days[k] || {}; mx = Math.max(mx, v.i || 0, v.x || 0); });
  var W = 640, H = 150, bw = W / Math.max(keys.length, 1), svg = '<svg viewBox="0 0 ' + W + ' ' + (H + 18) + '" class="fn-chart" preserveAspectRatio="none">' + keys.map(function (k, i) {
    var v = days[k] || {}, hi = Math.max(0, v.i || 0) / mx * H, hx = Math.max(0, v.x || 0) / mx * H, x = i * bw, w = Math.max(1, bw / 2 - 2);
    return '<g><title>' + k + ' · орлого ' + fmt(v.i || 0) + ' · зардал ' + fmt(v.x || 0) + '</title><rect x="' + (x + 1) + '" y="' + (H - hi) + '" width="' + w + '" height="' + hi + '" fill="var(--income)"/>' +
      '<rect x="' + (x + 1 + w) + '" y="' + (H - hx) + '" width="' + w + '" height="' + hx + '" fill="var(--expense)"/>' +
      (i % 5 === 0 || i === keys.length - 1 ? '<text x="' + (x + bw / 2) + '" y="' + (H + 14) + '" text-anchor="middle">' + k.slice(8) + '</text>' : '') + '</g>';
  }).join('') + '</svg>';
  var chart = '<div class="card"><h2>Өдрийн орлого, зардал · ' + t.slice(0, 7) + '</h2><div class="fn-leg"><span><i style="background:var(--income)"></i>Орлого</span><span><i style="background:var(--expense)"></i>Зардал</span></div>' + svg + '</div>';
  // Сүүлийн 10 гүйлгээ
  var last = E.filter(function (e) { return e.date <= t; }).slice().sort(function (a, b) { var x = a.date + (a.time || ''), y = b.date + (b.time || ''); return x < y ? 1 : x > y ? -1 : 0; }).slice(0, 10);
  var tx = '<div class="card"><h2>Сүүлийн 10 гүйлгээ</h2>' + (last.length ? '<div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Баримт</th><th>Тайлбар</th><th>Дебет</th><th>Кредит</th><th class="n">Дүн</th></tr>' + last.map(function (e) {
      return '<tr><td class="nw">' + e.date + (e.time ? ' ' + esc(String(e.time).slice(0, 5)) : '') + '</td><td>' + esc(e.doc) + '</td><td class="fn-ell" title="' + esc(e.desc) + '">' + esc(e.desc) + '</td><td>' + esc(accName(e.dr)) + '</td><td>' + esc(accName(e.cr)) + '</td><td class="n">' + mny(e.amount) + '</td></tr>'; }).join('') + '</table></div>'
    : '<p class="muted">Гүйлгээ алга.</p>') + '</div>';
  return '<div class="pg-head"><div><h1>Нүүр</h1><p class="pg-desc">' + esc(B.name) + ' · ' + t + ' — өнөөдөр юу хийх, энэ сарын дүн.</p></div></div>' + todo + kpis + chart + tx;
}

// admin.js ачаалах үед нэвтэрсэн бол аль хэдийн зурагдсан — шинэ цэсээр дахин зурна
if ($('main') && $('main').style.display !== 'none') render();
