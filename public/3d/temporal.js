const VALID_STATES=new Set(['realtime','predicted','scheduled','unknown']);

function validObservation(value){
  return value&&typeof value==='object'&&VALID_STATES.has(value.temporal_state)&&Number.isFinite(Number(value.lat))&&Number.isFinite(Number(value.lon))&&typeof value.observed_at==='string'&&typeof value.id==='string'&&typeof value.source_id==='string';
}
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
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
    const d=(candidate.lon-point.lon)**2+(candidate.lat-point.lat)**2;
    if(d<bestD){bestD=d;best=candidate}
  }
  return best;
}

export function presentTransportEntity(previous,next,nowMs,{freshnessMs=20000,verifiedGeometry=null}={}){
  if(!validObservation(next))return {render:false,animated:false,reason:'invalid_observation'};
  const state=next.temporal_state;
  if(state==='unknown')return {render:false,animated:false,temporal_state:state,reason:'unknown_state'};
  if(state==='scheduled')return {render:false,animated:false,temporal_state:state,reason:'scheduled_no_vehicle'};
  if(state==='predicted')return {render:true,animated:false,temporal_state:state,position:{lat:Number(next.lat),lon:Number(next.lon)},source_observation:next};

  const nextAt=Date.parse(next.observed_at);
  if(!Number.isFinite(nextAt)||nowMs-nextAt>freshnessMs)return {render:false,animated:false,temporal_state:state,reason:'stale_observation'};
  if(!Array.isArray(verifiedGeometry)||verifiedGeometry.length<2)return {render:false,animated:false,temporal_state:state,reason:'verified_geometry_missing'};
  if(!validObservation(previous)||previous.temporal_state!=='realtime')return {render:false,animated:false,temporal_state:state,reason:'previous_realtime_observation_missing'};

  const prevAt=Date.parse(previous.observed_at);
  if(!Number.isFinite(prevAt)||nextAt<=prevAt)return {render:false,animated:false,temporal_state:state,reason:'invalid_observation_window'};
  const t=clamp((nowMs-prevAt)/(nextAt-prevAt),0,1);
  const raw={lat:Number(previous.lat)+(Number(next.lat)-Number(previous.lat))*t,lon:Number(previous.lon)+(Number(next.lon)-Number(previous.lon))*t};
  const snapped=snapToVerifiedGeometry(raw,verifiedGeometry);
  if(!snapped)return {render:false,animated:false,temporal_state:state,reason:'verified_geometry_missing'};
  return {render:true,animated:t>0&&t<1,temporal_state:state,position:snapped,source_observation:next,previous_source_observation:previous,interpolation_fraction:t};
}
