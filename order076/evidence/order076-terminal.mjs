import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const runtimeDir=path.resolve(process.env.RUNTIME_DIR||process.cwd());
const require=createRequire(path.join(runtimeDir,'package.json'));
const {chromium}=require('playwright-core');
const distRoot=path.join(runtimeDir,'dist','client');
const manifest=JSON.parse(await readFile(path.join(runtimeDir,'dist','BUILD_MANIFEST.json'),'utf8'));
const expectedSha=process.env.EXPECTED_SHA||'b858568848f6bf5abd6853ee13c77f2e65c63735';
assert.equal(manifest.source_commit,expectedSha,'artifact_source_sha_mismatch');
const buildId=manifest.build_id;
const mode=process.env.MODE||'matrix';
const loops=Math.max(1,Number(process.env.LOOP_COUNT)||1);
const outDir=path.resolve(process.env.EVIDENCE_DIR||path.join(process.cwd(),'order076-terminal-output'));
await mkdir(outDir,{recursive:true});

function browserExecutable(){
  const configured=process.env.BROWSER_PATH;
  if(configured&&existsSync(configured))return configured;
  const candidates=[
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'
  ];
  for(const p of candidates)if(existsSync(p))return p;
  throw new Error('browser_executable_not_found');
}
const exe=browserExecutable();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8'};
const runtimeConfig=await readFile(path.join(distRoot,'runtime-config.js'),'utf8');
const noVectorConfig=runtimeConfig.replace(/("MAP_VECTOR":\{[^}]*"enabled":)true/,'$1false');
const requestLog=[];
const server=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  requestLog.push({path:u.pathname,search:u.search,ts:Date.now()});
  try{
    let rel=decodeURIComponent(u.pathname);if(rel==='/'||rel==='')rel='/index.html';
    const target=path.resolve(distRoot,'.'+rel);
    if(!target.startsWith(distRoot+path.sep)&&target!==distRoot)throw new Error('path_escape');
    const s=await stat(target);if(!s.isFile())throw new Error('not_file');
    const body=await readFile(target);
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
    res.end(body);
  }catch{res.writeHead(404,{'content-type':'text/plain'});res.end('not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const baseUrl='http://127.0.0.1:'+server.address().port;
const transparentPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/2gV7WQAAAABJRU5ErkJggg==','base64');
const browser=await chromium.launch({executablePath:exe,headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

const report={mode,loops,expected_sha:expectedSha,build_id:buildId,browser:exe,iterations:[],specials:{},pass:true};
function apiCount(start=0){return requestLog.slice(start).filter(r=>r.path.startsWith('/api/')).length}
function lazy3D(start=0){return requestLog.slice(start).filter(r=>/^\/(?:3d\/|vendor\/three)/.test(r.path)).length}
async function fresh({viewport={width:390,height:844},fixture=true,vector='disabled',reducedMotion='no-preference',webgl2Off=false,base=baseUrl}={}){
  const context=await browser.newContext({viewport,reducedMotion,serviceWorkers:'block'});
  await context.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:transparentPng}));
  if(base===baseUrl&&vector==='disabled'){
    await context.route('**/runtime-config.js*',route=>route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:noVectorConfig}));
  }
  const page=await context.newPage();
  if(webgl2Off){
    await page.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2')return null;return native.call(this,type,...args)}});
  }
  const start=requestLog.length;
  const url=base+(fixture?(base.includes('?')?'&':'?')+'fixture=realtime&fixtureTickMs=1200':'');
  await page.goto(url,{waitUntil:'load',timeout:45000});
  if(fixture&&base===baseUrl){
    await page.waitForFunction(()=>window.__voyFixtureEngine&&window.__voyFixtureEngine.tick>=2,null,{timeout:15000});
    await page.waitForFunction(()=>document.querySelectorAll('.tracker-marker').length>=5,null,{timeout:15000});
  }
  return{context,page,start};
}
async function selectFixture(page,id='fix-bus-01'){
  await page.locator('[data-entity-id="'+id+'"]').first().click({timeout:10000});
  await page.waitForFunction(id=>window.__voyDebug?.store?.selected?.()?.id===id,id,{timeout:10000});
  await page.waitForSelector('#tracker-facts:not([hidden])',{timeout:10000});
}
async function visible(page,sel){return page.locator(sel).isVisible()}
async function noOverflow(page){
  return page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1);
}
async function check(name,fn,rows){
  try{const detail=await fn();rows.push({name,status:'PASS',detail});}
  catch(error){rows.push({name,status:'FAIL',error:String(error?.stack||error)});throw error;}
}
async function matrixIteration(iteration){
  const rows=[];
  {
    const {context,page,start}=await fresh({fixture:false,vector:'disabled'});
    try{
      await check('MAP_FIRST_MOBILE',async()=>{
        const m=await page.evaluate(()=>{const r=document.querySelector('#map-shell').getBoundingClientRect();return{w:r.width/innerWidth,h:r.height/innerHeight,truth:document.querySelector('#truth-pill')?.getBoundingClientRect().height||0,search:document.querySelector('#search-chip')?.getBoundingClientRect().height||0}});
        assert.ok(m.w>.97&&m.h>.97,JSON.stringify(m));assert.ok(m.truth>0&&m.search>=44);assert.equal(await noOverflow(page),true);return m;
      },rows);
      await check('NO_LIVE_TRUTH',async()=>{assert.match(await page.locator('#truth-label').textContent(),/Tiempo real no disponible/);assert.equal(await page.locator('.tracker-marker').count(),0);return{label:await page.locator('#truth-label').textContent()};},rows);
      await check('THREE_D_NO_CONTEXT_ZERO_LOAD',async()=>{const before=lazy3D(start);await page.click('[data-map-mode="3d"]');await page.waitForFunction(()=>/Seleccioná un servicio o recorrido/.test(document.querySelector('#map-3d-status')?.textContent||''),null,{timeout:8000});assert.equal(await page.getAttribute('[data-map-mode="2d"]','aria-pressed'),'true');assert.equal(lazy3D(start),before);return{lazy_before:before,lazy_after:lazy3D(start)};},rows);
    }finally{await context.close()}
  }
  {
    const {context,page,start}=await fresh({fixture:true,vector:'disabled'});
    try{
      await check('SEARCH_SECONDARY',async()=>{assert.equal(await visible(page,'#search-chip'),true);const z=await page.evaluate(()=>({map:+getComputedStyle(document.querySelector('#map-shell')).zIndex||0,sheet:+getComputedStyle(document.querySelector('#voy-sheet')).zIndex||0}));assert.ok(z.sheet>z.map);return z;},rows);
      await selectFixture(page);
      await check('TRUTH_FIRST_SELECTION',async()=>{const facts=await page.locator('#facts-rows').textContent();assert.match(facts,/Qué sabemos/);assert.match(facts,/Actualizado/);assert.match(facts,/Fuente/);assert.match(await page.locator('#truth-label').textContent(),/En vivo/);assert.match(await page.locator('#truth-meta').textContent(),/fixture/i);return{facts:facts.slice(0,220)};},rows);
      await check('FOLLOW_DRAG_RESUME',async()=>{await page.click('#follow-button');await page.waitForFunction(()=>window.__voyDebug.store.follow()==='following');await page.evaluate(()=>{const c=document.querySelector('#map-canvas');c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:100,clientY:100}));c.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:1,clientX:124,clientY:100}));c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,clientX:124,clientY:100}))});await page.waitForFunction(()=>window.__voyDebug.store.follow()==='suspended');await page.click('#follow-button');await page.waitForFunction(()=>window.__voyDebug.store.follow()==='following');return{follow:await page.evaluate(()=>window.__voyDebug.store.follow())};},rows);
      await check('CONTEXTUAL_3D_SELECTED_ONLY',async()=>{assert.equal(await page.locator('#map-3d-quality').isHidden(),true);await page.click('[data-map-mode="3d"]');await page.waitForSelector('.voy-3d-canvas',{timeout:15000});assert.equal(await page.evaluate(()=>window.__voyDebug.store.selected().id),'fix-bus-01');assert.equal(await page.locator('#map-3d-quality').isHidden(),false);assert.equal(apiCount(start),0);await page.click('[data-map-mode="2d"]');await page.waitForFunction(()=>document.querySelector('[data-map-mode="2d"]')?.getAttribute('aria-pressed')==='true');return{selected:await page.evaluate(()=>window.__voyDebug.store.selected().id),api_calls:apiCount(start)};},rows);
      await check('STALE_ZERO_MOVEMENT',async()=>{await page.evaluate(()=>{const s=window.__voyDebug.store;s.ingest({id:'fix-bus-01',source_id:'voy-fixture-dev',temporal_state:'realtime',observed_at:new Date(Date.now()-45000).toISOString(),lat:-31.65,lon:-60.71,synthetic_fixture:true,line:'15',verified_geometry:[[-60.71,-31.65],[-60.70,-31.64]]});s.select('fix-bus-01')});await page.waitForFunction(()=>document.querySelector('#truth-label')?.textContent==='Estado desconocido',null,{timeout:5000});await page.waitForFunction(()=>!document.querySelector('[data-entity-id="fix-bus-01"]'),null,{timeout:5000});assert.match(await page.locator('#facts-rows').textContent(),/vencida|No hay evidencia suficiente/i);return{truth:await page.locator('#truth-label').textContent()};},rows);
      for(const pct of [150,200])await check('ZOOM_'+pct+'_NO_OVERFLOW',async()=>{const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:pct/100});await page.evaluate(p=>document.documentElement.style.fontSize=p+'%',pct);await page.waitForTimeout(80);assert.equal(await noOverflow(page),true);return{percent:pct};},rows);
      assert.equal(apiCount(start),0,'fixture_matrix_worker_calls_nonzero');
    }finally{await context.close()}
  }
  {
    const {context,page}=await fresh({viewport:{width:1440,height:900},fixture:false,vector:'disabled'});
    try{await check('MAP_FIRST_DESKTOP',async()=>{const m=await page.evaluate(()=>{const r=document.querySelector('#map-shell').getBoundingClientRect();return{w:r.width/innerWidth,h:r.height/innerHeight}});assert.ok(m.w>.97&&m.h>.97,JSON.stringify(m));assert.equal(await noOverflow(page),true);return m;},rows);}finally{await context.close()}
  }
  {
    const {context,page}=await fresh({fixture:false,vector:'disabled'});
    try{await check('KEYBOARD_REACHES_SEARCH',async()=>{await page.locator('body').focus();let reached=false;for(let i=0;i<40;i++){await page.keyboard.press('Tab');if(await page.evaluate(()=>document.activeElement?.id==='search-chip')){reached=true;break}}assert.equal(reached,true);const f=await page.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e);return{id:e.id,outline:s.outlineStyle,width:s.outlineWidth}});assert.notEqual(f.outline,'none');return f;},rows);}finally{await context.close()}
  }
  {
    const {context,page}=await fresh({fixture:true,vector:'real',webgl2Off:true});
    try{await check('VECTOR_FAILURE_RASTER_FALLBACK',async()=>{await page.waitForFunction(()=>window.__voyDebug?.substrate?.state?.().substrate==='vector_failed',null,{timeout:10000});assert.ok((await page.locator('.tracker-marker').count())>=5);await selectFixture(page);assert.match(await page.locator('#facts-rows').textContent(),/Qué sabemos/);return await page.evaluate(()=>window.__voyDebug.substrate.state());},rows);}finally{await context.close()}
  }
  assert.equal(rows.length,13,'matrix_check_count');
  return{iteration,rows,pass:rows.every(x=>x.status==='PASS')};
}

async function runSpecials(){
  const out={};
  {
    const {context,page}=await fresh({fixture:true,vector:'disabled',reducedMotion:'reduce'});
    try{await selectFixture(page);await page.click('[data-map-mode="3d"]');await page.waitForSelector('.voy-3d-canvas',{timeout:15000});const policy=await page.evaluate(()=>window.__voyDebug.state.threeController?.movement_policy);assert.equal(policy?.reducedMotion,true);out.reduced_motion={pass:true,policy};}finally{await context.close()}
  }
  {
    const {context,page}=await fresh({fixture:true,vector:'disabled',webgl2Off:true});
    try{await selectFixture(page);await page.click('[data-map-mode="3d"]');await page.waitForFunction(()=>/3D no disponible/.test(document.querySelector('#map-3d-status')?.textContent||''),null,{timeout:10000});assert.equal(await page.locator('.voy-3d-canvas').count(),0);out.webgl2_unavailable={pass:true,status:await page.locator('#map-3d-status').textContent()};}finally{await context.close()}
  }
  {
    const {context,page}=await fresh({fixture:true,vector:'disabled'});
    try{await selectFixture(page);await page.click('[data-map-mode="3d"]');await page.waitForSelector('.voy-3d-canvas',{timeout:15000});const prevented=await page.evaluate(()=>{const c=document.querySelector('.voy-3d-canvas');const e=new Event('webglcontextlost',{cancelable:true});c.dispatchEvent(e);return e.defaultPrevented});assert.equal(prevented,true);await page.waitForFunction(()=>document.querySelector('[data-map-mode="2d"]')?.getAttribute('aria-pressed')==='true'&&!document.querySelector('.voy-3d-canvas'),null,{timeout:10000});out.context_loss={pass:true,prevented};}finally{await context.close()}
  }
  {
    const {context,page}=await fresh({fixture:true,vector:'real'});
    try{
      await page.waitForFunction(()=>window.__voyDebug?.substrate?.maplibreReady===true,null,{timeout:35000});
      await selectFixture(page);
      const before=await page.evaluate(()=>window.__voyDebug.substrate.getCenter());
      const box=await page.locator('#map-canvas').boundingBox();assert.ok(box);
      await page.mouse.move(box.x+box.width*.55,box.y+box.height*.55);await page.mouse.down();await page.mouse.move(box.x+box.width*.35,box.y+box.height*.48,{steps:8});await page.mouse.up();
      await page.waitForTimeout(800);
      const after=await page.evaluate(()=>window.__voyDebug.substrate.getCenter());
      assert.ok(Math.abs(after.lat-before.lat)+Math.abs(after.lon-before.lon)>0.00001,JSON.stringify({before,after}));
      assert.equal(await page.evaluate(()=>window.__voyDebug.store.selected().id),'fix-bus-01');
      assert.match(await page.locator('#facts-rows').textContent(),/Qué sabemos/);
      out.real_vector={pass:true,before,after,attribution:await page.locator('.maplibregl-ctrl-attrib').first().textContent().catch(()=>''),selected:'fix-bus-01'};
    }finally{await context.close()}
  }
  return out;
}

async function runProd(){
  const publicBase=process.env.BASE_URL;
  assert.ok(publicBase,'BASE_URL_required');
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  await page.goto(publicBase+'?fixture=realtime&fixtureTickMs=1200',{waitUntil:'load',timeout:45000});
  await page.waitForFunction(()=>window.__voyFixtureEngine&&window.__voyFixtureEngine.tick>=2,null,{timeout:15000});
  await page.waitForFunction(()=>document.querySelectorAll('.tracker-marker').length>=5,null,{timeout:15000});
  const rect=await page.evaluate(()=>{const r=document.querySelector('#map-shell').getBoundingClientRect();return{w:r.width/innerWidth,h:r.height/innerHeight}});
  assert.ok(rect.w>.97&&rect.h>.97);
  await page.locator('[data-entity-id="fix-bus-01"]').first().click();
  await page.waitForSelector('#tracker-facts:not([hidden])');
  assert.match(await page.locator('#facts-rows').textContent(),/Qué sabemos/);
  assert.match(await page.locator('#truth-label').textContent(),/En vivo/);
  await context.close();
  return{pass:true,rect};
}

try{
  if(mode==='matrix'){
    for(let i=1;i<=loops;i++){const one=await matrixIteration(i);report.iterations.push(one);console.log('MATRIX_ITERATION',i,'PASS');}
  }else if(mode==='specials'){
    report.specials=await runSpecials();console.log('SPECIALS_PASS');
  }else if(mode==='prod'){
    report.prod=await runProd();console.log('PROD_SMOKE_PASS');
  }else throw new Error('unknown_mode:'+mode);
}catch(error){report.pass=false;report.error=String(error?.stack||error);console.error(report.error);}
finally{
  await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
report.pass=report.pass&&report.iterations.every(x=>x.pass)&&Object.values(report.specials).every(x=>x?.pass!==false)&&(report.prod?.pass!==false);
await writeFile(path.join(outDir,'order076-terminal-'+mode+'.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({mode,pass:report.pass,loops:report.iterations.length,build_id:buildId,browser:exe},null,2));
process.exit(report.pass?0:2);
