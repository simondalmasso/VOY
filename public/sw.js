const CACHE = 'voy-svelte-shell-v3';
const VOY_CACHE_PREFIXES = ['voy-svelte-', 'voy-v', 'voy-cache-', 'voy-static-', 'voy-runtime-'];
const SHELL = ['/', '/manifest.json', '/icons/app-icon.svg', '/brand/voy-mark.svg', '/brand/voy-assistant.svg'];
const isVoyCache = key => VOY_CACHE_PREFIXES.some(prefix => key.startsWith(prefix));
const safePut = async (request, response) => {
  try { const cache = await caches.open(CACHE); await cache.put(request, response); } catch { /* private mode or quota */ }
};
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && isVoyCache(key)).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) event.waitUntil(safePut('/', response.clone()));
      return response;
    }).catch(() => caches.match('/').then(value => value || Response.error())));
    return;
  }
  if (url.pathname.startsWith('/cities/')) {
    // Mobility registries are freshness-sensitive product truth. Never silently
    // replay a cached registry offline as if it were current.
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => new Response(JSON.stringify({ ok: false, error: 'offline_fresh_data_unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    })));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/') || url.pathname === '/manifest.json') {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) event.waitUntil(safePut(request, response.clone()));
      return response;
    })));
  }
});
