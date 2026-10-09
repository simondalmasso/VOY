import test from 'node:test';
import assert from 'node:assert/strict';
import {rankDestinationCandidates,suggestDestinations} from '../src/worker.template.js';

const origin={locality:'Santa Fe',province:'Santa Fe',province_id:'82',
 coordinates:{lat:-31.6333,lon:-60.7}};
const water={candidate_id:'water',candidate_ref:'water',display_primary:'Paraná',
 display_secondary:'Río Paraná · Santa Fe',search_text:'Paraná Río Paraná',
 locality:{name:'Santa Fe'},province:{id:'82',name:'Santa Fe'},
 coordinates:{lat:-31.633,lon:-60.703},provider_types:['river'],
 provider_rank:0};
const settlement={candidate_id:'city',candidate_ref:'city',display_primary:'Paraná',
 display_secondary:'Paraná · Entre Ríos',search_text:'Paraná',
 locality:{name:'Paraná'},province:{id:'30',name:'Entre Ríos'},
 coordinates:{lat:-31.7413,lon:-60.5115},provider_types:['city'],
 provider_rank:1};
const response=(body,status=200)=>new Response(JSON.stringify(body),
 {status,headers:{'content-type':'application/json'}});
const feature=(name,city,state,lon,lat,id,type='city')=>({
 type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},
 properties:{name,city,state,country:'Argentina',countrycode:'AR',
 osm_type:'N',osm_id:id,osm_value:type}
});

test('bare settlement query near another province prefers an actual named city over a nearby river',()=>{
 const ranked=rankDestinationCandidates([water,settlement],
  {query:'Paraná',origin,explicit_geography:null,search_scope:'local'});
 assert.equal(ranked[0]?.candidate_ref,'city',
  'city of Paraná should not be displaced by waterway proximity');
});

test('explicit river intent must not be rewritten as a city-only request',()=>{
 const ranked=rankDestinationCandidates([settlement,water],
  {query:'río Paraná',origin,explicit_geography:null,search_scope:'local'});
 assert.equal(ranked[0]?.candidate_ref,'water');
});

test('when live POI provider fails and address-only fallback has no match, return UNKNOWN without fabricated plaza',async()=>{
 const seen=[];
 const upstream=async url=>{
   const host=new URL(String(url)).hostname;seen.push(host);
   if(host==='photon.komoot.io')throw new TypeError('simulated provider outage');
   if(host==='apis.datos.gob.ar')return response({direcciones:[]});
   throw new Error('unexpected '+host);
 };
 const result=await suggestDestinations({
  query:'Plaza 25 de Mayo, Santa Fe',
  context:{origin,search_scope:'local'},session_token:'abcdefghijklmnoq'
 },upstream);
 assert.deepEqual(result.suggestions,[]);
 assert.equal(result.result_class,'unverified');
 assert.equal(result.ok,true);
 assert.ok(seen.includes('apis.datos.gob.ar'),'must attempt official address fallback');
 assert.ok(seen.filter(h=>h==='photon.komoot.io').length<=3,'bounded POI calls');
});

test('officially contextualized city remains selectable when provider supplies a city and river',async()=>{
 const calls=[];
 const upstream=async url=>{
   const u=new URL(String(url));calls.push(u);
   if(u.hostname==='photon.komoot.io')return response({features:[
    feature('Paraná','Santa Fe','Santa Fe',-60.705,-31.635,101,'river'),
    feature('Paraná','Paraná','Entre Ríos',-60.5115,-31.7413,102,'city')
   ]});
   if(u.hostname==='apis.datos.gob.ar')return response({direcciones:[]});
   throw new Error('unexpected host '+u.hostname);
 };
 const result=await suggestDestinations({
  query:'Paraná',context:{origin,search_scope:'local'},session_token:'abcdefghijklmnop'
 },upstream);
 assert.ok(result.suggestions.length,'candidate should not be wiped');
 assert.equal(result.suggestions[0]?.display_primary,'Paraná');
 assert.equal(result.suggestions[0]?.province?.id,'30','first result should be city in Entre Ríos');
});
