# VOY public production asset inventory — 2026-08-05

This document classifies every source file allowed under `public/`. The machine-readable authority is `config/production-assets.json`; `scripts/verify-production-assets.mjs` fails on any missing, duplicate, retired or unclassified source/build file.

## Current runtime data

| Public route | Classification | Runtime purpose |
|---|---|---|
| `/cities/_default/fares.json` | current runtime data | fail-closed default regulated-fare contract |
| `/cities/_default/feature_flags.json` | current runtime data | default capability flags |
| `/cities/_default/profile.json` | current runtime data | default territorial profile |
| `/cities/_default/providers.json` | current runtime data | default provider truth boundary |
| `/cities/_default/transport.json` | current runtime data | default empty transport contract |
| `/cities/santa-fe/fares.json` | current runtime data | sourced Santa Fe regulated fares and APP_ONLY private apps |
| `/cities/santa-fe/feature_flags.json` | current runtime data | Santa Fe capability flags |
| `/cities/santa-fe/profile.json` | current runtime data | dated Santa Fe coverage declaration |
| `/cities/santa-fe/providers.json` | current runtime data | verified provider metadata without invented private prices |
| `/cities/santa-fe/transport.json` | current runtime data | three authoritative destinations; bus and bike remain unavailable |

## Required static assets

| Public route | Classification | Runtime purpose |
|---|---|---|
| `/logo.svg` | required static asset | product mark |
| `/manifest.json` | required static asset | PWA manifest |
| `/robots.txt` | required static asset | crawler policy |
| `/sw.js` | required static asset | canonical Svelte PWA service worker |
| `/icons/app-icon.svg` | required static asset | vector app icon |
| `/icons/app-icon-maskable.svg` | required static asset | maskable vector icon |
| `/icons/apple-touch-1024.png` | required static asset | Apple touch icon |
| `/icons/apple-touch-120.png` | required static asset | Apple touch icon |
| `/icons/apple-touch-152.png` | required static asset | Apple touch icon |
| `/icons/apple-touch-167.png` | required static asset | Apple touch icon |
| `/icons/apple-touch-180.png` | required static asset | Apple touch icon |
| `/icons/icon-48.png` | required static asset | PWA icon |
| `/icons/icon-72.png` | required static asset | PWA icon |
| `/icons/icon-96.png` | required static asset | PWA icon |
| `/icons/icon-144.png` | required static asset | PWA icon |
| `/icons/icon-192.png` | required static asset | PWA icon |
| `/icons/icon-512.png` | required static asset | PWA icon |
| `/icons/maskable-192.png` | required static asset | maskable PWA icon |
| `/icons/maskable-512.png` | required static asset | maskable PWA icon |

## Build-generated assets and metadata

The routable build may add only the canonical `index.html` and Vite-hashed JavaScript/CSS under `/assets/`. Cloudflare's Vite integration also emits `.assetsignore` as non-routable upload-control metadata; it contains no product, destination, fare, provider or diagnostic payload and is excluded from the static runtime manifest. `scripts/verify-production-assets.mjs` nevertheless classifies and checks it, while `scripts/build-static-manifest.mjs` rejects every unclassified routable file.

## Retired public surfaces

The following routes are absent from `public/` and the routable `dist/client` manifest, and the Worker returns `410` before consulting `ASSETS`:

- `/VOY-Lite.html`
- `/VOYv2.html`
- `/movilidad.html`
- `/city_default.json`
- `/city_santafe.json`
- `/fares.json`
- `/chaos-tests.html`
- `/navigator/` and every descendant

Historical bytes remain recoverable through Git history. They are not copied into a runtime, evidence subdirectory under `public/`, or any Worker-served namespace.

## Enforcement

- Source allowlist: `node scripts/verify-production-assets.mjs --source-only`
- Built bundle allowlist: `node scripts/verify-production-assets.mjs --build-only`
- Manifest classification: `scripts/build-static-manifest.mjs`
- Unit/HTTP boundary: `tests/architecture.test.ts` and `tests/publicAssetBoundary.test.ts`
- Exact-candidate negative probe: `scripts/verify-retired-candidate-assets.mjs`
