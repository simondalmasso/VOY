import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('ORDER076 CABA-inspired visual discipline keeps map as the full viewport',async()=>{
  const css=await read('public/styles.css');
  assert.match(css,/ORDER076 CABA_OS VISUAL DISCIPLINE/);
  assert.match(css,/\.topbar\.voy-topbar\{[^}]*position:fixed;[^}]*background:transparent/s);
  assert.match(css,/\.app-shell\{[^}]*position:fixed;[^}]*inset:0/s);
  assert.match(css,/\.map-shell\.voy-map-stage::after\{/);
  assert.match(css,/inset:[^;]+;[^}]*box-shadow:inset/s);
});

test('ORDER076 dark HUD is quiet, monochrome and time-aware',async()=>{
  const [app,css]=await Promise.all([read('public/app.js'),read('public/styles.css')]);
  assert.match(app,/theme:localStorage\.getItem\('voy-theme'\)\|\|'dark'/);
  assert.match(css,/--hud-ink:#e0ecde/);
  assert.match(css,/--hud-muted:#8c9b8f/);
  assert.match(css,/--hud-panel:rgba\(3,7,5,\.82\)/);
  assert.match(css,/\.truth-meta\{[^}]*font-family:ui-monospace/s);
  assert.match(css,/\.time-rail-meta\{[^}]*font-family:ui-monospace/s);
  assert.match(css,/\.map-3d-status\{[^}]*font-family:ui-monospace/s);
});

test('ORDER076 map and panels adopt low-chrome night treatment without new assets',async()=>{
  const css=await read('public/styles.css');
  assert.match(css,/\.map-tiles,#map-canvas canvas\{[^}]*grayscale\(/s);
  assert.match(css,/\.voy-sheet\{[^}]*background:var\(--hud-panel\)/s);
  assert.match(css,/\.truth-pill\{[^}]*background:var\(--hud-panel\)/s);
  assert.match(css,/\.map-mode-toggle\{[^}]*background:var\(--hud-panel\)/s);
  assert.match(css,/\.tracker-marker\.is-selected::after\{[^}]*animation:none/s);
  assert.doesNotMatch(css,/scanline|crt-turn|background-music/i);
});
