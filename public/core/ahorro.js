// ============================================================
//  VOY — core/ahorro.js  (V7.8 Modular Refactor)
//
//  Extracted from VOY-Lite.html (V7.5 Ahorro_Inteligente).
//  Loaded via <script src="core/ahorro.js?v=78"> before the main
//  inline script. Exposes two globals:
//    - window.VoyAhorroService  (observer IIFE — comparative cost engine)
//    - renderAhorroBadges()     (idempotent BadgeRenderer)
//
//  Dependencies: none (pure vanilla JS). Uses global svg() at runtime
//  (defined later in the inline script — only called when invoked, not
//  at load time).
//
//  Blueprint: isRecommendationAvailable = (PublicTransportPrice < RideHailingPrice * threshold)
//  threshold=0.5, refresh=300000ms, data_source=MC.getEstimations() via renderSheet.
// ============================================================

// ===================== V7.5 AHORRO INTELIGENTE =================================================
// Blueprint: AhorroFeature — comparative cost algorithm (Colectivo vs Ride-Hailing).
//   formula: isRecommendationAvailable = (PublicTransportPrice < RideHailingPrice * threshold)
// Decoupled from rendering via observer pattern (mirrors VoyMapContext). renderSheet() calls
// recompute() after each estimate; _set() emits to listeners + triggers BadgeRenderer.
window.VoyAhorroService=(function(){
  var THRESHOLD=0.5;
  var REFRESH_MS=300000;
  var _state={available:false,colectivoPrice:null,rideHailingPrice:null,savingsPercent:0,threshold:THRESHOLD};
  var _listeners=[];
  var _lastComputeTs=0;
  function _emit(){for(var i=0;i<_listeners.length;i++){try{_listeners[i](_state)}catch(e){console.error('[VoyAhorroService] listener',e)}}}
  function _set(avail,colP,rhP,sav){
    var changed=_state.available!==avail||_state.colectivoPrice!==colP||_state.rideHailingPrice!==rhP||_state.savingsPercent!==sav;
    _state.available=avail;
    if(colP!=null)_state.colectivoPrice=colP;
    if(rhP!=null)_state.rideHailingPrice=rhP;
    if(sav!=null)_state.savingsPercent=sav;
    if(changed){
      _emit();
      if(typeof renderAhorroBadges==='function')renderAhorroBadges();
    }
  }
  function recompute(colectivoPrice,rideHailingPrice){
    if(colectivoPrice==null||colectivoPrice<0||rideHailingPrice==null||rideHailingPrice<=0){_set(false,null,null,0);return}
    _lastComputeTs=Date.now();
    var avail=colectivoPrice<(rideHailingPrice*THRESHOLD);
    var sav=rideHailingPrice>0?Math.round((1-colectivoPrice/rideHailingPrice)*100):0;
    _set(avail,colectivoPrice,rideHailingPrice,sav);
  }
  function isStale(){return _lastComputeTs===0||(Date.now()-_lastComputeTs)>REFRESH_MS}
  return {
    THRESHOLD:THRESHOLD,REFRESH_MS:REFRESH_MS,
    getState:function(){return _state},
    recompute:recompute,
    isStale:isStale,
    subscribe:function(fn){_listeners.push(fn);return function(){_listeners=_listeners.filter(function(f){return f!==fn})}}
  };
})();

// V7.5 BadgeRenderer — mounts "¡Ahorrá un X%!" on every Colectivo mode-pill and a
// highlight dot on the Ahorro cat-tab when VoyAhorroService.getState().available is true.
// Idempotent: safe to call on every state change (clears stale badges first, then mounts fresh).
function renderAhorroBadges(){
  if(!window.VoyAhorroService)return; // not yet initialized (boot-time call from initCategoryManager)
  var st=VoyAhorroService.getState();
  // (1) Ahorro cat-tab highlight dot (group index 0 = group_ahorro)
  var ahorroTabs=document.querySelectorAll('.cat-tab[data-group-idx="0"]');
  for(var i=0;i<ahorroTabs.length;i++){
    var tab=ahorroTabs[i];
    var dot=tab.querySelector('.ahorro-tab-badge');
    if(st.available){
      if(!dot){dot=document.createElement('span');dot.className='ahorro-tab-badge';dot.setAttribute('aria-label','Ahorro disponible');tab.appendChild(dot)}
    }else if(dot){dot.parentNode.removeChild(dot)}
  }
  // (2) Colectivo mode-pill badges — every bus pill across ALL groups (Ahorro + Público)
  var busPills=document.querySelectorAll('.mode-pill[data-mode="bus"]');
  for(var j=0;j<busPills.length;j++){
    var pill=busPills[j];
    var badge=pill.querySelector('.ahorro-pill-badge');
    if(st.available){
      var txt='¡Ahorrá un '+st.savingsPercent+'%!';
      if(!badge){badge=document.createElement('span');badge.className='ahorro-pill-badge';pill.appendChild(badge)}
      badge.textContent=txt;
    }else if(badge){badge.parentNode.removeChild(badge)}
  }
}
