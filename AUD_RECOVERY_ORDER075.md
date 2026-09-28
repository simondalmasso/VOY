# VOY — AUD RECOVERY ORDER-075

## Status
`RECOVERY=COMPLETE`
`BAKEOFF=CONVERGED`
`ARQ_HOLD=RELEASED`

The prior AUD corruption was repaired additively. Historical deletion/obsolete ORDER-074 commits remain preserved; no force rewrite occurred.

Recovery authority commit:
`6bc18b2f3bf406e0b102cefd7ef224ff8a3ce6a6`

## Recovered facts
- ORDER-075 base stayed `dd7fc408...`.
- Grokbot #58 terminal AUD state: PARTIAL.
- Sonnet #60 terminal AUD state: PARTIAL.
- GLM #59 progressed from PARTIAL_REAL to AUD_ACCEPTED_FOR_CONVERGENCE after terminal evidence closure.

## GLM terminal identities
- remote source commit: `6f882c3b7d712151c2354d95c518885d12729054`
- remote evidence/report tip: `00e9718`
- local audited source identity: `62bb5c284335579f55f28e913aace67dc16c33ad`
- source tree is the same between the local identity and remote source commit.
- BUILD_ID: `c26d7cefe5ee2d15d0cce7b8`
- final ZIP: `voy-order075-glm53-alt-final.zip`
- ZIP SHA256: `f0216b67468ba7a380f3db90c6e2b358349234bf10d9b2936693210771769937`
- ZIP files=152; traversal=0; forbidden paths=0; missing required=0; CRC bad=None.

## Closed evidence gaps
- D6/architecture wording records both the harness readiness race and real product follow/easeTo race.
- focused follow physical-drag stability 30/30.
- full browser stability 10 complete runs x 10/10.
- real OpenFreeMap Liberty/PBF/glyph/attribution/pan/overlay.
- real Edge desktop/mobile viewport matrix.
- Chrome desktop/mobile viewport matrix.
- reduced motion.
- WebGL2 unavailable.
- live WebGL context loss.

## Durable next authority
`AUD_ORDER075_CONVERGENCE.md`

Recovery work is no longer the active task. ARQ1 resumes canonical ORDER-075 from the exact frozen base.
