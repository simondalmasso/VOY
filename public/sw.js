const BUILD_ID='__BUILD_ID__';
const CACHE='voy-static-'+BUILD_ID;
const CORE=[
  '/',
  '/styles.css?v='+BUILD_ID,
  '/app.js?v='+BUILD_ID,
  '/contracts.js?v='+BUILD_ID,
  '/runtime-config.js?v='+BUILD_ID,
  '/manifest.json',
  '/offline.html',
  '/icons/app-icon.svg',
  '/icons/app-icon-192.png',
  '/icons/app-icon-512.png',
  '/icons/bus-transport-icons8.svg',
  '/tracker/store.js?v='+BUILD_ID,
  '/tracker/observations.js?v='+BUILD_ID,
  '/tracker/fixtures.js?v='+BUILD_ID,
  '/map/substrate.js?v='+BUILD_ID,
  '/transit/line-picker.js?v='+BUILD_ID,
  '/transit/santa-fe-lines.json?v='+BUILD_ID
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return; // external map tiles are never service-worker cached
  if(url.pathname.startsWith('/api/')) { event.respondWith(fetch(req)); return; } // NETWORK_ONLY
  if(req.headers.has('range')) return; // Never cache partial byte-range responses (PMTiles).
  if(req.mode==='navigate') {
    event.respondWith(fetch(req)
      .then(response => response.ok && (response.headers.get('content-type') || '').includes('text/html') ? response : caches.match('/offline.html'))
      .catch(() => caches.match('/offline.html'))
      .then(response => response || new Response('Sin conexión', {status:503,headers:{'content-type':'text/plain; charset=utf-8'}})));
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    const response=await fetch(req);
    if(response.ok&&response.status===200){
      try { await (await caches.open(CACHE)).put(req,response.clone()); } catch {}
    }
    return response;
  })().catch(()=>caches.match(req)));
});
