# VOY — OpenAI Codex for Open Source Readiness

LAST_CHECK=2026-09-29 ART
APPLICATION_STATUS=READY

MAIN_CANONICAL=YES
MAIN_READY_PROOF_SHA=3f6f1e7581b464701bb92ae583c7439f49e2e85c
OSS_CANDIDATE_PROMOTED=release/order076-oss-candidate
RUNTIME_VERIFIED=b858568848f6bf5abd6853ee13c77f2e65c63735
CANONICAL_MAIN_BUILD=be57e6d76ef323ff87368c64
LICENSE=MIT
README=CURRENT
SECURITY_MD=PASS
CONTRIBUTING_MD=PASS
RELEASE_TAG=v0.1.0_VERIFIED
PUBLIC_DEMO=PASS
CI_TESTS=PASS
ACTIVE_MAINTENANCE=YES
REPO_HYGIENE=PASS
FORM_TEXTS=DRAFTED
OPENAI_ORG_ID=REQUIRED_AT_SUBMISSION_NOT_REPO_READINESS

## Verified release chain

The verified ORDER-076 runtime was promoted to canonical `main` through a history-preserving merge that retained the OSS candidate tree byte-for-byte and kept historical main as a second parent.

Fresh canonical-main evidence on `3f6f1e7581b464701bb92ae583c7439f49e2e85c`:

- canonical CI PASS;
- 274/274 unit tests PASS;
- exact-head build PASS;
- runtime dependency audit PASS;
- Wrangler dry-run PASS;
- Chrome exact-main matrix PASS;
- Microsoft Edge exact-main matrix 10x PASS;
- reduced-motion / WebGL fallback / context-loss gates PASS;
- hosted OpenFreeMap diagnostic PASS;
- exact artifact deployment PASS;
- production identity reconciliation PASS;
- production browser smoke PASS.

Verified production artifact:

```text
source_commit=3f6f1e7581b464701bb92ae583c7439f49e2e85c
build_hash=be57e6d76ef323ff87368c64
version=order057-3f6f1e7581b4-be57e6d7
```

GitHub release `v0.1.0` was created and verified against that release SHA and public demo before this readiness seal.

## Application posture

VOY is repository-ready for a Codex for Open Source application. Application submission itself still requires the maintainer's OpenAI Organization ID and final form submission.

No feature work is required for application readiness. Do not manufacture adoption, usage, stars, users or ecosystem claims.

## Final document seal

This READY update is documentation-only. Because VOY embeds source identity in its build, the resulting exact `main` documentation SHA must be rebuilt, browser-verified, deployed and used as the final `v0.1.0` target before the operation is terminal.
