import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
const offline=readFileSync(new URL('../public/offline.html',import.meta.url),'utf8');
const styles=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

test('offline navigation rejects non-OK and non-HTML responses before cached fallback',()=>{
  assert.match(sw,/response\.ok && \(response\.headers\.get\('content-type'\) \|\| ''\)\.includes\('text\/html'\)/);
  assert.match(sw,/caches\.match\('\/offline\.html'\)/);
  assert.match(sw,/new Response\('Sin conexión', \{status:503/);
});
test('API is network-only and external tiles are never service-worker cached',()=>{
  assert.match(sw,/url\.origin!==self\.location\.origin/);
  assert.match(sw,/url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(sw,/event\.respondWith\(fetch\(req\)\); return/);
});
test('offline document has UTF-8 Spanish, external cached CSS, no inline styling',()=>{
  assert.match(offline,/<html lang="es-AR"/);
  assert.match(offline,/<meta charset="utf-8">/);
  assert.match(offline,/Sin conexión/);
  assert.match(offline,/No mostramos datos guardados como si fueran información actual/);
  assert.match(offline,/<link rel="stylesheet" href="\/styles\.css">/);
  assert.doesNotMatch(offline,/<style\b|style=/);
  assert.match(styles,/body\.offline-page\{/);
  assert.match(styles,/\.offline-retry\{/);
});
