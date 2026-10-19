// ── БАРАА БҮРТГЭХ EXCEL (templates/baraa_burtgel.xlsx) → барааны бүртгэл + орлого (өртөг = авсан үнэ × ханш + карго) ──
// Файлыг зөвхөн хөтөч дотор уншина. Эхлээд урьдчилан харуулж, та «Бүртгэх» дарсны дараа л хадгална.
// Алдаатай мөр байвал юу ч хадгалахгүй (хагас орж давхардахаас сэргийлнэ) — Excel-ээ засаад дахин оруулна.

var PI_COLS = [   // [түлхүүр, толгойн эхлэл]
  ['name', 'Барааны нэр'], ['cat', 'Ангилал'], ['unit', 'Нэгж'], ['price', 'Зарах үнэ'], ['qty', 'Тоо'], ['loc', 'Байршил'],
  ['buy', 'Авсан үнэ'], ['cur', 'Валют'], ['rate', 'Ханш'], ['cargo', 'Карго'], ['pay', 'Барааны төлбөр'], ['partner', 'Нийлүүлэгч'],
  ['cpay', 'Каргоны төлбөр'], ['cco', 'Карго компани'], ['note', 'Тайлбар'],
];
var piRows = [];
function piPay(v) {
  v = String(v || '').trim().toLowerCase();
  if (!v) return '';
  if (/дараа|зээл|өглөг/.test(v)) return 'Зээлээр';
  if (/харилцах|банк|данс|шилжүүл/.test(v)) return 'Харилцах';
  if (/бэлэн|касс/.test(v)) return 'Бэлэн';
  return '?';
}
function piCur(v) {
  v = String(v || '').trim().toLowerCase();
  if (!v) return '';
  if (/cny|¥|юань|yuan|rmb/.test(v)) return 'CNY';
  if (/usd|\$|доллар/.test(v)) return 'USD';
  if (/mnt|₮|төгрөг/.test(v)) return 'MNT';
  return '?';
}
function importProducts(input) {
  var f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  if (!window.XLSX) { toast('Excel уншигч ачаалагдаагүй — интернэтээ шалгана уу'); return; }
  var reader = new FileReader();
  reader.onload = function (e) {
    var wb; try { wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' }); } catch (err) { toast('Файлыг уншиж чадсангүй'); return; }
    var sh = wb.Sheets['Бараа'] || wb.Sheets[wb.SheetNames[0]];
    var rows = XLSX.utils.sheet_to_json(sh, { header: 1, raw: true, defval: '' });
    var hi = -1;
    rows.some(function (r, i) { if (r.some(function (c) { return /^Барааны нэр/.test(String(c).trim()); })) { hi = i; return true; } return false; });
    if (hi < 0) { toast('«Барааны нэр» баганатай загвар биш байна — «Загвар татах»-аар авсан файлыг бөглөнө үү'); return; }
    var col = {};
    rows[hi].forEach(function (h, j) {   // хамгийн урт таарсан толгойгоор (жишээ нь «Карго компани» ≠ «Карго»)
      var t = String(h).trim(), best = null;
      PI_COLS.forEach(function (c) { if (col[c[0]] === undefined && t.indexOf(c[1]) === 0 && (!best || c[1].length > best[1].length)) best = c; });
      if (best) col[best[0]] = j;
    });
    piRows = piParse(rows.slice(hi + 1), col, hi + 2);
    if (!piRows.length) { toast('Бөглөсөн мөр олдсонгүй'); return; }
    piShow(f.name);
  };
  reader.readAsArrayBuffer(f);
}
function piParse(rows, col, firstLine) {
  var biz = state.biz, B = BUSINESSES[biz], wh = hasWarehouse(biz), out = [];
  var known = {}; B.products.forEach(function (p) { known[p.name.toLowerCase()] = p; });
  var g = function (r, k) { return col[k] === undefined ? '' : r[col[k]]; };
  var n = function (v) { var x = Number(String(v == null ? '' : v).replace(/[,\s₮¥$]/g, '')); return isFinite(x) ? x : NaN; };
  rows.forEach(function (r, i) {
    var name = String(g(r, 'name') || '').trim();
    if (!name) return;
    var x = { line: firstLine + i, name: name.slice(0, 80), errs: [] }, ex = known[name.toLowerCase()];
    x.isNew = !ex;
    x.cat = String(g(r, 'cat') || '').trim() || (ex ? ex.cat : '');
    x.unit = String(g(r, 'unit') || '').trim() || (ex ? ex.unit : B.unit);
    var price = g(r, 'price') === '' ? (ex ? ex.price : 0) : n(g(r, 'price'));
    if (isNaN(price) || price < 0) x.errs.push('Зарах үнэ буруу'); x.price = price || 0;
    var qty = g(r, 'qty') === '' ? 0 : n(g(r, 'qty'));
    if (isNaN(qty) || qty < 0) { x.errs.push('Тоо буруу'); qty = 0; } x.qty = qty;
    x.loc = wh && /агуулах/i.test(String(g(r, 'loc'))) ? 'Агуулах' : 'Дэлгүүр';
    var buy = g(r, 'buy') === '' ? 0 : n(g(r, 'buy')), cur = piCur(g(r, 'cur')), rate = g(r, 'rate') === '' ? 0 : n(g(r, 'rate')), cargo = g(r, 'cargo') === '' ? 0 : n(g(r, 'cargo'));
    if (isNaN(buy) || buy < 0) { x.errs.push('Авсан үнэ буруу'); buy = 0; }
    if (isNaN(cargo) || cargo < 0) { x.errs.push('Карго буруу'); cargo = 0; }
    if (isNaN(rate) || rate < 0) { x.errs.push('Ханш буруу'); rate = 0; }
    if (cur === '?') x.errs.push('Валют: CNY, MNT, USD-ийн аль нэг');
    if (!cur) cur = rate > 0 ? 'CNY' : 'MNT';
    if (buy && cur !== 'MNT' && !(rate > 0)) x.errs.push('Ханш хоосон');
    x.buy = buy; x.cur = buy ? cur : ''; x.rate = buy && cur !== 'MNT' ? rate : '';
    x.cargoU = qty > 0 && cargo ? Math.round(cargo / qty * 100) / 100 : 0;
    x.cost = buy ? Math.round((buy * (cur === 'MNT' ? 1 : rate) + x.cargoU) * 100) / 100 : 0;
    x.pay = piPay(g(r, 'pay')); x.partner = String(g(r, 'partner') || '').trim().slice(0, 80);
    x.cpay = cargo ? piPay(g(r, 'cpay')) : ''; x.cco = String(g(r, 'cco') || '').trim().slice(0, 80);
    x.note = String(g(r, 'note') || '').trim().slice(0, 100);
    if (qty > 0) {
      var st = (stockData[biz] || {})[x.name];
      if (!x.cost && !(st && st.cost)) x.errs.push('Авсан үнэ хоосон (өртөг бодогдохгүй)');
      if (!x.pay) x.errs.push('Барааны төлбөр хоосон'); else if (x.pay === '?') x.errs.push('Барааны төлбөр: Дараа төлнө / Харилцах / Бэлэн');
      if (x.pay === 'Зээлээр' && !x.partner) x.errs.push('Дараа төлөх бол нийлүүлэгч бичнэ');
      if (cargo) {
        if (!x.cpay) x.errs.push('Каргоны төлбөр хоосон'); else if (x.cpay === '?') x.errs.push('Каргоны төлбөр: Дараа төлнө / Харилцах / Бэлэн');
        if (x.cpay === 'Зээлээр' && !x.cco) x.errs.push('Каргог дараа төлөх бол карго компани бичнэ');
      }
    } else if (cargo || buy) x.errs.push('Тоо хоосон — орлого бүртгэхэд тоо хэрэгтэй');
    if (x.isNew && !(x.price > 0)) x.warn = 'зарах үнэгүй';
    out.push(x);
  });
  var seen = {};
  out.forEach(function (x) { var k = x.name.toLowerCase(); if (seen[k]) x.errs.push(seen[k] + '-р мөртэй давхардсан нэр'); else seen[k] = x.line; });
  return out;
}
function piShow(fname) {
  var bad = piRows.filter(function (x) { return x.errs.length; }), inc = piRows.filter(function (x) { return x.qty > 0; });
  var tot = inc.reduce(function (a, x) { return a + x.qty * x.cost; }, 0), nNew = piRows.filter(function (x) { return x.isNew; }).length;
  var payTxt = function (p) { return { 'Зээлээр': 'Дараа төлнө', 'Харилцах': 'Харилцах', 'Бэлэн': 'Бэлэн' }[p] || p || ''; };
  $('piBody').innerHTML = '<h2>Бараа бүртгэх — шалгах</h2><p class="muted" style="font-size:12.5px">' + esc(fname) + ' · ' + esc(BUSINESSES[state.biz].name) + '</p>' +
    '<div class="kpis">' + kpi('Нийт мөр', piRows.length) + kpi('Шинэ бараа', nNew) + kpi('Орлоготой', inc.length) + kpi('Нийт өртөг', fmt(tot)) + '</div>' +
    (bad.length ? '<p class="rep-note bad">' + bad.length + ' мөрөнд алдаа байна — Excel-ээ засаад дахин оруулна уу. Алдаатай үед юу ч хадгалахгүй.</p>'
                : '<p class="rep-note ok">Алдаагүй. Шалгаад «Бүртгэх» дарна уу.</p>') +
    '<div class="scroll" style="max-height:52vh"><table class="rep-t"><tr><th>Мөр</th><th>Бараа</th><th class="n">Зарах үнэ</th><th class="n">Тоо</th><th>Байршил</th><th>Авсан үнэ</th><th class="n">Карго/ш</th><th class="n">Өртөг үнэ</th><th class="n">Нийт</th><th>Барааны төлбөр</th><th>Каргоны төлбөр</th><th>Тэмдэглэл</th></tr>' +
    piRows.map(function (x) {
      return '<tr' + (x.errs.length ? ' style="background:#FDF2F2"' : '') + '><td>' + x.line + '</td><td>' + esc(x.name) + (x.isNew ? ' <span class="tag b">шинэ</span>' : '') + '</td>' +
        '<td class="n">' + (x.price ? fmt(x.price).slice(1) : '') + '</td><td class="n">' + (x.qty || '') + '</td><td>' + (x.qty ? x.loc : '') + '</td>' +
        '<td>' + (x.buy ? (x.cur === 'MNT' ? fmt(x.buy) : CUR_SIGN[x.cur] + x.buy + ' × ' + x.rate) : '') + '</td><td class="n">' + (x.cargoU ? fmt(x.cargoU).slice(1) : '') + '</td>' +
        '<td class="n">' + (x.cost ? fmt(x.cost).slice(1) : '') + '</td><td class="n">' + (x.qty && x.cost ? fmt(x.qty * x.cost).slice(1) : '') + '</td>' +
        '<td>' + esc(x.qty ? payTxt(x.pay) + (x.partner ? ' · ' + x.partner : '') : '') + '</td><td>' + esc(x.cpay ? payTxt(x.cpay) + (x.cco ? ' · ' + x.cco : '') : '') + '</td>' +
        '<td style="white-space:normal;min-width:160px">' + (x.errs.length ? '<span style="color:var(--red)">' + esc(x.errs.join('; ')) + '</span>' : esc(x.warn || '')) + '</td></tr>';
    }).join('') + '</table></div>';
  $('piSave').style.display = bad.length ? 'none' : '';
  $('piSave').textContent = 'Бүртгэх (' + piRows.length + ' бараа' + (inc.length ? ', ' + inc.length + ' орлого' : '') + ')';
  openSheet('piSheet');
}
function piSave() {
  if (!piRows.length || piRows.some(function (x) { return x.errs.length; })) return;
  var biz = state.biz, by = {}; BUSINESSES[biz].products.forEach(function (p) { by[p.name.toLowerCase()] = p; });
  var prods = piRows.filter(function (x) {   // шинэ эсвэл үнэ / ангилал / нэгж өөрчлөгдсөн
    var p = by[x.name.toLowerCase()];
    return !p || p.price !== x.price || (p.cat || '') !== x.cat || (p.unit || '') !== x.unit || p.off;
  }).map(function (x) { var p = by[x.name.toLowerCase()] || {}; return { biz: biz, name: x.name, unit: x.unit, price: x.price, cat: x.cat, cls: p.cls || '', off: false }; });
  var moves = piRows.filter(function (x) { return x.qty > 0; }).map(function (x) {
    return { biz: biz, loc: x.loc, item: x.name, kind: 'Орлого', qty: x.qty, cost: x.cost || 0, pay: x.pay, partner: x.partner, note: x.note || 'Excel бүртгэл',
             buy: x.buy || '', cur: x.cur, rate: x.rate, cargo: x.cargoU || '', cargoPay: x.cargoU ? x.cpay : '', cargoPartner: x.cargoU ? x.cco : '' };
  });
  var done = function () { closeSheet('piSheet'); toast(prods.length + ' бараа, ' + moves.length + ' орлого бүртгэгдлээ'); piRows = []; };
  $('piSave').disabled = true;
  var step2 = function () {
    if (!moves.length) { $('piSave').disabled = false; done(); refresh(); return; }
    sendMoves(moves, function () { $('piSave').disabled = false; done(); });
  };
  if (!API_URL) {
    logPriceDemo(prods);
    prods.forEach(function (p) { sheetProducts = sheetProducts.filter(function (x) { return !(x.biz === p.biz && x.name.toLowerCase() === p.name.toLowerCase()); }).concat([p]); });
    save('nb_demo_products', sheetProducts); applyProducts();
    if (moves.length) sendMoves(moves, function () { $('piSave').disabled = false; done(); }); else { $('piSave').disabled = false; done(); render(); }
    return;
  }
  if (!prods.length) { step2(); return; }
  post({ type: 'admin_product', products: prods, by: ownerName }, function (err) {
    if (err) { $('piSave').disabled = false; toast('Бараа хадгалахад алдаа: ' + err); return; }
    step2();
  });
}
