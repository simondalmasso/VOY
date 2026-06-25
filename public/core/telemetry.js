// ============================================================
//  VOY — core/telemetry.js  (V7.8 Modular Refactor)
//
//  Extracted from VOY-Lite.html (V7.7 Performance_Audit_and_Telemetry).
//  Loaded via <script src="core/telemetry.js?v=78"> after ahorro.js +
//  trend.js and before the main inline script. Exposes two globals:
//    - window.VoyHealthMonitor  (Beacon API error/LCP telemetry)
//    - window.VoyDebugPanel     (hidden diagnostic panel)
//
//  Dependencies: PerformanceObserver, navigator.sendBeacon.
//  Uses global svg() at runtime (defined in inline script — only called
//  when the debug panel is toggled, not at load time).
//
//  Boot: _boot() registers HealthMonitor + DebugPanel on DOMReady.
// ============================================================

// ===================== V7.7 PERFORMANCE_AUDIT_AND_TELEMETRY — HealthMonitor =====================
// Captures LCP (Largest Contentful Paint) + uncaught JS errors + unhandled promise rejections.
// Sends via Beacon API (navigator.sendBeacon) to /api/telemetry — fire-and-forget, never blocks unload.
// Schema: {event, value, route}. Throttled per event-type (5s) to avoid spam on cascading errors.
// Vanilla-JS ErrorBoundary equivalent: window 'error' + 'unhandledrejection' listeners (capture phase).
window.VoyHealthMonitor=(function(){
  var ENDPOINT='/api/telemetry';
  var THROTTLE_MS=5000;
  var MAX_ROUTE_LEN=140;
  var _lastSent={};
  var _lastLCP=null; // last LCP value (ms) — exposed for the debug panel (getEntriesByType is drained by the observer)
  var _supported=(typeof navigator!=='undefined')&&(typeof navigator.sendBeacon==='function');

  function _send(event,value,route){
    if(!_supported)return;
    try{
      var key=String(event);
      var now=Date.now();
      if(_lastSent[key]&&(now-_lastSent[key])<THROTTLE_MS)return; // throttle cascading errors
      _lastSent[key]=now;
      var payload=JSON.stringify({
        event:key,
        value:isFinite(value)?Number(value):0,
        route:String(route||(typeof location!=='undefined'?location.pathname:'')).slice(0,MAX_ROUTE_LEN),
        ts:now
      });
      var blob=new Blob([payload],{type:'application/json'});
      navigator.sendBeacon(ENDPOINT,blob);
    }catch(e){/* telemetry must never break the app */}
  }

  function _init(){
    if(!_supported)return false;
    // (1) Uncaught runtime errors (vanilla-JS ErrorBoundary equivalent)
    window.addEventListener('error',function(e){
      var loc='';
      try{loc=(e.filename||'')+':'+(e.lineno||0)+' '+(e.message||'').slice(0,90)}catch(_){}
      _send('js_error',1,loc);
    },{capture:true});
    // (2) Unhandled promise rejections
    window.addEventListener('unhandledrejection',function(e){
      var msg='';
      try{
        var r=e&&e.reason;
        msg=(r&&r.message)?r.message:String(r||'');
        msg=msg.slice(0,90);
      }catch(_){}
      _send('promise_rejection',1,msg);
    },{capture:true});
    // (3) LCP via PerformanceObserver (buffered:true retrieves entries that already fired)
    try{
      var po=new PerformanceObserver(function(list){
        var entries=list.getEntries();
        var last=entries[entries.length-1];
        if(last&&last.startTime){_lastLCP=Math.round(last.startTime);_send('lcp',_lastLCP,'')}
      });
      po.observe({type:'largest-contentful-paint',buffered:true});
    }catch(e){/* LCP observer unsupported — silently skip */}
    return true;
  }

  return {init:_init,send:_send,supported:function(){return _supported},getLastLCP:function(){return _lastLCP}};
})();

// ===================== V7.7 PERFORMANCE_AUDIT_AND_TELEMETRY — DebugPanel =====================
// Hidden diagnostic panel (FPS, Memory, Cache, SW, Latency, LCP, Trend, Ahorro).
// Distinct from the user analytics dashboard (va_dashboard, 5-tap on search icon).
// Trigger: konami code (↑↑↓↓←→←→BA) OR 7 taps on the footer text (mobile-friendly, excludes ·· button).
// window.VoyDebugPanel.toggle() also works from the dev console.
window.VoyDebugPanel=(function(){
  var _visible=false,_panel=null,_rafId=null,_refreshTimer=null;
  var _fps=0,_fpsLast=0,_fpsFrames=0;
  var _latencyMs=null,_latencyTs=0;
  var KONAMI=[38,38,40,40,37,39,37,39,66,65]; // ↑↑↓↓←→←→ B A
  var _kIdx=0,_tapCount=0,_tapTimer=null;

  function _toggle(){if(_visible){_hide()}else{_show()}}

  function _show(){
    _visible=true;_build();_startFPS();_refreshSlow();
    _refreshTimer=setInterval(_refreshSlow,2000);
  }
  function _hide(){
    _visible=false;
    if(_rafId){cancelAnimationFrame(_rafId);_rafId=null}
    if(_refreshTimer){clearInterval(_refreshTimer);_refreshTimer=null}
    if(_panel){_panel.remove();_panel=null}
  }

  function _build(){
    if(_panel)return;
    var p=document.createElement('div');
    p.id='voyDebugPanel';
    p.className='voy-debug-panel';
    p.setAttribute('role','dialog');
    p.setAttribute('aria-label','VOY Debug Panel');
    p.innerHTML=
      '<div class="vdp-head"><span class="vdp-title">VOY · Debug</span>'+
      '<button class="vdp-close" aria-label="Cerrar panel" type="button">×</button></div>'+
      '<dl class="vdp-grid">'+
        '<dt>FPS</dt><dd data-vdp="fps">—</dd>'+
        '<dt>Memoria</dt><dd data-vdp="mem">N/A</dd>'+
        '<dt>Cache</dt><dd data-vdp="cache">—</dd>'+
        '<dt>SW</dt><dd data-vdp="sw">—</dd>'+
        '<dt>Latencia</dt><dd data-vdp="lat">—</dd>'+
        '<dt>LCP</dt><dd data-vdp="lcp">—</dd>'+
        '<dt>Trend</dt><dd data-vdp="trend">—</dd>'+
        '<dt>Ahorro</dt><dd data-vdp="ahorro">—</dd>'+
      '</dl>'+
      '<div class="vdp-foot">konami · V7.8</div>';
    document.body.appendChild(p);
    _panel=p;
    p.querySelector('.vdp-close').addEventListener('click',_hide);
  }

  function _setText(key,val){if(_panel){var el=_panel.querySelector('[data-vdp="'+key+'"]');if(el)el.textContent=val;}}

  function _startFPS(){
    _fpsLast=performance.now();_fpsFrames=0;
    function loop(t){
      if(!_visible)return;
      _fpsFrames++;
      if(t-_fpsLast>=500){
        _fps=Math.round(_fpsFrames*1000/(t-_fpsLast));
        _fpsLast=t;_fpsFrames=0;
        _setText('fps',_fps);
      }
      _rafId=requestAnimationFrame(loop);
    }
    _rafId=requestAnimationFrame(loop);
  }

  function _refreshSlow(){
    if(!_panel||!_visible)return;
    // Memory (Chrome-only — performance.memory)
    var mem='N/A';
    if(performance.memory){
      var used=Math.round(performance.memory.usedJSHeapSize/1048576);
      var limit=Math.round(performance.memory.jsHeapSizeLimit/1048576);
      mem=used+' / '+limit+' MB';
    }
    _setText('mem',mem);
    // Service worker state
    var sw='—';
    if(navigator.serviceWorker){sw=navigator.serviceWorker.controller?'active':'registered'}
    else{sw='unsupported'}
    _setText('sw',sw);
    // Storage estimate (cache quota)
    if(navigator.storage&&navigator.storage.estimate){
      navigator.storage.estimate().then(function(e){
        var usage=e.usage?Math.round(e.usage/1024):0;
        var quota=e.quota?Math.round(e.quota/1048576):0;
        _setText('cache',usage+' KB / '+quota+' MB');
      }).catch(function(){_setText('cache','err')});
    }else{_setText('cache','unsupported')}
    // Latency — ping /api/health (throttled to every 5s)
    var now=Date.now();
    if(now-_latencyTs>5000){
      _latencyTs=now;
      var t0=performance.now();
      fetch('/api/health',{cache:'no-store'}).then(function(r){return r.text()}).then(function(){
        _latencyMs=Math.round(performance.now()-t0);
        _setText('lat',_latencyMs+' ms');
      }).catch(function(){_setText('lat','err')});
    }else if(_latencyMs!=null){_setText('lat',_latencyMs+' ms')}
    // LCP — prefer HealthMonitor's stored value (observer drains the global buffer), fallback to getEntriesByType
    var lcpVal=null;
    if(window.VoyHealthMonitor&&typeof VoyHealthMonitor.getLastLCP==='function'){lcpVal=VoyHealthMonitor.getLastLCP()}
    if(lcpVal==null){
      try{
        var lcpEntries=performance.getEntriesByType('largest-contentful-paint');
        if(lcpEntries&&lcpEntries.length){lcpVal=Math.round(lcpEntries[lcpEntries.length-1].startTime)}
      }catch(_){}
    }
    _setText('lcp',lcpVal!=null?(lcpVal+' ms'):'—')
    // TrendEngine cache (count active provider trends via public getTrend API)
    if(window.VoyTrendEngine){
      try{
        var n=0;var ids=['uber','didi','maxim'];
        for(var i=0;i<ids.length;i++){if(VoyTrendEngine.getTrend(ids[i]))n++}
        _setText('trend',n+' activos');
      }catch(_){_setText('trend','?')}
    }else{_setText('trend','off')}
    // AhorroService state
    if(window.VoyAhorroService){
      try{var st=VoyAhorroService.getState();_setText('ahorro',st.available?(st.savingsPercent+'%'):'off')}
      catch(_){_setText('ahorro','?')}
    }else{_setText('ahorro','off')}
  }

  function _onKey(e){
    var k=e.keyCode||e.which;
    if(k===KONAMI[_kIdx]){
      _kIdx++;
      if(_kIdx===KONAMI.length){_kIdx=0;_toggle();}
    }else{
      _kIdx=(k===KONAMI[0])?1:0;
    }
  }

  function _onFooterTap(){
    _tapCount++;
    if(_tapTimer)clearTimeout(_tapTimer);
    _tapTimer=setTimeout(function(){_tapCount=0},2200);
    if(_tapCount>=7){_tapCount=0;_toggle();}
  }

  function _init(){
    // Konami code (keyboard — desktop)
    document.addEventListener('keydown',_onKey);
    // 7-tap on footer text (mobile — excludes the ·· footerMore button which has its own handler)
    var footer=document.querySelector('.footer');
    if(footer){
      footer.addEventListener('click',function(e){
        if(e.target.closest('.footer-more'))return;
        _onFooterTap();
      });
    }
  }

  return {init:_init,toggle:_toggle};
})();

// V7.8 boot — register health monitoring + debug panel ASAP.
// Guarded for DOMReady: the external script may load before the body is fully parsed
// (it's placed before the main inline <script> at end of body, so the footer usually
// exists, but the readyState guard makes it bulletproof).
function _voyTelemetryBoot(){
  try{if(window.VoyHealthMonitor)VoyHealthMonitor.init();}catch(e){}
  try{if(window.VoyDebugPanel)VoyDebugPanel.init();}catch(e){}
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',_voyTelemetryBoot);
}else{
  _voyTelemetryBoot();
}
