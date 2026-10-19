import { APP_CONFIG } from './runtime-config.js?v=__BUILD_ID__';
import { isSafeOfficialHandoff, isSafeExternalNavigationUrl, buildExternalNavigationUrl, normalizeResolvedCandidate, normalizeDestinationSuggestion, normalizeMobilityDecision, normalizeMobilityComputation } from './contracts.js?v=__BUILD_ID__';
import { createTrackerStore, TRAIL_MAX_OBSERVATIONS } from './tracker/store.js?v=__BUILD_ID__';
import { classifyObservation, ageLabel } from './tracker/observations.js?v=__BUILD_ID__';
import { createMapSubstrate } from './map/substrate.js?v=__BUILD_ID__';
import { listSantaFeLines, geometriesForSantaFeLine, labelSantaFeLine } from './transit/line-picker.js?v=__BUILD_ID__';

const CLIENT_BUILD_ID='__BUILD_ID__';

const $=(sel)=>document.querySelector(sel);
const escapeHtml=(value='')=>{const div=document.createElement('div');div.textContent=String(value);return div.innerHTML};
function makeSessionToken(){const bytes=new Uint8Array(18);crypto.getRandomValues(bytes);return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('')}

const DEFAULT_MAP_CENTER={lat:-31.6333,lon:-60.7000};
const THREE_TOPOLOGY_CENTER=Object.freeze({lat:-31.6555,lon:-60.7100});
const THREE_TOPOLOGY_RADIUS_METERS=6000;
function hasSantaFeBusCoverage(center=null){
  const point=center||substrate.getCenter()||state.mapCenter||DEFAULT_MAP_CENTER;
  return trainRadarDistanceMeters(point,DEFAULT_MAP_CENTER)<=30000;
}
const SUGGEST_DEBOUNCE_MS=400;
const SUGGEST_CACHE_TTL_MS=45000;
const SUGGEST_CACHE_MAX=20;
const suggestionCache=new Map();
const suggestionInFlight=new Map();

const state={
  destination:null,destinationLabel:'',origin:null,mobilityDecision:null,mobilityComputation:null,selectedRouteMode:null,destinationCandidates:[],destinationActiveIndex:-1,
  trainRadar:null,mapCenter:null,searchTimer:null,searchController:null,searchScope:'local',sessionToken:makeSessionToken(),handoff:null,handoffNonce:0,
  originRevision:0,mapMode:'2d',threeController:null,threeModulePromise:null,threeImportAttempt:0,threeActivationRevision:0,locationGranted:false,theme:localStorage.getItem('voy-theme')||'dark',
  substrateState:'raster',stationModels:[],busNetwork:null,busNetworkGeometries:[],busNetworkSelectedGeometries:[],sheetPane:'collapsed',fixtureOn:false,gpsStatus:'not_integrated',gpsLastLiveAt:0,
  activeTransportMode:'bus'
};

// ---------- DOM refs ----------
const destinationInput=$('#destination'),suggestions=$('#destination-suggestions'),loading=$('#destination-loading'),contextHelp=$('#destination-context'),nationalSearch=$('#national-search');
const originInput=$('#origin'),originEditor=$('#origin-editor'),originLabel=$('#origin-label');
const statusLine=$('#destination-status'),decision=$('#decision'),options=$('#options');
const dialog=$('#handoff-dialog'),confirmHandoff=$('#confirm-handoff'),cancelHandoff=$('#cancel-handoff');
const mapShell=$('#map-shell'),mapTiles=$('#map-tiles'),mapCanvas=$('#map-canvas'),map3dLayer=$('#map-3d-layer'),map3dStatus=$('#map-3d-status'),map3dAttribution=$('#map-3d-attribution'),mapFallback=$('#map-fallback'),mapAttribution=$('#map-attribution'),map3dQuality=$('#map-3d-quality');
const busLineControl=$('#bus-line-control'),busLinePicker=$('#bus-line-picker'),busLineMeta=$('#bus-line-meta'),busLineSelection=$('#bus-line-selection');
const transportModePicker=$('#transport-mode-picker'),transitContextStatus=$('#transit-context-status');
const reducedMotionMedia=matchMedia('(prefers-reduced-motion: reduce)');
const trainRadar=$('#train-radar'),trainRadarMeta=$('#train-radar-meta'),trainRadarList=$('#train-radar-list');
const sheet=$('#voy-sheet'),sheetToggle=$('#sheet-toggle'),sheetToggleLabel=$('#sheet-toggle-label'),sheetBody=$('#sheet-body'),sheetSummary=$('#sheet-summary');
const quickLocation=$('#quick-location'),quickLines=$('#quick-lines'),quickOrigin=$('#quick-origin'),quickPlan=$('#quick-plan'),quickPlanLabel=$('#quick-plan-label');
const truthPill=$('#truth-pill'),truthLabel=$('#truth-label'),truthMeta=$('#truth-meta'),truthIcon=truthPill?.querySelector('.truth-icon');
const trackerFacts=$('#tracker-facts'),factsLine=$('#facts-line'),factsClose=$('#facts-close'),factsRows=$('#facts-rows'),fixtureBanner=$('#fixture-banner');
const followButton=$('#follow-button'),returnToNow=$('#return-to-now'),timeRailWrap=$('#time-rail-wrap'),timeRail=$('#time-rail'),timeRailMeta=$('#time-rail-meta');

const mapModeButtons=[...document.querySelectorAll('[data-map-mode]')];

// ---------- truth states (icon shape + text; never color alone) ----------
const TRUTH_STATES={
  realtime:{icon:'●',label:'En vivo'},
  predicted:{icon:'◔',label:'Estimado'},
  scheduled:{icon:'◷',label:'Programado'},
  unknown:{icon:'○',label:'Estado desconocido'},
  no_positions:{icon:'●',label:'Sin posiciones actuales'},
  source_unavailable:{icon:'●',label:'Fuente no disponible'},
  no_coverage:{icon:'◍',label:'Tiempo real no disponible en esta cobertura'}
};
const TRUTH_NETWORK_LIVE={icon:'●',label:'GPS de colectivos en vivo'};
function truthStateLabel(key){return TRUTH_STATES[key]||TRUTH_STATES.no_coverage}
function truthConclusion(cls,observation,{historical=false}={}){
  if(historical)return 'Observación histórica de esta sesión; no describe la posición actual.';
  if(cls.state==='realtime')return 'Posición observada recientemente por la fuente.';
  if(cls.state==='predicted')return 'Posición estimada; no es una observación en vivo.';
  if(cls.state==='scheduled')return 'Horario publicado; no representa una posición actual del vehículo.';
  if(cls.reason==='stale_source')return 'La última observación está vencida; no podemos inferir la posición actual.';
  return 'No hay evidencia suficiente para ubicar este servicio ahora.';
}
function updateTruthPill(){
  if(!truthPill)return;
  let entry=TRUTH_STATES.no_coverage,accessibleStatus='Estado GPS desconocido',datasetState='unknown';
  const selected=trackerStore.selected();
  if(state.activeTransportMode==='bus'&&!hasSantaFeBusCoverage()){
    entry=TRUTH_STATES.no_coverage;datasetState='no_coverage';
    accessibleStatus='No hay una fuente GPS de colectivos integrada cerca de esta ubicación';
  } else if(selected){
    const observation=selected.entity.observation;
    const cls=classifyObservation(observation,Date.now());
    entry=truthStateLabel(cls.state);
    datasetState=cls.reason==='stale_source'?'stale':cls.state==='realtime'?'realtime':'unknown';
    const age=Number.isFinite(cls.age_ms)?ageLabel(cls.age_ms):'';
    accessibleStatus=[truthConclusion(cls,observation),age,observation.source_id].filter(Boolean).join(' · ');
  } else if(state.activeTransportMode==='train'){
    entry={icon:'◷',label:'GPS de trenes no confirmado'};
    datasetState='unknown';
    accessibleStatus='No hay posiciones de trenes en vivo confirmadas en esta zona';
  } else if(state.gpsStatus==='live'&&Date.now()-state.gpsLastLiveAt<=20000){
    entry=TRUTH_NETWORK_LIVE;
    datasetState='realtime';
    const live=trackerStore.entities().filter(entity=>
      entity.observation.temporal_state==='realtime'&&matchesSelectedGpsLine(entity.observation)
    ).length;
    accessibleStatus=`GPS de colectivos en vivo; ${live} vehículos observados`;
  } else if(state.gpsStatus==='no_current_positions'){
    entry=TRUTH_STATES.no_positions;
    datasetState='no_positions';
    accessibleStatus='La fuente GPS respondió, pero no hay posiciones actuales';
  } else if(state.gpsStatus==='source_unavailable'){
    entry=TRUTH_STATES.source_unavailable;
    datasetState='unknown';
    accessibleStatus='No se pudo consultar la fuente GPS';
  } else if(state.fixtureOn){
    entry={icon:'●',label:''};
    datasetState='unknown';
    accessibleStatus='Fixture de demostración activado';
  } else {
    entry={icon:'●',label:''};
    datasetState='unknown';
    accessibleStatus='Estado GPS desconocido';
  }
  if(truthPill.dataset.state!==datasetState)truthPill.dataset.state=datasetState;
  truthIcon.textContent=entry.icon;
  truthLabel.textContent=entry.label||accessibleStatus;
  truthLabel.hidden=false;
  truthPill.querySelector('.truth-copy').hidden=false;
  if(truthMeta){
    const detail=state.activeTransportMode==='train'?'Trenes · zona cercana':'Colectivos · zona cercana';
    truthMeta.textContent=detail;
    truthMeta.hidden=false;
  }
  truthPill.setAttribute('aria-label',accessibleStatus);
  truthPill.title=accessibleStatus;
}

// ---------- map stage + substrate ----------
const substrate=createMapSubstrate({
  tilesEl:mapTiles,canvasEl:mapCanvas,fallbackEl:mapFallback,attributionEl:mapAttribution,config:APP_CONFIG,buildId:CLIENT_BUILD_ID,
  onUserInteraction:()=>{trackerStore.userPanSuspend();updateFollowUI()},
  onViewportChange:()=>{syncTrackerOverlays();updateTransitControlAvailability()},
  onSelectMarker:id=>selectTrackerEntity(id),
  onVectorReady:()=>{state.substrateState='vector';syncTrackerOverlays()},
  onSubstrateChange:null,
  onVectorFailed:reason=>{console.warn('[voy] vector substrate failed:',reason);state.substrateState='vector_failed';setSheetSummary()}
});
function onSubstrateChange(reason){state.substrateState=reason==='openfreemap_maplibre'?'vector':'vector_failed';setSheetSummary()}

function renderMap(coords,label='Mapa del destino',showPin=true){
  state.mapCenter={lat:Number(coords.lat),lon:Number(coords.lon)};
  mapShell.setAttribute('aria-label',label);
  mapShell.hidden=false;
  substrate.setCenter(state.mapCenter,{label,showPin});
  syncTrackerOverlays();
}
function renderInitialMap(){renderMap(state.mapCenter||DEFAULT_MAP_CENTER,'Mapa cerca de tu ubicación',false)}
function clearMap(){renderInitialMap()}
function currentBusNetworkGeometries(){
  const center=substrate.getCenter()||state.mapCenter||DEFAULT_MAP_CENTER;
  return state.busNetworkSelectedGeometries.length&&hasSantaFeBusCoverage(center)?state.busNetworkSelectedGeometries:[];
}
let busNetworkLoadStarted=false;
async function loadSantaFeBusNetwork(){
  if(state.activeTransportMode!=='bus')return;
  if(!hasSantaFeBusCoverage()){
    busLineMeta.textContent='No hay cobertura GPS de colectivos integrada cerca de esta ubicación';
    return;
  }
  if(state.busNetwork||busNetworkLoadStarted)return;
  busNetworkLoadStarted=true;
  const controlWasOpen=!busLineControl.hidden;
  busLineMeta.textContent='Cargando recorridos publicados…';
  try{
    const response=await fetch('/transit/santa-fe-lines.json?v='+encodeURIComponent(CLIENT_BUILD_ID),{cache:'force-cache'});
    if(!response.ok)throw new Error('bus_network_unavailable');
    const payload=await response.json();
    if(payload?.kind!=='static_route_geometry'||!Array.isArray(payload.routes))throw new Error('bus_network_malformed');
    const geometries=geometriesForSantaFeLine(payload.routes);
    if(!geometries.length)throw new Error('bus_network_empty');
    state.busNetwork=payload;state.busNetworkGeometries=geometries;
    state.busNetworkSelectedGeometries=geometries;
    const lines=listSantaFeLines(payload.routes);
    for(const line of lines){const option=document.createElement('option');option.value=line;option.textContent=labelSantaFeLine(line);busLinePicker.appendChild(option)}
    const savedLine=localStorage.getItem('voy.sf.line')||'';
    if(savedLine&&lines.includes(savedLine)){busLinePicker.value=savedLine;state.busNetworkSelectedGeometries=geometriesForSantaFeLine(payload.routes,savedLine)}else{busLinePicker.value='';state.busNetworkSelectedGeometries=[]}
    busLineControl.hidden=!controlWasOpen;
    quickLines.setAttribute('aria-expanded',String(controlWasOpen));
    updateBusLineMeta();
  }catch{
    state.busNetwork=null;state.busNetworkGeometries=[];busNetworkLoadStarted=false;
    busLineMeta.textContent='Recorridos no disponibles; abrí Líneas para reintentar.';
  }
  syncTrackerOverlays();
}

// ---------- 2D/3D mode (existing lazy Three architecture preserved) ----------
function current3DTransportEntities(){
  const center=substrate.getCenter()||state.mapCenter||DEFAULT_MAP_CENTER;
  const nearbyIds=new Set(trackerStore.nearby(center,{
    filter:entity=>entity.observation.temporal_state==='realtime'&&matchesSelectedGpsLine(entity.observation)
  }).map(entity=>entity.id));
  return trackerStore.transportEntries()
    .filter(entity=>nearbyIds.has(entity.id)&&entity.next?.temporal_state==='realtime'&&matchesSelectedGpsLine(entity.next))
    .map(entity=>({...entity,displayFrame:trackerStore.displayFrame(entity.id,{reducedMotion:reducedMotionMedia.matches})}));
}
function currentSelectedRouteGeometry(){
  const trackerSelection=trackerStore.selected();
  if(trackerSelection?.entity?.observation?.verified_geometry)return {type:'LineString',coordinates:trackerSelection.entity.observation.verified_geometry};
  return state.mobilityComputation?.mode_options?.find(item=>item.mode===state.selectedRouteMode&&item.route_available)?.route?.geometry??null;
}
function hasLocal3DTopologyContext(coords){return Boolean(coords)&&trainRadarDistanceMeters(coords,THREE_TOPOLOGY_CENTER)<=THREE_TOPOLOGY_RADIUS_METERS}
function has3DContext(){
  const selected=trackerStore.selected();
  if(selected){
    const frame=trackerStore.displayFrame(selected.id,{reducedMotion:reducedMotionMedia.matches});
    if(frame.render&&frame.position)return true;
  }
  return Boolean(currentSelectedRouteGeometry())||hasLocal3DTopologyContext(substrate.getCenter()||DEFAULT_MAP_CENTER);
}
function setMapModeButtons(mode){for(const button of mapModeButtons)button.setAttribute('aria-pressed',String(button.dataset.mapMode===mode))}
function sync3DTopology(){if(state.mapMode==='3d'&&state.threeController)state.threeController.update({routeGeometry:currentSelectedRouteGeometry(),networkGeometries:currentBusNetworkGeometries(),transportEntities:current3DTransportEntities()})}
function update3DGpsStatus(){
 const now=Date.now();
 const selectedLine=String(busLinePicker.value||'').trim();
 const fresh=selectedLine?trackerStore.entities().filter(entity=>
   String(entity.observation.line||'').trim()===selectedLine&&
   classifyObservation(entity.observation,now).state==='realtime'):[];
 const sourceFresh=state.gpsStatus==='live'&&now-state.gpsLastLiveAt<=20000;
 const lineLabel=selectedLine?labelSantaFeLine(selectedLine):'';
 const copy=fresh.length
   ?'Mapa 3D · GPS EN VIVO · '+fresh.length+' '+(fresh.length===1?'vehículo observado':'vehículos observados')
   :!selectedLine
     ?'Mapa 3D · GPS en vivo: elegí una línea · recorridos publicados'
     :sourceFresh
       ?'Mapa 3D · '+lineLabel+' · fuente GPS activa, sin posiciones confirmadas'
       :state.gpsStatus==='no_current_positions'
         ?'Mapa 3D · '+lineLabel+' · sin posiciones GPS actuales'
         :state.gpsStatus==='source_unavailable'
           ?'Mapa 3D · '+lineLabel+' · fuente GPS no disponible'
           :'Mapa 3D · '+lineLabel+' · GPS sin confirmar · recorrido publicado';
 if(map3dStatus.textContent!==copy)map3dStatus.textContent=copy;
}
function activate2D(message=''){
  state.threeActivationRevision+=1;
  state.threeController?.dispose?.();state.threeController=null;
  state.mapMode='2d';setMapModeButtons('2d');substrate.setMode('2d');
  if(!substrate.maplibreReady)void startVectorUpgradeOnce();
  map3dLayer.hidden=true;map3dLayer.style.opacity='';map3dAttribution.hidden=true;map3dQuality.hidden=true;map3dStatus.textContent=message;syncTrackerOverlays();
}
function loadVoy3DModule(){
  return state.threeImportAttempt===0
    ? import('./3d/voy3d.js?v=__BUILD_ID__')
    : import(`./3d/voy3d.js?v=__BUILD_ID__&retry=${state.threeImportAttempt}`);
}
async function activate3D(){
  if(state.mapMode==='3d'&&state.threeController?.ok)return;
  const activationRevision=++state.threeActivationRevision;
  if(!has3DContext()){activate2D('3D urbano disponible en Santa Fe centro; mové el mapa a esa zona.');return}
  map3dStatus.textContent='Preparando mapa 3D de Santa Fe…';
  try{
    // If a user explicitly opened 2D, let its existing vector-map startup settle
    // before constructing the 3D map; on the default path there is no idle map.
    if(vectorUpgradePromise){
      await vectorUpgradePromise;
      if(activationRevision!==state.threeActivationRevision)return;
      if(!has3DContext()){activate2D('3D urbano disponible en Santa Fe centro; mové el mapa a esa zona.');return}
    }
    map3dStatus.textContent='Abriendo mapa 3D de Santa Fe…';
    state.threeModulePromise??=loadVoy3DModule();
    const mod=await state.threeModulePromise;
    if(activationRevision!==state.threeActivationRevision)return;
    if(mod.BUILD_ID!==CLIENT_BUILD_ID)throw new Error('3d_build_identity_mismatch');
    map3dLayer.hidden=false;map3dLayer.style.opacity='0';
    const controller=state.threeController?.ok?state.threeController:await mod.activateVoyUrbanMap3D({mount:map3dLayer,onFallback:()=>{state.threeController=null;activate2D('Mapa 3D no disponible; continuamos en 2D.')},routeGeometry:currentSelectedRouteGeometry(),networkGeometries:currentBusNetworkGeometries(),transport:current3DTransportEntities(),quality:map3dQuality.value,reducedMotion:reducedMotionMedia.matches});
    if(activationRevision!==state.threeActivationRevision){controller?.dispose?.();return}
    if(!controller?.ok){state.threeController=null;activate2D('3D no disponible en este equipo; seguimos en 2D.');return}
    state.threeController=controller;
    state.mapMode='3d';setMapModeButtons('3d');substrate.setMode('3d');map3dLayer.hidden=false;map3dLayer.style.opacity='';map3dAttribution.hidden=false;map3dQuality.hidden=controller.renderer==='MAPLIBRE_URBAN_3D';update3DGpsStatus();sync3DTopology();
  }catch(error){
    if(activationRevision!==state.threeActivationRevision)return;
    state.threeController=null;state.threeModulePromise=null;state.threeImportAttempt+=1;activate2D('3D no disponible en este equipo; seguimos en 2D.');
  }
}
mapModeButtons.forEach(button=>button.addEventListener('click',()=>button.dataset.mapMode==='3d'?activate3D():activate2D()));
async function restart3DForRenderPolicy(){if(state.mapMode!=='3d')return;state.threeController?.dispose?.();state.threeController=null;await activate3D()}
map3dQuality.addEventListener('change',restart3DForRenderPolicy);
reducedMotionMedia.addEventListener?.('change',restart3DForRenderPolicy);
// orbiting in 3D is also user interaction: it suspends follow immediately
map3dLayer.addEventListener('pointerdown',()=>{trackerStore.userPanSuspend();updateFollowUI()});

// ---------- TrackerView ----------
const trackerStore=createTrackerStore();

function matchesSelectedGpsLine(observation){
  if(observation?.synthetic_fixture===true||observation?.observed_position_only!==true)return true;
  const selectedLine=String(busLinePicker.value||'').trim();
  return Boolean(selectedLine)&&String(observation.line||'').trim()===selectedLine;
}
function trackerMarkerModels(){
  const center=substrate.getCenter()||DEFAULT_MAP_CENTER;
  const entities=trackerStore.nearby(center,{filter:entity=>matchesSelectedGpsLine(entity.observation)});
  const models=[];
  for(const entity of entities){
    const frame=trackerStore.displayFrame(entity.id,{reducedMotion:reducedMotionMedia.matches});
    const kind=frame.temporal_state==='predicted'?'predicted':frame.temporal_state;
    if(!frame.render||!frame.position)continue;
    const cls=classifyObservation(entity.observation,Date.now());
    const observedPosition=entity.observation.observed_position_only===true;
    const vehicleHint=String(entity.observation.vehicle_type||entity.observation.transport_mode||entity.observation.mode||'').toLowerCase();
    const sourceHint=String(entity.observation.source_id||entity.observation.source||'').toLowerCase();
    const vehicleType=/train|rail|tren|ferrovi/.test(vehicleHint)?'train':
      (/bus|colect|omnibus/.test(vehicleHint)||sourceHint==='sf_gps_cuandopasa')?'bus':'unknown';
    models.push({
      id:entity.id,kind,lat:frame.position.lat,lon:frame.position.lon,selected:trackerStore.selected()?.id===entity.id,
      gpsVehicle:observedPosition,vehicleType:observedPosition?vehicleType:null,bearing:frame.bearing,
      displayInterpolated:frame.display_interpolated===true,
      label:markerLabel(entity,frame,cls)
    });
  }
  return models;
}
function markerLabel(entity,frame,cls){
  const line=entity.observation.line?`Línea ${entity.observation.line}`:entity.id;
  const stateText=frame.scrub?'Histórico de esta sesión':truthStateLabel(cls.state).label+(cls.state==='realtime'?` · ${ageLabel(cls.age_ms)}`:'');
  const fixture=entity.observation.synthetic_fixture?' · fixture demo':'';
  const estimate=frame.display_interpolated?' · Posición estimada entre mediciones':'';
  return `${line} · ${stateText}${estimate} · ${entity.id}${fixture}`;
}
function selectedTrailDots(){
  const selected=trackerStore.selected();
  if(!selected)return {trail:[],scrubIndex:-1};
  if(selected.entity.observation.temporal_state!=='realtime')return {trail:[],scrubIndex:-1};
  const trail=trackerStore.trail(selected.id);
  const newest=Date.parse(trail.at(-1)?.observed_at||'')||Date.now();
  const oldest=Date.parse(trail[0]?.observed_at||'')||newest;
  const span=Math.max(1,newest-oldest);
  const time=trackerStore.timeState();
  return {
    trail:trail.map(point=>({lat:point.lat,lon:point.lon,ageRatio:Math.min(1,(newest-Date.parse(point.observed_at))/span)})),
    scrubIndex:time.mode==='scrub'?time.index:-1
  };
}
function selectedRouteForMap(){
  const selected=trackerStore.selected();
  if(selected?.entity?.observation?.verified_geometry)return selected.entity.observation.verified_geometry;
  return state.mobilityComputation?.mode_options?.find(item=>item.mode===state.selectedRouteMode&&item.route_available)?.route?.geometry??null;
}
function syncTrackerOverlays(){
  if(state.mapMode!=='2d')return;
  const {trail,scrubIndex}=selectedTrailDots();
  substrate.sync({markers:trackerMarkerModels(),stations:state.stationModels,networkGeometries:currentBusNetworkGeometries(),routeGeometry:selectedRouteForMap(),trail,scrubIndex});
}
function trackerTick(){
  if(document.hidden)return;
  const entities=trackerStore.entities();
  const selected=trackerStore.selected();
  if(state.mapMode==='3d'&&entities.length===0){update3DGpsStatus();return}
  if(entities.length===0)return;
  const needsAnimationCheck=(state.mapMode==='2d'&&!selected&&trackerStore.follow()!=='following')||
    (state.mapMode==='3d'&&!selected);
  let interpolating=false;
  if(needsAnimationCheck){
    for(const entity of entities){
      if(trackerStore.displayFrame(entity.id,{reducedMotion:reducedMotionMedia.matches}).display_interpolated){
        interpolating=true;break;
      }
    }
  }
  if(state.mapMode==='2d'&&!selected&&trackerStore.follow()!=='following'&&!interpolating&&!state.fixtureOn)return;
  if(state.mapMode==='3d'&&!selected&&!interpolating&&!state.fixtureOn){update3DGpsStatus();return;}
  if(state.mapMode==='2d'){
    if(trackerStore.follow()==='following'&&selected){
      const frame=trackerStore.displayFrame(selected.id,{reducedMotion:reducedMotionMedia.matches});
      if(frame.render&&frame.position)substrate.focusTo(frame.position);
    }
    syncTrackerOverlays();
  }else{
    sync3DTopology();
    update3DGpsStatus();
  }
  updateTruthPill();
  updateFactsSheet();
}
setInterval(trackerTick,250);

function selectTrackerEntity(id){
  if(!trackerStore.get(id))return;
  trackerStore.select(id);
  openSheetPane('facts');
  updateFactsSheet();
  updateTruthPill();
  syncTrackerOverlays();
  trackerFacts?.focus?.();
}
function factsRow(term,value){
  return `<div class="fact-row"><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}
let lastFactsSignature='';
function updateFactsSheet(){
  const selected=trackerStore.selected();
  if(!selected){trackerFacts.hidden=true;lastFactsSignature='';return}
  trackerFacts.hidden=false;
  const observation=selected.entity.observation;
  const freshClassification=classifyObservation(observation,Date.now());
  const cls=freshClassification;
  const signature=[selected.id,observation.observed_at,trackerStore.follow(),trackerStore.timeState().mode,trackerStore.timeState().index,trackerStore.trail(selected.id).length,cls.state,Math.round((cls.age_ms||0)/1000)].join('|');
  if(signature===lastFactsSignature)return;
  lastFactsSignature=signature;
  const time=trackerStore.timeState();
  const rows=[];
  rows.push(factsRow('Identidad',[observation.line?`Línea ${observation.line}`:'',selected.id].filter(Boolean).join(' · ')));
  rows.push(factsRow('Estado temporal',time.mode==='scrub'?'Histórico de esta sesión':truthStateLabel(cls.state).label+(cls.state==='unknown'&&cls.reason==='stale_source'?' (fuente vencida)':'')));
  rows.push(factsRow('Qué sabemos',truthConclusion(cls,observation,{historical:time.mode==='scrub'})));
  if(Number.isFinite(cls.age_ms))rows.push(factsRow('Actualizado',ageLabel(cls.age_ms)));
  if(observation.next_stop)rows.push(factsRow('Próxima parada',observation.next_stop));
  if(Number.isFinite(observation.delay_seconds))rows.push(factsRow('Demora',`${Math.round(observation.delay_seconds/60)} min`));
  if(Number.isFinite(observation.speed_mps))rows.push(factsRow('Velocidad',`${Math.round(observation.speed_mps*3.6)} km/h${observation.synthetic_fixture?' (fixture)':''}`));
  if(Array.isArray(observation.scheduled_times)&&observation.scheduled_times.length)rows.push(factsRow('Servicios publicados',observation.scheduled_times.slice(0,7).join(' · ')));
  if(observation.source_id)rows.push(factsRow('Fuente',observation.synthetic_fixture?`${observation.source_id} (synthetic fixture)`:observation.source_id));
  factsRows.innerHTML=rows.join('');
  factsLine.textContent=[observation.line?`Línea ${observation.line}`:'',selected.id].filter(Boolean).join(' · ');
  fixtureBanner.hidden=observation.synthetic_fixture!==true;
  trackerFacts?.scrollIntoView?.({block:'nearest'});
  updateFollowUI();
  updateTimeRail();
}
function updateFollowUI(){
  const selected=trackerStore.selected();
  if(!selected){followButton.hidden=true;return}
  followButton.hidden=false;
  const mode=trackerStore.follow();
  followButton.textContent=mode==='following'?'Siguiendo…':mode==='suspended'?'Reanudar seguimiento':'Seguir';
  followButton.setAttribute('aria-pressed',String(mode==='following'));
}
followButton?.addEventListener('click',()=>{
  const mode=trackerStore.follow();
  if(mode==='following'){trackerStore.setFollow('suspended')}
  else{trackerStore.resumeFollow()}
  updateFollowUI();
});
function updateTimeRail(){
  const selected=trackerStore.selected();
  if(!selected){timeRailWrap.hidden=true;return}
  const realtimeOnly=selected.entity.observation.temporal_state==='realtime';
  const trail=trackerStore.trail(selected.id);
  if(!realtimeOnly||trail.length<2){timeRailWrap.hidden=true;return}
  const time=trackerStore.timeState();
  timeRailWrap.hidden=false;
  timeRail.max=String(trail.length-1);
  timeRail.value=String(time.mode==='scrub'?time.index:trail.length-1);
  timeRailMeta.textContent=`${trail.length} observaciones · máx ${TRAIL_MAX_OBSERVATIONS}`;
  const observing=time.mode==='scrub';
  returnToNow.hidden=!observing;
}
timeRail?.addEventListener('input',()=>{trackerStore.scrubTo(Number(timeRail.value));updateFactsSheet();syncTrackerOverlays()});
returnToNow?.addEventListener('click',()=>{trackerStore.returnToNow();updateFactsSheet();syncTrackerOverlays();updateTruthPill()});
factsClose?.addEventListener('click',()=>{trackerStore.clearSelection();trackerFacts.hidden=true;lastFactsSignature='';updateTruthPill();syncTrackerOverlays();setSheetSummary()});

// ---------- deterministic fixtures ---------- (development evidence only)
const urlParams=new URLSearchParams(location.search);
if(urlParams.get('fixture')==='realtime'){
  const fixtures=await import('./tracker/fixtures.js?v=__BUILD_ID__');
  if(fixtures.fixtureEnabled(urlParams)){
    state.fixtureOn=true;
    const tickMs=Math.max(1200,Number(urlParams.get(fixtures.FIXTURE_TICK_PARAM))||fixtures.FIXTURE_DEFAULT_TICK_MS);
    const engine=fixtures.createFixtureEngine({push:observation=>trackerStore.ingest(observation),tickMs});
    engine.start();
    window.__voyFixtureEngine=engine;
    window.__voyDebug={store:trackerStore,substrate,state};
    fixtureBanner.hidden=false;
    sheetSummary.textContent=`${fixtures.FIXTURE_LABEL} · entidades sintéticas en movimiento`;
  }
}

// ---------- bottom sheet ----------
function setSheetPane(pane){
  state.sheetPane=pane;
  sheet.dataset.pane=pane;
  const expanded=pane==='expanded';
  sheetToggle.setAttribute('aria-expanded',String(expanded));
  sheetToggleLabel.textContent=expanded?'Cerrar panel':'Abrir panel';
  document.querySelector('.sheet-collapsed').hidden=expanded;
  document.querySelector('.sheet-expanded').hidden=!expanded;
  quickPlan.setAttribute('aria-expanded',String(expanded));
  quickPlan.setAttribute('aria-label',expanded?'Cerrar planificador':'Abrir planificador');
  quickPlanLabel.textContent=expanded?'Cerrar':'Más';
}
function openSheetPane(pane){setSheetPane(pane==='facts'?'expanded':pane)}
sheetToggle.addEventListener('click',()=>setSheetPane(state.sheetPane==='expanded'?'collapsed':'expanded'));
function updateTransitControlAvailability(){
  const center=substrate.getCenter()||state.mapCenter||DEFAULT_MAP_CENTER;
  const busMode=state.activeTransportMode==='bus';
  const hasCoverage=trainRadarDistanceMeters(center,DEFAULT_MAP_CENTER)<=30000;
  if(busLineSelection)busLineSelection.hidden=!busMode;
  if(busLinePicker)busLinePicker.disabled=busMode&&!hasCoverage;
  if(busMode&&!hasCoverage){
    transitContextStatus.textContent='No hay una fuente GPS de colectivos integrada cerca de esta ubicación; no se muestran vehículos de otras zonas.';
    busLineMeta.textContent='Cobertura local no disponible';
  }else if(busMode&&transitContextStatus.textContent.startsWith('No hay una fuente GPS de colectivos integrada')){
    transitContextStatus.textContent='Recorridos publicados y GPS confirmado solo donde existe una fuente local.';
  }
}
function toggleBusLineControl(){
  const opening=busLineControl.hidden;
  busLineControl.hidden=!opening;
  quickLines.setAttribute('aria-expanded',String(opening));
  updateTransitControlAvailability();
  if(opening){
    if(state.activeTransportMode==='bus'&&hasSantaFeBusCoverage())void loadSantaFeBusNetwork();
    transportModePicker.focus({preventScroll:true});
  }
}
quickLocation.addEventListener('click',()=>$('#use-location').click());
quickLines.addEventListener('click',toggleBusLineControl);
quickOrigin.addEventListener('click',()=>{
  setSheetPane('expanded');
  const manualOrigin=$('#manual-origin');
  if(!manualOrigin.hidden){manualOrigin.click();originInput.focus();return}
  setStatus('Para cambiar el origen elegido, tocá “Cambiar” en el panel.','neutral');
  $('#clear-location').focus({preventScroll:true});
});
quickPlan.addEventListener('click',()=>setSheetPane(state.sheetPane==='expanded'?'collapsed':'expanded'));
function setSheetSummary(){
  const selected=trackerStore.selected();
  if(selected){
    const cls=classifyObservation(selected.entity.observation,Date.now());
    sheetSummary.textContent=`${selected.entity.observation.line?`Línea ${selected.entity.observation.line} · `:''}${truthStateLabel(cls.state).label}${cls.state==='realtime'?` · ${ageLabel(cls.age_ms)}`:''} · seleccionada`;
    return;
  }
  if(state.fixtureOn){sheetSummary.textContent=`${FIXTURE_LABEL} · entidades sintéticas para evidencia de desarrollo`;return}
  if(state.substrateState==='vector_failed'){sheetSummary.textContent='Mapa vectorial no disponible; seguimos en mapa raster.';return}
  if(state.gpsStatus==='live'&&Date.now()-state.gpsLastLiveAt<=20000){sheetSummary.textContent='Colectivos GPS observados · fuente verificada';return}
  if(state.gpsStatus==='no_current_positions'){
    sheetSummary.textContent='La fuente GPS respondi\u00f3, pero no public\u00f3 posiciones actuales para esta l\u00ednea. Puede ser fuera del horario de servicio; el recorrido publicado sigue disponible.';return
  }
  if(state.gpsStatus==='source_unavailable'){
    sheetSummary.textContent='No se pudo consultar la fuente GPS. El recorrido publicado sigue disponible; no se muestran posiciones sin verificar.';return
  }
  sheetSummary.textContent='GPS de VOY: todavía no integrado.';
}
trackerStore.onChange(()=>setSheetSummary());

// ---------- vector map startup; raster is retained only as failure fallback ----------
let vectorUpgradePromise=null;
function startVectorUpgradeOnce(){
  if(substrate.maplibreReady)return Promise.resolve(true);
  if(!vectorUpgradePromise){
    vectorUpgradePromise=Promise.resolve()
      .then(()=>substrate.upgradeToVector(state.mapCenter||DEFAULT_MAP_CENTER))
      .catch(()=>false);
  }
  return vectorUpgradePromise;
}

// ---------- theme ----------
function effectiveDark(){if(state.theme==='dark')return true;if(state.theme==='light')return false;return matchMedia('(prefers-color-scheme: dark)').matches}
function applyTheme(){document.documentElement.dataset.theme=state.theme;const button=$('#theme');button.querySelector('span').textContent=state.theme==='light'?'☀':state.theme==='dark'?'●':'◐';button.setAttribute('aria-label',state.theme==='light'?'Tema claro':state.theme==='dark'?'Tema oscuro':'Tema del sistema');document.querySelector('meta[name="theme-color"]')?.setAttribute('content',effectiveDark()?'#000000':'#f4f3ef')}
$('#theme').addEventListener('click',()=>{const values=['system','light','dark'];state.theme=values[(values.indexOf(state.theme)+1)%values.length];localStorage.setItem('voy-theme',state.theme);applyTheme()});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(state.theme==='system')applyTheme()});applyTheme();

// ---------- planner: destination search (secondary, inside sheet) ----------
const assistantToggle=$('#assistant-toggle'),assistantPanel=$('#assistant-panel'),assistantClose=$('#assistant-close'),assistantCopy=$('#assistant-copy'),assistantAction=$('#assistant-action');

function setStatus(text='',kind='neutral'){statusLine.textContent=text;statusLine.dataset.state=kind;updateAssistant()}
function approxDistance(meters){if(!Number.isFinite(meters))return '';return meters<1000?`${Math.max(50,Math.round(meters/50)*50)} m`:meters<10000?`${(meters/1000).toFixed(1).replace('.',',')} km`:`${Math.round(meters/1000)} km`}
function fmtVerified(value){try{return new Intl.DateTimeFormat('es-AR',{dateStyle:'medium'}).format(new Date(value))}catch{return ''}}
function destinationViewport(){const center=substrate.getCenter()||state.mapCenter||DEFAULT_MAP_CENTER;return center?{center:{lat:Number(center.lat),lon:Number(center.lon)},span_km:25}:null}
function destinationContext(){const viewport=destinationViewport();if(!state.origin)return {search_scope:state.searchScope,viewport};return {search_scope:state.searchScope,viewport,origin:{locality:state.origin.locality?.name||'',province:state.origin.province?.name||'',province_id:state.origin.province?.id||'',coordinates:state.origin.coordinates||null}}}
function suggestionCacheKey(query,scope){const point=!state.origin&&scope==='local'?destinationViewport()?.center:null;const view=point?`${Number(point.lat).toFixed(3)},${Number(point.lon).toFixed(3)}`:'none';return `${String(scope||'local')}|${state.originRevision}|${view}|${String(query||'').trim().toLocaleLowerCase('es-AR')}`}
function readSuggestionCache(key,now=Date.now()){const hit=suggestionCache.get(key);if(!hit)return null;if(now-hit.storedAt>SUGGEST_CACHE_TTL_MS){suggestionCache.delete(key);return null}suggestionCache.delete(key);suggestionCache.set(key,hit);return hit.payload}
function writeSuggestionCache(key,payload,now=Date.now()){suggestionCache.delete(key);suggestionCache.set(key,{storedAt:now,payload});while(suggestionCache.size>SUGGEST_CACHE_MAX)suggestionCache.delete(suggestionCache.keys().next().value)}
function invalidateSuggestionOriginContext(){state.originRevision+=1;suggestionCache.clear()}
function trainRadarDistanceMeters(a,b){const rad=n=>Number(n)*Math.PI/180,dLat=rad(Number(b.lat)-Number(a.lat)),dLon=rad(Number(b.lon)-Number(a.lon)),la1=rad(a.lat),la2=rad(b.lat),q=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*6371000*Math.asin(Math.min(1,Math.sqrt(q)))}
async function apiJson(url,options={}){const response=await fetch(url,options);let payload={};try{payload=await response.json()}catch{}if(!response.ok){const error=new Error(payload.error||`http_${response.status}`);error.status=response.status;error.payload=payload;throw error}return payload}

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

function clearTrainRadar(){state.trainRadar=null;trainRadar.hidden=true;trainRadarMeta.textContent='';trainRadarList.replaceChildren();state.stationModels=[];syncTrackerOverlays()}
function radarObservedLabel(value){if(!value)return '';try{return new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))}catch{return ''}}
function renderTrainRadar(radar){
  state.trainRadar=radar;trainRadar.hidden=false;trainRadarList.replaceChildren();
  const status=radar?.source_status==='available'?'horarios publicados':radar?.source_status==='stale'?'unknown · fuente vencida':radar?.source_status==='static_only'?'solo estaciones · horarios no confirmados':'unknown · fuente no disponible';
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
  state.stationModels=stations.map(item=>{
    const coords=item?.station?.coordinates;
    if(!coords)return null;
    return {name:item.station.name,lat:Number(coords.lat),lon:Number(coords.lon)};
  }).filter(Boolean);
  syncTrackerOverlays();
}
async function refreshTrainRadar(centerOverride=null){
  const center=centerOverride||state.origin?.coordinates;
  if(!center){clearTrainRadar();return}
  const sameCenter=state.mapCenter&&Math.abs(state.mapCenter.lat-center.lat)<1e-7&&Math.abs(state.mapCenter.lon-center.lon)<1e-7;
  if(mapShell.hidden||!sameCenter)renderMap(center,'Mapa ferroviario cerca de tu ubicación',false);
  try{
    const payload=await apiJson('/api/radar/trains/nearby',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({coordinates:center})});
    renderTrainRadar(payload.radar);updateTrainStationMarkers(payload.radar?.stations||[]);
  }catch{
    renderTrainRadar({source_status:'unavailable',stations:[],source:null});updateTrainStationMarkers([]);
  }
}
function applyTransitContext({mode=transportModePicker?.value||'bus',initial=false}={}){
  if(!state.mapCenter)renderInitialMap();
  state.activeTransportMode=mode==='train'?'train':'bus';
  if(transportModePicker&&transportModePicker.value!==state.activeTransportMode)transportModePicker.value=state.activeTransportMode;
  state.gpsStatus='not_integrated';state.gpsLastLiveAt=0;
  trackerStore.clearSelection();
  const center=substrate.getCenter()||state.mapCenter||DEFAULT_MAP_CENTER;
  state.busNetworkSelectedGeometries=busLinePicker.value
    ?geometriesForSantaFeLine(state.busNetwork?.routes,busLinePicker.value)
    :[];
  clearTrainRadar();
  if(state.activeTransportMode==='train'){
    transitContextStatus.textContent='Los trenes en vivo solo se muestran cuando una fuente cercana confirma posiciones actuales.';
    busLineMeta.textContent='GPS de trenes no confirmado; no se inventan posiciones';
    refreshTrainRadar(center);
  }else{
    transitContextStatus.textContent=hasSantaFeBusCoverage(center)
      ?'Recorridos publicados; posiciones GPS solo desde una fuente local confirmada.'
      :'No hay una fuente GPS de colectivos integrada cerca de esta ubicación; no se muestran vehículos de otras zonas.';
    updateBusLineMeta();
    if(busLinePicker.value&&hasSantaFeBusCoverage(center))void loadSantaFeBusNetwork();
  }
  updateTransitControlAvailability();
  quickLines.setAttribute('aria-expanded',String(!busLineControl.hidden));
  updateTruthPill();
  setSheetSummary();
  syncTrackerOverlays();
}
transportModePicker?.addEventListener('change',()=>applyTransitContext({mode:transportModePicker.value}));
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
async function restoreGrantedLocation(){
  if(!navigator.geolocation||!navigator.permissions?.query)return;
  try{
    const permission=await navigator.permissions.query({name:'geolocation'});
    if(permission.state==='granted'){
      navigator.geolocation.getCurrentPosition(position=>{
        renderMap({lat:Number(position.coords.latitude),lon:Number(position.coords.longitude)},'Mapa cerca de tu ubicación',false);
        state.locationGranted=true;
        updateTransitControlAvailability();
        updateTruthPill();
        syncTrackerOverlays();
      },()=>{},{enableHighAccuracy:false,timeout:8000,maximumAge:60000});
    }
  }catch{}
}
$('#use-location').addEventListener('click',()=>{if(!navigator.geolocation){setStatus('La ubicación no está disponible en este navegador.');return}setStatus('Buscando tu ubicación…');navigator.geolocation.getCurrentPosition(async(position)=>{renderMap({lat:Number(position.coords.latitude),lon:Number(position.coords.longitude)},'Mapa cerca de tu ubicación',false);updateTransitControlAvailability();try{const payload=await apiJson('/api/location/reverse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lat:position.coords.latitude,lon:position.coords.longitude})});const candidate=normalizeResolvedCandidate(payload.candidate);if(!candidate)throw new Error('invalid_reverse');state.origin=candidate;invalidateSuggestionOriginContext();state.locationGranted=true;originLabel.textContent=candidate.locality?.name?`Tu ubicación · ${candidate.locality.name}`:'Tu ubicación';$('#clear-location').hidden=false;$('#use-location').hidden=true;$('#manual-origin').hidden=true;$('#manual-origin').setAttribute('aria-expanded','false');originEditor.hidden=true;setStatus();await refreshTrainRadar();if(state.destination)await refreshMobilityComputation();else if(destinationInput.value.trim().length>=3)suggestDestinationQuery(destinationInput.value.trim(),'local')}catch{setStatus('No pudimos ubicarte ahora.','error')}},()=>setStatus('Podés elegir un origen manualmente.'),{enableHighAccuracy:false,timeout:8000,maximumAge:0})});
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
  return `<article class="option-row option-info mobility-bus" data-mode-card="bus" data-availability="${escapeHtml(option.availability_state||'partial')}"><div class="option-copy"><strong>Colectivo</strong><p>${escapeHtml(primary)}</p><div class="option-meta">${escapeHtml(frequent)}</div><div class="option-meta">Recorridos publicados: visibles en el mapa · Seguimiento GPS: sujeto a observaciones recientes</div><div class="option-meta">${escapeHtml(source)} · Fuente de recorridos: Municipalidad de Santa Fe</div></div><div class="mode-actions">${actions}</div></article>`;
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
  options.querySelectorAll('[data-route-mode]').forEach(button=>button.addEventListener('click',()=>{const option=state.mobilityComputation?.mode_options.find(item=>item.mode===button.dataset.routeMode&&item.selectable&&item.route_available);if(!option)return;state.selectedRouteMode=option.mode;renderOptions();renderRouteGeometry(option.route.geometry)}));
  options.querySelectorAll('[data-handoff-url]').forEach(button=>button.addEventListener('click',()=>openOfficialHandoff(button.dataset.handoffUrl,button.dataset.handoffLabel)));
}
function officialHandoffButtonLabel(label){const raw=String(label||'Fuente oficial').trim();if(/^Consultar\s+/i.test(raw))return `Abrir ${raw.replace(/^Consultar\s+/,'')}`;const lower=raw.charAt(0).toLocaleLowerCase('es-AR')+raw.slice(1);return `Abrir ${lower}`}
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
function renderRouteGeometry(geometry){
  if(!state.destination?.coordinates||geometry?.type!=='LineString'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2){renderMap(state.destination?.coordinates||{lat:0,lon:0});return}
  renderMap(state.destination.coordinates);
  syncTrackerOverlays();
}

// ---------- boot: vector-first map; raster is failure-only fallback ----------
function updateBusLineMeta(){
  const selected=busLinePicker.value;
  if(!selected){busLineMeta.textContent='Elegí una línea para ver recorrido y GPS en vivo';return}
  const live=state.gpsStatus==='live'&&Date.now()-state.gpsLastLiveAt<=20000;
  const status=live?'trazado publicado + GPS en vivo':state.gpsStatus==='no_current_positions'?'trazado publicado · sin posiciones GPS actuales':state.gpsStatus==='source_unavailable'?'trazado publicado · fuente GPS no disponible':'trazado publicado, GPS sin confirmar';
  busLineMeta.textContent=labelSantaFeLine(selected)+' · '+status;
}
busLinePicker.addEventListener('change',()=>{
  if(busLinePicker.value)localStorage.setItem('voy.sf.line',busLinePicker.value);else localStorage.removeItem('voy.sf.line');
  state.gpsStatus='not_integrated';state.gpsLastLiveAt=0;
  const selectedGps=trackerStore.selected();
  if(selectedGps&&!matchesSelectedGpsLine(selectedGps.entity.observation))trackerStore.clearSelection();
  state.busNetworkSelectedGeometries=busLinePicker.value
    ?geometriesForSantaFeLine(state.busNetwork?.routes,busLinePicker.value)
    :[];
  updateBusLineMeta();
  update3DGpsStatus();
  syncTrackerOverlays();sync3DTopology();
  // gpsStatus starts as not_integrated before the first worker response; the enabled flag is authoritative after a real response.
  if(busLinePicker.value&&sfGpsEnabled)pollSantaFeGps();
});
applyTransitContext({mode:transportModePicker?.value||'bus',initial:true});
busLinePicker.addEventListener('focus',loadSantaFeBusNetwork);
busLinePicker.addEventListener('pointerdown',loadSantaFeBusNetwork);
if(localStorage.getItem('voy.sf.line'))loadSantaFeBusNetwork();
setSheetSummary();
// Fail-closed native GPS polling; unconfigured deployments stop after the first response.
let sfGpsPolling=false,sfGpsEnabled=true;
async function pollSantaFeGps(){
  if(state.activeTransportMode!=='bus'||!hasSantaFeBusCoverage())return;
  if(!sfGpsEnabled||sfGpsPolling||state.fixtureOn||document.hidden||!String(busLinePicker.value||'').trim())return;
  const center=substrate.getCenter()||DEFAULT_MAP_CENTER;
  if(trainRadarDistanceMeters(center,DEFAULT_MAP_CENTER)>30000)return;
  const selectedLineAtRequest=String(busLinePicker.value||'').trim();
  if(!selectedLineAtRequest)return;
  sfGpsPolling=true;
  try{
    // Line filter (picker short_name): the worker polls that line's stops and
    // filters arrivals by the line code, so markers track the selected line only.
    const selectedLine=selectedLineAtRequest;
    const gpsUrl='/api/transit/santa-fe/vehicles?line='+encodeURIComponent(selectedLine);
    const response=await fetch(gpsUrl,{cache:'no-store',signal:AbortSignal.timeout(4500)});
    if(!response.ok)throw new Error('gps_gateway_unavailable');
    const payload=await response.json();
    if(String(busLinePicker.value||'').trim()!==selectedLine)return;
    if(payload?.status==='not_integrated'){sfGpsEnabled=false;state.gpsStatus='not_integrated'}
    else if(payload?.ok&&payload?.status==='live'&&Array.isArray(payload.observations)){
      state.gpsStatus='live';state.gpsLastLiveAt=Date.now();state.gpsSourceId=payload.source_id||state.gpsSourceId;
      for(const obs of payload.observations)trackerStore.ingest(obs);
    }else state.gpsStatus=payload?.status==='no_current_positions'?'no_current_positions':'source_unavailable';
    syncTrackerOverlays();sync3DTopology();update3DGpsStatus();updateTruthPill();setSheetSummary();updateBusLineMeta();
  }catch{
    if(String(busLinePicker.value||'').trim()===selectedLineAtRequest){
      state.gpsStatus='source_unavailable';update3DGpsStatus();updateTruthPill();updateBusLineMeta();setSheetSummary();
    }
  }finally{
    sfGpsPolling=false;
    const currentLine=String(busLinePicker.value||'').trim();
    if(sfGpsEnabled&&currentLine&&currentLine!==selectedLineAtRequest&&!document.hidden)
      setTimeout(()=>pollSantaFeGps(),0);
  }
}
setTimeout(()=>{if(busLinePicker.value)pollSantaFeGps()},600);
setInterval(pollSantaFeGps,15000);
updateTruthPill();
// Default to the reliable 2D map; urban 3D and its PMTiles stay lazy until explicit user selection.
activate2D();
void restoreGrantedLocation();
window.addEventListener('load',()=>{if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('/sw.js').catch(()=>{})});

// ---------- contextual assistant (inside sheet, unchanged behavior) ----------
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
function runAssistantAction(){const action=assistantAction.dataset.action;if(action==='location'){closeAssistant();$('#use-location').click();return}if(action==='national'){closeAssistant();nationalSearch.click();return}if(action==='options'){closeAssistant();openSheetPane('expanded');options.scrollIntoView({block:'start',behavior:'smooth'});return}if(action==='map'){closeAssistant();setSheetPane('collapsed');return}if(action==='decision'){closeAssistant();openSheetPane('expanded');decision.scrollIntoView({block:'start',behavior:'smooth'});return}closeAssistant();destinationInput.focus()}
assistantToggle.addEventListener('click',()=>{const opening=assistantPanel.hidden;assistantPanel.hidden=!opening;assistantToggle.setAttribute('aria-expanded',String(opening));if(opening)updateAssistant()});
assistantClose.addEventListener('click',closeAssistant);assistantAction.addEventListener('click',runAssistantAction);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!assistantPanel.hidden)closeAssistant();if(event.key==='Escape'&&state.sheetPane==='expanded'&&document.activeElement!==destinationInput&&!destinationInput.getAttribute('aria-expanded')?.includes('true'))setSheetPane('collapsed')});
updateAssistant();
