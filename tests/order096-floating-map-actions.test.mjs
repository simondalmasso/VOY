import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('floating sheet keeps search and suggestions above five real map actions', async () => {
  const html = await read('public/index.html');
  const sheetStart = html.indexOf('id="voy-sheet"');
  const sheet = html.slice(sheetStart, html.indexOf('</section>', sheetStart));
  const search = sheet.indexOf('id="destination"');
  const suggestions = sheet.indexOf('id="destination-suggestions"');
  const bar = sheet.indexOf('id="map-quick-actions"');
  const expanded = sheet.indexOf('class="sheet-expanded"');
  assert.ok(search >= 0 && suggestions > search, 'search input and suggestions must remain together');
  assert.ok(bar > suggestions, 'quick actions must sit beneath destination suggestions');
  assert.ok(expanded > bar, 'detailed planner content sits below the quick controls');
  for (const id of ['quick-location', 'quick-lines', 'quick-origin', 'quick-plan']) {
    assert.ok(sheet.includes('id="' + id + '"'), id + ' must be a real button');
  }
  assert.match(sheet, /id="map-mode-toggle"[^>]*role="group"/, '2D and 3D remain keyboard-accessible in the floating bar');
  assert.doesNotMatch(sheet, /id="search-chip"/, 'do not retain a redundant hidden search trigger');
});

test('floating map controls are bound to existing actions without adding external tracker navigation', async () => {
  const app = await read('public/app.js');
  const html = await read('public/index.html');
  assert.match(app, /quickLocation\.addEventListener\('click'/);
  assert.match(app, /quickLines\.addEventListener\('click'/);
  assert.match(app, /function toggleBusLineControl\(/);
  assert.match(app, /quickOrigin\.addEventListener\('click'/);
  assert.match(app, /quickPlan\.addEventListener\('click'/);
  assert.match(app, /mapModeButtons\.forEach\(button=>button\.addEventListener\('click'/);
  assert.match(html, /id="quick-location"[^>]*aria-label="Usar mi ubicación"/);
  assert.match(html, /id="quick-lines"[^>]*aria-label="Elegir transporte o línea"/);
  assert.match(html, /id="quick-origin"[^>]*aria-label="Elegir origen"/);
  assert.match(html, /id="quick-plan"[^>]*aria-label="Abrir planificador"/);
  assert.doesNotMatch(html, /cuandopasa\.app|href="https?:\/\/(?:www\.)?trackviewer\.app/i);
});

test('mobile and desktop sheet dimensions remain floating, bounded and touch accessible', async () => {
  const css = await read('public/styles.css');
  assert.match(css, /\.voy-sheet\[data-pane="collapsed"\]\{[^}]*pointer-events:none\}/);
  assert.match(css, /\.voy-sheet\[data-pane="collapsed"\] \.sheet-body button,/);
  assert.match(css, /\.voy-sheet\{[^}]*left:12px;[^}]*right:12px;[^}]*bottom:calc\(12px \+ env\(safe-area-inset-bottom\)\)/s);
  assert.match(css, /\.map-quick-actions\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\) minmax\(90px,1\.4fr\) minmax\(0,1fr\) minmax\(0,1fr\)/s,
    'reserve enough width for two accessible map-mode targets');
  assert.match(css, /\.map-quick-action,\.map-quick-view\{[^}]*min-height:48px/s);
  assert.match(css, /\.map-quick-view \.map-mode-toggle button\{[^}]*width:44px;min-width:44px;height:44px;min-height:44px/s,
    'both map mode controls meet the 44 by 44 CSS-pixel target');
  assert.doesNotMatch(css, /\.map-quick-view \.map-mode-toggle button\{width:25px;min-width:25px\}/,
    'mobile rules must not shrink the map mode hit targets');
  assert.match(css, /\.destination-control\{[^}]*min-height:52px/s);
  assert.match(css, /\.suggestions\{[^}]*max-height:min\(228px,28svh\)[^}]*overflow:auto/s);
  assert.match(css, /@media\s*\(min-width:\s*960px\)[\s\S]*?\.voy-sheet\{[^}]*left:50%;[^}]*bottom:18px;[^}]*width:min\(680px,calc\(100vw - 48px\)\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

// Keep the PR's canonical CI rerun anchored to the normalized UTF-8 source tree.


test('line picker popover stays reachable above the collapsed sheet on desktop and mobile', async () => {
  const css = await read('public/styles.css');
  assert.match(css, /\.map-quick-lines-wrap\{[^}]*z-index:70/,
    'the open line picker must stack above the sheet handle');
  assert.match(css, /\.bus-line-control\{[^}]*pointer-events:auto/,
    'the popover itself must receive pointer input');
  assert.match(css, /\.bus-line-selection\{[^}]*pointer-events:auto/,
    'the line selection region must receive pointer input');
  assert.match(css, /\.sheet-body:has\(#bus-line-control:not\(\[hidden\]\)\)\{overflow:visible\}/,
    'the collapsed sheet must not clip the open popover');
  assert.match(css, /\.bus-line-control\{top:auto;left:0;transform:none;width:min\(190px,calc\(100vw - 24px\)\);max-width:none\}/,
    'mobile layout must retain the upward anchor instead of pinning the panel below the viewport');
  assert.doesNotMatch(css, /\.bus-line-control\{top:118px;max-width:190px\}/,
    'the old mobile top offset put the select outside the viewport');
});


test('map viewport updates avoid repeating unchanged transit-control DOM writes', async () => {
  const app = await read('public/app.js');
  assert.match(app, /if\(busLineSelection&&busLineSelection\.hidden!==selectionHidden\)busLineSelection\.hidden=selectionHidden/,
    'do not rewrite the selector visibility on every map move');
  assert.match(app, /if\(busLinePicker&&busLinePicker\.disabled!==pickerDisabled\)busLinePicker\.disabled=pickerDisabled/,
    'do not rewrite the disabled state when coverage has not changed');
  assert.match(app, /if\(transitContextStatus\.textContent!==unavailableMessage\)transitContextStatus\.textContent=unavailableMessage/,
    'avoid replacing the same out-of-coverage status on every viewport update');
  assert.match(app, /if\(busLineMeta\.textContent!==coverageMessage\)busLineMeta\.textContent=coverageMessage/,
    'avoid re-rendering identical coverage metadata');
  assert.match(app, /if\(transitContextStatus\.textContent!==availableMessage\)transitContextStatus\.textContent=availableMessage/,
    'only publish the restored-coverage status when it changes');
});


test('location resolution is single-flight and caches nearby reverse-geocodes briefly', async () => {
  const app = await read('public/app.js');
  assert.match(app, /const REVERSE_LOCATION_CACHE_TTL_MS=60_000/);
  assert.match(app, /const REVERSE_LOCATION_CACHE_MAX=8/);
  assert.match(app, /const existing=reverseLocationInFlight\.get\(key\);if\(existing\)return existing/);
  assert.match(app, /reverseLocationCache\.set\(key,\{storedAt:Date\.now\(\),candidate\}\)/);
  assert.match(app, /let locationResolutionInFlight=false/);
  assert.match(app, /if\(locationResolutionInFlight\)return/);
  assert.match(app, /quickLocation\.disabled=true/);
  assert.match(app, /finally\{finishLocationLookup\(\)\}/);
});


test('release build minifies only generated client assets while keeping the source readable', async () => {
  const [build, linuxBuild, three] = await Promise.all([
    read('scripts/build.ps1'), read('scripts/build.sh'), read('public/3d/voy3d.js')
  ]);
  assert.match(build, /esbuild dist\\client\\app\.js --minify --target=es2022/);
  assert.match(build, /esbuild dist\\client\\styles\.css --minify/);
  assert.match(linuxBuild, /'app\.js', 'es2022'.*'styles\.css'/s);
  assert.match(linuxBuild, /'--minify'/);
  assert.match(three, /await import\('\/vendor\/three\.module\.js\?v=__BUILD_ID__'\)/,
    'the heavy 3D engine must remain lazy instead of entering the initial client bundle');
});
