# Collective recommendation gate

```text
BUS_LINE_RECOMMENDATION=DISABLED
BUS_OPERATIONAL_RUNTIME_DATA=ABSENT
```

VOY does not have a current authoritative and versioned contract proving line, route, direction, stop relationships, service frequency, live wait or transfers for Santa Fe. The Svelte runtime therefore makes no bus route request and exposes no line, stop, proximity, frequency, wait-time or route recommendation.

The previously bundled unsourced references were removed from `public/cities/santa-fe/transport.json` and retained only as historical evidence in `docs/data/historical/santa-fe-transport-reference-pre-v8.json`. Historical evidence is never loaded by the runtime.

Re-enablement requires dated primary provenance, declared territorial coverage, schema and geometry validation, update ownership and deterministic tests. The current SUBE fare/payment reference does not prove an operational route.
