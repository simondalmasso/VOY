import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  QueryNormalizer,
  ContextPlanner,
  dedupeDestinationCandidates,
  rankDestinationCandidates,
  suggestDestinations
} from '../src/worker.template.js';

const jsonResp=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
const photon=(features)=>jsonResp({features});
const origin=(locality='Santa Fe',province='Santa Fe',province_id='82',lat=-31.6333,lon=-60.7)=>({locality,province,province_id,coordinates:{lat,lon}});
const feature=(name,city,state,lon,lat,id,type='stadium')=>({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{name,city,state,osm_type:'N',osm_id:id,osm_value:type}});

test('QueryNormalizer preserves original while normalizing Unicode, spacing and generic POI semantics',()=>{
  const q=QueryNormalizer('  CANCHA   San Martín!!!  ');
  assert.equal(q.original,'CANCHA San Martín!!!');
  assert.equal(q.folded,'cancha san martin');
  assert.ok(q.category_hints.includes('stadium'));
  assert.ok(q.rewrite_variants.some(v=>/estadio/i.test(v)));
  assert.ok(!q.rewrite_variants.some(v=>/colon|puente colgante/i.test(v)));
});

test('ContextPlanner always keeps original and treats local context as bounded soft expansion',()=>{
  const context={query:'Estadio Central',origin:origin(),explicit_geography:null,search_scope:'local'};
  const plan=ContextPlanner(context);
  assert.equal(plan[0].kind,'original');
  assert.equal(plan[0].query,'Estadio Central');
  assert.ok(plan.some(v=>v.kind==='local_context'&&/Santa Fe/i.test(v.query)));
  assert.ok(plan.length<=3,'ContextPlanner must cap upstream variants at 3');
});
test('ContextPlanner explicit geography overrides local expansion',()=>{
  const context={query:'Estadio Central, Córdoba',origin:origin(),explicit_geography:{province:{id:'14',name:'Córdoba'},locality:null},search_scope:'local'};
  const plan=ContextPlanner(context);
  assert.equal(plan[0].query,'Estadio Central, Córdoba');
  assert.equal(plan.some(v=>v.kind==='local_context'),false);
  assert.ok(plan.every(v=>!/Santa Fe/i.test(v.query)));
});

test('candidate dedupe is deterministic across multi-query retrieval',()=>{
  const a={candidate_ref:'photon:N:1',display_primary:'Estadio Central',provider_rank:1,rank_score:100};
  const b={...a,provider_rank:0,rank_score:200};
  const c={candidate_ref:'photon:N:2',display_primary:'Estadio Norte',provider_rank:2,rank_score:80};
  const rows=dedupeDestinationCandidates([a,c,b]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].candidate_ref,'photon:N:1');
  assert.equal(rows[0].rank_score,200);
});

test('deterministic ranker tolerates typo and uses generic category compatibility',()=>{
  const context={query:'cancha san mrtin',origin:origin(),explicit_geography:null,search_scope:'local'};
  const candidates=[
    {candidate_id:'1',candidate_ref:'1',display_primary:'Plaza San Martín',display_secondary:'Santa Fe',locality:{name:'Santa Fe'},province:{id:'82',name:'Santa Fe'},coordinates:{lat:-31.634,lon:-60.701},provider_types:['park'],provider_rank:0},
    {candidate_id:'2',candidate_ref:'2',display_primary:'Estadio San Martín',display_secondary:'Santa Fe',locality:{name:'Santa Fe'},province:{id:'82',name:'Santa Fe'},coordinates:{lat:-31.635,lon:-60.702},provider_types:['stadium'],provider_rank:1}
  ];
  const ranked=rankDestinationCandidates(candidates,context);
  assert.equal(ranked[0].candidate_ref,'2');
});
test('multi-query retrieval merges local contextual candidate without hard filtering distant candidates',async()=>{
  const seen=[];
  const f=async u=>{
    const url=new URL(String(u)); seen.push(url);
    const q=url.searchParams.get('q')||'';
    if(/Santa Fe Santa Fe/i.test(q)) return photon([feature('Estadio Central','Santa Fe','Santa Fe',-60.700,-31.633,11)]);
    return photon([feature('Estadio Central','Córdoba','Córdoba',-64.183,-31.417,12)]);
  };
  const r=await suggestDestinations({query:'Estadio Central',session_token:'abcdefghijklmnop',context:{origin:origin(),search_scope:'local'}},f);
  assert.ok(seen.length>=2,'expected bounded multi-query retrieval');
  assert.equal(seen.some(u=>u.searchParams.has('bbox')),false,'local context must not become a hard bbox filter');
  assert.equal(r.suggestions[0]?.locality?.name,'Santa Fe');
  assert.ok(r.suggestions.some(s=>s.province?.id==='14'),'far plausible result should remain available');
  assert.ok(r.suggestions.length<=5);
});

test('explicit remote geography outranks local origin during multi-query retrieval',async()=>{
  const f=async()=>photon([
    feature('Estadio Central','Santa Fe','Santa Fe',-60.700,-31.633,21),
    feature('Estadio Central','Córdoba','Córdoba',-64.183,-31.417,22)
  ]);
  const r=await suggestDestinations({query:'Estadio Central, Córdoba',session_token:'abcdefghijklmnop',context:{origin:origin(),search_scope:'local'}},f);
  assert.equal(r.suggestions[0]?.province?.id,'14');
});

test('production search source contains no owner-query or POI-specific hardcoded patches',()=>{
  const source=readFileSync(new URL('../src/worker.template.js',import.meta.url),'utf8');
  for(const forbidden of ['cancha de colon','puente colgante','aeropuerto de sauce viejo']) assert.equal(source.toLowerCase().includes(forbidden),false,forbidden);
});

test('semantic alias retrieval remains active even when local-context expansion exists',async()=>{
  const seen=[];
  const f=async u=>{
    const q=new URL(String(u)).searchParams.get('q')||''; seen.push(q);
    if(/estadio/i.test(q)) return photon([feature('Estadio Atlántico','Santa Fe','Santa Fe',-60.701,-31.634,31,'stadium')]);
    return photon([]);
  };
  const r=await suggestDestinations({query:'cancha atlantico',session_token:'abcdefghijklmnop',context:{origin:origin(),search_scope:'local'}},f);
  assert.ok(seen.some(q=>/estadio/i.test(q)),'generic semantic alias must reach upstream retrieval');
  assert.equal(r.suggestions[0]?.display_primary,'Estadio Atlántico');
});

test('strong lexical entity match outranks a nearby category-only candidate even with opaque provider type',()=>{
  const context={query:'puente central',origin:origin(),explicit_geography:null,search_scope:'local'};
  const candidates=[
    {candidate_id:'near',candidate_ref:'near',display_primary:'Puente Norte',search_text:'Puente Norte Puente Central',locality:{name:'Santa Fe'},province:{id:'82',name:'Santa Fe'},coordinates:{lat:-31.6334,lon:-60.7001},provider_types:['bridge'],provider_rank:0},
    {candidate_id:'exact',candidate_ref:'exact',display_primary:'Puente Central Histórico',search_text:'Puente Central Histórico',locality:{name:'Santa Fe'},province:{id:'82',name:'Santa Fe'},coordinates:{lat:-31.64,lon:-60.69},provider_types:['secondary'],provider_rank:1}
  ];
  const ranked=rankDestinationCandidates(candidates,context);
  assert.equal(ranked[0].candidate_ref,'exact');
});

test('non-explicit local Photon focus uses coarse locality centroid, never exact origin GPS',async()=>{
  const seen=[];
  const exact={lat:-31.641234,lon:-60.712345};
  const f=async u=>{const url=new URL(String(u));seen.push(url);return photon([feature('Estadio Central','Santa Fe','Santa Fe',-60.700,-31.633,77)]);};
  await suggestDestinations({query:'Estadio Central',session_token:'abcdefghijklmnop',context:{origin:origin('Santa Fe','Santa Fe','82',exact.lat,exact.lon),search_scope:'local'}},f);
  assert.ok(seen.length>0);
  for(const url of seen){
    assert.notEqual(url.searchParams.get('lat'),String(exact.lat));
    assert.notEqual(url.searchParams.get('lon'),String(exact.lon));
    assert.equal(url.searchParams.has('bbox'),false);
  }
  assert.ok(seen.some(url=>url.searchParams.has('lat')&&url.searchParams.has('lon')),'coarse locality focus should still bias Photon softly');
});

test('multi-query Photon retrieval never exceeds three upstream variants',async()=>{
  const seen=[];
  const f=async u=>{const url=new URL(String(u));seen.push(url);return photon([]);};
  await suggestDestinations({query:'cancha central',session_token:'abcdefghijklmnop',context:{origin:origin(),search_scope:'local'}},f);
  const photonCalls=seen.filter(u=>u.hostname==='photon.komoot.io');
  assert.ok(photonCalls.length<=3,`expected <=3 Photon variants, got ${photonCalls.length}`);
});

test('official locality authority recognizes a bare trailing locality without query-specific patches',async()=>{
  const f=async()=>photon([
    feature('Universidad Tandil','Córdoba','Córdoba',-64.18,-31.42,201,'university'),
    feature('Universidad Nacional del Centro','Tandil','Buenos Aires',-59.14,-37.32,202,'university')
  ]);
  const r=await suggestDestinations({query:'universidad tandil',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.equal(r.suggestions[0]?.locality?.name,'Tandil');
});

test('generic category typo-2 is rewritten semantically before bounded retrieval',async()=>{
  const seen=[];const f=async u=>{const q=new URL(String(u)).searchParams.get('q')||'';seen.push(q);return /\bterminal\b/i.test(q)?photon([feature('Terminal Central','Salta','Salta',-65.42,-24.78,211,'bus_station')]):photon([])};
  const r=await suggestDestinations({query:'termianl central',session_token:'abcdefghijklmnop',context:{origin:origin('Salta','Salta','66',-24.79,-65.41),search_scope:'local'}},f);
  assert.ok(seen.some(q=>/\bterminal\b/i.test(q)));assert.equal(r.suggestions[0]?.locality?.name,'Salta');
});

test('generic category abbreviation expands without owner-query hardcode',async()=>{
  const seen=[];const f=async u=>{const q=new URL(String(u)).searchParams.get('q')||'';seen.push(q);return /universidad/i.test(q)?photon([feature('Universidad Central','Tandil','Buenos Aires',-59.14,-37.32,221,'university')]):photon([])};
  const r=await suggestDestinations({query:'univ central',session_token:'abcdefghijklmnop',context:{origin:origin('Tandil','Buenos Aires','06',-37.31,-59.13),search_scope:'local'}},f);
  assert.ok(seen.some(q=>/universidad/i.test(q)));assert.equal(r.suggestions[0]?.display_primary,'Universidad Central');
});
test('unique official locality prefix can complete a truncated geography suffix',async()=>{
  const seen=[];const f=async u=>{const q=new URL(String(u)).searchParams.get('q')||'';seen.push(q);return /bariloche/i.test(q)?photon([feature('Museo Central','San Carlos de Bariloche','Río Negro',-71.31,-41.13,231,'museum')]):photon([])};
  const r=await suggestDestinations({query:'museo barilo',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.ok(seen.some(q=>/bariloche/i.test(q)));assert.equal(r.suggestions[0]?.locality?.name,'San Carlos de Bariloche');
});
test('explicit address with house number gets a bounded no-number retry while keeping locality geography',async()=>{
  const seen=[];const f=async u=>{const q=new URL(String(u)).searchParams.get('q')||'';seen.push(q);return /\b500\b/.test(q)?photon([feature('Avenida Central','San Rafael','Mendoza',-68.33,-34.61,241,'residential')]):photon([feature('Avenida Central','Mendoza','Mendoza',-68.84,-32.89,242,'residential')])};
  const r=await suggestDestinations({query:'Avenida Central 500, Mendoza',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.ok(seen.some(q=>!/\b500\b/.test(q)));assert.ok(seen.length<=3);assert.equal(r.suggestions[0]?.locality?.name,'Mendoza');
});
test('generic title abbreviation expands before bounded Photon retrieval',async()=>{
  const seen=[];
  const f=async u=>{const url=new URL(String(u));seen.push(url.searchParams.get('q'));return photon([]);};
  await suggestDestinations({query:'pal municipal rosario',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.ok(seen.some(q=>/\bpalacio\b/i.test(q)));
  assert.ok(seen.length<=3);
});

test('generic honorific abbreviation expands before bounded Photon retrieval',async()=>{
  const seen=[];
  const f=async u=>{const url=new URL(String(u));seen.push(url.searchParams.get('q'));return photon([]);};
  await suggestDestinations({query:'puente gral paz',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.ok(seen.some(q=>/\bgeneral\b/i.test(q)));
  assert.ok(seen.length<=3);
});

test('bare locality plus province suffix binds both geography levels before ranking',async()=>{
  const f=async()=>photon([
    feature('Terminal Central','Rosario','Santa Fe',-60.64,-32.95,301,'bus_station'),
    feature('Terminal de Omnibus','Santa Rosa','La Pampa',-64.29,-36.62,302,'bus_station')
  ]);
  const r=await suggestDestinations({query:'terminal santa rosa la pampa',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.equal(r.suggestions[0]?.province?.id,'42');
  assert.equal(r.suggestions[0]?.locality?.name,'Santa Rosa');
});

test('unique one-edit province suffix typo is a soft explicit-geography correction',async()=>{
  const f=async()=>photon([
    feature('Monumento a Guemes','Santa Rosa','La Pampa',-64.29,-36.62,311,'monument'),
    feature('Monumento a Guemes','Salta','Salta',-65.41,-24.79,312,'monument')
  ]);
  const r=await suggestDestinations({query:'monumento guemes sata',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.equal(r.suggestions[0]?.province?.id,'66');
});


test('terminal country qualifier does not hide a valid Argentina locality suffix',async()=>{
  const seen=[];
  const f=async u=>{seen.push(new URL(String(u)));return photon([
    feature('Catedral Central','Ciudad Autónoma de Buenos Aires','Ciudad Autónoma de Buenos Aires',-58.38,-34.60,401,'cathedral'),
    feature('Catedral Central','San Juan','San Juan',-68.53,-31.54,402,'cathedral')
  ])};
  const r=await suggestDestinations({query:'Catedral Central San Juan Argentina',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.equal(r.suggestions[0]?.province?.id,'70');
  assert.ok(seen.some(u=>/san juan/i.test(u.searchParams.get('q')||'')));
  assert.equal(seen.some(u=>/argentina$/i.test(u.searchParams.get('q')||'')),false);
});

test('province alias is never expanded into an unrelated locality prefix',async()=>{
  const seen=[];
  const f=async u=>{const q=new URL(String(u)).searchParams.get('q')||'';seen.push(q);return /lujan/i.test(q)?photon([feature('Basílica Nuestra Señora de Luján','Luján','Buenos Aires',-59.11,-34.57,411,'place_of_worship')]):photon([])};
  const r=await suggestDestinations({query:'basilica luj buenos aires',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.equal(seen.some(q=>/buenos aires chico/i.test(q)),false);
  assert.equal(r.suggestions[0]?.locality?.name,'Luján');
});

test('ambiguous local entity name does not become a remote bare-locality override',async()=>{
  const seen=[];
  const f=async u=>{const url=new URL(String(u));seen.push(url);return photon([
    feature('Plaza Alberdi','Rosario','Santa Fe',-60.64,-32.95,421,'park'),
    feature('Plaza Alberdi','Córdoba','Córdoba',-64.18,-31.42,422,'park')
  ])};
  const exact={lat:-31.4262,lon:-64.1911};
  const r=await suggestDestinations({query:'Plaza Alberdi',session_token:'abcdefghijklmnop',context:{origin:origin('Córdoba','Córdoba','14',exact.lat,exact.lon),search_scope:'local'}},f);
  assert.equal(r.suggestions[0]?.province?.id,'14');
  assert.ok(seen.some(u=>u.searchParams.get('lat')==='-31.4167'&&u.searchParams.get('lon')==='-64.1833'));
  assert.equal(seen.some(u=>(u.searchParams.get('q')||'').toLowerCase().includes('misiones')),false);
});

test('explicit locality fails closed instead of returning contradictory localities',async()=>{
  const f=async()=>photon([
    feature('Terminal de Omnibus','Santa María','Catamarca',-66.05,-26.70,431,'bus_station'),
    feature('Terminal de Omnibus','Andalgalá','Catamarca',-66.32,-27.58,432,'bus_station')
  ]);
  const r=await suggestDestinations({query:'terminal de omnibus san fernando del valle de catamarca',session_token:'abcdefghijklmnop',context:{search_scope:'national'}},f);
  assert.equal(r.suggestions.length,0);
});


test('non-comma explicit settlement accepts canonical settlement even when province tokens are not in primary label', async()=>{
  const f=async u=>String(u).includes('photon')?new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-59.1378,-37.3217]},properties:{name:'Tandil',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:91001,osm_value:'city'}}]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}});
  const r=await suggestDestinations({query:'Tandil Buenos Aires',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.locality?.name,'Tandil');assert.equal(r.suggestions[0]?.province?.id,'06');
});

test('capital name shared with province remains locality intent when preceded by a destination category', async()=>{
  const f=async u=>String(u).includes('photon')?new Response(JSON.stringify({features:[
    {type:'Feature',geometry:{type:'Point',coordinates:[-66.3356,-33.3017]},properties:{name:'Terminal de Ómnibus',city:'San Luis',state:'San Luis',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:91002,osm_value:'bus_station'}},
    {type:'Feature',geometry:{type:'Point',coordinates:[-65.9423,-35.1523]},properties:{name:'Estacion Terminal de Omnibus',city:'Unión',state:'San Luis',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:91003,osm_value:'bus_station'}}]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}});
  const r=await suggestDestinations({query:'terminal san luis',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.locality?.name,'San Luis');assert.equal(r.suggestions[0]?.province?.id,'74');
});

test('semantic category reduction emits category plus verified explicit locality within the three-query cap', async()=>{
  const urls=[];const f=async u=>{if(String(u).includes('photon')){urls.push(String(u));return new Response(JSON.stringify({features:[]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}})};
  await suggestDestinations({query:'terminal de pasajeros formosa',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.ok(urls.length<=3);assert.ok(urls.some(u=>new URL(u).searchParams.get('q').toLowerCase()==='terminal formosa'));
});


test('local POI phrase that is also a remote locality keeps coarse local bias instead of becoming explicit geography', async()=>{
  const urls=[];
  const f=async u=>{const x=String(u);if(x.includes('photon')){urls.push(x);return new Response(JSON.stringify({features:[
    {type:'Feature',geometry:{type:'Point',coordinates:[-68.86,-32.89]},properties:{name:'Cerro de La Gloria',state:'Mendoza',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:92001,osm_value:'peak'}},
    {type:'Feature',geometry:{type:'Point',coordinates:[-57.45,-35.97]},properties:{name:'Cerro de la Gloria',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:92002,osm_value:'hamlet'}}]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}})};
  const r=await suggestDestinations({query:'Cerro de la Gloria',context:{search_scope:'local',origin:{locality:'Mendoza',province:'Mendoza',province_id:'50',coordinates:{lat:-32.8952,lon:-68.8501}}},session_token:'abcdefghijklmnop'},f);
  assert.ok(urls.some(u=>new URL(u).searchParams.get('lat')==='-32.8895'));
  assert.equal(r.suggestions[0]?.province?.id,'50');
});

test('historical descriptor is optional lexical metadata and gets one bounded local retry without the descriptor', async()=>{
  const urls=[];
  const f=async u=>{const x=String(u);if(x.includes('photon')){urls.push(x);return new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-65.4101,-24.7895]},properties:{name:'Cabildo de Salta',city:'Salta',state:'Salta',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:92003,osm_value:'museum'}}]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}})};
  const r=await suggestDestinations({query:'Cabildo Historico',context:{search_scope:'local',origin:{locality:'Salta',province:'Salta',province_id:'66',coordinates:{lat:-24.7892,lon:-65.4187}}},session_token:'abcdefghijklmnop'},f);
  assert.ok(urls.length<=3);assert.ok(urls.some(u=>new URL(u).searchParams.get('q').toLowerCase()==='cabildo salta'));
  assert.equal(r.suggestions[0]?.locality?.name,'Salta');
});

test('exact named city outranks same-name administrative boundary when query names settlement plus province', async()=>{
  const f=async u=>String(u).includes('photon')?new Response(JSON.stringify({features:[
    {type:'Feature',geometry:{type:'Point',coordinates:[-58.7801,-34.5045]},properties:{name:'Partido de José C. Paz',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:92004,osm_value:'administrative'}},
    {type:'Feature',geometry:{type:'Point',coordinates:[-58.7777,-34.5119]},properties:{name:'José C. Paz',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:92005,osm_value:'city'}}]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}});
  const r=await suggestDestinations({query:'jose c paz buenos aires',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.display_primary,'José C. Paz');
  assert.equal(r.suggestions[0]?.locality?.name,'José C. Paz');
});


test('local entity plus multi-token remote locality stays locally biased when no explicit separator is present', async()=>{
  const urls=[];
  const f=async u=>{const x=String(u);if(x.includes('photon')){urls.push(x);return new Response(JSON.stringify({features:[
    {type:'Feature',geometry:{type:'Point',coordinates:[-60.52,-31.74]},properties:{name:'Plaza Sáenz Peña',city:'Paraná',state:'Entre Ríos',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:93001,osm_value:'park'}},
    {type:'Feature',geometry:{type:'Point',coordinates:[-58.52,-34.60]},properties:{name:'Plaza Mariano Moreno',city:'Sáenz Peña',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:93002,osm_value:'park'}}]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}})};
  const r=await suggestDestinations({query:'Plaza Saenz Pena',context:{search_scope:'local',origin:{locality:'Paraná',province:'Entre Ríos',province_id:'30',coordinates:{lat:-31.75,lon:-60.53}}},session_token:'abcdefghijklmnop'},f);
  assert.ok(urls.some(u=>new URL(u).searchParams.get('lat')==='-31.7413'&&new URL(u).searchParams.get('lon')==='-60.5115'));
  assert.equal(r.suggestions[0]?.province?.id,'30');
});

test('non-comma settlement plus verified province gets a bounded head-only retry', async()=>{
  const urls=[];
  const f=async u=>{const x=String(u);if(x.includes('photon')){const q=(new URL(x).searchParams.get('q')||'').toLowerCase();urls.push(q);return q==='rio grande'?new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-67.71,-53.79]},properties:{name:'Río Grande',state:'Tierra del Fuego',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:93003,osm_value:'city'}}]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({features:[]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}})};
  const r=await suggestDestinations({query:'Rio Grande Tierra del Fuego',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.ok(urls.length<=3);assert.ok(urls.includes('rio grande'));
  assert.equal(r.suggestions[0]?.locality?.name,'Río Grande');assert.equal(r.suggestions[0]?.province?.id,'94');
});

test('provider one-edit locality typo canonicalizes only when official match is unique in spatial province', async()=>{
  const f=async u=>String(u).includes('photon')?new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-67.48,-45.86]},properties:{name:'Universidad Nacional de la Patagonia',city:'Comodoro Rivaavia',state:'Chubut',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:93004,osm_value:'university'}}]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}});
  const r=await suggestDestinations({query:'universidad comodoro rivadavia',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.locality?.name,'Comodoro Rivadavia');assert.equal(r.suggestions[0]?.province?.id,'26');
});


test('ambiguous exact locality phrase never falls through to a shorter unrelated prefix locality', async()=>{
  const urls=[];
  const f=async u=>{const x=String(u);if(x.includes('photon')){urls.push(new URL(x).searchParams.get('q')||'');return new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-58.51,-34.47]},properties:{name:'Hospital Central de San Isidro',city:'San Isidro',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:94001,osm_value:'hospital'}}]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}})};
  const r=await suggestDestinations({query:'hospital san isidro',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.ok(urls.every(q=>!q.toLowerCase().includes('isidro casanova')));
  assert.equal(r.suggestions[0]?.province?.id,'06');
});


test('strong same-province entity name may satisfy explicit locality intent without falsifying provider locality', async()=>{
  const f=async u=>String(u).includes('photon')?new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-58.2785,-34.7064]},properties:{name:'Universidad Nacional de Quilmes',city:'Bernal',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:94002,osm_value:'university'}}]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}});
  const r=await suggestDestinations({query:'universidad nacional quilmes',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.display_primary,'Universidad Nacional de Quilmes');
  assert.match(r.suggestions[0]?.locality?.name||'',/^bernal$/i);
  assert.equal(r.suggestions[0]?.province?.id,'06');
});


test('regional is optional descriptive metadata for category relevance', async()=>{
  const f=async u=>String(u).includes('photon')?new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-64.35,-33.12]},properties:{name:'Nuevo Hospital Río Cuarto San Antonio de Padua',city:'Rio Cuarto',state:'Córdoba',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:94003,osm_value:'hospital'}}]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}});
  const r=await suggestDestinations({query:'hospital regional rio cuarto',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.province?.id,'14');
  assert.equal(r.suggestions[0]?.locality?.name,'Río Cuarto');
});


test('incomplete settlement before a province suffix can match a verified provider settlement without treating province words as entity terms', async()=>{
  const f=async u=>String(u).includes('photon')?new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-58.74,-38.55]},properties:{name:'Necochea',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:95001,osm_value:'city'}}]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}});
  const r=await suggestDestinations({query:'necoch Buenos Aires',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.province?.id,'06');
  assert.match(r.suggestions[0]?.locality?.name||'',/^necochea$/i);
});

test('explicit locality may bind a same-province settlement whose provider primary name contains the official locality name', async()=>{
  const f=async u=>String(u).includes('photon')?new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-58.255,-37.846]},properties:{name:'San José de Balcarce',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:95002,osm_value:'city'}}]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}});
  const r=await suggestDestinations({query:'balcar Buenos Aires',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.province?.id,'06');
  assert.match(r.suggestions[0]?.locality?.name||'',/^balcarce$/i);
  assert.equal(r.suggestions[0]?.display_primary,'San José de Balcarce');
});

test('verified province prefix matching considers long multi-token locality names before shorter conflicting prefixes', async()=>{
  const urls=[];
  const f=async u=>{const x=String(u);if(x.includes('photon')){urls.push(new URL(x).searchParams.get('q')||'');return new Response(JSON.stringify({features:[{type:'Feature',geometry:{type:'Point',coordinates:[-64.985,-25.5]},properties:{name:'San José de Metán',state:'Salta',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:95003,osm_value:'city'}}]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}})};
  const r=await suggestDestinations({query:'san jose de met Salta',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.ok(urls.every(q=>!q.toLowerCase().includes('metan viejo')));
  assert.equal(r.suggestions[0]?.province?.id,'66');
  assert.match(r.suggestions[0]?.locality?.name||'',/^san jose de metan$/i);
});


test('road intent prefers a road feature over incidental POIs sharing the same name fragment', async()=>{
  const f=async u=>String(u).includes('photon')?new Response(JSON.stringify({features:[
    {type:'Feature',geometry:{type:'Point',coordinates:[-68.844,-32.897]},properties:{name:'Escuela Aristides',city:'Mendoza',state:'Mendoza',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:96001,osm_value:'school'}},
    {type:'Feature',geometry:{type:'Point',coordinates:[-68.856,-32.892]},properties:{name:'Aristides Villanueva',state:'Mendoza',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:96002,osm_value:'secondary'}}
  ]}),{status:200,headers:{'content-type':'application/json'}}):new Response(JSON.stringify({direcciones:[]}),{status:200,headers:{'content-type':'application/json'}});
  const r=await suggestDestinations({query:'Avenida Aristides',context:{search_scope:'local',origin:origin('Mendoza','Mendoza','50',-32.8982,-68.8541)},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.candidate_ref,'photon:W:96002');
});


test('road name ending in a province name remains local entity intent under verified local context', async()=>{
  const urls=[];
  const features=[
    {type:'Feature',geometry:{type:'Point',coordinates:[-58.3917,-34.6143]},properties:{name:'Avenida Entre Ríos',state:'Ciudad Autónoma de Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:97001,osm_key:'highway',osm_value:'secondary',type:'street'}},
    {type:'Feature',geometry:{type:'Point',coordinates:[-65.4135,-24.7809]},properties:{name:'Avenida Entre Ríos',city:'Salta',state:'Salta',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:97002,osm_key:'highway',osm_value:'secondary',type:'street'}}
  ];
  const f=async u=>{const x=String(u);if(x.includes('photon')){urls.push(x);return photon(features)}return jsonResp({direcciones:[]})};
  const r=await suggestDestinations({query:'Avenida Entre Ríos',context:{search_scope:'local',origin:origin('Salta','Salta','66',-24.7901,-65.4314)},session_token:'abcdefghijklmnop'},f);
  assert.ok(urls.length>=1);
  const first=new URL(urls[0]);
  assert.ok(first.searchParams.has('lat')&&first.searchParams.has('lon'),'local road intent must retain coarse locality focus');
  assert.notEqual(first.searchParams.get('lat'),'-24.7901','exact origin latitude must never leak');
  assert.equal(r.suggestions[0]?.province?.id,'66');
  assert.match(r.suggestions[0]?.locality?.name||'',/^salta$/i);
  assert.match(r.suggestions[0]?.display_primary||'',/^Avenida Entre Ríos$/i);
});


test('named settlement uses its own official locality instead of provider parent city metadata', async()=>{
  const f=async u=>String(u).includes('photon')?photon([
    {type:'Feature',geometry:{type:'Point',coordinates:[-65.7713691,-23.2886964]},properties:{name:'Quebraleña',city:'Abralaite',state:'Jujuy',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:98001,osm_key:'place',osm_value:'hamlet',type:'district'}}
  ]):jsonResp({direcciones:[]});
  const r=await suggestDestinations({query:'quebralena jujuy',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.province?.id,'38');
  assert.match(r.suggestions[0]?.locality?.name||'',/^Quebraleña$/i);
  assert.match(r.suggestions[0]?.display_primary||'',/^Quebraleña$/i);
});


test('official locality initial abbreviation matches provider expanded settlement name', async()=>{
  const f=async u=>String(u).includes('photon')?photon([
    {type:'Feature',geometry:{type:'Point',coordinates:[-64.1247498,-25.117141]},properties:{name:'Joaquín Víctor González',state:'Salta',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:99001,osm_key:'place',osm_value:'town',type:'city'}}
  ]):jsonResp({direcciones:[]});
  const r=await suggestDestinations({query:'joaquin v. gonzalez salta',context:{search_scope:'national'},session_token:'abcdefghijklmnop'},f);
  assert.equal(r.suggestions[0]?.province?.id,'66');
  assert.match(r.suggestions[0]?.locality?.name||'',/^Joaquín V\. González$/i);
  assert.match(r.suggestions[0]?.display_primary||'',/^Joaquín Víctor González$/i);
});
