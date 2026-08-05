# VOY — Current canonical state

Last reconstructed: 2026-08-04

## Authority

```text
CANONICAL_STATE=GITHUB
PRIMARY_STATE_FILE=docs/CURRENT_STATE.md
SUPPORTING_EVIDENCE=ISSUE_30;PR_31;CI_ARTIFACTS;CLOUDFLARE_CANDIDATE_EVIDENCE
GOOGLE_DRIVE=READ_ONLY_HISTORICAL_ARCHIVE
```

Current runtime claims require fresh production or Cloudflare evidence. Historical identifiers are never treated as current without revalidation.

## Master mission

```text
MISSION_ID=VOY-COMPLETE-PRODUCT-MASTER-01
CONTROL_ISSUE=https://github.com/simonkey888/VOY/issues/30
CANONICAL_PR=https://github.com/simonkey888/VOY/pull/31
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

The exact Cloudflare deployment, versions, traffic, bindings and rollback state must be refreshed by the permanent final-candidate workflow immediately before any Cloudflare mutation.

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

## Final candidate recovery contract

```text
AUD_ORDER_COMMENT=5186516663
RECOVERY_MISSION=VOY-PR31-FINAL-CANDIDATE-RECOVERY-01
STARTING_HEAD=7e15b2c991e71605b4acb86ac5cf26bb5bab592c
FAILED_RUN=30964336535
FAILED_ARTIFACT=8914465273
FAILED_ARTIFACT_SHA256=e7fc02d04a52a9fb0e37ca9373cd9c315e2d15a039119af9fbb4725785686b3d
FAILED_CANDIDATE_VERSION=bf4f49ce-d1fb-4306-af57-93d255716732@0%
ROOT_CAUSE=ROOT_ROUTE_RUNTIME_TRANSFORMATION_WAS_COMPARED_TO_STATIC_SOURCE_HASH
PRODUCTION_TRAFFIC_CHANGED=NO
```

The permanent final-candidate workflow validates one runtime-transformed root plus twelve immutable assets:

```text
RUNTIME_TRANSFORMED_ROOT=/
ROOT_REQUIRED=HTTP_200;HTML;EXACT_BUILD;PRODUCT_SHELL;VOICE_SHELL;AUTH_SAFE_DISABLED;PRIVACY_STATE;SECURITY_HEADERS;HARDENED_SESSION_COOKIE
IMMUTABLE_EXACT_ASSETS=12
IMMUTABLE_EXACT_INCLUDES=/VOY-Lite.html;CITY_PLATFORM_RUNTIME;TEN_TERRITORIAL_JSON_FILES
CONVERGENCE=20_CONSECUTIVE_ROUNDS_AND_AT_LEAST_120_SECONDS
WORKFLOW=.github/workflows/master-final-candidate.yml
WORKFLOW_STATUS=PERMANENT_CONTROLLED_RELEASE_WORKFLOW
```

## Canonical final-state rule

No source or documentation commit is permitted after final candidate creation. Therefore generated Cloudflare identifiers are canonical by exact immutable reference rather than by a later head-changing documentation commit:

```text
FINAL_EXACT_HEAD=PR31_HEAD_USED_BY_SUCCESSFUL_MASTER_FINAL_CANDIDATE_RUN
FINAL_VERSION_ID=SUCCESSFUL_ARTIFACT/test-results/master-final-candidate/final-state.json
FINAL_DEPLOYMENT_ID=SUCCESSFUL_ARTIFACT/test-results/master-final-candidate/final-state.json
FINAL_TRAFFIC=SUCCESSFUL_ARTIFACT/test-results/master-final-candidate/final-state.json
FINAL_ROLLBACK=SUCCESSFUL_ARTIFACT/test-results/master-final-candidate/final-state.json
FINAL_DIGEST=SUCCESSFUL_ARTIFACT/test-results/master-final-candidate/digest.txt
MATERIAL_CHECKPOINTS=PR31_FINAL_COMMENT;ISSUE30_FINAL_COMMENT
```

The matching successful artifact and the two material checkpoint comments must record the literal exact head, version ID, deployment ID, stable/candidate traffic, production health, rollback identity and SHA-256 digest. PR #31 remains open, Draft, mergeable and unmerged until independent final AUD and a separate human traffic authorization.
