/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public', 'manifest.json'), 'utf8'));
const sw = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');

test('manifest is installable and every declared icon exists', () => {
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'es-AR');
  assert.ok(manifest.icons.length >= 4);
  for (const icon of manifest.icons) {
    assert.ok(fs.existsSync(path.join(root, 'public', icon.src.replace(/^\//, ''))), icon.src);
  }
});

test('service worker precaches product shell, legal pages and never caches API responses', () => {
  for (const value of ['/', '/VOY-Lite.html', '/manifest.json', '/core/productShell.js?v=2', '/ui/productShell.css?v=2', '/privacy', '/terms', '/sources', '/contact']) {
    assert.match(sw, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(sw, /cache\.addAll\(APP_SHELL\)/);
  assert.match(sw, /API_PATH\.test\(url\.pathname\)/);
  assert.match(sw, /caches\.match\('\/'\)/);
  assert.match(sw, /SKIP_WAITING/);
});
