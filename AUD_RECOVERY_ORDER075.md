# VOY — AUD RECOVERY ORDER-075

Date: 2026-09-27 ART  
Mode: surgical continuity recovery / no reset / no history rewrite

## Purpose
Reconstruct the authoritative ORDER-075 state after the prior AUD chat/session corrupted the historical ORDER-074 branch and lost continuity around the experimental architecture bakeoff.

## Authority recovered
Historical last-good CANON refresh:
- \`8af10d68cc7f7ecf3da60b86f9533da49421594d\`
- delta from ORDER-075 base \`dd7fc408...\`: only \`AUD_CANON.md\` + \`ARQ_CANON.md\`.

Product base remains:
- \`ORDER075_BASE_HEAD=dd7fc408b5b1fdc6032a27f524246d4a89febe13\`
- \`LAST_RUNTIME_HEAD_FOR_BASE=8a00f0e5bf6fffdbca423f7381540acf397b2fea\`

## Corruption sequence preserved
| Commit | Effect |
|---|---|
| \`a079d441529c167abae9f537c9e2b217d3911c6d\` | deleted GitHub→GitLab mirror workflow |
| \`f517ef7cced80044e1486163acad8ddd5bb31895\` | deleted ARQ_CANON.md |
| \`ac68e3ab02271d2e80f78bb45a5df5d7f336b03e\` | deleted AUD_CANON.md |
| \`9e127e9dc7ae16723d00e1a4945039c090f1b83d\` | rebound old ORDER-074 verification |
| \`7b5e2c777e7f53ae230ec190cba296a9373866b8\` | patched obsolete hero at 200% text |

No commit is removed or force-rewritten.

## Restored surfaces
- \`.github/workflows/mirror-gitlab.yml\`: restored from current GitHub \`main\` copy, which matches the established mirror.
- \`AUD_CANON.md\`: reconstructed from historical refresh + Issues #57/#58/#59/#60 + recovered chat + artifact audit.
- \`ARQ_CANON.md\`: reconstructed to prevent premature canonical runtime work before AUD convergence.

## GLM artifact identity
User-supplied recovery artifact:
- \`voy-order075-glm53-alt.zip\`
- SHA256 \`b575bd39eabf1c7cb70bc01d66e40374083f84d61414b0165f82efbf86eee1bf\`
- file count 118
- path traversal entries 0

Standalone files verified byte-identical to ZIP copies:
- \`ARCHITECTURE.md\`
- \`DECISIONS.md\`
- \`ORDER075_ALT_REPORT.md\`
- \`order075-alt-evidence.json\`

Fresh recovery-environment unit run:
- command: \`node --test\`
- result: 266/266 PASS
- duration: ~3.1 s

Dependency installation/build/browser rerun in this recovery container:
- \`npm ci\` did not complete inside the tool execution window.
- Therefore build and browser gaps are NOT upgraded to PASS here.

## GLM terminal classification
\`CURRENT=AUD_PARTIAL_REAL\`

Accepted evidence:
- artifact identity/integrity;
- 266/266 unit reproduction;
- bounded >=8 px pointer drag fallback exists;
- delivered 10-check Chromium evidence has 10 PASS and Worker API total 0.

Not yet accepted:
- 30/30 focused stability;
- 10/10 full browser stability;
- real Liberty/OpenFreeMap end-to-end browser path;
- real Edge desktop/mobile;
- reduced-motion browser proof;
- WebGL2-unavailable browser proof;
- live webglcontextlost browser proof.

## Other alternatives
Grokbot #58: AUD PARTIAL, design reference only.  
Sonnet #60: AUD PARTIAL, salvageable logic/UX ideas only.  
Codex Sol recovered chat lane: local/unbound discovery checkpoint only; no remote branch and no audited implementation.

## Scope discipline
InsForge, Floot, Convex, additional databases/backends, telemetry, alternative hosting, new GIS stacks, React/R3F rewrites and new 3D engines do not close the current evidence gap and remain outside ORDER-075.

## Next sequence
1. Persist this recovery.
2. Record continuity in #57 and #59.
3. Close GLM evidence gaps without feature expansion.
4. Terminally classify GLM.
5. Compare completed alternates.
6. Issue ONE convergence order to ARQ1.
7. Create canonical \`feat/order075-mapfirst-trackerview\` from exact \`dd7fc408...\`.
8. No merge/deploy until canonical RC is independently accepted.
