// ═══════════ САНХҮҮГИЙН ПРОГРАМЫН ЦЭС (нэг түвшин) + НҮҮР ХУУДАС ═══════════
// Зүүн талд нэг цэс: бүлгийн гарчиг + хуудсууд. Хуудас бүр зөвхөн НЭГ замаар нээгдэнэ.
// Хуудас доторх «← Нягтлангийн тайлан», бүх тайлангийн dropdown, «Бүх тайлан», «Бусад» хуудсыг хассан.
// Зүйл: [түлхүүр, нэр] — 'mod/sub' (компанийн хуудас), 'home', 'review', 'v:staff', 'v:cal', 'v:docs', 'v:tax:<sub>'.
// admin.js-ийн дараа ачаална (subnavHtml, crumbHtml, pageHead, periodBar, hubBar, companyView, render-ийг давхарлана).

ICONS.gear = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>';
ICONS.bell = '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 003.4 0"/>';
ICONS.boost = '<path d="M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z"/><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/>';
ICONS.money = '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>';

var MNAV = [
  ['Нүүр', 'home', [['home', 'Өнөөдөр'], ['finance/monthly', 'Хийх ажил (сар бүр)'], ['v:cal', 'Календарь']]],
  ['Борлуулалт', 'sales', [['sales/orders', 'Захиалга'], ['sales/shop', 'Баримт'], ['sales/buuhia', 'Хүргэлт'], ['sales/ebrec', 'Буухиатай тулгах'], ['sales/disc', 'Буцаалт, хөнгөлөлт'], ['sales/ads', 'Сурталчилгаа, ROAS']]],
  ['Boost', 'boost', [['sales/boostp', 'Boost'], ['sales/boostbud', 'Boost төсөв']]],
  ['Бараа', 'products', [['products/catalog', 'Бараа, үнэ'], ['products/stock', 'Үлдэгдэл'], ['products/po', 'Худалдан авалт'], ['products/suppliers', 'Нийлүүлэгчид'],
    ['products/counts', 'Тооллого'], ['products/move', 'Хөдөлгөөн, шилжүүлэг'], ['products/in', 'Орлогын жагсаалт'], ['products/prices', 'Үнийн түүх'], ['finance/assets', 'Үндсэн хөрөнгө']]],
  ['Мөнгө', 'money', [['finance/cashacc', 'Данснууд'], ['finance/bank', 'Банкны хуулга, тулгалт'], ['finance/ledger', 'Дансны хуулга'], ['finance/vouchers', 'Кассын гүйлгээ'],
    ['finance/expenses', 'Зардал, касс хаалт'], ['finance/requests', 'Мөнгөний хүсэлт']]],
  ['Тооцоо', 'people', [['finance/ebset', 'Буухиа тооцоо'], ['finance/recv', 'Авлага'], ['finance/payb', 'Өглөг'], ['finance/loans', 'Зээл'], ['finance/fixed', 'Тогтмол зардал'], ['finance/payroll', 'Цалин, НДШ'], ['finance/debts', 'Бусад авлага, өглөг'],
    ['finance/partners', 'Харилцагчид'], ['finance/pstmt', 'Харилцагчийн хуулга']]],
  ['Тайлан', 'reports', [['—', 'Удирдлагын'], ['finance/daily', 'Өдрийн орлого'], ['finance/expcat', 'Зардлын задаргаа'], ['finance/cashflow', 'Мөнгөн урсгал'], ['finance/profit', 'Барааны ашиг'],
    ['finance/months', '12 сарын дүн'], ['review', 'Удирдлагын тойм'],
    ['—', 'Борлуулалтын'], ['sales/item', 'Бараагаар'], ['sales/cat', 'Ангиллаар'], ['sales/pay', 'Төлбөрийн хэлбэрээр'], ['sales/slow', 'Удаан эргэлттэй бараа'], ['sales/boost', 'Сурталчилгааны үр дүн'],
    ['—', 'Нягтлангийн'], ['finance/dash', 'Бүртгэлийн шалгалт'], ['finance/journal', 'Журнал'], ['finance/gl', 'Ерөнхий дэвтэр'], ['finance/trial', 'Гүйлгээ баланс'],
    ['finance/balance', 'Санхүүгийн байдал'], ['finance/pl', 'Орлогын тайлан'], ['finance/equity', 'Өмчийн өөрчлөлт'], ['finance/aging_r', 'Авлага, өглөгийн насжилт']]],
  ['Татвар', 'tax', [['v:tax:calendar', 'Тайлангийн хуанли'], ['v:tax:nd8', 'НДШ тайлан'], ['v:tax:tt11', 'ХХОАТ (ТТ-11)'], ['v:tax:tt02', 'ААНОАТ (ТТ-02)'],
    ['v:tax:ebalance', 'Жилийн тайлан (e-Balance)'], ['v:tax:entpl', 'Нэгтгэсэн орлогын тайлан'], ['sales/ebarimt', 'И-баримт']]],
  ['Тохиргоо', 'gear', [['finance/company', 'Компанийн мэдээлэл'], ['v:staff', 'Ажилчид, эрх'], ['finance/accounts', 'Дансны төлөвлөгөө'], ['finance/opening', 'Эхний үлдэгдэл'], ['finance/lock', 'Гүйлгээ түгжих'],
    ['finance/close', 'Он хаах, нөөц'], ['finance/api', 'Холболт (банк, буухиа, StorePay)'], ['finance/digest', 'Өдрийн тойм и-мэйл'],
    ['finance/audit', 'Өөрчлөлтийн түүх'], ['finance/trash', 'Хогийн сав'], ['v:docs', 'Маягт, загвар'], ['finance/glossary', 'Нэр томьёо']]],
];
// Нэг өгөгдлийн өөр харагдац — хуудас доторх таб (4-өөс ихгүй)
var PAGE_TABS = { journal: [['journal', 'Бүх бичилт'], ['entry', 'Гараар бичсэн']], aging_r: [['aging_r', 'Авлага'], ['aging_p', 'Өглөг']] };
PAGE_TABS.entry = PAGE_TABS.journal; PAGE_TABS.aging_p = PAGE_TABS.aging_r;
var NAV_ALIAS = { entry: 'journal', aging_p: 'aging_r' };   // таб бүхий хуудсын цэсний зүйл

// Үг хэллэг (хуудасны гарчиг = цэсний нэр); шинэ хуудсууд
SUBS.finance.push(['audit', 'Өөрчлөлтийн түүх'], ['trash', 'Хогийн сав'], ['company', 'Компанийн мэдээлэл']);
REP_HELP.company = 'Нэр, татварын горим, ТТД, НӨАТ, И-баримт, холбоо барих, санхүүгийн жил, буухиагийн нэг хүргэлтийн хөлс. Татварын хуудсууд эндээс хамаарч харагдана.';
REP_HELP.audit = 'Хэн, хэзээ, юу өөрчилсөн — удирдлагын бүх бичилт, захиалга, тооллого.';
REP_HELP.trash = 'Сүүлийн 30 хоногт цуцалсан баримт, барааны хөдөлгөөн, журналын бичилт. Сэргээвэл санхүү, үлдэгдэлд дахин тусна.';
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
// Удирдлага = захирлын хувийн санхүүгийн хөтөч: данс, гүйлгээ, зээл, тооцоо, зардлын тайлан (борлуулалт, буухиа, Boost, нягтлангийн тайлангүй)
var MGMT_NAV = /^(home|review|v:cal|finance\/(cashacc|bank|ledger|vouchers|loans|debts|pstmt|expcat|cashflow|opening|accounts|api|audit|trash))$/;
function navOk(biz, k) {
  var B = BUSINESSES[biz] || {};
  if (B.finOnly && !MGMT_NAV.test(k)) return false;   // Удирдлага: захирлын хувийн санхүүгийн хөтөч
  if (/^finance\/(audit|trash|company)$/.test(k)) return isOwner();
  var m = k.match(/^(\w+)\/(\w+)$/); if (m) return subVisible(biz, m[2]);
  if (k === 'v:staff' || k === 'v:docs') return isOwner();
  if (/^v:tax:(ebalance|tt02)$/.test(k) && ENTITIES[entOf(biz)] && ENTITIES[entOf(biz)].type === 'Хувь хүн') return false;   // хувь хүнд e-Balance, ААНОАТ хамаарахгүй
  if (/^v:tax:/.test(k)) return isOwner();
  return true;
}
function navGo(k) {
  state.navG = null;
  try { var hs = JSON.parse(localStorage.getItem('nb_fn_subs') || '{}') || {}, hh = ''; MNAV.forEach(function (g) { hh = ''; g[2].forEach(function (it) { if (it[0] === '—') hh = it[1]; else if (it[0] === k && hh && hs[hh]) { delete hs[hh]; localStorage.setItem('nb_fn_subs', JSON.stringify(hs)); } }); }); } catch (e) {}   // хаалттай дэд бүлгийн хуудсыг (хайлт, мэдэгдлээс) нээвэл тэр бүлэг нээгдэнэ   // самбар нээгдсэн хуудасны бүлэгт шилжинэ
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
  // Зүүн багана: 8 бүлэг (icon + нэр); хажууд нь сонгосон бүлгийн хуудсууд самбар болж нээгдэнэ (нэг удаад нэг бүлэг)
  var biz = state.biz, G = MNAV.map(function (g, gi) {
    var items = g[2].filter(function (it) { return it[0] === '—' ? !BUSINESSES[biz].finOnly : navOk(biz, it[0]); }), real = items.filter(function (it) { return it[0] !== '—'; });
    return { g: g, gi: gi, items: items, real: real, on: real.some(function (it) { return navItemOn(it[0]); }), badge: real.reduce(function (a, it) { return a + navCountOf(it[0]); }, 0) };
  }).filter(function (x) { return x.real.length; });
  var act = G.filter(function (x) { return x.on; })[0];
  if (state.navG == null || !G.some(function (x) { return x.gi === state.navG; })) state.navG = act ? act.gi : G[0].gi;
  var cur = G.filter(function (x) { return x.gi === state.navG; })[0];
  var col = G.map(function (x) {
    return '<button class="fn-gb' + (x.gi === state.navG ? ' sel' : '') + (x.on ? ' on' : '') + '" onclick="fnOpen(' + x.gi + ')" title="' + x.g[0] + '"><span class="fn-i">' + ico(x.g[1]) + '</span><span>' + x.g[0] + '</span>' +
      (x.badge ? '<i class="fn-badge">' + x.badge + '</i>' : '') + '</button>';
  }).join('');
  // Дэд гарчигтай бүлэг (Тайлан): дэд бүлэг бүр тусдаа нээгдэж/хаагдана (анхдагч — бүгд нээлттэй), идэвхтэй хуудасных үргэлж нээлттэй
  var shut = {}; try { shut = JSON.parse(localStorage.getItem('nb_fn_subs') || '{}') || {}; } catch (e) {}
  var hdr = '', activeSub = '';
  cur.items.forEach(function (it) { if (it[0] === '—') hdr = it[1]; else if (navItemOn(it[0])) activeSub = hdr; });
  hdr = '';
  // дэд бүлэг бүр өөрийн <ul> — хаалттай бол hidden (aria-expanded="false"), товч aria-controls-оор холбогдоно
  var gi2 = 0, li = function (it) { var n = navCountOf(it[0]);
    return '<li><button class="' + (navItemOn(it[0]) ? 'on' : '') + '" onclick="navGo(\'' + it[0] + '\')"><span>' + it[1] + '</span>' + (n ? '<i class="fn-badge">' + n + '</i>' : '') + '</button></li>'; };
  var html = '', open = false;
  cur.items.forEach(function (it) {
    if (it[0] === '—') {
      if (open) html += '</ul></li>';
      hdr = it[1]; var op = !shut[hdr], id = 'fnsg' + (gi2++);
      html += '<li class="fn-sg"><button class="fn-subh" aria-expanded="' + op + '" aria-controls="' + id + '" data-h="' + esc(hdr) + '" onclick="fnSub(this)"><span>' + hdr + '</span><span class="fn-car2">' + (op ? '▾' : '▸') + '</span></button>' +
        '<ul id="' + id + '"' + (op ? '' : ' hidden') + '>';
      open = true; return;
    }
    html += li(it);
  });
  if (open) html += '</ul></li>';
  var panel = '<div class="fn-ph">' + cur.g[0] + '</div><ul>' + html + '</ul>';
  return brand + '<div class="fn-2"><nav class="fn-col">' + col + '</nav><div class="fn-panel">' + panel + '</div></div>';
};
function fnSub(btn) {   // зөвхөн тэр дэд бүлгийг нээж/хаана (бүх цэсийг дахин зурахгүй)
  var h = btn.getAttribute('data-h'), s = {}; try { s = JSON.parse(localStorage.getItem('nb_fn_subs') || '{}') || {}; } catch (e) {}
  if (s[h]) delete s[h]; else s[h] = 1;
  try { localStorage.setItem('nb_fn_subs', JSON.stringify(s)); } catch (e) {}
  var op = !s[h], ul = document.getElementById(btn.getAttribute('aria-controls'));
  btn.setAttribute('aria-expanded', String(op)); btn.querySelector('.fn-car2').textContent = op ? '▾' : '▸';
  if (ul) ul.hidden = !op;
}
// Бүлэг дарахад самбар нь солигдоно (хуудас солихгүй); нэг хуудастай бүлэг бол шууд нээнэ
function fnOpen(gi) {
  var g = MNAV[gi], real = g[2].filter(function (it) { return it[0] !== '—' && navOk(state.biz, it[0]); });
  state.navG = gi;
  if (real.length === 1) { navGo(real[0][0]); return; }
  $('subnav').innerHTML = subnavHtml();
}
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
  if (state.module === 'finance' && state.sub.finance === 'audit') return pageHead('Өөрчлөлтийн түүх', '<button class="b-btn" onclick="audLoad(true)">Шинэчлэх</button>') + auditView();
  if (state.module === 'finance' && state.sub.finance === 'trash') return pageHead('Хогийн сав', '') + trashView();
  if (state.module === 'finance' && state.sub.finance === 'company') return pageHead('Компанийн мэдээлэл', '') + companyView2();
  if (state.module === 'finance' && /^(money|cash|banklink|receipts)$/.test(state.sub.finance)) state.sub.finance = state.sub.finance === 'banklink' ? 'api' : 'ledger';   // нэгтгэсэн хуудас
  if (state.module === 'sales' && state.sub.sales === 'receipts') { state.sub.sales = 'shop'; state.shopSrc = 'all'; }
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
  // Буухиа: компанийн дотор 10 минут тутам ард нь татаж, хураасан мөнгө / хүргэгдсэнийг автоматаар бичнэ
  var B = BUSINESSES[state.biz];
  var slot = state.biz + '|' + Math.floor(Date.now() / 600000), bz = state.biz;
  if (API_URL && state.view === 'company' && B && B.orders && window.ebOnAll && typeof ebAdmPull === 'function' && !ebAdm.busy && window.__ebAuto !== slot &&
      (ebAdm.biz !== bz || Date.now() - (ebAdm.t || 0) > 10 * 60000)) {
    window.__ebAuto = slot; setTimeout(function () { if (state.biz === bz && !ebAdm.busy) ebAdmPull(); }, 1500);
  }
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
  // Орлого = орлогын данс (5xxx, 8101) − буцаалт (6001); Зардал = өртөг (6101) + үйл ажиллагааны зардал (7xxx) — үргэлж эерэг
  var revA = accsOf('rev').concat(accsOf('contra')), expA = accsOf('exp').concat(accsOf('cogs'));
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
  var lastBk = (typeof bankLines !== 'undefined' ? bankLines : []).filter(function (l) { return l.biz === biz; }).map(function (l) { return String(l.date).slice(0, 10); }).sort().pop() || '';
  daily.push({ txt: 'Банкны хуулга оруулж тулгах', ok: !navCount('bank') && lastBk >= todayStr(new Date(Date.now() - 7 * 864e5)), fn: "navGo('finance/bank')", hint: lastBk ? 'сүүлд ' + lastBk : 'хуулга оруулаагүй' });
  if (!B.finOnly) daily.push({ txt: 'Мөнгөний хүсэлт шийдэх', ok: !pendRequests(biz).length, fn: "navGo('finance/requests')" });
  var todo = '<div class="card"><h2>Өнөөдөр хийх ажил</h2>' + (L.length ? L.map(function (a) {
      return '<div class="fn-todo' + (a.bad ? ' bad' : ' warn') + '"><span class="fn-ck">!</span><span>' + esc(a.txt) + '</span><button class="link" onclick="' + a.fn + '">Шийдэх →</button></div>'; }).join('') : '') +
    daily.filter(function (d) { return !d.ok && !L.some(function (a) { return a.fn === d.fn; }); }).map(function (d) { return '<div class="fn-todo"><span class="fn-ck fn-o">○</span><span>' + d.txt + (d.hint ? ' <small class="muted">· ' + esc(d.hint) + '</small>' : '') + '</span><button class="link" onclick="' + d.fn + '">Хийх →</button></div>'; }).join('') +
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
  return '<div class="pg-head"><div><h1>Нүүр</h1><p class="pg-desc">' + esc(B.name) + ' · ' + t + ' — өнөөдөр юу хийх, энэ сарын дүн.</p></div></div>' + todo + (typeof ebSetHomeCard === 'function' && B.orders ? ebSetHomeCard(biz) : '') + (typeof boostHomeCard === 'function' && !B.finOnly ? boostHomeCard(biz) : '') + kpis + chart + tx;
}

// ═══════════ Аюулгүй байдал, хурдан оруулах ═══════════
// Бөөнөөр устгах, түгжих: тоог бичиж баталгаажуулна
function confirmTyped(n, msg) {
  var v = prompt(msg + '\n\nЭнэ үйлдлийг буцаах боломжгүй. Баталгаажуулахын тулд «' + n + '» гэж бичнэ үү:');
  if (v === null) return false;
  if (String(v).replace(/\D/g, '') === String(n)) return true;
  toast('Тоо таарсангүй — үйлдэл хийгдсэнгүй'); return false;
}
// Цонхон дотор: Enter = үндсэн товч (хадгалах), Esc = хаах; тоон талбарт мянгатын таслалтай дүн доор нь
document.addEventListener('keydown', function (e) {
  var sh = [].slice.call(document.querySelectorAll('.sheet.show')).pop(); if (!sh) return;
  if (e.key === 'Escape') { e.preventDefault(); sh.classList.remove('show'); return; }
  var t = e.target;
  if (e.key === 'Enter' && !e.shiftKey && t && t.tagName === 'INPUT' && !/^(checkbox|radio|file|search)$/.test(t.type) && sh.contains(t) && !t.getAttribute('onkeydown')) {
    var b = [].slice.call(sh.querySelectorAll('.panel .btn:not(.ghost)')).filter(function (x) { return x.offsetParent && !x.disabled; })[0];
    if (b) { e.preventDefault(); b.click(); }
  }
});
document.addEventListener('input', function (e) {
  var t = e.target; if (!t || t.tagName !== 'INPUT' || t.type !== 'number' || !t.closest('.sheet')) return;
  var n = t.nextElementSibling, v = Number(t.value);
  if (!n || !n.classList || !n.classList.contains('fn-num')) { n = document.createElement('small'); n.className = 'fn-num'; t.insertAdjacentElement('afterend', n); }
  n.textContent = isFinite(v) && Math.abs(v) >= 1000 ? (v < 0 ? '−' : '') + fmt(Math.abs(v)) : '';
});

// Огноо үнэн: өнөөдрөөс өмнөх огноогоор гараар бичихэд шалтгаан заавал (тайлбарт «[хойш огноолсон: …]»). null — болих
function backdateReason(date, desc) {
  if (!date || date >= todayStr() || /\[хойш огноолсон:/.test(desc || '')) return desc;
  var r = prompt('Огноо ' + date + ' — өнөөдрөөс өмнөх (хойш огноолсон).\nШалтгааныг бичнэ үү (жишээ: баримт хоцорч ирсэн):');
  if (r === null) return null;
  r = r.trim(); if (!r) { toast('Хойш огноолох шалтгаан заавал'); return null; }
  return (desc ? desc + ' ' : '') + '[хойш огноолсон: ' + r.slice(0, 80) + ']';
}

// ═══════════ ТҮҮХ, ХОГИЙН САВ (Тохиргоо) ═══════════
var AUD = { rows: null, at: 0, busy: false, err: '', open: '' };
function audLoad(force) {
  if (!API_URL) { AUD.rows = []; AUD.err = 'Google Sheet-тэй холбогдсон үед түүх хадгалагдана (туршилтын горимд байхгүй).'; return; }
  if (AUD.busy || (!force && AUD.rows && Date.now() - AUD.at < 60000)) return;
  AUD.busy = true; AUD.t0 = Date.now();
  setTimeout(function () { if (AUD.busy && /^(audit|trash)$/.test(state.sub.finance)) render(); }, 3200);   // 3 секундээс удвал «Дахин оролдох»
  post({ type: 'admin_audit', limit: 2000, from: todayStr(new Date(Date.now() - 90 * 864e5)) }, function (err, d) {
    AUD.busy = false; AUD.at = Date.now();
    if (err) { AUD.err = err === 'type' ? 'Серверийг шинэчлэх (Apps Script v6.2 deploy) шаардлагатай.' : 'Алдаа: ' + err; AUD.rows = AUD.rows || []; }
    else { AUD.err = ''; AUD.rows = (d.rows || []).map(function (r) { r.at = audAt(r.at); if (!r.note) r.note = audNote(r); r.note = audMoney(r.note); r.what = audMoney(r.what); return r; }); }
    if (state.view === 'company' && /^(audit|trash)$/.test(state.sub.finance)) render();
  });
}
// Sheet огноог Date болгосон бол «Sun Nov 01 2026 23:10:00 GMT+0800» ирнэ → «2026-11-01 23:10»
function audAt(s) {
  s = String(s || ''); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  var d = new Date(s); return isNaN(d.getTime()) ? s : todayStr(d) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
}
// Мөнгөн дүн нэг форматаар: «77000₮», «77,000 ₮», «77000.00₮» → «₮77,000»
function audMoney(t) { return String(t == null ? '' : t).replace(/(^|[^\d₮,.])(\d[\d,]*)(?:\.\d+)?\s?₮/g, function (m, pre, n) { return pre + fmt(Number(n.replace(/,/g, ''))); }); }
// Тайлбаргүй «Захиалгын төлбөр» мөр: утас · дүн · хуучин төлөв → шинэ төлөв (дэлгэрэнгүйгээс)
function audNote(r) {
  if (r.type === 'order_save') {   // «Захиалга бүртгэсэн / засварласан»: утас · бараа · дүн
    var od = {}; try { od = JSON.parse(r.det).order || {}; } catch (e) {}
    var it = od.items; if (typeof it === 'string') { try { it = JSON.parse(it); } catch (e) { it = []; } }
    it = (Array.isArray(it) ? it : []).filter(function (i) { return i && i.name && i.name !== FEE_ITEM && i.name !== DISC_ITEM && i.name !== SPLIT_ITEM; }).map(function (i) { return i.name + ((Number(i.qty) || 1) > 1 ? ' ×' + i.qty : ''); }).join(', ');
    return [(od.customer ? od.customer + ' ' : '') + (od.phone || ''), it, od.amount ? fmt(od.amount) : ''].filter(function (x) { return String(x).trim(); }).join(' · ');
  }
  if (r.type !== 'admin_order') return '';
  var f = {}; try { f = JSON.parse(r.det).fields || {}; } catch (e) {}
  var o = (window.adminOrders || []).filter(function (x) { return x.id === r.id; })[0];
  return ordAudWhat(o, f) || (r.id ? '#' + r.id : '');
}
function ordAudWhat(o, f) {
  f = f || {}; var ch = [];
  if (f.confirmed !== undefined) ch.push(f.confirmed ? 'Төлөөгүй → ' + (/буухиа хураасан/.test(f.confirmed) ? 'Буухиа хураасан' : 'Төлсөн') : 'Төлсөн → Төлөөгүй');
  else if (f.paid) ch.push('ажилтны тэмдэглэл → ' + f.paid);
  if (f.ebCode) ch.push(f.ebCode === 'бусад' ? 'бусад хүргэлтээр' : 'буухиа код ' + f.ebCode);
  if (f.saleDone !== undefined) ch.push('борлуулалт: ' + (f.saleDone || '—'));
  if (f.edit) ch.push('засвар: ' + Object.keys(f.edit).join(', '));
  if (!ch.length && f.note) ch.push(String(f.note));
  return [o ? (o.customer ? o.customer + ' ' : '') + o.phone : '', o ? fmt(o.amount) : ''].filter(Boolean).concat(ch).join(' · ');
}
function audMine(r) { return !r.biz || r.biz === state.biz; }
function audWait() {   // ачаалж байх үеийн / алдааны мөр «Дахин оролдох» товчтой
  if (AUD.err) return '<div class="alert bad"><div>' + esc(AUD.err) + '</div><button class="b-btn" onclick="AUD.err=\'\';AUD.busy=false;audLoad(true)">Дахин оролдох</button></div>';
  if (!AUD.rows) return AUD.busy && Date.now() - AUD.t0 > 3000 ? '<div class="alert"><div>Сервер удаан хариулж байна…</div><button class="b-btn" onclick="AUD.busy=false;audLoad(true)">Дахин оролдох</button></div>' : '<p class="muted">Ачаалж байна…</p>';
  return '';
}
function audPager(n) {
  var pg = state.audPg || 0, pages = Math.ceil(n / 50); if (pages <= 1) return '';
  return '<div class="bar-row" style="gap:8px;align-items:center;margin-top:8px"><button class="b-btn"' + (pg ? '' : ' disabled') + ' onclick="state.audPg=' + (pg - 1) + ';render()">← Өмнөх</button>' +
    '<span class="muted">' + (pg * 50 + 1) + '–' + Math.min(n, pg * 50 + 50) + ' / ' + n + '</span><button class="b-btn"' + (pg < pages - 1 ? '' : ' disabled') + ' onclick="state.audPg=' + (pg + 1) + ';render()">Дараах →</button></div>';
}
function auditView() {
  audLoad();
  if (!AUD.rows) return audWait();
  var L = AUD.rows.filter(audMine), pg = state.audPg || 0; if (pg * 50 >= L.length) pg = state.audPg = 0;
  var body = L.slice(pg * 50, pg * 50 + 50).map(function (r, i) {
    var k = r.at + '|' + i, on = AUD.open === k, det = '';
    if (on) { try { det = '<tr><td colspan="4"><pre class="fn-pre">' + esc(JSON.stringify(JSON.parse(r.det), null, 2)) + '</pre></td></tr>'; } catch (e) { det = '<tr><td colspan="4"><pre class="fn-pre">' + esc(r.det) + '</pre></td></tr>'; } }
    return '<tr style="cursor:pointer" onclick="AUD.open=AUD.open===\'' + k + '\'?\'\':\'' + k + '\';render()"><td data-l="Цаг" class="nw">' + esc(r.at.slice(0, 16)) + '</td><td data-l="Хэн">' + esc(r.who || '—') + '</td><td data-l="Үйлдэл">' + esc(r.what) + '</td><td data-l="Тайлбар" class="fn-ell" title="' + esc(r.note) + '">' + esc(r.note || (r.id ? '#' + r.id : '')) + '</td></tr>' + det;
  }).join('');
  return audWait() + searchBox('Хэн, үйлдэл, тайлбараар хайх…') +
    '<div class="card rep"><div class="rep-cap"><b>Өөрчлөлтийн түүх</b><span>сүүлийн 90 хоног · ' + L.length + ' мөр · мөр дээр дарахад дэлгэрэнгүй</span></div><div class="scroll"><table class="rep-t"><tr><th>Цаг</th><th>Хэн</th><th>Үйлдэл</th><th>Тайлбар</th></tr>' +
    (body || '<tr><td colspan="4" class="muted">Түүх алга.</td></tr>') + '</table></div></div>' + audPager(L.length);
}
// Хогийн сав: сүүлийн 30 хоногт цуцалсан баримт, хөдөлгөөн, журнал (татгалзсан тооллого орохгүй) — «Сэргээх»
function trashItems() {
  var lim = todayStr(new Date(Date.now() - 30 * 864e5)), back = {};
  (AUD.rows || []).forEach(function (r) { if (r.type === 'admin_restore' || (r.type === 'admin_order' && /сэргээсэн/.test(r.what))) back[r.id] = 1; });
  return (AUD.rows || []).filter(function (r) {
    if (!audMine(r) || r.at.slice(0, 10) < lim || !r.id || back[r.id]) return false;
    if (r.type === 'admin_record') return /цуцалсан/.test(r.what);
    if (r.type === 'admin_journal') return /цуцалсан/.test(r.what);
    if (r.type === 'admin_stock') return /цуцалсан/.test(r.what) && !/^Тооллого/.test(r.note);
    if (r.type === 'admin_order') return r.what === 'Захиалга цуцалсан';   // борлуулалт буцаасан цуцлалт сэргэхгүй
    return false;
  }).map(function (r) { return { r: r, kind: r.type === 'admin_record' ? 'rec' : r.type === 'admin_stock' ? 'mov' : r.type === 'admin_order' ? 'ord' : 'jr' }; });
}
function trashView() {
  audLoad();
  if (!AUD.rows) return audWait();
  var L = trashItems(), K = { rec: 'Баримт, зарлага', mov: 'Барааны хөдөлгөөн', jr: 'Журнал', ord: 'Захиалга' };
  return audWait() +
    '<div class="card rep"><div class="rep-cap"><b>Хогийн сав</b><span>сүүлийн 30 хоногт цуцалсан · ' + L.length + '</span></div><div class="scroll"><table class="rep-t"><tr><th>Цуцалсан</th><th>Хэн</th><th>Төрөл</th><th>Юу</th><th></th></tr>' +
    (L.map(function (x) {
      return '<tr><td data-l="Цуцалсан" class="nw">' + esc(x.r.at.slice(0, 16)) + '</td><td data-l="Хэн">' + esc(x.r.who || '—') + '</td><td data-l="Төрөл">' + K[x.kind] + '</td><td data-l="Юу">' + esc(x.r.note || '#' + x.r.id) + '</td>' +
        (x.kind === 'ord' && ordNotCancelled(x.r.id) ? '<td class="n"><small style="color:#B45309">хэрэгжээгүй · ' + esc(ordNotCancelled(x.r.id)) + '</small> <button class="mini" onclick="ordCancelOpen(\'' + esc(x.r.id) + '\')">Дахин цуцлах</button></td></tr>' :
        '<td class="n"><button class="mini" onclick="trashRestore(\'' + x.kind + '\',\'' + esc(x.r.id) + '\',' + esc(JSON.stringify(x.r.note || '')) + ')">Сэргээх</button></td></tr>');
    }).join('') || '<tr><td colspan="5" class="muted">Хогийн сав хоосон.</td></tr>') + '</table></div></div>';
}
function ordNotCancelled(id) { var o = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; return o && o.status !== 'Цуцалсан' ? o.status : ''; }
function trashRestore(kind, id, what) {
  if (!confirm('Сэргээх үү?\n' + (what || id) + '\n\nСанхүү, үлдэгдэлд дахин тусна.')) return;
  if (kind === 'ord') {   // цуцалсан захиалга — өмнөх төлөв рүү
    var ar = (AUD.rows || []).filter(function (r) { return r.type === 'admin_order' && r.id === id; })[0], prev = 'Шинэ';
    try { prev = JSON.parse(ar.det).fields.prev || 'Шинэ'; } catch (e) {}
    post({ type: 'admin_order', id: id, by: ownerName, what: what, fields: { restore: prev } }, function (err) { if (err) { toast('Алдаа: ' + err); return; } toast('Захиалга сэргээлээ (' + prev + ')'); AUD.at = 0; audLoad(true); refresh(); });
    return;
  }
  post({ type: 'admin_restore', kind: kind, restoreId: id, what: what }, function (err, d) {
    if (err) { toast(err === 'locked' ? 'Түгжсэн хугацааны бичлэг — сэргээх боломжгүй' : err === 'negative' ? 'Сэргээвэл үлдэгдэл хасах болно: ' + ((d && d.item) || '') : err === 'state' ? 'Энэ бичлэгийг сэргээх боломжгүй' : 'Алдаа: ' + err); return; }
    toast('Сэргээлээ'); AUD.at = 0; audLoad(true); refresh();
  });
}

// ═══════════ ЭХНИЙ ТООЛЛОГО ═══════════
// Эхний үлдэгдэл оруулсны дараах анхны тооллогын зөрүү ашиг/алдагдал биш — эхний үлдэгдлийн засвар (Дт 1404 / Кт 4201).
// Тэмдэглэгээ = журналын «Засвар: тооллого → эхний үлдэгдэл #M…» мөр (тайлан, журналд өөрөө гарахгүй; reports.js OPENFIX).
var OC_RE = /^Засвар: тооллого → эхний үлдэгдэл/;
function ocMarks(biz) { var o = {}; journal.forEach(function (j) { if (j.biz === biz && OC_RE.test(String(j.desc))) (String(j.desc).match(/#M[\w\-]+/g) || []).forEach(function (t) { o[t.slice(1)] = j.id; }); }); return o; }
function countDays(biz) {
  var ce = costEngine(biz, R()), mk = ocMarks(biz), D = {};
  moves.forEach(function (m) {
    if (m.biz !== biz || m.kind !== 'Тооллого' || m.status === 'Хүлээгдэж') return;
    var d = String(m.date).slice(0, 10), x = D[d] = D[d] || { date: d, ids: [], plus: 0, minus: 0, n: 0, marked: 0, jids: {} };
    var v = Math.abs(ce.mv[m.id] || 0); x.ids.push(m.id); x.n++;
    if (m.qty > 0) x.plus += v; else x.minus += v;
    if (mk[m.id]) { x.marked++; x.jids[mk[m.id]] = 1; }
  });
  return Object.keys(D).sort().reverse().map(function (k) { return D[k]; });
}
function ocMark(date, on) {
  var x = countDays(state.biz).filter(function (d) { return d.date === date; })[0]; if (!x) return;
  if (!on) {
    var J = Object.keys(x.jids); if (!J.length || !confirm(date + '-ны тооллогын «эхний тооллого» тэмдэглэгээг авах уу?\nЗөрүү нь дахин дутагдал (7421) / илүүдэл (8101) болно.')) return;
    var i = 0, next = function () { if (i >= J.length) { toast('Тэмдэглэгээ авлаа'); if (API_URL) refresh(); else render(); return; }
      var id = J[i++]; if (!API_URL) { journal = journal.filter(function (j) { return j.id !== id; }); save('nb_demo_journal', journal); next(); return; }
      post({ type: 'admin_journal', cancelId: id, what: 'Эхний тооллого тэмдэглэгээ ' + date }, function () { next(); }); };
    next(); return;
  }
  if (!confirm(date + '-ны тооллогыг «Эхний тооллого» гэж тэмдэглэх үү?\n\nИлүүдэл ' + fmt(x.plus) + ', дутагдал ' + fmt(x.minus) + ' нь ашиг/алдагдал биш — эхний үлдэгдлийн засвар (Дт 1404 / Кт 4201) болно.')) return;
  var E = [], cur = [];
  var flush = function () { if (cur.length) E.push({ biz: state.biz, date: date, dr: '1404', cr: '4201', amount: 1, partner: '', desc: 'Засвар: тооллого → эхний үлдэгдэл ' + cur.join(' ') }); cur = []; };
  x.ids.forEach(function (id) { if (('Засвар: тооллого → эхний үлдэгдэл ' + cur.concat('#' + id).join(' ')).length > 195) flush(); cur.push('#' + id); });
  flush();
  postEntries(E, function () { toast('Эхний тооллого гэж тэмдэглэлээ'); if (API_URL) refresh(); else render(); });
}
var _countsView = countsView;
countsView = function () {
  var L = countDays(state.biz);
  return _countsView() + '<div class="card rep"><div class="rep-cap"><b>Батлагдсан тооллого</b><span>өдрөөр · илүүдэл 8101 бусад орлого, дутагдал 7421; «эхний тооллого» бол 4201</span></div><div class="scroll"><table class="rep-t">' +
    '<tr><th>Огноо</th><th class="n">Бараа</th><th class="n">Илүүдэл</th><th class="n">Дутагдал</th><th>Бүртгэл</th><th></th></tr>' + (L.length ? L.map(function (x) {
      var on = x.marked && x.marked === x.n;
      return '<tr><td data-l="Огноо" class="nw">' + x.date + '</td><td data-l="Бараа" class="n">' + x.n + '</td><td data-l="Илүүдэл" class="n">' + mny(x.plus) + '</td><td data-l="Дутагдал" class="n">' + (x.minus ? '−' + fmt(x.minus) : '—') + '</td>' +
        '<td data-l="Бүртгэл">' + (on ? '<span class="st b">Эхний тооллого · 4201</span>' : x.marked ? '<span class="st y">Хэсэгчлэн тэмдэглэсэн</span>' : '<span class="st n">Ердийн · 8101 / 7421</span>') + '</td>' +
        '<td class="n"><button class="mini" onclick="ocMark(\'' + x.date + '\',' + (on ? 0 : 1) + ')">' + (on ? 'Тэмдэглэгээ авах' : 'Эхний тооллого гэж тэмдэглэх') + '</button></td></tr>';
    }).join('') : '<tr><td colspan="6" class="muted">Батлагдсан тооллого алга.</td></tr>') + '</table></div></div>';
};

// ═══════════ Касс хаах (удирдлага) ═══════════
// Системийн кассын үлдэгдэл (10003) ↔ бодит тоолсон дүн; зөрүүтэй бол шалтгаан заавал.
// Дутагдал: Дт 7404 / Кт 10003, илүүдэл: Дт 10003 / Кт 5201 (журналын бичилт, «Касс хаалт» тайлбартай)
function openCashClose() {
  var sys = r0(balances(J(), todayStr())['10003'] || 0);
  gOpen('<h2>Касс хаах</h2><p class="muted">' + esc(BUSINESSES[state.biz].name) + ' · ' + todayStr() + '</p>' +
    '<table class="rep-t"><tr><td>Системийн хүлээгдэж буй дүн (10003)</td><td class="n"><b>' + mny(sys) + '</b></td></tr></table>' +
    '<label for="ccReal">Бодит тоолсон дүн (₮)</label><input id="ccReal" type="number" min="0" inputmode="numeric" oninput="ccDiff(' + sys + ')">' +
    '<p id="ccDiffTxt" style="margin:6px 0"></p>' +
    '<label for="ccWhy">Зөрүүний шалтгаан</label><input id="ccWhy" placeholder="Зөрүүтэй бол заавал (жишээ: хариулт буруу өгсөн)">' +
    '<button class="btn" onclick="saveCashClose(' + sys + ')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
}
function ccDiff(sys) { var v = Number($('ccReal').value), d = r0(v - sys), el = $('ccDiffTxt'); if (!el) return; el.innerHTML = $('ccReal').value === '' ? '' : Math.abs(d) < 1 ? '<span style="color:var(--income)">Зөрүүгүй</span>' : 'Зөрүү: <b class="' + (d < 0 ? 'neg' : '') + '">' + (d < 0 ? 'дутагдал ' : 'илүүдэл ') + fmt(Math.abs(d)) + '</b>'; }
function saveCashClose(sys) {
  if ($('ccReal').value === '') { toast('Бодит дүнгээ оруулна уу'); return; }
  var real = Number($('ccReal').value), d = r0(real - sys), why = $('ccWhy').value.trim();
  if (Math.abs(d) < 1) { gClose(); toast('Касс зөрүүгүй — хаалаа'); return; }
  if (!why) { toast('Зөрүүний шалтгааныг бичнэ үү'); $('ccWhy').focus(); return; }
  var e = d < 0 ? { dr: '7404', cr: '10003', desc: 'Касс хаалт · дутагдал · ' + why } : { dr: '10003', cr: '5201', desc: 'Касс хаалт · илүүдэл · ' + why };
  postEntries([Object.assign({ biz: state.biz, date: todayStr(), amount: Math.abs(d), partner: '' }, e)], function () { gClose(); toast('Касс хаалт бичигдлээ · ' + (d < 0 ? 'дутагдал ' : 'илүүдэл ') + fmt(Math.abs(d))); if (API_URL) refresh(); else render(); });
}

// ═══════════ КОМПАНИЙН МЭДЭЭЛЭЛ ═══════════
// window.companyInfo = { biz: { name, short, color, taxMode: 'ААН'|'Хувь хүн', tin, vat, ebarimt, addr, phone, email, fyStart, ebFee } } (Script Property COMPANY)
var CO_BASE = {};
function applyCompany() {
  var C = window.companyInfo || {};
  Object.keys(BUSINESSES).forEach(function (k) {
    var B = BUSINESSES[k], c = C[k] || {}, o = CO_BASE[k] = CO_BASE[k] || { name: B.name, color: B.color, ebarimt: B.ebarimt };
    B.name = c.name || o.name; B.color = c.color || o.color; B.ebarimt = c.ebarimt === 'no' ? false : c.ebarimt === 'yes' ? true : o.ebarimt;
    var E = ENTITIES[entOf(k)]; if (E && c.taxMode && E.biz.length === 1) E.type = c.taxMode === 'Хувь хүн' ? 'Хувь хүн' : 'ХХК';   // хэд хэдэн компанитай хуулийн этгээдийн горимыг өөрчлөхгүй
  });
}
function companyView2() {
  var k = state.biz, c = (window.companyInfo || {})[k] || {}, B = BUSINESSES[k], E = ENTITIES[entOf(k)] || {};
  var f = function (id, label, v, ph, type) { return '<div><label for="co_' + id + '">' + label + '</label><input id="co_' + id + '"' + (type ? ' type="' + type + '"' : '') + ' value="' + esc(v == null ? '' : v) + '" placeholder="' + esc(ph || '') + '"></div>'; };
  var sel = function (id, label, v, opts) { return '<div><label for="co_' + id + '">' + label + '</label><select id="co_' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(v) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>'; };
  return '<div class="card" style="max-width:760px">' +
    '<div class="row2">' + f('name', 'Нэр', c.name || B.name) + f('short', 'Товч нэр', c.short || '', 'Жишээ: Cozy') + '</div>' +
    '<div class="row2">' + sel('taxMode', 'Татварын горим', c.taxMode || (E.type === 'Хувь хүн' ? 'Хувь хүн' : 'ААН'), [['ААН', 'ААН (хуулийн этгээд)'], ['Хувь хүн', 'Хувь хүн']]) + f('tin', 'ТТД / Регистр', c.tin || E.tin || E.regNo || '') + '</div>' +
    '<div class="row2">' + sel('vat', 'НӨАТ төлөгч', c.vat || 'no', [['no', 'Үгүй'], ['yes', 'Тийм']]) + sel('ebarimt', 'И-баримт ашиглах', c.ebarimt || (B.ebarimt === false ? 'no' : 'yes'), [['yes', 'Тийм'], ['no', 'Үгүй']]) + '</div>' +
    '<div class="row2">' + f('addr', 'Хаяг', c.addr || '') + f('phone', 'Утас', c.phone || '') + '</div>' +
    '<div class="row2">' + f('email', 'Имэйл', c.email || '', '', 'email') + f('fyStart', 'Санхүүгийн жилийн эхлэл (сар-өдөр)', c.fyStart || '01-01', '01-01') + '</div>' +
    '<div class="row2">' + f('color', 'Өнгө', c.color || B.color || '#1F4E79', '', 'color') + (B.orders ? f('ebFee', 'Буухиагийн нэг хүргэлтийн хөлс (₮)', c.ebFee || 7000, '', 'number') : '<div></div>') + '</div>' +
    '<p class="muted" style="font-size:12.5px">Татварын горим «Хувь хүн» бол e-Balance, ААНОАТ хуудас нуугдана. Хөлс нь хүргэгдсэн захиалга бүрт хүргэлтийн зардал (7124) болж бичигдэнэ.' + (E.biz && E.biz.length > 1 ? ' Энэ компани «' + esc(E.name) + '» хуулийн этгээдэд бусад компанитай хамт байгаа тул горим тэр хуулийн этгээдээр хэвээр.' : '') + '</p>' +
    '<button class="b-btn primary" onclick="saveCompany()">Хадгалах</button></div>';
}
function saveCompany() {
  var k = state.biz, all = JSON.parse(JSON.stringify(window.companyInfo || {})), c = {};
  ['name', 'short', 'taxMode', 'tin', 'vat', 'ebarimt', 'addr', 'phone', 'email', 'fyStart', 'color', 'ebFee'].forEach(function (x) { var el = $('co_' + x); if (el) c[x] = x === 'ebFee' ? Number(el.value) || 0 : String(el.value).trim().slice(0, 120); });
  if (c.fyStart && !/^\d{2}-\d{2}$/.test(c.fyStart)) { toast('Санхүүгийн жилийн эхлэлийг «01-01» хэлбэрээр бичнэ үү'); return; }
  all[k] = c; window.companyInfo = all; applyCompany();
  if (!API_URL) { save('nb_demo_company', all); toast('Хадгаллаа'); render(); return; }
  post({ type: 'admin_setting', key: 'company', value: all }, function (err) { if (err) { toast('Алдаа: ' + err); return; } toast('Хадгаллаа'); render(); });
}
applyCompany();

// ═══════════ Удирдлагаас захиалга цуцлах ═══════════
// Шалтгаан заавал (Давхар — аль захиалгын давхар; Хэрэглэгч татгалзсан; Бусад + тайлбар). Илгээгдсэн бол: бараа гарт ирсэн үед борлуулалтыг буцаана.
function ordCancelOpen(id) {
  var o = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; if (!o) return;
  var ph = function (p) { return String(p || '').replace(/\D/g, '').slice(-8); };
  var twins = (window.adminOrders || []).filter(function (x) { return x.id !== id && x.biz === o.biz && !ordDead(x) && ph(x.phone) === ph(o.phone); });
  var sold = /^yes:/.test(o.saleDone || ''), eb = o.ebCode && o.ebCode !== 'бусад';
  gOpen('<h2>Захиалга цуцлах</h2><p class="muted">' + esc(o.customer ? o.customer + ' (' + o.phone + ')' : o.phone) + ' · ' + esc(o.date) + ' · ' + fmt(o.amount) + ' · ' + esc(ordStLabel(o)) + '</p>' +
    '<label for="ocWhy">Шалтгаан *</label><select id="ocWhy" onchange="$(\'ocTwinW\').style.display=this.value===\'Давхар\'?\'\':\'none\'">' +
      ['Давхар', 'Хэрэглэгч татгалзсан', 'Бусад'].map(function (x) { return '<option' + (x === 'Давхар' && dupOf(o) ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
    '<div id="ocTwinW"' + (dupOf(o) ? '' : ' style="display:none"') + '><label for="ocTwin">Аль захиалгын давхар вэ</label><select id="ocTwin">' + (twins.length ? twins.map(function (x) {
      return '<option value="' + x.id + '">' + esc(x.date + ' · ' + (x.customer ? x.customer + ' · ' : '') + fmt(x.amount) + ' · ' + ordStLabel(x) + (x.ebCode && x.ebCode !== 'бусад' ? ' · ' + x.ebCode : '')) + '</option>'; }).join('') : '<option value="">Ижил утастай өөр захиалга алга</option>') + '</select></div>' +
    '<label for="ocNote">Тайлбар</label><input id="ocNote" placeholder="«Бусад» бол заавал">' +
    (sold ? '<p class="muted" style="font-size:12.5px;margin:10px 0 0">Цуцлахад борлуулалт буцаагдана: орлого «Борлуулалтын буцаалт» (6001), өртөг Дт 1404 / Кт 6101, бараа үлдэгдэлд нэмэгдэнэ.</p>' : '') +
    (eb ? '<div class="alert" style="margin-top:10px"><div>Энэ захиалга Буухиа дээр байна (<b>' + esc(o.ebCode) + '</b>) — <b>Буухиа дээр бас цуцлана уу.</b></div><a class="b-btn" href="https://ebuuhia.com/" target="_blank" rel="noopener">Буухиа нээх</a></div>' : '') +
    '<div style="margin-top:12px"><button class="btn danger" onclick="ordCancelDo(\'' + id + '\')">Цуцлах</button><button class="btn ghost" onclick="gClose()">Болих</button></div>');
}
function ordCancelDo(id) {
  var o = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; if (!o) return;
  var why = $('ocWhy').value, note = $('ocNote').value.trim(), twin = why === 'Давхар' && $('ocTwin') ? $('ocTwin').value : '', recv = /^yes:/.test(o.saleDone || '');
  if (why === 'Бусад' && !note) { toast('Тайлбараа бичнэ үү'); $('ocNote').focus(); return; }
  var reason = why + (twin ? ' · #' + twin + ' захиалгын давхар' : '') + (note ? ' · ' + note : '');
  var what = (o.customer ? o.customer + ' ' : '') + o.phone + ' · ' + fmt(o.amount) + ' · ' + reason;
  if (!API_URL) { o.status = 'Цуцалсан'; if (recv) o.saleDone = 'returned'; gClose(); render(); toast('Цуцаллаа'); return; }
  post({ type: 'admin_order', id: id, by: ownerName, what: what, fields: { status: 'Цуцалсан', reason: reason, receive: !!recv, prev: o.status } }, function (err) {
    if (err) { toast(err === 'state' ? 'Аль хэдийн цуцалсан' : err === 'locked' ? 'Өнөөдрийн огноо түгжигдсэн' : 'Алдаа: ' + err); return; }
    o.status = 'Цуцалсан'; gClose(); render(); toast('Захиалга цуцаллаа' + (recv ? ' — борлуулалт буцаагдлаа' : ''));
    fetchAll(function (ok) { if (!ok) return; render(); ordCancelVerify(id); });
  });
}

// Удирдлагаас захиалга засах: хэрэглэгчийн нэр, хаяг, хүргэх өдөр, тэмдэглэл (утас, бараа, дүнг ажилтан засна)
// Хүргэлтийн төлбөр, хөнгөлөлтийг засвал захиалгын дүн ба (илгээгдсэн бол) борлуулалтын мөр, авлага дагаж шинэчлэгдэнэ
var ORD_EDIT = [['customer', 'Хэрэглэгчийн нэр'], ['district', 'Дүүрэг'], ['khoroo', 'Хороо'], ['address', 'Хаяг'], ['deliverDate', 'Хүргэх өдөр', 'date'], ['note', 'Тэмдэглэл'],
  ['courier', 'Хүргэлтийн компани', 'sel'], ['fee', 'Хүргэлтийн төлбөр (₮)', 'number'], ['disc', 'Хөнгөлөлт (₮)', 'number']];
function ordEdVal(o, k) {
  var it = o.items; if (typeof it === 'string') { try { it = JSON.parse(it); } catch (e) { it = []; } }
  var sum = function (n) { return (it || []).filter(function (i) { return baseItem(i.name) === n; }).reduce(function (a, i) { return a + (Number(i.price) || 0) * (Number(i.qty) || 1); }, 0); };
  if (k === 'courier') return o.courier === 'Бусад' || o.ebCode === 'бусад' ? 'Бусад' : 'Буухиа';
  if (k === 'fee') return String(sum(FEE_ITEM)); if (k === 'disc') return String(-sum(DISC_ITEM));
  return String(o[k] == null ? '' : o[k]);
}
function ordEditOpen(id) {
  var o = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; if (!o) return;
  gOpen('<h2>Захиалга засах</h2><p class="muted">' + esc(o.phone) + ' · ' + esc(o.date) + ' · ' + fmt(o.amount) + ' · ' + esc(ordStLabel(o)) + '</p>' +
    ORD_EDIT.map(function (f) { var v = ordEdVal(o, f[0]); return '<label for="oe_' + f[0] + '">' + f[1] + '</label>' + (f[2] === 'sel' ? '<select id="oe_' + f[0] + '">' + ['Буухиа', 'Бусад'].map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>'
      : '<input id="oe_' + f[0] + '"' + (f[2] ? ' type="' + f[2] + '"' : '') + ' value="' + esc(v) + '">'); }).join('') +
    '<p class="muted" style="font-size:12.5px">Утас, барааг ажилтны хуудаснаас засна. Хүргэлтийн төлбөр, хөнгөлөлтийг засвал захиалгын дүн, борлуулалт, авлага дагаж шинэчлэгдэнэ.</p>' +
    '<div style="margin-top:12px"><button class="btn" onclick="ordEditDo(\'' + id + '\')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button></div>');
}
function ordEditDo(id) {
  var o = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; if (!o) return;
  var ed = {}, ch = [];
  ORD_EDIT.forEach(function (f) { var v = $('oe_' + f[0]).value.trim(), was = ordEdVal(o, f[0]); if (f[2] === 'number') { v = String(Math.max(0, Math.round(Number(v) || 0))); was = String(Number(was) || 0); }
    if (v !== was) { ed[f[0]] = v; ch.push(f[1] + ': ' + (was || '—') + ' → ' + (v || '—')); } });
  if (!ch.length) { gClose(); return; }
  var what = (o.customer ? o.customer + ' ' : '') + o.phone + ' · ' + ch.join('; ');
  if (!API_URL) { Object.assign(o, ed); gClose(); render(); toast('Хадгаллаа'); return; }
  post({ type: 'admin_order', id: id, by: ownerName, what: what.slice(0, 200), fields: { edit: ed } }, function (err, d) {
    if (err) { toast('Алдаа: ' + err); return; }
    if (!d.edited) { alert('Сервер засварыг хадгалсангүй — Apps Script-ийн сүүлийн хувилбарыг deploy хийх шаардлагатай.'); return; }
    var money = ed.fee !== undefined || ed.disc !== undefined; if (!money) Object.assign(o, ed);
    gClose(); render(); toast('Захиалга засагдлаа' + (d.adj ? ' — борлуулалт, авлага шинэчлэгдлээ' : '')); refresh();
  });
}
// Сервер цуцлалтыг хэрэгжүүлсэн эсэх (хуучин сервер «ok» гэж хариулаад төлвийг солихгүй байж болно)
function ordCancelVerify(id) {
  var o = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0];
  if (o && o.status !== 'Цуцалсан') alert('Сервер захиалгын төлвийг «Цуцалсан» болгосонгүй (одоо: ' + o.status + ').\nApps Script-ийн сүүлийн хувилбар deploy хийгдсэн эсэхийг шалгаад дахин цуцлана уу.');
}
// 15 минут идэвхгүй бол удирдлагын хуудаснаас автоматаар гарна
var IDLE = { t: Date.now() };
['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(function (ev) { document.addEventListener(ev, function () { IDLE.t = Date.now(); }, { passive: true }); });
setInterval(function () {
  if (API_URL && $('main') && $('main').style.display !== 'none' && Date.now() - IDLE.t > 15 * 60000) { IDLE.t = Date.now(); toast('15 минут идэвхгүй байсан тул гарлаа'); logout(); }
}, 60000);

// admin.js ачаалах үед нэвтэрсэн бол аль хэдийн зурагдсан — шинэ цэсээр дахин зурна
if ($('main') && $('main').style.display !== 'none') render();
