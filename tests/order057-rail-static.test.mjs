import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RAIL_STATION_CATALOG_META, RAIL_STATIONS } from '../src/rail-stations.generated.js';
import { buildMobilityDecision, nearestRailStations } from '../src/worker.template.js';
import { isSafeOfficialHandoff } from '../public/contracts.js';

const cabaOnceDestination={
  label:'Once',territory_verified:true,coordinates:{lat:-34.60828,lon:-58.40752},
  province:{id:'02',name:'Ciudad Autónoma de Buenos Aires'},
  locality:{id:'020001',name:'Comuna 3',slug:'comuna-3'}
};

test('official rail catalog is pinned, licensed and historical rather than realtime',()=>{
  assert.equal(RAIL_STATION_CATALOG_META.license,'CC-BY-4.0');
  assert.equal(RAIL_STATION_CATALOG_META.data_as_of,'2022');
  assert.match(RAIL_STATION_CATALOG_META.canonical_dataset_url,/datos\.gob\.ar/);
  assert.ok(RAIL_STATIONS.length>=350);
  assert.ok(RAIL_STATIONS.every(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&s.name&&s.line));
});

test('nearest station geometry resolves Once/Sarmiento from official frozen catalog',()=>{
  const rows=nearestRailStations({lat:-34.60828,lon:-58.40752},3,2000);
  assert.ok(rows.length>=1);
  assert.equal(rows[0].name,'Once');
  assert.match(rows[0].line,/Sarmiento/i);
  assert.equal(rows[0].operator,'SOFSE');
  assert.ok(rows[0].distance_meters<150);
});

test('nearest station geometry resolves La Plata/Roca identity without service claims',()=>{
  const rows=nearestRailStations({lat:-34.904375,lon:-57.949636},3,2000);
  assert.ok(rows.length>=1);
  assert.equal(rows[0].name,'La Plata');
  assert.match(rows[0].line,/Roca/i);
  assert.equal(rows[0].operator,'SOFSE');
  assert.ok(rows[0].distance_meters<150);
  assert.equal('estimatedAt' in rows[0],false);
  assert.equal('platform' in rows[0],false);
  assert.equal('delaySeconds' in rows[0],false);
});

test('MobilityDecision adds rail as official static discovery + handoff only',()=>{
  const d=buildMobilityDecision(cabaOnceDestination,Date.parse('2026-09-05T14:00:00Z'));
  assert.equal(d.available_modes.includes('rail'),false);
  assert.equal(d.mode_coverage.rail,'R1_OFFICIAL_STATIC_HANDOFF');
  const railFacts=d.facts.filter(f=>f.mode==='rail');
  assert.ok(railFacts.length>=1 && railFacts.length<=3);
  assert.equal(railFacts[0].kind,'rail_station_reference');
  assert.equal(railFacts[0].value,'Once');
  assert.match(railFacts[0].line,/Sarmiento/i);
  assert.equal(railFacts[0].source.data_class,'OFFICIAL_STATIC_RAIL_CATALOG');
  assert.notEqual(d.source_class,'realtime');
  assert.ok(d.handoffs.some(h=>h.mode==='rail'&&h.url==='https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos'));
  for(const f of railFacts){
    assert.equal('estimatedAt' in f,false);
    assert.equal('platform' in f,false);
    assert.equal('delaySeconds' in f,false);
    assert.equal('service_state' in f,false);
  }
});

test('rail coverage is geographic and does not depend on city_slug integration',()=>{
  const destination={
    label:'Rafaela',territory_verified:true,coordinates:{lat:-31.2503,lon:-61.4867},
    province:{id:'82',name:'Santa Fe'},locality:{id:'820084',name:'Rafaela',slug:'rafaela'}
  };
  const d=buildMobilityDecision(destination,Date.parse('2026-09-05T14:00:00Z'));
  assert.equal(d.integration_slug,null);
  assert.equal(d.coverage,'R1_OFFICIAL_STATIC_HANDOFF');
  assert.deepEqual(d.available_modes,[]);
  assert.equal(d.mode_coverage.rail,'R1_OFFICIAL_STATIC_HANDOFF');
  assert.equal(d.state,'handoff');
  assert.ok(d.facts.some(f=>f.mode==='rail'&&f.value==='Rafaela'));
});

test('frozen official station corpus preserves asserted identity and operator',()=>{
  const corpus=[
    {label:'Once',coords:{lat:-34.6082798,lon:-58.4075158},name:'Once',line:/Sarmiento/i},
    {label:'Caballito',coords:{lat:-34.6197292,lon:-58.444861},name:'Caballito',line:/Sarmiento/i},
    {label:'Haedo',coords:{lat:-34.6444771,lon:-58.5919459},name:'Haedo',line:/Sarmiento/i},
    {label:'Morón',coords:{lat:-34.6482238,lon:-58.619053},name:'Morón',line:/Sarmiento/i},
    {label:'Retiro San Martín',coords:{lat:-34.5892743,lon:-58.3735108},name:'Retiro',line:/San Martín/i},
    {label:'La Plata',coords:{lat:-34.904375,lon:-57.9496361},name:'La Plata',line:/Roca/i},
    {label:'Rafaela',coords:{lat:-31.2503,lon:-61.4867},name:'Rafaela',line:/Mitre/i},
    {label:'Resistencia',coords:{lat:-27.4514,lon:-58.9867},name:'Resistencia',line:/Belgrano/i}
  ];
  for(const row of corpus){
    const found=nearestRailStations(row.coords,3,5000,'SOFSE');
    assert.ok(found.length>=1,row.label);
    assert.equal(found[0].name,row.name,row.label);
    assert.match(found[0].line,row.line,row.label);
    assert.equal(found[0].operator,'SOFSE',row.label);
    assert.equal(/no operativo/i.test(found[0].line),false,row.label);
  }
});

test('duplicate FFCC line labels collapse deterministically for one station/operator',()=>{
  const rows=nearestRailStations({lat:-34.5892743,lon:-58.3735108},10,1000,'SOFSE');
  const sanMartin=rows.filter(r=>r.name==='Retiro'&&/San Martín/i.test(r.line));
  assert.equal(sanMartin.length,1);
});

test('rail official handoff is allowlisted without query or fragment leakage',()=>{
  const url='https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos';
  assert.equal(isSafeOfficialHandoff(url),true);
  assert.equal(isSafeOfficialHandoff(`${url}?lat=-34.6`),false);
  assert.equal(isSafeOfficialHandoff(`${url}#once`),false);
});

test('public disclosures state static-2022 scope and realtime rail remains off',async()=>{
  const sources=await readFile(new URL('../public/sources.html',import.meta.url),'utf8');
  const coverage=await readFile(new URL('../public/coverage.html',import.meta.url),'utf8');
  const config=await readFile(new URL('../public/runtime-config.js',import.meta.url),'utf8');
  assert.match(sources,/2022/);
  assert.match(sources,/CC BY 4\.0/);
  assert.match(sources,/Tiempo real ferroviario:<\/strong> desactivado/);
  assert.match(coverage,/no afirma servicio actual/i);
  assert.match(config,/"rail_realtime":false/);
});

test('frontend keeps rail/bus handoffs secondary and never promotes static facts to selectable trips',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/modeLabel=mobility\.available_modes\.includes\('bus'\)/);
  assert.match(app,/computation\.mode_options\.filter\(option=>option\.selectable===true\)/);
  assert.match(app,/infoActions=\(computation\?\.info_actions\|\|mobility\.handoffs\|\|\[\]\)/);
  assert.match(app,/Información oficial/);
  assert.match(app,/option-info/);
  assert.doesNotMatch(app,/fact\.mode/);
});

test('release build knows how to inline the pinned rail catalog',async()=>{
  const build=await readFile(new URL('../scripts/build.ps1',import.meta.url),'utf8');
  assert.match(build,/rail-stations\.generated\.js/);
  assert.match(build,/RAIL_STATION_CATALOG_META/);
});
