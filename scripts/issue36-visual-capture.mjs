import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.VOY_BASE_URL || 'http://127.0.0.1:8787';
const out = process.env.VOY_EVIDENCE_DIR || 'test-results/issue36-visual';
const stage = process.env.VOY_QA_STAGE || 'visual';
const shots = path.join(out, 'screenshots');
fs.mkdirSync(shots, { recursive: true });
const terminal = {
  canonicalId:'santafe:landmark:terminal-omnibus',nombre:'Terminal de Ómnibus',aliases:['terminal'],verified:true,source:'authoritative',precision:'poi',lat:-31.643533,lon:-60.700503,address:'Belgrano 2910',verified_at:'2026-08-05',
  provenance:{status:'authoritative',issuer:'Municipalidad de Santa Fe',source_title:'Estación Terminal de Ómnibus de Santa Fe',source_url:'https://santafeciudad.gov.ar/terminal-de-colectivos/',license:'Información pública institucional; sin licencia de reutilización explícita',coordinate_method:'Dirección oficial municipal cruzada con geodato público gubernamental de la misma dirección',coordinate_source_url:'https://www.bcra.gob.ar/entidades-financieras-filiales-y-cajeros-filtros/?Provincia=SANTA+FE&Tipo=4&Tit=2&bco=AAA10'}
};
const transport={schema_version:2,city_id:'santafe',verified_at:'2026-08-05',landmarks:[terminal],bus_routes:[],bus_stops:[],bike_stations:[]};
const viewports=[['360x800',360,800],['390x844',390,844],['412x915',412,915],['430x932',430,932],['768x1024',768,1024],['1024x768',1024,768],['1280x800',1280,800],['1440x900',1440,900]];
const representative=new Set(['390x844','1440x900']);
const modes=['app','taxi','remis','walk','bike','bus'];
const records=[];
const browser=await chromium.launch({headless:true});

async function setup(page,{unverified=false}={}){
  await page.route('**/api/health*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,version:'V8.0.0',build_hash:process.env.GITHUB_SHA||'visual',features:{voice:true,auth:false}})}));
  await page.route('**/cities/santa-fe/transport.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(transport)}));
  await page.route('**/api/geocode?*',async route=>{
    const q=new URL(route.request().url()).searchParams.get('q')||'';
    const results=q.includes('Origen QA')?[{id:'qa:origin',name:'Plaza 25 de Mayo',display_name:'Plaza 25 de Mayo, Santa Fe',address:'Santa Fe',lat:-31.633,lon:-60.706}]:unverified?[{id:'qa:unverified',name:'Destino sin verificar',display_name:'Destino sin verificar',address:'Santa Fe',lat:-31.64,lon:-60.70}]:[];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results})});
  });
  await page.route('**/api/route',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,source:'osrm_route',distance_km:3.2,duration_min:10.5,geometry:[[-60.706,-31.633],[-60.7,-31.64],[-60.700503,-31.643533]]})}));
}
async function snap(page,name,meta={}){const file=`${name}.png`;await page.screenshot({path:path.join(shots,file),fullPage:true,animations:'disabled'});records.push({file,...meta,url:page.url()});}
async function goto(page){await page.goto(base,{waitUntil:'domcontentloaded'});await page.getByTestId('app-shell').waitFor();}
async function origin(page){const edit=page.getByTestId('origin-edit');if(await edit.count())await edit.click();await page.getByTestId('origin-input').fill('Origen QA');await page.getByTestId('origin-apply').click();await page.getByTestId('origin-edit').waitFor();}
async function destination(page){await page.getByTestId('destination-input').fill('Terminal');await page.getByTestId('destination-results').waitFor();await page.getByTestId('destination-result-verified').first().click();}
async function plan(page){await origin(page);await destination(page);await page.getByTestId('trip-sheet').waitFor();await page.waitForFunction(()=>document.querySelector('[data-testid="map-shell"]')?.getAttribute('data-map-state')!=='loading',null,{timeout:16000}).catch(()=>undefined);}

for(const [label,width,height] of viewports){for(const scheme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height},colorScheme:scheme,reducedMotion:'no-preference',serviceWorkers:'block'});const page=await context.newPage();await setup(page);await goto(page);
  await snap(page,`${label}-${scheme}-empty`,{viewport:label,scheme,state:'EMPTY_START'});
  if(representative.has(label)){
    await page.getByTestId('destination-input').fill('Terminal');await page.getByTestId('destination-results').waitFor();await snap(page,`${label}-${scheme}-search`,{viewport:label,scheme,state:'SEARCH_RESULTS'});
    await page.getByTestId('destination-result-verified').first().click();await snap(page,`${label}-${scheme}-destination`,{viewport:label,scheme,state:'DESTINATION_SELECTED'});
    await context.grantPermissions(['geolocation'],{origin:base});await context.setGeolocation({latitude:-31.633,longitude:-60.706,accuracy:18});await page.getByTestId('gps-button').click();await page.getByTestId('origin-edit').waitFor();await snap(page,`${label}-${scheme}-gps`,{viewport:label,scheme,state:'GPS_ORIGIN'});
    await origin(page);await page.getByTestId('trip-sheet').waitFor();await snap(page,`${label}-${scheme}-manual`,{viewport:label,scheme,state:'MANUAL_ORIGIN'});
  }else await plan(page);
  await snap(page,`${label}-${scheme}-decision`,{viewport:label,scheme,state:'DECISION_SHEET_APP'});
  if(representative.has(label)){
    for(const mode of modes){await page.locator(`[data-mode="${mode}"]`).click();if(mode==='bus')await page.getByTestId('provider-bus').waitFor();else await page.getByTestId('trip-sheet').waitFor();await snap(page,`${label}-${scheme}-mode-${mode}`,{viewport:label,scheme,state:`MODE_${mode.toUpperCase()}`});}
    await page.locator('[data-mode="app"]').click();await page.getByTestId('provider-uber').waitFor();await page.getByTestId('provider-uber').click();await page.getByTestId('external-confirmation').waitFor();await snap(page,`${label}-${scheme}-confirm`,{viewport:label,scheme,state:'EXTERNAL_CONFIRMATION'});await page.getByRole('button',{name:'Cancelar'}).click();
    const voice=page.getByTestId('voice-open');if(await voice.count()){await voice.click();await page.waitForTimeout(200);await snap(page,`${label}-${scheme}-voice`,{viewport:label,scheme,state:'VOICE_IF_ENABLED'});}
    await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));await page.getByTestId('offline-banner').waitFor();await snap(page,`${label}-${scheme}-offline`,{viewport:label,scheme,state:'OFFLINE'});
  }
  await context.close();
}}
for(const scheme of ['light','dark']){const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:scheme,serviceWorkers:'block'});const page=await context.newPage();await setup(page,{unverified:true});await goto(page);await page.getByTestId('destination-input').fill('No verificado');await page.getByTestId('destination-results').waitFor();await snap(page,`390x844-${scheme}-error`,{viewport:'390x844',scheme,state:'ERROR'});await context.close();}
for(const scheme of ['light','dark']){const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:scheme,serviceWorkers:'block'});for(const route of ['/privacy','/terms','/sources','/contact']){const page=await context.newPage();await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.getByTestId('legal-view').waitFor();await snap(page,`1440x900-${scheme}-legal-${route.slice(1)}`,{viewport:'1440x900',scheme,state:`LEGAL_${route.slice(1).toUpperCase()}`});await page.close();}await context.close();}
await browser.close();
fs.writeFileSync(path.join(out,'visual-index.json'),`${JSON.stringify({result:'PASS',stage,source_sha:process.env.GITHUB_SHA||null,viewports:viewports.map(v=>v[0]),themes:['light','dark'],screenshots:records,captured_at:new Date().toISOString()},null,2)}\n`);
