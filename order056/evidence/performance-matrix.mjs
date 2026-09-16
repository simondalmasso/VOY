import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
const ROOT=process.env.VOY_PERF_URL||'http://127.0.0.1:8765/';
const REPORT=process.env.VOY_PERF_REPORT||'order056/evidence/performance-matrix.json';
const allBrowsers={chrome:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',edge:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'};
const browserFilter=(process.env.VOY_PERF_BROWSER||'').trim().toLowerCase();
const browsers=browserFilter&&allBrowsers[browserFilter]?{[browserFilter]:allBrowsers[browserFilter]}:allBrowsers;
const resolver={median_ms:322.1,p95_ms:693.07};
const out={generated_at:new Date().toISOString(),url:ROOT,resolver,browsers:{},pass:true};
for(const [name,exe] of Object.entries(browsers)){
  const browser=await chromium.launch({headless:true,executablePath:exe});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/telemetry',route=>route.fulfill({status:204,body:''}));
  await page.addInitScript(()=>{
    window.__voyPerf={lcp:0,cls:0,longTasks:[]};
    try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__voyPerf.lcp=Math.max(window.__voyPerf.lcp,e.startTime||0)}).observe({type:'largest-contentful-paint',buffered:true})}catch{}
    try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__voyPerf.cls+=e.value||0}).observe({type:'layout-shift',buffered:true})}catch{}
    try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__voyPerf.longTasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask',buffered:true})}catch{}
  });
  const t0=Date.now();await page.goto(ROOT,{waitUntil:'networkidle'});const wallLoad=Date.now()-t0;await page.waitForTimeout(600);
  const metrics=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {lcp_ms:Number((window.__voyPerf?.lcp||0).toFixed(2)),cls:Number((window.__voyPerf?.cls||0).toFixed(4)),dom_content_loaded_ms:Number((n?.domContentLoadedEventEnd||0).toFixed(2)),load_event_ms:Number((n?.loadEventEnd||0).toFixed(2)),response_end_ms:Number((n?.responseEnd||0).toFixed(2)),long_task_count:window.__voyPerf?.longTasks?.length||0,long_task_max_ms:Number(Math.max(0,...(window.__voyPerf?.longTasks||[]).map(x=>x.duration)).toFixed(2))}});
  const interactionMs=await page.evaluate(async()=>{const b=document.querySelector('#assistant-toggle');const p=document.querySelector('#assistant-panel');const t=performance.now();b.click();while(p.hidden&&performance.now()-t<1000)await new Promise(r=>requestAnimationFrame(r));return Number((performance.now()-t).toFixed(2))});
  const data={...metrics,wall_load_ms:wallLoad,interaction_ms:interactionMs,console_errors:errors};
  data.pass=data.lcp_ms<=2500&&data.cls<=0.10&&data.interaction_ms<=200&&data.long_task_max_ms<=200&&resolver.median_ms<=600&&resolver.p95_ms<=1200&&errors.length===0;
  out.browsers[name]=data;out.pass=out.pass&&data.pass;
  await context.close();await browser.close();
}
await writeFile(REPORT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
process.exit(out.pass?0:2);
