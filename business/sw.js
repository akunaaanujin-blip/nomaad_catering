// NOMAAD ажилтан/удирдлага — файлуудыг төхөөрөмжид хадгалж хуудсыг шууд нээнэ.
// HTML: сүлжээ эхэлж, хөтчийн HTTP кэшгүй (шинэчлэл шууд орно), тасарвал хадгалсныг; ?v= бүхий JS/CSS ба CDN сан: хадгалснаас (хувилбар солигдоход шинээр татна).
// Сервер (script.google.com) болон бусад API-г ХЭЗЭЭ Ч хадгалахгүй.
var CACHE = 'nb-static-v2';   // v1-д бүх хуучин хувилбар (?v=, ?цаг) хуримтлагдсан — activate-д устгана
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (K) { return Promise.all(K.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var u = new URL(req.url);
  var cdn = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname);
  var own = u.origin === self.location.origin;
  if (!own && !cdn) return;
  var isHtml = req.mode === 'navigate' || /\.html$|\/$/.test(u.pathname);
  if (isHtml) {
    var key = u.origin + u.pathname;   // хуудас бүр нэг л хуулбар (асуулгагүй) — сүлжээ тасарвал хамгийн сүүлийнхийг
    e.respondWith(fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) { if (r.redirected) return Response.redirect(r.url, 302); if (r.ok) { var c = r.clone(); caches.open(CACHE).then(function (ca) { ca.put(key, c); }); } return r; })
      .catch(function () { return caches.match(key); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (r) {
      if (r.ok || r.type === 'opaque') { var c = r.clone(); caches.open(CACHE).then(function (ca) {
        ca.put(req, c);
        if (own) ca.keys().then(function (K) { K.forEach(function (k) { var x = new URL(k.url); if (x.pathname === u.pathname && x.search !== u.search) ca.delete(k); }); });   // ижил файлын хуучин ?v= хувилбарыг устгана
      }); }
      return r; });
  }));
});
