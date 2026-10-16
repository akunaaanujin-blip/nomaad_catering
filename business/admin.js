// ── УДИРДЛАГЫН САМБАР ──
// Baaz-ийн бүтэцтэй: Миний компаниуд → (Борлуулалт · Бараа материал · Санхүү · Ажилчид), мөн нийт Ажилчид цэс.

var KEYS = ['meat', 'travel', 'cozy'];
var token = sessionStorage.getItem('nb_tok') || '';   // удирдагчийн токен (8 цаг)
var ownerName = sessionStorage.getItem('nb_owner') || '';
var records = [], staff = [], salary = [], stockData = {}, moves = [];
var state = { view: 'companies', biz: '', module: 'sales', period: 'month', staffBiz: 'all', month: todayStr().slice(0, 7), q: '', stockF: 'all', showMoves: false };
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
    $('main').style.display = 'block';
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
    records = load('nb_records', []); staff = []; salary = []; stockData = load('nb_demo_stock', {}); moves = [];
    stamp(); cb(true); return;
  }
  var from = todayStr(new Date(Date.now() - 100 * 864e5));
  post({ type: 'admin_read', from: from }, function (err, d) {
    if (err) { if (err !== 'auth') toast('Холбогдож чадсангүй'); cb(false); return; }
    records = d.records || []; staff = d.staff || []; salary = d.salary || []; stockData = d.stock || {}; moves = d.moves || [];
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
  if (biz) { state.biz = biz; state.module = 'sales'; }
  render();
  window.scrollTo(0, 0);
}
function setModule(m) { state.module = m; render(); }
function setPeriod(p) { state.period = p; render(); }
function setStaffBiz(b) { state.staffBiz = b; render(); }
function setMonth(m) { state.month = m; render(); }

function range() {
  var t = todayStr();
  if (state.period === 'today') return [t, t];
  if (state.period === 'yesterday') { var y = todayStr(new Date(Date.now() - 864e5)); return [y, y]; }
  if (state.period === 'week') return [todayStr(new Date(Date.now() - 6 * 864e5)), t];
  if (state.period === 'month') return [t.slice(0, 8) + '01', t];
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
  [].forEach.call(document.querySelectorAll('.topnav button'), function (b) {
    b.classList.toggle('on', b.dataset.v === state.view || (state.view === 'company' && b.dataset.v === 'companies'));
  });
  var pend = staff.filter(function (s) { return s.status === 'Хүлээгдэж'; }).length;
  $('pendingBadge').textContent = pend || '';
  $('pendingBadge').style.display = pend ? 'inline-block' : 'none';
  if (state.view === 'staff') $('view').innerHTML = staffView('');
  else if (state.view === 'company') $('view').innerHTML = companyView();
  else $('view').innerHTML = companiesView();
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

// ── Компанийн дотор: модулиуд ──
var MODULES = [['sales', 'Борлуулалт'], ['products', 'Бараа материал'], ['finance', 'Санхүү'], ['staff', 'Ажилчид']];
function companyView() {
  var B = BUSINESSES[state.biz];
  var head = '<div class="crumb"><button class="link" onclick="go(\'companies\')">← Компаниуд</button>' +
    '<h2><span class="mono sm" style="background:' + B.color + '">' + B.icon + '</span> ' + esc(B.name) + '</h2></div>' +
    '<div class="modtabs">' + MODULES.map(function (m) {
      return '<button class="' + (state.module === m[0] ? 'on' : '') + '" onclick="setModule(\'' + m[0] + '\')">' + m[1] + '</button>';
    }).join('') + '</div>';
  var body;
  if (state.module === 'products') body = periodBar() + productsModule();
  else if (state.module === 'finance') body = periodBar() + financeModule();
  else if (state.module === 'staff') body = staffView(state.biz);
  else body = periodBar() + salesModule();
  return head + body;
}
function periodBar() {
  var r = range();
  return '<div class="card bar-row"><div class="tabs">' + [['today', 'Өнөөдөр'], ['yesterday', 'Өчигдөр'], ['week', '7 хоног'], ['month', 'Энэ сар'], ['last30', '30 хоног']].map(function (p) {
    return '<button class="' + (state.period === p[0] ? 'on' : '') + '" onclick="setPeriod(\'' + p[0] + '\')">' + p[1] + '</button>';
  }).join('') + '</div><span class="muted">' + (r[0] === r[1] ? r[0] : r[0] + ' — ' + r[1]) + '</span></div>';
}

// Борлуулалт
function salesModule() {
  var list = inRange(state.biz), s = sums(list);
  var sales = list.filter(function (x) { return x.type === 'sale'; });
  var bills = {};
  sales.forEach(function (x) { var k = (String(x.note || '').match(/ДДТД (\d+)/) || [])[1] || x.id; if (x.amount > 0) bills[k] = 1; });
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
  return list.length ? '<tr><th>Огноо</th><th>Төрөл</th><th>Дэлгэрэнгүй</th><th>Ажилтан</th><th class="n">Дүн</th></tr>' + list.map(function (x) {
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
    return '<tr><td>' + esc(x.date) + ' ' + esc(x.time) + '</td><td>' + tag + '</td><td>' + detail + '</td><td>' + esc(x.staff) + '</td><td class="n">' + amt + '</td></tr>';
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
    '<button class="btn sm" onclick="openMove(\'Орлого\')">+ Орлого авах</button>' +
    (wh ? '<button class="btn sm ghost" style="color:var(--accent)" onclick="openMove(\'Шилжүүлэг\')">Шилжүүлэг</button>' : '') +
    '<button class="btn sm ghost" style="color:var(--accent)" onclick="openMove(\'Тооллого\')">Тооллого</button></div></div>' +
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
    (state.showMoves ? '<div class="scroll" style="margin-top:8px"><table><tr><th>Огноо</th><th>Төрөл</th><th>Бараа</th><th>Байршил</th><th class="n">Тоо</th><th class="n">Нэгж өртөг</th><th>Хэн</th><th>Тайлбар</th></tr>' +
      moves.filter(function (m) { return m.biz === biz; }).slice().reverse().slice(0, 200).map(function (m) {
        return '<tr><td>' + esc(m.date) + '</td><td>' + esc(m.kind) + '</td><td>' + esc(m.item) + '</td><td>' + esc(m.loc) + '</td><td class="n">' +
          (m.qty > 0 ? '+' : '') + round2(m.qty) + '</td><td class="n">' + (m.cost ? fmt(m.cost) : '') + '</td><td>' + esc(m.by) + '</td><td class="muted">' + esc(m.note) + '</td></tr>';
      }).join('') + '</table></div>' : '') + '</div>';
}

// ── Үлдэгдлийн хөдөлгөөн бүртгэх ──
var moveKind = 'Орлого';
function openMove(kind, item) {
  moveKind = kind;
  var biz = state.biz, wh = hasWarehouse(biz);
  $('mvTitle').textContent = kind === 'Орлого' ? 'Орлого авах' : (kind === 'Шилжүүлэг' ? 'Агуулахаас дэлгүүр рүү шилжүүлэх' : 'Тооллого (бодит тоо оруулах)');
  $('mvItems').innerHTML = stockRows(biz).map(function (r) { return '<option value="' + esc(r.name) + '">'; }).join('');
  $('mvItem').value = item || '';
  $('mvQty').value = '';
  $('mvNote').value = '';
  $('mvLocWrap').style.display = wh && kind !== 'Шилжүүлэг' ? 'block' : 'none';
  $('mvLoc').value = 'Дэлгүүр';
  $('mvDirWrap').style.display = kind === 'Шилжүүлэг' ? 'block' : 'none';
  $('mvQtyLabel').textContent = kind === 'Тооллого' ? 'Тоолсон бодит тоо' : 'Тоо хэмжээ';
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
  if (moveKind === 'Орлого') ms.push({ biz: biz, loc: $('mvLoc').value, item: item, kind: 'Орлого', qty: qty, cost: Number($('mvCost').value) || 0, note: note });
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
      moves.push({ date: todayStr() + ' ' + timeStr(), biz: m.biz, loc: m.loc, item: m.item, kind: m.kind, qty: m.qty, cost: m.cost || 0, by: ownerName, note: m.note || '' });
    });
    save('nb_demo_stock', stockData); render(); done(); return;
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

// Санхүү
function financeModule() {
  var list = inRange(state.biz), s = sums(list);
  var expCat = {};
  list.forEach(function (x) { if (x.type === 'expense') expCat[x.category] = (expCat[x.category] || 0) + (Number(x.amount) || 0); });
  var days = {};
  list.forEach(function (x) {
    if (!days[x.date]) days[x.date] = { sales: 0, exp: 0 };
    if (x.type === 'sale') days[x.date].sales += Number(x.amount) || 0;
    if (x.type === 'expense') days[x.date].exp += Number(x.amount) || 0;
  });
  var closes = list.filter(function (x) { return x.type === 'close'; }).reverse();
  // Цалин (энэ сар): ажилчдын олгосон + урьдчилгаа
  var m = todayStr().slice(0, 7);
  var paid = salary.filter(function (e) { return e.biz === state.biz && e.month === m && (e.kind === 'Олгосон' || e.kind === 'Урьдчилгаа'); })
    .reduce(function (a, e) { return a + e.amount; }, 0);
  return '<div class="kpis">' + kpi('Орлого', fmt(s.sales)) + kpi('Зарлага', '−' + fmt(s.exp)) +
    kpi('Цэвэр', '<span style="color:' + (s.sales - s.exp >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(s.sales - s.exp) + '</span>') +
    kpi('Цалин олгосон (' + m + ')', fmt(paid)) + '</div>' +
    '<div class="grid2"><div class="card"><h2>Зарлага ангиллаар</h2><div class="scroll"><table>' +
    (Object.keys(expCat).length ? Object.keys(expCat).sort(function (a, b) { return expCat[b] - expCat[a]; }).map(function (k) {
      return '<tr><td>' + esc(k) + '</td><td class="n">' + fmt(expCat[k]) + '</td></tr>';
    }).join('') : '<tr><td class="muted">Зарлага алга</td></tr>') + '</table></div></div>' +
    '<div class="card"><h2>Касс хаалт</h2><div class="scroll"><table>' +
    (closes.length ? '<tr><th>Огноо</th><th>Ажилтан</th><th class="n">Тоолсон</th><th class="n">Зөрүү</th></tr>' + closes.map(function (c) {
      var d = Number(c.diff) || 0;
      return '<tr><td>' + esc(c.date) + ' ' + esc(c.time) + '</td><td>' + esc(c.staff) + '</td><td class="n">' + fmt(c.counted) + '</td><td class="n">' +
        (d === 0 ? '<span class="tag">✓</span>' : '<span class="tag r">' + (d > 0 ? '+' : '−') + fmt(Math.abs(d)) + '</span>') + '</td></tr>';
    }).join('') : '<tr><td class="muted">Касс хаалт алга</td></tr>') + '</table></div></div></div>' +
    '<div class="card"><h2>Өдөр бүрээр</h2><div class="scroll"><table><tr><th>Огноо</th><th class="n">Орлого</th><th class="n">Зарлага</th><th class="n">Цэвэр</th></tr>' +
    Object.keys(days).sort().reverse().map(function (d) {
      var x = days[d];
      return '<tr><td>' + d + '</td><td class="n">' + fmt(x.sales) + '</td><td class="n">' + fmt(x.exp) + '</td><td class="n">' + fmt(x.sales - x.exp) + '</td></tr>';
    }).join('') + '</table></div></div>';
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
  post({ type: 'admin_salary', entry: { staffId: salId, kind: salKind, amount: amt, month: $('slMonth').value, note: $('slNote').value.trim() } }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    closeSheet('salSheet'); toast('✓ ' + salKind + ' бүртгэгдлээ'); refresh();
  });
}

function openSheet(id) { $(id).classList.add('show'); }
function closeSheet(id) { $(id).classList.remove('show'); }
