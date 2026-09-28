# VOY — OpenAI Codex for Open Source Readiness

This directory is a documentation-only audit surface. It must not drive product scope.

Product direction to preserve:

```text
MAP_FIRST
TRUTH_FIRST
LOW_COST
FAIL_CLOSED
UNKNOWN != UNAVAILABLE
```

Official program sources checked on 2026-09-28:
- https://openai.com/form/codex-for-oss/
- https://developers.openai.com/community/codex-for-oss
- https://developers.openai.com/codex/codex-for-oss-terms

The official program accepts applications from maintainers of active open-source projects and reviews signals such as meaningful usage, ecosystem importance, and active maintenance. The current form also requires a public GitHub identity/repository, maintainer role, an eligibility explanation, OpenAI Organization ID, and short descriptions of intended API-credit use. VOY's stricter packaging checklist below is project-owned readiness, not a claim that every item is an OpenAI eligibility requirement.

```text
LAST_CHECK=2026-09-28 ART
APPLICATION_STATUS=NOT_READY

MAIN_CANONICAL=NO — main@1ac1c691487cf9c542fd1db9d08c0ccadfe89f13 differs materially from accepted ORDER-075 RC source c3fd59e76bb349ad1177d349fae4aaac7a9cdff1
LICENSE=ABSENT — no LICENSE or LICENSE.md on main
README=NOT_READY — README exists on main but describes an older Svelte/Bun/auth-oriented product; README is absent from the ORDER-075 RC tree
SECURITY_MD=ABSENT
CONTRIBUTING_MD=ABSENT
RELEASE_TAG=NONE_VERIFIED — GitHub releases=[] and tag refs=[]
PUBLIC_DEMO=HTTP_200_BUT_NOT_CANONICAL — current workers.dev page is the older search-first/hero UI, not ORDER-075 RC
CI_TESTS=PASS_ON_RC — 266/266 PASS at c3fd59e76bb349ad1177d349fae4aaac7a9cdff1; GitHub Actions run 36371603533 succeeded
ACTIVE_MAINTENANCE=YES — current ORDER-075 issue/branch/CI/evidence activity verified on 2026-09-28
REPO_HYGIENE=NOT_READY — main currently exposes 65 branches, 25 workflows, and substantial root-level historical artifacts/screenshots/ZIP/backups/pastebins
OPENAI_ORG_ID=NOT_VERIFIED
FORM_TEXTS=NOT_FINAL — do not submit adoption/usage claims until evidence is gathered and the repo/release/demo are reconciled

BLOCKERS=
1. Canon drift: main is not the audited MAP-FIRST/TrackerView product.
2. Public demo drift: production is reachable but does not match the accepted RC.
3. No explicit root OSS license.
4. Public onboarding package is incomplete/outdated: README, SECURITY.md, CONTRIBUTING.md.
5. No public release/tag traceable to a canonical main SHA.
6. Repo presentation is noisy: 65 branches, 25 workflows, many historical root artifacts.
7. OpenAI Organization ID is not verified.
8. Final form texts are not ready; ecosystem-importance/usage claims must remain evidence-backed.

NEXT_MINIMAL_ACTIONS=
1. Reconcile the accepted ORDER-075 exact head to canonical main, then rerun exact-head CI/browser verification. Do not deploy merely to satisfy this checklist.
2. On canonical main, perform OSS packaging/hygiene only: owner chooses an explicit OSS license; rewrite README for the actual MAP-FIRST product; add SECURITY.md and CONTRIBUTING.md; reduce first-surface repo noise without rewriting history.
3. Create one traceable release/tag from canonical main, verify the public demo against that release SHA, then verify OpenAI Organization ID and finalize truthful <=500-character application texts. Only then move APPLICATION_STATUS to READY.
```

## Evidence snapshot

### Canon / runtime

- GitHub default branch: `main`.
- Main head: `1ac1c691487cf9c542fd1db9d08c0ccadfe89f13`.
- Accepted ORDER-075 runtime branch: `feat/order075-mapfirst-trackerview`.
- Accepted runtime source: `c3fd59e76bb349ad1177d349fae4aaac7a9cdff1`.
- Evidence branch: `audit/order075-rc-evidence`.
- Evidence head: `97a00c61a6fbb36c667d727e9d7caf8e58e8ef85`.
- RC build ID: `1ba08c651a7875afdba7149e`.
- ORDER-075 terminal seal: Issue #57 comment `5862511818`.

### RC verification

Verified at the accepted RC:
- unit suite: 266/266 PASS;
- GitHub Actions unit verification: PASS;
- focused follow/physical-drag stability: 30/30;
- full Edge browser matrix: 10 consecutive complete runs, each 10/10;
- Chrome final matrix: 10/10;
- 100/150/200% text gates: PASS;
- real OpenFreeMap path, raster fallback, reduced-motion, WebGL2-unavailable, and context-loss gates: PASS;
- required Worker-call deltas: 0;
- Santa Fe production fake realtime: 0.

These facts demonstrate engineering verification of the RC. They do not make `main` canonical and they do not prove public-demo/release reconciliation.

### Public demo

Read-only check on 2026-09-28:
- URL: https://voy-app.simondalmasso44.workers.dev/
- HTTP status: 200.
- Returned HTML is the older search-first layout with `destination-hero` and hidden map shell.
- Response CSP permits the OSM raster host but does not represent the accepted ORDER-075 OpenFreeMap/MapLibre surface.
- Therefore the demo is reachable but must not be described as the accepted RC.

No deploy was performed during this readiness audit.

### Public repository packaging

Verified on current `main`:
- `README.md`: exists, but describes an older Svelte/Bun/auth-oriented architecture.
- `LICENSE` / `LICENSE.md`: absent.
- `SECURITY.md`: absent.
- `CONTRIBUTING.md`: absent.
- GitHub Releases: none.
- Git tag refs: none.

The ORDER-075 RC tree is a materially different compact tree and currently has no README. Packaging must follow canon reconciliation rather than being duplicated independently on incompatible trees.

### Hygiene

Current `main` exposes:
- 65 branches;
- 25 workflow files under `.github/workflows/`;
- many root-level historical screenshots;
- `movilidad-app-final.zip`;
- HTML backups;
- pastebin captures;
- historical deploy/order artifacts and large worklogs.

This history does not need to be deleted. The public first surface does need to become legible before application/release.

## OpenAI application facts to preserve

Current official application/program pages indicate:
- maintainers of active open-source projects may apply;
- OpenAI reviews signals including repository usage, ecosystem importance, and active maintenance;
- applications are reviewed on a rolling basis;
- form fields include public GitHub username/repository, primary/core maintainer role, an eligibility explanation (max 500 chars), interest in Codex Security/API credits, OpenAI Organization ID, API-credit use (max 500 chars), and an optional additional note (max 500 chars);
- submission accepts the Codex for Open Source Program Terms.

Do not convert this into a product roadmap. Codex usage should map to real maintenance work such as PR review, issue triage, regression testing, source-change maintenance, release verification, and maintainer automation.

## Scope rule

Do not change VOY runtime merely to improve an application.

Never fabricate:
- adoption;
- stars;
- forks;
- downloads;
- users;
- releases;
- activity;
- coverage;
- realtime;
- ETA;
- pricing.

Evidence > claim.
