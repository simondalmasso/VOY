let THREE;
import {presentTransportEntity} from './temporal.js?v=__BUILD_ID__';

export const BUILD_ID='__BUILD_ID__';
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
function versionedUrl(input,base=location.href){const url=new URL(input,base);url.searchParams.set('v',BUILD_ID);return url}
function canUseWebGL2(){const probe=document.createElement('canvas');let context=null;try{context=probe.getContext('webgl2')}catch{}if(!context)return false;try{context.getExtension('WEBGL_lose_context')?.loseContext()}catch{}probe.width=0;probe.height=0;return true}
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
  const material=new THREE.MeshLambertMaterial({color:0xb8c4c8});
  const lod=new THREE.LOD();lod.frustumCulled=true;const near=new THREE.Mesh(full,material),far=new THREE.Mesh(coarse,material);near.frustumCulled=true;far.frustumCulled=true;lod.addLevel(near,0);lod.addLevel(far,240);group.add(lod);
  const roads=new THREE.LineSegments(roadGeometry(chunk.roads||[]),new THREE.LineBasicMaterial({color:0x70777c,transparent:true,opacity:.75}));roads.frustumCulled=true;group.add(roads);
  return group;
}
function installCameraControls(canvas,camera,render){let dragging=false,last=null,yaw=.78,pitch=.76,distance=800,target=new THREE.Vector3(0,0,0);const update=()=>{pitch=Math.max(.22,Math.min(1.32,pitch));distance=Math.max(70,Math.min(1800,distance));camera.position.set(target.x+Math.cos(yaw)*Math.sin(pitch)*distance,target.y+Math.cos(pitch)*distance,target.z+Math.sin(yaw)*Math.sin(pitch)*distance);camera.lookAt(target);render()};const down=e=>{dragging=true;last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)},move=e=>{if(!dragging)return;const dx=e.clientX-last[0],dy=e.clientY-last[1];last=[e.clientX,e.clientY];yaw-=dx*.006;pitch-=dy*.005;update()},up=()=>{dragging=false},wheel=e=>{e.preventDefault();distance*=Math.exp(e.deltaY*.001);update()};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});update();return{update,dispose(){canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel)}}}

export async function activateVoy3D({mount,onFallback=()=>{},routeGeometry:initialRoute=null,transport=[],quality='auto',reducedMotion=false}={}){
  if(!mount)throw new Error('mount_required');
  if(!canUseWebGL2())return fallbackTo2D(onFallback,'unsupported_webgl2');
  const {name:qualityName,profile}=resolveQualityProfile(quality);
  let canvas=null,renderer=null,scene=null,camera=null,ro=null,controls=null,routeLine=null,raf=0,disposed=false;
  const cache=new LruChunkCache();
  function cleanup(){
    if(disposed)return;
    disposed=true;
    try{ro?.disconnect?.()}catch{}
    try{controls?.dispose?.()}catch{}
    cancelAnimationFrame(raf);
    if(canvas)canvas.removeEventListener('webglcontextlost',handleContextLost);
    try{routeLine?.geometry?.dispose?.()}catch{}
    try{renderer?.dispose?.()}catch{}
    canvas?.remove();
    cache.clear();
  }
  function handleContextLost(event){event.preventDefault();cleanup();onFallback?.('webgl_context_lost')}
  try{
    THREE??=await import('/vendor/three.module.js?v=__BUILD_ID__');
    canvas=document.createElement('canvas');canvas.className='voy-3d-canvas';canvas.setAttribute('aria-label','Vista 3D suplementaria de Santa Fe');mount.appendChild(canvas);
    renderer=new THREE.WebGLRenderer({canvas,antialias:profile.antialias,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,profile.dpr,DPR_CAP));renderer.setClearColor(0x0d1114,1);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(48,1,.1,4000);
    scene.add(new THREE.HemisphereLight(0xe8f5ff,0x20272b,1.5));const key=new THREE.DirectionalLight(0xffffff,1.9);key.position.set(100,180,80);scene.add(key);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshLambertMaterial({color:0x171d20}));ground.rotation.x=-Math.PI/2;ground.position.y=-.05;ground.frustumCulled=true;scene.add(ground);
    const manifestUrl=versionedUrl('./3d/topology/manifest.json');
    const manifest=await fetch(manifestUrl,{cache:'force-cache'}).then(async r=>{if(!r.ok)throw new Error('topology_manifest_unavailable');try{return await r.json()}catch{throw new Error('topology_manifest_malformed')}});
    if(!Array.isArray(manifest.initial_chunks)||manifest.initial_chunks.length>INITIAL_CHUNK_LIMIT||manifest.initial_chunks.some(item=>typeof item?.url!=='string'))throw new Error('initial_chunk_budget_exceeded');
    const center={lon:-60.71,lat:-31.6555};
    for(const descriptor of manifest.initial_chunks){
      const url=new URL(descriptor.url,manifestUrl);url.searchParams.set('v',BUILD_ID);
      let chunk=cache.get(url.href);
      if(!chunk){
        chunk=await fetch(url,{cache:'force-cache'}).then(async r=>{if(!r.ok)throw new Error('topology_chunk_unavailable');try{return await r.json()}catch{throw new Error('topology_chunk_malformed')}});
        if(!chunk||typeof chunk!=='object'||!Array.isArray(chunk.buildings)||!Array.isArray(chunk.roads))throw new Error('topology_chunk_malformed');
        cache.set(url.href,chunk);
      }
      scene.add(buildChunkObject(chunk));
    }
    const vehicleGeometry=new THREE.BoxGeometry(3.2,2,1.6);
    const realtimeMaterial=new THREE.MeshBasicMaterial({color:0x36d7ff});
    const predictedMaterial=new THREE.MeshBasicMaterial({color:0xffb54a,transparent:true,opacity:.7});
    const realtimeVehicles=new THREE.InstancedMesh(vehicleGeometry,realtimeMaterial,64);
    const predictedVehicles=new THREE.InstancedMesh(vehicleGeometry,predictedMaterial,64);
    realtimeVehicles.count=0;predictedVehicles.count=0;realtimeVehicles.frustumCulled=true;predictedVehicles.frustumCulled=true;
    scene.add(realtimeVehicles,predictedVehicles);
    const routeMaterial=new THREE.LineBasicMaterial({color:0x00d7ff});
    function setRouteGeometry(geometry){
      if(routeLine){scene.remove(routeLine);routeLine.geometry.dispose();routeLine=null}
      const g=routeGeometry(geometry,center);
      if(g){routeLine=new THREE.LineSegments(g,routeMaterial);routeLine.name='voy-selected-route';routeLine.frustumCulled=true;scene.add(routeLine)}
      canvas.dataset.routeActive=String(Boolean(routeLine));scheduleRender();
    }
    function setTransportEntities(entries=[]){
      let realtimeCount=0,predictedCount=0;const matrix=new THREE.Matrix4(),project=llProjectFactory(center);
      for(const entry of entries){
        const presented=presentTransportEntity(entry.previous,entry.next,Date.now(),{freshnessMs:REALTIME_FRESHNESS_MS,maxSpeedMps:REALTIME_MAX_SPEED_MPS,maxSnapMeters:ROUTE_SNAP_MAX_METERS,reducedMotion:reducedMotion,verifiedGeometry:entry.verifiedGeometry});
        if(!presented.render||!['realtime','predicted'].includes(presented.temporal_state))continue;
        const [x,z]=project([presented.position.lon,presented.position.lat]);matrix.makeTranslation(x,2,-z);
        if(presented.visual_state==='predicted'){if(predictedCount>=64)continue;predictedVehicles.setMatrixAt(predictedCount,matrix);predictedCount++}
        else{if(realtimeCount>=64)continue;realtimeVehicles.setMatrixAt(realtimeCount,matrix);realtimeCount++}
      }
      realtimeVehicles.count=realtimeCount;predictedVehicles.count=predictedCount;realtimeVehicles.instanceMatrix.needsUpdate=true;predictedVehicles.instanceMatrix.needsUpdate=true;scheduleRender();
    }
    function resize(){const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
    function render(){if(disposed)return;resize();renderer.render(scene,camera);canvas.dataset.renderCalls=String(renderer.info.render.calls);canvas.dataset.renderTriangles=String(renderer.info.render.triangles);canvas.dataset.renderObjects=String(scene.children.length);canvas.dataset.quality=qualityName}
    function scheduleRender(){if(disposed)return;cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}
    canvas.addEventListener('webglcontextlost',handleContextLost);
    controls=installCameraControls(canvas,camera,scheduleRender);
    ro=new ResizeObserver(scheduleRender);ro.observe(mount);
    setRouteGeometry(initialRoute);setTransportEntities(transport);scheduleRender();
    function update({routeGeometry:nextRoute=null,transportEntities=[]}={}){setRouteGeometry(nextRoute);setTransportEntities(transportEntities)}
    return{ok:true,renderer:'THREE_LAZY',three_version:THREE_VERSION,build_id:BUILD_ID,quality:qualityName,quality_profile:profile,movement_policy:{maxSpeedMps:REALTIME_MAX_SPEED_MPS,maxSnapMeters:ROUTE_SNAP_MAX_METERS,reducedMotion:reducedMotion},draw_calls_design:{building_lod:1,roads:1,vehicle_instances:2},update,setRouteGeometry,setTransportEntities,setCenter(){controls.update()},dispose:cleanup};
  }catch(error){cleanup();return fallbackTo2D(onFallback,error?.message||'three_init_failed')}
}


// Public 3D recovery: keep a geographical basemap under the extrusions.
// The legacy bare Three scene stays available for isolated renderer contracts,
// but the public 3D action must use a map-projected urban view, not a blank grid.
export async function activateVoyUrbanMap3D({
  mount,onFallback=()=>{},routeGeometry:initialRoute=null,networkGeometries=[],
  transport=[],quality='auto',reducedMotion=false
}={}){
  if(!mount)throw new Error('mount_required');
  if(!canUseWebGL2())return fallbackTo2D(onFallback,'unsupported_webgl2');
  let map=null,disposed=false,ready=false,timeout=null;
  const safeLines=lines=>(Array.isArray(lines)?lines:[]).filter(line=>
    Array.isArray(line)&&line.length>=2&&line.every(pair=>
      Array.isArray(pair)&&pair.length===2&&pair.every(Number.isFinite)
    )
  );
  const routeData=line=>({type:'FeatureCollection',features:
    line?.type==='LineString'&&safeLines([line.coordinates]).length?
      [{type:'Feature',properties:{kind:'selected'},geometry:line}]:[]});
  const networkData=lines=>({type:'FeatureCollection',features:safeLines(lines)
    .slice(0,600).map((coordinates,i)=>({type:'Feature',
      properties:{index:i,temporal_state:'unknown'},
      geometry:{type:'LineString',coordinates}}))});
function install3DBusGlyph(map){
    if(map.hasImage('voy-3d-bus-glyph'))return;
    const canvas=document.createElement('canvas');canvas.width=48;canvas.height=72;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('bus_glyph_canvas_unavailable');
    ctx.clearRect(0,0,48,72);
    ctx.fillStyle='#101820';ctx.beginPath();ctx.roundRect(5,2,38,68,9);ctx.fill();
    ctx.fillStyle='#f5d32a';ctx.beginPath();ctx.roundRect(8,4,32,64,6);ctx.fill();
    ctx.fillStyle='#0b1518';ctx.beginPath();ctx.roundRect(12,12,24,17,3);ctx.fill();
    ctx.fillStyle='#8ed8ef';ctx.fillRect(14,14,20,13);
    ctx.fillStyle='#0b1518';ctx.beginPath();ctx.roundRect(12,34,24,17,3);ctx.fill();
    ctx.fillStyle='#c6edf7';ctx.fillRect(14,36,20,13);
    ctx.fillStyle='#101820';ctx.fillRect(2,15,6,12);ctx.fillRect(40,15,6,12);ctx.fillRect(2,45,6,12);ctx.fillRect(40,45,6,12);
    ctx.fillStyle='#f8fbff';ctx.fillRect(12,7,5,3);ctx.fillRect(31,7,5,3);
    ctx.fillStyle='#ef3e36';ctx.fillRect(12,62,5,3);ctx.fillRect(31,62,5,3);
    map.addImage('voy-3d-bus-glyph',canvas,{pixelRatio:2});
  }

  const transportData=entries=>({type:'FeatureCollection',features:
    (Array.isArray(entries)?entries:[]).slice(0,64).flatMap(entry=>{
      const reported=entry.next;
      const observedTime=Date.parse(reported?.observed_at||'');
      const pointOnly=reported?.observed_position_only===true&&reported?.temporal_state==='realtime'&&
        Number.isFinite(observedTime)&&Date.now()-observedTime>=-5000&&
        Date.now()-observedTime<=REALTIME_FRESHNESS_MS&&
        Number.isFinite(reported.lat)&&Number.isFinite(reported.lon);
      const presented=entry.displayFrame?.render&&entry.displayFrame?.position
        ?entry.displayFrame
        :pointOnly
          ?{render:true,temporal_state:'realtime',position:{lat:reported.lat,lon:reported.lon}}
          :presentTransportEntity(
        entry.previous,entry.next,Date.now(),
        {freshnessMs:REALTIME_FRESHNESS_MS,maxSpeedMps:REALTIME_MAX_SPEED_MPS,
         maxSnapMeters:ROUTE_SNAP_MAX_METERS,reducedMotion,
         verifiedGeometry:entry.verifiedGeometry}
      );
      return presented.render&&['realtime','predicted'].includes(presented.temporal_state)
       ?[{type:'Feature',properties:{temporal_state:presented.temporal_state,vehicle_type:String(reported?.source_id||'').includes('cuandopasa')?'bus':'unknown',bearing:Number.isFinite(presented.bearing)?presented.bearing:0,display_interpolated:presented.display_interpolated===true},
          geometry:{type:'Point',coordinates:[presented.position.lon,presented.position.lat]}}]
       :[];
    })});
  function cleanup(){
    if(disposed)return;
    disposed=true;clearTimeout(timeout);
    try{map?.remove()}catch{}
    mount.replaceChildren();
    for(const key of ['urban3d','buildingCount','mapBased','citywide3d','citywideBuildingCount','citywideDataset'])delete mount.dataset[key];
  }
  try{
    const manifest=await fetch(versionedUrl('/3d/topology/manifest.json'),{cache:'force-cache'})
      .then(r=>{if(!r.ok)throw new Error('3d_topology_manifest_unavailable');return r.json()});
    if(!Array.isArray(manifest.initial_chunks)||!manifest.initial_chunks.length||
       manifest.initial_chunks.length>INITIAL_CHUNK_LIMIT)throw new Error('3d_topology_manifest_invalid');
    const geometries=[];
    for(const descriptor of manifest.initial_chunks){
      if(typeof descriptor.url!=='string')throw new Error('3d_chunk_url_invalid');
      const chunkUrl=new URL(descriptor.url,versionedUrl('/3d/topology/manifest.json'));
      chunkUrl.searchParams.set('v',BUILD_ID);
      const chunk=await fetch(chunkUrl,{cache:'force-cache'}).then(r=>{
        if(!r.ok)throw new Error('3d_topology_chunk_unavailable');return r.json();
      });
      if(!Array.isArray(chunk.buildings)||!Number.isFinite(chunk.center?.lat)||
         !Number.isFinite(chunk.center?.lon))throw new Error('3d_topology_chunk_invalid');
      const center=chunk.center,cosLat=Math.cos(center.lat*Math.PI/180);
      for(const building of chunk.buildings.slice(0,1800)){
        const ring=building.footprint_m;
        if(!Array.isArray(ring)||ring.length<4)continue;
        const coordinates=ring.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))
          .map(([x,y])=>[center.lon+x/(111320*cosLat),center.lat+y/111320]);
        if(coordinates.length<4)continue;
        if(coordinates[0][0]!==coordinates.at(-1)[0]||coordinates[0][1]!==coordinates.at(-1)[1])
          coordinates.push([...coordinates[0]]);
        const height=Math.min(200,Math.max(3,Number(building.height_m)||9));
        geometries.push({type:'Feature',id:building.id,
          properties:{height,height_source:building.height_source||'inferred'},
          geometry:{type:'Polygon',coordinates:[coordinates]}});
      }
    }
    if(!geometries.length)throw new Error('3d_topology_no_buildings');
    // City-wide vector style includes building footprints and building-3d
    // extrusions; local curated geometry remains a detailed downtown overlay.
    if(!document.querySelector('link[data-voy-maplibre]')){
      const link=document.createElement('link');link.rel='stylesheet';
      link.href='/vendor/maplibre-gl.css?v=__BUILD_ID__';link.dataset.voyMaplibre='true';
      document.head.appendChild(link);
    }
    const maplibre=await import('/vendor/maplibre-gl.mjs?v=__BUILD_ID__');
    const MapLibreMap=maplibre.Map;
    if(disposed)return {ok:false,reason:'disposed'};
    const styleUrl='https://tiles.openfreemap.org/styles/liberty';
    const center=manifest?.initial_chunks?.[0]?.center||
      {lon:-60.7100,lat:-31.6555};
    const cameraCenter=Number.isFinite(center.lon)&&Number.isFinite(center.lat)
      ?[center.lon,center.lat]:[-60.7100,-31.6555];
    map=new MapLibreMap({
      container:mount,style:styleUrl,center:cameraCenter,zoom:14.6,pitch:60,bearing:-19,
      maxPitch:70,minZoom:11,maxZoom:19,interactive:true,
      attributionControl:{compact:true},preserveDrawingBuffer:false
    });
    const outcome=await new Promise(resolve=>{
      timeout=setTimeout(()=>resolve({ok:false,reason:'urban_map_timeout'}),12000);
      map.once('style.load',async()=>{
        try{
          // Load four content-addressed PMTiles shards of the Overture/OSM city dataset.
          // Heights are visual massing, not surveyed measurements.
          const dataset=await fetch(versionedUrl('/data/santa-fe-3d/manifest.json'),{cache:'force-cache'})
            .then(r=>{if(!r.ok)throw new Error('3d_city_manifest_unavailable');return r.json()});
          if(!Array.isArray(dataset.asset_paths)||dataset.asset_paths.length!==4||!Array.isArray(dataset.asset_bounds)||dataset.asset_bounds.length!==4||dataset.asset_min_zoom!==13||dataset.asset_max_zoom!==17||
             !Array.isArray(dataset.asset_sha256)||dataset.asset_sha256.length!==4||
             dataset.final_features!==264425||dataset.layer!=='santa_fe_buildings_3d'||dataset.asset_paths.some((path,i)=>typeof path!=='string'||typeof dataset.asset_sha256[i]!=='string'||!path.endsWith('.'+dataset.asset_sha256[i].slice(0,16)+'.pmtiles')))
            throw new Error('3d_city_manifest_invalid');
          const {addVoyPmtilesSources}=await import(versionedUrl('/3d/pmtiles-source.js'));
          const citySources=addVoyPmtilesSources(maplibre,dataset.asset_paths.map((path,i)=>({
            id:['north-east','north-west','south-east','south-west'][i],path,sha256:dataset.asset_sha256[i],bounds:dataset.asset_bounds[i]
          })));
          for(const citySource of citySources){
            map.addSource(citySource.id,{type:'vector',url:citySource.url,bounds:citySource.bounds,minzoom:dataset.asset_min_zoom,maxzoom:dataset.asset_max_zoom,attribution:citySource.attribution});
            map.addLayer({id:'voy-overture-extrusion-'+citySource.id,type:'fill-extrusion',
              source:citySource.id,'source-layer':dataset.layer,minzoom:11,
              paint:{
                'fill-extrusion-color':['match',['get','height_source'],
                  'explicit','#e7eee9','floors','#b7d0d5','estimated','#9db8c4','fallback','#82969f','#9aa8ad'],
                'fill-extrusion-height':['max',3,['min',120,['to-number',['get','height'],9]]],
                'fill-extrusion-base':['max',0,['min',80,['to-number',['get','min_height'],0]]],
                'fill-extrusion-opacity':0.88
              }});
          }

          // Add detailed local geometry over the city-wide vector extrusions.
          map.addSource('voy-3d-buildings',{type:'geojson',
            data:{type:'FeatureCollection',features:geometries}});
          map.addLayer({id:'voy-3d-buildings-extrusion',type:'fill-extrusion',
            source:'voy-3d-buildings',minzoom:13,
            paint:{
              'fill-extrusion-color':['case',['==',['get','height_source'],'osm_tag_height'],'#e7ecdf','#bcc9cb'],
              'fill-extrusion-height':['get','height'],
              'fill-extrusion-base':0,
              'fill-extrusion-opacity':0.86
            }});
          map.addSource('voy-3d-bus-network',{type:'geojson',data:networkData(networkGeometries)});
          map.addLayer({id:'voy-3d-bus-network-casing',type:'line',source:'voy-3d-bus-network',
            paint:{'line-color':'#10263f','line-width':6,'line-opacity':0.98}});
          map.addLayer({id:'voy-3d-bus-network-lines',type:'line',source:'voy-3d-bus-network',
            paint:{'line-color':'#267dff','line-width':3.2,'line-opacity':1}});
          map.addSource('voy-3d-selected-route',{type:'geojson',data:routeData(initialRoute)});
          map.addLayer({id:'voy-3d-selected-route-casing',type:'line',source:'voy-3d-selected-route',
            paint:{'line-color':'#10263f','line-width':10,'line-opacity':0.98}});
          map.addLayer({id:'voy-3d-selected-route-line',type:'line',source:'voy-3d-selected-route',
            paint:{'line-color':'#00d7ff','line-width':5.5,'line-opacity':1}});
          map.addSource('voy-3d-transport',{type:'geojson',data:transportData(transport)});
          install3DBusGlyph(map);
          map.addLayer({id:'voy-3d-transport-markers',type:'circle',source:'voy-3d-transport',
            filter:['!=',['get','vehicle_type'],'bus'],
            paint:{
              'circle-radius':5,'circle-stroke-width':1.5,'circle-stroke-color':'#0b1518',
              'circle-color':['match',['get','temporal_state'],
                'realtime','#36d7ff','predicted','#ffb54a','#aebdc2']
            }});
          map.addLayer({id:'voy-3d-transport-bus-icons',type:'symbol',source:'voy-3d-transport',
            filter:['==',['get','vehicle_type'],'bus'],
            layout:{'icon-image':'voy-3d-bus-glyph','icon-size':0.9,
              'icon-rotate':['to-number',['get','bearing'],0],
              'icon-rotation-alignment':'map','icon-pitch-alignment':'map',
              'icon-anchor':'center','icon-allow-overlap':true,'icon-ignore-placement':true},
            paint:{'icon-opacity':['match',['get','temporal_state'],'predicted',0.72,1]}});
          mount.dataset.urban3d='ready';
          mount.dataset.buildingCount=String(geometries.length);
          mount.dataset.mapBased='true';
          mount.dataset.citywide3d='ready';
          mount.dataset.citywideBuildingCount=String(dataset.final_features);
          mount.dataset.citywideDataset='overture-osm-2026-07-22';
          ready=true;resolve({ok:true,citywideBuildingCount:dataset.final_features});
        }catch(e){resolve({ok:false,reason:'urban_3d_layers_failed'})}
      });
      map.once('error',e=>{if(!ready&&String(e.error?.message||'').includes('style'))resolve({ok:false,reason:'urban_map_style_error'})});
    });
    clearTimeout(timeout);
    if(!outcome.ok){cleanup();return fallbackTo2D(onFallback,outcome.reason)}
    let displayedNetwork=networkGeometries;
    let displayedRouteType=initialRoute?.type||null;
    let displayedRouteCoordinates=initialRoute?.coordinates||null;
    let displayedTransportKey=JSON.stringify(transportData(transport).features);
    function update({routeGeometry:nextRoute=null,networkGeometries:nextNetwork=displayedNetwork,transportEntities=[]}={}){
      if(disposed)return;
      if(nextNetwork!==displayedNetwork){map.getSource('voy-3d-bus-network')?.setData(networkData(nextNetwork));displayedNetwork=nextNetwork}
      const nextRouteType=nextRoute?.type||null;
      const nextRouteCoordinates=nextRoute?.coordinates||null;
      if(nextRouteType!==displayedRouteType||nextRouteCoordinates!==displayedRouteCoordinates){
        map.getSource('voy-3d-selected-route')?.setData(routeData(nextRoute));
        displayedRouteType=nextRouteType;displayedRouteCoordinates=nextRouteCoordinates;
      }
      const nextTransport=transportData(transportEntities);
      const nextTransportKey=JSON.stringify(nextTransport.features);
      if(nextTransportKey!==displayedTransportKey){
        map.getSource('voy-3d-transport')?.setData(nextTransport);
        displayedTransportKey=nextTransportKey;
      }
    }
    return {ok:true,renderer:'MAPLIBRE_URBAN_3D',build_id:BUILD_ID,building_count:geometries.length,citywide_building_count:outcome.citywideBuildingCount,
      geographical_basemap:true,citywide_vector_buildings:true,route_layer:true,static_bus_network:true,
      update,dispose:cleanup,setCenter(coords){
        if(!coords||!Number.isFinite(coords.lon)||!Number.isFinite(coords.lat))return;
        map.easeTo({center:[coords.lon,coords.lat],duration:reducedMotion?0:350});
      }};
  }catch(e){cleanup();return fallbackTo2D(onFallback,e?.message||'urban_3d_failed')}
}
