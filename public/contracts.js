import { APP_CONFIG } from './runtime-config.js?v=__BUILD_ID__';

export const OFFICIAL_SANTA_FE_TRANSIT_URL = 'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/';
export const HANDOFF_ALLOWLIST = new Set(APP_CONFIG.OFFICIAL_HANDOFF_ALLOWLIST);

export function isSafeOfficialHandoff(url) {
  try {
    const parsed = new URL(url);
    return HANDOFF_ALLOWLIST.has(parsed.toString()) && parsed.search === '' && parsed.hash === '' && parsed.protocol === 'https:';
  } catch { return false; }
}

const EXTERNAL_NAVIGATION_MODES = new Set(['transit','walking','bicycling','driving']);
function navigationCoordinate(value) {
  const lat=Number(value?.lat), lon=Number(value?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return `${lat},${lon}`;
}
export function buildExternalNavigationUrl(destination,travelMode,origin=null) {
  const mode=String(travelMode??'').trim();
  const dest=navigationCoordinate(destination);
  if (!dest || !EXTERNAL_NAVIGATION_MODES.has(mode)) return null;
  const url=new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api','1');
  const originValue=navigationCoordinate(origin);
  if (originValue) url.searchParams.set('origin',originValue);
  url.searchParams.set('destination',dest);
  url.searchParams.set('travelmode',mode);
  return url.toString();
}
export function isSafeExternalNavigationUrl(url) {
  try {
    const parsed=new URL(url);
    if (parsed.protocol!=='https:' || parsed.hostname!=='www.google.com' || parsed.pathname!=='/maps/dir/' || parsed.hash) return false;
    const allowed=new Set(['api','origin','destination','travelmode']);
    for (const key of parsed.searchParams.keys()) if (!allowed.has(key)) return false;
    for (const key of allowed) if (parsed.searchParams.getAll(key).length>1) return false;
    if (parsed.searchParams.get('api')!=='1') return false;
    if (!EXTERNAL_NAVIGATION_MODES.has(parsed.searchParams.get('travelmode'))) return false;
    const parseCoord=(raw)=>{const parts=String(raw??'').split(',');if(parts.length!==2)return null;const lat=Number(parts[0]),lon=Number(parts[1]);return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180?{lat,lon}:null};
    if (!parseCoord(parsed.searchParams.get('destination'))) return false;
    const originRaw=parsed.searchParams.get('origin');
    if (originRaw!=null && !parseCoord(originRaw)) return false;
    return true;
  } catch { return false; }
}
export function normalizeResolvedCandidate(candidate, authoritativeTerritoryVerified) {
  if (!candidate || typeof candidate !== 'object') return null;
  const lat=Number(candidate.coordinates?.lat), lon=Number(candidate.coordinates?.lon);
  if (!candidate.label || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const territoryVerified=typeof authoritativeTerritoryVerified==='boolean'
    ? authoritativeTerritoryVerified
    : candidate.territory_verified===true;
  if (territoryVerified && (!candidate.province?.id || !candidate.province?.name || !candidate.locality?.name)) return null;
  return { ...candidate, territory_verified:territoryVerified, coordinates:{lat,lon} };
}


export function normalizeDestinationSuggestion(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  const primary=String(candidate.display_primary ?? '').trim();
  const secondary=String(candidate.display_secondary ?? '').trim();
  const ref=String(candidate.candidate_ref ?? '').trim();
  const provider=String(candidate.provider ?? '').trim();
  const lat=Number(candidate.coordinates?.lat), lon=Number(candidate.coordinates?.lon);
  if (!primary || !ref || !provider || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const distance=Number(candidate.distance_meters);
  return {...candidate,display_primary:primary,display_secondary:secondary,candidate_ref:ref,provider,coordinates:{lat,lon},distance_meters:Number.isFinite(distance)?distance:null};
}

export function normalizeMobilityDecision(decision) {
  if (!decision || typeof decision !== 'object') return null;
  const states=new Set(['available','handoff','unavailable','unknown']);
  const sourceClasses=new Set(['realtime','scheduled','handoff','unknown']);
  if (!states.has(decision.state) || !sourceClasses.has(decision.source_class)) return null;
  if (!decision.destination || typeof decision.destination !== 'object') return null;
  const integrationSlug=decision.integration_slug==null?null:String(decision.integration_slug).trim();
  if (decision.integration_slug!=null && !integrationSlug) return null;
  const coverage=String(decision.coverage??'').trim();
  if (!coverage) return null;
  if (!Array.isArray(decision.available_modes) || !Array.isArray(decision.provenance) || !Array.isArray(decision.facts) || !Array.isArray(decision.handoffs) || !Array.isArray(decision.next_actions)) return null;
  if (!decision.freshness || typeof decision.freshness !== 'object') return null;
  return {
    ...decision,
    integration_slug:integrationSlug,
    coverage,
    available_modes:[...decision.available_modes],
    provenance:[...decision.provenance],
    facts:[...decision.facts],
    handoffs:[...decision.handoffs],
    next_actions:[...decision.next_actions]
  };
}


export function normalizeMobilityComputation(computation) {
  if (!computation || typeof computation !== 'object' || computation.server_authoritative !== true) return null;
  if (!computation.destination || !computation.origin || !Array.isArray(computation.mode_options)) return null;
  const availabilityStates=new Set(['available','partial','unavailable']);
  const priceStates=new Set(['known','unknown','not_applicable']);
  const options=[];
  for (const raw of computation.mode_options) {
    if (!raw || typeof raw !== 'object' || !raw.mode) continue;
    const option={
      ...raw,
      mode:String(raw.mode),
      selectable:raw.selectable===true,
      route_available:raw.route_available===true,
      availability_state:availabilityStates.has(raw.availability_state)?raw.availability_state:(raw.selectable===true?'available':'unavailable'),
      price_state:priceStates.has(raw.price_state)?raw.price_state:(raw.price?.amount!=null?'known':'unknown')
    };
    if (option.selectable || option.route_available) {
      const coords=option.route?.geometry?.coordinates;
      const distance=Number(option.distance_m);
      if (option.route?.geometry?.type!=='LineString' || !Array.isArray(coords) || coords.length<2 || !coords.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1])))) return null;
      if (!Number.isFinite(distance) || distance<=0) return null;
      option.distance_m=distance;
    }
    if (option.price_state==='known' && option.price!=null) {
      const amount=Number(option.price?.amount);
      if (option.price?.currency!=='ARS' || !Number.isFinite(amount)) return null;
      option.price={...option.price,amount};
    }
    if (option.price_state==='unknown' && option.mode==='auto') option.price=null;
    options.push(option);
  }
  return {...computation,mode_options:options,selectable_modes:options.filter(o=>o.selectable).map(o=>o.mode),info_actions:Array.isArray(computation.info_actions)?[...computation.info_actions]:[],provenance:Array.isArray(computation.provenance)?[...computation.provenance]:[]};
}
