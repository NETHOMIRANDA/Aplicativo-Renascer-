/* sw.js - funciona offline (PWA) */
var CACHE = "renascer-v3";

var ARQUIVOS = [
  "./",
  "./index.html",
  "./admin.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/catalogo-seed.js",
  "./js/fotos-seed.js",
  "./js/store.js",
  "./js/sync.js",
  "./js/pix.js",
  "./js/qrcode.js",
  "./js/app.js",
  "./js/admin.js",
  "./img/icon-192.png",
  "./img/icon-512.png",
  "./img/apple-touch-icon.png",
  "./img/foto-01.jpg",
  "./img/foto-02.jpg",
  "./img/foto-03.jpg",
  "./img/foto-04.jpg",
  "./img/foto-05.jpg",
  "./img/foto-06.jpg",
  "./img/foto-07.jpg",
  "./img/foto-08.jpg",
  "./img/foto-09.jpg",
  "./img/foto-10.jpg",
  "./img/foto-11.jpg",
  "./img/foto-12.jpg",
  "./img/foto-13.jpg",
  "./img/foto-14.jpg",
  "./img/foto-15.jpg",
  "./img/foto-16.jpg",
  "./img/foto-17.jpg",
  "./img/foto-18.jpg",
  "./img/foto-19.jpg",
  "./img/foto-20.jpg",
  "./img/foto-21.jpg",
  "./img/foto-22.jpg",
  "./img/foto-23.jpg",
  "./img/foto-24.jpg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ARQUIVOS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.map(function (n) {
        if (n !== CACHE) return caches.delete(n);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: false }).then(function (cacheado) {
      var rede = fetch(e.request).then(function (resp) {
        if (resp && resp.ok && e.request.url.indexOf(location.origin) === 0) {
          var copia = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
        }
        return resp;
      }).catch(function () {
        return cacheado;
      });
      return cacheado || rede;
    })
  );
});
