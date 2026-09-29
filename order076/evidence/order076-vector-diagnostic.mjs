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
assert.equal(manifest.source_commit,expectedSha);
const outDir=path.resolve(process.env.EVIDENCE_DIR||path.join(process.cwd(),'vector-diagnostic'));
await mkdir(outDir,{recursive:true});

function exe(){
  const c=process.env.BROWSER_PATH;
  if(c&&existsSync(c))return c;
  for(const p of ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','/usr/bin/google-chrome','/usr/bin/google-chrome-stable'])if(existsSync(p))return p;
  throw new Error('browser_missing');
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');let rel=decodeURIComponent(u.pathname);if(rel==='/'||rel==='')rel='/index.html';
  try{const target=path.resolve(distRoot,'.'+rel);const s=await stat(target);if(!s.isFile())throw 0;const b=await readFile(target);res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(b);}
  catch{res.writeHead(404);res.end('not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:exe(),headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
const page=await context.newPage();
const failed=[],responses=[],consoleErrors=[];
page.on('requestfailed',r=>{if(r.url().includes('openfreemap'))failed.push({url:r.url(),failure:r.failure()})});
page.on('response',r=>{if(r.url().includes('openfreemap'))responses.push({url:r.url(),status:r.status()})});
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});

let nodeProbe={ok:false,status:0,error:null};
try{const r=await fetch('https://tiles.openfreemap.org/styles/liberty');nodeProbe={ok:r.ok,status:r.status,error:null};}catch(e){nodeProbe.error=String(e)}

await page.goto(base+'?fixture=realtime&fixtureTickMs=1200',{waitUntil:'load',timeout:45000});
await page.waitForFunction(()=>window.__voyFixtureEngine&&window.__voyFixtureEngine.tick>=2,null,{timeout:15000});
const webgl2=await page.evaluate(()=>Boolean(document.createElement('canvas').getContext('webgl2')));
let browserProbe={ok:false,status:0,error:null};
try{browserProbe=await page.evaluate(async()=>{try{const r=await fetch('https://tiles.openfreemap.org/styles/liberty');return{ok:r.ok,status:r.status,error:null}}catch(e){return{ok:false,status:0,error:String(e)}}});}catch(e){browserProbe.error=String(e)}
await page.waitForTimeout(12000);
const state=await page.evaluate(()=>({ready:window.__voyDebug?.substrate?.maplibreReady===true,state:window.__voyDebug?.substrate?.state?.()||null}));
let classification='FAIL_UNEXPLAINED';
if(state.ready)classification='PASS';
else if(!webgl2)classification='BLOCKED_HOSTED_WEBGL2';
else if(!nodeProbe.ok||!browserProbe.ok||failed.length)classification='BLOCKED_PROVIDER_NETWORK';
else classification='BLOCKED_HOSTED_VECTOR_INIT';

const report={source_commit:expectedSha,build_id:manifest.build_id,webgl2,nodeProbe,browserProbe,state,failed,responses:responses.slice(-40),consoleErrors:consoleErrors.slice(-40),classification};
await writeFile(path.join(outDir,'order076-vector-diagnostic.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
await context.close();await browser.close();await new Promise(r=>server.close(r));
if(classification==='FAIL_UNEXPLAINED')process.exit(2);
