// ============================================================
//  VOY — core/favorites.js  (V7.9 Field_Ops_and_Persistent_Context)
//
//  VoyFavoritesService — persistence layer for frequent destinations.
//  Reduces Time-to-Search: "Casa" / "Trabajo" a un solo toque.
//
//  Storage strategy (per blueprint):
//    - LocalStorage (voy_favorites) = PRIMARY (fast sync read for UI)
//    - MC.v5* IndexedDB = mirror (best-effort sync for future cross-device)
//    - last_used timestamp = touched on every selection → sort by recency
//
//  Schema (per blueprint):
//    { id, name, coords:{lat,lon}, full_address, label, ts (created), last_used }
//
//  Public API:
//    VoyFavoritesService.getAll()           → Array (sync, sorted by last_used desc)
//    VoyFavoritesService.isFavorite(lat,lon)→ Boolean (sync, threshold 0.001°)
//    VoyFavoritesService.add(place, label)  → Promise (writes LS + mirrors to IDB)
//    VoyFavoritesService.remove(id)         → Promise (writes LS + mirrors to IDB)
//    VoyFavoritesService.toggle(place,label)→ Promise<Boolean> (returns new isFav state)
//    VoyFavoritesService.touch(lat, lon)    → Promise (updates last_used on matching fav)
//    VoyFavoritesService.refresh()          → Promise (reloads from LS; noop — LS is source)
//
//  Loaded after telemetry.js, before main inline <script>.
// ============================================================

window.VoyFavoritesService=(function(){
  var LS_KEY='voy_favorites';
  var THRESHOLD=0.001; // ~111m
  var MAX_FAVS=20;

  function _load(){
    try{
      var raw=localStorage.getItem(LS_KEY);
      var arr=raw?JSON.parse(raw):[];
      if(!Array.isArray(arr))return [];
      return arr;
    }catch(e){return []}
  }
  function _save(arr){
    try{localStorage.setItem(LS_KEY,JSON.stringify(arr))}catch(e){/* quota */}
  }
  function _sort(arr){
    arr.sort(function(a,b){
      var aLU=a.last_used||a.ts||0;
      var bLU=b.last_used||b.ts||0;
      return bLU-aLU;
    });
    return arr;
  }
  function _matches(fav,lat,lon){
    return fav&&Math.abs(fav.lat-lat)<THRESHOLD&&Math.abs(fav.lon-lon)<THRESHOLD;
  }
  function _makeId(lat,lon){
    return 'f_'+Math.round(lat*10000)+'_'+Math.round(lon*10000);
  }

  // Best-effort mirror to MC.v5* IndexedDB (non-blocking, catch-all)
  function _mirrorAdd(place,label){
    try{
      if(window.MC&&typeof MC.v5AddFavorite==='function'){
        MC.v5AddFavorite(place,label||'').catch(function(){});
      }
    }catch(e){}
  }
  function _mirrorRemove(id){
    try{
      if(window.MC&&typeof MC.v5RemoveFavorite==='function'){
        MC.v5RemoveFavorite(id).catch(function(){});
      }
    }catch(e){}
  }

  function getAll(){return _sort(_load().slice())}
  function isFavorite(lat,lon){
    var arr=_load();
    for(var i=0;i<arr.length;i++){
      if(_matches(arr[i],lat,lon))return true;
    }
    return false;
  }
  function findFavorite(lat,lon){
    var arr=_load();
    for(var i=0;i<arr.length;i++){
      if(_matches(arr[i],lat,lon))return arr[i];
    }
    return null;
  }

  function add(place,label){
    if(!place||place.lat==null||place.lon==null)return Promise.resolve(false);
    var arr=_load();
    // Don't duplicate (check by coords)
    var existing=findFavorite(place.lat,place.lon);
    if(existing){
      existing.last_used=Date.now();
      _save(arr);
      _mirrorAdd(place,label);
      return Promise.resolve(true);
    }
    var now=Date.now();
    var entry={
      id:_makeId(place.lat,place.lon),
      name:place.name||'',
      label:label||'',
      lat:place.lat,
      lon:place.lon,
      full_address:place.name||'',
      coords:{lat:place.lat,lon:place.lon},
      ts:now,
      last_used:now
    };
    arr.push(entry);
    if(arr.length>MAX_FAVS)arr=arr.slice(arr.length-MAX_FAVS);
    _save(arr);
    _mirrorAdd(place,label);
    return Promise.resolve(true);
  }
  function remove(id){
    var arr=_load();
    var filtered=arr.filter(function(f){return f.id!==id});
    if(filtered.length===arr.length)return Promise.resolve(false);
    _save(filtered);
    _mirrorRemove(id);
    return Promise.resolve(true);
  }
  function toggle(place,label){
    var existing=findFavorite(place.lat,place.lon);
    if(existing){
      return remove(existing.id).then(function(){return false});
    }
    return add(place,label).then(function(){return true});
  }
  function touch(lat,lon){
    var arr=_load();
    var touched=false;
    for(var i=0;i<arr.length;i++){
      if(_matches(arr[i],lat,lon)){
        arr[i].last_used=Date.now();
        touched=true;
        break;
      }
    }
    if(touched){_save(arr);_sort(arr)}
    return Promise.resolve(touched);
  }
  function _refresh(){
    // LS is source of truth — just re-read (no async IDB pull needed).
    // Kept for API compatibility with the original V7.9 spec.
    return Promise.resolve(getAll());
  }

  // Boot: migrate any existing IDB favorites into LS on first load (one-time).
  // Non-blocking — runs after DOMReady. If LS already has data, skip migration.
  if(typeof window!=='undefined'){
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',function(){
        var existing=_load();
        if(existing.length===0&&window.MC&&typeof MC.v5GetFavorites==='function'){
          MC.v5GetFavorites().then(function(favs){
            if(!favs||!favs.length)return;
            var now=Date.now();
            var migrated=favs.map(function(f){
              return {
                id:f.id||_makeId(f.lat,f.lon),
                name:f.name||'',
                label:f.label||'',
                lat:f.lat,lon:f.lon,
                full_address:f.name||'',
                coords:{lat:f.lat,lon:f.lon},
                ts:f.ts||now,
                last_used:f.ts||now
              };
            });
            _save(migrated);
          }).catch(function(){});
        }
      });
    }
  }

  return {
    getAll:getAll,
    isFavorite:isFavorite,
    findFavorite:findFavorite,
    add:add,
    remove:remove,
    toggle:toggle,
    touch:touch,
    refresh:_refresh
  };
})();
