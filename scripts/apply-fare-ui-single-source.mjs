import { readFile, writeFile } from 'node:fs/promises';

const target = new URL('../public/VOY-Lite.html', import.meta.url);
let html = await readFile(target, 'utf8');

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`${label}: expected block not found`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) {
    throw new Error(`${label}: expected exactly one block`);
  }
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

const oldFareHelpers = `function computeTaxiFare(distKm,timeMin){
  if (!FareRegistry || !FareRegistry.taxi || !FareRegistry.taxi.nocturno || !FareRegistry.taxi.diurno) return null;
  var hour=new Date().getHours();
  var t=(hour>=22||hour<6)?FareRegistry.taxi.nocturno:FareRegistry.taxi.diurno;
  if (!t || t.bajada === null || t.ficha === null) return null;
  var distFicha = t.distFicha || 130;
  var fichas=Math.ceil(distKm*1000/distFicha);
  var price=t.bajada+fichas*t.ficha;
  return Math.round(price);
}

`;

const newFareHelpers = `function computeRegulatedFare(mode,distKm,hourOverride){
  if (!FareRegistry || !FareRegistry[mode]) return null;
  var fare=FareRegistry[mode];
  if (!fare.nocturno || !fare.diurno) return null;
  var hour=Number.isInteger(hourOverride)?hourOverride:new Date().getHours();
  var t=(hour>=22||hour<6)?fare.nocturno:fare.diurno;
  if (!t || t.bajada === null || t.ficha === null) return null;
  if (window.MobilityEngine && typeof MobilityEngine.estimateTaxi==='function') {
    return Math.round(MobilityEngine.estimateTaxi(distKm,fare,hour));
  }
  var distFicha=t.distFicha||130;
  var fichas=Math.floor(distKm*1000/distFicha);
  return Math.round(t.bajada+fichas*t.ficha);
}
function computeTaxiFare(distKm,timeMin,hourOverride){
  return computeRegulatedFare('taxi',distKm,hourOverride);
}
function computeRemisFare(distKm,timeMin,hourOverride){
  return computeRegulatedFare('remis',distKm,hourOverride);
}

`;

const oldFareSetup = `  // Taxi + Remis accordions
  var taxiFare=computeTaxiFare(distKm,autoEst.timeMin||0);
  var taxiConf=(window.PricingEngineV2)?PricingEngineV2.fareConfidence('taxi',{distanceKm:distKm,timeMin:autoEst.timeMin||0,fare:taxiFare}):MC.v6FareConfidence('taxi',distKm,autoEst.timeMin||0);
  var taxiSurge=(window.PricingEngineV2)?PricingEngineV2.surgeMultiplier('taxi',surgeCtx):MC.v6SurgeMultiplier('taxi');
  var taxiRange=(window.PricingEngineV2)?PricingEngineV2.fareRange(taxiFare,taxiConf,taxiSurge):MC.v6FareRange(taxiFare,taxiConf,taxiSurge);

  // Filter verified companies: provider.available===true and provider.verified===true
  var verifiedTaxiCompanies = TAXI_COMPANIES.filter(function(co) {
    var p = PROVIDERS[co.id];
    return p && p.available === true && p.verified === true;
  });
  var verifiedRemisCompanies = REMIS_COMPANIES.filter(function(co) {
    var p = PROVIDERS[co.id];
    return p && p.available === true && p.verified === true;
  });

  var hasTaxiTariff = (taxiFare !== null && Number.isFinite(taxiFare) && taxiFare > 0);

`;

const newFareSetup = `  // Taxi + Remis accordions — regulated fares use the canonical engine.
  var taxiFare=computeTaxiFare(distKm,autoEst.timeMin||0);
  var remisFare=computeRemisFare(distKm,autoEst.timeMin||0);
  var taxiConf=(window.PricingEngineV2)?PricingEngineV2.fareConfidence('taxi',{distanceKm:distKm,timeMin:autoEst.timeMin||0,fare:taxiFare}):MC.v6FareConfidence('taxi',distKm,autoEst.timeMin||0);
  var remisConf=(window.PricingEngineV2)?PricingEngineV2.fareConfidence('remis',{distanceKm:distKm,timeMin:autoEst.timeMin||0,fare:remisFare}):MC.v6FareConfidence('remis',distKm,autoEst.timeMin||0);
  // The municipal day/night tariff is already encoded in the point estimate.
  // Dynamic app surge must never be applied a second time to taxi or remis.
  var taxiRange=(window.PricingEngineV2)?PricingEngineV2.fareRange(taxiFare,taxiConf,1):MC.v6FareRange(taxiFare,taxiConf,1);
  var remisRange=(window.PricingEngineV2)?PricingEngineV2.fareRange(remisFare,remisConf,1):MC.v6FareRange(remisFare,remisConf,1);

  // Filter verified companies: provider.available===true and provider.verified===true
  var verifiedTaxiCompanies = TAXI_COMPANIES.filter(function(co) {
    var p = PROVIDERS[co.id];
    return p && p.available === true && p.verified === true;
  });
  var verifiedRemisCompanies = REMIS_COMPANIES.filter(function(co) {
    var p = PROVIDERS[co.id];
    return p && p.available === true && p.verified === true;
  });

  var hasTaxiTariff = (taxiFare !== null && Number.isFinite(taxiFare) && taxiFare > 0);
  var hasRemisTariff = (remisFare !== null && Number.isFinite(remisFare) && remisFare > 0);

`;

const oldRemisBlock = `    // Remis accordion
    if (verifiedRemisCompanies.length > 0) {
      var remisMeta = hasTaxiTariff ? (formatPrice(Math.round(taxiFare*1.05)) + ' · ' + formatMin(autoEst.timeMin||0)) : 'Tarifa sin verificar';
      h+='<div class="accordion">';
      h+='<button class="acc-head'+(_sheetAccordions.remis?' expanded':'')+'" id="accRemisHead" aria-expanded="'+_sheetAccordions.remis+'">';
      h+='<span class="ah-ic" style="color:#6B7280">'+svg('car',18)+'</span>';
      h+='<span class="ah-title">Remis</span>';
      h+='<span class="ah-meta">'+remisMeta+'</span>';
      h+='<span class="ah-chev">'+svg('chevron',18)+'</span></button>';
      h+='<div class="acc-body'+(_sheetAccordions.remis?' expanded':'')+'" id="accRemisBody">';
      verifiedRemisCompanies.forEach(function(co){
        h+='<div class="acc-co">';
        h+='<div class="co-info"><div class="co-name">'+escapeHtml(co.name)+'</div>';
        var coMeta = hasTaxiTariff ? '<span>Estimado: '+formatPrice(Math.round(taxiRange.low*1.05))+'–'+formatPrice(Math.round(taxiRange.high*1.05))+'</span><span>'+formatMin(autoEst.timeMin||0)+'</span>' : '<span>Tarifa no disponible</span>';
        h+='<div class="co-meta">'+coMeta+'</div>';
        h+='<div class="co-actions">';
        h+='<button class="co-action wa" data-action="remis-'+co.id+'" data-url="'+co.whatsapp+'" data-name="'+escapeAttr(co.name)+' (WhatsApp)">'+svg('whatsapp',15)+' WhatsApp</button>';
        h+='</div></div></div>';
      });
      h+='</div></div>';
    }

`;

const newRemisBlock = `    // Remis accordion
    if (verifiedRemisCompanies.length > 0) {
      var remisMeta = hasRemisTariff ? (formatPrice(remisFare) + ' · ' + formatMin(autoEst.timeMin||0)) : 'Tarifa sin verificar';
      h+='<div class="accordion">';
      h+='<button class="acc-head'+(_sheetAccordions.remis?' expanded':'')+'" id="accRemisHead" aria-expanded="'+_sheetAccordions.remis+'">';
      h+='<span class="ah-ic" style="color:#6B7280">'+svg('car',18)+'</span>';
      h+='<span class="ah-title">Remis</span>';
      h+='<span class="ah-meta">'+remisMeta+'</span>';
      h+='<span class="ah-chev">'+svg('chevron',18)+'</span></button>';
      h+='<div class="acc-body'+(_sheetAccordions.remis?' expanded':'')+'" id="accRemisBody">';
      verifiedRemisCompanies.forEach(function(co){
        h+='<div class="acc-co">';
        h+='<div class="co-info"><div class="co-name">'+escapeHtml(co.name)+'</div>';
        var coMeta = hasRemisTariff ? '<span>Estimado: '+formatPrice(remisRange.low)+'–'+formatPrice(remisRange.high)+'</span><span>'+formatMin(autoEst.timeMin||0)+'</span>' : '<span>Tarifa no disponible</span>';
        h+='<div class="co-meta">'+coMeta+'</div>';
        h+='<div class="co-actions">';
        h+='<button class="co-action wa" data-action="remis-'+co.id+'" data-url="'+co.whatsapp+'" data-name="'+escapeAttr(co.name)+' (WhatsApp)">'+svg('whatsapp',15)+' WhatsApp</button>';
        h+='</div></div></div>';
      });
      h+='</div></div>';
    }

`;

html = replaceExactlyOnce(html, oldFareHelpers, newFareHelpers, 'fare helpers');
html = replaceExactlyOnce(html, oldFareSetup, newFareSetup, 'fare setup');
html = replaceExactlyOnce(html, oldRemisBlock, newRemisBlock, 'remis block');
html = replaceExactlyOnce(
  html,
  '<script src="core/mobilityEngine.js?v=10"></script>',
  '<script src="core/mobilityEngine.js?v=11"></script>',
  'mobility engine asset version'
);

for (const forbidden of [
  'Math.ceil(distKm*1000/distFicha)',
  'taxiFare*1.05',
  'taxiRange.low*1.05',
  'taxiRange.high*1.05'
]) {
  if (html.includes(forbidden)) throw new Error(`forbidden legacy pricing remains: ${forbidden}`);
}

if (!html.includes("computeRegulatedFare('remis',distKm,hourOverride)")) {
  throw new Error('remis canonical helper missing');
}

await writeFile(target, html, 'utf8');
console.log('fare UI source consolidated');
