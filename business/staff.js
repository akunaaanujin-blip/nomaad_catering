// ── АЖИЛТНЫ ХУУДАС ──
// HTML файл бүр `var BIZ_KEY = 'meat' | 'cozy' | 'travel'` гэж зааж өгөөд энэ файлыг ачаална.

var BIZ = BUSINESSES[BIZ_KEY];
var LS_REC = 'nb_records';     // энэ төхөөрөмж дээрх бүх бичлэг (өнөөдрийн жагсаалт + туршилтын горим)
var LS_QUEUE = 'nb_queue';     // интернэт тасарсан үед илгээгдээгүй бичлэг
var LS_SESSION = 'nb_session_' + BIZ_KEY;   // { name, role, date } — зөвхөн энэ цонхонд (хаавал дахин код асууна)
function sesLoad() { try { return JSON.parse(sessionStorage.getItem(LS_SESSION) || 'null'); } catch (e) { return null; } }
function sesSave(v) { try { if (v) sessionStorage.setItem(LS_SESSION, JSON.stringify(v)); else sessionStorage.removeItem(LS_SESSION); } catch (e) {} try { localStorage.removeItem(LS_SESSION); } catch (e) {} }
var LS_PROD = 'nb_products_' + BIZ_KEY;

var session = sesLoad();
if (!session || session.date !== todayStr()) session = null;
if (session && API_URL && !session.token) session = null;   // v2.6-аас өмнөх (токенгүй) нэвтрэлт — дахин нэвтэрнэ
var staffName = session ? session.name : '';
var isManager = !!(session && session.role === 'manager');
var sheetProducts = load(LS_PROD, []);   // Sheet-ийн "Бараа" хуудасны мөрүүд (үнэ давхарлах)
var products = mergeProducts(BIZ.products, sheetProducts);
var stock = load('nb_stock_' + BIZ_KEY, null);   // { item: { shop, wh } } — дэлгүүрийн үлдэгдэл (null = бүртгэлгүй)
var sale = {};
var expense = {};

document.title = BIZ.name + ' · Ажилтан';
document.documentElement.style.setProperty('--accent', BIZ.color);

function init() {
  $('bizIcon').textContent = BIZ.icon;
  $('bizName').textContent = BIZ.name;
  $('loginIcon').textContent = BIZ.icon;
  $('loginBiz').textContent = BIZ.name;
  if (!API_URL) $('demo').style.display = 'block';
  if (session) showMain(); else showLogin();
  loadProducts();
  loadStock();
  flushQueue();
  setInterval(flushQueue, 60000);
  window.addEventListener('online', flushQueue);
}

// ── Нэвтрэх (4 оронтой код, Sheet-ийн "Ажилтан" хуудсаар шалгана) ──
var LS_USER = 'nb_user_' + BIZ_KEY;   // энэ төхөөрөмж дээр сүүлд нэвтэрсэн нэр (тав тухтай байлгах)
function showLogin() {
  $('login').style.display = 'block';
  $('userInput').value = load(LS_USER, '') || '';
  $('codeInput').value = '';
  ($('userInput').value ? $('codeInput') : $('userInput')).focus();
}
function onCodeInput() {
  var v = $('codeInput').value.replace(/\D/g, '').slice(0, 8);
  $('codeInput').value = v;   // автоматаар нэвтрүүлэхгүй — хөтчийн хадгалсан кодоор өөрөө орохоос сэргийлнэ
}
function doLogin() {
  var user = $('userInput').value.trim().toLowerCase();
  var code = $('codeInput').value.trim();
  if (!user) { loginFail('Нэвтрэх нэрээ бичнэ үү'); $('userInput').focus(); return; }
  if (!/^\d{4,8}$/.test(code)) { loginFail('Кодоо оруулна уу'); return; }
  if (!API_URL) {   // туршилтын горим
    if (code !== '0000') { loginFail('Туршилтын горимд код: 0000'); return; }
    return loginOk({ name: user, role: 'manager' });
  }
  $('codeInput').disabled = true;
  $('loginMsg').textContent = 'Шалгаж байна...';
  jsonp({ action: 'login', biz: BIZ_KEY, user: user, code: code }, function (err, data) {
    $('codeInput').disabled = false;
    if (err) { loginFail('Интернэт холболтоо шалгана уу'); return; }
    if (!data || data.status !== 'ok') {
      loginFail(data && data.error === 'locked' ? 'Олон удаа буруу оруулсан — 10 минутын дараа оролдоно уу'
        : data && data.error === 'pending' ? 'Таны бүртгэл менежерийн баталгаажуулалт хүлээж байна'
        : 'Нэвтрэх нэр эсвэл код буруу байна');
      return;
    }
    loginOk(data);
  });
}
function loginOk(d) {
  save(LS_USER, $('userInput').value.trim().toLowerCase());
  session = { name: d.name, role: d.role, date: todayStr(), token: d.token || '' };
  sesSave(session);
  staffName = session.name;
  isManager = session.role === 'manager';
  $('loginMsg').textContent = '';
  showMain();
  flushQueue();
}
function loginFail(msg) {
  $('loginMsg').textContent = msg;
  $('codeInput').value = '';
  $('codeInput').focus();
}
function logout() {
  if (!confirm('Гарах уу? Дараагийн ажилтан өөрийн кодоор нэвтэрнэ.')) return;
  sesSave(null);
  location.reload();
}
function showMain() {
  $('login').style.display = 'none';
  $('main').style.display = 'block';
  $('who').textContent = staffName + (isManager ? ' · менежер' : '');
  $('today').textContent = todayStr();
  renderEbBadge();
  renderToday();
  if (typeof ebCheckInfo === 'function') { ebCheckInfo(); setInterval(ebCheckInfo, 30 * 60000); }
  if (BIZ.orders && typeof loadOrders === 'function') loadOrders();   // Cozy: захиалгууд
  loadTasks();
  buildShell();
}

// ── ebuuhia маягийн бүтэц: зүүн талын нил ягаан цэс (бүлэглэсэн) + цагаан толгой + саарал ажлын талбар ──
// Хуудас бүрийн одоогийн хэсгүүдийг view-ээр (dash / orders) ялгаж харуулна; утсан дээр цэс ☰ товчоор нээгдэнэ.
var shellView = 'dash';
function navMenu() {   // зөвхөн хуудсууд — үйлдлийн товчнууд хуудас дотроо нэг л удаа
  var g = [['dash', 'Борлуулалт', function () { showView('dash'); }], ['stock', 'Барааны үлдэгдэл', function () { showView('stock'); }]];
  return [{ t: '', items: g }];
}
function buildShell() {
  var main = $('main'); if (!main || main.classList.contains('ep-app')) { renderNav(); return; }
  main.classList.add('ep-app');
  if (navMenu()[0].items.length <= 1) main.classList.add('no-nav');   // ганц хуудас — зүүн цэсгүй
  var nav = document.createElement('nav'); nav.className = 'ep-nav'; nav.id = 'epNav';
  var body = document.createElement('div'); body.className = 'ep-body';
  while (main.firstChild) body.appendChild(main.firstChild);
  main.appendChild(nav); main.appendChild(body);
  var shade = document.createElement('div'); shade.className = 'ep-shade'; shade.onclick = function () { main.classList.remove('nav-open'); }; main.appendChild(shade);
  var top = body.querySelector('.top');
  if (top) top.insertAdjacentHTML('afterbegin', '<button class="ep-burger" onclick="$(\'main\').classList.toggle(\'nav-open\')" aria-label="Цэс">☰</button>');
  var wrap = body.querySelector('.wrap');
  if (wrap) {
    wrap.insertAdjacentHTML('afterbegin', '<h2 class="ep-title" id="epTitle"></h2>');
  }
  renderNav(); showView('dash');
}
function renderNav() {
  var nav = $('epNav'); if (!nav) return;
  var cur = shellView;
  nav.innerHTML = '<div class="ep-brand"><span class="mono">' + esc((BIZ.name || '?').charAt(0)) + '</span><b>' + esc(BIZ.name || '') + '</b></div>' +
    navMenu().map(function (grp, gi) {
      return '<div class="ep-grp">' + (grp.t ? '<div class="ep-grp-t">' + esc(grp.t) + '</div>' : '') + grp.items.map(function (it, ii) {
        return '<a class="ep-it' + (it[0] === cur ? ' on' : '') + '" onclick="navGo(' + gi + ',' + ii + ')">' + esc(it[1]) + '</a>';
      }).join('') + '</div>';
    }).join('') + '<div class="ep-foot">NOMAAD · ажилтны хуудас</div>';
}
function navGo(gi, ii) { $('main').classList.remove('nav-open'); navMenu()[gi].items[ii][2](); }
function showView(v, tab) {
  shellView = v;
  if (v === 'orders' && tab && typeof ordTab !== 'undefined') { ordTab = tab; renderOrders(); }
  [].slice.call(document.querySelectorAll('#main .wrap > *')).forEach(function (el) {
    if (el.id === 'epTitle') return;
    el.style.display = (el.getAttribute('data-view') || 'dash') === v ? '' : 'none';
  });
  var w = document.querySelector('#main .wrap'); if (w) w.classList.toggle('ep-wide', v === 'orders');
  var t = $('epTitle'); if (t) t.textContent = v === 'orders' ? 'Захиалга' : v === 'stock' ? 'Барааны үлдэгдэл' : 'Борлуулалт';
  if (v === 'stock') renderStockPage();
  renderNav(); window.scrollTo(0, 0);
}

// ── Барааны үлдэгдэл (ажилтны хуудас): нөөц + хараахан санхүүд бичигдээгүй (хүргэгдээгүй) захиалгад байгаа тоо ──
var stkQ = '';
function pendingGoods() {   // «Шинэ» / «Буухиад өгсөн» захиалгын бараа — хүргэгдэх хүртэл нөөцөөс хасагдаагүй
  var m = {};
  if (typeof orders === 'undefined' || typeof ordItems !== 'function') return m;
  orders.forEach(function (o) {
    if (o.status !== 'Шинэ' && o.status !== 'Буухиад өгсөн') return;
    ordItems(o).forEach(function (i) { if (isNonGoods(i.name)) return; m[i.name] = (m[i.name] || 0) + (Number(i.qty) || 1); });
  });
  return m;
}
function renderStockPage() {
  var el = $('stockList'); if (!el) return;
  var pend = pendingGoods(), names = {};
  products.forEach(function (p) { names[p.name] = 1; });
  Object.keys(stock || {}).forEach(function (k) { names[k] = 1; });
  Object.keys(pend).forEach(function (k) { names[k] = 1; });
  var q = stkQ.toLowerCase().trim();
  var rows = Object.keys(names).filter(function (n) { return !isNonGoods(n) && (!q || n.toLowerCase().indexOf(q) >= 0); }).sort().map(function (n) {
    var s = (stock && stock[n]) || { shop: 0, wh: 0 }, tot = Math.round(((s.shop || 0) + (s.wh || 0)) * 1000) / 1000, pd = pend[n] || 0;
    var cls = pd > tot ? ' class="neg"' : '';
    return '<tr' + cls + '><td>' + esc(n) + '</td><td class="num">' + (s.shop || 0) + '</td><td class="num">' + (s.wh || 0) + '</td><td class="num"><b>' + tot + '</b></td><td class="num">' + (pd || '') + '</td><td class="num"><b>' + Math.round((tot - pd) * 1000) / 1000 + '</b></td></tr>';
  });
  el.innerHTML = stock || Object.keys(pend).length
    ? '<table class="rep-t"><tr><th>Бараа</th><th class="num">Дэлгүүр</th><th class="num">Агуулах</th><th class="num">Нийт</th><th class="num">Захиалгад</th><th class="num">Боломжит</th></tr>' + rows.join('') + '</table>'
    : '<p class="muted">Үлдэгдэл бүртгэгдээгүй байна.</p>';
}
// ── Бараа ──
// Үндсэн жагсаалт config.js / products.js-д (БҮНА кодтой), Sheet-ийн "Бараа" хуудас үнэ/нэгжийг давхарлаж, шинэ бараа нэмнэ.
// Удирдлагаас засварласан үнэ, нэгж, ангилал, БҮНА давхарлана; «Идэвхгүй» болгосон бараа жагсаалтаас нуугдана.
function mergeProducts(base, extra) {
  var list = base.map(function (p) { return { name: p.name, unit: p.unit, price: p.price, cls: p.cls, cat: p.cat || '' }; });
  var byName = {};
  list.forEach(function (p) { byName[p.name.toLowerCase()] = p; });
  (extra || []).forEach(function (x) {
    var p = byName[String(x.name).toLowerCase()];
    if (!p) { p = { name: x.name, unit: BIZ.unit, price: 0, cls: '', cat: '' }; list.push(p); byName[String(x.name).toLowerCase()] = p; }
    if (x.price) p.price = x.price;
    if (x.unit) p.unit = x.unit;
    if (x.cls) p.cls = x.cls;
    if (x.cat) p.cat = x.cat;
    p.off = !!x.off;
  });
  return list.filter(function (p) { return !p.off; });
}
function loadProducts() {
  if (!API_URL) return;
  jsonp({ action: 'products', biz: BIZ_KEY }, function (err, data) {
    if (err || !data || !data.products) return;
    sheetProducts = data.products;
    save(LS_PROD, sheetProducts);
    if (data.payInfo !== undefined) save('nb_payinfo_' + BIZ_KEY, data.payInfo);   // захиалгын төлбөрийн мессежид
    save('nb_sp_' + BIZ_KEY, !!data.storepay); spShowBtn();   // StorePay тохируулсан эсэх
    if (data.barcodes) save('nb_bc_' + BIZ_KEY, data.barcodes);   // баркод → барааны нэр
    products = mergeProducts(BIZ.products, sheetProducts);
  });
}

// ── Үлдэгдэл (удирдлагаас бүртгэсэн хөдөлгөөн − борлуулалт) ──
function loadStock() {
  if (!API_URL) return;
  jsonp({ action: 'stock', biz: BIZ_KEY }, function (err, d) {
    if (err || !d || d.status !== 'ok') return;
    if (d.stock) [FEE_ITEM, DISC_ITEM, SPLIT_ITEM].forEach(function (k) { delete d.stock[k]; });   // бараа биш мөрүүд
    stock = Object.keys(d.stock || {}).length ? d.stock : null;
    save('nb_stock_' + BIZ_KEY, stock);
    if ($('saleSheet').classList.contains('show')) renderChips();
  });
}
// Үлдэгдэл хөтөлдөг дэлгүүрт хасах руу оруулахгүй: дэлгүүр + агуулахад байгаагаас илүүг зарахгүй.
// Борлуулалт эхлээд дэлгүүрээс, хүрэхгүй бол агуулахаас хасагдана (сервер stockAll-тай адил).
function stockAvail(name) { if (!stock) return null; var s = stock[name]; return s ? Math.round(((s.shop || 0) + (s.wh || 0)) * 1000) / 1000 : 0; }
function shopLeft(name) {
  if (!stock) return null;
  var inCart = sale.cart ? sale.cart.filter(function (l) { return l.name === name; }).reduce(function (a, l) { return a + (Number(l.qty) || 0); }, 0) : 0;
  return Math.round((stockAvail(name) - inCart) * 1000) / 1000;
}
function stockShort(lines) {   // [{ item, qty }] → хүрэлцэхгүй барааны тайлбар
  if (!stock) return [];
  var need = {};
  lines.forEach(function (r) { if (Number(r.qty) > 0 && !isNonGoods(r.item)) need[r.item] = (need[r.item] || 0) + Number(r.qty); });
  return Object.keys(need).filter(function (k) { return need[k] > stockAvail(k) + 1e-9; })
    .map(function (k) { return '«' + k + '» — хэрэгтэй ' + need[k] + ', үлдэгдэл ' + Math.max(0, stockAvail(k)); });
}
function stockTake(item, qty) {
  if (!stock || isNonGoods(item)) return;
  item = String(item).replace(/ \(буцаалт\)$/, '');   // буцаалт (сөрөг тоо) үлдэгдэлд нэмэгдэнэ
  var s = stock[item] = stock[item] || { shop: 0, wh: 0 };
  s.shop -= qty;
  if (s.shop < 0 && s.wh > 0) { var t = Math.min(s.wh, -s.shop); s.wh -= t; s.shop += t; }
}

// ── Байгууллагын ТТД: бичихэд нэрийг нь шалгаж харуулна ──
var tinLook = { q: '', res: null };
function saleTinInput() {
  var q = $('saleTin').value.trim().replace(/\s/g, ''), el = $('saleTinName');
  tinLook = { q: q, res: null };
  if ($('saleBuyer')) $('saleBuyer').style.display = q ? '' : 'none';
  if (!q) { el.textContent = ''; return; }
  if (!/^(\d{7}|\d{11,12})$/.test(q)) { el.textContent = q.length < 7 ? '' : tinErrText('format'); return; }
  el.textContent = 'Шалгаж байна…';
  tinLookup(q, function (err, d) {
    if (tinLook.q !== q) return;   // энэ хооронд өөрчилсөн
    if (err === 'blocked') {   // автомат лавлагаагүй — албан хуудсаар шалгана
      el.innerHTML = (/^\d{7}$/.test(q) ? 'Регистр — и-баримтад 11 оронтой <b>ТТД</b> хэрэгтэй. ' : '') + tinLinks(q);
      return;
    }
    if (err) { el.textContent = tinErrText(err); return; }
    tinLook.res = d;
    el.innerHTML = d.found ? '✓ <b>' + esc(d.name) + '</b> · ТТД ' + esc(d.tin) + (d.vatPayer ? ' · НӨАТ төлөгч' : '') : '✗ Бүртгэлгүй дугаар — шалгана уу';
  });
}

// ── StorePay: хэрэглэгч хувааж төлнө — хүсэлт илгээж, апп дээрээ баталгаажуулахыг хүлээнэ (сервер дамжуулна, түлхүүр серверт) ──
var spTimer = null;
function spEnabled() { return !!load('nb_sp_' + BIZ_KEY, false) || !API_URL; }
function spShowBtn() { var b = document.querySelector('#paySeg [data-v="StorePay"]'); if (b) { b.style.display = ''; b.classList.toggle('off', !spEnabled()); } var g = $('paySeg'); if (g) g.classList.add('seg5'); }
function spErrText(e) {
  return e === 'storepay_off' ? 'StorePay тохируулаагүй — удирдлагад хэлнэ үү' : e === 'phone' ? 'Утасны дугаар 8 оронтой байна' : e === 'network' ? 'Интернэт холболтоо шалгана уу'
    : /storepay_auth/.test(e) ? 'StorePay-д нэвтэрч чадсангүй — удирдлага түлхүүрээ шалгана уу' : e === 'auth' ? 'Дахин нэвтэрнэ үү' : 'StorePay: ' + e;
}
function spPost(body, cb) {
  if (!API_URL) {   // туршилтын горим: 3 секундын дараа баталгаажсан мэт
    setTimeout(function () { cb(null, body.type === 'storepay_amount' ? { amount: 1500000 } : body.type === 'storepay_create' ? { id: 'T' + Date.now() } : { paid: Date.now() - spWaitStart > 3000 }); }, 600); return;
  }
  body.token = session ? session.token : '';
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); }).then(function (d) { cb(d && d.status === 'ok' ? null : (d && d.error) || 'error', d); }).catch(function () { cb('network'); });
}
function spPhone() { return String($('saleSpPhone').value || '').replace(/\D/g, '').slice(-8); }
function spLimit() {
  var ph = spPhone(); if (ph.length !== 8) { toast('Хэрэглэгчийн утасны дугаар (8 орон)'); return; }
  $('saleSpInfo').textContent = 'Шалгаж байна…';
  spPost({ type: 'storepay_amount', phone: ph }, function (err, d) {
    var el = $('saleSpInfo'); if (err) { el.textContent = spErrText(err); el.className = 'sp-info bad'; return; }
    var ok = d.amount >= cartTotal(); el.className = 'sp-info ' + (ok ? 'ok' : 'bad');
    el.textContent = 'Боломжит лимит ' + fmt(d.amount) + (cartTotal() ? (ok ? ' — хүрэлцэнэ' : ' — ' + fmt(cartTotal() - d.amount) + ' дутуу') : '');
  });
}
var spWaitStart = 0;
function spStart() {
  var ph = spPhone(); if (ph.length !== 8) { toast('StorePay: хэрэглэгчийн утасны дугаарыг бичнэ үү'); $('saleSpPhone').focus(); return; }
  var amt = cartTotal(), n = sale.cart.length;
  spOverlay('Хүсэлт илгээж байна…', '');
  spPost({ type: 'storepay_create', phone: ph, amount: amt, desc: BIZ.name + ' · ' + n + ' бараа', requestId: BIZ_KEY + '-' + Date.now() }, function (err, d) {
    if (err) { spOverlay(); alert('StorePay хүсэлт илгээгдсэнгүй:\n' + spErrText(err)); return; }
    sale.spId = d.id; sale.spPhone = ph; spWaitStart = Date.now();
    spOverlay('Хэрэглэгч StorePay апп дээрээ баталгаажуулна', fmt(amt) + ' · ' + ph + ' · хүсэлт #' + d.id);
    spPoll();
  });
}
function spPoll() {
  clearTimeout(spTimer); if (!sale.spId) return;
  if (Date.now() - spWaitStart > 15 * 60000) { spOverlay('Хугацаа дууслаа', 'Хэрэглэгч 15 минутад баталгаажуулсангүй. «Дахин шалгах» эсвэл «Болих» дарна уу.', true); return; }
  spPost({ type: 'storepay_check', id: sale.spId }, function (err, d) {
    if (!sale.spId) return;
    if (!err && d.paid) { sale.spPaid = sale.spId; sale.spId = null; spOverlay(); toast('StorePay баталгаажлаа'); submitSale(); sale.spPaid = null; return; }
    spTimer = setTimeout(spPoll, 4000);
  });
}
function spRecheck() { spWaitStart = Date.now(); spOverlay('Хэрэглэгч StorePay апп дээрээ баталгаажуулна', fmt(cartTotal()) + ' · ' + sale.spPhone + ' · хүсэлт #' + sale.spId); spPoll(); }
function spCancel() {
  if (sale.spId && !confirm('StorePay-ийн хүлээлтийг зогсоох уу?\nХэрэглэгч дараа нь баталгаажуулбал борлуулалт энд бүртгэгдэхгүй — StorePay merchant-аас шалгана уу.')) return;
  clearTimeout(spTimer); sale.spId = null; spOverlay();
}
function spOverlay(title, sub, stuck) {
  var el = $('spWait'); if (!el) return;
  if (!title) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = '<div class="sp-box">' + (stuck ? '' : '<div class="sp-spin"></div>') + '<b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') +
    (sale.spId ? '<div class="sp-acts">' + (stuck ? '<button class="btn sm" onclick="spRecheck()">Дахин шалгах</button>' : '') + '<button class="btn sm ghost2" onclick="spCancel()">Болих</button></div>' : '') + '</div>';
}

// ── Нэг касс: «Дэлгүүрт» (шууд борлуулалт) эсвэл «Хүргэлтээр» (захиалга — буухиад өгөхөд борлуулалт болно) ──
function ensureDlv() {
  if ($('posMode')) return;
  var right = document.querySelector('#saleSheet .pos-right'), extra = document.querySelector('#saleSheet .pos-extra');
  if (!right || !extra) return;
  right.insertAdjacentHTML('afterbegin', '<div class="pos-mode" id="posMode"><button data-m="dlv" onclick="setMode(\'dlv\')">Хүргэлтээр</button><button data-m="shop" onclick="setMode(\'shop\')">Дэлгүүрт</button></div>');
  var dist = ['Баянзүрх', 'Баянгол', 'Сүхбаатар', 'Чингэлтэй', 'Хан-Уул', 'Сонгинохайрхан', 'Налайх', 'Багануур', 'Багахангай'];
  extra.insertAdjacentHTML('afterend', '<div class="pos-dlv" id="posDlv" style="display:none">' +
    '<div class="pe-row"><label for="dPhone">Утас *</label><input id="dPhone" inputmode="tel" maxlength="12" placeholder="99112233" oninput="dlvHint()"></div><small id="dHint" class="pe-hint"></small>' +
    '<div class="pe-row"><label for="dName">Нэр</label><input id="dName" placeholder="Facebook нэр"></div>' +
    '<div class="pe-row"><label for="dPhone2">Нэмэлт утас</label><input id="dPhone2" inputmode="tel" maxlength="12"></div>' +
    '<label for="dAddr" class="d-lbl">Хаяг * <small class="muted">(хороолол, байр, тоот, орц, код)</small></label><textarea id="dAddr" rows="2" oninput="dlvAddr()"></textarea>' +
    '<div class="d-row3"><select id="dDist"><option value="">Дүүрэг</option>' + dist.map(function (d) { return '<option>' + d + '</option>'; }).join('') + '</select><input id="dKhoroo" placeholder="Хороо"><input id="dCity" value="Улаанбаатар" placeholder="Хот / аймаг"></div>' +
    '<div class="d-row3"><label>Хүргэх өдөр<input id="dDate" type="date"></label><label>Хүргэлт (₮)<input id="dFee" type="number" inputmode="numeric" min="0" oninput="calcSale()"></label><label>Төлбөр<select id="dPaid"><option>Ороогүй</option><option>Орсон</option></select></label></div>' +
    '<input id="dNote" placeholder="Хүргэлтийн тайлбар (заавал биш)">' +
    '<label class="or-print"><input type="checkbox" id="dPrint" onchange="lblWarn()"> Хадгалаад шошго хэвлэх <small class="muted lbl-warn"></small></label></div>');
}
function setMode(m) {
  if (!$('posMode')) return;
  sale.mode = m;
  [].forEach.call($('posMode').children, function (b) { b.classList.toggle('on', b.dataset.m === m); });
  var dlv = m === 'dlv';
  $('posDlv').style.display = dlv ? '' : 'none';
  document.querySelector('#saleSheet .pos-pay').style.display = dlv ? 'none' : '';
  var ph = $('salePhone'); if (ph) ph.closest('.pe-row').style.display = dlv ? 'none' : '';
  if ($('salePhoneHint')) $('salePhoneHint').style.display = dlv ? 'none' : '';
  document.querySelector('#saleSheet .pos-head h2').textContent = dlv ? 'Захиалга (хүргэлтээр)' : 'Борлуулалт';
  if (dlv && !$('dFee').value) {
    $('dFee').value = typeof FEE_DEFAULT !== 'undefined' ? FEE_DEFAULT : 7000;
    $('dDate').value = todayStr(new Date(Date.now() + 864e5));
    $('dPrint').checked = typeof lblAuto === 'function' && lblAuto();
  }
  if (typeof lblWarn === 'function') lblWarn();
  if (sale.cart) calcSale();
}
function dlvReset() { ['dPhone', 'dName', 'dPhone2', 'dAddr', 'dKhoroo', 'dNote', 'dFee'].forEach(function (k) { if ($(k)) $(k).value = ''; }); if ($('dDist')) $('dDist').value = ''; if ($('dCity')) $('dCity').value = 'Улаанбаатар'; if ($('dHint')) $('dHint').textContent = ''; }
function dlvAddr() {
  var t = $('dAddr').value;
  if (typeof guessDistrict === 'function' && !$('dDist').value) $('dDist').value = guessDistrict(t);
  if (typeof guessKhoroo === 'function' && !$('dKhoroo').value) $('dKhoroo').value = guessKhoroo(t);
}
function dlvHint() {   // өмнөх захиалга (энэ төхөөрөмж дээрх жагсаалтаас)
  var k = String($('dPhone').value).replace(/\D/g, '').slice(-8), el = $('dHint');
  if (k.length < 8 || typeof orders === 'undefined') { el.textContent = ''; return; }
  var L = orders.filter(function (o) { return String(o.phone).replace(/\D/g, '').slice(-8) === k; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  if (!L.length) { el.textContent = 'Шинэ хэрэглэгч'; return; }
  var l = L[L.length - 1];
  el.innerHTML = 'Өмнө ' + L.length + ' захиалга · сүүлд ' + esc(l.date) + (l.address && !$('dAddr').value.trim() ? ' <button class="mini" onclick="dlvFill(\'' + l.id + '\')">Өмнөх хаягаар</button>' : '');
}
function dlvFill(id) {
  var l = orders.filter(function (o) { return o.id === id; })[0]; if (!l) return;
  if (!$('dName').value.trim()) $('dName').value = l.customer || '';
  $('dAddr').value = l.address || ''; $('dDist').value = l.district || ''; $('dKhoroo').value = l.khoroo || ''; $('dCity').value = l.city || 'Улаанбаатар';
  if (!$('dPhone2').value.trim()) $('dPhone2').value = l.phone2 || '';
}
function submitDelivery() {
  for (var i = 0; i < sale.cart.length; i++) { var l = sale.cart[i]; if (!(Number(l.qty) > 0) || !(Number(l.price) > 0)) { toast(l.name + ' — тоо, үнийг шалгана уу'); return; } }
  var phone = String($('dPhone').value).replace(/\D/g, '');
  if (!/^\d{8}$/.test(phone)) { toast('Утасны дугаар 8 оронтой байна'); $('dPhone').focus(); return; }
  if ($('dAddr').value.trim().length < 5) { toast('Хаягаа дэлгэрэнгүй бичнэ үү'); $('dAddr').focus(); return; }
  var dsc = discAmt(); if (dsc && !isManager && dsc > cartGross() * 0.1 + 0.5) { toast('10%-иас их хөнгөлөлтийг менежер өгнө'); return; }
  var items = sale.cart.map(function (l) { return { name: l.name, qty: Number(l.qty), price: Number(l.price) }; });
  if (dsc) items.push({ name: DISC_ITEM, qty: 1, price: -dsc });
  if (dlvFee()) items.push({ name: FEE_ITEM, qty: 1, price: dlvFee() });
  var o = { customer: $('dName').value.trim(), phone: phone, phone2: String($('dPhone2').value).replace(/\D/g, ''), city: $('dCity').value.trim() || 'Улаанбаатар',
    district: $('dDist').value, khoroo: $('dKhoroo').value.trim(), address: $('dAddr').value.trim(), items: items,
    amount: Math.round(items.reduce(function (a, x) { return a + x.qty * x.price; }, 0)), deliverDate: $('dDate').value,
    payType: 'Шилжүүлэг', paid: $('dPaid').value, status: 'Шинэ', note: $('dNote').value.trim() };
  if (typeof ordShort === 'function' && ordShort(o).length) toast('Анхаар: үлдэгдэл хүрэлцэхгүй — орлого ортол буухиад өгөх боломжгүй');
  var doPrint = $('dPrint').checked; save('nb_lbl_auto', doPrint);
  saveOrder(o, function (saved) {
    closeSheet('saleSheet'); dlvReset(); toast('Захиалга бүртгэгдлээ');
    if (typeof ordTab !== 'undefined') { ordTab = 'new'; renderOrders(); }
    if (doPrint && typeof lblQuick === 'function') lblQuick([saved.id]);
    else if (saved.paid !== 'Орсон' && typeof copyPayMsg === 'function') copyPayMsg(saved.id);
  });
}

// ── Борлуулалт (сагс: олон бараа → нэг баримт) ──
function openSale(mode) {
  sale = { cart: [], pay: 'Бэлэн', cat: '', edit: null, discU: '%', mode: 'shop' };
  if (BIZ.orders) { ensureDlv(); setMode(mode === 'shop' ? 'shop' : 'dlv'); }   // захиалгатай бизнест «Хүргэлтээр» анхдагч
  salePop = popularity();
  if ($('saleEditNote')) $('saleEditNote').style.display = 'none';
  $('saleSearch').value = '';
  $('saleSearchWrap').style.display = products.length > 8 ? 'block' : 'none';
  if ($('saleCash')) $('saleCash').value = '';
  if (BIZ.barcode && $('saleSearchWrap') && !$('scanBtn')) $('saleSearchWrap').insertAdjacentHTML('beforeend', '<button class="btn sm ghost2 scan-btn" id="scanBtn" onclick="scanOpen()">Скан</button>');
  scanClose();
  if ($('saleDisc')) { $('saleDisc').value = ''; setDiscU('%'); $('salePhone').value = ''; $('salePhoneHint').textContent = ''; $('saleSplitOn').checked = false; $('saleSplitAmt').value = ''; $('saleSplitWrap').style.display = 'none'; }
  parkBtnUpd();
  if ($('saleSpPhone')) { $('saleSpPhone').value = ''; $('saleSpInfo').textContent = ''; }
  spShowBtn();
  renderCats();
  renderChips();
  $('saleItem').value = '';
  $('salePrice').value = '';
  $('saleTin').value = ''; tinLook = { q: '', res: null }; if ($('saleTinName')) $('saleTinName').textContent = '';
  if ($('saleBuyer')) { $('saleBuyer').value = ''; $('saleBuyer').style.display = 'none'; }
  $('saleCust').value = '';
  $('saleTinWrap').style.display = ebEnabled() ? 'block' : 'none';
  setPay('Бэлэн');
  renderCart();
  openSheet('saleSheet');
}
// Ангиллын товчнууд (Baaz-ийн ангиллаар) — ангилалгүй дэлгүүрт харагдахгүй
function renderCats() {
  var cats = [];
  products.forEach(function (p) { if (p.cat && cats.indexOf(p.cat) < 0) cats.push(p.cat); });
  $('saleCats').style.display = cats.length > 1 ? 'flex' : 'none';
  $('saleCats').innerHTML = ['Бүгд'].concat(cats).map(function (c) {
    var v = c === 'Бүгд' ? '' : c;
    return '<button class="pos-cat' + (sale.cat === v ? ' on' : '') + '" onclick="setCat(' + esc(JSON.stringify(v)) + ')">' + esc(c) + '</button>';
  }).join('');
}
function setCat(c) { sale.cat = c; renderCats(); renderChips(); }
// Хайлт + ангиллаар шүүж барааг хавтангаар харуулна (эхний 60) — сагсанд байгаа нь тоотой тодорно
function renderChips() {
  var q = $('saleSearch').value.trim().toLowerCase();
  var shown = [];
  products.forEach(function (p, i) {
    if (sale.cat && p.cat !== sale.cat) return;
    if (!q || p.name.toLowerCase().indexOf(q) >= 0) shown.push(i);
  });
  shown.sort(function (a, b) { return (salePop[products[b].name] || 0) - (salePop[products[a].name] || 0) || a - b; });   // их зарагддаг нь эхэнд
  var more = shown.length > 60 ? shown.length - 60 : 0;
  $('saleChips').innerHTML = shown.slice(0, 60).map(function (i) {
    var p = products[i], line = sale.cart.filter(function (l) { return l.name === p.name; })[0];
    var left = shopLeft(p.name), out = left !== null && left <= 0;
    var stockTxt = left === null ? '' : out ? 'Дууссан' : 'Үлд. ' + left;
    return '<button class="ptile' + (line ? ' on' : '') + (out ? ' out' : '') + '" onclick="pickProduct(' + i + ')">' +
      (line ? '<i class="pt-q">' + line.qty + '</i>' : '') +
      '<span class="pt-n">' + esc(p.name) + '</span>' +
      '<span class="pt-f"><b>' + (p.price ? fmt(p.price) : 'Үнэ оруулна') + '</b>' + (stockTxt ? '<small class="' + (out ? 'o' : left <= 2 ? 'l' : '') + '">' + stockTxt + '</small>' : '') + '</span></button>';
  }).join('') + (more ? '<p class="muted pos-more">+' + more + ' бараа — хайлтаар олно уу</p>' : '') +
    (!shown.length ? '<p class="muted pos-more">Олдсонгүй — «Жагсаалтад байхгүй бараа»-аар нэмнэ үү</p>' : '');
}
// Бараа дарахад сагсанд нэмнэ (байгаа бол тоог нь 1-ээр нэмнэ)
function pickProduct(i) {
  var p = products[i];
  var left = shopLeft(p.name);
  if (left !== null && left <= 0) { toast('«' + p.name + '» үлдэгдэлгүй — зарах боломжгүй. Удирдлагаар орлого бүртгүүлнэ үү'); loadStock(); return; }
  var line = sale.cart.filter(function (l) { return l.name === p.name; })[0];
  if (line) line.qty = Math.round((Number(line.qty) + 1) * 1000) / 1000;
  else sale.cart.push({ name: p.name, unit: p.unit || BIZ.unit, price: p.price || '', listPrice: p.price || 0, qty: 1, cls: p.cls || '' });
  renderChips();
  renderCart();
}
// Жагсаалтад байхгүй барааг нэрээр нь нэмнэ
function addCustom() {
  var name = $('saleItem').value.trim();
  var price = parseFloat($('salePrice').value) || 0;
  if (!name) { toast('Барааны нэрийг бичнэ үү'); return; }
  if (price <= 0) { toast('Үнийг бичнэ үү'); return; }
  sale.cart.push({ name: name, unit: BIZ.unit, price: price, listPrice: 0, qty: 1, cls: '' });
  $('saleItem').value = '';
  $('salePrice').value = '';
  renderCart();
}
function renderCart() {
  var el = $('cartList');
  if (!sale.cart.length) {
    el.innerHTML = '<li class="pos-empty">Сагс хоосон<small>Бараан дээр дарж нэмнэ үү</small></li>';
  } else {
    // Нэг мөр = нэг бараа: нэр | − тоо ＋ | үнэ | дүн | ✕ — бүх сагс нэг дор харагдана
    el.innerHTML = sale.cart.map(function (l, i) {
      var lock = !isManager && l.listPrice > 0;   // худалдагч жагсаалтын үнийг сольж чадахгүй
      return '<li class="cart-line cl1"><span class="cl-name">' + esc(l.name) + '</span>' +
        '<span class="cl-qty"><button onclick="stepQty(' + i + ',-1)">−</button>' +
        '<input type="number" inputmode="decimal" step="any" min="0" value="' + l.qty + '" oninput="setLine(' + i + ',\'qty\',this.value)">' +
        '<button onclick="stepQty(' + i + ',1)">＋</button></span>' +
        '<input class="cl-price" type="number" inputmode="numeric" min="0" value="' + l.price + '"' + (lock ? ' readonly title="Үнийг менежер л солино"' : '') + ' oninput="setLine(' + i + ',\'price\',this.value)">' +
        '<b class="cl-sum" id="clSum' + i + '">' + fmt((Number(l.qty) || 0) * (Number(l.price) || 0)) + '</b>' +
        '<button class="cl-del" onclick="removeLine(' + i + ')" aria-label="Хасах">✕</button></li>';
    }).join('');
  }
  calcSale();
}
function setLine(i, f, v) {
  sale.cart[i][f] = v;
  var l = sale.cart[i];
  $('clSum' + i).textContent = fmt((Number(l.qty) || 0) * (Number(l.price) || 0));
  calcSale();
}
function stepQty(i, d) {
  var l = sale.cart[i];
  l.qty = Math.max(0, Math.round(((Number(l.qty) || 0) + d) * 1000) / 1000);
  if (l.qty === 0) sale.cart.splice(i, 1);
  renderChips();
  renderCart();
}
function removeLine(i) { sale.cart.splice(i, 1); renderChips(); renderCart(); }
function setPay(v) {
  if (v === 'StorePay' && !spEnabled()) { toast('StorePay тохируулаагүй — удирдлага «Банкны хуулга → StorePay холболт»-оос тохируулна'); return; }
  sale.pay = v;
  if ($('saleSplitP1') && /^(Бэлэн|Карт|Шилжүүлэг)$/.test(v)) $('saleSplitP1').value = v;
  var b = $('paySeg').children;
  for (var k = 0; k < b.length; k++) b[k].classList.toggle('on', b[k].dataset.v === v);
  $('saleCustWrap').style.display = v === 'Зээлээр' ? 'block' : 'none';   // зээлээр бол хэнд өгснийг заавал бичнэ
  if ($('saleCashWrap')) $('saleCashWrap').style.display = v === 'Бэлэн' ? '' : 'none';   // бэлэн бол хариулт тооцно
  if ($('saleSpWrap')) $('saleSpWrap').style.display = v === 'StorePay' ? '' : 'none';
  if ($('saleSplitLbl')) { var noSp = /Зээлээр|StorePay/.test(v); $('saleSplitLbl').style.display = noSp ? 'none' : ''; if (noSp) { $('saleSplitOn').checked = false; $('saleSplitWrap').style.display = 'none'; } }
  if (sale.cart) calcSale();
  calcChange();
}
function calcChange() {
  var el = $('saleChange'); if (!el) return;
  var got = Number($('saleCash').value) || 0, d = got - cartTotal();
  el.textContent = got ? fmt(Math.max(0, d)) : '₮0';
  el.parentNode.classList.toggle('short', !!got && d < 0);
  if (got && d < 0) el.textContent = 'дутуу ' + fmt(-d);
}
function cartGross() {
  return sale.cart.reduce(function (a, l) { return a + Math.round((Number(l.qty) || 0) * (Number(l.price) || 0)); }, 0);
}
function discAmt() {
  var el = $('saleDisc'); if (!el) return 0;
  var v = Number(el.value) || 0, g = cartGross();
  if (v <= 0) return 0;
  return Math.min(g, Math.round(sale.discU === '%' ? g * Math.min(v, 100) / 100 : v));
}
function cartTotal() { return cartGross() - discAmt() + dlvFee(); }   // төлөх дүн (хөнгөлөлтийн дараа, хүргэлттэй бол хүргэлтийн төлбөр нэмэгдэнэ)
function dlvFee() { return sale && sale.mode === 'dlv' && $('dFee') ? Math.max(0, Math.round(Number($('dFee').value) || 0)) : 0; }
function setDiscU(u) {
  sale.discU = u; var b = $('discU'); if (b) [].forEach.call(b.children, function (x) { x.classList.toggle('on', x.dataset.u === u); });
  if (sale.cart) calcSale();
}
// Хуваан төлөх: үндсэн хэлбэр + өөр нэг хэлбэр (бэлэн, карт, шилжүүлэг хооронд)
function splitToggle() {
  var on = $('saleSplitOn').checked; $('saleSplitWrap').style.display = on ? '' : 'none';
  if (on) { if (!/^(Бэлэн|Карт|Шилжүүлэг)$/.test(sale.pay)) setPay('Бэлэн'); $('saleSplitP1').value = sale.pay; if ($('saleSplitPay').value === sale.pay) $('saleSplitPay').value = sale.pay === 'Карт' ? 'Бэлэн' : 'Карт'; }
  calcSale();
}
// 1-р хэлбэр + дүн гараар, 2-р хэлбэр нь үлдсэн дүнг автоматаар авна
function splitInfo() {   // { pay2, amt2, err }
  if (!$('saleSplitOn') || !$('saleSplitOn').checked) return null;
  var pay2 = $('saleSplitPay').value, amt1 = Math.round(Number($('saleSplitAmt').value) || 0), net = cartTotal(), amt2 = net - amt1;
  if ($('saleSplitA2')) $('saleSplitA2').textContent = fmt(Math.max(0, amt2));
  var err = /Зээлээр|StorePay/.test(sale.pay) ? 'Зээлээр, StorePay төлбөрийг хуваах боломжгүй' : pay2 === sale.pay ? 'Хоёр өөр төлбөрийн хэлбэр сонгоно уу'
    : !(amt1 > 0) ? sale.pay + '-аар төлөх дүнгээ бичнэ үү' : amt2 <= 0 ? 'Дүн нийт дүнгээс бага байх ёстой' : '';
  return { pay2: pay2, amt2: amt2, err: err };
}
// Хэрэглэгчийн утас: энэ төхөөрөмж дээрх өмнөх худалдан авалтыг харуулна
function salePhoneHint() {
  var ph = String($('salePhone').value).replace(/\D/g, '').slice(-8), el = $('salePhoneHint');
  if (ph.length < 8) { el.textContent = ''; return; }
  var bills = {}, tot = 0;
  load(LS_REC, []).forEach(function (r) { if (r.type === 'sale' && r.biz === BIZ_KEY && String(r.customer || '').replace(/\D/g, '').slice(-8) === ph) { bills[billKey(r)] = 1; tot += Number(r.amount) || 0; } });
  var n = Object.keys(bills).length;
  el.textContent = n ? 'Өмнө ' + n + ' удаа худалдан авсан · нийт ' + fmt(tot) : 'Шинэ хэрэглэгч';
}
// Их зарагддаг бараа (сүүлийн 60 хоног, энэ төхөөрөмж)
var salePop = {};
function popularity() {
  var o = {}; load(LS_REC, []).forEach(function (r) { if (r.type === 'sale' && r.biz === BIZ_KEY && r.qty > 0 && !isNonGoods(r.item)) o[r.item] = (o[r.item] || 0) + Number(r.qty); }); return o;
}
// ── Түр хадгалах: хэрэглэгч бодож байхад сагсыг хадгалаад дараагийн хүнд үйлчилнэ ──
var LS_PARK = 'nb_park_' + BIZ_KEY;
function parkBtnUpd() { var b = $('parkBtn'); if (!b) return; var n = load(LS_PARK, []).length; b.style.display = n ? '' : 'none'; b.textContent = 'Хадгалсан (' + n + ')'; }
function parkSale() {
  if (!sale.cart.length) { toast('Сагс хоосон байна'); return; }
  if (sale.edit) { toast('Засварыг түр хадгалах боломжгүй'); return; }
  var list = load(LS_PARK, []);
  list.push({ id: 'P' + Date.now(), time: timeStr(), cart: sale.cart, pay: sale.pay, disc: $('saleDisc').value, discU: sale.discU, phone: $('salePhone').value, total: cartTotal() });
  save(LS_PARK, list); openSale(); toast('Сагс түр хадгалагдлаа');
}
function openParked() {
  var list = load(LS_PARK, []), el = $('spWait'); if (!el) return;
  el.style.display = 'flex';
  el.innerHTML = '<div class="sp-box park-box"><b>Түр хадгалсан сагс</b>' + (list.length ? '<ul class="park-l">' + list.map(function (p) {
    return '<li><span><b>' + esc(p.time) + ' · ' + fmt(p.total) + '</b><small>' + esc(p.cart.map(function (l) { return l.name + (l.qty > 1 ? ' ×' + l.qty : ''); }).join(', ')).slice(0, 80) + (p.phone ? ' · ' + esc(p.phone) : '') + '</small></span>' +
      '<span class="park-a"><button class="btn sm" onclick="unpark(\'' + p.id + '\')">Сэргээх</button><button class="btn sm ghost2" onclick="dropPark(\'' + p.id + '\')">Устгах</button></span></li>';
  }).join('') + '</ul>' : '<small>Хоосон</small>') + '<div class="sp-acts"><button class="btn sm ghost2" onclick="$(\'spWait\').style.display=\'none\'">Хаах</button></div></div>';
}
function unpark(id) {
  var list = load(LS_PARK, []), p = list.filter(function (x) { return x.id === id; })[0]; if (!p) return;
  if (sale.cart.length && !confirm('Одоогийн сагсыг солих уу? (Одоогийн сагсыг түр хадгалах бол «Болих» дараад «Түр хадгалах»)')) return;
  save(LS_PARK, list.filter(function (x) { return x.id !== id; }));
  openSale(); sale.cart = p.cart; setPay(p.pay || 'Бэлэн'); $('saleDisc').value = p.disc || ''; setDiscU(p.discU || '%'); $('salePhone').value = p.phone || ''; salePhoneHint();
  $('spWait').style.display = 'none'; renderChips(); renderCart();
}
function dropPark(id) { save(LS_PARK, load(LS_PARK, []).filter(function (x) { return x.id !== id; })); parkBtnUpd(); openParked(); }
function calcSale() {
  $('saleTotal').textContent = fmt(cartTotal());
  var g = cartGross(), dsc = discAmt(), sp = splitInfo(), sub = $('saleSub');
  if (sub) sub.innerHTML = (dsc ? '<span>Дүн ' + fmt(g) + '</span><span class="neg">Хөнгөлөлт −' + fmt(dsc) + (sale.discU === '%' ? ' (' + ($('saleDisc').value) + '%)' : '') + '</span>' : '') +
    (sp && !sp.err ? '<span>' + esc(sale.pay) + ' ' + fmt(cartTotal() - sp.amt2) + ' + ' + esc(sp.pay2) + ' ' + fmt(sp.amt2) + '</span>' : '');
  if ($('saleSplitInfo')) $('saleSplitInfo').textContent = sp && sp.err ? sp.err : '';
  var n = sale.cart.reduce(function (a, l) { return a + (Number(l.qty) || 0); }, 0);
  $('saleCount').textContent = sale.cart.length ? sale.cart.length + ' төрөл · ' + Math.round(n * 1000) / 1000 + ' ш' : '';
  var sm = $('saleItems'); if (sm) sm.textContent = sale.cart.map(function (l) { return (l.qty > 1 ? l.qty + '× ' : '') + l.name; }).join(', ');
  var lbl = sale.mode === 'dlv' ? 'Захиалга бүртгэх' : 'Төлбөр авах';
  $('saleSubmit').textContent = sale.cart.length ? lbl + ' · ' + fmt(cartTotal()) : lbl;
  if (sub && sale.mode === 'dlv' && dlvFee()) sub.innerHTML += '<span>Хүргэлт +' + fmt(dlvFee()) + '</span>';
  calcChange();
}
function submitSale() {
  if (!sale.cart.length) { toast('Сагсанд бараа нэмнэ үү'); return; }
  if (sale.mode === 'dlv') { submitDelivery(); return; }
  for (var i = 0; i < sale.cart.length; i++) {
    var l = sale.cart[i];
    if (!(Number(l.qty) > 0)) { toast(l.name + ' — тоо хэмжээ оруулна уу'); return; }
    if (!(Number(l.price) > 0)) { toast(l.name + ' — үнэ оруулна уу'); return; }
  }
  var short = stockShort(sale.cart.map(function (l) {   // засвар бол хуучин баримтын тоо үлдэгдэлд буцна
    var back = sale.edit ? sale.edit.lines.filter(function (x) { return x.item === l.name; }).reduce(function (a, x) { return a + Number(x.qty); }, 0) : 0;
    return { item: l.name, qty: Number(l.qty) - back };
  }));
  if (short.length) { alert('Үлдэгдэл хүрэлцэхгүй — зарах боломжгүй:\n\n' + short.join('\n') + '\n\nУдирдлагаар орлого бүртгүүлсний дараа дахин оролдоно уу.'); loadStock(); return; }
  var dsc = discAmt(), sp = splitInfo();
  if (dsc && !isManager && dsc > cartGross() * 0.1 + 0.5) { toast('10%-иас их хөнгөлөлтийг менежер өгнө'); return; }
  if (sp && sp.err) { toast(sp.err); return; }
  var phone = $('salePhone') ? String($('salePhone').value).replace(/\D/g, '') : '';
  if (phone && phone.length < 8) { toast('Хэрэглэгчийн утас 8 оронтой байна'); return; }
  var cust = $('saleCust').value.trim();
  if (sale.pay === 'Зээлээр' && cust.length < 2) { toast('Зээлээр авсан хүн / байгууллагын нэрийг бичнэ үү'); $('saleCust').focus(); return; }
  if (sale.pay === 'StorePay' && sale.edit) { toast('Баримт засварт StorePay ашиглах боломжгүй'); return; }
  if (sale.pay === 'StorePay' && !sale.spPaid) { spStart(); return; }   // эхлээд хэрэглэгч StorePay апп дээрээ батална
  var bill = BIZ_KEY + '-' + (sale.pay === 'StorePay' ? 'SP' + sale.spPaid : Date.now());
  var lines = sale.cart.map(function (l) {
    var r = {
      type: 'sale', item: l.name, qty: Number(l.qty), unit: l.unit, price: Number(l.price),
      amount: Math.round(Number(l.qty) * Number(l.price)), pay: sale.pay, bill: bill,
    };
    if (sale.pay === 'Зээлээр') r.customer = cust; else if (phone) r.customer = phone.slice(-8);
    if (sale.pay === 'StorePay') { r.customer = 'StorePay'; r.note = 'StorePay #' + sale.spPaid + ' · ' + sale.spPhone; }
    if (l.cls) r.classificationCode = l.cls;   // БҮНА код (И-баримтад)
    return r;
  });
  var cu = lines[0] && lines[0].customer;
  if (dsc) lines.push({ type: 'sale', item: DISC_ITEM, qty: 1, unit: '', price: -dsc, amount: -dsc, pay: sale.pay, bill: bill, customer: cu || '',
    note: 'Хөнгөлөлт ' + (sale.discU === '%' ? $('saleDisc').value + '%' : fmt(dsc)) + ' · ' + staffName });
  if (sp) {   // нэг хэлбэрээс нөгөө рүү: орлого өөрчлөгдөхгүй, касс/карт зөв хуваагдана
    lines.push({ type: 'sale', item: SPLIT_ITEM, qty: 1, unit: '', price: -sp.amt2, amount: -sp.amt2, pay: sale.pay, bill: bill, customer: cu || '' });
    lines.push({ type: 'sale', item: SPLIT_ITEM, qty: 1, unit: '', price: sp.amt2, amount: sp.amt2, pay: sp.pay2, bill: bill, customer: cu || '' });
  }
  if (!ebEnabled()) { if (sale.edit) { toast('Засвар хийхэд И-баримт асаалттай байх ёстой'); return; } finishSale(lines); return; }
  var noCls = lines.filter(function (r) { return !isAdj(r.item) && !r.classificationCode && !ebConfig().classificationCode; });
  if (noCls.length) {
    toast('И-баримтад ангилал хэрэгтэй: «' + noCls[0].item + '» — жагсаалтаас сонгоно уу');
    return;
  }

  // И-баримт гаргаад дараа нь хадгална
  var tinIn = $('saleTin').value.trim().replace(/\s/g, ''), tin = tinIn, buyer = '';
  if (tinIn) {   // регистрээр бичсэн бол ТТД руу хөрвүүлнэ; нэрийг баримтад хэвлэнэ
    var lr = tinLook.q === tinIn ? tinLook.res : null;
    if (lr && !lr.found) { toast('Энэ ТТД / регистр бүртгэлгүй байна — шалгана уу'); return; }
    if (lr) { tin = lr.tin; buyer = lr.name; }
    if (!buyer && $('saleBuyer')) buyer = $('saleBuyer').value.trim();   // гараар бичсэн нэр
    else if (!/^\d{11,12}$/.test(tinIn)) { toast('И-баримтад 11 оронтой ТТД хэрэгтэй — «ТТД-г олох» холбоосоор олоод бичнэ үү'); return; }
  }
  var btn = $('saleSubmit');
  btn.disabled = true;
  btn.textContent = 'Баримт гаргаж байна...';
  var req = ebBuildRequest(lines, { tin: tin }), edit = sale.edit;
  if (edit) req.inactiveId = edit.ddtd;   // засвар: хуучин баримт хүчингүй болно
  ebSend(req, function (err, res) {
    btn.disabled = false;
    btn.textContent = 'Төлбөр авах';
    if (err && edit) { alert('Засварын баримт гарсангүй:\n' + err.message + '\n\nХуучин баримт хэвээр байна.'); return; }
    if (err) {
      if (confirm('И-баримт гарсангүй:\n' + err.message + '\n\nБаримтгүйгээр борлуулалтаа хадгалах уу?')) {
        lines.forEach(function (r) { r.note = 'И-баримт гараагүй'; });
        finishSale(lines);
      }
      return;
    }
    lines.forEach(function (r) {
      r.ddtd = res.id;
      r.ebDate = res.date;
      if (tin) { r.buyerTin = tin; if (buyer) r.buyerName = buyer; }
      r.note = 'ДДТД ' + res.id + (tin ? ' · ТТД ' + tin + (buyer ? ' · ' + buyer : '') : '') + (edit ? ' · засвар (хуучин ' + edit.ddtd + ')' : '');
    });
    if (edit) ebEditDone(edit);
    finishSale(lines);
    ebShowReceipt(res, lines);
  });
}
function finishSale(lines) {
  lines.forEach(function (r) { stockTake(r.item, r.qty); });
  addRecords(lines);
  closeSheet('saleSheet'); parkBtnUpd();
  toast('✓ Борлуулалт бичигдлээ: ' + fmt(lines.reduce(function (a, r) { return a + r.amount; }, 0)));
}

// ── Зарлага ──
function openExpense() {
  expense = { category: '' };
  $('expChips').innerHTML = BIZ.expenses.map(function (c, i) {
    return '<button class="chip" onclick="pickExp(' + i + ')">' + esc(c) + '</button>';
  }).join('');
  $('expAmount').value = '';
  $('expNote').value = '';
  openSheet('expSheet');
}
function pickExp(i) {
  expense.category = BIZ.expenses[i];
  var chips = $('expChips').children;
  for (var k = 0; k < chips.length; k++) chips[k].classList.toggle('on', k === i);
}
function submitExpense() {
  var amt = parseFloat($('expAmount').value) || 0;
  if (!expense.category) { toast('Зарлагын төрөл сонгоно уу'); return; }
  if (amt <= 0) { toast('Дүн оруулна уу'); return; }
  addRecord({ type: 'expense', category: expense.category, amount: Math.round(amt), note: $('expNote').value.trim() });
  closeSheet('expSheet');
  toast('✓ Зарлага бичигдлээ: ' + fmt(amt));
}

// ── Касс хаах ──
function openClose() {
  var t = todayTotals();
  $('closeSys').innerHTML =
    '<li><span>Бэлэн</span><span class="amt">' + fmt(t.cash) + '</span></li>' +
    '<li><span>Карт</span><span class="amt">' + fmt(t.card) + '</span></li>' +
    '<li><span>Шилжүүлэг</span><span class="amt">' + fmt(t.transfer) + '</span></li>' +
    '<li><span>Бэлэн зарлага</span><span class="amt r">−' + fmt(t.exp) + '</span></li>' +
    '<li><span><b>Касст байх ёстой бэлэн</b></span><span class="amt">' + fmt(t.cash - t.exp) + '</span></li>';
  $('closeCash').value = '';
  $('closeNote').value = '';
  $('closeDiff').textContent = '';
  openSheet('closeSheet');
}
function calcClose() {
  var t = todayTotals();
  var v = $('closeCash').value;
  if (v === '') { $('closeDiff').textContent = ''; return; }
  var diff = (parseFloat(v) || 0) - (t.cash - t.exp);
  $('closeDiff').textContent = diff === 0 ? '✓ Зөрүүгүй' : (diff > 0 ? 'Илүү: ' : 'Дутуу: ') + fmt(Math.abs(diff));
  $('closeDiff').style.color = diff === 0 ? 'var(--green)' : 'var(--red)';
}
function submitClose() {
  var v = $('closeCash').value;
  if (v === '') { toast('Касст байгаа бэлэн мөнгөө оруулна уу'); return; }
  var t = todayTotals();
  var counted = parseFloat(v) || 0;
  addRecord({
    type: 'close', cash: t.cash, card: t.card, transfer: t.transfer, expense: t.exp,
    amount: t.cash + t.card + t.transfer, counted: counted,
    diff: counted - (t.cash - t.exp), note: $('closeNote').value.trim(),
  });
  closeSheet('closeSheet');
  toast('✓ Касс хаагдлаа');
}

// ── Бичлэг хадгалах + илгээх ──
function addRecord(r) { addRecords([r]); }
// Олон бичлэгийг нэг дор хадгална — ID бүр давтагдашгүй (сагсны мөрүүд нэг мс-д үүсдэг)
var recSeq = 0;
function addRecords(list) {
  var now = new Date();
  var all = load(LS_REC, []);
  var q = load(LS_QUEUE, []);
  list.forEach(function (r, i) {
    // ID давтагдашгүй байх ёстой (сервер ижил ID-тайг давхар гэж үзээд хаядаг): цаг + дараалал + санамсаргүй
    r.id = BIZ_KEY + '-' + now.getTime() + '-' + (recSeq++) + '-' + Math.random().toString(36).slice(2, 7);
    r.biz = BIZ_KEY;
    r.date = todayStr(now);
    r.time = timeStr(now);
    r.staff = staffName;
    if (session && session.token) r.tok = session.token;   // бичлэг бүр бичсэн ажилтныхаа токентой явна
    all.push(r);
    q.push(r);
  });
  // зөвхөн сүүлийн 60 хоногийг төхөөрөмжид үлдээнэ
  var cutoff = todayStr(new Date(Date.now() - 60 * 864e5));
  all = all.filter(function (x) { return x.date >= cutoff; });
  save(LS_REC, all);
  if (API_URL) { save(LS_QUEUE, q); flushQueue(); }
  renderToday();
}

var flushing = false;
function flushQueue() {
  if (!API_URL || flushing) return;
  var q = load(LS_QUEUE, []);
  updatePending(q.length);
  if (!q.length) return;
  flushing = true;
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ records: q, token: session ? session.token : '' }) })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.error === 'auth' && data.saved) {   // зарим нь (өөрийн токентой) хадгалагдсан
        var ok = {}, rj = {}; (data.rejected || []).forEach(function (id) { rj[id] = 1; }); q.forEach(function (r) { if (!rj[r.id]) ok[r.id] = 1; });
        save(LS_QUEUE, load(LS_QUEUE, []).filter(function (r) { return !ok[r.id]; }));
      }
      if (data && data.error === 'auth') {   // токен дууссан / ажилтан идэвхгүй — бичлэгүүд хадгалагдсан хэвээр, нэвтэрмэгц илгээгдэнэ
        if (session) { session = null; sesSave(null); toast('Дахин нэвтэрнэ үү — илгээгдээгүй бичлэг хадгалагдсан байгаа'); $('main').style.display = 'none'; showLogin(); }
        return;
      }
      if (data && data.status === 'ok') {
        var sent = {}, rej = {};
        (data.rejected || []).forEach(function (id) { rej[id] = 1; });
        q.forEach(function (r) { if (!rej[r.id]) sent[r.id] = 1; });
        var rest = load(LS_QUEUE, []).filter(function (r) { return !sent[r.id]; });
        save(LS_QUEUE, rest);
        updatePending(rest.length);
      }
    })
    .catch(function () {})
    .then(function () { flushing = false; });
}
function updatePending(n) {
  var el = $('pending');
  if (!el) return;
  el.style.display = n ? 'block' : 'none';
  el.textContent = n + ' бичлэг илгээгдээгүй байна. Интернэт орохоор автоматаар илгээгдэнэ.';
}

// ── Өнөөдрийн жагсаалт ──
function todayRecords() {
  var d = todayStr();
  return load(LS_REC, []).filter(function (r) { return r.biz === BIZ_KEY && r.date === d; });
}
function todayTotals() {
  var t = { cash: 0, card: 0, transfer: 0, credit: 0, exp: 0, sales: 0 };
  todayRecords().forEach(function (r) {
    if (r.type === 'sale') {
      t.sales += r.amount;
      if (r.pay === 'Карт') t.card += r.amount;
      else if (r.pay === 'Шилжүүлэг') t.transfer += r.amount;
      else if (r.pay === 'Зээлээр' || r.pay === 'Урьдчилгаа' || r.pay === 'StorePay') t.credit += r.amount;   // кассанд мөнгө ороогүй
      else t.cash += r.amount;
    } else if (r.type === 'expense') t.exp += r.amount;
  });
  return t;
}
// ── Ирц: «Ирлээ» / «Явлаа» — ажилласан цаг удирдлагад харагдана ──
var SHOW_ATTEND = false;   // ирцийн мөрийг ажилтны хуудаснаас хассан (хэрэглэгчийн шийдвэр 2026-10-22)
function renderAttend() {
  if (!SHOW_ATTEND) { var ab = $('attBar'); if (ab) ab.remove(); return; }
  var bb = document.querySelector('.big-btns'); if (!bb || !staffName) return;
  if (!$('attBar')) bb.insertAdjacentHTML('beforebegin', '<div class="card att-bar" id="attBar"></div>');
  var a = todayRecords().filter(function (r) { return r.type === 'attend' && r.staff === staffName; });
  var inn = a.filter(function (r) { return r.item === 'Ирлээ'; })[0], out = a.filter(function (r) { return r.item === 'Явлаа'; }).pop();
  $('attBar').innerHTML = '<span>' + (inn ? 'Ирсэн <b>' + esc(inn.time) + '</b>' + (out ? ' · Явсан <b>' + esc(out.time) + '</b>' : '') : 'Ирцээ бүртгэнэ үү') + '</span>' +
    (!inn ? '<button class="btn sm" onclick="attend(\'Ирлээ\')">Ирлээ</button>' : !out ? '<button class="btn sm ghost" onclick="attend(\'Явлаа\')">Явлаа</button>' : '');
}
function attend(kind) {
  if (kind === 'Явлаа' && !confirm('Ажлаа дуусгаж явж байна уу?')) return;
  addRecord({ type: 'attend', item: kind, amount: 0 });
  toast(kind === 'Ирлээ' ? 'Ирц бүртгэгдлээ' : 'Явсан цаг бүртгэгдлээ');
}
function renderToday() {
  renderAttend();
  if (BIZ.orders && typeof renderOrders === 'function') setTimeout(renderOrders, 0);   // табын тоо шинэчлэгдэнэ
  var t = todayTotals();
  $('sumSales').textContent = fmt(t.sales);
  $('sumExp').textContent = fmt(t.exp);
  $('sumNet').textContent = fmt(t.sales - t.exp);
  var recs = todayRecords().filter(function (r) { return r.type !== 'attend'; }).slice().reverse();
  var hb = $('histBtn');
  if (!hb && $('todayList')) { $('todayList').insertAdjacentHTML('afterend', '<button class="btn ghost" id="histBtn" style="margin-top:8px" onclick="openEbHist()">Баримтын түүх (өмнөх өдрүүд)</button>'); hb = $('histBtn'); }
  if (hb) hb.style.display = ebEnabled() || load(LS_REC, []).some(function (r) { return r.ddtd; }) ? '' : 'none';
  if (!recs.length) {
    $('todayList').innerHTML = '<li class="muted">Өнөөдөр бичлэг алга байна</li>';
    return;
  }
  // Борлуулалтыг баримтаар бүлэглэнэ (нэг баримт = нэг мөр), бусад бичлэг (зарлага, касс хаалт) хэвээр
  var seen = {}, rows = [];
  recs.forEach(function (r) {
    if (r.type !== 'sale') { rows.push({ r: r }); return; }
    var k = billKey(r); if (seen[k]) return; seen[k] = 1; rows.push({ bill: k });
  });
  $('todayList').innerHTML = rows.map(function (row) {
    if (row.bill) {
      var b = billInfo(row.bill);
      return '<li class="bill-row" onclick="openBill(\'' + jsqS(row.bill) + '\')"><span><b>' + esc(b.items.slice(0, 3).join(', ') + (b.items.length > 3 ? ' +' + (b.items.length - 3) : '')) + '</b>' +
        '<small>' + esc(b.time) + ' · ' + esc(b.pays.join(' + ')) + (b.customer ? ' · ' + esc(b.customer) : '') + (b.disc ? ' · хөнгөлөлт ' + fmt(b.disc) : '') +
        (b.ddtd ? ' · баримттай' : '') + (b.retAll ? ' · <b>буцаагдсан</b>' : b.ret ? ' · хэсэгчлэн буцаасан' : '') + '</small></span>' +
        '<span class="amt ' + (b.net < 0 ? 'r' : 'g') + '">' + (b.net < 0 ? '−' + fmt(-b.net) : fmt(b.net)) + '</span>' +
        (b.retAll || b.net <= 0 ? '' : '<button class="mini neg bill-x" onclick="event.stopPropagation();billCancel(\'' + jsqS(row.bill) + '\')">Цуцлах</button>') + '</li>';
    }
    var r = row.r;
    if (r.type === 'collect') {
      return '<li><span>Төлбөр орсон · ' + esc(r.customer || '') + '<small>' + r.time + ' · ' + esc(r.pay) + '</small></span><span class="amt g">+' + fmt(r.amount) + '</span></li>';
    }
    if (r.type === 'expense') {
      return '<li><span>' + esc(r.category) + (r.note ? ' · ' + esc(r.note) : '') +
        '<small>' + r.time + ' · Зарлага</small></span><span class="amt r">−' + fmt(r.amount) + '</span></li>';
    }
    return '<li><span>Касс хаасан<small>' + r.time + ' · Тоолсон ' + fmt(r.counted) +
      '</small></span><span class="amt">' + (r.diff ? (r.diff > 0 ? '+' : '−') + fmt(Math.abs(r.diff)) : '✓') + '</span></li>';
  }).join('');
}
function jsqS(v) { return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
// ── Баримт: бүх мөр, хөнгөлөлт, төлбөр, буцаалт ──
function billLines(key) { return load(LS_REC, []).filter(function (r) { return r.type === 'sale' && r.biz === BIZ_KEY && billKey(r) === key; }); }
function billInfo(key) {
  var L = billLines(key), goods = L.filter(function (x) { return !isAdj(x.item) && x.amount > 0 && !/ \(буцаалт\)$/.test(x.item); });
  var pays = {}, disc = 0, ret = 0, net = 0;
  L.forEach(function (x) {
    net += Number(x.amount) || 0;
    if (baseItem(x.item) === DISC_ITEM && x.amount < 0) disc += -x.amount;
    if (/ \(буцаалт\)$/.test(x.item) && !isAdj(x.item)) ret += -x.amount;
  });
  // төлбөрийн хэлбэр тус бүрийн цэвэр дүн
  L.forEach(function (x) { if (!/ \(буцаалт\)$/.test(x.item)) pays[x.pay || 'Бэлэн'] = (pays[x.pay || 'Бэлэн'] || 0) + (Number(x.amount) || 0); });
  var gross = goods.reduce(function (a, x) { return a + x.amount; }, 0), f = L[0] || {};
  return { key: key, lines: L, goods: goods, items: goods.map(function (x) { return x.item + (x.qty !== 1 ? ' ×' + x.qty : ''); }), time: f.time || '', date: f.date || '', staff: f.staff || '',
    customer: f.customer || '', ddtd: (L.filter(function (x) { return x.ddtd; })[0] || {}).ddtd || '', pays: Object.keys(pays).filter(function (k) { return pays[k] > 0; }),
    payAmt: pays, disc: disc, gross: gross, ret: ret, retAll: L.some(function (x) { return x.returned; }) || (gross > 0 && ret >= gross - disc - 0.5), net: net };
}
function returnedQty(L, item) { return -L.filter(function (x) { return x.item === item + ' (буцаалт)'; }).reduce(function (a, x) { return a + (Number(x.qty) || 0); }, 0); }
function ensureBillSheet() {
  if ($('billSheet')) return;
  document.body.insertAdjacentHTML('beforeend', '<div class="sheet" id="billSheet" onclick="if(event.target===this)closeSheet(\'billSheet\')"><div class="panel bill-panel" id="billPanel"></div></div>');
}
function openBill(key) {
  ensureBillSheet();
  var b = billInfo(key), canRet = !b.retAll && b.goods.length;
  var rows = b.goods.map(function (x) {
    var back = returnedQty(b.lines, x.item);
    return '<tr><td>' + esc(x.item) + (back ? '<small>буцаасан ' + back + '</small>' : '') + '</td><td class="n">' + x.qty + ' × ' + fmt(x.price) + '</td><td class="n">' + fmt(x.amount) + '</td></tr>';
  }).join('');
  $('billPanel').innerHTML = '<div class="bill-h"><h2>Баримт</h2><button class="pos-x" onclick="closeSheet(\'billSheet\')">✕</button></div>' +
    '<p class="muted bill-meta">' + esc(b.date + ' ' + b.time) + ' · ' + esc(b.staff) + (b.customer ? ' · ' + esc(b.customer) : '') + (b.ddtd ? '<br>ДДТД ' + esc(b.ddtd) : '') + '</p>' +
    '<table class="bill-t">' + rows +
    (b.disc ? '<tr class="sub"><td>Хөнгөлөлт</td><td></td><td class="n neg">−' + fmt(b.disc) + '</td></tr>' : '') +
    (b.ret ? '<tr class="sub"><td>Буцаалт</td><td></td><td class="n neg">−' + fmt(b.ret) + '</td></tr>' : '') +
    '<tr class="tot"><td>Нийт</td><td></td><td class="n">' + fmt(b.net) + '</td></tr></table>' +
    '<p class="muted bill-pay">Төлбөр: ' + b.pays.map(function (k) { return esc(k) + ' ' + fmt(b.payAmt[k]); }).join(' + ') + '</p>' +
    '<div id="billRet"></div>' +
    '<div class="bill-acts"><button class="btn sm ghost2" onclick="printBill(\'' + jsqS(key) + '\')">Хэвлэх</button>' +
    (canRet ? '<button class="btn sm ghost2 neg" onclick="billCancel(\'' + jsqS(key) + '\')">Бүтнээр цуцлах</button>' : '') + (canRet ? (b.ddtd ? (typeof ebEnabled === 'function' && ebEnabled() ? '<button class="btn sm ghost2" onclick="closeSheet(\'billSheet\');ebReturn(\'' + b.goods[0].id + '\')">Бүтэн буцаах (И-баримт)</button>' : '') :
      '<button class="btn sm" onclick="billReturnForm(\'' + jsqS(key) + '\')">Буцаах</button>') : '') + '</div>' +
    (b.ddtd && canRet ? '<p class="muted" style="font-size:12px;margin-top:8px">И-баримттай баримтыг хэсэгчлэн буцаахдаа «Баримтын түүх» → «Засах»-аар шинэ баримт гаргана.</p>' : '');
  openSheet('billSheet');
}
// Буцаалт: мөр бүрээр тоо сонгож, шалтгаан бичнэ. Хөнгөлөлттэй баримт бол хөнгөлөлтийн хувиар бууруулж буцаана.
var RET_REASONS = ['Гэмтэлтэй, чанаргүй', 'Солих (өөр бараа авна)', 'Таалагдаагүй', 'Буруу бараа өгсөн', 'Бусад'];
function billReturnForm(key) {
  var b = billInfo(key);
  $('billRet').innerHTML = '<div class="ret-box"><b>Юуг буцаах вэ?</b>' + b.goods.map(function (x, i) {
    var left = Math.round((x.qty - returnedQty(b.lines, x.item)) * 1000) / 1000;
    return left > 0 ? '<label class="ret-l"><input type="checkbox" id="rtc' + i + '" checked> <span>' + esc(x.item) + '</span><input type="number" id="rtq' + i + '" min="0" max="' + left + '" step="any" value="' + left + '"><small>/ ' + left + '</small></label>' : '';
  }).join('') + '<label>Шалтгаан</label><select id="rtWhy">' + RET_REASONS.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select>' +
    '<input id="rtNote" placeholder="Нэмэлт тайлбар (заавал биш)" style="margin-top:6px">' +
    '<button class="btn" onclick="billReturnSave(\'' + jsqS(key) + '\')">Буцаалт бүртгэх</button></div>';
}
function billReturnSave(key) {
  var b = billInfo(key), ratio = b.gross ? b.disc / b.gross : 0, out = [];
  var why = $('rtWhy').value + ($('rtNote').value.trim() ? ' · ' + $('rtNote').value.trim() : '');
  var mainPay = (b.goods[0] || {}).pay || 'Бэлэн';
  b.goods.forEach(function (x, i) {
    var cb = $('rtc' + i); if (!cb || !cb.checked) return;
    var left = x.qty - returnedQty(b.lines, x.item), q = Math.min(left, Number($('rtq' + i).value) || 0);
    if (!(q > 0)) return;
    var unit = Math.round(x.price * (1 - ratio) * 100) / 100;
    out.push({ type: 'sale', item: x.item + ' (буцаалт)', qty: -q, unit: x.unit, price: unit, amount: -Math.round(q * unit), pay: mainPay, bill: key, customer: x.customer || '', note: 'Буцаалт: ' + why });
  });
  if (!out.length) { toast('Буцаах бараа, тоогоо сонгоно уу'); return; }
  var tot = -out.reduce(function (a, r) { return a + r.amount; }, 0);
  if (!confirm('Буцаалт: ' + out.map(function (r) { return baseItem(r.item) + ' ×' + (-r.qty); }).join(', ') + '\nХэрэглэгчид буцаах: ' + fmt(tot) + ' (' + mainPay + ')\nШалтгаан: ' + why)) return;
  out.forEach(function (r) { stockTake(r.item, r.qty); });
  addRecords(out); toast('Буцаалт бүртгэгдлээ — бараа үлдэгдэлд нэмэгдлээ'); openBill(key);
}
// Баримтыг бүтнээр цуцлах: И-баримттай бол PosAPI-аар буцаана, үгүй бол буцаалтын мөр бичиж бараа үлдэгдэлд нэмнэ
function billCancel(key) {
  var b = billInfo(key); if (!b.goods.length || b.retAll) return;
  if (b.ddtd) { if (typeof ebEnabled === 'function' && ebEnabled()) { closeSheet('billSheet'); ebReturn(b.goods[0].id); } else toast('И-баримттай баримтыг цуцлахад PosAPI асаалттай байх ёстой'); return; }
  var ratio = b.gross ? b.disc / b.gross : 0, mainPay = b.goods[0].pay || 'Бэлэн', out = [];
  b.goods.forEach(function (x) {
    var q = x.qty - returnedQty(b.lines, x.item); if (!(q > 0)) return;
    var unit = Math.round(x.price * (1 - ratio) * 100) / 100;
    out.push({ type: 'sale', item: x.item + ' (буцаалт)', qty: -q, unit: x.unit, price: unit, amount: -Math.round(q * unit), pay: mainPay, bill: key, customer: x.customer || '', note: 'Буцаалт: Баримт цуцалсан' });
  });
  if (!out.length) return;
  var tot = -out.reduce(function (a, r) { return a + r.amount; }, 0);
  if (!confirm('Баримтыг бүтнээр цуцлах уу?\n' + b.items.join(', ') + '\nБуцаах: ' + fmt(tot) + ' (' + mainPay + ')' + (mainPay === 'StorePay' ? '\nStorePay-ийн мөнгийг StorePay-аас өөрөө буцаана уу.' : ''))) return;
  out.forEach(function (r) { stockTake(r.item, r.qty); });
  addRecords(out); closeSheet('billSheet'); toast('Баримт цуцлагдлаа — бараа үлдэгдэлд нэмэгдлээ');
}
// ── Баркод: утасны камераар уншуулж барааг сагсанд нэмнэ (Chrome Android / компьютер) ──
// Бүртгэлгүй баркод уншигдвал «аль бараа вэ?» гэж асууж холбоно — дараа нь автоматаар таньна.
var scan = { stream: null, timer: null, det: null, last: '', lastAt: 0, pending: '' };
function bcMap() { return load('nb_bc_' + BIZ_KEY, {}) || {}; }
function scanOpen() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert('Камер ашиглах боломжгүй — Chrome хөтөч, https хаяг дээр нээнэ үү.'); return; }
  var go = function () {
    ensureScanBox(); $('scanBox').style.display = 'flex'; $('scanMsg').textContent = 'Баркодоо камерт ойртуулна уу';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (st) {
      scan.stream = st; var v = $('scanVideo'); v.srcObject = st; v.play();
      if ('BarcodeDetector' in window) { scan.det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'] }); scan.timer = setInterval(scanTick, 350); }
      else $('scanMsg').textContent = 'Энэ хөтөч баркод уншихыг дэмжихгүй — Chrome ашиглана уу';
    }).catch(function (e) { $('scanMsg').textContent = 'Камер нээгдсэнгүй: ' + ((e && e.message) || e); });
  };
  go();
}
function scanClose() { clearInterval(scan.timer); if (scan.stream) scan.stream.getTracks().forEach(function (t) { t.stop(); }); scan.stream = null; var b = $('scanBox'); if (b) b.style.display = 'none'; scan.pending = ''; }
function ensureScanBox() {
  if ($('scanBox')) return;
  document.querySelector('#saleSheet .panel').insertAdjacentHTML('beforeend', '<div class="scan-box" id="scanBox" style="display:none"><div class="scan-in"><video id="scanVideo" playsinline muted></video><div class="scan-line"></div></div>' +
    '<div class="scan-msg" id="scanMsg"></div><div id="scanAsk"></div><button class="btn sm" onclick="scanClose()">Дуусгах</button></div>');
}
function scanTick() {
  var v = $('scanVideo'); if (!v || v.readyState < 2 || scan.pending) return;
  scan.det.detect(v).then(function (r) {
    if (!r.length) return; var code = r[0].rawValue, now = Date.now();
    if (code === scan.last && now - scan.lastAt < 2000) return; scan.last = code; scan.lastAt = now;
    scanHandle(code);
  }).catch(function () {});
}
function scanHandle(code) {
  var name = bcMap()[code], i = name ? products.findIndex(function (p) { return p.name === name; }) : -1;
  if (i >= 0) { pickProduct(i); $('scanMsg').textContent = '✓ ' + name; if (navigator.vibrate) navigator.vibrate(60); return; }
  scan.pending = code; var opts = products.map(function (p, k) { return '<option value="' + k + '">' + esc(p.name) + '</option>'; }).join('');
  $('scanMsg').textContent = 'Шинэ баркод ' + code + ' — аль бараа вэ?';
  $('scanAsk').innerHTML = '<select id="scanSel"><option value="">— Бараа сонгох —</option>' + opts + '</select><div class="sp-acts"><button class="btn sm" onclick="scanLink()">Холбох</button><button class="btn sm ghost2" onclick="scan.pending=\'\';$(\'scanAsk\').innerHTML=\'\'">Алгасах</button></div>';
}
function scanLink() {
  var k = $('scanSel').value, code = scan.pending; if (k === '' || !code) { toast('Бараагаа сонгоно уу'); return; }
  var p = products[Number(k)], m = bcMap(); m[code] = p.name; save('nb_bc_' + BIZ_KEY, m);
  if (API_URL) fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ type: 'barcode_set', token: session ? session.token : '', code: code, name: p.name }) }).catch(function () {});
  scan.pending = ''; $('scanAsk').innerHTML = ''; pickProduct(Number(k)); $('scanMsg').textContent = '✓ Холбогдлоо: ' + p.name;
}

// Энгийн баримт хэвлэх (И-баримтгүй дэлгүүрт ч)
function printBill(key) {
  var b = billInfo(key), w = window.open('', '_blank', 'width=380,height=600'); if (!w) { toast('Цонх нээгдсэнгүй — хөтчийн popup-ыг зөвшөөрнө үү'); return; }
  w.document.write('<!doctype html><meta charset="utf-8"><title>Баримт</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:14px;max-width:300px}h3{text-align:center;margin:0 0 4px}p{margin:2px 0;text-align:center;color:#555}table{width:100%;border-collapse:collapse;margin-top:10px}td{padding:3px 0;border-bottom:1px dashed #ccc}td.n{text-align:right}tr.t td{font-weight:bold;border-bottom:0;padding-top:6px}</style>' +
    '<h3>' + esc(BIZ.name) + '</h3><p>' + esc(b.date + ' ' + b.time) + '</p><p>Ажилтан: ' + esc(b.staff) + '</p><table>' +
    b.goods.map(function (x) { return '<tr><td>' + esc(x.item) + '<br><small>' + x.qty + ' × ' + fmt(x.price) + '</small></td><td class="n">' + fmt(x.amount) + '</td></tr>'; }).join('') +
    (b.disc ? '<tr><td>Хөнгөлөлт</td><td class="n">−' + fmt(b.disc) + '</td></tr>' : '') + (b.ret ? '<tr><td>Буцаалт</td><td class="n">−' + fmt(b.ret) + '</td></tr>' : '') +
    '<tr class="t"><td>НИЙТ</td><td class="n">' + fmt(b.net) + '</td></tr></table><p style="margin-top:8px">' + b.pays.map(function (k) { return esc(k) + ' ' + fmt(b.payAmt[k]); }).join(' + ') + '</p>' +
    (b.ddtd ? '<p>ДДТД ' + esc(b.ddtd) + '</p>' : '') + '<p style="margin-top:10px">Баярлалаа!</p><script>window.print()<\/script>');
  w.document.close();
}

// ── Modal ──
function openSheet(id) { $(id).classList.add('show'); }
function closeSheet(id) { var e = $(id); if (e) e.classList.remove('show'); }

document.addEventListener('DOMContentLoaded', init);

// ── Удирдлагаас ирсэн даалгавар (нэвтрэхэд хуудасны дээд хэсэгт) ──
var myTasks = [];
function loadTasks() {
  if (!API_URL || !session || !session.token) return;
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ type: 'tasks', token: session.token }) })
    .then(function (r) { return r.json(); }).then(function (d) { if (d && d.status === 'ok') { myTasks = d.tasks; renderTasks(); } }).catch(function () {});
}
function renderTasks() {
  var box = $('taskBox');
  if (!box) { box = document.createElement('div'); box.id = 'taskBox'; var anchor = document.querySelector('#main .big-btns'); anchor.parentNode.insertBefore(box, anchor); }
  var open = myTasks.filter(function (t) { return t.status === 'Шинэ'; });
  box.innerHTML = open.length ? '<div class="card task-card"><h2>Удирдлагаас ирсэн даалгавар (' + open.length + ')</h2><ul class="list">' + open.map(function (t) {
    var late = t.due && t.due < todayStr();
    return '<li><span>' + esc(t.title) + (t.note ? '<small>' + esc(t.note) + '</small>' : '') + '<small>' + (t.due ? 'Хугацаа: ' + t.due + (late ? ' · хэтэрсэн' : '') : '') + ' · ' + esc(t.from || '') + '</small></span>' +
      '<button class="mini" style="color:var(--green)" onclick="taskDone(\'' + t.id + '\')">Хийсэн</button></li>';
  }).join('') + '</ul></div>' : '';
}
function taskDone(id) {
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ type: 'task_done', id: id, token: session.token }) })
    .then(function (r) { return r.json(); }).then(function (d) { if (d && d.status === 'ok') { toast('Тэмдэглэгдлээ'); loadTasks(); } else toast('Алдаа гарлаа'); })
    .catch(function () { toast('Интернэт холболтоо шалгана уу'); });
}
