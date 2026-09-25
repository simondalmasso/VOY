const VALID_STATES=new Set(['realtime','predicted','scheduled','unknown']);

function validObservation(value){
  return value&&typeof value==='object'&&VALID_STATES.has(value.temporal_state)&&Number.isFinite(Number(value.lat))&&Number.isFinite(Number(value.lon))&&typeof value.observed_at==='string'&&typeof value.id==='string'&&typeof value.source_id==='string';
}
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function toRad(value){return Number(value)*Math.PI/180}
function distanceMeters(a,b){
  const lat1=toRad(a.lat),lat2=toRad(b.lat),dLat=lat2-lat1,dLon=toRad(b.lon)-toRad(a.lon);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*6371000*Math.asin(Math.min(1,Math.sqrt(h)));
}
function nearestPointOnSegment(point,a,b){
  const ax=Number(a[0]),ay=Number(a[1]),bx=Number(b[0]),by=Number(b[1]);
  const vx=bx-ax,vy=by-ay,wx=point.lon-ax,wy=point.lat-ay,den=vx*vx+vy*vy;
  const t=den>0?clamp((wx*vx+wy*vy)/den,0,1):0;
  return {lon:ax+vx*t,lat:ay+vy*t};
}
function snapToVerifiedGeometry(point,geometry){
  if(!Array.isArray(geometry)||geometry.length<2)return null;
  let best=null,bestD=Infinity;
  for(let i=1;i<geometry.length;i++){
    const candidate=nearestPointOnSegment(point,geometry[i-1],geometry[i]);
    const d=distanceMeters(point,candidate);
    if(d<bestD){bestD=d;best=candidate}
  }
  return best?{position:best,distance_m:bestD}:null;
}
function rendered(state,position,sourceObservation,extra={}){
  return {
    render:true,
    animated:false,
    temporal_state:state,
    visual_state:state,
    position,
    render_lat:Number(position.lat),
    render_lon:Number(position.lon),
    source_observation:sourceObservation,
    ...extra
  };
}

export function presentTransportEntity(previous,next,nowMs,{
  freshnessMs=20000,
  verifiedGeometry=null,
  maxSpeedMps=90,
  maxSnapMeters=60,
  reducedMotion=false
}={}){
  if(!validObservation(next))return {render:false,animated:false,reason:'invalid_observation'};
  const state=next.temporal_state;
  if(state==='unknown')return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'unknown_state'};
  if(state==='scheduled')return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'scheduled_no_vehicle'};
  if(state==='predicted'){
    const position={lat:Number(next.lat),lon:Number(next.lon)};
    return rendered(state,position,next);
  }

  const nextAt=Date.parse(next.observed_at);
  const freshnessAge=Number.isFinite(nextAt)?Math.max(0,nowMs-nextAt):Infinity;
  if(!Number.isFinite(nextAt)||freshnessAge>freshnessMs)return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'stale_observation',freshness_age_ms:freshnessAge};
  if(!Array.isArray(verifiedGeometry)||verifiedGeometry.length<2)return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'verified_geometry_missing',freshness_age_ms:freshnessAge};
  if(!validObservation(previous)||previous.temporal_state!=='realtime')return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'previous_realtime_observation_missing',freshness_age_ms:freshnessAge};

  const prevAt=Date.parse(previous.observed_at);
  if(!Number.isFinite(prevAt))return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'invalid_observation_window',freshness_age_ms:freshnessAge};
  if(nextAt<prevAt)return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'timestamp_regression',freshness_age_ms:freshnessAge};
  if(nextAt===prevAt)return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'invalid_observation_window',freshness_age_ms:freshnessAge};

  const observedDistance=distanceMeters({lat:Number(previous.lat),lon:Number(previous.lon)},{lat:Number(next.lat),lon:Number(next.lon)});
  const observedSpeed=observedDistance/((nextAt-prevAt)/1000);
  if(Number.isFinite(maxSpeedMps)&&maxSpeedMps>0&&observedSpeed>maxSpeedMps){
    return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'impossible_jump',freshness_age_ms:freshnessAge,observed_speed_mps:observedSpeed,observed_distance_m:observedDistance};
  }

  const t=reducedMotion?1:clamp((nowMs-prevAt)/(nextAt-prevAt),0,1);
  const raw=reducedMotion
    ? {lat:Number(next.lat),lon:Number(next.lon)}
    : {lat:Number(previous.lat)+(Number(next.lat)-Number(previous.lat))*t,lon:Number(previous.lon)+(Number(next.lon)-Number(previous.lon))*t};
  const snapped=snapToVerifiedGeometry(raw,verifiedGeometry);
  if(!snapped)return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'verified_geometry_missing',freshness_age_ms:freshnessAge};
  if(Number.isFinite(maxSnapMeters)&&maxSnapMeters>=0&&snapped.distance_m>maxSnapMeters){
    return {render:false,animated:false,temporal_state:state,visual_state:state,reason:'snap_out_of_bounds',freshness_age_ms:freshnessAge,snap_distance_m:snapped.distance_m};
  }

  return rendered(state,snapped.position,next,{
    animated:!reducedMotion&&t>0&&t<1,
    previous_source_observation:previous,
    interpolation_fraction:t,
    freshness_age_ms:freshnessAge,
    snap_distance_m:snapped.distance_m,
    observed_speed_mps:observedSpeed,
    observed_distance_m:observedDistance
  });
}
