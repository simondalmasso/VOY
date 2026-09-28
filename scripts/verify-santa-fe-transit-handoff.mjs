import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TARGET = 'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/';
export const MAX_AGE_HOURS = 36;
const FUTURE_TOLERANCE_HOURS = 0.1;
const EXPECTED = Object.freeze({
  sourceId: 'santa_fe_official_transit_handoff',
  host: 'santafeciudad.gov.ar',
  authority: 'Municipalidad de Santa Fe',
  surface: 'Colectivos',
  currentInformationReference: 'Cuándo Pasa',
  repository: 'simonkey888/VOY',
  issue: 48,
  verificationMethod: 'independent_aud_primary_source_check'
});
const SOURCE_ATTESTATION_DISPLAY_PATH = 'config/source-attestations/santa-fe-official-transit-handoff.json';
const sourcePath = new URL('../src/features/providers/officialHandoffs.ts', import.meta.url);
const attestationPath = new URL(`../${SOURCE_ATTESTATION_DISPLAY_PATH}`, import.meta.url);
const rfc3339UtcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function failure(code, details = {}) {
  return { ok: false, failure: code, details };
}

function exactEvidenceUrl(commentId) {
  return `https://github.com/${EXPECTED.repository}/issues/${EXPECTED.issue}#issuecomment-${commentId}`;
}

export function validateAttestation(attestation, nowMs = Date.now()) {
  if (!attestation || typeof attestation !== 'object' || Array.isArray(attestation)) {
    return failure('official_handoff_attestation_shape_invalid');
  }

  let configuredUrl;
  try {
    configuredUrl = new URL(attestation.url);
  } catch {
    return failure('official_handoff_attestation_url_invalid');
  }

  if (
    attestation.schema_version !== 2 ||
    attestation.source_id !== EXPECTED.sourceId ||
    attestation.url !== TARGET ||
    configuredUrl.protocol !== 'https:' ||
    configuredUrl.hostname !== EXPECTED.host ||
    configuredUrl.search !== '' ||
    configuredUrl.hash !== '' ||
    attestation.authority !== EXPECTED.authority ||
    attestation.surface !== EXPECTED.surface ||
    attestation.current_information_reference !== EXPECTED.currentInformationReference ||
    attestation.verification_method !== EXPECTED.verificationMethod
  ) {
    return failure('official_handoff_attestation_contract_mismatch');
  }

  const evidence = attestation.evidence;
  const commentId = evidence?.comment_id;
  if (
    evidence?.kind !== 'github_issue_comment' ||
    evidence?.repository !== EXPECTED.repository ||
    evidence?.issue !== EXPECTED.issue ||
    !Number.isSafeInteger(commentId) ||
    commentId <= 0 ||
    evidence?.url !== exactEvidenceUrl(commentId)
  ) {
    return failure('official_handoff_attestation_evidence_invalid');
  }

  if (
    attestation.claims?.official_municipal_surface !== true ||
    attestation.claims?.colectivos_present !== true ||
    attestation.claims?.cuando_pasa_present !== true
  ) {
    return failure('official_handoff_attestation_claims_invalid');
  }

  if (typeof attestation.verified_at_utc !== 'string' || !rfc3339UtcPattern.test(attestation.verified_at_utc)) {
    return failure('official_handoff_attestation_timestamp_invalid', { verified_at_utc: attestation.verified_at_utc ?? null });
  }

  const verifiedMs = Date.parse(attestation.verified_at_utc);
  if (!Number.isFinite(verifiedMs)) {
    return failure('official_handoff_attestation_timestamp_invalid', { verified_at_utc: attestation.verified_at_utc });
  }

  const ageHours = (nowMs - verifiedMs) / 3_600_000;
  if (ageHours < -FUTURE_TOLERANCE_HOURS) {
    return failure('official_handoff_attestation_from_future', {
      verified_at_utc: attestation.verified_at_utc,
      age_hours: Number(ageHours.toFixed(3))
    });
  }
  if (ageHours > MAX_AGE_HOURS) {
    return failure('official_handoff_attestation_stale', {
      verified_at_utc: attestation.verified_at_utc,
      age_hours: Number(ageHours.toFixed(3)),
      max_age_hours: MAX_AGE_HOURS
    });
  }

  return {
    ok: true,
    ageHours,
    evidence
  };
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function emitFailure(result, details = {}) {
  emit({
    result: 'FAIL',
    failure: result.failure,
    target: TARGET,
    authority: EXPECTED.authority,
    verifier: 'persisted_source_attestation',
    live_network_request: false,
    source_attestation_path: SOURCE_ATTESTATION_DISPLAY_PATH,
    checked_at: new Date().toISOString(),
    stale: true,
    stale_substitution: false,
    ...result.details,
    ...details
  });
  process.stderr.write(`${result.failure}\n`);
  process.exitCode = 1;
}

async function runCli() {
  try {
    const [source, rawAttestation] = await Promise.all([
      readFile(sourcePath, 'utf8'),
      readFile(attestationPath, 'utf8')
    ]);

    if (!source.includes(TARGET)) {
      emitFailure(failure('official_handoff_code_target_drift'));
      return;
    }

    let attestation;
    try {
      attestation = JSON.parse(rawAttestation);
    } catch {
      emitFailure(failure('official_handoff_attestation_invalid_json'));
      return;
    }

    const result = validateAttestation(attestation);
    if (!result.ok) {
      emitFailure(result);
      return;
    }

    emit({
      result: 'PASS',
      schema_version: attestation.schema_version,
      target: TARGET,
      authority: EXPECTED.authority,
      verifier: 'persisted_source_attestation',
      live_network_request: false,
      source_attestation_path: SOURCE_ATTESTATION_DISPLAY_PATH,
      verified_at_utc: attestation.verified_at_utc,
      evidence: attestation.evidence,
      verification_method: attestation.verification_method,
      transit_surface: true,
      current_information_reference: true,
      stale: false,
      stale_substitution: false,
      age_hours: Number(result.ageHours.toFixed(3)),
      max_age_hours: MAX_AGE_HOURS,
      checked_at: new Date().toISOString()
    });
  } catch (error) {
    if (process.exitCode !== 1) {
      emitFailure(failure('official_handoff_attestation_missing_or_unreadable'), {
        error_name: error?.name ?? 'Error',
        error_message: String(error?.message ?? error)
      });
    }
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  await runCli();
}
