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

test('current and stale app fare statuses are distinguished', () => {
  assert.equal(MobilityEngine.isAppFareUsable({ ...model, status: 'current' }), true);
  assert.equal(MobilityEngine.isAppFareUsable({ ...model, status: 'stale_estimate' }), false);
});
