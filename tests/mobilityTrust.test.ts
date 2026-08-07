import { describe, expect, test } from 'bun:test';
import { GTFS_VALIDATOR, classifySourceTrust, evaluateGtfsValidationGate, canAttachGtfsRealtime, normalizeMobilityDatabaseDiscovery, publicFare, type MobilitySourceRecord } from '../src/core/mobilityTrust';
import { SANTA_FE_BUS_SOURCE, SANTA_FE_MOBILITY_DATABASE_BIKE_DISCOVERY, SANTA_FE_MOBILITY_TRUST_SUMMARY } from '../src/core/santaFeMobilityRegistry';

function source(overrides: Partial<Omit<MobilitySourceRecord, 'trust_status'>> = {}): Omit<MobilitySourceRecord, 'trust_status'> {
  return {
    source_id: 'fixture', provider: 'Fixture Transit', operator: 'Fixture Transit', format: 'GTFS_SCHEDULE', officiality: 'OFFICIAL',
    source_url: 'https://example.test/gtfs.zip', license_url: 'https://example.test/license', license_status: 'VERIFIED_COMPATIBLE', authentication_required: false,
    retrieved_at: '2026-08-07T10:00:00Z', source_updated_at: '2026-08-07T00:00:00Z', feed_start: '2026-08-01', feed_end: '2026-12-31',
    validated_at: '2026-08-07T10:01:00Z', validator: GTFS_VALIDATOR.name, validator_version: GTFS_VALIDATOR.version, validation_errors: [], validation_warnings: [],
    freshness_status: 'CURRENT', coverage: { city: 'Santa Fe Capital', bbox: null }, operational_status: 'OPERATIONAL', provenance_digest: 'sha256:fixture', ...overrides
  };
}

describe('mobility source trust', () => {
  test('only complete official current compatible evidence becomes verified current', () => {
    expect(classifySourceTrust(source())).toBe('VERIFIED_CURRENT');
    expect(classifySourceTrust(source({ freshness_status: 'STALE' }))).toBe('VERIFIED_STALE');
    expect(classifySourceTrust(source({ officiality: 'UNVERIFIED' }))).toBe('UNVERIFIED');
    expect(classifySourceTrust(source({ license_status: 'UNKNOWN' }))).toBe('UNVERIFIED');
    expect(classifySourceTrust(source({ validation_errors: ['broken_feed'] }))).toBe('UNVERIFIED');
  });

  test('Mobility Database catalog license metadata is discovery-only and cannot become canonical license evidence', () => {
    const discovery = normalizeMobilityDatabaseDiscovery({
      sourceId: 'catalog:x',
      provider: 'X',
      format: 'GTFS_SCHEDULE',
      sourceUrl: 'https://example.test/feed',
      licenseUrl: 'https://catalog.example.test/license',
      licenseStatus: 'VERIFIED_COMPATIBLE',
      catalogOfficial: true,
      retrievedAt: '2026-08-07T10:00:00Z',
      city: 'Santa Fe',
      provenanceDigest: 'sha256:x'
    });
    expect(discovery.officiality).toBe('THIRD_PARTY_CLAIMED_OFFICIAL');
    expect(discovery.operational_status).toBe('DISCOVERY_ONLY');
    expect(discovery.license_url).toBeNull();
    expect(discovery.license_status).toBe('UNKNOWN');
    expect(discovery.validation_warnings).toContain('catalog_license_metadata_discovery_only_not_operational_evidence');
    expect(discovery.trust_status).toBe('DEVELOPMENT_ONLY');
  });

  test('Santa Fe bus stays fail closed without accepted GTFS', () => {
    expect(SANTA_FE_BUS_SOURCE.trust_status).toBe('UNAVAILABLE');
    expect(SANTA_FE_MOBILITY_TRUST_SUMMARY.bus_activation).toBeFalse();
    expect(SANTA_FE_MOBILITY_DATABASE_BIKE_DISCOVERY.operational_status).toBe('DISCOVERY_ONLY');
    expect(SANTA_FE_MOBILITY_DATABASE_BIKE_DISCOVERY.license_status).toBe('UNKNOWN');
    expect(SANTA_FE_MOBILITY_DATABASE_BIKE_DISCOVERY.trust_status).toBe('DEVELOPMENT_ONLY');
  });
});

describe('GTFS canonical gate', () => {
  const valid = {
    sourceTrust: 'VERIFIED_CURRENT' as const,
    licenseStatus: 'VERIFIED_COMPATIBLE' as const,
    hardErrors: 0,
    warnings: ['fixture_warning_classified'],
    feedStart: '2026-08-01',
    feedEnd: '2026-12-31',
    serviceActiveOn: '2026-08-07',
    validatorVersion: GTFS_VALIDATOR.version,
    validatorSha256: GTFS_VALIDATOR.sha256
  };
  test('passes only exact pinned validator and viable trusted source', () => {
    const gate = evaluateGtfsValidationGate(valid);
    expect(gate.allowed).toBeTrue();
    expect(gate.warnings).toEqual(['fixture_warning_classified']);
  });
  test('fails closed for hard error, stale/unverified/license unknown and calendar mismatch', () => {
    expect(evaluateGtfsValidationGate({ ...valid, hardErrors: 1 }).allowed).toBeFalse();
    expect(evaluateGtfsValidationGate({ ...valid, sourceTrust: 'VERIFIED_STALE' }).allowed).toBeFalse();
    expect(evaluateGtfsValidationGate({ ...valid, sourceTrust: 'UNVERIFIED' }).allowed).toBeFalse();
    expect(evaluateGtfsValidationGate({ ...valid, licenseStatus: 'UNKNOWN' }).allowed).toBeFalse();
    expect(evaluateGtfsValidationGate({ ...valid, serviceActiveOn: '2027-01-01' }).allowed).toBeFalse();
    expect(evaluateGtfsValidationGate({ ...valid, validatorSha256: 'wrong' }).allowed).toBeFalse();
  });
  test('GTFS-RT cannot attach without compatible verified static feed', () => {
    const pass = evaluateGtfsValidationGate(valid);
    expect(canAttachGtfsRealtime(pass, 'VERIFIED_CURRENT', true)).toBeTrue();
    expect(canAttachGtfsRealtime(pass, 'UNVERIFIED', true)).toBeFalse();
    expect(canAttachGtfsRealtime(pass, 'VERIFIED_CURRENT', false)).toBeFalse();
  });
});

describe('fare confidence', () => {
  test('verified regulated numeric fare may be exposed with provenance', () => {
    const fare = publicFare({ classification: 'REGULATED_CURRENT', amount: 1000, currency: 'ARS', sourceUrl: 'https://example.test/decree', verifiedAt: '2026-08-07' });
    expect(fare.visibleNumericFare).toBeTrue();
    expect(fare.amount).toBe(1000);
  });
  test('APP_ONLY, stale and unproven numeric values are stripped', () => {
    expect(publicFare({ classification: 'APP_ONLY', amount: 9999, currency: 'ARS', sourceUrl: null, verifiedAt: null }).amount).toBeNull();
    expect(publicFare({ classification: 'STALE', amount: 10, currency: 'ARS', sourceUrl: 'https://example.test', verifiedAt: '2026-01-01' }).amount).toBeNull();
    expect(publicFare({ classification: 'SOURCE_QUOTED_CURRENT', amount: 10, currency: 'ARS', sourceUrl: null, verifiedAt: null }).amount).toBeNull();
  });
});
