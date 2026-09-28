const {spawnSync}=require('child_process');
const fs=require('fs');
const path=require('path');
const root='C:/GPT-SANDBOX/VOY-ORDER075-CANON';
const harness=path.join(root,'experiments/order075/evidence/order075-rc-check.mjs');
const mode=process.argv[2];
const count=Number(process.argv[3]);
if(!['follow','full'].includes(mode)||!count) process.exit(2);
const outfile=path.join(root,'experiments/order075/evidence',mode==='follow'?'canonical-follow-30x.jsonl':'canonical-full-10x.jsonl');
fs.writeFileSync(outfile,'');
for(let i=1;i<=count;i++){
 const env={...process.env,CHROMIUM_PATH:'C:/PROGRA~2/Microsoft/Edge/Application/msedge.exe',EVIDENCE_TAG:`canonical-${mode}-${String(i).padStart(2,'0')}`};
 if(mode==='follow') env.ONLY_CHECK='TRACKERVIEW_FIXTURE_REALTIME_FOLLOW';
 const t=Date.now();
 const r=spawnSync(process.execPath,[harness],{cwd:root,env,encoding:'utf8',maxBuffer:10*1024*1024});
 const out=(r.stdout||'')+(r.stderr||'');
 const pass=mode==='follow'?/ORDER075_RC_EVIDENCE pass=1 fail=0/.test(out):/ORDER075_RC_EVIDENCE pass=10 fail=0/.test(out);
 const build=(out.match(/BUILD_ID=([^\s]+)/)||[])[1]||null;
 const row={run:i,mode,pass,exit:r.status,build_id:build,duration_ms:Date.now()-t,tail:out.trim().split(/\r?\n/).slice(-14)};
 fs.appendFileSync(outfile,JSON.stringify(row)+'\n');
 console.log(`${mode.toUpperCase()}_RUN_${i}=${pass?'PASS':'FAIL'} build=${build} ms=${row.duration_ms}`);
 if(!pass||r.status!==0){ console.error(out); process.exit(1); }
}
console.log(`${mode.toUpperCase()}_SUMMARY=${count}/${count} PASS`);
