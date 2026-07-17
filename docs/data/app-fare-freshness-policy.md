# App Fare Freshness Policy

Effective date: 2026-07-17  
Applies to: ride-hailing price models consumed by `MobilityEngine.calcAppPrice`

## Principle

VOY must not rank, recommend, compare or persist a ride-hailing amount when its underlying model is explicitly stale or has an unknown lifecycle status. Provider availability and provider pricing are separate facts: an available provider may still require the user to open its app to obtain a current price.

## Status contract

A model with no `status` remains temporarily supported for backward-compatible fixtures and legacy city profiles. New city data must provide an explicit status.

Statuses allowed to produce a price:

- `current`
- `verified`
- `active`
- `estimated_current`

Every other explicit status produces `null`, including:

- `stale_estimate`
- `stale_reference`
- `expired`
- `disabled`
- `unknown`

## Runtime behavior

When a model produces `null`:

- the provider is excluded from price ranking;
- it cannot drive the Ahorro recommendation;
- no price confidence, surge range or trend datapoint is presented for that provider;
- the provider remains visible when its city availability is verified;
- the UI shows `Ver precio` and opens the provider through the existing confirmed deeplink flow;
- regulated taxi, remis and bus prices are unaffected.

## Data requirements

A future current ride-hailing model must include, at minimum:

- `status`;
- `source`;
- `verified_at`;
- `effective_from` when applicable;
- `expires_at` or a documented review cadence;
- currency and city scope;
- evidence that collection and use comply with provider terms.

Changing a status to a price-producing state requires source review, tests and a city-profile update. UI code must not override a stale status.

## Fallback

VOY remains useful without current ride-hailing prices. It can still show regulated transport estimates, walking/bicycle options, provider availability and confirmed external actions. The product must state the limitation rather than reconstruct a current app price from old coefficients.
