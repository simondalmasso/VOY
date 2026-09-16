import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile} from 'node:fs/promises';
import {acceptableResult,entityRelevant,territoryMatchesExpected,territoryMatchesAuthority} from './benchmark-evaluator.mjs';

const corpus=JSON.parse(await readFile('order056/corpus/destination-corpus-v2.json','utf8'));
const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const hintsFor=tc=>tc.explicit_geography&&tc.expected_top?[tc.expected_top.locality,tc.expected_top.province]:[];
const expectedSet=tc=>tc.acceptable_results?.length?tc.acceptable_results:(tc.expected_top?[tc.expected_top]:[]);
const candidateAcceptable=(tc,c)=>expectedSet(tc).some(e=>acceptableResult(tc.query,tc.query_class,c,e,hintsFor(tc)));

if(process.env.CHUNK){
  const [a,b]=process.env.CHUNK.split(':').map(Number);
  const {suggestDestinations}=await import('../src/worker.template.js');
  const rows=[];const old=console.log;console.log=()=>{};
  for(const tc of corpus.cases.slice(a,b)){
    const start=performance.now();let body=null,error=null,status=200;
    const o=tc.origin_context?{locality:tc.origin_context.locality,province:tc.origin_context.province,province_id:tc.origin_context.province_id,coordinates:{lat:tc.origin_context.lat,lon:tc.origin_context.lon}}:null;
    try{body=await suggestDestinations({query:tc.query,context:{search_scope:'local',...(o?{origin:o}:{})},session_token:`bench_${tc.id}_1234567890123456`});}
    catch(e){status=e.status||500;error=e.code||String(e.message)}
    const s=body?.suggestions||[];const top=s[0]??null;
    rows.push({
      id:tc.id,query:tc.query,query_class:tc.query_class,status,error,
      latency_ms:+(performance.now()-start).toFixed(2),candidate_count:s.length,
      top1_entity_relevant:top?entityRelevant(tc.query,tc.query_class,top,hintsFor(tc)):false,
      top1_territory_match:tc.expected_top&&top?territoryMatchesExpected(top,tc.expected_top):null,
      top1_match:tc.expected_top?candidateAcceptable(tc,top):null,
      top3_match:tc.expected_top?s.slice(0,3).some(x=>candidateAcceptable(tc,x)):null,
      top1_province:top?.province?.name??null,top1_locality:top?.locality?.name??null,
      fail_closed:tc.no_result_acceptable?s.length===0:null,
      suggestions:s.slice(0,5)
    });
  }
  console.log=old;process.stdout.write(JSON.stringify(rows));process.exit(0);
}

const chunks=[[0,46],[46,92],[92,137]],rows=[];
for(const [a,b] of chunks){
  const part=await new Promise((resolve,reject)=>{
    const p=spawn(process.execPath,[fileURLToPath(import.meta.url)],{env:{...process.env,CHUNK:`${a}:${b}`},stdio:['ignore','pipe','pipe']});
    let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
    p.on('close',code=>{if(code)return reject(new Error(err||`exit ${code}`));try{resolve(JSON.parse(out))}catch(e){reject(new Error(`${e}\n${out.slice(0,500)}\n${err}`))}})
  });
  rows.push(...part);
}

const localCases=corpus.cases.filter(x=>x.expected_top&&!x.explicit_geography&&!x.no_result_acceptable);
const explicitCases=corpus.cases.filter(x=>x.explicit_geography);
const neg=corpus.cases.filter(x=>x.no_result_acceptable),by=new Map(rows.map(r=>[r.id,r]));
const lr=localCases.map(x=>by.get(x.id)),er=explicitCases.map(x=>by.get(x.id)),nr=neg.map(x=>by.get(x.id));
const top1=lr.filter(x=>x?.top1_match).length/lr.length;
const top3=lr.filter(x=>x?.top3_match).length/lr.length;
const wrong=lr.filter((x,i)=>x?.top1_province&&fold(x.top1_province)!==fold(localCases[i].expected_top.province)).length/lr.length;
const ex=er.filter(x=>x?.top1_match).length/er.length;
const closed=nr.filter(x=>x?.fail_closed).length/nr.length;

const {reverseLocation}=await import('../src/worker.template.js');
const authorityCache=new Map();let authorityUnavailable=0,falseLocality=0,authorityChecks=0;
const allSuggestions=rows.flatMap(r=>r.suggestions.map((s,index)=>({row:r,s,index}))).filter(x=>Number.isFinite(x.s?.coordinates?.lat)&&Number.isFinite(x.s?.coordinates?.lon));
const queue=[...allSuggestions];const oldLog=console.log;console.log=()=>{};
async function authorityWorker(){
  while(queue.length){
    const item=queue.shift(),key=`${item.s.coordinates.lat.toFixed(5)},${item.s.coordinates.lon.toFixed(5)}`;
    let authority=authorityCache.get(key);
    if(authority===undefined){
      let resolved=null;
      for(let attempt=0;attempt<2&&!resolved;attempt++){
        try{resolved=(await reverseLocation(item.s.coordinates)).candidate}catch{if(attempt===0)await new Promise(r=>setTimeout(r,150))}
      }
      authority=resolved||null;authorityCache.set(key,authority);await new Promise(r=>setTimeout(r,35));
    }
    authorityChecks++;
    if(!authority){authorityUnavailable++;item.row.suggestions[item.index].authority_territory_check='unavailable';continue}
    const ok=territoryMatchesAuthority(item.s,authority);
    item.row.suggestions[item.index].authority_territory_check=ok?'match':'mismatch';
    item.row.suggestions[item.index].authority_territory={locality:authority.locality?.name??null,province:authority.province?.name??null,province_id:authority.province?.id??null};
    if(!ok)falseLocality++;
  }
}
await Promise.all([authorityWorker(),authorityWorker(),authorityWorker()]);console.log=oldLog;

const lat=rows.map(x=>x.latency_ms).sort((a,b)=>a-b),q=p=>lat[Math.floor((lat.length-1)*p)];
const metrics={
  local_intent_top1_relevance_pct:+(top1*100).toFixed(2),top3_acceptable_recall_pct:+(top3*100).toFixed(2),
  wrong_province_top1_rate_pct:+(wrong*100).toFixed(2),explicit_geography_respect_pct:+(ex*100).toFixed(2),
  false_locality_invention_count:falseLocality,false_locality_authority_checks:authorityChecks,false_locality_authority_unavailable_count:authorityUnavailable,
  no_result_fail_closed_pct:+(closed*100).toFixed(2),median_latency_ms:q(.5),p95_latency_ms:q(.95),
  http_success_pct:+(rows.filter(x=>x.status===200).length/rows.length*100).toFixed(2)
};
const g=corpus.quality_gates;
const gates={
  local_intent_top1_relevance:top1>=g.local_intent_top1_relevance_min,
  top3_acceptable_recall:top3>=g.top3_acceptable_recall_min,
  wrong_province_top1_rate:wrong<=g.wrong_province_top1_rate_max,
  explicit_geography_respect:ex>=g.explicit_geography_respect_min,
  false_locality_invention:falseLocality<=g.false_locality_invention_max&&authorityUnavailable===0&&authorityChecks===allSuggestions.length,
  no_result_fail_closed:closed>=g.no_result_fail_closed_min,
  median_latency:metrics.median_latency_ms<=600,p95_latency:metrics.p95_latency_ms<=1200
};
const out={benchmark:'ORDER056_FINAL_RESOLVER_LIVE_SEMANTIC_AND_TERRITORIAL',generated_at:new Date().toISOString(),corpus_id:corpus.corpus_id,corpus_sha256:corpus.corpus_sha256,case_count:corpus.case_count,provider:'photon_georef_contextual',evaluator:{entity_relevance:'query-token semantic/fuzzy match against display_primary; territory evaluated separately',false_locality_invention:'every emitted suggestion coordinate reverse-checked against official GeoRef; unavailable authority fails gate'},metrics,gates,quality_gate_pass:Object.values(gates).every(Boolean),rows};
await writeFile('order056/benchmarks/final-resolver-live.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({metrics,gates,quality_gate_pass:out.quality_gate_pass,failures:rows.filter(r=>(r.top1_match===false||r.fail_closed===false)).map(r=>({id:r.id,q:r.query,entity:r.top1_entity_relevant,territory:r.top1_territory_match,top:r.suggestions[0]?.display_primary??null,loc:r.top1_locality,p:r.top1_province,n:r.candidate_count})).slice(0,60),territory_mismatches:rows.flatMap(r=>r.suggestions.filter(s=>s.authority_territory_check==='mismatch').map(s=>({id:r.id,q:r.query,primary:s.display_primary,reported:s.display_secondary,authority:s.authority_territory}))).slice(0,60)},null,2));
