const BUILD_ID='__BUILD_ID__';
const CACHE=`voy-static-${BUILD_ID}`;
const CORE=['/','/styles.css','/app.js','/contracts.js','/runtime-config.js','/manifest.json','/offline.html','/icons/app-icon.svg','/icons/app-icon-192.png','/icons/app-icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return; // external map tiles are never service-worker cached
  if(url.pathname.startsWith('/api/')) { event.respondWith(fetch(req)); return; } // NETWORK_ONLY
  if(req.mode==='navigate') {
    event.respondWith(fetch(req).catch(()=>caches.match('/offline.html')).then(res=>res||caches.match('/offline.html')));
    return;
  }
  event.respondWith(fetch(req).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
    return res;
  }).catch(()=>caches.match(req)));
});
