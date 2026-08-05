# Distance and travel-time contract V1

VOY does not ask an AI model to calculate distance, route, duration, fare, availability or ranking.

```text
ORIGIN=STRICT_FINITE_COORDINATES_OR_DECLARED_PLACE
DESTINATION=CANONICAL_RESOLVED_PLACE_OR_STRICT_FINITE_COORDINATES
CANONICAL_DISTANCE=DETERMINISTIC_ENGINE_OR_DECLARED_ROUTE_PROVIDER_RESULT
TRAVEL_TIME=DETERMINISTIC_MODE_FORMULA_OR_DECLARED_ROUTE_PROVIDER_RESULT
UNKNOWN_INPUT=UNKNOWN_OUTPUT
RANKING=ONLY_COMPARABLE_CANONICAL_VALUES
```

Rules:

1. Coordinates must be finite numeric values inside geographic bounds. String coercion and empty identities are rejected.
2. Route-provider output must identify its provider and request contract; language-model estimates are forbidden.
3. Walking, cycling and motorized estimates use deterministic, test-covered mode logic only when the required canonical distance exists.
4. Missing distance or time renders an honest unavailable state and cannot enter ranking.
5. Regulated taxi/remis fares use completed 130 m fichas, the correct service registry and no second surge/night multiplier.
6. Private-app prices with `APP_ONLY`, stale or reference status never enter amount-based ranking.
7. UI consumes canonical engine output and must not reimplement fare or ranking formulas.
