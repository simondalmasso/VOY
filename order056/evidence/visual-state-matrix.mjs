import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.env.VOY_VISUAL_URL||'http://127.0.0.1:8765/';
const OUT=process.env.VOY_VISUAL_OUT||'order056/evidence/rendered/p2-states';
const REPORT=process.env.VOY_VISUAL_REPORT||'order056/evidence/visual-state-matrix.json';
const EXES={chrome:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',edge:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'};
const browserName=(process.env.VOY_BROWSER||'chrome').toLowerCase();
const exe=EXES[browserName];
if(!exe)throw new Error(`unsupported browser ${browserName}`);
const viewports=[['320',320,844,true],['360',360,844,true],['390',390,844,true],['412',412,844,true],['430',430,844,true],['844x390',844,390,true],['1280',1280,900,false],['1440',1440,900,false]];
const themes=[['light','light','light'],['dark','dark','dark'],['forced-dark','system','dark']];
const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlIh8sAAAAASUVORK5CYII=';
const suggestion={candidate_id:'photon:W:1',candidate_ref:'photon:W:1',provider:'photon_georef_contextual',display_primary:'San Martín',display_secondary:'Santa Fe · Santa Fe',coordinates:{lat:-31.64,lon:-60.70},distance_meters:850,provider_rank:0,provider_types:['residential'],confidence_class:'official_offline_territory',attribution_requirement:'OpenStreetMap contributors',locality:{id:'',name:'Santa Fe',slug:'santa-fe'},province:{id:'82',name:'Santa Fe'},territory_verified:true,territory_verification:'full',territory_authority:'pinned_official_georef_snapshot',coverage:'T1_OFFICIAL_HANDOFF',integration_slug:null};
const fixture={ok:true,provider:'photon_georef_contextual',result_class:'suggestions',suggestions:[suggestion],requires_national_expansion:false,fallback_stage:'local'};
const EXPECTED_ERROR_COPY='La búsqueda no está disponible ahora.';
const EXPECTED_503_CONSOLE='Failed to load resource: the server responded with a status of 503 (Service Unavailable)';
function isExpectedMockedSuggest503(event,state){
  if(state!=='error'||event.kind!=='console'||event.text!==EXPECTED_503_CONSOLE)return false;
  try{return new URL(event.url).pathname==='/api/destinations/suggest'}catch{return false}
}
function isExpectedTelemetryAbort(event){
  if(event.error!=='net::ERR_ABORTED')return false;
  try{return new URL(event.url).pathname==='/api/telemetry'}catch{return false}
}

await mkdir(path.join(OUT,browserName),{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:exe});
const report={generated_at:new Date().toISOString(),browser:browserName,url:ROOT,entries:[],pass:true};

function overlap(a,b){return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))>0}
async function geometry(page,state,vp){return page.evaluate(({state,vp})=>{
  const rect=s=>{const e=document.querySelector(s);if(!e||e.hidden)return null;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||r.width===0||r.height===0)return null;return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}
  const hero=rect('.destination-hero'),search=rect('.destination-control'),shell=rect('.app-shell'),assistant=rect('#assistant-toggle'),origin=rect('.origin-bar'),map=rect('#map-shell'),suggestions=rect('#destination-suggestions'),status=rect('#destination-status');
  const visibleTargets=[...document.querySelectorAll('button,input,a')].map(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {e,r,cs}}).filter(x=>x.cs.display!=='none'&&x.cs.visibility!=='hidden'&&x.r.width>0&&x.r.height>0).map(x=>({id:x.e.id||'',tag:x.e.tagName,w:Math.round(x.r.width),h:Math.round(x.r.height)}));
  const heroRatio=hero&&shell?hero.width/shell.width:null;
  const searchInside=!!hero&&!!search&&search.left>=hero.left-1&&search.right<=hero.right+1&&search.top>=hero.top-1&&search.bottom<=hero.bottom+1;
  return {state,vp,overflow_x:document.documentElement.scrollWidth>innerWidth+1,scroll_width:document.documentElement.scrollWidth,inner_width:innerWidth,hero,search,shell,heroRatio,searchInside,assistant,origin,map,suggestions,status,minTarget:visibleTargets.length?Math.min(...visibleTargets.map(x=>Math.min(x.w,x.h))):0,targetFailures:visibleTargets.filter(x=>x.w<44||x.h<44),suggestionCount:document.querySelectorAll('#destination-suggestions [role="option"]').length,decisionVisible:!!rect('#decision'),mapVisible:!!map,assistantExpanded:document.querySelector('#assistant-toggle')?.getAttribute('aria-expanded')==='true',statusText:(document.querySelector('#destination-status')?.textContent||'').trim(),inputValue:document.querySelector('#destination')?.value||'',bodyView:document.body.dataset.view||''};
},{state,vp})}
function assess(g){
  const desktop=String(g.vp)==='1280'||String(g.vp)==='1440';
  const base=!g.overflow_x&&g.searchInside&&g.minTarget>=44&&g.targetFailures.length===0;
  const heroOk=!desktop||g.state==='resolved'||g.state==='map'||(g.heroRatio>=.52&&g.heroRatio<=.70);
  if(g.state==='initial')return base&&heroOk&&!g.mapVisible;
  if(g.state==='typing')return base&&heroOk&&g.inputValue==='San';
  if(g.state==='suggestions')return base&&heroOk&&!!g.suggestions&&g.suggestionCount>=1&&g.suggestionCount<=5;
  if(g.state==='resolved')return base&&g.decisionVisible&&g.bodyView==='resolved';
  if(g.state==='map')return base&&g.mapVisible&&g.decisionVisible;
  if(g.state==='assistant-open')return base&&g.assistantExpanded;
  if(g.state==='error')return base&&/No pudimos|no está disponible|Probá de nuevo/i.test(g.statusText);
  return false;
}

for(const [vpName,width,height,mobile] of viewports){
  for(const [themeName,storedTheme,colorScheme] of themes){
    const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,colorScheme});
    const page=await context.newPage();
    const errors=[];const requestFailures=[];
    page.on('console',m=>{if(m.type()==='error'){const loc=m.location();errors.push({kind:'console',text:m.text(),url:loc?.url||''})}});
    page.on('pageerror',e=>errors.push({kind:'pageerror',text:String(e),url:''}));
    page.on('requestfailed',r=>requestFailures.push({url:r.url(),error:r.failure()?.errorText||'request_failed'}));
    await page.addInitScript(t=>localStorage.setItem('voy-theme',t),storedTheme);
    await page.route('**/api/telemetry',r=>r.fulfill({status:204,body:''}));
    let failSuggest=false;
    await page.route('**/api/destinations/suggest',r=>failSuggest?r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'external_dependency_unavailable'})}):r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
    await page.route('**/api/destinations/resolve',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,result_class:'resolved',provider:'photon_georef_contextual',destination:{...suggestion,label:'San Martín'},territory_verified:true})}));
    await page.route('**/api/mobility/**',r=>r.fulfill({status:404,contentType:'application/json',body:'{}'}));
    await page.route('https://tile.openstreetmap.org/**',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from(pixel,'base64')}));
    await page.goto(ROOT,{waitUntil:'networkidle'});
    const capture=async(state)=>{
      const g=await geometry(page,state,vpName);
      const expectedMockedFailures=errors.filter(e=>isExpectedMockedSuggest503(e,state));
      const unexpectedErrors=errors.filter(e=>!isExpectedMockedSuggest503(e,state));
      const unexpectedNetworkFailures=requestFailures.filter(e=>!isExpectedTelemetryAbort(e));
      const file=`${vpName}__${themeName}__${state}.png`;
      await page.screenshot({path:path.join(OUT,browserName,file),fullPage:false});
      let recoverable=true;
      if(state==='error'){
        failSuggest=false;
        await page.locator('#destination').fill('');
        await page.waitForTimeout(30);
        await page.locator('#destination').fill('San');
        await page.waitForTimeout(300);
        recoverable=(await page.locator('#destination').isEnabled())&&(await page.locator('#destination-suggestions [role="option"]').count())>=1;
      }
      const errorContract=state!=='error'||(g.statusText===EXPECTED_ERROR_COPY&&expectedMockedFailures.length===1&&recoverable);
      const pass=assess(g)&&errorContract&&unexpectedErrors.length===0&&unexpectedNetworkFailures.length===0;
      report.entries.push({...g,theme:themeName,console_errors:[...errors],unexpected_errors:unexpectedErrors,network_failures:[...requestFailures],unexpected_network_failures:unexpectedNetworkFailures,recoverable,screenshot:file,pass});
      report.pass&&=pass;
    };
    await capture('initial');
    const input=page.locator('#destination');await input.fill('San');await capture('typing');await page.waitForTimeout(300);await capture('suggestions');
    const option=page.locator('#destination-suggestions [role="option"]').first();if(await option.count()){await option.click();await page.waitForTimeout(120)}await capture('resolved');await capture('map');
    await page.locator('#assistant-toggle').click();await page.waitForTimeout(40);await capture('assistant-open');
    if(await page.locator('#assistant-close').count())await page.locator('#assistant-close').click();
    await input.fill('');await page.waitForTimeout(30);failSuggest=true;await input.fill('Rosario');await page.waitForTimeout(300);await capture('error');
    await context.close();
  }
}
await browser.close();
await writeFile(REPORT,JSON.stringify(report,null,2)+'\n');
const failures=report.entries.filter(x=>!x.pass).map(x=>`${x.vp}/${x.theme}/${x.state}`);
console.log(JSON.stringify({browser:browserName,pass:report.pass,total:report.entries.length,failures},null,2));
process.exit(report.pass?0:2);
