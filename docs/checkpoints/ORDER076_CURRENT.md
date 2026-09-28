# VOY — ORDER-076 WORK CHECKPOINT

LAST_UPDATE=2026-09-28T03:20-03:00
ROLE=AUD+IMPLEMENTER
MODE=NO_RESET / CONTINUE
RUNTIME_WORKTREE=C:\GPT-SANDBOX\VOY-ORDER076-ASTRA
RUNTIME_BRANCH=feat/order076-astra-truth-first
BASE_SHA=c3fd59e76bb349ad1177d349fae4aaac7a9cdff1
CURRENT_LOCAL_SOURCE_SHA=2a6457b0f40a4263a402f115a56b70c449240ac5
CURRENT_BUILD_ID=0a306d0ae153798faa73949a
DEPLOYED=NO

## ESTADO PRESENTE

ORDER-076 aplica la calibración Astra sin re-arquitectura:
- MAP-FIRST preservado.
- TrackerView separa estado, conclusión "Qué sabemos", actualización y fuente.
- UNKNOWN => "Estado desconocido"; UNKNOWN != UNAVAILABLE.
- stale explica que la observación venció y no infiere posición actual.
- 3D sigue Three.js 0.186 existente, optional/lazy.
- 3D sin selección renderizable/recorrido verificado => se queda en 2D y carga cero assets 3D.
- 3D usa únicamente la selección tracker actual.
- selector de calidad 3D oculto en baseline 2D, visible sólo en 3D activo.
- sin backend/framework/GIS/persistencia/telemetría nuevos.

## SOURCE / BUILD

```text
SOURCE_COMMIT=2a6457b0f40a4263a402f115a56b70c449240ac5
RELEASE_ID=order057-2a6457b0f40a-0a306d0a
BUILD_ID=0a306d0ae153798faa73949a
CLIENT_FILES=34
UNITS=269/269 PASS
PROD_NPM_AUDIT=0 vulnerabilities
TOPOLOGY_FALSE_DIRTY=CONFIRMED
```

## BROWSER / RUNTIME VERIFICATION

Edge terminal matrix:
```text
13/13 PASS
```

Chrome terminal matrix:
```text
13/13 PASS
```

Covered by those matrices:
- MAP-FIRST mobile 390x844
- Santa Fe no-live truthful
- search secondary
- TrackerView selection/follow/pan/resume/time rail
- 2D→3D→2D selection continuity
- stale => Estado desconocido + zero live marker
- desktop map dominance
- 150% and 200% text no horizontal overflow; 100% baseline
- keyboard/focus
- vector failure => raster fallback
- 3D without context => zero Three/voy3d/topology load
- truth-first contextual 3D
- required Worker-call deltas=0

Special gates on exact BUILD_ID:
```text
REDUCED_MOTION=PASS
WEBGL2_UNAVAILABLE=PASS
WEBGL_CONTEXT_LOSS=PASS
REAL_OPENFREEMAP_VECTOR=PASS
```

The earlier stale browser red was a harness-only case-sensitive regex; runtime was correct. Harness was corrected and stale passed in isolation and in both terminal matrices. No runtime mutation followed the exact build.

## PENDIENTE

1. Persistir evidencia con nombres separados (Edge, Chrome, special gates) sin tocar runtime.
2. Persistir `feat/order076-astra-truth-first` remoto.
3. Verificar GitHub CI y GitLab mirror exactos.
4. Desplegar exactamente el source/build verificado.
5. Verificar producción y reconciliar SHA/BUILD_ID.
6. Registrar evidencia/deploy final y actualizar este checkpoint.
7. OpenAI OSS permanece fuera de esta pista.

## AGENTE NUEVO — SEGUIR EXACTAMENTE ASÍ

1. NO RESET.
2. NO editar runtime salvo que un gate revele bug real.
3. Worktree: `C:\GPT-SANDBOX\VOY-ORDER076-ASTRA`.
4. Confirmar HEAD local `2a6457b0f40a4263a402f115a56b70c449240ac5`.
5. Confirmar BUILD_ID `0a306d0ae153798faa73949a`.
6. Guardar/copiAR evidencia terminal por navegador/gate en `experiments/order076/evidence/`.
7. Si se modifica runtime: INVALIDAR toda evidencia, crear nuevo commit, correr 269+ tests, rebuild y todos los browser gates otra vez.
8. Persistir rama remota `feat/order076-astra-truth-first` sin force-push.
9. Verificar CI remoto y mirror GitLab.
10. Desplegar sólo el exact source/build verificado.
11. Post-deploy comprobar:
    - producción responde
    - MAP-FIRST visible
    - truth pill actual
    - no fake live
    - deployed build/source reconciliables con el exact-head.
12. Crear/actualizar rama de evidencia y este checkpoint con SHAs finales.

## REGLAS

MAP_FIRST
TRUTH_FIRST
LOW_COST
FAIL_CLOSED
UNKNOWN != UNAVAILABLE

No fabricar movimiento, ETA, cobertura, disponibilidad, precio ni realtime.
3D = optional + lazy + contextual + selected-only + zero baseline 2D cost + graceful 2D fallback.

## PHASE_BROWSER_TERMINAL

```text
SOURCE_COMMIT=2a6457b0f40a4263a402f115a56b70c449240ac5
BUILD_ID=0a306d0ae153798faa73949a
UNITS=269/269 PASS
EDGE=13/13 PASS
CHROME=13/13 PASS
REDUCED_MOTION=PASS
WEBGL2_UNAVAILABLE=PASS
CONTEXT_LOSS=PASS
REAL_OPENFREEMAP=PASS
PROD_NPM_AUDIT=0 vulnerabilities
RUNTIME_MUTATION_AFTER_BUILD=0
```

Current next exact steps for a brand-new agent:
1. NO RESET and do not edit runtime.
2. Worktree: `C:\GPT-SANDBOX\VOY-ORDER076-ASTRA`.
3. Confirm HEAD is `2a6457b0f40a4263a402f115a56b70c449240ac5`.
4. Persist branch `feat/order076-astra-truth-first` to GitHub at that exact source if possible.
5. Verify GitHub CI and GitLab mirror against the remote source head.
6. Keep browser evidence separate from runtime source.
7. Deploy only after remote source, CI and mirror are reconciled.
8. After deploy, read production and prove deployed source/build identity matches the audited source/build.
9. Verify production MAP-FIRST, truth-first copy, no fake realtime, and 3D remains lazy/contextual.
10. Record deployment/evidence in audit branch and update this checkpoint.


## PHASE_REMOTE_RECONCILED

```text
RUNTIME_REMOTE=feat/order076-astra-truth-first@2a6457b0f40a4263a402f115a56b70c449240ac5
GITLAB_MIRROR=2a6457b0f40a4263a402f115a56b70c449240ac5
MIRROR_RUN=36387690772 SUCCESS
GITHUB_CI_MANUAL=PASS
GITHUB_CI_RUN=36388368992
GITHUB_CI_TESTS=269
GITHUB_CI_PASS=269
GITHUB_CI_FAIL=0
```

Brand-new agent next exact steps:
1. DO NOT modify runtime source.
2. Inspect canonical deploy mechanism (`wrangler.toml`, package scripts, deploy workflow/history).
3. Deploy exact runtime branch/source only: `2a6457b0...`.
4. Do not merge to main as part of deploy unless explicitly required by the existing deploy mechanism.
5. After deploy, query production and reconcile source/build identity.
6. If deployed identity differs, STOP and do not call production current.
7. If identity matches, verify MAP-FIRST, truth-first copy, no fake live, and 3D lazy/contextual behavior.
8. Persist deployment evidence and update this checkpoint.


## PHASE_PREDEPLOY_READY

```text
SOURCE_SHA=2a6457b0f40a4263a402f115a56b70c449240ac5
BUILD_ID=0a306d0ae153798faa73949a
EDGE=13/13 PASS
CHROME=13/13 PASS
REDUCED_MOTION=PASS
WEBGL2_UNAVAILABLE=PASS
CONTEXT_LOSS=PASS
REAL_OPENFREEMAP=PASS
GITHUB_CI_RUN=36388368992 SUCCESS (269/269)
GITLAB_MIRROR=2a6457b0... EXACT
WRANGLER_DRY_RUN=PASS
WRANGLER_VERSION=4.125.0
ASSET_FILES=40
DEPLOYED=NO
```

Exact deploy command from worktree:
`npx wrangler deploy --config wrangler.jsonc`

A brand-new agent must:
1. Confirm HEAD remains `2a6457b0...`.
2. Confirm `dist/BUILD_MANIFEST.json` still says BUILD_ID `0a306d0ae153798faa73949a`.
3. Do NOT rebuild or edit runtime before deploy; otherwise browser evidence is stale.
4. Run the exact deploy command above.
5. Capture Wrangler deployment/version output.
6. Query production `/api/health` or equivalent release metadata endpoint if available.
7. Fetch production HTML/assets and prove MAP-FIRST + truth-first current surface.
8. Prove deployed build/source identity is reconciled to this exact source/build. If identity cannot be proven, mark deploy as DEPLOYED_UNRECONCILED and STOP.
9. Persist deploy evidence and update this checkpoint.
