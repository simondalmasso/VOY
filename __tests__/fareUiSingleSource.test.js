/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'VOY-Lite.html'), 'utf8');

test('regulated UI fares delegate to MobilityEngine with completed fichas', () => {
  assert.match(html, /function computeRegulatedFare\(mode,distKm,hourOverride\)/);
  assert.match(html, /MobilityEngine\.estimateTaxi\(distKm,fare,hour\)/);
  assert.match(html, /Math\.floor\(distKm\*1000\/distFicha\)/);
  assert.doesNotMatch(html, /Math\.ceil\(distKm\*1000\/distFicha\)/);
});

test('taxi and remis have independent canonical helpers', () => {
  assert.match(html, /computeRegulatedFare\('taxi',distKm,hourOverride\)/);
  assert.match(html, /computeRegulatedFare\('remis',distKm,hourOverride\)/);
  assert.match(html, /var remisFare=computeRemisFare\(distKm,autoEst\.timeMin\|\|0\)/);
  assert.match(html, /var hasRemisTariff = \(remisFare !== null/);
});

test('remis presentation never derives from taxi multipliers or ranges', () => {
  assert.doesNotMatch(html, /taxiFare\s*\*\s*1\.05/);
  assert.doesNotMatch(html, /taxiRange\.(?:low|high)\s*\*\s*1\.05/);
  assert.match(html, /var remisMeta = hasRemisTariff \? \(formatPrice\(remisFare\)/);
  assert.match(html, /formatPrice\(remisRange\.low\).*formatPrice\(remisRange\.high\)/s);
});

test('regulated municipal prices do not receive app-style surge twice', () => {
  assert.match(html, /PricingEngineV2\.fareRange\(taxiFare,taxiConf,1\)/);
  assert.match(html, /PricingEngineV2\.fareRange\(remisFare,remisConf,1\)/);
  assert.doesNotMatch(html, /fareRange\(taxiFare,taxiConf,taxiSurge\)/);
});

test('mobility engine asset URL is rotated for immediate client convergence', () => {
  assert.match(html, /core\/mobilityEngine\.js\?v=11/);
  assert.doesNotMatch(html, /core\/mobilityEngine\.js\?v=10/);
});
