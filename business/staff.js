// ── АЖИЛТНЫ ХУУДАС ──
// HTML файл бүр `var BIZ_KEY = 'meat' | 'cozy' | 'travel'` гэж зааж өгөөд энэ файлыг ачаална.

var BIZ = BUSINESSES[BIZ_KEY];
var LS_REC = 'nb_records';     // энэ төхөөрөмж дээрх бүх бичлэг (өнөөдрийн жагсаалт + туршилтын горим)
var LS_QUEUE = 'nb_queue';     // интернэт тасарсан үед илгээгдээгүй бичлэг
var LS_NAME = 'nb_name_' + BIZ_KEY;
var LS_PROD = 'nb_products_' + BIZ_KEY;

var staffName = load(LS_NAME, '');
var products = load(LS_PROD, BIZ.products);
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
  if (staffName) showMain(); else $('login').style.display = 'block';
  loadProducts();
  flushQueue();
  setInterval(flushQueue, 60000);
  window.addEventListener('online', flushQueue);
}

// ── Нэвтрэх ──
function doLogin() {
  var n = $('nameInput').value.trim();
  if (!n) { toast('Нэрээ бичнэ үү'); return; }
  staffName = n;
  save(LS_NAME, n);
  showMain();
}
function logout() {
  if (!confirm('Гарах уу?')) return;
  staffName = '';
  save(LS_NAME, '');
  location.reload();
}
function showMain() {
  $('login').style.display = 'none';
  $('main').style.display = 'block';
  $('who').textContent = staffName;
  $('today').textContent = todayStr();
  renderEbBadge();
  renderToday();
  if (typeof ebCheckInfo === 'function') { ebCheckInfo(); setInterval(ebCheckInfo, 30 * 60000); }
}

// ── Бараа (Sheet-ийн "Бараа" хуудаснаас шинэчлэгдэнэ) ──
function loadProducts() {
  if (!API_URL) return;
  jsonp({ action: 'products', biz: BIZ_KEY }, function (err, data) {
    if (err || !data || !data.products || !data.products.length) return;
    products = data.products;
    save(LS_PROD, products);
  });
}

// ── Борлуулалт ──
function openSale() {
  sale = { item: '', unit: BIZ.unit, price: '', qty: '', pay: 'Бэлэн' };
  $('saleChips').innerHTML = products.map(function (p, i) {
    return '<button class="chip" onclick="pickProduct(' + i + ')">' + esc(p.name) + '</button>';
  }).join('');
  $('saleItem').value = '';
  $('saleQty').value = '';
  $('salePrice').value = '';
  $('saleUnit').textContent = 'Тоо (' + BIZ.unit + ')';
  $('saleTin').value = '';
  $('saleTinWrap').style.display = ebEnabled() ? 'block' : 'none';
  setPay('Бэлэн');
  calcSale();
  openSheet('saleSheet');
}
function pickProduct(i) {
  var p = products[i];
  var chips = $('saleChips').children;
  for (var k = 0; k < chips.length; k++) chips[k].classList.toggle('on', k === i);
  $('saleItem').value = p.name;
  sale.unit = p.unit || BIZ.unit;
  $('saleUnit').textContent = 'Тоо (' + sale.unit + ')';
  if (p.price) $('salePrice').value = p.price;
  calcSale();
  $('saleQty').focus();
}
function setPay(v) {
  sale.pay = v;
  var b = $('paySeg').children;
  for (var k = 0; k < b.length; k++) b[k].classList.toggle('on', b[k].dataset.v === v);
}
function calcSale() {
  var q = parseFloat($('saleQty').value) || 0;
  var p = parseFloat($('salePrice').value) || 0;
  $('saleTotal').textContent = fmt(q * p);
}
function submitSale() {
  var item = $('saleItem').value.trim();
  var qty = parseFloat($('saleQty').value) || 0;
  var price = parseFloat($('salePrice').value) || 0;
  if (!item) { toast('Бараагаа сонгоно уу'); return; }
  if (qty <= 0) { toast('Тоо хэмжээ оруулна уу'); return; }
  if (price <= 0) { toast('Үнэ оруулна уу'); return; }
  var r = {
    type: 'sale', item: item, qty: qty, unit: sale.unit, price: price,
    amount: Math.round(qty * price), pay: sale.pay,
  };
  if (!ebEnabled()) { finishSale(r); return; }

  // И-баримт гаргаад дараа нь хадгална
  var tin = $('saleTin').value.trim();
  var btn = $('saleSubmit');
  btn.disabled = true;
  btn.textContent = '🧾 Баримт гаргаж байна...';
  ebSend(ebBuildRequest(r, { tin: tin }), function (err, res) {
    btn.disabled = false;
    btn.textContent = 'Хадгалах';
    if (err) {
      if (confirm('И-баримт гарсангүй:\n' + err.message + '\n\nБаримтгүйгээр борлуулалтаа хадгалах уу?')) {
        r.note = 'И-баримт гараагүй';
        finishSale(r);
      }
      return;
    }
    r.ddtd = res.id;
    r.ebDate = res.date;
    if (tin) r.buyerTin = tin;
    r.note = 'ДДТД ' + res.id + (tin ? ' · ТТД ' + tin : '');
    finishSale(r);
    ebShowReceipt(res, r);
  });
}
function finishSale(r) {
  addRecord(r);
  closeSheet('saleSheet');
  toast('✓ Борлуулалт бичигдлээ: ' + fmt(r.amount));
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
function addRecord(r) {
  var now = new Date();
  r.id = BIZ_KEY + '-' + now.getTime();
  r.biz = BIZ_KEY;
  r.date = todayStr(now);
  r.time = timeStr(now);
  r.staff = staffName;
  var all = load(LS_REC, []);
  all.push(r);
  // зөвхөн сүүлийн 60 хоногийг төхөөрөмжид үлдээнэ
  var cutoff = todayStr(new Date(Date.now() - 60 * 864e5));
  all = all.filter(function (x) { return x.date >= cutoff; });
  save(LS_REC, all);
  if (API_URL) {
    var q = load(LS_QUEUE, []);
    q.push(r);
    save(LS_QUEUE, q);
    flushQueue();
  }
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
  $('todayList').innerHTML = recs.map(function (r) {
    if (r.type === 'sale') {
      return '<li><span>' + esc(r.item) + ' · ' + r.qty + ' ' + esc(r.unit) +
        '<small>' + r.time + ' · ' + esc(r.pay) + (r.ddtd ? ' · 🧾 баримттай' : '') + (r.returned ? ' · ↩ буцаагдсан' : '') + '</small>' +
        (r.ddtd || /ДДТД/.test(r.note || '') ? '<small class="ddtd">ДДТД ' + esc(r.ddtd || (r.note.match(/ДДТД (\d+)/) || [])[1] || '') + '</small>' : '') +
        (r.ddtd && !r.returned && r.amount > 0 ? '<button class="mini" onclick="ebReturn(\'' + r.id + '\')">↩ Буцаах</button>' : '') +
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
