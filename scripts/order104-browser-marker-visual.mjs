import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(REPO);
const ROOT = path.join(REPO, 'dist', 'client');
const OUT = path.join(REPO, 'artifacts-live', 'order104-browser-visual');
const MIME = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json',
  '.ico':'image/x-icon','.pmtiles':'application/octet-stream'
};
const style = {
  version: 8,
  name: 'VOY local marker visual test',
  sources: {
    roads: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {type:'Feature',properties:{kind:'arterial'},geometry:{type:'LineString',coordinates:[[-60.735,-31.672],[-60.675,-31.672]]}},
          {type:'Feature',properties:{kind:'arterial'},geometry:{type:'LineString',coordinates:[[-60.735,-31.652],[-60.675,-31.652]]}},
          {type:'Feature',properties:{kind:'arterial'},geometry:{type:'LineString',coordinates:[[-60.735,-31.632],[-60.675,-31.632]]}},
          {type:'Feature',properties:{kind:'cross'},geometry:{type:'LineString',coordinates:[[-60.730,-31.690],[-60.730,-31.620]]}},
          {type:'Feature',properties:{kind:'cross'},geometry:{type:'LineString',coordinates:[[-60.705,-31.690],[-60.705,-31.620]]}},
          {type:'Feature',properties:{kind:'cross'},geometry:{type:'LineString',coordinates:[[-60.680,-31.690],[-60.680,-31.620]]}}
        ]
      }
    }
  },
  layers: [
    {id:'background',type:'background',paint:{'background-color':'#efeee8'}},
    {id:'road-casing',type:'line',source:'roads',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':5}},
    {id:'roads',type:'line',source:'roads',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#c8c6bd','line-width':2}}
  ]
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const file = path.resolve(ROOT, relative);
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
      res.writeHead(403).end('forbidden'); return;
    }
    const data = await readFile(file);
    res.writeHead(200, {'content-type':MIME[path.extname(file)] || 'application/octet-stream','cache-control':'no-store'});
    res.end(data);
  } catch {
    res.writeHead(404, {'content-type':'text/plain; charset=utf-8'}).end('not found');
  }
});
await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',err=>err?reject(err):resolve()));
const address = server.address();
const origin = 'http://127.0.0.1:' + address.port;
await mkdir(OUT,{recursive:true});
const chromePath = process.env.CHROME_BIN || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
if (!existsSync(chromePath)) throw new Error('Chrome executable missing: ' + chromePath);
const sourceCommit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const gitStatus = execFileSync('git',['status','--short','--untracked-files=no'],{encoding:'utf8'}).trim();
console.log('browser visual: launching', chromePath, 'from', REPO);
const browser = await chromium.launch({
  headless:true,
  executablePath:chromePath,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']
});
const report = {sourceCommit,workingTreeClean:!gitStatus,gitStatus,fixtureOnly:true,cloudflareApiCalls:0,viewports:[],pass:true};
const directions = [
  {name:'north',bearing:0,latDelta:0.008,lonDelta:0,previousLatDelta:-0.00025,previousLonDelta:0},
  {name:'east',bearing:90,latDelta:0,lonDelta:0.008,previousLatDelta:0,previousLonDelta:-0.00025},
  {name:'south',bearing:180,latDelta:-0.008,lonDelta:0,previousLatDelta:0.00025,previousLonDelta:0},
  {name:'west',bearing:270,latDelta:0,lonDelta:-0.008,previousLatDelta:0,previousLonDelta:0.00025}
];
function angularDifference(a,b){const d=Math.abs(((a-b)%360+360)%360);return Math.min(d,360-d)}
function angleFromTransform(transform){
  if(!transform || transform==='none')return null;
  const match=transform.match(/^matrix\(([^)]+)\)$/);
  if(!match)return null;
  const values=match[1].split(',').map(Number);
  return (Math.atan2(values[1],values[0])*180/Math.PI+360)%360;
}
try {
  for (const vp of [
    {name:'desktop',width:1440,height:900},
    {name:'mobile',width:390,height:844}
  ]) {
    const context = await browser.newContext({viewport:{width:vp.width,height:vp.height},serviceWorkers:'block',reducedMotion:'no-preference'});
    const page = await context.newPage();
    const consoleErrors = [], pageErrors = [], apiCalls = [];
    page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())});
    page.on('pageerror',err=>pageErrors.push(String(err)));
    page.on('request',req=>{try{const u=new URL(req.url());if(u.origin===origin&&u.pathname.startsWith('/api/'))apiCalls.push({path:u.pathname,method:req.method()})}catch{}});
    await page.route('https://tiles.openfreemap.org/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/styles/liberty')) {
        return route.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(style)});
      }
      return route.abort();
    });
    await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
    await page.route('**/api/**',route=>route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({ok:false,error:'no_api_calls_expected_in_fixture_visual_test'})}));
    console.log('browser visual: viewport', vp.name, 'navigating');
    await page.goto(origin+'/?fixture=realtime&fixtureTickMs=60000',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__voyDebug && window.__voyFixtureEngine),{timeout:15000});
    await page.waitForFunction(()=>window.__voyDebug?.substrate?.state?.().substrate==='vector',{timeout:15000});
    await page.evaluate(()=>{
      const substrate=window.__voyDebug.substrate;
      const center=substrate.getCenter()||{lat:-31.652,lon:-60.705};
      substrate.setCenter(center);
      window.__voyFixtureEngine.stop();
    });
    await page.waitForTimeout(200);
    console.log('browser visual: viewport', vp.name, 'injecting cardinal GPS fixes');
    const injected = await page.evaluate(directions => {
      const {store,substrate,state}=window.__voyDebug;
      const center=substrate.getCenter()||state.mapCenter||{lat:-31.652,lon:-60.705};
      const now=Date.now();
      const ids=[];
      for (const direction of directions) {
        const id='visual-'+direction.name;
        const lat=center.lat+direction.latDelta;
        const lon=center.lon+direction.lonDelta;
        const common={id,source_id:'voy-fixture-dev',temporal_state:'realtime',synthetic_fixture:true,observed_position_only:true,vehicle_type:'bus',transport_mode:'bus',mode:'bus',line:'9'};
        store.ingest({...common,observed_at:new Date(now-5000).toISOString(),lat:lat+direction.previousLatDelta,lon:lon+direction.previousLonDelta});
        store.ingest({...common,observed_at:new Date(now-1000).toISOString(),lat,lon});
        ids.push(id);
      }
      return {center,ids,activeMode:state.activeTransportMode,fixtureOn:state.fixtureOn,frames:ids.map(id=>({id,frame:store.displayFrame(id)}))};
    },directions);
    await page.waitForFunction(ids=>ids.every(id=>Boolean(document.querySelector('[data-entity-id="'+id+'"].tracker-marker.is-gps-bus'))),injected.ids,{timeout:12000});
    await page.waitForTimeout(250);
    console.log('browser visual: viewport', vp.name, 'checking bearing transforms');
    const initial = await page.evaluate(directions => directions.map(direction => {
      const id='visual-'+direction.name;
      const element=document.querySelector('[data-entity-id="'+id+'"].tracker-marker.is-gps-bus');
      const frame=window.__voyDebug.store.displayFrame(id);
      const before=getComputedStyle(element,'::before');
      const rect=element.getBoundingClientRect();
      const angle=(()=>{const m=before.transform.match(/^matrix\(([^)]+)\)$/);if(!m)return null;const v=m[1].split(',').map(Number);return (Math.atan2(v[1],v[0])*180/Math.PI+360)%360})();
      return {id,expectedBearing:direction.bearing,frameBearing:frame.bearing,cssBearing:element.style.getPropertyValue('--gps-bearing'),computedTransform:before.transform,computedAngle:angle,center:{x:rect.x+rect.width/2,y:rect.y+rect.height/2},visible:rect.width>0&&rect.height>0&&rect.right>0&&rect.left<innerWidth&&rect.bottom>0&&rect.top<innerHeight};
    }),directions);
    console.log('browser visual: initial marker geometry', vp.name, JSON.stringify(initial));
    const bearingChecks=initial.map(item=>({id:item.id,expected:item.expectedBearing,actualFrame:item.frameBearing,actualCss:item.computedAngle,frameError:angularDifference(Number(item.frameBearing),item.expectedBearing),cssError:angularDifference(Number(item.computedAngle),item.expectedBearing)}));
    for(const item of initial){
      if(!item.visible)throw new Error(vp.name+' '+item.id+' marker not visible: '+JSON.stringify(item));
      if(!Number.isFinite(Number(item.frameBearing))||angularDifference(Number(item.frameBearing),item.expectedBearing)>1)throw new Error(vp.name+' '+item.id+' computed GPS bearing mismatch: '+JSON.stringify(item));
      if(!Number.isFinite(Number(item.computedAngle))||angularDifference(Number(item.computedAngle),item.expectedBearing)>1)throw new Error(vp.name+' '+item.id+' CSS marker rotation mismatch: '+JSON.stringify(item));
    }
    const beforeMove=await page.evaluate(()=>{
      const el=document.querySelector('[data-entity-id="visual-north"]');
      const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
    });
    await page.evaluate(()=>{
      const store=window.__voyDebug.store;
      const center=window.__voyDebug.substrate.getCenter()||window.__voyDebug.state.mapCenter||{lat:-31.652,lon:-60.705};
      const now=Date.now();
      store.ingest({id:'visual-north',source_id:'voy-fixture-dev',temporal_state:'realtime',synthetic_fixture:true,observed_position_only:true,vehicle_type:'bus',transport_mode:'bus',mode:'bus',line:'9',observed_at:new Date(now).toISOString(),lat:center.lat+0.008-0.0003,lon:center.lon});
    });
    await page.waitForTimeout(1500);
    const afterMove=await page.evaluate(()=>{
      const el=document.querySelector('[data-entity-id="visual-north"]');
      const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
    });
    const movementPixels=Math.hypot(afterMove.x-beforeMove.x,afterMove.y-beforeMove.y);
    if(!(movementPixels>0.5))throw new Error(vp.name+' GPS marker did not move after a new observed fix: '+movementPixels);
    const layout=await page.evaluate(()=>({
      mapVisible:(()=>{const r=document.querySelector('#map-shell').getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0})(),
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
      fixtureBannerVisible:!document.querySelector('#fixture-banner')?.hidden,
      markers:document.querySelectorAll('.tracker-marker.is-gps-bus').length,
      mapMode:window.__voyDebug.state.mapMode,
      substrateState:window.__voyDebug.state.substrateState
    }));
    if(!layout.mapVisible)throw new Error(vp.name+' map not visible');
    if(layout.substrateState!=='vector')throw new Error(vp.name+' vector map failed to initialize: '+layout.substrateState);
    if(layout.horizontalOverflow)throw new Error(vp.name+' horizontal overflow');
    if(!layout.fixtureBannerVisible)throw new Error(vp.name+' synthetic fixture banner not visible');
    if(layout.markers<4)throw new Error(vp.name+' expected four GPS markers, found '+layout.markers);
    if(apiCalls.length)throw new Error(vp.name+' fixture visual test made same-origin API calls: '+JSON.stringify(apiCalls));
    const screenshot=path.join(OUT,'gps-headings-'+vp.name+'.png');
    await page.screenshot({path:screenshot,fullPage:false});
    report.viewports.push({name:vp.name,width:vp.width,height:vp.height,layout,bearingChecks,movementPixels,screenshot:path.relative(process.cwd(),screenshot),consoleErrors,pageErrors,apiCalls,injectedCenter:injected.center});
    await context.close();
  }
} catch(error) {
  report.pass=false;
  report.error=String(error?.stack||error);
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
report.cloudflareApiCalls=report.viewports.reduce((n,v)=>n+v.apiCalls.length,0);
report.pass=report.pass&&report.viewports.length===2&&report.viewports.every(v=>v.consoleErrors.length===0&&v.pageErrors.length===0&&v.bearingChecks.every(c=>c.frameError<=1&&c.cssError<=1));
await writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify(report,null,2));
if(!report.pass)process.exitCode=1;
