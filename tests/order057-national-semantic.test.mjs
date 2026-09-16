import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestDestinations} from '../src/worker.template.js';

const jsonResp=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
const photon=(features)=>jsonResp({features});
const feature=(name,city,state,lon,lat,id,type='city')=>({
  type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},
  properties:{name,city,state,country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:id,osm_value:type}
});
const origin={locality:'Santa Fe',province:'Santa Fe',province_id:'82',coordinates:{lat:-31.6333,lon:-60.7}};
const token='abcdefghijklmnop';

const sameNameCases=[
  ['Córdoba','Córdoba',-64.1833,-31.4167,14],
  ['Corrientes','Corrientes',-58.8341,-27.4692,18],
  ['Formosa','Formosa',-58.1781,-26.1775,34],
  ['La Rioja','La Rioja',-66.8558,-29.4131,46],
  ['Mendoza','Mendoza',-68.8458,-32.8895,50],
  ['Neuquén','Neuquén',-68.0591,-38.9516,58],
  ['Salta','Salta',-65.4232,-24.7821,66],
  ['San Juan','San Juan',-68.5364,-31.5375,70],
  ['San Luis','San Luis',-66.3356,-33.3017,74],
  ['Santa Fe','Santa Fe',-60.7000,-31.6333,82],
  ['Santiago del Estero','Santiago del Estero',-64.2615,-27.7951,86]
];

for(const [city,province,lon,lat,id] of sameNameCases){
  test(`explicit same-name destination head survives geography filtering: ${city}, ${province}`,async()=>{
    const f=async u=>String(u).includes('photon')?photon([feature(city,city,province,lon,lat,id)]):jsonResp({direcciones:[]});
    const r=await suggestDestinations({query:`${city}, ${province}`,context:{origin,search_scope:'local'},session_token:token},f);
    assert.ok(r.suggestions.length>0,'expected at least one semantically plausible suggestion');
    assert.equal(r.suggestions[0].display_primary,city);
    assert.equal(r.suggestions[0].locality?.name,city);
  });
}

test('CABA explicit alias remains plausible for canonical Buenos Aires city candidate',async()=>{
  const f=async u=>String(u).includes('photon')?photon([
    feature('Buenos Aires','Buenos Aires','Ciudad Autónoma de Buenos Aires',-58.3816,-34.6037,200,'city')
  ]):jsonResp({direcciones:[]});
  const r=await suggestDestinations({query:'CABA, Ciudad Autónoma de Buenos Aires',context:{origin,search_scope:'local'},session_token:token},f);
  assert.ok(r.suggestions.length>0,'CABA alias must remain a valid explicit city intent');
  assert.equal(r.suggestions[0].province?.id,'02');
  assert.equal(r.suggestions[0].locality?.name,'Ciudad Autónoma de Buenos Aires');
});

test('La Plata, Buenos Aires ranks the city feature above same-primary result in Berazategui',async()=>{
  const cityFeature={type:'Feature',geometry:{type:'Point',coordinates:[-57.9537638,-34.9206797]},properties:{name:'La Plata',state:'Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:302,osm_value:'city'}};
  const f=async u=>String(u).includes('photon')?photon([
    feature('La Plata','Berazategui','Buenos Aires',-58.2088,-34.7640,301,'residential'),
    cityFeature
  ]):jsonResp({direcciones:[]});
  const r=await suggestDestinations({query:'La Plata, Buenos Aires',context:{origin,search_scope:'local'},session_token:token},f);
  assert.equal(r.suggestions[0]?.provider_types?.[0],'city');
  assert.equal(r.suggestions[0]?.locality?.name,'La Plata');
});

test('explicit capital intent prefers city feature with provider locality omitted over station',async()=>{
  const cityFeature={type:'Feature',geometry:{type:'Point',coordinates:[-64.1833,-31.4167]},properties:{name:'Córdoba',state:'Córdoba',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:401,osm_value:'city'}};
  const station=feature('Córdoba','Córdoba','Córdoba',-64.1751,-31.4203,402,'station');
  const f=async u=>String(u).includes('photon')?photon([cityFeature,station]):jsonResp({direcciones:[]});
  const r=await suggestDestinations({query:'Córdoba, Córdoba',context:{origin,search_scope:'local'},session_token:token},f);
  assert.equal(r.suggestions[0]?.provider_types?.[0],'city');
  assert.equal(r.suggestions[0]?.locality?.name,'Córdoba');
});

test('province-named capital prefers city feature over province state feature',async()=>{
  const stateFeature={type:'Feature',geometry:{type:'Point',coordinates:[-69.832275,-38.8502546]},properties:{name:'Neuquén',state:'Neuquén',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:501,osm_value:'state'}};
  const cityFeature={type:'Feature',geometry:{type:'Point',coordinates:[-68.0591741,-38.9519679]},properties:{name:'Neuquén',state:'Neuquén',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:502,osm_value:'city'}};
  const f=async u=>String(u).includes('photon')?photon([stateFeature,cityFeature]):jsonResp({direcciones:[]});
  const r=await suggestDestinations({query:'Neuquén, Neuquén',context:{origin,search_scope:'local'},session_token:token},f);
  assert.equal(r.suggestions[0]?.provider_types?.[0],'city');
  assert.equal(r.suggestions[0]?.locality?.name,'Neuquén');
});

test('CABA explicit alias is canonicalized before outbound Photon query',async()=>{
  const seen=[];
  const administrative={type:'Feature',geometry:{type:'Point',coordinates:[-58.3816,-34.6037]},properties:{name:'Ciudad Autónoma de Buenos Aires',country:'Argentina',countrycode:'AR',osm_type:'R',osm_id:601,osm_value:'administrative'}};
  const f=async u=>{const raw=String(u);if(!raw.includes('photon'))return jsonResp({direcciones:[]});seen.push(new URL(raw).searchParams.get('q'));return photon([administrative])};
  const r=await suggestDestinations({query:'CABA, Ciudad Autónoma de Buenos Aires',context:{origin,search_scope:'local'},session_token:token},f);
  assert.equal(seen[0],'Ciudad Autonoma de Buenos Aires');
  assert.equal(r.suggestions[0]?.province?.id,'02');
  assert.equal(r.suggestions[0]?.locality?.name,'Ciudad Autónoma de Buenos Aires');
});


test('known locality with province suffix retries head-only when qualified Photon results are not a settlement',async()=>{
  const seen=[];
  const museum=feature('Museo Marítimo de Ushuaia','Ushuaia','Tierra del Fuego',-68.2963,-54.8034,700,'museum');
  const town={type:'Feature',geometry:{type:'Point',coordinates:[-68.3084133,-54.807306]},properties:{name:'Ushuaia',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:701,osm_value:'town'}};
  const f=async u=>{const raw=String(u);if(!raw.includes('photon'))return jsonResp({direcciones:[]});const q=new URL(raw).searchParams.get('q');seen.push(q);return seen.length===1?photon([museum]):photon([town])};
  const r=await suggestDestinations({query:'Ushuaia, Tierra del Fuego',context:{origin,search_scope:'local'},session_token:token},f);
  assert.match(seen[0],/^Ushuaia Tierra del Fuego/i);
  assert.equal(seen[1],'Ushuaia');
  assert.equal(r.suggestions[0]?.display_primary,'Ushuaia');
  assert.equal(r.suggestions[0]?.provider_types?.[0],'town');
  assert.equal(r.suggestions[0]?.province?.id,'94');
});

test('comma suffix matching a province does not hijack Rafaela intent as Santa Fe locality',async()=>{
  const seen=[];
  const santaFeRoad=feature('Pasaje Rafaela de Vera Mujica','Santa Fe','Santa Fe',-60.7279,-31.6556,801,'residential');
  const rafaelaRoad=feature('Boulevard Santa Fe','Rafaela','Santa Fe',-61.4878,-31.2532,802,'primary');
  const rafaelaCity={type:'Feature',geometry:{type:'Point',coordinates:[-61.4916758,-31.2526923]},properties:{name:'Rafaela',state:'Santa Fe',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:803,osm_value:'city'}};
  const f=async u=>{const raw=String(u);if(!raw.includes('photon'))return jsonResp({direcciones:[]});const url=new URL(raw),q=url.searchParams.get('q'),lat=url.searchParams.get('lat');seen.push({q,lat});if(q==='Rafaela')return photon([rafaelaCity]);return Number(lat)<-31.5?photon([santaFeRoad]):photon([rafaelaRoad]);};
  const r=await suggestDestinations({query:'Rafaela, Santa Fe',context:{origin,search_scope:'national'},session_token:token},f);
  assert.equal(seen[0]?.lat,String(-31.2503));
  assert.equal(seen[1]?.q,'Rafaela');
  assert.equal(r.suggestions[0]?.display_primary,'Rafaela');
  assert.equal(r.suggestions[0]?.locality?.name,'Rafaela');
});

test('unknown locality head with province suffix does not inherit province-capital locality bias',async()=>{
  const seen=[];
  const cordobaRoad=feature('Villa María','Córdoba','Córdoba',-64.183,-31.416,901,'residential');
  const villaMaria={type:'Feature',geometry:{type:'Point',coordinates:[-63.2402,-32.4075]},properties:{name:'Villa María',state:'Córdoba',country:'Argentina',countrycode:'AR',osm_type:'N',osm_id:902,osm_value:'city'}};
  const f=async u=>{const raw=String(u);if(!raw.includes('photon'))return jsonResp({direcciones:[]});const url=new URL(raw);seen.push({q:url.searchParams.get('q'),lat:url.searchParams.get('lat')});return url.searchParams.has('lat')?photon([cordobaRoad]):photon([villaMaria]);};
  const r=await suggestDestinations({query:'Villa María, Córdoba',context:{origin,search_scope:'national'},session_token:token},f);
  assert.equal(seen[0]?.lat,null);
  assert.equal(r.suggestions[0]?.display_primary,'Villa María');
  assert.equal(r.suggestions[0]?.province?.id,'14');
});
