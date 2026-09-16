import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMobilityDecision, resolveDestinationSelection } from '../src/worker.template.js';
import { normalizeMobilityDecision } from '../public/contracts.js';

const jsonResp=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
const georefPlace=(provinceId,provinceName,localityId,localityName,lat,lon)=>({
  id:localityId,nombre:localityName,ubicacion:{lat,lon},
  provincia:{id:provinceId,nombre:provinceName},localidad:{id:localityId,nombre:localityName}
});
const resolveWithPlace=(place,ref='photon:W:order057')=>resolveDestinationSelection({
  candidate_ref:ref,coordinates:{lat:place.ubicacion.lat,lon:place.ubicacion.lon},session_token:'abcdefghijklmnop'
},async()=>jsonResp({ubicacion:place}));

function assertDecisionShape(decision){
  assert.ok(decision && typeof decision==='object');
  assert.ok(['available','handoff','unavailable','unknown'].includes(decision.state));
  assert.ok(decision.destination && typeof decision.destination==='object');
  assert.ok(decision.integration_slug===null || typeof decision.integration_slug==='string');
  assert.equal(typeof decision.coverage,'string');
  assert.ok(Array.isArray(decision.available_modes));
  assert.ok(['realtime','scheduled','handoff','unknown'].includes(decision.source_class));
  assert.ok(decision.freshness && typeof decision.freshness==='object');
  assert.ok(Array.isArray(decision.provenance));
  assert.ok(Array.isArray(decision.facts));
  assert.ok(Array.isArray(decision.handoffs));
  assert.ok(Array.isArray(decision.next_actions));
}

test('resolve returns server-authoritative MobilityDecision for Santa Fe',async()=>{
  const place=georefPlace('82','Santa Fe','820147','Santa Fe',-31.6333,-60.7);
  const r=await resolveWithPlace(place,'photon:W:939373894');
  const d=r.mobility_decision;
  assertDecisionShape(d);
  assert.equal(d.destination.locality.name,'Santa Fe');
  assert.equal(d.integration_slug,'santa-fe');
  assert.equal(d.coverage,'T1_OFFICIAL_HANDOFF');
  assert.equal(d.state,'handoff');
  assert.deepEqual(d.available_modes,['bus']);
  assert.equal(d.source_class,'handoff');
  assert.ok(d.provenance.length>=1);
  assert.ok(d.handoffs.length>=1);
  assert.ok(d.next_actions.some(a=>a.type==='open_official_handoff'));
  assert.equal('route' in d,false);
  assert.equal('eta' in d,false);
  assert.equal('platform' in d,false);
  assert.equal('service_state' in d,false);
});

test('CABA Comuna 1 stays preserved while MobilityDecision binds caba',async()=>{
  const place=georefPlace('02','Ciudad Autónoma de Buenos Aires','020001','Comuna 1',-34.6037,-58.3816);
  const r=await resolveWithPlace(place,'photon:W:caba-order057');
  const d=r.mobility_decision;
  assertDecisionShape(d);
  assert.equal(r.destination.locality.name,'Comuna 1');
  assert.equal(d.destination.locality.name,'Comuna 1');
  assert.equal(d.integration_slug,'caba');
  assert.equal(d.coverage,'T1_OFFICIAL_HANDOFF');
  assert.equal(d.state,'handoff');
  assert.ok(d.available_modes.includes('bus'));
  assert.equal(d.available_modes.includes('rail'),false);
  assert.ok(d.handoffs.length>=1);
});

test('unintegrated verified destination returns explicit useful next action',async()=>{
  const place=georefPlace('78','Santa Cruz','780140','Río Gallegos',-51.6230,-69.2168);
  const r=await resolveWithPlace(place,'photon:W:rio-gallegos-order057');
  const d=r.mobility_decision;
  assertDecisionShape(d);
  assert.equal(r.destination.territory_verified,true);
  assert.equal(d.integration_slug,null);
  assert.equal(d.coverage,'T0_TERRITORY_ONLY');
  assert.equal(d.state,'handoff');
  assert.deepEqual(d.available_modes,[]);
  assert.equal(d.source_class,'handoff');
  assert.deepEqual(d.facts,[]);
  assert.deepEqual(d.handoffs,[]);
  assert.ok(d.next_actions.some(a=>a.type==='consult_navigation'));
});

test('GeoRef outage remains fail-closed and MobilityDecision never fabricates mobility',async()=>{
  const r=await resolveDestinationSelection({candidate_ref:'photon:W:failclosed057',coordinates:{lat:-31.6,lon:-60.7},session_token:'abcdefghijklmnop'},async()=>new Response('bad',{status:503}));
  const d=r.mobility_decision;
  assertDecisionShape(d);
  assert.equal(r.destination.territory_verified,false);
  assert.equal(d.integration_slug,null);
  assert.equal(d.coverage,'T0_TERRITORY_ONLY');
  assert.equal(d.state,'unknown');
  assert.deepEqual(d.available_modes,[]);
  assert.deepEqual(d.facts,[]);
  assert.deepEqual(d.handoffs,[]);
  assert.ok(d.next_actions.some(a=>a.type==='view_map'));
});

test('MobilityDecision normalizer accepts authoritative contract without inferring availability',async()=>{
  const place=georefPlace('66','Salta','660105','Salta',-24.7821,-65.4232);
  const r=await resolveWithPlace(place,'photon:W:salta-order057');
  const normalized=normalizeMobilityDecision(r.mobility_decision);
  assert.equal(normalized.state,r.mobility_decision.state);
  assert.equal(normalized.integration_slug,'salta');
  assert.ok(normalized.available_modes.includes('bus'));
  assert.equal(normalized.available_modes.includes('rail'),false);
  assert.equal(normalized.source_class,'handoff');
});

test('frontend consumes MobilityDecision and contains no mobility availability inference/fetch',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(app,/\/api\/mobility\/compute/);
  assert.doesNotMatch(app,/\/api\/mobility\/(?!compute)/);
  assert.doesNotMatch(app,/candidate\.integration_slug/);
  assert.doesNotMatch(app,/candidate\.coverage/);
  assert.match(app,/payload\.mobility_decision/);
  const selectStart=app.indexOf('async function selectDestination');
  const selectEnd=app.indexOf("$('#manual-origin')",selectStart);
  const selectBlock=app.slice(selectStart,selectEnd);
  assert.doesNotMatch(selectBlock,/territory_verified|integration_slug|coverage|\/api\/mobility\//);
  const optionsStart=app.indexOf('function renderOptions');
  const optionsEnd=app.indexOf('function officialHandoffButtonLabel',optionsStart);
  const optionsBlock=app.slice(optionsStart,optionsEnd);
  assert.doesNotMatch(optionsBlock,/territory_verified|integration_slug|coverage/);
  const assistantStart=app.indexOf('function assistantModel');
  const assistantEnd=app.indexOf('function updateAssistant',assistantStart);
  const assistantBlock=app.slice(assistantStart,assistantEnd);
  assert.doesNotMatch(assistantBlock,/territory_verified|integration_slug|coverage/);
});

test('buildMobilityDecision does not trust client-shaped integration fields',()=>{
  const destination={
    label:'Comuna 1',territory_verified:true,coverage:'T0_TERRITORY_ONLY',integration_slug:null,
    coordinates:{lat:-34.6037,lon:-58.3816},
    province:{id:'02',name:'Ciudad Autónoma de Buenos Aires'},
    locality:{id:'020001',name:'Comuna 1',slug:'comuna-1'}
  };
  const d=buildMobilityDecision(destination,Date.parse('2026-09-05T12:00:00Z'));
  assert.equal(d.integration_slug,'caba');
  assert.equal(d.coverage,'T1_OFFICIAL_HANDOFF');
  assert.equal(d.state,'handoff');
});

test('verified Santo Tome destination always exposes useful national mobility consultation actions',()=>{
  const destination={
    label:'Bomberos Voluntarios de Santo Tome',territory_verified:true,
    coordinates:{lat:-31.662,lon:-60.765},
    province:{id:'82',name:'Santa Fe'},
    locality:{id:'820147',name:'Santo Tome',slug:'santo-tome'}
  };
  const d=buildMobilityDecision(destination,Date.parse('2026-09-05T15:00:00Z'));
  assert.equal(d.integration_slug,null);
  assert.ok(d.next_actions.some(a=>a.type==='consult_navigation'&&a.travel_mode==='transit'));
  assert.ok(d.next_actions.some(a=>a.type==='consult_navigation'&&a.travel_mode==='walking'));
  assert.ok(d.next_actions.some(a=>a.type==='consult_navigation'&&a.travel_mode==='bicycling'));
  assert.ok(d.next_actions.some(a=>a.type==='consult_navigation'&&a.travel_mode==='driving'));
  assert.notEqual(d.state,'unavailable');
});

test('representative verified destination in all 24 Argentina jurisdictions has at least one useful mobility action',()=>{
  const jurisdictions=[
    ['02','Ciudad Autonoma de Buenos Aires'],['06','Buenos Aires'],['10','Catamarca'],['14','Cordoba'],
    ['18','Corrientes'],['22','Chaco'],['26','Chubut'],['30','Entre Rios'],['34','Formosa'],['38','Jujuy'],
    ['42','La Pampa'],['46','La Rioja'],['50','Mendoza'],['54','Misiones'],['58','Neuquen'],['62','Rio Negro'],
    ['66','Salta'],['70','San Juan'],['74','San Luis'],['78','Santa Cruz'],['82','Santa Fe'],
    ['86','Santiago del Estero'],['90','Tucuman'],['94','Tierra del Fuego']
  ];
  for(const [provinceId,provinceName] of jurisdictions){
    const destination={
      label:`Destino ${provinceName}`,territory_verified:true,coordinates:{lat:-35,lon:-64},
      province:{id:provinceId,name:provinceName},locality:{id:`${provinceId}9999`,name:`Localidad ${provinceName}`,slug:`localidad-${provinceId}`}
    };
    const d=buildMobilityDecision(destination,Date.parse('2026-09-05T15:00:00Z'));
    assert.ok(d.handoffs.length+d.next_actions.filter(a=>a.type!=='view_map'&&a.type!=='refine_destination').length>=1,provinceName);
  }
});

test('origin success paths forcibly collapse the manual editor and reset aria-expanded',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const manualStart=app.indexOf('async function resolveManualOrigin');
  const manualEnd=app.indexOf("$('#use-location').addEventListener",manualStart);
  const manualBlock=app.slice(manualStart,manualEnd);
  assert.match(manualBlock,/originEditor\.hidden\s*=\s*true/);
  assert.match(manualBlock,/setAttribute\(['\"]aria-expanded['\"],['\"]false['\"]\)/);
  const gpsStart=app.indexOf("$('#use-location').addEventListener");
  const gpsEnd=app.indexOf("$('#clear-location').addEventListener",gpsStart);
  const gpsBlock=app.slice(gpsStart,gpsEnd);
  assert.match(gpsBlock,/originEditor\.hidden\s*=\s*true/);
  assert.match(gpsBlock,/setAttribute\(['\"]aria-expanded['\"],['\"]false['\"]\)/);
});

test('external navigation URL builder and validator are strict and privacy-safe',async()=>{
  const contracts=await import('../public/contracts.js');
  assert.equal(typeof contracts.buildExternalNavigationUrl,'function');
  assert.equal(typeof contracts.isSafeExternalNavigationUrl,'function');
  const url=contracts.buildExternalNavigationUrl({lat:-31.662,lon:-60.765},'transit',{lat:-31.6333,lon:-60.7});
  assert.equal(contracts.isSafeExternalNavigationUrl(url),true);
  const parsed=new URL(url);
  assert.equal(parsed.origin,'https://www.google.com');
  assert.equal(parsed.pathname,'/maps/dir/');
  assert.equal(parsed.searchParams.get('api'),'1');
  assert.equal(parsed.searchParams.get('travelmode'),'transit');
  assert.match(parsed.searchParams.get('destination'),/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/);
  assert.match(parsed.searchParams.get('origin'),/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/);
  assert.equal(contracts.isSafeExternalNavigationUrl('https://evil.example/maps/dir/?api=1&destination=-31,-60&travelmode=transit'),false);
  assert.equal(contracts.isSafeExternalNavigationUrl('https://www.google.com/maps/dir/?api=1&destination=-31,-60&travelmode=flying'),false);
  assert.equal(contracts.isSafeExternalNavigationUrl('https://www.google.com/maps/dir/?api=1&destination=-31,-60&travelmode=transit&foo=bar'),false);
  assert.equal(contracts.isSafeExternalNavigationUrl('https://www.google.com/maps/dir/?api=1&destination=-31,-60&travelmode=transit#x'),false);
});


test('ORDER057-R1 integrated Santa Fe augments official handoff with useful multi-mode baseline',()=>{
  const destination={
    label:'Plaza Constituyentes',territory_verified:true,
    coordinates:{lat:-31.6333,lon:-60.7000},
    province:{id:'82',name:'Santa Fe'},
    locality:{id:'820147',name:'Santa Fe',slug:'santa-fe'}
  };
  const d=buildMobilityDecision(destination,Date.parse('2026-09-06T18:00:00Z'));
  assert.equal(d.integration_slug,'santa-fe');
  assert.ok(d.handoffs.some(h=>h.mode==='bus'),'official Santa Fe handoff must remain');
  for(const mode of ['transit','walking','bicycling','driving']){
    assert.ok(d.next_actions.some(a=>a.type==='consult_navigation'&&a.travel_mode===mode),`missing useful baseline ${mode}`);
  }
});

test('ORDER057-R1 integrated city baseline is not suppressed merely by integration_slug',()=>{
  const integrated=[
    ['02','Ciudad Autonoma de Buenos Aires','Comuna 6','comuna-6'],
    ['14','Cordoba','Cordoba','cordoba'],
    ['50','Mendoza','Mendoza','mendoza'],
    ['66','Salta','Salta','salta'],
    ['82','Santa Fe','Santa Fe','santa-fe']
  ];
  for(const [pid,province,locality,slug] of integrated){
    const d=buildMobilityDecision({label:locality,territory_verified:true,coordinates:{lat:-31,lon:-60},province:{id:pid,name:province},locality:{id:pid+'001',name:locality,slug}},Date.parse('2026-09-06T18:00:00Z'));
    assert.ok(d.integration_slug,`${locality} should bind integration`);
    for(const mode of ['transit','walking','bicycling','driving']) assert.ok(d.next_actions.some(a=>a.type==='consult_navigation'&&a.travel_mode===mode),`${locality}: ${mode}`);
  }
});

test('ORDER057-R1 static official handoff is direct one-tap while navigation retains privacy confirmation',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const renderStart=app.indexOf('function renderOptions');
  const renderEnd=app.indexOf('function prepareNavigationHandoff',renderStart);
  const renderBlock=app.slice(renderStart,renderEnd);
  assert.match(renderBlock,/function openOfficialHandoff\(/);
  assert.match(renderBlock,/isSafeOfficialHandoff\(url\)/);
  assert.match(renderBlock,/window\.open\(url,'_blank','noopener,noreferrer'\)/);
  assert.match(renderBlock,/data-handoff-url/);
  assert.doesNotMatch(renderBlock,/prepareHandoff\(button\.dataset\.handoffUrl/);
  assert.doesNotMatch(renderBlock,/>Ver informaci[oó]n</);
  const navStart=app.indexOf('function prepareNavigationHandoff');
  const navEnd=app.indexOf("cancelHandoff.addEventListener",navStart);
  const navBlock=app.slice(navStart,navEnd);
  assert.match(navBlock,/dialog\.showModal\(\)/);
  assert.match(navBlock,/Google Maps recibir/);
});