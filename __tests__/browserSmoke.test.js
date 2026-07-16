const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'VOY-Lite.html'),
  'utf8'
);

test('browser boot has a defined handler for every direct event-listener reference', () => {
  const directHandlers = [
    ...html.matchAll(/\.addEventListener\(\s*['"][^'"]+['"]\s*,\s*([A-Za-z_$][\w$]*)\s*[),]/g),
  ].map((match) => match[1]);

  const declarations = new Set([
    ...[...html.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]),
    ...[...html.matchAll(/\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/g)].map((match) => match[1]),
  ]);

  const missing = [...new Set(directHandlers)].filter((handler) => !declarations.has(handler));
  assert.deepEqual(missing, [], `undefined browser event handlers: ${missing.join(', ')}`);
});

test('browser boot can bind the locate control before signaling app ready', () => {
  assert.match(html, /function\s+bindSearchInput\s*\(\)/);
  assert.match(html, /function\s+locateMe\s*\(\)/);
  assert.match(
    html,
    /bindSearchInput\(\);[\s\S]*?_signalAppReady\(\);/,
    'the production boot path must bind controls and then dismiss the splash'
  );
});
