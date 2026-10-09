import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

test('destination suggestions remain in document flow instead of covering origin actions', () => {
  const selector = css.match(/\.suggestions\{([^}]*)\}/);
  assert.ok(selector, 'suggestions stylesheet rule exists');
  assert.match(selector[1], /position:relative/);
  assert.doesNotMatch(selector[1], /position:absolute/);
  assert.match(selector[1], /max-height:min\(248px,30svh\)/);
  assert.match(css, /\.sheet-expanded\{[^}]*overflow-y:auto/);
});

test('VOY yellow stays branding and green stays realtime semantics', () => {
  const dark = css.match(/html\[data-theme="dark"\]\{\s*color-scheme:dark;([\s\S]*?)\n\}/g);
  assert.ok(dark?.some(rule => rule.includes('--accent:#ffd42a')));
  assert.match(css, /\.brand-wordmark\{color:var\(--accent\)\}/);
  assert.match(css, /\.truth-pill\[data-state="realtime"\] \.truth-icon\{color:var\(--success\)\}/);
});

test('raster fallback remains legible when vector tiles cannot render', () => {
  assert.match(css, /\.map-tile\{filter:saturate\(\.72\) brightness\(\.88\) contrast\(1\.05\)\}/);
});
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('manual origin forwards explicit address locality instead of burying it in query text', () => {
  assert.match(app, /function manualOriginRequestPayload\(query\)/);
  assert.match(app, /parts\.length===2&&\/\\d\/\.test\(parts\[0\]\)\)return \{query:parts\[0\],locality:parts\[1\]\}/);
  assert.match(app, /JSON\.stringify\(manualOriginRequestPayload\(query\)\)/);
});
