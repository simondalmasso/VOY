import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAddress } from '../src/worker.template.js';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' }
});

function geoRefAddress({
  street,
  height,
  locality = 'Santa Fe',
  province = 'Santa Fe',
  localityId = '82063170',
  provinceId = '82',
  coordinates = null
}) {
  return {
    nomenclatura: [street + ' ' + height, locality, 'La Capital', province].join(', '),
    calle: { nombre: street },
    altura: { valor: height },
    localidad: { id: null, nombre: null },
    localidad_censal: { id: localityId, nombre: locality },
    departamento: { id: '82063', nombre: 'La Capital' },
    provincia: { id: provinceId, nombre: province },
    ubicacion: coordinates ? { lat: coordinates.lat, lon: coordinates.lon } : { lat: null, lon: null }
  };
}

function mockedGeoRef(direcciones, inspect = () => {}) {
  return async (url) => {
    const parsed = new URL(String(url));
    inspect(parsed);
    return jsonResponse({ cantidad: direcciones.length, total: direcciones.length, direcciones });
  };
}

test('two-part address parses locality and selects exact SAN MARTIN, not ZORRILLA DE SAN MARTIN', async () => {
  let params;
  const result = await resolveAddress({ query: 'San Martín 2954, Santa Fe' }, mockedGeoRef([
    geoRefAddress({ street: 'SAN MARTIN', height: 2954, coordinates: { lat: -31.6416629, lon: -60.7051010 } }),
    geoRefAddress({ street: 'ZORRILLA DE SAN MARTIN', height: 2954, coordinates: { lat: -31.6323715, lon: -60.7072270 } }),
    geoRefAddress({ street: 'SAN MARTIN', height: 2954, locality: 'San Francisco de Santa Fe', localityId: '82042010' })
  ], (url) => {
    params = url.searchParams;
  }));

  assert.equal(params.get('direccion'), 'San Martín 2954');
  assert.equal(params.get('localidad'), 'Santa Fe');
  assert.equal(params.has('provincia'), false);
  assert.equal(result.result_class, 'resolved');
  assert.equal(result.candidates.length, 1);
  assert.match(result.candidates[0].label, /^SAN MARTIN 2954,/);
  assert.deepEqual(result.candidates[0].coordinates, { lat: -31.6416629, lon: -60.7051010 });
});

test('three-part address parses street, locality and province before GeoRef', async () => {
  let params;
  const result = await resolveAddress({ query: 'Bv. Gálvez 1150, Santa Fe, Santa Fe' }, mockedGeoRef([
    geoRefAddress({ street: 'BV GALVEZ', height: 1150, coordinates: { lat: -31.6388381, lon: -60.6874860 } })
  ], (url) => {
    params = url.searchParams;
  }));

  assert.equal(params.get('direccion'), 'Bv. Gálvez 1150');
  assert.equal(params.get('localidad'), 'Santa Fe');
  assert.equal(params.get('provincia'), 'Santa Fe');
  assert.equal(result.result_class, 'resolved');
  assert.deepEqual(result.candidates[0].coordinates, { lat: -31.6388381, lon: -60.6874860 });
});

test('Argentina country suffix is stripped before parsing a three-part address', async () => {
  let params;
  const result = await resolveAddress({ query: 'Bv. Gálvez 1150, Santa Fe, Santa Fe, Argentina' }, mockedGeoRef([
    geoRefAddress({ street: 'BV GALVEZ', height: 1150, coordinates: { lat: -31.6388381, lon: -60.6874860 } })
  ], (url) => {
    params = url.searchParams;
  }));

  assert.equal(params.get('direccion'), 'Bv. Gálvez 1150');
  assert.equal(params.get('localidad'), 'Santa Fe');
  assert.equal(params.get('provincia'), 'Santa Fe');
  assert.equal(result.result_class, 'resolved');
});

test('GeoRef address with null coordinates returns an honest unverified result, not a 502 schema error', async () => {
  const result = await resolveAddress({ query: 'Av. 7 Jefes 5100, Santa Fe, Santa Fe' }, mockedGeoRef([
    geoRefAddress({ street: 'AV 7 JEFES', height: 5100 })
  ]));

  assert.equal(result.ok, false);
  assert.equal(result.result_class, 'unverified');
  assert.equal(result.error, 'territory_coordinates_unavailable');
  assert.deepEqual(result.candidates, []);
});

test('bare address with missing locality remains ambiguous and requests context', async () => {
  const result = await resolveAddress({ query: 'San Martín 2954' }, mockedGeoRef([
    geoRefAddress({ street: 'SAN MARTIN', height: 2954, coordinates: { lat: -31.6416629, lon: -60.7051010 } }),
    geoRefAddress({ street: 'ZORRILLA DE SAN MARTIN', height: 2954, coordinates: { lat: -31.6323715, lon: -60.7072270 } }),
    geoRefAddress({ street: 'SAN MARTIN', height: 2954, locality: 'San Francisco de Santa Fe', localityId: '82042010' })
  ]));

  assert.equal(result.result_class, 'ambiguous');
  assert.equal(result.requires_context, true);
  assert.equal(result.candidates.length, 2);
});

test('substring-only street candidate is never auto-selected for another street', async () => {
  const result = await resolveAddress({ query: 'San Martín 2954, Santa Fe' }, mockedGeoRef([
    geoRefAddress({ street: 'ZORRILLA DE SAN MARTIN', height: 2954, coordinates: { lat: -31.6323715, lon: -60.7072270 } })
  ]));

  assert.equal(result.ok, false);
  assert.equal(result.result_class, 'unverified');
  assert.equal(result.error, 'territory_address_mismatch');
  assert.deepEqual(result.candidates, []);
});

test('invalid upstream schema still fails closed', async () => {
  await assert.rejects(
    resolveAddress({ query: 'San Martín 2954, Santa Fe' }, async () => jsonResponse({ unexpected: [] })),
    (error) => error?.code === 'upstream_schema_invalid' && error?.status === 502
  );
});

test('bare address with only unlocated GeoRef records asks for locality instead of claiming coordinates are unavailable', async () => {
  const result = await resolveAddress({ query: 'San Martín 2954' }, mockedGeoRef([
    geoRefAddress({ street: 'SAN MARTIN', height: 2954 }),
    geoRefAddress({ street: 'ZORRILLA DE SAN MARTIN', height: 2954 })
  ]));

  assert.equal(result.ok, true);
  assert.equal(result.result_class, 'ambiguous');
  assert.equal(result.requires_context, true);
  assert.deepEqual(result.candidates, []);
});
