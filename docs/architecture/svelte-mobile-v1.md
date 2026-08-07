# VOY Svelte Mobile V1

## Status

This document describes the canonical runtime introduced by `VOY-PR31-SVELTE-MOBILE-FIRST-WORKERS-FIRST-01`.

## Runtime

- TypeScript strict.
- Svelte 5 with Vite.
- Cloudflare Vite plugin and Workers Assets.
- TypeScript Worker entry at `worker/index.ts`.
- Single-page PWA; no SSR and no SvelteKit.
- MapLibre is a lazy chunk and is not required for the decision core.
- Voice and Auth are optional bounded modules. The app remains complete without them.

## Boundaries

The Svelte UI owns presentation, user intent and local ephemeral state. It never calls Nominatim or OSRM directly. The Worker owns external routing/geocoding boundaries, schema validation, timeout and safe fallback. Deterministic code owns distance, duration, fare calculations and ranking.

The TypeScript Worker delegates only the already validated geocoding, Voice, Auth and analytics API contracts to bounded legacy modules. The legacy monolithic HTML runtime is removed and no legacy browser bundle is served.

## Feature modules

- `features/destination`: local-first destination resolution and typed results.
- `features/trip`: route acquisition and honest fallback.
- `features/providers`: typed availability, regulated estimate or `APP_ONLY` price states, and single-use external confirmations.
- `features/collective`: fail-closed disabled state until current route/stop/direction data exists.
- `features/voice`: lazy optional text-first assistant.
- `features/auth`: optional safe-disabled session status.

## Security and privacy

- Root HTML receives an enforced CSP and no session cookie.
- Exact coordinates are not persisted by the Svelte app.
- API and HTML responses are `no-store`; hashed static assets are immutable.
- Auth-disabled status creates no cookie.
- Voice audio and transcripts are not persisted.
