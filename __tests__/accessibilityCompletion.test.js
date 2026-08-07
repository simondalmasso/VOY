/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'VOY-Lite.html'), 'utf8');
const shell = fs.readFileSync(path.join(__dirname, '..', 'public', 'core', 'productShell.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'ui', 'productShell.css'), 'utf8');

test('primary mobility surface has named search, map, status, tabs and trip region', () => {
  assert.match(html, /role="search"/);
  assert.match(html, /id="destInput"[^>]+aria-label="Buscar destino"/);
  assert.match(html, /id="map"[^>]+aria-label="Mapa de Santa Fe"/);
  assert.match(html, /id="offlineChip"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html, /id="modeSelector"[^>]+role="tablist"/);
  assert.match(html, /id="decisionSheet"[^>]+role="region"[^>]+aria-label="Opciones de viaje"/);
});

test('product shell supplies keyboard skip, dialog focus trap and 48px controls', () => {
  assert.match(shell, /Saltar a buscar destino/);
  assert.match(shell, /trapFocus/);
  assert.match(shell, /event\.key !== 'Tab'/);
  assert.match(shell, /aria-expanded/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /width:48px;height:48px/);
  assert.match(css, /prefers-reduced-motion/);
});
