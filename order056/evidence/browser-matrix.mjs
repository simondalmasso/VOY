import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT='http://127.0.0.1:8765/';
const OUT=process.env.VOY_BROWSER_OUT||'order056/evidence/rendered/final-local';
const allBrowsers={
  chrome:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  edge:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
};
const browserFilter=(process.env.VOY_BROWSER||'').trim().toLowerCase();
const browsers=browserFilter&&allBrowsers[browserFilter]?{[browserFilter]:allBrowsers[browserFilter]}:allBrowsers;
const viewports=[
  {name:'320x844',width:320,height:844,mobile:true},
  {name:'360x844',width:360,height:844,mobile:true},
  {name:'390x844',width:390,height:844,mobile:true},
  {name:'412x844',width:412,height:844,mobile:true},
  {name:'430x844',width:430,height:844,mobile:true},
  {name:'844x390',width:844,height:390,mobile:true},
  {name:'1280x900',width:1280,height:900,mobile:false},
  {name:'1440x900',width:1440,height:900,mobile:false},
];
const forbidden=['Resolver','Origen manual (no se persiste)','Borrar ubicación elegida','Qué podés verificar','Sin inventar lo que falta'];
const stubTelemetry=page=>page.route('**/api/telemetry',route=>route.fulfill({status:204,body:''}));
const fixture={ok:true,provider:'photon_georef_contextual',result_class:'suggestions',suggestions:[{
  candidate_id:'photon:W:1',candidate_ref:'photon:W:1',provider:'photon_georef_contextual',display_primary:'San Martín',display_secondary:'Santa Fe · Santa Fe',coordinates:{lat:-31.64,lon:-60.70},distance_meters:850,provider_rank:0,provider_types:['residential'],confidence_class:'official_offline_territory',attribution_requirement:'OpenStreetMap contributors',locality:{id:'',name:'Santa Fe',slug:'santa-fe'},province:{id:'82',name:'Santa Fe'},territory_verified:true,territory_verification:'full',territory_authority:'pinned_official_georef_snapshot',coverage:'T1_OFFICIAL_HANDOFF',integration_slug:null
}],requires_national_expansion:false,fallback_stage:'local'};

await mkdir(OUT,{recursive:true});
const report={generated_at:new Date().toISOString(),url:ROOT,browsers:{},global_pass:true};

async function inspect(page){
  const data=await page.evaluate((forbidden)=>{
    const text=document.body?.innerText||'';
    const vv={w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight};
    const visible=sel=>{const el=document.querySelector(sel);if(!el)return false;const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
    const targets=[...document.querySelectorAll('button,input,a')].filter(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}).map(el=>({tag:el.tagName,id:el.id||'',cls:el.className||'',w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)}));
    return {
      title:document.title,
      text_len:text.length,
      forbidden_present:forbidden.filter(x=>text.includes(x)),
      overflow_x:vv.scrollW>vv.w+1,
      viewport:vv,
      brand:visible('.brand-lockup')&&visible('.brand-mark')&&visible('.brand-wordmark'),
      destination:visible('#destination'),
      assistant:visible('#voy-assistant')&&visible('#assistant-toggle'),
      map_initial_hidden:document.querySelector('#map-shell')?.hidden===true,
      min_touch_target_px:targets.length?Math.min(...targets.map(x=>Math.min(x.w,x.h))):0,
      targets
    };
  },forbidden);
  data.pass=data.title.includes('VOY')&&data.text_len>60&&data.forbidden_present.length===0&&!data.overflow_x&&data.brand&&data.destination&&data.assistant&&data.map_initial_hidden;
  return data;
}

async function validatePWA(browserName, browser){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();await stubTelemetry(page);
  const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(ROOT,{waitUntil:'networkidle'});
  await page.waitForTimeout(500);
  let ready=false,scope=null,manifestOk=false,iconsOk=false,offlineReload=false;
  try{
    const pwa=await page.evaluate(async()=>{
      const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,rej)=>setTimeout(()=>rej(new Error('sw_timeout')),5000))]);
      const manifestHref=document.querySelector('link[rel="manifest"]')?.href;
      const m=manifestHref?await fetch(manifestHref):null;
      let icons=[];if(m?.ok){const j=await m.json();icons=j.icons||[]}
      const iconChecks=[];for(const i of icons){try{const r=await fetch(i.src);iconChecks.push(r.ok)}catch{iconChecks.push(false)}}
      return {ready:true,scope:reg.scope,manifestOk:!!m?.ok,iconsOk:iconChecks.length>0&&iconChecks.every(Boolean)};
    });
    ready=pwa.ready;scope=pwa.scope;manifestOk=pwa.manifestOk;iconsOk=pwa.iconsOk;
    await page.reload({waitUntil:'networkidle'});
    await context.setOffline(true);
    try{await page.reload({waitUntil:'domcontentloaded',timeout:5000});offlineReload=(await page.locator('#destination').count())===1}catch{}
    await context.setOffline(false);
  }catch(e){errors.push(`PWA:${e.message}`)}
  await page.screenshot({path:path.join(OUT,browserName,'pwa-390x844.png'),fullPage:false});
  await context.close();
  return {ready,scope,manifestOk,iconsOk,offlineReload,console_errors:errors,pass:ready&&manifestOk&&iconsOk&&offlineReload&&errors.length===0};
}

async function interactionChecks(browserName,browser){
  const keyboardContext=await browser.newContext({viewport:{width:390,height:844}});
  const keyboardPage=await keyboardContext.newPage();await stubTelemetry(keyboardPage);
  const keyboardErrors=[];keyboardPage.on('console',m=>{if(m.type()==='error')keyboardErrors.push(m.text())});keyboardPage.on('pageerror',e=>keyboardErrors.push(String(e)));
  await keyboardPage.route('**/api/destinations/suggest',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
  await keyboardPage.route('**/api/destinations/resolve',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,result_class:'resolved',provider:'photon_georef_contextual',destination:{...fixture.suggestions[0],label:'San Martín'},territory_verified:true,mobility_decision:{state:'handoff',destination:{...fixture.suggestions[0],label:'San Martín'},integration_slug:null,coverage:'T0_TERRITORY_ONLY',available_modes:[],source_class:'handoff',freshness:{state:'unknown'},provenance:[],facts:[],handoffs:[],next_actions:[]}})}));
  await keyboardPage.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlIh8sAAAAASUVORK5CYII=','base64')}));
  await keyboardPage.goto(ROOT,{waitUntil:'networkidle'});

  const focusSnapshot=()=>keyboardPage.evaluate(()=>{
    const e=document.activeElement;
    if(!e)return null;
    const r=e.getBoundingClientRect(),s=getComputedStyle(e),href=e.getAttribute?.('href')||'';
    const key=e.id||(e.classList?.contains('brand-lockup')?'brand-lockup':(href?new URL(href,location.href).pathname:e.tagName));
    return {key,tag:e.tagName,id:e.id||'',text:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,80),href:href?new URL(href,location.href).pathname:null,focusVisible:e.matches(':focus-visible'),outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,w:Math.round(r.width),h:Math.round(r.height)};
  });
  const tabSequence=[];let wrapped=false;
  for(let i=0;i<24;i++){
    await keyboardPage.keyboard.press('Tab');
    const f=await focusSnapshot();if(!f)continue;
    if(tabSequence.length>1&&f.key===tabSequence[0].key){wrapped=true;break}
    tabSequence.push(f);
  }
  const expectedTabOrder=['brand-lockup','theme','destination','use-location','manual-origin','assistant-toggle','/coverage.html','/privacy.html','/terms.html','/sources.html'];
  const tabIndexes=expectedTabOrder.map(key=>tabSequence.findIndex(x=>x.key===key));
  const allMeaningfulReachable=tabIndexes.every(i=>i>=0);
  const saneTabOrder=allMeaningfulReachable&&tabIndexes.every((v,i)=>i===0||v>tabIndexes[i-1]);
  const allSequentialFocusVisible=tabSequence.filter(x=>expectedTabOrder.includes(x.key)).every(x=>x.focusVisible&&x.outlineStyle!=='none'&&parseFloat(x.outlineWidth||'0')>0);

  async function tabUntilId(id,max=24){
    for(let i=0;i<max;i++){
      if(await keyboardPage.evaluate(id=>document.activeElement?.id===id,id))return true;
      await keyboardPage.keyboard.press('Tab');
    }
    return keyboardPage.evaluate(id=>document.activeElement?.id===id,id);
  }
  const destinationReached=await tabUntilId('destination');
  const input=keyboardPage.locator('#destination');
  const keyboardFocused=destinationReached&&await keyboardPage.evaluate(()=>document.activeElement?.id==='destination');
  const keyboardFocusVisible=await keyboardPage.evaluate(()=>{const e=document.activeElement;if(!e)return false;const s=getComputedStyle(e);return e.id==='destination'&&e.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth||'0')>0});
  await keyboardPage.screenshot({path:path.join(OUT,browserName,'keyboard-focus.png'),fullPage:false});
  await input.fill('San Martín');await keyboardPage.waitForTimeout(350);
  const suggestionCount=await keyboardPage.locator('#destination-suggestions [role="option"]').count();
  const ariaBefore=await input.getAttribute('aria-activedescendant');
  await keyboardPage.keyboard.press('ArrowDown');
  const ariaActive=await input.getAttribute('aria-activedescendant');
  const arrowChangedActive=Boolean(ariaActive)&&ariaActive!==ariaBefore;
  const activeOptionValid=Boolean(ariaActive)&&await keyboardPage.evaluate(id=>{const el=document.getElementById(id);return !!el&&el.getAttribute('role')==='option'&&el.getAttribute('aria-selected')==='true'&&el.classList.contains('active')},ariaActive);
  await keyboardPage.screenshot({path:path.join(OUT,browserName,'keyboard-suggestion.png'),fullPage:false});
  await keyboardPage.keyboard.press('Enter');await keyboardPage.waitForTimeout(180);
  const enterSelectionWorks=await keyboardPage.evaluate(()=>{
    const decision=document.querySelector('#decision'),title=document.querySelector('#result-title'),input=document.querySelector('#destination');
    return !!decision&&!decision.hidden&&title?.textContent?.trim()==='San Martín'&&input?.value==='San Martín'&&document.querySelector('#destination-suggestions')?.hidden===true;
  });

  const assistantReachable=await tabUntilId('assistant-toggle');
  const assistantToggle=keyboardPage.locator('#assistant-toggle');
  const assistantFocusVisible=assistantReachable&&await keyboardPage.evaluate(()=>{const e=document.activeElement,s=e?getComputedStyle(e):null;return e?.id==='assistant-toggle'&&e.matches(':focus-visible')&&s?.outlineStyle!=='none'&&parseFloat(s?.outlineWidth||'0')>0});
  await keyboardPage.keyboard.press('Enter');await keyboardPage.waitForTimeout(80);
  const assistantOpenedKeyboard=await assistantToggle.getAttribute('aria-expanded')==='true';
  await keyboardPage.keyboard.press('Tab');
  const assistantCloseFocused=await keyboardPage.evaluate(()=>document.activeElement?.id==='assistant-close'&&document.activeElement.matches(':focus-visible'));
  if(assistantCloseFocused)await keyboardPage.keyboard.press('Enter');
  await keyboardPage.waitForTimeout(80);
  const assistantClosedKeyboard=await assistantToggle.getAttribute('aria-expanded')==='false';
  await keyboardPage.screenshot({path:path.join(OUT,browserName,'keyboard-assistant.png'),fullPage:false});
  await keyboardContext.close();

  const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const touchPage=await touchContext.newPage();await stubTelemetry(touchPage);
  const touchErrors=[];touchPage.on('console',m=>{if(m.type()==='error')touchErrors.push(m.text())});touchPage.on('pageerror',e=>touchErrors.push(String(e)));
  await touchPage.goto(ROOT,{waitUntil:'networkidle'});
  const toggle=touchPage.locator('#assistant-toggle');await toggle.tap();await touchPage.waitForTimeout(80);
  const assistantExpanded=await toggle.getAttribute('aria-expanded')==='true';
  const reducedMotionEffective=await touchPage.evaluate(()=>{
    const parse=s=>Math.max(0,...String(s||'0s').split(',').map(x=>x.trim()).map(x=>x.endsWith('ms')?parseFloat(x)/1000:parseFloat(x)||0));
    const els=[document.querySelector('#assistant-toggle'),document.querySelector('#assistant-panel')].filter(Boolean);
    return els.every(el=>{const s=getComputedStyle(el);return parse(s.transitionDuration)<=0.02&&parse(s.animationDuration)<=0.02});
  });
  const touchTargets=await touchPage.evaluate(()=>[...document.querySelectorAll('button,input,a')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}).map(el=>{const r=el.getBoundingClientRect(),w=Math.round(el.offsetWidth),h=Math.round(el.offsetHeight);return {tag:el.tagName,id:el.id||'',cls:String(el.className||''),href:el.getAttribute('href')||null,w,h,min:Math.min(w,h),visual_w:Math.round(r.width),visual_h:Math.round(r.height)}}));
  const tooSmall=touchTargets.filter(x=>x.w<44||x.h<44);
  await touchPage.locator('#assistant-close').tap();await touchPage.waitForTimeout(80);
  const assistantClosedTouch=await toggle.getAttribute('aria-expanded')==='false';
  await touchPage.screenshot({path:path.join(OUT,browserName,'interaction-touch-reduced.png'),fullPage:false});
  await touchContext.close();
  const errors=[...keyboardErrors,...touchErrors];
  const pass=suggestionCount>=1&&wrapped&&allMeaningfulReachable&&saneTabOrder&&allSequentialFocusVisible&&keyboardFocused&&keyboardFocusVisible&&arrowChangedActive&&activeOptionValid&&enterSelectionWorks&&assistantReachable&&assistantFocusVisible&&assistantOpenedKeyboard&&assistantCloseFocused&&assistantClosedKeyboard&&assistantExpanded&&assistantClosedTouch&&reducedMotionEffective&&tooSmall.length===0&&errors.length===0;
  return {suggestionCount,keyboardFocused,keyboardFocusVisible,ariaActive,assistantExpanded,reducedMotionEffective,tooSmall,console_errors:errors,tabSequence,expectedTabOrder,tabIndexes,wrapped,allMeaningfulReachable,saneTabOrder,allSequentialFocusVisible,arrowChangedActive,activeOptionValid,enterSelectionWorks,assistantReachable,assistantFocusVisible,assistantOpenedKeyboard,assistantCloseFocused,assistantClosedKeyboard,assistantClosedTouch,touchTargets,pass};
}

async function themeCheck(browserName,browser,theme){
  const context=await browser.newContext({viewport:{width:1280,height:900},colorScheme:theme==='dark'?'dark':'light'});
  const page=await context.newPage();await stubTelemetry(page);const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(t=>localStorage.setItem('voy-theme',t),theme);
  await page.goto(ROOT,{waitUntil:'networkidle'});
  const data=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,bg:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.body).color,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  await page.screenshot({path:path.join(OUT,browserName,`theme-${theme}.png`),fullPage:false});
  await context.close();
  return {...data,console_errors:errors,pass:data.theme===theme&&!data.overflow&&errors.length===0};
}

async function forcedDark(browserName,exe){
  const browser=await chromium.launch({headless:true,executablePath:exe,args:['--force-dark-mode','--enable-features=WebContentsForceDark']});
  const context=await browser.newContext({viewport:{width:1280,height:900},colorScheme:'dark'});const page=await context.newPage();await stubTelemetry(page);const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>localStorage.setItem('voy-theme','system'));
  await page.goto(ROOT,{waitUntil:'networkidle'});
  const data=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,bg:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.body).color,overflow:document.documentElement.scrollWidth>innerWidth+1,scheme:matchMedia('(prefers-color-scheme: dark)').matches}));
  await page.screenshot({path:path.join(OUT,browserName,'forced-dark.png'),fullPage:false});
  await context.close();await browser.close();
  return {...data,console_errors:errors,pass:data.scheme&&!data.overflow&&errors.length===0};
}

for(const [browserName,exe] of Object.entries(browsers)){
  await mkdir(path.join(OUT,browserName),{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:exe});
  const bReport={executable:exe,viewports:{},pass:true};
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.mobile,isMobile:vp.mobile});
    const page=await context.newPage();await stubTelemetry(page);const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(ROOT,{waitUntil:'networkidle'});
    const data=await inspect(page);data.console_errors=errors;data.pass=data.pass&&errors.length===0;
    await page.screenshot({path:path.join(OUT,browserName,`${vp.name}.png`),fullPage:false});
    bReport.viewports[vp.name]=data;bReport.pass=bReport.pass&&data.pass;await context.close();
  }
  bReport.light=await themeCheck(browserName,browser,'light');
  bReport.dark=await themeCheck(browserName,browser,'dark');
  bReport.interactions=await interactionChecks(browserName,browser);
  bReport.pwa=await validatePWA(browserName,browser);
  bReport.pass=bReport.pass&&bReport.light.pass&&bReport.dark.pass&&bReport.interactions.pass&&bReport.pwa.pass;
  await browser.close();
  bReport.forced_dark=await forcedDark(browserName,exe);bReport.pass=bReport.pass&&bReport.forced_dark.pass;
  report.browsers[browserName]=bReport;report.global_pass=report.global_pass&&bReport.pass;
}
await writeFile(process.env.VOY_BROWSER_REPORT||`order056/evidence/browser-matrix${browserFilter?`-${browserFilter}`:''}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({global_pass:report.global_pass,browsers:Object.fromEntries(Object.entries(report.browsers).map(([k,v])=>[k,{pass:v.pass,failed_viewports:Object.entries(v.viewports).filter(([,x])=>!x.pass).map(([n])=>n),light:v.light.pass,dark:v.dark.pass,forced_dark:v.forced_dark.pass,interactions:v.interactions.pass,pwa:v.pwa.pass}]))},null,2));
process.exit(report.global_pass?0:2);
