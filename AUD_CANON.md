# VOY — AUD_CANON

## PROJECT / PURPOSE / REPO / LIVE
- PROJECT: VOY
- PURPOSE: map-first mobility web app for Argentina; truthful route/mode facts, low-weight 3D, strict temporal truth, no fabricated realtime.
- REPO: https://github.com/simondalmasso/VOY
- HISTORICAL LINEAGE / MIRROR TARGET: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/

## LAST_VERIFIED / BRANCH / HEAD
- LAST_VERIFIED: 2026-09-25 22:11 ART
- ACTIVE_BRANCH: `fix/order074-release-hardening`
- LAST_RUNTIME_HEAD: `8a00f0e5bf6fffdbca423f7381540acf397b2fea`
- ORDER074_BASE: `95fd3b540ab1e72b3abeaf09fa69f6a255616b97`
- GITHUB_MAIN: `12e0fd006ed20d255496fbdcc883849038fe301f` (old/non-authoritative for current work)
- Canon/mirror infrastructure commits after LAST_RUNTIME_HEAD are non-runtime; verify their diff before resuming product work.

## CANONICAL LINKS
- Active order: https://github.com/simondalmasso/VOY/issues/54
- ORDER-073 RC: https://github.com/simondalmasso/VOY/issues/51
- Consumed $0/agent-stack research: https://github.com/simondalmasso/VOY/issues/55
- GitHub compute migration evidence: https://github.com/simondalmasso/VOY/issues/50
- GitLab mirror target: https://gitlab.com/simondalmasso/voy

## CURRENT STATE
- ORDER-073 reached `CHECKPOINT_RELEASE_CANDIDATE` at `95fd3b5...`.
- ORDER-074 is active; last runtime HEAD is `8a00f0e...`.
- Latest unit run `36188395695`: PASS, `219/219`.
- Latest full RC run `36188395677`: Linux PASS; Edge desktop/mobile PASS; Chrome normal desktop/mobile PASS; ORDER-074 Chrome hardening substep FAIL.
- Exact current failure: 390x844 at 200% text/zoom; `.app-shell` overflows horizontally (`scrollWidth=429`, `clientWidth=390`). `PWA_OFFLINE=PASS` occurred before this failure.
- GitHub→GitLab one-way mirror workflow is configured at `.github/workflows/mirror-gitlab.yml`.
- Mirror policy: GitHub branches/tags are synchronized to GitLab under isolated `github/*` refs; GitLab historical refs/main are not overwritten; mirrored pushes use `ci.skip`.
- Mirror activation requires one repository secret: `GITLAB_MIRROR_TOKEN` = GitLab personal access token with `write_repository`; never commit or paste the token.
- No merge/deploy/main mutation is evidenced for ORDER-074.

## DONE
- Exact GitLab→GitHub source mirror/Actions path proven (ORDER-072).
- ORDER-073 map-first/tracker/low-weight-3D RC proven with truthful no-live-source behavior.
- ORDER-074 hardening code exists for release-bound lazy 3D, import retry, partial-init cleanup, WebGL context-loss fallback, shipped Three runtime dependency audit, focused hardening evidence and route/render observability; unit gate is green.
- #55 research is complete: `USE_NOW=EMPTY` for agent-stack runtime; no new production service/secret/Cloudflare call is justified.
- GitHub→GitLab mirror automation is repo-configured, non-destructive and Cloudflare-independent.

## ACTIVE WORK
- SINGLE ARQ ONLY.
- Finish ORDER-074 on `fix/order074-release-hardening`.
- Current product task is the remaining mobile 200% text overflow in the hardening gate.

## PENDING
- One-time mirror credential activation in GitHub: add repository secret `GITLAB_MIRROR_TOKEN`, then run `Mirror GitHub refs to GitLab` once manually or let the next push trigger it.
- Verify GitLab receives `github/fix/order074-release-hardening` at the matching GitHub SHA.
- Root-cause the 390px/200% overflow without weakening the assertion.
- Re-run focused hardening locally, then one final GitHub release gate at final runtime HEAD.
- AUD must independently verify final exact-head evidence before any promotion/merge/deploy decision.

## BLOCKERS / RISKS
- Release gate currently blocked by mobile 200% text overflow.
- Mirror cannot write until the GitHub secret exists; credential material is intentionally not stored in repo.
- Desktop software-WebGL FPS remains a recorded optimization debt; do not normalize it into PASS.
- Santa Fe has no verified documented reusable realtime vehicle feed; no moving buses may be fabricated.
- GitHub `main` is stale and must not be used as current source.

## DO_NOT_TOUCH
- Do not use/move `main`.
- No production deploy/probes, Cloudflare runtime changes, D1/R2 additions, GitLab CI, or new paid service.
- Do not resume ARQ2/ARQ3 parallel lanes; #55 is consumed research and #56 is superseded by the single-ARQ policy.
- Do not touch stale unrelated PRs #42/#49.
- Do not add agent/LLM frameworks to VOY runtime; current decision is `USE_NOW=EMPTY`.
- Never store GitLab tokens in source, Issues, logs or chat; use the GitHub repository secret only.

## AUTHORITIES / GATES
- Current implementation authority: `fix/order074-release-hardening` + Issue #54.
- GitHub is current active source; GitLab is a downstream non-destructive mirror/lineage store under `github/*`.
- Source lineage anchor: ORDER-073 RC `95fd3b5...`; original mirrored source `9233f11...`.
- GitHub Actions is the current compute/evidence path.
- AUD owns final acceptance/promotion decision; ARQ stops at hardened RC.
- Required promotion evidence: unit, Linux/build/package/Wrangler/runtime dependency audit, Chrome desktop/mobile + focused hardening, real Edge desktop/mobile, request budget preserved, no prod mutation.

## NEXT EXACT ACTION
Activate the GitLab mirror once by adding GitHub repository secret `GITLAB_MIRROR_TOKEN` (GitLab PAT, `write_repository` only) and run the mirror workflow; then resume ORDER-074 at the latest branch ref, fix the 390x844/200% overflow minimally, verify locally, and run one final full release gate.
