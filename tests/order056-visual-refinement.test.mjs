import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/styles.css',import.meta.url),'utf8');
const visualHarness=await readFile(new URL('../order056/evidence/visual-state-matrix.mjs',import.meta.url),'utf8');

test('destination search is structurally embedded in the spatial hero',()=>{
  assert.match(html,/class="destination-search-stack"/);
  assert.match(css,/\.destination-hero\{[^}]*min-height:/s);
  assert.match(css,/\.destination-hero\{[^}]*radial-gradient/s);
  assert.match(css,/\.destination-search-stack\{[^}]*position:relative/s);
});

test('initial desktop uses an intentional hero plus contextual counter-space',()=>{
  assert.match(html,/class="context-rail"/);
  assert.match(css,/body:not\(\[data-view="resolved"\]\) \.planner\{[^}]*display:grid[^}]*grid-template-columns:/s);
  assert.equal(css.includes('body:not([data-view="resolved"]) .planner{width:min(100%,760px)}'),false);
});

test('assistant belongs to the initial composition instead of floating detached',()=>{
  assert.match(css,/body:not\(\[data-view="resolved"\]\) \.assistant\{[^}]*position:(?:relative|static)/s);
  assert.match(css,/body\[data-view="resolved"\] \.assistant\{[^}]*position:fixed/s);
});

test('mobile and short landscape have purpose-built composition rules',()=>{
  assert.match(css,/@media\s*\(max-width:\s*700px\)/);
  assert.match(css,/@media\s*\(max-height:\s*460px\)\s*and\s*\(orientation:\s*landscape\)/);
  assert.match(css,/@media\s*\(max-height:\s*460px\)[\s\S]*?\.planner\{[^}]*grid-template-columns:/s);
});

test('visual motion stays within the authorized 180-420ms craft range',()=>{
  assert.match(css,/--motion-fast:180ms/);
  assert.match(css,/--motion-slow:(?:320|340|360|380|400|420)ms/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('short landscape preserves 44px minimum touch targets',()=>{
  const landscape=css.slice(css.indexOf('@media (max-height: 460px) and (orientation: landscape)'));
  assert.match(landscape,/\.quiet-action\{[^}]*min-height:44px/);
  assert.match(landscape,/\.origin-action\{[^}]*min-height:44px/);
  assert.match(landscape,/\.assistant-toggle\{height:44px;min-height:44px/);
});


test('expanded assistant controls preserve 44px minimum touch targets',()=>{
  assert.match(css,/\.assistant-heading button\{[^}]*width:44px;height:44px;min-width:44px;min-height:44px/s);
  assert.match(css,/\.assistant-action\{[^}]*min-height:44px/s);
});

test('error-state harness allowlists only the intentional mocked suggest 503',()=>{
  assert.match(visualHarness,/EXPECTED_ERROR_COPY='La búsqueda no está disponible ahora\.'/);
  assert.match(visualHarness,/isExpectedMockedSuggest503/);
  assert.match(visualHarness,/unexpectedErrors/);
  assert.match(visualHarness,/recoverable/);
});


test('visual harness treats only the stubbed telemetry abort as expected network noise',()=>{
  assert.match(visualHarness,/isExpectedTelemetryAbort/);
  assert.match(visualHarness,/unexpectedNetworkFailures/);
});


test('assistant reveal motion never scales touch targets below their CSS size',()=>{
  assert.match(css,/@keyframes assistantIn\{from\{opacity:0;transform:translate3d\(0,10px,0\)\}to\{opacity:1;transform:none\}\}/);
});
