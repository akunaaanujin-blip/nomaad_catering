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

// Сагсны мөрүүдээс (нэг баримт) PosAPI-ийн хүсэлт үүсгэнэ
function ebBuildRequest(lines, buyer) {
  var c = ebConfig();
  var vatOf = function (amt) { return c.taxType === 'VAT_ABLE' ? Math.round(amt / 11 * 100) / 100 : 0; };
  var items = lines.map(function (r) {
    var amount = Math.round(r.amount);
    var cls = r.classificationCode || c.classificationCode || '';
    return {
      name: r.item,
      barCode: r.barCode || cls,
      barCodeType: r.barCode ? 'GS1' : 'UNDEFINED',
      classificationCode: cls,
      measureUnit: r.unit,
      qty: r.qty,
      unitPrice: r.price,
      totalVAT: vatOf(amount),
      totalCityTax: 0,
      totalAmount: amount,
    };
  });
  var total = items.reduce(function (a, it) { return a + it.totalAmount; }, 0);
  var vat = Math.round(items.reduce(function (a, it) { return a + it.totalVAT; }, 0) * 100) / 100;
  var req = {
    branchNo: c.branchNo || '001',
    totalAmount: total,
    totalVAT: vat,
    totalCityTax: 0,
    merchantTin: c.merchantTin,
    posNo: c.posNo || '',
    type: buyer && buyer.tin ? 'B2B_RECEIPT' : 'B2C_RECEIPT',
    billIdSuffix: String(Date.now()).slice(-6),
    receipts: [{
      totalAmount: total,
      totalVAT: vat,
      totalCityTax: 0,
      taxType: c.taxType,
      merchantTin: c.merchantTin,
      items: items,
    }],
    payments: [{ code: EBARIMT_PAY[lines[0].pay] || 'CASH', status: 'PAID', paidAmount: total }],
  };
  var dc = ebSettings().district || c.districtCode || (ebSettings().test ? '2501' : '');
  if (dc) req.districtCode = dc;
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
function ebShowReceipt(res, lines) {
  var qr = '';
  if (res.qrData && window.qrcode) {
    var q = qrcode(0, 'M');
    q.addData(res.qrData);
    q.make();
    qr = q.createSvgTag({ cellSize: 3, margin: 2, scalable: true });
  }
  var first = lines[0];
  $('rcBody').innerHTML =
    '<div class="rc-biz">' + esc(ebConfig().legalName || BIZ.name) + '</div>' +
    '<div class="rc-sub">' + esc(BIZ.name) + '</div>' +
    '<div class="rc-row"><span>ТТД</span><span>' + esc(res.merchantTin || '') + '</span></div>' +
    '<div class="rc-row"><span>Огноо</span><span>' + esc(res.date || '') + '</span></div>' +
    '<div class="rc-row"><span>Худалдагч</span><span>' + esc(staffName) + '</span></div>' +
    (first.buyerName ? '<div class="rc-row"><span>Худалдан авагч</span><span>' + esc(first.buyerName) + '</span></div>' : '') +
    (first.buyerTin ? '<div class="rc-row"><span>Худалдан авагч ТТД</span><span>' + esc(first.buyerTin) + '</span></div>' : '') +
    '<div class="rc-line"></div>' +
    lines.map(function (r) {
      return '<div class="rc-row"><span>' + esc(r.item) + '<br><small>' + r.qty + ' ' + esc(r.unit) + ' × ' + fmt(r.price) + '</small></span><span>' + fmt(r.amount) + '</span></div>';
    }).join('') +
    '<div class="rc-line"></div>' +
    '<div class="rc-row rc-total"><span>НИЙТ</span><span>' + fmt(res.totalAmount) + '</span></div>' +
    (res.totalVAT ? '<div class="rc-row"><span>НӨАТ</span><span>' + fmt(res.totalVAT) + '</span></div>' : '') +
    '<div class="rc-row"><span>Төлбөр</span><span>' + esc(first.pay) + '</span></div>' +
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
  var d = s.district || '';
  $('ebDistrict').value = d.slice(0, 2);
  $('ebKhoroo').value = d ? String(parseInt(d.slice(2), 10)) : '';
  var c = EBARIMT[BIZ_KEY];
  $('ebInfo').textContent = c && c.merchantTin
    ? 'ТТД: ' + c.merchantTin + ' · ' + c.taxType
    : 'Энэ бизнесийн ТТД config.js-д бүртгэгдээгүй байна (зөвхөн туршилтын горим ажиллана).';
  openSheet('ebSheet');
}
function saveEbSettings() {
  var dist = $('ebDistrict').value, kh = parseInt($('ebKhoroo').value, 10);
  if ($('ebOn').checked && !$('ebTest').checked && (!dist || !kh)) { toast('Дэлгүүрийн дүүрэг, хороог сонгоно уу'); return; }
  save(LS_EB, {
    url: $('ebUrl').value.trim() || 'http://localhost:7080', on: $('ebOn').checked, test: $('ebTest').checked,
    district: dist && kh ? dist + (kh < 10 ? '0' : '') + kh : '',
  });
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
  el.textContent = ebEnabled() ? (s.test ? 'И-баримт · туршилт' : 'И-баримт идэвхтэй') : 'И-баримт унтраалттай';
  el.className = 'eb-badge' + (ebEnabled() ? (s.test ? ' test' : ' on') : '');
}

// ── Баримт буцаах (DELETE /rest/receipt) ──
// Зөвхөн иргэн баталгаажуулаагүй баримт шууд идэвхгүй болно; баталгаажсан бол иргэн аппаараа зөвшөөрнө.
function ebReturn(id) {
  var all = load(LS_REC, []);
  var r = all.filter(function (x) { return x.id === id; })[0];
  if (!r || !r.ddtd) return;
  var lines = all.filter(function (x) { return x.ddtd === r.ddtd && x.amount > 0 && !x.returned; });
  var total = lines.reduce(function (a, x) { return a + x.amount; }, 0);
  if (!confirm('Энэ баримтыг бүхэлд нь буцаах уу?\n\n' + lines.map(function (x) { return '• ' + x.item + ' · ' + fmt(x.amount); }).join('\n') +
    '\nНийт: ' + fmt(total) + '\nДДТД ' + r.ddtd)) return;
  var url = ebSettings().url.replace(/\/+$/, '') + '/rest/receipt';
  fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: r.ddtd, date: r.ebDate }),
  })
    .then(function (res) { return res.text().then(function (t) { return { ok: res.ok, status: res.status, text: t }; }); })
    .then(function (x) {
      var data; try { data = JSON.parse(x.text); } catch (e) { data = null; }
      var msg = data && (data.message || data.msg || data.error);
      if (!x.ok || msg || (data && data.status && data.status !== 'SUCCESS' && data.status !== 200)) {
        alert('Буцааж чадсангүй:\n' + (msg || x.text.slice(0, 300) || ('HTTP ' + x.status)));
        return;
      }
      // PosAPI-ийн хариуг ажилтанд харуулна (хоосон бол амжилттай)
      if (x.text && x.text.trim() && x.text.trim() !== '{}') alert('PosAPI хариу:\n' + x.text.slice(0, 300));
      // эх мөрүүдийг тэмдэглээд, хасах дүнтэй буцаалтын мөрүүд нэмнэ (тайланд цэвэр дүн зөв гарна)
      all = load(LS_REC, []);
      all.forEach(function (y) { if (y.ddtd === r.ddtd) y.returned = true; });
      save(LS_REC, all);
      addRecords(lines.map(function (y) {
        return {
          type: 'sale', item: y.item + ' (буцаалт)', qty: -y.qty, unit: y.unit, price: y.price,
          amount: -y.amount, pay: y.pay, customer: y.customer || '', bill: y.bill ? y.bill + '-r' : '', note: 'Буцаалт · ДДТД ' + r.ddtd,
        };
      }));
      toast('✓ Баримт буцаагдлаа');
    })
    .catch(function (e) { toast('PosAPI-д холбогдож чадсангүй: ' + e.message); });
}

// ── Гараар илгээх + анхааруулга (сугалаа дуусах, 3 хоногийн хугацаа) ──
function ebSendNow() {
  var base = ebSettings().url.replace(/\/+$/, '');
  $('ebTestResult').textContent = 'Илгээж байна...';
  fetch(base + '/rest/sendData').then(function (res) {
    $('ebTestResult').textContent = res.ok ? '✓ Нэгдсэн системд илгээлээ' : '✗ Илгээж чадсангүй (' + res.status + ')';
    ebCheckInfo();
  }).catch(function (e) { $('ebTestResult').textContent = '✗ ' + e.message; });
}
function ebCheckInfo() {
  var el = $('ebWarn');
  if (!el || !ebEnabled()) { if (el) el.style.display = 'none'; return; }
  fetch(ebSettings().url.replace(/\/+$/, '') + '/rest/info')
    .then(function (res) { return res.json(); })
    .then(function (info) {
      var w = [];
      if (typeof info.leftLotteries === 'number' && info.leftLotteries < 1000) {
        w.push(info.leftLotteries <= 0
          ? 'Сугалаа дууссан — баримт сугалаагүй хэвлэгдэнэ. → "Одоо илгээх" дарна уу.'
          : 'Сугалаа дуусах дөхлөө (' + info.leftLotteries + ' үлдсэн). → "Одоо илгээх" дарна уу.');
      }
      var last = info.lastSentDate ? new Date(String(info.lastSentDate).replace(' ', 'T')) : null;
      if (last && last.getFullYear() > 2000) {
        var days = (Date.now() - last.getTime()) / 864e5;
        if (days >= 2) w.push('Борлуулалтын мэдээг ' + Math.floor(days) + ' хоног илгээгээгүй (хуулиар 3 хоногт). → "Одоо илгээх" дарна уу.');
      }
      el.innerHTML = w.map(esc).join('<br>');
      el.style.display = w.length ? 'block' : 'none';
    })
    .catch(function () {
      el.textContent = 'PosAPI-д холбогдохгүй байна. Энэ компьютер дээр PosAPI асаалттай эсэхийг шалгана уу.';
      el.style.display = 'block';
    });
}
