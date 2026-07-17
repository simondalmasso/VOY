# VOY Product Principles

Status: normative product guidance  
Last reviewed: 2026-07-17  
Baseline: `bac0a56d2840707beae6161a4c21e4eee2c7820a`

## Product promise

> Decime adónde vas y te digo cuánto cuesta, cuánto tarda y qué opción te conviene.

VOY is a neutral mobility decision layer. It is not a generic map, a ride-hailing marketplace or a general-purpose chatbot. Its job is to turn a destination and user constraints into an understandable, traceable and actionable comparison.

## 1. First value before account creation

The destination input, origin state and primary comparison must be available immediately. Login, identity verification, payment details and long onboarding cannot block the core flow.

A user who denies GPS must still be able to select a city and origin manually. A user outside a verified city receives honest national-basic coverage rather than fabricated local data.

## 2. The model interprets; deterministic systems calculate

VOY Copilot may normalize language, classify intent and extract preferences. It must not invent prices, distances, ETAs, routes, availability, service status, accessibility, weather or safety.

Authoritative numeric outputs may only come from:

- `mobilityEngine` and verified routing responses;
- `pricingEngine` using versioned city data;
- `destinationResolver` and explicit user selection;
- city profiles with source and freshness metadata;
- authorized official feeds or controlled fixtures.

The user confirms actions that leave VOY, such as opening a provider app. The tool registry uses a strict allowlist and typed arguments. AI-generated arbitrary URLs are forbidden.

## 3. Explicit ambiguity, never silent guessing

A destination may auto-resolve only when its identity and confidence satisfy the resolver contract. Ambiguous candidates remain a choice. A wide search never silently selects the first result.

Every recommendation distinguishes:

- known facts;
- estimates;
- unavailable data;
- stale data;
- city coverage limitations.

## 4. Price and time first, explanation second

The comparison hierarchy is:

1. estimated price or verified tariff;
2. estimated time;
3. confidence and freshness;
4. why the option is recommended;
5. trade-offs and action.

Explanations are short and evidence-backed. Correct: “El colectivo cuesta aproximadamente $3.200 menos, pero requiere caminar 7 minutos.” Incorrect: “El colectivo seguramente funciona bien y es más seguro.”

## 5. Neutrality is a product requirement

No provider receives an unexplained ranking advantage. Ranking factors are deterministic, inspectable and user-controllable. Commercial relationships, if introduced later, never masquerade as organic recommendations.

Provider availability and deeplinks are city-specific. A provider that is unverified or unavailable in a city is not presented as operational merely because the app exists nationally.

## 6. Territorial depth before geographic breadth

VOY expands by explicit coverage levels:

- `national_basic`: national geocoding and verified national providers; no invented local fares or stops;
- `partial`: territorial profile and some sourced local data with visible gaps;
- `verified`: current fares, providers, stops and sources covered by city tests;
- `connected`: authorized live feeds, booking or tracking.

Santa Fe is the first verified-city target. A second city is selected by actual data viability, not marketing timing.

## 7. Source, freshness and confidence are visible

A city datum that affects a recommendation carries, where applicable:

- `source` and source URL;
- `verified_at`;
- `effective_from`;
- `expires_at` or review interval;
- `status`;
- `confidence`;
- `coverage_level`.

Expired data degrades to “stale” or “unavailable”; it does not continue to be labelled current. A scheduled reminder is not a data-refresh mechanism.

## 8. Low-end Android is the baseline

The core PWA remains usable on low-memory Android devices and slow networks. Initial interaction cannot depend on WebGPU, a large model, a heavy framework runtime or large asset downloads.

AI is progressively enhanced:

1. rules and deterministic parsing;
2. optional small local classifier loaded on demand;
3. optional remote adapter behind a kill switch.

Disabling all AI providers leaves origin, destination, comparison, sharing and deeplinks functional.

## 9. Accessibility changes ranking, not just styling

VOY targets WCAG 2.2 AA. Accessibility includes keyboard navigation, visible focus, screen-reader semantics, scalable text, reduced motion, touch targets, non-colour status communication and a textual alternative to the map.

When data exists, accessibility preferences influence route ranking: less walking, step-free paths, known accessible stops or vehicles and explicit unknown states. Unknown accessibility cannot be presented as accessible.

## 10. Privacy by minimization

VOY does not need persistent exact location, full address queries, conversation transcripts or audio to provide its core value.

Do not persist:

- complete private address text;
- exact GPS history;
- raw IP as product analytics;
- conversations or prompts;
- audio;
- names or identity-linked home/work addresses.

Use event-level analytics, short retention, aggregation, opt-out and test/operator exclusion. Any session identifier requires a documented necessity, lifetime and deletion path.

## 11. Offline means useful degradation

Offline behavior is explicit. The PWA should retain the shell, city profile, recent comparisons, favorites and a textual fallback. It must not imply that live ETAs, current interruptions or remote routing are available offline.

Cached external tiles and assets require bounded storage and clear expiry behavior. Service-worker updates must not destroy unrelated origin caches.

## 12. Actions are safe and reversible

External actions require explicit user intent. Deeplinks use a provider allowlist, validated coordinates and safe fallbacks. Repeated action calls are throttled. VOY never constructs or opens an arbitrary URL supplied by a model or untrusted data source.

Saving a favorite, changing a preference or clearing history is understandable and locally reversible. Destructive operations require confirmation.

## 13. Evidence before release claims

A release is not complete because code merged. Required evidence includes:

- reviewed diff and clean scope;
- lint, tests and Wrangler dry-run;
- desktop and mobile browser smoke;
- zero `pageerror`;
- no prohibited real requests during tests;
- artifact ID and digest;
- live health/build verification;
- production browser validation;
- rollback state.

## 14. Free-tier independence

No paid service is mandatory for core operation. Before adopting a free tier, document limits, card requirements, automatic billing, regional availability, privacy impact, kill switch and fallback.

The product remains functional when every optional external AI service is disabled.

## 15. Small-team architecture

Prefer explicit modules, versioned JSON and deterministic contracts over platform proliferation. Do not migrate the product to React, Next.js, Flutter or a remote configuration platform solely for preference.

New abstractions must remove duplication, clarify ownership or enable verified city isolation. Architecture that increases operational burden without measurable user value is rejected.

## Decision rubric

A proposed feature should proceed only when it satisfies all five questions:

1. Does it reduce the time or uncertainty involved in choosing a trip?
2. Can its data be sourced, timestamped and explained?
3. Does it work without forcing identity or payment?
4. Is it usable on a low-end mobile device and with assistive technology?
5. Can a small team operate it within free or controlled costs?

If any answer is no, the feature is deferred or redesigned.
