export interface Coordinates { lat: number; lon: number }

export type CoverageLevel = 'NATIONAL_BASE' | 'LOCAL_PARTIAL' | 'LOCAL_VERIFIED' | 'LOCAL_FULL' | 'UNVERIFIED_OR_UNAVAILABLE';

export interface ProvinceIdentity {
  id: string;
  isoId: string;
  name: string;
}

export interface TerritoryContext {
  countryId: 'AR';
  countryName: 'Argentina';
  provinceId: string;
  provinceIsoId: string;
  provinceName: string;
  departmentId: string | null;
  departmentName: string | null;
  municipalityOrLocalGovernmentId: string | null;
  municipalityOrLocalGovernmentName: string | null;
  localityId: string | null;
  localityName: string | null;
  cityId: string;
  displayName: string;
  timezone: string | null;
  coverageKey: '_default' | 'santa-fe';
  coverageLevel: CoverageLevel;
  source: 'georef_v2' | 'voy_local_profile';
  sourceUrl: string;
  verifiedAt: string;
  territoryVersion: string;
}

export const TERRITORY_VERSION = 'georef-api-v2.0';
export const GEOREF_SOURCE_URL = 'https://www.argentina.gob.ar/georef';
export const ARGENTINA_CENTER: Coordinates = Object.freeze({ lat: -34, lon: -64 });

export const ARGENTINA_PROVINCES: readonly ProvinceIdentity[] = Object.freeze([
  { id: '02', isoId: 'AR-C', name: 'Ciudad Autónoma de Buenos Aires' },
  { id: '06', isoId: 'AR-B', name: 'Buenos Aires' },
  { id: '10', isoId: 'AR-K', name: 'Catamarca' },
  { id: '14', isoId: 'AR-X', name: 'Córdoba' },
  { id: '18', isoId: 'AR-W', name: 'Corrientes' },
  { id: '22', isoId: 'AR-H', name: 'Chaco' },
  { id: '26', isoId: 'AR-U', name: 'Chubut' },
  { id: '30', isoId: 'AR-E', name: 'Entre Ríos' },
  { id: '34', isoId: 'AR-P', name: 'Formosa' },
  { id: '38', isoId: 'AR-Y', name: 'Jujuy' },
  { id: '42', isoId: 'AR-L', name: 'La Pampa' },
  { id: '46', isoId: 'AR-F', name: 'La Rioja' },
  { id: '50', isoId: 'AR-M', name: 'Mendoza' },
  { id: '54', isoId: 'AR-N', name: 'Misiones' },
  { id: '58', isoId: 'AR-Q', name: 'Neuquén' },
  { id: '62', isoId: 'AR-R', name: 'Río Negro' },
  { id: '66', isoId: 'AR-A', name: 'Salta' },
  { id: '70', isoId: 'AR-J', name: 'San Juan' },
  { id: '74', isoId: 'AR-D', name: 'San Luis' },
  { id: '78', isoId: 'AR-Z', name: 'Santa Cruz' },
  { id: '82', isoId: 'AR-S', name: 'Santa Fe' },
  { id: '86', isoId: 'AR-G', name: 'Santiago del Estero' },
  { id: '90', isoId: 'AR-T', name: 'Tucumán' },
  { id: '94', isoId: 'AR-V', name: 'Tierra del Fuego, Antártida e Islas del Atlántico Sur' }
]);

const provinceById = new Map(ARGENTINA_PROVINCES.map(item => [item.id, item] as const));

export function provinceIdentity(id: string): ProvinceIdentity | null {
  return provinceById.get(String(id).padStart(2, '0')) || null;
}

export function isFiniteCoordinate(value: Coordinates): boolean {
  return Number.isFinite(value.lat) && Number.isFinite(value.lon) && value.lat >= -90 && value.lat <= 90 && value.lon >= -180 && value.lon <= 180;
}

export function territoryLabel(territory: TerritoryContext | null | undefined): string {
  if (!territory) return 'Argentina';
  if (territory.localityName) return `${territory.localityName} · ${territory.provinceName}`;
  if (territory.municipalityOrLocalGovernmentName) return `${territory.municipalityOrLocalGovernmentName} · ${territory.provinceName}`;
  return territory.provinceName;
}
