// ── И-БАРИМТ (PosAPI 3.0) ──
// Борлуулалт бүрийг дэлгүүрийн компьютер дээрх PosAPI руу илгээж, баримтын QR + сугалааг харуулж хэвлэнэ.
// АНХААР: PosAPI-ийн дүрмээр lottery, qrData-г хэвлэхээс өөрөөр ХАДГАЛАХЫГ ХОРИГЛОНО.
// Тиймээс зөвхөн ДДТД (id)-г бичлэгт хадгална, сугалаа/QR зөвхөн дэлгэц + хэвлэлтэд.

var LS_EB = 'nb_ebarimt_' + BIZ_KEY;   // энэ компьютерийн тохиргоо

function ebSettings() {
  // Анхдагчаар унтраалттай — PosAPI суусан компьютер дээр тохиргооноос асаана
  return load(LS_EB, { url: 'http://localhost:7080', test: false, on: false });
}
function ebConfig() {
  var s = ebSettings();
  return s.test ? EBARIMT_TEST : EBARIMT[BIZ_KEY];
}
function ebEnabled() {
  var s = ebSettings();
  var c = ebConfig();
  return !!(s.on && c && c.merchantTin);
}

// Нэг борлуулалтаас PosAPI-ийн хүсэлт үүсгэнэ
function ebBuildRequest(r, buyer) {
  var c = ebConfig();
  var amount = Math.round(r.amount);
  var vat = c.taxType === 'VAT_ABLE' ? Math.round(amount / 11 * 100) / 100 : 0;
  var cls = r.classificationCode || c.classificationCode || '';
  var item = {
    name: r.item,
    barCode: r.barCode || cls,
    barCodeType: r.barCode ? 'GS1' : 'UNDEFINED',
    classificationCode: cls,
    measureUnit: r.unit,
    qty: r.qty,
    unitPrice: r.price,
    totalVAT: vat,
    totalCityTax: 0,
    totalAmount: amount,
  };
  var req = {
    branchNo: c.branchNo || '001',
    totalAmount: amount,
    totalVAT: vat,
    totalCityTax: 0,
    merchantTin: c.merchantTin,
    posNo: c.posNo || '',
    type: buyer && buyer.tin ? 'B2B_RECEIPT' : 'B2C_RECEIPT',
    billIdSuffix: String(Date.now()).slice(-6),
    receipts: [{
      totalAmount: amount,
      totalVAT: vat,
      totalCityTax: 0,
      taxType: c.taxType,
      merchantTin: c.merchantTin,
      items: [item],
    }],
    payments: [{ code: EBARIMT_PAY[r.pay] || 'CASH', status: 'PAID', paidAmount: amount }],
  };
  if (c.districtCode) req.districtCode = c.districtCode;
  if (buyer && buyer.tin) req.customerTin = buyer.tin;
  return req;
}

// PosAPI руу илгээнэ. cb(err, res)
function ebSend(req, cb) {
  var url = ebSettings().url.replace(/\/+$/, '') + '/rest/receipt';
  var ctrl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal: ctrl ? ctrl.signal : undefined,
  })
    .then(function (res) { return res.text().then(function (t) { return { ok: res.ok, text: t }; }); })
    .then(function (x) {
      clearTimeout(timer);
      var data;
      try { data = JSON.parse(x.text); } catch (e) { data = null; }
      if (x.ok && data && data.status === 'SUCCESS' && data.id) cb(null, data);
      else cb(new Error((data && (data.message || data.msg)) || x.text.slice(0, 200) || 'PosAPI алдаа'));
    })
    .catch(function (e) {
      clearTimeout(timer);
      cb(new Error('PosAPI-д холбогдож чадсангүй. Энэ компьютер дээр PosAPI асаалттай эсэхийг шалгана уу. (' + e.message + ')'));
    });
}

// ── Баримт харуулах / хэвлэх ──
function ebShowReceipt(res, r) {
  var qr = '';
  if (res.qrData && window.qrcode) {
    var q = qrcode(0, 'M');
    q.addData(res.qrData);
    q.make();
    qr = q.createSvgTag({ cellSize: 3, margin: 2, scalable: true });
  }
  $('rcBody').innerHTML =
    '<div class="rc-biz">' + esc(BIZ.name) + '</div>' +
    '<div class="rc-row"><span>Огноо</span><span>' + esc(res.date || '') + '</span></div>' +
    '<div class="rc-row"><span>ТТД</span><span>' + esc(res.merchantTin || '') + '</span></div>' +
    '<div class="rc-line"></div>' +
    '<div class="rc-row"><span>' + esc(r.item) + '<br><small>' + r.qty + ' ' + esc(r.unit) + ' × ' + fmt(r.price) + '</small></span><span>' + fmt(r.amount) + '</span></div>' +
    '<div class="rc-line"></div>' +
    '<div class="rc-row rc-total"><span>НИЙТ</span><span>' + fmt(res.totalAmount) + '</span></div>' +
    (res.totalVAT ? '<div class="rc-row"><span>НӨАТ</span><span>' + fmt(res.totalVAT) + '</span></div>' : '') +
    '<div class="rc-row"><span>Төлбөр</span><span>' + esc(r.pay) + '</span></div>' +
    '<div class="rc-line"></div>' +
    (res.lottery ? '<div class="rc-lottery">Сугалаа: <b>' + esc(res.lottery) + '</b></div>' : '') +
    '<div class="rc-qr">' + qr + '</div>' +
    '<div class="rc-ddtd">ДДТД: ' + esc(res.id) + '</div>';
  openSheet('receiptSheet');
}
function ebPrint() { window.print(); }
function ebCloseReceipt() {
  closeSheet('receiptSheet');
  $('rcBody').innerHTML = '';   // сугалаа/QR-ийг санах ойноос арилгана
}

// ── Тохиргоо (компьютер бүрт) ──
function openEbSettings() {
  var s = ebSettings();
  $('ebUrl').value = s.url;
  $('ebOn').checked = !!s.on;
  $('ebTest').checked = !!s.test;
  var c = EBARIMT[BIZ_KEY];
  $('ebInfo').textContent = c && c.merchantTin
    ? 'ТТД: ' + c.merchantTin + ' · ' + c.taxType
    : 'Энэ бизнесийн ТТД config.js-д бүртгэгдээгүй байна (зөвхөн туршилтын горим ажиллана).';
  openSheet('ebSheet');
}
function saveEbSettings() {
  save(LS_EB, { url: $('ebUrl').value.trim() || 'http://localhost:7080', on: $('ebOn').checked, test: $('ebTest').checked });
  closeSheet('ebSheet');
  renderEbBadge();
  toast('✓ Хадгалагдлаа');
}
function testEbConnection() {
  var url = ($('ebUrl').value.trim() || 'http://localhost:7080').replace(/\/+$/, '') + '/rest/info';
  $('ebTestResult').textContent = 'Шалгаж байна...';
  fetch(url).then(function (res) { return res.text(); }).then(function (t) {
    $('ebTestResult').textContent = '✓ PosAPI холбогдлоо: ' + t.slice(0, 160);
  }).catch(function (e) {
    $('ebTestResult').textContent = '✗ Холбогдсонгүй: ' + e.message;
  });
}
function renderEbBadge() {
  var el = $('ebBadge');
  if (!el) return;
  var s = ebSettings();
  el.textContent = ebEnabled() ? (s.test ? '🧾 И-баримт (туршилт)' : '🧾 И-баримт') : '🧾 И-баримт унтраалттай';
  el.className = 'eb-badge' + (ebEnabled() ? (s.test ? ' test' : ' on') : '');
}
