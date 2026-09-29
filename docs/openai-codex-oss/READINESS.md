# VOY — OpenAI Codex for Open Source Readiness

LAST_CHECK=2026-09-29 ART
APPLICATION_STATUS=NOT_READY_PREMERGE

MAIN_CANONICAL=NO — main remains 1ac1c691487cf9c542fd1db9d08c0ccadfe89f13
OSS_CANDIDATE=release/order076-oss-candidate
RUNTIME_VERIFIED=b858568848f6bf5abd6853ee13c77f2e65c63735
PRODUCTION_BUILD=73b176a290ecc07e38d6ee1e
LICENSE=MIT_ADDED_IN_CANDIDATE
README=CURRENT_IN_CANDIDATE
SECURITY_MD=ADDED_IN_CANDIDATE
CONTRIBUTING_MD=ADDED_IN_CANDIDATE
RELEASE_TAG=PLANNED_v0.1.0_NOT_CREATED
PUBLIC_DEMO=RUNTIME_RECONCILED_TO_b858568 — post-main release reconciliation still required
CI_TESTS=TERMINAL_RUNTIME_PASS + FINAL_CANDIDATE_CI_REQUIRED
ACTIVE_MAINTENANCE=YES
REPO_HYGIENE=MINIMAL_CANDIDATE_PASS
OPENAI_ORG_ID=NOT_VERIFIED
FORM_TEXTS=DRAFTED_NOT_SUBMITTED

## Evidence

ORDER-076 terminal evidence includes 274/274 unit PASS, Chrome PASS, real Edge 10x PASS, focused follow/drag 30/30, reduced-motion PASS, WebGL fallback/context-loss PASS, OpenFreeMap diagnostic PASS, exact-artifact production reconciliation PASS and production browser smoke PASS.

Final runtime workflow: `36568197731`.

```text
source_commit=b858568848f6bf5abd6853ee13c77f2e65c63735
build_hash=73b176a290ecc07e38d6ee1e
version=order057-b858568848f6-73b176a2
```

## OpenAI program fit

Current official Codex for Open Source pages describe applications for maintainers of active open-source projects and review signals such as repository usage, ecosystem importance and active maintenance. The current form asks for public GitHub/repository identity, maintainer role, an eligibility explanation, OpenAI Organization ID and intended API-credit use.

VOY must not manufacture adoption metrics. Application claims should rely on demonstrable maintenance, release discipline and the mobility/data-truth purpose.

## Remaining blockers before application READY

1. Promote candidate to canonical `main`.
2. Re-run canonical CI/build/browser smoke on exact reconciliation commit.
3. Deploy/reconcile exact main artifact.
4. Create and independently verify public tag/release `v0.1.0`.
5. Verify public demo against that release identity.
6. Verify OpenAI Organization ID.
7. Finalize and submit truthful <=500-character form texts.

No product feature work is required.
