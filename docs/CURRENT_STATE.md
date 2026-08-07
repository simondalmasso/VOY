# VOY — Current canonical state

Last reconstructed: 2026-08-05

## Authority and active order

```text
CANONICAL_STATE=GITHUB_REMOTE
PRIMARY_STATE_FILE=docs/CURRENT_STATE.md
CONTROL_ISSUE=30
CANONICAL_PR=31
CANONICAL_BRANCH=feat/voy-complete-product-master-01
BASE_MAIN=d31f7497f963ddd761ed3392a634f8017f85ad13
ACTIVE_AUD_BLOCK=5194944748
ORDER_ID=VOY-COMPLETE-END-TO-END-MASTER-02
```

The remote branch and PR head are authoritative. Runtime identifiers are current only when re-queried from Cloudflare or production and retained as evidence. Chat, local workspaces, ZIP files and old documents are secondary.

## Canonical architecture

```text
UI=SVELTE_5
LANGUAGE=TYPESCRIPT_STRICT
BUILD=VITE
RUNTIME=CLOUDFLARE_WORKER_TYPESCRIPT_AND_ASSETS
APP=SPA_PWA
SSR=NO
SVELTEKIT=NO
TAILWIND=NO
MONOLITHIC_HTML_RUNTIME=INACTIVE
PUBLIC_ASSET_POLICY=config/production-assets.json
PRIMARY_VIEWPORTS=360;390;412;430
```

MapLibre, Voice and Auth are lazy optional capabilities. Destination selection, comparison and truthful unavailable states work without map tiles, account, microphone or AI.

## Public asset truth boundary

- Every source file under `public/` is explicitly classified in `config/production-assets.json` and documented in `docs/data/public-asset-inventory-2026-08-05.md`.
- Only ten current territorial JSON files, the PWA manifest/service worker, product mark and exact icon set may be copied from `public/`.
- Only the canonical generated `index.html` and Vite-hashed JavaScript/CSS may be added by the build.
- Source and built output fail CI on missing, duplicate, retired or unclassified files and on forbidden legacy product markers.
- `scripts/build-static-manifest.mjs` certifies classifications instead of accepting every non-dot file.
- Retired legacy routes return `410` before `ASSETS`, so an old link cannot fall through to legacy bytes or the canonical SPA.
- Historical product bytes remain in Git history only and never under `public/`, `dist/client` or another Worker-served namespace.

## Product truth boundaries

- The browser never calls Nominatim or OSRM directly.
- A destination is operational only when its runtime record includes complete authoritative per-item provenance, correct address, validated coordinates, precision and verification date.
- Current operational Santa Fe destinations are limited to Terminal de Ómnibus, Estación Belgrano and Puente Colgante. Their source register is `docs/data/santa-fe-destination-provenance-2026-08-05.md`.
- Worker geocode results without that provenance remain visibly unverified and disabled; they cannot trigger route, fare, comparison, map or external-provider actions.
- Voice uses the same fail-closed destination provenance boundary and ignores unverified landmarks, stops and bike references.
- Bus line, stop, direction, frequency, wait and route recommendations are disabled until current authoritative operational data exists.
- Historical mixed destination data is preserved only through Git history; the old runtime blob is `35cadbb7cecffa9274c5f44311ce5d1c689550ba`.
- Historical bus and bike arrays are archived under `docs/data/historical/` and are absent from runtime data.
- A straight-line distance is labelled as a reference and is never drawn as a street, walking or cycling route.
- Taxi and remis values are regulated estimates with source and verification date; they are informational and do not reserve a vehicle.
- Uber and DiDi remain `APP_ONLY`; only verified provider actions are actionable and require explicit, expiring, single-use confirmation.
- AI does not calculate routes, distances, durations, fares, availability or rankings.

## Destination provenance correction — 2026-08-05

AUD block `5193183161` blocked a prior candidate because the runtime mixed unverifiable landmarks with incorrect addresses. The correction:

- replaces the runtime asset with three authoritative records only;
- corrects Terminal de Ómnibus to `Belgrano 2910`;
- corrects Estación Belgrano to `Bv. Gálvez 1150`;
- assigns Puente Colgante the official decree coordinates and a non-conflicting Costanera/Laguna Setúbal descriptor;
- rejects incomplete local records mechanically;
- displays weaker Worker references as disabled and explicitly unverified even when an address is present;
- blocks route, fare, map and provider actions unless the destination is authoritative;
- exposes issuer, address and verification date in the final decision surface;
- makes Voice destination selection use the same strict provenance contract;
- adds deterministic data, Voice and browser regression cases using the real runtime asset and forged legacy negatives.

## Legacy public surface correction — 2026-08-05

AUD block `5194944748` accepted the reconciled test inventory but blocked candidate `05b66121-4218-4dfa-8b44-f59bad2aa0e4` because obsolete VOY product and diagnostic files were still public. The correction removes from the runtime source and build:

- `public/VOYv2.html`;
- `public/movilidad.html`;
- `public/city_default.json` and `public/city_santafe.json`;
- root `public/fares.json`;
- `public/chaos-tests.html`;
- the complete `public/navigator/` runtime.

The Worker retires those routes and the former `VOY-Lite.html` route with an exact safe `410` response before `ASSETS`. Tests prove no retired bytes, stale bus/provider claims or alternate monolithic application can ship. The blocked candidate must never be promoted; a fresh exact-head candidate at `0%` is required after integral CI.

## Validation control plane

Permanent automatic workflows:

```text
BRANCH_EXACT_HEAD=.github/workflows/svelte-validation.yml
PULL_REQUEST=.github/workflows/pr-validation.yml
MAIN_READ_ONLY_VALIDATION=.github/workflows/deploy.yml
RELEASE_POLICY=.github/workflows/release-policy-check.yml
FINAL_ZERO_TRAFFIC_CANDIDATE=.github/workflows/master-final-candidate.yml
```

All use Bun `1.3.14`, Wrangler `4.112.0`, `bun install --frozen-lockfile`, strict typecheck, lint, deterministic tests, source/build asset policy, Vite production build, bundle budgets, generated Wrangler dry-run and clean-profile browser gates.

## Public production baseline

The stable production version remains:

```text
APPLICATION_VERSION=V7.8.0
BUILD_HASH=1374f09
STABLE_VERSION_ID=b4f1833a-f2a1-4a44-b351-13ae48972c20
STABLE_TRAFFIC=100%
PRODUCTION_TRAFFIC_CHANGED=NO
```

This is the stable pre-Svelte production baseline. No productive promotion is authorized.

## Final candidate rule

The final release workflow runs only after source, tests and documentation are complete. It must:

1. verify the exact remote PR head and frozen lockfile;
2. reconstruct current Cloudflare versions, deployment, traffic, bindings and rollback;
3. upload exactly one Svelte Worker version from that committed head;
4. preserve the verified stable version at `100%` and place the new candidate at `0%`;
5. validate Svelte root identity, authoritative city data, classified static manifest, service worker, APIs, security/privacy, Voice/Auth boundaries, viewports and exact-version logs;
6. prove every retired public path returns the exact safe `410` response on the candidate;
7. require 20 consecutive rounds and at least 120 seconds;
8. persist immutable evidence, manifest and digest;
9. make no source commit after candidate creation.

PR #31 stays Draft, unmerged and without productive traffic until independent AUD PASS and a separate exact authorization from Simón.
