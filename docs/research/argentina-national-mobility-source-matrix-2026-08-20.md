# Argentina national mobility source matrix — 2026-08-20

Status: research/discovery inventory for Issue #43. This file does **not** activate local mobility coverage.

Rules:

- `SOURCE_FOUND != OPERATIONAL_USE`.
- GeoRef establishes territorial identity, not provider/fare/transit availability.
- Exact operational datasets require source URL, license, freshness and component-level validation before activation.
- Santa Fe city is the first validated local overlay; the province of Santa Fe does not inherit that coverage.
- Until those gates pass, `operational_use=DISCOVERY_ONLY` or `NO`.

| GeoRef id | ISO | Jurisdiction | Current evidence checkpoint | Mobility truth | Operational use |
|---|---|---|---|---|---|
| 02 | AR-C | Ciudad Autónoma de Buenos Aires | Official Buenos Aires Data mobility/transport catalog; GTFS-tagged material discovered | Exact feed freshness/license still requires revalidation | DISCOVERY_ONLY |
| 06 | AR-B | Buenos Aires | Provincial open-data Mobility & Transport catalog | No province-wide urban coverage claim | DISCOVERY_ONLY |
| 10 | AR-K | Catamarca | Provincial transport plus SFVC platform regulation/registry | Brand availability/prices unverified | DISCOVERY_ONLY |
| 14 | AR-X | Córdoba | Capital urban transport datasets/GTFS, provincial interurban data, municipal fare source | Strong discovery; published feed freshness still gated | DISCOVERY_ONLY |
| 18 | AR-W | Corrientes | Municipal routes/stops dataset | License/freshness gate pending | DISCOVERY_ONLY |
| 22 | AR-H | Chaco | Provincial open-data portal plus current SUBE/rail evidence | Bus feed unverified | DISCOVERY_ONLY |
| 26 | AR-U | Chubut | Provincial transport/road-state API evidence | Urban transit feed unverified | DISCOVERY_ONLY |
| 30 | AR-E | Entre Ríos | Provincial open-data portal | Transport feed unverified | DISCOVERY_ONLY |
| 34 | AR-P | Formosa | IDEF official geoportal/services | Territorial evidence only; transport unverified | DISCOVERY_ONLY |
| 38 | AR-Y | Jujuy | Current transport regulatory modernization | Feed publication unverified | DISCOVERY_ONLY |
| 42 | AR-L | La Pampa | Provincial public-transport information/authority | Reusable feed unverified | DISCOVERY_ONLY |
| 46 | AR-F | La Rioja | Official Rioja Bus/public passenger transport information | Raw feed/license unverified | DISCOVERY_ONLY |
| 50 | AR-M | Mendoza | Provincial open routes data plus current SUBE expansion evidence | Dataset freshness insufficient for current operational claim | DISCOVERY_ONLY |
| 54 | AR-N | Misiones | Current official Posadas/Garupá/Candelaria fare publication | Route feed pending | DISCOVERY_ONLY |
| 58 | AR-Q | Neuquén | Provincial open-data transport category plus regulatory/service evidence | Discovery only | DISCOVERY_ONLY |
| 62 | AR-R | Río Negro | Bariloche official transport/data portals with routes/times/fares/map | Strong city candidate; raw feed/license/freshness normalization pending | DISCOVERY_ONLY |
| 66 | AR-A | Salta | Current SAETA operators/corridors/service diagrams | Raw reusable feed pending | DISCOVERY_ONLY |
| 70 | AR-J | San Juan | Official RedTulum routes/stops/times/service-alert product | Raw reusable feed pending | DISCOVERY_ONLY |
| 74 | AR-D | San Luis | Current Transpuntano/interurban service plus official 2026 interurban fare evidence | Raw route feed pending | DISCOVERY_ONLY |
| 78 | AR-Z | Santa Cruz | Provincial transport platform plus SITU geospatial services | Urban transit feed pending | DISCOVERY_ONLY |
| 82 | AR-S | Santa Fe | Provincial open data/Transport/IDESF; Rosario discovery; Santa Fe city separately validated by VOY | Province does not inherit Santa Fe city overlay | DISCOVERY_ONLY |
| 86 | AR-G | Santiago del Estero | Municipal updated bus-line route information | Raw feed/license pending | DISCOVERY_ONLY |
| 90 | AR-T | Tucumán | Provincial data portal plus official Cuándo SUBO and municipal platform registry | Raw interface/license still gated | DISCOVERY_ONLY |
| 94 | AR-V | Tierra del Fuego, Antártida e Islas del Atlántico Sur | IDETDF territorial services plus current SUBE/open-payment evidence in Ushuaia/Río Grande | Route feed pending | DISCOVERY_ONLY |

## National sources used as discovery anchors

- GeoRef Argentina v2: canonical administrative/territorial identity.
- Portal Nacional de Datos Públicos / Transporte catalog: discovery only unless dataset-specific gates pass.
- CNRT: national transport authority/reference.
- SUBE city coverage: discovery/context, not proof of complete local transport coverage.
- IDERA: discovery of official provincial/municipal geospatial services.

## Promotion gate for any local component

Before a territory/component can move beyond discovery, persist:

```text
source_url
source_owner
jurisdiction
license
last_update
verified_at
freshness/expiry
schema validation
coverage component
operational_use=YES
```

The detailed research basis for this matrix is preserved in Issue #43 checkpoint comment `5348463560`. No row in this file alone authorizes provider, fare, transit, rail or bike claims.
