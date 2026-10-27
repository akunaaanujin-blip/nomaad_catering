// Хадгалах явцын төлөв (post/refresh) — ачаалах үед fetchAll-аас өмнө тодорхойлогдсон байх ёстой
var BUSY = { n: 0, p: 0, msg: '' }, INFLIGHT = {}, refreshing = false, refreshAgain = false;
// ── УДИРДЛАГЫН САМБАР ──
// Baaz-ийн бүтэцтэй: Миний компаниуд → (Борлуулалт · Бараа материал · Санхүү · Ажилчид), мөн нийт Ажилчид цэс.

var KEYS = ['meat', 'travel', 'cozy'];          // дэлгүүрүүд (ажилчид, бараатай)
var ALL_KEYS = KEYS.concat(['mgmt']);            // + Удирдлага (зөвхөн санхүү)
var ORIG_ALL = ALL_KEYS.slice();                 // компани хоорондын тооцоонд бүх компанийн нэр хэрэгтэй (менежерт ч)
// Эрх: Эзэн — бүгд; Менежер — зөвхөн өөрийн дэлгүүр (цалин, зээл, татвар, тохиргоо, удирдлагын санхүүгүй). Сервер ч мөн шалгана.
var ROLE = 'Эзэн', ROLE_BIZ = 'all';
function isOwner() { return ROLE === 'Эзэн'; }
function applyRole(role, biz) {
  ROLE = role || 'Эзэн'; ROLE_BIZ = biz || 'all';
  KEYS = ORIG_ALL.filter(function (k) { return k !== 'mgmt' && (isOwner() || staffIn({ biz: ROLE_BIZ }, k)); });
  ALL_KEYS = isOwner() ? KEYS.concat(['mgmt']) : KEYS.slice();
  if (!isOwner()) { window.loans = []; window.assets = []; salary = []; }   // сервер ч менежерт эдгээрийг өгдөггүй
}
var token = sessionStorage.getItem('nb_tok') || '';   // удирдагчийн токен (8 цаг)
var ownerName = sessionStorage.getItem('nb_owner') || '';
var records = [], staff = [], salary = [], stockData = {}, moves = [], journal = [], partners = [], sheetProducts = [], meta = {};
// config.js / products.js-ийн үндсэн жагсаалтыг хадгалж, «Бараа» хуудасны засварыг дээр нь давхарлана
var BASE_PRODUCTS = {};
Object.keys(BUSINESSES).forEach(function (k) { BASE_PRODUCTS[k] = BUSINESSES[k].products.slice(); });
var state = { view: 'companies', biz: '', module: 'sales', period: 'month', staffBiz: 'all', staffSt: 'all', month: todayStr().slice(0, 7), q: '', stockF: 'in', showMoves: false,
  sub: { sales: 'receipts', products: 'stock', finance: 'daily' }, from: todayStr().slice(0, 8) + '01', to: todayStr(), acc: 'cashall' };
var editId = '', salId = '', salKind = 'Урьдчилгаа';
var NAV = { idx: 0, key: '', restoring: false };   // дэлгэцийн түүх (← Буцах)

if (!API_URL) $('demo').style.display = 'block';
if (token) enter();

// ── Нэвтрэх (нэвтрэх нэр + нууц код → токен) ──
function doLogin() {
  var user = $('userInput').value.trim().toLowerCase(), pass = $('passInput').value.trim();
  if (!user || !pass) { loginMsg('Нэвтрэх нэр, нууц кодоо оруулна уу'); return; }
  if (!API_URL) {   // туршилтын горим
    if (pass !== '0000') { loginMsg('Туршилтын горимд код: 0000'); return; }
    token = 'demo'; ownerName = user; return enter();
  }
  $('loginBtn').disabled = true;
  loginMsg('Шалгаж байна...');
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ type: 'admin_login', user: user, pass: pass }) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      $('loginBtn').disabled = false;
      if (!d || d.status !== 'ok') {
        loginMsg(d && d.error === 'locked' ? 'Олон удаа буруу оруулсан — 15 минутын дараа оролдоно уу' : 'Нэвтрэх нэр эсвэл нууц код буруу байна');
        return;
      }
      token = d.token; ownerName = d.name;
      sessionStorage.setItem('nb_tok', token);
      sessionStorage.setItem('nb_owner', ownerName);
      $('passInput').value = '';
      enter();
    })
    .catch(function () { $('loginBtn').disabled = false; loginMsg('Интернэт холболтоо шалгана уу'); });
}
function loginMsg(t) { $('loginMsg').textContent = t; }
function enter() {
  fetchAll(function (ok) {
    if (!ok) return;
    $('login').style.display = 'none';
    $('main').style.display = '';
    $('ownerName').textContent = ownerName + (isOwner() ? '' : ' · Менежер');
    if (!isOwner() && KEYS.length === 1 && state.view === 'companies') { state.view = 'company'; state.biz = KEYS[0]; }   // ганц дэлгүүртэй менежер шууд дотогш
    render();
  });
}
function logout() { sessionStorage.removeItem('nb_tok'); sessionStorage.removeItem('nb_owner'); location.reload(); }
function authLost() {
  sessionStorage.removeItem('nb_tok'); token = '';
  $('main').style.display = 'none'; $('login').style.display = 'block';
  loginMsg('Нэвтрэлтийн хугацаа дууссан — дахин нэвтэрнэ үү');
}

function fetchAll(cb) {
  if (!API_URL) {
    records = load('nb_records', []); staff = []; salary = []; stockData = load('nb_demo_stock', {}); moves = load('nb_demo_moves', []);
    journal = load('nb_demo_journal', []); partners = load('nb_demo_partners', []); sheetProducts = load('nb_demo_products', []); applyProducts(); meta = load('nb_demo_meta', {});
    reminders = load('nb_demo_rem', []); window.adminOrders = load('nb_orders_cozy', []);
    bankLines = load('nb_demo_bank', []); window.payInfoAll = load('nb_demo_payinfo', {}); window.salesTargets = load('nb_demo_targets', {}); tasks = load('nb_demo_tasks', []); taxCfg = load('nb_demo_taxcfg', {}); customDocs = load('nb_demo_docs', []);
    accountsX = load('nb_demo_accx', []); applyCustomAccounts(accountsX); meta.lock = load('nb_demo_lock', '');
    window.loans = load('nb_demo_loans', []); window.pos = load('nb_demo_pos', []); window.bankLinks = load('nb_demo_banklinks', []);
    window.kpiCfg = load('nb_demo_kpi', {}); window.assets = load('nb_demo_assets', []); window.minStock = load('nb_demo_minstock', {});
    window.digestCfg = load('nb_demo_digest', { on: false, to: '' }); window.priceLog = load('nb_demo_pricelog', []); window.stockCounts = load('nb_demo_counts', []).filter(function (m) { return m.status === 'Хүлээгдэж'; }); window.reviewNotes = load('nb_review', {});
    applyRole(load('nb_demo_role', 'Эзэн'), load('nb_demo_rolebiz', 'all'));
    stamp(); cb(true); return;
  }
  post({ type: 'admin_read', from: '' }, function (err, d) {   // санхүүгийн тайланд бүх түүх хэрэгтэй
    if (err) { if (err !== 'auth') toast('Холбогдож чадсангүй'); cb(false); return; }
    records = d.records || []; staff = d.staff || []; salary = d.salary || []; stockData = d.stock || {}; moves = d.moves || [];
    Object.keys(stockData).forEach(function (b) { if (stockData[b]) [FEE_ITEM, DISC_ITEM, SPLIT_ITEM].forEach(function (k) { delete stockData[b][k]; }); });   // бараа биш мөрүүд
    journal = d.journal || []; partners = d.partners || []; sheetProducts = d.products || []; applyProducts(); meta = d.meta || {};
    reminders = d.reminders || []; window.adminOrders = d.orders || []; window.loans = d.loans || []; window.pos = d.pos || []; window.bankLinks = d.bankLinks || [];
    window.bankDeleted = (d.bank || []).filter(function (l) { return l.status === 'Устгасан'; }); bankLines = (d.bank || []).filter(function (l) { return l.status !== 'Устгасан'; }); window.payInfoAll = d.payInfo || {}; window.spAll = d.storepay || {}; window.ebOnAll = !!d.ebuuhia; window.salesTargets = d.targets || {}; tasks = d.tasks || []; taxCfg = d.taxcfg || {}; customDocs = d.docs || [];
    accountsX = d.accountsX || []; applyCustomAccounts(accountsX); meta.lock = d.lock || '';
    window.kpiCfg = d.kpi || {}; window.assets = d.assets || []; window.minStock = d.minstock || {};
    window.digestCfg = d.digest || { on: false, to: '' }; window.priceLog = d.priceLog || []; window.stockCounts = d.counts || [];
    window.reviewNotes = Object.assign(load('nb_review', {}), d.review || {});   // сервер түрүүлнэ; хадгалагдаагүй бол энэ төхөөрөмжийнх
    applyRole(d.role, d.roleBiz);
    stamp(); cb(true);
  });
}
function stamp() { $('updated').textContent = 'Шинэчилсэн: ' + timeStr(); }
// ── Хадгалах явц: сервер 2–5 с, дахин унших ~5 с — энэ хооронд «Хадгалж байна…» харуулж, товчийг түгжинэ (давхар дарахаас сэргийлнэ) ──
function busySet(d, msg, isPost) {   // isPost — хадгалж байх үед л товчийг түгжинэ (шинэчлэх үед ажиллаж болно)
  BUSY.n = Math.max(0, BUSY.n + d); if (isPost) BUSY.p = Math.max(0, BUSY.p + d); if (msg) BUSY.msg = msg;
  if (BUSY.p) BUSY.msg = 'Хадгалж байна…';
  var el = document.getElementById('busyPill');
  if (!el) { el = document.createElement('div'); el.id = 'busyPill'; document.body.appendChild(el); }
  el.textContent = BUSY.msg || 'Хадгалж байна…'; el.className = BUSY.n ? 'on' : '';
  document.body.classList.toggle('is-busy', BUSY.p > 0);
}
function refresh() {
  if (refreshing) { refreshAgain = true; return; }   // давхар шинэчлэлийг нэг болгоно
  refreshing = true; busySet(1, 'Шинэчилж байна…');
  fetchAll(function (ok) {
    refreshing = false; busySet(-1);
    if (refreshAgain) { refreshAgain = false; refresh(); return; }
    if (ok) { render(); toast('Шинэчлэгдлээ'); }
  });
}
function post(body, cb) {
  var key = JSON.stringify(body);   // яг ижил хүсэлт явж байхад дахин илгээхгүй
  if (INFLIGHT[key]) { toast('Хадгалж байна — түр хүлээнэ үү'); return; }
  INFLIGHT[key] = 1;
  var btn = document.activeElement && /^(BUTTON|A)$/.test(document.activeElement.tagName) ? document.activeElement : null;
  if (btn) btn.disabled = true;
  busySet(1, 'Хадгалж байна…', true);
  var done = function (err, d) { delete INFLIGHT[key]; if (btn) btn.disabled = false; busySet(-1, '', true); cb(err, d); };
  body.token = token;
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var err = d && d.status === 'ok' ? null : (d && d.error) || 'error';
      if (err === 'auth') authLost();
      if (err === 'locked') { toast('Энэ хугацааны гүйлгээ түгжигдсэн байна (Санхүү → Гүйлгээ түгжих)'); err = 'locked'; }
      done(err, d);
    })
    .catch(function () { done('network'); });
}

// ── Навигаци ──
function go(view, biz) {
  state.view = view;
  if (biz) state.biz = biz;
  render();
  window.scrollTo(0, 0);
}
function setModule(m) { state.module = m; render(); }
function setPeriod(p) { if (p === 'custom') { state.period = 'custom'; render(); return; } state.period = p; var r = range(); state.from = r[0]; state.to = r[1]; render(); }
function setDates() { state.period = 'custom'; state.from = $('pFrom').value || state.from; state.to = $('pTo').value || state.to; if (state.from > state.to) state.to = state.from; render(); }
function setSub(s) {
  // тухайн модульд байхгүй дэд хуудсыг (жишээ нь Санхүүгийн хуудсыг Борлуулалтад) нээвэл тохирох модульд шилжүүлнэ
  if (SUBS[state.module] && !SUBS[state.module].some(function (x) { return x[0] === s; })) {
    var mod = Object.keys(SUBS).filter(function (k) { return SUBS[k].some(function (x) { return x[0] === s; }); })[0];
    if (!mod) return;
    state.module = mod;
  }
  state.sub[state.module] = s; render(); window.scrollTo(0, 0);
}
function setStaffBiz(b) { state.staffBiz = b; render(); }
function setStaffSt(t) { state.staffSt = t; render(); }
function setMonth(m) { state.month = m; render(); }

function range() {
  var t = todayStr();
  if (state.period === 'today') return [t, t];
  if (state.period === 'yesterday') { var y = todayStr(new Date(Date.now() - 864e5)); return [y, y]; }
  if (state.period === 'week') return [todayStr(new Date(Date.now() - 6 * 864e5)), t];
  if (state.period === 'month') return [t.slice(0, 8) + '01', t];
  if (state.period === 'year') return [t.slice(0, 5) + '01-01', t];
  if (state.period === 'all') return ['2000-01-01', t];
  if (state.period === 'custom') return [state.from, state.to];
  return [todayStr(new Date(Date.now() - 29 * 864e5)), t];
}
function inRange(biz) {
  var r = range();
  return records.filter(function (x) { return x.date >= r[0] && x.date <= r[1] && (!biz || x.biz === biz); });
}
function sums(list) {
  var s = { sales: 0, cash: 0, card: 0, transfer: 0, credit: 0, exp: 0, n: 0 };
  list.forEach(function (x) {
    var a = Number(x.amount) || 0;
    if (x.type === 'sale') {
      s.sales += a; if (a > 0) s.n++;
      if (x.pay === 'Карт') s.card += a; else if (x.pay === 'Шилжүүлэг') s.transfer += a; else if (x.pay === 'Зээлээр' || x.pay === 'Урьдчилгаа' || x.pay === 'StorePay') s.credit += a; else s.cash += a;
    } else if (x.type === 'expense') s.exp += a;
  });
  return s;
}
function bizStaff(biz) { return staff.filter(function (s) { return staffIn(s, biz); }); }
// Хэд хэдэн дэлгүүрийн ажилтны цалин, гэрээ аль компанид бичигдэх: одоо нээсэн компани (эрхтэй бол) эсвэл эхнийх
function staffHome(s) { var L = staffBizes(s.biz); return L.indexOf(state.biz) >= 0 ? state.biz : (L[0] || KEYS[0]); }
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

// ── Үндсэн зураглал ──
function render() {
  window.__dash = null; window.__fin = null; DRILL = []; _debtCache = null; _jCache = null;
  var pend = staff.filter(function (s) { return s.status === 'Хүлээгдэж'; }).length;
  $('rail').innerHTML = railHtml(pend);
  $('subnav').innerHTML = state.view === 'tax' ? taxSubnav() : subnavHtml();
  $('main').classList.toggle('has-sub', state.view === 'company' || state.view === 'tax');
  $('crumb').innerHTML = crumbHtml();
  toggleNav(false);
  if (state.view === 'tax') $('view').innerHTML = taxView();
  else if (state.view === 'cal') $('view').innerHTML = calView();
  else if (state.view === 'docs') $('view').innerHTML = pageHead('Маягт, загвар', '<button class="b-btn primary" onclick="editDoc()">+ Шинэ маягт</button>') + docsModule();
  else if (state.view === 'staff') $('view').innerHTML = staffPage();
  else if (state.view === 'company') $('view').innerHTML = companyView();
  else $('view').innerHTML = companiesView();
  if (window.__dash) setTimeout(drawDash, 0);   // хянах самбарын график
  if (window.__fin) setTimeout(drawFin, 0);     // Санхүү → Үр дүн самбар
  if (state.view === 'company' && state.module === 'review') setTimeout(rvCharts, 0);
  var inCo = state.view === 'company' && BUSINESSES[state.biz];
  document.querySelector('.bz-head').style.boxShadow = inCo ? 'inset 0 2px 0 ' + BUSINESSES[state.biz].color : '';
  navTrack();
}

// ── Буцах: дэлгэц бүр хөтчийн түүхэнд бичигдэнэ — «← Буцах» болон утас/хөтчийн буцах товч өмнөх дэлгэц рүү ──
function navKey() {
  var co = state.view === 'company';
  return [state.view, co ? state.biz : '', co ? state.module : '', co ? state.sub[state.module] : '', state.view === 'staff' ? state.staffTab || '' : '',
          state.view === 'tax' ? taxState.ent + '/' + taxState.sub : ''].join('|');
}
function navTrack() {
  if (NAV.restoring) return;
  var k = navKey(); if (k === NAV.key) return;
  var first = !NAV.key; NAV.key = k;
  var snap = { view: state.view, biz: state.biz, module: state.module, sub: JSON.parse(JSON.stringify(state.sub)), staffTab: state.staffTab, tax: { ent: taxState.ent, sub: taxState.sub } };
  try {
    if (first) history.replaceState({ nb: snap, idx: NAV.idx }, '');
    else { NAV.idx++; history.pushState({ nb: snap, idx: NAV.idx }, ''); }
  } catch (e) {}
}
window.addEventListener('popstate', function (e) {
  var s = e.state && e.state.nb; if (!s || !token) return;
  NAV.restoring = true;
  state.view = s.view; state.biz = s.biz; state.module = s.module; state.sub = s.sub; state.staffTab = s.staffTab;
  if (s.tax) { taxState.ent = s.tax.ent; taxState.sub = s.tax.sub; }
  NAV.idx = e.state.idx || 0; NAV.key = navKey();
  [].forEach.call(document.querySelectorAll('.sheet.show'), function (el) { el.classList.remove('show'); });   // нээлттэй цонх хаагдана
  render(); window.scrollTo(0, 0);
  NAV.restoring = false;
});
function navBack() { if (NAV.idx > 0) history.back(); else go('companies'); }

// ── Baaz маягийн цэс: зүүн цэнхэр зурвас + бүлэглэсэн дэд цэс ──
var ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  review: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 16v-3M12 16V9M16 16v-5"/>',
  mgmt: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  sales: '<path d="M3 4h2l2.4 11h11.2L21 7H6"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
  products: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
  finance: '<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>',
  staff: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 4.5a3 3 0 010 6M21 20c0-2.6-1.4-4.4-3.6-5.1"/>',
  reports: '<path d="M6 2.5h9l5 5V21.5H6z"/><path d="M14.5 2.5V8H20M9 13h8M9 17h8"/>',
  docs: '<path d="M4 4h10v16H4z"/><path d="M14 8h6v12H8"/><path d="M7 8h4M7 11h4M7 14h3"/>',
  people: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
  logout: '<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  tax: '<path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21z"/><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3"/>',
  back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.7-2.5 2-2.5 4"/><circle cx="12" cy="17" r=".6"/>',
};
function ico(k) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + '</svg>'; }
var MODULES = [['review', 'Удирдлагын тойм'], ['sales', 'Борлуулалт'], ['products', 'Бараа материал'], ['finance', 'Санхүү'], ['reports', 'Бүх тайлан']];   // Ажилчид, Маягт — нийтлэг цэс (зүүн зурвас)   // Ажилчид — нэг нийтлэг цэс (зүүн зурвас)
function railHtml(pend) {
  var item = function (on, onclick, icon, label, extra) {
    return '<button class="' + (on ? 'on' : '') + '" onclick="' + onclick + '" title="' + label + '">' + ico(icon) + '<span>' + label + '</span>' + (extra || '') + '</button>';
  };
  var inCo = state.view === 'company';
  return '<div class="rail-logo" onclick="go(\'companies\')" title="Нүүр хуудас" style="cursor:pointer">N</div>' +
    (state.view !== 'companies' ? item(false, 'navBack()', 'back', 'Буцах') : '') +   // нүүр (компаниуд) хуудаснаас буцах шаардлагагүй
    (inCo ? '' : item(state.view === 'companies', "go('companies')", 'home', 'Компаниуд')) +   // компанийн дотор «Компаниуд» цэсгүй (лого, Буцах-аар гарна)
    (inCo && BUSINESSES[state.biz] ? bizModules(state.biz).map(function (m) { return item(state.module === m[0], "openModule('" + m[0] + "')", m[0], m[1]); }).join('') : '') +
    (inCo ? '' :   // компанийн дотор зөвхөн компанийн цэс; удирдлагын цэс нь «Компаниуд» түвшинд
    '<div class="rail-sep"></div>' +
    item(state.view === 'staff', "state.staffBiz=state.view==='company'?state.biz:state.staffBiz;go('staff')", 'people', 'Ажилчид', pend && isOwner() ? '<i class="dot">' + pend + '</i>' : '') +
    (isOwner() ? item(state.view === 'tax', 'openTax()', 'tax', 'Татвар, тайлан') + item(state.view === 'docs', "go('docs')", 'docs', 'Маягт') : '') +
    item(state.view === 'cal', 'openCal()', 'cal', 'Календарь', reminders.some(function (r) { return r.status === 'Хүлээгдэж' && r.date <= todayStr(); }) ? '<i class="dot">!</i>' : '') +
    '<div class="rail-foot">' + item(false, "window.open('guide.html','_blank')", 'help', 'Гарын авлага') + item(false, 'refresh()', 'refresh', 'Шинэчлэх') + item(false, 'logout()', 'logout', 'Гарах') + '</div>');
}
function bizModules(biz) { return BUSINESSES[biz] && BUSINESSES[biz].finOnly ? MODULES.filter(function (m) { return m[0] === 'finance'; }) : MODULES; }
function openMgmt() { state.view = 'company'; state.biz = 'mgmt'; state.module = 'finance'; render(); window.scrollTo(0, 0); }
// Дэд цэсний бүлгүүд (Baaz-ийн «Журнал / Мөнгөн хөрөнгө / Авлага өглөг / Санхүүгийн тайлан» шиг)
var MENU = {
  sales: [['Бүртгэл', ['receipts', 'orders', 'buuhia']], ['Шинжилгээ', ['item', 'cat', 'staff', 'day', 'pay', 'disc', 'slow', 'boost']], ['Татвар', ['ebarimt']]],
  products: [['Бүртгэл', ['catalog', 'stock', 'in', 'counts']], ['Худалдан авалт', ['po', 'suppliers']], ['Тайлан', ['move', 'prices']]],
  // Санхүү — цөөн, ойлгомжтой цэс. Нягтлангийн тайлан, тохиргоо нь тус бүр нэг хуудсанд цуглуулагдсан (finance.js HUBS)
  // Санхүү — Excel «Санхүүгийн бүртгэлийн файл»-ын дарааллаар дугаартай 10 хуудас; бусад нь «Бусад» нэг хуудсанд (finance.js HUBS.other)
  // Санхүү — албан санхүүгийн програмын бүлэглэл: Мөнгө · Тооцоо · Тайлан · Нягтлан
  finance: [['Мөнгө', ['ledger', 'cashacc', 'bank', 'money']], ['Тооцоо', ['recv', 'payb', 'debts', 'loans', 'payroll', 'requests']], ['Тайлан', ['daily', 'expcat', 'cashflow', 'months']], ['Нягтлан', ['journal', 'accounts', 'other']]],
};
function subLabel(mod, k) { var x = (SUBS[mod] || []).filter(function (s) { return s[0] === k; })[0]; return x ? x[1] : k; }
function subGroup(mod, k) { var g = (MENU[mod] || []).filter(function (g) { return g[1].indexOf(k) >= 0; })[0]; return g ? g[0] : mod === 'finance' && hubOf(k) ? HUBS[hubOf(k)][0] : ''; }
function subnavHtml() {
  if (state.view !== 'company') return '';
  var B = BUSINESSES[state.biz], mod = state.module;
  var head = '<div class="sub-co"><span class="mono" style="--co:' + B.color + '">' + B.icon + '</span><div><small>Компани</small><b>' + esc(B.name) + '</b>' +
    (ALL_KEYS.length > 1 ? '<select onchange="if(this.value)go(\'company\',this.value)"><option value="" selected>Компани солих</option>' + ALL_KEYS.filter(function (k) { return k !== state.biz; }).map(function (k) {
      return '<option value="' + k + '">' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '</select>' : '') + '</div></div>' +
    '<div class="sub-title">' + MODULES.filter(function (m) { return m[0] === mod; })[0][1] + '</div>';
  if (!MENU[mod]) {
    var one = mod === 'staff' ? [['Ажилчид', 'Ажилчид, цалин']] : mod === 'review' ? [['review', 'Сарын тойм']] : mod === 'docs' ? [['docs', 'Маягт, загвар']] : [['reports', 'Бүх тайлан']];
    return head + '<ul class="sub-list"><li><button class="on">' + one[0][1] + '</button></li></ul>' + moduleSwitch();
  }
  var shut = load('nb_sg_shut', {});   // хураасан бүлгүүд (энэ төхөөрөмжид)
  return head + MENU[mod].map(function (g, gi) {
    var ks = g[1].filter(function (k) { return subVisible(state.biz, k); });
    if (!ks.length) return '';
    var isOn = function (k) { return state.sub[mod] === k || (mod === 'finance' && (hubOf(state.sub[mod]) === k || hubOf(hubOf(state.sub[mod])) === k)); };
    var closed = shut[mod + gi] && !ks.some(isOn);
    var badges = ks.reduce(function (a, k) { return a + navCount(k); }, 0);
    return '<div class="sg' + (closed ? ' closed' : '') + '"><button class="sg-h" onclick="sgToggle(\'' + mod + gi + '\')"><span>' + g[0] + '</span>' +
      (closed && badges ? '<i class="nb-badge">' + badges + '</i>' : '') + '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<ul class="sub-list">' + ks.map(function (k) {
        return '<li><button class="' + (isOn(k) ? 'on' : '') + '" onclick="setSub(\'' + k + '\')"><span class="si">' + subIco(k) + '</span><span class="sl">' + subLabel(mod, k) + '</span>' + navBadge(k) + '</button></li>';
      }).join('') + '</ul></div>';
  }).join('') + moduleSwitch();
}
// Тухайн компанид хамааралгүй дэд хуудсыг нууна (захиалгагүй бол «Захиалга», И-баримтгүй бол «И-баримт тулгалт»)
function subVisible(biz, k) {
  var B = BUSINESSES[biz] || {};
  if (k === 'orders' || k === 'customers') return !!B.orders;
  if (k === 'buuhia') return !!B.orders && !!window.ebOnAll;
  if (k === 'daily') return !B.finOnly;   // удирдлагын өөрийн санхүүд борлуулалт байхгүй
  if (k === 'ebarimt') return B.ebarimt !== false;
  if (B.finOnly && /^(simple|months|profit|payroll|expenses|assets|requests)$/.test(k)) return false;   // Удирдлага: үр дүн, бараа, ажилчидгүй
  if (!isOwner() && /^(payroll|loans|setup|banklink|opening|accounts|lock|close|assets|digest)$/.test(k)) return false;   // менежерт эзний хуудас харагдахгүй
  return true;
}
function moduleSwitch() {   // утсан дээр зүүн зурвас нуугдах тул модуль солих товчнууд
  return '<div class="sub-mods">' + bizModules(state.biz).map(function (m) {
    return '<button class="' + (state.module === m[0] ? 'on' : '') + '" onclick="openModule(\'' + m[0] + '\')">' + m[1] + '</button>';
  }).join('') + '<button onclick="go(\'companies\')">← Компаниуд</button></div>';
}
function openModule(m) { if (!state.biz) return go('companies'); state.view = 'company'; state.module = m; render(); window.scrollTo(0, 0); }
function toggleNav(on) { $('main').classList.toggle('nav-open', !!on); }
function crumbHtml() {
  if (state.view === 'companies') return '<b>Миний компаниуд</b>';
  if (state.view === 'staff') return '<b>Ажилчид</b>';
  if (state.view === 'cal') return '<b>Календарь</b>';
  if (state.view === 'docs') return '<b>Маягт, загвар</b>';
  if (state.view === 'tax') return '<span>' + esc(ENTITIES[taxState.ent].name) + '</span><i>/</i><b>Татвар, тайлан</b>';
  var B = BUSINESSES[state.biz], mod = state.module, parts = [MODULES.filter(function (m) { return m[0] === mod; })[0][1]];
  if (MENU[mod]) { var sg = subGroup(mod, state.sub[mod]); if (sg && sg !== parts[0]) parts.push(sg); parts.push(subLabel(mod, state.sub[mod])); }   // Модуль / Бүлэг / Хуудас
  return '<span class="crumb-co"><span class="mono" style="--co:' + B.color + '">' + B.icon + '</span><span class="nm">' + esc(B.name) + '</span></span><i>/</i>' +
    parts.map(function (p, i) { return i === parts.length - 1 ? '<b>' + p + '</b>' : '<span>' + p + '</span>'; }).join('<i>/</i>');
}
function pageHead(title, actions, withPeriod) {
  return '<div class="pg-head"><h1>' + title + '</h1><div class="pg-act">' + (actions || '') + '</div></div>' + (withPeriod ? periodBar() : '');
}

// ── Миний компаниуд ──
function companiesView() {
  var t = todayStr(), m = t.slice(0, 8) + '01';
  return remAlerts() + (isOwner() ? taxAlerts() + archiveAlerts() : '') + '<h2 class="sec-title">' + (isOwner() ? 'Миний компаниуд' : 'Дэлгүүр') + '</h2><div class="co-grid">' + KEYS.map(function (k) {
    var B = BUSINESSES[k], E = (window.EBARIMT || {})[k] || {};
    var today = sums(records.filter(function (x) { return x.biz === k && x.date === t; }));
    var month = sums(records.filter(function (x) { return x.biz === k && x.date >= m; }));
    var st = bizStaff(k);
    var active = st.filter(function (s) { return s.status === 'Тийм'; }).length;
    var pend = st.filter(function (s) { return s.status === 'Хүлээгдэж'; }).length;
    return '<div class="co-card" style="--co:' + B.color + '">' +
      '<div class="co-head"><span class="mono" style="--co:' + B.color + '">' + B.icon + '</span><div><b>' + esc(B.name) + '</b>' +
      '<small>' + (E.merchantTin ? esc(E.legalName || '') + ' · ТТД ' + esc(E.merchantTin) : 'И-баримтгүй') + '</small></div></div>' +
      '<div class="co-stats">' +
      '<div><span>Өнөөдөр</span><b>' + fmt(today.sales) + '</b></div>' +
      '<div><span>Энэ сар</span><b>' + fmt(month.sales) + '</b></div>' +
      '<div><span>Цэвэр (сар)</span><b style="color:' + (month.sales - month.exp >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(month.sales - month.exp) + '</b></div>' +
      '<div><span>Ажилчид</span><b>' + active + (pend ? ' <span class="tag r">+' + pend + ' хүлээгдэж</span>' : '') + '</b></div>' +
      '</div>' +
      '<div class="co-meta"><span class="tag">Хэвийн</span>' + (E.merchantTin ? ' <span class="tag b">И-баримт</span>' : '') + pendTags(k) +
      '</div>' +
      '<button class="btn" style="background:' + B.color + '" onclick="go(\'company\',\'' + k + '\')">Нэвтрэх →</button>' +
      '</div>';
  }).join('') + '</div>' + (isOwner() ? mgmtCard() : '');
}
// Удирдлагын санхүү (зөвхөн удирдлага харна) — мөнгө, зээл, компаниудтай тооцоо
function mgmtCard() {
  var b = balances(buildJournal('mgmt', R()), todayStr()), cash = ACCOUNTS.filter(function (a) { return a[3] === 'cash'; }).reduce(function (s, a) { return s + (b[a[0]] || 0); }, 0);
  var links = (window.bankLinks || []).filter(function (l) { return l.biz === 'mgmt'; }).length;
  return '<h2 class="sec-title">Удирдлага</h2><div class="co-grid"><div class="co-card" style="--co:#374151">' +
    '<div class="co-head"><span class="mono" style="--co:#374151">У</span><div><b>Удирдлагын санхүү</b><small>Удирдлагын өөрийн данс, зээл, компаниудтай тооцоо</small></div></div>' +
    '<div class="co-stats"><div><span>Мөнгө</span><b>' + fmt(cash) + '</b></div><div><span>Авсан зээл</span><b>' + fmt(-(b['3501'] || 0)) + '</b></div>' +
    '<div><span>Өгсөн зээл</span><b>' + fmt(b['1210'] || 0) + '</b></div><div><span>Холбосон данс</span><b>' + links + '</b></div></div>' +
    '<button class="btn" style="background:#374151" onclick="openMgmt()">Нэвтрэх →</button></div></div>';
}

// ── Компанийн дотор: модуль → дэд цэс → хуудас ──
function companyView() {
  if (BUSINESSES[state.biz] && BUSINESSES[state.biz].finOnly && state.module !== 'finance') state.module = 'finance';
  var mod = state.module;
  if (MENU[mod] && (!subVisible(state.biz, state.sub[mod]) || !hubOf(state.sub[mod]) && !(SUBS[mod] || []).some(function (x) { return x[0] === state.sub[mod]; }))) {   // хассан хуудас (хуучин түүхээс) үлдэхгүй   // компани солиход хамааралгүй хуудас үлдэхгүй — эхний харагдах хуудас
    var first = []; MENU[mod].forEach(function (g) { g[1].forEach(function (k) { if (subVisible(state.biz, k)) first.push(k); }); });
    state.sub[mod] = first[0] || MENU[mod][0][1][0];
  }
  if (mod === 'staff') return pageHead('Ажилчид', '') + staffView(state.biz);
  if (mod === 'review') return reviewView();
  if (mod === 'reports') return pageHead('Бүх тайлан', '<button class="b-btn primary" onclick="exportAll()">Бүх тайланг Excel-ээр татах</button>', true) + reportsModule();
  var sub = state.sub[mod], noPeriod = /^(counts|requests|accounts|stock|suppliers|catalog|close|bank|opening|lock|aging_r|aging_p|monthly|glossary|months|payroll|debts|acct|setup|loans|banklink|po|assets|customers|digest|other|recv|payb|buuhia)$/.test(sub);   // авлага, өглөг — өнөөдрийн байдлаар (хугацаагаар шүүхгүй)
  var acts = /^(counts|requests|overview|dash|stock|close|bank|opening|lock|simple|monthly|glossary|acct|setup|loans|banklink|po|assets|digest|other|daily|expcat|cashacc)$/.test(sub) ? '' : '<button class="b-btn" onclick="exportCurrent()">Excel</button><button class="b-btn" onclick="window.print()">Хэвлэх</button>';
  if (sub === 'money') acts = '<button class="b-btn primary" onclick="openVoucher(\'ХО\')">+ Орлого (банк)</button><button class="b-btn primary" onclick="openVoucher(\'ХЗ\')">+ Зарлага (банк)</button>' +
    '<button class="b-btn" onclick="openVoucher(\'КО\')">+ Орлого (касс)</button><button class="b-btn" onclick="openVoucher(\'КЗ\')">+ Зарлага (касс)</button>' + acts;
  if (sub === 'recv' || sub === 'payb' || sub === 'debts') acts = '<button class="b-btn primary" onclick="openRem(null,{kind:state.sub.finance===\'recv\'?\'Авлага нэхэх\':\'Өглөг төлөх\'})">+ Сануулга</button><button class="b-btn" onclick="openPartner()">+ Харилцагч</button>' +
    '<button class="b-btn" onclick="openEntry()">Гараар бичих</button>' + acts;
  if (sub === 'payroll') acts = '<button class="b-btn primary" onclick="openTax(entOf(state.biz),\'payroll\')">Цалин бодох</button><button class="b-btn" onclick="openTax(entOf(state.biz),\'nd8\')">НДШ тайлан</button>' +
    '<button class="b-btn" onclick="openTax(entOf(state.biz),\'tt11\')">ТТ-11</button>' + acts;
  if (sub === 'entry') acts = '<button class="b-btn primary" onclick="openEntry()">+ Журналын бичилт</button>' + acts;
  if (sub === 'vouchers') acts = '<button class="b-btn primary" onclick="openVoucher(\'КО\')">+ Кассын орлого</button><button class="b-btn primary" onclick="openVoucher(\'КЗ\')">+ Кассын зарлага</button>' +
    '<button class="b-btn" onclick="openVoucher(\'ХО\')">+ Харилцахын орлого</button><button class="b-btn" onclick="openVoucher(\'ХЗ\')">+ Харилцахын зарлага</button>' + acts;
  if (sub === 'accounts') acts = '<button class="b-btn primary" onclick="accEdit()">+ Данс нэмэх</button>';
  if (sub === 'bank') acts = '<button class="b-btn primary" onclick="$(\'bankFile\').click()">Хуулга оруулах (Excel)</button><button class="b-btn" onclick="setSub(\'banklink\')">Данс холбох</button>';
  if (sub === 'loans') acts = '<button class="b-btn primary" onclick="openLoan(null,\'Авсан\')">+ Авсан зээл</button><button class="b-btn primary" onclick="openLoan(null,\'Өгсөн\')">+ Өгсөн зээл</button>';
  if (sub === 'cashacc') acts = '<button class="b-btn primary" onclick="openBankLink()">+ Банкны данс нэмэх</button><button class="b-btn" onclick="setSub(\'bank\')">Хуулга оруулах</button>';
  if (sub === 'banklink') acts = '<button class="b-btn primary" onclick="openBankLink()">+ Данс холбох</button>';
  if (sub === 'po') acts = '<button class="b-btn primary" onclick="openPo()">+ Шинэ захиалга</button>';
  if (sub === 'assets') acts = '<button class="b-btn primary" onclick="openAsset()">+ Хөрөнгө бүртгэх</button>';
  var xl = '<button class="b-btn" onclick="$(\'prodFile\').click()">Excel-ээр бүртгэх</button><a class="b-btn" href="templates/baraa_burtgel.xlsx" download>Загвар татах</a>';
  if (sub === 'catalog') acts = '<button class="b-btn primary" onclick="openProduct()">+ Шинэ бараа</button>' + xl + acts;
  if (sub === 'partners' || sub === 'suppliers') acts = '<button class="b-btn primary" onclick="openPartner()">+ Харилцагч</button>' + (sub === 'partners' ? '<button class="b-btn" onclick="openRem(null,{kind:\'Өглөг төлөх\'})">+ Сануулга</button>' : '') + acts;
  if (sub === 'stock') acts = '<button class="b-btn primary" onclick="openMove(\'Орлого\')">+ Орлого</button>' + xl +
    (hasWarehouse(state.biz) ? '<button class="b-btn" onclick="openMove(\'Шилжүүлэг\')">Шилжүүлэг</button>' : '') +
    '<button class="b-btn" onclick="openMove(\'Тооллого\')">Тооллого</button><button class="b-btn" onclick="openMove(\'Хасалт\')">Хасалт</button>' +
    '<button class="b-btn" onclick="exportCurrent()">Excel</button>';
  var help = mod === 'finance' && REP_HELP[sub] ? '<p class="rep-help">' + REP_HELP[sub] + '</p>' : '';
  return pageHead(subLabel(mod, sub), acts, false) + (mod === 'finance' ? hubBar(sub) : '') + help + (!noPeriod ? periodBar() : '') + subBody();
}
var PERIODS = [['today', 'Өнөөдөр'], ['yesterday', 'Өчигдөр'], ['week', 'Сүүлийн 7 хоног'], ['month', 'Энэ сар'], ['last30', 'Сүүлийн 30 хоног'], ['year', 'Энэ он'], ['all', 'Бүх хугацаа'], ['custom', 'Огноо сонгох']];
function periodBar() {
  var r = range();
  return '<div class="filter"><label>Хугацаа<select onchange="setPeriod(this.value)">' + PERIODS.map(function (p) {
    return '<option value="' + p[0] + '"' + (state.period === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></label>' +
    '<label>Эхлэх<input type="date" id="pFrom" value="' + (state.period === 'all' ? '' : r[0]) + '" onchange="setDates()"></label>' +
    '<label>Дуусах<input type="date" id="pTo" value="' + r[1] + '" onchange="setDates()"></label></div>';
}

// Борлуулалт
// ── Борлуулалтын зорилт (сар бүр, дэлгүүр болон ажилтнаар) ──
function tgtKey(biz, mo) { return biz + '|' + (mo || todayStr().slice(0, 7)); }
function editTarget(biz, staffName) {
  var mo = todayStr().slice(0, 7), key = tgtKey(biz, mo), all = JSON.parse(JSON.stringify(window.salesTargets || {})), T = all[key] = all[key] || { total: 0, staff: {} };
  T.staff = T.staff || {};
  var cur = staffName ? T.staff[staffName] : T.total;
  var v = prompt((staffName ? staffName + '-ийн ' : 'Дэлгүүрийн ') + mo + ' сарын борлуулалтын зорилт (₮). Хоосон бол устгана:', cur || '');
  if (v === null) return;
  v = Math.round(Number(String(v).replace(/[^\d.]/g, '')) || 0);
  if (staffName) { if (v) T.staff[staffName] = v; else delete T.staff[staffName]; } else T.total = v;
  // хуучин саруудын (3+ сар) зорилтыг цэвэрлэнэ — Script Property-ийн хэмжээ хязгаартай
  var lim = todayStr(new Date(Date.now() - 100 * 864e5)).slice(0, 7);
  Object.keys(all).forEach(function (k) { if (k.split('|')[1] < lim) delete all[k]; });
  window.salesTargets = all;
  if (!API_URL) { save('nb_demo_targets', all); render(); return; }
  post({ type: 'admin_setting', key: 'targets', value: all }, function (err) { if (err) toast('Алдаа: ' + err); else toast('Зорилт хадгалагдлаа'); render(); });
}
// ── Баримтын дэлгэрэнгүй (удирдлага) ──
function openBillAdm(key) {
  var L = records.filter(function (x) { return x.type === 'sale' && billKey(x) === key; }); if (!L.length) return;
  var o = groupBills(L)[0], ce = costEngine(L[0].biz, R());
  var rows = L.map(function (x) {
    var cs = Number(ce.rec[x.id] || 0);
    return '<tr><td>' + esc(x.item) + (x.note && !/^ДДТД/.test(x.note) ? '<small class="muted">' + esc(x.note) + '</small>' : '') + '</td><td class="n">' + (isAdj(x.item) ? '' : Math.abs(x.qty) + ' × ' + fmt(x.price)) + '</td><td>' + esc(x.pay || '') + '</td>' +
      '<td class="n' + (x.amount < 0 ? ' neg' : '') + '">' + (x.amount < 0 ? '−' + fmt(-x.amount) : fmt(x.amount)) + '</td><td class="n muted">' + (cs ? fmt(cs) : '') + '</td></tr>';
  }).join('');
  var cogs = L.reduce(function (a, x) { return a + Number(ce.rec[x.id] || 0); }, 0);
  var ord = (window.adminOrders || []).filter(function (d) { return d.id === key; })[0];
  var html = '<div class="bar-row"><h2 style="margin:0">Баримт</h2><span style="display:flex;gap:6px">' +
    (ord ? '<button class="b-btn ghost" onclick="goOrder(' + esc(JSON.stringify(ord.id)) + ')">Захиалгыг нээх</button>' : '') +
    '<button class="b-btn ghost" onclick="closeSheet(\'billAdmSheet\')">Хаах</button></span></div>' +
    '<p class="muted" style="margin:6px 0 10px">' + esc(o.date + ' ' + o.time) + ' · ' + esc(o.staff) + (o.customer ? ' · ' + esc(o.customer) : '') + (o.ddtd ? ' · ДДТД ' + esc(o.ddtd) : '') + '</p>' +
    '<div class="scroll"><table class="rep-t"><tr><th>Мөр</th><th class="n">Тоо × үнэ</th><th>Төлбөр</th><th class="n">Дүн</th><th class="n">Өртөг</th></tr>' + rows +
    '<tr class="tot"><td>Нийт</td><td></td><td>' + esc(payText(o.pays)) + '</td><td class="n">' + fmt(o.net) + '</td><td class="n">' + (cogs ? fmt(cogs) : '') + '</td></tr></table></div>' +
    (cogs ? '<p class="muted" style="margin-top:8px">Энэ баримтын ашиг: <b>' + fmt(o.net - cogs) + '</b> (' + (o.net ? Math.round((o.net - cogs) / o.net * 100) : 0) + '%)</p>' : '');
  if (!$('billAdmSheet')) document.body.insertAdjacentHTML('beforeend', '<div class="sheet" id="billAdmSheet" onclick="if(event.target===this)closeSheet(\'billAdmSheet\')"><div class="panel" id="billAdmPanel" style="max-width:720px"></div></div>');
  $('billAdmPanel').innerHTML = html; openSheet('billAdmSheet');
}
// «Захиалга» хуудсанд тухайн захиалгыг утсаар нь шүүж харуулна
function goOrder(id) {
  var d = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; if (!d) return;
  closeSheet('billAdmSheet'); state.ordF = 'all'; setSub('orders');
  var inp = document.querySelector('#view .filter .search'); if (inp) { inp.value = d.phone; rowSearch(inp); }
}
// Хайлт: хүснэгтийн мөрийг шууд шүүнэ (дахин зурахгүй). Хайж байхад «Нийт» мөр нуугдана.
function searchBox(ph) {
  return '<div class="filter" style="margin-bottom:10px"><label>Хайх<input class="search" type="search" placeholder="' + ph + '" oninput="rowSearch(this)" style="min-width:280px"></label><small class="muted" id="srCount" style="align-self:center"></small></div>';
}
function rowSearch(inp, scope) {
  var q = String(inp.value).toLowerCase().trim(), n = 0, tot = 0;
  [].forEach.call(document.querySelectorAll((scope || '#view .card.rep') + ' table tr'), function (tr) {
    if (tr.querySelector('th')) return;
    if (tr.classList.contains('tot')) { tr.style.display = q ? 'none' : ''; return; }
    tot++; var hit = !q || tr.textContent.toLowerCase().indexOf(q) >= 0; tr.style.display = hit ? '' : 'none'; if (hit) n++;
  });
  var c = $('srCount'); if (c) c.textContent = q ? n + ' / ' + tot + ' олдлоо' : '';
}
function kpi(label, val, sub) {
  return '<div class="biz"><div class="muted">' + label + '</div><div class="rev">' + val + '</div>' + (sub ? '<div class="muted">' + sub + '</div>' : '') + '</div>';
}
function topProducts(sales, n) {
  var prod = {};
  sales.forEach(function (x) {
    var key = x.item;
    if (!prod[key]) prod[key] = { item: x.item, qty: 0, unit: x.unit, amount: 0 };
    prod[key].qty += Number(x.qty) || 0; prod[key].amount += Number(x.amount) || 0;
  });
  var top = Object.keys(prod).map(function (k) { return prod[k]; }).filter(function (p) { return p.amount > 0; })
    .sort(function (a, b) { return b.amount - a.amount; }).slice(0, n);
  var max = top.length ? top[0].amount : 1;
  return top.length ? '<tr><th>Бараа</th><th class="n">Тоо</th><th class="n">Дүн</th></tr>' + top.map(function (p) {
    return '<tr><td>' + esc(p.item) + '<div class="bar"><i style="width:' + Math.round(p.amount / max * 100) + '%"></i></div></td>' +
      '<td class="n">' + round2(p.qty) + ' ' + esc(p.unit) + '</td><td class="n">' + fmt(p.amount) + '</td></tr>';
  }).join('') : '<tr><td class="muted">Борлуулалт алга</td></tr>';
}
function recordRows(list) {
  return list.length ? '<tr><th>Огноо</th><th>Төрөл</th><th>Дэлгэрэнгүй</th><th>Ажилтан</th><th class="n">Дүн</th><th></th></tr>' + list.map(function (x) {
    var tag, detail, amt;
    if (x.type === 'sale') {
      tag = '<span class="tag' + (x.amount < 0 ? ' r' : '') + '">' + (x.amount < 0 ? 'Буцаалт' : 'Борлуулалт') + '</span>';
      detail = esc(x.item) + ' · ' + round2(x.qty) + ' ' + esc(x.unit) + ' · ' + esc(x.pay) + (/ДДТД/.test(x.note || '') ? ' · И-баримт' : '');
      amt = (x.amount < 0 ? '−' + fmt(-x.amount) : '+' + fmt(x.amount));
    } else if (x.type === 'collect') {
      tag = '<span class="tag">Төлбөр орсон</span>'; detail = esc(x.customer || '') + ' · ' + esc(x.pay); amt = '+' + fmt(x.amount);
    } else if (x.type === 'attend') {
      tag = '<span class="tag">Ирц</span>'; detail = esc(x.item); amt = '';
    } else if (x.type === 'boost') {
      tag = '<span class="tag">Boost</span>'; detail = esc(x.item) + (x.unit === 'USD' ? ' · $' + x.price : '') + (x.qty ? ' · ' + x.qty + ' хоног' : '') + (x.note ? ' · ' + esc(x.note) : ''); amt = fmt(x.amount);
    } else if (x.type === 'expense') {
      tag = '<span class="tag r">Зарлага</span>'; detail = esc(x.category) + (x.note ? ' · ' + esc(x.note) : ''); amt = '−' + fmt(x.amount);
    } else {
      tag = '<span class="tag b">Касс</span>'; detail = 'Тоолсон ' + fmt(x.counted) + (x.diff ? ' · зөрүү ' + fmt(x.diff) : ''); amt = fmt(x.amount);
    }
    // И-баримттай борлуулалтыг зөвхөн дэлгүүрээс «Баримт буцаах»-аар; бусдыг удирдагч цуцалж болно
    var canCancel = !(x.type === 'sale' && /ДДТД/.test(x.note || ''));
    return '<tr><td>' + esc(x.date) + ' ' + esc(x.time) + '</td><td>' + tag + '</td><td>' + detail + '</td><td>' + esc(x.staff) + '</td><td class="n">' + amt + '</td>' +
      '<td class="n">' + (canCancel ? '<button class="mini" onclick="cancelRecord(\'' + esc(x.id) + '\')">Цуцлах</button>' : '') + '</td></tr>';
  }).join('') : '<tr><td class="muted">Бичлэг алга</td></tr>';
}

// Бараа материал
var LOW_STOCK = 2;   // ийм ба түүнээс бага бол «цөөн»
function hasWarehouse(biz) {
  if (BUSINESSES[biz] && BUSINESSES[biz].warehouse) return true;   // config.js: дэлгүүр + агуулахтай
  var st = stockData[biz] || {};
  return Object.keys(st).some(function (k) { return st[k].wh; });
}
// ── Доод үлдэгдэл: үүнээс бага (захиалсан ирээгүйг нэмээд) болбол «Захиалах» ──
function minOf(biz, name) { return Number(((window.minStock || {})[biz] || {})[name]) || 0; }
function onOrder(biz) {   // ирээгүй бараа захиалгын тоо
  var o = {};
  (window.pos || []).forEach(function (P) { if (P.biz === biz && P.status === 'Захиалсан') (P.items || []).forEach(function (i) { o[i.name] = (o[i.name] || 0) + (Number(i.qty) || 0); }); });
  return o;
}
function needList(biz) {
  var oo = onOrder(biz);
  return stockRows(biz).filter(function (r) { var mn = minOf(biz, r.name); return mn > 0 && round2(r.shop + r.wh) + (oo[r.name] || 0) <= mn; });
}
function msSave() {
  var biz = state.biz, cfg = JSON.parse(JSON.stringify((window.minStock || {})[biz] || {}));
  [].forEach.call(document.querySelectorAll('.ms-in'), function (i) { var v = Number(i.value) || 0; if (v > 0) cfg[i.dataset.k] = v; else delete cfg[i.dataset.k]; });
  var done = function () { window.minStock = window.minStock || {}; window.minStock[biz] = cfg; state.msEdit = false; state.msQ = ''; render(); toast('Доод үлдэгдэл хадгалагдлаа'); };
  if (!API_URL) { var all = load('nb_demo_minstock', {}); all[biz] = cfg; save('nb_demo_minstock', all); done(); return; }
  post({ type: 'admin_setting', key: 'minstock', biz: biz, value: cfg }, function (err) {
    if (err) { toast(err === 'too_big' ? 'Хэт олон бараа — зөвхөн тогтмол захиалдаг бараандаа тохируулна уу' : 'Алдаа: ' + err); return; }
    done();
  });
}
function poFromLow() {   // «Захиалах» бараагаар захиалгын ноорог (сүүлд авсан үнэ, нийлүүлэгчээр)
  var biz = state.biz, lb = lastBuys(biz), oo = onOrder(biz), cur = load('nb_cur', 'CNY'), sup = {};
  var items = needList(biz).map(function (r) {
    var b = lb[r.name] || {};
    if (b.partner) sup[b.partner] = 1;
    return { name: r.name, qty: poSuggest(biz, r, oo), price: b.buy && (b.cur || 'MNT') === cur ? b.buy : '' };
  });
  if (!items.length) { toast('Захиалах бараа алга'); return; }
  var sp = Object.keys(sup);
  openPo(null, { items: items, supplier: sp.length === 1 ? sp[0] : '', note: 'Доод үлдэгдлээс' });
}
function stockRows(biz) {
  var B = BUSINESSES[biz], st = stockData[biz] || {};
  var rows = B.products.map(function (p) {
    var s = st[p.name] || { shop: 0, wh: 0 };
    return { name: p.name, cat: p.cat || '', price: p.price, cls: p.cls, unit: p.unit, shop: s.shop, wh: s.wh, cost: s.cost || 0 };
  });
  var known = {};
  rows.forEach(function (r) { known[r.name] = 1; });
  Object.keys(st).forEach(function (k) { if (!known[k]) rows.push({ name: k, cat: '', price: 0, cls: '', unit: B.unit, shop: st[k].shop, wh: st[k].wh, cost: st[k].cost || 0 }); });
  return rows;
}
function productsModule() {
  var biz = state.biz, B = BUSINESSES[biz];
  var tracked = moves.some(function (m) { return m.biz === biz; }) || Object.keys(stockData[biz] || {}).length > 0;
  var wh = hasWarehouse(biz);
  var sold = {};
  inRange(biz).forEach(function (x) {
    if (x.type !== 'sale') return;
    var k = String(x.item).replace(/ \(буцаалт\)$/, '');
    if (!sold[k]) sold[k] = { qty: 0, amount: 0 };
    sold[k].qty += Number(x.qty) || 0; sold[k].amount += Number(x.amount) || 0;
  });
  var rows = stockRows(biz), lb = lastBuys(biz);
  var q = state.q.toLowerCase();
  var total = function (r) { return round2(r.shop + r.wh); };
  var cntLow = rows.filter(function (r) { return total(r) > 0 && total(r) <= LOW_STOCK; }).length;
  var cntOut = rows.filter(function (r) { return total(r) <= 0; }).length;
  var list = rows.filter(function (r) {
    if (q && r.name.toLowerCase().indexOf(q) < 0 && r.cat.toLowerCase().indexOf(q) < 0) return false;
    if (state.stockF === 'low') return total(r) > 0 && total(r) <= LOW_STOCK;
    if (state.stockF === 'out') return total(r) <= 0;
    if (state.stockF === 'in') return total(r) > 0;
    return true;
  });
  var banner = '';
  var stockVal = rows.reduce(function (a, r) { return a + Math.max(0, total(r)) * (r.price || 0); }, 0);
  var costVal = rows.reduce(function (a, r) { return a + Math.max(0, total(r)) * (r.cost || 0); }, 0);
  var how = '<p class="hint">Хөдөлгөөнийг дээд талын товчоор бүртгэнэ: <b>+ Орлого</b> — бараа авах (өртөгтэй)' + (wh ? ', <b>Шилжүүлэг</b> — агуулах ↔ дэлгүүр' : '') +
    ', <b>Тооллого</b> — бодит тоо оруулах, <b>Хасалт</b> — гэмтэл, хорогдол. Борлуулалт (захиалга) <b>дэлгүүрийн</b> үлдэгдлээс автоматаар хасагдана' +
    (wh ? ' — агуулахаас гаргахдаа эхлээд «Шилжүүлэг» хийнэ' : '') + '. Түүхийг доор «Хөдөлгөөний түүх», дэлгэрэнгүйг «Хөдөлгөөний тайлан»-аас харна.</p>';
  return banner + how +
    '<div class="kpis">' + kpi('Бараа', rows.length) + kpi('Үлдэгдэл · өртгөөр', fmt(costVal)) + kpi('Үлдэгдэл · зарах үнээр', fmt(stockVal)) +
    kpi('Цөөн үлдсэн (≤' + LOW_STOCK + ')', cntLow) + kpi('Дууссан', cntOut) + '</div>' +
    '<div class="card"><div class="bar-row"><div class="tabs">' +
    [['all', 'Бүгд'], ['in', 'Үлдэгдэлтэй'], ['low', 'Цөөн'], ['out', 'Дууссан']].map(function (t) {
      return '<button class="' + (state.stockF === t[0] ? 'on' : '') + '" onclick="state.stockF=\'' + t[0] + '\';render()">' + t[1] + '</button>';
    }).join('') + '</div>' +
    '<div class="bar-row" style="gap:6px"><input class="search" placeholder="Бараа хайх…" value="' + esc(state.q) + '" oninput="state.q=this.value;render();this.focus();this.setSelectionRange(this.value.length,this.value.length)">' +
    '</div></div>' +
    '<div class="scroll" style="margin-top:10px"><table class="stock"><tr><th>Бараа</th><th class="hide-sm">Ангилал</th><th class="n">Үнэ</th>' +
    '<th class="n hide-sm" title="Сүүлд авсан үнэ (Хятад)">Авсан үнэ</th><th class="n hide-sm">Ханш</th><th class="n hide-sm">Карго/ш</th><th class="n" title="Авсан үнэ × ханш + карго (дундаж)">Өртөг үнэ</th><th class="n">Ашиг</th><th class="n">Дэлгүүр</th>' + (wh ? '<th class="n">Агуулах</th><th class="n">Нийт</th>' : '') +
    '<th class="n">Зарагдсан</th><th></th></tr>' +
    list.map(function (r) {
      var t = total(r), s = sold[r.name] || { qty: 0 };
      var cls = t <= 0 ? 'st-out' : (t <= LOW_STOCK ? 'st-low' : '');
      var margin = r.price && r.cost ? Math.round((r.price - r.cost) / r.price * 100) : null;
      return '<tr class="' + cls + '"><td>' + esc(r.name) + '</td><td class="muted hide-sm">' + esc(r.cat) + '</td><td class="n">' + (r.price ? fmt(r.price) : '—') + '</td>' +
        '<td class="n hide-sm">' + buyText(lb[r.name]) + '</td><td class="n hide-sm">' + (lb[r.name] && lb[r.name].rate ? round2(lb[r.name].rate) : '') + '</td>' +
        '<td class="n hide-sm">' + (lb[r.name] && lb[r.name].cargo ? fmt(lb[r.name].cargo) : '') + '</td>' +
        '<td class="n">' + (r.cost ? fmt(r.cost) : '—') + '</td><td class="n' + (margin !== null && margin < 0 ? ' neg' : '') + '">' + (margin === null ? '' : margin + '%') + '</td>' +
        '<td class="n">' + round2(r.shop) + '</td>' + (wh ? '<td class="n">' + round2(r.wh) + '</td><td class="n"><b>' + t + '</b></td>' : '') +
        '<td class="n">' + (s.qty ? round2(s.qty) : '') + '</td>' +
        '<td class="n"><button class="mini" onclick="openMove(\'Орлого\',' + esc(JSON.stringify(r.name)) + ')">+ Орлого</button></td></tr>';
    }).join('') + '</table></div></div>' +
    '<div class="card"><div class="bar-row"><h2 style="margin:0">Хөдөлгөөний түүх</h2>' +
    '<button class="link" onclick="state.showMoves=!state.showMoves;render()">' + (state.showMoves ? 'Нуух' : 'Харах') + '</button></div>' +
    (state.showMoves ? '<div class="scroll" style="margin-top:8px"><table><tr><th>Огноо</th><th>Төрөл</th><th>Бараа</th><th>Байршил</th><th class="n">Тоо</th><th class="n">Нэгж өртөг</th><th>Хэн</th><th>Тайлбар</th><th></th></tr>' +
      moves.filter(function (m) { return m.biz === biz; }).slice().reverse().slice(0, 200).map(function (m) {
        return '<tr><td>' + esc(m.date) + '</td><td>' + esc(m.kind) + '</td><td>' + esc(m.item) + '</td><td>' + esc(m.loc) + '</td><td class="n">' +
          (m.qty > 0 ? '+' : '') + round2(m.qty) + '</td><td class="n">' + (m.cost ? fmt(m.cost) : '') + '</td><td>' + esc(m.by) + '</td><td class="muted">' + esc(m.note) + '</td>' +
          '<td class="n">' + (m.id ? '<button class="mini" onclick="cancelMove(\'' + esc(m.id) + '\')">Цуцлах</button>' : '') + '</td></tr>';
      }).join('') + '</table></div>' : '') + '</div>';
}

// ── Үлдэгдлийн хөдөлгөөн бүртгэх ──
var moveKind = 'Орлого';
function openMove(kind, item) {
  moveKind = kind;
  var biz = state.biz, wh = hasWarehouse(biz);
  $('mvTitle').textContent = { 'Орлого': 'Бараа орлого авах', 'Шилжүүлэг': 'Агуулахаас дэлгүүр рүү шилжүүлэх', 'Тооллого': 'Тооллого (бодит тоо оруулах)', 'Хасалт': 'Бараа хасах (гэмтэл, хорогдол)' }[kind];
  $('mvPayWrap').style.display = kind === 'Орлого' ? 'block' : 'none';
  $('mvPay').value = 'Зээлээр'; $('mvPartner').value = '';
  $('mvPartners').innerHTML = partnerOptions();
  $('mvItems').innerHTML = stockRows(biz).map(function (r) { return '<option value="' + esc(r.name) + '">'; }).join('');
  $('mvItem').value = item || '';
  $('mvQty').value = '';
  $('mvNote').value = '';
  $('mvLocWrap').style.display = wh && kind !== 'Шилжүүлэг' ? 'block' : 'none';
  $('mvLoc').value = 'Дэлгүүр';
  $('mvDirWrap').style.display = kind === 'Шилжүүлэг' ? 'block' : 'none';
  $('mvQtyLabel').textContent = kind === 'Тооллого' ? 'Тоолсон бодит тоо' : (kind === 'Хасалт' ? 'Хасах тоо' : 'Тоо хэмжээ');
  $('mvCostWrap').style.display = kind === 'Орлого' ? 'block' : 'none';
  $('mvCost').value = '';
  $('mvBuyWrap').style.display = kind === 'Орлого' ? 'block' : 'none';
  $('mvBuy').value = ''; $('mvCargo').value = ''; $('mvCurSel').value = load('nb_cur', 'CNY'); mvCurChange();
  $('mvCargoPay').value = load('nb_cargopay', 'Зээлээр'); $('mvCargoCo').value = load('nb_cargoco', '');
  mvInfo();
  openSheet('moveSheet');
}
// ── Өртөг үнэ = авсан үнэ × ханш + карго (нэгжид) ──
var CUR_SIGN = { CNY: '¥', USD: '$', MNT: '₮' };
function mvCurChange() {
  var cur = $('mvCurSel').value;
  $('mvRateWrap').style.visibility = cur === 'MNT' ? 'hidden' : 'visible';
  $('mvRateLabel').textContent = 'Ханш (1 ' + CUR_SIGN[cur] + ' = ₮)';
  $('mvRate').value = cur === 'MNT' ? '' : load('nb_rate_' + cur, '');
  mvCalc();
}
function mvBuyCost() {   // { cost, info } эсвэл null (авсан үнэ оруулаагүй)
  var buy = Number($('mvBuy').value) || 0, cur = $('mvCurSel').value, rate = cur === 'MNT' ? 1 : Number($('mvRate').value) || 0;
  var qty = Number($('mvQty').value) || 0, cargo = Number($('mvCargo').value) || 0;
  if (!buy) return null;
  var base = buy * rate, cu = qty > 0 ? cargo / qty : 0, cost = Math.round((base + cu) * 100) / 100;
  return { buy: buy, cur: cur, rate: cur === 'MNT' ? '' : rate, cargo: Math.round(cu * 100) / 100, cost: cost,
    info: (cur === 'MNT' ? fmt(buy) : CUR_SIGN[cur] + buy + ' × ' + rate + ' = ' + fmt(base)) + (cu ? ' + карго ' + fmt(cu) + '/ш' : '') + ' = нэгж өртөг <b>' + fmt(cost) + '</b>' +
      (qty ? ' · нийт ' + fmt(cost * qty) : '') };
}
function mvCalc() {
  $('mvCargoPayWrap').style.display = Number($('mvCargo').value) > 0 ? '' : 'none';
  var b = mvBuyCost();
  if (b && (b.cur === 'MNT' || b.rate)) { $('mvCost').value = b.cost; $('mvCalcInfo').innerHTML = b.info; }
  else $('mvCalcInfo').innerHTML = $('mvBuy').value && !(Number($('mvRate').value) > 0) ? 'Ханшаа оруулна уу' : 'Авсан үнэ, ханш, каргог оруулбал нэгж өртөг өөрөө бодогдоно (гараар ч засаж болно).';
}
function lastBuys(biz) {   // бараа бүрийн сүүлийн орлого (авсан үнэ, ханш, карго)
  var o = {};
  moves.forEach(function (m) { if (m.biz === biz && m.kind === 'Орлого' && m.qty > 0) o[m.item] = m; });
  return o;
}
function buyText(m) { return m && m.buy ? (m.cur === 'MNT' || !m.cur ? fmt(m.buy) : (CUR_SIGN[m.cur] || '') + round2(m.buy)) : ''; }
function mvCurrent() {
  var st = (stockData[state.biz] || {})[$('mvItem').value.trim()] || { shop: 0, wh: 0 };
  return st;
}
function mvInfo() {
  var st = mvCurrent();
  var wh = hasWarehouse(state.biz);
  $('mvCur').textContent = $('mvItem').value.trim() ? 'Одоогийн үлдэгдэл: дэлгүүр ' + round2(st.shop) + (wh ? ', агуулах ' + round2(st.wh) : '') + (st.cost ? ' · дундаж өртөг ' + fmt(st.cost) : '') : '';
}
function locAt(loc) { return loc === 'Агуулах' ? 'Агуулахад' : 'Дэлгүүрт'; }
function saveMove() {
  var biz = state.biz, item = $('mvItem').value.trim(), qty = Number($('mvQty').value), note = $('mvNote').value.trim();
  if (!item) { toast('Бараагаа сонгоно уу'); return; }
  if (!isFinite(qty) || $('mvQty').value === '' || (moveKind !== 'Тооллого' && qty <= 0) || qty < 0) { toast('Тоо хэмжээ зөв оруулна уу'); return; }
  var ms = [];
  if (moveKind === 'Орлого') {
    var cost = Number($('mvCost').value) || 0, pay = $('mvPay').value, partner = $('mvPartner').value.trim();
    if (!cost && !mvCurrent().cost) { toast('Нэгж өртгөө оруулна уу — санхүүд бараа өртгөөр бичигдэнэ'); return; }
    if (pay === 'Зээлээр' && !partner) { toast('Зээлээр авсан бол нийлүүлэгчээ бичнэ үү'); return; }
    var bc = mvBuyCost();
    if (bc && bc.cur !== 'MNT') { if (!(bc.rate > 0)) { toast('Ханшаа оруулна уу'); return; } save('nb_rate_' + bc.cur, bc.rate); }
    if (bc) save('nb_cur', bc.cur);
    var cpay = bc && bc.cargo ? $('mvCargoPay').value : '', cco = cpay ? $('mvCargoCo').value.trim() : '';
    if (cpay === 'Зээлээр' && !cco) { toast('Каргог дараа төлөх бол карго компанийн нэрийг бичнэ үү'); return; }
    if (cpay) { save('nb_cargopay', cpay); save('nb_cargoco', cco); }
    ms.push({ biz: biz, loc: $('mvLoc').value, item: item, kind: 'Орлого', qty: qty, cost: cost, pay: pay, partner: partner, note: note,
              buy: bc ? bc.buy : '', cur: bc ? bc.cur : '', rate: bc ? bc.rate : '', cargo: bc ? bc.cargo : '', cargoPay: cpay, cargoPartner: cco });
  } else if (moveKind === 'Хасалт') {
    if (!note) { toast('Хасах шалтгаанаа бичнэ үү'); return; }
    var hv = mvCurrent()[$('mvLoc').value === 'Агуулах' ? 'wh' : 'shop'] || 0;
    if (qty > hv + 1e-9) { toast(locAt($('mvLoc').value) + ' ' + round2(hv) + ' байна — түүнээс их хасах боломжгүй'); return; }
    ms.push({ biz: biz, loc: $('mvLoc').value, item: item, kind: 'Хасалт', qty: -qty, note: note });
  }
  else if (moveKind === 'Шилжүүлэг') {
    var from = $('mvDir').value === 'w2s' ? 'Агуулах' : 'Дэлгүүр', to = from === 'Агуулах' ? 'Дэлгүүр' : 'Агуулах';
    var fv = mvCurrent()[from === 'Агуулах' ? 'wh' : 'shop'] || 0;
    if (qty > fv + 1e-9) { toast(locAt(from) + ' ' + round2(fv) + ' байна — түүнээс их шилжүүлэх боломжгүй'); return; }
    ms.push({ biz: biz, loc: from, item: item, kind: 'Шилжүүлэг', qty: -qty, note: note || (from + ' → ' + to) });
    ms.push({ biz: biz, loc: to, item: item, kind: 'Шилжүүлэг', qty: qty, note: note || (from + ' → ' + to) });
  } else {
    var loc = $('mvLoc').value, cur = mvCurrent()[loc === 'Агуулах' ? 'wh' : 'shop'];
    var diff = round2(qty - cur);
    if (!diff) { toast('Зөрүүгүй — үлдэгдэл таарч байна'); closeSheet('moveSheet'); return; }
    ms.push({ biz: biz, loc: loc, item: item, kind: 'Тооллого', qty: diff, note: note || ('Тоолсон ' + qty + ', бүртгэлд ' + round2(cur)) });
  }
  sendMoves(ms, function () { closeSheet('moveSheet'); toast('Бүртгэгдлээ'); });
}
var moveSending = false;
function sendMoves(ms, done) {
  if (!API_URL) {   // туршилтын горим
    ms.forEach(function (m) {
      var b = stockData[m.biz] = stockData[m.biz] || {};
      var it = b[m.item] = b[m.item] || { shop: 0, wh: 0 };
      if (m.loc === 'Агуулах') it.wh += m.qty; else it.shop += m.qty;
      if (m.cost && m.qty > 0) it.cost = it.cost ? Math.round((it.cost + m.cost) / 2) : m.cost;
      moves.push({ id: 'M' + Date.now() + '-' + moves.length, date: todayStr() + ' ' + timeStr(), biz: m.biz, loc: m.loc, item: m.item, kind: m.kind, qty: m.qty,
                   cost: m.cost || 0, by: ownerName, note: m.note || '', pay: m.pay || '', partner: m.partner || '',
                   buy: Number(m.buy) || 0, cur: m.cur || '', rate: Number(m.rate) || 0, cargo: Number(m.cargo) || 0, cargoPay: m.cargoPay || '', cargoPartner: m.cargoPartner || '' });
    });
    save('nb_demo_stock', stockData); save('nb_demo_moves', moves); render(); done(); return;
  }
  if (moveSending) { toast('Хадгалж байна — түр хүлээнэ үү'); return; }   // сервер 2–5 секунд хариулдаг: давхар дарвал орлого давхар бичигдэнэ
  moveSending = true;
  post({ type: 'admin_stock', by: ownerName, moves: ms }, function (err, d) {
    moveSending = false;
    if (err === 'negative') { toast('Үлдэгдэл хүрэлцэхгүй: ' + ((d && d.item) || '') + ' — хасах руу оруулах боломжгүй'); return; }
    if (err) { toast('Алдаа: ' + err); return; }
    done(); refresh();
  });
}
// ── Baaz «Бараа материалын үлдэгдэл (өртгөөр, байршлаар)» Excel → эхний үлдэгдэл + өртөг ──
// Файлыг зөвхөн хөтөч дотор уншина; өртөг зөвхөн таны хувийн Sheet-д хадгалагдана.
function num(v) { var n = Number(String(v == null ? '' : v).replace(/[,\s₮]/g, '')); return isFinite(n) ? n : 0; }
function importBaaz(input) {
  var f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  if (!window.XLSX) { toast('Excel сан ачаалж байна — хэдэн секундийн дараа дахин оролдоно уу'); ensureXlsx(function () {}); return; }
  var reader = new FileReader();
  reader.onload = function (e) {
    var wb; try { wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' }); } catch (err) { toast('Файлыг уншиж чадсангүй'); return; }
    var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
    if (!rows.some(function (r) { return r.join(' ').indexOf('Эцсийн үлдэгдэл') >= 0; })) { toast('Энэ нь Baaz-ийн үлдэгдлийн тайлан биш байна'); return; }
    var loc = 'Дэлгүүр', items = [];
    rows.forEach(function (r) {
      var a = String(r[0] || '').trim();
      if (a && !/^\d+$/.test(a) && !String(r[3] || '').trim()) {
        if (/агуулах/i.test(a)) loc = 'Агуулах'; else if (/дэлгүүр/i.test(a)) loc = 'Дэлгүүр';
        return;
      }
      if (/^\d+$/.test(a) && String(r[3] || '').trim()) {
        var qty = num(r[18]), cost = num(r[19]);
        if (qty > 0) items.push({ item: String(r[3]).trim(), loc: loc, qty: qty, cost: cost > 0 && cost < 1e12 ? Math.round(cost) : 0 });
      }
    });
    if (!items.length) { toast('Үлдэгдэлтэй бараа олдсонгүй'); return; }
    var names = {}; BUSINESSES[state.biz].products.forEach(function (p) { names[p.name] = 1; });
    var unknown = items.filter(function (x) { return !names[x.item]; }).length;
    var val = items.reduce(function (s, x) { return s + x.qty * x.cost; }, 0);
    if (!confirm('Baaz тайлангаас ' + items.length + ' мөр олдлоо (дэлгүүр ' + items.filter(function (x) { return x.loc === 'Дэлгүүр'; }).length +
      ', агуулах ' + items.filter(function (x) { return x.loc === 'Агуулах'; }).length + ').\nНийт өртөг: ' + fmt(val) +
      (unknown ? '\nЖагсаалтад байхгүй ' + unknown + ' бараа шинээр нэмэгдэнэ.' : '') +
      '\n\n«' + BUSINESSES[state.biz].name + '»-д эхний үлдэгдэл болгон оруулах уу?')) return;
    sendMoves(items.map(function (x) {
      return { biz: state.biz, loc: x.loc, item: x.item, kind: 'Эхний үлдэгдэл', qty: x.qty, cost: x.cost, note: 'Baaz тайлан ' + f.name.slice(0, 40) };
    }), function () { toast(items.length + ' мөр орлоо'); });
  };
  reader.readAsArrayBuffer(f);
}

// ── Ажилчид (бүгд эсвэл нэг компанийн) ──
function salaryOf(s, month) {
  var e = salary.filter(function (x) { return x.staffId === s.id && x.month === month; });
  var sum = function (k) { return e.filter(function (x) { return x.kind === k; }).reduce(function (a, x) { return a + x.amount; }, 0); };
  var base = s.status === 'Тийм' ? (Number(s.salary) || 0) : 0;
  var r = { base: base, bonus: sum('KPI бонус') + sum('Шагнал'), ded: sum('Суутгал'), adv: sum('Урьдчилгаа'), paid: sum('Олгосон') };
  r.left = r.base + r.bonus - r.ded - r.adv - r.paid;
  return r;
}
function staffSales(s, month) {
  return records.filter(function (x) { return x.type === 'sale' && x.staff === s.name && x.date.slice(0, 7) === month && staffIn(s, x.biz); })
    .reduce(function (a, x) { return a + (Number(x.amount) || 0); }, 0);
}
function staffView(fixedBiz) {
  var bizF = fixedBiz || state.staffBiz;
  var list = staff.filter(function (s) { return bizF === 'all' || staffIn(s, bizF); });
  var pend = list.filter(function (s) { return s.status === 'Хүлээгдэж'; });
  var act = list.filter(function (s) { return s.status === 'Тийм'; });
  var off = list.filter(function (s) { return s.status === 'Үгүй'; });
  var m = state.month;
  var tot = { base: 0, left: 0, paid: 0, sales: 0 };
  act.forEach(function (s) { var r = salaryOf(s, m); tot.base += r.base + r.bonus - r.ded; tot.left += r.left; tot.paid += r.adv + r.paid; tot.sales += staffSales(s, m); });
  var filt = fixedBiz ? '' : '<div class="tabs">' + [['all', 'Бүгд']].concat(KEYS.map(function (k) { return [k, BUSINESSES[k].name.split(' ')[0]]; })).map(function (t) {
    return '<button class="' + (state.staffBiz === t[0] ? 'on' : '') + '" onclick="setStaffBiz(\'' + t[0] + '\')">' + esc(t[1]) + '</button>';
  }).join('') + '</div>';
  var reg = 'register.html' + (fixedBiz ? '?biz=' + fixedBiz : '');
  var sf = state.staffSt || 'all', showP = sf === 'all' || sf === 'pend', showA = sf === 'all' || sf === 'act', showO = sf === 'all' || sf === 'off';
  var stTabs = '<div class="tabs" style="margin-bottom:10px">' + [['all', 'Бүгд', list.length], ['act', 'Идэвхтэй', act.length], ['pend', 'Хүлээгдэж буй', pend.length], ['off', 'Идэвхгүй', off.length]].map(function (t) {
    return '<button class="' + (sf === t[0] ? 'on' : '') + '" onclick="setStaffSt(\'' + t[0] + '\')">' + t[1] + ' <small>' + t[2] + '</small></button>';
  }).join('') + '</div>';
  return '<div class="card bar-row">' + (fixedBiz ? '<h2 style="margin:0">Ажилчид</h2>' : filt) +
    '<label class="month">Сар <input type="month" value="' + m + '" onchange="setMonth(this.value)"></label></div>' +
    (!API_URL ? '<div class="card muted">Ажилчдын бүртгэл Google Sheet-тэй холбогдсон үед ажиллана.</div>' : '') +
    '<div class="kpis">' + kpi('Идэвхтэй ажилтан', act.length + (pend.length ? ' <span class="tag r">+' + pend.length + '</span>' : '')) +
    kpi('Цалингийн сан (' + m + ')', fmt(tot.base)) + kpi('Олгосон', fmt(tot.paid)) + kpi('Олгох үлдэгдэл', fmt(tot.left)) + '</div>' + stTabs +
    (showP && pend.length ? '<div class="card"><h2>Баталгаажуулалт хүлээж буй (' + pend.length + ')</h2>' + pend.map(pendCard).join('') + '</div>' : '') +
    (showA ? '<div class="card"><div class="bar-row"><h2 style="margin:0">Ажилчид (' + act.length + ')</h2>' +
    '<a class="link" href="' + reg + '" target="_blank">＋ Бүртгүүлэх хуудас</a></div>' +
    (act.length ? staffGroups(act, m) : '<p class="muted">Ажилтан алга</p>') + '</div>' : '') +
    (showO && off.length ? '<details class="card"' + (sf === 'off' ? ' open' : '') + '><summary>Идэвхгүй (' + off.length + ')</summary>' + off.map(function (s) {
      return '<div class="st-off">' + esc(s.surname ? s.surname + ' ' : '') + esc(s.name) + ' · ' + bizLabel(s.biz) +
        ' <button class="mini" onclick="openStaff(\'' + s.id + '\')">Засах</button></div>';
    }).join('') + '</details>' : '') +
    (sf !== 'all' && !(sf === 'act' ? act : sf === 'pend' ? pend : off).length ? '<div class="card muted">Энэ төлөвтэй ажилтан алга</div>' : '');
}
function staffPage() {
  var tab = isOwner() ? state.staffTab || 'pay' : 'att';
  var tabs = '<div class="tabs" style="margin-bottom:10px">' + (isOwner() ? [['pay', 'Ажилчид, цалин'], ['att', 'Ирц, ажилласан цаг']] : [['att', 'Ирц, ажилласан цаг']]).map(function (t) {
    return '<button class="' + (tab === t[0] ? 'on' : '') + '" onclick="state.staffTab=\'' + t[0] + '\';render()">' + t[1] + '</button>'; }).join('') + '</div>';
  var acts = '<button class="b-btn primary" onclick="openTask()">+ Даалгавар илгээх</button>' + (isOwner() ? '<a class="b-btn" href="register.html" target="_blank">+ Бүртгүүлэх хуудас</a>' : '');
  return pageHead('Ажилчид', acts) + tabs + tasksCard() + (tab === 'att' ? attendView() : staffView('') + staffLinks() + delCodeCard());
}
// ── KPI: сарын борлуулалтын % → «KPI бонус» болгон цалинд («Шагнал» — хуучин нэр) ──
function kpiPct(s) { return Number((window.kpiCfg || {})[s.id]) || 0; }
function kpiPosted(s, m) { return salary.filter(function (e) { return e.staffId === s.id && e.month === m && (e.kind === 'KPI бонус' || e.kind === 'Шагнал') && /^KPI /.test(e.note || ''); }); }
function kpiLine(s, m, sales) {
  var p = kpiPct(s); if (!p) return '';
  var amt = Math.round(Math.max(0, sales) * p / 100), done = kpiPosted(s, m);
  return '<div class="st-foot" style="border-top:0;padding-top:0"><span class="muted">KPI ' + p + '%: <b>' + fmt(amt) + '</b>' + (done.length ? ' · цалинд бичсэн ' + fmt(done.reduce(function (a, e) { return a + e.amount; }, 0)) : '') + '</span>' +
    (!done.length && amt > 0 ? '<button class="btn sm ghost" onclick="kpiPost(\'' + s.id + '\')">Цалинд бичих</button>' : '') + '</div>';
}
function kpiPost(id) {
  var s = staff.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  var m = state.month, sales = staffSales(s, m), p = kpiPct(s), amt = Math.round(Math.max(0, sales) * p / 100);
  if (kpiPosted(s, m).length) { toast('Энэ сарын KPI бонус бичигдсэн байна'); return; }
  if (!(amt > 0)) return;
  var biz = staffHome(s);
  if (!confirm(s.name + ' · ' + m + '\nБорлуулалт ' + fmt(sales) + ' × ' + p + '% = ' + fmt(amt) + '\n\n«KPI бонус» болгон цалинд бичих үү?')) return;
  post({ type: 'admin_salary', entry: { staffId: s.id, kind: 'KPI бонус', amount: amt, month: m, note: 'KPI ' + p + '% · борлуулалт ' + fmt(sales), biz: biz } }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    toast('✓ KPI бонус цалинд бичигдлээ'); refresh();
  });
}
function roleName(r) { return r === 'Эзэн' ? 'Захирал' : r; }
function dismissStaff(id) {   // ажлаас гаргах — нэвтрэлт нь шууд хүчингүй, түүх нь хадгалагдана («Идэвхгүй» жагсаалтаас буцааж болно)
  var s = staff.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  if (!confirm(s.name + '-г ажлаас гаргах уу?\nНэвтрэх эрх нь шууд хаагдана. Цалин, борлуулалтын түүх хадгалагдана.')) return;
  post({ type: 'admin_staff', id: id, fields: { status: 'Үгүй' } }, function (err) { if (err) { toast('Алдаа: ' + err); return; } toast('Ажлаас гаргалаа'); refresh(); });
}
function staffLinks() {   // компани бүрийн ажилчдын нэвтрэх, бүртгүүлэх холбоос
  var base = location.href.replace(/[^\/]*$/, '');
  return '<div class="card"><h2>Ажилчдын хуудас</h2><table class="rep-t"><tr><th>Компани</th><th>Нэвтрэх (өдөр бүр)</th><th>Бүртгүүлэх (шинэ ажилтан)</th></tr>' +
    KEYS.map(function (k) { var u = base + k + '.html', r = base + 'register.html?biz=' + k;
      return '<tr><td>' + esc(BUSINESSES[k].name) + '</td><td><a class="link" href="' + u + '" target="_blank">' + esc(u.replace(/^https?:\/\//, '')) + '</a></td>' +
        '<td><a class="link" href="' + r + '" target="_blank">Бүртгүүлэх холбоос</a></td></tr>'; }).join('') + '</table></div>';
}
// Цуцалсан захиалгыг бүр устгах код — зөвхөн эзэн тохируулна (Cozy ажилтан захиалга устгахдаа асууна)
function delCodeCard() {
  if (!API_URL || !isOwner()) return '';
  return '<div class="card"><h2>Захиалга устгах код</h2><p class="muted">Цуцалсан захиалгыг бүр устгахад ажилтнаас асуух код (4–12 цифр). Хоосон хадгалбал устгах боломжгүй болно.</p>' +
    '<div class="filter" style="margin-top:10px"><label>Шинэ код<input type="password" id="delCode" inputmode="numeric" maxlength="12" autocomplete="new-password"></label>' +
    '<label>&nbsp;<button class="b-btn primary" onclick="saveDelCode()">Хадгалах</button></label></div></div>';
}
function saveDelCode() {
  var v = $('delCode').value.trim();
  if (v && !/^\d{4,12}$/.test(v)) { toast('Код 4–12 цифр байна'); return; }
  if (!v && !confirm('Код хоосон — захиалга устгах боломжгүй болно. Үргэлжлүүлэх үү?')) return;
  post({ type: 'admin_setting', key: 'delcode', value: v }, function (err, d) { if (err) { toast('Алдаа: ' + err); return; } $('delCode').value = ''; toast(d && d.set ? 'Устгах код хадгалагдлаа' : 'Устгах код унтарлаа'); });
}
function bizLabel(b) { return b === 'all' ? 'Бүх дэлгүүр' : String(b || '').split(',').map(function (k) { return BUSINESSES[k] ? BUSINESSES[k].name : k; }).join(' + '); }
function pendCard(s) {
  return '<div class="pend"><div><b>' + esc(s.surname ? s.surname + ' ' : '') + esc(s.name) + '</b> <span class="muted">@' + esc(s.username || '') + '</span> · ' + bizLabel(s.biz) +
    '<small>Утас: ' + esc(s.phone) + (s.regno ? ' · ' + esc(s.regno) : '') + (s.position ? ' · ' + esc(s.position) : '') + ' · ' + esc(s.created) + '</small></div>' +
    '<div class="pend-act"><button class="btn sm" style="background:var(--green)" onclick="approve(\'' + s.id + '\',\'Худалдагч\')">✓ Худалдагчаар</button>' +
    '<button class="btn sm" onclick="approve(\'' + s.id + '\',\'Менежер\')">✓ Менежерээр</button>' +
    '<button class="btn sm ghost" style="color:var(--red)" onclick="reject(\'' + s.id + '\')">✕ Татгалзах</button></div></div>';
}
function staffGroups(act, m) {   // компани (байршил) бүрээр, өнгөөр нь ангилна
  return KEYS.concat(['all']).map(function (k) {
    var L = act.filter(function (s) { return k === 'all' ? s.biz === 'all' : s.biz !== 'all' && staffIn(s, k); }); if (!L.length) return '';   // хэд хэдэн дэлгүүрийнх бүлэг бүрт харагдана
    var B = BUSINESSES[k] || { name: 'Бүх дэлгүүр', icon: '★', color: '#5B6B82' };
    return '<div class="st-grp" style="--co:' + B.color + '"><div class="st-grp-h"><span class="mono">' + B.icon + '</span><b>' + esc(B.name) + '</b><small>' + L.length + ' ажилтан</small></div>' +
      '<div class="st-grid">' + L.map(function (s) { return staffCard(s, m, B.color); }).join('') + '</div></div>';
  }).join('');
}
function staffCard(s, m, color) {
  var r = salaryOf(s, m), sales = staffSales(s, m);
  return '<div class="st-card"' + (color ? ' style="border-top:3px solid ' + color + '!important"' : '') + '><div class="st-head"><div><b>' + esc(s.surname ? s.surname + ' ' : '') + esc(s.name) + '</b>' +
    '<small>@' + esc(s.username || '—') + ' · ' + bizLabel(s.biz) + ' · ' + (s.role === 'Худалдагч' ? 'Худалдагч' : '<span class="tag b">' + esc(roleName(s.role)) + '</span>') + (s.position ? ' · ' + esc(s.position) : '') + '</small>' +
    '<small>' + (s.phone ? 'Утас: ' + esc(s.phone) : '') + (s.bank ? ' · Данс: ' + esc(s.bank) : '') + '</small>' +
    '<small>' + contractBadge(s) + '</small></div>' +
    '<div><button class="mini" onclick="openStaff(\'' + s.id + '\')">Засах</button> <button class="mini" onclick="openContract(\'' + s.id + '\')">Гэрээ</button>' +
      (s.role !== 'Эзэн' ? ' <button class="mini" onclick="dismissStaff(\'' + s.id + '\')">Ажлаас гаргах</button>' : '') + '</div></div>' +
    '<div class="st-sal">' +
    '<div><span>Үндсэн</span><b>' + (r.base ? fmt(r.base) : '<span class="muted">тохируулаагүй</span>') + '</b></div>' +
    '<div><span>KPI бонус</span><b>' + fmt(r.bonus) + '</b></div>' +
    '<div><span>Суутгал</span><b>−' + fmt(r.ded) + '</b></div>' +
    '<div><span>Урьдчилгаа</span><b>−' + fmt(r.adv) + '</b></div>' +
    '<div><span>Олгосон</span><b>−' + fmt(r.paid) + '</b></div>' +
    '<div class="st-left"><span>Үлдэгдэл</span><b>' + fmt(r.left) + '</b></div></div>' +
    '<div class="st-foot"><span class="muted">Борлуулалт (' + m + '): <b>' + fmt(sales) + '</b></span>' +
    '<button class="btn sm" onclick="openSalary(\'' + s.id + '\')">＋ Цалин</button></div>' + kpiLine(s, m, sales) + '</div>';
}

// ── Ажилтан засах / батлах ──
function approve(id, role) {
  post({ type: 'admin_staff', id: id, fields: { status: 'Тийм', role: role } }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    toast('✓ Баталгаажлаа — одоо хөдөлмөрийн гэрээгээ бөглөнө үү');
    fetchAll(function (ok) { if (ok) { render(); openContract(id); } });   // батлангуут гэрээ шууд нээгдэнэ
  });
}
function reject(id) {
  if (!confirm('Энэ бүртгэлээс татгалзах уу?')) return;
  post({ type: 'admin_staff', id: id, fields: { status: 'Үгүй' } }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    toast('Татгалзлаа'); refresh();
  });
}
function openStaff(id) {
  var s = staff.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  editId = id;
  $('sfTitle').textContent = (s.surname ? s.surname + ' ' : '') + s.name; $('sfName').value = s.name || '';
  $('sfSub').textContent = bizLabel(s.biz) + (s.created ? ' · бүртгүүлсэн ' + s.created : '');
  $('sfBiz').innerHTML = ['all'].concat(KEYS).map(function (k) {
    var on = k === 'all' ? s.biz === 'all' : s.biz !== 'all' && staffIn(s, k);
    return '<label style="display:flex;gap:8px;align-items:center;margin:4px 0;color:var(--ink)"><input type="checkbox" value="' + k + '"' + (on ? ' checked' : '') +
      ' style="width:auto" onchange="sfBizPick(this)"> ' + esc(bizLabel(k)) + '</label>';
  }).join('');
  $('sfStatus').value = s.status; $('sfRole').value = s.role;
  $('sfPos').value = s.position || ''; $('sfSalary').value = s.salary || ''; $('sfPhone').value = s.phone || '';
  $('sfBank').value = s.bank || ''; $('sfCode').value = ''; $('sfUser').value = s.username || '';
  $('sfKpi').value = kpiPct(s) || '';
  $('sfAddr').value = s.address || ''; $('sfNdType').value = s.ndType || '01001'; $('sfNdJob').value = s.ndJob || ''; sfJobInfo();
  loadJobs(function () { $('sfJobs').innerHTML = ND_JOBS.map(function (j) { return '<option value="' + j[0] + '">' + esc(j[1]) + ' · ҮОМШӨ ' + j[2] + '%</option>'; }).join(''); sfJobInfo(); });
  openSheet('staffSheet');
}
function sfBizPick(el) {   // «Бүх дэлгүүр» ба тусгай дэлгүүрүүд хамт сонгогдохгүй
  [].forEach.call($('sfBiz').querySelectorAll('input'), function (x) { if (x !== el && el.checked && (el.value === 'all' || x.value === 'all')) x.checked = false; });
}
function sfBizVal() {
  var v = [].filter.call($('sfBiz').querySelectorAll('input'), function (x) { return x.checked; }).map(function (x) { return x.value; });
  return v.indexOf('all') >= 0 ? 'all' : v.join(',');
}
function saveStaff() {
  var f = { name: $('sfName').value.trim(), status: $('sfStatus').value, role: $('sfRole').value, biz: sfBizVal(), position: $('sfPos').value.trim(),
            salary: Number($('sfSalary').value) || 0, phone: $('sfPhone').value.trim(), bank: $('sfBank').value.trim(),
            username: $('sfUser').value.trim().toLowerCase(), address: $('sfAddr').value.trim(), ndType: $('sfNdType').value, ndJob: $('sfNdJob').value.trim() };
  if (f.ndJob && !/^\d{4}-\d{2}$/.test(f.ndJob)) { toast('НД мэргэжлийн кодыг жагсаалтаас сонгоно уу (жишээ 5223-11)'); return; }
  if (!/^[a-z0-9._]{3,20}$/.test(f.username)) { toast('Нэвтрэх нэр: латин жижиг үсэг, тоо, цэг (3-20)'); return; }
  if (!f.biz) { toast('Ажиллах дэлгүүрээ сонгоно уу'); return; }
  var code = $('sfCode').value.trim();
  if (code) { if (!/^\d{4,8}$/.test(code)) { toast('Код 4-8 оронтой тоо байна'); return; } f.code = code; }
  var kp = Number($('sfKpi').value) || 0, sid = editId;
  if (kp < 0 || kp > 50) { toast('KPI хувь 0–50 хооронд'); return; }
  post({ type: 'admin_staff', id: editId, fields: f }, function (err, d) {
    if (err) { toast(err === 'user_taken' ? 'Энэ нэвтрэх нэр бүртгэгдсэн байна' : 'Алдаа: ' + err); return; }
    if (f.biz.indexOf(',') >= 0 && !(d && d.biz)) { alert('Хэд хэдэн дэлгүүр хадгалагдсангүй — Apps Script-ийн шинэ кодыг deploy хийгээгүй байна.\nDeploy → Manage deployments → New version хийгээд дахин хадгална уу.'); refresh(); return; }
    if (kp === kpiPct({ id: sid })) { closeSheet('staffSheet'); toast('✓ Хадгалагдлаа'); refresh(); return; }
    var cfg = JSON.parse(JSON.stringify(window.kpiCfg || {})); if (kp) cfg[sid] = kp; else delete cfg[sid];
    post({ type: 'admin_setting', key: 'kpi', value: cfg }, function (e2) {
      if (!e2) window.kpiCfg = cfg;
      closeSheet('staffSheet'); toast(e2 ? 'Хадгалсан, KPI хувь хадгалагдсангүй: ' + e2 : '✓ Хадгалагдлаа'); refresh();
    });
  });
}

// ── Цалингийн гүйлгээ ──
function setKind(btn) {
  salKind = btn.dataset.v;
  [].forEach.call($('slKind').children, function (b) { b.classList.toggle('on', b === btn); });
}
function openSalary(id) {
  var s = staff.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  salId = id;
  $('slTitle').textContent = 'Цалин · ' + s.name;
  $('slAmount').value = ''; $('slNote').value = ''; $('slMonth').value = state.month;
  setKind($('slKind').children[0]);
  // «Бүх дэлгүүр»-ийн ажилтан бол цалин аль компанийн зардал болохыг сонгоно
  var L = staffBizes(s.biz).filter(function (k) { return KEYS.indexOf(k) >= 0; }), home = staffHome(s);
  $('slBizWrap').style.display = L.length > 1 ? 'block' : 'none';
  $('slBiz').innerHTML = (L.length ? L : KEYS).map(function (k) { return '<option value="' + k + '"' + (k === home ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('');
  var hist = salary.filter(function (e) { return e.staffId === id; }).slice().reverse().slice(0, 20);
  $('slHistory').innerHTML = hist.length ? hist.map(function (e) {
    var minus = e.kind !== 'Шагнал' && e.kind !== 'KPI бонус';
    return '<li><span>' + esc(e.kind === 'Шагнал' ? 'KPI бонус' : e.kind) + ' · ' + esc(e.month) + (e.note ? '<small>' + esc(e.note) + '</small>' : '') + '<small>' + esc(e.date) + '</small></span>' +
      '<span class="amt ' + (minus ? 'r' : 'g') + '">' + (minus ? '−' : '+') + fmt(e.amount) + '</span></li>';
  }).join('') : '<li class="muted">Гүйлгээ алга</li>';
  openSheet('salSheet');
}
function saveSalary() {
  var amt = Number($('slAmount').value) || 0;
  if (amt <= 0) { toast('Дүнгээ оруулна уу'); return; }
  post({ type: 'admin_salary', entry: { staffId: salId, kind: salKind, amount: amt, month: $('slMonth').value, note: $('slNote').value.trim(), biz: $('slBiz').value } }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    closeSheet('salSheet'); toast('✓ ' + salKind + ' бүртгэгдлээ'); refresh();
  });
}

function openSheet(id) { $(id).classList.add('show'); }
function closeSheet(id) { $(id).classList.remove('show'); }

// ═══════════ ДЭД ЦЭС, ТАЙЛАН (reports.js-ийн хөдөлгүүрээр) ═══════════
var SUBS = {
  sales: [['receipts', 'Баримтууд'], ['orders', 'Захиалга'], ['buuhia', 'Буухиа (хүргэлт)'], ['item', 'Бараагаар'], ['cat', 'Ангиллаар'], ['staff', 'Худалдагчаар'], ['day', 'Өдрөөр'],
          ['pay', 'Төлбөрийн хэлбэрээр'], ['disc', 'Хөнгөлөлт, буцаалт'], ['slow', 'Удаан эргэлттэй бараа'], ['boost', 'Boost бараагаар'], ['ebarimt', 'И-баримт тулгалт']],
  products: [['catalog', 'Барааны бүртгэл, үнэ'], ['counts', 'Тооллого батлах'], ['po', 'Бараа захиалга (Хятад)'], ['stock', 'Үлдэгдэл'], ['move', 'Хөдөлгөөний тайлан'], ['prices', 'Үнийн түүх'], ['in', 'Орлогын жагсаалт'], ['suppliers', 'Нийлүүлэгчид']],
  finance: [['requests', 'Мөнгөний хүсэлт'], ['simple', 'Захирлын самбар'], ['months', '12 сарын дүн'], ['daily', 'Өдрийн орлого'], ['cashacc', 'Мөнгөний данс'], ['profit', 'Барааны ашиг'], ['money', 'Гүйлгээ'], ['bank', 'Банкны хуулга'], ['vouchers', 'Кассын баримт'],
            ['expcat', 'Зардлын задаргаа'], ['other', 'Бусад'], ['recv', 'Авлага'], ['payb', 'Өглөг'], ['debts', 'Бусад тооцоо'], ['loans', 'Зээлийн хяналт'], ['assets', 'Үндсэн хөрөнгө, элэгдэл'], ['banklink', 'Банкны данс холбох'], ['digest', 'Өдрийн тойм и-мэйл'], ['payroll', 'Цалин, НДШ'], ['monthly', 'Сар бүрийн ажил'], ['acct', 'Нягтлангийн тайлан'], ['setup', 'Тохиргоо'],
            ['dash', 'Бүртгэлийн шалгалт'], ['entry', 'Журналын бичилт'], ['journal', 'Ерөнхий журнал'], ['trial', 'Гүйлгээ баланс'], ['ledger', 'Дансны хуулга'], ['gl', 'Ерөнхий дэвтэр'],
            ['cash', 'Касс, харилцах (өдрөөр)'], ['cashflow', 'Мөнгөн урсгал'], ['expenses', 'Зарлага, касс хаалт'], ['partners', 'Авлага, өглөгийн товчоо'], ['aging_r', 'Авлагын насжилт'],
            ['aging_p', 'Өглөгийн насжилт'], ['pstmt', 'Харилцагчийн хуулга'], ['balance', 'Санхүүгийн байдал (баланс)'], ['pl', 'Орлогын тайлан'], ['equity', 'Өмчийн өөрчлөлт'],
            ['opening', 'Эхний үлдэгдэл'], ['accounts', 'Дансны төлөвлөгөө'], ['lock', 'Гүйлгээ түгжих'], ['close', 'Он хаах, нөөц'], ['glossary', 'Нэр томьёо']],
};
function subTabs() {
  var cur = state.sub[state.module];
  return '<div class="subtabs">' + SUBS[state.module].map(function (s) {
    return '<button class="' + (cur === s[0] ? 'on' : '') + '" onclick="setSub(\'' + s[0] + '\')">' + s[1] + '</button>';
  }).join('') + '</div>';
}
function R() { return { records: records, moves: moves, salary: salary, journal: journal, stock: stockData, staff: staff, partners: partners, closed: meta.closed || '', assets: window.assets || [], orders: window.adminOrders || [] }; }
function J() { return buildJournal(state.biz, R()); }

// Тайлан бүрийг нэг газраас гаргана — дэлгэц, Excel, «Бүх тайлан» бүгд үүнийг ашиглана
function makeReport(mod, sub) {
  var biz = state.biz, r = range(), f = r[0], t = r[1];
  if (mod === 'sales') {
    if (sub === 'receipts') return repReceipts(R(), biz, f, t);
    if (sub === 'orders') return repOrders(biz);
    if (sub === 'customers') return repCustomers(biz);
    if (sub === 'ebarimt') return repEbarimt(R(), biz, f, t);
    if (sub === 'boost') return repBoost(R(), biz, f, t);
    if (sub === 'disc') return repDiscRet(R(), biz, f, t);
    if (sub === 'slow') return repSlow(R(), biz, 30, stockData[biz]);
    return repSalesBy(R(), biz, f, t, sub);
  }
  if (mod === 'products') {
    if (sub === 'move') return repStockMove(R(), biz, f, t);
    if (sub === 'in') return repReceiptsIn(R(), biz, f, t);
    if (sub === 'stock') return repStockNow(biz);
    if (sub === 'catalog') return repCatalog(biz);
    if (sub === 'suppliers') return repPartnerList(biz);
    if (sub === 'prices') return repPrices(biz, f, t);
  }
  if (sub === 'profit') return repProfit(R(), biz, f, t);
  var E = J();
  if (sub === 'months') return repMonths(E, yearOf());
  if (sub === 'payroll') return repPayroll(E, yearOf());
  if (sub === 'money') return repMoney(E, f, t);
  if (sub === 'debts' || sub === 'recv' || sub === 'payb') return repDebts(E, debtTabOf(sub), state.dst || 'open');
  if (sub === 'journal') return repJournal(E, f, t);
  if (sub === 'trial') return repTrial(E, f, t);
  if (sub === 'ledger') return repLedger(E, f, t, state.acc);
  if (sub === 'cash') return repCash(E, f, t);
  if (sub === 'pl') return repPL(E, f, t);
  if (sub === 'balance') return repBalance(E, t);
  if (sub === 'cashflow') return repCashflow(E, f, t);
  if (sub === 'partners') return repPartners(E, t);
  if (sub === 'accounts') return repAccounts();
  if (sub === 'gl') return repGL(E, f, t);
  if (sub === 'aging_r') return repAging(E, t, '1201');
  if (sub === 'aging_p') return repAging(E, t, '3101');
  if (sub === 'pstmt') return repPartnerStmt(E, f, t, state.partner || '');
  if (sub === 'equity') return repEquity(E, f, t);
  if (sub === 'entry') return repManual(biz, f, t);
  if (sub === 'expenses') return repExpenses(biz, f, t);
  if (sub === 'vouchers') return repVouchers(biz, f, t);
  if (sub === 'catalog') return repCatalog(biz);
}
function repStockNow(biz) {
  var lb = lastBuys(biz);
  var rows = stockRows(biz).map(function (r) {
    var q = round2(r.shop + r.wh), b = lb[r.name] || {};
    return { name: r.name, cat: r.cat, shop: round2(r.shop), wh: round2(r.wh), q: q, buy: buyText(b), rate: b.rate || '', cargo: b.cargo || '', cost: r.cost || '', val: r.cost ? round2(Math.max(0, q) * r.cost) : '',
             price: r.price || '', pval: r.price ? round2(Math.max(0, q) * r.price) : '' };
  }).filter(function (r) { return r.q || r.cost; });
  return { title: 'Барааны үлдэгдэл (' + todayStr() + ')', cols: [c('name', 'Бараа'), c('cat', 'Ангилал'), m('shop', 'Дэлгүүр'), m('wh', 'Агуулах'), m('q', 'Нийт'),
    c('buy', 'Сүүлд авсан үнэ'), m('rate', 'Ханш'), m('cargo', 'Карго/ш'), m('cost', 'Өртөг үнэ'), m('val', 'Өртгөөр'), m('price', 'Зарах үнэ'), m('pval', 'Зарах үнээр')], rows: rows,
    total: { name: 'Нийт', val: sum(rows, 'val'), pval: sum(rows, 'pval') } };
}
function repPartnerList(biz) {
  var rows = partners.filter(function (p) { return p.biz === biz; }).map(function (p) { return { kind: p.kind, name: p.name, tin: p.tin, phone: p.phone, note: p.note }; });
  return { title: 'Харилцагчид', cols: [c('kind', 'Төрөл'), c('name', 'Нэр'), c('tin', 'ТТД / Регистр'), c('phone', 'Утас'), c('note', 'Тайлбар')], rows: rows };
}
function repExpenses(biz, f, t) {   // дэлгүүрээс бичсэн зарлага, касс хаалт (Baaz-ийн «Кассын зарлага»)
  var rows = records.filter(function (x) { return x.biz === biz && (x.type === 'expense' || x.type === 'close') && x.date >= f && x.date <= t; }).slice().reverse().map(function (x) {
    var ex = x.type === 'expense';
    return { date: x.date + ' ' + x.time, kind: ex ? 'Зарлага' : 'Касс хаалт', cat: ex ? x.category : (x.diff ? 'Зөрүү ' + (x.diff > 0 ? '+' : '−') + fmt(Math.abs(x.diff)).slice(1) : 'Зөрүүгүй'),
             acc: ex ? (function (a) { return a + ' ' + accName(a); })(expenseAcc(x.category, biz, costEngine(biz, R()).since !== '')) : (x.diff ? (x.diff < 0 ? '7404 ' + accName('7404') : '5201 ' + accName('5201')) : ''),
             note: ex ? x.note : 'Тоолсон ' + fmt(x.counted), staff: x.staff, amount: ex ? x.amount : '', _id: x.id };
  });
  return { title: 'Зарлага, касс хаалт', cols: [c('date', 'Огноо'), c('kind', 'Төрөл'), c('cat', 'Ангилал'), c('acc', 'Дебет данс'), c('note', 'Тайлбар'), c('staff', 'Ажилтан'), m('amount', 'Дүн')],
    rows: rows, total: { date: 'Нийт', amount: sum(rows, 'amount') } };
}
function repManual(biz, f, t) {
  var rows = journal.filter(function (j) { return j.biz === biz && j.date >= f && j.date <= t; }).slice().reverse().map(function (j) {
    return { date: j.date, dr: j.dr + ' ' + accName(j.dr), cr: j.cr + ' ' + accName(j.cr), amount: j.amount, partner: j.partner, desc: j.desc, by: j.by, _id: j.id };
  });
  return { title: 'Гараар оруулсан журналын бичилт', cols: [c('date', 'Огноо'), c('dr', 'Дебет'), c('cr', 'Кредит'), m('amount', 'Дүн'), c('partner', 'Харилцагч'),
    c('desc', 'Гүйлгээний утга'), c('by', 'Хэн')], rows: rows, total: { date: 'Нийт', amount: sum(rows, 'amount') } };
}

// ── Ажилтны хүсэлтүүд: мөнгөний хүсэлт (Санхүү), тооллого (Бараа материал) — удирдлага мөр бүрийг баталгаажуулна ──
var vcReq = '';   // зарлагын баримт аль мөнгөний хүсэлтийг төлж байгаа
function pendRequests(biz) { return records.filter(function (x) { return x.type === 'request' && x.biz === biz && !x.status; }); }
function pendCounts(biz) { return (window.stockCounts || []).filter(function (m) { return m.biz === biz; }); }
function navCount(k) {   // цэсийн тоо: хүлээгдэж буй хүсэлт, тооллого, тулгаагүй банкны гүйлгээ, илгээгээгүй захиалга
  if (k === 'requests') return pendRequests(state.biz).length;
  if (k === 'counts') return pendCounts(state.biz).length;
  if (k === 'bank') return (typeof bankLines !== 'undefined' ? bankLines : []).filter(function (l) { return l.biz === state.biz && l.status === 'Шинэ'; }).length;
  if (k === 'orders') return (window.adminOrders || []).filter(function (o) { return o.biz === state.biz && o.status === 'Шинэ'; }).length;
  return 0;
}
function navBadge(k) { var n = navCount(k); return n ? '<i class="nb-badge">' + n + '</i>' : ''; }
function sgToggle(id) { var s = load('nb_sg_shut', {}); if (s[id]) delete s[id]; else s[id] = 1; save('nb_sg_shut', s); render(); }
// Дэд цэсийн жижиг дүрс (хуудас бүрийн утгаар)
var SUB_ICO = {
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h5M9.5 15.5h5"/>', cart: '<path d="M3 4h2l2.4 10.5h9.8L19.5 7H6.2"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>',
  bars: '<path d="M4 20h16M7 16v-5M12 16V7M17 16v-8"/>', pie: '<path d="M12 3v9h9a9 9 0 11-9-9z"/>', user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>', receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', in: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4 19h16"/>', check: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>', people: '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.4"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M15 15c2.4 0 4.3 1.2 5 4"/>',
  swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>', trend: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>', wallet: '<path d="M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H4z"/><path d="M4 7l11-3v3M16 13.5h2"/>',
  bank: '<path d="M3 9.5L12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 20h17"/>', list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  scale: '<path d="M12 4v16M5 20h14M6 7h12M6 7l-3 6a3 3 0 006 0zM18 7l-3 6a3 3 0 006 0z"/>', loan: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2s1.2 1.6 2.8 1.9 2.8.8 2.8 2-1.2 2-2.8 2c-1.3 0-2.4-.5-2.8-1.4M12 6.5v1.3M12 16.2v1.3"/>',
  pay: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9v6M17.5 9v6"/>', hand: '<path d="M7 12V6.5a1.5 1.5 0 013 0V11M10 10V5a1.5 1.5 0 013 0v5M13 10V6.5a1.5 1.5 0 013 0V13c0 4-2.5 7-6 7-2.5 0-4-1.5-5-3.5L3.5 13a1.5 1.5 0 012.6-1.4L7 13"/>',
  flow: '<path d="M4 7h10M4 12h16M4 17h7"/><path d="M17 4l3 3-3 3"/>', book: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>', more: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>'
};
var SUB_ICO_OF = { recv: 'in', payb: 'pay', receipts: 'receipt', orders: 'cart', item: 'bars', cat: 'pie', staff: 'user', day: 'cal', pay: 'card', disc: 'tag', slow: 'clock', boost: 'bolt', ebarimt: 'doc',
  catalog: 'box', stock: 'layers', in: 'in', counts: 'check', po: 'truck', suppliers: 'people', move: 'swap', prices: 'trend',
  cashacc: 'wallet', bank: 'bank', money: 'list', debts: 'scale', loans: 'loan', payroll: 'pay', requests: 'hand', daily: 'cal', expcat: 'pie', cashflow: 'flow', months: 'bars',
  journal: 'book', ledger: 'doc', accounts: 'list', other: 'more' };
function subIco(k) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + SUB_ICO[SUB_ICO_OF[k] || 'doc'] + '</svg>'; }
function pendTags(biz) {
  var r = pendRequests(biz).length, c = pendCounts(biz).length;
  return (r ? ' <span class="tag r">Мөнгөний хүсэлт ' + r + '</span>' : '') + (c ? ' <span class="tag r">Тооллого ' + c + '</span>' : '');
}
function requestsView() {
  var biz = state.biz, tab = state.reqTab || 'a';   // шийдсэн хүсэлт энд үлдэнэ (Төлсөн / Татгалзсан табаар)
  var all = records.filter(function (x) { return x.type === 'request' && x.biz === biz; });
  all.sort(function (a, b) { return (!b.status) - (!a.status) || ((a.date + (a.time || '')) < (b.date + (b.time || '')) ? 1 : -1); });
  var TB = { a: ['Бүгд', function () { return true; }], p: ['Хүлээгдэж', function (x) { return !x.status; }], d: ['Төлсөн', function (x) { return x.status === 'Төлсөн'; }], r: ['Татгалзсан', function (x) { return x.status === 'Татгалзсан'; }] };
  var list = all.filter(TB[tab][1]);
  var st = function (s) { return !s ? '<span class="st y">Хүлээгдэж</span>' : s === 'Төлсөн' ? '<span class="st g">Төлсөн</span>' : '<span class="st r">' + esc(s) + '</span>'; };
  return '<p class="hint">Ажилтны илгээсэн мөнгөний хүсэлт. «Төлөх» дарахад зарлагын баримт бөглөгдөж нээгдэнэ — шалгаад хадгалахад хүсэлт «Төлсөн» болно.</p>' +
    '<div class="tabs" style="margin-bottom:10px">' + Object.keys(TB).map(function (k) {
      return '<button class="' + (tab === k ? 'on' : '') + '" onclick="state.reqTab=\'' + k + '\';render()">' + TB[k][0] + ' (' + all.filter(TB[k][1]).length + ')</button>'; }).join('') + '</div>' +
    '<div class="card"><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Ажилтан</th><th>Юунд</th><th>Хэнд (данс)</th><th>Тайлбар</th><th class="n">Дүн</th><th>Төлөв</th><th></th></tr>' +
    (list.length ? list.map(function (x) {
      return '<tr><td>' + esc(x.date.slice(5) + ' ' + (x.time || '')) + '</td><td>' + esc(x.staff || '') + '</td><td>' + esc(x.category || '') + '</td><td>' + esc(x.customer || '') + '</td>' +
        '<td>' + esc(String(x.note || '')) + '</td><td class="n"><b>' + fmt(x.amount) + '</b></td><td>' + st(x.status) + '</td><td class="n" style="white-space:normal;min-width:120px">' +
        (!x.status ? '<button class="mini" style="color:var(--accent)" onclick="reqPay(\'' + esc(x.id) + '\',\'ХЗ\')">Төлөх (банк)</button> <button class="mini" style="color:var(--accent)" onclick="reqPay(\'' + esc(x.id) + '\',\'КЗ\')">Касснаас</button> ' +
          '<button class="mini" onclick="reqReject(\'' + esc(x.id) + '\')">Татгалзах</button>' : '') + '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="muted">' + TB[tab][0] + ' хүсэлт алга</td></tr>') + '</table></div></div>';
}
function reqPay(id, kind) {
  var x = records.filter(function (r) { return r.id === id; })[0]; if (!x) return;
  openVoucher(kind);
  var acc = expenseAcc(x.category, x.biz, !!costEngine(x.biz, R()).since);
  if (![].some.call($('vcPurpose').options, function (o) { return o.value === acc; })) $('vcPurpose').insertAdjacentHTML('beforeend', '<option value="' + acc + '">' + esc(accName(acc)) + ' — ' + acc + '</option>');
  $('vcPurpose').value = acc; vcPurpose();
  $('vcAmount').value = x.amount; $('vcPartner').value = String(x.customer || '').slice(0, 80);
  $('vcDesc').value = 'Мөнгөний хүсэлт · ' + x.category + (x.note ? ' · ' + x.note : '') + ' (' + (x.staff || '') + ') #' + x.id;
  vcReq = id;
}
function reqReject(id) {
  if (!confirm('Энэ хүсэлтийг татгалзах уу?')) return;
  reqSetStatus(id, 'Татгалзсан');
}
function reqSetStatus(id, status, ref) {
  var apply = function () { records.forEach(function (r) { if (r.id === id) r.status = status; }); render(); };
  if (!API_URL) { var all = load('nb_records', []); all.forEach(function (r) { if (r.id === id) r.status = status; }); save('nb_records', all); apply(); toast('Хүсэлт: ' + status); return; }
  post({ type: 'admin_record', statusId: id, status: status, by: ownerName, ref: ref || '' }, function (err) {
    if (err) { toast(err === 'state' ? 'Хүсэлт аль хэдийн шийдэгдсэн' : 'Хүсэлтийн төлөв хадгалагдсангүй: ' + err); return; }
    apply(); toast('Хүсэлт: ' + status);
  });
}
function countsView() {
  var list = pendCounts(state.biz).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return '<p class="hint">Ажилтны тоолсон тоо системийнхээс зөрсөн бараа. «Батлах» дарвал зөрүүгээр үлдэгдэл засагдана (дутсан бол хорогдолд орно), «Татгалзах» бол юу ч өөрчлөгдөхгүй.</p>' +
    '<div class="card"><div class="scroll"><table class="rep-t"><tr><th>Тоолсон цаг</th><th>Тоолсон хүн</th><th>Байршил</th><th>Бараа</th><th>Тоолсон / систем</th><th class="n">Зөрүү</th><th></th></tr>' +
    (list.length ? list.map(function (m) {
      return '<tr><td>' + esc(String(m.date).slice(5)) + '</td><td>' + esc(m.by || '') + '</td><td>' + esc(m.loc || '') + '</td><td>' + esc(m.item) + '</td><td>' + esc(m.note || '') + '</td>' +
        '<td class="n"><b class="' + (m.qty < 0 ? 'neg' : '') + '">' + (m.qty > 0 ? '+' : '') + m.qty + '</b></td><td class="n" style="white-space:nowrap">' +
        '<button class="mini" style="color:var(--accent)" onclick="countAct(\'' + esc(m.id) + '\',1)">Батлах</button> <button class="mini" onclick="countAct(\'' + esc(m.id) + '\',0)">Татгалзах</button></td></tr>';
    }).join('') : '<tr><td colspan="7" class="muted">Батлах тооллого алга</td></tr>') + '</table></div></div>';
}
function countAct(id, ok) {
  if (!ok && !confirm('Энэ тооллогыг татгалзах уу?')) return;
  if (!API_URL) {
    var all = load('nb_demo_counts', []), m = all.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    m.status = ok ? '' : 'Устгасан'; save('nb_demo_counts', all);
    if (ok) { moves.push(m); save('nb_demo_moves', moves); var st = stockData[m.biz] = stockData[m.biz] || {}, it = st[m.item] = st[m.item] || { shop: 0, wh: 0 }; it[m.loc === 'Агуулах' ? 'wh' : 'shop'] += m.qty; save('nb_demo_stock', stockData); }
    window.stockCounts = all.filter(function (x) { return x.status === 'Хүлээгдэж'; }); render(); toast(ok ? 'Баталлаа' : 'Татгалзлаа'); return;
  }
  post(ok ? { type: 'admin_stock', approveId: id, by: ownerName } : { type: 'admin_stock', cancelId: id, by: ownerName }, function (err, d) {
    if (err) { toast(err === 'negative' ? 'Батлах боломжгүй — үлдэгдэл хасах болно (' + ((d && d.item) || '') + ')' : 'Алдаа: ' + err); return; }
    toast(ok ? 'Баталлаа — үлдэгдэл засагдлаа' : 'Татгалзлаа'); refresh();
  });
}
function subBody() {
  var mod = state.module, sub = state.sub[mod];
  if (mod === 'products' && sub === 'stock') return productsModule();
  if (mod === 'products' && sub === 'counts') return countsView();
  if (mod === 'finance' && sub === 'requests') return requestsView();
  if (mod === 'finance' && sub === 'dash') return financeDash();
  if (mod === 'finance' && sub === 'simple') return simpleView();
  if (mod === 'finance' && sub === 'daily') return dailyView();
  if (mod === 'finance' && sub === 'accounts') return accountsView();
  if (mod === 'finance' && sub === 'cashacc') return cashAccView();
  if (mod === 'finance' && sub === 'expcat') return expcatView();
  if (mod === 'finance' && sub === 'monthly') return monthlyView();
  if (mod === 'finance' && sub === 'glossary') return glossaryView();
  if (mod === 'finance' && sub === 'close') return closeView();
  if (mod === 'finance' && sub === 'bank') return bankView();
  if (mod === 'finance' && sub === 'opening') return openingView();
  if (mod === 'finance' && sub === 'lock') return lockView();
  if (mod === 'finance' && HUBS[sub]) return hubView(sub);
  if (mod === 'finance' && sub === 'loans') return loansView();
  if (mod === 'finance' && sub === 'banklink') return bankLinkView();
  if (mod === 'finance' && sub === 'assets') return assetsView();
  if (mod === 'finance' && sub === 'digest') return digestView();
  if (mod === 'sales' && sub === 'buuhia') return ebAdmView();
  if (mod === 'products' && sub === 'po') return poView();
  var rep = makeReport(mod, sub), pre = '', post = '';
  if (mod === 'finance') { var rr = range(); addDrill(sub, rep, rr[0], rr[1]); }
  if (mod === 'finance' && (sub === 'months' || sub === 'payroll')) pre = yearBar();
  if (mod === 'finance' && sub === 'months') post = fdForecast(J(), yearOf()) + monthTypeCard(J(), yearOf());
  if (mod === 'finance' && sub === 'money') pre = moneyPre(J(), range()[0], range()[1]);
  if (mod === 'finance' && (sub === 'debts' || sub === 'recv' || sub === 'payb')) pre = debtsPre(J());
  if (mod === 'sales' && sub === 'customers') pre = '<div class="filter"><label>Хайх<input class="search" placeholder="Утас эсвэл нэр…" value="' + esc(state.cq || '') + '" oninput="state.cq=this.value;render();var e=document.querySelector(\'.filter .search\');e.focus();e.setSelectionRange(e.value.length,e.value.length)"></label></div>';
  if (mod === 'sales' && sub === 'orders') pre = '<div class="tabs" style="margin-bottom:10px">' + [['wait', 'Баталгаажаагүй'], ['check', 'Ажилтан «орсон» гэсэн'], ['conf', 'Баталгаажсан'], ['all', 'Бүгд']].map(function (t) {
    var n = (window.adminOrders || []).filter(function (o) { return o.biz === state.biz; }).filter(ordFilt(t[0])).length;
    return '<button class="' + ((state.ordF || 'wait') === t[0] ? 'on' : '') + '" onclick="state.ordF=\'' + t[0] + '\';render()">' + t[1] + ' <small>' + n + '</small></button>'; }).join('') + '</div>';
  if (mod === 'finance' && sub === 'pstmt') {
    var names = {}; J().forEach(function (e) { if (e.partner && /^(1201|1503|3101)$/.test(e.dr + '') || e.partner && /^(1201|1503|3101)$/.test(e.cr + '')) names[e.partner] = 1; });
    partners.filter(function (p) { return p.biz === state.biz; }).forEach(function (p) { names[p.name] = 1; });
    pre = '<div class="filter"><label>Харилцагч<select onchange="state.partner=this.value;render()"><option value="">— Сонгох —</option>' + Object.keys(names).sort().map(function (n) {
      return '<option' + (state.partner === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></label></div>';
    if (!state.partner) return pre + '<p class="muted">Харилцагчаа сонгоно уу.</p>';
  }
  if (mod === 'finance' && sub === 'ledger') pre = ledgerPicker();
  if (mod === 'finance' && sub === 'entry') pre = '<p class="hint">Борлуулалт, зарлага, бараа, цалин санхүүд <b>автоматаар</b> бичигддэг. Энд зөвхөн бусад гүйлгээг (эхний үлдэгдэл, хөрөнгө оруулалт, зээл, банкинд тушаах, нийлүүлэгчид төлөх г.м) оруулна.</p>';
  if (sub === 'entry') rep.edit = 'editEntry';
  if (mod === 'sales' && /^(receipts|orders|item|disc)$/.test(sub)) pre += searchBox(sub === 'orders' ? 'Утас, нэр, бараагаар хайх…' : sub === 'item' ? 'Барааны нэрээр хайх…' : 'Бараа, хэрэглэгч, утас, ажилтан, ДДТД-аар хайх…');
  return pre + reportCard(rep, { entry: 'cancelEntry', in: 'cancelMove', expenses: 'cancelRecord', boost: 'cancelRecord', vouchers: 'cancelEntry', catalog: 'openProduct' }[sub]) + post;
}

// Буухиа (ebuuhia) — удирдлага: шинэ захиалгыг илгээх, төлөв татах (хүргэгдсэнийг автоматаар хаана), «Бүртгэгдсэн»-ийг устгах
var ebAdm = { biz: '', list: null, at: '', t: 0, busy: false, err: '', sel: {}, rec: false, off: {}, fee: {}, line: null };
window.ebRedraw = function (keep) {
  var el = document.getElementById('ebAdmBox'); if (el) el.innerHTML = ebAdmBody();
  if (keep) { var q = document.getElementById('ebQ'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
};
function ebAdmErr(err) { return err === 'eb_off' ? 'Буухиа API тохируулаагүй байна (Санхүү → Банкны хуулга → «Буухиа API»).' : String(err); }
function ebAdmPull(fresh) {
  if (ebAdm.busy) return; ebAdm.busy = true; ebAdm.biz = state.biz; ebAdm.t = Date.now(); ebRedraw();
  post({ type: 'admin_eb', op: 'sync', biz: state.biz, fresh: !!fresh }, function (err, d) {
    ebAdm.busy = false;
    ebAdm.err = err ? 'Татаж чадсангүй: ' + ebAdmErr(err) : '';
    if (err === 'auth') { ebAdm.err = ''; ebAdm.t = 0; }   // нэвтрэлт дууссан — дахин нэвтэрмэгц шууд татна, хуучин алдаа үлдэхгүй
    if (!err) { ebAdm.list = d.list || []; ebAdm.at = new Date().toTimeString().slice(0, 5); if (d.delivered) { toast(d.delivered + ' захиалга «Хүргэгдсэн» боллоо'); refresh(); } ebAutoBook(); }
    ebRedraw();
  });
}
function ebAdmItems(o) {
  var L = o.items; if (typeof L === 'string') { try { L = JSON.parse(L || '[]'); } catch (e) { L = []; } }
  return (L || []).filter(function (i) { return i.name !== FEE_ITEM && i.name !== DISC_ITEM && i.name !== SPLIT_ITEM; }).map(function (i) { return i.name + ((Number(i.qty) || 1) > 1 ? ' ×' + i.qty : ''); }).join(', ');
}
function ebAdmFresh() { return (window.adminOrders || []).filter(function (o) { return o.biz === state.biz && !o.ebCode && (o.status === 'Шинэ' || o.status === 'Буухиад өгсөн'); })
  .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }); }
function ebAdmSend(other) {   // other — буухиад өгөхгүй, өөрсдөө / бусад хүргэлтээр (буухиагийн хөлс бичигдэхгүй)
  var ids = Object.keys(ebAdm.sel).filter(function (k) { return ebAdm.sel[k]; });
  if (!ids.length || ebAdm.busy || !confirm(ids.length + (other ? ' захиалгыг бусад хүргэлтээр (буухиагүй) гаргах уу?' : ' захиалгыг буухиа руу илгээх үү?'))) return;
  ebAdm.busy = true; ebRedraw();
  post({ type: 'admin_eb', op: other ? 'other' : 'send', biz: state.biz, ids: ids }, function (err, d) {
    ebAdm.busy = false;
    if (err) { alert('Хадгалж чадсангүй: ' + ebAdmErr(err)); ebRedraw(); return; }
    ebAdm.sel = {};
    if (other) { if (d.skipped.length) alert('Үлдэгдэл хүрэлцэхгүй тул «Шинэ» хэвээр ' + d.skipped.length); toast(d.shipped.length + ' захиалга бусад хүргэлтээр гарлаа'); refresh(); ebRedraw(); return; }
    alert(d.sent.length + ' хүргэлт буухиад үүслээ.' + (d.failed.length ? '\n\nИлгээгдээгүй ' + d.failed.length + ':\n' + d.failed.map(function (x) { return x.phone + ': ' + x.why; }).join('\n') : '') +
      (d.skipped.length ? '\n\nҮлдэгдэл хүрэлцэхгүй тул «Шинэ» хэвээр ' + d.skipped.length + ':\n' + d.skipped.map(function (x) { return (x.phone || '') + ': ' + x.why; }).join('\n') : ''));
    refresh(); ebAdmPull();
  });
}
window.ebDel = function (code) {
  if (ebAdm.busy || !confirm('Буухиагаас ' + code + ' хүргэлтийг устгах уу?')) return;
  ebAdm.busy = true; ebRedraw();
  post({ type: 'admin_eb', op: 'del', biz: state.biz, code: code }, function (err) {
    ebAdm.busy = false;
    if (err) { alert('Устгаж чадсангүй: ' + ebAdmErr(err)); ebRedraw(); return; }
    toast('Буухиагаас устгагдлаа'); refresh(); ebAdmPull();
  });
};
function ebAdmBody() {
  var fresh = ebAdmFresh(), nSel = fresh.filter(function (o) { return ebAdm.sel[o.id]; }).length;
  var send = fresh.length ? '<div class="eb-send"><div class="ord-bar"><h3 style="margin:0;flex:1">Буухиа руу илгээх <small class="muted" style="font-weight:400">' + fresh.length + '</small></h3>' +
    '<button class="b-btn ghost" onclick="ebAdmSend(\'other\')"' + (nSel && !ebAdm.busy ? '' : ' disabled') + '>Бусад хүргэлтээр (' + nSel + ')</button>' +
    '<button class="b-btn" onclick="ebAdmSend()"' + (nSel && !ebAdm.busy ? '' : ' disabled') + '>Буухиа руу илгээх (' + nSel + ')</button></div>' +
    '<div class="eb-wrap"><table class="tbl eb-t"><tr><th style="width:28px"><input type="checkbox" onchange="ebAdmFresh().forEach(function(o){ebAdm.sel[o.id]=this.checked},this);ebRedraw()"></th><th>Огноо</th><th>Хүлээн авагч</th><th>Хаяг</th><th>Бараа</th><th class="n">Дүн</th><th>Манай төлөв</th></tr>' +
    fresh.map(function (o) {
      return '<tr><td><input type="checkbox"' + (ebAdm.sel[o.id] ? ' checked' : '') + ' onchange="ebAdm.sel[\'' + o.id + '\']=this.checked;ebRedraw()"></td><td>' + esc(o.date) + '</td><td><b>' + esc(o.phone) + '</b>' + (o.customer ? '<br><small class="muted">' + esc(o.customer) + '</small>' : '') + '</td>' +
        '<td class="eb-addr">' + esc([o.district, o.address].filter(Boolean).join(', ')) + (o.district ? '' : ' <small style="color:#B45309">дүүрэг хоосон</small>') + '</td><td>' + esc(ebAdmItems(o)) + '</td><td class="n">' + fmt(o.amount) + '</td><td>' + esc(o.status) + '</td></tr>';
    }).join('') + '</table></div></div>' : '';
  return send + '<div class="ord-bar" style="margin-top:' + (send ? '18px' : '0') + '"><h3 style="margin:0;flex:1">Буухиа дээрх хүргэлтүүд</h3>' +
    '<a class="b-btn" href="https://ebuuhia.com/report/customer" target="_blank" rel="noopener">Буухиа руу нэвтэрч тооцоо нийлэх</a>' +
    '<button class="b-btn ghost" onclick="ebAdmPull(true)"' + (ebAdm.busy ? ' disabled' : '') + '>' + (ebAdm.busy ? 'Хүлээнэ үү…' : 'Шинэчлэх') + '</button></div>' +
    (ebAdm.err ? '<p style="color:#B91C1C">' + esc(ebAdm.err) + '</p>' : '') +
    (ebAdm.list && ebAdm.biz === state.biz ? ebBoard(ebAdm.list, ebAdm.at) : '<p class="muted">' + (ebAdm.busy ? 'Буухиагаас татаж байна…' : '') + '</p>');
}
// ── Буухиатай тооцоо нийлэх ──
// Үнийн дүнтэй хүргэлт: буухиа хэрэглэгчээс мөнгө авч, өөрийн хөлсийг суутгаад үлдэгдлийг шилжүүлнэ.
// Үнийн дүнгүй (бидэнд төлсөн): хөлсийг буухиа бидэнээс авна — дараагийн шилжүүлгээс суутгах эсвэл бид төлнө.
// Нэг шилжүүлэг (эсвэл төлбөр) = Σ авсан мөнгө − Σ хөлс. Хүргэлт бүрээр: Дт банк / Кт 1201 (авсан), Дт 3101 Буухиа / Кт банк (хөлс) → банкны цэвэр дүн тэнцэнэ.
function ebSettled() { var m = {}; (journal || []).forEach(function (j) { (String(j.desc).match(/#EB:[\w-]+/g) || []).forEach(function (t) { m[t.slice(4)] = 1; }); }); return m; }
// Буухиа тооцоо нийлэхдээ хүргэлтүүдийг нэг дор шинэчилдэг (updated_at ижил, хаагдсаны дараа) — тэр багцад орсон нь нийлсэн
function ebRaw(x, k) { var p = (x.raw || []).filter(function (y) { return y[0] === k; })[0]; return p ? p[1] : ''; }
function ebSettledByEb(list) {
  var c = {}, late = function (x) { var u = ebRaw(x, 'updated_at'); return u && u > ebRaw(x, 'closed_at') ? u : ''; };
  list.forEach(function (x) { var u = late(x); if (u) c[u] = (c[u] || 0) + 1; });
  var m = {}; list.forEach(function (x) { var u = late(x); if (u && c[u] >= 2) m[x.code] = u; }); return m;
}
// Буухиагийн хүргэгдсэн хүргэлт бүрийг манай захиалгатай холбоно: эхлээд кодоор (захиалгын ID), дараа нь кодгүй хуучин захиалгыг утсаар (хөлс нь хүргэх үед өглөгөөр бичигдсэн тул)
function ebLink() {
  var O = {}, byPh = {}, used = {}, M = {}, orders = window.adminOrders || [];
  orders.forEach(function (o) { O[o.id] = o; });
  var L = (ebAdm.list || []).filter(function (x) { return x.st === 10; }).sort(function (a, b) { return a.created < b.created ? -1 : 1; });
  L.forEach(function (x) { if (O[x.id]) { M[x.code] = O[x.id]; used[x.id] = 1; } });
  orders.forEach(function (o) { if (o.biz === state.biz && !o.ebCode && ebOrdAuto(o) && ordFeeAdm(o) > 0 && o.status === 'Хүргэгдсэн') (byPh[o.phone] = byPh[o.phone] || []).push(o); });
  L.forEach(function (x) { if (!M[x.code]) { var c = (byPh[x.phone] || []).filter(function (q) { return !used[q.id]; })[0]; if (c) { M[x.code] = c; used[c.id] = 1; } } });
  // утасгүй хуучин захиалга: хаягийн тоонууд (байр, давхар, тоот) 2-оос олон давхцвал холбоно
  var nums = function (t) { return String(t || '').match(/\d+/g) || []; };
  (byPh[''] || []).forEach(function (o) {
    if (used[o.id]) return; var on = nums(o.address);
    var x = L.filter(function (y) { return !M[y.code] && nums(y.addr).filter(function (n) { return on.indexOf(n) >= 0; }).length >= 2; })[0];
    if (x) { M[x.code] = o; used[o.id] = 1; }
  });
  return M;
}
function ebRecRows() {   // буухиагийн «Харилцагчийн тайлан»-тай ижил: буухиа нийлээгүй бүх хүргэлт (манай захиалгагүй, цуцалсан ч), хөлс анхдагч 7,000
  // k: 'open' — нийлэх; 'booked' — манай журналд өмнө бичсэн (дахин бичихгүй); 'cancel' — цуцалсан, хөлсгүй
  var done = ebSettled(), eb = ebSettledByEb(ebAdm.list || []), O = {}, M = ebLink();
  (window.adminOrders || []).forEach(function (o) { O[o.id] = o; });
  return (ebAdm.list || []).filter(function (x) { var o = O[x.id]; return (x.st === 10 || x.st === 11) && !eb[x.code] && !(o && x.got > 0 && o.confirmed); })
    .map(function (x) {
      var k = x.st === 11 ? 'cancel' : done[x.code] ? 'booked' : 'open', o = M[x.code] || null, fb = ebOrdAuto(o) ? ordFeeAdm(o) : 0;
      return { x: x, o: o, fb: fb, k: k, fee: k === 'cancel' ? 0 : ebAdm.fee[x.code] != null ? ebAdm.fee[x.code] : 7000, on: k === 'open' ? 1 : 0 };
    })
    .sort(function (a, b) { return a.x.created < b.x.created ? -1 : 1; });
}
function ebRecCount() { return ebAdm.list ? ebRecRows().length : ''; }
function ebRecBody() {   // зөвхөн харах — тооцоог буухиагийн сайтад нийлнэ, нийлсний дараа өглөг автоматаар бичигдэнэ (ebAutoBook)
  var R = ebRecRows(), op = R.filter(function (r) { return r.k === 'open'; });
  var got = r0(op.reduce(function (a, r) { return a + r.x.got; }, 0)), fee = r0(op.reduce(function (a, r) { return a + r.fee; }, 0)), net = r0(got - fee);
  var bar = '<div class="bar-row" style="margin:0 0 8px;gap:8px;align-items:center"><a class="b-btn" href="https://ebuuhia.com/report/customer" target="_blank" rel="noopener">Буухиа руу нэвтэрч тооцоо нийлэх</a>' +
    '<small class="muted">Буухиагийн «Харилцагчийн тайлан» дээр «Тайлан нийлэх» дарсны дараа энд «Шинэчлэх» дарахад нийлсэн хүргэлтийн авлага, өглөг автоматаар бичигдэнэ.</small></div>';
  if (!R.length) return bar + '<p class="muted">Нийлээгүй хүргэлт алга.</p>';
  var rows = R.map(function (r, i) {
    var note = r.k === 'booked' ? 'манай журналд бичсэн' : r.k === 'cancel' ? 'цуцалсан' : r.o ? '' : 'захиалгагүй';
    return '<tr' + (r.k === 'open' ? '' : ' style="color:#6B7280"') + '><td class="n">' + (i + 1) + '</td><td>' + esc(r.x.created) + '</td><td><b>' + esc(r.x.phone) + '</b>' + (note ? '<br><small class="muted">' + note + '</small>' : '') + '</td><td>' + esc(r.x.driver || '') + '</td><td><b class="mono2">' + esc(r.x.code) + '</b></td>' +
      '<td class="eb-addr">' + esc(r.x.addr || '') + '</td><td class="n">' + (r.x.price ? fmt(r.x.price) : '<small class="muted">0</small>') + '</td><td class="n">' + (r.x.got ? fmt(r.x.got) : '<small class="muted">0</small>') + '</td>' +
      '<td class="n">' + fmt(r.fee) + '</td><td class="n">' + fmt(r0(r.x.got - r.fee)) + '</td><td><small>' + esc(r.x.name || '') + '</small></td></tr>';
  }).join('');
  return bar + '<div class="eb-wrap"><table class="tbl eb-t"><tr><th>#</th><th>Огноо</th><th>Хэрэглэгч</th><th>Жолооч</th><th>Хүргэлт ID</th><th>Хаяг</th><th class="n">Дүн</th><th class="n">Авсан</th><th class="n">Хүргэлт</th><th class="n">Цэвэр</th><th>Төлөв</th></tr>' + rows +
    '<tr class="tot"><td colspan="7"><b>' + R.length + ' хүргэлт</b>' + (op.length < R.length ? ' <small class="muted">(нийлсний дараа бичигдэх ' + op.length + ')</small>' : '') + '</td><td class="n"><b>' + fmt(got) + '</b></td><td class="n"><b>' + fmt(fee) + '</b></td><td class="n"><b>' + fmt(net) + '</b></td><td></td></tr></table></div>' +
    (op.length ? '<p style="margin:10px 0 6px"><b>' + (net >= 0 ? 'Буухиа бидэнд шилжүүлэх: ' + fmt(net) + ' (авлага)' : 'Бид буухиад төлөх: ' + fmt(-net) + ' (өглөг)') + '</b></p>' : '');
}
// Буухиа тайлангаа нийлсэн (ebSettledByEb) ч манай журналд #EB тэмдэггүй хүргэлтийн тооцоог нийлсэн өдрөөр нь бичнэ.
// EB_AUTO_FROM-оос өмнөх багцууд хуучин аргаар (хүргэх үеийн өглөг, банкаар) бичигдсэн тул орхино.
var EB_AUTO_FROM = '2026/10/26';
function ebAutoBook(fresh) {
  if (ebAdm.booking || !ebAdm.list || !(window.adminOrders || []).length || !(journal || []).length) return;   // журнал ачаалаагүй бол давхар бичихгүй
  var done = ebSettled(), eb = ebSettledByEb(ebAdm.list), O = {}, M = ebLink(), B = {};
  window.adminOrders.forEach(function (o) { O[o.id] = o; });
  ebAdm.list.forEach(function (x) {
    var t = eb[x.code], o = O[x.id];
    if (x.st !== 10 || !t || t < EB_AUTO_FROM || done[x.code] || (o && x.got > 0 && o.confirmed)) return;
    var mo = M[x.code] || null;
    (B[t.slice(0, 10)] = B[t.slice(0, 10)] || []).push({ x: x, o: mo, fb: ebOrdAuto(mo) ? ordFeeAdm(mo) : 0, fee: ebAdm.fee[x.code] != null ? ebAdm.fee[x.code] : 7000 });
  });
  var days = Object.keys(B); if (!days.length) return;
  // өөр таб/төхөөрөмж аль хэдийн бичсэн байж магадгүй — журналыг серверээс шинээр татаад дахин шалгана
  if (!fresh) { ebAdm.booking = true; fetchAll(function (ok) { ebAdm.booking = false; if (ok) ebAutoBook(true); }); return; }
  var biz = state.biz, E = [], ordUpd = [], tot = 0, n = 0;
  days.forEach(function (day) {
    var d = day.replace(/\//g, '-'), net = 0;
    B[day].forEach(function (r) {
      var tag = ' · ' + r.x.phone + (r.o ? ' #' + r.o.id : '') + ' #EB:' + r.x.code, cust = r.o ? ordCust(r.o) : r.x.phone;
      if (r.x.got > 0) {   // хэрэглэгчийн авлага буухиад шилжинэ (бичилт нэг л харилцагчтай тул 1299 түр дансаар дамжина, үлдэгдэл 0)
        E.push({ biz: biz, date: d, dr: '1299', cr: '1201', amount: r.x.got, partner: cust, desc: 'Буухиа тооцоо · хэрэглэгч буухиад төлсөн' + tag });
        E.push({ biz: biz, date: d, dr: '1201', cr: '1299', amount: r.x.got, partner: BUUHIA, desc: 'Буухиа тооцоо · авсан мөнгө' + tag });
        if (r.o && !r.o.confirmed) { r.o.confirmed = d + ' буухиа'; r.o.paid = 'Орсон'; ordUpd.push(r.o); }
      }
      var fromPay = Math.min(r.fee, r.fb), extra = r0(r.fee - r.fb);
      if (fromPay > 0) E.push({ biz: biz, date: d, dr: '3101', cr: '1201', amount: fromPay, partner: BUUHIA, desc: 'Буухиа тооцоо · хөлс' + tag });
      if (extra > 0) E.push({ biz: biz, date: d, dr: '7124', cr: '1201', amount: extra, partner: BUUHIA, desc: 'Буухиа тооцоо · хөлс' + (r.fb ? ' (нэмэлт)' : r.o ? '' : ' (захиалгагүй)') + tag });
      if (extra < 0) E.push({ biz: biz, date: d, dr: '3101', cr: '7124', amount: -extra, partner: BUUHIA, desc: 'Буухиа тооцоо · хөлс бага авсан' + tag });
      net = r0(net + r.x.got - r.fee); n++;
    });
    if (net < 0) E.push({ biz: biz, date: d, dr: '1201', cr: '3101', amount: -net, partner: BUUHIA, desc: 'Буухиа тооцоо ' + d + ' · бидний төлөх үлдэгдэл өглөг рүү' });
    tot = r0(tot + net);
  });
  ebAdm.booking = true;
  E.forEach(function (e, i) { journal.push(Object.assign({ id: 'tmp' + Date.now() + '-' + i, by: ownerName }, e)); });
  _debtCache = null; ebRedraw();
  var k = 1 + ordUpd.length, fin = function () { if (--k === 0) { ebAdm.booking = false; toast('Буухиа нийлсэн ' + n + ' хүргэлтийн тооцоо бичигдлээ — ' + (tot >= 0 ? 'буухиагийн авлага ' + fmt(tot) : 'буухиад төлөх ' + fmt(-tot))); refresh(); } };
  post({ type: 'admin_journal', by: ownerName, entries: E }, function (err) { if (err && err !== 'eb_dup') toast('Алдаа: ' + err); fin(); });   // eb_dup — өөр таб аль хэдийн бичсэн, refresh-ээр зөв журнал ирнэ
  ordUpd.forEach(function (o) { post({ type: 'admin_order', id: o.id, by: ownerName, fields: { confirmed: o.confirmed, note: 'Буухиа тооцоо ' + o.confirmed.slice(0, 10) } }, function () { fin(); }); });
}
// Манай 3101 «Буухиа» өглөг — захиалга бүрээр (журналаас)
function ebOurPay() {
  var P = {};
  J().forEach(function (e) {
    if (e.partner !== BUUHIA) return;
    var sg = e.cr === '3101' ? 1 : e.dr === '3101' ? -1 : 0; if (!sg) return;
    var m = String(e.desc).match(/#EB:([\w-]+)/), k = e.bill || (String(e.desc).match(/#(O\d+)/) || [])[1] || (m ? 'EB:' + m[1] : 'other');
    P[k] = (P[k] || 0) + sg * (+e.amount);
  });
  return P;
}
// Буухиагийн өгөгдөл ↔ манай журнал тулгалт: «өгөх хөлс» = урьдчилж төлсөн (авсан мөнгө 0) хүргэгдсэн хүргэлт бүрийн хөлс
function ebCheck() {
  var L = (ebAdm.list || []).filter(function (x) { return x.st === 10; }), M = ebLink(), P = ebOurPay(), tag = ebSettled(), eb = ebSettledByEb(ebAdm.list || []);
  var fee = function (x) { return ebAdm.fee[x.code] != null ? ebAdm.fee[x.code] : 7000; };
  var owe = L.filter(function (x) { return !(x.got > 0); }), expect = r0(owe.reduce(function (a, x) { return a + fee(x); }, 0));
  var ours = r0(Object.keys(P).reduce(function (a, k) { return a + P[k]; }, 0));
  var linked = {}; Object.keys(M).forEach(function (c) { linked[M[c].id] = 1; });
  var missing = owe.filter(function (x) { var o = M[x.code]; return !((o && P[o.id] > 0.5) || P['EB:' + x.code] > 0.5); });
  var extra = Object.keys(P).filter(function (k) { return P[k] > 0.5 && (/^O\d/.test(k) ? !linked[k] : /^EB:/.test(k) ? !L.some(function (x) { return 'EB:' + x.code === k; }) : true); });
  var open = ebRecRows(), inOpen = {}; open.forEach(function (r) { inOpen[r.x.code] = 1; });
  var done = L.filter(function (x) { return eb[x.code] || (tag[x.code] && !inOpen[x.code]); });
  return { L: L, owe: owe, expect: expect, ours: ours, diff: r0(ours - expect), missing: missing, extra: extra, P: P, M: M, open: open, done: done, tag: tag, eb: eb,
    ok: Math.abs(ours - expect) < 1 && !missing.length && !extra.length };
}
function ebCheckBanner() {
  var c = ebCheck(), O = {}; (window.adminOrders || []).forEach(function (o) { O[o.id] = o; });
  var head = '<div style="border:1px solid ' + (c.ok ? '#86EFAC' : '#F59E0B') + ';background:' + (c.ok ? '#F0FDF4' : '#FFFBEB') + ';border-radius:10px;padding:10px 12px;margin:0 0 12px">' +
    '<b>' + (c.ok ? 'Буухиагийн өгөгдөлтэй таарлаа' : 'Буухиагийн өгөгдөлтэй таарахгүй байна') + '</b>' +
    '<div style="font-size:12.5px;margin-top:4px">Буухиа: хүргэгдсэн ' + c.L.length + ', үүнээс урьдчилж төлсөн (авсан мөнгө 0) ' + c.owe.length + ' → бидний төлөх хөлс <b>' + fmt(c.expect) + '</b> · Манай журналын «Буухиа» өглөг <b>' + fmt(c.ours) + '</b>' + (c.diff ? ' · зөрүү <b style="color:#B45309">' + (c.diff > 0 ? '+' : '') + fmt(c.diff) + '</b>' : '') + '</div>';
  var bits = '';
  if (c.missing.length) bits += '<div style="font-size:12.5px;margin-top:6px"><b>Манайд өглөг бичигдээгүй хүргэлт (' + c.missing.length + '):</b> ' + c.missing.map(function (x) { return esc(x.phone) + ' <small class="muted">' + esc(x.created.slice(5, 10)) + '</small>'; }).join(', ') + '</div>';
  if (c.extra.length) bits += '<div style="font-size:12.5px;margin-top:6px"><b>Манайд өглөгтэй ч буухиад хүргэлт олдоогүй (' + c.extra.length + '):</b> ' + c.extra.map(function (k) { var o = O[k]; return esc(o ? o.phone : k) + ' <small class="muted">' + fmt(c.P[k]) + '</small>'; }).join(', ') + '</div>';
  return head + bits + '</div>';
}
function ebRecDoneBody() {
  var c = ebCheck(), O = {}; (window.adminOrders || []).forEach(function (o) { O[o.id] = o; });
  var fee = function (x) { return ebAdm.fee[x.code] != null ? ebAdm.fee[x.code] : 7000; };
  var D = c.done.slice().sort(function (a, b) { return a.created < b.created ? -1 : 1; });
  if (!D.length) return '<p class="muted">Нийлсэн хүргэлт алга.</p>';
  var gt = 0, ft = 0;
  var rows = D.map(function (x, i) {
    var o = c.M[x.code], when = c.eb[x.code] ? 'буухиа ' + c.eb[x.code].slice(5, 16) : 'манай нийлэлт';
    var st = c.tag[x.code] ? '<span style="color:#15803D">Тооцоо бичсэн</span>' : o && c.P[o.id] > 0.5 ? '<span style="color:#15803D">Өглөг бичигдсэн</span>' :
      x.got > 0 && o && o.confirmed ? '<span style="color:#15803D">Банкаар хаагдсан</span>' : x.got > 0 ? '<span style="color:#15803D">Мөнгө авсан</span>' : '<span style="color:#B45309">Журналд бичилтгүй</span>';
    gt += x.got; ft += fee(x);
    return '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(x.created) + '</td><td>' + esc(x.phone) + '</td><td>' + esc(x.driver || '') + '</td><td><b class="mono2">' + esc(x.code) + '</b></td><td class="eb-addr">' + esc(x.addr || '') + '</td><td class="n">' + (x.price ? fmt(x.price) : '0') + '</td><td class="n">' + fmt(x.got || 0) + '</td><td class="n">' + fmt(fee(x)) + '</td><td class="n">' + fmt(r0(x.got - fee(x))) + '</td><td><small>' + esc(when) + '</small></td><td>' + st + '</td></tr>';
  }).join('');
  return '<div class="eb-wrap"><table class="tbl eb-t"><tr><th>#</th><th>Огноо</th><th>Хэрэглэгч</th><th>Жолооч</th><th>Хүргэлт ID</th><th>Хаяг</th><th class="n">Дүн</th><th class="n">Авсан</th><th class="n">Хүргэлт</th><th class="n">Цэвэр</th><th>Нийлсэн</th><th>Манай журнал</th></tr>' + rows +
    '<tr class="tot"><td colspan="7"><b>' + D.length + ' хүргэлт</b></td><td class="n"><b>' + fmt(gt) + '</b></td><td class="n"><b>' + fmt(ft) + '</b></td><td class="n"><b>' + fmt(r0(gt - ft)) + '</b></td><td colspan="2"></td></tr></table></div>';
}
function ebRecPanel() {
  if (!ebAdm.list) return '<p class="muted" style="margin:14px 0">Буухиагаас татаж байна…</p>';
  var n = ebRecRows().length, nd = ebCheck().done.length;
  return '<div style="margin-top:12px">' + ebCheckBanner() +
    '<div class="ord-bar"><h3 style="margin:0;flex:1">Нийлээгүй хүргэлт <small class="muted" style="font-weight:400">' + n + '</small></h3></div>' + ebRecBody() +
    '<details style="margin-top:20px"' + (ebAdm.doneOpen ? ' open' : '') + ' ontoggle="ebAdm.doneOpen=this.open"><summary style="cursor:pointer"><b>Нийлсэн тайлан</b> <small class="muted">' + nd + ' хүргэлт · дарж дэлгэнэ</small></summary><div style="margin-top:8px">' + ebRecDoneBody() + '</div></details></div>';
}
function ebAdmView() {
  if (!ebAdm.busy && (ebAdm.biz !== state.biz || Date.now() - ebAdm.t > 5 * 60000)) { ebAdm.list = ebAdm.biz === state.biz ? ebAdm.list : null; setTimeout(ebAdmPull, 0); }
  return '<div class="card" id="ebAdmBox">' + ebAdmBody() + '</div>';
}

function cellVal(col, v) {
  if (v === '' || v == null) return '';
  if (col.num) return typeof v === 'number' ? (v < 0 ? '−' + fmt(-v).slice(1) : fmt(v).slice(1)) : esc(v);
  return esc(v);
}
function reportCard(rep, cancellable) {
  var head = '<tr>' + rep.cols.map(function (cl) { return '<th' + (cl.num ? ' class="n"' : '') + '>' + cl.label + '</th>'; }).join('') + (rep.actions ? '<th></th>' : '') + (rep.edit ? '<th></th>' : '') + (rep.print ? '<th></th>' : '') + (cancellable ? '<th></th>' : '') + '</tr>';
  // r._d[багана] — тэр дүн дээр дарахад задрал (finance.js)
  var cell = function (cl, r) { var v = cellVal(cl, r[cl.k]); return r._d && r._d[cl.k] && v ? dl(r._d[cl.k], v) : v; };
  var body = rep.rows.length ? rep.rows.map(function (r) {
    return '<tr' + (r._cls ? ' class="' + r._cls + '"' : r._b ? ' class="b"' : '') + (r._on ? ' onclick="' + r._on + '" style="cursor:pointer"' : '') + (r._bill ? ' class="clk" onclick="openBillAdm(' + esc(JSON.stringify(r._bill)) + ')"' : '') + '>' + rep.cols.map(function (cl) { return '<td' + (cl.num ? ' class="n' + (r[cl.k] < 0 ? ' neg' : '') + '"' : '') + '>' + cell(cl, r) + '</td>'; }).join('') +
      (rep.actions ? '<td class="n">' + (r._act || '') + '</td>' : '') +
      (rep.edit ? '<td class="n">' + (r._id ? '<button class="mini" onclick="' + rep.edit + '(' + esc(JSON.stringify(r._id)) + ')">Засах</button>' : '') + '</td>' : '') +
      (rep.print ? '<td class="n">' + (r._id ? '<button class="mini" style="color:var(--accent)" onclick="printVoucherId(' + esc(JSON.stringify(r._id)) + ')">Хэвлэх</button>' : '') + '</td>' : '') +
      (cancellable ? '<td class="n">' + (r._id ? '<button class="mini" onclick="' + cancellable + '(' + esc(JSON.stringify(r._id)) + ')">' + (cancellable === 'openProduct' ? 'Засах' : 'Цуцлах') + '</button>' : '') + '</td>' : '') + '</tr>';
  }).join('') : '<tr><td colspan="' + rep.cols.length + '" class="muted">Мэдээлэл алга</td></tr>';
  var foot = rep.total ? '<tr class="tot">' + rep.cols.map(function (cl) { return '<td' + (cl.num ? ' class="n"' : '') + '>' + cell(cl, rep.total) + '</td>'; }).join('') + (rep.actions ? '<td></td>' : '') + (rep.edit ? '<td></td>' : '') + (rep.print ? '<td></td>' : '') + (cancellable ? '<td></td>' : '') + '</tr>' : '';
  var r = range();
  return '<div class="card rep"><div class="rep-cap"><b>' + esc(rep.title) + '</b><span>' + esc(BUSINESSES[state.biz].name) + ' · ' + (rep.noRange ? 'бүх хугацаа' : r[0] + ' — ' + r[1]) + ' · ' + rep.rows.length + ' мөр</span></div>' +
    (rep.note ? '<p class="rep-note' + (rep.check === false ? ' bad' : rep.check ? ' ok' : '') + '">' + esc(rep.note) + '</p>' : '') +
    '<div class="scroll"><table class="rep-t">' + head + body + foot + '</table></div></div>';
}

// ── Хянах самбар + «нэг ч алдагдалгүй» шалгалт ──
function journalCheck(E, f, t) {
  // Борлуулалтын мөр бүр журналд яг нэг удаа, яг ижил дүнгээр орсныг шалгана
  var sales = records.filter(function (x) { return x.biz === state.biz && x.type === 'sale' && x.date >= f && x.date <= t && Number(x.amount); });
  var posted = {};
  var SD = { 'Борлуулалт': 1, 'Борлуулалтын буцаалт': 1, 'Борлуулалтын хөнгөлөлт': 1, 'Төлбөр хуваалт': 1 };
  E.forEach(function (e) { if (SD[e.doc]) posted[e.ref] = (posted[e.ref] || 0) + e.amount; });
  var miss = sales.filter(function (x) { return Math.abs((posted[x.id] || 0) - Math.abs(Number(x.amount))) > 0.5; });
  var sAmt = sales.reduce(function (a, x) { return a + Number(x.amount); }, 0);
  var rev = 0;   // зөвхөн борлуулалтын бичлэгээс үүссэн орлого (гараар/банкаар бичсэн 5101-ийг тооцохгүй)
  E.forEach(function (e) { if (e.date >= f && e.date <= t) { if (e.doc === 'Борлуулалт' && e.cr === '5101') rev += e.amount; if (e.doc === 'Борлуулалтын буцаалт' && e.dr === '6001') rev -= e.amount;
    if (e.doc === 'Борлуулалтын хөнгөлөлт') rev += e.dr === '6001' ? -e.amount : e.amount;
    if (e.doc === 'Төлбөр хуваалт') rev += e.cr === '5101' ? e.amount : -e.amount; } });
  var exps = records.filter(function (x) { return x.biz === state.biz && x.type === 'expense' && x.date >= f && x.date <= t && Number(x.amount); });
  var eMiss = exps.filter(function (x) { return !E.some(function (e) { return e.ref === x.id; }); });
  var tb = repTrial(E, f, t), bs = repBalance(E, t);
  var ce = costEngine(state.biz, R()), noCost = Object.keys(ce.noCost);
  var salAll = salary.filter(function (e) { return e.biz === 'all' && (e.kind === 'Олгосон' || e.kind === 'Урьдчилгаа'); });
  var invVal = Object.keys(ce.items).reduce(function (a, k) { return a + ce.items[k].v; }, 0), inv1404 = balances(E)['1404'] || 0;
  var late = meta.closed ? records.filter(function (x) { return x.biz === state.biz && x.date <= meta.closed; }).length : 0;
  return { late: late, invVal: invVal, invOk: !ce.since || Math.abs(invVal - inv1404) < 1, noCost: noCost, salAll: salAll, n: sales.length, miss: miss, sAmt: sAmt, rev: rev, revOk: Math.abs(sAmt - rev) < 0.5, eN: exps.length, eMiss: eMiss, tb: tb.check, bs: bs.check };
}
function financeDash() {
  var r = range(), E = J(), p = plData(E, r[0], r[1]), b = balances(E, r[1]);
  var g = function (k) { return b[k] || 0; };
  var ck = journalCheck(E, r[0], r[1]);
  var okAll = !ck.miss.length && ck.revOk && !ck.eMiss.length && ck.tb && ck.bs && ck.invOk && !ck.noCost.length && !ck.salAll.length && !ck.late;
  var line = function (ok, text) { return '<li><span class="ck ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : '!') + '</span>' + text + '</li>'; };
  return remAlerts() + archiveAlerts() + '<div class="kpis">' +
    kpi('Цэвэр борлуулалт', fmt(p.net)) + kpi('Нийт ашиг', fmt(p.gross), p.net ? Math.round(p.gross / p.net * 100) + '%' : '') +
    kpi('Цэвэр ашиг', '<span style="color:' + (p.profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (p.profit < 0 ? '−' : '') + fmt(Math.abs(p.profit)) + '</span>') +
    kpi('Үйл ажиллагааны зардал', fmt(p.expT)) + '</div>' +
    '<div class="kpis">' + kpi('Касс', fmt(g('10003'))) + kpi('Пос (карт)', fmt(g('110106'))) + kpi('Харилцах', fmt(g('1101'))) +
    kpi('Барааны үлдэгдэл', fmt(g('1404'))) + kpi('Өглөг', fmt(-g('3101'))) + kpi('Авлага', fmt(g('1201'))) + '</div>' +
    (g('10003') < 0 ? '<div class="card notice">Касс хасах үлдэгдэлтэй байна (' + fmt(g('10003')) + '). Кассын эхний үлдэгдлийг «Журналын бичилт» → «Эхний үлдэгдэл» (Дт 10003 — Кт 4201)-ээр оруулна уу.</div>' : '') +
    '<div class="card"><h2>Санхүүд бичигдсэн эсэх шалгалт · ' + r[0] + ' — ' + r[1] + '</h2>' +
    '<p class="rep-note ' + (okAll ? 'ok' : 'bad') + '">' + (okAll ? 'Бүх гүйлгээ санхүүд бүрэн, зөв бичигдсэн байна.' : 'Анхаарах зүйл байна — доорх жагсаалтыг шалгана уу.') + '</p><ul class="cklist">' +
    line(!ck.miss.length, '<b>' + ck.n + '</b> борлуулалт/буцаалтын мөрөөс <b>' + (ck.n - ck.miss.length) + '</b> нь журналд бичигдсэн' + (ck.miss.length ? ' — ' + ck.miss.length + ' мөр дутуу' : '')) +
    line(ck.revOk, 'Борлуулалтын дүн ' + fmt(ck.sAmt) + ' = санхүүгийн цэвэр орлого ' + fmt(ck.rev)) +
    line(!ck.eMiss.length, '<b>' + ck.eN + '</b> зарлагын мөр бүгд журналд' + (ck.eMiss.length ? ' — ' + ck.eMiss.length + ' дутуу' : '')) +
    line(ck.tb, 'Гүйлгээ баланс: дебет = кредит') + line(ck.bs, 'Санхүүгийн байдал: хөрөнгө = өр төлбөр + өмч') +
    (ck.invVal || !ck.invOk ? line(ck.invOk, 'Барааны данс (1404) = барааны үлдэгдлийн өртөг ' + fmt(ck.invVal)) : '') +
    (ck.noCost.length ? line(false, '<b>' + ck.noCost.length + '</b> бараа өртөггүйгээр зарагдсан — нийт ашиг хэт өндөр гарна. Орлого авахдаа өртгийг оруулна уу: ' + esc(ck.noCost.slice(0, 5).join(', ')) + (ck.noCost.length > 5 ? '…' : '')) : '') +
    (ck.late ? line(false, '<b>' + ck.late + '</b> бичлэг хаагдсан онд (' + meta.closed.slice(0, 4) + ') хамаарах боловч дараа нь ирсэн — тайланд ороогүй. «Журналын бичилт»-ээр гараар тусгана уу.') : '') +
    (ck.salAll.length ? line(false, '<b>' + ck.salAll.length + '</b> цалингийн гүйлгээ компани заагаагүй (Бүх дэлгүүр) тул санхүүд ороогүй') : '') + '</ul>' +
    '<p class="muted" style="margin-top:8px">Борлуулалт: Дт касс/пос/харилцах — Кт 5101 орлого, мөн Дт 6101 өртөг — Кт 1404 бараа. Буцаалт: Дт 6001 — Кт касс. Зарлага: Дт зардлын данс — Кт 10003 касс.</p></div>' +
    '<div class="grid2"><div class="card"><h2>Орлогын тайлан (товч)</h2>' + miniTable(repPL(E, r[0], r[1])) + '</div>' +
    '<div class="card"><h2>Касс хаалт</h2><div class="scroll"><table>' + closesTable(r) + '</table></div></div></div>';
}
function miniTable(rep) {
  return '<div class="scroll"><table class="rep-t">' + rep.rows.map(function (r) {
    return '<tr' + (r._b ? ' class="b"' : '') + '><td>' + esc(r.name) + '</td><td class="n' + (r.v < 0 ? ' neg' : '') + '">' + cellVal({ num: 1 }, r.v) + '</td></tr>';
  }).join('') + '</table></div>';
}
function closesTable(r) {
  var closes = records.filter(function (x) { return x.biz === state.biz && x.type === 'close' && x.date >= r[0] && x.date <= r[1]; }).reverse();
  return closes.length ? '<tr><th>Огноо</th><th>Ажилтан</th><th class="n">Тоолсон</th><th class="n">Зөрүү</th></tr>' + closes.map(function (x) {
    var d = Number(x.diff) || 0;
    return '<tr><td>' + esc(x.date) + ' ' + esc(x.time) + '</td><td>' + esc(x.staff) + '</td><td class="n">' + fmt(x.counted) + '</td><td class="n">' +
      (d === 0 ? '<span class="tag">✓</span>' : '<span class="tag r">' + (d > 0 ? '+' : '−') + fmt(Math.abs(d)) + '</span>') + '</td></tr>';
  }).join('') : '<tr><td class="muted">Касс хаалт алга</td></tr>';
}

// ── Бүх тайлан нэг дор ──
function allReportList() {   // [модуль, тайлан, нэр] — тойм/самбар/карт/гар бичилтээс бусад бүх тайлан
  var out = [];
  ['sales', 'products', 'finance'].forEach(function (mod) {
    SUBS[mod].forEach(function (s) { if (subVisible(state.biz, s[0]) && !/^(overview|dash|card|entry|close|bank|opening|lock|pstmt|simple|monthly|glossary|acct|setup)$/.test(s[0])) out.push([mod, s[0], s[1]]); });
  });
  return out;
}
function reportsModule() {
  var groups = {};
  allReportList().forEach(function (x) { (groups[x[0]] = groups[x[0]] || []).push(x); });
  return '<p class="hint">Сонгосон хугацааны бүх тайланг нэг Excel файлд (тайлан бүр тусдаа хуудас) татна. Тайлан нээх бол нэр дээр нь дарна.</p>' +
    '<div class="rep-grid">' + ['sales', 'products', 'finance'].map(function (mod) {
      return '<div class="card"><h2>' + MODULES.filter(function (x) { return x[0] === mod; })[0][1] + '</h2><ul class="rep-links">' +
        SUBS[mod].filter(function (s) { return subVisible(state.biz, s[0]); }).map(function (s) {
          return '<li><button class="link" onclick="state.module=\'' + mod + '\';setSub(\'' + s[0] + '\')">' + s[1] + '</button></li>';
        }).join('') + '</ul></div>';
    }).join('') + '</div>';
}

// ── Excel ──
function repAoa(rep) {
  var r = range(), aoa = [[rep.title], [BUSINESSES[state.biz].name + ' · ' + r[0] + ' — ' + r[1]], []];
  aoa.push(rep.cols.map(function (cl) { return cl.label; }));
  rep.rows.forEach(function (row) { aoa.push(rep.cols.map(function (cl) { var v = row[cl.k]; return v == null ? '' : v; })); });
  if (rep.total) aoa.push(rep.cols.map(function (cl) { var v = rep.total[cl.k]; return v == null ? '' : v; }));
  if (rep.note) { aoa.push([]); aoa.push([rep.note]); }
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = rep.cols.map(function (cl) { return { wch: cl.num ? 14 : 28 }; });
  return ws;
}
function xlsxName(t) { var r = range(); return (BUSINESSES[state.biz].name + ' ' + t + ' ' + r[0] + '_' + r[1]).replace(/[\\/:*?"<>|]/g, '') + '.xlsx'; }
function exportCurrent() {
  if (!window.XLSX) { toast('Excel сан ачаалж байна — хэдэн секундийн дараа дахин оролдоно уу'); ensureXlsx(function () {}); return; }
  var rep = makeReport(state.module, state.sub[state.module]);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, repAoa(rep), 'Тайлан');
  XLSX.writeFile(wb, xlsxName(rep.title));
}
function exportAll() {
  if (!window.XLSX) { toast('Excel сан ачаалж байна — хэдэн секундийн дараа дахин оролдоно уу'); ensureXlsx(function () {}); return; }
  var wb = XLSX.utils.book_new(), used = {};
  allReportList().forEach(function (x) {
    var rep = makeReport(x[0], x[1]);
    if (!rep) return;
    var nm = ({ sales: 'Борлуулалт', products: 'Бараа', finance: 'Санхүү' }[x[0]] + ' · ' + x[2]).replace(/[\\/?*\[\]:]/g, '').slice(0, 28), k = nm, i = 2;
    while (used[k]) k = nm.slice(0, 25) + ' ' + i++;
    used[k] = 1;
    XLSX.utils.book_append_sheet(wb, repAoa(rep), k);
  });
  XLSX.writeFile(wb, xlsxName('бүх тайлан'));
  toast('Excel файл татагдлаа');
}

// ── Журналын бичилт (гараар) ──
var PRESETS = [
  ['', 'Өөрөө сонгох', '', ''],
  ['owner', 'Эзэн мөнгө оруулсан (харилцах)', '1101', '4101'],
  ['open', 'Харилцах дансны эхний үлдэгдэл', '1101', '4201'],
  ['opencash', 'Кассын эхний үлдэгдэл', '10003', '4201'],
  ['deposit', 'Кассын мөнгийг банкинд тушаасан', '1101', '10003'],
  ['pos', 'Картын (пос) мөнгө дансанд орсон', '1101', '110106'],
  ['paysup', 'Нийлүүлэгчид өглөг төлсөн (харилцахаас)', '3101', '1101'],
  ['loan', 'Зээл авсан', '1101', '3501'],
  ['loanpay', 'Зээл төлсөн', '3501', '1101'],
  ['asset', 'Үндсэн хөрөнгө худалдаж авсан', '2001', '1101'],
  ['rent', 'Түрээс төлсөн (харилцахаас)', '7114', '1101'],
  ['util', 'Цахилгаан, ус төлсөн (харилцахаас)', '7111', '1101'],
  ['credit', 'Зээлээр зарсан (авлага үүссэн)', '1201', '5101'],
  ['collect', 'Авлага орж ирсэн', '1101', '1201'],
  ['withdraw', 'Эзэн мөнгө авсан', '4101', '1101'],
];
function accOptions(sel) { return ACCOUNTS.filter(function (a) { return !accHidden(a[0]) || a[0] === sel; }).map(function (a) { return '<option value="' + a[0] + '"' + (sel === a[0] ? ' selected' : '') + '>' + a[0] + ' ' + esc(a[1]) + '</option>'; }).join(''); }
function partnerOptions() { return partners.filter(function (p) { return p.biz === state.biz; }).map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join(''); }
function openEntry() {
  entryEditId = '';
  $('jePreset').innerHTML = PRESETS.map(function (p) { return '<option value="' + p[0] + '">' + esc(p[1]) + '</option>'; }).join('');
  $('jeDr').innerHTML = accOptions('1101'); $('jeCr').innerHTML = accOptions('10003');
  $('jeDate').value = todayStr(); $('jeAmount').value = ''; $('jePartner').value = ''; $('jeDesc').value = '';
  $('jePartners').innerHTML = partnerOptions();
  openSheet('entrySheet');
}
function jePreset(v) {
  var p = PRESETS.filter(function (x) { return x[0] === v; })[0];
  if (!p || !p[2]) return;
  $('jeDr').value = p[2]; $('jeCr').value = p[3];
  if (!$('jeDesc').value) $('jeDesc').value = p[1];
}
var entryEditId = '';
function editEntry(id) {
  var j = journal.filter(function (x) { return x.id === id; })[0]; if (!j) return;
  openEntry(); entryEditId = id;
  $('jeDate').value = j.date; $('jeDr').value = j.dr; $('jeCr').value = j.cr; $('jeAmount').value = j.amount; $('jePartner').value = j.partner || ''; $('jeDesc').value = j.desc || '';
}
function saveEntry() {
  var e = { biz: state.biz, date: $('jeDate').value, dr: $('jeDr').value, cr: $('jeCr').value, amount: Number($('jeAmount').value),
            partner: $('jePartner').value.trim(), desc: $('jeDesc').value.trim() };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) { toast('Огноо оруулна уу'); return; }
  if (e.dr === e.cr) { toast('Дебет, кредит данс өөр байх ёстой'); return; }
  if (!(e.amount > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (!e.desc) { toast('Гүйлгээний утгаа бичнэ үү'); return; }
  if (!API_URL) {
    if (entryEditId) { var oid = entryEditId; journal = journal.filter(function (x) { return x.id !== oid; }); entryEditId = ''; }
    e.id = 'J' + Date.now(); e.by = ownerName; journal.push(e); save('nb_demo_journal', journal);
    closeSheet('entrySheet'); toast('Бичигдлээ'); render(); return;
  }
  var old = entryEditId; entryEditId = '';
  post({ type: 'admin_journal', by: ownerName, entry: e }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    if (old) post({ type: 'admin_journal', cancelId: old }, function () { closeSheet('entrySheet'); toast('Засагдлаа'); refresh(); });   // засах = хуучныг цуцалж шинээр
    else { closeSheet('entrySheet'); toast('Бичигдлээ'); refresh(); }
  });
}
function cancelEntry(id) {
  if (!confirm('Энэ журналын бичилтийг цуцлах уу? (Sheet-д «Устгасан» төлөвтэй үлдэнэ)')) return;
  if (!API_URL) { journal = journal.filter(function (j) { return j.id !== id; }); save('nb_demo_journal', journal); render(); return; }
  post({ type: 'admin_journal', cancelId: id }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    toast('Цуцлагдлаа'); refresh();
  });
}

// ── Харилцагч ──
var ptTinQ = '';
function ptTinInput() {   // байгууллагын регистр / ТТД → нэрийг ebarimt.mn-ээс
  var q = $('ptTin').value.trim().replace(/\s/g, ''), el = $('ptTinInfo'); ptTinQ = q;
  if (!/^(\d{7}|\d{11,12})$/.test(q)) { el.textContent = ''; return; }
  el.textContent = 'Шалгаж байна…';
  tinLookup(q, function (err, d) {
    if (ptTinQ !== q) return;
    if (err === 'blocked') { el.innerHTML = tinLinks(q); return; }
    if (err) { el.textContent = tinErrText(err); return; }
    if (!d.found) { el.textContent = '✗ Бүртгэлгүй дугаар'; return; }
    el.innerHTML = '✓ ' + esc(d.name) + ' · ТТД ' + esc(d.tin) + (d.vatPayer ? ' · НӨАТ төлөгч' : '');
    if (!$('ptName').value.trim()) $('ptName').value = d.name;
  });
}
function openPartner() {
  $('ptKind').value = 'Нийлүүлэгч'; ['ptName', 'ptTin', 'ptPhone', 'ptNote'].forEach(function (k) { $(k).value = ''; }); $('ptTinInfo').textContent = '';
  openSheet('partnerSheet');
}
function savePartner() {
  var p = { biz: state.biz, kind: $('ptKind').value, name: $('ptName').value.trim(), tin: $('ptTin').value.trim(), phone: $('ptPhone').value.trim(), note: $('ptNote').value.trim() };
  if (!p.name) { toast('Нэрээ оруулна уу'); return; }
  if (!API_URL) { p.id = 'P' + Date.now(); partners.push(p); save('nb_demo_partners', partners); closeSheet('partnerSheet'); render(); return; }
  post({ type: 'admin_partner', partner: p }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    closeSheet('partnerSheet'); toast('Нэмэгдлээ'); refresh();
  });
}

// ── Цуцлах (мөр устахгүй, «Устгасан» төлөвтэй болж тайлангаас хасагдана) ──
function cancelRecord(id) {
  var x = records.filter(function (r) { return r.id === id; })[0]; if (!x) return;
  var what = x.type === 'sale' ? x.item + ' · ' + fmt(x.amount) : x.type === 'expense' ? x.category + ' · ' + fmt(x.amount) : x.type === 'boost' ? 'Boost · ' + x.item + ' · ' + fmt(x.amount) : 'Касс хаалт';
  if (!confirm('Энэ бичлэгийг цуцлах уу?\n' + x.date + ' ' + x.time + ' · ' + what + (x.type === 'boost' ? '' : '\n\nСанхүү, үлдэгдлээс хасагдана.'))) return;
  if (!API_URL) { records = records.filter(function (r) { return r.id !== id; }); save('nb_records', records); render(); return; }
  post({ type: 'admin_record', cancelId: id, by: ownerName }, function (err) {
    if (err) { toast(err === 'ebarimt' ? 'И-баримттай борлуулалтыг дэлгүүрээс «Баримт буцаах»-аар буцаана' : 'Алдаа: ' + err); return; }
    toast('Цуцлагдлаа'); refresh();
  });
}
function cancelMove(id) {
  var m = moves.filter(function (x) { return x.id === id; })[0]; if (!m) return;
  if (m.qty > 0) {   // орлогыг цуцалснаар үлдэгдэл хасах руу орохгүй
    var cs = (stockData[m.biz] || {})[m.item] || { shop: 0, wh: 0 }, cv = m.loc === 'Агуулах' ? cs.wh : cs.shop;
    if (cv - m.qty < -1e-9) { toast('Цуцлах боломжгүй: ' + locAt(m.loc).toLowerCase() + ' ' + round2(cv) + ' л үлдсэн — энэ орлогын ' + m.qty + '-аас зарим нь зарагдсан эсвэл шилжсэн'); return; }
  }
  if (!confirm('Энэ хөдөлгөөнийг цуцлах уу?\n' + m.date + ' · ' + m.kind + ' · ' + m.item + ' ' + m.qty + '\n\nҮлдэгдэл, санхүүгээс хасагдана.')) return;
  if (!API_URL) { moves = moves.filter(function (x) { return x.id !== id; }); save('nb_demo_moves', moves); render(); return; }
  post({ type: 'admin_stock', cancelId: id }, function (err, d) {
    if (err === 'negative') { toast('Цуцалбал үлдэгдэл хасах болно: ' + ((d && d.item) || '')); return; }
    if (err) { toast('Алдаа: ' + err); return; }
    toast('Цуцлагдлаа'); refresh();
  });
}

// ═══════════ БАРААНЫ БҮРТГЭЛ (үнэ, нэгж, ангилал, БҮНА, идэвхтэй эсэх) ═══════════
// Засвар нь «Бараа» хуудсанд хадгалагдаж, дэлгүүрийн хуудсанд дараагийн нээлтэд шууд хэрэгжинэ.
function applyProducts() {
  Object.keys(BUSINESSES).forEach(function (k) {
    var list = BASE_PRODUCTS[k].map(function (p) { return { name: p.name, unit: p.unit, price: p.price, cls: p.cls || '', cat: p.cat || '', base: true }; });
    var by = {};
    list.forEach(function (p) { by[p.name.toLowerCase()] = p; });
    sheetProducts.filter(function (x) { return x.biz === k; }).forEach(function (x) {
      var p = by[x.name.toLowerCase()];
      if (!p) { p = { name: x.name, unit: BUSINESSES[k].unit, price: 0, cls: '', cat: '' }; list.push(p); by[x.name.toLowerCase()] = p; }
      if (x.price) p.price = x.price; if (x.unit) p.unit = x.unit; if (x.cls) p.cls = x.cls; if (x.cat) p.cat = x.cat;
      p.off = !!x.off; p.edited = true;
    });
    BUSINESSES[k].products = list;
  });
}
function repCatalog(biz) {
  var ce = costEngine(biz, R());
  var rows = BUSINESSES[biz].products.map(function (p) {
    var cost = Math.round(avgCost(ce, p.name));
    return { name: p.name, cat: p.cat, unit: p.unit, price: p.price || '', cost: cost || '', margin: cost && p.price ? Math.round((p.price - cost) / p.price * 100) + '%' : '',
             cls: p.cls, st: p.off ? 'Идэвхгүй' : 'Идэвхтэй', _id: p.name };
  });
  var off = rows.filter(function (r) { return r.st === 'Идэвхгүй'; }).length;
  return { title: 'Барааны бүртгэл', cols: [c('name', 'Бараа'), c('cat', 'Ангилал'), c('unit', 'Нэгж'), m('price', 'Зарах үнэ'), m('cost', 'Дундаж өртөг'),
    c('margin', 'Ашиг %'), c('cls', 'БҮНА код'), c('st', 'Төлөв')], rows: rows,
    note: rows.length + ' бараа' + (off ? ' · ' + off + ' идэвхгүй (дэлгүүрт харагдахгүй)' : '') + '. Үнэ, нэгж, ангиллыг засахад дэлгүүрийн хуудсанд шууд хэрэгжинэ.' };
}
var prodEdit = '';
function openProduct(name) {
  var biz = state.biz, p = name ? BUSINESSES[biz].products.filter(function (x) { return x.name === name; })[0] : null;
  prodEdit = p ? p.name : '';
  $('pdTitle').textContent = p ? 'Бараа засах' : 'Шинэ бараа';
  $('pdName').value = p ? p.name : ''; $('pdName').readOnly = !!p;   // нэр солиход үлдэгдэл, түүх тасрах тул солихгүй
  $('pdUnit').value = p ? p.unit : BUSINESSES[biz].unit; $('pdPrice').value = p ? p.price : '';
  $('pdCat').value = p ? p.cat : ''; $('pdCls').value = p ? p.cls : ''; $('pdOff').checked = p ? !!p.off : false;
  var cats = {}; BUSINESSES[biz].products.forEach(function (x) { if (x.cat) cats[x.cat] = 1; });
  $('pdCats').innerHTML = Object.keys(cats).sort().map(function (k) { return '<option value="' + esc(k) + '">'; }).join('');
  openSheet('productSheet');
}
function saveProduct() {
  var p = { biz: state.biz, name: $('pdName').value.trim(), unit: $('pdUnit').value.trim(), price: Number($('pdPrice').value), cat: $('pdCat').value.trim(),
            cls: $('pdCls').value.trim(), off: $('pdOff').checked };
  if (!p.name) { toast('Барааны нэрээ оруулна уу'); return; }
  if (!prodEdit && BUSINESSES[state.biz].products.some(function (x) { return x.name.toLowerCase() === p.name.toLowerCase(); })) { toast('Ийм нэртэй бараа байна'); return; }
  if (!(p.price > 0)) { toast('Зарах үнээ оруулна уу'); return; }
  if (p.cls && !/^\d{7}$/.test(p.cls)) { toast('БҮНА код 7 оронтой тоо байна'); return; }
  if (!API_URL) {
    logPriceDemo([p]);
    sheetProducts = sheetProducts.filter(function (x) { return !(x.biz === p.biz && x.name.toLowerCase() === p.name.toLowerCase()); }).concat([p]);
    save('nb_demo_products', sheetProducts); applyProducts(); closeSheet('productSheet'); render(); return;
  }
  post({ type: 'admin_product', product: p, by: ownerName }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    closeSheet('productSheet'); toast('Хадгалагдлаа'); refresh();
  });
}

// ═══════════ КАССЫН / ХАРИЛЦАХЫН ОРЛОГО, ЗАРЛАГЫН БАРИМТ ═══════════
// Дугаар нь серверт КО-0001, КЗ-0001… гэж компани бүрт дараалан олгогдоно. Журналд автоматаар бичигдэнэ.
var VOUCHER = {
  'КО': { name: 'Кассын орлогын баримт', acc: '10003', dir: 'in' }, 'КЗ': { name: 'Кассын зарлагын баримт', acc: '10003', dir: 'out' },
  'ХО': { name: 'Харилцахын орлогын баримт', acc: '1101', dir: 'in' }, 'ХЗ': { name: 'Харилцахын зарлагын баримт', acc: '1101', dir: 'out' },
};
// Гүйлгээний зорилго → харьцах данс. p = харилцагч заавал
var V_PURPOSE = {
  in: [['1201', 'Авлага төлөгдсөн (зээлээр авсан хүн төлсөн)', 1], ['5101', 'Бараа борлуулсан (дэлгүүрийн бүртгэлээс гадуур)'], ['4101', 'Хөрөнгө оруулалт (эзэн, хөрөнгө оруулагч)'],
       ['1290', 'Компани хооронд (бусад компаниас ирсэн)', 1], ['5202', 'Хүүгийн орлого'], ['1208', 'Захирал хувийн зарлагаа буцааж төлсөн'],
       ['3501', 'Зээл авсан'], ['5201', 'Бусад орлого'], ['10003', 'Кассаас шилжүүлсэн'], ['1101', 'Харилцахаас бэлэн мөнгө авсан'], ['110106', 'Картын (пос) мөнгө орсон'], ['1503', 'Урьдчилгаа буцаан авсан', 1]],
  out: [['3101', 'Нийлүүлэгчид өглөг төлсөн', 1], ['1503', 'Нийлүүлэгчид урьдчилгаа өгсөн', 1], ['1290', 'Компани хооронд (бусад компани руу)', 1], ['1208', 'Захирлын хувийн зарлага'],
        ['7101', 'Цалин'], ['7102', 'НДШ'], ['7114', 'Түрээс'], ['7201', 'Зээлийн хүү, банкны шимтгэл'], ['7111', 'Цахилгаан, ус, дулаан'], ['7118', 'Шатахуун'],
        ['7117', 'Тээвэр'], ['7123', 'Сав, баглаа'], ['7120', 'Зар сурталчилгаа'], ['7112', 'Засвар'], ['7124', 'Хүргэлт'], ['7105', 'Бичиг хэрэг'], ['7106', 'Утас, интернет'],
        ['3403', 'НДШ төлсөн (нийгмийн даатгалд)'], ['3404', 'ХХОАТ төлсөн (татварт)'], ['3301', 'Цалин олгосон (бодогдсон цалингаас)'],
        ['7122', 'Бусад зардал'], ['2001', 'Үндсэн хөрөнгө худалдаж авсан'], ['3501', 'Зээл төлсөн'], ['4101', 'Эзэн мөнгө авсан'],
        ['1101', 'Банкинд тушаасан (харилцах руу)'], ['10003', 'Касс руу бэлэн мөнгө гаргасан'], ['1207', 'Ажилтанд өгсөн (авлага)'], ['6001', 'Худалдан авагчид мөнгө буцаасан']],
};
var vKind = 'КО';
function openVoucher(kind) {
  vKind = kind; vcReq = ''; var V = VOUCHER[kind];
  $('vcTitle').textContent = V.name;
  $('vcPurpose').innerHTML = vcPurposeOpts(V);
  $('vcKindLabel').textContent = V.dir === 'in' ? 'Мөнгө хаана орсон' : 'Мөнгө хаанаас гарсан';
  $('vcKind').innerHTML = Object.keys(VOUCHER).filter(function (k) { return VOUCHER[k].dir === V.dir; }).map(function (k) {
    return '<option value="' + k + '"' + (k === kind ? ' selected' : '') + '>' + (VOUCHER[k].acc === '10003' ? 'Касс (бэлэн)' : 'Харилцах (банк)') + '</option>'; }).join('');
  $('vcDate').value = todayStr(); $('vcAmount').value = ''; $('vcPartner').value = ''; $('vcDesc').value = '';
  $('vcPartners').innerHTML = partnerOptions() + receivableOptions() + ORIG_ALL.filter(function (k) { return k !== state.biz; }).map(function (k) { return '<option value="' + esc(BUSINESSES[k].name) + '">Компани</option>'; }).join('');
  vcPurpose();
  openSheet('voucherSheet');
}
function receivableOptions() {   // зээлээр авсан хүмүүсийн нэрс (авлагатай)
  var b = {};
  J().forEach(function (e) { if (e.partner && (e.dr === '1201' || e.cr === '1201')) b[e.partner] = (b[e.partner] || 0) + (e.dr === '1201' ? e.amount : -e.amount); });
  return Object.keys(b).filter(function (k) { return b[k] > 0.5; }).map(function (k) { return '<option value="' + esc(k) + '">Авлага ' + fmt(b[k]) + '</option>'; }).join('');
}
function vcPurposeOpts(V) {
  return V_PURPOSE[V.dir].filter(function (x) { return x[0] !== V.acc; }).map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + ' — ' + x[0] + '</option>'; }).join('');
}
function vcPurpose() {
  var dir = VOUCHER[vKind].dir, x = V_PURPOSE[dir].filter(function (y) { return y[0] === $('vcPurpose').value; })[0];
  $('vcPartnerLabel').textContent = x && x[2] ? 'Харилцагч *' : 'Харилцагч';
  vcSel = {}; vcOpenRender();   // өглөг / авлага бол нээлттэйг жагсаана (finance.js)
}
// Касс ↔ харилцах солих (гүйлгээ, сонгосон өр хэвээр)
function vcSwitch(k) {
  var p = $('vcPurpose').value, keep = vcSel, extra = [].filter.call($('vcPurpose').options, function (o) { return o.value === p; })[0];
  vKind = k; var V = VOUCHER[k];
  $('vcTitle').textContent = V.name; $('vcPurpose').innerHTML = vcPurposeOpts(V);
  if (![].some.call($('vcPurpose').options, function (o) { return o.value === p; }) && extra && p !== V.acc) $('vcPurpose').appendChild(extra);
  if ([].some.call($('vcPurpose').options, function (o) { return o.value === p; })) $('vcPurpose').value = p;
  vcPurpose(); if ($('vcPurpose').value === p) { vcSel = keep; vcOpenRender(); }
}
// Сервер утгыг 200 тэмдэгтээр таслана — #лавлагаа тасрахгүйн тулд текстийг богиносгоно
function vcDescWithTags(text, tags) { return tags ? String(text).slice(0, Math.max(20, 199 - tags.length)) + ' ' + tags : text; }
function saveVoucher() {
  var V = VOUCHER[vKind], other = $('vcPurpose').value, amt = Number($('vcAmount').value), partner = $('vcPartner').value.trim();
  var purpose = V_PURPOSE[V.dir].filter(function (y) { return y[0] === other; })[0] || [other, accName(other) + ' төлсөн', 0];
  var picked = Object.keys(vcSel).length;
  if (!(amt > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (purpose[2] && !partner && !picked) { toast('Харилцагчийн нэрийг бичнэ үү эсвэл хаах өрөө сонгоно уу'); return; }
  var e = { biz: state.biz, date: $('vcDate').value, dr: V.dir === 'in' ? V.acc : other, cr: V.dir === 'in' ? other : V.acc, amount: amt,
            partner: partner, desc: vcDescWithTags($('vcDesc').value.trim() || purpose[1], picked ? vcTags() : ''), vkind: vKind };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) { toast('Огноо оруулна уу'); return; }
  var req = vcReq; vcReq = '';
  var done = function (no) { closeSheet('voucherSheet'); toast(no + ' бүртгэгдлээ'); if (req) reqSetStatus(req, 'Төлсөн', no); if (confirm(no + ' баримтыг хэвлэх үү?')) printVoucher(e, no); };
  if (!API_URL) {
    var n = journal.filter(function (j) { return j.biz === e.biz && String(j.no || '').indexOf(vKind + '-') === 0; }).length + 1;
    e.id = 'J' + Date.now(); e.by = ownerName; e.no = vKind + '-' + ('000' + n).slice(-4);
    journal.push(e); save('nb_demo_journal', journal); render(); done(e.no); return;
  }
  post({ type: 'admin_journal', by: ownerName, entry: e }, function (err, d) {
    if (err) { toast('Алдаа: ' + err); return; }
    refresh(); done(d.no);
  });
}
function repVouchers(biz, f, t) {
  var rows = journal.filter(function (j) { return j.biz === biz && j.no && j.date >= f && j.date <= t; }).slice().reverse().map(function (j) {
    var V = VOUCHER[j.no.slice(0, 2)], inn = V.dir === 'in';
    return { no: j.no, date: j.date, kind: V.name.replace(' баримт', ''), corr: (inn ? j.cr : j.dr) + ' ' + accName(inn ? j.cr : j.dr), partner: j.partner, desc: j.desc,
             inA: inn ? j.amount : '', outA: inn ? '' : j.amount, _id: j.id };
  });
  return { title: 'Кассын баримт', cols: [c('no', 'Дугаар'), c('date', 'Огноо'), c('kind', 'Төрөл'), c('corr', 'Харьцсан данс'), c('partner', 'Харилцагч'),
    c('desc', 'Гүйлгээний утга'), m('inA', 'Орлого'), m('outA', 'Зарлага')], rows: rows,
    total: { no: 'Нийт', inA: sum(rows, 'inA'), outA: sum(rows, 'outA') }, print: true };
}
function printVoucherId(id) {
  var j = journal.filter(function (x) { return x.id === id; })[0]; if (j) printVoucher(j, j.no);
}
function printVoucher(e, no) {
  var V = VOUCHER[no.slice(0, 2)], inn = V.dir === 'in', B = BUSINESSES[e.biz], E = (window.EBARIMT || {})[e.biz] || {};
  var other = inn ? e.cr : e.dr;
  var w = window.open('', '_blank', 'width=720,height=640');
  if (!w) { toast('Хэвлэх цонх нээгдсэнгүй — popup зөвшөөрнө үү'); return; }
  var row = function (k, v) { return '<tr><th>' + k + '</th><td>' + v + '</td></tr>'; };
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(no) + '</title><style>body{font-family:Arial,sans-serif;font-size:13px;margin:28px;color:#111}' +
    'h1{font-size:17px;text-align:center;margin:6px 0 2px}.c{text-align:center;color:#444}table{width:100%;border-collapse:collapse;margin-top:16px}' +
    'th,td{border:1px solid #999;padding:8px;text-align:left}th{width:34%;background:#f3f4f6}.amt{font-size:16px;font-weight:700}.sig{display:flex;justify-content:space-between;margin-top:40px}' +
    '.sig div{width:45%;border-top:1px solid #333;padding-top:4px;text-align:center}</style></head><body>' +
    '<div class="c">' + esc(E.legalName || B.name) + (E.merchantTin ? ' · ТТД ' + esc(E.merchantTin) : '') + '</div>' +
    '<h1>' + esc(V.name.toUpperCase()) + ' № ' + esc(no) + '</h1><div class="c">' + esc(e.date) + '</div><table>' +
    row('Компани / дэлгүүр', esc(B.name)) + row(inn ? 'Хэнээс хүлээн авсан' : 'Хэнд олгосон', esc(e.partner || '')) +
    row('Гүйлгээний утга', esc(e.desc || '')) + row('Харьцсан данс', esc(other + ' ' + accName(other))) +
    row(inn ? 'Орлогын данс' : 'Зарлагын данс', esc(V.acc + ' ' + accName(V.acc))) + row('Дүн', '<span class="amt">' + fmt(e.amount) + '</span>') +
    '</table><div class="sig"><div>' + (inn ? 'Тушаасан' : 'Хүлээн авсан') + '</div><div>' + (inn ? 'Хүлээн авсан (кассчин)' : 'Олгосон (кассчин)') + '</div></div>' +
    '<div class="sig"><div>Нягтлан бодогч</div><div>Захирал</div></div>' +
    '<script>window.onload=function(){window.print()}<\/script></body></html>');
  w.document.close();
}

// ═══════════ ОН ХААХ, НӨӨЦ ═══════════
// Жилд нэг удаа (1-р сарын эхээр) өмнөх оныг хаана: бүтэн хуулбар архивлагдаж, тэр оны мөрүүд үндсэн Sheet-ээс хасагдан,
// оны эцсийн үлдэгдэл шинэ оны эхэнд «Он нээлт» болж орно. Ингэснээр Sheet жилээс жилд дүүрэхгүй, самбар хурдан хэвээр.
function closableYears() {
  var cur = todayStr().slice(0, 4), ys = {};
  records.concat(journal).forEach(function (x) { var y = String(x.date || '').slice(0, 4); if (y && y < cur && (!meta.closed || y > meta.closed.slice(0, 4))) ys[y] = 1; });
  moves.forEach(function (x) { var y = String(x.date || '').slice(0, 4); if (y && y < cur && (!meta.closed || y > meta.closed.slice(0, 4))) ys[y] = 1; });
  return Object.keys(ys).sort();
}
function closeView() {
  var years = closableYears(), y = years[0];
  var info = '<div class="kpis">' + kpi('Хаагдсан он', meta.closed ? meta.closed.slice(0, 4) + ' он хүртэл' : 'Хаагаагүй') +
    kpi('Сүүлийн нөөц хуулбар', meta.lastBackup || '<span style="color:var(--red)">Аваагүй</span>') +
    kpi('Үндсэн Sheet дэх мөр', fmt(records.length + moves.length + journal.length + salary.length).slice(1)) + '</div>';
  var backup = '<div class="card"><h2>Нөөц хуулбар</h2><p class="muted">Долоо хоног бүрийн Даваа гарагт Sheet бүтнээрээ Google Drive-д «NOMAAD нөөц огноо» нэрээр автоматаар хуулагдана. ' +
    'Том өөрчлөлтийн өмнө гараар ч авч болно.</p><div class="pg-act" style="margin-top:10px"><button class="b-btn primary" onclick="doBackup()">Одоо нөөц авах</button>' +
    (meta.backupUrl ? '<a class="b-btn" href="' + esc(meta.backupUrl) + '" target="_blank" rel="noopener">Drive-д нөөцүүдийг харах</a>' : '') + '</div></div>';
  var close = '<div class="card"><h2>Он хаах</h2>';
  if (!y) close += '<p class="muted">Хаах өнгөрсөн он алга. ' + (todayStr().slice(0, 4)) + ' оныг ' + (Number(todayStr().slice(0, 4)) + 1) + ' оны 1-р сард хаана.</p></div>';
  else {
    var rows = KEYS.map(function (k) {
      var p = yearClosePayload(k, R(), y);
      return '<tr><td>' + esc(BUSINESSES[k].name) + '</td><td class="n">' + p.open.length + '</td><td class="n">' + p.stock.length + '</td><td class="n">' + fmt(p.profit) +
        '</td><td class="n">' + fmt(p.check.inv1404) + '</td><td>' + (Math.abs(p.check.dr) < 1 ? '<span class="tag">Тэнцсэн</span>' : '<span class="tag r">Тэнцээгүй</span>') + '</td></tr>';
    }).join('');
    close += '<p>Хаах он: <b>' + y + '</b>' + (years.length > 1 ? ' (дараа нь ' + years.slice(1).join(', ') + ')' : '') + '</p>' +
      '<ol class="steps"><li>Компани бүрийн ' + y + ' оны бүх тайлан Excel-ээр таны компьютерт татагдана.</li>' +
      '<li>Sheet бүтнээрээ «NOMAAD архив ' + y + '» нэрээр нөөцийн хавтаст хуулагдана (тэр оны бүх мэдээлэл тэнд үүрд үлдэнэ).</li>' +
      '<li>' + y + ' оны борлуулалт, хөдөлгөөн, журнал, цалингийн мөрүүд үндсэн Sheet-ээс хасагдана.</li>' +
      '<li>Оны эцсийн касс, харилцах, авлага, өглөг, өмч, барааны үлдэгдэл ' + (Number(y) + 1) + '-01-01-нд «Он нээлт» болж орно.</li></ol>' +
      '<div class="scroll"><table><tr><th>Компани</th><th class="n">Дансны мөр</th><th class="n">Барааны мөр</th><th class="n">' + y + ' оны ашиг</th><th class="n">Бараа (1404)</th><th>Шалгалт</th></tr>' + rows + '</table></div>' +
      '<p class="hint" style="margin-top:10px">Хаахын өмнө: бүх дэлгүүрийн интернэт холбогдсон, ' + y + ' оны бичлэгүүд бүгд илгээгдсэн, санхүүгийн хянах самбарын шалгалт ногоон байх ёстой.</p>' +
      '<div class="pg-act"><button class="b-btn primary" onclick="doCloseYear(\'' + y + '\')">' + y + ' оныг хаах</button></div></div>';
  }
  return info + backup + close;
}
function doBackup() {
  if (!API_URL) { meta.lastBackup = todayStr() + ' ' + timeStr(); save('nb_demo_meta', meta); render(); return; }
  toast('Нөөц хуулж байна...');
  post({ type: 'admin_backup' }, function (err, d) {
    if (err || !d.url) { toast('Нөөц авч чадсангүй: ' + (err || 'шинэ хувилбар суугаагүй')); return; }
    toast('Нөөц хадгалагдлаа: ' + d.name); refresh();
  });
}
function doCloseYear(y) {
  var payload = { open: [], stock: [] }, bad = [];
  KEYS.forEach(function (k) {
    var p = yearClosePayload(k, R(), y);
    if (Math.abs(p.check.dr) >= 1) bad.push(BUSINESSES[k].name);
    payload.open = payload.open.concat(p.open); payload.stock = payload.stock.concat(p.stock);
  });
  if (bad.length) { alert('Үлдэгдэл тэнцэхгүй байна: ' + bad.join(', ') + '. Он хаахгүй.'); return; }
  if (prompt('Энэ үйлдлийг буцаах боломжгүй (архив хуулбар үлдэнэ).\nБаталгаажуулахын тулд «' + y + '» гэж бичнэ үү:') !== y) { toast('Цуцаллаа'); return; }
  // 1) тайлангуудыг татах
  var keep = { biz: state.biz, period: state.period, from: state.from, to: state.to };
  state.period = 'custom'; state.from = y + '-01-01'; state.to = y + '-12-31';
  KEYS.forEach(function (k) { state.biz = k; try { exportAll(); } catch (e) {} });
  state.biz = keep.biz; state.period = keep.period; state.from = keep.from; state.to = keep.to;
  // 2) сервер: архив + хасах + он нээлт
  var start = (Number(y) + 1) + '-01-01', end = y + '-12-31';
  if (!API_URL) {   // туршилтын горим — серверийн үйлдлийг давтана
    var old = function (d) { return String(d).slice(0, 10) <= end; };
    records = records.filter(function (x) { return !old(x.date); }); moves = moves.filter(function (x) { return !old(x.date); });
    journal = journal.filter(function (x) { return !old(x.date); }); salary = salary.filter(function (x) { return !old(x.date); });
    payload.open.forEach(function (e, i) { journal.push({ id: 'J' + Date.now() + '-' + i, date: start, biz: e.biz, dr: e.dr, cr: e.cr, amount: e.amount, partner: e.partner, desc: 'Он нээлт ' + start.slice(0, 4) + ' · ' + e.desc, by: ownerName }); });
    payload.stock.forEach(function (m, i) { moves.push({ id: 'M' + Date.now() + '-o' + i, date: start + ' 00:00', biz: m.biz, loc: m.loc, item: m.item, kind: 'Он нээлт', qty: m.qty, cost: m.cost, by: ownerName, note: y + ' оны эцсийн үлдэгдэл', pay: '', partner: '' }); });
    meta.closed = end; save('nb_records', records); save('nb_demo_moves', moves); save('nb_demo_journal', journal); save('nb_demo_meta', meta);
    toast(y + ' он хаагдлаа'); render(); return;
  }
  toast('Он хааж байна — 1-2 минут болно...');
  post({ type: 'admin_close', year: y, by: ownerName, open: payload.open, stock: payload.stock }, function (err, d) {
    if (err || !d.archive) { alert('Он хааж чадсангүй: ' + (err || 'шинэ хувилбар суугаагүй')); return; }
    alert(y + ' он хаагдлаа.\nАрхив: ' + d.archive + '\nХасагдсан мөр: борлуулалт ' + d.removed.records + ', хөдөлгөөн ' + d.removed.moves + ', журнал ' + d.removed.journal + ', цалин ' + d.removed.salary);
    refresh();
  });
}

// ── Сануулга: он хаах, нөөц, Sheet дүүрэх ── (Миний компаниуд болон Хянах самбарын дээд талд)
var SHEET_ROW_WARN = 300000;   // Google Sheet ~500,000 мөр хүртэл хурдан ажиллана
function archiveAlerts() {
  if (!API_URL && !meta.lastBackup && !records.length) return '';
  var out = [], today = todayStr(), y = today.slice(0, 4), prev = String(Number(y) - 1);
  var go = '<button class="b-btn primary" onclick="openClose()">Он хаах, нөөц рүү</button>';
  // 1) Шинэ он гарсан ч өмнөх он хаагдаагүй (1-р сараас эхлэн)
  var open = closableYears();
  if (open.length && today.slice(5, 7) <= '03') {   // зөвхөн 1–3-р сард сануулна
    var late = today > y + '-02-15';
    out.push('<div class="alert' + (late ? ' bad' : '') + '"><div><b>' + open.join(', ') + ' оныг хаах хугацаа болсон.</b> ' +
      (late ? 'Хоцорч байна — ' : '') + 'Он хаавал тайлангууд архивлагдаж, Sheet хөнгөрнө. 1-р сарын эхний 7 хоногт хийхийг зөвлөж байна.</div>' + go + '</div>');
  }
  // 4) Sheet дүүрч байна
  var rows = records.length + moves.length + journal.length + salary.length;
  if (rows > SHEET_ROW_WARN) out.push('<div class="alert bad"><div><b>Google Sheet-д ' + fmt(rows).slice(1) + ' мөр байна.</b> Удахгүй удааширна — он хаах, эсвэл өгөгдлийн сан руу шилжих тухай бодох хэрэгтэй.</div>' + go + '</div>');
  return out.join('');
}
function openClose() { if (!state.biz) state.biz = KEYS[0]; state.view = 'company'; state.module = 'finance'; state.sub.finance = 'close'; render(); window.scrollTo(0, 0); }

// ═══════════ ХӨДӨЛМӨРИЙН ГЭРЭЭ ═══════════
// Ажилтныг батлангуут бөглөнө → дугаар (ХГ-2026-001) серверт олгогдож, хэвлэхэд бэлэн гэрээ гарна.
function contractBadge(s) {
  if (!s.contractNo) return '<span class="muted">Гэрээ бүртгээгүй</span>';
  var end = s.contractEnd ? ' · ' + s.contractEnd + ' хүртэл' : ' · хугацаагүй';
  return '<span class="tag">Гэрээ ' + esc(s.contractNo) + end + '</span>';
}
function parseTerms(s) { try { return JSON.parse(s.terms || '{}'); } catch (e) { return {}; } }
var ctId = '';
function openContract(id) {
  var s = staff.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  ctId = id;
  var t = parseTerms(s), biz = t.biz || staffHome(s);
  var co = load('nb_company', {});
  $('ctTitle').textContent = 'Хөдөлмөрийн гэрээ · ' + (s.surname ? s.surname + ' ' : '') + s.name;
  $('ctSub').textContent = s.contractNo ? s.contractNo + ' · ' + s.contractDate + '-нд байгуулсан' : 'Шинэ гэрээ';
  $('ctPos').value = t.position || s.position || ''; $('ctSalary').value = t.salary || s.salary || '';
  $('ctStart').value = t.start || s.start || todayStr(); $('ctType').value = t.end ? 'fixed' : 'open';
  $('ctEnd').value = t.end || ''; $('ctEndWrap').style.display = t.end ? 'block' : 'none';
  $('ctProb').value = String(t.probation != null ? t.probation : (s.contractNo ? 0 : 1));
  $('ctHours').value = t.hours || '09:00–18:00, долоо хоногт 5 өдөр (40 цаг)';
  $('ctPay').value = t.payDays || 'Сар бүрийн 5, 20-ны өдөр хоёр хуваан';
  $('ctPlace').value = t.place || BUSINESSES[biz].name;
  $('ctAddr').value = t.address || s.address || '';
  $('ctBoss').value = t.boss || co.boss || ''; $('ctCo').value = t.coAddr || co.addr || '';
  $('ctExtra').value = t.extra || '';
  openSheet('contractSheet');
}
function saveContract() {
  var s = staff.filter(function (x) { return x.id === ctId; })[0]; if (!s) return;
  var biz = parseTerms(s).biz || staffHome(s);
  var t = { position: $('ctPos').value.trim(), salary: Number($('ctSalary').value), start: $('ctStart').value,
            end: $('ctType').value === 'fixed' ? $('ctEnd').value : '', probation: Number($('ctProb').value), hours: $('ctHours').value.trim(),
            payDays: $('ctPay').value.trim(), place: $('ctPlace').value.trim(), address: $('ctAddr').value.trim(),
            boss: $('ctBoss').value.trim(), coAddr: $('ctCo').value.trim(), extra: $('ctExtra').value.trim(), biz: biz };
  if (!t.position || !(t.salary > 0) || !t.start) { toast('Албан тушаал, цалин, огноог бөглөнө үү'); return; }
  if ($('ctType').value === 'fixed' && (!t.end || t.end <= t.start)) { toast('Дуусах огноог зөв оруулна уу'); return; }
  save('nb_company', { boss: t.boss, addr: t.coAddr });   // дараагийн гэрээнд санана (зөвхөн энэ төхөөрөмжид)
  var done = function (no, date) {
    s.contractNo = no; s.contractDate = date; s.contractEnd = t.end; s.terms = JSON.stringify(t); s.position = t.position; s.salary = t.salary; s.address = t.address; s.start = t.start;
    closeSheet('contractSheet'); render(); printContract(s);
  };
  if (!API_URL) { var n = staff.filter(function (x) { return x.contractNo; }).length + 1; done('ХГ-' + todayStr().slice(0, 4) + '-' + ('00' + n).slice(-3), todayStr()); return; }
  post({ type: 'admin_contract', id: ctId, terms: t }, function (err, d) {
    if (err || !d.no) { toast('Алдаа: ' + (err || 'шинэ хувилбар суугаагүй')); return; }
    done(d.no, d.date); refresh();
  });
}
function printContract(s) {
  var t = parseTerms(s), biz = t.biz || staffHome(s), E = (window.EBARIMT || {})[biz] || {};
  var coName = E.legalName || BUSINESSES[biz].name, reg = E.regNo ? '(регистр ' + esc(E.regNo) + ')' : '';
  var full = (s.surname ? s.surname + ' овогтой ' : '') + s.name;
  var w = window.open('', '_blank', 'width=820,height=900');
  if (!w) { toast('Хэвлэх цонх нээгдсэнгүй — popup зөвшөөрнө үү'); return; }
  var li = function (x) { return '<li>' + x + '</li>'; };
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(s.contractNo) + '</title><style>' +
    'body{font-family:"Times New Roman",serif;font-size:13.5px;line-height:1.55;margin:36px 48px;color:#000}h1{text-align:center;font-size:16px;margin:0}' +
    '.c{text-align:center}.row{display:flex;justify-content:space-between;margin:14px 0}h3{font-size:14px;margin:14px 0 4px}ol{margin:0;padding-left:20px}' +
    '.sig{display:flex;justify-content:space-between;margin-top:36px}.sig div{width:46%}.line{border-bottom:1px solid #000;height:28px}</style></head><body>' +
    '<h1>ХӨДӨЛМӨРИЙН ГЭРЭЭ</h1><div class="c">№ ' + esc(s.contractNo) + '</div>' +
    '<div class="row"><span>' + esc(s.contractDate || todayStr()) + '</span><span>Улаанбаатар хот</span></div>' +
    '<p>Нэг талаас <b>' + esc(coName) + '</b> ' + reg + ' (цаашид «Ажил олгогч» гэх)-ийг төлөөлж ' + esc(t.boss || '____________________') +
    ', нөгөө талаас <b>' + esc(full) + '</b> (регистр ' + esc(s.regno || '__________') + ', хаяг: ' + esc(t.address || '____________________') +
    ', утас ' + esc(s.phone || '') + ') (цаашид «Ажилтан» гэх) нар Монгол Улсын Хөдөлмөрийн тухай хуульд нийцүүлэн энэхүү гэрээг байгуулав.</p>' +
    '<h3>1. Ажлын байр, үүрэг</h3><ol>' + li('Ажилтан нь <b>' + esc(t.position) + '</b> албан тушаалд ' + esc(t.place) + '-д ажиллана.') +
    li('Ажил олгогчийн баталсан ажлын байрны тодорхойлолт, дотоод журмыг мөрдөж, хариуцсан ажлаа чанартай гүйцэтгэнэ.') + '</ol>' +
    '<h3>2. Гэрээний хугацаа</h3><ol>' + li('Ажил эхлэх өдөр: <b>' + esc(t.start) + '</b>.') +
    li(t.end ? 'Гэрээ <b>' + esc(t.end) + '</b>-ны өдөр хүртэл тодорхой хугацаатай.' : 'Гэрээ <b>хугацаагүй</b>.') +
    (t.probation ? li('Туршилтын хугацаа <b>' + t.probation + ' сар</b>. Туршилтын хугацаанд цалинг гэрээнд заасан хэмжээгээр олгоно.') : '') + '</ol>' +
    '<h3>3. Цалин хөлс</h3><ol>' + li('Үндсэн цалин сарын <b>' + fmt(t.salary) + '</b> (' + esc(numWords(t.salary)) + ' төгрөг).') +
    li('Цалинг ' + esc(t.payDays) + ' ажилтны ' + esc(s.bank || '__________') + ' дансанд шилжүүлнэ.') +
    li('Хууль тогтоомжийн дагуу нийгмийн даатгалын шимтгэл, хувь хүний орлогын албан татварыг цалингаас суутгаж, холбогдох байгууллагад төлнө.') + '</ol>' +
    '<h3>4. Ажлын болон амрах цаг</h3><ol>' + li('Ажлын цаг: ' + esc(t.hours) + '.') +
    li('Ажилтан ээлжийн амралтыг Хөдөлмөрийн тухай хуульд заасан хугацаагаар эдэлнэ.') + '</ol>' +
    '<h3>5. Талуудын үүрэг</h3><ol>' + li('Ажил олгогч нь хөдөлмөрийн аюулгүй нөхцөлөөр хангаж, цалинг хугацаанд нь олгоно.') +
    li('Ажилтан нь ажил олгогчийн эд хөрөнгө, мөнгөн хөрөнгө, бараа материалыг хариуцан хамгаалж, учруулсан хохирлыг хуулийн дагуу барагдуулна.') +
    li('Ажилтан нь ажлын явцад мэдсэн байгууллагын нууцыг задруулахгүй.') + (t.extra ? li(esc(t.extra)) : '') + '</ol>' +
    '<h3>6. Гэрээг өөрчлөх, цуцлах</h3><ol>' + li('Гэрээг талуудын харилцан тохиролцоогоор бичгээр өөрчилнө.') +
    li('Гэрээг Хөдөлмөрийн тухай хуульд заасан үндэслэл, журмын дагуу цуцална.') +
    li('Маргааныг талууд харилцан зөвшилцөж, эс зөвшилцвөл хуульд заасан журмаар шийдвэрлэнэ.') + '</ol>' +
    '<p>Гэрээг 2 хувь үйлдэж, тал бүр нэг хувийг хадгална.</p>' +
    '<div class="sig"><div><b>АЖИЛ ОЛГОГЧ</b><br>' + esc(coName) + '<br>' + esc(t.coAddr || '') + '<br><br>Төлөөлж: ' + esc(t.boss || '') + '<div class="line"></div>(гарын үсэг, тамга)</div>' +
    '<div><b>АЖИЛТАН</b><br>' + esc(full) + '<br>Регистр: ' + esc(s.regno || '') + '<br><br><div class="line"></div>(гарын үсэг)</div></div>' +
    '<script>window.onload=function(){window.print()}<\/script></body></html>');
  w.document.close();
}
// Тоог үсгээр (гэрээнд «нэг сая хоёр зуун мянган» гэх мэт)
function numWords(n) {
  n = Math.round(Number(n) || 0); if (!n) return 'тэг';
  var u = ['', 'нэг', 'хоёр', 'гурав', 'дөрөв', 'тав', 'зургаа', 'долоо', 'найм', 'ес'], uA = ['', 'нэгэн', 'хоёр', 'гурван', 'дөрвөн', 'таван', 'зургаан', 'долоон', 'найман', 'есөн'];
  var t = ['', 'арав', 'хорь', 'гуч', 'дөч', 'тавь', 'жар', 'дал', 'ная', 'ер'], tA = ['', 'арван', 'хорин', 'гучин', 'дөчин', 'тавин', 'жаран', 'далан', 'наян', 'ерэн'];
  var tri = function (x, attr) {   // 0..999; attr = араас нь үг залгах эсэх
    var h = Math.floor(x / 100), r = x % 100, d = Math.floor(r / 10), o = r % 10, w = [];
    if (h) w.push((h === 1 ? 'нэг' : uA[h]) + (r || attr ? ' зуун' : ' зуу'));
    if (d) w.push(o || attr ? tA[d] : t[d]);
    if (o) w.push(attr ? uA[o] : u[o]);
    return w.join(' ');
  };
  var parts = [], b = Math.floor(n / 1e9), mil = Math.floor(n / 1e6) % 1000, th = Math.floor(n / 1000) % 1000, r = n % 1000;
  if (b) parts.push(tri(b, true) + ' тэрбум');
  if (mil) parts.push(tri(mil, true) + ' сая');
  if (th) parts.push(tri(th, true) + ' мянга');
  if (r) parts.push(tri(r, false));
  var str = parts.join(' ');
  return str.replace(/ мянга$/, ' мянга').replace(/^нэгэн /, 'нэг ');
}

// ═══════════ МАЯГТ, ЗАГВАР (анхан шатны маягт, тодорхойлолт, тушаал, анкет) ═══════════
// Ажилтан сонгоход нэр, регистр, албан тушаал, цалин, огноо автоматаар бөглөгдөж, хэвлэхэд бэлэн гарна.
function coInfo(biz) {
  var E = (window.EBARIMT || {})[biz] || {}, co = load('nb_company', {});
  return { name: E.legalName || BUSINESSES[biz].name, reg: E.regNo || '', shop: BUSINESSES[biz].name, addr: co.addr || '', boss: co.boss || '' };
}
var BLANK = '____________________';
function blankRows(n, cols) { var r = ''; for (var i = 0; i < n; i++) r += '<tr>' + cols.map(function (c, j) { return '<td>' + (j === 0 ? i + 1 : '') + '</td>'; }).join('') + '</tr>'; return r; }
function tbl(cols, body) { return '<table class="t"><tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' + body + '</table>'; }
function full(s) { return s ? (s.surname ? s.surname + ' ' : '') + s.name : BLANK; }
var DOCS = [
  { k: 'anket', g: 'Хүний нөөц', name: 'Ажилтны анкет', emp: 1, f: [],
    body: function (s, f, c) { var row = function (k, v) { return '<tr><th style="width:38%">' + k + '</th><td>' + (v ? esc(v) : '') + '</td></tr>'; };
      return '<h1>АЖИЛТНЫ АНКЕТ</h1><div class="c">' + esc(c.name) + '</div><table class="t">' +
        row('Овог', s && s.surname) + row('Нэр', s && s.name) + row('Регистрийн дугаар', s && s.regno) + row('Төрсөн огноо', '') + row('Хүйс', '') +
        row('Гэрийн хаяг', s && s.address) + row('Утас', s && s.phone) + row('И-мэйл', '') + row('Боловсрол, мэргэжил', '') + row('Гэр бүлийн байдал', '') +
        row('Яаралтай үед холбоо барих хүн, утас', '') + row('Банкны данс', s && s.bank) + row('Албан тушаал', s && s.position) + row('Ажилд орсон огноо', s && s.start) + '</table>' +
        '<h3>Ажлын туршлага</h3>' + tbl(['№', 'Байгууллага', 'Албан тушаал', 'Хугацаа'], blankRows(4, [1, 2, 3, 4])) +
        '<p style="margin-top:24px">Дээрх мэдээлэл үнэн зөв болохыг баталж гарын үсэг зурсан: ' + BLANK + ' / ' + esc(full(s)) + ' /</p>'; } },
  { k: 'workcert', g: 'Хүний нөөц', name: 'Ажлын тодорхойлолт', emp: 1, f: [['to', 'Хаана өгөх', 'Холбогдох байгууллагад']],
    body: function (s, f, c) { return '<h1>ТОДОРХОЙЛОЛТ</h1><div class="c">' + todayStr() + '</div><p style="margin-top:20px"><b>' + esc(f.to) + '</b></p>' +
      '<p>' + esc(full(s)) + ' (регистр ' + esc(s.regno || BLANK) + ') нь ' + esc(c.name) + '-д ' + esc(s.start || BLANK) + '-ны өдрөөс эхлэн ' +
      esc(s.position || BLANK) + ' албан тушаалд үндсэн ажилтнаар ажиллаж байгаа нь үнэн болно.</p>' + sigBoss(c); } },
  { k: 'salcert', g: 'Хүний нөөц', name: 'Цалингийн тодорхойлолт', emp: 1, f: [['to', 'Хаана өгөх', 'Банкинд'], ['months', 'Хэдэн сараар', '6']],
    body: function (s, f, c) {
      var n = Math.max(1, Math.min(12, Number(f.months) || 6)), rows = '', tot = 0;
      for (var i = n; i >= 1; i--) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); var m = todayStr(d).slice(0, 7), r = salaryOf(s, m), gross = r.base + r.bonus;
        tot += gross; rows += '<tr><td>' + m + '</td><td class="n">' + fmt(gross) + '</td></tr>'; }
      return '<h1>ЦАЛИНГИЙН ТОДОРХОЙЛОЛТ</h1><div class="c">' + todayStr() + '</div><p style="margin-top:20px"><b>' + esc(f.to) + '</b></p>' +
        '<p>' + esc(full(s)) + ' (регистр ' + esc(s.regno || BLANK) + ') нь ' + esc(c.name) + '-д ' + esc(s.position || '') + ' албан тушаалд ажилладаг бөгөөд сүүлийн ' + n + ' сарын цалин дараах байдалтай байна:</p>' +
        tbl(['Сар', 'Нийт цалин (суутгалаас өмнө)'], rows + '<tr><th>Дундаж</th><th class="n">' + fmt(tot / n) + '</th></tr>') + sigBoss(c); } },
  { k: 'hire', g: 'Хүний нөөц', name: 'Ажилд авах тушаал', emp: 1, f: [['no', 'Тушаалын дугаар', ''], ['date', 'Огноо', todayStr(), 'date']],
    body: function (s, f, c) { return order(c, f, 'Ажилтан томилох тухай', 'Хөдөлмөрийн тухай хууль, ' + (s.contractNo ? s.contractNo + ' дугаар хөдөлмөрийн гэрээг' : 'хөдөлмөрийн гэрээг') + ' үндэслэн ТУШААХ нь:',
      '<ol><li>' + esc(full(s)) + ' (регистр ' + esc(s.regno || BLANK) + ')-г ' + esc(s.start || f.date) + '-ны өдрөөс ' + esc(s.position || BLANK) + ' албан тушаалд үндсэн цалин ' + fmt(s.salary) + '-өөр томилсугай.</li>' +
      '<li>Ажилтныг нийгмийн даатгалд бүртгүүлэх, ажлын байраар хангахыг ' + BLANK + '-д үүрэг болгосугай.</li></ol>'); } },
  { k: 'fire', g: 'Хүний нөөц', name: 'Ажлаас чөлөөлөх тушаал', emp: 1, f: [['no', 'Тушаалын дугаар', ''], ['date', 'Чөлөөлөх огноо', todayStr(), 'date'],
      ['why', 'Үндэслэл', 'Ажилтны өөрийн хүсэлтээр', 'sel:Ажилтны өөрийн хүсэлтээр|Талуудын харилцан тохиролцоогоор|Хөдөлмөрийн гэрээний хугацаа дууссан тул|Туршилтын хугацаанд тэнцээгүй тул']],
    body: function (s, f, c) { return order(c, f, 'Ажлаас чөлөөлөх тухай', 'Хөдөлмөрийн тухай хуулийг үндэслэн ТУШААХ нь:',
      '<ol><li>' + esc(s.position || '') + ' ' + esc(full(s)) + ' (регистр ' + esc(s.regno || BLANK) + ')-г ' + esc(f.why) + ' ' + esc(f.date) + '-ны өдрөөс ажлаас чөлөөлсүгэй.</li>' +
      '<li>Хариуцсан эд хөрөнгө, бараа материал, баримт бичгийг хүлээлцэх акт үйлдэн хүлээлгэн өгч, тооцоог дуусгахыг үүрэг болгосугай.</li>' +
      '<li>Ажилтны цалин, нөхөн олговрыг хуулийн дагуу олгож, нийгмийн даатгалын дэвтрийг бөглөхийг ' + BLANK + '-д даалгасугай.</li></ol>'); } },
  { k: 'leave', g: 'Хүний нөөц', name: 'Ээлжийн амралт / чөлөөний хүсэлт', emp: 1,
    f: [['type', 'Төрөл', 'Ээлжийн амралт', 'sel:Ээлжийн амралт|Цалинтай чөлөө|Цалингүй чөлөө|Өвчний чөлөө'], ['from', 'Эхлэх', todayStr(), 'date'], ['to', 'Дуусах', todayStr(), 'date'], ['why', 'Шалтгаан', '']],
    body: function (s, f, c) { return '<p style="text-align:right">' + esc(c.name) + '-ийн захирал ' + esc(c.boss || BLANK) + ' танаа</p><h1>ӨРГӨДӨЛ</h1>' +
      '<p style="margin-top:20px">Би ' + esc(f.from) + '-ны өдрөөс ' + esc(f.to) + '-ны өдөр хүртэл <b>' + esc(f.type.toLowerCase()) + '</b> авахыг хүсэж байна.' + (f.why ? ' Шалтгаан: ' + esc(f.why) + '.' : '') + '</p>' +
      '<p>Хүсэлт гаргасан: ' + esc(s.position || '') + ' ' + esc(full(s)) + ' ' + BLANK + ' ' + todayStr() + '</p>' +
      '<p style="margin-top:30px">Зөвшөөрсөн: ' + BLANK + ' / ' + esc(c.boss || BLANK) + ' /</p>'; } },
  { k: 'liability', g: 'Хүний нөөц', name: 'Эд хөрөнгийн бүрэн хариуцлагын гэрээ', emp: 1, f: [],
    body: function (s, f, c) { return '<h1>ЭД ХӨРӨНГИЙН БҮРЭН ХАРИУЦЛАГЫН ГЭРЭЭ</h1><div class="c">' + todayStr() + '</div>' +
      '<p style="margin-top:16px">' + esc(c.name) + ' (цаашид «Байгууллага»)-ыг төлөөлж ' + esc(c.boss || BLANK) + ', нөгөө талаас ' + esc(s.position || '') + ' ' + esc(full(s)) +
      ' (цаашид «Ажилтан») нар дараах гэрээг байгуулав.</p><ol><li>Ажилтан нь ' + esc(c.shop) + '-ийн бараа материал, бэлэн мөнгө, тоног төхөөрөмжийг хүлээн авч, бүрэн бүтэн хадгалах үүргийг хүлээнэ.</li>' +
      '<li>Тооллогоор илэрсэн дутагдал, ажилтны буруутай үйлдлээс учирсан хохирлыг Ажилтан Хөдөлмөрийн тухай хууль болон Иргэний хуульд заасны дагуу барагдуулна.</li>' +
      '<li>Байгууллага нь эд хөрөнгийг хадгалах нөхцөлөөр хангаж, тооллогыг ажилтныг байлцуулан хийнэ.</li><li>Ажилтан хүлээн авсан эд хөрөнгийг ажлаас чөлөөлөгдөхдөө хүлээлцэх актаар хүлээлгэн өгнө.</li></ol>' +
      sig2(c, s); } },
  { k: 'cashreq', g: 'Санхүү', name: 'Бэлэн мөнгө олгохыг хүссэн өргөдөл', emp: 1, f: [['amt', 'Дүн (₮)', '', 'num'], ['why', 'Зориулалт', '']],
    body: function (s, f, c) { return '<h1>БЭЛЭН МӨНГӨ ОЛГОХЫГ ХҮССЭН ӨРГӨДӨЛ</h1><div class="c">' + todayStr() + '</div><table class="t" style="margin-top:16px">' +
      '<tr><th>Хүсэгч</th><td>' + esc(s.position || '') + ' ' + esc(full(s)) + '</td></tr><tr><th>Дүн</th><td><b>' + fmt(f.amt) + '</b> (' + esc(numWords(f.amt)) + ' төгрөг)</td></tr>' +
      '<tr><th>Зориулалт</th><td>' + esc(f.why) + '</td></tr><tr><th>Тайлагнах хугацаа</th><td>' + BLANK + '</td></tr></table>' +
      '<div class="sig"><div>Хүсэгч<div class="line"></div></div><div>Зөвшөөрсөн (захирал)<div class="line"></div></div></div><div class="sig"><div>Нягтлан бодогч<div class="line"></div></div><div>Олгосон (кассчин)<div class="line"></div></div></div>'; } },
  { k: 'advance', g: 'Санхүү', name: 'Мөнгөн урьдчилгааны тайлан', emp: 1, f: [['amt', 'Авсан урьдчилгаа (₮)', '', 'num']],
    body: function (s, f, c) { return '<h1>МӨНГӨН УРЬДЧИЛГААНЫ ТАЙЛАН</h1><div class="c">' + todayStr() + '</div><p>Тайлагнагч: ' + esc(s.position || '') + ' ' + esc(full(s)) + ' · Авсан урьдчилгаа: <b>' + fmt(f.amt) + '</b></p>' +
      tbl(['№', 'Огноо', 'Баримтын №', 'Зарцуулсан зүйл', 'Дүн'], blankRows(8, [1, 2, 3, 4, 5])) +
      '<p>Нийт зарцуулсан: ' + BLANK + ' · Үлдэгдэл (буцаан тушаах) / хэтрэлт: ' + BLANK + '</p><div class="sig"><div>Тайлагнагч<div class="line"></div></div><div>Хянасан (нягтлан)<div class="line"></div></div></div>'; } },
  { k: 'cashcount', g: 'Санхүү', name: 'Бэлэн мөнгөний тооллогын баталгаа', emp: 0, f: [],
    body: function (s, f, c) { var bal = balances(J(), todayStr())['10003'] || 0, rows = '';
      [20000, 10000, 5000, 1000, 500, 100, 50, 20, 10].forEach(function (d) { rows += '<tr><td class="n">' + fmt(d) + '</td><td></td><td></td></tr>'; });
      return '<h1>БЭЛЭН МӨНГӨНИЙ ТООЛЛОГЫН БАТАЛГАА</h1><div class="c">' + esc(c.shop) + ' · ' + todayStr() + '</div>' + tbl(['Дэвсгэрт', 'Тоо ширхэг', 'Дүн'], rows + '<tr><th colspan="2">Нийт тоолсон</th><th></th></tr>') +
        '<p>Бүртгэлээрх кассын үлдэгдэл (10003): <b>' + fmt(bal) + '</b> · Зөрүү: ' + BLANK + '</p>' +
        '<div class="sig"><div>Тооллого хийсэн<div class="line"></div></div><div>Кассчин (хариуцагч)<div class="line"></div></div></div>'; } },
  { k: 'handover', g: 'Бараа материал', name: 'Хүлээлцэх акт', emp: 1, f: [['to', 'Хүлээн авагч', ''], ['what', 'Хүлээлцэх зүйл', 'Бараа материал, касс', 'sel:Бараа материал, касс|Бараа материал|Бэлэн мөнгө (касс)|Тоног төхөөрөмж, эд хөрөнгө']],
    body: function (s, f, c) { return '<h1>ХҮЛЭЭЛЦЭХ АКТ</h1><div class="c">' + esc(c.shop) + ' · ' + todayStr() + '</div><p>Хүлээлгэн өгсөн: ' + esc(full(s)) + ' · Хүлээн авсан: ' + esc(f.to || BLANK) + ' · Хүлээлцсэн зүйл: ' + esc(f.what) + '</p>' +
      tbl(['№', 'Нэр', 'Нэгж', 'Тоо', 'Үнэ', 'Дүн', 'Тайлбар'], blankRows(12, [1, 2, 3, 4, 5, 6, 7])) +
      '<div class="sig"><div>Хүлээлгэн өгсөн<div class="line"></div></div><div>Хүлээн авсан<div class="line"></div></div></div><div class="sig"><div>Гэрчилсэн<div class="line"></div></div><div>Баталсан (захирал)<div class="line"></div></div></div>'; } },
  { k: 'requisition', g: 'Бараа материал', name: 'Бараа материалын шаардах хуудас', emp: 1, f: [['no', 'Дугаар', '']],
    body: function (s, f, c) { return '<h1>БАРАА МАТЕРИАЛЫН ШААРДАХ ХУУДАС № ' + esc(f.no || '____') + '</h1><div class="c">' + esc(c.shop) + ' · ' + todayStr() + '</div><p>Шаардсан: ' + esc(full(s)) + '</p>' +
      tbl(['№', 'Барааны нэр', 'Нэгж', 'Шаардсан тоо', 'Олгосон тоо', 'Тайлбар'], blankRows(10, [1, 2, 3, 4, 5, 6])) +
      '<div class="sig"><div>Шаардсан<div class="line"></div></div><div>Зөвшөөрсөн<div class="line"></div></div></div><div class="sig"><div>Олгосон (нярав)<div class="line"></div></div><div>Хүлээн авсан<div class="line"></div></div></div>'; } },
];
function sigBoss(c) { return '<div class="sig" style="margin-top:50px"><div>' + esc(c.name) + (c.reg ? '<br>Регистр ' + esc(c.reg) : '') + '</div><div>Захирал ' + BLANK + ' / ' + esc(c.boss || BLANK) + ' /<br><small>(тамга)</small></div></div>'; }
function sig2(c, s) { return '<div class="sig"><div><b>Байгууллага</b><br>' + esc(c.boss || '') + '<div class="line"></div></div><div><b>Ажилтан</b><br>' + esc(full(s)) + '<div class="line"></div></div></div>'; }
function order(c, f, title, basis, body) {
  return '<div class="c"><b>' + esc(c.name.toUpperCase()) + '</b><br>ЗАХИРЛЫН ТУШААЛ</div><div class="row"><span>' + esc(f.date || todayStr()) + '</span><span>Дугаар ' + esc(f.no || '____') + '</span><span>Улаанбаатар хот</span></div>' +
    '<div class="c"><b>' + title + '</b></div><p>' + basis + '</p>' + body + '<p style="margin-top:40px">ЗАХИРАЛ ' + BLANK + ' ' + esc(c.boss || '') + '</p>';
}
function docsModule() {
  var groups = {}, list = allDocs();
  list.forEach(function (d) { (groups[d.g] = groups[d.g] || []).push(d); });
  return '<p class="hint">Ажилтан сонгоход нэр, регистр, албан тушаал, цалин, гэрээний мэдээлэл автоматаар бөглөгдөнө. «Засах» дарж маягт бүрийн текстийг өөрчилж, «+ Шинэ маягт»-аар өөрийн маягтыг нэмнэ. ' +
    'Эдгээр нь нийтлэг жишиг загвар — нягтлан, хуульчаараа нэг удаа хянуулаарай.</p><div class="rep-grid">' + Object.keys(groups).map(function (g) {
      return '<div class="card"><h2>' + esc(g) + '</h2><ul class="rep-links">' + groups[g].map(function (d) {
        return '<li class="doc-li"><button class="link" onclick="openDoc(\'' + d.k + '\')">' + esc(d.name) + '</button>' + (d.custom ? ' <span class="tag b">' + (d.base ? 'засварласан' : 'шинэ') + '</span>' : '') +
          '<span class="doc-act"><button class="mini" onclick="editDoc(\'' + d.k + '\')">Засах</button>' + (d.custom ? '<button class="mini" onclick="deleteDoc(\'' + d.id + '\')">' + (d.base ? 'Анхных руу буцаах' : 'Устгах') + '</button>' : '') + '</span></li>'; }).join('') + '</ul></div>';
    }).join('') + '</div>';
}
var docK = '';
function openDoc(k) {
  var d = allDocs().filter(function (x) { return x.k === k; })[0]; docK = k;
  $('dcTitle').textContent = d.name;
  $('dcSub').textContent = '';
  var cb = state.docBiz || state.biz || KEYS[0];
  var emps = bizStaff(cb).filter(function (s) { return s.status === 'Тийм' && s.role !== 'Эзэн'; });
  var html = '<label for="dcBiz">Компани / дэлгүүр</label><select id="dcBiz" onchange="state.docBiz=this.value;openDoc(\'' + k + '\')">' +
    KEYS.map(function (b) { return '<option value="' + b + '"' + (b === cb ? ' selected' : '') + '>' + esc(BUSINESSES[b].name) + '</option>'; }).join('') + '</select>';
  var MF = [['surname', 'Овог'], ['name', 'Нэр'], ['regno', 'Регистр'], ['position', 'Албан тушаал'], ['start', 'Ажилд орсон огноо'], ['salary', 'Цалин (₮)'], ['phone', 'Утас'], ['address', 'Гэрийн хаяг'], ['bank', 'Данс']];
  html += d.emp ? '<label for="dcEmp">Ажилтан</label><select id="dcEmp" onchange="$(\'dcManual\').style.display=this.value?\'none\':\'block\'"><option value="">Гараар бөглөх</option>' +
    emps.map(function (s) { return '<option value="' + s.id + '">' + esc(full(s)) + (s.position ? ' · ' + esc(s.position) : '') + '</option>'; }).join('') + '</select>' +
    '<div id="dcManual"><div class="row2">' + MF.map(function (x) { return '<div><label for="dcm_' + x[0] + '">' + x[1] + '</label><input id="dcm_' + x[0] + '"' + (x[0] === 'salary' ? ' type="number" inputmode="numeric"' : x[0] === 'start' ? ' type="date"' : '') + '></div>'; }).join('') + '</div></div>' : '';
  html += d.f.map(function (x) {
    var id = 'dc_' + x[0], t = x[3] || '';
    if (t.indexOf('sel:') === 0) return '<label for="' + id + '">' + x[1] + '</label><select id="' + id + '">' + t.slice(4).split('|').map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>';
    return '<label for="' + id + '">' + x[1] + '</label><input id="' + id + '" type="' + (t === 'date' ? 'date' : t === 'num' ? 'number' : 'text') + '" value="' + esc(x[2] || '') + '">';
  }).join('');
  $('dcFields').innerHTML = html;
  openSheet('docSheet');
}
function printDocForm() {
  var d = allDocs().filter(function (x) { return x.k === docK; })[0], f = {};
  d.f.forEach(function (x) { f[x[0]] = $('dc_' + x[0]).value.trim(); });
  var s = d.emp && $('dcEmp').value ? staff.filter(function (x) { return x.id === $('dcEmp').value; })[0] : null;
  if (d.emp && !s) {   // гараар бөглөсөн ажилтны мэдээлэл (хоосон талбар хэвлэхэд зураас болно)
    var g = function (k) { return $('dcm_' + k) ? $('dcm_' + k).value.trim() : ''; };
    if (g('name') || g('surname') || g('regno')) s = { id: '_manual', status: 'Тийм', name: g('name') || BLANK, surname: g('surname'), regno: g('regno'), position: g('position'), start: g('start'),
      salary: Number(g('salary')) || 0, phone: g('phone'), address: g('address'), bank: g('bank') };
  }
  var emptyS = { name: BLANK, surname: '', regno: '', position: '', start: '', salary: 0, phone: '', address: '', bank: '' };
  var cb = $('dcBiz').value, keep = state.biz; state.biz = cb;   // кассын тооллого г.м тухайн компанийн санхүүгээс уншина
  var html = d.body(s || (d.emp ? emptyS : null), f, coInfo(cb));
  state.biz = keep;
  printHtml(d.name, html);
}
function printHtml(title, body) {
  var w = window.open('', '_blank', 'width=820,height=900');
  if (!w) { toast('Хэвлэх цонх нээгдсэнгүй — popup зөвшөөрнө үү'); return; }
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' +
    'body{font-family:"Times New Roman",serif;font-size:13.5px;line-height:1.55;margin:36px 48px;color:#000}h1{text-align:center;font-size:16px;margin:0 0 4px}h3{font-size:14px;margin:14px 0 4px}' +
    '.c{text-align:center}.row{display:flex;justify-content:space-between;margin:12px 0}table.t{width:100%;border-collapse:collapse;margin:10px 0}.t th,.t td{border:1px solid #000;padding:6px 8px;text-align:left;height:18px}' +
    '.t th{background:#f2f2f2}.n{text-align:right}.sig{display:flex;justify-content:space-between;margin-top:30px}.sig div{width:45%}.line{border-bottom:1px solid #000;height:26px}' +
    '</style></head><body>' + body + '<script>window.onload=function(){window.print()}<\/script></body></html>');
  w.document.close();
}

function sfJobInfo() {
  var v = $('sfNdJob').value.trim(), j = window.ND_JOBS ? ND_JOBS.filter(function (x) { return x[0] === v; })[0] : null;
  $('sfJobInfo').textContent = j ? j[1] + ' · ҮОМШӨ ' + j[2] + '%' : (v ? 'Код олдсонгүй' : 'Жишээ: 5223-11 худалдаачин, 5230-11 кассчин, 4321-12 нярав');
}

// ═══════════ АЖИЛЧДАД ДААЛГАВАР / САНУУЛГА ═══════════
// Ажилтан (эсвэл дэлгүүрийн бүх ажилтан) өөрийн хуудсанд нэвтрэхэд харж, «Хийсэн» дарна. Энд хэн, хэзээ хийснийг харна.
var tasks = [];
function tasksCard() {
  var open = tasks.filter(function (t) { return t.status === 'Шинэ'; }), done = tasks.filter(function (t) { return t.status === 'Хийсэн'; }).slice(-10).reverse();
  var row = function (t) {
    var late = t.status === 'Шинэ' && t.due && t.due < todayStr();
    return '<tr><td>' + esc(BUSINESSES[t.biz] ? BUSINESSES[t.biz].name : t.biz) + '</td><td>' + esc(t.staffName) + '</td><td>' + esc(t.title) + (t.note ? '<br><small class="muted">' + esc(t.note) + '</small>' : '') + '</td>' +
      '<td>' + esc(t.due || '') + (late ? ' <span class="tag r">хэтэрсэн</span>' : '') + '</td><td>' + (t.status === 'Хийсэн' ? '<span class="tag">Хийсэн · ' + esc(t.doneBy) + ' ' + esc(t.doneAt) + '</span>' : '<span class="tag b">Хүлээгдэж</span>') + '</td>' +
      '<td class="n">' + (t.status === 'Шинэ' ? '<button class="mini" onclick="cancelTask(\'' + t.id + '\')">Цуцлах</button>' : '') + '</td></tr>';
  };
  return '<div class="card rep"><div class="rep-cap"><b>Ажилчдад илгээсэн даалгавар</b><span>' + open.length + ' хүлээгдэж байна</span></div><div class="scroll"><table class="rep-t"><tr><th>Дэлгүүр</th><th>Хэнд</th><th>Даалгавар</th><th>Хугацаа</th><th>Төлөв</th><th></th></tr>' +
    (open.concat(done).map(row).join('') || '<tr><td colspan="6" class="muted">Даалгавар алга — «+ Даалгавар илгээх»</td></tr>') + '</table></div></div>';
}
function openTask() {
  $('tkBiz').innerHTML = KEYS.map(function (k) { return '<option value="' + k + '"' + (k === (state.staffBiz !== 'all' ? state.staffBiz : state.biz) ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('');
  tkStaffOpts(); $('tkTitle').value = ''; $('tkDue').value = todayStr(); $('tkNote').value = '';
  openSheet('taskSheet');
}
function tkStaffOpts() {
  var b = $('tkBiz').value;
  $('tkStaff').innerHTML = '<option value="all">Дэлгүүрийн бүх ажилтан</option>' + staff.filter(function (s) { return s.status === 'Тийм' && staffIn(s, b) && s.role !== 'Эзэн'; })
    .map(function (s) { return '<option value="' + s.id + '">' + esc(full(s)) + '</option>'; }).join('');
}
function saveTask() {
  var t = { biz: $('tkBiz').value, staffId: $('tkStaff').value, title: $('tkTitle').value.trim(), due: $('tkDue').value, note: $('tkNote').value.trim() };
  if (!t.title) { toast('Даалгавраа бичнэ үү'); return; }
  if (!API_URL) { var s = staff.filter(function (x) { return x.id === t.staffId; })[0]; t.id = 'T' + Date.now(); t.status = 'Шинэ'; t.staffName = s ? s.name : 'Бүх ажилтан'; t.created = todayStr();
    tasks.push(t); save('nb_demo_tasks', tasks); closeSheet('taskSheet'); render(); return; }
  post({ type: 'admin_task', by: ownerName, task: t }, function (err) { if (err) { toast('Алдаа: ' + err); return; } closeSheet('taskSheet'); toast('Даалгавар илгээгдлээ — ажилтан нэвтрэхдээ харна'); refresh(); });
}
function cancelTask(id) {
  if (!confirm('Даалгаврыг цуцлах уу?')) return;
  if (!API_URL) { tasks = tasks.filter(function (t) { return t.id !== id; }); save('nb_demo_tasks', tasks); render(); return; }
  post({ type: 'admin_task', cancelId: id }, function (err) { if (err) { toast('Алдаа: ' + err); return; } refresh(); });
}

// ═══════════ МАЯГТ ЗАСАХ / ШИНЭЭР НЭМЭХ ═══════════
// Загварт {{түлхүүр}} бичихэд хэвлэхэд автоматаар бөглөгдөнө; {{?Талбарын нэр}} бол хэвлэхийн өмнө асуух талбар болно.
var customDocs = [];
var DOC_TOKENS = [
  ['компани', function (s, c) { return c.name; }], ['регистр (компани)', function (s, c) { return c.reg; }], ['захирал', function (s, c) { return c.boss; }],
  ['компанийн хаяг', function (s, c) { return c.addr; }], ['дэлгүүр', function (s, c) { return c.shop; }], ['огноо', function () { return todayStr(); }],
  ['овог нэр', function (s) { return s ? full(s) : BLANK; }], ['нэр', function (s) { return s ? s.name : BLANK; }], ['овог', function (s) { return s ? s.surname || '' : ''; }],
  ['ажилтны регистр', function (s) { return s && s.regno || BLANK; }], ['албан тушаал', function (s) { return s && s.position || BLANK; }],
  ['цалин', function (s) { return s && s.salary ? fmt(s.salary) : BLANK; }], ['цалин үсгээр', function (s) { return s && s.salary ? numWords(s.salary) + ' төгрөг' : BLANK; }],
  ['утас', function (s) { return s && s.phone || ''; }], ['гэрийн хаяг', function (s) { return s && s.address || BLANK; }], ['данс', function (s) { return s && s.bank || BLANK; }],
  ['ажилд орсон', function (s) { return s && s.start || BLANK; }], ['гэрээний №', function (s) { return s && s.contractNo || BLANK; }],
];
var EMP_TOKENS = /\{\{(овог нэр|нэр|овог|ажилтны регистр|албан тушаал|цалин|цалин үсгээр|утас|гэрийн хаяг|данс|ажилд орсон|гэрээний №)\}\}/;
function docFieldsOf(html) { var f = [], re = /\{\{\?([^}]{1,60})\}\}/g, m; while ((m = re.exec(html))) if (f.indexOf(m[1]) < 0) f.push(m[1]); return f; }
function customToDoc(c) {
  var fields = docFieldsOf(c.html);
  return { k: c.base || c.id, id: c.id, base: c.base, custom: true, g: c.group || 'Бусад', name: c.name, emp: EMP_TOKENS.test(c.html) ? 1 : 0,
    f: fields.map(function (x, i) { return ['c' + i, x, '']; }),
    body: function (s, f, co) {
      var h = c.html;
      DOC_TOKENS.forEach(function (t) { h = h.split('{{' + t[0] + '}}').join(esc(t[1](s && s.name !== BLANK ? s : null, co) || '')); });
      fields.forEach(function (x, i) { h = h.split('{{?' + x + '}}').join(esc(f['c' + i] || BLANK)); });
      return h;
    } };
}
// Анхны маягтуудыг засварласан хувилбараар нь солиод, шинэ маягтуудыг нэмнэ
function allDocs() {
  var byBase = {};
  customDocs.forEach(function (c) { if (c.base) byBase[c.base] = c; });
  return DOCS.map(function (d) { return byBase[d.k] ? customToDoc(byBase[d.k]) : d; }).concat(customDocs.filter(function (c) { return !c.base; }).map(customToDoc));
}
// Анхны маягтыг засахад түүний текстийг {{түлхүүр}}-тэйгээр гаргаж редакторт ачаална
function builtinTemplate(d) {
  var tok = function (k) { return '{{' + k + '}}'; };
  var s = { name: tok('нэр'), surname: tok('овог'), regno: tok('ажилтны регистр'), position: tok('албан тушаал'), start: tok('ажилд орсон'), salary: 0, phone: tok('утас'),
            address: tok('гэрийн хаяг'), bank: tok('данс'), contractNo: tok('гэрээний №'), id: '_tpl' };
  var f = {}; d.f.forEach(function (x) { f[x[0]] = '{{?' + x[1] + '}}'; });
  var c = { name: tok('компани'), reg: tok('регистр (компани)'), shop: tok('дэлгүүр'), addr: tok('компанийн хаяг'), boss: tok('захирал') };
  var keepBiz = state.biz; state.biz = state.biz || KEYS[0];
  var h; try { h = d.body(d.emp ? s : null, f, c); } catch (e) { h = '<p>' + esc(d.name) + '</p>'; }
  state.biz = keepBiz;
  return h.split(todayStr()).join('{{огноо}}').replace(/\{\{овог\}\} \{\{нэр\}\}/g, '{{овог нэр}}').replace(/₮0/g, '{{цалин}}');
}
var docEditId = '', docEditBase = '';
function editDoc(k) {
  var d = k ? allDocs().filter(function (x) { return x.k === k; })[0] : null;
  docEditId = d && d.custom ? d.id : ''; docEditBase = d ? (d.custom ? d.base || '' : d.k) : '';
  var c = d && d.custom ? customDocs.filter(function (x) { return x.id === d.id; })[0] : null;
  $('deName').value = d ? d.name : ''; $('deGroup').value = d ? d.g : 'Бусад';
  $('deBody').innerHTML = c ? c.html : d ? builtinTemplate(d) : '<h1>МАЯГТЫН НЭР</h1><p style="text-align:center">{{огноо}}</p><p>{{компани}}-ийн ... {{овог нэр}} (регистр {{ажилтны регистр}}) ...</p><p>Тайлбар: {{?Тайлбар}}</p>';
  $('deTok').innerHTML = '<option value="">+ Автомат талбар оруулах…</option>' + DOC_TOKENS.map(function (t) { return '<option>' + t[0] + '</option>'; }).join('') + '<option value="?">+ Асуух талбар (өөрөө нэрлэх)…</option>';
  openSheet('docEditSheet');
}
function deCmd(cmd, val) { $('deBody').focus(); document.execCommand(cmd, false, val || null); }
function deInsertTok(sel) {
  var v = sel.value; sel.value = ''; if (!v) return;
  if (v === '?') { var n = prompt('Хэвлэхийн өмнө асуух талбарын нэр (жишээ: Хаана өгөх):'); if (!n) return; v = '?' + n.replace(/[{}]/g, ''); }
  deCmd('insertText', '{{' + v + '}}');
}
function deTable() { deCmd('insertHTML', '<table class="t"><tr><th>Багана 1</th><th>Багана 2</th><th>Багана 3</th></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></table><p></p>'); }
function saveDoc() {
  var x = { id: docEditId, name: $('deName').value.trim(), group: $('deGroup').value, html: $('deBody').innerHTML.trim(), base: docEditBase };
  if (!x.name) { toast('Маягтын нэрийг бичнэ үү'); return; }
  if (!API_URL) {
    if (!x.id) { x.id = 'D' + Date.now(); customDocs.push(x); } else customDocs = customDocs.map(function (c) { return c.id === x.id ? x : c; });
    save('nb_demo_docs', customDocs); closeSheet('docEditSheet'); render(); toast('Хадгалагдлаа'); return;
  }
  post({ type: 'admin_doc', doc: x }, function (err) { if (err) { toast('Алдаа: ' + err); return; } closeSheet('docEditSheet'); toast('Хадгалагдлаа'); refresh(); });
}
function deleteDoc(id) {
  var c = customDocs.filter(function (x) { return x.id === id; })[0]; if (!c) return;
  if (!confirm(c.base ? 'Засварыг устгаж анхны маягт руу буцаах уу?' : '«' + c.name + '» маягтыг устгах уу?')) return;
  if (!API_URL) { customDocs = customDocs.filter(function (x) { return x.id !== id; }); save('nb_demo_docs', customDocs); render(); return; }
  post({ type: 'admin_doc', cancelId: id }, function (err) { if (err) { toast('Алдаа: ' + err); return; } refresh(); });
}
function previewDoc() { printHtml($('deName').value || 'Маягт', $('deBody').innerHTML); }

// ═══════════ НЭМЭЛТ ДАНС ═══════════
var accountsX = [];
function addAccount() { accEdit(); }
// ═══════════ ДАНСНЫ ТӨЛӨВЛӨГӨӨ — нэмэх, засах, нуух, устгах ═══════════
// Системийн данс: нэрийг засах, хэрэглээгүй бол нуух (устгахгүй). Нэмсэн данс: засах, хэрэглээгүй бол устгах.
var ACC_TYPES = [['asset', 'Хөрөнгө'], ['liab', 'Өр төлбөр'], ['equity', 'Эздийн өмч'], ['rev', 'Орлого'], ['contra', 'Орлогын хасалт'], ['cogs', 'Борлуулсны өртөг'], ['exp', 'Зардал']];
function accUsage() {   // бүх компанийн журналд данс бүр хэдэн удаа орсон
  var u = {}; ALL_KEYS.forEach(function (b) { buildJournal(b, R()).forEach(function (e) { u[e.dr] = (u[e.dr] || 0) + 1; u[e.cr] = (u[e.cr] || 0) + 1; }); });
  return u;
}
function accGroupName(a) {
  if (a[2] === 'exp') return /^70/.test(a[0]) ? 'Зардал — ерөнхий ба удирдлагын' : /^71/.test(a[0]) ? 'Зардал — борлуулалт, маркетингийн' : 'Зардал — бусад';
  return (ACC_TYPES.filter(function (t) { return t[0] === a[2]; })[0] || ['', 'Бусад'])[1];
}
function accountsView() {
  var u = accUsage(), q = String(state.accQ || '').toLowerCase().trim(), G = {}, order = [];
  ACCOUNTS.filter(function (a) { return a[0] !== '0000' && (!q || (a[0] + ' ' + a[1]).toLowerCase().indexOf(q) >= 0); }).forEach(function (a) {
    var g = accGroupName(a); if (!G[g]) { G[g] = []; order.push(g); } G[g].push(a);
  });
  var rows = order.map(function (g) {
    return '<tr class="dcat"><td colspan="5">' + g + ' <small style="font-weight:400">· ' + G[g].length + '</small></td></tr>' + G[g].map(function (a) {
      var A = ACC[a[0]] || {}, n = u[a[0]] || 0;
      var tags = (A.custom ? '<span class="tag b">Нэмсэн</span> ' : '') + (A.renamed ? '<span class="tag">Нэр өөрчилсөн</span> ' : '') + (A.hide ? '<span class="tag r">Нуусан</span> ' : '') + (A.cash ? '<span class="tag g">Мөнгө</span>' : '');
      var acts = '<button class="mini" onclick="accEdit(\'' + a[0] + '\')">Засах</button> ' +
        (A.custom ? '<button class="mini" onclick="accDel(\'' + a[0] + '\')"' + (n ? ' disabled title="Гүйлгээтэй данс устгах боломжгүй"' : '') + '>Устгах</button>' :
          '<button class="mini" onclick="accHide(\'' + a[0] + '\')">' + (A.hide ? 'Харуулах' : 'Нуух') + '</button>');
      return '<tr' + (A.hide ? ' style="opacity:.55"' : '') + '><td><b>' + a[0] + '</b></td><td>' + esc(a[1]) + ' ' + tags + '</td><td class="n">' + (n ? n + ' гүйлгээ' : '<small class="muted">хэрэглээгүй</small>') + '</td><td class="n" style="white-space:nowrap">' + acts + '</td></tr>';
    }).join('');
  }).join('');
  return '<p class="hint">Системийн дансны нэрийг өөрчилж, хэрэглээгүйг нь нууж болно (нуусан данс сонголтод гарахгүй). Өөрийн нэмсэн дансыг засах, гүйлгээгүй бол устгах боломжтой. Baaz-ын стандарт дансны төлөвлөгөөтэй нийцнэ.</p>' +
    '<div class="d-tool"><input id="accQ" type="search" value="' + esc(state.accQ || '') + '" placeholder="Данс хайх: код эсвэл нэр" oninput="state.accQ=this.value;clearTimeout(window._aqT);window._aqT=setTimeout(function(){render();var i=$(\'accQ\');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)"></div>' +
    '<div class="card"><table class="rep-t"><tr><th>Код</th><th>Дансны нэр</th><th class="n">Хэрэглээ</th><th></th></tr>' + (rows || '<tr><td colspan="4" class="muted">Данс олдсонгүй</td></tr>') + '</table></div>';
}
function accSave(list, msg) {
  if (JSON.stringify(list).length > 7800) { toast('Хэт олон өөрчлөлт — зарим нэмсэн дансаа устгана уу'); return; }
  accountsX = list; applyCustomAccounts(accountsX); render();
  if (!API_URL) { save('nb_demo_accx', accountsX); return; }
  post({ type: 'admin_setting', key: 'accounts', value: accountsX }, function (err) { toast(err ? 'Алдаа: ' + err : msg); if (!err) refresh(); });
}
function accEdit(code) {
  var A = code ? ACC[code] : null, x = code ? (accountsX.filter(function (a) { return a.code === code; })[0] || {}) : {};
  gOpen('<h2>' + (A ? 'Данс засах' : 'Данс нэмэх') + '</h2>' +
    '<div class="row2"><div><label for="acCode">Код</label><input id="acCode" inputmode="numeric" value="' + esc(code || '') + '"' + (A ? ' disabled' : ' placeholder="Жишээ: 7125, 110107"') + '></div>' +
    '<div><label for="acType">Төрөл</label><select id="acType"' + (A && A.base ? ' disabled' : '') + '>' + ACC_TYPES.map(function (t) { return '<option value="' + t[0] + '"' + ((A ? A.type : 'exp') === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></div></div>' +
    '<label for="acName">Дансны нэр</label><input id="acName" value="' + esc(A ? A.name : '') + '" placeholder="Жишээ: Интернет, утасны зардал">' +
    '<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="acCash"' + (A && A.cash ? ' checked' : '') + (A && A.base ? ' disabled' : '') + ' style="width:auto"> Мөнгөн хөрөнгийн данс (касс, банкны харилцах)</label>' +
    (A && A.base ? '<p class="muted" style="font-size:12.5px">Системийн данс — зөвхөн нэрийг нь өөрчилнө. Код, төрөл өөрчлөгдөхгүй.' + (A.renamed ? ' <a class="link" onclick="accReset(\'' + code + '\')">Анхны нэр рүү буцаах</a>' : '') + '</p>' :
      '<p class="muted" style="font-size:12.5px">Код: 1 — хөрөнгө, 3 — өр, 4 — өмч, 5 — орлого, 6 — өртөг, 7 — зардал гэж эхэлнэ. Зардлыг Baaz-ын адил 70xx (удирдлага), 71xx (борлуулалт) гэж ангилна.</p>') +
    '<button class="btn" onclick="accEditSave(\'' + (code || '') + '\')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
}
function accEditSave(code) {
  var A = code ? ACC[code] : null, name = $('acName').value.trim();
  if (!name) { toast('Дансны нэрээ бичнэ үү'); return; }
  var list = accountsX.slice();
  if (A && A.base) {
    list = list.filter(function (a) { return a.code !== code; }).concat([Object.assign({}, accountsX.filter(function (a) { return a.code === code; })[0] || {}, { code: code, name: name })]);
    gClose(); accSave(list, 'Дансны нэр өөрчлөгдлөө'); return;
  }
  var c = A ? code : $('acCode').value.trim(), type = $('acType').value, cash = $('acCash').checked;
  if (!/^\d{4,6}$/.test(c)) { toast('Код 4–6 оронтой тоо байна'); return; }
  if (!A && ACC[c]) { toast('Энэ код аль хэдийн бий: ' + ACC[c].name); return; }
  if (cash && type !== 'asset') { toast('Мөнгөн данс нь «Хөрөнгө» төрөлтэй байна'); return; }
  list = list.filter(function (a) { return a.code !== c; }).concat([{ code: c, name: name, type: type, cash: cash }]);
  gClose(); accSave(list, A ? 'Данс засагдлаа' : 'Данс нэмэгдлээ');
}
function accReset(code) { gClose(); accSave(accountsX.filter(function (a) { return a.code !== code; }), 'Анхны нэр рүү буцлаа'); }
function accHide(code) {
  var A = ACC[code]; if (!A) return;
  if (!A.hide && (accUsage()[code] || 0)) { toast('Гүйлгээтэй дансыг нуух боломжгүй'); return; }
  var x = accountsX.filter(function (a) { return a.code === code; })[0], rest = accountsX.filter(function (a) { return a.code !== code; });
  var nx = Object.assign({}, x || { code: code }, { hide: !A.hide });
  accSave(nx.hide || nx.name ? rest.concat([nx]) : rest, A.hide ? 'Данс сонголтод дахин гарна' : 'Данс нуугдлаа');
}
function accDel(code) {
  var A = ACC[code]; if (!A || !A.custom) return;
  if (accUsage()[code]) { toast('Гүйлгээтэй дансыг устгах боломжгүй — эхлээд гүйлгээг нь өөр данс руу засна уу'); return; }
  if (!confirm(code + ' ' + A.name + ' дансыг устгах уу?')) return;
  accSave(accountsX.filter(function (a) { return a.code !== code; }), 'Данс устгагдлаа');
}

// ═══════════ ЭХНИЙ ҮЛДЭГДЭЛ ═══════════
// Системээ эхлүүлэхэд байсан касс, банк, авлага, өглөг, зээл, хөрөнгийн үлдэгдлийг нэг дор оруулна (журналд «Эхний үлдэгдэл» гэж).
function openingView() {
  var have = journal.filter(function (j) { return j.biz === state.biz && /^Эхний үлдэгдэл/.test(j.desc); });
  var accs = ACCOUNTS.filter(function (a) { return /^(asset|liab)$/.test(a[2]) && a[0] !== '1404'; });
  return '<p class="hint">Системийг эхлүүлэх өдрийн байдлаарх үлдэгдлийг оруулна. Барааны үлдэгдлийг «Бараа материал → Baaz Excel оруулах»-аар оруулдаг тул энд ороогүй. ' +
    'Авлага, өглөгийг харилцагчаар нь салгаж оруулбал «Харилцагчийн хуулга»-д зөв гарна.</p>' +
    '<div class="card"><div class="filter"><label>Огноо<input type="date" id="opDate" value="' + (have[0] ? have[0].date : todayStr()) + '"></label></div>' +
    '<div class="scroll"><table class="rep-t"><tr><th>Данс</th><th>Нэр</th><th>Харилцагч (авлага, өглөгт)</th><th class="n">Дүн</th></tr>' + accs.map(function (a) {
      var ex = have.filter(function (j) { return j.dr === a[0] || j.cr === a[0]; }).reduce(function (s, j) { return s + j.amount; }, 0);
      return '<tr><td>' + a[0] + '</td><td>' + esc(accName(a[0])) + '</td><td>' + (/^(1201|3101|1503|3501)$/.test(a[0]) ? '<input class="op-p" data-a="' + a[0] + '" placeholder="Нэр">' : '') + '</td>' +
        '<td class="n"><input class="op-v" data-a="' + a[0] + '" type="number" inputmode="numeric" style="width:140px;text-align:right" placeholder="' + (ex ? r0(ex) : '0') + '"></td></tr>';
    }).join('') + '</table></div>' + (have.length ? '<p class="muted" style="margin-top:8px">Өмнө оруулсан ' + have.length + ' мөр байна — «Журналын бичилт»-ээс засна. Энд нэмэлтээр бичигдэнэ.</p>' : '') +
    '<div class="pg-act" style="margin-top:10px"><button class="b-btn primary" onclick="saveOpening()">Эхний үлдэгдэл бичих</button></div></div>';
}
function saveOpening() {
  var d = $('opDate').value, E = [];
  [].forEach.call(document.querySelectorAll('.op-v'), function (inp) {
    var v = Number(inp.value); if (!v) return;
    var a = inp.dataset.a, pp = document.querySelector('.op-p[data-a="' + a + '"]'), partner = pp ? pp.value.trim() : '';
    var asset = ACC[a].type === 'asset';
    E.push({ biz: state.biz, date: d, dr: asset ? a : '4201', cr: asset ? '4201' : a, amount: Math.abs(v), partner: partner, desc: 'Эхний үлдэгдэл · ' + accName(a) });
  });
  if (!E.length) { toast('Дүн оруулна уу'); return; }
  var dup = E.filter(function (e) { var a = e.dr === '4201' ? e.cr : e.dr; return journal.some(function (j) { return j.biz === state.biz && /^Эхний үлдэгдэл/.test(j.desc) && (j.dr === a || j.cr === a); }); });   // давхар бичихээс сэргийлнэ
  if (dup.length && !confirm('Анхаар: ' + dup.map(function (e) { return accName(e.dr === '4201' ? e.cr : e.dr); }).join(', ') + ' дансанд эхний үлдэгдэл аль хэдийн бичигдсэн байна.\nДахин бичвэл давхардана. Үргэлжлүүлэх үү?')) return;
  if (!confirm(E.length + ' дансны эхний үлдэгдлийг ' + d + '-ны өдрөөр бичих үү?')) return;
  if (!API_URL) { E.forEach(function (e, i) { e.id = 'J' + Date.now() + '-' + i; journal.push(e); }); save('nb_demo_journal', journal); render(); toast('Бичигдлээ'); return; }
  post({ type: 'admin_journal', by: ownerName, entries: E }, function (err) { if (err) { toast(err === 'locked' ? 'Энэ огноо түгжигдсэн байна' : 'Алдаа: ' + err); return; } toast('Бичигдлээ'); refresh(); });
}

// ═══════════ ГҮЙЛГЭЭ ТҮГЖИХ ═══════════
// Нягтлан шалгаж дууссан сарыг түгжвэл тэр хүртэлх гүйлгээг нэмэх, засах, цуцлах боломжгүй (Baaz-ийн «Гүйлгээ түгжих»).
function lockView() {
  return '<div class="card"><h2>Гүйлгээ түгжих</h2><p class="muted">Түгжсэн огноо хүртэлх журналын бичилт, кассын баримт, банкны тулгалт, бичлэг цуцлалтыг хийх боломжгүй болно. Тайлан өөрчлөгдөхгүй.</p>' +
    '<div class="filter" style="margin-top:10px"><label>Түгжих огноо (энэ өдөр хүртэл)<input type="date" id="lockDate" value="' + esc(meta.lock || '') + '"></label>' +
    '<label>&nbsp;<button class="b-btn primary" onclick="saveLock()">Хадгалах</button></label><label>&nbsp;<button class="b-btn" onclick="$(\'lockDate\').value=\'\';saveLock()">Түгжээ авах</button></label></div>' +
    '<p>' + (meta.lock ? 'Одоо <b>' + esc(meta.lock) + '</b> хүртэл түгжигдсэн.' : 'Түгжээгүй.') + '</p></div>';
}
function saveLock() {
  var v = $('lockDate').value;
  if (v && !confirm(v + ' хүртэлх бүх гүйлгээг түгжих үү?')) return;
  if (!API_URL) { meta.lock = v; save('nb_demo_lock', v); render(); return; }
  post({ type: 'admin_setting', key: 'lock', value: v }, function (err) { toast(err ? 'Алдаа: ' + err : 'Хадгалагдлаа'); refresh(); });
}
