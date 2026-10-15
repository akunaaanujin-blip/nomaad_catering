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

// Apps Script-ээс JSONP-аар унших (CORS асуудалгүй)
function jsonp(params, cb) {
  var name = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  var q = Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  var s = document.createElement('script');
  var done = false;
  window[name] = function (data) { done = true; cb(null, data); cleanup(); };
  function cleanup() { delete window[name]; s.remove(); }
  s.onerror = function () { if (!done) { cb(new Error('network')); cleanup(); } };
  s.src = API_URL + '?' + q + '&callback=' + name;
  document.body.appendChild(s);
  setTimeout(function () { if (!done) { cb(new Error('timeout')); cleanup(); } }, 20000);
}
