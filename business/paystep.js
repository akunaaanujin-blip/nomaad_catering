// ═══════════ Касс: төлбөрийн тусдаа дэлгэц, амжилттай дэлгэц, USB баркод уншигч ═══════════
// staff.js-ийн дараа ачаална. Хуучин оролтуудыг (хөнгөлөлт, утас, ТТД, StorePay, зээл) төлбөрийн дэлгэц рүү
// зөөж ашигладаг тул submitSale()-ийн бүх шалгалт, И-баримт, санхүүгийн бичилт хэвээр ажиллана.
var pv = { active: false, tenders: [], special: '', out: '', moved: [] };
var PV_TYPES = [
  { v: 'Карт', t: 'Карт', ic: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h3"/></svg>' },
  { v: 'Бэлэн', t: 'Бэлэн мөнгө', ic: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>' },
  { v: 'Шилжүүлэг', t: 'Данс', ic: '<svg viewBox="0 0 24 24"><path d="M12 16V5M7.5 9.5 12 5l4.5 4.5"/><path d="M4 14v3.5A1.5 1.5 0 0 0 5.5 19h13a1.5 1.5 0 0 0 1.5-1.5V14"/></svg>' },
  { v: 'Зээлээр', t: 'Зээл', ic: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.4-.8-1.4-1.3-2.5-1.3-1.5 0-2.6.8-2.6 2s1.1 1.6 2.6 1.9 2.7.8 2.7 2.1-1.2 2.1-2.7 2.1c-1.2 0-2.2-.5-2.6-1.4M12 6.5v11"/></svg>' },
  { v: 'StorePay', t: 'StorePay', ic: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>' }
];
var PV_LBL = { 'Карт': 'Картаар', 'Бэлэн': 'Бэлнээр', 'Шилжүүлэг': 'Дансаар', 'Зээлээр': 'Зээлээр', 'StorePay': 'StorePay' };

function pvEnsure() {
  if ($('payView')) return;
  var panel = document.querySelector('#saleSheet .panel.pos'); if (!panel) return;
  panel.insertAdjacentHTML('beforeend',
    '<div class="pv" id="payView" style="display:none">' +
      '<section class="pv-l">' +
        '<div class="pv-head"><button class="pv-back" onclick="pvClose()">← Буцах</button><b>Төлбөр төлөх</b><span></span></div>' +
        '<div class="pv-amts"><div><div class="pv-cap">Төлөх дүн оруулах</div><input id="pvAmt" type="number" inputmode="numeric" min="0" onkeydown="if(event.key===\'Enter\')pvAdd(\'Бэлэн\')"></div>' +
          '<div class="pv-totbox"><div class="pv-cap">Нийт дүн</div><b id="pvTotal">₮0</b></div></div>' +
        '<div class="pv-cap">Төлбөрийн хэлбэр сонгоно уу</div>' +
        '<div class="pv-types" id="pvTypes"></div>' +
        '<div id="pvSpecial"></div>' +
        '<div class="pv-cap" style="margin-top:22px">Төлсөн төлбөрүүд</div>' +
        '<div id="pvPaid"></div>' +
      '</section>' +
      '<section class="pv-r">' +
        '<div id="pvExtra"></div>' +
        '<div class="pv-info"><div class="pv-cap">Борлуулалтын мэдээлэл</div>' +
          '<div class="pv-row"><span>Барааны дүн</span><b id="pvGross">0</b></div>' +
          '<div class="pv-row"><span>Хөнгөлөлт</span><b id="pvDisc">0</b></div>' +
          '<div class="pv-row"><span>Төлсөн дүн</span><b id="pvPaidSum">0</b></div>' +
          '<div class="pv-row"><span>Хариулт</span><b id="pvChange">0</b></div>' +
          '<div class="pv-row pv-due"><span>Төлөх дүн</span><b id="pvDue">₮0</b></div></div>' +
        '<div id="pvOut"></div>' +
      '</section>' +
    '</div>' +
    '<div class="pv-done" id="payDone" style="display:none"></div>');
}

// Тэмдэглэгээ үлдээгээд оролтуудыг төлбөрийн дэлгэц рүү зөөнө (Буцах дарахад байранд нь буцна)
function pvMove(el, to) {
  if (!el || !to) return;
  var mark = document.createComment('pv'); el.parentNode.insertBefore(mark, el);
  pv.moved.push({ el: el, mark: mark }); to.appendChild(el);
}
function pvRestore() {
  pv.moved.reverse().forEach(function (m) { if (m.mark.parentNode) { m.mark.parentNode.insertBefore(m.el, m.mark); m.mark.remove(); } });
  pv.moved = [];
}

function posNext() {
  if (!sale.cart.length) { toast('Сагсанд бараа нэмнэ үү'); return; }
  if (sale.mode === 'dlv') { submitSale(); return; }
  for (var i = 0; i < sale.cart.length; i++) {
    var l = sale.cart[i];
    if (!(Number(l.qty) > 0)) { toast(l.name + ' — тоо хэмжээ оруулна уу'); return; }
    if (!(Number(l.price) > 0)) { toast(l.name + ' — үнэ оруулна уу'); return; }
  }
  pvOpen();
}
function pvOpen() {
  pvEnsure();
  pv.active = true; pv.tenders = []; pv.special = ''; pv.out = '';
  var extra = document.querySelector('#saleSheet .pos-extra');
  pvMove(extra, $('pvExtra'));
  pvMove($('saleSpWrap'), $('pvSpecial'));
  pvMove($('saleCustWrap'), $('pvSpecial'));
  pvMove($('saleTinWrap'), $('pvOut'));
  if ($('saleSplitOn')) { $('saleSplitOn').checked = false; $('saleSplitWrap').style.display = 'none'; }
  setPay('Бэлэн');
  $('saleSpWrap').style.display = 'none'; $('saleCustWrap').style.display = 'none';
  $('payView').style.display = 'grid';
  pvRender();
  $('pvAmt').value = pvDue() || '';
  setTimeout(function () { $('pvAmt').focus(); $('pvAmt').select(); }, 50);
}
function pvClose() {
  pv.active = false; pv.tenders = []; pv.special = '';
  if ($('payView')) $('payView').style.display = 'none';
  pvRestore();
  if (sale) { setPay('Бэлэн'); calcSale(); }
}
function pvReset() {
  if (pv.active || pv.moved.length) pvClose();
  if ($('payDone')) { $('payDone').style.display = 'none'; $('payDone').innerHTML = ''; }
  clearInterval(pv.timer); window.pvShown = false;
}

// Дүнгүүд
function pvPaid() { return pv.tenders.reduce(function (a, t) { return a + t.amt; }, 0); }
function pvCashIn() { return pv.tenders.reduce(function (a, t) { return a + (t.pay === 'Бэлэн' ? t.amt : 0); }, 0); }
function pvDue() { return pv.special ? 0 : Math.max(0, cartTotal() - pvPaid()); }
function pvChange() { return pv.special ? 0 : Math.max(0, pvPaid() - cartTotal()); }
function pvReady() { return !!pv.special || (pv.tenders.length && pvPaid() >= cartTotal()); }

function pvRender() {
  if (!pv.active) return;
  var tot = cartTotal(), due = pvDue(), sp = !!pv.special;
  $('pvTotal').textContent = fmt(tot);
  $('pvTypes').innerHTML = PV_TYPES.filter(function (t) { return t.v !== 'StorePay' || (document.querySelector('#paySeg [data-v="StorePay"]') || {}).style.display !== 'none'; }).map(function (t) {
    var only = t.v === 'Зээлээр' || t.v === 'StorePay', dis = (sp && pv.special !== t.v) || (!sp && only && pv.tenders.length) || (!sp && !only && due <= 0);
    return '<button class="pv-type' + (pv.special === t.v ? ' on' : '') + '"' + (dis ? ' disabled' : '') + ' onclick="pvAdd(\'' + t.v + '\')">' + t.ic + '<span>' + t.t + '</span></button>';
  }).join('');
  $('pvPaid').innerHTML = sp ? '<div class="pv-paid"><i>✓</i><span>' + esc(PV_LBL[pv.special]) + '</span><small>бүтэн дүнгээр</small><b>' + fmt(tot) + '</b><button onclick="pvUndo(-1)" aria-label="Хасах">✕</button></div>'
    : pv.tenders.length ? pv.tenders.map(function (t, i) {
      return '<div class="pv-paid"><i>✓</i><span>' + esc(PV_LBL[t.pay] || t.pay) + '</span><small>' + esc(t.time) + '</small><b>' + fmt(t.amt) + '</b><button onclick="pvUndo(' + i + ')" aria-label="Хасах">✕</button></div>';
    }).join('') : '<div class="pv-empty"><span class="pv-logo">' + esc((BIZ.name || 'N').trim().charAt(0)) + '</span><small>Төлбөрийн хэлбэрээ сонгоод борлуулалтаа дуусгаарай</small></div>';
  $('pvAmt').disabled = sp || due <= 0;
  var g = cartGross();
  $('pvGross').textContent = fmt(g).replace('₮', '');
  $('pvDisc').textContent = discAmt() ? '−' + fmt(discAmt()).replace('₮', '') : '0';
  $('pvPaidSum').textContent = fmt(sp ? tot : pvPaid()).replace('₮', '');
  $('pvChange').textContent = fmt(pvChange()).replace('₮', '');
  $('pvDue').textContent = fmt(due);
  var eb = typeof ebEnabled === 'function' && ebEnabled(), ok = pvReady();
  var outBtns = eb
    ? '<div class="pv-cap">Байгууллагаар</div>' + pvOutSlot() +
      '<button class="pv-out" onclick="pvFinish(\'org\')"' + (ok ? '' : ' disabled') + '>' + pvIco('org') + 'Байгууллагаар / Хэвлэх</button>' +
      '<div class="pv-cap">Хувь хүнээр</div>' +
      '<button class="pv-out main" onclick="pvFinish(\'print\')"' + (ok ? '' : ' disabled') + '>' + pvIco('rc') + 'Хувь хүнээр / Хэвлэх</button>' +
      '<button class="pv-out" onclick="pvFinish(\'screen\')"' + (ok ? '' : ' disabled') + '>' + pvIco('qr') + 'Дэлгэцийн И-Баримт</button>'
    : '<button class="pv-out main" onclick="pvFinish(\'none\')"' + (ok ? '' : ' disabled') + '>' + pvIco('ok') + 'Борлуулалт дуусгах</button>' +
      '<button class="pv-out" onclick="pvFinish(\'bill\')"' + (ok ? '' : ' disabled') + '>' + pvIco('rc') + 'Дуусгаад баримт хэвлэх</button>';
  var tin = $('saleTinWrap'), keep = tin && $('pvOut').contains(tin) ? tin : null;
  if (keep) keep.remove();   // innerHTML-ээр устгагдахаас хамгаалж салгаад буцааж хийнэ
  $('pvOut').innerHTML = outBtns;
  var slot = $('pvTinSlot'); if (slot && keep) { slot.appendChild(keep); keep.style.display = ''; }
  else if (keep) $('pvOut').appendChild(keep), keep.style.display = 'none';
  if (pv.busy) [].forEach.call($('pvOut').querySelectorAll('button'), function (x) { x.disabled = true; });
}
function pvOutSlot() { return '<div id="pvTinSlot"></div>'; }
function pvIco(k) {
  var p = { org: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M10.5 20.5v-3.5h3v3.5"/>',
    rc: '<path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
    qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
    ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>' }[k];
  return '<svg viewBox="0 0 24 24">' + p + '</svg>';
}
// Төлбөрийн хэлбэр дарахад: оруулсан дүнгээр «Төлсөн төлбөрүүд»-д нэмнэ. Зээл, StorePay — бүтэн дүнгээр, ганцаараа.
function pvAdd(pay) {
  if (pay === 'Зээлээр' || pay === 'StorePay') {
    if (pv.tenders.length) { toast(pay + ' — бусад төлбөртэй хуваах боломжгүй'); return; }
    pv.special = pay; setPay(pay);
    $('saleCustWrap').style.display = pay === 'Зээлээр' ? 'block' : 'none';
    pvRender();
    var f = pay === 'Зээлээр' ? $('saleCust') : $('saleSpPhone'); if (f) f.focus();
    return;
  }
  var due = pvDue(), amt = Math.round(Number($('pvAmt').value) || 0);
  if (due <= 0) return;
  if (!(amt > 0)) { toast('Төлөх дүнгээ оруулна уу'); $('pvAmt').focus(); return; }
  if (pay !== 'Бэлэн' && amt > due) { toast(PV_LBL[pay] + ' үлдэгдэл дүнгээс их авах боломжгүй — ' + fmt(due)); amt = due; }
  pv.tenders.push({ pay: pay, amt: amt, time: todayStr(new Date()).replace(/-/g, '.') + ' ' + timeStr() });
  pvRender();
  $('pvAmt').value = pvDue() || '';
  if (pvDue()) $('pvAmt').focus();
}
function pvUndo(i) {
  if (i < 0) { pv.special = ''; setPay('Бэлэн'); $('saleCustWrap').style.display = 'none'; $('saleSpWrap').style.display = 'none'; }
  else pv.tenders.splice(i, 1);
  pvRender(); $('pvAmt').value = pvDue() || '';
}
// Төлбөрүүдийг staff.js-ийн хуваалтын загварт буулгана: эхний хэлбэр = үндсэн, бусад нь «Төлбөр хуваалт» мөрөөр
function pvSplit() {
  if (!pv.active || pv.special || pv.tenders.length < 2) return null;
  var by = {}, order = [];
  pv.tenders.forEach(function (t) { if (!(t.pay in by)) { by[t.pay] = 0; order.push(t.pay); } by[t.pay] += t.amt; });
  if (by['Бэлэн']) by['Бэлэн'] = Math.max(0, by['Бэлэн'] - pvChange());   // хариултыг бэлнээс хасна
  var primary = order[0], list = order.slice(1).filter(function (p) { return by[p] > 0; }).map(function (p) { return { pay2: p, amt2: by[p] }; });
  if (!list.length) return null;
  var rest = cartTotal() - list.reduce(function (a, x) { return a + x.amt2; }, 0);
  return { list: list, pay2: list[0].pay2, amt2: list[0].amt2, err: rest > 0 ? '' : 'Төлбөрийн дүн буруу байна', primary: primary };
}
var _pvSplitOrig = splitInfo;
splitInfo = function () { return pv.active ? pvSplit() : _pvSplitOrig(); };

function pvFinish(out) {
  if (!pvReady()) { toast('Төлбөр дутуу байна — ' + fmt(pvDue())); return; }
  if (out === 'org') {
    var tin = $('saleTin') ? $('saleTin').value.trim() : '';
    if (!tin) { toast('Байгууллагын регистр эсвэл ТТД-г бичнэ үү'); if ($('saleTin')) $('saleTin').focus(); return; }
  } else if ($('saleTin')) { $('saleTin').value = ''; if ($('saleBuyer')) $('saleBuyer').value = ''; }
  pv.out = out;
  var sp = pvSplit();
  setPay(pv.special || (sp ? sp.primary : (pv.tenders[0] || {}).pay) || 'Бэлэн');
  if (pv.special) $('saleCustWrap').style.display = pv.special === 'Зээлээр' ? 'block' : 'none';
  if (sale.pay === 'Бэлэн' && $('saleCash')) $('saleCash').value = pvCashIn();
  if (pv.busy) return;
  pv.busy = true;
  try { submitSale(); } finally { pv.busy = false; }
  // И-баримт илгээж байх үед (saleSubmit идэвхгүй) давхар дарахаас хамгаална
  var sb = $('saleSubmit');
  if (pv.active && sb && sb.disabled) {
    pv.busy = true; pvRender();
    var w = setInterval(function () { if (!sb.disabled || !pv.active) { clearInterval(w); pv.busy = false; pvRender(); } }, 300);
  }
}

// staff.js finishSale() дуудна: амжилттай дэлгэц харуулаад шинэ борлуулалт руу
function posDone(lines) {
  if (!pv.active) return false;
  var total = lines.reduce(function (a, r) { return a + (Number(r.amount) || 0); }, 0);
  var pays = pv.special ? [pv.special] : pv.tenders.map(function (t) { return t.pay; }).filter(function (p, i, a) { return a.indexOf(p) === i; });
  var change = pvChange(), out = pv.out, key = billKey(lines[0] || {});
  pvClose();
  var d = $('payDone'); window.pvShown = true;
  d.innerHTML = '<div class="pd-in"><div class="pd-ok"><svg viewBox="0 0 24 24"><path d="m6 12.5 4 4L18 8.5"/></svg></div>' +
    '<div class="pd-t">Борлуулалт амжилттай хийгдлээ</div><div class="pd-sum">' + fmt(total) + '</div>' +
    '<div class="pd-pay">Төлбөрийн хэлбэр: <b>' + esc(pays.map(function (p) { return PV_LBL[p] || p; }).join(' + ')) + '</b></div>' +
    (change ? '<div class="pd-pay">Хариулт: <b>' + fmt(change) + '</b></div>' : '') + '</div>' +
    '<button class="pd-go" id="pdGo" onclick="pvNew()"></button>';
  d.style.display = 'flex';
  if (out === 'bill' && typeof printBill === 'function') setTimeout(function () { printBill(key); }, 200);
  pv.lastOut = out;
  var left = 5;
  var tick = function () {
    var rc = $('receiptSheet'), busy = rc && rc.classList.contains('show');
    $('pdGo').innerHTML = '✓ Гүйлгээг дуусгах' + (busy ? '' : ' (' + left + ' секунд)');
    if (busy) return;
    if (left-- <= 0) pvNew();
  };
  clearInterval(pv.timer); tick(); pv.timer = setInterval(tick, 1000);
  return true;
}
function pvNew() { clearInterval(pv.timer); window.pvShown = false; if ($('payDone')) $('payDone').style.display = 'none'; if ($('saleSheet').classList.contains('show')) openSale(); }

// И-баримт: «Хэвлэх» сонгосон бол баримтын цонх нээгдэхэд шууд хэвлэнэ, «Дэлгэцийн» бол QR-тай цонх нээлттэй үлдэнэ
var _pvShowRc = typeof ebShowReceipt === 'function' ? ebShowReceipt : null;
if (_pvShowRc) ebShowReceipt = function (res, lines) {
  _pvShowRc(res, lines);
  if (pv.lastOut === 'print' || pv.lastOut === 'org') setTimeout(function () { ebPrint(); }, 250);
  pv.lastOut = '';
};

// openSale: төлбөрийн/амжилттай дэлгэцийг цэвэрлээд «Төлбөр авах» товчийг «Төлөх» алхам руу холбоно
var _pvOpenSale = openSale;
openSale = function (mode) {
  pvReset();
  _pvOpenSale(mode);
  var b = $('saleSubmit'); if (b) b.setAttribute('onclick', 'posNext()');
};
var _pvCalcSale = calcSale;
calcSale = function () {
  _pvCalcSale();
  var b = $('saleSubmit'); if (b && sale && sale.mode !== 'dlv') b.textContent = sale.cart.length ? 'Төлөх · ' + fmt(cartTotal()) : 'Төлөх';
  if (pv.active) pvRender();
};
var _pvClose = closeSheet;
closeSheet = function (id) { _pvClose(id); if (id === 'saleSheet') { clearInterval(pv.timer); window.pvShown = false; } };

// ── USB баркод уншигч: гарын товчлуур шиг маш хурдан бичээд Enter дардаг ──
var usbScan = { buf: '', t: 0 };
document.addEventListener('keydown', function (e) {
  var sh = $('saleSheet');
  if (!sh || !sh.classList.contains('show') || pv.active || window.pvShown) { usbScan.buf = ''; return; }
  var now = Date.now();
  if (e.key === 'Enter') {
    var code = usbScan.buf; usbScan.buf = '';
    if (code.length >= 6 && now - usbScan.t < 80) {
      e.preventDefault(); e.stopPropagation();
      var a = document.activeElement;
      if (a && typeof a.value === 'string' && a.value.slice(-code.length) === code) { a.value = a.value.slice(0, -code.length); if (a.id === 'saleSearch') renderChips(); }
      usbHandle(code);
    }
    return;
  }
  if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  if (now - usbScan.t > 50) usbScan.buf = '';
  usbScan.buf += e.key; usbScan.t = now;
}, true);
function usbHandle(code) {
  var name = bcMap()[code], i = name ? products.findIndex(function (p) { return p.name === name; }) : -1;
  if (i < 0) i = products.findIndex(function (p) { return p.barcode && String(p.barcode) === code; });
  if (i >= 0) { pickProduct(i); toast('✓ ' + products[i].name); return; }
  ensureScanBox(); $('scanBox').style.display = 'flex'; scanHandle(code);   // шинэ баркод — аль бараа вэ гэж асууж холбоно
}
