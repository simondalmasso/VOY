# ORDER-077 Origin Resolution Reliability Plan

**Status:** implementation and unit verification complete; browser gate and PR/production promotion pending.

**Goal:** make manual origin entry deterministic and truthful without weakening GeoRef authority or silently choosing a nearby street with a similar name.

**Scope:** existing Worker and browser client only. No new runtime dependencies, no third-party outreach, no unauthorized real-time transit feed, and no simulated coordinates.

## Findings

- The UI could send a comma-qualified address as one GeoRef street query; GeoRef then returned errors or unusable results.
- GeoRef v2.0 may return valid address records with null coordinates. That is a valid-but-unrouteable result, not an invalid JSON schema.
- `San Martín 2954` can match both `SAN MARTIN` and `ZORRILLA DE SAN MARTIN`; substring ranking is unsafe for an origin.
- Live checks on 2026-10-16: `San Martín 2954, Santa Fe` and `Bv. Gálvez 1150, Santa Fe, Santa Fe` returned exact coordinates from GeoRef. `Av. 7 Jefes 5100` returned no coordinates; VOY must not manufacture a point for it.

## Implementation

- [x] Parse `street + locality` and `street + locality + province` address forms server-side, including an optional `Argentina` suffix.
- [x] Normalize avenue/boulevard vocabulary before exact street-and-number comparison.
- [x] Select only an exact address match inside the requested locality/province; do not auto-select `ZORRILLA DE SAN MARTIN` for `SAN MARTIN`.
- [x] Distinguish GeoRef's valid-but-unlocated address records from an invalid upstream schema.
- [x] Keep ambiguous searches contextual; if locality is absent, ask for locality instead of claiming the address itself is unavailable.
- [x] Show an explicit UI message when an address is recognized but its coordinates cannot be verified.
- [x] Strip a trailing country qualifier before the client separates address, locality, and province.
- [x] Add regression tests for two-/three-part input, exact street matching, no-coordinate results, missing locality, and schema failures.

## Verification evidence

- [x] Focused origin tests: 8 passed.
- [x] Full suite: 320 passed, 0 failed.
- [x] Production dependency audit: 0 vulnerabilities reported.
- [x] Release build completed.
- [x] Wrangler deployment dry-run completed.
- [x] Live GeoRef checks for the listed addresses.
- [x] Chrome end-to-end against the built local Worker at 390x844 and 1440x900: exact origin resolved, four route options shown, missing coordinates remain unselected, missing locality asks for context, and country suffix parses correctly (2/2 viewports; zero page errors). Local Wrangler required a one-day compatibility-date override because its bundled runtime lags the project date; target-config deploy dry-run passed.
- [ ] PR CI and exact-head review.
- [ ] Production deployment and post-deploy verification only after all gates pass.

## Known limitation / follow-up

`Av. 7 Jefes 5100` currently has no usable GeoRef coordinates. The live Photon query also returned street segments, not an exact house-number point. VOY intentionally does not convert those street centroids into a precise origin. A separate follow-up may add an explicit map-pin origin flow or a strictly validated address-provider fallback, with clear source disclosure and exact-house-number checks.
