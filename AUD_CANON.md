# VOY — AUD_CANON

## PROJECT / PURPOSE / REPO / LIVE
- PROJECT: VOY
- PURPOSE: movilidad MAP-FIRST / MOBILE-FIRST para Argentina; TrackerView temporal verificable; 3D liviano; cero realtime fabricado.
- CANON / WORK REPO: https://github.com/simondalmasso/VOY
- DOWNSTREAM MIRROR ONLY: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/

## LAST_VERIFIED / AUTHORITY
- LAST_VERIFIED: 2026-09-27 ART
- CURRENT_ORDER: ORDER-075 / Issue #57
- ORDER075_BASE_HEAD: \`dd7fc408b5b1fdc6032a27f524246d4a89febe13\`
- LAST_RUNTIME_HEAD_FOR_ORDER075_BASE: \`8a00f0e5bf6fffdbca423f7381540acf397b2fea\`
- HISTORICAL_CANON_REFRESH: \`8af10d68cc7f7ecf3da60b86f9533da49421594d\`
- ORDER074_BROKEN_HEAD_BEFORE_RECOVERY: \`7b5e2c777e7f53ae230ec190cba296a9373866b8\`
- EXPECTED_CANONICAL_WORK_BRANCH: \`feat/order075-mapfirst-trackerview\` (NOT YET CREATED at recovery)
- GITHUB_MAIN: \`1ac1c691487cf9c542fd1db9d08c0ccadfe89f13\`

## RECOVERY INCIDENT
The previous AUD session corrupted the historical ORDER-074 branch after ORDER-075 authority had already been established:
- \`a079d441...\` deleted \`.github/workflows/mirror-gitlab.yml\`.
- \`f517ef7c...\` deleted \`ARQ_CANON.md\`.
- \`ac68e3ab...\` deleted \`AUD_CANON.md\`.
- \`9e127e9d...\` then altered the old ORDER-074 verification workflow.
- \`7b5e2c77...\` then patched the obsolete yellow hero at 200% text.
Those commits remain preserved as evidence. Recovery is additive; history is not rewritten.

## CANONICAL LINKS
- Active order: https://github.com/simondalmasso/VOY/issues/57
- GLM full-architecture alternate: https://github.com/simondalmasso/VOY/issues/59
- Grokbot alternate: https://github.com/simondalmasso/VOY/issues/58
- Sonnet 5 High alternate: https://github.com/simondalmasso/VOY/issues/60
- Superseded hardening order: https://github.com/simondalmasso/VOY/issues/54
- Mirror workflow: https://github.com/simondalmasso/VOY/actions/workflows/mirror-gitlab.yml
- Recovery ledger: \`AUD_RECOVERY_ORDER075.md\`

## CURRENT STATE
- GitHub remains CANON. GitLab is downstream mirror only.
- ORDER-074 is superseded, NOT the active product order.
- ORDER-075 product base remains EXACTLY \`dd7fc408...\`; later ORDER-074 commits are not silently inherited.
- Canonical ARQ1 ORDER-075 implementation has NOT started. Do not create/mutate its branch until AUD convergence is issued.
- Production Santa Fe realtime remains unavailable; no fake-live is authorized.
- Existing Three.js 0.186.0 / temporal authority / fail-closed movement rules remain the architectural baseline.

## EXPERIMENTAL BAKEOFF — AUD STATUS
### Grokbot #58
- AUD status: PARTIAL.
- Design signal: high.
- Drop-in implementation: rejected.
- Main reason: standalone React/Vite/Tailwind rewrite, lazy-3D/idle-render/evidence/provenance defects.
- Preserve UX ideas selectively; do not port framework rewrite as-is.

### Sonnet 5 High #60
- AUD status: PARTIAL.
- Design signal: high; logic signal: medium-high.
- Drop-in implementation: rejected.
- Main reasons: standalone React/Vite rewrite, duplicated temporal/3D authorities, fail-closed 2D marker violation, incomplete evidence.
- Preserve pure logic/test ideas selectively; no reset required, but no canonical port has occurred.

### GLM 5.3 #59
- AUD status: PARTIAL_REAL. ALT_READY declared by GLM but NOT accepted by AUD.
- Artifact: \`voy-order075-glm53-alt.zip\`
- SHA256: \`b575bd39eabf1c7cb70bc01d66e40374083f84d61414b0165f82efbf86eee1bf\`
- Files: 118; path traversal: 0.
- Standalone docs/evidence are byte-identical to ZIP copies.
- Independent unit reproduction: 266/266 PASS.
- Pointer follow fix is present: primary pointer movement >=8px emits early user interaction; it only suspends follow; MapLibre retains gesture/camera ownership.
- Current BUILD_ID recorded by delivered report/evidence: \`dbf8316ca3454acb91479cde\`.
- Browser evidence delivered: 10/10 one run; report claims four consecutive full runs. This does NOT satisfy the later AUD stability gate.

## GLM REQUIRED GAPS BEFORE AUD CAN ACCEPT ALT_READY
1. Correct stale D6 / architecture wording so it records BOTH the harness-readiness race and the real follow-vs-easeTo product race.
2. Fresh exact-artifact focused stability: \`FOCUSED_FOLLOW_DRAG_REPEATS=30/30\`.
3. Fresh exact-artifact full browser stability: \`FULL_BROWSER_MATRIX_REPEATS=10/10\`.
4. Real OpenFreeMap Liberty browser E2E smoke: real style/TileJSON/PBF/glyph path, attribution, pan/zoom, overlay alignment, selected facts, Worker delta=0; otherwise mark BLOCKED_EVIDENCE.
5. Runtime browser gates where available: real Edge desktop/mobile, reduced motion, WebGL2 unavailable, live \`webglcontextlost\`; unsupported gates must be BLOCKED_EVIDENCE, never invented PASS.
6. Regenerate final report/evidence ZIP, record final local commit SHA + ZIP SHA256. No runtime edits after final evidence.

## CODEX SOL LANE
- Chat-recovered local lane only: \`lab/order075-codex-sol-full-alt\`, bootstrap checkpoint \`ff7c98c\`.
- Last recovered phase: discovery + baseline; runtime changes were 0 at that checkpoint.
- No remote GitHub branch currently exists.
- Treat as UNBOUND / NOT AUDITED. Do not use it to override GLM/Grok/Sonnet evidence.

## ACTIVE WORK
- AUD continuity recovery and GLM evidence closure only.
- Feature expansion is frozen.
- No convergence into ARQ1 until the GLM gaps are closed or explicitly classified BLOCKED_EVIDENCE.

## DO_NOT_TOUCH
- No GitLab development.
- No main product/runtime merge.
- No Cloudflare deploy or production probe.
- No fake realtime.
- No new backend/database/persistence/telemetry.
- No InsForge/Floot/Convex/etc. product integration for ORDER-075.
- No React/R3F/Cesium/deck.gl/GeoLibre whole-app rewrite.
- No destructive rewrite of the broken ORDER-074 history.
- No canonical ARQ implementation before AUD convergence.

## AUTHORITIES / GATES
- Issue #57 is the product spec.
- Issue #59 latest AUD comments are authority for GLM terminal evidence.
- AUD owns promotion/convergence.
- Product truth: \`realtime|predicted|scheduled|unknown\`; scheduled/unknown/stale/rejected movement=0.
- Cost: tracker idle/scrub/pan/3D visual path adds 0 VOY Worker calls; no persistence; baseline 2D Three/topology fetches=0.
- Browser final gate remains Chrome + real Edge desktop/mobile + 390x844 + 200% text + reduced motion + WebGL/context-loss.

## NEXT EXACT ACTION
Finish GLM evidence, not architecture. Once GLM is terminally classified, AUD compares the three completed alternatives and writes ONE convergence order for ARQ1. Only then create \`feat/order075-mapfirst-trackerview\` from exact \`dd7fc408...\`. MERGE=NO. DEPLOY=NO.
