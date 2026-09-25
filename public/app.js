import { APP_CONFIG } from './runtime-config.js?v=__BUILD_ID__';
import { isSafeOfficialHandoff, isSafeExternalNavigationUrl, buildExternalNavigationUrl, normalizeResolvedCandidate, normalizeDestinationSuggestion, normalizeMobilityDecision, normalizeMobilityComputation } from './contracts.js?v=__BUILD_ID__';

const $=(sel)=>document.querySelector(sel);
const escapeHtml=(value='')=>{const div=document.createElement('div');div.textContent=String(value);return div.innerHTML};
function makeSessionToken(){const bytes=new Uint8Array(18);crypto.getRandomValues(bytes);return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('')}

const DEFAULT_MAP_CENTER={lat:-31.6333,lon:-60.7000};
const SUGGEST_DEBOUNCE_MS=400;
const SUGGEST_CACHE_TTL_MS=45000;
const SUGGEST_CACHE_MAX=20;
const TRAIN_RADAR_RADIUS_METERS=8000;
const TRAIN_RADAR_COVERAGE_POINTS=Object.freeze([
  Object.freeze({name:'Once',lat:-34.60827979749716,lon:-58.4075158087721}),
  Object.freeze({name:'Haedo',lat:-34.644477144900506,lon:-58.59194588896136}),
  Object.freeze({name:'Moreno',lat:-34.65055409620922,lon:-58.7896992362823})
]);
const suggestionCache=new Map();
const suggestionInFlight=new Map();

const state={
  destination:null,destinationLabel:'',origin:null,mobilityDecision:null,mobilityComputation:null,selectedRouteMode:null,destinationCandidates:[],destinationActiveIndex:-1,
  trainRadar:null,mapCenter:null,searchTimer:null,searchController:null,searchScope:'local',sessionToken:makeSessionToken(),handoff:null,handoffNonce:0,
  originRevision:0,mapMode:'2d',threeController:null,threeModulePromise:null,locationGranted:false,theme:localStorage.getItem('voy-theme')||'system'
};

const destinationInput=$('#destination'),suggestions=$('#destination-suggestions'),loading=$('#destination-loading'),contextHelp=$('#destination-context'),nationalSearch=$('#national-search');
const originInput=$('#origin'),originEditor=$('#origin-editor'),originLabel=$('#origin-label');
const statusLine=$('#destination-status'),decision=$('#decision'),options=$('#options');
const dialog=$('#handoff-dialog'),confirmHandoff=$('#confirm-handoff'),cancelHandoff=$('#cancel-handoff');
const mapShell=$('#map-shell'),mapTiles=$('#map-tiles'),map3dLayer=$('#map-3d-layer'),map3dStatus=$('#map-3d-status'),map3dAttribution=$('#map-3d-attribution'),mapFallback=$('#map-fallback'),mapAttribution=$('#map-attribution'),map3dQuality=$('#map-3d-quality');
const reducedMotionMedia=matchMedia('(prefers-reduced-motion: reduce)');
const trainRadar=$('#train-radar'),trainRadarMeta=$('#train-radar-meta'),trainRadarList=$('#train-radar-list');

const mapModeButtons=[...document.querySelectorAll('[data-map-mode]')];
function currentSelectedRouteGeometry(){return state.mobilityComputation?.mode_options?.find(item=>item.mode===state.selectedRouteMode&&item.route_available)?.route?.geometry??null}
function current3DTransportEntities(){return []}
function setMapModeButtons(mode){for(const button of mapModeButtons)button.setAttribute('aria-pressed',String(button.dataset.mapMode===mode))}
function sync3DTopology(){if(state.mapMode==='3d'&&state.threeController)state.threeController.update({routeGeometry:currentSelectedRouteGeometry(),transportEntities:current3DTransportEntities()})}
function activate2D(message=''){
  state.mapMode='2d';setMapModeButtons('2d');map3dLayer.hidden=true;map3dAttribution.hidden=true;mapTiles.hidden=false;mapAttribution.hidden=false;map3dStatus.textContent=message;
}
async function activate3D(){
  if(state.mapMode==='3d'&&state.threeController?.ok)return;
  map3dStatus.textContent='Cargando topología 3D…';
  try{
    state.threeModulePromise??=import('./3d/voy3d.js');
    const mod=await state.threeModulePromise;
    const controller=state.threeController?.ok?state.threeController:await mod.activateVoy3D({mount:map3dLayer,onFallback:()=>activate2D('3D no disponible en este equipo; seguimos en 2D.'),routeGeometry:currentSelectedRouteGeometry(),transport:current3DTransportEntities(),quality:map3dQuality.value,reducedMotion:reducedMotionMedia.matches});
    if(!controller?.ok){state.threeController=null;activate2D('3D no disponible en este equipo; seguimos en 2D.');return}
    state.threeController=controller;
    state.mapMode='3d';setMapModeButtons('3d');mapTiles.hidden=true;mapAttribution.hidden=true;map3dLayer.hidden=false;map3dAttribution.hidden=false;map3dStatus.textContent='3D local · alturas genéricas/inferidas';sync3DTopology();
  }catch(error){
    state.threeController=null;activate2D('3D no disponible en este equipo; seguimos en 2D.');
  }
}
mapModeButtons.forEach(button=>button.addEventListener('click',()=>button.dataset.mapMode==='3d'?activate3D():activate2D()));
async function restart3DForRenderPolicy(){if(state.mapMode!=='3d')return;state.threeController?.dispose?.();state.threeController=null;await activate3D()}
map3dQuality.addEventListener('change',restart3DForRenderPolicy);
reducedMotionMedia.addEventListener?.('change',restart3DForRenderPolicy);


const assistantToggle=$('#assistant-toggle'),assistantPanel=$('#assistant-panel'),assistantClose=$('#assistant-close'),assistantCopy=$('#assistant-copy'),assistantAction=$('#assistant-action');

function setStatus(text='',kind='neutral'){statusLine.textContent=text;statusLine.dataset.state=kind;updateAssistant()}
function approxDistance(meters){if(!Number.isFinite(meters))return '';return meters<1000?`${Math.max(50,Math.round(meters/50)*50)} m`:meters<10000?`${(meters/1000).toFixed(1).replace('.',',')} km`:`${Math.round(meters/1000)} km`}
function fmtVerified(value){try{return new Intl.DateTimeFormat('es-AR',{dateStyle:'medium'}).format(new Date(value))}catch{return ''}}
function destinationContext(){if(!state.origin)return {search_scope:state.searchScope};return {search_scope:state.searchScope,origin:{locality:state.origin.locality?.name||'',province:state.origin.province?.name||'',province_id:state.origin.province?.id||'',coordinates:state.origin.coordinates||null}}}
function suggestionCacheKey(query,scope){return `${String(scope||'local')}|${state.originRevision}|${String(query||'').trim().toLocaleLowerCase('es-AR')}`}
function readSuggestionCache(key,now=Date.now()){const hit=suggestionCache.get(key);if(!hit)return null;if(now-hit.storedAt>SUGGEST_CACHE_TTL_MS){suggestionCache.delete(key);return null}suggestionCache.delete(key);suggestionCache.set(key,hit);return hit.payload}
function writeSuggestionCache(key,payload,now=Date.now()){suggestionCache.delete(key);suggestionCache.set(key,{storedAt:now,payload});while(suggestionCache.size>SUGGEST_CACHE_MAX)suggestionCache.delete(suggestionCache.keys().next().value)}
function invalidateSuggestionOriginContext(){state.originRevision+=1;suggestionCache.clear()}
function trainRadarDistanceMeters(a,b){const rad=n=>Number(n)*Math.PI/180,dLat=rad(Number(b.lat)-Number(a.lat)),dLon=rad(Number(b.lon)-Number(a.lon)),la1=rad(a.lat),la2=rad(b.lat),q=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*6371000*Math.asin(Math.min(1,Math.sqrt(q)))}
function trainRadarCoverageSupportedClient(coords){const lat=Number(coords?.lat),lon=Number(coords?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return false;return TRAIN_RADAR_COVERAGE_POINTS.some(point=>trainRadarDistanceMeters({lat,lon},point)<=TRAIN_RADAR_RADIUS_METERS)}
async function apiJson(url,options={}){const response=await fetch(url,options);let payload={};try{payload=await response.json()}catch{}if(!response.ok){const error=new Error(payload.error||`http_${response.status}`);error.status=response.status;error.payload=payload;throw error}return payload}

function effectiveDark(){if(state.theme==='dark')return true;if(state.theme==='light')return false;return matchMedia('(prefers-color-scheme: dark)').matches}
function applyTheme(){document.documentElement.dataset.theme=state.theme;const button=$('#theme');button.querySelector('span').textContent=state.theme==='light'?'☀':state.theme==='dark'?'●':'◐';button.setAttribute('aria-label',state.theme==='light'?'Tema claro':state.theme==='dark'?'Tema oscuro':'Tema del sistema');document.querySelector('meta[name="theme-color"]')?.setAttribute('content',effectiveDark()?'#0b0b0a':'#f4f3ef')}
$('#theme').addEventListener('click',()=>{const values=['system','light','dark'];state.theme=values[(values.indexOf(state.theme)+1)%values.length];localStorage.setItem('voy-theme',state.theme);applyTheme()});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(state.theme==='system')applyTheme()});applyTheme();

function clearSuggestions(){suggestions.replaceChildren();suggestions.hidden=true;destinationInput.setAttribute('aria-expanded','false');destinationInput.removeAttribute('aria-activedescendant');state.destinationCandidates=[];state.destinationActiveIndex=-1}
function renderSuggestions(candidates,showNational=false){
  suggestions.replaceChildren();state.destinationCandidates=candidates.slice(0,5);state.destinationActiveIndex=-1;
  state.destinationCandidates.forEach((candidate,index)=>{
    const button=document.createElement('button');button.type='button';button.className='suggestion';button.role='option';button.id=`destination-option-${index}`;button.setAttribute('aria-selected','false');
    const distance=approxDistance(candidate.distance_meters),secondary=[candidate.display_secondary,distance].filter(Boolean).join(' · ');
    button.innerHTML=`<strong>${escapeHtml(candidate.display_primary)}</strong><span>${escapeHtml(secondary)}</span>`;
    button.addEventListener('click',()=>selectDestination(candidate));suggestions.appendChild(button);
  });
  suggestions.hidden=state.destinationCandidates.length===0;destinationInput.setAttribute('aria-expanded',String(state.destinationCandidates.length>0));nationalSearch.hidden=!showNational||state.searchScope==='national';
}
function updateActiveSuggestion(next){const buttons=[...suggestions.querySelectorAll('.suggestion')];if(!buttons.length)return;state.destinationActiveIndex=(next+buttons.length)%buttons.length;buttons.forEach((button,index)=>{const active=index===state.destinationActiveIndex;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))});destinationInput.setAttribute('aria-activedescendant',buttons[state.destinationActiveIndex].id);buttons[state.destinationActiveIndex].scrollIntoView({block:'nearest'})}

async function fetchDestinationSuggestions(query,scope){
  const key=suggestionCacheKey(query,scope),cached=readSuggestionCache(key);
  if(cached)return cached;
  const existing=suggestionInFlight.get(key);if(existing)return existing.promise;
  if(state.searchController)state.searchController.abort();
  const controller=new AbortController();state.searchController=controller;
  const promise=apiJson('/api/destinations/suggest',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,context:destinationContext(),session_token:state.sessionToken}),signal:controller.signal})
    .then(payload=>{writeSuggestionCache(key,payload);return payload})
    .finally(()=>{if(suggestionInFlight.get(key)?.promise===promise)suggestionInFlight.delete(key);if(state.searchController===controller)state.searchController=null});
  suggestionInFlight.set(key,{promise,controller});
  return promise;
}
async function suggestDestinationQuery(query,scope=state.searchScope){
  loading.hidden=false;contextHelp.hidden=true;state.searchScope=scope;nationalSearch.hidden=true;setStatus();
  try{
    const payload=await fetchDestinationSuggestions(query,scope);
    const candidates=(payload.suggestions||[]).map(normalizeDestinationSuggestion).filter(Boolean);renderSuggestions(candidates,Boolean(payload.requires_national_expansion));
    if(!candidates.length){contextHelp.hidden=false;setStatus(scope==='national'?'No encontramos una coincidencia.':'No encontramos una coincidencia cercana.')}
  }catch(error){if(error.name==='AbortError')return;clearSuggestions();nationalSearch.hidden=true;if(error.payload?.error==='external_dependency_unavailable')setStatus('La búsqueda no está disponible ahora.','error');else if(error.status===429)setStatus('Probá de nuevo en un momento.','error');else setStatus('No pudimos buscar ese destino.','error')}
  finally{loading.hidden=true}
}
function renderInitialMap(){renderMap(DEFAULT_MAP_CENTER,'Mapa inicial de Santa Fe',false)}
function clearMap(){renderInitialMap()}
function clearTrainRadar(){state.trainRadar=null;trainRadar.hidden=true;trainRadarMeta.textContent='';trainRadarList.replaceChildren();mapTiles.querySelectorAll('.train-station-marker').forEach(marker=>marker.remove())}
function radarObservedLabel(value){if(!value)return '';try{return new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))}catch{return ''}}
function renderTrainRadar(radar){
  state.trainRadar=radar;trainRadar.hidden=false;trainRadarList.replaceChildren();
  const status=radar?.source_status==='available'?'scheduled':radar?.source_status==='stale'?'unknown · fuente vencida':'unknown · fuente no disponible';
  const observed=radar?.stations?.find(item=>item.observed_at)?.observed_at;
  trainRadarMeta.textContent=[status,observed?`consultado ${radarObservedLabel(observed)}`:'',radar?.source?.published_at?`publicado ${radar.source.published_at}`:'',radar?.source?.authority?`Fuente: ${radar.source.authority}`:''].filter(Boolean).join(' · ');
  if(!radar?.stations?.length){const empty=document.createElement('p');empty.className='train-radar-empty';empty.textContent='No hay estaciones cubiertas por este primer vertical dentro del radio cercano.';trainRadarList.appendChild(empty);return}
  for(const item of radar.stations){
    const card=document.createElement('article');card.className='train-station-card';
    const service=item.service?.scheduled_times?.length?`Horarios publicados: ${item.service.scheduled_times.join(' / ')}`:'Servicio no confirmado ahora';
    const branch=item.branch?` · ${item.branch}`:'';
    card.innerHTML=`<div><strong>${escapeHtml(item.station.name)}</strong><span>Línea ${escapeHtml(item.line)}${escapeHtml(branch)}</span></div><p><b>${escapeHtml(item.temporal_state)}</b> · ${escapeHtml(service)} · ${escapeHtml(approxDistance(item.station.distance_meters))}</p>`;
    trainRadarList.appendChild(card);
  }
}
function updateTrainStationMarkers(stations=[]){
  mapTiles.querySelectorAll('.train-station-marker').forEach(marker=>marker.remove());
  if(!state.mapCenter)return;
  const z=APP_CONFIG.MAP_PROVIDER.zoom,center=worldPixel(state.mapCenter.lon,state.mapCenter.lat,z);
  for(const item of stations){
    const coords=item?.station?.coordinates;if(!coords)continue;const point=worldPixel(coords.lon,coords.lat,z);
    const marker=document.createElement('div');marker.className='train-station-marker';marker.dataset.station=item.station.name;marker.title=item.station.name;
    marker.style.cssText='position:absolute;width:14px;height:14px;border:3px solid white;border-radius:50%;background:#111;z-index:8;transform:translate(-50%,-50%);box-shadow:0 2px 8px rgba(0,0,0,.3)';
    marker.style.left=`calc(50% + ${point.x-center.x}px)`;marker.style.top=`calc(50% + ${point.y-center.y}px)`;mapTiles.appendChild(marker);
  }
}
async function refreshTrainRadar(){
  if(!state.origin?.coordinates){clearTrainRadar();return}
  const center=state.origin.coordinates,sameCenter=state.mapCenter&&Math.abs(state.mapCenter.lat-center.lat)<1e-7&&Math.abs(state.mapCenter.lon-center.lon)<1e-7;
  if(mapShell.hidden||!sameCenter)renderMap(center,'Mapa del origen');
  if(!trainRadarCoverageSupportedClient(center)){clearTrainRadar();return}
  try{
    const payload=await apiJson('/api/radar/trains/nearby',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({coordinates:center})});
    renderTrainRadar(payload.radar);updateTrainStationMarkers(payload.radar?.stations||[]);
  }catch{
    renderTrainRadar({source_status:'unavailable',stations:[],source:null});updateTrainStationMarkers([]);
  }
}
function resetDestinationState(){if(state.searchController){state.searchController.abort();state.searchController=null}state.destination=null;state.destinationLabel='';state.mobilityDecision=null;state.mobilityComputation=null;state.selectedRouteMode=null;state.searchScope='local';decision.hidden=true;options.replaceChildren();document.body.removeAttribute('data-view');if(!state.origin)clearTrainRadar();if(state.origin)renderMap(state.origin.coordinates,'Mapa del origen');else clearMap();nationalSearch.hidden=true}
destinationInput.addEventListener('input',()=>{resetDestinationState();clearSuggestions();clearTimeout(state.searchTimer);const q=destinationInput.value.trim();contextHelp.hidden=true;if(q.length<3){setStatus();return}state.searchTimer=setTimeout(()=>suggestDestinationQuery(q,'local'),SUGGEST_DEBOUNCE_MS)});
destinationInput.addEventListener('keydown',(event)=>{if(event.key==='ArrowDown'){event.preventDefault();updateActiveSuggestion(state.destinationActiveIndex+1)}else if(event.key==='ArrowUp'){event.preventDefault();updateActiveSuggestion(state.destinationActiveIndex-1)}else if(event.key==='Enter'){if(state.destinationActiveIndex>=0){event.preventDefault();selectDestination(state.destinationCandidates[state.destinationActiveIndex])}else if(destinationInput.value.trim().length>=3){event.preventDefault();clearTimeout(state.searchTimer);suggestDestinationQuery(destinationInput.value.trim(),state.searchScope)}}else if(event.key==='Escape'){clearSuggestions();nationalSearch.hidden=true}});
document.addEventListener('click',(event)=>{if(!suggestions.contains(event.target)&&event.target!==destinationInput&&event.target!==nationalSearch)clearSuggestions()});
nationalSearch.addEventListener('click',()=>suggestDestinationQuery(destinationInput.value.trim(),'national'));

function destinationMeta(candidate){if(candidate.territory_verified===false)return 'Ubicación seleccionada';const locality=candidate.locality?.name||'',province=candidate.province?.name||'';return [locality,province&&province!==locality?province:''].filter(Boolean).join(' · ')}
async function selectDestination(suggestion){
  if(!suggestion?.candidate_ref||!suggestion.coordinates){setStatus('Ese resultado no se puede usar ahora.','error');return}
  if(state.searchController)state.searchController.abort();loading.hidden=false;setStatus();
  try{
    const payload=await apiJson('/api/destinations/resolve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({candidate_ref:suggestion.candidate_ref,coordinates:suggestion.coordinates,session_token:state.sessionToken})});
    const candidate=normalizeResolvedCandidate(payload.destination),mobilityDecision=normalizeMobilityDecision(payload.mobility_decision);if(!candidate||!mobilityDecision)throw new Error('invalid_destination');
    state.destination=candidate;state.destinationLabel=suggestion.display_primary||candidate.label||'Destino';destinationInput.value=state.destinationLabel;clearSuggestions();nationalSearch.hidden=true;contextHelp.hidden=true;
    $('#result-title').textContent=state.destinationLabel;$('#result-meta').textContent=destinationMeta(candidate);decision.hidden=false;document.body.dataset.view='resolved';state.mobilityDecision=mobilityDecision;state.mobilityComputation=null;state.selectedRouteMode=null;
    renderMap(candidate.coordinates);if(state.origin)await refreshMobilityComputation();else{renderOptions();setStatus('Elegí un origen para calcular recorridos y precios.','success')};
  }catch(error){setStatus(error.payload?.error==='external_dependency_unavailable'?'No pudimos confirmar el destino ahora.':'No pudimos usar ese destino.','error')}
  finally{loading.hidden=true}
}

$('#manual-origin').addEventListener('click',()=>{const opening=originEditor.hidden;originEditor.hidden=!opening;$('#manual-origin').setAttribute('aria-expanded',String(opening));if(opening)originInput.focus()});
$('#resolve-origin').addEventListener('click',resolveManualOrigin);originInput.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();resolveManualOrigin()}});
async function resolveManualOrigin(){const query=originInput.value.trim();if(query.length<3){setStatus('Escribí un origen un poco más preciso.');return}try{const payload=await apiJson('/api/origin/resolve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query})});if(payload.result_class==='ambiguous'){setStatus('Agregá localidad o provincia para ubicar ese origen.');return}const candidate=normalizeResolvedCandidate(payload.candidates?.[0]);if(!candidate)throw new Error('invalid_origin');state.origin=candidate;invalidateSuggestionOriginContext();state.locationGranted=false;originLabel.textContent=[candidate.label,candidate.locality?.name].filter(Boolean).join(' · ');$('#clear-location').hidden=false;$('#use-location').hidden=true;$('#manual-origin').hidden=true;$('#manual-origin').setAttribute('aria-expanded','false');originEditor.hidden=true;setStatus();await refreshTrainRadar();if(state.destination)await refreshMobilityComputation();else if(destinationInput.value.trim().length>=3)suggestDestinationQuery(destinationInput.value.trim(),'local')}catch(error){setStatus(error.payload?.error==='external_dependency_unavailable'?'No pudimos ubicar ese origen ahora.':'No pudimos ubicar ese origen.','error')}}
$('#use-location').addEventListener('click',()=>{if(!navigator.geolocation){setStatus('La ubicación no está disponible en este navegador.');return}setStatus('Buscando tu ubicación…');navigator.geolocation.getCurrentPosition(async(position)=>{try{const payload=await apiJson('/api/location/reverse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lat:position.coords.latitude,lon:position.coords.longitude})});const candidate=normalizeResolvedCandidate(payload.candidate);if(!candidate)throw new Error('invalid_reverse');state.origin=candidate;invalidateSuggestionOriginContext();state.locationGranted=true;originLabel.textContent=candidate.locality?.name?`Tu ubicación · ${candidate.locality.name}`:'Tu ubicación';$('#clear-location').hidden=false;$('#use-location').hidden=true;$('#manual-origin').hidden=true;$('#manual-origin').setAttribute('aria-expanded','false');originEditor.hidden=true;setStatus();await refreshTrainRadar();if(state.destination)await refreshMobilityComputation();else if(destinationInput.value.trim().length>=3)suggestDestinationQuery(destinationInput.value.trim(),'local')}catch{setStatus('No pudimos ubicarte ahora.','error')}},()=>setStatus('Podés elegir un origen manualmente.'),{enableHighAccuracy:false,timeout:8000,maximumAge:0})});
$('#clear-location').addEventListener('click',()=>{state.origin=null;invalidateSuggestionOriginContext();state.locationGranted=false;state.mobilityComputation=null;state.selectedRouteMode=null;clearTrainRadar();clearMap();originInput.value='';originLabel.textContent='Sin origen elegido';$('#clear-location').hidden=true;$('#use-location').hidden=false;$('#manual-origin').hidden=false;$('#manual-origin').setAttribute('aria-expanded','false');originEditor.hidden=true;setStatus();if(state.destination){renderMap(state.destination.coordinates);renderOptions();setStatus('Elegí un origen para calcular recorridos y precios.')}else if(destinationInput.value.trim().length>=3)suggestDestinationQuery(destinationInput.value.trim(),'local')});

async function refreshMobilityComputation(){
  if(!state.destination||!state.origin){state.mobilityComputation=null;state.selectedRouteMode=null;renderOptions();return}
  setStatus('Calculando recorridos reales…');
  try{
    const payload=await apiJson('/api/mobility/compute',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({origin:state.origin,destination:state.destination})});
    const computation=normalizeMobilityComputation(payload.computation);if(!computation)throw new Error('invalid_mobility_computation');
    state.mobilityComputation=computation;const first=computation.mode_options.find(o=>o.selectable);state.selectedRouteMode=first?.mode||null;
    renderOptions();if(first)renderRouteGeometry(first.route.geometry);else renderMap(state.destination.coordinates);
    setStatus(first?'Recorridos calculados.':'No pudimos calcular un recorrido seleccionable ahora.',first?'success':'neutral');
  }catch(error){state.mobilityComputation=null;state.selectedRouteMode=null;renderOptions();renderMap(state.destination.coordinates);setStatus(error.payload?.error==='mobility_computation_destination_unverified'?'No podemos calcular movilidad para este destino sin verificarlo.':'No pudimos calcular recorridos ahora.','error')}
}
function sourceLine(source){if(!source)return '';const date=fmtVerified(source.verified_at);return [source.authority,date?`actualizado ${date}`:''].filter(Boolean).join(' · ')}
function modeLabelFor(mode){return mode==='rail'?'Tren':mode==='bus'?'Colectivo':'Movilidad'}
function mobilityFactValue(fact){
  if(fact?.kind==='fare'&&Number.isFinite(Number(fact.value))){try{return new Intl.NumberFormat('es-AR',{style:'currency',currency:fact.currency||'ARS',maximumFractionDigits:0}).format(Number(fact.value))}catch{return String(fact.value)}}
  return String(fact?.value??'');
}
function formatArs(amount){try{return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(amount))}catch{return `ARS ${Number(amount)}`}}
function formatArsExact(amount){try{return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(amount))}catch{return `ARS ${Number(amount).toFixed(2)}`}}
function computationModeLabel(mode){return mode==='walking'?'A pie':mode==='bicycle'?'Bici':mode==='auto'?'Auto':mode==='bus'?'Colectivo':mode==='rail'?'Tren':String(mode||'Movilidad')}
function routedModeCard(option){
  const selected=option.mode===state.selectedRouteMode;
  const routed=option.route_available===true&&option.selectable===true;
  const routeSummary=routed?'Recorrido calculado sobre red OpenStreetMap':'Recorrido no disponible ahora';
  const routeMeta=routed?[option.distance_display||`${Math.round(option.distance_m)} m`,option.route?.attribution||'© OpenStreetMap contributors'].filter(Boolean).join(' · '):'Distancia no disponible';
  const priceCopy=option.price_state==='unknown'?'Precio no disponible':option.price?.amount!=null?formatArs(option.price.amount):'Precio no aplica';
  const action=routed?`<button class="option-action" data-route-mode="${escapeHtml(option.mode)}">${selected?'Recorrido visible':'Ver recorrido'}</button>`:'';
  return `<article class="option-row mobility-trip${selected?' is-selected':''}" data-mode-card="${escapeHtml(option.mode)}" data-availability="${escapeHtml(option.availability_state||'unavailable')}"><div class="option-copy"><strong>${escapeHtml(computationModeLabel(option.mode))}</strong><p>${escapeHtml(routeSummary)}</p><div class="option-meta">${escapeHtml(routeMeta)}</div></div><div class="trip-value"><span class="option-value">${escapeHtml(priceCopy)}</span>${action}</div></article>`;
}
function busModeCard(option){
  const fareCurrent=option.fare?.state==='current'&&option.fare?.primary;
  const primary=fareCurrent?`Tarifa oficial · ${formatArsExact(option.fare.primary.amount)}`:'Tarifa oficial no verificada como vigente';
  const frequent=fareCurrent&&option.fare?.frequent?`${option.fare.frequent.label}: ${formatArsExact(option.fare.frequent.amount)} · ${(option.fare.frequent.eligibility||[]).join(' · ')}`:'La tarifa vigente no está probada para esta sesión.';
  const source=fareCurrent?`Decreto 00048/2026 · fuente ${fmtVerified(option.fare.source?.source_date)}`:'Sin importe vigente mostrado';
  const actions=(option.actions||[]).filter(a=>a?.url).map(a=>`<button class="option-action option-action-secondary" data-handoff-url="${escapeHtml(a.url)}" data-handoff-label="${escapeHtml(a.label)}">${escapeHtml(a.label)}</button>`).join('');
  return `<article class="option-row option-info mobility-bus" data-mode-card="bus" data-availability="${escapeHtml(option.availability_state||'partial')}"><div class="option-copy"><strong>Colectivo</strong><p>${escapeHtml(primary)}</p><div class="option-meta">${escapeHtml(frequent)}</div><div class="option-meta">${escapeHtml(source)} · Cuándo pasa: no integrado · Tiempo real no disponible en VOY</div></div><div class="mode-actions">${actions}</div></article>`;
}
function renderOptions(){
  options.replaceChildren();const mobility=state.mobilityDecision;if(!mobility)return;
  const rows=[];const computation=state.mobilityComputation;
  if(!state.origin){
    rows.push('<article class="option-row option-row-primary"><div class="option-copy"><strong>Elegí un origen</strong><p>VOY necesita origen y destino para calcular recorridos disponibles y mostrar cada precio o tarifa con su estado real.</p></div><button class="option-action" data-origin-action>Elegir origen</button></article>');
  }else if(computation){
    for(const option of computation.mode_options){
      if(['walking','bicycle','auto'].includes(option.mode)) rows.push(routedModeCard(option));
      else if(option.mode==='bus') rows.push(busModeCard(option));
    }
  }
  const modeActionUrls=new Set((computation?.mode_options||[]).flatMap(o=>(o.actions||[]).map(a=>a.url)).filter(Boolean));
  const infoActions=(computation?.info_actions||mobility.handoffs||[]).filter(item=>item?.url&&!modeActionUrls.has(item.url));
  for(const handoff of infoActions){const actionLabel=officialHandoffButtonLabel(handoff.label);rows.push(`<article class="option-row option-info"><div class="option-copy"><strong>Información oficial</strong><p>${escapeHtml(handoff.label||'Fuente oficial')}</p><div class="option-meta">${escapeHtml(sourceLine(handoff.source))}</div></div><button class="option-action option-action-secondary" data-handoff-url="${escapeHtml(handoff.url)}" data-handoff-label="${escapeHtml(handoff.label||'Fuente oficial')}">${escapeHtml(actionLabel)}</button></article>`)}
  options.innerHTML=rows.join('');
  options.querySelector('[data-origin-action]')?.addEventListener('click',()=>$('#manual-origin').click());
  options.querySelectorAll('[data-route-mode]').forEach(button=>button.addEventListener('click',()=>{const option=state.mobilityComputation?.mode_options.find(item=>item.mode===button.dataset.routeMode&&item.selectable&&item.route_available);if(!option)return;state.selectedRouteMode=option.mode;renderOptions();renderRouteGeometry(option.route.geometry);mapShell.scrollIntoView({block:'center',behavior:'smooth'})}));
  options.querySelectorAll('[data-handoff-url]').forEach(button=>button.addEventListener('click',()=>openOfficialHandoff(button.dataset.handoffUrl,button.dataset.handoffLabel)));
}
function officialHandoffButtonLabel(label){const raw=String(label||'Fuente oficial').trim();if(/^Consultar\s+/i.test(raw))return `Abrir ${raw.replace(/^Consultar\s+/i,'')}`;const lower=raw.charAt(0).toLocaleLowerCase('es-AR')+raw.slice(1);return `Abrir ${lower}`}
function openOfficialHandoff(url,label){if(!isSafeOfficialHandoff(url)){setStatus('No pudimos abrir ese enlace.','error');return}window.open(url,'_blank','noopener,noreferrer')}
function prepareNavigationHandoff(travelMode,label){if(!buildExternalNavigationUrl(state.destination?.coordinates,travelMode)){setStatus('No pudimos preparar esa consulta.','error');return}state.handoff={kind:'navigation',travelMode,label};state.handoffNonce+=1;dialog.dataset.nonce=String(state.handoffNonce);$('#handoff-title').textContent=label||'Consultar indicaciones';$('#handoff-copy').textContent='Al continuar, Google Maps recibirá las coordenadas de destino y, si elegiste un origen, también las de origen. VOY no las registra en telemetría.';$('#handoff-destination').textContent='Google Maps';dialog.showModal()}
cancelHandoff.addEventListener('click',()=>{dialog.dataset.nonce='0';dialog.close('cancel');});
confirmHandoff.addEventListener('click',()=>{
  const nonce=Number(dialog.dataset.nonce||0),handoff=state.handoff;if(!nonce||!handoff){dialog.close('blocked');return}
  let url=null;
  if(handoff.kind==='official'&&isSafeOfficialHandoff(handoff.url))url=handoff.url;
  if(handoff.kind==='navigation')url=buildExternalNavigationUrl(state.destination?.coordinates,handoff.travelMode,state.origin?.coordinates);
  if(!url||(handoff.kind==='navigation'&&!isSafeExternalNavigationUrl(url))){dialog.dataset.nonce='0';dialog.close('blocked');return}
  dialog.dataset.nonce='0';dialog.close('confirm');window.open(url,'_blank','noopener,noreferrer')
});
function worldPixel(lon,lat,z){const scale=256*Math.pow(2,z),x=(Number(lon)+180)/360*scale,r=Number(lat)*Math.PI/180,y=(1-Math.asinh(Math.tan(r))/Math.PI)/2*scale;return{x,y}}
function renderMap(coords,label='Mapa del destino',showPin=true){
  state.mapCenter={lat:Number(coords.lat),lon:Number(coords.lon)};mapShell.setAttribute('aria-label',label);mapShell.hidden=false;mapTiles.replaceChildren();mapTiles.hidden=state.mapMode==='3d';mapFallback.hidden=true;mapAttribution.hidden=state.mapMode==='3d';
  const z=APP_CONFIG.MAP_PROVIDER.zoom,center=worldPixel(coords.lon,coords.lat,z),centerX=Math.floor(center.x/256),centerY=Math.floor(center.y/256),radius=APP_CONFIG.MAP_PROVIDER.tile_radius;let loaded=0,failed=0,total=0;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    total++;const x=centerX+dx,y=centerY+dy,img=document.createElement('img');img.className='map-tile';img.alt='';img.decoding='async';img.loading='eager';img.referrerPolicy='strict-origin-when-cross-origin';img.style.left=`calc(50% + ${x*256-center.x}px)`;img.style.top=`calc(50% + ${y*256-center.y}px)`;img.src=APP_CONFIG.MAP_PROVIDER.tile_template.replace('{z}',z).replace('{x}',x).replace('{y}',y);
    img.addEventListener('load',()=>{loaded++});img.addEventListener('error',()=>{failed++;if(failed===total&&loaded===0){mapFallback.hidden=false;mapAttribution.hidden=true;}});mapTiles.appendChild(img)
  }
  if(showPin){const pin=document.createElement('div');pin.className='selected-pin';pin.setAttribute('aria-hidden','true');mapTiles.appendChild(pin)}
}
function renderRouteGeometry(geometry){
  if(!state.destination?.coordinates||geometry?.type!=='LineString'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2){renderMap(state.destination?.coordinates||{lat:0,lon:0});return}
  renderMap(state.destination.coordinates);
  const z=APP_CONFIG.MAP_PROVIDER.zoom,center=worldPixel(state.destination.coordinates.lon,state.destination.coordinates.lat,z),width=Math.max(1,mapTiles.clientWidth||mapShell.clientWidth||600),height=Math.max(1,mapTiles.clientHeight||mapShell.clientHeight||420);
  const points=geometry.coordinates.map(pair=>{const p=worldPixel(pair[0],pair[1],z);return`${(width/2+p.x-center.x).toFixed(1)},${(height/2+p.y-center.y).toFixed(1)}`}).join(' ');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('route-overlay');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-label',`Recorrido ${computationModeLabel(state.selectedRouteMode)}`);
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',points);line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','6');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');line.setAttribute('vector-effect','non-scaling-stroke');svg.appendChild(line);mapTiles.appendChild(svg);sync3DTopology();
}
clearMap();
window.addEventListener('load',()=>{if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('/sw.js').catch(()=>{})});


function assistantModel(){

  const query=destinationInput.value.trim();

  if(statusLine.dataset.state==='error')return {copy:'No salió como esperábamos. Podés ajustar el destino o volver a intentarlo.',label:'Volver al destino',action:'destination'};

  if(state.destination){

    const mobility=state.mobilityDecision;

    if(mobility?.state==='handoff'||mobility?.state==='available')return {copy:'Hay información de movilidad disponible para este destino.',label:'Ver opciones',action:'options'};

    if(mobility?.state==='unknown')return {copy:'El destino está ubicado, pero la movilidad no está confirmada ahora.',label:'Ver mapa',action:'map'};

    if(mobility?.state==='unavailable')return {copy:'VOY todavía no tiene una integración de movilidad configurada para este destino.',label:mobility.next_actions?.[0]?.label||'Ver mapa',action:mobility.next_actions?.[0]?.type==='refine_destination'?'destination':'map'};

    return {copy:'Destino listo.',label:'Ver destino',action:'decision'};

  }

  if(query.length>=3){

    if(!nationalSearch.hidden)return {copy:'No alcanzó el contexto cercano. Podés ampliar la búsqueda sin cambiar lo que escribiste.',label:'Buscar en toda Argentina',action:'national'};

    return {copy:'Si el nombre se repite, agregá ciudad o provincia para afinar el resultado.',label:'Seguir escribiendo',action:'destination'};

  }

  if(state.origin)return {copy:'Con este origen, VOY prioriza resultados cercanos sin bloquear búsquedas en otras provincias.',label:'Buscar destino',action:'destination'};

  return {copy:'Podés buscar directo o usar tu ubicación para priorizar resultados cercanos.',label:'Usar mi ubicación',action:'location'};

}

function updateAssistant(){if(!assistantCopy||!assistantAction)return;const model=assistantModel();assistantCopy.textContent=model.copy;assistantAction.textContent=model.label;assistantAction.dataset.action=model.action}

function closeAssistant(){assistantPanel.hidden=true;assistantToggle.setAttribute('aria-expanded','false')}

function runAssistantAction(){const action=assistantAction.dataset.action;if(action==='location'){closeAssistant();$('#use-location').click();return}if(action==='national'){closeAssistant();nationalSearch.click();return}if(action==='options'){closeAssistant();options.scrollIntoView({block:'start',behavior:'smooth'});return}if(action==='map'){closeAssistant();mapShell.scrollIntoView({block:'center',behavior:'smooth'});return}if(action==='decision'){closeAssistant();decision.scrollIntoView({block:'start',behavior:'smooth'});return}closeAssistant();destinationInput.focus()}

assistantToggle.addEventListener('click',()=>{const opening=assistantPanel.hidden;assistantPanel.hidden=!opening;assistantToggle.setAttribute('aria-expanded',String(opening));if(opening)updateAssistant()});

assistantClose.addEventListener('click',closeAssistant);assistantAction.addEventListener('click',runAssistantAction);

document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!assistantPanel.hidden)closeAssistant()});

updateAssistant();

