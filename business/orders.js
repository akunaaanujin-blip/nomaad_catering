// ── ЗАХИАЛГА (Cozy: Facebook-ээр ирсэн захиалга → буухиа хүргэлт) ──
// Ажилтан захиалгаа шивнэ → өдөр бүр «Буухиа Excel» товчоор буухиа.mn-ийн импортын загвараар файл гарна →
// «Буухиад өгсөн» болгоход борлуулалт санхүүд бичигдэнэ (төлбөр ороогүй бол авлага) → мөнгө ормогц «Төлбөр орсон».

var ORD_STATUS = ['Шинэ', 'Буухиад өгсөн', 'Хүргэгдсэн', 'Цуцалсан'];
var ORD_PAYTYPE = ['Шилжүүлэг', 'Хүргэлтээр бэлэн', 'Дансаар дараа'];
var LS_ORD = 'nb_orders_' + (typeof BIZ_KEY !== 'undefined' ? BIZ_KEY : 'cozy');
var orders = load(LS_ORD, []), ordTab = 'new', ordEdit = null, ordCart = [];

// Хаягаас дүүрэг, хороо таних (буухиа «Дүүрэг / сум *» баганад)
var DISTRICTS = [
  ['Баянзүрх', /(^|[^а-яөү])(бзд|баянзүрх|bzd|bayanzurh|baynzurh)/i], ['Баянгол', /(^|[^а-яөү])(бгд|баянгол|bgd|bayangol)/i],
  ['Сүхбаатар', /(^|[^а-яөү])(сбд|sbd|сүхбаатар дүүрэг)/i], ['Чингэлтэй', /(^|[^а-яөү])(чд|чингэлтэй|chd|chingeltei)/i],
  ['Хан-Уул', /(^|[^а-яөү])(худ|хан-уул|хан уул|hud|khan-uul|han uul)/i], ['Сонгинохайрхан', /(^|[^а-яөү])(схд|сонгинохайрхан|shd|sxd|songino)/i],
  ['Налайх', /налайх|nalaikh/i], ['Багануур', /багануур|баганур|baganuur/i], ['Багахангай', /багахангай/i],
];
function guessDistrict(t) { var d = DISTRICTS.filter(function (x) { return x[1].test(t || ''); })[0]; return d ? d[0] : ''; }
function guessKhoroo(t) { var m = String(t || '').match(/(\d{1,2})\s*-?\s*(р|r|дүгээр|дугаар)?\s*(хороо|horoo)/i); return m ? m[1] + '-р хороо' : ''; }
function isProvince(t) { return /унаанд|машинд|автобус|unaand|mashind/i.test(t || ''); }
function ordItems(o) { try { return typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || []); } catch (e) { return [{ name: String(o.items), qty: 1, price: o.amount }]; } }
function ordItemsText(o) { return ordItems(o).map(function (i) { return i.name + (i.qty > 1 ? ' x' + i.qty : ''); }).join(', '); }

// ── Сервертэй ──
function ordPost(body, cb) {
  if (!API_URL) { cb(null, { status: 'ok' }); return; }
  body.token = session ? session.token : '';
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); }).then(function (d) { cb(d && d.status === 'ok' ? null : (d && d.error) || 'error', d); })
    .catch(function () { cb('network'); });
}
function loadOrders() {
  if (!API_URL) { renderOrders(); return; }
  ordPost({ type: 'orders' }, function (err, d) {
    if (!err) { orders = d.orders; save(LS_ORD, orders); }
    renderOrders();
  });
}
function saveOrder(o, done) {
  var body = { type: 'order_save', order: Object.assign({}, o, { biz: BIZ_KEY, items: typeof o.items === 'string' ? o.items : JSON.stringify(o.items || []) }) };
  if (!API_URL) {
    o.biz = BIZ_KEY;
    if (!o.id) { o.id = 'O' + Date.now(); o.date = todayStr(); o.time = timeStr(); o.staff = staffName; orders.push(o); }
    else orders = orders.map(function (x) { return x.id === o.id ? Object.assign(x, o) : x; });
    save(LS_ORD, orders); done && done(o); renderOrders(); return;
  }
  ordPost(body, function (err, d) {
    if (err) { toast(err === 'phone' ? 'Утасны дугаар 8 оронтой байна' : err === 'network' ? 'Интернэт холболтоо шалгана уу' : 'Алдаа: ' + err); return; }
    var saved = d.order; saved.items = ordItems(saved);
    var i = orders.findIndex(function (x) { return x.id === saved.id; });
    if (i >= 0) orders[i] = saved; else orders.push(saved);
    save(LS_ORD, orders); done && done(saved); renderOrders();
  });
}

// ── Санхүү: төлөв өөрчлөгдөхөд борлуулалт / төлбөр / буцаалт бичих ──
function ordCustomer(o) { return (o.customer ? o.customer + ' ' : '') + o.phone; }
// Буухиагаар хүргэсэн мөнгө (бэлнээр авсан ч) дансанд шилжиж ирдэг тул «Шилжүүлэг» (харилцах) гэж бичнэ — дэлгүүрийн кассыг хөндөхгүй
// Төлбөрийг ЗӨВХӨН удирдлага тэмдэглэнэ. Удирдлага «орсон» гэж баталсан бол мөнгө нь урьдчилгаа (3802)-д байгаа → бараа өгөхөд орлого болно;
// баталгаагүй бол авлага (1201) болж, удирдлага төлбөрийг тулгахад хаагдана.
function ordSalePay(o) { return o.paid === 'Орсон' ? 'Урьдчилгаа' : 'Зээлээр'; }
function ordBook(o, prev) {
  var sold = /^yes:/.test(o.saleDone || ''), salePay = sold ? o.saleDone.slice(4) : '';
  var lines = function (sign, pay) {
    return ordItems(o).map(function (i) {
      return { type: 'sale', item: i.name + (sign < 0 ? ' (буцаалт)' : ''), qty: sign * (Number(i.qty) || 1), unit: 'ш', price: Number(i.price) || 0,
               amount: sign * Math.round((Number(i.qty) || 1) * (Number(i.price) || 0)), pay: pay, bill: o.id, customer: pay === 'Зээлээр' || pay === 'Урьдчилгаа' ? ordCustomer(o) : '', note: 'Захиалга ' + o.phone };
    }).filter(function (r) { return r.amount; });
  };
  // 1) Буухиад өгсөн / Хүргэгдсэн болмогц борлуулалт (хуучин хүснэгтээс орж ирсэнд — төлбөр ормогц л)
  if (!sold && o.status !== 'Цуцалсан' && /Буухиад өгсөн|Хүргэгдсэн/.test(o.status) && o.saleDone !== 'imported') {
    var pay = ordSalePay(o); addRecords(lines(1, pay)); o.saleDone = 'yes:' + pay; return;
  }
  // 2) Төлбөр орсныг удирдлага (банкны хуулга / «Төлбөр орсон») бүртгэнэ — энд юу ч бичихгүй
  // 3) Борлуулалт бичигдсэний дараа цуцалбал буцаалт
  if (sold && o.status === 'Цуцалсан' && prev.status !== 'Цуцалсан') { addRecords(lines(-1, salePay)); o.saleDone = 'returned'; }
}

// ── Захиалга нэмэх / засах цонх ──
function openOrder(id) {
  var o = id ? orders.filter(function (x) { return x.id === id; })[0] : null;
  ordEdit = o ? JSON.parse(JSON.stringify(o)) : null;
  ordCart = o ? ordItems(o) : [];
  $('orTitle').textContent = o ? 'Захиалга · ' + o.phone : '＋ Шинэ захиалга';
  $('orCustomer').value = o ? o.customer || '' : ''; $('orPhone').value = o ? o.phone : ''; $('orPhone2').value = o ? o.phone2 || '' : '';
  $('orAddress').value = o ? o.address || '' : ''; $('orDistrict').value = o ? o.district || '' : ''; $('orKhoroo').value = o ? o.khoroo || '' : '';
  $('orCity').value = o ? o.city || 'Улаанбаатар' : 'Улаанбаатар';
  $('orDate').value = o ? o.deliverDate || '' : todayStr(new Date(Date.now() + 864e5));
  $('orPayType').value = o ? o.payType || 'Шилжүүлэг' : 'Шилжүүлэг'; $('orPaid').value = o ? o.paid || 'Ороогүй' : 'Ороогүй';
  $('orStatus').value = o ? o.status || 'Шинэ' : 'Шинэ'; $('orNote').value = o ? o.note || '' : '';
  $('orStatusWrap').style.display = o ? 'block' : 'none';
  $('orChips').innerHTML = products.map(function (p, i) { return '<button class="chip" onclick="ordAdd(' + i + ')">' + esc(p.name) + (p.price ? ' <small>' + fmt(p.price) + '</small>' : '') + '</button>'; }).join('');
  renderOrdCart();
  openSheet('orderSheet');
}
function ordAdd(i) {
  var p = products[i], ex = ordCart.filter(function (l) { return l.name === p.name; })[0];
  if (ex) ex.qty++; else ordCart.push({ name: p.name, qty: 1, price: p.price || 0 });
  renderOrdCart();
}
function ordAddCustom() {
  var n = $('orItem').value.trim(), pr = Number($('orItemPrice').value) || 0;
  if (!n) { toast('Барааны нэрээ бичнэ үү'); return; }
  ordCart.push({ name: n, qty: 1, price: pr }); $('orItem').value = ''; $('orItemPrice').value = ''; renderOrdCart();
}
function renderOrdCart() {
  $('orCart').innerHTML = ordCart.length ? ordCart.map(function (l, i) {
    return '<li><span>' + esc(l.name) + '</span><span class="cart-ctl"><input type="number" min="1" value="' + l.qty + '" style="width:56px" onchange="ordCart[' + i + '].qty=Number(this.value)||1;renderOrdCart()">' +
      '<input type="number" min="0" value="' + l.price + '" style="width:96px" onchange="ordCart[' + i + '].price=Number(this.value)||0;renderOrdCart()">' +
      '<button class="mini" onclick="ordCart.splice(' + i + ',1);renderOrdCart()">✕</button></span></li>';
  }).join('') : '<li class="muted">Бараа сонгоно уу</li>';
  $('orTotal').textContent = fmt(ordCart.reduce(function (a, l) { return a + l.qty * l.price; }, 0));
}
function ordAddrInput() {
  var t = $('orAddress').value;
  if (!$('orDistrict').value) $('orDistrict').value = guessDistrict(t);
  if (!$('orKhoroo').value) $('orKhoroo').value = guessKhoroo(t);
  $('orProvince').style.display = isProvince(t) ? 'block' : 'none';
}
function submitOrder() {
  if (ordEdit) { var cur = orders.filter(function (x) { return x.id === ordEdit.id; })[0]; withFresh(function () {
    var fresh = orders.filter(function (x) { return x.id === ordEdit.id; })[0];
    if (fresh) $('orPaid').value = fresh.paid || 'Ороогүй';   // төлбөрийн төлөвийг зөвхөн удирдлага өөрчилнө
    if (fresh) { ordEdit.paid = fresh.paid; ordEdit.saleDone = fresh.saleDone; ordEdit.status = fresh.status; }
    submitOrder2();
  }); return; }
  submitOrder2();
}
function submitOrder2() {
  var phone = $('orPhone').value.replace(/\D/g, '');
  if (!/^\d{8}$/.test(phone)) { toast('Утасны дугаар 8 оронтой байна'); return; }
  if (!ordCart.length) { toast('Бараа сонгоно уу'); return; }
  if (ordCart.some(function (l) { return !(l.price > 0); })) { toast('Барааны үнийг бөглөнө үү'); return; }
  if ($('orAddress').value.trim().length < 5) { toast('Хаягаа дэлгэрэнгүй бичнэ үү'); return; }
  var prev = ordEdit || {};
  var o = Object.assign({}, prev, {
    customer: $('orCustomer').value.trim(), phone: phone, phone2: $('orPhone2').value.replace(/\D/g, ''), city: $('orCity').value.trim() || 'Улаанбаатар',
    district: $('orDistrict').value, khoroo: $('orKhoroo').value.trim(), address: $('orAddress').value.trim(), items: ordCart.slice(),
    amount: ordCart.reduce(function (a, l) { return a + Math.round(l.qty * l.price); }, 0), deliverDate: $('orDate').value,
    payType: $('orPayType').value, paid: $('orPaid').value, status: ordEdit ? $('orStatus').value : 'Шинэ', note: $('orNote').value.trim() });
  ordBook(o, prev);
  saveOrder(o, function (saved) { closeSheet('orderSheet'); toast(prev.id ? 'Хадгалагдлаа' : 'Захиалга бүртгэгдлээ'); if (!prev.id && saved.paid !== 'Орсон') copyPayMsg(saved.id); });
}
// Төлөв солихын өмнө серверээс хамгийн сүүлийн захиалгыг татна — удирдлага банкаар «Төлбөр орсон» болгосныг давхар бичихгүй
function withFresh(cb) {
  if (!API_URL) { cb(); return; }
  ordPost({ type: 'orders' }, function (err, d) { if (!err) { orders = d.orders; save(LS_ORD, orders); } cb(); });
}
function quickOrd(id, field, val) { withFresh(function () { quickOrd2(id, field, val); }); }
function quickOrd2(id, field, val) {   // жагсаалтаас нэг товчоор төлөв солих
  var o = orders.filter(function (x) { return x.id === id; })[0]; if (!o) return;
  if (field === 'paid' && o.paid === 'Орсон') { renderOrders(); toast('Төлбөр нь аль хэдийн орсон гэж бүртгэгдсэн байна'); return; }
  var prev = JSON.parse(JSON.stringify(o)), n = Object.assign({}, o); n[field] = val;
  if (field === 'status' && val === 'Цуцалсан' && !confirm('Захиалгыг цуцлах уу?')) return;
  ordBook(n, prev);
  saveOrder(n);
}

// ── Жагсаалт ──
var ORD_TABS = [['new', 'Илгээх'], ['sent', 'Буухиад'], ['unpaid', 'Төлбөр ороогүй'], ['all', 'Бүгд']];
function ordFilter(o) {
  if (ordTab === 'new') return o.status === 'Шинэ';
  if (ordTab === 'sent') return o.status === 'Буухиад өгсөн';
  if (ordTab === 'unpaid') return o.paid !== 'Орсон' && o.status !== 'Цуцалсан';
  return true;
}
function renderOrders() {
  var el = $('orderList'); if (!el) return;
  var cnt = function (t) { var keep = ordTab; ordTab = t; var n = orders.filter(ordFilter).length; ordTab = keep; return n; };
  $('orderTabs').innerHTML = ORD_TABS.map(function (t) { return '<button class="' + (ordTab === t[0] ? 'on' : '') + '" onclick="ordTab=\'' + t[0] + '\';renderOrders()">' + t[1] + ' <small>' + cnt(t[0]) + '</small></button>'; }).join('');
  var list = orders.filter(ordFilter).sort(function (a, b) { return (b.date + b.time) < (a.date + a.time) ? -1 : 1; });
  el.innerHTML = list.length ? list.map(function (o) {
    var st = o.status === 'Цуцалсан' ? 'r' : o.status === 'Хүргэгдсэн' ? '' : 'b';
    return '<li class="ord"><div onclick="openOrder(\'' + o.id + '\')"><b>' + esc(o.phone) + (o.customer ? ' · ' + esc(o.customer) : '') + '</b>' +
      '<small>' + esc(ordItemsText(o)) + '</small><small>' + esc((o.district ? o.district + ', ' : '') + (o.address || '')).slice(0, 90) + '</small>' +
      '<small><span class="tag ' + st + '">' + esc(o.status) + '</span> <span class="tag ' + (o.paid === 'Орсон' ? '' : 'r') + '">Төлбөр ' + esc((o.paid || 'Ороогүй').toLowerCase()) + '</span>' +
      (o.deliverDate ? ' · ' + esc(o.deliverDate) : '') + '</small></div>' +
      '<div class="ord-r"><b>' + fmt(o.amount) + '</b>' +
      '<button class="mini" style="color:var(--accent)" onclick="copyPayMsg(\'' + o.id + '\')">Төлбөрийн мессеж</button>' +
      (o.status === 'Буухиад өгсөн' ? '<button class="mini" onclick="quickOrd(\'' + o.id + '\',\'status\',\'Хүргэгдсэн\')">Хүргэгдсэн</button>' : '') +
      '</div></li>';
  }).join('') : '<li class="muted">Захиалга алга</li>';
}

// ── Буухиа Excel (ebuuhia.com → «Хүргэлт» импортын албан загвар, 12 багана) ──
var BUUHIA_COLS = ['Дэлгүүрийн нэр *', 'Хүлээн авагчийн нэр', 'Утас *', 'Нэмэлт утас', 'Хот / аймаг *', 'Дүүрэг / сум *', 'Хороо', 'Нэмэлт хаяг', 'Барааны нэр', 'Тоо ширхэг', 'Авах дүн (₮)', 'Хүргэлтийн тайлбар'];
// withAmount: true бол «Авах дүн»-д төлбөр ороогүй захиалгын үнийг бичнэ — буухиа хүлээн авагчаас мөнгийг авч дансанд шилжүүлнэ.
// false бол дүнгүй (мөнгийг өөрсдөө авсан / дараа авна) — буухиа мөнгө шилжүүлэхгүй.
function openBuuhia() { withFresh(openBuuhia2); }
function openBuuhia2() {
  var n = orders.filter(function (o) { return o.status === 'Шинэ'; }).length;
  if (!n) { toast('Илгээх (Шинэ) захиалга алга'); return; }
  $('buN').textContent = n; openSheet('buuSheet');
}
function buuhiaExport(withAmount) {
  closeSheet('buuSheet');
  var list = orders.filter(function (o) { return o.status === 'Шинэ'; });
  if (!list.length) { toast('Илгээх (Шинэ) захиалга алга'); return; }
  if (!window.XLSX) { toast('Excel сан ачаалагдаагүй — интернэтээ шалгана уу'); return; }
  var noDist = list.filter(function (o) { return !o.district; }).length;
  var rows = list.map(function (o) {
    var qty = ordItems(o).reduce(function (a, i) { return a + (Number(i.qty) || 1); }, 0);
    var cod = withAmount && o.paid !== 'Орсон' ? o.amount : '';   // төлбөр орсон захиалгаас дахин авахгүй
    return [BIZ.buuhiaStore || BIZ.name, (o.customer || '').slice(0, 50), o.phone, o.phone2 || '', o.city || 'Улаанбаатар', o.district || '', o.khoroo || '',
            String(o.address || '').slice(0, 255), ordItemsText(o), qty, cod, String(o.note || '').slice(0, 200)];
  });
  var ws = XLSX.utils.aoa_to_sheet([BUUHIA_COLS].concat(rows));
  rows.forEach(function (r, i) { ['C', 'D'].forEach(function (col) { var c = ws[col + (i + 2)]; if (c) { c.t = 's'; c.v = String(c.v); c.z = '@'; } }); });   // утас — текст
  ws['!cols'] = [22, 18, 12, 12, 14, 16, 12, 50, 30, 8, 12, 30].map(function (w) { return { wch: w }; });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Хүргэлт');
  XLSX.writeFile(wb, 'buuhia-hurgelt-' + BIZ_KEY + '-' + todayStr() + (withAmount ? '-dun' : '-dungui') + '.xlsx');
  if (noDist) toast(noDist + ' захиалгын дүүрэг хоосон — буухиа анхааруулга өгнө, хаягаа шалгаарай');
  setTimeout(function () {
    if (!confirm(list.length + ' захиалгыг ebuuhia.com-д оруулсны дараа «Буухиад өгсөн» болгох уу?\n(Борлуулалт санхүүд бичигдэнэ)')) return;
    list.forEach(function (o) { var prev = JSON.parse(JSON.stringify(o)), n = Object.assign({}, o, { status: 'Буухиад өгсөн' }); ordBook(n, prev); saveOrder(n); });
  }, 600);
}

// ── Хэрэглэгчид илгээх төлбөрийн мессеж (гүйлгээний утгад утасны дугаар → банкны хуулгаар автоматаар таарна) ──
function payMsg(o) {
  var pay = load('nb_payinfo_' + BIZ_KEY, '') || '[данс тохируулаагүй — удирдлагад хэлнэ үү]';
  return 'Сайн байна уу! Таны захиалга:\n' + ordItems(o).map(function (i) { return '• ' + i.name + (i.qty > 1 ? ' x' + i.qty : '') + ' — ' + fmt(i.price * (i.qty || 1)); }).join('\n') +
    '\nНийт: ' + fmt(o.amount) + '\n\nТөлбөр: ' + pay + '\nГүйлгээний утга: ' + o.phone + '\n\nТөлбөр орсны дараа хүргэлтэд гаргана. Баярлалаа!';
}
function copyPayMsg(id) {
  var o = orders.filter(function (x) { return x.id === id; })[0]; if (!o) return;
  var t = payMsg(o);
  var done = function () { toast('Төлбөрийн мессеж хуулагдлаа — Facebook чатад буулгана уу'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { prompt('Хуулж аваарай:', t); });
  else prompt('Хуулж аваарай:', t);
}
