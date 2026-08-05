/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function json(rel) { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')); }

const profile = json('public/cities/santa-fe/profile.json');
const fares = json('public/cities/santa-fe/fares.json');
const providers = json('public/cities/santa-fe/providers.json');
const transport = json('public/cities/santa-fe/transport.json');

test('Santa Fe declares partial coverage and fresh provenance', () => {
  assert.equal(profile.coverage_level, 'partial');
  assert.equal(profile.verified_at, '2026-08-04');
  assert.ok(profile.coverage_notes.some(note => /paradas.*parcial/i.test(note)));
});

test('regulated fares declare issuer, effective date, verification and current status', () => {
  for (const mode of ['taxi', 'remis', 'bus']) {
    const fare = fares.fare_registry[mode];
    assert.match(fare.source, /Resolución|Decreto|Municipalidad/);
    assert.match(fare.effective_from, /^2026-/);
    assert.equal(fare.verified_at, '2026-08-04');
    assert.equal(fare.status, 'regulated_current');
  }
  assert.equal(fares.fare_registry.bus.cash, null);
});

test('private app availability and price truth fail closed', () => {
  for (const id of ['uber', 'didi']) {
    assert.equal(providers.providers[id].available, true);
    assert.equal(providers.providers[id].availability_status, 'verified_current');
    assert.equal(providers.providers[id].price_status, 'app_only');
    assert.match(providers.providers[id].source_url, /^https:\/\//);
  }
  for (const id of ['maxim', 'cabify', 'radiotaxi', 'taxiapp', 'remisreal']) {
    assert.equal(providers.providers[id].available, false, id);
    assert.match(providers.providers[id].availability_status, /unverified|reference/);
  }
  assert.deepEqual(providers.taxi_companies, []);
  assert.deepEqual(providers.remis_companies, []);
  for (const app of Object.values(fares.fare_registry.apps)) {
    assert.ok(!['current', 'verified', 'active', 'estimated_current'].includes(app.status));
  }
});

test('transport data is explicitly partial reference data, not an official exhaustive feed', () => {
  assert.equal(transport.status, 'partial');
  assert.equal(transport.verified_at, null);
  assert.match(transport.source, /curated/i);
  assert.ok(transport.bus_stops.length > 0);
});
