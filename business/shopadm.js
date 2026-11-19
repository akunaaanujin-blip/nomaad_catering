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
  $('psShow').checked = true; $('psHot').checked = false; $('psDesc').value = ''; $('psMsg').textContent = '';
  shopAdmRender();
  if (!name || !API_URL) return;
  shopAdm.loading = true; $('psMsg').textContent = 'Вэбийн мэдээллийг ачаалж байна…'; shopAdmRender();
  var my = shopAdm;
  post({ type: 'admin_shop', biz: state.biz, name: name, get: 1 }, function (err, d) {
    if (shopAdm !== my) return;   // өөр бараа нээсэн
    my.loading = false;
    if (err) { $('psMsg').textContent = 'Вэбийн мэдээллийг ачаалж чадсангүй (' + err + ')'; shopAdmRender(); return; }
    var s = d.shop;
    if (s && !my.dirty) { $('psShow').checked = s.show !== false; $('psHot').checked = !!s.hot; $('psDesc').value = s.desc || ''; }
    if (!my.imgDirty) my.imgs = (d.imgs || []).slice(0, SHOP_IMG_MAX);
    $('psMsg').textContent = s ? '' : 'Вэбэд одоогоор зураг, тайлбаргүй харагдаж байна.';
    shopAdmRender();
  });
}
function shopAdmDirty() { if (shopAdm) shopAdm.dirty = true; }
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
  var body = { type: 'admin_shop', biz: s.biz, name: name, show: $('psShow').checked, hot: $('psHot').checked, desc: $('psDesc').value.trim() };
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
