// ── АЖИЛТНЫ ХУУДАС ──
// HTML файл бүр `var BIZ_KEY = 'meat' | 'cozy' | 'travel'` гэж зааж өгөөд энэ файлыг ачаална.

var BIZ = BUSINESSES[BIZ_KEY];
var LS_REC = 'nb_records';     // энэ төхөөрөмж дээрх бүх бичлэг (өнөөдрийн жагсаалт + туршилтын горим)
var LS_QUEUE = 'nb_queue';     // интернэт тасарсан үед илгээгдээгүй бичлэг
var LS_SESSION = 'nb_session_' + BIZ_KEY;   // { name, role, date } — тухайн өдөрт л хүчинтэй
var LS_PROD = 'nb_products_' + BIZ_KEY;

var session = load(LS_SESSION, null);
if (!session || session.date !== todayStr()) session = null;
var staffName = session ? session.name : '';
var isManager = !!(session && session.role === 'manager');
var sheetProducts = load(LS_PROD, []);   // Sheet-ийн "Бараа" хуудасны мөрүүд (үнэ давхарлах)
var products = mergeProducts(BIZ.products, sheetProducts);
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
  flushQueue();
  setInterval(flushQueue, 60000);
  window.addEventListener('online', flushQueue);
}

// ── Нэвтрэх (4 оронтой код, Sheet-ийн "Ажилтан" хуудсаар шалгана) ──
function showLogin() {
  $('login').style.display = 'block';
  $('codeInput').value = '';
  $('codeInput').focus();
}
function onCodeInput() {
  var v = $('codeInput').value.replace(/\D/g, '').slice(0, 4);
  $('codeInput').value = v;
  if (v.length === 4) doLogin();
}
function doLogin() {
  var code = $('codeInput').value.trim();
  if (!/^\d{4}$/.test(code)) { toast('4 оронтой кодоо оруулна уу'); return; }
  if (!API_URL) {   // туршилтын горим
    if (code !== '0000') { loginFail('Туршилтын горимд код: 0000'); return; }
    return loginOk({ name: 'Туршилт', role: 'manager' });
  }
  $('codeInput').disabled = true;
  $('loginMsg').textContent = 'Шалгаж байна...';
  jsonp({ action: 'login', biz: BIZ_KEY, code: code }, function (err, data) {
    $('codeInput').disabled = false;
    if (err) { loginFail('Интернэт холболтоо шалгана уу'); return; }
    if (!data || data.status !== 'ok') {
      loginFail(data && data.error === 'locked' ? 'Олон удаа буруу оруулсан — 10 минутын дараа оролдоно уу' : 'Код буруу байна');
      return;
    }
    loginOk(data);
  });
}
function loginOk(d) {
  session = { name: d.name, role: d.role, date: todayStr() };
  save(LS_SESSION, session);
  staffName = session.name;
  isManager = session.role === 'manager';
  $('loginMsg').textContent = '';
  showMain();
}
function loginFail(msg) {
  $('loginMsg').textContent = msg;
  $('codeInput').value = '';
  $('codeInput').focus();
}
function logout() {
  if (!confirm('Гарах уу? Дараагийн ажилтан өөрийн кодоор нэвтэрнэ.')) return;
  save(LS_SESSION, null);
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
}

// ── Бараа ──
// Үндсэн жагсаалт config.js / products.js-д (БҮНА кодтой), Sheet-ийн "Бараа" хуудас үнэ/нэгжийг давхарлаж, шинэ бараа нэмнэ.
function mergeProducts(base, extra) {
  var list = base.map(function (p) { return { name: p.name, unit: p.unit, price: p.price, cls: p.cls, cat: p.cat || '' }; });
  var byName = {};
  list.forEach(function (p) { byName[p.name.toLowerCase()] = p; });
  (extra || []).forEach(function (x) {
    var p = byName[String(x.name).toLowerCase()];
    if (p) { if (x.price) p.price = x.price; if (x.unit) p.unit = x.unit; }
    else list.push({ name: x.name, unit: x.unit || BIZ.unit, price: x.price || 0, cls: '' });
  });
  return list;
}
function loadProducts() {
  if (!API_URL) return;
  jsonp({ action: 'products', biz: BIZ_KEY }, function (err, data) {
    if (err || !data || !data.products) return;
    sheetProducts = data.products;
    save(LS_PROD, sheetProducts);
    products = mergeProducts(BIZ.products, sheetProducts);
  });
}

// ── Борлуулалт (сагс: олон бараа → нэг баримт) ──
function openSale() {
  sale = { cart: [], pay: 'Бэлэн', cat: '' };
  $('saleSearch').value = '';
  $('saleSearchWrap').style.display = products.length > 12 ? 'block' : 'none';
  renderCats();
  renderChips();
  $('saleItem').value = '';
  $('salePrice').value = '';
  $('saleTin').value = '';
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
    return '<button class="chip cat' + (sale.cat === v ? ' on' : '') + '" onclick="setCat(' + esc(JSON.stringify(v)) + ')">' + esc(c) + '</button>';
  }).join('');
}
function setCat(c) { sale.cat = c; renderCats(); renderChips(); }
// Хайлт + ангиллаар шүүж бараа харуулна (эхний 24-ийг)
function renderChips() {
  var q = $('saleSearch').value.trim().toLowerCase();
  var shown = [];
  products.forEach(function (p, i) {
    if (sale.cat && p.cat !== sale.cat) return;
    if (!q || p.name.toLowerCase().indexOf(q) >= 0) shown.push(i);
  });
  var more = shown.length > 24 ? shown.length - 24 : 0;
  $('saleChips').innerHTML = shown.slice(0, 24).map(function (i) {
    var inCart = sale.cart.some(function (l) { return l.name === products[i].name; });
    return '<button class="chip' + (inCart ? ' on' : '') + '" onclick="pickProduct(' + i + ')">' + esc(products[i].name) + (products[i].price ? ' <small>' + fmt(products[i].price) + '</small>' : '') + '</button>';
  }).join('') + (more ? '<span class="muted" style="align-self:center">+' + more + ' бараа — хайлтаар олно уу</span>' : '') +
    (!shown.length ? '<span class="muted">Олдсонгүй — доор нэрийг нь бичнэ үү</span>' : '');
}
// Бараа дарахад сагсанд нэмнэ (байгаа бол тоог нь 1-ээр нэмнэ)
function pickProduct(i) {
  var p = products[i];
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
    el.innerHTML = '<li class="muted">Сагс хоосон — дээрээс бараа дарж нэмнэ үү</li>';
  } else {
    el.innerHTML = sale.cart.map(function (l, i) {
      var lock = !isManager && l.listPrice > 0;   // худалдагч жагсаалтын үнийг сольж чадахгүй
      return '<li class="cart-line"><div class="cl-name">' + esc(l.name) +
        '<button class="cl-del" onclick="removeLine(' + i + ')" aria-label="Хасах">✕</button></div>' +
        '<div class="cl-row">' +
        '<span class="cl-qty"><button onclick="stepQty(' + i + ',-1)">−</button>' +
        '<input type="number" inputmode="decimal" step="any" min="0" value="' + l.qty + '" oninput="setLine(' + i + ',\'qty\',this.value)">' +
        '<button onclick="stepQty(' + i + ',1)">＋</button><small>' + esc(l.unit) + '</small></span>' +
        '<span class="cl-x">×</span>' +
        '<input class="cl-price" type="number" inputmode="numeric" min="0" value="' + l.price + '"' + (lock ? ' readonly title="Үнийг менежер л солино"' : '') +
        ' oninput="setLine(' + i + ',\'price\',this.value)">' +
        '<b class="cl-sum" id="clSum' + i + '">' + fmt((Number(l.qty) || 0) * (Number(l.price) || 0)) + '</b></div></li>';
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
  sale.pay = v;
  var b = $('paySeg').children;
  for (var k = 0; k < b.length; k++) b[k].classList.toggle('on', b[k].dataset.v === v);
}
function cartTotal() {
  return sale.cart.reduce(function (a, l) { return a + Math.round((Number(l.qty) || 0) * (Number(l.price) || 0)); }, 0);
}
function calcSale() {
  $('saleTotal').textContent = fmt(cartTotal());
  $('saleCount').textContent = sale.cart.length ? sale.cart.length + ' бараа' : '';
}
function submitSale() {
  if (!sale.cart.length) { toast('Сагсанд бараа нэмнэ үү'); return; }
  for (var i = 0; i < sale.cart.length; i++) {
    var l = sale.cart[i];
    if (!(Number(l.qty) > 0)) { toast(l.name + ' — тоо хэмжээ оруулна уу'); return; }
    if (!(Number(l.price) > 0)) { toast(l.name + ' — үнэ оруулна уу'); return; }
  }
  var bill = BIZ_KEY + '-' + Date.now();
  var lines = sale.cart.map(function (l) {
    var r = {
      type: 'sale', item: l.name, qty: Number(l.qty), unit: l.unit, price: Number(l.price),
      amount: Math.round(Number(l.qty) * Number(l.price)), pay: sale.pay, bill: bill,
    };
    if (l.cls) r.classificationCode = l.cls;   // БҮНА код (И-баримтад)
    return r;
  });
  if (!ebEnabled()) { finishSale(lines); return; }
  var noCls = lines.filter(function (r) { return !r.classificationCode && !ebConfig().classificationCode; });
  if (noCls.length) {
    toast('И-баримтад ангилал хэрэгтэй: «' + noCls[0].item + '» — жагсаалтаас сонгоно уу');
    return;
  }

  // И-баримт гаргаад дараа нь хадгална
  var tin = $('saleTin').value.trim();
  var btn = $('saleSubmit');
  btn.disabled = true;
  btn.textContent = '🧾 Баримт гаргаж байна...';
  ebSend(ebBuildRequest(lines, { tin: tin }), function (err, res) {
    btn.disabled = false;
    btn.textContent = 'Төлбөр авах';
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
      if (tin) r.buyerTin = tin;
      r.note = 'ДДТД ' + res.id + (tin ? ' · ТТД ' + tin : '');
    });
    finishSale(lines);
    ebShowReceipt(res, lines);
  });
}
function finishSale(lines) {
  addRecords(lines);
  closeSheet('saleSheet');
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
function addRecords(list) {
  var now = new Date();
  var all = load(LS_REC, []);
  var q = load(LS_QUEUE, []);
  list.forEach(function (r, i) {
    r.id = BIZ_KEY + '-' + now.getTime() + '-' + i;
    r.biz = BIZ_KEY;
    r.date = todayStr(now);
    r.time = timeStr(now);
    r.staff = staffName;
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
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ records: q }) })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.status === 'ok') {
        var sent = {};
        q.forEach(function (r) { sent[r.id] = 1; });
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
  el.textContent = '⏳ ' + n + ' бичлэг илгээгдээгүй байна. Интернэт орохоор автоматаар илгээгдэнэ.';
}

// ── Өнөөдрийн жагсаалт ──
function todayRecords() {
  var d = todayStr();
  return load(LS_REC, []).filter(function (r) { return r.biz === BIZ_KEY && r.date === d; });
}
function todayTotals() {
  var t = { cash: 0, card: 0, transfer: 0, exp: 0, sales: 0 };
  todayRecords().forEach(function (r) {
    if (r.type === 'sale') {
      t.sales += r.amount;
      if (r.pay === 'Карт') t.card += r.amount;
      else if (r.pay === 'Шилжүүлэг') t.transfer += r.amount;
      else t.cash += r.amount;
    } else if (r.type === 'expense') t.exp += r.amount;
  });
  return t;
}
function renderToday() {
  var t = todayTotals();
  $('sumSales').textContent = fmt(t.sales);
  $('sumExp').textContent = fmt(t.exp);
  $('sumNet').textContent = fmt(t.sales - t.exp);
  var recs = todayRecords().slice().reverse();
  if (!recs.length) {
    $('todayList').innerHTML = '<li class="muted">Өнөөдөр бичлэг алга байна</li>';
    return;
  }
  var retShown = {};
  $('todayList').innerHTML = recs.map(function (r) {
    if (r.type === 'sale') {
      var showRet = r.ddtd && !r.returned && r.amount > 0 && !retShown[r.ddtd];
      if (showRet) retShown[r.ddtd] = 1;
      return '<li><span>' + esc(r.item) + ' · ' + r.qty + ' ' + esc(r.unit) +
        '<small>' + r.time + ' · ' + esc(r.pay) + (r.ddtd ? ' · 🧾 баримттай' : '') + (r.returned ? ' · ↩ буцаагдсан' : '') + '</small>' +
        (r.ddtd || /ДДТД/.test(r.note || '') ? '<small class="ddtd">ДДТД ' + esc(r.ddtd || (r.note.match(/ДДТД (\d+)/) || [])[1] || '') + '</small>' : '') +
        (showRet ? '<button class="mini" onclick="ebReturn(\'' + r.id + '\')">↩ Баримт буцаах</button>' : '') +
        '</span><span class="amt ' + (r.amount < 0 ? 'r' : 'g') + '">' + (r.amount < 0 ? '−' + fmt(-r.amount) : '+' + fmt(r.amount)) + '</span></li>';
    }
    if (r.type === 'expense') {
      return '<li><span>' + esc(r.category) + (r.note ? ' · ' + esc(r.note) : '') +
        '<small>' + r.time + ' · Зарлага</small></span><span class="amt r">−' + fmt(r.amount) + '</span></li>';
    }
    return '<li><span>🔒 Касс хаасан<small>' + r.time + ' · Тоолсон ' + fmt(r.counted) +
      '</small></span><span class="amt">' + (r.diff ? (r.diff > 0 ? '+' : '−') + fmt(Math.abs(r.diff)) : '✓') + '</span></li>';
  }).join('');
}

// ── Modal ──
function openSheet(id) { $(id).classList.add('show'); }
function closeSheet(id) { $(id).classList.remove('show'); }

document.addEventListener('DOMContentLoaded', init);
