# VOY — ORDER-076 WORK CHECKPOINT

LAST_UPDATE=2026-09-28T03:20-03:00
ROLE=AUD+IMPLEMENTER
MODE=NO_RESET / CONTINUE
RUNTIME_WORKTREE=C:\GPT-SANDBOX\VOY-ORDER076-ASTRA
RUNTIME_BRANCH=feat/order076-astra-truth-first
BASE_REMOTE=origin/feat/order075-mapfirst-trackerview
BASE_SHA=c3fd59e76bb349ad1177d349fae4aaac7a9cdff1
CURRENT_LOCAL_SOURCE_SHA=2a6457b0f40a4263a402f115a56b70c449240ac5
CURRENT_BUILD_ID=0a306d0ae153798faa73949a
DEPLOYED=NO

## ESTADO ACTUAL

VOY está en una rama nueva derivada del RC ORDER-075. No se reseteó ni reescribió historia.

El delta ORDER-076 sigue la calibración de Astra:
- MAP-FIRST se preserva.
- TrackerView ahora distingue mejor qué se sabe, cuándo se actualizó y de qué fuente viene.
- UNKNOWN deja de decir "Sin señal" y pasa a "Estado desconocido".
- La UI agrega una conclusión explícita: "Qué sabemos".
- 3D sigue usando Three.js 0.186 existente, lazy, sin engine nuevo.
- 3D ahora es contextual: no debe cargar sin una selección renderizable o recorrido verificado.
- El transporte enviado al 3D se limita a la entidad seleccionada.
- El selector de calidad 3D permanece oculto en baseline 2D y sólo aparece al entrar correctamente en 3D.
- No se tocó la autoridad temporal del store.
- No se agregó backend, persistencia, telemetría, GIS platform ni framework.

## ARCHIVOS DE RUNTIME CAMBIADOS

- public/app.js
- public/index.html
- public/styles.css

## TESTS / PLAN CAMBIADOS

- tests/order075-shell.test.mjs
- tests/order076-astra-calibration.test.mjs
- docs/superpowers/plans/2026-09-28-order076-astra-truth-first.md

## VERIFICACIÓN YA COMPLETADA

Fresh full suite on source SHA 2a6457b...:
```text
tests=269
pass=269
fail=0
```

Production dependency audit:
```text
npm audit --omit=dev
high=0
critical=0
total=0
```

Build on exact source SHA:
```text
SOURCE_COMMIT=2a6457b0f40a4263a402f115a56b70c449240ac5
RELEASE_ID=order057-2a6457b0f40a-0a306d0a
BUILD_ID=0a306d0ae153798faa73949a
CLIENT_FILES=34
```

## PENDIENTE INMEDIATO

El build marcó como modificados:
- public/3d/topology/chunk-santa-fe-centro-0.json
- public/3d/topology/manifest.json

En ORDER-075 esto fue un false-dirty de Git/EOL. Falta terminar la comparación HEAD blob vs working-tree blob para confirmar si aquí ocurre lo mismo.

## AGENTE NUEVO — SEGUIR EXACTAMENTE ASÍ

1. NO RESET.
2. NO tocar main todavía.
3. Abrir `C:\GPT-SANDBOX\VOY-ORDER076-ASTRA`.
4. Verificar:
   - `git rev-parse HEAD` debe ser `2a6457b0f40a4263a402f115a56b70c449240ac5`.
   - `git status --short`.
5. Para cada archivo de topología marcado:
   - comparar `git rev-parse HEAD:<path>`
   - contra `git hash-object <path>`.
   - Si hashes coinciden, refrescar sólo metadata/index; NO commitear contenido idéntico.
   - Si hashes difieren, inspeccionar diff y NO seguir a navegador hasta reconciliar.
6. Confirmar árbol tracked limpio.
7. NO cambiar runtime después de esto sin volver a correr toda la evidencia.
8. Ejecutar browser/runtime gates sobre BUILD_ID `0a306d0ae153798faa73949a`:
   - Edge full matrix.
   - Chrome full matrix.
   - mobile 390x844.
   - 100/150/200% text.
   - keyboard.
   - reduced motion.
   - WebGL2 unavailable fallback.
   - live webglcontextlost fallback.
   - real OpenFreeMap vector path + raster fallback.
   - baseline 2D Three/topology fetches=0.
   - verify 3D button without context does NOT import Three/topology.
   - verify selected entity in 3D is the only tracker entity transferred.
   - required VOY Worker deltas=0.
9. Si cualquier gate falla, corregir TDD, crear nuevo source commit, rebuild y descartar evidencia anterior.
10. Si todo queda verde, persistir `feat/order076-astra-truth-first` remoto con exact source.
11. Verificar GitHub CI + GitLab mirror.
12. Desplegar sólo ese exact source/build.
13. Después del deploy, consultar producción y reconciliar:
    - deployed BUILD_ID == `0a306d0ae153798faa73949a`
    - deployed source SHA == `2a6457b...`
    - public UI muestra MAP-FIRST y truth-first actual.
14. Registrar evidencia/deploy en una rama audit separada y actualizar este checkpoint.
15. OpenAI OSS packaging queda fuera de esta pista.

## REGLAS QUE NO CAMBIAN

MAP_FIRST
TRUTH_FIRST
LOW_COST
FAIL_CLOSED
UNKNOWN != UNAVAILABLE

No fabricar:
- movimiento
- ETA
- cobertura
- disponibilidad
- precio
- realtime

3D:
- optional
- lazy
- contextual
- selected-only
- zero baseline 2D cost
- graceful 2D fallback
