// ═══════════ ВЭБ ДЭЛГҮҮР — ажилтан (wise.ub.mn/cozy/): барааны зураг, тайлбар, харуулах ═══════════
// Ажилтан утсаараа барааны зургийг шууд авч оруулна. Сервер: staff_shop (list / get / хадгалах) — зөвхөн өөрийн дэлгүүрийн бараа.
// Хэн юу өөрчилснийг серверийн «Түүх»-д бичнэ. Үнэ, үлдэгдлийг энд өөрчлөхгүй.
var WS_BIZ = { cozy: 'https://wise.ub.mn/cozy/' }, WS_IMG_MAX = 5;
var wsList = null, wsQ = '', wsF = '', wsCur = null;
function shopStaffOn() { return typeof BIZ_KEY !== 'undefined' && !!WS_BIZ[BIZ_KEY]; }
function wsPost(body, cb) {
  body.token = typeof session !== 'undefined' && session ? session.token : '';
  fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); })
    .then(function (d) { cb(d && d.status === 'ok' ? null : (d && d.error) || 'error', d); })
    .catch(function () { cb('network'); });
}
function wsErr(e) { return e === 'network' ? 'Интернэт холболтоо шалгана уу' : e === 'auth' ? 'Дахин нэвтэрнэ үү' : e === 'img' || e === 'size' ? 'Зураг хэт том эсвэл буруу байна' : e === 'not_found' ? 'Бараа олдсонгүй (идэвхгүй болсон байж магадгүй)' : 'Алдаа: ' + e; }
function shopStaffLoad() {
  var el = $('webView'); if (!el) return;
  wsShell();
  if (!API_URL || typeof session === 'undefined' || !session || !session.token) { wsList = wsList || []; wsRender(); return; }
  if (!wsList) $('wsGrid').innerHTML = '<p class="muted">Ачаалж байна…</p>';
  wsPost({ type: 'staff_shop', list: 1 }, function (err, d) {
    if (err) { $('wsGrid').innerHTML = '<p class="muted">' + esc(wsErr(err)) + ' <button class="link" onclick="shopStaffLoad()">Дахин оролдох</button></p>'; return; }
    wsList = d.products || []; wsRender();
  });
}
function wsShell() {
  var el = $('webView'); if (!el || $('wsGrid')) return;
  el.innerHTML = '<div class="card"><div class="ord-bar ws-bar">' +
    '<input type="search" id="wsQ" placeholder="Бараа хайх…" oninput="wsQ=this.value;wsRender()">' +
    '<select id="wsF" onchange="wsF=this.value;wsRender()"><option value="">Бүх бараа</option><option value="noimg">Зураггүй</option><option value="hidden">Вэбэд нуусан</option><option value="hot">Онцлох</option></select>' +
    '<a class="btn sm ghost" href="' + WS_BIZ[BIZ_KEY] + '" target="_blank" rel="noopener">Вэбийг харах ↗</a>' +
    '<button class="link" onclick="shopStaffLoad()">Шинэчлэх</button></div>' +
    '<p class="muted" id="wsInfo" style="font-size:12.5px;margin:8px 0 0"></p><div id="wsGrid" class="ws-grid"></div></div>';
}
function wsRender() {
  wsShell(); var g = $('wsGrid'); if (!g) return;
  var all = wsList || [], q = wsQ.toLowerCase().trim();
  var L = all.filter(function (p) {
    return (!q || p.name.toLowerCase().indexOf(q) >= 0) && (!wsF || (wsF === 'noimg' ? !p.imgs : wsF === 'hidden' ? !p.show : p.hot));
  }).sort(function (a, b) { return (a.imgs ? 1 : 0) - (b.imgs ? 1 : 0) || b.i - a.i; });   // зураггүй нь эхэнд — хийх ажил
  var noimg = all.filter(function (p) { return !p.imgs; }).length;
  $('wsInfo').innerHTML = all.length + ' бараа · ' + (all.length - noimg) + ' зурагтай · <b' + (noimg ? ' style="color:#B45309"' : '') + '>' + noimg + ' зураггүй</b>. Барааг дарж зураг, тайлбар оруулна — хадгалснаас 5 минутын дотор вэбэд гарна.';
  if (!L.length) { g.innerHTML = '<p class="muted">' + (all.length ? 'Олдсонгүй' : 'Бараа алга') + '</p>'; return; }
  g.innerHTML = L.map(function (p) {
    var k = all.indexOf(p);
    return '<button type="button" class="ws-card' + (p.show ? '' : ' off') + '" onclick="wsOpen(' + k + ')">' +
      '<span class="ws-ph">' + (p.thumb ? '<img src="' + p.thumb + '" alt="" loading="lazy">' : '<i>📷</i><small>Зураг алга</small>') +
      (p.hot ? '<em class="ws-hot">Онцлох</em>' : '') + (p.show ? '' : '<em class="ws-off">Нуусан</em>') + '</span>' +
      '<b>' + esc(p.name) + '</b><small>' + fmt(p.price) + ' · ' + (p.imgs ? p.imgs + ' зураг' : 'зураггүй') + (p.desc ? ' · тайлбартай' : '') + (p.cat ? ' · ' + esc(p.cat) : '') + '</small></button>';
  }).join('');
}
function wsCats() { var o = {}; (wsList || []).forEach(function (p) { if (p.cat) o[p.cat] = 1; }); return Object.keys(o).sort(); }
function wsSheetEl() {
  var s = $('wsSheet');
  if (!s) { s = document.createElement('div'); s.className = 'sheet'; s.id = 'wsSheet'; s.onclick = function (e) { if (e.target === s) closeSheet('wsSheet'); }; s.innerHTML = '<div class="panel"></div>'; document.body.appendChild(s); }
  return s.querySelector('.panel');
}
function wsOpen(k) {
  var p = (wsList || [])[k]; if (!p) return;
  var my = wsCur = { k: k, name: p.name, imgs: [], dirty: false, imgDirty: false, loading: p.imgs > 0 };
  wsSheetEl().innerHTML = '<h2 style="margin-bottom:2px">' + esc(p.name) + '</h2><p class="muted" style="margin:0 0 10px">' + fmt(p.price) + ' · вэб дэлгүүр</p>' +
    '<label class="ps-chk"><input type="checkbox" id="wsShow"' + (p.show ? ' checked' : '') + ' onchange="wsCur.dirty=true"> Вэб дэлгүүрт харуулах</label>' +
    '<label class="ps-chk"><input type="checkbox" id="wsHot"' + (p.hot ? ' checked' : '') + ' onchange="wsCur.dirty=true"> Онцлох (эхэнд харуулна)</label>' +
    '<label for="wsCat">Вэб ангилал</label><input id="wsCat" list="wsCats" maxlength="40" value="' + esc(p.cat || '') + '" placeholder="Жишээ: Тогоо, сав суулга" oninput="wsCur.dirty=true"><datalist id="wsCats">' + wsCats().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' +
    '<label for="wsDesc">Тайлбар (үйлчлүүлэгчид харагдана)</label><textarea id="wsDesc" rows="4" maxlength="3000" placeholder="Хэмжээ, материал, онцлог, хэрэглэх заавар…" oninput="wsCur.dirty=true">' + esc(p.desc || '') + '</textarea>' +
    '<label>Зураг — 5 хүртэл, эхнийх нь нүүр зураг</label><div id="wsImgs" class="ps-imgs"></div>' +
    '<input type="file" id="wsFile" accept="image/*" multiple style="display:none" onchange="wsAdd(this.files);this.value=\'\'">' +
    '<p class="muted" id="wsMsg" style="font-size:12.5px;margin:6px 0 10px">' + (my.loading && API_URL ? 'Зургийг ачаалж байна…' : '') + '</p>' +
    '<button class="btn" id="wsBtn" onclick="wsSave()">Хадгалах</button><button class="btn ghost" onclick="closeSheet(\'wsSheet\')">Болих</button>';
  openSheet('wsSheet'); wsImgsRender();
  if (!my.loading || !API_URL) { my.loading = false; return; }
  wsPost({ type: 'staff_shop', name: p.name, get: 1 }, function (err, d) {
    if (wsCur !== my) return;
    my.loading = false;
    if (err) { $('wsMsg').textContent = 'Зургийг ачаалж чадсангүй — ' + wsErr(err); }
    else { if (!my.imgDirty) my.imgs = (d.imgs || []).slice(0, WS_IMG_MAX); $('wsMsg').textContent = ''; }
    wsImgsRender();
  });
}
function wsImgsRender() {
  var el = $('wsImgs'), s = wsCur; if (!el || !s) return;
  var h = s.imgs.map(function (src, i) {
    return '<div class="ps-img"><img src="' + src + '" alt="">' + (i === 0 ? '<span class="ps-first">Нүүр</span>' : '<button type="button" class="ps-mv" title="Нүүр зураг болгох" onclick="wsFirst(' + i + ')">★</button>') +
      '<button type="button" class="ps-x" title="Хасах" onclick="wsDel(' + i + ')">×</button></div>';
  }).join('');
  if (s.imgs.length < WS_IMG_MAX && !s.loading) h += '<button type="button" class="ps-add" onclick="$(\'wsFile\').click()">＋<small>Зураг</small></button>';
  el.innerHTML = h;
}
function wsDel(i) { wsCur.imgs.splice(i, 1); wsCur.imgDirty = wsCur.dirty = true; wsImgsRender(); }
function wsFirst(i) { var x = wsCur.imgs.splice(i, 1)[0]; wsCur.imgs.unshift(x); wsCur.imgDirty = wsCur.dirty = true; wsImgsRender(); }
function wsAdd(files) {
  var my = wsCur; if (!my) return;
  var list = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); }).slice(0, WS_IMG_MAX - my.imgs.length);
  if (!list.length) return;
  var left = list.length; $('wsMsg').textContent = 'Зураг бэлдэж байна…';
  list.forEach(function (f) {
    var r = new FileReader();
    r.onload = function () {
      wsShrink(r.result, 1000, 0.8, function (src) {
        if (src && wsCur === my && my.imgs.length < WS_IMG_MAX) { my.imgs.push(src); my.imgDirty = my.dirty = true; }
        if (--left === 0 && wsCur === my) { $('wsMsg').textContent = ''; wsImgsRender(); }
      });
    };
    r.onerror = function () { if (--left === 0) wsImgsRender(); };
    r.readAsDataURL(f);
  });
}
// Зургийг max px болгож JPEG-ээр; серверийн хязгаараас (≈265 мянган тэмдэгт) хэтэрвэл чанар, хэмжээг бууруулна
function wsShrink(src, max, q, cb) {
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
function wsSave() {
  var s = wsCur; if (!s) return;
  if (s.loading) { toast('Зургийг ачаалж дуусахыг хүлээнэ үү'); return; }
  if (!s.dirty) { closeSheet('wsSheet'); return; }
  var body = { type: 'staff_shop', name: s.name, show: $('wsShow').checked, hot: $('wsHot').checked, desc: $('wsDesc').value.trim(), cat: $('wsCat').value.trim() };
  var go = function () {
    if (!API_URL) { toast('Туршилтын горим — хадгалагдсангүй'); return; }
    $('wsBtn').disabled = true; $('wsMsg').textContent = 'Хадгалж байна…';
    wsPost(body, function (err) {
      if (wsCur !== s) return;
      $('wsBtn').disabled = false;
      if (err) { $('wsMsg').textContent = 'Хадгалагдсангүй — ' + wsErr(err); return; }
      var p = wsList[s.k];
      if (p && p.name === s.name) { p.show = body.show; p.hot = body.hot; p.desc = body.desc; p.cat = body.cat; if (body.imgs) { p.imgs = body.imgs.length; p.thumb = body.thumb || ''; } }
      closeSheet('wsSheet'); wsRender(); toast('Хадгалагдлаа — 5 минутын дотор вэбэд гарна');
    });
  };
  if (!s.imgDirty) { go(); return; }
  body.imgs = s.imgs.slice();
  if (!body.imgs.length) { body.thumb = ''; go(); return; }
  wsShrink(body.imgs[0], 400, 0.75, function (t) { body.thumb = t; go(); });
}
