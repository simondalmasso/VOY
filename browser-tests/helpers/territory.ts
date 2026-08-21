export const SANTA_FE_TERRITORY = Object.freeze({
  countryId: 'AR',
  countryName: 'Argentina',
  provinceId: '82',
  provinceIsoId: 'AR-S',
  provinceName: 'Santa Fe',
  departmentId: '82049',
  departmentName: 'La Capital',
  municipalityOrLocalGovernmentId: null,
  municipalityOrLocalGovernmentName: 'Santa Fe',
  localityId: '82049010',
  localityName: 'Santa Fe',
  cityId: 'santafe',
  displayName: 'Santa Fe, Santa Fe',
  timezone: 'America/Argentina/Cordoba',
  coverageKey: 'santa-fe',
  coverageLevel: 'LOCAL_VERIFIED',
  source: 'voy_local_profile',
  sourceUrl: 'https://www.argentina.gob.ar/georef',
  verifiedAt: '2026-08-05',
  territoryVersion: 'georef-api-v2.0'
});

export function santaFeOrigin(id: string, displayName = 'Plaza 25 de Mayo, Santa Fe') {
  return {
    id,
    name: 'Plaza 25 de Mayo',
    display_name: displayName,
    address: 'Santa Fe',
    lat: -31.633,
    lon: -60.706,
    routeEligible: true,
    territoryVerified: true,
    territory: SANTA_FE_TERRITORY,
    source: 'worker_geocode_unverified'
  };
}
