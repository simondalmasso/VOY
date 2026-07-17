/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const MobilityEngine = require(path.join(root, 'public', 'core', 'mobilityEngine.js'));
const city = JSON.parse(fs.readFileSync(path.join(root, 'public', 'city_santafe.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'public', 'VOY-Lite.html'), 'utf8');

const model = { base: 1000, km: 500, min: 65, minFare: 3000 };

test('explicit current statuses are usable and other statuses are excluded', () => {
  for (const status of ['current', 'verified', 'active', 'estimated_current']) {
    assert.equal(MobilityEngine.isAppFareUsable({ ...model, status }), true, status);
    assert.equal(MobilityEngine.calcAppPrice({ ...model, status }, 2, 10), 3000);
  }
  for (const status of ['stale_estimate', 'stale_reference', 'expired', 'disabled', 'unknown']) {
    assert.equal(MobilityEngine.isAppFareUsable({ ...model, status }), false, status);
    assert.equal(MobilityEngine.calcAppPrice({ ...model, status }, 2, 10), null);
  }
});

test('legacy fixtures without status remain compatible', () => {
  assert.equal(MobilityEngine.isAppFareUsable(model), true);
  assert.equal(MobilityEngine.calcAppPrice(model, 2, 10), 3000);
});

test('missing or null fare models are unavailable', () => {
  assert.equal(MobilityEngine.isAppFareUsable(null), false);
  assert.equal(MobilityEngine.isAppFareUsable({ ...model, base: null }), false);
  assert.equal(MobilityEngine.calcAppPrice(null, 2, 10), null);
});

test('Santa Fe stale app formulas do not produce prices or ranking entries', () => {
  const result = MobilityEngine.estimateAuto(2, city.fareRegistry, 12);
  assert.equal(result.uberPrice, null);
  assert.equal(result.didiPrice, null);
  assert.equal(result.maximPrice, null);
  assert.equal(result.cabifyPrice, null);
  assert.ok(result.taxiPrice > 0);
  assert.ok(result.remisPrice > 0);

  const ranked = MobilityEngine.rankProviders(result, {
    uber: { available: true }, didi: { available: true }, maxim: { available: true },
    cabify: { available: true }, taxi: { available: true }, remis: { available: true },
    taxiapp: { available: true }
  });
  assert.deepEqual(ranked.map(item => item.id).sort(), ['remis', 'taxi', 'taxiapp']);
});

test('UI preserves app actions without presenting stale amounts', () => {
  assert.match(html, /id="appLivePriceOptions"/);
  assert.match(html, /VOY no compara montos desactualizados/);
  assert.match(html, /<span class="ah-meta">Ver precio<\/span>/);
  assert.match(html, /autoEst\[pid\+'Price'\]/);
  assert.match(html, /core\/mobilityEngine\.js\?v=12/);
  assert.doesNotMatch(html, /core\/mobilityEngine\.js\?v=11/);
});

test('no default Uber confidence is produced when there is no priced hero', () => {
  assert.match(html, /else if\(!hero\)\{\n    \/\/ No current app fare means no synthetic confidence/);
  assert.match(html, /heroProvider=hero\?hero\.id:''/);
  assert.doesNotMatch(html, /heroProvider=hero\?hero\.id:'uber'/);
});
