// VOY Service Worker — V7.2 (VOY_JSON_PARSE_DATA_PREFIX_001 incident fix)
//
// V7.2 (2026-06-25) — incident fix:
//   Root cause: V7.1 was caching /api/* responses under cache name 'voy-v7-1'.
//   During the production 'Observer' era (another Next.js build briefly deployed
//   to the same Cloudflare Worker), some /api/* responses were stored in the SW
//   cache with Next.js RSC streaming format ('data: {...}'). After VOY V7.8.0
//   was redeployed, the SW kept serving those stale cached responses, causing
//   SyntaxError: Unexpected token 'd', "data: {\"da\"... in the frontend.
//
//   Fixes:
//     1. Bumped cache name 'voy-v7-1' → 'voy-v7-2' (forces fresh start).
//     2. Activate handler now purges ALL caches (not just non-matching) —
//        guarantees stale entries from any prior SW version are evicted.
//     3. /api/* paths are NEVER intercepted (passthrough to network) —
//        prevents any chance of API responses being cached and re-served.
//     4. Respect req.cache === 'no-store' (skip caching entirely).
//     5. Respect response Cache-Control: no-store|no-cache (skip caching).
//
// V7.1 (Gemini AC-7) — original conservative offline shell, design goals:
//   1. NEVER serve stale HTML for navigations (network-first; cache only on offline fallback).
//   2. Stale-while-revalidate for same-origin static assets (JS/CSS/icons) → instant shell on reload.
//   3. Cache pinned immutable CDN libs (unpkg @4.7.1) cache-first → saves bandwidth/battery.
//   4. Passthrough cross-origin map tiles (raster) → never cache (storage quota + freshness).

var CACHE = 'voy-v7-2';
var IMMUTABLE = /^https:\/\/unpkg\.com\//;
var API_PATH = /^\/api\//;

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  // V7.2: NUKE ALL caches on activation (not just non-matching names).
  // This guarantees stale entries from prior SW versions (including the
  // contaminated 'voy-v7-1' from the Observer era) are evicted for good.
  // Safe because `activate` only fires once per new SW version taking over.
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  // V7.2: NEVER intercept same-origin /api/* requests — pass straight to network.
  // API responses must never be cached (they can change per-request, and caching
  // was the root cause of VOY_JSON_PARSE_DATA_PREFIX_001).
  if (url.origin === self.location.origin && API_PATH.test(url.pathname)) {
    return;
  }

  // V7.2: Respect explicit no-store requests (fetch(url, {cache: 'no-store'})).
  if (req.cache === 'no-store') {
    return;
  }

  // 1. Navigation (HTML): network-first. Cache is a fallback ONLY when offline.
  //    Critical: VOY's entire pain was stale edge cache, so the SW must not
  //    reintroduce it.
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
  //    V7.2: respect Cache-Control: no-store|no-cache from response — skip caching.
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') {
            var cc = res.headers.get('Cache-Control') || '';
            if (!/no-store|no-cache/i.test(cc)) {
              cache.put(req, res.clone());
            }
          }
          return res;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});
