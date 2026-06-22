// VOY Service Worker — V7.1 (Gemini AC-7)
// Conservative offline shell. Design goals:
//  1. NEVER serve stale HTML for navigations (network-first; cache only on offline fallback).
//     This is critical: VOY's entire pain was stale edge cache, so the SW must not reintroduce it.
//  2. Stale-while-revalidate for same-origin static assets (JS/CSS/icons) → instant shell on reload.
//  3. Cache pinned immutable CDN libs (unpkg @4.7.1) cache-first → saves bandwidth/battery.
//  4. Passthrough cross-origin map tiles (raster) → never cache (storage quota + freshness).
var CACHE = 'voy-v7-1';
var IMMUTABLE = /^https:\/\/unpkg\.com\//;

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  // 1. Navigation (HTML): network-first. Cache is a fallback ONLY when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('/VOY-Lite.html');
        });
      })
    );
    return;
  }

  // 2. Cross-origin: only cache pinned immutable CDN libs (unpkg), cache-first.
  if (url.origin !== self.location.origin) {
    if (IMMUTABLE.test(req.url)) {
      event.respondWith(
        caches.match(req).then(function (cached) {
          if (cached) return cached;
          return fetch(req).then(function (res) {
            if (res && res.ok) {
              var copy = res.clone();
              caches.open(CACHE).then(function (o) { o.put(req, copy); });
            }
            return res;
          }).catch(function () { return cached; });
        })
      );
    }
    // Everything else cross-origin (map tiles, Nominatim, OSRM): passthrough, do not cache.
    return;
  }

  // 3. Same-origin static assets: stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') {
            cache.put(req, res.clone());
          }
          return res;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});
