/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

async function loadContract() {
  return import('../scripts/required-city-platform-assets.mjs');
}

test('canonical City Platform asset set contains exactly thirteen required paths', async () => {
  const contract = await loadContract();
  assert.equal(contract.REQUIRED_CITY_PLATFORM_ASSETS.length, 13);
  assert.equal(contract.REQUIRED_CITY_PLATFORM_ASSET_COUNT, 13);
  assert.equal(contract.assertCanonicalAssetSet(), true);
  assert.deepEqual(contract.REQUIRED_CITY_PLATFORM_ASSETS.map(asset => asset.path), [
    '/',
    '/VOY-Lite.html',
    '/core/cityPlatform.js?v=1',
    '/cities/_default/profile.json',
    '/cities/_default/providers.json',
    '/cities/_default/transport.json',
    '/cities/_default/fares.json',
    '/cities/_default/feature_flags.json',
    '/cities/santa-fe/profile.json',
    '/cities/santa-fe/providers.json',
    '/cities/santa-fe/transport.json',
    '/cities/santa-fe/fares.json',
    '/cities/santa-fe/feature_flags.json'
  ]);
});

test('removing Santa Fe providers from required set fails closed', async () => {
  const contract = await loadContract();
  const incomplete = contract.REQUIRED_CITY_PLATFORM_ASSETS.filter(asset => asset.path !== '/cities/santa-fe/providers.json');
  assert.throws(() => contract.assertCanonicalAssetSet(incomplete), /required_asset_count|missing_required_asset/);
});

test('each territory has exactly five tested components', async () => {
  const contract = await loadContract();
  for (const cityId of ['_default', 'santafe']) {
    const components = contract.REQUIRED_CITY_PLATFORM_ASSETS.filter(asset => asset.cityId === cityId).map(asset => asset.component).sort();
    assert.deepEqual(components, [...contract.REQUIRED_TERRITORIAL_COMPONENTS].sort());
  }
});

test('all local required assets are non-empty and schema-valid', async () => {
  const contract = await loadContract();
  const manifest = contract.expectedAssetManifest(resolve(__dirname, '..'));
  assert.equal(manifest.length, 13);
  for (const expected of manifest) {
    assert.ok(expected.expectedBytes > 0, expected.path);
    assert.match(expected.expectedSha256, /^[a-f0-9]{64}$/, expected.path);
  }
});

test('remote record rejects empty body, hash mismatch, invalid JSON and wrong city', async () => {
  const contract = await loadContract();
  const asset = contract.REQUIRED_CITY_PLATFORM_ASSETS.find(entry => entry.path === '/cities/santa-fe/providers.json');
  const validBody = readFileSync(resolve(__dirname, '..', asset.sourcePath));
  const expected = {
    ...asset,
    expectedSha256: contract.sha256(validBody),
    expectedBytes: validBody.length
  };
  const metadata = { status: 200, requested_url: 'https://example.invalid', effective_url: 'https://example.invalid' };

  assert.equal(contract.evaluateRemoteAsset(asset, Buffer.alloc(0), metadata, expected).pass, false);
  assert.equal(contract.evaluateRemoteAsset(asset, Buffer.from('{}'), metadata, expected).hash_pass, false);
  assert.equal(contract.evaluateRemoteAsset(asset, Buffer.from('{'), metadata, expected).json_parse_result, false);

  const wrongCity = JSON.parse(validBody.toString('utf8'));
  wrongCity.city_id = '_default';
  const wrongBody = Buffer.from(JSON.stringify(wrongCity));
  const wrongExpected = { ...expected, expectedSha256: contract.sha256(wrongBody), expectedBytes: wrongBody.length };
  const result = contract.evaluateRemoteAsset(asset, wrongBody, metadata, wrongExpected);
  assert.equal(result.city_pass, false);
  assert.equal(result.schema_result, false);
  assert.equal(result.pass, false);
});

test('HTTP fallback body cannot be counted as remote providers asset', async () => {
  const contract = await loadContract();
  const asset = contract.REQUIRED_CITY_PLATFORM_ASSETS.find(entry => entry.path === '/cities/santa-fe/providers.json');
  const validBody = readFileSync(resolve(__dirname, '..', asset.sourcePath));
  const expected = { ...asset, expectedSha256: contract.sha256(validBody), expectedBytes: validBody.length };
  const fallback = Buffer.from(JSON.stringify({ schema_version: 1, city_id: 'santafe', providers: {}, taxi_companies: [], remis_companies: [], source: 'fallback' }));
  const result = contract.evaluateRemoteAsset(asset, fallback, { status: 200 }, expected);
  assert.equal(result.schema_result, true);
  assert.equal(result.hash_pass, false);
  assert.equal(result.pass, false);
});
