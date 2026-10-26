// ── ЗАХИАЛГА (Cozy: Facebook-ээр ирсэн захиалга → буухиа хүргэлт) ──
// Ажилтан захиалгаа шивнэ → өдөр бүр «Буухиа Excel» товчоор буухиа.mn-ийн импортын загвараар файл гарна →
// «Буухиад өгсөн» болгоход борлуулалт санхүүд бичигдэнэ (баталгаажаагүй бол авлага).
// Ажилтны «Төлбөр орсон/ороогүй» нь зөвхөн тэмдэглэл — санхүүд бичигдэхгүй. Удирдлага банкны хуулгаар тулгаж баталгаажуулахад л санхүүд орно.

var ORD_STATUS = ['Шинэ', 'Буухиад өгсөн', 'Хүргэгдсэн', 'Буцаасан', 'Цуцалсан'];
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
function ordOpen(o) { return o.status === 'Шинэ' || o.status === 'Буухиад өгсөн'; }   // хаагдаагүй (хүргэгдээгүй, цуцлаагүй)
function ordGoods(o) { return ordItems(o).filter(function (i) { return !isNonGoods(i.name); }); }   // хүргэлтийн төлбөргүй бараанууд
function ordDiscLines(o) { return o && o.items ? ordItems(o).filter(function (i) { return baseItem(i.name) === DISC_ITEM; }) : []; }   // засварт хөнгөлөлт хадгалагдана
function ordFee(o) { return ordItems(o).filter(function (i) { return isFee(i.name); }).reduce(function (a, i) { return a + (Number(i.price) || 0) * (Number(i.qty) || 1); }, 0); }
function ordItemsText(o) { return ordGoods(o).map(function (i) { return i.name + (i.qty > 1 ? ' x' + i.qty : ''); }).join(', '); }

// ── Сервертэй ──
function ordPost(body, cb) {
  if (!API_URL) { cb(null, { status: 'ok' }); return; }
  body.token = session ? session.token : '';
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); }).then(function (d) { cb(d && d.status === 'ok' ? null : (d && d.error) || 'error', d); })
    .catch(function () { cb('network'); });
}
function loadOrders() {
  renderOrders();   // төхөөрөмж дээр хадгалсан хуулбарыг шууд харуулна — сервер (~3с) ард нь шинэчилнэ
  if (!API_URL) return;
  ordPost({ type: 'orders' }, function (err, d) {
    if (!err) {
      var keep = orders.filter(function (x) { return x.pending || x.failed; });   // хадгалагдаж байгаа шинэ захиалгыг алдахгүй
      orders = d.orders.concat(keep); save(LS_ORD, orders.filter(function (x) { return !x.pending; }));
    }
    renderOrders();
    if (typeof syncToday === 'function') syncToday();
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
  // Шинэ захиалга: түр мөрөөр шууд жагсаалтад гаргаж, цонхыг хаана; серверийн ID ирэхэд солино
  if (!o.id) {
    var tmp = Object.assign({}, o, { id: 'tmp' + Date.now(), date: todayStr(), time: timeStr(), staff: staffName, pending: true, items: ordItems(o) });
    orders.push(tmp); renderOrders(); done && done(tmp);
    ordPost(body, function (err, d) {
      var i = orders.findIndex(function (x) { return x.id === tmp.id; });
      if (err) { if (i >= 0) { orders[i].pending = false; orders[i].failed = true; } renderOrders();
        toast('Захиалга ' + o.phone + ' хадгалагдсангүй — жагсаалтаас «Дахин хадгалах» дарна уу'); return; }
      var saved = d.order; saved.items = ordItems(saved);
      if (i >= 0) orders[i] = saved; else orders.push(saved);
      save(LS_ORD, orders.filter(function (x) { return !x.pending; })); renderOrders();
    });
    return;
  }
  // Байгаа захиалгыг шууд дэлгэцэнд шинэчилнэ (сервер 2–5 секунд хариулдаг) — алдаа гарвал серверээс дахин татна
  if (o.id) {
    var k = orders.findIndex(function (x) { return x.id === o.id; });
    if (k >= 0) { orders[k] = Object.assign({}, orders[k], o, { items: ordItems(o) }); save(LS_ORD, orders); renderOrders(); }
  }
  ordPost(body, function (err, d) {
    if (err) { toast(err === 'phone' ? 'Утасны дугаар 8 оронтой байна' : err === 'network' ? 'Интернэт холболтоо шалгана уу — хадгалагдсангүй' : 'Алдаа: ' + err); if (o.id) loadOrders(); return; }
    var saved = d.order; saved.items = ordItems(saved);
    var i = orders.findIndex(function (x) { return x.id === saved.id; });
    if (i >= 0) orders[i] = saved; else orders.push(saved);
    save(LS_ORD, orders); done && done(saved); renderOrders();
  });
}

// ── Санхүү: төлөв өөрчлөгдөхөд борлуулалт / төлбөр / буцаалт бичих ──
function ordCustomer(o) { return (o.customer ? o.customer + ' ' : '') + o.phone; }
// Буухиагаар хүргэсэн мөнгө (бэлнээр авсан ч) дансанд шилжиж ирдэг тул «Шилжүүлэг» (харилцах) гэж бичнэ — дэлгүүрийн кассыг хөндөхгүй
// Удирдлага баталгаажуулсан (o.confirmed) бол мөнгө нь урьдчилгаа (3802)-д байгаа → бараа өгөхөд орлого болно;
// бусад үед дансаар (1101) — хэрэглэгчийн шийдвэр: Cozy-гийн бүх захиалга дансаар төлөгддөг, авлагаар бичихгүй.
function ordSalePay(o) { return o.confirmed ? 'Урьдчилгаа' : 'Шилжүүлэг'; }
function ordBook(o, prev) {
  var sold = /^yes:/.test(o.saleDone || ''), salePay = sold ? o.saleDone.slice(4) : '';
  var lines = function (sign, pay) {
    return ordItems(o).map(function (i) {
      return { type: 'sale', item: i.name + (sign < 0 ? ' (буцаалт)' : ''), qty: sign * (Number(i.qty) || 1), unit: 'ш', price: Number(i.price) || 0,
               amount: sign * Math.round((Number(i.qty) || 1) * (Number(i.price) || 0)), pay: pay, bill: o.id, customer: pay === 'Зээлээр' || pay === 'Урьдчилгаа' ? ordCustomer(o) : '', note: 'Захиалга ' + o.phone };
    }).filter(function (r) { return r.amount; });
  };
  // 1) Буухиад өгсөн / Хүргэгдсэн болмогц борлуулалт (хуучин хүснэгтээс орж ирсэнд — төлбөр ормогц л)
  if (!sold && !ordDead(o) && /Буухиад өгсөн|Хүргэгдсэн/.test(o.status) && o.saleDone !== 'imported') {
    var short = ordShort(o);   // үлдэгдэл хасах руу орохгүй — хүрэлцэхгүй бол хүргэлтэд гаргахгүй
    if (short.length) { o.status = prev.status || 'Шинэ'; return 'Захиалга ' + o.phone + ': ' + short.join('; '); }
    var pay = ordSalePay(o); var ls = lines(1, pay); addRecords(ls); ls.forEach(function (r) { stockTake(r.item, r.qty); }); o.saleDone = 'yes:' + pay; return;
  }
  // 2) Төлбөр орсныг удирдлага (банкны хуулга / «Төлбөр орсон») бүртгэнэ — энд юу ч бичихгүй
  // 3) Буухиад өгсний дараа цуцалсан / буцаасан бол бараа буухиа дээр байна — «Буцаалт хүлээн авсан» дарахад л (ordReceive) буцаалт бичигдэж үлдэгдэлд нэмэгдэнэ
  if (o.receive && sold && ordDead(o)) {
    var rl = lines(-1, salePay); addRecords(rl); rl.forEach(function (r) { stockTake(r.item, r.qty); });
    o.saleDone = 'returned'; o.note = ((o.note ? o.note + ' · ' : '') + 'Буцаалт хүлээн авсан ' + todayStr() + ' ' + timeStr() + ' ' + (typeof staffName !== 'undefined' ? staffName : '')).slice(0, 300);
    delete o.receive;
  }
}
function ordAwaitReturn(o) { return ordDead(o) && /^yes:/.test(o.saleDone || ''); }   // бараа буухиа дээр, буцааж аваагүй
function ordReceive(id) { (function (cb) { cb(); })(function () {
  var o = orders.filter(function (x) { return x.id === id; })[0]; if (!o || !ordAwaitReturn(o)) { renderOrders(); return; }
  if (!confirm('Захиалга ' + o.phone + '-ийн бараа буцаж ирсэн үү?\n\n' + ordItemsText(o) + '\n\nБорлуулалт буцаагдаж, бараа үлдэгдэлд нэмэгдэнэ.')) return;
  var n = Object.assign({}, o, { receive: true }); ordBook(n, o); saveOrder(n); toast('Буцаалт бүртгэгдлээ — бараа үлдэгдэлд нэмэгдлээ');
}); }

function ordShort(o) { return typeof stockShort === 'function' ? stockShort(ordGoods(o).map(function (i) { return { item: i.name, qty: Number(i.qty) || 1 }; })) : []; }

// ── Захиалга нэмэх / засах цонх ──
// ── Утасны дугаараар өмнөх захиалга (шинэ захиалга бичихэд) ──
var ordHistQ = '', ordHistLast = null;
function ordPhoneHint() {
  var el = $('orPhoneHint'); if (!el || ordEdit) return;
  var k = String($('orPhone').value).replace(/\D/g, '').slice(-8); ordHistQ = k; ordHistLast = null;
  if (k.length < 8) { el.innerHTML = ''; return; }
  var show = function (h) {
    if (ordHistQ !== k) return;
    if (!h || (!h.n && !h.canc)) { el.textContent = 'Шинэ харилцагч'; return; }
    ordHistLast = h.last;
    el.innerHTML = 'Өмнө ' + h.n + ' захиалга · нийт ' + fmt(h.total) + (h.last ? ' · сүүлд ' + esc(h.last.date) : '') + (h.canc ? ' · ' + h.canc + ' удаа цуцалсан' : '') +
      (h.last && h.last.address && !$('orAddress').value.trim() ? ' <button class="mini" onclick="ordFillLast()">Өмнөх хаягаар бөглөх</button>' : '');
  };
  if (!API_URL) { show(ordLocalHist(k)); return; }
  el.textContent = 'Шалгаж байна…';
  ordPost({ type: 'order_hist', phone: k }, function (err, d) { show(err ? ordLocalHist(k) : d); });
}
function ordLocalHist(k) {   // сүүлийн 45 хоногийн (төхөөрөмж дээрх) захиалгаас
  var L = orders.filter(function (o) { return String(o.phone).replace(/\D/g, '').slice(-8) === k; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  var ok = L.filter(function (o) { return o.status !== 'Цуцалсан'; });
  return { n: ok.length, canc: L.length - ok.length, total: ok.reduce(function (a, o) { return a + (Number(o.amount) || 0); }, 0), last: L[L.length - 1] || null };
}
function ordFillLast() {
  var l = ordHistLast; if (!l) return;
  if (!$('orCustomer').value.trim()) $('orCustomer').value = l.customer || '';
  $('orAddress').value = l.address || ''; $('orDistrict').value = l.district || ''; $('orKhoroo').value = l.khoroo || ''; $('orCity').value = l.city || 'Улаанбаатар';
  if (!$('orPhone2').value.trim()) $('orPhone2').value = l.phone2 || '';
  $('orPhoneHint').textContent = 'Өмнөх хаягаар бөглөлөө — шалгаад засаарай';
}
function openOrder(id) {
  var o = id ? orders.filter(function (x) { return x.id === id; })[0] : null;
  ordEdit = o ? JSON.parse(JSON.stringify(o)) : null;
  ordCart = o ? ordGoods(o) : [];
  $('orFee').value = o ? ordFee(o) : FEE_DEFAULT;
  $('orTitle').textContent = o ? 'Захиалга · ' + o.phone : '＋ Шинэ захиалга';
  if ($('orPhoneHint')) $('orPhoneHint').innerHTML = '';
  $('orCustomer').value = o ? o.customer || '' : ''; $('orPhone').value = o ? o.phone : ''; $('orPhone2').value = o ? o.phone2 || '' : '';
  $('orAddress').value = o ? o.address || '' : ''; $('orDistrict').value = o ? o.district || '' : ''; $('orKhoroo').value = o ? o.khoroo || '' : '';
  $('orCity').value = o ? o.city || 'Улаанбаатар' : 'Улаанбаатар';
  $('orDate').value = o ? o.deliverDate || '' : todayStr(new Date(Date.now() + 864e5));
  $('orPayType').value = o ? o.payType || 'Шилжүүлэг' : 'Шилжүүлэг'; $('orPaid').value = o ? o.paid || 'Ороогүй' : 'Ороогүй';
  $('orPaid').disabled = !!(o && o.confirmed); $('orPaidHint').textContent = o && o.confirmed ? '(удирдлага баталгаажуулсан)' : '';
  $('orStatus').value = o ? o.status || 'Шинэ' : 'Шинэ'; $('orNote').value = o ? o.note || '' : '';
  $('orStatusWrap').style.display = o ? 'block' : 'none';
  if ($('orPrint')) $('orPrint').checked = typeof lblAuto === 'function' && lblAuto();
  if (typeof lblWarn === 'function') lblWarn();
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
  $('orTotal').textContent = fmt(ordCartTotal());
}
function ordFeeVal() { return Math.max(0, Math.round(Number($('orFee').value) || 0)); }
function ordCartTotal() { return ordCart.reduce(function (a, l) { return a + l.qty * l.price; }, 0) + ordFeeVal(); }
function ordAddrInput() {
  var t = $('orAddress').value;
  if (!$('orDistrict').value) $('orDistrict').value = guessDistrict(t);
  if (!$('orKhoroo').value) $('orKhoroo').value = guessKhoroo(t);
  $('orProvince').style.display = isProvince(t) ? 'block' : 'none';
}
function submitOrder() {
  if (ordEdit) { var cur = orders.filter(function (x) { return x.id === ordEdit.id; })[0]; withFresh(function () {
    var fresh = orders.filter(function (x) { return x.id === ordEdit.id; })[0];
    if (fresh && fresh.confirmed) $('orPaid').value = 'Орсон';   // удирдлага баталгаажуулсныг буцаахгүй
    if (fresh) { ordEdit.confirmed = fresh.confirmed; ordEdit.saleDone = fresh.saleDone; ordEdit.status = fresh.status; }
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
    district: $('orDistrict').value, khoroo: $('orKhoroo').value.trim(), address: $('orAddress').value.trim(),
    items: ordCart.slice().concat(ordDiscLines(prev)).concat(ordFeeVal() ? [{ name: FEE_ITEM, qty: 1, price: ordFeeVal() }] : []),
    amount: Math.round(ordCartTotal() + ordDiscLines(prev).reduce(function (a, x) { return a + x.qty * x.price; }, 0)), deliverDate: $('orDate').value,
    payType: $('orPayType').value, paid: $('orPaid').value, status: ordEdit ? $('orStatus').value : 'Шинэ', note: $('orNote').value.trim() });
  var bad = ordBook(o, prev);
  if (bad) { alert('Үлдэгдэл хүрэлцэхгүй — хүргэлтэд гаргах боломжгүй:\n\n' + bad + '\n\nУдирдлагаар орлого бүртгүүлсний дараа дахин оролдоно уу.'); loadStock(); return; }
  if (!prev.id && ordShort(o).length) toast('Анхаар: үлдэгдэл хүрэлцэхгүй — орлого ортол буухиад өгөх боломжгүй');
  var doPrint = $('orPrint') && $('orPrint').checked;
  if ($('orPrint')) save('nb_lbl_auto', doPrint);
  saveOrder(o, function (saved) {
    closeSheet('orderSheet'); toast(prev.id ? 'Хадгалагдлаа' : 'Захиалга бүртгэгдлээ');
    if (doPrint && typeof lblQuick === 'function') lblQuick([saved.id]);   // «Хадгалаад шошго хэвлэх»
    else if (!prev.id && saved.paid !== 'Орсон') copyPayMsg(saved.id);
  });
}
// Төлөв солихын өмнө серверээс хамгийн сүүлийн захиалгыг татна — удирдлага банкаар «Төлбөр орсон» болгосныг давхар бичихгүй
function withFresh(cb) {
  if (!API_URL) { cb(); return; }
  ordPost({ type: 'orders' }, function (err, d) { if (!err) { orders = d.orders; save(LS_ORD, orders); } cb(); });
}
// Сервер баталгаажсан төлбөр, борлуулалтын тэмдгийг өөрөө хамгаалдаг тул урьдчилан татахгүй — шууд хийнэ
function quickOrd(id, field, val) { quickOrd2(id, field, val); }
function quickOrd2(id, field, val) {   // жагсаалтаас нэг товчоор төлөв солих
  var o = orders.filter(function (x) { return x.id === id; })[0]; if (!o) return;
  if (field === 'paid' && o.confirmed) { renderOrders(); toast('Удирдлага баталгаажуулсан — өөрчлөх боломжгүй'); return; }
  var prev = JSON.parse(JSON.stringify(o)), n = Object.assign({}, o); n[field] = val;
  var sentOut = /^yes:/.test(o.saleDone || '');
  if (field === 'status' && val === 'Цуцалсан' && !confirm('Захиалга ' + o.phone + '-ийг цуцлах уу?' + (sentOut ? '\nБараа буухиа дээр байгаа бол буцаж ирэхэд «Буцаалт хүлээн авсан» дарна.' : ''))) return;
  if (field === 'status' && val === 'Буцаасан' && !confirm('Захиалга ' + o.phone + ' буцаагдсан уу?\nБараа гарт ирэхэд «Буцаалт хүлээн авсан» дарахад үлдэгдэлд нэмэгдэнэ.')) return;
  if (API_URL && field === 'status' && (val === 'Буухиад өгсөн' || val === 'Хүргэгдсэн')) { shipOrders([id], val); return; }   // борлуулалт + төлөв серверт нэг дор
  var bad = ordBook(n, prev);
  if (bad) { alert('Үлдэгдэл хүрэлцэхгүй:\n\n' + bad); loadStock(); renderOrders(); return; }
  saveOrder(n);
}
// «Буухиад өгсөн» / «Хүргэгдсэн»: борлуулалт ба төлөвийг сервер нэг хүсэлтээр бичнэ — хагас хадгалагдах, давхардах боломжгүй
var shipping = false;
function shipOrders(ids, to, done) {
  if (!ids.length) return;
  if (shipping) { toast('Хадгалж байна — түр хүлээнэ үү'); return; }
  shipping = true; toast(ids.length + ' захиалгыг хадгалж байна…');
  ordPost({ type: 'orders_ship', ids: ids, to: to }, function (err, d) {
    shipping = false;
    if (err) { alert('Хадгалж чадсангүй (' + err + '). Жагсаалтыг шинэчилж төлөвийг шалгаад дахин оролдоно уу — давхар бичигдэхгүй.'); loadOrders(); return; }
    var m = {}; d.shipped.forEach(function (s) { m[s.id] = s; });
    orders = orders.map(function (o) { var s = m[o.id]; return s ? Object.assign({}, o, { status: d.to, saleDone: s.saleDone }) : o; });
    save(LS_ORD, orders.filter(function (x) { return !x.pending; }));
    renderOrders(); if (typeof syncToday === 'function') syncToday(); loadStock();
    if (d.skipped.length) alert(d.skipped.length + ' захиалга «Шинэ» хэвээр үлдлээ:\n\n' + d.skipped.map(function (x) { return (x.phone || '') + ': ' + x.why; }).join('\n'));
    toast(d.shipped.length + ' захиалга «' + d.to + '» боллоо');
    done && done(d);
  });
}

// ── Буухиагийн тайлан (ebuuhia «Харилцагчийн нийлсэн тайлан» Excel) → утсаар тааруулж «Хүргэгдсэн» / «Буцаасан», төлбөр орсон ──
// Шууд хийхгүй: тааруулсан жагсаалтыг харуулж, чагталсныг л хийнэ.
var brRows = [];
function brNum(v) { var n = Number(String(v == null ? '' : v).replace(/[,\s₮]/g, '')); return isFinite(n) ? n : 0; }
function buReport(input) {
  var f = input.files && input.files[0]; input.value = '';
  if (!f) return;
  if (!window.XLSX) { toast('Excel сан ачаалж байна — хэдэн секундийн дараа дахин оролдоно уу'); ensureXlsx(function () {}); return; }
  var rd = new FileReader();
  rd.onload = function (e) {
    var wb; try { wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' }); } catch (er) { toast('Файлыг уншиж чадсангүй'); return; }
    var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
    // ebuuhia-ийн хоёр хэлбэр: хуудасны хүснэгт («Хэрэглэгч», «Дүн», «Авсан») ба Excel («Утас», «Мөнгөн_дүн», «Авсан_мөнгө», «..._тайлбар»)
    var hi = rows.findIndex(function (r) { return r.some(function (c) { return /^(Хэрэглэгч|Утас)$/.test(String(c).trim()); }) && r.some(function (c) { return /^Төлөв$/.test(String(c).trim()); }); });
    if (hi < 0) { toast('Буухиагийн тайлан биш байна («Утас», «Төлөв» багана олдсонгүй)'); return; }
    var h = rows[hi].map(function (c) { return String(c).trim(); }), col = function (re) { return h.findIndex(function (c) { return re.test(c); }); };
    var cPh = col(/^(Хэрэглэгч|Утас)$/), cSt = col(/^Төлөв$/), cAmt = col(/^(Дүн|Мөнгөн_дүн)$/), cGot = col(/^Авсан/), used = {};
    var cNotes = h.map(function (c, i) { return /тайлбар/i.test(c) ? i : -1; }).filter(function (i) { return i >= 0; });
    brRows = rows.slice(hi + 1).map(function (r) {
      var ph = String(r[cPh] || '').replace(/\D/g, '').slice(-8), st = String(r[cSt] || '').trim().toUpperCase();
      if (!/^\d{8}$/.test(ph) || !st) return null;
      var amt = brNum(r[cAmt]), got = brNum(r[cGot]);
      var to = /ХҮРГЭГДСЭН/.test(st) ? 'Хүргэгдсэн' : /БУЦААСАН|ЦУЦАЛСАН/.test(st) ? 'Буцаасан' : '';
      var cands = orders.filter(function (o) { return !used[o.id] && String(o.phone || '').replace(/\D/g, '') === ph && o.status !== 'Цуцалсан'; });
      var o = cands.filter(function (x) { return amt && Number(x.amount) === amt; })[0] || cands.filter(function (x) { return x.status === 'Буухиад өгсөн'; })[0] || cands[0];
      if (o) used[o.id] = 1;
      var act = !o || !to ? 'none' : o.status === to ? 'same'
        : to === 'Хүргэгдсэн' ? (/^(Шинэ|Буухиад өгсөн)$/.test(o.status) ? 'set' : 'none') : (o.status === 'Буухиад өгсөн' ? 'set' : 'none');
      return { ph: ph, st: st, amt: amt, got: got, note: cNotes.map(function (i) { return String(r[i] || '').trim(); }).filter(Boolean).join(' · '), o: o, to: to, act: act, pay: !!(o && got > 0 && o.paid !== 'Орсон' && !o.confirmed) };
    }).filter(Boolean);
    brRender(); openSheet('brSheet');
  };
  rd.readAsArrayBuffer(f);
}
function brRender() {
  var n = { set: 0, same: 0, none: 0 };
  brRows.forEach(function (r) { n[r.o ? r.act : 'none']++; });
  $('brSum').textContent = brRows.length + ' мөр · өөрчлөх ' + n.set + ' · аль хэдийн тохирсон ' + n.same + ' · тааруулаагүй ' + n.none;
  $('brList').innerHTML = brRows.map(function (r, i) {
    var can = r.act === 'set' || r.pay;
    var what = !r.o ? '<span class="warn">Системд олдсонгүй</span>' : r.act === 'set' ? esc(r.o.status) + ' → <b>' + esc(r.to) + '</b>' : r.act === 'same' ? esc(r.o.status) + ' (тохирсон)' : esc(r.o.status) + ' — буухиа: ' + esc(r.st);
    return '<label class="bu-row"><input type="checkbox" value="' + i + '"' + (can ? ' checked' : ' disabled') + '>' +
      '<span><b>' + esc(r.ph) + '</b> · ' + what + (r.o ? '<small>' + esc(ordItemsText(r.o)) + ' · ' + fmt(r.o.amount) + '</small>' : '') +
      '<small>Буухиа: ' + esc(r.st) + (r.amt ? ' · дүн ' + fmt(r.amt) : '') + (r.got ? ' · авсан ' + fmt(r.got) : '') + (r.pay ? ' · <b>төлбөр орсон болгоно</b>' : '') + (r.note ? ' · ' + esc(r.note) : '') + '</small></span></label>';
  }).join('');
}
function brApply() {
  var sel = {}; [].forEach.call(document.querySelectorAll('#brList input:checked'), function (c) { sel[c.value] = 1; });
  var dl = [], ch = [];
  brRows.forEach(function (r, i) {
    if (!sel[i] || !r.o) return;
    if (r.act === 'set' && r.to === 'Хүргэгдсэн') dl.push(r.o.id);
    var c = {};
    if (r.act === 'set' && r.to === 'Буцаасан') c.status = 'Буцаасан';
    if (r.pay) c.paid = 'Орсон';
    if (Object.keys(c).length) ch.push({ id: r.o.id, ch: c });
  });
  if (!dl.length && !ch.length) { toast('Сонгосон мөр алга'); return; }
  closeSheet('brSheet');
  var rest = function () { brSeq(ch); };   // серверийг давхар ачаалахгүй — дараалан
  if (dl.length) shipOrders(dl, 'Хүргэгдсэн', rest); else rest();
}
function brSeq(list) {
  if (!list.length) { toast('Буухиагийн тайлан тулгагдлаа'); return; }
  var x = list.shift(), o = orders.filter(function (y) { return y.id === x.id; })[0];
  if (!o) { brSeq(list); return; }
  saveOrder(Object.assign({}, o, x.ch), function () { brSeq(list); });
}

// ── Жагсаалт ──
var ORD_TABS = [['new', 'Илгээх'], ['sent', 'Буухиад'], ['unpaid', 'Төлбөр ороогүй'], ['back', 'Буцаасан, цуцалсан'], ['all', 'Бүгд']];
function ordFilter(o) {
  if (ordTab === 'bills') return false;   // өнөөдрийн баримт — тусдаа жагсаалт (todayList)
  if (ordTab === 'new') return o.status === 'Шинэ';
  if (ordTab === 'sent') return o.status === 'Буухиад өгсөн';
  if (ordTab === 'unpaid') return o.paid !== 'Орсон' && !ordDead(o);
  if (ordTab === 'back') return ordDead(o);
  return true;
}
function ordRetry(id) {
  var i = orders.findIndex(function (x) { return x.id === id; }); if (i < 0) return;
  var o = orders.splice(i, 1)[0]; ['id', 'date', 'time', 'staff', 'failed', 'pending'].forEach(function (k) { delete o[k]; });
  saveOrder(o);
}
function ordAct(id, v) {
  if (!v) return;
  if (v === 'r') ordReceive(id); else if (v === 'l') openLabels([id]); else if (v === 'm') copyPayMsg(id); else if (v === 'e') openOrder(id); else if (v === 'x') ordPurge(id);
  else quickOrd(id, v.charAt(0) === 's' ? 'status' : 'paid', v.slice(2));
}
// Цуцалсан захиалгыг бүр устгана — серверийн «устгах код»-оор баталгаажна
function ordPurge(id) {
  var code = prompt('Захиалгыг бүр устгах (сэргээгдэхгүй). Устгах кодоо оруулна уу:');
  if (!code) return;
  ordPost({ type: 'order_delete', ids: [id], code: code }, function (err, d) {
    if (err) { toast(err === 'code' ? 'Устгах код буруу байна' : err === 'locked' ? 'Олон удаа буруу оруулсан — 15 минутын дараа оролдоно уу' : err === 'nocode' ? 'Устгах код тохируулаагүй байна' : 'Устгаж чадсангүй'); return; }
    if (!d.deleted || !d.deleted.length) { toast('Устгах боломжгүй захиалга байна'); return; }
    orders = orders.filter(function (x) { return d.deleted.indexOf(x.id) < 0; }); save(LS_ORD, orders.filter(function (x) { return !x.pending; })); renderOrders(); toast('Захиалга устгагдлаа');
  });
}
var ordQ = '';
function ordMatch(o) {
  var q = ordQ.toLowerCase().trim(); if (!q) return true;
  return [o.phone, o.phone2, o.customer, o.address, o.district, ordItemsText(o), o.status].join(' ').toLowerCase().indexOf(q) >= 0;
}
function renderOrders() {
  var el = $('orderList'); if (!el) return;
  var cnt = function (t) {
    if (t === 'bills') { var k = {}; (typeof todayRecords === 'function' ? todayRecords() : []).forEach(function (r) { if (r.type === 'sale') k[billKey(r)] = 1; }); return Object.keys(k).length; }
    var keep = ordTab; ordTab = t; var n = orders.filter(ordFilter).length; ordTab = keep; return n; };
  var bills = ordTab === 'bills';
  $('orderTabs').innerHTML = ORD_TABS.map(function (t) { return '<button class="' + (ordTab === t[0] ? 'on' : '') + '" onclick="ordTab=\'' + t[0] + '\';renderOrders()">' + t[1] + ' <small>' + cnt(t[0]) + '</small></button>'; }).join('');
  if (typeof renderNav === 'function') renderNav();
  var list = orders.filter(ordFilter).filter(ordMatch).sort(function (a, b) { return (b.date + b.time) < (a.date + a.time) ? -1 : 1; });
  var STC = { 'Шинэ': 'b', 'Буухиад өгсөн': 'y', 'Хүргэгдсэн': 'g', 'Буцаасан': 'r', 'Цуцалсан': 'r' };
  var rows = list.map(function (o, idx) {
    var fee = ordFee(o), opts = [];
    if (o.status === 'Шинэ') opts.push(['s:Буухиад өгсөн', 'Буухиад өгсөн'], ['s:Цуцалсан', 'Цуцлах']);
    if (o.status === 'Буухиад өгсөн') opts.push(['s:Хүргэгдсэн', 'Хүргэгдсэн'], ['s:Буцаасан', 'Буцаасан'], ['s:Цуцалсан', 'Цуцалсан']);
    if (o.status === 'Хүргэгдсэн') opts.push(['s:Буцаасан', 'Буцаасан']);
    if (o.status === 'Цуцалсан') opts.push(['x', 'Бүр устгах']);
    if (ordAwaitReturn(o)) opts.push(['r', 'Буцаалт хүлээн авсан']);
    if (!o.confirmed && !ordDead(o)) opts.push(o.paid !== 'Орсон' ? ['p:Орсон', 'Төлбөр орсон'] : ['p:Ороогүй', 'Төлбөр ороогүй']);
    opts.push(['l', 'Шошго хэвлэх'], ['m', 'Төлбөрийн мессеж хуулах'], ['e', 'Засах']);
    var acts = o.pending ? '<small class="muted">Хадгалж байна…</small>' : o.failed ? '<button class="mini neg" onclick="ordRetry(\'' + o.id + '\')">Дахин хадгалах</button>' : '<select class="act" onchange="ordAct(\'' + o.id + '\',this.value);this.selectedIndex=0"><option value="">Үйлдэл</option>' +
      opts.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('') + '</select>';
    var ret = ordAwaitReturn(o) ? '<small class="warn">Бараа буцаж ирээгүй</small>' : o.saleDone === 'returned' ? '<small>Бараа буцаж ирсэн</small>' : '';
    return '<tr>' +
      '<td class="c-d" data-l="Огноо">' + esc(String(o.date || '').slice(5).replace('-', '/')) + '<small>' + esc(o.time || '') + '</small></td>' +
      '<td class="c-p" data-l="Хэрэглэгч" onclick="openOrder(\'' + o.id + '\')"><b>' + esc(o.phone) + '</b><small>' + esc(o.customer || '') + '</small></td>' +
      '<td class="c-a" data-l="Хаяг">' + esc([o.city && o.city !== 'Улаанбаатар' ? o.city : '', o.district, o.address].filter(Boolean).join(' ')).slice(0, 80) + '</td>' +
      '<td class="c-i" data-l="Бараа">' + esc(ordItemsText(o)) + '</td>' +
      '<td class="c-m num" data-l="Дүн">' + fmt(o.amount) + (fee ? '<small>хүргэлт ' + fmt(fee) + '</small>' : '') + '</td>' +
      '<td class="c-s" data-l="Төлөв"><span class="st ' + (STC[o.status] || 'b') + '">' + esc(o.status) + '</span>' + ret +
        '<small><span class="st ' + (o.confirmed || o.paid === 'Орсон' ? 'g' : 'n') + '">' + (o.confirmed ? 'Төлбөр баталгаажсан' : 'Төлбөр ' + esc((o.paid || 'Ороогүй').toLowerCase())) + '</span></small></td>' +
      '<td class="c-x" data-l="">' + (o.pending ? '' : '<button class="mini lbl-q" onclick="lblQuick([\'' + o.id + '\'])" title="Шошго хэвлэх">Хэвлэх</button>') + acts + '</td></tr>';
  }).join('');
  var live = list.filter(function (o) { return !ordDead(o); }), deadN = list.length - live.length;   // цуцалсан / буцаасан захиалгыг дүнд оруулахгүй
  var sum = live.reduce(function (a, o) { return a + (Number(o.amount) || 0); }, 0), fees = live.reduce(function (a, o) { return a + ordFee(o); }, 0);
  el.innerHTML = list.length ? '<div class="ep-tbl-wrap"><table class="ep-tbl"><thead><tr><th>Огноо</th><th>Хэрэглэгч</th><th>Хаяг</th><th>Бараа</th><th class="num">Дүн</th><th>Төлөв</th><th></th></tr></thead><tbody>' + rows +
    '</tbody></table></div><div class="ep-tbl-foot">Нийт ' + live.length + ' захиалга · ' + fmt(sum) + ' · хүргэлт ' + fmt(fees) + (deadN ? ' · цуцалсан/буцаасан ' + deadN + ' (дүнд ороогүй)' : '') + '</div>'
    : '<p class="muted" style="padding:14px">Захиалга алга</p>';
}

// ── Буухиа Excel (ebuuhia.com → «Хүргэлт» импортын албан загвар, 12 багана) ──
var BUUHIA_COLS = ['Дэлгүүрийн нэр *', 'Хүлээн авагчийн нэр', 'Утас *', 'Нэмэлт утас', 'Хот / аймаг *', 'Дүүрэг / сум *', 'Хороо', 'Нэмэлт хаяг', 'Барааны нэр', 'Тоо ширхэг', 'Авах дүн (₮)', 'Хүргэлтийн тайлбар'];
// withAmount: true бол «Авах дүн»-д төлбөр ороогүй захиалгын үнийг бичнэ — буухиа хүлээн авагчаас мөнгийг авч дансанд шилжүүлнэ.
// false бол дүнгүй (мөнгийг өөрсдөө авсан / дараа авна) — буухиа мөнгө шилжүүлэхгүй.
function openBuuhia() { withFresh(openBuuhia2); }
// Илгээх захиалгуудаа чагтлаж сонгоно (анхдагчаар бүгд сонгогдсон)
function openBuuhia2() { $('buDate').value = todayStr(); buRender(); openSheet('buuSheet'); }
// Сонгосон өдрийн бүх хүргэлт (цуцалсангүй) + өмнөх өдрүүдийн илгээгдээгүй «Шинэ» захиалга
function buList() {
  var d = $('buDate').value || todayStr();
  return orders.filter(function (o) { return !ordDead(o) && (o.date === d || (o.status === 'Шинэ' && o.date < d)); })
    .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
}
function buRender() {
  var list = buList(), d = $('buDate').value;
  $('buList').innerHTML = list.length ? list.map(function (o) {
    return '<label class="bu-row"><input type="checkbox" value="' + o.id + '" checked onchange="buCount()">' +
      '<span><b>' + esc(o.phone) + (o.customer ? ' · ' + esc(o.customer) : '') + '</b><small>' + esc(ordItemsText(o)) + '</small>' +
      '<small>' + esc((o.district ? o.district + ', ' : '') + (o.address || '')).slice(0, 70) + '</small>' + (o.status !== 'Шинэ' ? '<small><span class="tag b">' + esc(o.status) + '</span>' + (o.date < d ? ' · ' + esc(o.date) : '') + '</small>' : (o.date < d ? '<small>' + esc(o.date) + ' · илгээгдээгүй</small>' : '')) + '</span><b class="n">' + fmt(o.amount) + '</b></label>';
  }).join('') : '<p class="muted" style="padding:14px">Энэ өдөр хүргэлт алга</p>';
  buCount();
}
function buChecked() { return [].slice.call(document.querySelectorAll('#buList input:checked')).map(function (c) { return c.value; }); }
function buCount() { var n = buChecked().length, all = document.querySelectorAll('#buList input').length; $('buN').textContent = n + ' / ' + all; $('buAll').checked = n === all; }
function buToggleAll(on) { [].slice.call(document.querySelectorAll('#buList input')).forEach(function (c) { c.checked = on; }); buCount(); }
function buuhiaExport(withAmount) {
  var ids = buChecked();
  if (!ids.length) { toast('Илгээх захиалгаа сонгоно уу'); return; }
  closeSheet('buuSheet');
  var list = buList().filter(function (o) { return ids.indexOf(o.id) >= 0; });
  if (!list.length) { toast('Илгээх захиалга алга'); return; }
  if (!window.XLSX) { toast('Excel сан ачаалж байна — хэдэн секундийн дараа дахин оролдоно уу'); ensureXlsx(function () {}); return; }
  // Үлдэгдэл хүрэлцэхгүй захиалгыг файлд оруулахгүй (дараалан хуримтлуулж шалгана)
  var need = {}, skip = [];
  list = list.filter(function (o) {
    if (/^yes:/.test(o.saleDone || '')) return true;   // аль хэдийн буухиад өгсөн (бараа нь хасагдсан) — дахин илгээх
    var mine = {}; ordGoods(o).forEach(function (i) { mine[i.name] = (mine[i.name] || 0) + (Number(i.qty) || 1); });
    var sh = stockShort(Object.keys(mine).map(function (k) { return { item: k, qty: mine[k] + (need[k] || 0) }; }));
    if (sh.length) { skip.push(o.phone + ': ' + sh.join('; ')); return false; }
    Object.keys(mine).forEach(function (k) { need[k] = (need[k] || 0) + mine[k]; });
    return true;
  });
  if (skip.length) alert(skip.length + ' захиалгын үлдэгдэл хүрэлцэхгүй тул файлд оруулсангүй («Шинэ» хэвээр):\n\n' + skip.join('\n'));
  if (!list.length) { loadStock(); return; }
  var noDist = list.filter(function (o) { return !o.district; }).length;
  var rows = list.map(function (o) {
    var qty = ordGoods(o).reduce(function (a, i) { return a + (Number(i.qty) || 1); }, 0);
    var cod = withAmount && o.paid !== 'Орсон' ? o.amount : '';   // төлбөр орсон захиалгаас дахин авахгүй
    return [BIZ.buuhiaStore || BIZ.name, (o.customer || '').slice(0, 50), o.phone, o.phone2 || '', o.city || 'Улаанбаатар', o.district || '', o.khoroo || '',
            String(o.address || '').slice(0, 255), ordItemsText(o), qty, cod, String(o.note || '').slice(0, 200)];
  });
  var ws = XLSX.utils.aoa_to_sheet([BUUHIA_COLS].concat(rows));
  rows.forEach(function (r, i) { ['C', 'D'].forEach(function (col) { var c = ws[col + (i + 2)]; if (c) { c.t = 's'; c.v = String(c.v); c.z = '@'; } }); });   // утас — текст
  ws['!cols'] = [22, 18, 12, 12, 14, 16, 12, 50, 30, 8, 12, 30].map(function (w) { return { wch: w }; });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Хүргэлт');
  XLSX.writeFile(wb, 'буухиа ' + ($('buDate').value || todayStr()).slice(5) + (withAmount ? '' : ' (дүнгүй)') + '.xlsx');
  if (noDist) toast(noDist + ' захиалгын дүүрэг хоосон — буухиа анхааруулга өгнө, хаягаа шалгаарай');
  setTimeout(function () {
    var fresh = list.filter(function (o) { return o.status === 'Шинэ'; }); if (!fresh.length) return;
    if (!confirm(fresh.length + ' шинэ захиалгыг ebuuhia.com-д оруулсны дараа «Буухиад өгсөн» болгох уу?\n(Борлуулалт санхүүд бичигдэнэ)')) return;
    if (API_URL) { shipOrders(fresh.map(function (o) { return o.id; }), 'Буухиад өгсөн'); return; }
    var bads = [];
    fresh.forEach(function (o) { var prev = JSON.parse(JSON.stringify(o)), n = Object.assign({}, o, { status: 'Буухиад өгсөн' }); var bad = ordBook(n, prev); if (bad) bads.push(bad); else saveOrder(n); });
    if (bads.length) { alert(bads.length + ' захиалга үлдэгдэл хүрэлцэхгүй тул «Шинэ» хэвээр үлдлээ:\n\n' + bads.join('\n')); loadStock(); }
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

// ═══════════ ХҮРГЭЛТ — Буухиа (ebuuhia API) ═══════════
// «Шинэ» захиалгыг сонгоод «Буухиа руу илгээх» → сервер буухиад өгсөн болгож (борлуулалт бичигдэнэ) ebuuhia-д хүргэлт үүсгэнэ, кодыг хадгална.
// «Буухиагаас төлөв татах» → ebuuhia-ийн төлөв, авсан мөнгө; хүргэгдсэн (10) захиалга автоматаар «Хүргэгдсэн» болно.
var dlvSel = {}, dlvSync = {}, dlvAll = null, dlvErr = '', dlvBusy = false, dlvSyncAt = '', dlvPulled = 0;
function dlvWrap() {
  var w = document.getElementById('dlvView');
  if (!w) { var wrap = document.querySelector('#main .wrap'); if (!wrap) return null; w = document.createElement('div'); w.id = 'dlvView'; w.setAttribute('data-view', 'dlv'); w.style.display = 'none'; wrap.appendChild(w); }
  return w;
}
function dlvCod(o) { return o.paid === 'Орсон' || o.confirmed ? 0 : Number(o.amount) || 0; }
window.ebRedraw = function (keep) {
  renderDlv();
  if (keep) { var q = document.getElementById('ebQ'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
};
function renderDlv() {
  var w = dlvWrap(); if (!w) return;
  if (!dlvBusy && Date.now() - dlvPulled > 5 * 60000 && window.API_URL !== '') { dlvPulled = Date.now(); setTimeout(dlvPull, 0); }   // нээхэд (5 мин тутам) буухиагаас автоматаар татна
  var fresh = orders.filter(function (o) { return o.status === 'Шинэ' && !o.pending; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  var retry = orders.filter(function (o) { return o.status === 'Буухиад өгсөн' && !o.ebCode; });
  var nSel = Object.keys(dlvSel).filter(function (k) { return dlvSel[k]; }).length;
  var row = function (o) {
    return '<tr><td style="width:28px"><input type="checkbox"' + (dlvSel[o.id] ? ' checked' : '') + ' onchange="dlvSel[\'' + o.id + '\']=this.checked;renderDlv()"></td>' +
      '<td><b>' + esc(o.phone) + '</b>' + (o.customer ? '<br><small class="muted">' + esc(o.customer) + '</small>' : '') + '</td><td>' + esc([o.district, o.khoroo ? o.khoroo + '-р хороо' : ''].filter(Boolean).join(', ') || o.city || '') +
      (o.district ? '' : ' <small style="color:#B45309">дүүрэг хоосон</small>') + '</td><td>' + esc(ordItemsText(o)) + '</td><td class="n">' + fmt(o.amount) + '</td><td class="n">' + (dlvCod(o) ? fmt(dlvCod(o)) : '<small class="muted">төлсөн</small>') + '</td></tr>';
  };
  w.innerHTML = (fresh.length ? '<div class="card"><div class="ord-bar"><h2 style="margin:0;flex:1">Буухиа руу илгээх <small class="muted" style="font-weight:400">«Шинэ» захиалга ' + fresh.length + '</small></h2>' +
      '<button class="btn sm" onclick="dlvSend()"' + (nSel && !dlvBusy ? '' : ' disabled') + '>Сонгосныг илгээх (' + nSel + ')</button></div>' +
      '<div style="overflow-x:auto;margin-top:8px"><table class="tbl dlv-t"><tr><th><input type="checkbox" onchange="fresh_all(this.checked)"></th><th>Хүлээн авагч</th><th>Хаяг</th><th>Бараа</th><th class="n">Дүн</th><th class="n">Буухиа авах</th></tr>' +
        fresh.map(row).join('') + '</table></div>' +
      '<p class="muted" style="font-size:12.5px;margin-top:8px">Илгээхэд захиалга «Буухиад өгсөн» болж, борлуулалт бичигдэнэ. «Буухиа авах» — хүргэхдээ хэрэглэгчээс авах мөнгө (төлбөр орсон бол 0).</p></div>' : '') +
    (retry.length ? '<div class="card"><div class="ord-bar"><h2 style="margin:0;flex:1">Буухиад өгсөн боловч кодгүй <small class="muted" style="font-weight:400">' + retry.length + '</small></h2>' +
      '<button class="btn sm ghost2" onclick="dlvSend(' + "'retry'" + ')">Буухиад дахин илгээх</button></div><p class="muted" style="font-size:12.5px">Excel-ээр гараар оруулсан бол дахин илгээх хэрэггүй — шинэчлэхэд кодоор нь холбогдоно.</p></div>' : '') +
    '<div class="card"><div class="ord-bar"><h2 style="margin:0;flex:1">Буухиа</h2>' +
      '<button class="btn sm ghost2" onclick="dlvPull()"' + (dlvBusy ? ' disabled' : '') + '>' + (dlvBusy ? 'Татаж байна…' : 'Шинэчлэх') + '</button></div>' +
      (dlvErr ? '<p style="color:#B91C1C;margin:8px 0">' + esc(dlvErr) + '</p>' : '') + (dlvAll ? ebBoard(dlvAll, dlvSyncAt) : '<p class="muted" style="margin-top:8px">' + (dlvBusy ? 'Буухиагаас татаж байна…' : 'Шинэчлэх дарна уу.') + '</p>') + '</div>';
}
// Буухиа буцаасан/цуцалсан барааг гарт авмагц: захиалга «Буцаасан» болж, борлуулалт буцаагдан бараа үлдэгдэлд нэмэгдэнэ (ordBook receive)
window.ebRecv = function (id) {
  var o = orders.filter(function (x) { return x.id === id; })[0];
  if (!o) { toast('Захиалга олдсонгүй — «Шинэчлэх» дарна уу'); return; }
  if (!/^yes:/.test(o.saleDone || '')) { toast(o.saleDone === 'returned' ? 'Аль хэдийн хүлээн авсан' : 'Энэ захиалга үлдэгдлээс хасагдаагүй'); return; }
  if (!confirm('Захиалга ' + o.phone + '-ийн бараа буцаж ирсэн үү?\n\n' + ordItemsText(o) + '\n\nЗахиалга «Буцаасан» болж, бараа үлдэгдэлд нэмэгдэнэ.')) return;
  var n = Object.assign({}, o, { status: ordDead(o) ? o.status : 'Буцаасан', receive: true });
  ordBook(n, o);
  saveOrder(n, function (saved) {
    (dlvAll || []).forEach(function (x) { if (x.id === id) { x.sd = saved.saleDone; x.our = saved.status; } });
    toast('Хүлээн авлаа — бараа үлдэгдэлд нэмэгдлээ'); if (typeof loadStock === 'function') loadStock(); renderDlv();
  });
};
// Захиалгатай холбогдоогүй буцаалт: буухиагийн барааны нэрээс манай барааг тааруулж санал болгоно → ажилтан шалгаад «Хүлээн авах» → дэлгүүрийн үлдэгдэлд нэмэгдэнэ
var ebRx = null;
function ebGuess(item) {
  var P = products.map(function (p) { return p.name; }), low = function (s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); };
  return String(item || '').split(/[,;]/).map(function (part) {
    var m = part.match(/(?:x\s*|×\s*)?(\d+)\s*(?:ш|ширхэг)?\s*$/i), qty = m ? Number(m[1]) || 1 : 1, t = low(m ? part.slice(0, m.index) : part);
    if (!t) return null;
    var hit = P.filter(function (n) { return low(n) === t; })[0] || P.filter(function (n) { return low(n).indexOf(t) >= 0 || t.indexOf(low(n)) >= 0; })[0] || '';
    return { name: hit, qty: qty, src: part.trim() };
  }).filter(Boolean);
}
window.ebRecvX = function (code) {
  var x = (dlvAll || []).filter(function (y) { return y.code === code; })[0]; if (!x) return;
  ebRx = { x: x, items: ebGuess(x.item) }; if (!ebRx.items.length) ebRx.items = [{ name: '', qty: 1, src: '' }];
  ebRxDraw();
};
function ebRxDraw() {
  var el = document.getElementById('ebRx');
  if (!ebRx) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'ebRx'; el.className = 'eb-modal'; document.body.appendChild(el); }
  var opts = function (sel) { return '<option value="">— Бараа сонгох —</option>' + products.map(function (p) { return '<option' + (p.name === sel ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join(''); };
  el.innerHTML = '<div class="eb-box"><h3>Буцаалт хүлээн авах · ' + esc(ebRx.x.phone) + '</h3>' +
    '<p class="muted" style="margin:0 0 10px;font-size:13px">Буухиа: ' + esc(ebRx.x.item || '—') + '. Гарт ирсэн барааг шалгаад хүлээн авна — дэлгүүрийн үлдэгдэлд нэмэгдэнэ.</p>' +
    ebRx.items.map(function (i, k) {
      return '<div class="eb-rx-row"><select onchange="ebRx.items[' + k + '].name=this.value">' + opts(i.name) + '</select>' +
        '<input type="number" min="1" value="' + i.qty + '" onchange="ebRx.items[' + k + '].qty=Number(this.value)||1">' +
        (ebRx.items.length > 1 ? '<button class="mini" onclick="ebRx.items.splice(' + k + ',1);ebRxDraw()">✕</button>' : '') + '</div>';
    }).join('') +
    '<button class="link" onclick="ebRx.items.push({name:\'\',qty:1});ebRxDraw()">＋ Бараа нэмэх</button>' +
    '<div class="bar-row" style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end"><button class="btn sm ghost2" onclick="ebRx=null;ebRxDraw()">Болих</button><button class="btn sm" id="ebRxOk" onclick="ebRxSave()">Хүлээн авах</button></div></div>';
}
function ebRxSave() {
  var L = ebRx.items.filter(function (i) { return i.name; });
  if (!L.length || L.length < ebRx.items.length) { toast('Бараагаа сонгоно уу'); return; }
  var x = ebRx.x; $('ebRxOk').disabled = true;
  ordPost({ type: 'eb_recv', code: x.code, phone: x.phone, items: L.map(function (i) { return { name: i.name, qty: i.qty }; }) }, function (err) {
    if (err && err !== 'already') { $('ebRxOk').disabled = false; toast('Хадгалж чадсангүй: ' + err); return; }
    x.rc = 1; ebRx = null; ebRxDraw(); toast(err ? 'Аль хэдийн хүлээн авсан байна' : 'Хүлээн авлаа — бараа үлдэгдэлд нэмэгдлээ');
    if (typeof loadStock === 'function') loadStock(); renderDlv();
  });
}
function fresh_all(on) { orders.filter(function (o) { return o.status === 'Шинэ' && !o.pending; }).forEach(function (o) { dlvSel[o.id] = on; }); renderDlv(); }
function dlvSend(mode) {
  var ids = mode === 'retry' ? orders.filter(function (o) { return o.status === 'Буухиад өгсөн' && !o.ebCode; }).map(function (o) { return o.id; })
    : Object.keys(dlvSel).filter(function (k) { return dlvSel[k]; });
  if (!ids.length || dlvBusy) return;
  var L = orders.filter(function (o) { return ids.indexOf(o.id) >= 0; }), noD = L.filter(function (o) { return !o.district; }).length;
  if (!confirm(ids.length + ' захиалгыг буухиа руу илгээх үү?\nБуухиа авах нийт: ' + fmt(L.reduce(function (a, o) { return a + dlvCod(o); }, 0)) + (noD ? '\n\n' + noD + ' захиалгын дүүрэг хоосон байна.' : ''))) return;
  dlvBusy = true; renderDlv(); toast('Буухиа руу илгээж байна…');
  ordPost({ type: 'eb_send', ids: ids }, function (err, d) {
    dlvBusy = false;
    if (err) { alert(err === 'eb_off' ? 'Буухиа API тохируулаагүй байна (удирдлага → Банкны хуулга → «Буухиа API»).' : 'Илгээж чадсангүй: ' + err); loadOrders(); renderDlv(); return; }
    dlvSel = {};
    var msg = d.sent.length + ' хүргэлт буухиад үүслээ.' + (d.failed.length ? '\n\nИлгээгдээгүй ' + d.failed.length + ':\n' + d.failed.map(function (x) { return x.phone + ': ' + x.why; }).join('\n') : '') +
      (d.skipped.length ? '\n\nҮлдэгдэл хүрэлцэхгүй тул «Шинэ» хэвээр ' + d.skipped.length + ':\n' + d.skipped.map(function (x) { return (x.phone || '') + ': ' + x.why; }).join('\n') : '');
    alert(msg); loadOrders(); if (typeof syncToday === 'function') syncToday(); setTimeout(renderDlv, 3500);
  });
}
function dlvPull() {
  if (dlvBusy) return; dlvBusy = true; renderDlv();
  ordPost({ type: 'eb_sync' }, function (err, d) {
    dlvBusy = false;
    if (err) { dlvErr = err === 'eb_off' ? 'Буухиа API тохируулаагүй байна (удирдлага → Банкны хуулга → «Буухиа API»).' : 'Татаж чадсангүй: ' + err; renderDlv(); return; }
    dlvErr = ''; dlvAll = d.list || []; dlvSync = {}; dlvAll.forEach(function (x) { if (x.id) dlvSync[x.id] = x; }); dlvSyncAt = new Date().toTimeString().slice(0, 5); dlvPulled = Date.now();
    if (d.delivered) { toast(d.delivered + ' захиалга «Хүргэгдсэн» боллоо'); loadOrders(); if (typeof syncToday === 'function') syncToday(); }
    renderDlv();
  });
}
