# VOY — ORDER-076 WORK CHECKPOINT

LAST_UPDATE=2026-09-28
ROLE=AUD+IMPLEMENTER
MODE=NO_RESET / CONTINUE
RUNTIME_WORKTREE=C:\GPT-SANDBOX\VOY-ORDER076-ASTRA
RUNTIME_BRANCH=feat/order076-astra-truth-first
BASE_SHA=c3fd59e76bb349ad1177d349fae4aaac7a9cdff1
CURRENT_REMOTE_SOURCE_SHA=2a6457b0f40a4263a402f115a56b70c449240ac5
CURRENT_BUILD_ID=0a306d0ae153798faa73949a
DEPLOYED=NO
EVIDENCE_FOR_DEPLOY=INVALIDATED_PENDING_FIX

## ESTADO PRESENTE

ORDER-076 truth-first/contextual-3D está implementado, probado y remoto, pero NO se despliega todavía.

Gate real-vector detectó un bug real:
```text
BUG=MAPLIBRE_NATIVE_PAN_DOES_NOT_SYNC_LOGICAL_CENTER
```

`public/app.js` usa `substrate.getCenter()` para `trackerStore.nearby(center)`.
`public/map/substrate.js` actualiza `center` en `setCenter/focusTo`, pero no después de pan nativo MapLibre.
Resultado: el mapa puede quedar visualmente en una zona nueva mientras la lógica nearby/contexto sigue usando el centro anterior.

Toda evidencia anterior al fix queda invalidada para deploy.

## DIRECCIÓN DE PRODUCTO / DISEÑO

Non-negotiable:
- MAP_FIRST
- TRUTH_FIRST
- LOW_COST
- FAIL_CLOSED
- UNKNOWN != UNAVAILABLE
- realtime / predicted / scheduled / unknown separados
- 2D robusto
- 3D optional/lazy/contextual/selected-only

Visual primary reference:
```text
CABA_OS=https://caba.os.nicopoore.com/
ROLE=PRIMARY_VISUAL_REFERENCE
USE=visual hierarchy / urban atmosphere / floating compact controls / map dominance
DO_NOT_COPY=runtime architecture / data truth claims / backend / fake-live behavior
```

Astra calibration remains:
- map first
- temporal truth immediately legible
- less visual competition
- 3D as spatial lens, not alternate product mode

## SOURCE ACTUAL YA VERIFICADO

- units 269/269 PASS
- npm audit --omit=dev = 0 vulnerabilities
- Edge 13/13 PASS
- Chrome 13/13 PASS
- reduced-motion PASS
- WebGL2 unavailable PASS
- context-loss PASS
- raster fallback PASS
- real OpenFreeMap style/PBF/glyph/attribution observed
- 3D without context => zero load
- 3D contextual => selection preserved / Worker delta 0
- 150/200% text PASS

These do NOT authorize deploy after the center-sync bug was found.

## AGENTE NUEVO — SEGUIR EXACTAMENTE ASÍ

1. NO RESET.
2. Worktree: `C:\GPT-SANDBOX\VOY-ORDER076-ASTRA`.
3. Confirm HEAD before fix: `2a6457b0f40a4263a402f115a56b70c449240ac5`.
4. TDD center-sync:
   - add failing contract proving MapLibre native pan/moveend updates logical `center`.
   - implementation must update logical center from real MapLibre center after user pan.
   - do NOT refetch Worker and do NOT change follow semantics.
5. Run focused test RED, then minimal GREEN.
6. Run full unit suite.
7. Commit new source SHA.
8. Build exact source; record new BUILD_ID.
9. Because runtime changed, rerun ALL browser evidence from zero.
10. After correctness gates are green, apply one bounded visual-polish pass inspired by CABA_OS:
    - map remains dominant;
    - reduce SaaS/dashboard feel;
    - floating controls compact;
    - urban/map atmosphere stronger;
    - no new engine/framework;
    - no fake live;
    - no baseline 3D cost.
11. TDD visual contracts where possible; then rerun full units/build/browser gates again.
12. Push exact branch without force.
13. Verify mirror GitLab.
14. Deploy only exact final source/build.
15. Post-deploy reconcile public BUILD_ID/source SHA and verify MAP-FIRST/truth-first.
16. Update this checkpoint after each phase.

## NO FABRICAR

movement
ETA
coverage
availability
price
realtime

## 3D

optional
lazy
contextual
selected-only
zero baseline 2D cost
graceful 2D fallback


## DIRECCIÓN ESTÉTICA

- CABA_OS (https://caba.os.nicopoore.com/) = referencia visual principal.
- AhiVoy 3D = referencia funcional para seguimiento, replay/provenance y 3D, NO referencia estética principal.
- Objetivo: presencia visual/atmósfera de CABA_OS + verdad temporal VOY + 3D contextual/lazy.
- No copiar GIS dashboard, peso runtime, terrain/LiDAR ni features ajenas.
- Cualquier polish estético futuro debe preservar los gates actuales y volver a invalidar/recrear evidencia si toca runtime.


## PHASE_VISUAL_PIVOT_CABA_OS

```text
DEPLOY_HOLD=YES
REASON=AESTHETIC_DELTA_CABA_OS
REFERENCE=https://caba.os.nicopoore.com/
BASELINE_SOURCE=2a6457b0f40a4263a402f115a56b70c449240ac5
BASELINE_BUILD=0a306d0ae153798faa73949a
BASELINE_FUNCTIONAL_EVIDENCE=GREEN
DEPLOY_EXECUTED=NO
```

Owner feedback: CABA_OS is substantially stronger aesthetically. Treat this as a visual-direction correction before production.

Rules for the visual delta:
- preserve MAP_FIRST / TRUTH_FIRST / LOW_COST / FAIL_CLOSED;
- preserve all ORDER-076 semantics and no-fake-live behavior;
- preserve 2D baseline zero 3D asset cost;
- preserve contextual/lazy selected-only 3D;
- borrow visual composition only: map treatment, hierarchy, surfaces, density, typography, overlays;
- do not copy misleading "live" semantics, ornamental animation, backend, framework, or runtime architecture;
- any runtime/CSS/HTML mutation creates a new source SHA/build and invalidates the previous browser evidence for release.

Brand-new agent exact continuation:
1. NO RESET.
2. Do NOT deploy baseline 2a6457b.
3. Inspect CABA_OS visual system and identify a bounded visual delta.
4. Modify presentation only unless a concrete interaction issue requires otherwise.
5. Add/adjust visual contract tests before implementation.
6. Commit new source SHA.
7. Run full unit suite and build.
8. Re-run Edge + Chrome matrix, 100/150/200%, keyboard, reduced motion, WebGL2 unavailable, context loss, real vector, raster fallback, 3D zero-load/contextual gates.
9. Only then persist remote, CI, mirror, deploy exact head and reconcile production.


## CHECKPOINT — CABA POLISH DECISION

```text
CABA_POLISH_DECISION=APPLY_BEFORE_DEPLOY
PRE_POLISH_SOURCE=2a6457b0f40a4263a402f115a56b70c449240ac5
PRE_POLISH_BUILD=0a306d0ae153798faa73949a
EDGE_PRE_POLISH=13/13 PASS
CHROME_PRE_POLISH=13/13 PASS
DEPLOY_PRE_POLISH=NO
```

The user explicitly chose CABA_OS as the dominant aesthetic reference. Therefore the current browser evidence is retained as a behavioral baseline but is NOT terminal deploy evidence.

Exact next steps for a fresh agent:
1. NO RESET.
2. Add a small TDD contract for CABA-inspired VOY visual invariants.
3. Apply only low-cost CSS/HTML/theme polish: black/dark default, thin borders, reduced rounding, mono microcopy, cold cyan for truth/realtime, yellow reserved for routes/actions, subtle map vignette.
4. Do NOT add CRT/flicker, new assets, JS animation, new engine, GIS platform or framework.
5. Preserve light theme as an explicit user option.
6. Run 269+ unit tests.
7. Create a NEW runtime source commit.
8. Rebuild; previous BUILD_ID becomes non-terminal.
9. Rerun Edge + Chrome full matrices and special gates.
10. Only then persist remote and deploy exact-head.


## PHASE_LOCAL_REMOTE_DIVERGENCE_RECONCILE

```text
DEPLOY_HOLD=YES
LOCAL_HEAD=7bf7630d7cb38b7035fc4ba06b896b66aefdd53d
LOCAL_COMMIT=fix(order076): sync logical center after vector pan
REMOTE_HEAD=51cdf7730a2c60b5eac55fcc179754513ba9689f
REMOTE_COMMIT=test(order076): define CABA-inspired visual discipline
DIVERGENCE=LOCAL_AHEAD_1_REMOTE_AHEAD_1
DIRTY_TRACKED=tests/order076-astra-calibration.test.mjs
UNTRACKED=browser evidence + temporary CABA inspection artifacts
DEPLOYED=NO
```

The local commit is a real runtime correction:
- map substrate now emits `onViewportChange` on MapLibre `moveend`;
- app resynchronizes tracker overlays after native vector pan;
- Worker calls remain zero for viewport sync.

The dirty test file contains an earlier CABA visual sketch. It must be reconciled with the live CABA_OS extraction before commit. Do not discard it blindly.

Live CABA_OS extraction found:
- black full-screen canvas;
- Inter UI;
- monospace temporal HUD;
- pale green-white HUD ink around rgba(224,236,222,.94);
- transparent controls;
- minimal chrome;
- fixed edge HUD;
- subtle inset vignette;
- no requirement for cyan/yellow, cards, or ornamental CRT behavior.

Brand-new agent exact continuation:
1. NO RESET / NO force-push.
2. Worktree `C:\GPT-SANDBOX\VOY-ORDER076-ASTRA`.
3. Merge `origin/feat/order076-astra-truth-first@51cdf77` into local `7bf7630`; remote adds only the visual contract file.
4. Keep the local pan fix.
5. Reconcile the dirty CABA tests to the measured live visual tokens; remove contradictory cyan/yellow guesses.
6. Run visual tests and confirm RED before styling.
7. Implement bounded presentation delta primarily in CSS + dark default theme.
8. New source SHA/build invalidates all earlier release evidence.
9. Re-run full unit/build/browser/special gates before any deploy.


## PHASE_VISUAL_TDD_RED

```text
DEPLOY_HOLD=YES
LOCAL_MERGE=COMPLETE
LOCAL_RUNTIME_FIX=7bf7630d7cb38b7035fc4ba06b896b66aefdd53d
REMOTE_VISUAL_TEST=51cdf7730a2c60b5eac55fcc179754513ba9689f
VISUAL_TESTS=8
VISUAL_PASS=4
VISUAL_FAIL=4
DEPLOYED=NO
```

Current interpretation:
- a partial local restyle existed already (cyan/yellow, square HUD, vignette);
- live CABA_OS extraction shows black canvas + Inter + monospace time/HUD + pale green-white ink + transparent controls + subtle inset vignette;
- the partial cyan/yellow guess is being corrected, not discarded blindly;
- temporal/store/TrackerView semantics remain unchanged.

Brand-new agent exact continuation:
1. NO RESET.
2. Worktree `C:\GPT-SANDBOX\VOY-ORDER076-ASTRA`.
3. Preserve merge history and pan fix.
4. GREEN only the four failing visual contracts by editing:
   - `public/index.html` default theme;
   - `public/app.js` default theme;
   - `public/styles.css` presentation layer.
5. Required visual target:
   - full viewport map;
   - transparent fixed topbar;
   - black/dark map treatment;
   - pale green-white HUD ink;
   - mono temporal metadata;
   - compact dark translucent sheet/HUD;
   - subtle inset vignette, no CRT scanline/flicker/music;
   - static selected ring (no decorative pulse);
   - zero new assets/dependencies.
6. Run visual tests first, then full suite.
7. New source SHA/build after GREEN invalidates all prior browser evidence.
