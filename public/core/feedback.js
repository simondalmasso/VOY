// ============================================================
//  VOY — core/feedback.js  (V7.9 Field_Ops_and_Persistent_Context)
//
//  VoyFeedbackService — in-flow price-accuracy reporting.
//  Lets users flag inaccurate provider prices without leaving the
//  decision sheet. Creates a training dataset for future TrendEngine
//  calibration (data_accuracy_issue beacons).
//
//  UI: flag icon on each provider price card (hero + alts + taxi/remis).
//  Capture: { routeKey, provider, price_shown, user_note, ts }
//  Transport: Beacon API → /api/telemetry (event: 'data_accuracy_issue')
//             Non-blocking (sendBeacon), fire-and-forget.
//
//  Public API:
//    VoyFeedbackService.report(routeKey, provider, priceShown, userNote)
//    VoyFeedbackService.attachToSheet()  — delegates + event wiring (called from attachSheetEvents)
//
//  Loaded after favorites.js, before main inline <script>.
//  Depends on: navigator.sendBeacon, global svg() at runtime.
// ============================================================

window.VoyFeedbackService=(function(){
  var ENDPOINT='/api/telemetry';
  var _supported=(typeof navigator!=='undefined')&&(typeof navigator.sendBeacon==='function');

  function _routeKey(origin,dest){
    if(!origin||!dest)return 'unknown';
    return Math.round(origin.lat*1000)+'_'+Math.round(origin.lon*1000)+'__'+
           Math.round(dest.lat*1000)+'_'+Math.round(dest.lon*1000);
  }

  function report(routeKey,provider,priceShown,userNote){
    if(!_supported)return false;
    try{
      var payload=JSON.stringify({
        event:'data_accuracy_issue',
        routeKey:String(routeKey||'unknown').slice(0,80),
        provider:String(provider||'unknown').slice(0,32),
        price_shown:isFinite(priceShown)?Number(priceShown):0,
        user_note:String(userNote||'').slice(0,280),
        ts:Date.now()
      });
      var blob=new Blob([payload],{type:'application/json'});
      navigator.sendBeacon(ENDPOINT,blob);
      return true;
    }catch(e){return false}
  }

  // Event delegation: any element with [data-fb-provider] reports on click.
  // Reads provider + price from data attributes; routeKey from MC origin/dest.
  function _onClick(e){
    var btn=e.target.closest('[data-fb-provider]');
    if(!btn)return;
    e.stopPropagation();
    e.preventDefault();
    var provider=btn.getAttribute('data-fb-provider');
    var price=parseFloat(btn.getAttribute('data-fb-price')||'0');
    var origin=window.MC?MC.getOrigin():null;
    var dest=window.MC?MC.getDest():null;
    var routeKey=_routeKey(origin,dest);
    // Immediate beacon (empty note — non-disruptive). User can add note via toast tap.
    var sent=report(routeKey,provider,price,'');
    if(sent){
      // Non-disruptive: toast confirmation + offer to add a note.
      if(typeof showToast==='function'){
        showToast('Precio reportado · gracias por la corrección','success');
      }
    }
    // Visual feedback: pulse the flag icon
    btn.classList.add('fb-pulse');
    setTimeout(function(){btn.classList.remove('fb-pulse')},600);
  }

  function attachToSheet(){
    var sheet=document.getElementById('decisionSheet');
    if(!sheet)return;
    // Avoid double-binding
    if(sheet.getAttribute('data-fb-bound')==='1')return;
    sheet.setAttribute('data-fb-bound','1');
    sheet.addEventListener('click',_onClick);
  }

  return {
    report:report,
    attachToSheet:attachToSheet,
    routeKey:_routeKey,
    supported:function(){return _supported}
  };
})();
