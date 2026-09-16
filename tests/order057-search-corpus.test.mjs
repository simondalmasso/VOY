import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rankDestinationCandidates,QueryNormalizer,ContextPlanner} from '../src/worker.template.js';
const corpus=JSON.parse(readFileSync(new URL('./order057-search-corpus.json',import.meta.url),'utf8'));
const byId=new Map(corpus.candidates.map(c=>[c.candidate_id,c]));
const pct=(a,b)=>b?100*a/b:100;
function evaluate(){
 const m={n:corpus.cases.length,top1:0,top3:0,explicitN:0,explicit:0,localN:0,local:0,t1N:0,t1:0,t2N:0,t2:0,accentN:0,accent:0,noN:0,no:0,ownerN:0,owner:0,failures:[]};
 for(const row of corpus.cases){
  if(row.stratum==='no_result'){m.noN++;const pool=(row.candidate_pool??[]).map(id=>byId.get(id)).filter(Boolean);const ranked=rankDestinationCandidates(pool,{query:row.query,origin:row.origin,explicit_geography:null,search_scope:'national'});if(ranked.length===0){m.no++;m.top1++;m.top3++;}else m.failures.push(row.id);continue;}
  const expected=byId.get(row.expected);assert.ok(expected,`missing ${row.expected}`);let pool=corpus.candidates;if(row.ambiguous_group!==undefined)pool=corpus.candidates.filter(c=>c.candidate_id.startsWith(`amb${row.ambiguous_group}_`));
  const explicit=row.explicit?{locality:{name:expected.locality.name,province_id:expected.province.id},province:{id:expected.province.id,name:expected.province.name}}:null;const context={query:row.query,origin:row.origin,explicit_geography:explicit,search_scope:row.origin?'local':'national'};QueryNormalizer(row.query);ContextPlanner(context);
  const ids=rankDestinationCandidates(pool,context).map(x=>x.candidate_id),pos=ids.indexOf(row.expected),t1=pos===0,t3=pos>=0&&pos<3;if(t1)m.top1++;if(t3)m.top3++;if(row.explicit){m.explicitN++;if(t1)m.explicit++;}if(row.stratum==='local_context'){m.localN++;if(t1)m.local++;}if(row.stratum==='typo1'){m.t1N++;if(t3)m.t1++;}if(row.stratum==='typo2'){m.t2N++;if(t3)m.t2++;}if(row.stratum==='accentless'){m.accentN++;if(t1)m.accent++;}if(row.stratum==='owner_seed'){m.ownerN++;if(t1)m.owner++;}if(!t3)m.failures.push(row.id);
 }
 return {corpus_n:m.n,owner_seed_pct:100*corpus.owner_seed_count/m.n,top1:pct(m.top1,m.n),top3:pct(m.top3,m.n),explicit:pct(m.explicit,m.explicitN),local:pct(m.local,m.localN),typo1:pct(m.t1,m.t1N),typo2:pct(m.t2,m.t2N),accent:pct(m.accent,m.accentN),noResult:pct(m.no,m.noN),owner:pct(m.owner,m.ownerN),failures:m.failures};
}
test('ORDER057-R2 frozen generalized Argentina search corpus meets binding gates',()=>{const r=evaluate();assert.ok(r.corpus_n>=250);assert.ok(r.owner_seed_pct<1);assert.ok(r.top1>=92,JSON.stringify(r));assert.ok(r.top3>=98,JSON.stringify(r));assert.equal(r.explicit,100);assert.ok(r.local>=95);assert.ok(r.typo1>=98);assert.ok(r.typo2>=95);assert.equal(r.accent,100);assert.equal(r.noResult,100);assert.equal(r.owner,100);});
test('ORDER057-R2 production source contains zero benchmark-query hardcodes',()=>{const source=readFileSync(new URL('../src/worker.template.js',import.meta.url),'utf8').toLowerCase();for(const row of corpus.cases.filter(x=>x.stratum==='owner_seed'))assert.equal(source.includes(row.query.toLowerCase()),false,row.query);});
