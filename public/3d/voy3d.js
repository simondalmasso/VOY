import * as THREE from '/vendor/three.module.js';
import {presentTransportEntity} from './temporal.js';

export const THREE_VERSION='0.186.0';
export const DPR_CAP=1.5;
export const LRU_MAX=16;
const INITIAL_CHUNK_LIMIT=8;
const REALTIME_FRESHNESS_MS=20000;
const REALTIME_MAX_SPEED_MPS=45;
const ROUTE_SNAP_MAX_METERS=35;
export const QUALITY_PROFILES=Object.freeze({
  auto:Object.freeze({dpr:1.25,antialias:true}),
  performance:Object.freeze({dpr:1,antialias:false}),
  quality:Object.freeze({dpr:DPR_CAP,antialias:true})
});

class LruChunkCache{
  constructor(max=LRU_MAX){this.max=max;this.map=new Map()}
  get(key){const value=this.map.get(key);if(!value)return null;this.map.delete(key);this.map.set(key,value);return value}
  set(key,value){this.map.delete(key);this.map.set(key,value);while(this.map.size>this.max)this.map.delete(this.map.keys().next().value)}
  clear(){this.map.clear()}
}
function fallbackTo2D(onFallback,reason='unsupported_webgl2'){onFallback?.(reason);return {ok:false,reason}}
function canUseWebGL2(){const probe=document.createElement('canvas');return Boolean(probe.getContext('webgl2'))}
function llProjectFactory(center){const latM=111320,lonM=111320*Math.cos(Number(center.lat)*Math.PI/180);return ([lon,lat])=>[(Number(lon)-Number(center.lon))*lonM,(Number(lat)-Number(center.lat))*latM]}
function resolveQualityProfile(requested='auto'){
  if(requested==='performance'||requested==='quality')return {name:requested,profile:QUALITY_PROFILES[requested]};
  const cores=Number(navigator.hardwareConcurrency)||4,deviceMemory=Number(navigator.deviceMemory)||4;
  const conservative=cores<=4||deviceMemory<=4||window.innerWidth<700;
  return {name:'auto',profile:conservative?QUALITY_PROFILES.performance:QUALITY_PROFILES.quality};
}
function shapeGeometry(buildings){
  const positions=[],indices=[];let base=0;
  for(const building of buildings){
    const ring=building.footprint_m||[];if(ring.length<4)continue;
    const clean=(ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1])?ring.slice(0,-1):ring.slice();
    const points=clean.map(([x,y])=>new THREE.Vector2(x,y));const faces=THREE.ShapeUtils.triangulateShape(points,[]);const h=Number(building.height_m)||9;
    for(const [x,y] of clean){positions.push(x,0,-y);positions.push(x,h,-y)}
    for(const face of faces){indices.push(base+face[0]*2+1,base+face[1]*2+1,base+face[2]*2+1)}
    for(let i=0;i<clean.length;i++){const j=(i+1)%clean.length,a=base+i*2,b=base+j*2;indices.push(a,b,a+1,b,b+1,a+1)}
    base+=clean.length*2;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function roadGeometry(roads){const positions=[];for(const road of roads){const line=road.line_m||[];for(let i=1;i<line.length;i++){positions.push(line[i-1][0],0.12,-line[i-1][1],line[i][0],0.12,-line[i][1])}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g}
function routeGeometry(line,center){if(line?.type!=='LineString'||!Array.isArray(line.coordinates)||line.coordinates.length<2)return null;const project=llProjectFactory(center),positions=[];for(let i=1;i<line.coordinates.length;i++){const a=project(line.coordinates[i-1]),b=project(line.coordinates[i]);positions.push(a[0],1,-a[1],b[0],1,-b[1])}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g}
function buildChunkObject(chunk){
  const group=new THREE.Group();group.name=chunk.id;group.frustumCulled=true;
  const full=shapeGeometry(chunk.buildings||[]),coarse=shapeGeometry((chunk.buildings||[]).filter((_,i)=>i%2===0));
  const material=new THREE.MeshLambertMaterial({color:0xb8c4c8,transparent:true,opacity:.78});
  const lod=new THREE.LOD();lod.frustumCulled=true;const near=new THREE.Mesh(full,material),far=new THREE.Mesh(coarse,material);near.frustumCulled=true;far.frustumCulled=true;lod.addLevel(near,0);lod.addLevel(far,240);group.add(lod);
  const roads=new THREE.LineSegments(roadGeometry(chunk.roads||[]),new THREE.LineBasicMaterial({color:0x70777c,transparent:true,opacity:.75}));roads.frustumCulled=true;group.add(roads);
  return group;
}
function installCameraControls(canvas,camera,render){let dragging=false,last=null,yaw=.78,pitch=.76,distance=250,target=new THREE.Vector3(0,0,0);const update=()=>{pitch=Math.max(.22,Math.min(1.32,pitch));distance=Math.max(70,Math.min(620,distance));camera.position.set(target.x+Math.cos(yaw)*Math.sin(pitch)*distance,target.y+Math.cos(pitch)*distance,target.z+Math.sin(yaw)*Math.sin(pitch)*distance);camera.lookAt(target);render()};canvas.addEventListener('pointerdown',e=>{dragging=true;last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-last[0],dy=e.clientY-last[1];last=[e.clientX,e.clientY];yaw-=dx*.006;pitch-=dy*.005;update()});canvas.addEventListener('pointerup',()=>{dragging=false});canvas.addEventListener('wheel',e=>{e.preventDefault();distance*=Math.exp(e.deltaY*.001);update()},{passive:false});update();return{update}}

export async function activateVoy3D({mount,onFallback=()=>{},routeGeometry:initialRoute=null,transport=[],quality='auto',reducedMotion=false}={}){
  if(!mount)throw new Error('mount_required');
  if(!canUseWebGL2())return fallbackTo2D(onFallback,'unsupported_webgl2');
  const {name:qualityName,profile}=resolveQualityProfile(quality);
  const canvas=document.createElement('canvas');canvas.className='voy-3d-canvas';canvas.setAttribute('aria-label','Vista 3D suplementaria de Santa Fe');mount.appendChild(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:profile.antialias,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,profile.dpr,DPR_CAP));renderer.setClearColor(0x0d1114,1);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.1,2000),cache=new LruChunkCache();
  scene.add(new THREE.HemisphereLight(0xe8f5ff,0x20272b,1.5));const key=new THREE.DirectionalLight(0xffffff,1.9);key.position.set(100,180,80);scene.add(key);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshLambertMaterial({color:0x171d20}));ground.rotation.x=-Math.PI/2;ground.position.y=-.05;ground.frustumCulled=true;scene.add(ground);
  const manifest=await fetch('./3d/topology/manifest.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('topology_manifest_unavailable');return r.json()});
  if(!Array.isArray(manifest.initial_chunks)||manifest.initial_chunks.length>INITIAL_CHUNK_LIMIT)throw new Error('initial_chunk_budget_exceeded');
  const center={lon:-60.71,lat:-31.6555};
  for(const descriptor of manifest.initial_chunks){const url=new URL(descriptor.url,new URL('./3d/topology/manifest.json',location.href));let chunk=cache.get(url.href);if(!chunk){chunk=await fetch(url,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('topology_chunk_unavailable');return r.json()});cache.set(url.href,chunk)}scene.add(buildChunkObject(chunk))}

  const vehicleGeometry=new THREE.BoxGeometry(3.2,2,1.6);
  const realtimeMaterial=new THREE.MeshBasicMaterial({color:0x36d7ff});
  const predictedMaterial=new THREE.MeshBasicMaterial({color:0xffb54a,transparent:true,opacity:.7});
  const realtimeVehicles=new THREE.InstancedMesh(vehicleGeometry,realtimeMaterial,64);
  const predictedVehicles=new THREE.InstancedMesh(vehicleGeometry,predictedMaterial,64);
  realtimeVehicles.count=0;predictedVehicles.count=0;realtimeVehicles.frustumCulled=true;predictedVehicles.frustumCulled=true;
  scene.add(realtimeVehicles,predictedVehicles);

  let routeLine=null;const routeMaterial=new THREE.LineBasicMaterial({color:0xffd23f});
  function setRouteGeometry(geometry){if(routeLine){scene.remove(routeLine);routeLine.geometry.dispose();routeLine=null}const g=routeGeometry(geometry,center);if(g){routeLine=new THREE.LineSegments(g,routeMaterial);routeLine.frustumCulled=true;scene.add(routeLine)}scheduleRender()}
  function setTransportEntities(entries=[]){
    let realtimeCount=0,predictedCount=0;const matrix=new THREE.Matrix4(),project=llProjectFactory(center);
    for(const entry of entries){
      const presented=presentTransportEntity(entry.previous,entry.next,Date.now(),{
        freshnessMs:REALTIME_FRESHNESS_MS,
        maxSpeedMps:REALTIME_MAX_SPEED_MPS,
        maxSnapMeters:ROUTE_SNAP_MAX_METERS,
        reducedMotion,
        verifiedGeometry:entry.verifiedGeometry
      });
      if(!presented.render||!['realtime','predicted'].includes(presented.temporal_state))continue;
      const [x,z]=project([presented.position.lon,presented.position.lat]);matrix.makeTranslation(x,2,-z);
      if(presented.visual_state==='predicted'){
        if(predictedCount>=64)continue;
        predictedVehicles.setMatrixAt(predictedCount,matrix);predictedCount++;
      }else{
        if(realtimeCount>=64)continue;
        realtimeVehicles.setMatrixAt(realtimeCount,matrix);realtimeCount++;
      }
    }
    realtimeVehicles.count=realtimeCount;predictedVehicles.count=predictedCount;
    realtimeVehicles.instanceMatrix.needsUpdate=true;predictedVehicles.instanceMatrix.needsUpdate=true;scheduleRender();
  }
  function resize(){const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
  let raf=0;function render(){resize();renderer.render(scene,camera)}function scheduleRender(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}
  const controls=installCameraControls(canvas,camera,scheduleRender);const ro=new ResizeObserver(scheduleRender);ro.observe(mount);setRouteGeometry(initialRoute);setTransportEntities(transport);scheduleRender();
  function update({routeGeometry:nextRoute=null,transportEntities=[]}={}){setRouteGeometry(nextRoute);setTransportEntities(transportEntities)}
  return{
    ok:true,renderer:'THREE_LAZY',three_version:THREE_VERSION,quality:qualityName,quality_profile:profile,
    movement_policy:{maxSpeedMps:REALTIME_MAX_SPEED_MPS,maxSnapMeters:ROUTE_SNAP_MAX_METERS,reducedMotion},
    draw_calls_design:{building_lod:1,roads:1,vehicle_instances:2},
    update,setRouteGeometry,setTransportEntities,setCenter(){controls.update()},
    dispose(){ro.disconnect();cancelAnimationFrame(raf);renderer.dispose();canvas.remove();cache.clear();}
  };
}
