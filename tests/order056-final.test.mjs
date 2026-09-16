import test from 'node:test';import assert from 'node:assert/strict';
import {suggestDestinations,resolveDestinationSelection,createRequestHandler,validateTelemetryPayload,getCoverage,getMobility,normalizeGeoRefPlace,reverseLocation} from '../src/worker.template.js';
const jsonResp=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
const photon=(features)=>jsonResp({features});
const feature=(name,city,state,lon=-60.64,lat=-32.95,id=1)=>({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{name,city,state,country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:id,osm_value:'residential'}});
const origin=(locality,province,province_id,lat,lon)=>({locality,province,province_id,coordinates:{lat,lon}});
const georefSantaFePlace=()=>({id:'820147',nombre:'Santa Fe',ubicacion:{lat:-31.6333,lon:-60.7},provincia:{id:'82',nombre:'Santa Fe'},localidad:{id:'820147',nombre:'Santa Fe'}});
const georefCabaComuna1Place=()=>({id:'020001',nombre:'Comuna 1',ubicacion:{lat:-34.6037,lon:-58.3816},provincia:{id:'02',nombre:'Ciudad Autónoma de Buenos Aires'},localidad:{id:'020001',nombre:'Comuna 1'}});
test('local context ranks local plausible result',async()=>{const f=async u=>String(u).includes('photon')?photon([feature('Rivadavia','Rosario','Santa Fe',-60.64,-32.95,1),feature('Rivadavia','Córdoba','Córdoba',-64.18,-31.42,2)]):jsonResp({direcciones:[]});const r=await suggestDestinations({query:'Rivadavia',context:{origin:origin('Rosario','Santa Fe','82',-32.9468,-60.6393),search_scope:'local'},session_token:'abcdefghijklmnop'},f);assert.equal(r.suggestions[0].locality.name,'Rosario');assert.equal(r.suggestions[0].province.id,'82')});
test('explicit geography overrides origin',async()=>{const f=async u=>String(u).includes('photon')?photon([feature('Rivadavia','Salta','Salta',-65.42,-24.78,3)]):jsonResp({direcciones:[]});const r=await suggestDestinations({query:'Rivadavia, Salta',context:{origin:origin('Santa Fe','Santa Fe','82',-31.63,-60.7)},session_token:'abcdefghijklmnop'},f);assert.equal(r.suggestions[0].province.id,'66')});
test('punctuation negative fails closed',async()=>{let calls=0;const f=async()=>{calls++;return photon([feature('Santa Fe','Santa Fe','Santa Fe')])};const r=await suggestDestinations({query:'--- --- ---',context:{origin:origin('Santa Fe','Santa Fe','82',-31.63,-60.7)},session_token:'abcdefghijklmnop'},f);assert.equal(r.suggestions.length,0)});
test('nonsense numeric candidate fails closed',async()=>{const f=async u=>String(u).includes('photon')?photon([feature('9999','Rosario','Santa Fe')]):jsonResp({direcciones:[]});const r=await suggestDestinations({query:'qwxzqwxz 99999',context:{origin:origin('Santa Fe','Santa Fe','82',-31.63,-60.7)},session_token:'abcdefghijklmnop'},f);assert.equal(r.suggestions.length,0)});
test('CABA provider territory canonicalized',async()=>{const f=async u=>String(u).includes('photon')?photon([feature('Aeroparque Jorge Newbery','Ciudad Autónoma de Buenos Aires','Buenos Aires',-58.414,-34.559,5)]):jsonResp({direcciones:[]});const r=await suggestDestinations({query:'Aeroparque',context:{origin:origin('Ciudad Autónoma de Buenos Aires','Ciudad Autónoma de Buenos Aires','02',-34.6037,-58.3816)},session_token:'abcdefghijklmnop'},f);assert.equal(r.suggestions[0].province.id,'02');assert.equal(r.suggestions[0].locality.name,'Ciudad Autónoma de Buenos Aires')});
test('successful GeoRef normalization marks official territory verified',()=>{const c=normalizeGeoRefPlace(georefSantaFePlace());assert.equal(c.territory_verified,true);assert.equal(c.territory_verification,'full');assert.equal(c.territory_authority,'live_georef');assert.equal(c.integration_slug,'santa-fe')});
test('reverseLocation preserves successful GeoRef verification contract',async()=>{const f=async()=>jsonResp({ubicacion:georefSantaFePlace()});const r=await reverseLocation({lat:-31.6333,lon:-60.7},f);assert.equal(r.candidate.territory_verified,true);assert.equal(r.candidate.territory_verification,'full');assert.equal(r.candidate.territory_authority,'live_georef')});
test('Puente Colgante resolution preserves verified Santa Fe integration',async()=>{const f=async()=>jsonResp({ubicacion:georefSantaFePlace()});const r=await resolveDestinationSelection({candidate_ref:'photon:W:939373894',coordinates:{lat:-31.6333,lon:-60.7},session_token:'abcdefghijklmnop'},f);assert.equal(r.result_class,'resolved');assert.equal(r.destination.territory_verified,true);assert.equal(r.destination.territory_verification,'full');assert.equal(r.destination.territory_authority,'live_georef');assert.equal(r.destination.integration_slug,'santa-fe');assert.equal(r.destination.coverage,'T1_OFFICIAL_HANDOFF')});
test('CABA GeoRef Comuna 1 preserves locality while binding caba mobility',()=>{const c=normalizeGeoRefPlace(georefCabaComuna1Place());assert.equal(c.province.id,'02');assert.equal(c.locality.name,'Comuna 1');assert.equal(c.territory_verified,true);assert.equal(c.integration_slug,'caba');assert.equal(c.coverage,'T1_OFFICIAL_HANDOFF');const m=getMobility(c.integration_slug,Date.parse('2026-09-03T00:00:00Z'),'02');assert.ok((m.facts?.length||0)+(m.handoffs?.length||0)>=1)});
test('selected photon remains map resolvable when GeoRef unavailable',async()=>{const f=async()=>new Response('bad',{status:503});const r=await resolveDestinationSelection({candidate_ref:'photon:W:123',coordinates:{lat:-31.6,lon:-60.7},session_token:'abcdefghijklmnop'},f);assert.equal(r.ok,true);assert.equal(r.result_class,'map_resolvable_territory_unverified');assert.equal(r.territory_verified,false);assert.equal(r.destination.integration_slug,null);assert.equal(r.destination.coverage,'T0_TERRITORY_ONLY')});
test('invalid candidate ref rejected',async()=>{await assert.rejects(()=>resolveDestinationSelection({candidate_ref:'https://evil',coordinates:{lat:0,lon:0},session_token:'abcdefghijklmnop'},fetch),e=>e.code==='invalid_candidate_ref')});
test('telemetry forbids raw query',()=>assert.throws(()=>validateTelemetryPayload({event:'destination_suggest_ok',dimensions:{query:'x'}}),e=>e.code==='telemetry_dimension_not_allowed'));
test('telemetry forbids exact coordinates',()=>assert.throws(()=>validateTelemetryPayload({event:'destination_suggest_ok',exact_coordinates:'x',dimensions:{}}),e=>e.code==='telemetry_field_not_allowed'));
test('coverage false locality defaults T0',()=>assert.equal(getCoverage('82','rafaela').local_mobility_tier,'T0_TERRITORY_ONLY'));
test('Santa Fe truth remains handoff only',()=>{const m=getMobility('santa-fe',Date.parse('2026-09-03T00:00:00Z'),'82');assert.equal(m.route,null);assert.equal(m.eta,null);assert.equal(m.structured_status,'UNAVAILABLE_IN_VOY')});
test('unknown API is JSON 404',async()=>{const h=createRequestHandler();const r=await h(new Request('https://x.test/api/nope'),{});assert.equal(r.status,404);assert.deepEqual(await r.json(),{ok:false,error:'not_found'})});
test('destination endpoint POST only',async()=>{const h=createRequestHandler();const r=await h(new Request('https://x.test/api/destinations/suggest'),{});assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'POST')});
test('security headers applied',async()=>{const h=createRequestHandler();const r=await h(new Request('https://x.test/api/health'),{});assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.match(r.headers.get('content-security-policy'),/default-src 'self'/)});


test('street named like origin province remains a destination entity',async()=>{

  const f=async u=>String(u).includes('photon')?photon([feature('Santa Fe','Rosario','Santa Fe',-60.6365,-32.9456,20)]):jsonResp({direcciones:[]});

  const r=await suggestDestinations({query:'Santa Fe 1000',context:{origin:origin('Rosario','Santa Fe','82',-32.9468,-60.6393),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  assert.equal(r.suggestions[0]?.locality.name,'Rosario');

  assert.equal(r.suggestions[0]?.display_primary,'Santa Fe');

});



test('boulevard spelling is normalized for Photon discovery',async()=>{

  const seen=[];

  const f=async u=>{const s=String(u);if(!s.includes('photon'))return jsonResp({direcciones:[]});seen.push(new URL(s).searchParams.get('q'));return seen.at(-1).includes('Bulevar Gálvez')?photon([feature('Bulevar Gálvez','Santa Fe','Santa Fe',-60.7009,-31.636,21)]):photon([])};

  const r=await suggestDestinations({query:'Boulevard Gálvez',context:{origin:origin('Santa Fe','Santa Fe','82',-31.6333,-60.7),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  assert.equal(r.suggestions[0]?.locality.name,'Santa Fe');

  assert.match(seen[0],/Bulevar Gálvez/);

});



test('address retries without house number when exact Photon pass misses local city',async()=>{

  const seen=[];

  const f=async u=>{const s=String(u);if(!s.includes('photon'))return jsonResp({direcciones:[]});const q=new URL(s).searchParams.get('q');seen.push(q);if(/1000/.test(q))return photon([feature('San Martín','Recreo','Santa Fe',-60.7308,-31.4932,22)]);return photon([feature('San Martín','Santa Fe','Santa Fe',-60.7073,-31.6491,23)])};

  const r=await suggestDestinations({query:'San Martín 1000',context:{origin:origin('Santa Fe','Santa Fe','82',-31.6333,-60.7),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  assert.equal(r.suggestions[0]?.locality.name,'Santa Fe');

  assert.ok(seen.length<=4);

  assert.equal(seen.some(q=>!/[0-9]/.test(q)),true);

});



test('boulevard address retries without road-type prefix when Photon indexes only street name',async()=>{

  const seen=[];

  const f=async u=>{const s=String(u);if(!s.includes('photon'))return jsonResp({direcciones:[]});const q=new URL(s).searchParams.get('q');seen.push(q);if(/^Santa Fe 1000 Rafaela$/i.test(q))return photon([feature('Santa Fe','Rafaela','Santa Fe',-61.48136,-31.254493,24)]);return photon([feature('Boulevard Guillermo Lehmann','Rafaela','Santa Fe',-61.4893,-31.2435,25)])};

  const r=await suggestDestinations({query:'Boulevard Santa Fe 1000',context:{origin:origin('Rafaela','Santa Fe','82',-31.2503,-61.4867),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  assert.equal(r.suggestions[0]?.display_primary,'Santa Fe');

  assert.equal(r.suggestions[0]?.locality.name,'Rafaela');

  assert.ok(seen.length<=4);

});



test('accented explicit geography uses an ASCII-stable Photon transport query',async()=>{
  const seen=[];
  const f=async u=>{const raw=String(u);if(!raw.includes('photon'))return jsonResp({direcciones:[]});const q=new URL(raw).searchParams.get('q');seen.push(q);return photon([feature('Paraná','Paraná','Entre Ríos',-60.5238,-31.7413,29)])};
  const r=await suggestDestinations({query:'Paraná, Entre Ríos',context:{origin:origin('Santa Fe','Santa Fe','82',-31.6333,-60.7),search_scope:'local'},session_token:'abcdefghijklmnop'},f);
  assert.equal(seen[0],'Parana Entre Rios');
  assert.equal(r.suggestions[0]?.display_primary,'Paraná');
  assert.equal(r.suggestions[0]?.province.id,'30');
});


test('explicit comma geography is not treated as destination entity text',async()=>{

  const f=async u=>String(u).includes('photon')?photon([feature('9 de Julio','Buenos Aires','Autonomous City of Buenos Aires',-58.38027,-34.60444,30)]):jsonResp({direcciones:[]});

  const r=await suggestDestinations({query:'9 de Julio, CABA',context:{origin:origin('Santa Fe','Santa Fe','82',-31.6333,-60.7),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  assert.equal(r.suggestions[0]?.province.id,'02');

  assert.equal(r.suggestions[0]?.locality.name,'Ciudad Autónoma de Buenos Aires');

});



test('common transposition typo is corrected before semantic plausibility filtering',async()=>{

  const f=async u=>String(u).includes('photon')?photon([feature('San Martín','Mendoza','Mendoza',-68.84,-32.89,31)]):jsonResp({direcciones:[]});

  const r=await suggestDestinations({query:'sna martin',context:{origin:origin('Mendoza','Mendoza','50',-32.8895,-68.8458),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  assert.equal(r.suggestions[0]?.display_primary,'San Martín');

  assert.equal(r.suggestions[0]?.locality.name,'Mendoza');

});



test('exact street intent outranks longer same-token street names',async()=>{

  const f=async u=>String(u).includes('photon')?photon([

    feature('San Martin de Porres','Santa Fe','Santa Fe',-60.6989,-31.5962,32),

    feature('San Martín','Santa Fe','Santa Fe',-60.7020,-31.6315,33)

  ]):jsonResp({direcciones:[]});

  const r=await suggestDestinations({query:'San Martín 1000',context:{origin:origin('Santa Fe','Santa Fe','82',-31.6333,-60.7),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  assert.equal(r.suggestions[0]?.display_primary,'San Martín');

});




test('contradictory provider locality never overwrites nonempty province territory',async()=>{

  const bad={type:'Feature',geometry:{type:'Point',coordinates:[-58.370879,-34.6558127]},properties:{name:'Dirección Nacional de Vialidad - Departamento Vial Puente Pueyrredón',city:'Ciudad Autónoma de Buenos Aires',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'W',osm_id:38038,osm_value:'office'}};

  const f=async u=>String(u).includes('photon')?photon([bad]):jsonResp({direcciones:[]});

  const r=await suggestDestinations({query:'Pueyrredón',context:{origin:origin('Ciudad Autónoma de Buenos Aires','Ciudad Autónoma de Buenos Aires','02',-34.6037,-58.3816),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  assert.notEqual(r.suggestions[0]?.province?.id,'02');

  assert.notEqual(r.suggestions[0]?.locality?.name,'Ciudad Autónoma de Buenos Aires');

});




test('official province with unproven provider locality remains partial and cannot bind mobility',async()=>{

  const unproven=feature('Plaza barrial','Distrito Villa del Parque','Mendoza',-68.8458,-32.8895,38039);

  const f=async u=>String(u).includes('photon')?photon([unproven]):jsonResp({direcciones:[]});

  const r=await suggestDestinations({query:'Plaza barrial',context:{origin:origin('Mendoza','Mendoza','50',-32.8895,-68.8458),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  const s=r.suggestions[0];

  assert.equal(s?.province?.id,'50');

  assert.equal(s?.locality,null);

  assert.equal(s?.territory_verified,false);

  assert.equal(s?.territory_verification,'partial');

  assert.equal(s?.integration_slug,null);

  assert.equal(s?.coverage,'T0_TERRITORY_ONLY');

});




test('locality-bound mobility is withheld when official parent geometry does not contain the coordinate',async()=>{

  const airport=feature('Aeropuerto Internacional Ingeniero Ambrosio Taravella','Córdoba','Córdoba',-64.2121917,-31.3035268,34149240);

  airport.properties.osm_value='aerodrome';

  const f=async u=>String(u).includes('photon')?photon([airport]):jsonResp({direcciones:[]});

  const r=await suggestDestinations({query:'Aeropuerto de Córdoba',context:{origin:origin('Santa Fe','Santa Fe','82',-31.6333,-60.7),search_scope:'local'},session_token:'abcdefghijklmnop'},f);

  const s=r.suggestions[0];

  assert.equal(s?.province?.id,'14');

  assert.equal(s?.locality,null);

  assert.equal(s?.territory_verified,false);

  assert.equal(s?.territory_verification,'partial');

  assert.equal(s?.integration_slug,null);

  assert.equal(s?.coverage,'T0_TERRITORY_ONLY');

});
