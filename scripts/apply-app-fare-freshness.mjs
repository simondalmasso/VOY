import { readFile, writeFile } from 'node:fs/promises';

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`${label}: expected block not found`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) {
    throw new Error(`${label}: expected exactly one block`);
  }
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

const engineUrl = new URL('../public/core/mobilityEngine.js', import.meta.url);
let engine = await readFile(engineUrl, 'utf8');

const oldAppFareBlock = `  /**
   * Calculate ride-hailing app price from fare config.
   * @param {object} fareConfig - e.g. FareRegistry.apps.uber
   * @param {number} distKm - Distance in km
   * @param {number} timeMin - Estimated ride time in minutes
   * @returns {number|null} Price in ARS, or null if unavailable
   */
  function calcAppPrice(fareConfig, distKm, timeMin) {
    if (!fareConfig || fareConfig.base === null) return null;
    var price = fareConfig.base + fareConfig.km * distKm + fareConfig.min * timeMin;
    return Math.max(price, fareConfig.minFare);
  }
`;

const newAppFareBlock = `  var APP_FARE_CURRENT_STATUSES = {
    current: true,
    verified: true,
    active: true,
    estimated_current: true
  };

  /**
   * Decide whether an app fare model may influence price comparison.
   * Explicit stale/unknown statuses fail closed. Missing status remains
   * compatible with legacy injected fixtures until city schemas require it.
   * @param {object} fareConfig
   * @returns {boolean}
   */
  function isAppFareUsable(fareConfig) {
    if (!fareConfig || fareConfig.base === null || fareConfig.base === undefined) return false;
    var status = String(fareConfig.status || '').trim().toLowerCase();
    if (!status) return true;
    return APP_FARE_CURRENT_STATUSES[status] === true;
  }

  /**
   * Calculate ride-hailing app price only from a current fare model.
   * @param {object} fareConfig - e.g. FareRegistry.apps.uber
   * @param {number} distKm - Distance in km
   * @param {number} timeMin - Estimated ride time in minutes
   * @returns {number|null} Price in ARS, or null when unavailable/stale
   */
  function calcAppPrice(fareConfig, distKm, timeMin) {
    if (!isAppFareUsable(fareConfig)) return null;
    var price = fareConfig.base + fareConfig.km * distKm + fareConfig.min * timeMin;
    return Math.max(price, fareConfig.minFare);
  }
`;

engine = replaceExactlyOnce(engine, oldAppFareBlock, newAppFareBlock, 'app fare policy');
engine = replaceExactlyOnce(
  engine,
  `    // Fare calculations
    calcAppPrice: calcAppPrice,
    estimateTaxi: estimateTaxi,`,
  `    // Fare calculations
    isAppFareUsable: isAppFareUsable,
    calcAppPrice: calcAppPrice,
    estimateTaxi: estimateTaxi,`,
  'app fare export'
);

if (!engine.includes('isAppFareUsable: isAppFareUsable')) throw new Error('engine export missing');
await writeFile(engineUrl, engine, 'utf8');

const htmlUrl = new URL('../public/VOY-Lite.html', import.meta.url);
let html = await readFile(htmlUrl, 'utf8');

const oldHeroSelection = `  // V7: Build hero/alts respecting _activeMode (transport selector is functional, not decorative).
  // all|car|custom → ride-hailing apps (uber/didi/maxim); taxi → taxi providers;
  // remis → remis providers; walk → no ride-hailing hero (bike becomes primary).
  var ranked=autoEst.rankedProviders||[];
  var hero=null,alts=[];
  var _modeMatches=function(pid){
    if(!PROVIDERS[pid]||!PROVIDERS[pid].available)return false;
    var cat=PROVIDERS[pid].category||'app';
    if(_activeMode==='walk')return false;
    if(_activeMode==='taxi')return cat==='taxi';
    if(_activeMode==='remis')return cat==='remis';
    return cat==='app'; // all|car|custom
  };
  for(var i=0;i<ranked.length;i++){
    var p=ranked[i];
    var pid=p.id;
    var provider=PROVIDERS[pid];
    if(provider && _modeMatches(pid)){
      if(pid==='maxim'&&!isMaximSupported())continue;
      var fare=p.price;
      if(provider.available===true && provider.verified===true && fare!==null && Number.isFinite(fare) && fare>0){
        var url=buildAppLink(pid);
        if(!hero)hero={id:pid,name:p.name,price:fare,timeMin:p.timeMin,url:url};
        else alts.push({id:pid,name:p.name,price:fare,timeMin:p.timeMin,url:url});
      }
    }
  }
  // If hero is unsupported Maxim-only (iOS), promote next
  if(!hero&&alts.length)hero=alts.shift();

`;

const newHeroSelection = `  // Build priced heroes only from current fare models. Available apps with
  // stale/unavailable models remain actionable but cannot influence ranking.
  var ranked=autoEst.rankedProviders||[];
  var hero=null,alts=[],unpricedApps=[];
  var _modeMatches=function(pid){
    if(!PROVIDERS[pid]||!PROVIDERS[pid].available)return false;
    var cat=PROVIDERS[pid].category||'app';
    if(_activeMode==='walk')return false;
    if(_activeMode==='taxi')return cat==='taxi';
    if(_activeMode==='remis')return cat==='remis';
    return cat==='app'; // all|car|custom
  };
  for(var i=0;i<ranked.length;i++){
    var p=ranked[i];
    var pid=p.id;
    var provider=PROVIDERS[pid];
    if(provider && _modeMatches(pid)){
      if(pid==='maxim'&&!isMaximSupported())continue;
      var fare=p.price;
      if(provider.available===true && provider.verified===true && fare!==null && Number.isFinite(fare) && fare>0){
        var url=buildAppLink(pid);
        if(!hero)hero={id:pid,name:p.name,price:fare,timeMin:p.timeMin,url:url};
        else alts.push({id:pid,name:p.name,price:fare,timeMin:p.timeMin,url:url});
      }
    }
  }
  // If hero is unsupported Maxim-only (iOS), promote next.
  if(!hero&&alts.length)hero=alts.shift();

  if(_activeMode==='car'||_activeMode==='all'||_activeMode==='custom'){
    ['uber','didi','maxim','cabify'].forEach(function(pid){
      var provider=PROVIDERS[pid];
      if(!provider||provider.available!==true||provider.verified!==true)return;
      if(pid==='maxim'&&!isMaximSupported())return;
      var price=autoEst[pid+'Price'];
      if(price===null||!Number.isFinite(price)||price<=0){
        unpricedApps.push({id:pid,name:provider.name||pid,url:buildAppLink(pid)});
      }
    });
  }

`;

html = replaceExactlyOnce(html, oldHeroSelection, newHeroSelection, 'hero selection');

const oldConfidence = `  var heroProvider=hero?hero.id:'uber';
  var surgeCtx={now:Date.now()};
  var confidence,surgeLabel,surgeMult,fareRange;
  if(_isWalkHero){
    // V7.1: walking is deterministic — bypass Bayesian pricing variance entirely.
    confidence=1;surgeLabel='';surgeMult=1;fareRange={low:0,high:0};
  }else{
    confidence=(window.PricingEngineV2)?PricingEngineV2.fareConfidence(heroProvider,{distanceKm:distKm,timeMin:hero?hero.timeMin:0,fare:hero?hero.price:0}):MC.v6FareConfidence(heroProvider,distKm,hero?hero.timeMin:0);
    surgeLabel=(window.PricingEngineV2)?PricingEngineV2.surgeLabel(heroProvider,surgeCtx):MC.v6SurgeLabel(heroProvider);
    surgeMult=(window.PricingEngineV2)?PricingEngineV2.surgeMultiplier(heroProvider,surgeCtx):MC.v6SurgeMultiplier(heroProvider);
    fareRange=hero?((window.PricingEngineV2)?PricingEngineV2.fareRange(hero.price,confidence,surgeMult):MC.v6FareRange(hero.price,confidence,surgeMult)):{low:0,high:0};
  }
`;

const newConfidence = `  var heroProvider=hero?hero.id:'';
  var surgeCtx={now:Date.now()};
  var confidence,surgeLabel,surgeMult,fareRange;
  if(_isWalkHero){
    // Walking is deterministic — bypass Bayesian pricing variance entirely.
    confidence=1;surgeLabel='';surgeMult=1;fareRange={low:0,high:0};
  }else if(!hero){
    // No current app fare means no synthetic confidence, surge or range.
    confidence=0;surgeLabel='';surgeMult=1;fareRange={low:0,high:0};
  }else{
    confidence=(window.PricingEngineV2)?PricingEngineV2.fareConfidence(heroProvider,{distanceKm:distKm,timeMin:hero.timeMin,fare:hero.price}):MC.v6FareConfidence(heroProvider,distKm,hero.timeMin);
    surgeLabel=(window.PricingEngineV2)?PricingEngineV2.surgeLabel(heroProvider,surgeCtx):MC.v6SurgeLabel(heroProvider);
    surgeMult=(window.PricingEngineV2)?PricingEngineV2.surgeMultiplier(heroProvider,surgeCtx):MC.v6SurgeMultiplier(heroProvider);
    fareRange=(window.PricingEngineV2)?PricingEngineV2.fareRange(hero.price,confidence,surgeMult):MC.v6FareRange(hero.price,confidence,surgeMult);
  }
`;

html = replaceExactlyOnce(html, oldConfidence, newConfidence, 'hero confidence');

const renderAnchor = `  }

  // Taxi + Remis accordions — regulated fares use the canonical engine.`;
const renderApps = `  }

  if(!_isWalkHero&&unpricedApps.length){
    h+='<div class="more-opts" id="appLivePriceOptions">';
    h+='<div class="block-title"><span class="bt-ic">'+svg('car',15)+'</span> Precios actuales en cada app</div>';
    h+='<div class="co-meta" id="appFareFreshnessNotice"><span>VOY no compara montos desactualizados. Abrí el proveedor para consultar el precio actual.</span></div>';
    unpricedApps.forEach(function(p){
      h+='<button class="acc-head" style="width:100%" data-action="'+p.id+'" data-url="'+p.url+'" data-name="'+escapeAttr(p.name)+'">';
      h+='<span class="ah-ic" style="color:'+(PROVIDERS[p.id]?PROVIDERS[p.id].color:'#666')+'">'+svg('car',18)+'</span>';
      h+='<span class="ah-title">'+escapeHtml(p.name)+'</span>';
      h+='<span class="ah-meta">Ver precio</span>';
      h+='<span class="ah-chev">'+svg('arrow',16)+'</span>';
      h+='</button>';
    });
    h+='</div>';
  }

  // Taxi + Remis accordions — regulated fares use the canonical engine.`;

html = replaceExactlyOnce(html, renderAnchor, renderApps, 'unpriced app rendering');
html = replaceExactlyOnce(
  html,
  '<script src="core/mobilityEngine.js?v=11"></script>',
  '<script src="core/mobilityEngine.js?v=12"></script>',
  'mobility engine asset version'
);

for (const required of [
  'id="appLivePriceOptions"',
  'VOY no compara montos desactualizados',
  "autoEst[pid+'Price']",
  'core/mobilityEngine.js?v=12'
]) {
  if (!html.includes(required)) throw new Error(`required freshness UI missing: ${required}`);
}
await writeFile(htmlUrl, html, 'utf8');

console.log('app fare freshness policy applied');
