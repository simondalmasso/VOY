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
ACTIVE_ORDER_COMMENT=5190243600
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
PRIMARY_VIEWPORTS=360;390;412;430
```

MapLibre, Voice and Auth are lazy optional capabilities. The destination, comparison and truthful unavailable states work without map tiles, account, microphone or AI.

## Product truth boundaries

- The browser never calls Nominatim or OSRM directly.
- Bus line, stop, direction, frequency, wait and route recommendations are disabled until current authoritative operational data exists.
- Historical bus and bike arrays are archived under `docs/data/historical/` and are absent from runtime data.
- A straight-line distance is labelled as a reference and is never drawn as a street, walking or cycling route.
- Taxi and remis values are regulated estimates with source and verification date; they are informational and do not reserve a vehicle.
- Uber and DiDi remain `APP_ONLY`; only verified provider actions are actionable and require explicit, expiring, single-use confirmation.
- AI does not calculate routes, distances, durations, fares, availability or rankings.

## Validation control plane

Permanent automatic workflows:

```text
BRANCH_EXACT_HEAD=.github/workflows/svelte-validation.yml
PULL_REQUEST=.github/workflows/pr-validation.yml
MAIN_READ_ONLY_VALIDATION=.github/workflows/deploy.yml
RELEASE_POLICY=.github/workflows/release-policy-check.yml
```

All use Bun `1.3.14`, Wrangler `4.112.0`, `bun install --frozen-lockfile`, strict typecheck, lint, deterministic tests, Vite production build, bundle budgets, generated Wrangler dry-run and clean-profile browser gates. Mission-only lockfile and source-bundle workflows are removed before candidate creation.

## Public production baseline

Fresh read-only evidence from GitHub Actions rerun on 2026-08-05:

```text
RUN=30630528598
JOB=92271344787
PUBLIC_HEALTH=PASS
APPLICATION_VERSION=V7.8.0
BUILD_HASH=1374f09
LOCAL_BROWSER=4/4_PASS
PRODUCTION_BROWSER=4/4_PASS
ARTIFACT_ID=8926005965
ARTIFACT_SHA256=6f8fea3d71b17600213dc38dca15354c04e69a4a5570fbb5b75ba6e17b07f26f
PRODUCTION_TRAFFIC_CHANGED=NO
```

This is the stable pre-Svelte production observation, not evidence of the final Svelte candidate.

## Historical Cloudflare evidence

The following values are historical until the final candidate workflow re-queries Cloudflare immediately before mutation:

```text
HISTORICAL_STABLE_VERSION=b4f1833a-f2a1-4a44-b351-13ae48972c20
HISTORICAL_STABLE_TRAFFIC=100%
SUPERSEDED_CANDIDATE_VERSION=d771226a-760b-45a2-8ae8-1fe66d8eb896
SUPERSEDED_CANDIDATE_TRAFFIC=0%
HISTORICAL_DEPLOYMENT=28624592-46c4-4651-905a-b30e32289497
```

The superseded candidate is the old monolithic runtime and must never be promoted.

## Final candidate rule

The final release workflow is added only after all source, tests, documentation and permanent workflows are complete. It must:

1. verify the exact remote PR head and frozen lockfile;
2. reconstruct current Cloudflare versions, deployment, traffic, bindings and rollback;
3. upload exactly one Svelte Worker version from that committed head;
4. preserve the verified stable version at `100%` and place the new candidate at `0%`;
5. validate Svelte root identity, hashed chunks, static manifest, service worker, city data, APIs, security/privacy, Voice/Auth boundaries, viewports and exact-version logs;
6. require 20 consecutive rounds and at least 120 seconds;
7. persist immutable evidence, manifest and digest;
8. make no source commit after candidate creation.

PR #31 stays Draft, unmerged and without productive traffic until independent AUD PASS and a separate exact authorization from Simón.


## AUD voice provenance correction — 2026-08-05

- AUD block: GitHub comment `5191416935`.
- Client-authored `mobility_snapshot` is rejected by the public Voice session contract.
- Voice mode comparison is reconstructed only from verified server territorial provider metadata.
- Private-app prices, durations and distances are never accepted or ranked from the client.
- Collective/bus recommendations remain disabled and bus is excluded from Voice comparison.
- A fresh exact-head candidate at 0% is required; candidate `cec69db3-3e4d-426e-b070-7a99d2f52d80` is superseded and must never be promoted.
- Productive traffic and merge remain unauthorized.
