# VOY — AUD_CANON

## AUTHORITY
- CANON_DOC_SYNC: 2026-09-28 RC authority
- PROJECT: VOY
- CANON: https://github.com/simondalmasso/VOY
- MIRROR ONLY: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/
- CURRENT_ORDER: ORDER-075 / Issue #57
- ORDER075_BASE_HEAD: `dd7fc408b5b1fdc6032a27f524246d4a89febe13`
- RECOVERY_COMMIT: `6bc18b2f3bf406e0b102cefd7ef224ff8a3ce6a6`
- TERMINAL_CONVERGENCE_COMMIT: `62526ae75f551bc359311c0c911c1d9ad5b42a51`
- CONCURRENCY_RECONCILIATION_COMMIT: `38d08628786591d6d2f3090fe74b47f0d9e57e66`

## RECOVERY / BAKEOFF
`RECOVERY=COMPLETE`
`BAKEOFF=CONVERGED`

- Grokbot #58: AUD_PARTIAL / design reference only.
- Sonnet #60: AUD_PARTIAL / logic+UX/test reference only.
- GLM #59: AUD_ACCEPTED_FOR_CONVERGENCE.
- #58/#59/#60 are closed completed; #57 remains the sole canonical order.

## CANONICAL ORDER-075 RC
```text
CHECKPOINT=CHECKPOINT_MAPFIRST_TRACKERVIEW_RC
RUNTIME_BRANCH=feat/order075-mapfirst-trackerview
RUNTIME_SOURCE_COMMIT=c3fd59e76bb349ad1177d349fae4aaac7a9cdff1
EVIDENCE_BRANCH=audit/order075-rc-evidence
EVIDENCE_COMMIT=97a00c61a6fbb36c667d727e9d7caf8e58e8ef85
BUILD_ID=1ba08c651a7875afdba7149e
MERGE=NO
DEPLOY=NO
PROD_PROBE=NO
```

Canonical runtime was selectively converged from the audited GLM reference while preserving the stricter in-flight ARQ tracker/store contracts. No reset, force-push or wholesale branch replacement was used.

## TERMINAL VERIFICATION
- local full units: 266/266 PASS.
- GitHub Actions run `36371603533`: SUCCESS, 266/266 PASS.
- GitHub→GitLab mirror run `36371603541`: SUCCESS.
- GitLab canonical branch head = `c3fd59e...`.
- Edge full matrix: 10/10 PASS.
- focused physical follow-drag stability: 30/30 consecutive PASS.
- full Edge matrix stability: 10 consecutive complete runs, each 10/10 PASS.
- Chrome final matrix: 10/10 PASS.
- real OpenFreeMap Liberty/PBF/glyph/attribution/pan/overlay: PASS.
- reduced motion: PASS.
- WebGL2 unavailable fallback: PASS.
- live WebGL context loss fallback: PASS.
- 390x844 MAP-FIRST: PASS.
- 100% baseline layouts: PASS.
- 150% text explicit gate: PASS.
- 200% text: PASS.
- keyboard reach/focus: PASS.
- vector failure → raster fallback: PASS.
- required Worker deltas: 0.
- baseline 2D Three/topology transfer before opt-in: 0.
- Santa Fe production remains explicit no-live.

Durable terminal seal: Issue #57 comment `5862511818`.
Evidence report: `experiments/order075/ORDER075_RC_REPORT.md` on `audit/order075-rc-evidence@97a00c6...`.

## STATUS
```text
CANONICAL_RC=READY_FOR_AUD_ACCEPTANCE
RUNTIME_MUTATION_AFTER_FINAL_BUILD=0
RUNTIME_MUTATION_AFTER_TERMINAL_BROWSER_EVIDENCE=0
CHECKPOINT_MAPFIRST_TRACKERVIEW_RC=REACHED
```

## DO NOT TOUCH
- no GitLab implementation;
- no main merge;
- no deploy or production probe;
- no fake realtime;
- no new backend/database/persistence/telemetry;
- no framework/3D/temporal rewrite;
- no runtime mutation after terminal evidence without invalidating the relevant evidence.

## NEXT EXACT ACTION
Owner/AUD decision on the canonical RC. Until then: MERGE=NO, DEPLOY=NO, PROD_PROBE=NO.
