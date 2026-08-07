export type EvidenceStatus = 'verified_current' | 'regulated_current' | 'approximate' | 'app_only' | 'unverified' | 'disabled';
export interface Provenance { status: EvidenceStatus; source?: string; verifiedAt?: string }
export function hasCurrentEvidence(value: Provenance): boolean {
  return Boolean(value.source && value.verifiedAt && (value.status === 'verified_current' || value.status === 'regulated_current'));
}
