// ═══════════ ВЭБ ДЭЛГҮҮР (wise.ub.mn/cozy/) — барааны цонхонд зураг, тайлбар, харуулах эсэх ═══════════
// Сервер: admin_shop (get — унших; эс бөгөөс хадгалах). Зургийг хөтөч дээр жижигрүүлж (1000px) илгээнэ, нүүр зургийн жижиг хувилбарыг (400px) жагсаалтад.
var SHOP_BIZES = { cozy: '../cozy/' }, SHOP_IMG_MAX = 5;
var shopAdm = null;   // { biz, name, imgs: [dataURL], dirty, imgDirty, loading }
function shopAdmOpen(name) {
  var url = SHOP_BIZES[state.biz], box = $('pdShop'); if (!box) return;
  box.style.display = url ? '' : 'none';
  shopAdm = url ? { biz: state.biz, name: name || '', imgs: [], dirty: false, imgDirty: false, loading: false } : null;
  if (!url) return;
  $('psLink').href = url + (name ? '#/p/' + encodeURIComponent(name) : '');
  $('psShow').checked = true; $('psHot').checked = false; $('psDesc').value = ''; $('psCat').value = ''; $('psColors').value = ''; $('psSale').value = ''; $('psUntil').value = ''; $('psMsg').textContent = ''; shopAdmSalePct();
  shopAdmRender();
  if (!name || !API_URL) return;
  shopAdm.loading = true; $('psMsg').textContent = 'Вэбийн мэдээллийг ачаалж байна…'; shopAdmRender();
  var my = shopAdm;
  post({ type: 'admin_shop', biz: state.biz, name: name, get: 1 }, function (err, d) {
    if (shopAdm !== my) return;   // өөр бараа нээсэн
    my.loading = false;
    if (err) { $('psMsg').textContent = 'Вэбийн мэдээллийг ачаалж чадсангүй (' + err + ')'; shopAdmRender(); return; }
    var s = d.shop;
    if (s && !my.dirty) { $('psShow').checked = s.show !== false; $('psHot').checked = !!s.hot; $('psDesc').value = s.desc || ''; $('psCat').value = s.cat || ''; $('psColors').value = (s.colors || []).join(', '); $('psSale').value = s.sale || ''; $('psUntil').value = s.until || ''; shopAdmSalePct(); }
    $('psCats').innerHTML = (d.cats || []).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
    if (!my.imgDirty) my.imgs = (d.imgs || []).slice(0, SHOP_IMG_MAX);
    $('psMsg').textContent = s ? '' : 'Вэбэд одоогоор зураг, тайлбаргүй харагдаж байна.';
    shopAdmRender();
  });
}
function shopAdmDirty() { if (shopAdm) shopAdm.dirty = true; }
function shopAdmSalePct() {   // хямдралын хувь
  var el = $('psSalePct'); if (!el) return;
  var pr = Number($('pdPrice').value) || 0, sv = Number($('psSale').value) || 0;
  el.textContent = sv && pr ? (sv < pr ? 'Хямдрал: −' + Math.round((pr - sv) / pr * 100) + '% (' + (pr - sv).toLocaleString('en-US') + '₮). Вэбэд хуучин үнэ зураастай харагдана.' : 'Хямдралтай үнэ үндсэн үнээс бага байх ёстой') : '';
}
function shopAdmRender() {
  var el = $('psImgs'); if (!el || !shopAdm) return;
  var h = shopAdm.imgs.map(function (src, i) {
    return '<div class="ps-img"><img src="' + src + '" alt="">' + (i === 0 ? '<span class="ps-first">Нүүр</span>' : '<button type="button" class="ps-mv" title="Нүүр зураг болгох" onclick="shopAdmFirst(' + i + ')">★</button>') +
      '<button type="button" class="ps-x" title="Хасах" onclick="shopAdmDel(' + i + ')">×</button></div>';
  }).join('');
  if (shopAdm.imgs.length < SHOP_IMG_MAX && !shopAdm.loading) h += '<button type="button" class="ps-add" onclick="$(\'psFile\').click()">＋<small>Зураг</small></button>';
  el.innerHTML = h;
}
function shopAdmDel(i) { shopAdm.imgs.splice(i, 1); shopAdm.imgDirty = shopAdm.dirty = true; shopAdmRender(); }
function shopAdmFirst(i) { var x = shopAdm.imgs.splice(i, 1)[0]; shopAdm.imgs.unshift(x); shopAdm.imgDirty = shopAdm.dirty = true; shopAdmRender(); }
function shopAdmAdd(files) {
  if (!shopAdm) return;
  var list = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); }).slice(0, SHOP_IMG_MAX - shopAdm.imgs.length);
  if (!list.length) return;
  var my = shopAdm, left = list.length; $('psMsg').textContent = 'Зураг бэлдэж байна…';
  list.forEach(function (f) {
    var r = new FileReader();
    r.onload = function () {
      shopShrink(r.result, 1000, 0.8, function (src) {
        if (src && shopAdm === my && my.imgs.length < SHOP_IMG_MAX) { my.imgs.push(src); my.imgDirty = my.dirty = true; }
        if (--left === 0 && shopAdm === my) { $('psMsg').textContent = ''; shopAdmRender(); }
      });
    };
    r.onerror = function () { if (--left === 0) shopAdmRender(); };
    r.readAsDataURL(f);
  });
}
// Зургийг max px болгож JPEG-ээр; серверийн хязгаараас (≈265 мянган тэмдэгт) хэтэрвэл чанар, хэмжээг бууруулна
function shopShrink(src, max, q, cb) {
  var im = new Image();
  im.onload = function () {
    var enc = function (m, qq) {
      var k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', qq);
    };
    var out = enc(max, q), lim = max > 500 ? 265000 : 44000;
    if (out.length > lim) out = enc(max, q - 0.2);
    if (out.length > lim) out = enc(Math.round(max * 0.75), q - 0.25);
    cb(out.length > lim ? '' : out);
  };
  im.onerror = function () { cb(''); };
  im.src = src;
}
// saveProduct амжилттай болсны дараа дуудна (өөрчлөлтгүй бол шууд cb)
function shopAdmSave(name, cb) {
  var s = shopAdm;
  if (!s || !s.dirty || !API_URL || s.loading) { cb(); return; }
  var body = { type: 'admin_shop', biz: s.biz, name: name, show: $('psShow').checked, hot: $('psHot').checked, desc: $('psDesc').value.trim(), cat: $('psCat').value.trim(), colors: $('psColors').value.trim(), sale: Number($('psSale').value) || 0, until: $('psUntil').value || '' };
  var pr = Number($('pdPrice').value) || 0;
  if (body.sale && pr && body.sale >= pr) { toast('Хямдралтай үнэ үндсэн үнээс бага байх ёстой'); cb(); return; }
  var send = function () {
    post(body, function (err) {
      if (err) toast('Бараа хадгалагдсан, вэбийн зураг/тайлбар хадгалагдсангүй: ' + err);
      cb();
    });
  };
  if (!s.imgDirty) { send(); return; }
  body.imgs = s.imgs.slice();
  if (!body.imgs.length) { body.thumb = ''; send(); return; }
  shopShrink(body.imgs[0], 400, 0.75, function (t) { body.thumb = t; send(); });
}

// ── Тохиргоо (Санхүү → API холболт): хүргэлтийн төлбөр, үнэгүй хүргэлтийн босго, шинэ захиалгын и-мэйл, Meta Pixel ──
function shopSettingsCard(biz) {
  if (!SHOP_BIZES[biz] || (typeof isOwner === 'function' && !isOwner())) return '';
  var c = (window.shopCfgAll || {})[biz] || { fee: 7000, free: 0, notify: '', pixel: '' };
  return '<div class="card"><h2>Вэб дэлгүүр <small class="muted" style="font-weight:400">· <a href="' + SHOP_BIZES[biz] + '" target="_blank" rel="noopener">нээх ↗</a></small></h2>' +
    '<p class="muted" style="font-size:12.5px;margin:-4px 0 10px">Үйлчлүүлэгчийн онлайн захиалгын тохиргоо. Хадгалмагц вэбэд шууд хэрэгжинэ.</p>' +
    '<div class="row2"><div><label for="scFee">Хүргэлтийн төлбөр (₮)</label><input id="scFee" type="number" inputmode="numeric" min="0" value="' + (Number(c.fee) || 0) + '"></div>' +
    '<div><label for="scFree">Үнэгүй хүргэлт — барааны дүн (₮)</label><input id="scFree" type="number" inputmode="numeric" min="0" value="' + (Number(c.free) || 0) + '" placeholder="0 = үнэгүй хүргэлтгүй"></div></div>' +
    '<p class="muted" style="font-size:12px;margin:2px 0 8px">Жишээ: 100000 гэвэл 100,000₮-өөс дээш захиалгад хүргэлт үнэгүй. 0 бол үргэлж төлбөртэй.</p>' +
    '<label for="scMail">Шинэ захиалгын мэдэгдэл — и-мэйл (таслалаар, 5 хүртэл)</label><input id="scMail" type="text" autocomplete="off" value="' + esc(c.notify || '') + '" placeholder="жишээ: ажилтан@gmail.com, эзэн@gmail.com">' +
    '<label for="scPixel">Meta (Facebook) Pixel ID — зарын хэмжилт</label><input id="scPixel" inputmode="numeric" autocomplete="off" value="' + esc(c.pixel || '') + '" placeholder="Events Manager → Data sources → Pixel ID (15–16 оронтой)">' +
    '<div class="bar-row" style="margin-top:10px"><button class="b-btn primary" onclick="shopCfgSave(\'' + biz + '\')">Хадгалах</button><small class="muted" id="scMsg"></small></div></div>';
}
function shopCfgSave(biz) {
  var v = { fee: Number($('scFee').value) || 0, free: Number($('scFree').value) || 0, notify: $('scMail').value.trim(), pixel: $('scPixel').value.trim() };
  if (!API_URL) { window.shopCfgAll = window.shopCfgAll || {}; window.shopCfgAll[biz] = v; toast('Хадгалагдлаа (туршилт)'); return; }
  post({ type: 'admin_setting', key: 'shop', biz: biz, value: v }, function (err, d) {
    if (err) { toast(err === 'email' ? 'И-мэйл хаяг буруу байна' : err === 'pixel' ? 'Pixel ID зөвхөн тоо байна' : 'Алдаа: ' + err); return; }
    window.shopCfgAll = window.shopCfgAll || {}; window.shopCfgAll[biz] = d.cfg || v; toast('Вэб дэлгүүрийн тохиргоо хадгалагдлаа');
  });
}
