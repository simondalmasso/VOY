import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const sourceDir=path.resolve(process.env.SOURCE_DIR||process.cwd());
const require=createRequire(path.join(sourceDir,'package.json'));
const {chromium}=require('playwright-core');
const outDir=path.resolve(process.env.EVIDENCE_DIR||path.join(sourceDir,'.order074-evidence'));
const TEST_SHA=process.env.TEST_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:sourceDir,encoding:'utf8'}).trim();
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:sourceDir,encoding:'utf8'}).trim();
assert.equal(head,TEST_SHA,'exact_sha_mismatch');
await mkdir(outDir,{recursive:true});

function executable(){
  for(const p of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome','/usr/bin/chromium-browser','/usr/bin/chromium'])if(existsSync(p))return p;
  for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){try{return execFileSync('which',[cmd],{encoding:'utf8'}).trim()}catch{}}
  throw new Error('real_chrome_executable_not_found');
}
const exe=executable();
const buildManifest=JSON.parse(await readFile(path.join(sourceDir,'dist','BUILD_MANIFEST.json'),'utf8'));
assert.equal(buildManifest.source_commit,TEST_SHA,'built_source_commit_mismatch');
const buildId=buildManifest.build_id;
assert.ok(buildId&&buildId.length>=8,'build_id_missing');

const worker=await import(pathToFileURL(path.join(sourceDir,'src','worker.template.js')).href+`?order074=${Date.now()}`);
const origin={label:'Bulevar Gálvez 1150',territory_verified:true,coordinates:{lat:-31.6412,lon:-60.7042},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};
const destination={label:'Puente Colgante',territory_verified:true,coordinates:{lat:-31.6219,lon:-60.6811},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};
const fixedNow=Date.parse('2026-09-25T03:30:00Z');
function routeResponse(distance){return new Response(JSON.stringify({code:'Ok',routes:[{distance,geometry:{type:'LineString',coordinates:[[-60.7042,-31.6412],[-60.692,-31.632],[-60.6811,-31.6219]]}}]}),{status:200,headers:{'content-type':'application/json'}})}
async function routingFetch(url){const s=String(url);if(s.includes('/routed-foot/'))return routeResponse(3100);if(s.includes('/routed-bike/'))return routeResponse(3300);if(s.includes('/routed-car/'))return routeResponse(4100);throw new Error('unexpected_routing_url:'+s)}
const computation=await worker.computeMobilityComputation({origin,destination},routingFetch,fixedNow,{});
const mobilityDecision=worker.buildMobilityDecision(destination,fixedNow);
const suggestion={display_primary:'Puente Colgante',display_secondary:'Santa Fe, Santa Fe',candidate_ref:'order074-puente-colgante',provider:'order074-fixture',coordinates:destination.coordinates,distance_meters:3500};
function apiPayload(p){
  if(p==='/api/origin/resolve')return {ok:true,result_class:'resolved',candidates:[origin]};
  if(p==='/api/destinations/suggest')return {ok:true,suggestions:[suggestion],requires_national_expansion:false};
  if(p==='/api/destinations/resolve')return {ok:true,destination,mobility_decision:mobilityDecision};
  if(p==='/api/mobility/compute')return {ok:true,computation};
  if(p==='/api/radar/trains/nearby')return {ok:true,radar:{source_status:'unsupported',stations:[],source:null}};
  return {ok:false,error:'not_found'};
}

const requestLog=[];
const faults={moduleOnce:0,manifest:null,chunk:null,navigationDrop:false};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const root=path.resolve(sourceDir,'dist','client');
const server=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  requestLog.push({method:req.method,path:u.pathname,search:u.search,ts:Date.now()});
  try{
    if(u.pathname.startsWith('/api/')){const body=JSON.stringify(apiPayload(u.pathname));res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(body);return}
    if(u.pathname==='/'&&u.searchParams.get('offline')==='1'&&faults.navigationDrop){req.socket.destroy();return}
    if(u.pathname==='/3d/voy3d.js'&&faults.moduleOnce>0){faults.moduleOnce-=1;res.writeHead(503,{'content-type':'text/plain','cache-control':'no-store'});res.end('order074_module_once');return}
    if(u.pathname==='/3d/topology/manifest.json'&&faults.manifest==='malformed'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end('{');return}
    if(u.pathname.startsWith('/3d/topology/chunk-')&&faults.chunk==='missing'){res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:'order074_chunk_missing'}));return}
    if(u.pathname.startsWith('/3d/topology/chunk-')&&faults.chunk==='malformed'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end('{}');return}
    let rel=decodeURIComponent(u.pathname);if(rel==='/'||rel==='')rel='/index.html';
    const target=path.resolve(root,'.'+rel);if(!target.startsWith(root+path.sep)&&target!==root)throw new Error('path_escape');
    const s=await stat(target);if(!s.isFile())throw new Error('not_file');
    const body=await readFile(target);res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
  }catch{res.writeHead(404,{'content-type':'text/plain','cache-control':'no-store'});res.end('not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port,baseUrl=`http://127.0.0.1:${port}`;
const transparentPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/2gV7WQAAAABJRU5ErkJggg==','base64');

const browser=await chromium.launch({executablePath:exe,headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const evidence={test_sha:TEST_SHA,build_id:buildId,chrome_executable:exe,checks:{},requests:{}};

function resetFaults(){faults.moduleOnce=0;faults.manifest=null;faults.chunk=null;faults.navigationDrop=false}
async function freshContext({viewport={width:1440,height:900},reducedMotion='no-preference',initScript=null}={}){
  resetFaults();
  const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'allow',reducedMotion});
  await context.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:transparentPng}));
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push('page:'+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});
  if(initScript)await page.addInitScript(initScript);
  const start=requestLog.length;
  await page.goto(baseUrl,{waitUntil:'load'});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  if(!await page.evaluate(()=>Boolean(navigator.serviceWorker.controller))){
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  }
  return {context,page,start,errors};
}
async function prepareTrip(page){
  await page.click('#manual-origin');await page.fill('#origin','Bulevar Gálvez 1150');await page.click('#resolve-origin');
  await page.waitForFunction(()=>document.querySelector('#origin-label')?.textContent.includes('Bulevar'));
  await page.fill('#destination','Puente Colgante');await page.waitForSelector('#destination-suggestions .suggestion',{timeout:5000});await page.click('#destination-suggestions .suggestion');
  await page.waitForSelector('body[data-view="resolved"]');await page.waitForFunction(()=>document.querySelectorAll('[data-mode-card]').length>=4);
  await page.waitForFunction(()=>Boolean(document.querySelector('.route-overlay')));
}
function segment(start){return requestLog.slice(start)}
function lazyRequests(rows){return rows.filter(r=>/^\/(?:3d\/|vendor\/three)/.test(r.path))}
function countPath(rows,p){return rows.filter(r=>r.path===p).length}
async function activate3D(page){
  await page.click('[data-map-mode="3d"]');
  await page.waitForFunction(()=>document.querySelector('[data-map-mode="3d"]')?.getAttribute('aria-pressed')==='true'&&Boolean(document.querySelector('.voy-3d-canvas')),{timeout:10000});
}
async function assertFallback(page){
  await page.waitForFunction(()=>document.querySelector('[data-map-mode="2d"]')?.getAttribute('aria-pressed')==='true'&&!document.querySelector('.voy-3d-canvas')&&/3D no disponible/.test(document.querySelector('#map-3d-status')?.textContent||''),{timeout:10000});
  assert.match(await page.locator('#map-3d-status').textContent(),/3D no disponible/);
  assert.equal(await page.locator('#result-title').textContent(),'Puente Colgante');
}
async function tabTo(page,selector,max=90){
  for(let i=0;i<max;i++){
    await page.keyboard.press('Tab');
    if(await page.evaluate(sel=>document.activeElement?.matches?.(sel)===true,selector))return i+1;
  }
  throw new Error('keyboard_target_not_reached:'+selector);
}
async function focusEvidence(page){
  return page.evaluate(()=>{const el=document.activeElement,cs=getComputedStyle(el);return {tag:el?.tagName,id:el?.id||'',outline_style:cs.outlineStyle,outline_width:cs.outlineWidth,box_shadow:cs.boxShadow,visible:Boolean(el&&el.getClientRects().length),label:el?.getAttribute?.('aria-label')||el?.textContent?.trim().slice(0,40)||''}})
}
async function zoomStress(viewport){
  const {context,page,start}=await freshContext({viewport});
  try{
    await prepareTrip(page);
    const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
    await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
    await page.waitForTimeout(120);
    const m=await page.evaluate(()=>{
      const sels=['#destination','[data-map-mode="2d"]','[data-map-mode="3d"]','#map-3d-quality','[data-route-mode]'];
      const items=sels.map(sel=>{const el=document.querySelector(sel);if(!el)return {sel,missing:true};const r=el.getBoundingClientRect();return {sel,left:r.left,right:r.right,width:r.width,height:r.height,hidden:!el.getClientRects().length,horizontal_clip:r.left<-1||r.right>innerWidth+1}});
      const roots=['html','body','.app-shell','.planner'].map(sel=>{const el=sel==='html'?document.documentElement:sel==='body'?document.body:document.querySelector(sel);return {sel,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflow:el.scrollWidth>el.clientWidth+1}});
      return {innerWidth,innerHeight,items,roots};
    });
    assert.ok(m.items.every(x=>!x.missing&&!x.hidden&&!x.horizontal_clip),JSON.stringify(m.items));
    assert.ok(m.roots.every(x=>!x.overflow),JSON.stringify(m.roots));
    return {viewport,text_scale_percent:200,page_scale_factor:2,metrics:m,requests:segment(start).length};
  }finally{await context.close()}
}

try{
  {
    const {context,page,start}=await freshContext();
    try{
      const sw=await page.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;const keys=await caches.keys();const offline=await caches.match('/offline.html');return {controller:Boolean(navigator.serviceWorker.controller),script_url:reg.active?.scriptURL||'',cache_keys:keys,offline_cached:Boolean(offline)}});
      assert.equal(sw.controller,true);assert.ok(sw.script_url.endsWith('/sw.js'));assert.ok(sw.cache_keys.includes(`voy-static-${buildId}`));assert.equal(sw.offline_cached,true);
      assert.equal(lazyRequests(segment(start)).length,0,'pwa_shell_eager_3d');
      faults.navigationDrop=true;
      await page.goto(baseUrl+'/?offline=1',{waitUntil:'domcontentloaded'});
      faults.navigationDrop=false;
      await page.waitForFunction(()=>document.title==='VOY — Sin conexión');
      assert.equal((await page.locator('main h1').textContent()).trim(),'Sin conexión');
      await page.screenshot({path:path.join(outDir,'chrome-pwa-offline.png')});
      evidence.checks.pwa={...sw,offline_navigation:'PASS',lazy_before_3d:0};console.log('PWA_OFFLINE=PASS');
    }finally{await context.close()}
  }

  {
    const {context,page,start}=await freshContext();
    try{
      await prepareTrip(page);
      const before=segment(start);assert.equal(lazyRequests(before).length,0,'lazy_asset_before_opt_in');
      const mobilityBefore=countPath(before,'/api/mobility/compute');
      faults.moduleOnce=1;
      await page.click('[data-map-mode="3d"]');await assertFallback(page);
      const failedModules=segment(start).filter(r=>r.path==='/3d/voy3d.js');assert.equal(failedModules.length,1,'first_import_not_observed');
      await activate3D(page);
      const canvas=page.locator('.voy-3d-canvas');await page.waitForFunction(()=>document.querySelector('.voy-3d-canvas')?.dataset.renderCalls);
      const route=await canvas.getAttribute('data-route-active'),calls=Number(await canvas.getAttribute('data-render-calls')),triangles=Number(await canvas.getAttribute('data-render-triangles')),quality=await canvas.getAttribute('data-quality');
      assert.equal(route,'true');assert.ok(Number.isFinite(calls)&&calls>0&&calls<50,`per_render_calls_invalid:${calls}`);assert.ok(Number.isFinite(triangles)&&triangles>0);assert.equal(quality,'auto');
      const rows=segment(start),lazy=lazyRequests(rows),required=['/3d/voy3d.js','/vendor/three.module.js','/vendor/three.core.js','/3d/temporal.js','/3d/topology/manifest.json','/3d/topology/chunk-santa-fe-centro-0.json'];
      for(const p of required)assert.ok(lazy.some(r=>r.path===p),`missing_lazy_asset:${p}`);
      for(const r of lazy){const q=new URLSearchParams(r.search);assert.equal(q.get('v'),buildId,`release_identity_mismatch:${r.path}`)}
      const moduleReqs=lazy.filter(r=>r.path==='/3d/voy3d.js');assert.ok(moduleReqs.length>=2,'module_retry_request_missing');assert.ok(new URLSearchParams(moduleReqs[1].search).has('retry'),'retry_cache_buster_missing');
      const mobilityAfter=countPath(rows,'/api/mobility/compute');assert.equal(mobilityAfter,mobilityBefore,'3d_toggle_added_worker_call');
      await page.screenshot({path:path.join(outDir,'chrome-route-3d.png')});
      const lost=await page.evaluate(()=>{const c=document.querySelector('.voy-3d-canvas');const e=new Event('webglcontextlost',{cancelable:true});c.dispatchEvent(e);return e.defaultPrevented});
      assert.equal(lost,true);await assertFallback(page);
      evidence.checks.module_retry_release_route_draw_context={module_requests:moduleReqs,required_lazy_paths:required,selected_route_active:route,render_calls_per_frame:calls,render_triangles_per_frame:triangles,quality,webgl_context_loss_prevented:lost,mobility_compute_before:mobilityBefore,mobility_compute_after:mobilityAfter};
    }finally{await context.close()}
  }

  for(const spec of [
    {name:'manifest_malformed',set:()=>faults.manifest='malformed',clear:()=>faults.manifest=null},
    {name:'chunk_missing',set:()=>faults.chunk='missing',clear:()=>faults.chunk=null}
  ]){
    const {context,page}=await freshContext();
    try{
      await prepareTrip(page);spec.set();await page.click('[data-map-mode="3d"]');await assertFallback(page);
      assert.equal(await page.locator('.voy-3d-canvas').count(),0,`${spec.name}:orphan_canvas`);
      spec.clear();await activate3D(page);assert.equal(await page.locator('.voy-3d-canvas').count(),1,`${spec.name}:retry_failed`);
      evidence.checks[spec.name]={fallback:'PASS',orphan_canvas:0,retry:'PASS'};
    }finally{await context.close()}
  }

  {
    const init=`(()=>{const Native=window.ResizeObserver;let fail=true;window.ResizeObserver=class{constructor(cb){if(fail){fail=false;throw new Error('order074_resizeobserver_fault')}return new Native(cb)}}})()`;
    const {context,page}=await freshContext({initScript:init});
    try{
      await prepareTrip(page);await page.click('[data-map-mode="3d"]');await assertFallback(page);assert.equal(await page.locator('.voy-3d-canvas').count(),0,'resizeobserver_orphan_canvas');
      await activate3D(page);evidence.checks.resizeobserver_cleanup={fallback:'PASS',orphan_canvas:0,retry:'PASS'};
    }finally{await context.close()}
  }

  {
    const {context,page}=await freshContext();
    try{
      const focus=[];
      await tabTo(page,'#manual-origin');focus.push(await focusEvidence(page));await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>document.activeElement?.id),'origin');focus.push(await focusEvidence(page));await page.keyboard.type('Bulevar Gálvez 1150');await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('#origin-label')?.textContent.includes('Bulevar'));
      await tabTo(page,'#destination');focus.push(await focusEvidence(page));await page.keyboard.type('Puente Colgante');await page.waitForSelector('#destination-suggestions .suggestion');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      await page.waitForSelector('body[data-view="resolved"]');await page.waitForFunction(()=>document.querySelectorAll('[data-route-mode]').length>=3);
      await tabTo(page,'[data-route-mode="bicycle"]');focus.push(await focusEvidence(page));await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.mobility-trip[data-mode-card="bicycle"]')?.classList.contains('is-selected'));
      await tabTo(page,'[data-map-mode="3d"]');focus.push(await focusEvidence(page));await page.keyboard.press('Enter');await page.waitForSelector('.voy-3d-canvas');
      await tabTo(page,'#map-3d-quality');focus.push(await focusEvidence(page));await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');
      await page.waitForFunction(()=>document.querySelector('#map-3d-quality')?.value==='performance');await page.waitForFunction(()=>document.querySelector('.voy-3d-canvas')?.dataset.quality==='performance');
      await tabTo(page,'[data-map-mode="2d"]');focus.push(await focusEvidence(page));await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-map-mode="2d"]')?.getAttribute('aria-pressed')==='true');
      assert.ok(focus.every(x=>x.visible),'keyboard_focus_not_visible');
      assert.ok(focus.filter(x=>x.tag!=='SELECT').every(x=>x.outline_style!=='none'&&x.outline_width!=='0px'),'focus_indicator_missing');
      evidence.checks.keyboard={journey:'origin>destination>bicycle>3d>quality>2d',focus};
    }finally{await context.close()}
  }

  evidence.checks.zoom_desktop=await zoomStress({width:1440,height:900});
  evidence.checks.zoom_mobile=await zoomStress({width:390,height:844});

  {
    const {context,page}=await freshContext({reducedMotion:'reduce'});
    try{
      const reduced=await page.evaluate(async(buildId)=>{
        const mod=await import('/3d/temporal.js?v='+buildId);
        const previous={mode:'bus',temporal_state:'realtime',observed_at:'2026-09-25T03:30:00.000Z',id:'b1',lat:-31.65,lon:-60.71,source_id:'verified'};
        const next={...previous,observed_at:'2026-09-25T03:30:10.000Z',lat:-31.6501,lon:-60.7099};
        const geometry=[[-60.71,-31.65],[-60.7099,-31.6501]];
        const out=mod.presentTransportEntity(previous,next,Date.parse('2026-09-25T03:30:05.000Z'),{freshnessMs:20000,verifiedGeometry:geometry,maxSpeedMps:45,maxSnapMeters:35,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
        return {media:matchMedia('(prefers-reduced-motion: reduce)').matches,render:out.render,animated:out.animated,interpolation_fraction:out.interpolation_fraction,position:out.position};
      },buildId);
      assert.equal(reduced.media,true);assert.equal(reduced.render,true);assert.equal(reduced.animated,false);assert.equal(reduced.interpolation_fraction,1);
      evidence.checks.reduced_motion=reduced;
    }finally{await context.close()}
  }

  const allRows=requestLog;
  evidence.requests.total=allRows.length;evidence.requests.dynamic_worker_calls=allRows.filter(r=>r.path.startsWith('/api/')).length;
  evidence.requests.lazy_assets=allRows.filter(r=>/^\/(?:3d\/|vendor\/three)/.test(r.path)).map(r=>r.path+r.search);
  await writeFile(path.join(outDir,'order074-hardening-summary.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('ORDER074_HARDENING=PASS');
  console.log(`TEST_SHA=${TEST_SHA}`);
  console.log(`BUILD_ID=${buildId}`);
  console.log(`PWA_BROWSER=PASS cache=voy-static-${buildId}`);
  console.log('KEYBOARD_ZOOM=PASS');
  console.log('MODULE_RETRY=PASS');
  console.log('PARTIAL_INIT_CLEANUP=PASS');
  console.log('WEBGL_CONTEXT_LOSS=PASS');
  console.log('ROUTE_3D_ASSERTION=PASS');
  console.log(`DRAW_CALL_METRIC=PASS per_render_calls=${evidence.checks.module_retry_release_route_draw_context.render_calls_per_frame}`);
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
