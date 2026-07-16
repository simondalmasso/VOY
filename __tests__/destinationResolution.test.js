/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const Resolver = require('../public/core/destinationResolver.js');
const santaFe = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'city_santafe.json'), 'utf8'));
const bridge = () => santaFe.landmarks.find((item) => item.canonicalId === 'santafe:landmark:puente-colgante');
const bbox = santaFe.map.bbox;

test('Puente Colgante has verified canonical identity and exact coordinates', () => {
  assert.deepEqual(bridge(), {
    canonicalId: 'santafe:landmark:puente-colgante',
    nombre: 'Puente Colgante',
    aliases: ['Puente Colgante de Santa Fe', 'Puente Colgante Ingeniero Marcial Candioti'],
    verified: true,
    source: 'curated',
    precision: 'poi',
    lat: -31.639764,
    lon: -60.682736,
    address: 'Bv. Gálvez 1150'
  });
});

test('normalization handles case, accents and boulevard aliases', () => {
  assert.equal(Resolver.normalizeText('PUENTE COLGÁNTE'), 'puente colgante');
  assert.equal(Resolver.normalizeText('bulevar galvez 1150'), Resolver.normalizeText('bv galvez 1150'));
});

test('local typing searches curated, favorites and recents without remote fetch', async () => {
  let remoteCalls = 0;
  const results = await Resolver.searchLocalSources('Puente', {
    cityId: 'santafe', landmarks: santaFe.landmarks, favorites: [], recents: [],
    remoteSearch: async () => { remoteCalls += 1; return []; }
  });
  assert.equal(remoteCalls, 0);
  assert.equal(results[0].canonicalId, 'santafe:landmark:puente-colgante');
});

test('verified exact curated result outranks a stale recent with the same name', () => {
  const candidates = [
    Resolver.toCanonicalCandidate(bridge(), 'curated', 'santafe'),
    Resolver.toCanonicalCandidate({ name: 'Puente Colgante', lat: -31.6230, lon: -60.6850 }, 'recent', 'santafe')
  ];
  const ranked = Resolver.rankCandidates('Puente Colgante', candidates, { bbox });
  assert.equal(ranked[0].source, 'curated');
  assert.equal(ranked[0].verified, true);
});

test('recent migration reconciles divergent canonical coordinates over 100m', () => {
  const old = [{ name: 'Puente Colgante', lat: -31.6230, lon: -60.6850, ts: 1 }];
  const migrated = Resolver.reconcileRecents(old, santaFe.landmarks, { now: 1234, cityId: 'santafe' });
  assert.equal(migrated.changed, true);
  assert.equal(migrated.recents[0].canonicalId, 'santafe:landmark:puente-colgante');
  assert.deepEqual(migrated.recents[0].previousCoordinates, { lat: -31.623, lon: -60.685 });
  assert.equal(migrated.recents[0].lat, -31.639764);
  assert.equal(migrated.recents[0].lon, -60.682736);
});

test('dedup uses canonical identity, OSM identity, then nearby normalized name and never truncates', () => {
  const input = Array.from({ length: 6 }, (_, index) => ({
    canonicalId: index < 2 ? 'same' : '', source: 'remote', type: 'poi', name: index < 2 ? 'Puente' : `Lugar ${index}`,
    displayName: '', address: '', lat: -31.63 + index / 1000, lon: -60.69, cityId: 'santafe',
    precision: 'poi', confidence: 0.5, verified: false, aliases: [], osmType: index === 2 ? 'node' : '', osmId: index === 2 ? '9' : ''
  }));
  const deduped = Resolver.deduplicateCandidates(input);
  assert.equal(deduped.length, 5);
  assert.ok(deduped.length > 3);
});

test('confidence gate authorizes exact verified POI and preserves coordinates', () => {
  const candidate = Resolver.toCanonicalCandidate(bridge(), 'curated', 'santafe');
  const result = Resolver.resolve('Puente Colgante', [candidate], { bbox });
  assert.equal(result.status, 'resolved');
  assert.equal(result.candidate.lat, -31.639764);
  assert.equal(result.candidate.lon, -60.682736);
});

test('confidence gate requires choice for close candidates and rejects malformed or outside results', () => {
  const pair = ['Terminal de Ómnibus', 'Terminal Belgrano'].map((name, index) => ({
    canonicalId: '', source: 'remote', type: 'transport', name, displayName: name, address: 'Santa Fe',
    lat: -31.643 + index / 10000, lon: -60.701, cityId: 'santafe', precision: 'poi', confidence: 0,
    verified: false, aliases: [], osmType: 'node', osmId: String(index + 1), confidence: 0.7
  }));
  assert.equal(Resolver.resolve('Terminal', pair, { bbox }).status, 'choose');
  assert.equal(Resolver.validateCandidate({ lat: NaN, lon: -60.7 }, { bbox }).valid, false);
  assert.equal(Resolver.validateCandidate({ lat: -34.6, lon: -58.4 }, { bbox }).valid, false);
});

test('complete address may resolve but ambiguous street and no-result queries do not', () => {
  const address = {
    canonicalId: 'osm:node:1', source: 'remote', type: 'address', name: 'Bv. Gálvez 1150',
    displayName: 'Bv. Gálvez 1150, Santa Fe', address: 'Bv. Gálvez 1150, Santa Fe', lat: -31.639764,
    lon: -60.682736, cityId: 'santafe', precision: 'house', confidence: 0, verified: false, aliases: [],
    osmType: 'node', osmId: '1'
  };
  assert.equal(Resolver.resolve('Bv. Gálvez 1150', [address], { bbox }).status, 'resolved');
  assert.notEqual(Resolver.resolve('San Martín', [address], { bbox }).status, 'resolved');
  assert.equal(Resolver.resolve('texto inexistente', [], { bbox }).status, 'none');
});

test('production HTML does not geocode remotely on input or auto-click results[0]', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'VOY-Lite.html'), 'utf8');
  const inputBody = html.match(/async function onSearchInput[\s\S]*?\n}\nfunction onSearchKeydown/)[0];
  assert.doesNotMatch(inputBody, /searchNominatim|_searchRemoteTimer/);
  assert.doesNotMatch(html, /first\.click\(\)/);
  assert.doesNotMatch(html, /nominatim\.openstreetmap\.org\/search/);
});

test('Worker geocode endpoint enforces proxy policy controls', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8');
  assert.match(worker, /\/api\/geocode/);
  assert.match(worker, /countrycodes/);
  assert.match(worker, /bounded/);
  assert.match(worker, /addressdetails/);
  assert.match(worker, /namedetails/);
  assert.match(worker, /VOY_GEOCODE_PROVIDER/);
  assert.match(worker, /429/);
  assert.match(worker, /caches\.default/);
});

test('landmark regression corpus remains discoverable without remote access', async () => {
  const corpus = [
    'Puente Colgante', 'Puente Colgante de Santa Fe', 'Estación Belgrano',
    'Terminal de Ómnibus', 'Hospital Cullen', 'Universidad Nacional del Litoral', 'Catedral Metropolitana'
  ];
  for (const query of corpus) {
    const matches = await Resolver.searchLocalSources(query, { cityId: 'santafe', landmarks: santaFe.landmarks });
    assert.ok(matches.length > 0, query);
    assert.equal(matches[0].cityId, 'santafe');
  }
});

test('normalization regression corpus resolves Puente and boulevard spelling variants', async () => {
  for (const query of ['puente colgante', 'PUENTE COLGANTE', 'Puente Colgánte']) {
    const matches = await Resolver.searchLocalSources(query, { cityId: 'santafe', landmarks: santaFe.landmarks });
    assert.equal(matches[0].canonicalId, 'santafe:landmark:puente-colgante');
  }
  assert.equal(Resolver.normalizeText('bv galvez 1150'), Resolver.normalizeText('bulevar galvez 1150'));
});

test('ambiguous corpus never silently resolves an unverified local candidate', async () => {
  for (const query of ['Terminal', 'Catedral', 'Costanera', 'Belgrano', 'San Martín']) {
    const candidates = await Resolver.searchLocalSources(query, { cityId: 'santafe', landmarks: santaFe.landmarks, bbox });
    assert.notEqual(Resolver.resolve(query, candidates, { bbox }).status, 'resolved', query);
  }
});

test('candidate conversion always emits the canonical public contract', () => {
  const candidate = Resolver.toCanonicalCandidate({ display_name: 'Hospital, Santa Fe', lat: '-31.62', lon: '-60.70', osm_type: 'node', osm_id: 7 }, 'remote', 'santafe');
  for (const key of ['canonicalId', 'source', 'type', 'name', 'displayName', 'address', 'lat', 'lon', 'cityId', 'precision', 'confidence', 'verified', 'aliases', 'osmType', 'osmId']) {
    assert.ok(Object.hasOwn(candidate, key), key);
  }
  assert.equal(candidate.canonicalId, 'osm:node:7');
});

test('favorites with canonical identity cannot displace their verified curated match', () => {
  const favorite = Resolver.toCanonicalCandidate({ canonicalId: bridge().canonicalId, name: 'Puente Colgante', lat: -31.623, lon: -60.685 }, 'favorite', 'santafe');
  const ranked = Resolver.rankCandidates('Puente Colgante', [favorite, Resolver.toCanonicalCandidate(bridge(), 'curated', 'santafe')], { bbox });
  const deduped = Resolver.deduplicateCandidates(ranked);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].source, 'curated');
  assert.equal(deduped[0].lat, -31.639764);
});

test('remote fixtures cover height addresses, intersections and malformed results deterministically', () => {
  const fixtures = [
    { name: 'San Martín 2000', precision: 'house', type: 'address', lat: -31.63, lon: -60.7, osmType: 'node', osmId: '1' },
    { name: '25 de Mayo y Tucumán', precision: 'intersection', type: 'intersection', lat: -31.64, lon: -60.7, osmType: 'node', osmId: '2' },
    { name: 'Bulevar Gálvez y Dorrego', precision: 'intersection', type: 'intersection', lat: -31.63, lon: -60.68, osmType: 'node', osmId: '3' },
    { name: 'Av. Freyre y Suipacha', precision: 'intersection', type: 'intersection', lat: -31.64, lon: -60.72, osmType: 'node', osmId: '4' }
  ].map(item => Resolver.toCanonicalCandidate({ ...item, confidence: 0.8 }, 'remote', 'santafe'));
  assert.equal(Resolver.resolve('San Martín 2000', fixtures, { bbox }).status, 'resolved');
  assert.equal(Resolver.validateCandidate(Resolver.toCanonicalCandidate({ name: 'bad' }, 'remote', 'santafe'), { bbox }).valid, false);
  for (const query of ['25 de Mayo y Tucumán', 'Bulevar Gálvez y Dorrego', 'Av. Freyre y Suipacha']) {
    assert.ok(Resolver.rankCandidates(query, fixtures, { bbox }).length > 0);
  }
});
