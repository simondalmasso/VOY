import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';

const ROOT='http://127.0.0.1:8765/';
const CLIENT=path.resolve('dist/client');
const OUT=path.resolve('order070/evidence/browser');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const onePixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlIh8sAAAAASUVORK5CYII=','base64');

const sfOrigin={label:'Tu ubicación',territory_verified:true,coordinates:{lat:-31.6561,lon:-60.7103},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};
const onceOrigin={label:'Once',territory_verified:true,coordinates:{lat:-34.60828,lon:-58.40752},province:{id:'02',name:'Ciudad Autónoma de Buenos Aires'},locality:{id:'020001',name:'Ciudad Autónoma de Buenos Aires',slug:'ciudad-autonoma-de-buenos-aires'}};
const destination={label:'Puente Colgante',territory_verified:true,coordinates:{lat:-31.6219,lon:-60.6811},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'},integration_slug:'santa-fe'};
const suggestion={candidate_id:'fixture:puente',candidate_ref:'fixture:puente',provider:'fixture',display_primary:'Puente Colgante',display_secondary:'Santa Fe · Santa Fe',coordinates:destination.coordinates,distance_meters:4100,provider_rank:0,provider_types:['bridge'],confidence_class:'official_offline_territory',attribution_requirement:'OpenStreetMap contributors',locality:destination.locality,province:destination.province,territory_verified:true,territory_verification:'full',territory_authority:'fixture',coverage:'T1_OFFICIAL_HANDOFF',integration_slug:'santa-fe'};
const route=(mode,distance,origin=sfOrigin)=>({mode,selectable:true,route_available:true,availability_state:'available',price_state:mode==='auto'?'unknown':'known',route:{geometry:{type:'LineString',coordinates:[[origin.coordinates.lon,origin.coordinates.lat],[-60.695,-31.638],[-60.6811,-31.6219]]},source:'routing_openstreetmap_de',observed_at:'2026-09-24T12:00:00Z',attribution:'© OpenStreetMap contributors'},distance_m:distance,distance_display:(distance/1000).toFixed(1).replace('.',',')+' km',price:mode==='auto'?null:{currency:'ARS',amount:0,kind:'free',source:'intrinsic_zero_marginal_fare'},disclosures:['Recorrido calculado sobre red OpenStreetMap; no implica estado del tránsito ni tiempo estimado.'],provenance:[],next_actions:[]});
const bus={mode:'bus',selectable:false,route_available:false,availability_state:'partial',price_state:'known',eta_state:'not_integrated',realtime_state:'unavailable',fare:{state:'current',primary:{label:'Tarifa plena',currency:'ARS',amount:2111.11},frequent:{label:'Boleto frecuente Santa Fe',currency:'ARS',amount:1900,eligibility:['SUBE registrada a nombre de la persona usuaria','domicilio declarado en la ciudad de Santa Fe','pago prepago con SUBE física o SUBE Digital','no aplica a pagos con tarjeta de débito, crédito, billetera virtual ni QR']},source:{id:'src_santa_fe_fare_20260515',authority:'Municipalidad de Santa Fe',canonical_url:'https://transparencia.santafeciudad.gov.ar/normativa/decreto-00048-2026/',source_date:'2026-05-15',verified_at:'2026-09-22T18:20:00Z'}},disclosures:['Cuándo pasa: no integrado','Tiempo real no disponible en VOY'],actions:[{id:'santa_fe_when_arrives',label:'Consultar cuándo pasa',url:'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/',source:{authority:'Municipalidad de Santa Fe'}},{id:'santa_fe_deviations',label:'Ver desvíos oficiales',url:'https://santafeciudad.gov.ar/desvios/',source:{authority:'Municipalidad de Santa Fe'}}],provenance:[]};
const decision={state:'handoff',destination,integration_slug:'santa-fe',coverage:'T1_OFFICIAL_HANDOFF',available_modes:[],source_class:'handoff',freshness:{state:'current'},provenance:[],facts:[],handoffs:[],next_actions:[]};
const railRadar={source_status:'available',source:{authority:'Trenes Argentinos Operaciones / SOFSE',published_at:'2026-08-21'},stations:[{station:{name:'Once',coordinates:{lat:-34.60827979749716,lon:-58.4075158087721},distance_meters:1},line:'Sarmiento',branch:'Once-Haedo-Moreno diferencial',temporal_state:'scheduled',service:{scheduled_times:['18:35','07:50']},observed_at:'2026-09-24T12:00:00Z'}]};

function computationFor(origin){return {server_authoritative:true,destination,origin,mode_options:[route('walking',3100,origin),route('bicycle',3300,origin),route('auto',4100,origin),bus],info_actions:[],provenance:[],fabricated_claims:0}}
function assert(condition,message){if(!condition)throw new Error(message)}
function json(route,payload,status=200){return route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)})}
function hash(buf){return crypto.createHash('sha256').update(buf).digest('hex')}
function count(map,path){return map[path]||0}
function totalDynamic(map){return Object.entries(map).filter(([p])=>p.startsWith('/api/')).reduce((n,[,v])=>n+v,0)}

const server=createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,ROOT);
    const rel=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.replace(/^\//,''));
    const file=path.resolve(CLIENT,rel);
    if(!file.startsWith(CLIENT+path.sep)&&file!==CLIENT){res.writeHead(403).end('forbidden');return}
    const body=await readFile(file);
    res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
    res.end(body);
  }catch{res.writeHead(404).end('not found')}
});
await new Promise((resolve,reject)=>server.listen(8765,'127.0.0.1',err=>err?reject(err):resolve()));
await mkdir(OUT,{recursive:true});

const browsers={chrome:process.env.CHROME_BIN||'/usr/bin/google-chrome',edge:process.env.EDGE_BIN||'/usr/bin/microsoft-edge'};
const viewports=[{name:'desktop',width:1440,height:900,mobile:false},{name:'mobile',width:390,height:844,mobile:true}];
const report={generated_at:new Date().toISOString(),commit:process.env.CI_COMMIT_SHA||null,browsers:{},budget:{},pass:true};

async function installApiFixtures(page,calls,{originMode='santa-fe'}={}){
  await page.route('https://tile.openstreetmap.org/**',r=>r.fulfill({status:200,contentType:'image/png',body:onePixel}));
  await page.route('**/api/**',r=>{
    const p=new URL(r.request().url()).pathname;
    calls[p]=(calls[p]||0)+1;
    if(p==='/api/location/reverse')return json(r,{ok:true,candidate:sfOrigin});
    if(p==='/api/origin/resolve')return json(r,{ok:true,result_class:'resolved',candidates:[originMode==='once'?onceOrigin:sfOrigin]});
    if(p==='/api/radar/trains/nearby')return json(r,{ok:true,radar:railRadar});
    if(p==='/api/destinations/suggest')return json(r,{ok:true,provider:'fixture',result_class:'suggestions',suggestions:[suggestion],requires_national_expansion:false,fallback_stage:'local'});
    if(p==='/api/destinations/resolve')return json(r,{ok:true,result_class:'resolved',provider:'fixture',destination,territory_verified:true,mobility_decision:decision});
    if(p==='/api/mobility/compute')return json(r,{ok:true,computation:computationFor(originMode==='once'?onceOrigin:sfOrigin)});
    if(p==='/api/telemetry')return json(r,{ok:true});
    return json(r,{ok:false,error:'fixture_missing'},404);
  });
}

try{
  for(const [browserName,executablePath] of Object.entries(browsers)){
    assert(existsSync(executablePath),browserName+' executable missing: '+executablePath);
    const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
    const browserReport={executablePath,viewports:{},supportedRail:null,pass:true};

    for(const vp of viewports){
      const context=await browser.newContext({
        viewport:{width:vp.width,height:vp.height},
        isMobile:vp.mobile,hasTouch:vp.mobile,serviceWorkers:'block',
        geolocation:{latitude:sfOrigin.coordinates.lat,longitude:sfOrigin.coordinates.lon},
        permissions:['geolocation']
      });
      const page=await context.newPage();
      const calls={}; const errors=[];
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
      page.on('pageerror',e=>errors.push(String(e)));
      await installApiFixtures(page,calls,{originMode:'santa-fe'});

      await page.goto(ROOT,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(650);
      assert(count(calls,'/api/telemetry')===0,browserName+' '+vp.name+' page-load telemetry must be zero');

      const initial=await page.evaluate(()=>{
        const map=document.querySelector('#map-shell'),shell=document.querySelector('.app-shell');
        const mr=map.getBoundingClientRect(),sr=shell.getBoundingClientRect();
        return {mapVisible:mr.width>0&&mr.height>0&&mr.top<innerHeight&&mr.bottom>0,mapWidth:mr.width,mapHeight:mr.height,shellWidth:sr.width,tileCount:document.querySelectorAll('.map-tile').length,pinCount:document.querySelectorAll('.selected-pin').length,overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      assert(initial.mapVisible,browserName+' '+vp.name+' initial map not visible');
      assert(initial.pinCount===0,browserName+' '+vp.name+' neutral map pin');
      assert(initial.tileCount>0&&initial.tileCount<=9,browserName+' '+vp.name+' tile budget');
      assert(!initial.overflow,browserName+' '+vp.name+' initial overflow');
      if(vp.mobile)assert(initial.mapHeight/vp.height>=0.45&&initial.mapHeight/vp.height<=0.56,browserName+' mobile map ratio');
      else assert(initial.mapWidth/initial.shellWidth>=0.58,browserName+' desktop map not dominant');

      await page.locator('#use-location').click();
      await page.waitForFunction(()=>document.querySelector('#origin-label')?.textContent?.includes('Santa Fe'));
      await page.waitForTimeout(100);
      assert(count(calls,'/api/location/reverse')===1,browserName+' '+vp.name+' location reverse');
      assert(count(calls,'/api/radar/trains/nearby')===0,browserName+' '+vp.name+' Santa Fe radar call');

      const input=page.locator('#destination');
      await input.pressSequentially('Puente Colgante',{delay:30});
      await page.waitForSelector('#destination-suggestions:not([hidden]) .suggestion');
      assert(count(calls,'/api/destinations/suggest')===1,browserName+' '+vp.name+' first suggest must be one request');
      await page.locator('#destination-suggestions .suggestion').first().click();
      await page.waitForSelector('[data-mode-card="auto"]');
      await page.waitForSelector('[data-mode-card="bus"]');

      const healthySnapshot={...calls};
      assert(count(healthySnapshot,'/api/telemetry')===0,browserName+' '+vp.name+' healthy telemetry');
      assert(count(healthySnapshot,'/api/location/reverse')===1,browserName+' '+vp.name+' reverse budget');
      assert(count(healthySnapshot,'/api/radar/trains/nearby')===0,browserName+' '+vp.name+' radar budget');
      assert(count(healthySnapshot,'/api/destinations/suggest')===1,browserName+' '+vp.name+' suggest budget');
      assert(count(healthySnapshot,'/api/destinations/resolve')===1,browserName+' '+vp.name+' resolve budget');
      assert(count(healthySnapshot,'/api/mobility/compute')===1,browserName+' '+vp.name+' mobility budget');
      assert(totalDynamic(healthySnapshot)===4,browserName+' '+vp.name+' healthy Worker calls='+totalDynamic(healthySnapshot));

      const facts=await page.evaluate(()=>{
        const txt=s=>(s?.textContent||'').replace(/\s+/g,' ').trim();
        const modes=['walking','bicycle','auto','bus'];
        const cards=Object.fromEntries(modes.map(m=>[m,document.querySelector('[data-mode-card="'+m+'"]')]));
        const map=document.querySelector('#map-shell').getBoundingClientRect(),planner=document.querySelector('.planner');
        return {visibleModes:modes.filter(m=>{const r=cards[m]?.getBoundingClientRect();return r&&r.width>0&&r.height>0}),autoText:txt(cards.auto),busText:txt(cards.bus),radarHidden:document.querySelector('#train-radar').hidden,mapVisible:map.top<innerHeight&&map.bottom>0,overflow:document.documentElement.scrollWidth>innerWidth+1,tileCount:document.querySelectorAll('.map-tile').length,plannerScrollHeight:planner.scrollHeight,plannerClientHeight:planner.clientHeight};
      });
      assert(facts.visibleModes.length===4,browserName+' '+vp.name+' mode facts missing');
      assert(facts.autoText.includes('Precio no disponible'),browserName+' '+vp.name+' auto unknown price');
      for(const needle of ['Tarifa oficial','2.111,11','1.900,00','SUBE registrada','domicilio','Cuándo pasa: no integrado','Tiempo real no disponible en VOY'])assert(facts.busText.includes(needle),browserName+' '+vp.name+' bus fact '+needle);
      assert(facts.radarHidden,browserName+' '+vp.name+' Santa Fe radar UI must stay hidden');
      assert(!facts.overflow,browserName+' '+vp.name+' overflow');
      assert(facts.tileCount<=9,browserName+' '+vp.name+' tile regression');

      await page.locator('[data-mode-card="auto"] [data-route-mode="auto"]').click();
      await page.waitForSelector('.route-overlay');
      const callsAfterModeToggle={...calls};
      assert(count(callsAfterModeToggle,'/api/mobility/compute')===1,browserName+' '+vp.name+' mode toggle recomputed mobility');
      assert(count(callsAfterModeToggle,'/api/radar/trains/nearby')===0,browserName+' '+vp.name+' mode toggle polled radar');

      if(vp.mobile){
        const preserved=await page.evaluate(()=>{
          const planner=document.querySelector('.planner'),bus=document.querySelector('[data-mode-card="bus"]');
          planner.scrollTop=0;bus.scrollIntoView({block:'nearest',inline:'nearest'});
          const map=document.querySelector('#map-shell').getBoundingClientRect(),br=bus.getBoundingClientRect();
          return planner.scrollTop>0&&scrollY===0&&map.top<innerHeight&&map.bottom>0&&br.top<innerHeight&&br.bottom>0;
        });
        assert(preserved,browserName+' mobile map context lost');
      }

      const shot=path.join(OUT,browserName+'-'+vp.name+'.png');
      await page.screenshot({path:shot,fullPage:false});
      const screenshotSha=hash(await readFile(shot));

      const suggestBefore=count(calls,'/api/destinations/suggest');
      await input.fill('');
      await input.pressSequentially('Puente Colgante',{delay:25});
      await page.waitForSelector('#destination-suggestions:not([hidden]) .suggestion');
      await page.waitForTimeout(50);
      assert(count(calls,'/api/destinations/suggest')===suggestBefore,browserName+' '+vp.name+' cached repeat suggest called Worker');

      const evidence={initial,facts,healthy_calls:healthySnapshot,healthy_total_worker_calls:totalDynamic(healthySnapshot),repeat_suggest_extra:count(calls,'/api/destinations/suggest')-suggestBefore,console_errors:errors,screenshot:path.relative(process.cwd(),shot).replace(/\\/g,'/'),screenshot_sha256:screenshotSha,pass:true};
      assert(errors.length===0,browserName+' '+vp.name+' console errors: '+errors.join(' | '));
      browserReport.viewports[vp.name]=evidence;
      report.budget[browserName+'-'+vp.name]=evidence.healthy_total_worker_calls;
      await context.close();
    }

    // Supported Sarmiento coverage: one explicit/new origin => one radar request; no polling.
    {
      const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
      const page=await context.newPage(); const calls={}; const errors=[];
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
      page.on('pageerror',e=>errors.push(String(e)));
      await installApiFixtures(page,calls,{originMode:'once'});
      await page.goto(ROOT,{waitUntil:'domcontentloaded'});
      await page.locator('#manual-origin').click();
      await page.locator('#origin').fill('Once');
      await page.locator('#resolve-origin').click();
      await page.waitForSelector('#train-radar:not([hidden])');
      assert(count(calls,'/api/radar/trains/nearby')===1,browserName+' supported rail first radar count');
      await page.locator('#destination').pressSequentially('Puente Colgante',{delay:25});
      await page.waitForSelector('#destination-suggestions:not([hidden]) .suggestion');
      await page.locator('#destination-suggestions .suggestion').first().click();
      await page.waitForSelector('[data-mode-card="auto"]');
      await page.locator('[data-mode-card="auto"] [data-route-mode="auto"]').click();
      await page.evaluate(()=>{document.querySelector('.planner').scrollTop=200});
      await page.waitForTimeout(100);
      assert(count(calls,'/api/radar/trains/nearby')===1,browserName+' supported rail radar polled after render/scroll/mode toggle');
      assert(errors.length===0,browserName+' supported rail console errors: '+errors.join(' | '));
      browserReport.supportedRail={radar_calls:count(calls,'/api/radar/trains/nearby'),pass:true};
      await context.close();
    }

    browserReport.pass=Object.values(browserReport.viewports).every(x=>x.pass)&&browserReport.supportedRail?.pass===true;
    report.browsers[browserName]=browserReport;report.pass=report.pass&&browserReport.pass;
    await browser.close();
  }
}finally{
  await new Promise(resolve=>server.close(resolve));
}
await writeFile('order070/evidence/browser-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exit(report.pass?0:2);
