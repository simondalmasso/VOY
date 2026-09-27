# ORDER-075 AUD Recovery Implementation Plan

> Recovery execution is additive, evidence-first, and must not rewrite historical commits.

**Goal:** Restore durable authority and resume ORDER-075 exactly at the last verified audit boundary.

**Architecture:** Keep the corrupted ORDER-074 history intact. Restore/reconstruct only authority surfaces, bind the recovered GLM artifact to its audited identity, then close evidence gaps before any canonical ARQ runtime work.

**Tech Stack:** GitHub Issues/branches, existing VOY Node test harness, existing Playwright/browser evidence, existing GitHub→GitLab mirror.

**Spec:** Issue #57 + latest AUD comments in #58/#59/#60 + \`AUD_RECOVERY_ORDER075.md\`.

## Global Constraints
- ORDER075 base stays \`dd7fc408...\`.
- No main runtime mutation.
- No deploy/prod probe.
- No fake live.
- No new backend/DB/telemetry/framework rewrite.
- No canonical ARQ branch until AUD convergence.

### Task 1 — Recover authority
- [x] Reconstruct incident history from GitHub commits.
- [x] Restore mirror workflow.
- [x] Rebuild AUD/ARQ CANON with current bakeoff state.
- [x] Preserve broken commits unchanged.

### Task 2 — Bind GLM artifact
- [x] Verify ZIP SHA256/file count/path safety.
- [x] Verify standalone docs/evidence equal ZIP copies.
- [x] Re-run unit suite.
- [ ] Reproduce build/browser evidence when dependencies/environment permit.

### Task 3 — Close GLM evidence
- [ ] Correct stale D6/architecture wording.
- [ ] Run focused follow-drag 30/30 on exact artifact.
- [ ] Run full browser matrix 10/10 on exact artifact.
- [ ] Run real OpenFreeMap E2E or mark BLOCKED_EVIDENCE.
- [ ] Run Edge/reduced-motion/WebGL failure gates or mark BLOCKED_EVIDENCE.
- [ ] Regenerate final report/ZIP/hash with no post-evidence runtime edits.

### Task 4 — Converge
- [ ] Compare GLM/Grokbot/Sonnet evidence.
- [ ] Write single selective-port order in #57.
- [ ] Release ARQ1 to create canonical feature branch from exact base.

## Review Focus
- Do not confuse model-declared ALT_READY with AUD acceptance.
- Do not inherit late ORDER-074 hero work into ORDER-075 base.
- Do not convert unsupported browser gates into PASS.
- Do not let experimental framework rewrites replace VOY authorities.
- Do not create a fourth architecture before convergence.
