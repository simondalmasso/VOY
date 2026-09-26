# VOY — ARQ_CANON

## PROJECT / PURPOSE / REPO / LIVE
- PROJECT: VOY
- PURPOSE: map-first mobility app with truthful route/mode facts, low-weight 3D and fail-closed temporal semantics.
- REPO: https://github.com/simondalmasso/VOY
- LIVE: https://voy-app.simondalmasso44.workers.dev/

## LAST_VERIFIED / BRANCH / HEAD
- LAST_VERIFIED: 2026-09-25 22:11 ART
- WORK_BRANCH: `fix/order074-release-hardening`
- LAST_RUNTIME_HEAD: `8a00f0e5bf6fffdbca423f7381540acf397b2fea`
- BASE_HEAD: `95fd3b540ab1e72b3abeaf09fa69f6a255616b97`
- `main`: `12e0fd006ed20d255496fbdcc883849038fe301f` — DO NOT USE.
- Canon refresh may create a docs-only descendant; preserve it and continue from latest branch ref.

## CANONICAL LINKS
- ORDER-074: https://github.com/simondalmasso/VOY/issues/54
- ORDER-073 RC/evidence: https://github.com/simondalmasso/VOY/issues/51
- $0/agent-stack decision (consumed): https://github.com/simondalmasso/VOY/issues/55
- Migration/compute proof: https://github.com/simondalmasso/VOY/issues/50

## CURRENT STATE
- ORDER-074 hardening implementation is already in progress; DO NOT restart.
- Runtime HEAD `8a00f0e...` is 11 commits ahead of ORDER-073 RC.
- Unit Actions `36188395695`: PASS `219/219`.
- Full RC Actions `36188395677`: Linux PASS; Edge PASS; normal Chrome PASS; focused ORDER-074 Chrome hardening FAIL.
- Failure is deterministic: at 390x844 with 200% text, `.app-shell` is 429px wide for a 390px viewport.
- `PWA_OFFLINE=PASS` already passed in that same hardening run before zoom stress failed.

## DONE
- Do not repeat ORDER-072 migration or ORDER-073 implementation.
- Do not re-implement lazy-3D BUILD_ID binding, retry, cleanup, WebGL context-loss fallback, Three runtime dependency classification, hardening harness, or route/render observability unless a current failing test proves a defect.
- Agent-stack research is closed for current architecture: no runtime addition; `USE_NOW=EMPTY`.

## ACTIVE WORK
- One ARQ only.
- Finish ORDER-074 release hardening on the existing branch.

## PENDING
1. Fix the 390x844/200% horizontal overflow by root cause.
2. Keep all current 219 tests green.
3. Make the focused ORDER-074 Chrome hardening harness green without relaxing assertions.
4. Run one final full release-candidate workflow at final runtime HEAD.
5. Stop at `CHECKPOINT_HARDENED_RC` and hand evidence to AUD.

## BLOCKERS / RISKS
- Current blocker: mobile 200% text overflow.
- Desktop software-WebGL performance is still a known miss/debt, not this order's scope unless the hardening change regresses it.
- No authorized Santa Fe realtime feed: keep live vehicles absent/fail-closed.
- Avoid CI churn: diagnose locally/focused before pushing.

## DO_NOT_TOUCH
- NO `main`, merge, deploy, production probe, Cloudflare runtime mutation, GitLab CI.
- NO ARQ2/ARQ3 parallel work; do not continue Issue #56.
- NO agent/LLM/runtime framework, new service, DB, secret or extra Worker call.
- NO stale PR #42/#49.
- NO weakening/removing existing tests to obtain green.

## AUTHORITIES / GATES
- Issue #54 is the active work contract.
- Active branch is authoritative for implementation.
- Final gate must preserve: exact lineage, 219+ tests, build/package, Wrangler dry-run, runtime/dependency audit, Chrome desktop/mobile, focused Chrome PWA/SW+keyboard+zoom+3D failure cases, real Edge desktop/mobile, healthy Santa Fe Worker calls <=4, 3D extra dynamic Worker calls=0, no Cloudflare/prod mutation.
- AUD alone decides promotion after ARQ checkpoint.

## WHERE_TO_RESUME
1. Fetch `fix/order074-release-hardening`.
2. If HEAD is a canon-only descendant of `8a00f0e...`, verify `git diff --name-only 8a00f0e...HEAD` contains only `AUD_CANON.md` and `ARQ_CANON.md`.
3. Resume from the latest branch ref; do not reset.

## WHAT_TO_DO_NOW
Reproduce the exact failing `zoomStress` case from `order074/evidence/hardening-check.mjs` at 390x844/200%; inspect which child forces `.app-shell` from 390px to 429px; make the smallest layout/CSS correction; rerun `npm test` and the focused hardening check locally; only then push and let the final full GitHub gate run.

## WHAT_NOT_TO_REPEAT
- ORDER-072 mirror/compute migration.
- ORDER-073 tracker/3D/product work.
- ARQ2 OSS-agent research.
- Already-green ORDER-074 hardening contracts.
- Broad redesign, FPS project, live-feed hunting, offline routing, or new infra.

## ACCEPTANCE / STOP CONDITIONS
PASS only when the final exact runtime HEAD has:
- unit tests >=219 with 0 failures;
- Linux/build/package/Wrangler/runtime dependency audit PASS;
- Chrome desktop/mobile happy path PASS;
- ORDER-074 focused Chrome PWA/SW, retry/cleanup/context-loss, keyboard and 200% zoom, 3D route/draw evidence PASS;
- real Edge desktop/mobile PASS;
- request budgets unchanged;
- `CLOUDFLARE_CALLS=0`, `PROD_MUTATION=NO`, `GITHUB_MAIN_CHANGED=NO`.

Then stop as `CHECKPOINT_HARDENED_RC`. Do not merge or deploy; return evidence to AUD.
