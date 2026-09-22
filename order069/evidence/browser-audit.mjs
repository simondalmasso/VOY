import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';

const ROOT='http://127.0.0.1:8765/';
const CLIENT=path.resolve('dist/client');
const OUT=path.resolve('order069/evidence/browser');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const onePixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlIh8sAAAAASUVORK5CYII=','base64');

const origin={label:'Plaza 25 de Mayo',territory_verified:true,coordinates:{lat:-31.6561,lon:-60.7103},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}};
const destination={label:'Puente Colgante',territory_verified:true,coordinates:{lat:-31.6219,lon:-60.6811},province:{id:'82',name:'Santa Fe'},locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'},integration_slug:'santa-fe'};
const suggestion={candidate_id:'fixture:puente',candidate_ref:'fixture:puente',provider:'fixture',display_primary:'Puente Colgante',display_secondary:'Santa Fe · Santa Fe',coordinates:destination.coordinates,distance_meters:4100,provider_rank:0,provider_types:['bridge'],confidence_class:'official_offline_territory',attribution_requirement:'OpenStreetMap contributors',locality:destination.locality,province:destination.province,territory_verified:true,territory_verification:'full',territory_authority:'fixture',coverage:'T1_OFFICIAL_HANDOFF',integration_slug:'santa-fe'};
const route=(mode,distance)=>({mode,selectable:true,route_available:true,availability_state:'available',price_state:mode==='auto'?'unknown':'known',route:{geometry:{type:'LineString',coordinates:[[-60.7103,-31.6561],[-60.695,-31.638],[-60.6811,-31.6219]]},source:'routing_openstreetmap_de',observed_at:'2026-09-22T18:20:00Z',attribution:'© OpenStreetMap contributors'},distance_m:distance,distance_display:(distance/1000).toFixed(1).replace('.',',')+' km',price:mode==='auto'?null:{currency:'ARS',amount:0,kind:'free',source:'intrinsic_zero_marginal_fare'},disclosures:['Recorrido calculado sobre red OpenStreetMap; no implica estado del tránsito ni tiempo estimado.'],provenance:[],next_actions:[]});
const bus={mode:'bus',selectable:false,route_available:false,availability_state:'partial',price_state:'known',eta_state:'not_integrated',realtime_state:'unavailable',fare:{state:'current',primary:{label:'Tarifa plena',currency:'ARS',amount:2111.11},frequent:{label:'Boleto frecuente Santa Fe',currency:'ARS',amount:1900,eligibility:['SUBE registrada a nombre de la persona usuaria','domicilio declarado en la ciudad de Santa Fe','pago prepago con SUBE física o SUBE Digital','no aplica a pagos con tarjeta de débito, crédito, billetera virtual ni QR']},source:{id:'src_santa_fe_fare_20260515',authority:'Municipalidad de Santa Fe',canonical_url:'https://transparencia.santafeciudad.gov.ar/normativa/decreto-00048-2026/',source_date:'2026-05-15',verified_at:'2026-09-22T18:20:00Z'}},disclosures:['Cuándo pasa: no integrado','Tiempo real no disponible en VOY'],actions:[{id:'santa_fe_when_arrives',label:'Consultar cuándo pasa',url:'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/',source:{authority:'Municipalidad de Santa Fe'}},{id:'santa_fe_deviations',label:'Ver desvíos oficiales',url:'https://santafeciudad.gov.ar/desvios/',source:{authority:'Municipalidad de Santa Fe'}}],provenance:[]};
const computation={server_authoritative:true,destination,origin,mode_options:[route('walking',3100),route('bicycle',3300),route('auto',4100),bus],info_actions:[],provenance:[],fabricated_claims:0};
const decision={state:'handoff',destination,integration_slug:'santa-fe',coverage:'T1_OFFICIAL_HANDOFF',available_modes:[],source_class:'handoff',freshness:{state:'current'},provenance:[],facts:[],handoffs:[],next_actions:[]};
const radar={source_status:'available',source:{authority:'Trenes Argentinos',published_at:'2026-09-18'},stations:[{station:{name:'Santa Fe Belgrano C',coordinates:{lat:-31.643,lon:-60.705},distance_meters:1600},line:'Mitre',branch:'Santa Fe',temporal_state:'scheduled',service:{scheduled_times:['08:00','18:00']},observed_at:'2026-09-22T18:20:00Z'}]};

function assert(condition,message){if(!condition)throw new Error(message)}
function json(route,payload,status=200){return route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)})}
function hash(buf){return crypto.createHash('sha256').update(buf).digest('hex')}

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

const browsers={
  chrome:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  edge:process.env.EDGE_BIN||'/usr/bin/microsoft-edge'
};
const viewports=[
  {name:'desktop',width:1440,height:900,mobile:false},
  {name:'mobile',width:390,height:844,mobile:true}
];
const report={generated_at:new Date().toISOString(),commit:process.env.CI_COMMIT_SHA||null,browsers:{},pass:true};

try{
  for(const [browserName,executablePath] of Object.entries(browsers)){
    assert(existsSync(executablePath),browserName+' executable missing: '+executablePath);
    const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
    const browserReport={executablePath,viewports:{},pass:true};
    for(const vp of viewports){
      const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},isMobile:vp.mobile,hasTouch:vp.mobile,serviceWorkers:'block'});
      const page=await context.newPage();
      const errors=[];
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
      page.on('pageerror',e=>errors.push(String(e)));
      await page.route('https://tile.openstreetmap.org/**',r=>r.fulfill({status:200,contentType:'image/png',body:onePixel}));
      await page.route('**/api/**',r=>{
        const p=new URL(r.request().url()).pathname;
        if(p==='/api/telemetry')return r.fulfill({status:204,body:''});
        if(p==='/api/origin/resolve')return json(r,{ok:true,result_class:'resolved',candidates:[origin]});
        if(p==='/api/radar/trains/nearby')return json(r,{ok:true,radar});
        if(p==='/api/destinations/suggest')return json(r,{ok:true,provider:'fixture',result_class:'suggestions',suggestions:[suggestion],requires_national_expansion:false,fallback_stage:'local'});
        if(p==='/api/destinations/resolve')return json(r,{ok:true,result_class:'resolved',provider:'fixture',destination,territory_verified:true,mobility_decision:decision});
        if(p==='/api/mobility/compute')return json(r,{ok:true,computation});
        return json(r,{ok:false,error:'fixture_missing'},404);
      });
      await page.goto(ROOT,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(120);

      const initial=await page.evaluate(()=>{
        const map=document.querySelector('#map-shell'),shell=document.querySelector('.app-shell'),hero=document.querySelector('.destination-hero');
        const mr=map.getBoundingClientRect(),sr=shell.getBoundingClientRect(),hr=hero.getBoundingClientRect();
        return {mapVisible:mr.width>0&&mr.height>0&&mr.top<innerHeight&&mr.bottom>0,mapTop:mr.top,mapBottom:mr.bottom,mapWidth:mr.width,mapHeight:mr.height,shellWidth:sr.width,heroHeight:hr.height,tileCount:document.querySelectorAll('.map-tile').length,pinCount:document.querySelectorAll('.selected-pin').length,overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      assert(initial.mapVisible,browserName+' '+vp.name+' initial map not visible');
      assert(initial.pinCount===0,browserName+' '+vp.name+' initial neutral map has a pin');
      assert(initial.tileCount>0&&initial.tileCount<=9,browserName+' '+vp.name+' tile budget '+initial.tileCount);
      assert(!initial.overflow,browserName+' '+vp.name+' horizontal overflow');
      if(vp.mobile)assert(initial.mapHeight/vp.height>=0.45&&initial.mapHeight/vp.height<=0.56,browserName+' mobile map viewport ratio');
      else assert(initial.mapWidth/initial.shellWidth>=0.58,browserName+' desktop map not dominant');

      let focusVisible=false;
      for(let i=0;i<10;i++){
        await page.keyboard.press('Tab');
        focusVisible=await page.evaluate(()=>document.activeElement?.id==='destination'&&document.activeElement.matches(':focus-visible'));
        if(focusVisible)break;
      }
      assert(focusVisible,browserName+' '+vp.name+' destination keyboard focus not visible');

      await page.locator('#manual-origin').click();
      await page.locator('#origin').fill('Plaza 25 de Mayo');
      await page.locator('#resolve-origin').click();
      await page.waitForSelector('#train-radar:not([hidden])');
      await page.locator('#destination').fill('Puente Colgante');
      await page.waitForSelector('#destination-suggestions:not([hidden]) .suggestion');
      await page.locator('#destination-suggestions .suggestion').first().click();
      await page.waitForSelector('[data-mode-card="auto"]');
      await page.waitForSelector('[data-mode-card="bus"]');

      const facts=await page.evaluate(()=>{
        const txt=s=>(s?.textContent||'').replace(/\s+/g,' ').trim();
        const modes=['walking','bicycle','auto','bus'];
        const cards=Object.fromEntries(modes.map(m=>[m,document.querySelector('[data-mode-card="'+m+'"]')]));
        const map=document.querySelector('#map-shell').getBoundingClientRect();
        const planner=document.querySelector('.planner');
        return {
          visibleModes:modes.filter(m=>{const r=cards[m]?.getBoundingClientRect();return r&&r.width>0&&r.height>0}),
          autoText:txt(cards.auto),
          busText:txt(cards.bus),
          mapVisible:map.width>0&&map.height>0&&map.top<innerHeight&&map.bottom>0,
          radarVisible:!document.querySelector('#train-radar').hidden,
          overflow:document.documentElement.scrollWidth>innerWidth+1,
          tileCount:document.querySelectorAll('.map-tile').length,
          plannerScrollHeight:planner.scrollHeight,
          plannerClientHeight:planner.clientHeight
        };
      });
      assert(facts.visibleModes.length===4,browserName+' '+vp.name+' four modes not visible/reachable');
      assert(facts.autoText.includes('Precio no disponible'),browserName+' '+vp.name+' auto unknown price missing');
      for(const needle of ['Tarifa oficial','2.111,11','1.900,00','SUBE registrada','domicilio','Cuándo pasa: no integrado','Tiempo real no disponible en VOY','Consultar cuándo pasa','Ver desvíos oficiales']) assert(facts.busText.includes(needle),browserName+' '+vp.name+' bus fact missing: '+needle);
      assert(facts.radarVisible,browserName+' '+vp.name+' train radar not preserved');
      assert(!facts.overflow,browserName+' '+vp.name+' overflow after resolution');
      assert(facts.tileCount<=9,browserName+' '+vp.name+' tile budget regression after resolution');

      await page.locator('[data-mode-card="auto"] [data-route-mode="auto"]').click();
      await page.waitForSelector('.route-overlay');

      let panelContextPreserved=true;
      if(vp.mobile){
        const scrollProbe=await page.evaluate(()=>{
          const planner=document.querySelector('.planner');
          const bus=document.querySelector('[data-mode-card="bus"]');
          const overflowY=getComputedStyle(planner).overflowY;
          const scrollable=planner.scrollHeight>planner.clientHeight+1&&['auto','scroll'].includes(overflowY);
          planner.scrollTop=0;
          bus.scrollIntoView({block:'nearest',inline:'nearest'});
          const map=document.querySelector('#map-shell').getBoundingClientRect();
          const br=bus.getBoundingClientRect();
          return {scrollable,overflowY,scrollTop:planner.scrollTop,windowScrollY:scrollY,mapVisible:map.top<innerHeight&&map.bottom>0,busVisible:br.top<innerHeight&&br.bottom>0};
        });
        panelContextPreserved=scrollProbe.scrollable&&scrollProbe.scrollTop>0&&scrollProbe.windowScrollY===0&&scrollProbe.mapVisible&&scrollProbe.busVisible;
        assert(panelContextPreserved,browserName+' mobile facts panel hides spatial context: '+JSON.stringify(scrollProbe));
      }

      const routeState=await page.evaluate(()=>{
        const map=document.querySelector('#map-shell').getBoundingClientRect();
        const overlay=document.querySelector('.route-overlay');
        const important=[...document.querySelectorAll('button,input,a')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&s.display!=='none'&&s.visibility!=='hidden'}).map(el=>({id:el.id||'',text:(el.textContent||'').trim().slice(0,40),w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)}));
        return {overlay:!!overlay,mapVisible:map.top<innerHeight&&map.bottom>0,smallTargets:important.filter(x=>x.w<44||x.h<44)};
      });
      assert(routeState.overlay,browserName+' '+vp.name+' auto route geometry missing');
      assert(routeState.mapVisible,browserName+' '+vp.name+' map hidden after auto route');
      assert(routeState.smallTargets.length===0,browserName+' '+vp.name+' sub-44px targets: '+JSON.stringify(routeState.smallTargets));
      assert(errors.length===0,browserName+' '+vp.name+' console errors: '+errors.join(' | '));

      const shot=path.join(OUT,browserName+'-'+vp.name+'.png');
      await page.screenshot({path:shot,fullPage:false});
      const shotBytes=await readFile(shot);
      const evidence={initial,facts,routeState,panelContextPreserved,console_errors:errors,screenshot:path.relative(process.cwd(),shot).replace(/\\/g,'/'),screenshot_sha256:hash(shotBytes),pass:true};
      browserReport.viewports[vp.name]=evidence;
      await context.close();
    }
    browserReport.pass=Object.values(browserReport.viewports).every(x=>x.pass);
    report.browsers[browserName]=browserReport;
    report.pass=report.pass&&browserReport.pass;
    await browser.close();
  }
}finally{
  await new Promise(resolve=>server.close(resolve));
}
await writeFile('order069/evidence/browser-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exit(report.pass?0:2);
