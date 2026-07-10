// ============================================================
//  VOY — core/trend.js  (V7.8 Modular Refactor)
//
//  Extracted from VOY-Lite.html (V7.6 Predictive_Trend_Engine).
//  Loaded via <script src="core/trend.js?v=78"> after ahorro.js and
//  before telemetry.js. Exposes three globals:
//    - window.VoyHistoryDB    (IndexedDB wrapper — async, 30-day retention)
//    - window.VoyTrendEngine  (SMA deviation engine — STABLE/RISING/FALLING)
//    - renderTrendBadges()    (idempotent PriceTrendBadge renderer)
//
//  Dependencies: IndexedDB (native). Uses global svg() at runtime.
//
//  Blueprint:
//    storage: IndexedDB (voy-history / estimates), schema {timestamp, routeKey,
//             origin_zone, destination_zone, price, mode}, retention 30 days, async.
//    logic:   Simple_Moving_Average_Deviation = current_price / moving_average_3_hours
//    states:  STABLE (0.95≤ratio≤1.05) / RISING (>1.05) / FALLING (<0.95)
//    gate:    badge only renders if ≥3 historical datapoints for route+provider in 3h.
// ============================================================

// ===================== V7.6 PREDICTIVE TREND ENGINE ============================================
// Blueprint: TrendEngine + HistoryDB — local historical estimates + Simple_Moving_Average_Deviation.
window.VoyHistoryDB=(function(){
  var DB_NAME='voy-history';
  var DB_VERSION=1;
  var STORE='estimates';
  var RETENTION_DAYS=30;
  var _dbPromise=null;
  function open(){
    if(_dbPromise)return _dbPromise;
    _dbPromise=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB not supported'));return}
      try{
        var req=indexedDB.open(DB_NAME,DB_VERSION);
        req.onupgradeneeded=function(e){
          var db=e.target.result;
          if(!db.objectStoreNames.contains(STORE)){
            var store=db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});
            store.createIndex('routeKey','routeKey',{unique:false});
            store.createIndex('mode','mode',{unique:false});
            store.createIndex('timestamp','timestamp',{unique:false});
          }
        };
        req.onsuccess=function(e){resolve(e.target.result)};
        req.onerror=function(e){reject(e.target.error)};
      }catch(err){reject(err)}
    });
    return _dbPromise;
  }
  function add(entry){
    return open().then(function(db){
      return new Promise(function(resolve,reject){
        try{
          var tx=db.transaction(STORE,'readwrite');
          var store=tx.objectStore(STORE);
          var req=store.add(entry);
          req.onsuccess=function(){resolve(req.result)};
          req.onerror=function(){reject(req.error)};
        }catch(err){reject(err)}
      });
    });
  }
  function queryByRouteSince(routeKeyVal,sinceMs){
    return open().then(function(db){
      return new Promise(function(resolve,reject){
        try{
          var tx=db.transaction(STORE,'readonly');
          var store=tx.objectStore(STORE);
          var idx=store.index('routeKey');
          var results=[];
          var req=idx.openCursor(IDBKeyRange.only(routeKeyVal));
          req.onsuccess=function(e){
            var cursor=e.target.result;
            if(cursor){
              if(cursor.value.timestamp>=sinceMs)results.push(cursor.value);
              cursor.continue();
            }else{resolve(results)}
          };
          req.onerror=function(){reject(req.error)};
        }catch(err){reject(err)}
      });
    });
  }
  // V7.8 Offline PWA — query recent entries across ALL routes (used by SW fallback + offline chip).
  // Returns the most recent `limit` entries sorted by timestamp descending.
  function queryRecent(limit){
    return open().then(function(db){
      return new Promise(function(resolve,reject){
        try{
          var tx=db.transaction(STORE,'readonly');
          var store=tx.objectStore(STORE);
          var idx=store.index('timestamp');
          var results=[];
          var req=idx.openCursor(null,'prev');
          req.onsuccess=function(e){
            var cursor=e.target.result;
            if(cursor&&results.length<(limit||50)){
              results.push(cursor.value);
              cursor.continue();
            }else{resolve(results)}
          };
          req.onerror=function(){reject(req.error)};
        }catch(err){reject(err)}
      });
    }).catch(function(){return []});
  }
  function pruneOlderThan(days){
    var cutoff=Date.now()-(days*24*60*60*1000);
    return open().then(function(db){
      return new Promise(function(resolve,reject){
        try{
          var tx=db.transaction(STORE,'readwrite');
          var store=tx.objectStore(STORE);
          var idx=store.index('timestamp');
          var count=0;
          var req=idx.openCursor(IDBKeyRange.upperBound(cutoff));
          req.onsuccess=function(e){
            var cursor=e.target.result;
            if(cursor){cursor.delete();count++;cursor.continue()}
            else{resolve(count)}
          };
          req.onerror=function(){reject(req.error)};
        }catch(err){reject(err)}
      });
    });
  }
  return {RETENTION_DAYS:RETENTION_DAYS,DB_NAME:DB_NAME,STORE:STORE,open:open,add:add,queryByRouteSince:queryByRouteSince,queryRecent:queryRecent,pruneOlderThan:pruneOlderThan};
})();

window.VoyTrendEngine=(function(){
  var WINDOW_MS=3*60*60*1000; // 3 hours (blueprint: moving_average_3_hours)
  var MIN_DATAPOINTS=3; // QA test 2: badge only if ≥3 historical datapoints
  var THRESHOLD_UP=1.05; // >5% above SMA → RISING
  var THRESHOLD_DOWN=0.95; // <5% below SMA → FALLING
  var RECORD_DEDUPE_MS=60000; // skip record if same route+provider recorded <60s ago
  var _cache={}; // providerId → {state, sma, ratio, datapoints, routeKey}
  var _lastRecordTs={}; // routeKey|providerId → timestamp (dedupe)
  var _gen=0; // generation counter — only latest processEstimate renders badges
  function _zoneKey(lat,lon){
    var GRID=0.0072; // ~800m, matches _VA_GRID (coarse geo cluster)
    return (Math.round(lat/GRID))+'_'+(Math.round(lon/GRID));
  }
  function routeKey(origin,dest){
    if(!origin||!dest||origin.lat==null||dest.lat==null)return null;
    return _zoneKey(origin.lat,origin.lon)+'>'+_zoneKey(dest.lat,dest.lon);
  }
  function analyze(routeKeyVal,providerId,currentPrice){
    if(!routeKeyVal||!providerId||!currentPrice||currentPrice<=0)return Promise.resolve(null);
    var sinceMs=Date.now()-WINDOW_MS;
    return VoyHistoryDB.queryByRouteSince(routeKeyVal,sinceMs).then(function(entries){
      var filtered=[];
      for(var i=0;i<entries.length;i++){
        if(entries[i].mode===providerId)filtered.push(entries[i]);
      }
      if(filtered.length<MIN_DATAPOINTS)return null; // gate: insufficient historical data
      var sum=0;
      for(var j=0;j<filtered.length;j++)sum+=filtered[j].price;
      var sma=sum/filtered.length;
      var ratio=currentPrice/sma;
      var state=ratio>THRESHOLD_UP?'RISING':ratio<THRESHOLD_DOWN?'FALLING':'STABLE';
      return {state:state,sma:Math.round(sma),ratio:Math.round(ratio*100)/100,datapoints:filtered.length,routeKey:routeKeyVal};
    }).catch(function(){return null});
  }
  function record(routeKeyVal,origin,dest,providerId,price){
    if(!routeKeyVal||!providerId||!price||price<=0)return Promise.resolve();
    var dedupeKey=routeKeyVal+'|'+providerId;
    var now=Date.now();
    if(_lastRecordTs[dedupeKey]&&(now-_lastRecordTs[dedupeKey])<RECORD_DEDUPE_MS)return Promise.resolve();
    _lastRecordTs[dedupeKey]=now;
    var entry={
      timestamp:now,
      routeKey:routeKeyVal,
      origin_zone:_zoneKey(origin.lat,origin.lon),
      destination_zone:_zoneKey(dest.lat,dest.lon),
      price:price,
      mode:providerId
    };
    return VoyHistoryDB.add(entry).catch(function(){});
  }
  function processEstimate(autoEst,origin,dest){
    if(!autoEst||!origin||!dest||!autoEst.rankedProviders)return Promise.resolve();
    var rk=routeKey(origin,dest);
    if(!rk)return Promise.resolve();
    var myGen=++_gen;
    _cache={}; // clear stale trends from previous route (prevents wrong-route badge races)
    var providers=[];
    for(var i=0;i<autoEst.rankedProviders.length;i++){
      var p=autoEst.rankedProviders[i];
      if(p&&(p.id==='uber'||p.id==='didi'||p.id==='maxim')&&p.price>0){
        providers.push({id:p.id,price:p.price});
      }
    }
    if(!providers.length)return Promise.resolve();
    // Sequential: analyze (read historical) → record (write current) per provider.
    // Avoids write-before-read race on same route+provider.
    var chain=Promise.resolve();
    providers.forEach(function(pr){
      chain=chain.then(function(){return analyze(rk,pr.id,pr.price)})
        .then(function(trend){_cache[pr.id]=trend})
        .then(function(){return record(rk,origin,dest,pr.id,pr.price)});
    });
    return chain.then(function(){
      if(myGen===_gen){renderTrendBadges()} // only latest generation renders
      // Opportunistic prune (fire-and-forget, 1/50 calls)
      if(Math.random()<0.02){VoyHistoryDB.pruneOlderThan(VoyHistoryDB.RETENTION_DAYS).catch(function(){})}
    });
  }
  function getTrend(providerId){return _cache[providerId]||null}
  return {
    WINDOW_MS:WINDOW_MS,MIN_DATAPOINTS:MIN_DATAPOINTS,THRESHOLD_UP:THRESHOLD_UP,THRESHOLD_DOWN:THRESHOLD_DOWN,
    routeKey:routeKey,analyze:analyze,record:record,processEstimate:processEstimate,getTrend:getTrend
  };
})();

// V7.6 PriceTrendBadge renderer — mounts trend icon next to every element with [data-trend-provider].
// Idempotent: clears stale badges first, then mounts fresh based on VoyTrendEngine cache.
// No-op if cache empty (badge never appears until ≥3 datapoints accumulated → analyze returns null).
function renderTrendBadges(){
  if(!window.VoyTrendEngine)return;
  var els=document.querySelectorAll('[data-trend-provider]');
  for(var i=0;i<els.length;i++){
    var el=els[i];
    var pid=el.getAttribute('data-trend-provider');
    var trend=VoyTrendEngine.getTrend(pid);
    var existing=el.querySelector('.price-trend-badge');
    if(!trend){
      if(existing)existing.parentNode.removeChild(existing);
      continue;
    }
    var icon='minus',cls='minus';
    if(trend.state==='RISING'){icon='trendingUp';cls='trending-up'}
    else if(trend.state==='FALLING'){icon='trendingDown';cls='trending-down'}
    if(existing){
      existing.className='price-trend-badge '+cls;
      existing.innerHTML=svg(icon,14);
    }else{
      var b=document.createElement('span');
      b.className='price-trend-badge '+cls;
      b.innerHTML=svg(icon,14);
      b.setAttribute('aria-label','Tendencia '+trend.state.toLowerCase()+' (vs promedio 3h, '+trend.datapoints+' muestras)');
      b.setAttribute('title','Tendencia: '+trend.state.toLowerCase()+' · promedio 3h: $'+trend.sma+' · ratio '+trend.ratio);
      el.appendChild(b);
    }
  }
}
