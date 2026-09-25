import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile, stat, mkdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import zlib from 'node:zlib';

const sourceDir=path.resolve(process.env.SOURCE_DIR||'source');
const ciDir=path.resolve(process.env.CI_DIR||process.cwd());
const outDir=path.resolve(process.env.EVIDENCE_DIR||path.join(ciDir,'order072-browser-evidence'));
const browserName=(process.env.BROWSER||'chrome').toLowerCase();
const TEST_SHA=process.env.TEST_SHA||'9233f11ff50b329e5f81a2268627d510bc7fb90c';
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:sourceDir,encoding:'utf8'}).trim();
if(head!==TEST_SHA)throw new Error(`exact_sha_mismatch:${head}`);
await mkdir(outDir,{recursive:true});

function executable(){
  const candidates=browserName==='edge'
    ? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe']
    : ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome','/usr/bin/chromium-browser','/usr/bin/chromium'];
  for(const p of candidates)if(existsSync(p))return p;
  if(browserName==='chrome'){
    for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
      try{return execFileSync('which',[cmd],{encoding:'utf8'}).trim()}catch{}
    }
  }
  throw new Error(`real_${browserName}_executable_not_found`);
}
const exe=executable();

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const root=path.join(sourceDir,'dist','client');
const server=createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    let rel=decodeURIComponent(u.pathname);
    if(rel==='/'||rel==='')rel='/index.html';
    const target=path.normalize(path.join(root,rel));
    if(!target.startsWith(path.normalize(root)))throw new Error('path_escape');
    const s=await stat(target);
    if(!s.isFile())throw new Error('not_file');
    const body=await readFile(target);
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
    res.end(body);
  }catch{res.writeHead(404,{'content-type':'text/plain'});res.end('not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const baseUrl=`http://127.0.0.1:${port}`;

const worker=await import(pathToFileURL(path.join(sourceDir,'src','worker.template.js')).href+`?evidence=${Date.now()}`);
const origin={label:'Bulevar Gálvez 1150',territory_verified:true,coordinates:{lat:-31.6412,lon:-60.7042},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};
const destination={label:'Puente Colgante',territory_verified:true,coordinates:{lat:-31.6219,lon:-60.6811},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};
const fixedNow=Date.parse('2026-09-25T03:30:00Z');
function routeResponse(distance){
  return new Response(JSON.stringify({code:'Ok',routes:[{distance,geometry:{type:'LineString',coordinates:[[-60.7042,-31.6412],[-60.692,-31.632],[-60.6811,-31.6219]]}}]}),{status:200,headers:{'content-type':'application/json'}});
}
async function routingFetch(url){
  const s=String(url);
  if(s.includes('/routed-foot/'))return routeResponse(3100);
  if(s.includes('/routed-bike/'))return routeResponse(3300);
  if(s.includes('/routed-car/'))return routeResponse(4100);
  throw new Error('unexpected_routing_url:'+s);
}
const computation=await worker.computeMobilityComputation({origin,destination},routingFetch,fixedNow,{});
const mobilityDecision=worker.buildMobilityDecision(destination,fixedNow);
const suggestion={display_primary:'Puente Colgante',display_secondary:'Santa Fe, Santa Fe',candidate_ref:'order072-puente-colgante',provider:'order072-fixture',coordinates:destination.coordinates,distance_meters:3500};

const transparentPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/2gV7WQAAAABJRU5ErkJggg==','base64');
function apiPayload(pathname){
  if(pathname==='/api/origin/resolve')return {ok:true,result_class:'resolved',candidates:[origin]};
  if(pathname==='/api/destinations/suggest')return {ok:true,suggestions:[suggestion],requires_national_expansion:false};
  if(pathname==='/api/destinations/resolve')return {ok:true,destination,mobility_decision:mobilityDecision};
  if(pathname==='/api/mobility/compute')return {ok:true,computation};
  if(pathname==='/api/radar/trains/nearby')return {ok:true,radar:{source_status:'unsupported',stations:[],source:null}};
  return {ok:false,error:'not_found'};
}
function gpuInitScript(){
  return `()=>{window.__voyGpuEvidence={draw_calls:0,triangles:0};const P=globalThis.WebGL2RenderingContext&&WebGL2RenderingContext.prototype;if(!P)return;const wrap=(name,tri)=>{const orig=P[name];if(typeof orig!=='function')return;P[name]=function(...args){window.__voyGpuEvidence.draw_calls++;try{window.__voyGpuEvidence.triangles+=Math.max(0,Math.floor(tri(...args)))}catch{}return orig.apply(this,args)}};wrap('drawElements',(mode,count)=>mode===4?count/3:0);wrap('drawArrays',(mode,first,count)=>mode===4?count/3:0);wrap('drawElementsInstanced',(mode,count,type,offset,instances)=>mode===4?(count/3)*instances:0);wrap('drawArraysInstanced',(mode,first,count,instances)=>mode===4?(count/3)*instances:0);}`;
}
async function installRoutes(page,requestLog){
  page.on('request',r=>requestLog.push({url:r.url(),method:r.method(),type:r.resourceType(),ts:Date.now()}));
  await page.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:transparentPng}));
  await page.route('**/api/**',async route=>{
    const u=new URL(route.request().url());
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(apiPayload(u.pathname))});
  });
}
function percentile(sorted,p){if(!sorted.length)return null;return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1))]}
function median(values){const s=[...values].sort((a,b)=>a-b);if(!s.length)return null;const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
async function interactionPerf(page){
  return page.evaluate(async()=>{
    const canvas=document.querySelector('.voy-3d-canvas');if(!canvas)throw new Error('3d_canvas_missing');
    const samples=[];let prev=performance.now();
    for(let i=0;i<120;i++){
      canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:i%2===0?1.5:-1.5,cancelable:true}));
      await new Promise(requestAnimationFrame);
      const now=performance.now();samples.push(now-prev);prev=now;
    }
    const sorted=[...samples].sort((a,b)=>a-b);
    const med=sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
    const p95=sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)];
    return {samples,median_fps:1000/med,frame_p95_ms:p95,heap_bytes:performance.memory?.usedJSHeapSize??null,gpu:window.__voyGpuEvidence||null};
  });
}
async function rawWebglControl(context,viewport){
  const page=await context.newPage();
  await page.setViewportSize(viewport);
  const result=await page.evaluate(async()=>{
    const t0=performance.now();const c=document.createElement('canvas');c.width=640;c.height=480;document.body.appendChild(c);const gl=c.getContext('webgl2');if(!gl)return {available:false};
    const vs=gl.createShader(gl.VERTEX_SHADER);gl.shaderSource(vs,'#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');gl.compileShader(vs);
    const fs=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(fs,'#version 300 es\nprecision mediump float;out vec4 o;void main(){o=vec4(.7,.8,.9,1.);}');gl.compileShader(fs);
    const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);gl.useProgram(pr);
    const loc=gl.getAttribLocation(pr,'p');const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
    const data=new Float32Array([-0.8,-0.8,-0.2,-0.8,-0.5,-0.2, 0,-0.7,.5,-.7,.25,-.1, -.1,.1,.4,.1,.15,.7, -.9,.85,.9,.85]);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const init_ms=performance.now()-t0;const samples=[];let prev=performance.now();
    for(let i=0;i<120;i++){gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,9);gl.drawArrays(gl.LINES,9,2);await new Promise(requestAnimationFrame);const now=performance.now();samples.push(now-prev);prev=now}
    const s=[...samples].sort((a,b)=>a-b),med=s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2,p95=s[Math.min(s.length-1,Math.ceil(s.length*.95)-1)];
    return {available:true,init_ms,median_fps:1000/med,frame_p95_ms:p95,heap_bytes:performance.memory?.usedJSHeapSize??null};
  });
  await page.close();return result;
}

const browser=await chromium.launch({executablePath:exe,headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const viewports=[{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}];
const summaries={browser:browserName,executable:exe,test_sha:TEST_SHA,viewports:{}};
try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,serviceWorkers:'block'});
    const page=await context.newPage();const requests=[];const errors=[];
    page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});
    page.on('pageerror',e=>errors.push('page:'+e.message));
    await page.addInitScript(gpuInitScript());
    await installRoutes(page,requests);
    await page.goto(baseUrl,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#map-shell');

    const baseline3d=requests.filter(r=>/\/(?:3d\/|vendor\/three)/.test(new URL(r.url).pathname));
    if(baseline3d.length)throw new Error(`${vp.name}:baseline_3d_fetches=${baseline3d.length}`);
    const mapMetric=await page.evaluate(()=>{
      const r=document.querySelector('#map-shell').getBoundingClientRect(),w=innerWidth,h=innerHeight;
      const visible=Math.max(0,Math.min(r.bottom,h)-Math.max(r.top,0));
      return {x:r.x,y:r.y,width:r.width,height:r.height,width_ratio:r.width/w,visible_height_ratio:visible/h,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    if(mapMetric.overflow)throw new Error(`${vp.name}:horizontal_overflow`);
    if(mapMetric.visible_height_ratio<(vp.name==='mobile'?.45:.55))throw new Error(`${vp.name}:map_not_above_fold:${mapMetric.visible_height_ratio}`);
    if(vp.name==='desktop'&&(mapMetric.width_ratio<.55||mapMetric.width_ratio>.80))throw new Error(`desktop:map_width_ratio:${mapMetric.width_ratio}`);

    await page.click('#manual-origin');await page.fill('#origin','Bulevar Gálvez 1150');await page.click('#resolve-origin');await page.waitForFunction(()=>document.querySelector('#origin-label')?.textContent.includes('Bulevar'));
    await page.fill('#destination','Puente Colgante');await page.waitForSelector('#destination-suggestions .suggestion',{timeout:5000});await page.click('#destination-suggestions .suggestion');
    await page.waitForSelector('body[data-view="resolved"]');
    await page.waitForFunction(()=>document.querySelectorAll('[data-mode-card]').length>=4);
    const trip=await page.evaluate(()=>({
      text:document.querySelector('#options').innerText,
      modes:[...document.querySelectorAll('[data-mode-card]')].map(x=>x.textContent),
      route:Boolean(document.querySelector('.route-overlay')),
      title:document.querySelector('#result-title')?.textContent,
      overflow:document.documentElement.scrollWidth>innerWidth
    }));
    for(const label of ['A pie','Bici','Auto','Colectivo'])if(!trip.text.includes(label))throw new Error(`${vp.name}:missing_mode:${label}`);
    for(const truth of ['Precio no disponible','Decreto 00048/2026','Cuándo pasa: no integrado'])if(!trip.text.includes(truth))throw new Error(`${vp.name}:missing_truth:${truth}`);
    if(!trip.route)throw new Error(`${vp.name}:route_overlay_missing`);
    if(trip.overflow)throw new Error(`${vp.name}:overflow_after_trip`);
    await page.screenshot({path:path.join(outDir,`${browserName}-${vp.name}-2d.png`),fullPage:false});

    const apiBefore=requests.filter(r=>new URL(r.url).pathname.startsWith('/api/')).length;
    await page.click('[data-map-mode="3d"]');
    await page.waitForSelector('.voy-3d-canvas',{timeout:10000});
    await page.waitForFunction(()=>document.querySelector('[data-map-mode="3d"]')?.getAttribute('aria-pressed')==='true');
    await page.waitForTimeout(500);
    const apiAfter=requests.filter(r=>new URL(r.url).pathname.startsWith('/api/')).length;
    if(apiAfter!==apiBefore)throw new Error(`${vp.name}:3d_added_dynamic_api_calls:${apiAfter-apiBefore}`);
    const first3d=requests.filter(r=>/\/(?:3d\/|vendor\/three)/.test(new URL(r.url).pathname));
    const topologyChunks=first3d.filter(r=>/\/3d\/topology\/chunk-.*\.json$/.test(new URL(r.url).pathname));
    if(topologyChunks.length!==1)throw new Error(`${vp.name}:initial_topology_chunks:${topologyChunks.length}`);
    if(!first3d.some(r=>/\/vendor\/three\.module\.js$/.test(new URL(r.url).pathname)))throw new Error(`${vp.name}:three_module_not_lazy_loaded`);
    const perf=await interactionPerf(page);
    await page.screenshot({path:path.join(outDir,`${browserName}-${vp.name}-3d.png`),fullPage:false});

    await page.click('[data-map-mode="2d"]');await page.waitForFunction(()=>document.querySelector('[data-map-mode="2d"]')?.getAttribute('aria-pressed')==='true');
    const preserved=await page.evaluate(()=>({title:document.querySelector('#result-title')?.textContent,modes:document.querySelector('#options')?.innerText}));
    if(preserved.title!=='Puente Colgante'||!preserved.modes.includes('Colectivo'))throw new Error(`${vp.name}:trip_state_not_preserved`);

    const touch=await page.evaluate(()=>[...document.querySelectorAll('[data-map-mode],#destination,#manual-origin,#clear-location')].filter(el=>!el.hidden&&getComputedStyle(el).display!=='none').map(el=>{const r=el.getBoundingClientRect();return {id:el.id||el.dataset.mapMode,w:r.width,h:r.height}}));
    if(vp.name==='mobile'&&touch.some(x=>x.w<44||x.h<44))throw new Error('mobile:touch_target_under_44:'+JSON.stringify(touch.filter(x=>x.w<44||x.h<44)));

    const fallbackPage=await context.newPage();const fallbackReq=[];await installRoutes(fallbackPage,fallbackReq);
    await fallbackPage.addInitScript(()=>{const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl2')return null;return orig.call(this,kind,...args)}});
    await fallbackPage.goto(baseUrl,{waitUntil:'domcontentloaded'});await fallbackPage.click('[data-map-mode="3d"]');
    await fallbackPage.waitForFunction(()=>document.querySelector('[data-map-mode="2d"]')?.getAttribute('aria-pressed')==='true');
    const fallbackStatus=await fallbackPage.locator('#map-3d-status').textContent();
    if(!/3D no disponible/.test(fallbackStatus||''))throw new Error(`${vp.name}:webgl2_fallback_status_missing`);
    await fallbackPage.close();

    const raw=await rawWebglControl(context,{width:vp.width,height:vp.height});
    summaries.viewports[vp.name]={map:mapMetric,trip,baseline_2d_3d_asset_fetches:baseline3d.length,extra_dynamic_worker_calls_3d:apiAfter-apiBefore,initial_3d_requests:first3d.map(r=>new URL(r.url).pathname),initial_chunks:topologyChunks.length,perf,raw_webgl_control:raw,touch_targets:touch,errors};
    await writeFile(path.join(outDir,`${browserName}-${vp.name}-requests.json`),JSON.stringify(requests,null,2)+'\n');
    await writeFile(path.join(outDir,`${browserName}-${vp.name}-console.json`),JSON.stringify(errors,null,2)+'\n');
    if(errors.length)throw new Error(`${vp.name}:browser_errors:${errors.join('|')}`);
    await context.close();
  }

  const files=['vendor/three.module.js','vendor/three.core.js','3d/voy3d.js','3d/temporal.js','3d/topology/manifest.json','3d/topology/chunk-santa-fe-centro-0.json'];
  const sizes={};let total=0;
  for(const rel of files){const b=await readFile(path.join(root,rel));const gz=zlib.gzipSync(b,{level:9}).length;sizes[rel]={raw_bytes:b.length,gzip_bytes:gz};total+=gz}
  summaries.compressed_sizes=sizes;summaries.initial_3d_transfer_gzip_bytes=total;
  await writeFile(path.join(outDir,`${browserName}-summary.json`),JSON.stringify(summaries,null,2)+'\n');
  console.log(JSON.stringify(summaries,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
