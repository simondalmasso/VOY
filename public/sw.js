// VOY Service Worker — V7.8 (Modular_Refactor_and_Offline_PWA)
//
// V7.8 (2026-06-25) — offline PWA upgrade:
//   1. Cache bumped 'voy-v7-2' → 'voy-v7-8' (forces fresh start after modular refactor).
//   2. Map tiles (basemaps.cartocdn.com, tile.openstreetmap.org): Cache-First with 7-day expiry.
//      Previously passthrough (never cached) — now cached for offline map rendering.
//   3. /api/estimate: Network-Only (never cached) with IndexedDB fallback when offline.
//      Returns {error:'offline', data: localHistory} from VoyHistoryDB if network fails.
//   4. Static core (/VOY-Lite.html, /core/*.js, css, svg): Stale-While-Revalidate (unchanged).
//   5. /api/* (except /api/estimate): passthrough — NEVER intercepted (V7.2 incident fix preserved).
//
// V7.2 (2026-06-25) — incident fix (preserved):
//   - Activate handler purges ALL caches (not just non-matching) — evicts stale entries.
//   - /api/* paths never cached (prevents VOY_JSON_PARSE_DATA_PREFIX_001 recurrence).
//   - Respects req.cache === 'no-store' and response Cache-Control: no-store|no-cache.
//
// V7.1 (Gemini AC-7) — original conservative offline shell (preserved):
//   1. NEVER serve stale HTML for navigations (network-first; cache only on offline fallback).
//   2. Stale-while-revalidate for same-origin static assets (JS/CSS/icons) → instant shell on reload.
//   3. Cache pinned immutable CDN libs (unpkg @4.7.1) cache-first → saves bandwidth/battery.

var CACHE = 'voy-v7-8';
var IMMUTABLE = /^https:\/\/unpkg\.com\//;
var API_PATH = /^\/api\//;
var ESTIMATE_PATH = /^\/api\/estimate/;
var TILE_DOMAINS = /basemaps\.cartocdn\.com|tile\.openstreetmap\.org/;
var TILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  // V7.2: NUKE ALL caches on activation (not just non-matching names).
  // Guarantees stale entries from prior SW versions are evicted for good.
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// V7.8 — Read recent estimate history from IndexedDB (VoyHistoryDB schema).
// Used as the offline fallback for /api/estimate. Returns [] on any error
// (DB not yet created, store missing, etc.) — never throws.
function _readLocalHistory(limit) {
  return new Promise(function (resolve) {
    try {
      var req = indexedDB.open('voy-history', 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('estimates')) {
          var store = db.createObjectStore('estimates', { keyPath: 'id', autoIncrement: true });
          store.createIndex('routeKey', 'routeKey', { unique: false });
          store.createIndex('mode', 'mode', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = function (e) {
        try {
          var db = e.target.result;
          if (!db.objectStoreNames.contains('estimates')) { resolve([]); return; }
          var tx = db.transaction('estimates', 'readonly');
          var store = tx.objectStore('estimates');
          var idx = store.index('timestamp');
          var results = [];
          var cursorReq = idx.openCursor(null, 'prev');
          cursorReq.onsuccess = function (ev) {
            var cursor = ev.target.result;
            if (cursor && results.length < (limit || 50)) {
              results.push(cursor.value);
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          cursorReq.onerror = function () { resolve([]); };
        } catch (err) { resolve([]); }
      };
      req.onerror = function () { resolve([]); };
    } catch (e) { resolve([]); }
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  // V7.8: /api/estimate — Network-Only with IndexedDB fallback when offline.
  // Intercept BEFORE the GET guard (estimate is a POST). Never caches the response.
  if (url.origin === self.location.origin && ESTIMATE_PATH.test(url.pathname) && req.method === 'POST') {
    event.respondWith(
      fetch(req).catch(function () {
        // Offline fallback — return local history from VoyHistoryDB (IndexedDB).
        return _readLocalHistory(50).then(function (history) {
          return new Response(JSON.stringify({ error: 'offline', data: history }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  // V7.2: NEVER intercept same-origin /api/* requests (except /api/estimate above) — passthrough.
  if (url.origin === self.location.origin && API_PATH.test(url.pathname)) {
    return;
  }

  // Only handle GET from here on (POST/PUT/DELETE passthrough).
  if (req.method !== 'GET') return;

  // V7.2: Respect explicit no-store requests.
  if (req.cache === 'no-store') {
    return;
  }

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

  // 2. Cross-origin requests.
  if (url.origin !== self.location.origin) {
    // 2a. Pinned immutable CDN libs (unpkg): cache-first.
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
      return;
    }
    // 2b. V7.8 Map tiles (CartoDB, OSM): Cache-First with 7-day expiry.
    //     Enables offline map rendering. After 7 days, revalidate in background (SWR).
    if (TILE_DOMAINS.test(url.hostname)) {
      event.respondWith(
        caches.open(CACHE).then(function (cache) {
          return cache.match(req).then(function (cached) {
            var fetchFromNetwork = function () {
              return fetch(req).then(function (res) {
                if (res && res.ok) {
                  var copy = res.clone();
                  cache.put(req, copy);
                }
                return res;
              }).catch(function () { return cached; });
            };
            if (!cached) return fetchFromNetwork();
            // Check age via the cached response's Date header.
            var dateHeader = cached.headers.get('date');
            var ageMs = dateHeader ? (Date.now() - new Date(dateHeader).getTime()) : 0;
            if (ageMs > TILE_MAX_AGE_MS) {
              // Stale (>7d): return cache immediately, revalidate in background.
              fetchFromNetwork();
              return cached;
            }
            // Fresh (<7d): cache-first.
            return cached;
          });
        })
      );
      return;
    }
    // 2c. Everything else cross-origin (Nominatim, OSRM): passthrough, do not cache.
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
