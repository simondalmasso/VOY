import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('quick Lines action owns the line selector popover', () => {
  assert.match(html, /id="quick-lines-wrap"[\s\S]*?id="quick-lines"[\s\S]*?id="bus-line-control"[\s\S]*?id="bus-line-picker"/);
  assert.match(css, /\.bus-line-control\{[^}]*bottom:calc\(100% \+ 8px\)/);
  assert.match(css, /\.bus-line-control\[hidden\]\{display:none\}/);
});

test('line selection persists, restores after lazy route loading and closes the popover', () => {
  assert.match(app, /localStorage\.getItem\('voy\.sf\.line'\)/);
  assert.match(app, /localStorage\.setItem\('voy\.sf\.line',busLinePicker\.value\)/);
  assert.match(app, /busLineCloseTimer=setTimeout\(closeBusLineControl,10000\)/);
  assert.match(app, /if\(busLinePicker\.value&&sfGpsEnabled\)pollSantaFeGps\(\);\s*closeBusLineControl\(\);/);
});
