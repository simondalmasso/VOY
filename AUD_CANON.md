# VOY — AUD_CANON

## PROJECT / PURPOSE / REPO / LIVE
- PROJECT: VOY
- PURPOSE: map-first mobility web app for Argentina; truthful route/mode facts, low-weight 3D, strict temporal truth, no fabricated realtime.
- REPO: https://github.com/simondalmasso/VOY
- HISTORICAL LINEAGE: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/

## LAST_VERIFIED / BRANCH / HEAD
- LAST_VERIFIED: 2026-09-25 22:11 ART
- ACTIVE_BRANCH: `fix/order074-release-hardening`
- LAST_RUNTIME_HEAD: `8a00f0e5bf6fffdbca423f7381540acf397b2fea`
- ORDER074_BASE: `95fd3b540ab1e72b3abeaf09fa69f6a255616b97`
- GITHUB_MAIN: `12e0fd006ed20d255496fbdcc883849038fe301f` (old/non-authoritative for current work)
- Canon refresh itself may add a docs-only descendant; verify any diff from LAST_RUNTIME_HEAD is only `AUD_CANON.md` / `ARQ_CANON.md`.

## CANONICAL LINKS
- Active order: https://github.com/simondalmasso/VOY/issues/54
- ORDER-073 RC: https://github.com/simondalmasso/VOY/issues/51
- Consumed $0/agent-stack research: https://github.com/simondalmasso/VOY/issues/55
- GitHub compute migration evidence: https://github.com/simondalmasso/VOY/issues/50

## CURRENT STATE
- ORDER-073 reached `CHECKPOINT_RELEASE_CANDIDATE` at `95fd3b5...`.
- ORDER-074 is active and 11 commits ahead at runtime HEAD `8a00f0e...`.
- Latest unit run `36188395695`: PASS, `219/219`.
- Latest full RC run `36188395677`: Linux PASS; Edge desktop/mobile PASS; Chrome normal desktop/mobile PASS; ORDER-074 Chrome hardening substep FAIL.
- Exact current failure: 390x844 at 200% text/zoom; `.app-shell` overflows horizontally (`scrollWidth=429`, `clientWidth=390`). `PWA_OFFLINE=PASS` occurred before this failure.
- No merge/deploy/main mutation is evidenced for ORDER-074.

## DONE
- Exact GitLab→GitHub source mirror/Actions path proven (ORDER-072).
- ORDER-073 map-first/tracker/low-weight-3D RC proven with truthful no-live-source behavior.
- ORDER-074 hardening code exists for release-bound lazy 3D, import retry, partial-init cleanup, WebGL context-loss fallback, shipped Three runtime dependency audit, focused hardening evidence and route/render observability; unit gate is green.
- #55 research is complete: `USE_NOW=EMPTY` for agent-stack runtime; no new production service/secret/Cloudflare call is justified.

## ACTIVE WORK
- SINGLE ARQ ONLY.
- Finish ORDER-074 on `fix/order074-release-hardening`.
- Current task is the remaining mobile 200% text overflow in the hardening gate.

## PENDING
- Root-cause the 390px/200% overflow without weakening the assertion.
- Re-run focused hardening locally, then one final GitHub release gate at final runtime HEAD.
- AUD must independently verify final exact-head evidence before any promotion/merge/deploy decision.

## BLOCKERS / RISKS
- Release gate currently blocked by mobile 200% text overflow only.
- Desktop software-WebGL FPS remains a recorded optimization debt; do not normalize it into PASS.
- Santa Fe has no verified documented reusable realtime vehicle feed; no moving buses may be fabricated.
- GitHub `main` is stale and must not be used as current source.

## DO_NOT_TOUCH
- Do not use/move `main`.
- No production deploy/probes, Cloudflare runtime changes, D1/R2 additions, GitLab CI, or new paid service.
- Do not resume ARQ2/ARQ3 parallel lanes; #55 is consumed research and #56 is superseded by the single-ARQ policy.
- Do not touch stale unrelated PRs #42/#49.
- Do not add agent/LLM frameworks to VOY runtime; current decision is `USE_NOW=EMPTY`.

## AUTHORITIES / GATES
- Current implementation authority: `fix/order074-release-hardening` + Issue #54.
- Source lineage anchor: ORDER-073 RC `95fd3b5...`; original mirrored source `9233f11...`.
- GitHub Actions is the current compute/evidence path.
- AUD owns final acceptance/promotion decision; ARQ stops at hardened RC.
- Required promotion evidence: unit, Linux/build/package/Wrangler/runtime dependency audit, Chrome desktop/mobile + focused hardening, real Edge desktop/mobile, request budget preserved, no prod mutation.

## NEXT EXACT ACTION
On the active branch, reproduce `order074/evidence/hardening-check.mjs` zoom stress at 390x844/200%, identify the descendant causing `.app-shell` width 429px, apply the smallest CSS/layout fix without weakening tests, verify `npm test` and focused hardening locally, then push and run exactly one final full release gate.
