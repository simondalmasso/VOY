const {spawnSync}=require('child_process');
const fs=require('fs');
const path=require('path');
const root='C:/GPT-SANDBOX/VOY-ORDER075-CANON';
const ext='C:/GPT-SANDBOX/VOY-GLM-FINALIZE/experiments/glm53/evidence/aud-extra-gates-final.mjs';
const outDir=path.join(root,'experiments/order075/evidence');
fs.mkdirSync(outDir,{recursive:true});
const cases=[
 ['real-vector',{AUD_GATE:'real-vector',REAL_VECTOR:'1'}],
 ['reduced-motion',{AUD_GATE:'reduced-motion'}],
 ['webgl2-unavailable',{AUD_GATE:'webgl2-unavailable'}],
 ['context-loss',{AUD_GATE:'context-loss'}],
];
for(const [name,extra] of cases){
 const env={...process.env,SOURCE_DIR:root,CHROMIUM_PATH:'C:/PROGRA~2/Microsoft/Edge/Application/msedge.exe',EVIDENCE_TAG:'canonical-'+name,...extra};
 const r=spawnSync(process.execPath,[ext],{cwd:root,env,encoding:'utf8',maxBuffer:10*1024*1024});
 const output=(r.stdout||'')+(r.stderr||'');
 const pass=output.includes(name+'=PASS') && !output.includes(name+'=FAIL') && r.status===0;
 const src=path.join(root,'experiments/glm53/evidence/order075-alt-evidence.json');
 if(fs.existsSync(src)) fs.copyFileSync(src,path.join(outDir,'canonical-'+name+'.json'));
 fs.appendFileSync(path.join(outDir,'canonical-extra-gates.jsonl'),JSON.stringify({name,pass,exit:r.status,output:output.trim().split(/\r?\n/).slice(-20)})+'\n');
 console.log(name.toUpperCase()+'='+(pass?'PASS':'FAIL'));
 if(!pass){ console.error(output); process.exit(1); }
}
console.log('EXTRA_GATES_SUMMARY=4/4 PASS');
