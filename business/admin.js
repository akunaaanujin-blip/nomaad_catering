// ── УДИРДЛАГЫН САМБАР ──
// Baaz-ийн бүтэцтэй: Миний компаниуд → (Борлуулалт · Бараа материал · Санхүү · Ажилчид), мөн нийт Ажилчид цэс.

var KEYS = ['meat', 'travel', 'cozy'];
var pin = sessionStorage.getItem('nb_pin') || '';
var records = [], staff = [], salary = [];
var state = { view: 'companies', biz: '', module: 'sales', period: 'month', staffBiz: 'all', month: todayStr().slice(0, 7), q: '' };
var editId = '', salId = '', salKind = 'Урьдчилгаа';

if (!API_URL) $('demo').style.display = 'block';
if (pin) doLogin(pin);

// ── Нэвтрэх / өгөгдөл ──
function doLogin(p) {
  pin = p || $('pinInput').value.trim();
  if (!pin) { toast('PIN код оруулна уу'); return; }
  $('loginBtn').disabled = true;
  fetchAll(function (ok) {
    $('loginBtn').disabled = false;
    if (!ok) { sessionStorage.removeItem('nb_pin'); pin = ''; return; }
    sessionStorage.setItem('nb_pin', pin);
    $('login').style.display = 'none';
    $('main').style.display = 'block';
    render();
  });
}
function logout() { sessionStorage.removeItem('nb_pin'); location.reload(); }

function fetchAll(cb) {
  if (!API_URL) {
    if (pin !== '0000') { toast('PIN буруу байна'); cb(false); return; }
    records = load('nb_records', []); staff = []; salary = [];
    stamp(); cb(true); return;
  }
  var from = todayStr(new Date(Date.now() - 100 * 864e5));
  var left = 2, ok = true;
  var done = function () { if (--left === 0) { if (ok) stamp(); cb(ok); } };
  jsonp({ action: 'data', pin: pin, from: from }, function (err, d) {
    if (err || !d || d.status !== 'ok') { ok = false; toast(d && d.error === 'pin' ? 'PIN буруу байна' : 'Холбогдож чадсангүй'); }
    else records = d.records || [];
    done();
  });
  jsonp({ action: 'admin', pin: pin }, function (err, d) {
    if (!err && d && d.status === 'ok') { staff = d.staff || []; salary = d.salary || []; }
    done();
  });
}
function stamp() { $('updated').textContent = 'Шинэчилсэн: ' + timeStr(); }
function refresh() { fetchAll(function (ok) { if (ok) { render(); toast('✓ Шинэчлэгдлээ'); } }); }
function post(body, cb) {
  body.pin = pin;
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); })
    .then(function (d) { cb(d && d.status === 'ok' ? null : (d && d.error) || 'error', d); })
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

// ── 🏢 Миний компаниуд ──
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
      '<div class="co-head"><span class="co-ico">' + B.icon + '</span><div><b>' + esc(B.name) + '</b>' +
      '<small>' + (E.merchantTin ? esc(E.legalName || '') + ' · ТТД ' + esc(E.merchantTin) : 'И-баримтгүй') + '</small></div></div>' +
      '<div class="co-stats">' +
      '<div><span>Өнөөдөр</span><b>' + fmt(today.sales) + '</b></div>' +
      '<div><span>Энэ сар</span><b>' + fmt(month.sales) + '</b></div>' +
      '<div><span>Цэвэр (сар)</span><b style="color:' + (month.sales - month.exp >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(month.sales - month.exp) + '</b></div>' +
      '<div><span>Ажилчид</span><b>' + active + (pend ? ' <span class="tag r">+' + pend + ' хүлээгдэж</span>' : '') + '</b></div>' +
      '</div>' +
      '<div class="co-meta"><span class="tag">Хэвийн</span>' + (E.merchantTin ? ' <span class="tag b">🧾 И-баримт</span>' : '') + '</div>' +
      '<button class="btn" style="background:' + B.color + '" onclick="go(\'company\',\'' + k + '\')">Нэвтрэх →</button>' +
      '</div>';
  }).join('') + '</div>';
}

// ── Компанийн дотор: модулиуд ──
var MODULES = [['sales', '🧾 Борлуулалт'], ['products', '📦 Бараа материал'], ['finance', '💰 Санхүү'], ['staff', '👥 Ажилчид']];
function companyView() {
  var B = BUSINESSES[state.biz];
  var head = '<div class="crumb"><button class="link" onclick="go(\'companies\')">← Компаниуд</button>' +
    '<h2>' + B.icon + ' ' + esc(B.name) + '</h2></div>' +
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

// 🧾 Борлуулалт
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
    kpi('💵 Бэлэн', fmt(s.cash)) + kpi('💳 Карт', fmt(s.card)) + kpi('📱 Шилжүүлэг', fmt(s.transfer)) +
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
      detail = esc(x.item) + ' · ' + round2(x.qty) + ' ' + esc(x.unit) + ' · ' + esc(x.pay) + (/ДДТД/.test(x.note || '') ? ' · 🧾' : '');
      amt = (x.amount < 0 ? '−' + fmt(-x.amount) : '+' + fmt(x.amount));
    } else if (x.type === 'expense') {
      tag = '<span class="tag r">Зарлага</span>'; detail = esc(x.category) + (x.note ? ' · ' + esc(x.note) : ''); amt = '−' + fmt(x.amount);
    } else {
      tag = '<span class="tag b">Касс</span>'; detail = 'Тоолсон ' + fmt(x.counted) + (x.diff ? ' · зөрүү ' + fmt(x.diff) : ''); amt = fmt(x.amount);
    }
    return '<tr><td>' + esc(x.date) + ' ' + esc(x.time) + '</td><td>' + tag + '</td><td>' + detail + '</td><td>' + esc(x.staff) + '</td><td class="n">' + amt + '</td></tr>';
  }).join('') : '<tr><td class="muted">Бичлэг алга</td></tr>';
}

// 📦 Бараа материал
function productsModule() {
  var B = BUSINESSES[state.biz];
  var sold = {};
  inRange(state.biz).forEach(function (x) {
    if (x.type !== 'sale') return;
    var k = String(x.item).replace(/ \(буцаалт\)$/, '');
    if (!sold[k]) sold[k] = { qty: 0, amount: 0 };
    sold[k].qty += Number(x.qty) || 0; sold[k].amount += Number(x.amount) || 0;
  });
  var q = state.q.toLowerCase();
  var list = B.products.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0 || String(p.cat || '').toLowerCase().indexOf(q) >= 0; });
  return '<div class="card"><div class="bar-row"><h2 style="margin:0">Барааны жагсаалт (' + B.products.length + ')</h2>' +
    '<input class="search" placeholder="🔍 Бараа хайх" value="' + esc(state.q) + '" oninput="state.q=this.value;render();this.focus();this.setSelectionRange(this.value.length,this.value.length)"></div>' +
    '<p class="muted" style="margin:6px 0 10px">Үнийг Google Sheet-ийн «Бараа» хуудсаар сольж болно. Үлдэгдлийн бүртгэл дараагийн шатанд нэмэгдэнэ.</p>' +
    '<div class="scroll"><table><tr><th>Бараа</th><th>Ангилал</th><th class="n">Үнэ</th><th>БҮНА</th><th class="n">Зарагдсан</th><th class="n">Дүн</th></tr>' +
    list.map(function (p) {
      var s = sold[p.name] || { qty: 0, amount: 0 };
      return '<tr><td>' + esc(p.name) + '</td><td class="muted">' + esc(p.cat || '') + '</td><td class="n">' + (p.price ? fmt(p.price) : '—') +
        '</td><td class="muted">' + esc(p.cls || '') + '</td><td class="n">' + (s.qty ? round2(s.qty) + ' ' + esc(p.unit) : '') + '</td><td class="n">' + (s.amount ? fmt(s.amount) : '') + '</td></tr>';
    }).join('') + '</table></div></div>';
}

// 💰 Санхүү
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

// ── 👥 Ажилчид (бүгд эсвэл нэг компанийн) ──
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
  var filt = fixedBiz ? '' : '<div class="tabs">' + [['all', 'Бүгд']].concat(KEYS.map(function (k) { return [k, BUSINESSES[k].icon + ' ' + BUSINESSES[k].name.split(' ')[0]]; })).map(function (t) {
    return '<button class="' + (state.staffBiz === t[0] ? 'on' : '') + '" onclick="setStaffBiz(\'' + t[0] + '\')">' + esc(t[1]) + '</button>';
  }).join('') + '</div>';
  var reg = 'register.html' + (fixedBiz ? '?biz=' + fixedBiz : '');
  return '<div class="card bar-row">' + (fixedBiz ? '<h2 style="margin:0">Ажилчид</h2>' : filt) +
    '<label class="month">Сар <input type="month" value="' + m + '" onchange="setMonth(this.value)"></label></div>' +
    (!API_URL ? '<div class="card muted">Ажилчдын бүртгэл Google Sheet-тэй холбогдсон үед ажиллана.</div>' : '') +
    '<div class="kpis">' + kpi('Идэвхтэй ажилтан', act.length + (pend.length ? ' <span class="tag r">+' + pend.length + '</span>' : '')) +
    kpi('Цалингийн сан (' + m + ')', fmt(tot.base)) + kpi('Олгосон', fmt(tot.paid)) + kpi('Олгох үлдэгдэл', fmt(tot.left)) + '</div>' +
    (pend.length ? '<div class="card"><h2>⏳ Баталгаажуулалт хүлээж буй (' + pend.length + ')</h2>' + pend.map(pendCard).join('') + '</div>' : '') +
    '<div class="card"><div class="bar-row"><h2 style="margin:0">Ажилчид (' + act.length + ')</h2>' +
    '<a class="link" href="' + reg + '" target="_blank">＋ Бүртгүүлэх хуудас</a></div>' +
    (act.length ? '<div class="st-grid">' + act.map(function (s) { return staffCard(s, m); }).join('') + '</div>' : '<p class="muted">Ажилтан алга</p>') + '</div>' +
    (off.length ? '<details class="card"><summary>Идэвхгүй (' + off.length + ')</summary>' + off.map(function (s) {
      return '<div class="st-off">' + esc(s.surname ? s.surname + ' ' : '') + esc(s.name) + ' · ' + bizLabel(s.biz) +
        ' <button class="mini" onclick="openStaff(\'' + s.id + '\')">✎</button></div>';
    }).join('') + '</details>' : '');
}
function bizLabel(b) { return b === 'all' ? 'Бүх дэлгүүр' : (BUSINESSES[b] ? BUSINESSES[b].icon + ' ' + BUSINESSES[b].name : b); }
function pendCard(s) {
  return '<div class="pend"><div><b>' + esc(s.surname ? s.surname + ' ' : '') + esc(s.name) + '</b> · ' + bizLabel(s.biz) +
    '<small>📞 ' + esc(s.phone) + (s.regno ? ' · ' + esc(s.regno) : '') + (s.position ? ' · ' + esc(s.position) : '') + ' · ' + esc(s.created) + '</small></div>' +
    '<div class="pend-act"><button class="btn sm" style="background:var(--green)" onclick="approve(\'' + s.id + '\',\'Худалдагч\')">✓ Худалдагчаар</button>' +
    '<button class="btn sm" onclick="approve(\'' + s.id + '\',\'Менежер\')">✓ Менежерээр</button>' +
    '<button class="btn sm ghost" style="color:var(--red)" onclick="reject(\'' + s.id + '\')">✕ Татгалзах</button></div></div>';
}
function staffCard(s, m) {
  var r = salaryOf(s, m), sales = staffSales(s, m);
  return '<div class="st-card"><div class="st-head"><div><b>' + esc(s.surname ? s.surname + ' ' : '') + esc(s.name) + '</b>' +
    '<small>' + bizLabel(s.biz) + ' · ' + (s.role === 'Менежер' ? '<span class="tag b">Менежер</span>' : 'Худалдагч') + (s.position ? ' · ' + esc(s.position) : '') + '</small>' +
    '<small>' + (s.phone ? '📞 ' + esc(s.phone) : '') + (s.bank ? ' · 🏦 ' + esc(s.bank) : '') + '</small></div>' +
    '<button class="mini" onclick="openStaff(\'' + s.id + '\')">✎ Засах</button></div>' +
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
  $('sfBank').value = s.bank || ''; $('sfCode').value = '';
  openSheet('staffSheet');
}
function saveStaff() {
  var f = { status: $('sfStatus').value, role: $('sfRole').value, biz: $('sfBiz').value, position: $('sfPos').value.trim(),
            salary: Number($('sfSalary').value) || 0, phone: $('sfPhone').value.trim(), bank: $('sfBank').value.trim() };
  var code = $('sfCode').value.trim();
  if (code) { if (!/^\d{4}$/.test(code)) { toast('Код 4 оронтой тоо байна'); return; } f.code = code; }
  post({ type: 'admin_staff', id: editId, fields: f }, function (err) {
    if (err) { toast(err === 'code_taken' ? 'Энэ код өөр ажилтанд ашиглагдаж байна' : 'Алдаа: ' + err); return; }
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
