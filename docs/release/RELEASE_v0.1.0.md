# VOY v0.1.0 release

STATUS=RELEASE_VERIFIED_FINAL_DOC_SEAL_IN_PROGRESS
TAG=v0.1.0

## Proven canonical release before final documentation seal

```text
MAIN_SHA=3f6f1e7581b464701bb92ae583c7439f49e2e85c
BUILD_ID=be57e6d76ef323ff87368c64
RELEASE_ID=order057-3f6f1e7581b4-be57e6d7
```

Verification completed:

- canonical CI PASS;
- exact-main tests/build/audit/dry-run PASS;
- Chrome PASS;
- Edge 10x PASS;
- reduced-motion/WebGL/context-loss/OpenFreeMap PASS;
- same artifact deployed and production identity reconciled;
- production browser smoke PASS;
- v0.1.0 tag/release verified;
- public demo matched release source/build.

The final READY documentation seal is source-only metadata. Because build identity includes the source SHA, the seal is followed by one final exact-head rebuild/deploy and v0.1.0 retarget before terminal closure.

## Release summary

VOY v0.1.0 establishes the public MAP_FIRST / TRUTH_FIRST mobility baseline: truthful temporal states, TrackerView follow/session trail, explicit provenance/freshness, optional lazy 3D with 2D fallback, bounded network behavior and no fabricated Santa Fe realtime.

Realtime coverage remains dependent on public/reuse-authorized sources.
