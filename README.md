# VOY

VOY is a map-first mobility surface for Argentina built around one rule: the interface must never imply more certainty than the sources support.

**Live demo:** https://voy-app.simondalmasso44.workers.dev/

## Product contract

VOY preserves five operating principles:

- **MAP_FIRST** — the map is the primary surface.
- **TRUTH_FIRST** — provenance, freshness and temporal state are visible.
- **LOW_COST** — interaction stays primarily client-side and bounded.
- **FAIL_CLOSED** — missing or stale evidence degrades honestly.
- **UNKNOWN != UNAVAILABLE** — absence of evidence is not evidence of absence.

Transport observations remain semantically separate: `realtime`, `predicted`, `scheduled`, and `unknown`.

VOY does not fabricate movement, ETA, coverage, availability or price to make the product look more complete.

## Current product

The current release candidate is the ORDER-076 MAP-FIRST / TrackerView line.

- dominant 2D map with MapLibre/OpenFreeMap and raster fallback;
- truthful TrackerView selection, focus, follow/suspend/resume and bounded session trail;
- explicit source/freshness state and a user-facing “Qué sabemos” explanation;
- optional, lazy Three.js 0.186 3D view;
- zero 3D transfer on the baseline 2D path;
- 3D remains contextual to the selected service/route and falls back to 2D on WebGL failure;
- no fabricated Santa Fe realtime when an authorized public source is not available.

Production identity is exposed at `/api/health`.

## Architecture

```text
browser
  ├─ map substrate (MapLibre/OpenFreeMap → raster fallback)
  ├─ TrackerView temporal presentation
  ├─ local session trail / follow / scrub
  └─ lazy 3D (Three.js, optional)
        │
        ▼
Cloudflare Worker
  ├─ deterministic mobility/search/routing APIs
  ├─ source/provenance contracts
  └─ bounded upstream calls
```

The browser does not use 3D as a source of truth. 3D is a presentation layer only.

## Data truth and coverage

Coverage is source-dependent and intentionally uneven. A city can have scheduled or static facts without realtime vehicle positions.

Every new mobility source should document authority, public source URL, license/reuse status, freshness/update semantics, coverage and truthful failure behavior.

Private or undocumented endpoints, extracted app credentials, MITM-derived feeds and reverse-engineered closed APIs are not acceptable production sources.

The frozen OpenStreetMap-derived topology used by the 3D view retains its upstream ODbL obligations. Third-party data and dependencies remain under their own licenses; the repository MIT license applies to VOY-authored software, not third-party datasets or assets.

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm test
npm run build:linux
npx wrangler deploy --config wrangler.jsonc --dry-run
```

For a local Worker session:

```bash
npx wrangler dev --config wrangler.jsonc
```

The production deploy path is intentionally separate from normal contribution/testing workflows.

## Verification

The accepted runtime source before OSS packaging is:

```text
b858568848f6bf5abd6853ee13c77f2e65c63735
```

Terminal evidence includes 274/274 unit tests, Chrome PASS, real Microsoft Edge 10x PASS, follow/drag 30/30 PASS, reduced-motion PASS, WebGL fallback/context-loss PASS, OpenFreeMap diagnostic PASS, exact production identity reconciliation PASS and production browser smoke PASS.

See `docs/audit/ORDER076_TERMINAL_EVIDENCE.md`.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Changes affecting mobility truth, source provenance, map/TrackerView behavior, 2D/3D boundaries or request budgets require explicit regression evidence.

## License

VOY-authored software is licensed under the [MIT License](LICENSE).

Third-party dependencies, map data, styles and datasets retain their own licenses and attribution requirements.
