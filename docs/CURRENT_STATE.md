# VOY — Current canonical state

Last reconstructed: 2026-08-04

## Authority

```text
CANONICAL_STATE=GITHUB
PRIMARY_STATE_FILE=docs/CURRENT_STATE.md
SUPPORTING_EVIDENCE=ISSUE_30;FINAL_DRAFT_PR;CI_ARTIFACTS;CLOUDFLARE_CANDIDATE_EVIDENCE
GOOGLE_DRIVE=READ_ONLY_HISTORICAL_ARCHIVE
```

Current runtime claims require fresh production or Cloudflare evidence. Historical identifiers are never treated as current without revalidation.

## Master mission

```text
MISSION_ID=VOY-COMPLETE-PRODUCT-MASTER-01
CONTROL_ISSUE=https://github.com/simonkey888/VOY/issues/30
CANONICAL_BRANCH=feat/voy-complete-product-master-01
BASE_RUNTIME_HEAD=b723c3132c91acdd8e7ade3a3929335f5e49d5f6
BASE_MAIN=d31f7497f963ddd761ed3392a634f8017f85ad13
PRODUCTION_PROMOTION=NOT_AUTHORIZED_BY_THIS_CHECKPOINT
```

The branch starts from the reconciled Voice Copilot head, which already contains the release-control-plane changes from `main`. PR #23 remains preserved as historical evidence. PR #24 is a documentation source for ephemeral Google authentication. PR #27 remains frozen and nonblocking.

## Public production baseline

Fresh public observation at the start of this mission:

```text
PUBLIC_HEALTH=PASS
APPLICATION_VERSION=V7.8.0
BUILD_HASH=1374f09
PRODUCTION_TRAFFIC_CHANGE_BY_MASTER_MISSION=NO
```

The exact Cloudflare deployment, versions, traffic, bindings and rollback state must be refreshed by the final candidate workflow immediately before any Cloudflare mutation.

## Product completion state

The canonical workset includes:

- Santa Fe destination resolution and deterministic mobility comparison;
- regulated taxi, remis and bus fares with dated provenance;
- private-app availability without stale numeric-price ranking;
- canonical distance/time contracts and honest unknown states;
- bounded Voice Copilot with typed allowlisted tools and no persistence;
- optional ephemeral Google authentication, disabled when external configuration is absent;
- public privacy, terms, sources and contact surfaces;
- security headers, GPC/DNT analytics opt-out and no browser Nominatim;
- installable PWA, offline shell and cache convergence;
- desktop, Android and iPhone validation;
- accessibility and privacy/storage assertions.

Detailed contracts:

- `docs/data/santa-fe-current-sources-2026-08-04.md`
- `docs/contracts/distance-time-v1.md`
- `docs/auth/google-ephemeral-runtime-v1.md`
- `docs/privacy/product-completion-policy.md`
- `docs/testing/product-completion-test-plan.md`
- `docs/operations/complete-product-release-v1.md`

## Authentication status

```text
AUTH_CODE_AND_UI=IMPLEMENTED
AUTH_DEFAULT=DISABLED
VOY_GOOGLE_CLIENT_ID=EXTERNAL_PUBLIC_CONFIGURATION_REQUIRED_FOR_ACTIVATION
VOY_AUTH_SESSION_SECRET_V1=EXTERNAL_SECRET_REQUIRED_FOR_ACTIVATION
PERSISTENT_VOY_ACCOUNT=NO
TRIP_HISTORY_PERSISTED=NO
```

Absence of external Google configuration does not affect core VOY functionality.

## Final candidate checkpoint

Candidate identifiers, exact source SHA, deployment, traffic, bindings, artifact digest, rollback target and complete validation results are persisted immutably in the final GitHub Actions artifact and Issue #30 material checkpoint. The final candidate must leave production unchanged at `100%` and the exact source candidate at `0%`.
