// NOMAAD ажилтан/удирдлага — файлуудыг төхөөрөмжид хадгалж хуудсыг шууд нээнэ.
// HTML: сүлжээ эхэлж (шинэчлэл шууд орно), тасарвал хадгалсныг; ?v= бүхий JS/CSS ба CDN сан: хадгалснаас (хувилбар солигдоход шинээр татна).
// Сервер (script.google.com) болон бусад API-г ХЭЗЭЭ Ч хадгалахгүй.
var CACHE = 'nb-static-v1';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var u = new URL(req.url);
  var cdn = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname);
  var own = u.origin === self.location.origin;
  if (!own && !cdn) return;
  var isHtml = req.mode === 'navigate' || /\.html$|\/$/.test(u.pathname);
  if (isHtml) {
    e.respondWith(fetch(req).then(function (r) { var c = r.clone(); caches.open(CACHE).then(function (ca) { ca.put(req, c); }); return r; })
      .catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (r) { if (r.ok || r.type === 'opaque') { var c = r.clone(); caches.open(CACHE).then(function (ca) { ca.put(req, c); }); } return r; });
  }));
});
