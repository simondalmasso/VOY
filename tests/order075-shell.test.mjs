import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const json=async p=>JSON.parse(await read(p));

test('ORDER075 mobile first viewport is map-first (shell structure)',async()=>{
  const html=await read('public/index.html');
  const css=await read('public/styles.css');
  assert.match(html,/id="map-shell"[^>]*class="[^"]*voy-map-stage/);
  assert.match(css,/\.voy-map-stage\{[^}]*position:absolute/s);
  assert.match(css,/\.voy-map-stage\{[^}]*inset:0/s);
  assert.match(css,/\.voy-map-stage\{[^}]*height:100%/s);
  assert.match(html,/id="voy-sheet"/);
  assert.match(css,/--sheet-collapsed-max:/);
  assert.match(css,/\.voy-sheet\[data-pane="collapsed"\]\{[^}]*max-height:var\(--sheet-collapsed-max\)/s);
  assert.match(css,/--sheet-collapsed-max:min\(\d+px,\s*30svh\)/,'collapsed sheet cap must be <=30% of map height');
  assert.match(css,/\.voy-topbar\{[^}]*height:/s);
  assert.doesNotMatch(html,/class="destination-hero"/);
  assert.doesNotMatch(html,/¿A dónde vas\?/);
  assert.ok(html.indexOf('id="voy-sheet"')>html.indexOf('id="map-shell"'),'map before sheet in DOM');
  assert.ok(html.indexOf('id="destination"')>html.indexOf('id="voy-sheet"'),'destination search is inside the sheet (secondary)');
});

test('ORDER075 search is available but secondary (chip + sheet)',async()=>{
  const [html,css,app]=await Promise.all([read('public/index.html'),read('public/styles.css'),read('public/app.js')]);
  assert.match(html,/id="search-chip"/);
  assert.match(html,/id="search-chip"[^>]*aria-controls="sheet-body"|id="search-chip"[^>]*aria-expanded/);
  assert.match(app,/id="search-chip"|searchChip/);
  assert.match(css,/\.search-chip\{|\.voy-chip\{/);
  assert.ok(html.indexOf('id="destination"')>html.indexOf('id="sheet-body"'));
  assert.match(css,/\[data-pane="collapsed"\][^{}]*\.sheet-expanded\{[^}]*display:none/s);
});

test('ORDER075 temporal truth pill is visible, stateful and not color-only',async()=>{
  const [html,css,app]=await Promise.all([read('public/index.html'),read('public/styles.css'),read('public/app.js')]);
  assert.match(html,/id="truth-pill"/);
  assert.match(html,/id="truth-pill"[^>]*role="status"/);
  assert.match(html,/id="truth-pill"[^>]*aria-live="polite"/);
  assert.match(css,/\.truth-pill\{/);
  assert.match(app,/TRUTH_STATES|truthPill/);
  for(const label of ['En vivo','Estimado','Programado','Estado desconocido']){
    assert.ok(app.includes(`'${label}'`)||app.includes(`"${label}"`)||app.includes(label),'missing truth label: '+label);
  }
  assert.ok(app.includes('Estado en vivo no integrado'),'non-integrated realtime state must remain explicit');
  assert.match(app,/truth-icon|truthPill.*dataset\.state|dataset\.state.*truth/i);
});

test('ORDER075 2D default with compact 2D|3D control and lazy three',async()=>{
  const [html,app,sw]=await Promise.all([read('public/index.html'),read('public/app.js'),read('public/sw.js')]);
  assert.match(html,/data-map-mode="2d"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(html,/<script[^>]+(?:three|voy3d)/i);
  assert.doesNotMatch(html,/<link[^>]+(?:three|3d\/topology)/i);
  assert.doesNotMatch(sw,/\/3d\//);
  assert.match(app,/import\(['"]\.\/3d\/voy3d\.js/);
  assert.match(app,/mod\.BUILD_ID!==CLIENT_BUILD_ID/);
});

test('ORDER075 map substrate: pinned MapLibre + OpenFreeMap with raster fallback',async()=>{
  const [app,substrate,pkg,lock,config]=await Promise.all([read('public/app.js'),read('public/map/substrate.js'),json('package.json'),json('package-lock.json'),read('public/runtime-config.js')]);
  assert.equal(pkg.dependencies['maplibre-gl'],'6.11.2','exact pinned maplibre version');
  assert.equal(lock.packages?.['node_modules/maplibre-gl']?.version,'6.11.2');
  assert.doesNotMatch(substrate,/latest/);
  assert.doesNotMatch(substrate,/api[-_]?key/i,'no API key may appear in the substrate');
  assert.match(substrate,/import\('\/vendor\/maplibre-gl\.mjs\?v=__BUILD_ID__'\)/);
  assert.ok(config.includes('tiles.openfreemap.org'),'vector hosts declared in runtime config');
  assert.match(substrate,/tiles\.openfreemap\.org/);
  assert.match(substrate,/styles\/liberty/);
  assert.match(substrate,/vector_failed|rasterFallback|fallbackToRaster/);
  assert.match(substrate,/onVectorError|styledata-error|error/);
  assert.match(substrate,/attribution/i);
  assert.match(substrate,/OpenStreetMap/);
  assert.match(substrate,/raster-first|rasterFirst|paintRaster/);
});

test('ORDER075 vector failure keeps raster map and tracker facts',async()=>{
  const [substrate,app]=await Promise.all([read('public/map/substrate.js'),read('public/app.js')]);
  assert.match(substrate,/substrate\s*=\s*['"]vector_failed['"]|state\.substrate\s*=\s*['"]vector_failed['"]/);
  assert.doesNotMatch(substrate,/clearSelection\(\)/s);
  assert.match(app,/onSubstrateChange|substrateChange/);
});

test('ORDER075 map markers are accessible buttons with truthful labels',async()=>{
  const [substrate,css,app]=await Promise.all([read('public/map/substrate.js'),read('public/styles.css'),read('public/app.js')]);
  assert.match(substrate,/createElement\('button'\)/);
  assert.match(substrate,/aria-label/);
  assert.match(app,/markerLabel|truthLabel|En vivo/,'truthful marker labels are built by the app layer');
  assert.match(css,/\.tracker-marker\{/);
  assert.match(css,/\.tracker-marker\{[^}]*min-width:44px|min-height:44px/s);
});

test('ORDER075 tracker sheet exposes follow/resume, time rail and DOM facts',async()=>{
  const [html,app,css]=await Promise.all([read('public/index.html'),read('public/app.js'),read('public/styles.css')]);
  assert.match(html,/id="follow-button"/);
  assert.ok(app.includes('Reanudar seguimiento'),'resume-follow action label must exist (dynamic state)');
  assert.match(html,/id="time-rail"/);
  assert.match(html,/id="time-rail"[^>]*type="range"/);
  assert.match(html,/id="return-to-now"|Volver a ahora/);
  assert.ok(app.includes('Histórico de esta sesión'),'historical session label must exist');
  assert.match(app,/scrubTo|scrub/);
  assert.match(app,/returnToNow/);
  assert.match(css,/\.time-rail\{/);
  assert.match(css,/\.follow-button\{|\.sheet-action\{/);
});

test('ORDER075 no horizontal overflow at 200% text (layout contracts)',async()=>{
  const css=await read('public/styles.css');
  assert.match(css,/ORDER075 MAP-FIRST/);
  assert.match(css,/html\{[^}]*overflow-x:hidden/s);
  assert.match(css,/[data-pane="expanded"\][^{]*\.sheet-expanded|\.sheet-expanded\{[^}]*overflow-y:auto/s);
  const cssNoMedia=css.replace(/@media[^{]+\{/g,'');
  assert.doesNotMatch(cssNoMedia,/min-width:\s*(3[2-9][1-9]|[4-9]\d\d)px/);
  assert.match(css,/grid-template-columns:minmax\(0,/);
  assert.match(css,/overflow-wrap:anywhere|overflow-wrap:break-word/);
});

test('ORDER075 keyboard can reach map controls, sheet, markers and follow',async()=>{
  const html=await read('public/index.html');
  assert.match(html,/id="map-mode-toggle"[^>]*role="group"/);
  assert.match(html,/id="sheet-toggle"[^>]*aria-expanded/);
  assert.match(html,/id="time-rail"[^>]*(?:aria-label|title)/);
  assert.match(html,/id="follow-button"[^>]*type="button"/);
  assert.match(html,/id="destination"[^>]*role="combobox"/);
});

test('ORDER075 no secret/key/credential enters client source',async()=>{
  const files=['public/app.js','public/map/substrate.js','public/tracker/store.js','public/tracker/observations.js','public/tracker/fixtures.js','public/runtime-config.js','public/styles.css','public/index.html'];
  for(const f of files){
    const src=await read(f);
    assert.doesNotMatch(src,/(sk-[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY|api[_-]?key\s*[:=]\s*['"][A-Za-z0-9])/i,f+' must not contain credentials');
    assert.doesNotMatch(src,/password\s*[:=]\s*['"][^'"]{4,}/i,f+' must not contain passwords');
  }
  const config=await read('public/runtime-config.js');
  assert.doesNotMatch(config,/token\s*:\s*['"][A-Za-z0-9]{16,}/i);
});

test('ORDER075 CSP allows OpenFreeMap vector hosts and keeps strict defaults',async()=>{
  const headers=await read('public/_headers');
  const worker=await read('src/worker.template.js');
  for(const src of [headers,worker]){
    assert.match(src,/default-src 'self'/);
    assert.match(src,/connect-src [^"\n]*tiles\.openfreemap\.org/);
    assert.match(src,/frame-ancestors 'none'/);
    assert.doesNotMatch(src,/unsafe-eval|unsafe-inline/);
  }
});

test('ORDER075 service worker caches the new map-first shell including tracker modules',async()=>{
  const sw=await read('public/sw.js');
  for(const path of ['/tracker/store.js','/tracker/observations.js','/tracker/fixtures.js','/map/substrate.js']){
    assert.ok(sw.includes(`'${path}'`),`sw CORE must cache ${path}`);
  }
  const core=sw.slice(sw.indexOf('CORE=['),sw.indexOf(']',sw.indexOf('CORE=[')));
  assert.doesNotMatch(core,/\/api\//,'api stays network-only');
  assert.doesNotMatch(core,/\/3d\//);
  assert.doesNotMatch(core,/vendor\//);
});

test('ORDER075 app wiring keeps planner behavior contracts alive',async()=>{
  const app=await read('public/app.js');
  assert.match(app,/\/api\/destinations\/suggest/);
  assert.match(app,/\/api\/mobility\/compute/);
  assert.doesNotMatch(app,/\/api\/mobility\/(?!compute)/);
  assert.match(app,/function renderOptions\(/);
  assert.match(app,/function refreshTrainRadar/);
  assert.match(app,/function updateTrainStationMarkers/);
  assert.match(app,/state\.mapCenter=\{lat:Number\(coords\.lat\),lon:Number\(coords\.lon\)\}/);
  for(const literal of ["'A pie'","'Bici'","'Auto'","'Colectivo'"])assert.ok(app.includes(literal));
  assert.ok(app.includes('Arribos en VOY: no integrados'));
  assert.ok(app.includes('Recorridos publicados: visibles en el mapa'));
  assert.match(app,/renderInitialMap\(\)/);
  assert.match(app,/renderMap\(DEFAULT_MAP_CENTER/);
});
