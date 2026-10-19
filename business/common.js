// ── Нийтлэг туслах функцүүд (ажилтан + удирдагч) ──

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
function tinLookup(q, cb) {
  q = String(q || '').trim().replace(/\s/g, '');
  if (!API_URL) { cb('demo'); return; }
  jsonp({ action: 'tin', q: q }, function (err, d) {
    if (err || !d) { cb('network'); return; }
    if (d.status !== 'ok') { cb(d.error || 'error'); return; }
    if (d.found === undefined) { cb('notready'); return; }   // сервер хараахан шинэчлэгдээгүй
    cb(null, d);
  });
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
