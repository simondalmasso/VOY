# VOY — AUD_CANON

## PROJECT / PURPOSE / REPO / LIVE
- PROJECT: VOY
- PURPOSE: movilidad map-first para Argentina; facts verificables, tracker temporal fail-closed, 3D liviano, cero realtime inventado.
- REPO/CANON: https://github.com/simondalmasso/VOY
- DOWNSTREAM MIRROR: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/

## LAST_VERIFIED / BRANCH / HEAD
- LAST_VERIFIED: 2026-09-26 03:21 ART
- ACTIVE_BRANCH: `fix/order074-release-hardening`
- LAST_RUNTIME_HEAD: `8a00f0e5bf6fffdbca423f7381540acf397b2fea`
- VERIFIED_PRE_CANON_REFRESH_HEAD: `0af01d7eee5e7d6f66598697da46dcb33cbc00c5`
- GITHUB_MAIN: `1ac1c691487cf9c542fd1db9d08c0ccadfe89f13`
- GITLAB_MAIN: `1ac1c691487cf9c542fd1db9d08c0ccadfe89f13`
- GITLAB_LEGACY_MAIN: `legacy/gitlab-main-pre-github-canon-20260926@92c4c5dc357171a2b94d7435b59856d430998a0b`

## CANONICAL LINKS
- Active order: https://github.com/simondalmasso/VOY/issues/54
- ORDER-073 RC: https://github.com/simondalmasso/VOY/issues/51
- GitHub compute migration: https://github.com/simondalmasso/VOY/issues/50
- Consumed $0/agent research: https://github.com/simondalmasso/VOY/issues/55
- Mirror workflow: https://github.com/simondalmasso/VOY/actions/workflows/mirror-gitlab.yml
- First green mirror: https://github.com/simondalmasso/VOY/actions/runs/36223488205

## CURRENT STATE
- ONE ARQ only.
- ORDER-074 remains active; product/runtime bytes are still anchored at `8a00f0e...`.
- Unit run `36188395695`: PASS `219/219`.
- Full RC run `36188395677`: Linux PASS, Edge desktop/mobile PASS, normal Chrome PASS; focused ORDER-074 Chrome hardening FAIL only at 390x844 / 200% text because `.app-shell` is 429px wide.
- GitHub is now source of truth. GitLab is automatic downstream mirror only.
- `.github/workflows/mirror-gitlab.yml` mirrors all GitHub branches/tags to same-named GitLab refs by SSH, uses `ci.skip`, does not prune GitLab-only refs, and verifies `main` parity.
- GitHub secret `GITLAB_MIRROR_SSH_KEY` + repo-scoped GitLab deploy key are configured. Local key material was removed after bootstrap.
- Mirror run `36223488205` PASS; GitHub/GitLab `main` parity PASS; active branch parity also independently verified.
- GitHub `main` moved only for mirror infrastructure: `12e0fd0... -> 1ac1c69...`; diff is only `.github/workflows/mirror-gitlab.yml`. This is NOT a product merge/deploy.

## DONE
- ORDER-072 exact GitLab→GitHub source/compute migration proven.
- ORDER-073 RC proven.
- ORDER-074 hardening implementation mostly complete; current unit gate green.
- Agent-stack runtime decision: `USE_NOW=EMPTY`.
- GitHub→GitLab autonomous mirror configured and green; work duplication eliminated.

## ACTIVE WORK
- SINGLE ARQ resumes ORDER-074 only on GitHub branch `fix/order074-release-hardening`.
- Current defect: mobile 200% text horizontal overflow.

## PENDING
- Fix 390x844/200% overflow minimally.
- Keep 219+ tests green.
- Focused Chrome hardening PASS.
- One final full release gate at final runtime HEAD.
- AUD independently verifies exact-head evidence before any merge/deploy decision.

## BLOCKERS / RISKS
- Current release blocker: 200% mobile overflow only.
- Desktop software-WebGL FPS remains explicit optimization debt.
- Santa Fe still has no documented reusable realtime vehicle feed; never fabricate live vehicles.
- GitLab branch protection permits the repo-scoped mirror key to force-update `main`; this exists only because GitHub is canonical. Legacy main is preserved separately.

## DO_NOT_TOUCH
- Do not develop or manually reconcile in GitLab.
- Do not resume ARQ2/ARQ3 parallel work.
- No Cloudflare deploy/prod probes, new DB/service, paid runtime, or agent/LLM framework.
- Do not delete `legacy/gitlab-main-pre-github-canon-20260926`.
- Do not rotate/remove `GITLAB_MIRROR_SSH_KEY` or the GitLab mirror deploy key unless replacing the mirror deliberately.

## AUTHORITIES / GATES
- Implementation authority: GitHub active branch + Issue #54.
- Repository authority: GitHub. GitLab is mirror only.
- Mirror success authority: Actions run `36223488205`.
- AUD owns final release/promotion decision.
- ORDER-074's old `GITHUB_MAIN_CHANGED=NO` must be read as PRODUCT/RUNTIME main mutation forbidden; the user-authorized mirror-only main commit is an explicit infrastructure exception.

## NEXT EXACT ACTION
Resume from latest `fix/order074-release-hardening`; verify descendants after `8a00f0e...` are canon/mirror-only, reproduce the 390x844/200% overflow, apply the smallest CSS/layout fix, run focused local checks, then one final GitHub release gate. Work only in GitHub; GitLab mirrors automatically.
