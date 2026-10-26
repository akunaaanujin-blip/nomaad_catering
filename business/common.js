// ── Нийтлэг туслах функцүүд (ажилтан + удирдагч) ──

// Захиалгын хүргэлтийн төлбөр — борлуулалтын тусдаа мөр (орлого), бараа биш тул үлдэгдэл/өртөгт орохгүй
var FEE_ITEM = 'Хүргэлтийн төлбөр', FEE_DEFAULT = 7000;
function isFee(name) { return String(name || '').replace(/ \(буцаалт\)$/, '') === FEE_ITEM; }
// Баримтын тусгай мөрүүд: хөнгөлөлт (хасах дүн) ба төлбөр хуваалт (нэг хэлбэрээс нөгөө рүү) — бараа биш, тайлангийн «бараа»-нд орохгүй
var DISC_ITEM = 'Хөнгөлөлт', SPLIT_ITEM = 'Төлбөр хуваалт';
function baseItem(name) { return String(name || '').replace(/ \(буцаалт\)$/, ''); }
function isAdj(name) { var b = baseItem(name); return b === DISC_ITEM || b === SPLIT_ITEM; }
function isNonGoods(name) { return isFee(name) || isAdj(name); }   // үлдэгдэл, өртөгт орохгүй
// Баримтын түлхүүр: bill → ДДТД → мөрийн ID
function billKey(x) { return x.bill || (String(x.note || '').match(/ДДТД (\d+)/) || [])[1] || x.id; }
// Цуцалсан (буухиад өгөхөөс өмнө) ба Буцаасан (хүргэлтээс буцсан) — аль аль нь идэвхгүй захиалга
function ordDead(o) { return o.status === 'Цуцалсан' || o.status === 'Буцаасан'; }

// Ажилтны «Бизнес»: 'cozy' · 'cozy,meat' (нэг эрхээр хэд хэдэн дэлгүүрт) · 'all' (бүх дэлгүүр)
var STAFF_BIZ = ['meat', 'cozy', 'travel'];
function staffBizes(b) { b = String(b || '').trim(); return b === 'all' ? STAFF_BIZ.slice() : b.split(',').map(function (x) { return x.trim(); }).filter(function (x) { return STAFF_BIZ.indexOf(x) >= 0; }); }
function staffIn(s, b) { return staffBizes(s.biz).indexOf(b) >= 0; }

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

// Хайлт, бичих талбарт хөтчийн хуучин бичсэн үгийн жагсаалт гаргахгүй (нууц үг, нэвтрэх талбараас бусад)
document.addEventListener('focusin', function (e) {
  var t = e.target;
  if (t && t.tagName === 'INPUT' && !t.hasAttribute('autocomplete') && !/password|email|tel/.test(t.type) && !/user|login|name/i.test(t.id || '')) t.setAttribute('autocomplete', 'off');
}, true);

// ═══ Буухиа (ebuuhia) — хүргэлтийн жагсаалт: ажилтны «Хүргэлт», удирдлагын «Буухиа» хуудас хоёулаа ашиглана ═══
// list — серверийн ebNorm хэлбэр. ebF — шүүлтүүр (төлөв, хайлт, нээсэн мөр). Дахин зурахдаа window.ebRedraw()-г дуудна.
var EB_TABS = [['all', 'Бүгд'], [1, 'Бүртгэгдсэн'], [2, 'Хүлээн авсан'], [3, 'Жолоочид хуваарилсан'], [5, 'Хүлээгдэж буй'], [10, 'Хүргэгдсэн'], ['back', 'Буцаасан, цуцалсан']];
function ebIn(x, t) { return t === 'all' || (t === 'back' ? x.st === 11 || x.st === 12 : String(x.st) === String(t)); }
// Буцаасан/цуцалсан хүргэлтийн бараа: буухиад өгөхөд борлуулалт бичигдэж үлдэгдлээс хасагдсан тул гарт ирэхэд «Хүлээн авсан» дарж л үлдэгдэлд буцаана.
// window.ebRecv байвал (ажилтны хуудас) товч, үгүй бол (удирдлага) зөвхөн төлөв.
function ebBack(x) {
  if (x.st === 1 && window.ebDel) return '<br><button class="mini" onclick="event.stopPropagation();ebDel(\'' + esc(x.code) + '\')">Устгах</button>';   // буухиа зөвхөн «Бүртгэгдсэн»-ийг устгана
  if (x.st !== 11 && x.st !== 12) return '';
  if (!x.id) return '<br><small class="muted">захиалга холбогдоогүй</small>';
  if (x.sd === 'returned') return '<br><small style="color:#15803D">Бараа хүлээн авсан</small>';
  if (!/^yes:/.test(x.sd || '')) return '<br><small class="muted">үлдэгдлээс хасаагүй</small>';
  return window.ebRecv ? '<br><button class="mini" onclick="event.stopPropagation();ebRecv(\'' + esc(x.id) + '\')">Хүлээн авсан</button>' : '<br><small style="color:#B45309">Бараа ирээгүй</small>';
}
var EB_CLS = { 1: 'n', 2: 'b', 3: 'b', 5: 'y', 10: 'g', 11: 'c', 12: 'r' };
var EB_LBL = { code: 'Код', external_order_id: 'Манай захиалгын №', status: 'Төлөв', status_name: 'Төлөвийн нэр', created_at: 'Бүртгэсэн', updated_at: 'Шинэчилсэн', delivered_at: 'Хүргэсэн',
  'customer.name': 'Хүлээн авагч', 'customer.phone': 'Утас', 'customer.phone2': 'Утас 2', 'address.city': 'Хот', 'address.district': 'Дүүрэг', 'address.committee': 'Хороо', 'address.addition': 'Дэлгэрэнгүй хаяг',
  'delivery.item_name': 'Бараа', 'delivery.quantity': 'Тоо', 'delivery.description': 'Тайлбар', 'delivery.total_price': 'Авах дүн', 'delivery.item_type': 'Барааны төрөл', received_money: 'Авсан мөнгө',
  item_name: 'Бараа', quantity: 'Тоо', total_price: 'Авах дүн', verified: 'Баталгаажсан', driver_desc: 'Жолоочийн тайлбар', closed_at: 'Хаагдсан', delivery_fee: 'Хүргэлтийн хөлс', delivery_price: 'Хүргэлтийн хөлс', 'driver.name': 'Жолооч', 'driver.phone': 'Жолоочийн утас', driver_name: 'Жолооч', driver_phone: 'Жолоочийн утас', return_reason: 'Буцаасан шалтгаан', cancel_reason: 'Цуцалсан шалтгаан', comment: 'Тэмдэглэл' };
var ebF = { st: 'all', q: '', open: '' };
function ebHay(x) { return [x.code, x.ext, x.cust, x.phone, x.phone2, x.addr, x.item, x.driver, x.dphone, x.name, x.created, x.at, x.note, x.our].join(' ').toLowerCase(); }
function ebBoard(list, at) {
  list = (list || []).filter(function (x) { return x.id || (x.st !== 11 && x.st !== 12); })   // захиалгатай холбогдоогүй буцаасан/цуцалсныг харуулахгүй
    .sort(function (a, b) { return (b.created || '') < (a.created || '') ? -1 : 1; });
  var cnt = {}; list.forEach(function (x) { cnt[x.st] = (cnt[x.st] || 0) + 1; if (ebIn(x, 'back')) cnt.back = (cnt.back || 0) + 1; });
  if (ebF.st === '11' || ebF.st === '12') ebF.st = 'back';
  var q = ebF.q.toLowerCase().trim();
  var L = list.filter(function (x) { return ebIn(x, ebF.st) && (!q || ebHay(x).indexOf(q) >= 0); });
  var sum = function (k) { return L.reduce(function (a, x) { return a + (Number(x[k]) || 0); }, 0); };
  var tabs = '<div class="eb-tabs">' + EB_TABS.map(function (t) {
    var n = t[0] === 'all' ? list.length : cnt[t[0]] || 0;
    if (t[0] !== 'all' && !n && String(ebF.st) !== String(t[0])) return '';
    return '<button class="' + (String(ebF.st) === String(t[0]) ? 'on' : '') + '" onclick="ebF.st=\'' + t[0] + '\';ebF.open=\'\';ebRedraw()">' + t[1] + ' <small>' + n + '</small></button>';
  }).join('') + '</div>';
  var tool = '<div class="eb-tool"><input type="search" id="ebQ" placeholder="Код, утас, нэр, хаяг, бараа, огноогоор хайх…" value="' + esc(ebF.q) + '" oninput="ebF.q=this.value;ebRedraw(1)">' +
    '<small class="muted">' + L.length + ' хүргэлт · авах ' + fmt(sum('price')) + ' · авсан ' + fmt(sum('got')) + (at ? ' · ' + esc(at) + '-д шинэчилсэн' : '') + '</small></div>';
  if (!L.length) return tabs + tool + '<p class="muted" style="margin:14px 0">' + (list.length ? 'Илэрц алга.' : 'Сүүлийн 31 хоногт буухиад хүргэлт алга.') + '</p>';
  var rows = L.map(function (x) {
    var k = x.code || x.ext, open = ebF.open === k;
    var tr = '<tr class="eb-r' + (open ? ' on' : '') + '" onclick="ebF.open=ebF.open===\'' + esc(k) + '\'?\'\':\'' + esc(k) + '\';ebRedraw()">' +
      '<td><b class="mono2">' + esc(x.code || '—') + '</b><br><small class="muted">' + esc(x.created || '') + '</small></td>' +
      '<td><b>' + esc(x.phone) + '</b>' + (x.cust && x.cust !== x.phone ? '<br><small class="muted">' + esc(x.cust) + '</small>' : '') + '</td>' +
      '<td class="eb-addr">' + esc(x.addr) + '</td><td>' + esc(x.item) + (x.qty ? ' <small class="muted">· ' + x.qty + 'ш</small>' : '') + '</td>' +
      '<td class="n">' + (x.price ? fmt(x.price) : '<small class="muted">0</small>') + '</td><td class="n">' + (x.got ? fmt(x.got) : '') + '</td>' +
      '<td><span class="st ' + (EB_CLS[x.st] || 'y') + '">' + esc(x.name || '—') + '</span>' + (x.at && x.at !== x.created ? '<br><small class="muted">' + esc(x.at) + '</small>' : '') + ebBack(x) + '</td>' +
      '<td>' + esc(x.driver) + (x.dphone ? '<br><small class="muted">' + esc(x.dphone) + '</small>' : '') + '</td><td>' + (x.ok === 'Тийм' ? 'Тийм' : x.ok ? '<small class="muted">' + esc(x.ok) + '</small>' : '') + '</td></tr>';
    if (open) tr += '<tr class="eb-d"><td colspan="9"><div class="eb-kv">' + (x.raw || []).map(function (p) {
      return '<div><small>' + esc(EB_LBL[p[0]] || p[0]) + '</small><span>' + esc(p[0] === 'status' ? x.name : p[1]) + '</span></div>';
    }).join('') + (x.id ? '<div><small>Манай систем</small><span>' + esc(x.our || '') + '</span></div>' : '<div><small>Манай систем</small><span class="muted">захиалгатай холбогдоогүй</span></div>') + '</div></td></tr>';
    return tr;
  }).join('');
  return tabs + tool + '<div class="eb-wrap"><table class="tbl eb-t"><tr><th>Код · огноо</th><th>Хүлээн авагч</th><th>Хаяг</th><th>Бараа</th><th class="n">Авах</th><th class="n">Авсан</th><th>Төлөв</th><th>Жолооч</th><th>Баталгаажсан</th></tr>' + rows + '</table></div>';
}
