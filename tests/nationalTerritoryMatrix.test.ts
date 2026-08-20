import { describe, expect, test } from 'bun:test';
import { territoryFromGeoRef } from '../worker/lib/georef';

type Case = {
  locality: string;
  provinceId: string;
  provinceIsoId: string;
  provinceName: string;
  coverageKey?: '_default' | 'santa-fe';
};

const CASES: Case[] = [
  { locality: 'Santa Fe', provinceId: '82', provinceIsoId: 'AR-S', provinceName: 'Santa Fe', coverageKey: 'santa-fe' },
  { locality: 'Rosario', provinceId: '82', provinceIsoId: 'AR-S', provinceName: 'Santa Fe' },
  { locality: 'Córdoba', provinceId: '14', provinceIsoId: 'AR-X', provinceName: 'Córdoba' },
  { locality: 'Mendoza', provinceId: '50', provinceIsoId: 'AR-M', provinceName: 'Mendoza' },
  { locality: 'Ciudad Autónoma de Buenos Aires', provinceId: '02', provinceIsoId: 'AR-C', provinceName: 'Ciudad Autónoma de Buenos Aires' },
  { locality: 'La Plata', provinceId: '06', provinceIsoId: 'AR-B', provinceName: 'Buenos Aires' },
  { locality: 'Mar del Plata', provinceId: '06', provinceIsoId: 'AR-B', provinceName: 'Buenos Aires' },
  { locality: 'San Miguel de Tucumán', provinceId: '90', provinceIsoId: 'AR-T', provinceName: 'Tucumán' },
  { locality: 'Salta', provinceId: '66', provinceIsoId: 'AR-A', provinceName: 'Salta' },
  { locality: 'San Salvador de Jujuy', provinceId: '38', provinceIsoId: 'AR-Y', provinceName: 'Jujuy' },
  { locality: 'Neuquén', provinceId: '58', provinceIsoId: 'AR-Q', provinceName: 'Neuquén' },
  { locality: 'San Carlos de Bariloche', provinceId: '62', provinceIsoId: 'AR-R', provinceName: 'Río Negro' },
  { locality: 'Ushuaia', provinceId: '94', provinceIsoId: 'AR-V', provinceName: 'Tierra del Fuego, Antártida e Islas del Atlántico Sur' },
  { locality: 'Río Gallegos', provinceId: '78', provinceIsoId: 'AR-Z', provinceName: 'Santa Cruz' },
  { locality: 'San Juan', provinceId: '70', provinceIsoId: 'AR-J', provinceName: 'San Juan' },
  { locality: 'San Luis', provinceId: '74', provinceIsoId: 'AR-D', provinceName: 'San Luis' },
  { locality: 'La Rioja', provinceId: '46', provinceIsoId: 'AR-F', provinceName: 'La Rioja' },
  { locality: 'Resistencia', provinceId: '22', provinceIsoId: 'AR-H', provinceName: 'Chaco' },
  { locality: 'Corrientes', provinceId: '18', provinceIsoId: 'AR-W', provinceName: 'Corrientes' },
  { locality: 'Posadas', provinceId: '54', provinceIsoId: 'AR-N', provinceName: 'Misiones' },
  { locality: 'Paraná', provinceId: '30', provinceIsoId: 'AR-E', provinceName: 'Entre Ríos' },
  { locality: 'Formosa', provinceId: '34', provinceIsoId: 'AR-P', provinceName: 'Formosa' },
  { locality: 'Santiago del Estero', provinceId: '86', provinceIsoId: 'AR-G', provinceName: 'Santiago del Estero' },
  { locality: 'Rawson', provinceId: '26', provinceIsoId: 'AR-U', provinceName: 'Chubut' },
  { locality: 'Trelew', provinceId: '26', provinceIsoId: 'AR-U', provinceName: 'Chubut' },
  { locality: 'Santa Rosa', provinceId: '42', provinceIsoId: 'AR-L', provinceName: 'La Pampa' },
  { locality: 'San Fernando del Valle de Catamarca', provinceId: '10', provinceIsoId: 'AR-K', provinceName: 'Catamarca' }
];

function georefCase(item: Case) {
  return territoryFromGeoRef({ ubicacion: {
    provincia: { id: item.provinceId, nombre: item.provinceName },
    departamento: { id: `${item.provinceId}001`, nombre: 'Departamento de prueba' },
    localidad: { id: `${item.provinceId}001001`, nombre: item.locality }
  } });
}

describe('Issue43 national territory matrix', () => {
  for (const item of CASES) {
    test(`${item.locality} resolves to ${item.provinceIsoId} without inheriting foreign local coverage`, () => {
      const territory = georefCase(item);
      expect(territory).not.toBeNull();
      expect(territory).toMatchObject({
        countryId: 'AR',
        provinceId: item.provinceId,
        provinceIsoId: item.provinceIsoId,
        provinceName: item.provinceName,
        localityName: item.locality,
        coverageKey: item.coverageKey || '_default',
        coverageLevel: 'NATIONAL_BASE',
        source: 'georef_v2'
      });
    });
  }

  test('CABA remains distinct from Buenos Aires Province', () => {
    const caba = georefCase(CASES.find(item => item.provinceIsoId === 'AR-C')!);
    const laPlata = georefCase(CASES.find(item => item.locality === 'La Plata')!);
    expect(caba?.provinceId).toBe('02');
    expect(laPlata?.provinceId).toBe('06');
    expect(caba?.provinceIsoId).not.toBe(laPlata?.provinceIsoId);
  });

  test('a Santa Fe homonym outside province 82 never receives the Santa Fe city overlay', () => {
    const territory = territoryFromGeoRef({ ubicacion: {
      provincia: { id: '14', nombre: 'Córdoba' },
      localidad: { id: '14001001', nombre: 'Santa Fe' }
    } });
    expect(territory?.coverageKey).toBe('_default');
  });

  test('unknown or non-Argentine province identifiers fail closed', () => {
    expect(territoryFromGeoRef({ ubicacion: { provincia: { id: 'XX', nombre: 'Outside Argentina' } } })).toBeNull();
    expect(territoryFromGeoRef({ ubicacion: { provincia: { id: null, nombre: null } } })).toBeNull();
  });
});
