# Santa Fe destination provenance — 2026-08-05

## Runtime rule

`public/cities/santa-fe/transport.json` contains only destinations that are operationally usable by VOY. Every item must have an authoritative issuer, public source, verification date, precision, correct address, validated coordinates and coordinate derivation evidence. Records without that complete contract are rejected by the UI and Voice runtime and cannot trigger route, fare, ranking or provider actions.

The previous mixed landmark asset is retained through Git history at blob `35cadbb7cecffa9274c5f44311ce5d1c689550ba`; it is historical evidence only and is not an operational data source.

## Operational destinations

| Canonical ID | Destination | Address | Coordinates | Address source | Coordinate source and method | Verification |
|---|---|---|---|---|---|---|
| `santafe:landmark:terminal-omnibus` | Terminal de Ómnibus | Belgrano 2910 | `-31.643533, -60.700503` | Municipalidad de Santa Fe, “Estación Terminal de Ómnibus de Santa Fe” | BCRA public geodata for Belgrano 2910, cross-checked against the municipal address | 2026-08-05 |
| `santafe:landmark:estacion-belgrano` | Estación Belgrano | Bv. Gálvez 1150 | `-31.638849, -60.686789` | Municipalidad de Santa Fe, official location page | Municipalidad de Santa Fe Agenda location coordinates, cross-checked against the institutional address | 2026-08-05 |
| `santafe:landmark:puente-colgante` | Puente Colgante “Ing. Marcial Candioti” | Costanera Oeste–Este, Laguna Setúbal | `-31.639764, -60.682736` | Municipalidad de Santa Fe tourism identity page | Decimal conversion of official coordinates in National Decree 1669/2014: 31°38′23.15″ S, 60°40′57.85″ W | 2026-08-05 |

## Source register

### Terminal de Ómnibus

- Issuer: Municipalidad de Santa Fe.
- Address source: `https://santafeciudad.gov.ar/terminal-de-colectivos/`.
- Coordinate source: `https://www.bcra.gob.ar/entidades-financieras-filiales-y-cajeros-filtros/?Provincia=SANTA+FE&Tipo=4&Tit=2&bco=AAA10`.
- Source status: public institutional information; no explicit reuse licence was observed.
- Known rejected legacy value: `Belgrano y Freyre`.

### Estación Belgrano

- Issuer: Municipalidad de Santa Fe.
- Address source: `https://santafeciudad.gov.ar/ubicaciones/estacion-belgrano/`.
- Coordinate source: `https://agenda.santafeciudad.gov.ar/ubicaciones/estacion-belgrano/`.
- Source status: public institutional information; no explicit reuse licence was observed.
- Known rejected legacy value: `Gral. López y Javier de la Rosa`.

### Puente Colgante

- Issuers: Poder Ejecutivo Nacional and Municipalidad de Santa Fe.
- Identity source: `https://turismo.santafeciudad.gov.ar/puente-colgante/`.
- Coordinate source: `https://www.argentina.gob.ar/normativa/nacional/decreto-1669-2014-235865/texto`.
- Source status: public national regulation and public municipal tourism information.
- Known rejected legacy value: `Bv. Gálvez 1150`, which is an institutional address for Estación Belgrano/Turismo and not the bridge location.

## Non-operational references

All other former curated landmarks were removed from the runtime asset because they lacked complete per-item authoritative provenance or contained inaccurate address/coordinate claims. A Worker geocode result without this provenance may be displayed only as an explicitly unverified, disabled reference; it cannot become a selected destination or produce route, fare, comparison, map or external-provider actions.

Bus routes, bus stops and bike stations remain empty and unavailable until a current authoritative operational dataset is incorporated and independently audited.
