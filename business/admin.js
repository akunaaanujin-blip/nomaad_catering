// ── УДИРДЛАГЫН САМБАР ──
// Baaz-ийн бүтэцтэй: Миний компаниуд → (Борлуулалт · Бараа материал · Санхүү · Ажилчид), мөн нийт Ажилчид цэс.

var KEYS = ['meat', 'travel', 'cozy'];
var token = sessionStorage.getItem('nb_tok') || '';   // удирдагчийн токен (8 цаг)
var ownerName = sessionStorage.getItem('nb_owner') || '';
var records = [], staff = [], salary = [], stockData = {}, moves = [], journal = [], partners = [];
var state = { view: 'companies', biz: '', module: 'sales', period: 'month', staffBiz: 'all', month: todayStr().slice(0, 7), q: '', stockF: 'in', showMoves: false,
  sub: { sales: 'overview', products: 'stock', finance: 'dash' }, from: todayStr().slice(0, 8) + '01', to: todayStr(), acc: '10003', item: '' };
var editId = '', salId = '', salKind = 'Урьдчилгаа';

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
    $('ownerName').textContent = ownerName;
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
    journal = load('nb_demo_journal', []); partners = load('nb_demo_partners', []);
    stamp(); cb(true); return;
  }
  post({ type: 'admin_read', from: '' }, function (err, d) {   // санхүүгийн тайланд бүх түүх хэрэгтэй
    if (err) { if (err !== 'auth') toast('Холбогдож чадсангүй'); cb(false); return; }
    records = d.records || []; staff = d.staff || []; salary = d.salary || []; stockData = d.stock || {}; moves = d.moves || [];
    journal = d.journal || []; partners = d.partners || [];
    stamp(); cb(true);
  });
}
function stamp() { $('updated').textContent = 'Шинэчилсэн: ' + timeStr(); }
function refresh() { fetchAll(function (ok) { if (ok) { render(); toast('Шинэчлэгдлээ'); } }); }
function post(body, cb) {
  body.token = token;
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var err = d && d.status === 'ok' ? null : (d && d.error) || 'error';
      if (err === 'auth') authLost();
      cb(err, d);
    })
    .catch(function () { cb('network'); });
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
function setSub(s) { state.sub[state.module] = s; render(); window.scrollTo(0, 0); }
function setStaffBiz(b) { state.staffBiz = b; render(); }
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
  var s = { sales: 0, cash: 0, card: 0, transfer: 0, exp: 0, n: 0 };
  list.forEach(function (x) {
    var a = Number(x.amount) || 0;
    if (x.type === 'sale') {
      s.sales += a; if (a > 0) s.n++;
      if (x.pay === 'Карт') s.card += a; else if (x.pay === 'Шилжүүлэг') s.transfer += a; else s.cash += a;
    } else if (x.type === 'expense') s.exp += a;
  });
  return s;
}
function bizStaff(biz) { return staff.filter(function (s) { return s.biz === biz || s.biz === 'all'; }); }
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

// ── Үндсэн зураглал ──
function render() {
  var pend = staff.filter(function (s) { return s.status === 'Хүлээгдэж'; }).length;
  $('rail').innerHTML = railHtml(pend);
  $('subnav').innerHTML = subnavHtml();
  $('main').classList.toggle('has-sub', state.view === 'company');
  $('crumb').innerHTML = crumbHtml();
  toggleNav(false);
  if (state.view === 'staff') $('view').innerHTML = pageHead('Бүх ажилчид', '') + staffView('');
  else if (state.view === 'company') $('view').innerHTML = companyView();
  else $('view').innerHTML = companiesView();
}

// ── Baaz маягийн цэс: зүүн цэнхэр зурвас + бүлэглэсэн дэд цэс ──
var ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  sales: '<path d="M3 4h2l2.4 11h11.2L21 7H6"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
  products: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
  finance: '<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>',
  staff: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 4.5a3 3 0 010 6M21 20c0-2.6-1.4-4.4-3.6-5.1"/>',
  reports: '<path d="M6 2.5h9l5 5V21.5H6z"/><path d="M14.5 2.5V8H20M9 13h8M9 17h8"/>',
  people: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
  logout: '<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
};
function ico(k) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + '</svg>'; }
var MODULES = [['sales', 'Борлуулалт'], ['products', 'Бараа материал'], ['finance', 'Санхүү'], ['staff', 'Ажилчид'], ['reports', 'Бүх тайлан']];
function railHtml(pend) {
  var item = function (on, onclick, icon, label, extra) {
    return '<button class="' + (on ? 'on' : '') + '" onclick="' + onclick + '" title="' + label + '">' + ico(icon) + '<span>' + label + '</span>' + (extra || '') + '</button>';
  };
  var inCo = state.view === 'company';
  return '<div class="rail-logo">N</div>' +
    item(state.view === 'companies', "go('companies')", 'home', 'Компаниуд') +
    (state.biz ? MODULES.map(function (m) { return item(inCo && state.module === m[0], "openModule('" + m[0] + "')", m[0], m[1]); }).join('') : '') +
    '<div class="rail-sep"></div>' +
    item(state.view === 'staff', "go('staff')", 'people', 'Бүх ажилчид', pend ? '<i class="dot">' + pend + '</i>' : '') +
    '<div class="rail-foot">' + item(false, 'refresh()', 'refresh', 'Шинэчлэх') + item(false, 'logout()', 'logout', 'Гарах') + '</div>';
}
// Дэд цэсний бүлгүүд (Baaz-ийн «Журнал / Мөнгөн хөрөнгө / Авлага өглөг / Санхүүгийн тайлан» шиг)
var MENU = {
  sales: [['Борлуулалт', ['overview', 'receipts']], ['Борлуулалтын тайлан', ['item', 'cat', 'staff', 'day', 'pay']], ['И-баримт', ['ebarimt']]],
  products: [['Бараа материал', ['stock', 'in']], ['Тайлан', ['move', 'card']], ['Харилцагч', ['suppliers']]],
  finance: [['Хянах самбар', ['dash']], ['Журнал', ['entry', 'journal', 'trial', 'ledger']], ['Мөнгөн хөрөнгө', ['expenses', 'cash', 'cashflow']],
            ['Авлага өглөг', ['partners']], ['Санхүүгийн тайлан', ['balance', 'pl']], ['Дансны удирдлага', ['accounts']]],
};
function subLabel(mod, k) { var x = (SUBS[mod] || []).filter(function (s) { return s[0] === k; })[0]; return x ? x[1] : k; }
function subGroup(mod, k) { var g = (MENU[mod] || []).filter(function (g) { return g[1].indexOf(k) >= 0; })[0]; return g ? g[0] : ''; }
function subnavHtml() {
  if (state.view !== 'company') return '';
  var B = BUSINESSES[state.biz], mod = state.module;
  var head = '<div class="sub-co"><span class="mono" style="background:' + B.color + '">' + B.icon + '</span><div><b>' + esc(B.name) + '</b>' +
    '<select onchange="go(\'company\',this.value)">' + KEYS.map(function (k) { return '<option value="' + k + '"' + (k === state.biz ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="sub-title">' + MODULES.filter(function (m) { return m[0] === mod; })[0][1] + '</div>';
  if (!MENU[mod]) {
    var one = mod === 'staff' ? [['Ажилчид', 'Ажилчид, цалин']] : [['reports', 'Бүх тайлан']];
    return head + '<ul class="sub-list"><li><button class="on">' + one[0][1] + '</button></li></ul>' + moduleSwitch();
  }
  return head + MENU[mod].map(function (g) {
    return '<div class="sub-group">' + g[0] + '</div><ul class="sub-list">' + g[1].map(function (k) {
      return '<li><button class="' + (state.sub[mod] === k ? 'on' : '') + '" onclick="setSub(\'' + k + '\')">' + subLabel(mod, k) + '</button></li>';
    }).join('') + '</ul>';
  }).join('') + moduleSwitch();
}
function moduleSwitch() {   // утсан дээр зүүн зурвас нуугдах тул модуль солих товчнууд
  return '<div class="sub-mods">' + MODULES.map(function (m) {
    return '<button class="' + (state.module === m[0] ? 'on' : '') + '" onclick="openModule(\'' + m[0] + '\')">' + m[1] + '</button>';
  }).join('') + '<button onclick="go(\'companies\')">← Компаниуд</button></div>';
}
function openModule(m) { if (!state.biz) return go('companies'); state.view = 'company'; state.module = m; render(); window.scrollTo(0, 0); }
function toggleNav(on) { $('main').classList.toggle('nav-open', !!on); }
function crumbHtml() {
  if (state.view === 'companies') return '<b>Миний компаниуд</b>';
  if (state.view === 'staff') return '<b>Бүх ажилчид</b>';
  var mod = state.module, parts = [esc(BUSINESSES[state.biz].name), MODULES.filter(function (m) { return m[0] === mod; })[0][1]];
  if (MENU[mod]) { parts.push(subGroup(mod, state.sub[mod])); }
  return parts.map(function (p, i) { return i === parts.length - 1 ? '<b>' + p + '</b>' : '<span>' + p + '</span>'; }).join('<i>/</i>');
}
function pageHead(title, actions, withPeriod) {
  return '<div class="pg-head"><h1>' + title + '</h1><div class="pg-act">' + (actions || '') + '</div></div>' + (withPeriod ? periodBar() : '');
}

// ── Миний компаниуд ──
function companiesView() {
  var t = todayStr(), m = t.slice(0, 8) + '01';
  return '<h2 class="sec-title">Миний компаниуд</h2><div class="co-grid">' + KEYS.map(function (k) {
    var B = BUSINESSES[k], E = (window.EBARIMT || {})[k] || {};
    var today = sums(records.filter(function (x) { return x.biz === k && x.date === t; }));
    var month = sums(records.filter(function (x) { return x.biz === k && x.date >= m; }));
    var st = bizStaff(k);
    var active = st.filter(function (s) { return s.status === 'Тийм'; }).length;
    var pend = st.filter(function (s) { return s.status === 'Хүлээгдэж'; }).length;
    return '<div class="co-card" style="border-top-color:' + B.color + '">' +
      '<div class="co-head"><span class="mono" style="background:' + B.color + '">' + B.icon + '</span><div><b>' + esc(B.name) + '</b>' +
      '<small>' + (E.merchantTin ? esc(E.legalName || '') + ' · ТТД ' + esc(E.merchantTin) : 'И-баримтгүй') + '</small></div></div>' +
      '<div class="co-stats">' +
      '<div><span>Өнөөдөр</span><b>' + fmt(today.sales) + '</b></div>' +
      '<div><span>Энэ сар</span><b>' + fmt(month.sales) + '</b></div>' +
      '<div><span>Цэвэр (сар)</span><b style="color:' + (month.sales - month.exp >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(month.sales - month.exp) + '</b></div>' +
      '<div><span>Ажилчид</span><b>' + active + (pend ? ' <span class="tag r">+' + pend + ' хүлээгдэж</span>' : '') + '</b></div>' +
      '</div>' +
      '<div class="co-meta"><span class="tag">Хэвийн</span>' + (E.merchantTin ? ' <span class="tag b">И-баримт</span>' : '') + '</div>' +
      '<button class="btn" style="background:' + B.color + '" onclick="go(\'company\',\'' + k + '\')">Нэвтрэх →</button>' +
      '</div>';
  }).join('') + '</div>';
}

// ── Компанийн дотор: модуль → дэд цэс → хуудас ──
function companyView() {
  var mod = state.module;
  if (mod === 'staff') return pageHead('Ажилчид', '') + staffView(state.biz);
  if (mod === 'reports') return pageHead('Бүх тайлан', '<button class="b-btn primary" onclick="exportAll()">Бүх тайланг Excel-ээр татах</button>', true) + reportsModule();
  var sub = state.sub[mod], noPeriod = /^(accounts|stock|suppliers)$/.test(sub);
  var acts = /^(overview|dash|stock)$/.test(sub) ? '' : '<button class="b-btn" onclick="exportCurrent()">Excel</button><button class="b-btn" onclick="window.print()">Хэвлэх</button>';
  if (sub === 'entry') acts = '<button class="b-btn primary" onclick="openEntry()">+ Журналын бичилт</button>' + acts;
  if (sub === 'partners' || sub === 'suppliers') acts = '<button class="b-btn primary" onclick="openPartner()">+ Харилцагч</button>' + acts;
  if (sub === 'stock') acts = '<button class="b-btn primary" onclick="openMove(\'Орлого\')">+ Орлого</button>' +
    (hasWarehouse(state.biz) ? '<button class="b-btn" onclick="openMove(\'Шилжүүлэг\')">Шилжүүлэг</button>' : '') +
    '<button class="b-btn" onclick="openMove(\'Тооллого\')">Тооллого</button><button class="b-btn" onclick="openMove(\'Хасалт\')">Хасалт</button>' +
    '<button class="b-btn" onclick="exportCurrent()">Excel</button>';
  return pageHead(subLabel(mod, sub), acts, !noPeriod) + subBody();
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
function salesModule() {
  var list = inRange(state.biz), s = sums(list);
  var sales = list.filter(function (x) { return x.type === 'sale'; });
  var bills = {};
  sales.forEach(function (x) { var k = x.bill || (String(x.note || '').match(/ДДТД (\d+)/) || [])[1] || x.id; if (x.amount > 0) bills[k] = 1; });
  var byStaff = {};
  sales.forEach(function (x) { var k = x.staff || '—'; byStaff[k] = (byStaff[k] || 0) + (Number(x.amount) || 0); });
  var staffRows = Object.keys(byStaff).sort(function (a, b) { return byStaff[b] - byStaff[a]; });
  return '<div class="kpis">' +
    kpi('Борлуулалт', fmt(s.sales), Object.keys(bills).length + ' баримт / гүйлгээ') +
    kpi('Бэлэн', fmt(s.cash)) + kpi('Карт', fmt(s.card)) + kpi('Шилжүүлэг', fmt(s.transfer)) +
    '</div><div class="grid2"><div class="card"><h2>Худалдагчаар</h2><div class="scroll"><table>' +
    (staffRows.length ? '<tr><th>Ажилтан</th><th class="n">Дүн</th></tr>' + staffRows.map(function (k) {
      return '<tr><td>' + esc(k) + '</td><td class="n">' + fmt(byStaff[k]) + '</td></tr>';
    }).join('') : '<tr><td class="muted">Борлуулалт алга</td></tr>') + '</table></div></div>' +
    '<div class="card"><h2>Шилдэг бараа</h2><div class="scroll"><table>' + topProducts(sales, 10) + '</table></div></div></div>' +
    '<div class="card"><h2>Гүйлгээ</h2><div class="scroll"><table>' + recordRows(sales.slice().reverse().slice(0, 300)) + '</table></div></div>';
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
  if (biz === 'travel') return true;
  var st = stockData[biz] || {};
  return Object.keys(st).some(function (k) { return st[k].wh; });
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
  var rows = stockRows(biz);
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
  var banner = !tracked ? '<div class="card notice"><b>Үлдэгдлийн бүртгэл эхлээгүй байна.</b> ' +
    'Baaz-ийн «Бараа материалын үлдэгдэл (өртгөөр, байршлаар)» Excel тайлангаар эхний үлдэгдэл, өртгийг нэг дор оруулж болно. ' +
    '<button class="btn sm" onclick="$(\'baazFile\').click()">Baaz Excel оруулах</button></div>' : '';
  var stockVal = rows.reduce(function (a, r) { return a + Math.max(0, total(r)) * (r.price || 0); }, 0);
  var costVal = rows.reduce(function (a, r) { return a + Math.max(0, total(r)) * (r.cost || 0); }, 0);
  return banner +
    '<div class="kpis">' + kpi('Бараа', rows.length) + kpi('Үлдэгдэл · өртгөөр', fmt(costVal)) + kpi('Үлдэгдэл · зарах үнээр', fmt(stockVal)) +
    kpi('Цөөн үлдсэн (≤' + LOW_STOCK + ')', cntLow) + kpi('Дууссан', cntOut) + '</div>' +
    '<div class="card"><div class="bar-row"><div class="tabs">' +
    [['all', 'Бүгд'], ['in', 'Үлдэгдэлтэй'], ['low', 'Цөөн'], ['out', 'Дууссан']].map(function (t) {
      return '<button class="' + (state.stockF === t[0] ? 'on' : '') + '" onclick="state.stockF=\'' + t[0] + '\';render()">' + t[1] + '</button>';
    }).join('') + '</div>' +
    '<div class="bar-row" style="gap:6px"><input class="search" placeholder="Бараа хайх…" value="' + esc(state.q) + '" oninput="state.q=this.value;render();this.focus();this.setSelectionRange(this.value.length,this.value.length)">' +
    '</div></div>' +
    '<div class="scroll" style="margin-top:10px"><table class="stock"><tr><th>Бараа</th><th class="hide-sm">Ангилал</th><th class="n">Үнэ</th>' +
    '<th class="n">Өртөг</th><th class="n">Ашиг</th><th class="n">Дэлгүүр</th>' + (wh ? '<th class="n">Агуулах</th><th class="n">Нийт</th>' : '') +
    '<th class="n">Зарагдсан</th><th></th></tr>' +
    list.map(function (r) {
      var t = total(r), s = sold[r.name] || { qty: 0 };
      var cls = t <= 0 ? 'st-out' : (t <= LOW_STOCK ? 'st-low' : '');
      var margin = r.price && r.cost ? Math.round((r.price - r.cost) / r.price * 100) : null;
      return '<tr class="' + cls + '"><td>' + esc(r.name) + '</td><td class="muted hide-sm">' + esc(r.cat) + '</td><td class="n">' + (r.price ? fmt(r.price) : '—') + '</td>' +
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
  mvInfo();
  openSheet('moveSheet');
}
function mvCurrent() {
  var st = (stockData[state.biz] || {})[$('mvItem').value.trim()] || { shop: 0, wh: 0 };
  return st;
}
function mvInfo() {
  var st = mvCurrent();
  var wh = hasWarehouse(state.biz);
  $('mvCur').textContent = $('mvItem').value.trim() ? 'Одоогийн үлдэгдэл: дэлгүүр ' + round2(st.shop) + (wh ? ', агуулах ' + round2(st.wh) : '') + (st.cost ? ' · дундаж өртөг ' + fmt(st.cost) : '') : '';
}
function saveMove() {
  var biz = state.biz, item = $('mvItem').value.trim(), qty = Number($('mvQty').value), note = $('mvNote').value.trim();
  if (!item) { toast('Бараагаа сонгоно уу'); return; }
  if (!isFinite(qty) || $('mvQty').value === '' || (moveKind !== 'Тооллого' && qty <= 0) || qty < 0) { toast('Тоо хэмжээ зөв оруулна уу'); return; }
  var ms = [];
  if (moveKind === 'Орлого') {
    var cost = Number($('mvCost').value) || 0, pay = $('mvPay').value, partner = $('mvPartner').value.trim();
    if (!cost && !mvCurrent().cost) { toast('Нэгж өртгөө оруулна уу — санхүүд бараа өртгөөр бичигдэнэ'); return; }
    if (pay === 'Зээлээр' && !partner) { toast('Зээлээр авсан бол нийлүүлэгчээ бичнэ үү'); return; }
    ms.push({ biz: biz, loc: $('mvLoc').value, item: item, kind: 'Орлого', qty: qty, cost: cost, pay: pay, partner: partner, note: note });
  } else if (moveKind === 'Хасалт') {
    if (!note) { toast('Хасах шалтгаанаа бичнэ үү'); return; }
    ms.push({ biz: biz, loc: $('mvLoc').value, item: item, kind: 'Хасалт', qty: -qty, note: note });
  }
  else if (moveKind === 'Шилжүүлэг') {
    var from = $('mvDir').value === 'w2s' ? 'Агуулах' : 'Дэлгүүр', to = from === 'Агуулах' ? 'Дэлгүүр' : 'Агуулах';
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
function sendMoves(ms, done) {
  if (!API_URL) {   // туршилтын горим
    ms.forEach(function (m) {
      var b = stockData[m.biz] = stockData[m.biz] || {};
      var it = b[m.item] = b[m.item] || { shop: 0, wh: 0 };
      if (m.loc === 'Агуулах') it.wh += m.qty; else it.shop += m.qty;
      if (m.cost && m.qty > 0) it.cost = it.cost ? Math.round((it.cost + m.cost) / 2) : m.cost;
      moves.push({ id: 'M' + Date.now() + '-' + moves.length, date: todayStr() + ' ' + timeStr(), biz: m.biz, loc: m.loc, item: m.item, kind: m.kind, qty: m.qty,
                   cost: m.cost || 0, by: ownerName, note: m.note || '', pay: m.pay || '', partner: m.partner || '' });
    });
    save('nb_demo_stock', stockData); save('nb_demo_moves', moves); render(); done(); return;
  }
  post({ type: 'admin_stock', by: ownerName, moves: ms }, function (err) {
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
  if (!window.XLSX) { toast('Excel уншигч ачаалагдаагүй — интернэтээ шалгана уу'); return; }
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
  var r = { base: base, bonus: sum('Шагнал'), ded: sum('Суутгал'), adv: sum('Урьдчилгаа'), paid: sum('Олгосон') };
  r.left = r.base + r.bonus - r.ded - r.adv - r.paid;
  return r;
}
function staffSales(s, month) {
  return records.filter(function (x) { return x.type === 'sale' && x.staff === s.name && x.date.slice(0, 7) === month && (s.biz === 'all' || x.biz === s.biz); })
    .reduce(function (a, x) { return a + (Number(x.amount) || 0); }, 0);
}
function staffView(fixedBiz) {
  var bizF = fixedBiz || state.staffBiz;
  var list = staff.filter(function (s) { return bizF === 'all' || s.biz === bizF || s.biz === 'all'; });
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
  return '<div class="card bar-row">' + (fixedBiz ? '<h2 style="margin:0">Ажилчид</h2>' : filt) +
    '<label class="month">Сар <input type="month" value="' + m + '" onchange="setMonth(this.value)"></label></div>' +
    (!API_URL ? '<div class="card muted">Ажилчдын бүртгэл Google Sheet-тэй холбогдсон үед ажиллана.</div>' : '') +
    '<div class="kpis">' + kpi('Идэвхтэй ажилтан', act.length + (pend.length ? ' <span class="tag r">+' + pend.length + '</span>' : '')) +
    kpi('Цалингийн сан (' + m + ')', fmt(tot.base)) + kpi('Олгосон', fmt(tot.paid)) + kpi('Олгох үлдэгдэл', fmt(tot.left)) + '</div>' +
    (pend.length ? '<div class="card"><h2>Баталгаажуулалт хүлээж буй (' + pend.length + ')</h2>' + pend.map(pendCard).join('') + '</div>' : '') +
    '<div class="card"><div class="bar-row"><h2 style="margin:0">Ажилчид (' + act.length + ')</h2>' +
    '<a class="link" href="' + reg + '" target="_blank">＋ Бүртгүүлэх хуудас</a></div>' +
    (act.length ? '<div class="st-grid">' + act.map(function (s) { return staffCard(s, m); }).join('') + '</div>' : '<p class="muted">Ажилтан алга</p>') + '</div>' +
    (off.length ? '<details class="card"><summary>Идэвхгүй (' + off.length + ')</summary>' + off.map(function (s) {
      return '<div class="st-off">' + esc(s.surname ? s.surname + ' ' : '') + esc(s.name) + ' · ' + bizLabel(s.biz) +
        ' <button class="mini" onclick="openStaff(\'' + s.id + '\')">Засах</button></div>';
    }).join('') + '</details>' : '');
}
function bizLabel(b) { return b === 'all' ? 'Бүх дэлгүүр' : (BUSINESSES[b] ? BUSINESSES[b].name : b); }
function pendCard(s) {
  return '<div class="pend"><div><b>' + esc(s.surname ? s.surname + ' ' : '') + esc(s.name) + '</b> <span class="muted">@' + esc(s.username || '') + '</span> · ' + bizLabel(s.biz) +
    '<small>Утас: ' + esc(s.phone) + (s.regno ? ' · ' + esc(s.regno) : '') + (s.position ? ' · ' + esc(s.position) : '') + ' · ' + esc(s.created) + '</small></div>' +
    '<div class="pend-act"><button class="btn sm" style="background:var(--green)" onclick="approve(\'' + s.id + '\',\'Худалдагч\')">✓ Худалдагчаар</button>' +
    '<button class="btn sm" onclick="approve(\'' + s.id + '\',\'Менежер\')">✓ Менежерээр</button>' +
    '<button class="btn sm ghost" style="color:var(--red)" onclick="reject(\'' + s.id + '\')">✕ Татгалзах</button></div></div>';
}
function staffCard(s, m) {
  var r = salaryOf(s, m), sales = staffSales(s, m);
  return '<div class="st-card"><div class="st-head"><div><b>' + esc(s.surname ? s.surname + ' ' : '') + esc(s.name) + '</b>' +
    '<small>@' + esc(s.username || '—') + ' · ' + bizLabel(s.biz) + ' · ' + (s.role === 'Худалдагч' ? 'Худалдагч' : '<span class="tag b">' + esc(s.role) + '</span>') + (s.position ? ' · ' + esc(s.position) : '') + '</small>' +
    '<small>' + (s.phone ? 'Утас: ' + esc(s.phone) : '') + (s.bank ? ' · Данс: ' + esc(s.bank) : '') + '</small></div>' +
    '<button class="mini" onclick="openStaff(\'' + s.id + '\')">Засах</button></div>' +
    '<div class="st-sal">' +
    '<div><span>Үндсэн</span><b>' + (r.base ? fmt(r.base) : '<span class="muted">тохируулаагүй</span>') + '</b></div>' +
    '<div><span>Шагнал</span><b>' + fmt(r.bonus) + '</b></div>' +
    '<div><span>Суутгал</span><b>−' + fmt(r.ded) + '</b></div>' +
    '<div><span>Урьдчилгаа</span><b>−' + fmt(r.adv) + '</b></div>' +
    '<div><span>Олгосон</span><b>−' + fmt(r.paid) + '</b></div>' +
    '<div class="st-left"><span>Үлдэгдэл</span><b>' + fmt(r.left) + '</b></div></div>' +
    '<div class="st-foot"><span class="muted">Борлуулалт (' + m + '): <b>' + fmt(sales) + '</b></span>' +
    '<button class="btn sm" onclick="openSalary(\'' + s.id + '\')">＋ Цалин</button></div></div>';
}

// ── Ажилтан засах / батлах ──
function approve(id, role) {
  post({ type: 'admin_staff', id: id, fields: { status: 'Тийм', role: role } }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    toast('✓ Баталгаажлаа — ажилтан одоо өөрийн кодоор нэвтэрнэ');
    refresh();
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
  $('sfTitle').textContent = (s.surname ? s.surname + ' ' : '') + s.name;
  $('sfSub').textContent = bizLabel(s.biz) + (s.created ? ' · бүртгүүлсэн ' + s.created : '');
  $('sfBiz').innerHTML = ['all'].concat(KEYS).map(function (k) { return '<option value="' + k + '">' + esc(bizLabel(k)) + '</option>'; }).join('');
  $('sfStatus').value = s.status; $('sfRole').value = s.role; $('sfBiz').value = s.biz;
  $('sfPos').value = s.position || ''; $('sfSalary').value = s.salary || ''; $('sfPhone').value = s.phone || '';
  $('sfBank').value = s.bank || ''; $('sfCode').value = ''; $('sfUser').value = s.username || '';
  openSheet('staffSheet');
}
function saveStaff() {
  var f = { status: $('sfStatus').value, role: $('sfRole').value, biz: $('sfBiz').value, position: $('sfPos').value.trim(),
            salary: Number($('sfSalary').value) || 0, phone: $('sfPhone').value.trim(), bank: $('sfBank').value.trim(),
            username: $('sfUser').value.trim().toLowerCase() };
  if (!/^[a-z0-9._]{3,20}$/.test(f.username)) { toast('Нэвтрэх нэр: латин жижиг үсэг, тоо, цэг (3-20)'); return; }
  var code = $('sfCode').value.trim();
  if (code) { if (!/^\d{4,8}$/.test(code)) { toast('Код 4-8 оронтой тоо байна'); return; } f.code = code; }
  post({ type: 'admin_staff', id: editId, fields: f }, function (err) {
    if (err) { toast(err === 'user_taken' ? 'Энэ нэвтрэх нэр бүртгэгдсэн байна' : 'Алдаа: ' + err); return; }
    closeSheet('staffSheet'); toast('✓ Хадгалагдлаа'); refresh();
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
  $('slBizWrap').style.display = s.biz === 'all' ? 'block' : 'none';
  $('slBiz').innerHTML = KEYS.map(function (k) { return '<option value="' + k + '"' + (k === state.biz ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('');
  var hist = salary.filter(function (e) { return e.staffId === id; }).slice().reverse().slice(0, 20);
  $('slHistory').innerHTML = hist.length ? hist.map(function (e) {
    var minus = e.kind !== 'Шагнал';
    return '<li><span>' + esc(e.kind) + ' · ' + esc(e.month) + (e.note ? '<small>' + esc(e.note) + '</small>' : '') + '<small>' + esc(e.date) + '</small></span>' +
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
  sales: [['overview', 'Тойм'], ['item', 'Бараагаар'], ['cat', 'Ангиллаар'], ['staff', 'Худалдагчаар'], ['day', 'Өдрөөр'], ['pay', 'Төлбөрийн хэлбэрээр'],
          ['receipts', 'Баримтын жагсаалт'], ['ebarimt', 'И-баримт тулгалт']],
  products: [['stock', 'Үлдэгдэл'], ['move', 'Хөдөлгөөний тайлан'], ['card', 'Барааны карт'], ['in', 'Орлогын жагсаалт'], ['suppliers', 'Нийлүүлэгчид']],
  finance: [['dash', 'Хянах самбар'], ['entry', 'Журналын бичилт'], ['journal', 'Ерөнхий журнал'], ['trial', 'Гүйлгээ баланс'], ['ledger', 'Дансны хуулга'],
            ['expenses', 'Зарлага, касс хаалт'], ['cash', 'Касс, харилцах'], ['pl', 'Орлогын тайлан'], ['balance', 'Санхүүгийн байдал'], ['cashflow', 'Мөнгөн гүйлгээ'],
            ['partners', 'Авлага, өглөг'], ['accounts', 'Дансны төлөвлөгөө']],
};
function subTabs() {
  var cur = state.sub[state.module];
  return '<div class="subtabs">' + SUBS[state.module].map(function (s) {
    return '<button class="' + (cur === s[0] ? 'on' : '') + '" onclick="setSub(\'' + s[0] + '\')">' + s[1] + '</button>';
  }).join('') + '</div>';
}
function R() { return { records: records, moves: moves, salary: salary, journal: journal, stock: stockData, staff: staff, partners: partners }; }
function J() { return buildJournal(state.biz, R()); }

// Тайлан бүрийг нэг газраас гаргана — дэлгэц, Excel, «Бүх тайлан» бүгд үүнийг ашиглана
function makeReport(mod, sub) {
  var biz = state.biz, r = range(), f = r[0], t = r[1];
  if (mod === 'sales') {
    if (sub === 'receipts') return repReceipts(R(), biz, f, t);
    if (sub === 'ebarimt') return repEbarimt(R(), biz, f, t);
    return repSalesBy(R(), biz, f, t, sub);
  }
  if (mod === 'products') {
    if (sub === 'move') return repStockMove(R(), biz, f, t);
    if (sub === 'card') return repItemCard(R(), biz, state.item, f, t);
    if (sub === 'in') return repReceiptsIn(R(), biz, f, t);
    if (sub === 'stock') return repStockNow(biz);
    if (sub === 'suppliers') return repPartnerList(biz);
  }
  var E = J();
  if (sub === 'journal') return repJournal(E, f, t);
  if (sub === 'trial') return repTrial(E, f, t);
  if (sub === 'ledger') return repLedger(E, f, t, state.acc);
  if (sub === 'cash') return repCash(E, f, t);
  if (sub === 'pl') return repPL(E, f, t);
  if (sub === 'balance') return repBalance(E, t);
  if (sub === 'cashflow') return repCashflow(E, f, t);
  if (sub === 'partners') return repPartners(E, t);
  if (sub === 'accounts') return repAccounts();
  if (sub === 'entry') return repManual(biz, f, t);
  if (sub === 'expenses') return repExpenses(biz, f, t);
}
function repStockNow(biz) {
  var rows = stockRows(biz).map(function (r) {
    var q = round2(r.shop + r.wh);
    return { name: r.name, cat: r.cat, shop: round2(r.shop), wh: round2(r.wh), q: q, cost: r.cost || '', val: r.cost ? round2(Math.max(0, q) * r.cost) : '',
             price: r.price || '', pval: r.price ? round2(Math.max(0, q) * r.price) : '' };
  }).filter(function (r) { return r.q || r.cost; });
  return { title: 'Барааны үлдэгдэл (' + todayStr() + ')', cols: [c('name', 'Бараа'), c('cat', 'Ангилал'), m('shop', 'Дэлгүүр'), m('wh', 'Агуулах'), m('q', 'Нийт'),
    m('cost', 'Нэгж өртөг'), m('val', 'Өртгөөр'), m('price', 'Зарах үнэ'), m('pval', 'Зарах үнээр')], rows: rows,
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
             acc: ex ? (function (a) { return a + ' ' + accName(a); })(expenseAcc(x.category, biz, costEngine(biz, R()).since !== '')) : (x.diff ? (x.diff < 0 ? '7303 ' + accName('7303') : '5201 ' + accName('5201')) : ''),
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

function subBody() {
  var mod = state.module, sub = state.sub[mod];
  if (mod === 'sales' && sub === 'overview') return salesModule();
  if (mod === 'products' && sub === 'stock') return productsModule();
  if (mod === 'finance' && sub === 'dash') return financeDash();
  var rep = makeReport(mod, sub), pre = '';
  if (mod === 'finance' && sub === 'ledger') pre = '<div class="filter"><label>Данс<select onchange="state.acc=this.value;render()">' +
    ACCOUNTS.map(function (a) { return '<option value="' + a[0] + '"' + (state.acc === a[0] ? ' selected' : '') + '>' + a[0] + ' ' + esc(a[1]) + '</option>'; }).join('') + '</select></label></div>';
  if (mod === 'products' && sub === 'card') {
    pre = '<div class="filter"><label>Бараа<input list="cardItems" value="' + esc(state.item) + '" placeholder="Барааны нэр…" onchange="state.item=this.value;render()" style="min-width:260px"></label>' +
      '<datalist id="cardItems">' + stockRows(state.biz).map(function (r) { return '<option value="' + esc(r.name) + '">'; }).join('') + '</datalist></div>';
    if (!state.item) return pre + '<div class="card muted">Бараагаа сонгоно уу.</div>';
  }
  if (mod === 'finance' && sub === 'entry') pre = '<p class="hint">Борлуулалт, зарлага, бараа, цалин санхүүд <b>автоматаар</b> бичигддэг. Энд зөвхөн бусад гүйлгээг (эхний үлдэгдэл, хөрөнгө оруулалт, зээл, банкинд тушаах, нийлүүлэгчид төлөх г.м) оруулна.</p>';
  return pre + reportCard(rep, { entry: 'cancelEntry', in: 'cancelMove', expenses: 'cancelRecord' }[sub]);
}

function cellVal(col, v) {
  if (v === '' || v == null) return '';
  if (col.num) return typeof v === 'number' ? (v < 0 ? '−' + fmt(-v).slice(1) : fmt(v).slice(1)) : esc(v);
  return esc(v);
}
function reportCard(rep, cancellable) {
  var head = '<tr>' + rep.cols.map(function (cl) { return '<th' + (cl.num ? ' class="n"' : '') + '>' + cl.label + '</th>'; }).join('') + (cancellable ? '<th></th>' : '') + '</tr>';
  var body = rep.rows.length ? rep.rows.map(function (r) {
    return '<tr' + (r._b ? ' class="b"' : '') + '>' + rep.cols.map(function (cl) { return '<td' + (cl.num ? ' class="n' + (r[cl.k] < 0 ? ' neg' : '') + '"' : '') + '>' + cellVal(cl, r[cl.k]) + '</td>'; }).join('') +
      (cancellable ? '<td class="n">' + (r._id ? '<button class="mini" onclick="' + cancellable + '(\'' + esc(r._id) + '\')">Цуцлах</button>' : '') + '</td>' : '') + '</tr>';
  }).join('') : '<tr><td colspan="' + rep.cols.length + '" class="muted">Мэдээлэл алга</td></tr>';
  var foot = rep.total ? '<tr class="tot">' + rep.cols.map(function (cl) { return '<td' + (cl.num ? ' class="n"' : '') + '>' + cellVal(cl, rep.total[cl.k]) + '</td>'; }).join('') + (cancellable ? '<td></td>' : '') + '</tr>' : '';
  var r = range();
  return '<div class="card rep"><div class="rep-cap"><b>' + esc(rep.title) + '</b><span>' + esc(BUSINESSES[state.biz].name) + ' · ' + r[0] + ' — ' + r[1] + ' · ' + rep.rows.length + ' мөр</span></div>' +
    (rep.note ? '<p class="rep-note' + (rep.check === false ? ' bad' : rep.check ? ' ok' : '') + '">' + esc(rep.note) + '</p>' : '') +
    '<div class="scroll"><table class="rep-t">' + head + body + foot + '</table></div></div>';
}

// ── Хянах самбар + «нэг ч алдагдалгүй» шалгалт ──
function journalCheck(E, f, t) {
  // Борлуулалтын мөр бүр журналд яг нэг удаа, яг ижил дүнгээр орсныг шалгана
  var sales = records.filter(function (x) { return x.biz === state.biz && x.type === 'sale' && x.date >= f && x.date <= t && Number(x.amount); });
  var posted = {};
  E.forEach(function (e) { if (e.doc === 'Борлуулалт' || e.doc === 'Борлуулалтын буцаалт') posted[e.ref] = (posted[e.ref] || 0) + e.amount; });
  var miss = sales.filter(function (x) { return Math.abs((posted[x.id] || 0) - Math.abs(Number(x.amount))) > 0.5; });
  var sAmt = sales.reduce(function (a, x) { return a + Number(x.amount); }, 0);
  var b = balances(E, t, f), rev = -(b['5101'] || 0) - (b['5102'] || 0) - (b['6001'] || 0);
  var exps = records.filter(function (x) { return x.biz === state.biz && x.type === 'expense' && x.date >= f && x.date <= t && Number(x.amount); });
  var eMiss = exps.filter(function (x) { return !E.some(function (e) { return e.ref === x.id; }); });
  var tb = repTrial(E, f, t), bs = repBalance(E, t);
  var ce = costEngine(state.biz, R()), noCost = Object.keys(ce.noCost);
  var salAll = salary.filter(function (e) { return e.biz === 'all' && (e.kind === 'Олгосон' || e.kind === 'Урьдчилгаа'); });
  var invVal = Object.keys(ce.items).reduce(function (a, k) { return a + ce.items[k].v; }, 0), inv1404 = balances(E)['1404'] || 0;
  return { invVal: invVal, invOk: !ce.since || Math.abs(invVal - inv1404) < 1, noCost: noCost, salAll: salAll, n: sales.length, miss: miss, sAmt: sAmt, rev: rev, revOk: Math.abs(sAmt - rev) < 0.5, eN: exps.length, eMiss: eMiss, tb: tb.check, bs: bs.check };
}
function financeDash() {
  var r = range(), E = J(), p = plData(E, r[0], r[1]), b = balances(E, r[1]);
  var g = function (k) { return b[k] || 0; };
  var ck = journalCheck(E, r[0], r[1]);
  var okAll = !ck.miss.length && ck.revOk && !ck.eMiss.length && ck.tb && ck.bs && ck.invOk && !ck.noCost.length && !ck.salAll.length;
  var line = function (ok, text) { return '<li><span class="ck ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : '!') + '</span>' + text + '</li>'; };
  return '<div class="kpis">' +
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
    SUBS[mod].forEach(function (s) { if (!/^(overview|dash|card|entry)$/.test(s[0])) out.push([mod, s[0], s[1]]); });
  });
  return out;
}
function reportsModule() {
  var groups = {};
  allReportList().forEach(function (x) { (groups[x[0]] = groups[x[0]] || []).push(x); });
  return '<p class="hint">Сонгосон хугацааны бүх тайланг нэг Excel файлд (тайлан бүр тусдаа хуудас) татна. Тайлан нээх бол нэр дээр нь дарна.</p>' +
    '<div class="rep-grid">' + ['sales', 'products', 'finance'].map(function (mod) {
      return '<div class="card"><h2>' + MODULES.filter(function (x) { return x[0] === mod; })[0][1] + '</h2><ul class="rep-links">' +
        SUBS[mod].map(function (s) {
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
  if (!window.XLSX) { toast('Excel сан ачаалагдаагүй — интернэтээ шалгана уу'); return; }
  var rep = makeReport(state.module, state.sub[state.module]);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, repAoa(rep), 'Тайлан');
  XLSX.writeFile(wb, xlsxName(rep.title));
}
function exportAll() {
  if (!window.XLSX) { toast('Excel сан ачаалагдаагүй — интернэтээ шалгана уу'); return; }
  var wb = XLSX.utils.book_new(), used = {};
  allReportList().forEach(function (x) {
    var rep = makeReport(x[0], x[1]);
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
  ['rent', 'Түрээс төлсөн (харилцахаас)', '7201', '1101'],
  ['util', 'Цахилгаан, ус төлсөн (харилцахаас)', '7202', '1101'],
  ['credit', 'Зээлээр зарсан (авлага үүссэн)', '1201', '5101'],
  ['collect', 'Авлага орж ирсэн', '1101', '1201'],
  ['withdraw', 'Эзэн мөнгө авсан', '4101', '1101'],
];
function accOptions(sel) { return ACCOUNTS.map(function (a) { return '<option value="' + a[0] + '"' + (sel === a[0] ? ' selected' : '') + '>' + a[0] + ' ' + esc(a[1]) + '</option>'; }).join(''); }
function partnerOptions() { return partners.filter(function (p) { return p.biz === state.biz; }).map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join(''); }
function openEntry() {
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
function saveEntry() {
  var e = { biz: state.biz, date: $('jeDate').value, dr: $('jeDr').value, cr: $('jeCr').value, amount: Number($('jeAmount').value),
            partner: $('jePartner').value.trim(), desc: $('jeDesc').value.trim() };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) { toast('Огноо оруулна уу'); return; }
  if (e.dr === e.cr) { toast('Дебет, кредит данс өөр байх ёстой'); return; }
  if (!(e.amount > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (!e.desc) { toast('Гүйлгээний утгаа бичнэ үү'); return; }
  if (!API_URL) {
    e.id = 'J' + Date.now(); e.by = ownerName; journal.push(e); save('nb_demo_journal', journal);
    closeSheet('entrySheet'); toast('Бичигдлээ'); render(); return;
  }
  post({ type: 'admin_journal', by: ownerName, entry: e }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    closeSheet('entrySheet'); toast('Бичигдлээ'); refresh();
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
function openPartner() {
  $('ptKind').value = 'Нийлүүлэгч'; ['ptName', 'ptTin', 'ptPhone', 'ptNote'].forEach(function (k) { $(k).value = ''; });
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
  var what = x.type === 'sale' ? x.item + ' · ' + fmt(x.amount) : x.type === 'expense' ? x.category + ' · ' + fmt(x.amount) : 'Касс хаалт';
  if (!confirm('Энэ бичлэгийг цуцлах уу?\n' + x.date + ' ' + x.time + ' · ' + what + '\n\nСанхүү, үлдэгдлээс хасагдана.')) return;
  if (!API_URL) { records = records.filter(function (r) { return r.id !== id; }); save('nb_records', records); render(); return; }
  post({ type: 'admin_record', cancelId: id, by: ownerName }, function (err) {
    if (err) { toast(err === 'ebarimt' ? 'И-баримттай борлуулалтыг дэлгүүрээс «Баримт буцаах»-аар буцаана' : 'Алдаа: ' + err); return; }
    toast('Цуцлагдлаа'); refresh();
  });
}
function cancelMove(id) {
  var m = moves.filter(function (x) { return x.id === id; })[0]; if (!m) return;
  if (!confirm('Энэ хөдөлгөөнийг цуцлах уу?\n' + m.date + ' · ' + m.kind + ' · ' + m.item + ' ' + m.qty + '\n\nҮлдэгдэл, санхүүгээс хасагдана.')) return;
  if (!API_URL) { moves = moves.filter(function (x) { return x.id !== id; }); save('nb_demo_moves', moves); render(); return; }
  post({ type: 'admin_stock', cancelId: id }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    toast('Цуцлагдлаа'); refresh();
  });
}
