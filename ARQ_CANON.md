# VOY — ARQ_CANON

## PROJECT / PURPOSE / REPO / LIVE
- PROJECT: VOY
- PURPOSE: MAP-FIRST / MOBILE-FIRST movilidad Argentina; truthful TrackerView; low-weight optional 3D.
- WORK/CANON: https://github.com/simondalmasso/VOY
- MIRROR ONLY: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/

## LAST_VERIFIED / BRANCH / HEAD
- LAST_VERIFIED: 2026-09-27 ART
- RECIBE: ARQ1
- CURRENT_ORDER: https://github.com/simondalmasso/VOY/issues/57
- ORDER075_BASE_HEAD: \`dd7fc408b5b1fdc6032a27f524246d4a89febe13\`
- LAST_RUNTIME_HEAD_FOR_ORDER075_BASE: \`8a00f0e5bf6fffdbca423f7381540acf397b2fea\`
- TARGET_BRANCH_WHEN_RELEASED_BY_AUD: \`feat/order075-mapfirst-trackerview\`
- TARGET_BRANCH_CURRENTLY_EXISTS: NO
- NEVER BASE PRODUCT WORK ON: \`main\`

## RECOVERY STATE
- CONTINUE/NO_RESET.
- Previous AUD session deleted both CANON files and the mirror workflow from \`fix/order074-release-hardening\`; recovery is additive and preserves the deletion commits as evidence.
- ORDER-074 remains superseded; later hero polishing on that branch does not become the ORDER-075 base.
- The experimental bakeoff happened before ARQ1 canonical implementation and must be synthesized before ARQ1 starts.

## BAKEOFF INPUTS
- Grokbot #58: AUD PARTIAL; useful UX ideas, framework rewrite rejected.
- Sonnet #60: AUD PARTIAL; useful tracker/time ideas, framework rewrite and fail-closed marker defect rejected.
- GLM #59: AUD PARTIAL_REAL; real VOY integration, 266/266 independently reproduced, pointer/follow fix verified in artifact, but terminal browser evidence still incomplete.
- Codex Sol lane from broken chat: UNBOUND local checkpoint only, not an audited candidate.

## GLM EVIDENCE STILL REQUIRED
- Correct stale D6/architecture wording.
- Focused follow/drag stability 30/30 on exact final artifact.
- Full browser matrix stability 10/10 on exact final artifact.
- Real OpenFreeMap Liberty browser E2E or BLOCKED_EVIDENCE.
- Real Edge desktop/mobile, reduced-motion, WebGL2 unavailable and live context-loss gates where available; unsupported = BLOCKED_EVIDENCE.
- Regenerated final artifact/report hash after evidence, with no runtime edits afterward.

## ARQ HOLD
ARQ1 MUST NOT start canonical runtime implementation yet. The previous CANON instruction to immediately create the feature branch is superseded by the later bakeoff/recovery state.

Wait for one AUD convergence comment/order in #57 that explicitly states:
- accepted pieces from each alternate;
- rejected pieces;
- exact base remains \`dd7fc408...\`;
- exact canonical branch name;
- test/evidence gates;
- no merge/deploy.

## EXPECTED CONVERGENCE DIRECTION — NOT YET AN IMPLEMENTATION ORDER
Preserve existing VOY architecture and authorities:
- current Worker/planner/PWA plumbing;
- \`public/3d/temporal.js\` as temporal authority;
- \`public/3d/voy3d.js\` / Three.js 0.186.0 as lazy 3D authority;
- fail-closed renderer semantics;
- no fake Santa Fe live.

Candidate pieces to consider only after AUD final comparison:
- GLM real-repo map-first integration, tracker/store modules, bounded MapLibre/OpenFreeMap upgrade + raster fallback, pointer-drag follow suspension fix;
- Grokbot/Sonnet interaction and visual ideas only where they improve the canonical implementation without bringing their framework rewrites.

## DO_NOT_TOUCH
- NO GitLab implementation.
- NO main product merge, deploy or production probe.
- NO fake realtime or unverified data.
- NO new backend/DB/persistence/telemetry.
- NO InsForge/Floot/Convex/etc. integration for this order.
- NO React rewrite, R3F, Cesium, deck.gl, GeoLibre whole app, new 3D engine.
- NO duplicate temporal authority.
- NO parallel ARQ lanes.

## FINAL CONTRACT AFTER AUD RELEASE
- Base exact: \`dd7fc408...\`.
- MAP-FIRST mobile 390x844.
- Search secondary.
- Truth status always explicit.
- Scheduled/unknown/stale/rejected realtime vehicle markers/movement = 0.
- Tracker history session-only.
- Scrub/follow/pan/3D visual Worker-call delta=0.
- Baseline 2D Three/topology fetches=0.
- Chrome + real Edge desktop/mobile, 200% text, reduced motion, WebGL/context-loss.
- Stop at RC. MERGE=NO. DEPLOY=NO.

## WHAT_TO_DO_NOW
No runtime mutation. Read #57 and the eventual AUD convergence order when posted. Do not recreate the old yellow hero work and do not start a fourth architecture.
