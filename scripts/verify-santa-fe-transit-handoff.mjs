import { readFile } from 'node:fs/promises';

const target = 'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/';
const expectedHost = 'santafeciudad.gov.ar';
const expectedAuthority = 'Municipalidad de Santa Fe';
const expectedVerifiedAt = '2026-08-21';
const expectedEvidenceRef = 'https://github.com/simonkey888/VOY/issues/48#issuecomment-5371598113';
const expectedEvidenceCommentId = 5371598113;
const maxAgeHours = 36;
const sourcePath = new URL('../src/features/providers/officialHandoffs.ts', import.meta.url);
const attestationPath = new URL('../config/source-attestations/santa-fe-official-transit-handoff.json', import.meta.url);
const checkedAt = () => new Date().toISOString();

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function fail(code, details = {}) {
  emit({
    result: 'FAIL',
    failure: code,
    target,
    authority: expectedAuthority,
    verifier: 'persisted_source_attestation',
    live_network_request: false,
    source_attestation_path: 'config/source-attestations/santa-fe-official-transit-handoff.json',
    checked_at: checkedAt(),
    stale: true,
    ...details
  });
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}

const configuredTarget = new URL(target);
if (
  configuredTarget.protocol !== 'https:' ||
  configuredTarget.hostname !== expectedHost ||
  configuredTarget.search !== '' ||
  configuredTarget.hash !== ''
) {
  fail('official_handoff_config_not_allowlisted');
} else {
  try {
    const [source, rawAttestation] = await Promise.all([
      readFile(sourcePath, 'utf8'),
      readFile(attestationPath, 'utf8')
    ]);

    if (!source.includes(target)) {
      fail('official_handoff_code_target_drift');
    } else {
      let attestation;
      try {
        attestation = JSON.parse(rawAttestation);
      } catch {
        fail('official_handoff_attestation_invalid_json');
      }

      if (attestation) {
        const verifiedAtMs = Date.parse(`${attestation.verified_at}T00:00:00Z`);
        const ageHours = (Date.now() - verifiedAtMs) / 3_600_000;
        const exactContract =
          attestation.schema_version === 1 &&
          attestation.source_id === 'santa_fe_official_transit_handoff' &&
          attestation.url === target &&
          attestation.authority === expectedAuthority &&
          attestation.surface === 'Colectivos' &&
          attestation.current_information_reference === 'Cuándo Pasa' &&
          attestation.verified_at === expectedVerifiedAt &&
          attestation.evidence_ref === expectedEvidenceRef &&
          attestation.evidence_comment_id === expectedEvidenceCommentId &&
          attestation.verification_method === 'independent_aud_primary_source_check' &&
          attestation.claims?.official_municipal_surface === true &&
          attestation.claims?.colectivos_present === true &&
          attestation.claims?.cuando_pasa_present === true;

        if (!exactContract) {
          fail('official_handoff_attestation_contract_mismatch', {
            verified_at: attestation.verified_at ?? null,
            evidence_ref: attestation.evidence_ref ?? null,
            evidence_comment_id: attestation.evidence_comment_id ?? null
          });
        } else if (!Number.isFinite(verifiedAtMs)) {
          fail('official_handoff_attestation_date_invalid', { verified_at: attestation.verified_at });
        } else if (ageHours < -0.1) {
          fail('official_handoff_attestation_from_future', { verified_at: attestation.verified_at, age_hours: ageHours });
        } else if (ageHours > maxAgeHours) {
          fail('official_handoff_attestation_stale', {
            verified_at: attestation.verified_at,
            age_hours: Number(ageHours.toFixed(3)),
            max_age_hours: maxAgeHours
          });
        } else {
          emit({
            result: 'PASS',
            target,
            authority: expectedAuthority,
            verifier: 'persisted_source_attestation',
            live_network_request: false,
            source_attestation_path: 'config/source-attestations/santa-fe-official-transit-handoff.json',
            verified_at: attestation.verified_at,
            evidence_ref: attestation.evidence_ref,
            evidence_comment_id: attestation.evidence_comment_id,
            verification_method: attestation.verification_method,
            transit_surface: true,
            current_information_reference: true,
            stale: false,
            age_hours: Number(ageHours.toFixed(3)),
            max_age_hours: maxAgeHours,
            checked_at: checkedAt()
          });
        }
      }
    }
  } catch (error) {
    if (process.exitCode !== 1) {
      fail('official_handoff_attestation_missing_or_unreadable', {
        error_name: error?.name ?? 'Error',
        error_message: String(error?.message ?? error)
      });
    }
  }
}
