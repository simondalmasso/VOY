# VOY — ARQ_CANON

## PROJECT / PURPOSE / REPO / LIVE
- PROJECT: VOY
- PURPOSE: map-first mobility app with truthful mode/route facts, fail-closed temporal tracker and low-weight 3D.
- CANON/WORK REPO: https://github.com/simondalmasso/VOY
- DOWNSTREAM MIRROR ONLY: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/

## LAST_VERIFIED / BRANCH / HEAD
- LAST_VERIFIED: 2026-09-26 03:21 ART
- WORK_BRANCH: `fix/order074-release-hardening`
- LAST_RUNTIME_HEAD: `8a00f0e5bf6fffdbca423f7381540acf397b2fea`
- VERIFIED_PRE_CANON_REFRESH_HEAD: `0af01d7eee5e7d6f66598697da46dcb33cbc00c5`
- BASE_HEAD: `95fd3b540ab1e72b3abeaf09fa69f6a255616b97`
- GITHUB_MAIN: `1ac1c691487cf9c542fd1db9d08c0ccadfe89f13` — mirror-infra-only descendant of old main, not current product source.

## CANONICAL LINKS
- ORDER-074: https://github.com/simondalmasso/VOY/issues/54
- ORDER-073 RC: https://github.com/simondalmasso/VOY/issues/51
- Compute/migration proof: https://github.com/simondalmasso/VOY/issues/50
- Mirror workflow: https://github.com/simondalmasso/VOY/actions/workflows/mirror-gitlab.yml
- Green mirror proof: https://github.com/simondalmasso/VOY/actions/runs/36223488205

## CURRENT STATE
- ONE ARQ only. Do not restart.
- Unit run `36188395695`: PASS `219/219`.
- Full RC run `36188395677`: Linux PASS, Edge PASS, normal Chrome PASS; focused ORDER-074 Chrome hardening fails only at 390x844/200% text with `.app-shell` 429px > 390px.
- GitHub is the only work/source-of-truth repo.
- GitHub Actions automatically mirrors all GitHub branches/tags to same-named GitLab refs using repo-scoped SSH key; GitLab-only refs are not pruned; GitLab CI is skipped.
- Mirror run `36223488205`: SUCCESS; `main` parity PASS.
- GitLab legacy pre-canon main is preserved at `legacy/gitlab-main-pre-github-canon-20260926`.
- No PC/Brave/Remote Desktop/SentinelX dependency exists after bootstrap.

## DONE
- Do not repeat ORDER-072 migration.
- Do not repeat ORDER-073 tracker/3D/product work.
- Do not rebuild already-green ORDER-074 hardening contracts unless a current failing test proves a defect.
- Do not repeat agent-stack research; runtime decision is `USE_NOW=EMPTY`.
- Do not configure another mirror. Current GitHub→GitLab mirror is live and verified.

## ACTIVE WORK
- Finish ORDER-074 on the existing GitHub branch.

## PENDING
1. Fix 390x844/200% horizontal overflow by root cause.
2. Keep 219+ tests green.
3. Make focused ORDER-074 Chrome hardening green without weakening assertions.
4. Run one final full release-candidate workflow at final runtime HEAD.
5. Stop at `CHECKPOINT_HARDENED_RC` for AUD.

## BLOCKERS / RISKS
- Release blocker: mobile 200% text overflow.
- Desktop software-WebGL FPS remains debt, not this order's scope unless regressed.
- No authorized Santa Fe realtime feed: keep moving vehicles absent/fail-closed.
- Avoid unnecessary pushes/CI while diagnosing.

## DO_NOT_TOUCH
- NO development in GitLab; never manually reconcile mirrored refs.
- NO ARQ2/ARQ3 parallel lanes.
- NO merge/deploy/production probe/Cloudflare mutation.
- NO new framework/service/DB/secret-in-source/extra Worker call.
- NO weakening tests.
- NO deletion of GitLab legacy main anchor or mirror key/config.

## AUTHORITIES / GATES
- Issue #54 + GitHub work branch own implementation.
- GitHub owns repository truth; GitLab is downstream mirror only.
- User-authorized GitHub `main` mirror workflow commit is infrastructure-only and is not a product merge.
- Final runtime gate must preserve: 219+ tests, build/package/Wrangler/runtime dependency audit, Chrome desktop/mobile, focused PWA/SW+keyboard+zoom+3D failure cases, real Edge desktop/mobile, request budgets, no production mutation.
- AUD decides promotion.

## WHERE_TO_RESUME
1. Fetch latest GitHub `fix/order074-release-hardening`.
2. Confirm changes after `8a00f0e...` are only canon/mirror infrastructure until new product work begins.
3. Resume from latest ref; do not reset.
4. Ignore GitLab for implementation; it mirrors automatically.

## WHAT_TO_DO_NOW
Reproduce `zoomStress` from `order074/evidence/hardening-check.mjs` at 390x844/200%; identify the child forcing `.app-shell` to 429px; apply the smallest CSS/layout correction; run `npm test` and focused hardening locally; then push once and run the final full GitHub gate.

## WHAT_NOT_TO_REPEAT
ORDER-072, ORDER-073, agent-stack research, mirror setup, already-green ORDER-074 contracts, broad redesign, FPS project, live-feed hunting, offline routing, or new infra.

## ACCEPTANCE / STOP CONDITIONS
Stop at `CHECKPOINT_HARDENED_RC` only when final runtime HEAD has 219+ tests with 0 failures; Linux/build/package/Wrangler/runtime audit PASS; Chrome desktop/mobile + focused hardening PASS; real Edge desktop/mobile PASS; request budgets unchanged; `CLOUDFLARE_CALLS=0`; `PROD_MUTATION=NO`. Do not merge or deploy. GitLab parity is automatic and must not require duplicate work.
