export const TRUST_STATUSES = ['VERIFIED_CURRENT', 'VERIFIED_STALE', 'UNVERIFIED', 'DEVELOPMENT_ONLY', 'DEPRECATED', 'UNAVAILABLE'] as const;
export type TrustStatus = typeof TRUST_STATUSES[number];
export type LicenseStatus = 'VERIFIED_COMPATIBLE' | 'UNKNOWN' | 'INCOMPATIBLE';
export type Officiality = 'OFFICIAL' | 'THIRD_PARTY_CLAIMED_OFFICIAL' | 'UNVERIFIED';
export type FreshnessStatus = 'CURRENT' | 'STALE' | 'UNKNOWN';
export type OperationalStatus = 'OPERATIONAL' | 'DISCOVERY_ONLY' | 'BLOCKED' | 'UNAVAILABLE';
export type MobilityFormat = 'GTFS_SCHEDULE' | 'GTFS_REALTIME' | 'GBFS' | 'REGULATION' | 'CATALOG' | 'UNKNOWN';

export interface MobilitySourceRecord {
  source_id: string;
  provider: string;
  operator: string | null;
  format: MobilityFormat;
  officiality: Officiality;
  source_url: string;
  license_url: string | null;
  license_status: LicenseStatus;
  authentication_required: boolean | null;
  retrieved_at: string;
  source_updated_at: string | null;
  feed_start: string | null;
  feed_end: string | null;
  validated_at: string | null;
  validator: string | null;
  validator_version: string | null;
  validation_errors: string[];
  validation_warnings: string[];
  freshness_status: FreshnessStatus;
  coverage: { city: string; bbox: [number, number, number, number] | null };
  operational_status: OperationalStatus;
  provenance_digest: string;
  trust_status: TrustStatus;
}

export interface MobilityDatabaseDiscoveryInput {
  sourceId: string;
  provider: string;
  format: MobilityFormat;
  sourceUrl: string;
  licenseUrl?: string | null;
  licenseStatus?: LicenseStatus;
  catalogOfficial?: boolean | null;
  authenticationRequired?: boolean | null;
  retrievedAt: string;
  city: string;
  provenanceDigest: string;
}

export const GTFS_VALIDATOR = Object.freeze({
  name: 'MobilityData gtfs-validator',
  version: '8.0.1',
  asset: 'gtfs-validator-8.0.1-cli.jar',
  url: 'https://github.com/MobilityData/gtfs-validator/releases/download/v8.0.1/gtfs-validator-8.0.1-cli.jar',
  sha256: '19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2'
});

export interface GtfsValidationGateInput {
  sourceTrust: TrustStatus;
  licenseStatus: LicenseStatus;
  hardErrors: number;
  warnings: string[];
  feedStart: string | null;
  feedEnd: string | null;
  serviceActiveOn: string;
  validatorVersion: string;
  validatorSha256: string;
}

export interface GtfsValidationGateResult {
  allowed: boolean;
  status: 'PASS' | 'BLOCK';
  reasons: string[];
  warnings: string[];
}

export const FARE_CONFIDENCE = ['REGULATED_CURRENT', 'GTFS_FARES_V2_VERIFIED', 'SOURCE_QUOTED_CURRENT', 'ESTIMATE_WITH_VERIFIED_FORMULA_AND_PROVENANCE', 'APP_ONLY', 'STALE', 'UNAVAILABLE'] as const;
export type FareConfidence = typeof FARE_CONFIDENCE[number];

export interface FareEvidence {
  classification: FareConfidence;
  amount: number | null;
  currency: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
}

export interface PublicFare {
  classification: FareConfidence;
  amount: number | null;
  currency: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  visibleNumericFare: boolean;
}

function validIsoDate(value: string | null): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && !Number.isNaN(Date.parse(value)));
}

export function classifySourceTrust(record: Omit<MobilitySourceRecord, 'trust_status'>): TrustStatus {
  if (record.operational_status === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (record.operational_status === 'DISCOVERY_ONLY') return 'DEVELOPMENT_ONLY';
  if (record.officiality !== 'OFFICIAL') return 'UNVERIFIED';
  if (record.license_status !== 'VERIFIED_COMPATIBLE') return 'UNVERIFIED';
  if (record.validation_errors.length > 0 || record.freshness_status === 'UNKNOWN') return 'UNVERIFIED';
  if (record.freshness_status === 'STALE') return 'VERIFIED_STALE';
  if (record.freshness_status === 'CURRENT' && record.validated_at && record.provenance_digest) return 'VERIFIED_CURRENT';
  return 'UNVERIFIED';
}

export function normalizeMobilityDatabaseDiscovery(input: MobilityDatabaseDiscoveryInput): MobilitySourceRecord {
  const base: Omit<MobilitySourceRecord, 'trust_status'> = {
    source_id: input.sourceId,
    provider: input.provider,
    operator: null,
    format: input.format,
    officiality: input.catalogOfficial ? 'THIRD_PARTY_CLAIMED_OFFICIAL' : 'UNVERIFIED',
    source_url: input.sourceUrl,
    license_url: input.licenseUrl ?? null,
    license_status: input.licenseStatus ?? 'UNKNOWN',
    authentication_required: input.authenticationRequired ?? null,
    retrieved_at: input.retrievedAt,
    source_updated_at: null,
    feed_start: null,
    feed_end: null,
    validated_at: null,
    validator: null,
    validator_version: null,
    validation_errors: [],
    validation_warnings: [],
    freshness_status: 'UNKNOWN',
    coverage: { city: input.city, bbox: null },
    operational_status: 'DISCOVERY_ONLY',
    provenance_digest: input.provenanceDigest
  };
  return { ...base, trust_status: classifySourceTrust(base) };
}

export function evaluateGtfsValidationGate(input: GtfsValidationGateInput): GtfsValidationGateResult {
  const reasons: string[] = [];
  if (input.sourceTrust !== 'VERIFIED_CURRENT') reasons.push('source_not_verified_current');
  if (input.licenseStatus !== 'VERIFIED_COMPATIBLE') reasons.push('license_not_verified_compatible');
  if (!Number.isInteger(input.hardErrors) || input.hardErrors !== 0) reasons.push('validator_hard_errors');
  if (input.validatorVersion !== GTFS_VALIDATOR.version) reasons.push('validator_version_mismatch');
  if (input.validatorSha256 !== GTFS_VALIDATOR.sha256) reasons.push('validator_digest_mismatch');
  if (!validIsoDate(input.feedStart) || !validIsoDate(input.feedEnd) || !validIsoDate(input.serviceActiveOn)) reasons.push('service_calendar_unknown');
  else {
    const active = Date.parse(input.serviceActiveOn);
    if (active < Date.parse(input.feedStart!) || active > Date.parse(input.feedEnd!)) reasons.push('service_calendar_not_viable');
  }
  return { allowed: reasons.length === 0, status: reasons.length === 0 ? 'PASS' : 'BLOCK', reasons, warnings: [...input.warnings] };
}

export function canAttachGtfsRealtime(staticGate: GtfsValidationGateResult, realtimeTrust: TrustStatus, sameProvider: boolean): boolean {
  return staticGate.allowed && realtimeTrust === 'VERIFIED_CURRENT' && sameProvider;
}

export function publicFare(evidence: FareEvidence): PublicFare {
  const allowedNumeric = new Set<FareConfidence>(['REGULATED_CURRENT', 'GTFS_FARES_V2_VERIFIED', 'SOURCE_QUOTED_CURRENT', 'ESTIMATE_WITH_VERIFIED_FORMULA_AND_PROVENANCE']);
  const amountOk = typeof evidence.amount === 'number' && Number.isFinite(evidence.amount) && evidence.amount >= 0;
  const provenanceOk = Boolean(evidence.sourceUrl && validIsoDate(evidence.verifiedAt));
  const visibleNumericFare = allowedNumeric.has(evidence.classification) && amountOk && provenanceOk;
  return {
    classification: evidence.classification,
    amount: visibleNumericFare ? evidence.amount : null,
    currency: visibleNumericFare ? evidence.currency : null,
    sourceUrl: provenanceOk ? evidence.sourceUrl : null,
    verifiedAt: provenanceOk ? evidence.verifiedAt : null,
    visibleNumericFare
  };
}
