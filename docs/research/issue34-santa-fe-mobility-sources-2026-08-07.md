# Issue #34 — Santa Fe mobility source investigation

Verified on: 2026-08-07
Role: INV
Scope: Santa Fe Capital, Argentina

## HECHO

1. Municipalidad de Santa Fe publishes a current official `Colectivos` page at `https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/`. It states that Cuándo Pasa provides updated information about lines, routes, stops and diversions. The page does not expose a GTFS/GTFS-RT download, API contract or feed redistribution license.
2. Municipalidad de Santa Fe publishes current bus-diversion information at `https://santafeciudad.gov.ar/desvios/` and identifies individual urban lines. This is operational web information, not a demonstrated GTFS feed.
3. The municipal transparency portal exists under the Programa de Transparencia y Datos Abiertos and publishes official norms and other public information at `https://transparencia.santafeciudad.gov.ar/`.
4. Decreto DMM 00048/2026, dated 2026-05-15, is published by the municipal transparency portal and states that it establishes new urban passenger transport fares: `https://transparencia.santafeciudad.gov.ar/normativa/decreto-00048-2026/`. No numeric fare from that decree is introduced into VOY by this phase.
5. Fresh inspection of the MobilityData `mobility-database-catalogs` GTFS Schedule catalog tree found Argentina entries for Buenos Aires and Córdoba, but no `ar-santa...` schedule source. Fresh inspection/search likewise did not identify a Santa Fe Capital GTFS/GTFS-RT bus source. Catalog absence is discovery evidence, not proof that no feed exists elsewhere.
6. Mobility Database discovery material identifies a Santa Fe `MiBiciTuBici` GBFS source with autodiscovery URL `https://www.mibicitubici.gob.ar/opendata/gbfs.json` and catalog license metadata `CC-BY-4.0`. Under Issue #34 rules, catalog metadata is discovery evidence only and cannot itself activate a source.
7. MobilityData `gtfs-validator` release `v8.0.1` was published 2026-05-12. The canonical CLI asset is `gtfs-validator-8.0.1-cli.jar`, GitHub release digest `sha256:19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2`. The project documents CLI validation as `java -jar ... -i <feed.zip> -o <output>`.

## INFERENCIA

- Santa Fe clearly has current operational bus data feeding Cuándo Pasa, but no public, authoritative, reusable GTFS/GTFS-RT contract and compatible feed license was demonstrated in this investigation.
- Therefore the safe implementation path is to build the deterministic trust/validation/discovery/fare foundation while keeping bus activation OFF.
- The current fare decree is suitable as provenance for a future regulated-fare record only after the exact numeric fare and applicable category are extracted and verified from the official document. This phase deliberately does not guess those values.

## NO_VERIFICADO

- A public municipal GTFS Schedule feed for Santa Fe Capital.
- A public municipal GTFS-Realtime feed for Santa Fe Capital.
- Redistribution/usage rights for any private or undocumented endpoint used by Cuándo Pasa.
- Compatibility between any undocumented realtime source and a particular static schedule feed.
- Any current Santa Fe bus fare amount not explicitly extracted from the official decree.

## Operational decision

```text
SANTA_FE_GTFS_ACCEPTED=NO
SANTA_FE_GTFS_RT_ACCEPTED=NO
BUS_ACTIVATION=OFF
CATALOG_DISCOVERY_IS_OPERATIONAL_AUTHORITY=NO
UNDOCUMENTED_ENDPOINT_REVERSE_ENGINEERING=NO
AI_SYNTHETIC_TRANSIT_DATA=NO
NEXT=LAB_TRUST_SCHEMA_VALIDATOR_DISCOVERY_FARE_CONTRACTS
```
