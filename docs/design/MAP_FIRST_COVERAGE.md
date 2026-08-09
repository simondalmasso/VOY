# VOY Map-First — Coverage Ledger

Authority: Issue #36 amendment `5224435211`, independent AUD PASS `5228862173`.
Implementation base: `bf6c4fd36eafcdab78e7e0ce33f99696541f553c`.
Branch: `feat/map-first-interaction-01`.

## Interaction state coverage

| State | Primary surface | Map interaction | Back / Escape | Evidence |
|---|---|---|---|---|
| IDLE | map + compact planner + thin decision strip | enabled | normal navigation | `tests/interactionState.test.ts`, `browser-tests/map-first-interaction.spec.ts` |
| SEARCH_FOCUSED | destination command surface | enabled | closes search | browser interaction spec |
| SEARCH_RESULTS | destination results | enabled | closes results | browser interaction spec |
| DESTINATION_SELECTED | destination + origin progression | enabled | transient hierarchy | interaction unit contract |
| ORIGIN_REQUIRED | origin control/manual input | enabled | closes manual origin | browser interaction spec |
| ORIGIN_READY | mode selector | enabled | transient hierarchy | interaction unit contract |
| ROUTE_LOADING | map + localized status | enabled | transient hierarchy | App state contract |
| ROUTE_READY | route geometry + decision peek | enabled | transient hierarchy | map/sheet browser gates |
| DECISION_PEEK | progressive decision sheet | enabled | normal if no higher transient | browser interaction spec |
| DECISION_HALF | half decision sheet | enabled | half → peek | browser interaction spec |
| DECISION_EXPANDED | expanded decision sheet | enabled | expanded → half | browser interaction spec |
| EXTERNAL_CONFIRMATION | one-shot external confirmation | disabled while modal owns interaction | closes modal first | browser interaction spec + existing single-use confirmation regression |
| VOICE_ACTIVE | voice surface when capability enabled | disabled while voice owns interaction | closes voice | state contract + existing voice suite |
| OFFLINE | offline banner + usable core | enabled where map remains available | normal transient hierarchy | existing offline/PWA suite + state contract |
| ERROR_RECOVERABLE | localized recoverable error | enabled | normal transient hierarchy | existing error regression + state contract |

## Surface coverage

| Surface | Result | Notes / gate |
|---|---|---|
| APP_SHELL | REDESIGNED | map-first grid/overlay composition |
| BRAND_HEADER | REDESIGNED | compact mobile header; desktop hierarchy retained |
| DESTINATION_SEARCH | REDESIGNED | controlled focus/results state; keyboard-safe |
| DESTINATION_RESULTS | REDESIGNED | single primary transient layer; map remains usable |
| ORIGIN_CONTROL | REDESIGNED | explicit permission states; no auto-geolocation |
| MANUAL_ORIGIN | REDESIGNED | denial progressive disclosure; focus restoration |
| MODE_SELECTOR | REDESIGNED | compact rail; 44px targets; overflow cue preserved |
| STATUS_MESSAGES | REDESIGNED | localized; redundant IDLE/selected-destination status removed |
| MAP_VIEWPORT | REDESIGNED | operational canvas, not wallpaper; explicit interaction/padding contract |
| MAP_TRUTH / ATTRIBUTION | PRESERVED | truth copy and attribution remain visible |
| TRIP_DECISION_SHEET | REDESIGNED | peek / half / expanded snaps; internal scroll owner |
| PROVIDER_OPTIONS | PRESERVED + REHIERARCHIZED | truth/pricing logic unchanged; provider selection does not reset camera |
| EXTERNAL_CONFIRMATION | PRESERVED + COORDINATED | modal owns transient hierarchy; one-shot semantics unchanged |
| VOICE | PRESERVED + COORDINATED | lazy load unchanged; state hierarchy explicit |
| AUTH_IF_ENABLED | NOT_APPLICABLE_TO_THIS_AMENDMENT | no auth flow fabricated |
| OFFLINE | PRESERVED + COORDINATED | existing banner/PWA contract retained |
| LEGAL_VIEWS | PRESERVED | no legal copy/contract mutation |
| DARK_MODE | REDESIGNED / VERIFIED | before-after light/dark matrix |
| REDUCED_MOTION | VERIFIED | map-first transitions collapse to 0ms under preference |

## Mandatory amendment gates

- `STATE_TRANSITION_TESTS`: `tests/interactionState.test.ts`
- `BACK_ANDROID_BROWSER`: `browser-tests/map-first-interaction.spec.ts`
- `ESC_DESKTOP`: same browser interaction suite across desktop project
- `MOBILE_KEYBOARD_360x800`: browser interaction suite
- `MOBILE_KEYBOARD_390x844`: browser interaction suite
- `MAP_OCCLUSION_INITIAL_55_PERCENT`: direct geometry gate excluding opaque overlays
- `MAP_ROUTE_READY_PEEK_CONTEXT`: equivalent trip screenshots + route overlay readiness
- `MAP_HALF_CONTEXT`: sheet snap/camera interaction test
- `MAP_INTERACTION_WITH_OVERLAYS`: explicit `data-map-interaction` assertions
- `SHEET_CAMERA_JITTER`: camera fit count is unchanged during drag; recalculation only after stable snap
- `PROVIDER_CHANGE_CAMERA_RESET`: provider modal waits for stable half-snap camera and asserts no additional fit
- `LOCATION_PERMISSION_AUTO_REQUEST`: geolocation spy proves zero calls at load
- `LOCATION_DENIED_MANUAL_ORIGIN`: denial focuses manual input and keeps flow alive
- `PERF_BEFORE_AFTER`: `scripts/map-first-compare.mjs`
- `MAP_FIRST_TRUTH_TEST`: initial unobscured-map gate + mobile/desktop before-after visual matrix

## Performance contract

No animation framework, heavy UI framework, new map engine or new production dependency was added. State/camera coordination is TypeScript + Svelte + CSS using the existing MapLibre engine.

The immutable before-after workflow records:
- JS/CSS transfer;
- LCP;
- observed event duration as an INP proxy in the controlled run;
- CLS;
- long tasks;
- map usable time;
- map/sheet/planner geometry and overflow.

## Explicit polish passes

`POLISH_PASS_1=f7fdd3889c0700d13fd9fef20c3ee34090a2aa51`

Evidence-driven corrections:
- force decision sheet to an opaque, contrast-safe instrument over any basemap;
- remove duplicate selected-destination status;
- reduce mode-rail chrome while preserving reachability and target size.

`POLISH_PASS_2=b83d274f53d5e0323ae027db30d74c33c4ad5084`

Evidence-driven corrections:
- selected mode reads as selection rather than a primary CTA;
- destination remains readable at decision peek;
- narrow initial strip removes already-truncated subordinate copy.

## Invariants

`PRODUCT_LOGIC_CHANGED=NO` for canonical fare/routing/ranking/data semantics.

`TRUTH_BOUNDARIES_PRESERVED=YES`:
- BUS stays OFF/non-operational without accepted verified feed;
- APP_ONLY exposes no invented fare;
- no browser Nominatim/OSRM;
- no automatic geolocation request;
- no exact-location persistence introduced;
- external provider action remains explicit, expiring and single-use;
- VOY remains usable without login, voice or AI.

Production promotion and merge remain unauthorized. Final candidate target is Cloudflare `0%` traffic only.
