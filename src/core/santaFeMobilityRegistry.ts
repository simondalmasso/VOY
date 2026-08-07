import { classifySourceTrust, normalizeMobilityDatabaseDiscovery, type MobilitySourceRecord } from './mobilityTrust';

const municipalBusBase: Omit<MobilitySourceRecord, 'trust_status'> = {
  source_id: 'santa-fe-urban-bus-public-feed',
  provider: 'Municipalidad de Santa Fe',
  operator: null,
  format: 'GTFS_SCHEDULE',
  officiality: 'OFFICIAL',
  source_url: 'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/',
  license_url: null,
  license_status: 'UNKNOWN',
  authentication_required: null,
  retrieved_at: '2026-08-07T00:00:00-03:00',
  source_updated_at: null,
  feed_start: null,
  feed_end: null,
  validated_at: null,
  validator: null,
  validator_version: null,
  validation_errors: [],
  validation_warnings: ['No public authoritative GTFS/GTFS-RT download and compatible feed license were demonstrated on 2026-08-07.'],
  freshness_status: 'UNKNOWN',
  coverage: { city: 'Santa Fe Capital, Santa Fe, Argentina', bbox: null },
  operational_status: 'UNAVAILABLE',
  provenance_digest: 'sha256:issue34-inv-2026-08-07-santa-fe-bus-no-accepted-feed'
};

export const SANTA_FE_BUS_SOURCE: MobilitySourceRecord = Object.freeze({
  ...municipalBusBase,
  trust_status: classifySourceTrust(municipalBusBase)
});

export const SANTA_FE_MOBILITY_DATABASE_BIKE_DISCOVERY = Object.freeze(normalizeMobilityDatabaseDiscovery({
  sourceId: 'mobility-database-santa-fe-mibicitubici-gbfs',
  provider: 'MiBiciTuBici',
  format: 'GBFS',
  sourceUrl: 'https://www.mibicitubici.gob.ar/opendata/gbfs.json',
  licenseUrl: null,
  licenseStatus: 'VERIFIED_COMPATIBLE',
  catalogOfficial: true,
  authenticationRequired: false,
  retrievedAt: '2026-08-07T00:00:00-03:00',
  city: 'Santa Fe Capital, Santa Fe, Argentina',
  provenanceDigest: 'sha256:mobility-database-discovery-2026-08-07-mibicitubici'
}));

export const SANTA_FE_MOBILITY_TRUST_SUMMARY = Object.freeze({
  city: 'Santa Fe Capital, Santa Fe, Argentina',
  verified_at: '2026-08-07',
  bus_activation: false,
  bus_reason: 'NO_ACCEPTED_AUTHORITATIVE_GTFS_WITH_VERIFIED_LICENSE_AND_FRESHNESS',
  sources: [SANTA_FE_BUS_SOURCE, SANTA_FE_MOBILITY_DATABASE_BIKE_DISCOVERY]
});
