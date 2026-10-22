// ── Нийтлэг туслах функцүүд (ажилтан + удирдагч) ──

// Захиалгын хүргэлтийн төлбөр — борлуулалтын тусдаа мөр (орлого), бараа биш тул үлдэгдэл/өртөгт орохгүй
var FEE_ITEM = 'Хүргэлтийн төлбөр', FEE_DEFAULT = 7000;
function isFee(name) { return String(name || '').replace(/ \(буцаалт\)$/, '') === FEE_ITEM; }
// Цуцалсан (буухиад өгөхөөс өмнө) ба Буцаасан (хүргэлтээс буцсан) — аль аль нь идэвхгүй захиалга
function ordDead(o) { return o.status === 'Цуцалсан' || o.status === 'Буцаасан'; }

function fmt(n) {
  n = Math.round(Number(n) || 0);
  return '₮' + n.toLocaleString('en-US');
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function todayStr(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function timeStr(d) {
  d = d || new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function $(id) { return document.getElementById(id); }

function load(key, def) {
  try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

var toastTimer;
function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

// Apps Script-ээс унших: эхлээд fetch (CORS), бүтэлгүйтвэл JSONP-оор дахин оролдоно.
// (Зарим компьютерт реклам хаагч / хамгаалалт JSONP <script>-ийг хаадаг)
function jsonp(params, cb) {
  var q = Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  var done = false;
  var finish = function (err, data) { if (!done) { done = true; cb(err, data); } };
  var ctrl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
  fetch(API_URL + '?' + q, { signal: ctrl ? ctrl.signal : undefined })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (data) { clearTimeout(timer); finish(null, data); })
    .catch(function () { clearTimeout(timer); jsonpScript(q, finish); });
}
// ТТД / регистр → байгууллагын нэр (сервер ebarimt.mn-ээс лавлана). cb(err, { found, tin, name, vatPayer })
// ebarimt.mn нь Google-ийн серверийг хаадаг, хөтчөөс шууд дуудахыг CORS хаадаг — тиймээс одоохондоо гараар шалгах холбоос гаргана
var TIN_REMOTE = false;
function tinLookup(q, cb) {
  q = String(q || '').trim().replace(/\s/g, '');
  if (!TIN_REMOTE) { cb('blocked'); return; }
  if (!API_URL) { cb('demo'); return; }
  jsonp({ action: 'tin', q: q }, function (err, d) {
    if (err || !d) { cb('network'); return; }
    if (d.status !== 'ok') { cb(d.error || 'error'); return; }
    if (d.found === undefined) { cb('notready'); return; }   // сервер хараахан шинэчлэгдээгүй
    cb(null, d);
  });
}
// ebarimt.mn-ийн албан лавлагааг шинэ таб-д нээнэ (нэр, НӨАТ төлөгч эсэх; регистрээс ТТД)
function tinLinks(q) {
  q = String(q || '').replace(/\D/g, '');
  var name = /^\d{7}$/.test(q) ? 'https://info.ebarimt.mn/rest/merchant/info?regno=' + q : 'https://api.ebarimt.mn/api/info/check/getInfo?tin=' + q;
  return '<a href="' + name + '" target="_blank" rel="noopener">Нэрийг ebarimt.mn-ээс шалгах ↗</a>' +
    (/^\d{7}$/.test(q) ? ' · <a href="https://api.ebarimt.mn/api/info/check/getTinInfo?regNo=' + q + '" target="_blank" rel="noopener">ТТД-г олох ↗</a>' : '');
}
function tinErrText(err) {
  return err === 'demo' ? 'Туршилтын горимд шалгахгүй' : err === 'perm' ? 'Удирдлага ТТД шалгах зөвшөөрлийг (Apps Script) хараахан өгөөгүй байна' :
    err === 'format' ? 'Регистр 7 оронтой эсвэл ТТД 11–12 оронтой' : err === 'notready' ? 'ТТД шалгах үйлчилгээ хараахан идэвхжээгүй' : 'Шалгаж чадсангүй — интернэтээ шалгана уу';
}
function jsonpScript(q, cb) {
  var name = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  var s = document.createElement('script');
  var done = false;
  window[name] = function (data) { done = true; cb(null, data); cleanup(); };
  function cleanup() { delete window[name]; s.remove(); }
  s.onerror = function () { if (!done) { cb(new Error('network')); cleanup(); } };
  s.src = API_URL + '?' + q + '&callback=' + name;
  document.body.appendChild(s);
  setTimeout(function () { if (!done) { cb(new Error('timeout')); cleanup(); } }, 20000);
}

// ── Хурд: том сангуудыг хуудас нээгдсэний дараа ард нь ачаална; файлуудыг төхөөрөмжид хадгална (service worker) ──
var XLSX_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function loadLib(src, cb) {
  if (loadLib.done[src]) { cb && cb(); return; }
  (loadLib.wait[src] = loadLib.wait[src] || []).push(cb || function () {});
  if (loadLib.wait[src].length > 1) return;
  var s = document.createElement('script'); s.src = src; s.async = true;
  s.onload = function () { loadLib.done[src] = 1; loadLib.wait[src].forEach(function (f) { f(); }); loadLib.wait[src] = []; };
  s.onerror = function () { loadLib.wait[src] = []; };
  document.head.appendChild(s);
}
loadLib.done = {}; loadLib.wait = {};
function ensureXlsx(cb) { if (window.XLSX) cb(); else loadLib(XLSX_SRC, cb); }
(function () {
  var needX = /(admin|cozy)\.html$/.test(location.pathname);
  window.addEventListener('load', function () {
    if (needX) (window.requestIdleCallback || function (f) { setTimeout(f, 800); })(function () { loadLib(XLSX_SRC); });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  });
})();
