import { describe, expect, test } from 'bun:test';
import { ARGENTINA_PROVINCES, provinceIdentity } from '../src/core/territory';
import { resolveTerritories, searchGeoRefDirections, territoryFromGeoRef } from '../worker/lib/georef';

function response(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('Argentina territorial core', () => {
  test('registers exactly 24 first-order jurisdictions and keeps CABA separate from Buenos Aires Province', () => {
    expect(ARGENTINA_PROVINCES).toHaveLength(24);
    expect(new Set(ARGENTINA_PROVINCES.map(item => item.id)).size).toBe(24);
    expect(new Set(ARGENTINA_PROVINCES.map(item => item.isoId)).size).toBe(24);
    expect(provinceIdentity('02')).toMatchObject({ isoId: 'AR-C', name: 'Ciudad Autónoma de Buenos Aires' });
    expect(provinceIdentity('06')).toMatchObject({ isoId: 'AR-B', name: 'Buenos Aires' });
    expect(provinceIdentity('02')?.isoId).not.toBe(provinceIdentity('06')?.isoId);
  });

  test('normalizes GeoRef reverse data into stable national identity without inventing local mobility coverage', () => {
    const territory = territoryFromGeoRef({ ubicacion: {
      provincia: { id: '14', nombre: 'Córdoba' },
      departamento: { id: '14014', nombre: 'Capital' },
      municipio: { id: '140077', nombre: 'Córdoba' }
    } });
    expect(territory).toMatchObject({
      countryId: 'AR', provinceId: '14', provinceIsoId: 'AR-X', provinceName: 'Córdoba',
      coverageKey: '_default', coverageLevel: 'NATIONAL_BASE', source: 'georef_v2'
    });
  });

  test('only exact Santa Fe city context may select the Santa Fe local overlay', () => {
    const city = territoryFromGeoRef({ ubicacion: {
      provincia: { id: '82', nombre: 'Santa Fe' }, departamento: { id: '82063', nombre: 'La Capital' },
      municipio: { id: '820287', nombre: 'Santa Fe' }
    } });
    const rosario = territoryFromGeoRef({ ubicacion: {
      provincia: { id: '82', nombre: 'Santa Fe' }, departamento: { id: '82084', nombre: 'Rosario' },
      municipio: { id: '820490', nombre: 'Rosario' }
    } });
    expect(city?.coverageKey).toBe('santa-fe');
    expect(rosario?.coverageKey).toBe('_default');
  });

  test('batch reverse keeps positional identity and fails closed for unresolved rows', async () => {
    const fakeFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { ubicaciones: Array<{ lat: number; lon: number }> };
      return response({ resultados: body.ubicaciones.map((item, index) => index === 0 ? { ubicacion: {
        lat: item.lat, lon: item.lon, provincia: { id: '02', nombre: 'Ciudad Autónoma de Buenos Aires' },
        departamento: { id: '02000', nombre: 'Comuna' }, municipio: { id: null, nombre: null }
      } } : { ubicacion: { lat: item.lat, lon: item.lon, provincia: { id: null, nombre: null } } }) });
    }) as typeof fetch;
    const territories = await resolveTerritories([{ lat: -34.6037, lon: -58.3816 }, { lat: 0, lon: 0 }], fakeFetch);
    expect(territories[0]?.provinceIsoId).toBe('AR-C');
    expect(territories[1]).toBeNull();
  });

  test('GeoRef address normalization preserves province/locality identity and route eligibility inputs', async () => {
    const fakeFetch = (async () => response({ cantidad: 1, direcciones: [{
      altura: { valor: 260 }, calle: { id: '1401401002460', nombre: 'AV SANTA FE' },
      departamento: { id: '14014', nombre: 'Capital' }, localidad_censal: { id: '14014010', nombre: 'Córdoba' },
      provincia: { id: '14', nombre: 'Córdoba' }, ubicacion: { lat: -31.408067, lon: -64.200624 },
      nomenclatura: 'AV SANTA FE 260, Córdoba, Córdoba'
    }] })) as typeof fetch;
    const results = await searchGeoRefDirections('Av. Santa Fe 260, Córdoba', {}, fakeFetch);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      coordinates: { lat: -31.408067, lon: -64.200624 },
      territory: { provinceId: '14', provinceIsoId: 'AR-X', localityName: 'Córdoba', coverageKey: '_default' }
    });
  });
});
