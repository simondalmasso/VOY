// VOY Service Worker — V7.8 stability foundation
//
// Security/PWA boundary changes (2026-07-17):
//   1. Activation deletes only VOY-owned caches; unrelated origin caches survive.
//   2. Residual /api/estimate interception was removed because the production
//      Worker does not expose that route.
//   3. All same-origin /api/* requests pass through without caching.
//   4. Cache writes are best-effort so quota failures never break navigation.
//   5. Fare registry/engine update rotates the VOY cache so regulated prices
//      cannot remain pinned behind an older same-origin static asset response.
//
// Preserved behavior:
//   - navigation: network-first with cached shell fallback;
//   - same-origin static assets: stale-while-revalidate;
//   - pinned unpkg assets: cache-first;
//   - CARTO/OSM tiles: cache-first with seven-day revalidation;
//   - other cross-origin requests: passthrough.

var CACHE_PREFIX = 'voy-';
var CACHE = 'voy-v7-8-fares-1';
var IMMUTABLE = /^https:\/\/unpkg\.com\//;
var API_PATH = /^\/api\//;
var TILE_DOMAINS = /basemaps\.cartocdn\.com|tile\.openstreetmap\.org/;
var TILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function _safePut(cache, request, response) {
  try {
    return cache.put(request, response).catch(function () {});
  } catch (_) {
    return Promise.resolve();
  }
}

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE) {
            return caches.delete(key);
          }
          return false;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url;
  try { url = new URL(request.url); } catch (_) { return; }

  // API calls are always network-owned. No POST fallback or API response cache.
  if (url.origin === self.location.origin && API_PATH.test(url.pathname)) {
    return;
  }

  if (request.method !== 'GET') return;
  if (request.cache === 'no-store') return;

  // Navigation HTML: network-first. Cached HTML is used only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match('/VOY-Lite.html');
        });
      })
    );
    return;
  }

  // Cross-origin resources.
  if (url.origin !== self.location.origin) {
    // Pinned immutable CDN libraries.
    if (IMMUTABLE.test(request.url)) {
      event.respondWith(
        caches.match(request).then(function (cached) {
          if (cached) return cached;
          return fetch(request).then(function (response) {
            if (response && response.ok) {
              var copy = response.clone();
              caches.open(CACHE).then(function (cache) { return _safePut(cache, request, copy); });
            }
            return response;
          });
        })
      );
      return;
    }

    // Map tiles: cache-first; stale tiles are returned while revalidating.
    if (TILE_DOMAINS.test(url.hostname)) {
      event.respondWith(
        caches.open(CACHE).then(function (cache) {
          return cache.match(request).then(function (cached) {
            var fetchFromNetwork = function () {
              return fetch(request).then(function (response) {
                if (response && response.ok) {
                  _safePut(cache, request, response.clone());
                }
                return response;
              }).catch(function () { return cached; });
            };

            if (!cached) return fetchFromNetwork();
            var dateHeader = cached.headers.get('date');
            var ageMs = dateHeader ? (Date.now() - new Date(dateHeader).getTime()) : 0;
            if (ageMs > TILE_MAX_AGE_MS) {
              event.waitUntil(fetchFromNetwork());
            }
            return cached;
          });
        })
      );
      return;
    }

    // Nominatim, OSRM and every other external request: passthrough.
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(request).then(function (cached) {
        var network = fetch(request).then(function (response) {
          if (response && response.ok && response.type === 'basic') {
            var cacheControl = response.headers.get('Cache-Control') || '';
            if (!/no-store|no-cache/i.test(cacheControl)) {
              _safePut(cache, request, response.clone());
            }
          }
          return response;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});
