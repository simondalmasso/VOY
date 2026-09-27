// ORDER-075 — deterministic development fixtures ONLY.
// Opt-in via ?fixture=realtime; every observation is synthetic_fixture=true.
// Production default remains truthful/no-live. Pure: no DOM/network/storage.

export const FIXTURE_QUERY_PARAM='fixture';
export const FIXTURE_VALUE='realtime';
export const FIXTURE_TICK_PARAM='fixtureTickMs';
export const FIXTURE_SOURCE_ID='voy-fixture-dev';
export const FIXTURE_LABEL='FIXTURE DEMO · no producción';
export const FIXTURE_DEFAULT_TICK_MS=6000;

export function fixtureEnabled(params){
  try{
    const search=params instanceof URLSearchParams?params:new URLSearchParams(String(params||''));
    return search.get(FIXTURE_QUERY_PARAM)===FIXTURE_VALUE;
  }catch{return false}
}

const SANTA_FE_CENTRO=Object.freeze({lat:-31.6520,lon:-60.7050});
function corridor(startLat,startLon,dLat,dLon,steps){
  const points=[];
  for(let i=0;i<=steps;i++)points.push([Number((startLon+dLon*i).toFixed(6)),Number((startLat+dLat*i).toFixed(6))]);
  return points;
}
const CORRIDOR_A=corridor(-31.6500,-60.7100,0.0004,0.0012,10);
const CORRIDOR_B=corridor(-31.6580,-60.7020,0.0005,-0.0009,10);
const CORRIDOR_C=corridor(-31.6440,-60.6990,0.0006,0.0008,10);
const CORRIDOR_D=corridor(-31.6560,-60.7120,0.0007,0.0003,10);
const CORRIDOR_E=corridor(-31.6480,-60.7160,0.0009,0.0011,12);
const CORRIDOR_F=corridor(-31.6530,-60.7080,0.0003,0.0009,10);
const CORRIDOR_G=corridor(-31.6470,-60.7010,0,0,2);

function corridorLengthMeters(points){
  let total=0;
  for(let i=1;i<points.length;i++){
    const dLat=(points[i][1]-points[i-1][1])*111320;
    const dLon=(points[i][0]-points[i-1][0])*111320*Math.cos(SANTA_FE_CENTRO.lat*Math.PI/180);
    total+=Math.sqrt(dLat*dLat+dLon*dLon);
  }
  return total;
}
function pointAlongCorridor(points,distanceMeters){
  const total=corridorLengthMeters(points),span=total*2;
  let d=((distanceMeters%span)+span)%span;
  if(d>total)d=span-d;
  for(let i=1;i<points.length;i++){
    const dLat=(points[i][1]-points[i-1][1])*111320;
    const dLon=(points[i][0]-points[i-1][0])*111320*Math.cos(SANTA_FE_CENTRO.lat*Math.PI/180);
    const seg=Math.sqrt(dLat*dLat+dLon*dLon);
    if(d<=seg||i===points.length-1){
      const t=seg>0?Math.min(1,d/seg):0;
      return{lat:points[i-1][1]+(points[i][1]-points[i-1][1])*t,lon:points[i-1][0]+(points[i][0]-points[i-1][0])*t};
    }
    d-=seg;
  }
  return{lat:points[0][1],lon:points[0][0]};
}

const FIXTURE_ENTITIES=Object.freeze([
  Object.freeze({id:'fix-bus-01',line:'15',mode:'bus',kind:'realtime',speedMps:9,corridor:CORRIDOR_A}),
  Object.freeze({id:'fix-bus-02',line:'15',mode:'bus',kind:'realtime',speedMps:11,corridor:CORRIDOR_B}),
  Object.freeze({id:'fix-bus-03',line:'12',mode:'bus',kind:'realtime',speedMps:8,corridor:CORRIDOR_C}),
  Object.freeze({id:'fix-bus-04',line:'12',mode:'bus',kind:'realtime',speedMps:12,corridor:CORRIDOR_D}),
  Object.freeze({id:'fix-train-07',line:'R',mode:'rail',kind:'realtime',speedMps:22,corridor:CORRIDOR_E}),
  Object.freeze({id:'fix-bus-05',line:'15',mode:'bus',kind:'realtime-stops',speedMps:10,corridor:CORRIDOR_F,stopAfterTicks:4}),
  Object.freeze({id:'fix-pred-01',line:'9',mode:'bus',kind:'predicted',speedMps:0,corridor:CORRIDOR_G}),
  Object.freeze({id:'fix-svc-01',line:'T',mode:'rail',kind:'scheduled',speedMps:0,station:Object.freeze({lat:-31.6420,lon:-60.7000}),scheduled_times:Object.freeze(['08:20','09:40','11:00','13:20','15:40','17:20','19:00'])})
]);
export const FIXTURE_ENTITY_COUNT=FIXTURE_ENTITIES.length;

function fixtureObservation(entity,tick,t0,tickMs){
  const observedAt=t0+tick*tickMs;
  const base={id:entity.id,source_id:FIXTURE_SOURCE_ID,temporal_state:entity.kind==='scheduled'?'scheduled':entity.kind==='predicted'?'predicted':'realtime',observed_at:new Date(observedAt).toISOString(),synthetic_fixture:true,line:entity.line,route_id:`${entity.id}-synthetic-route`,mode:entity.mode};
  if(entity.kind==='scheduled')return{...base,lat:entity.station.lat,lon:entity.station.lon,scheduled_times:[...entity.scheduled_times],next_stop:'Estación Fixture Norte'};
  const distance=tick*entity.speedMps*(tickMs/1000);
  const position=pointAlongCorridor(entity.corridor,distance);
  const stops=entity.kind==='predicted'?null:['Parada A','Parada B','Parada C'];
  const index=Math.floor(distance/200)%3;
  return{...base,lat:Number(position.lat.toFixed(6)),lon:Number(position.lon.toFixed(6)),verified_geometry:entity.corridor.map(pair=>[pair[0],pair[1]]),speed_mps:entity.speedMps,next_stop:entity.kind==='predicted'?undefined:stops[index]};
}

export function createFixtureEngine({push,now=()=>Date.now(),tickMs=FIXTURE_DEFAULT_TICK_MS}={}){
  if(typeof push!=='function')throw new Error('push_callback_required');
  let tick=0;const t0=now();let timer=null;
  function emit(){
    tick+=1;
    for(const entity of FIXTURE_ENTITIES){
      if(entity.kind==='realtime-stops'&&tick>entity.stopAfterTicks)continue;
      push(fixtureObservation(entity,tick,t0,tickMs));
    }
  }
  return{
    get tick(){return tick},
    get entityCount(){return FIXTURE_ENTITIES.length},
    step(count=1){for(let i=0;i<Math.abs(Number(count)||1);i++)emit();return tick},
    start(){if(timer)return timer;timer=setInterval(emit,Math.max(1000,Number(tickMs)||FIXTURE_DEFAULT_TICK_MS));return timer},
    stop(){if(timer){clearInterval(timer);timer=null}}
  };
}
export function fixtureEntityTable(){
  return FIXTURE_ENTITIES.map(entity=>({...entity,corridor:entity.corridor?entity.corridor.map(pair=>[pair[0],pair[1]]):null}));
}
