import {OFFICIAL_GEOREF_RUNTIME_AUTHORITY_META,OFFICIAL_LOCALITY_CANON,OFFICIAL_PROVINCE_BOUNDARIES,OFFICIAL_LOCALITY_PARENT_BOUNDARIES} from './georef-authority.generated.js';
import {RAIL_STATION_CATALOG_META,RAIL_STATIONS} from './rail-stations.generated.js';

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// dist/worker/runtime-config.js
var APP_CONFIG = { "schema_version": 1, "APP_RELEASE": { "channel": "order057", "source_provenance": "CLEAN_ROOM_REPLACEMENT_DUE_TO_PROVEN_SOURCE_LOSS" }, "FEATURE_FLAGS": { "national_territory": true, "routing": false, "browser_telemetry": true, "map": true, "contextual_destination_search": true, "destination_provider_live_challenger": false, "rail_static_discovery": true, "rail_realtime": false }, "TERRITORY_SOURCE": { "id": "src_georef", "base_url": "https://apis.datos.gob.ar/georef/api/v2.0", "allowed_host": "apis.datos.gob.ar" }, "MAP_PROVIDER": { "id": "osm-standard-raster", "tile_template": "https://tile.openstreetmap.org/{z}/{x}/{y}.png", "allowed_host": "tile.openstreetmap.org", "attribution": "\xA9 OpenStreetMap contributors", "attribution_url": "https://www.openstreetmap.org/copyright", "zoom": 13, "tile_radius": 1 }, "UPSTREAM_TIMEOUTS": { "georef_ms": 3500, "destination_ms": 3500 }, "CACHE_TTLS": { "static_seconds": 604800, "registry_seconds": 3600 }, "FRESHNESS_THRESHOLDS": { "fare_seconds": 15552e3, "handoff_seconds": 7776e3 }, "TELEMETRY_SAMPLING": { "logs_head_sampling_rate": 1, "traces_head_sampling_rate": 0.1 }, "OFFICIAL_HANDOFF_ALLOWLIST": ["https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/", "https://www.rosario.gob.ar/inicio/transporte-urbano-de-pasajeros", "https://cordoba.gob.ar/tu-bondi/", "https://mendotran.mendoza.gov.ar/", "https://www.saetasalta.com.ar/", "https://buenosaires.gob.ar/gcaba_historico/innovacion/ciudadinteligente/como-llego", "https://www.ushuaia.gob.ar/recorrido-colectivos", "https://resistencia.gob.ar/recorridos-de-colectivos", "https://www.formosatuciudad.gob.ar/servicios/transporte-urbano", "https://turismo.larioja.gob.ar/comercios/rioja-bus/", "https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos"], "CSP_HOST_ALLOWLIST": ["https://tile.openstreetmap.org", "https://tiles.openfreemap.org"], "MAP_VECTOR": { "id": "openfreemap-liberty", "style_url": "https://tiles.openfreemap.org/styles/liberty", "tiles_url": "https://tiles.openfreemap.org", "allowed_host": "tiles.openfreemap.org", "attribution": "Â© OpenStreetMap contributors", "attribution_url": "https://www.openstreetmap.org/copyright", "maplibre_version": "6.11.2", "enabled": true }, "DESTINATION_SOURCE": { "id": "photon_public_georef_verified", "base_url": "https://photon.komoot.io", "allowed_host": "photon.komoot.io", "countrycode": "AR" } };
var JURISDICTIONS = { "schema_version": 1, "jurisdiction_count": 24, "jurisdictions": [{ "province_id": "02", "province_name": "Ciudad Aut\xF3noma de Buenos Aires", "capital_or_primary_city": { "name": "Buenos Aires", "slug": "caba" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "06", "province_name": "Buenos Aires", "capital_or_primary_city": { "name": "La Plata", "slug": "la-plata" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "10", "province_name": "Catamarca", "capital_or_primary_city": { "name": "San Fernando del Valle de Catamarca", "slug": "catamarca-capital" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "14", "province_name": "C\xF3rdoba", "capital_or_primary_city": { "name": "C\xF3rdoba", "slug": "cordoba" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "18", "province_name": "Corrientes", "capital_or_primary_city": { "name": "Corrientes", "slug": "corrientes" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "22", "province_name": "Chaco", "capital_or_primary_city": { "name": "Resistencia", "slug": "resistencia" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T06:00:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 official-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "26", "province_name": "Chubut", "capital_or_primary_city": { "name": "Rawson", "slug": "rawson" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T06:00:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 official-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "30", "province_name": "Entre R\xEDos", "capital_or_primary_city": { "name": "Paran\xE1", "slug": "parana" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "34", "province_name": "Formosa", "capital_or_primary_city": { "name": "Formosa", "slug": "formosa" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T06:00:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 official-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "38", "province_name": "Jujuy", "capital_or_primary_city": { "name": "San Salvador de Jujuy", "slug": "san-salvador-de-jujuy" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "42", "province_name": "La Pampa", "capital_or_primary_city": { "name": "Santa Rosa", "slug": "santa-rosa" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "46", "province_name": "La Rioja", "capital_or_primary_city": { "name": "La Rioja", "slug": "la-rioja" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "50", "province_name": "Mendoza", "capital_or_primary_city": { "name": "Mendoza", "slug": "mendoza" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "54", "province_name": "Misiones", "capital_or_primary_city": { "name": "Posadas", "slug": "posadas" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "58", "province_name": "Neuqu\xE9n", "capital_or_primary_city": { "name": "Neuqu\xE9n", "slug": "neuquen" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "62", "province_name": "R\xEDo Negro", "capital_or_primary_city": { "name": "Viedma", "slug": "viedma" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "66", "province_name": "Salta", "capital_or_primary_city": { "name": "Salta", "slug": "salta" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T06:00:07Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 official SAETA tariff + handoff revalidation 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "70", "province_name": "San Juan", "capital_or_primary_city": { "name": "San Juan", "slug": "san-juan" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "74", "province_name": "San Luis", "capital_or_primary_city": { "name": "San Luis", "slug": "san-luis" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "78", "province_name": "Santa Cruz", "capital_or_primary_city": { "name": "R\xEDo Gallegos", "slug": "rio-gallegos" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "82", "province_name": "Santa Fe", "capital_or_primary_city": { "name": "Santa Fe", "slug": "santa-fe" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "86", "province_name": "Santiago del Estero", "capital_or_primary_city": { "name": "Santiago del Estero", "slug": "santiago-del-estero" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "90", "province_name": "Tucum\xE1n", "capital_or_primary_city": { "name": "San Miguel de Tucum\xE1n", "slug": "san-miguel-de-tucuman" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }, { "province_id": "94", "province_name": "Tierra del Fuego, Ant\xE1rtida e Islas del Atl\xE1ntico Sur", "capital_or_primary_city": { "name": "Ushuaia", "slug": "ushuaia" }, "territory_status": "NATIONAL_GEOREF_PRIMARY", "local_mobility_tier": "T0_TERRITORY_ONLY", "source_ids": ["src_georef"], "official_handoff_urls": [], "last_verified_at": "2026-08-28T05:45:00Z", "next_review_at": "2026-11-28T00:00:00Z", "evidence_reference": "ORDER-052 public-source research 2026-08-28", "unavailable_or_unknown": true }] };
var MOBILITY_SOURCES = { "schema_version": 1, "sources": [{ "id": "src_georef", "authority": "Argentina.gob.ar / Datos Argentina", "jurisdiction": "AR", "canonical_url": "https://apis.datos.gob.ar/georef/api/v2.0", "data_class": "OFFICIAL_GOV_API", "auth_requirement": "NONE", "license_terms_note": "Servicio oficial, p\xFAblico, abierto y gratuito; usar documentaci\xF3n oficial GeoRef v2.", "cache_policy": "NO_BROWSER_CACHE; bounded Worker response handling", "timeout_ms": 3500, "freshness_threshold_seconds": 0, "schema_version": "georef-v2", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "EXTERNAL_DEPENDENCY_UNAVAILABLE; fail closed", "integration_status": "STRUCTURED_WORKER_PRIMARY", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }, { "id": "src_santa_fe_bus", "authority": "Municipalidad de Santa Fe", "jurisdiction": "82/santa-fe", "canonical_url": "https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/", "data_class": "OFFICIAL_WEB_PAGE", "auth_requirement": "NONE", "license_terms_note": "Official municipal handoff only; no Cuando Pasa scraping/protected API.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "Show unavailable-in-VOY and fixed handoff", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }, { "id": "src_rosario_transport", "authority": "Municipalidad de Rosario", "jurisdiction": "82/rosario", "canonical_url": "https://www.rosario.gob.ar/inicio/transporte-urbano-de-pasajeros", "data_class": "OFFICIAL_WEB_PAGE", "auth_requirement": "NONE", "license_terms_note": "Official public page. Structured values only with effective-date evidence.", "cache_policy": "SNAPSHOT_ONLY", "timeout_ms": 0, "freshness_threshold_seconds": 2592e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "Handoff remains; current facts become unavailable when stale", "integration_status": "T1_HANDOFF_T4_FARE_SNAPSHOT", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }, { "id": "src_rosario_fare_20260223", "authority": "Municipalidad de Rosario", "jurisdiction": "82/rosario", "canonical_url": "https://www.rosario.gob.ar/inicio/transporte-urbano-de-pasajeros", "data_class": "OFFICIAL_TARIFF", "auth_requirement": "NONE", "license_terms_note": "Official tariff table observed on municipal transport page.", "cache_policy": "RELEASE_SNAPSHOT", "timeout_ms": 0, "freshness_threshold_seconds": 15552e3, "schema_version": "fare-v1", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "Do not present after freshness/effective-date rule fails", "integration_status": "T4_FARE_VERIFIED", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }, { "id": "src_cordoba_tu_bondi", "authority": "Municipalidad de C\xF3rdoba", "jurisdiction": "14/cordoba", "canonical_url": "https://cordoba.gob.ar/tu-bondi/", "data_class": "OFFICIAL_APP_HANDOFF", "auth_requirement": "NONE", "license_terms_note": "Official Tu Bondi user service; backend not reverse-engineered.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "Official handoff only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }, { "id": "src_mendoza_mendotran", "authority": "Gobierno de Mendoza / MendoTran", "jurisdiction": "50/mendoza", "canonical_url": "https://mendotran.mendoza.gov.ar/", "data_class": "OFFICIAL_APP_HANDOFF", "auth_requirement": "NONE", "license_terms_note": "Official user service; no undocumented backend reuse.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "Official handoff only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }, { "id": "src_salta_saeta", "authority": "SAETA", "jurisdiction": "66/salta", "canonical_url": "https://www.saetasalta.com.ar/", "data_class": "OFFICIAL_APP_HANDOFF", "auth_requirement": "NONE", "license_terms_note": "Official authority site; no undocumented backend reuse.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-28T05:58:34Z", "failure_behavior": "Official handoff remains; fare snapshot handled by separate effective-dated source", "integration_status": "T1_HANDOFF_T4_FARE_SNAPSHOT", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }, { "id": "src_caba_data_docs", "authority": "Gobierno de la Ciudad de Buenos Aires", "jurisdiction": "02/caba", "canonical_url": "https://datosabiertos-apis.buenosaires.gob.ar/BA_Root/Documentacion?schema_name=Transporte_3", "data_class": "OFFICIAL_GOV_API", "auth_requirement": "UNKNOWN/ENDPOINT_DEPENDENT", "license_terms_note": "Official docs exist; official dataset page currently warns API/GTFS datasets suspended/reviewing.", "cache_policy": "DISABLED_UNTIL_RUNTIME_PROBE_PASS", "timeout_ms": 3e3, "freshness_threshold_seconds": 86400, "schema_version": "documented-current-status", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "No structured feed claim; use official handoff", "integration_status": "SUSPENDED_REVIEW_T1_ONLY", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }, { "id": "src_caba_como_llego", "authority": "Gobierno de la Ciudad de Buenos Aires", "jurisdiction": "02/caba", "canonical_url": "https://buenosaires.gob.ar/gcaba_historico/innovacion/ciudadinteligente/como-llego", "data_class": "OFFICIAL_APP_HANDOFF", "auth_requirement": "NONE", "license_terms_note": "Official C\xF3mo Llego product page.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "Official handoff only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }, { "id": "src_catamarca_muniservicios", "authority": "Municipalidad de San Fernando del Valle de Catamarca", "jurisdiction": "10/catamarca-capital", "canonical_url": "https://www.catamarcaciudad.gob.ar/muniservicios/", "data_class": "OFFICIAL_WEB_PAGE", "auth_requirement": "NONE", "license_terms_note": "Municipal information page exposes bus-route information entry.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "Official handoff only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": false, "trust_state": "QUARANTINED", "runtime_scope_note": "QUARANTINED_LOW_TRUST_PAGE" }, { "id": "src_larioja_riojabus", "authority": "Gobierno de La Rioja / Turismo", "jurisdiction": "46/la-rioja", "canonical_url": "https://turismo.larioja.gob.ar/comercios/rioja-bus/", "data_class": "OFFICIAL_WEB_PAGE", "auth_requirement": "NONE", "license_terms_note": "Official provincial site identifies Rioja Bus as public passenger transport; no feed ingested.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-31T01:29:41Z", "failure_behavior": "Official handoff only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE", "runtime_scope_note": "Current official La Rioja government tourism page identifies Rioja Bus as public passenger transport in La Rioja Capital." }, { "id": "src_santacruz_citybus", "authority": "Gobierno de Santa Cruz / Subsecretar\xEDa de Transporte", "jurisdiction": "78/rio-gallegos", "canonical_url": "https://transporte.santacruz.gob.ar/", "data_class": "OFFICIAL_WEB_PAGE", "auth_requirement": "NONE", "license_terms_note": "Official provincial transport context confirms CityBus service in R\xEDo Gallegos; no operator backend reused.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-28T05:45:00Z", "failure_behavior": "Official handoff/context only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": false, "trust_state": "DEFERRED_SCOPE_REVIEW", "runtime_scope_note": "NEEDS_EXACT_LOCAL_SCOPE_REVERIFY" }, { "id": "src_ushuaia_mi_bondi", "authority": "Municipalidad de Ushuaia / UISE", "jurisdiction": "94/ushuaia", "canonical_url": "https://www.ushuaia.gob.ar/recorrido-colectivos", "data_class": "OFFICIAL_WEB_PAGE", "auth_requirement": "NONE", "license_terms_note": "Official route page links Mi Bondi; no app backend reuse.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-31T01:29:41Z", "failure_behavior": "Official handoff only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE", "runtime_scope_note": "Current official municipal route page explicitly states Ushuaia urban passenger transport and links Mi Bondi." }, { "id": "src_resistencia_colectivos", "authority": "Municipalidad de Resistencia", "jurisdiction": "22/resistencia", "canonical_url": "https://resistencia.gob.ar/recorridos-de-colectivos", "data_class": "OFFICIAL_WEB_PAGE", "auth_requirement": "NONE", "license_terms_note": "Official municipal service page publishes public bus route information; no undocumented backend reused.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-31T01:29:41Z", "failure_behavior": "Official handoff only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE", "runtime_scope_note": "Current official municipal page is explicitly scoped to bus routes in Resistencia." }, { "id": "src_rawson_sube", "authority": "Municipalidad de Rawson, Chubut", "jurisdiction": "26/rawson", "canonical_url": "https://www.rawson.gov.ar/sube", "data_class": "OFFICIAL_WEB_PAGE", "auth_requirement": "NONE", "license_terms_note": "Official municipal SUBE/transport page confirms public transport context and official payment handoffs; no route/ETA feed claimed.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-28T06:00:00Z", "failure_behavior": "Official handoff/context only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": false, "trust_state": "DEFERRED_SCOPE_REVIEW", "runtime_scope_note": "CONTEXT_ONLY_NOT_LOCAL_MOBILITY_PROOF" }, { "id": "src_formosa_fermoza", "authority": "Municipalidad de Formosa", "jurisdiction": "34/formosa", "canonical_url": "https://www.formosatuciudad.gob.ar/servicios/transporte-urbano", "data_class": "OFFICIAL_WEB_PAGE", "auth_requirement": "NONE", "license_terms_note": "Official municipal transport page covers Fermoza urban transport; 2026 route changes were independently observed. No protected backend reused and no current fare is ingested.", "cache_policy": "NO_DATA_INGEST", "timeout_ms": 0, "freshness_threshold_seconds": 7776e3, "schema_version": "handoff-v1", "last_successful_verification": "2026-08-31T01:29:41Z", "failure_behavior": "Official handoff only", "integration_status": "T1_HANDOFF", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE", "runtime_scope_note": "Current official municipal transport page explicitly describes Formosa urban passenger transport and current Fermoza service." }, { "id": "src_salta_fare_20260408", "authority": "SAETA", "jurisdiction": "66/salta", "canonical_url": "https://www.saetasalta.com.ar/saetaw/tarifas", "data_class": "OFFICIAL_TARIFF", "auth_requirement": "NONE", "license_terms_note": "Official SAETA tariff page and 2026-04-07 authority notice establish $1450 flat fare effective 2026-04-08.", "cache_policy": "RELEASE_SNAPSHOT", "timeout_ms": 0, "freshness_threshold_seconds": 15552e3, "schema_version": "fare-v1", "last_successful_verification": "2026-08-28T05:58:34Z", "failure_behavior": "Do not present after freshness/effective-date rule fails", "integration_status": "T4_FARE_VERIFIED", "runtime_claims_allowed": true, "trust_state": "TRUSTED_FOR_DECLARED_SCOPE" }] };
var CITY_INTEGRATIONS = { "schema_version": 1, "verified_at": "2026-08-31T01:29:41Z", "cities": [{ "slug": "santa-fe", "city": "Santa Fe", "province_id": "82", "province": "Santa Fe", "tier": "T1_OFFICIAL_HANDOFF", "source_ids": ["src_santa_fe_bus"], "handoffs": [{ "id": "santa_fe_municipal_transit", "label": "Informaci\xF3n oficial de colectivos", "url": "https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": null, "structured_status": "UNAVAILABLE_IN_VOY" }, { "slug": "rosario", "city": "Rosario", "province_id": "82", "province": "Santa Fe", "tier": "T4_FARE_VERIFIED", "source_ids": ["src_rosario_transport", "src_rosario_fare_20260223"], "handoffs": [{ "id": "rosario_transport_official", "label": "Transporte urbano oficial de Rosario", "url": "https://www.rosario.gob.ar/inicio/transporte-urbano-de-pasajeros", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": { "value": 1720, "currency": "ARS", "scope": "Tarifa b\xE1sica transporte urbano de pasajeros", "effective_from": "2026-02-23", "source_id": "src_rosario_fare_20260223", "verified_at": "2026-08-28T05:45:00Z" }, "structured_status": "HANDOFF_PLUS_FARE_SNAPSHOT" }, { "slug": "cordoba", "city": "C\xF3rdoba", "province_id": "14", "province": "C\xF3rdoba", "tier": "T1_OFFICIAL_HANDOFF", "source_ids": ["src_cordoba_tu_bondi"], "handoffs": [{ "id": "cordoba_tu_bondi", "label": "Tu Bondi oficial", "url": "https://cordoba.gob.ar/tu-bondi/", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": null, "structured_status": "OFFICIAL_HANDOFF_NO_REUSABLE_FEED_VERIFIED" }, { "slug": "mendoza", "city": "Mendoza", "province_id": "50", "province": "Mendoza", "tier": "T1_OFFICIAL_HANDOFF", "source_ids": ["src_mendoza_mendotran"], "handoffs": [{ "id": "mendoza_mendotran", "label": "MendoTran oficial", "url": "https://mendotran.mendoza.gov.ar/", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": null, "structured_status": "OFFICIAL_HANDOFF_NO_REUSABLE_FEED_VERIFIED" }, { "slug": "salta", "city": "Salta", "province_id": "66", "province": "Salta", "tier": "T4_FARE_VERIFIED", "source_ids": ["src_salta_saeta", "src_salta_fare_20260408"], "handoffs": [{ "id": "salta_saeta", "label": "SAETA oficial", "url": "https://www.saetasalta.com.ar/", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": { "value": 1450, "currency": "ARS", "scope": "Tarifa urbana/plana \xC1rea Metropolitana de Salta", "effective_from": "2026-04-08", "source_id": "src_salta_fare_20260408", "verified_at": "2026-08-28T05:58:34Z" }, "structured_status": "HANDOFF_PLUS_FARE_SNAPSHOT" }, { "slug": "caba", "city": "Ciudad Aut\xF3noma de Buenos Aires", "province_id": "02", "province": "Ciudad Aut\xF3noma de Buenos Aires", "tier": "T1_OFFICIAL_HANDOFF", "source_ids": ["src_caba_como_llego", "src_caba_data_docs"], "handoffs": [{ "id": "caba_como_llego", "label": "C\xF3mo Llego oficial", "url": "https://buenosaires.gob.ar/gcaba_historico/innovacion/ciudadinteligente/como-llego", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": null, "structured_status": "DOCUMENTED_APIS_SUSPENDED_OR_UNDER_REVIEW" }, { "slug": "ushuaia", "city": "Ushuaia", "province_id": "94", "province": "Tierra del Fuego, Ant\xE1rtida e Islas del Atl\xE1ntico Sur", "tier": "T1_OFFICIAL_HANDOFF", "source_ids": ["src_ushuaia_mi_bondi"], "handoffs": [{ "id": "ushuaia_recorridos_oficial", "label": "Recorridos de colectivos oficiales de Ushuaia", "url": "https://www.ushuaia.gob.ar/recorrido-colectivos", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": null, "structured_status": "OFFICIAL_HANDOFF_NO_REUSABLE_FEED_VERIFIED" }, { "slug": "resistencia", "city": "Resistencia", "province_id": "22", "province": "Chaco", "tier": "T1_OFFICIAL_HANDOFF", "source_ids": ["src_resistencia_colectivos"], "handoffs": [{ "id": "resistencia_recorridos_oficial", "label": "Recorridos de colectivos oficiales de Resistencia", "url": "https://resistencia.gob.ar/recorridos-de-colectivos", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": null, "structured_status": "OFFICIAL_HANDOFF_NO_REUSABLE_FEED_VERIFIED" }, { "slug": "formosa", "city": "Formosa", "province_id": "34", "province": "Formosa", "tier": "T1_OFFICIAL_HANDOFF", "source_ids": ["src_formosa_fermoza"], "handoffs": [{ "id": "formosa_transporte_urbano_oficial", "label": "Transporte urbano oficial de Formosa", "url": "https://www.formosatuciudad.gob.ar/servicios/transporte-urbano", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": null, "structured_status": "OFFICIAL_HANDOFF_NO_REUSABLE_FEED_VERIFIED" }, { "slug": "la-rioja", "city": "La Rioja", "province_id": "46", "province": "La Rioja", "tier": "T1_OFFICIAL_HANDOFF", "source_ids": ["src_larioja_riojabus"], "handoffs": [{ "id": "la_rioja_rioja_bus_oficial", "label": "Rioja Bus \u2014 informaci\xF3n oficial", "url": "https://turismo.larioja.gob.ar/comercios/rioja-bus/", "requires_confirmation": true, "single_use": true, "sends_coords": false, "sends_query": false }], "fare": null, "structured_status": "OFFICIAL_HANDOFF_NO_REUSABLE_FEED_VERIFIED" }] };
var TELEMETRY_CONTRACT = { "schema_version": 1, "events": ["request_completed", "territory_resolve_ok", "territory_resolve_ambiguous", "territory_resolve_unverified", "upstream_timeout", "upstream_5xx", "mobility_source_ok", "mobility_source_stale", "mobility_source_error", "map_provider_error", "handoff_confirm", "handoff_cancel", "pwa_sw_registered", "pwa_sw_failed", "client_error_summary", "destination_suggest_ok", "destination_suggest_empty", "destination_suggest_error", "destination_resolve_ok", "destination_resolve_error"], "dimensions": ["release_id", "endpoint_class", "province_id", "locality_coverage_tier", "source_id", "result_class", "status_code_class", "latency_bucket", "cache_hit_boolean", "client_class", "provider_id", "result_count_bucket", "fallback_stage", "outcome_class", "error_class"], "forbidden_fields": ["raw_address", "raw_origin", "raw_destination", "query", "lat", "lon", "latitude", "longitude", "ip", "email", "account_id", "cookie", "token", "session_id", "fingerprint", "user_agent", "message", "mobility_history", "exact_coordinates", "authorization", "auth_header", "authorization_header", "cookie_header", "raw_upstream_payload", "upstream_payload", "access_token", "refresh_token", "session_token", "provider_response", "provider_payload", "candidate_ref"], "max_body_bytes": 2048, "max_events_per_isolate_window": 120, "window_ms": 6e4, "content_type": "application/json", "same_origin_only": true };
var DESTINATION_PROVIDERS = { "schema_version": 1, "production_provider": "photon_georef_contextual", "provider_lock": "ORDER056_FINAL_PHOTON_DISCOVERY_GEOREF_TERRITORIAL_VERIFICATION", "max_initial_suggestions": 5, "debounce_ms": 220, "query_min_chars": 3, "query_max_chars": 160, "session_token_min_chars": 16, "session_token_max_chars": 96, "suggest_rate_limit_per_isolate_minute": 80, "providers": { "photon_georef_contextual": { "enabled": true, "live_benchmark_authorized": true, "supports_typeahead": true, "terms_class": "PHOTON_PUBLIC_DEMO_BOUNDED_WITH_GEOREF_FAIL_CLOSED", "secret_binding": null }, "georef_baseline": { "enabled": true, "live_benchmark_authorized": true, "supports_typeahead": false, "terms_class": "ARGENTINA_OFFICIAL_TERRITORIAL_BASELINE", "secret_binding": null }, "geoapify": { "enabled": false, "live_benchmark_authorized": false, "supports_typeahead": true, "terms_class": "OPEN_MAP_COMPATIBLE_CHALLENGER", "secret_binding": "GEOAPIFY_API_KEY" }, "locationiq": { "enabled": false, "live_benchmark_authorized": false, "supports_typeahead": true, "terms_class": "OPEN_MAP_COMPATIBLE_CHALLENGER", "secret_binding": "LOCATIONIQ_ACCESS_TOKEN" }, "google_places_ui_kit": { "enabled": false, "live_benchmark_authorized": false, "supports_typeahead": true, "terms_class": "GOOGLE_UI_KIT_NON_GOOGLE_MAP_EXCEPTION", "secret_binding": "GOOGLE_MAPS_BROWSER_KEY" }, "google_places_new_full_google": { "enabled": false, "live_benchmark_authorized": false, "supports_typeahead": true, "terms_class": "FULL_GOOGLE_SEARCH_PLUS_GOOGLE_MAP_ONLY", "secret_binding": "GOOGLE_MAPS_SERVER_KEY" } } };
var RELEASE_META = { "release_id": "order056-a1e0e243117d-4b947280", "build_id": "4b9472807d077eb668c179dd", "source_commit": "a1e0e243117d5d7a60d4caff49442027669a7ca2", "source_digest": "4b9472807d077eb668c179dde0259e348463371777219f4880580fdd94a483d1", "config_digest": "65f3c80ae9c5d35e698b23b08032a020cb2b19693c31d22d3c5747d1464c5ff5", "registry_digest": "1f1f2f0bdb3fad8a56dfa66b1d2bfcdd3b9ea9c8216bcb67bfcde56907b88f9f" };

// dist/worker/destination-intelligence.js
var text = /* @__PURE__ */ __name((value) => String(value ?? "").trim().replace(/\s+/g, " "), "text");
var foldText = /* @__PURE__ */ __name((value) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), "foldText");
var words = /* @__PURE__ */ __name((value) => foldText(value).split(/[^a-z0-9]+/).filter(Boolean), "words");
var finite = /* @__PURE__ */ __name((value) => Number.isFinite(Number(value)) ? Number(value) : null, "finite");
var validCoordinates = /* @__PURE__ */ __name((coords) => {
  const lat = finite(coords?.lat), lon = finite(coords?.lon);
  return lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? { lat, lon } : null;
}, "validCoordinates");
var haversineMeters = /* @__PURE__ */ __name((a, b) => {
  const aa = validCoordinates(a), bb = validCoordinates(b);
  if (!aa || !bb) return null;
  const R = 63710088e-1, rad = /* @__PURE__ */ __name((x) => x * Math.PI / 180, "rad");
  const dLat = rad(bb.lat - aa.lat), dLon = rad(bb.lon - aa.lon);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aa.lat)) * Math.cos(rad(bb.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(q))));
}, "haversineMeters");
function railLineIdentity(value) {
  return foldText(value).replace(/\bffcc\b/g, " ").replace(/\bferrocarril\b/g, " ").replace(/\s+/g, " ").trim();
}
__name(railLineIdentity, "railLineIdentity");
function nearestRailStations(coords, limit = 3, maxDistanceMeters = 5000, operator = null) {
  const center = validCoordinates(coords);
  if (!center) return [];
  const boundedLimit = Math.max(1, Math.min(10, Number(limit) || 3));
  const boundedDistance = Math.max(250, Math.min(50000, Number(maxDistanceMeters) || 5000));
  const normalizedOperator = operator == null ? null : foldText(operator);
  const ranked = RAIL_STATIONS.map((station) => {
    if (normalizedOperator && foldText(station.operator) !== normalizedOperator) return null;
    if (/\bno operativo\b/i.test(String(station.line ?? ""))) return null;
    const distance_meters = haversineMeters(center, { lat: station.lat, lon: station.lon });
    return distance_meters === null ? null : { ...station, distance_meters };
  }).filter((station) => station && station.distance_meters <= boundedDistance)
    .sort((a, b) => a.distance_meters - b.distance_meters || String(a.catalog_id).localeCompare(String(b.catalog_id), void 0, { numeric: true }));
  const seen = new Set(), result = [];
  for (const station of ranked) {
    const key = `${foldText(station.name)}|${railLineIdentity(station.line)}|${foldText(station.operator)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(station);
    if (result.length >= boundedLimit) break;
  }
  return result;
}
__name(nearestRailStations, "nearestRailStations");
var PROVINCES = [
  ["02", "Ciudad Aut\xF3noma de Buenos Aires", ["caba", "ciudad autonoma de buenos aires", "buenos aires ciudad"]],
  ["06", "Buenos Aires", ["buenos aires", "provincia de buenos aires"]],
  ["10", "Catamarca", ["catamarca"]],
  ["14", "C\xF3rdoba", ["cordoba"]],
  ["18", "Corrientes", ["corrientes"]],
  ["22", "Chaco", ["chaco"]],
  ["26", "Chubut", ["chubut"]],
  ["30", "Entre R\xEDos", ["entre rios"]],
  ["34", "Formosa", ["formosa"]],
  ["38", "Jujuy", ["jujuy"]],
  ["42", "La Pampa", ["la pampa"]],
  ["46", "La Rioja", ["la rioja"]],
  ["50", "Mendoza", ["mendoza"]],
  ["54", "Misiones", ["misiones"]],
  ["58", "Neuqu\xE9n", ["neuquen"]],
  ["62", "R\xEDo Negro", ["rio negro"]],
  ["66", "Salta", ["salta"]],
  ["70", "San Juan", ["san juan"]],
  ["74", "San Luis", ["san luis"]],
  ["78", "Santa Cruz", ["santa cruz"]],
  ["82", "Santa Fe", ["santa fe"]],
  ["86", "Santiago del Estero", ["santiago del estero"]],
  ["90", "Tucum\xE1n", ["tucuman"]],
  ["94", "Tierra del Fuego, Ant\xE1rtida e Islas del Atl\xE1ntico Sur", ["tierra del fuego"]]
];
var LOCALITIES = [
  ["Santa Fe", "82", ["santa fe"]],
  ["Rosario", "82", ["rosario"]],
  ["C\xF3rdoba", "14", ["cordoba"]],
  ["Mendoza", "50", ["mendoza"]],
  ["Salta", "66", ["salta"]],
  ["Paran\xE1", "30", ["parana"]],
  ["Rafaela", "82", ["rafaela"]],
  ["Reconquista", "82", ["reconquista"]],
  ["San Nicol\xE1s de los Arroyos", "06", ["san nicolas de los arroyos", "san nicolas"]],
  ["Ciudad Aut\xF3noma de Buenos Aires", "02", ["caba", "ciudad autonoma de buenos aires"]],
  ["Ushuaia", "94", ["ushuaia"]],
  ["Resistencia", "22", ["resistencia"]],
  ["Formosa", "34", ["formosa"]],
  ["La Rioja", "46", ["la rioja"]]
];
let OFFICIAL_LOCALITY_SEARCH_ROWS=null;
function officialLocalitySearchRows(){
  if(OFFICIAL_LOCALITY_SEARCH_ROWS)return OFFICIAL_LOCALITY_SEARCH_ROWS;
  const rows=[];
  for(const [key,name] of Object.entries(OFFICIAL_LOCALITY_CANON)){
    const split=key.indexOf('|');if(split<1)continue;
    const canonical=text(name),province_id=key.slice(0,split),canonicalAlias=foldText(canonical);
    rows.push({name:canonical,province_id,alias:canonicalAlias});
    const shortAlias=canonicalAlias.replace(/^(?:san carlos de|san salvador de|san miguel de|san fernando del valle de)\s+/,"");
    if(shortAlias!==canonicalAlias&&shortAlias.length>=5)rows.push({name:canonical,province_id,alias:shortAlias});
  }
  for(const [name,province_id,aliases] of LOCALITIES){
    rows.push({name,province_id,alias:foldText(name)});
    for(const alias of aliases??[])rows.push({name,province_id,alias:foldText(alias)});
  }
  const seen=new Set();OFFICIAL_LOCALITY_SEARCH_ROWS=rows.filter(row=>{const k=`${row.province_id}|${row.alias}`;if(!row.alias||seen.has(k))return false;seen.add(k);return true});
  return OFFICIAL_LOCALITY_SEARCH_ROWS;
}
__name(officialLocalitySearchRows,"officialLocalitySearchRows");
function provinceById(id){const row=PROVINCES.find(([pid])=>pid===id);return row?{id:row[0],name:row[1]}:null;}
__name(provinceById,"provinceById");
function stripTerminalCountryQualifier(value){
  const raw=text(value),parts=raw.split(/\s+/).filter(Boolean),folded=parts.map(foldText);
  if(folded.length>=2&&folded.at(-2)==='republica'&&folded.at(-1)==='argentina')parts.splice(-2);
  else if(folded.at(-1)==='argentina')parts.pop();
  return parts.join(' ').replace(/\s*,\s*$/,'').trim();
}
__name(stripTerminalCountryQualifier,"stripTerminalCountryQualifier");
function fragmentIsProvinceAlias(fragment){
  const f=foldText(fragment);
  return PROVINCES.some(([,name,aliases])=>f===foldText(name)||(aliases??[]).some(alias=>f===foldText(alias)));
}
__name(fragmentIsProvinceAlias,"fragmentIsProvinceAlias");
function coreLocalityAliasMatches(fragment,provinceId=''){
  const f=foldText(fragment);
  return LOCALITIES.some(([name,pid,aliases])=>(!provinceId||pid===provinceId)&&(f===foldText(name)||(aliases??[]).some(alias=>f===foldText(alias))));
}
__name(coreLocalityAliasMatches,"coreLocalityAliasMatches");
function matchLocalityFragment(fragment,provinceId='',allowPrefix=false){
  const f=foldText(fragment).replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();if(!f)return null;
  const pool=officialLocalitySearchRows().filter(row=>!provinceId||row.province_id===provinceId);
  let matches=pool.filter(row=>row.alias===f);
  const prefixMin=provinceId?3:5;
  if(!matches.length&&allowPrefix&&f.length>=prefixMin)matches=pool.filter(row=>row.alias.startsWith(f));
  const unique=new Map();for(const row of matches)unique.set(`${row.province_id}|${foldText(row.name)}`,row);
  return unique.size===1?[...unique.values()][0]:null;
}
__name(matchLocalityFragment,"matchLocalityFragment");
function exactLocalityFragmentCount(fragment,provinceId=''){
  const f=foldText(fragment).replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();if(!f)return 0;
  const unique=new Set();
  for(const row of officialLocalitySearchRows())if((!provinceId||row.province_id===provinceId)&&row.alias===f)unique.add(`${row.province_id}|${foldText(row.name)}`);
  return unique.size;
}
__name(exactLocalityFragmentCount,"exactLocalityFragmentCount");
function prefixLocalityFragmentCount(fragment,provinceId=''){
  const f=foldText(fragment).replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();if(!f)return 0;
  const unique=new Set();
  for(const row of officialLocalitySearchRows())if((!provinceId||row.province_id===provinceId)&&row.alias.startsWith(f))unique.add(`${row.province_id}|${foldText(row.name)}`);
  return unique.size;
}
__name(prefixLocalityFragmentCount,"prefixLocalityFragmentCount");
function matchTrailingLocality(value,provinceId=''){
  const parts=text(value).split(/\s+/).filter(Boolean);if(!parts.length)return null;
  for(let n=Math.min(6,parts.length);n>=1;n--){const fragment=parts.slice(-n).join(' ');if(!provinceId&&fragmentIsProvinceAlias(fragment))continue;const m=matchLocalityFragment(fragment,provinceId,false);if(m)return {...m,matched_tokens:n};if(exactLocalityFragmentCount(fragment,provinceId)>1)return null;}
  const minPrefixLength=provinceId?3:5;
  for(let n=Math.min(6,parts.length);n>=1;n--){const fragment=parts.slice(-n).join(' ');if(foldText(fragment).length<minPrefixLength||(!provinceId&&fragmentIsProvinceAlias(fragment)))continue;const m=matchLocalityFragment(fragment,provinceId,true);if(m)return {...m,matched_tokens:n};if(prefixLocalityFragmentCount(fragment,provinceId)>1)return null;}
  return null;
}
__name(matchTrailingLocality,"matchTrailingLocality");
function matchTrailingLocalityTypo(value,provinceId=''){
  if(!provinceId)return null;
  const parts=text(value).split(/\s+/).filter(Boolean);if(!parts.length)return null;
  const pool=officialLocalitySearchRows().filter(row=>row.province_id===provinceId);
  for(let n=Math.min(4,parts.length);n>=1;n--){
    const fragment=foldText(parts.slice(-n).join(' ')).replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
    if(fragment.length<5)continue;
    const matches=pool.filter(row=>Math.abs(row.alias.length-fragment.length)<=1&&editDistance(fragment,row.alias,1)===1);
    const unique=new Map();for(const row of matches)unique.set(`${row.province_id}|${foldText(row.name)}`,row);
    if(unique.size===1)return {...[...unique.values()][0],matched_tokens:n};
    if(unique.size>1)return null;
  }
  return null;
}
__name(matchTrailingLocalityTypo,"matchTrailingLocalityTypo");
function matchTrailingProvince(value,{allowAmbiguousBuenosAires=false,allowTypo=false}={}){
  const parts=foldText(value).split(/\s+/).filter(Boolean);let best=null;
  for(const [id,name,aliases] of PROVINCES)for(const alias of aliases){const a=foldText(alias),ap=a.split(/\s+/);if(parts.length<ap.length||parts.slice(-ap.length).join(' ')!==a)continue;if(!allowAmbiguousBuenosAires&&id==='06'&&a==='buenos aires')continue;if(!best||ap.length>best.matched_tokens)best={id,name,alias:a,matched_tokens:ap.length};}
  if(best||!allowTypo)return best;
  const tail=parts.at(-1)||'';
  if(tail.length<4||new Set(['santa','santo']).has(tail))return null;
  const fuzzy=[];
  for(const [id,name,aliases] of PROVINCES)for(const alias of aliases){const a=foldText(alias);if(a.includes(' ')||a.length<5||(!allowAmbiguousBuenosAires&&id==='06'&&a==='buenos aires'))continue;if(editDistance(tail,a,1)===1)fuzzy.push({id,name,alias:a,matched_tokens:1});}
  const unique=new Map();for(const row of fuzzy)unique.set(row.id,row);
  return unique.size===1?[...unique.values()][0]:null;
}
__name(matchTrailingProvince,"matchTrailingProvince");
function parseExplicitGeography(query){
  const rawText=stripTerminalCountryQualifier(query);if(!rawText)return null;
  if(rawText.includes(',')){
    const headText=rawText.split(',')[0].trim(),suffixText=rawText.split(',').slice(1).join(',').trim();
    const pMatch=matchTrailingProvince(suffixText,{allowAmbiguousBuenosAires:true})||matchTrailingProvince(suffixText,{allowAmbiguousBuenosAires:true,allowTypo:true});
    let province=pMatch?{id:pMatch.id,name:pMatch.name}:null,locality=null;
    if(pMatch)locality=matchLocalityFragment(headText,pMatch.id,false)||matchLocalityFragment(suffixText,pMatch.id,false);
    else locality=matchLocalityFragment(suffixText,'',true);
    if(locality)province=provinceById(locality.province_id);
    if(!locality&&!province)return null;
    return {locality:locality?{name:locality.name,province_id:locality.province_id}:null,province,matched_suffix_tokens:0};
  }
  const leadingToken=foldText(rawText).split(/\s+/)[0],roadLeading=new Set(['avenida','av','avda','calle','boulevard','bulevar','bv','ruta','autopista']).has(leadingToken);
  let locality=roadLeading?null:matchTrailingLocality(rawText,''),province=locality?provinceById(locality.province_id):null,matched=locality?.matched_tokens??0;
  if(!locality){
    let pMatch=matchTrailingProvince(rawText)||matchTrailingProvince(rawText,{allowTypo:true}),headLoc=null;
    if(!pMatch){
      const ambiguous=matchTrailingProvince(rawText,{allowAmbiguousBuenosAires:true});
      if(ambiguous?.id==='06'){
        const parts=text(rawText).split(/\s+/),head=parts.slice(0,-ambiguous.matched_tokens).join(' ');
        headLoc=matchTrailingLocality(head,'06')||matchTrailingLocalityTypo(head,'06');
        if(headLoc)pMatch=ambiguous;
      }
    }
    if(pMatch){
      province={id:pMatch.id,name:pMatch.name};matched=pMatch.matched_tokens;
      if(!headLoc){const parts=text(rawText).split(/\s+/),head=parts.slice(0,-pMatch.matched_tokens).join(' ');headLoc=matchTrailingLocality(head,pMatch.id)||matchTrailingLocalityTypo(head,pMatch.id);}
      if(headLoc){locality=headLoc;matched+=headLoc.matched_tokens;}
    }
  }
  if(locality)province=provinceById(locality.province_id);
  if(!locality&&!province)return null;
  return {locality:locality?{name:locality.name,province_id:locality.province_id}:null,province,matched_suffix_tokens:matched};
}
__name(parseExplicitGeography,"parseExplicitGeography");
function stripExplicitCommaGeography(query,explicitGeography=parseExplicitGeography(query)){
  const raw=stripTerminalCountryQualifier(query);if(!explicitGeography)return raw;
  if(raw.includes(',')){const head=raw.split(',')[0].trim();return head||raw;}
  const n=Number(explicitGeography.matched_suffix_tokens||0),parts=raw.split(/\s+/).filter(Boolean);
  return n>0&&parts.length>n?parts.slice(0,-n).join(' '):raw;
}
__name(stripExplicitCommaGeography,"stripExplicitCommaGeography");
function buildDestinationContext(payload = {}) {
  const query = text(payload.query), origin = payload.context?.origin ?? null, viewport = payload.context?.viewport ?? null;
  const parsedExplicit = parseExplicitGeography(query);
  const explicitLocalityName=parsedExplicit?.locality?.name??'';
  const weakBareLocality=Boolean(parsedExplicit?.locality && !query.includes(',') && Number(parsedExplicit.matched_suffix_tokens||0)===1 && origin && payload.context?.search_scope==='local' && foldText(explicitLocalityName)!==foldText(origin.locality) && !coreLocalityAliasMatches(query.split(/\s+/).at(-1)||'',parsedExplicit.province?.id||parsedExplicit.locality?.province_id||''));
  const leading=foldText(query).split(/\s+/)[0]||'';
  const localEntityLeading=new Set(['plaza','parque','cerro','cabildo','monumento','museo','puente','catedral','teatro','estadio','hospital','terminal','aeropuerto','universidad','facultad','shopping','estacion']).has(leading);
  const weakEntityLocality=Boolean(parsedExplicit?.locality && !query.includes(',') && origin && payload.context?.search_scope==='local' && foldText(explicitLocalityName)!==foldText(origin.locality) && localEntityLeading && Number(parsedExplicit.matched_suffix_tokens||0)>=Math.max(1,words(query).length-1));
  const weakRoadProvince=Boolean(parsedExplicit?.province && !parsedExplicit?.locality && !query.includes(',') && origin && payload.context?.search_scope==='local' && ROAD_QUERY_WORDS.has(leading) && Number(parsedExplicit.matched_suffix_tokens||0)>=Math.max(1,words(query).length-1));
  const explicit = weakBareLocality||weakEntityLocality||weakRoadProvince?null:parsedExplicit;
  const originCoords = validCoordinates(origin?.coordinates);
  const context = {
    query,
    explicit_geography: explicit,
    origin: origin ? { locality: text(origin.locality), province: text(origin.province), province_id: text(origin.province_id), coordinates: originCoords } : null,
    viewport: viewport && validCoordinates(viewport.center) ? { center: validCoordinates(viewport.center), span_km: Math.max(1, Math.min(500, Number(viewport.span_km) || 25)) } : null,
    search_scope: ["local", "province", "national"].includes(payload.context?.search_scope) ? payload.context.search_scope : "local",
    session_token: text(payload.session_token)
  };
  return context;
}
__name(buildDestinationContext, "buildDestinationContext");
function candidateLocality(c) {
  return text(c.locality?.name ?? c.locality ?? c.city);
}
__name(candidateLocality, "candidateLocality");
function candidateProvince(c) {
  return text(c.province?.name ?? c.province ?? c.state);
}
__name(candidateProvince, "candidateProvince");
function candidateProvinceId(c) {
  return text(c.province?.id ?? c.province_id);
}
__name(candidateProvinceId, "candidateProvinceId");
const ROAD_QUERY_WORDS=new Set(['avenida','av','avda','calle','boulevard','bulevar','bv','ruta','autopista']);
const ROAD_PROVIDER_TYPES=new Set(['motorway','trunk','primary','secondary','tertiary','residential','unclassified','service','living_street','pedestrian','road','street']);
function tokenCoverage(query,candidate){
  const categoryWords=new Set(["cancha","estadio","club","terminal","hospital","sanatorio","aeropuerto","airport","estacion","station","puente","bridge","universidad","facultad","shopping","mall","plaza","parque"]);
  const all=words(query);const entity=all.filter(token=>!categoryWords.has(token)&&!ROAD_QUERY_WORDS.has(token)&&!["de","del","la","las","el","los","y","en","a","al"].includes(token));const q=entity.length?entity:all;
  const hay=words([candidate.display_primary,candidate.display_secondary,candidate.search_text,candidate.label,candidateLocality(candidate),candidateProvince(candidate)].join(" "));
  if(!q.length||!hay.length)return 0;
  let hits=0;
  for(const token of q)if(hay.some(candidateToken=>fuzzyTokenMatch(token,candidateToken)))hits++;
  return hits/q.length;
}
__name(tokenCoverage,"tokenCoverage");
function tokenOrderScore(query,candidate){
  const categoryWords=new Set(["cancha","estadio","club","terminal","hospital","sanatorio","aeropuerto","airport","estacion","station","puente","bridge","universidad","facultad","shopping","mall","plaza","parque"]);
  const all=words(query);const entity=all.filter(token=>!categoryWords.has(token)&&!ROAD_QUERY_WORDS.has(token)&&!["de","del","la","las","el","los","y","en","a","al"].includes(token));const q=entity.length?entity:all;
  const primary=words([candidate.display_primary,candidate.search_text].filter(Boolean).join(" "));
  if(q.length<2||!primary.length)return 0;
  let cursor=-1,matched=0;
  for(const token of q){const next=primary.findIndex((p,index)=>index>cursor&&fuzzyTokenMatch(token,p));if(next<0)continue;cursor=next;matched++;}
  return matched/q.length;
}
__name(tokenOrderScore,"tokenOrderScore");
function primaryEntityCoverage(query,candidate){
  const categoryWords=new Set(["cancha","estadio","club","terminal","hospital","sanatorio","Ç§¶)Þ—kºwµç}÷m9o+^±ÈH[X™\ŠÛÝ\˜ÙK™œ™\Ú™\Ü×Ý™\ÚÛÜÙXÛÛ™ÊNÂˆÛÛœÝ[[YPÛZ[\Ð[ÝÙYHÛÝ\˜ÙKœ[[YWØÛZ[\×Ø[ÝÙYOOH˜[ÙNÂˆÛÛœÝœ™\Ú™\Ü×ÜÝ]HHÛ\ÜÚYžTÛÝ\˜ÙQœ™\Ú™\ÜÊÛÝ\˜ÙK›ÝÓ\ÊNÂˆ™]\›ˆÂˆYˆÛÝ\˜ÙKšYˆ]]Üš]NˆÛÝ\˜ÙK˜]]Üš]Kˆ]WØÛ\ÜÎˆÛÝ\˜ÙK™]WØÛ\ÜËˆ™\šYšYYØ]ˆÛÝ\˜ÙK›\ÝÜÝXØÙ\ÜÙ[Ý™\šYšXØ][ÛˆÏÈ[ˆœ™\Ú™\Ü×Ý™\ÚÛÜÙXÛÛ™Îˆ[X™\‹š\Ñš[š]JÙXÛÛ™ÊHÈÙXÛÛ™Èˆ[ˆœ™\Ú™\Ü×ÜÝ]Kˆ[[YWØÛZ[\×Ø[ÝÙYˆ[[YPÛZ[\Ð[ÝÙYˆ\ÝÜÝ]NˆÛÝ\˜ÙK\ÝÜÝ]HÏÈ
[[YPÛZ[\Ð[ÝÙYÈ••TÕQÑ“Ô—ÑPÓT‘QÔÐÓÔHˆˆ•S••TÕQŠKˆØ[›ÛšXØ[Ý\›ˆÛÝ\˜ÙK˜Ø[›ÛšXØ[Ý\›ˆNÂŸB—×Û˜[YJÛÝ\˜ÙQ]šY[˜ÙKœÛÝ\˜ÙQ]šY[˜ÙHŠNÂ™[˜Ý[Ûˆ]šY[˜ÙU\ØX›J]šY[˜ÙJHÂˆ™]\›ˆ›ÛÛX[Š]šY[˜ÙH	‰ˆ]šY[˜ÙKœ[[YWØÛZ[\×Ø[ÝÙY	‰ˆ]šY[˜ÙK™œ™\Ú™\Ü×ÜÝ]HOOH‘”‘TÒŠNÂŸB—×Û˜[YJ]šY[˜ÙU\ØX›K™]šY[˜ÙU\ØX›HŠNÂ™[˜Ý[ÛˆY™™XÝ]™UY\‘›Ü’[YÜ˜][ÛŠ[YÜ˜][Û‹›ÝÓ\ÈH]K››ÝÊ
JHÂˆÛÛœÝÛÝ\˜Ù\ÈH[YÜ˜][Û‹œÛÝ\˜ÙWÚYË›X\

Y
HOˆÛÝ\˜ÙQ]šY[˜ÙJY›ÝÓ\ÊJK™š[\Š›ÛÛX[ŠNÂˆÛÛœÝš[X\žTÛÝ\˜ÙHHÛÝ\˜Ù\Ë™š[™
]šY[˜ÙU\ØX›JHÏÈ[ÂˆÛÛœÝØY™R[™Ù™œÈH[YÜ˜][Û‹š[™Ù™œË›X\

][JHOˆÂˆÛÛœÝÛÝ\˜ÙHHÛÝ\˜ÙQ]šY[˜ÙJ][KœÛÝ\˜ÙWÚYÏÈ[YÜ˜][Û‹œÛÝ\˜ÙWÚYÖÌK›ÝÓ\ÊNÂˆÛÛœÝØY™HHS‘Ñ‘—ÐSÕÓTÕš\Ê][K\›
H	‰ˆ]šY[˜ÙU\ØX›JÛÝ\˜ÙJNÂˆ™]\›ˆÈ‹‹š][KØY™KÛÝ\˜ÙHNÂˆJK™š[\Š
][JHOˆ][KœØY™JNÂˆÛÛœÝ˜\™TÛÝ\˜ÙHH[YÜ˜][Û‹™˜\™HÈÛÝ\˜ÙQ]šY[˜ÙJ[YÜ˜][Û‹™˜\™KœÛÝ\˜ÙWÚY›ÝÓ\ÊHˆ[ÂˆÛÛœÝ˜\™U\ØX›HH›ÛÛX[Š[YÜ˜][Û‹™˜\™H	‰ˆ]šY[˜ÙU\ØX›J˜\™TÛÝ\˜ÙJJNÂˆ]Y\ˆH•ÕT”’UÔ–WÓÓ“HŽÂˆYˆ
ØY™R[™Ù™œË›[™Ý
HY\ˆH•WÓÑ‘’PÒPSÒS‘Ñ‘ˆŽÂˆYˆ
ØY™R[™Ù™œË›[™Ý	‰ˆ˜\™U\ØX›H	‰ˆ[YÜ˜][Û‹Y\ˆOOH•ÑT‘WÕ‘T’Q’QQŠHY\ˆH•ÑT‘WÕ‘T’Q’QQŽÂˆ™]\›ˆÈY\‹ÛÝ\˜Ù\Ëš[X\žTÛÝ\˜ÙKØY™R[™Ù™œË˜\™TÛÝ\˜ÙK˜\™U\ØX›HNÂŸB—×Û˜[YJY™™XÝ]™UY\‘›Ü’[YÜ˜][Û‹™Y™™XÝ]™UY\‘›Ü’[YÜ˜][ÛˆŠNÂ™[˜Ý[ÛˆÙ]ÛÝ™\˜YÙJ›Ýš[˜ÙRYØØ[]TÛYË›ÝÓ\ÈH]K››ÝÊ
JHÂˆÛÛœÝ›Ü›X[^™Y›Ýš[˜ÙRYHÝš[™Ê›Ýš[˜ÙRYÏÈˆŠNÂˆÛÛœÝ›Ü›X[^™YØØ[]TÛYÈHÛYÚYžJØØ[]TÛYÊNÂˆÛÛœÝ›Ýš[˜ÙHH•T’TÑPÕSÓ—Ð–WÒQ™Ù]
›Ü›X[^™Y›Ýš[˜ÙRY
NÂˆYˆ
\›Ýš[˜ÙJH™]\›ˆ[ÂˆÛÛœÝ[YÜ˜][ÛˆHš[™Ú]R[YÜ˜][ÛŠ›Ü›X[^™YØØ[]TÛYË›Ü›X[^™Y›Ýš[˜ÙRYØØ[]TÛYÊNÂˆYˆ
Z[YÜ˜][ÛŠHÂˆ™]\›ˆÂˆ›Ýš[˜ÙWÚYˆ›Ü›X[^™Y›Ýš[˜ÙRYˆ›Ýš[˜ÙWÛ˜[YNˆ›Ýš[˜ÙKœ›Ýš[˜ÙWÛ˜[YKˆØØ[]WÜÛYÎˆ›Ü›X[^™YØØ[]TÛYËˆ\œš]ÜžWÜÝ]\Îˆ›Ýš[˜ÙK\œš]ÜžWÜÝ]\ËˆÛÛ™šYÝ\™YÛØØ[Û[Øš[]WÝY\Žˆ›Ýš[˜ÙK›ØØ[Û[Øš[]WÝY\‹ˆØØ[Û[Øš[]WÝY\Žˆ•ÕT”’UÔ–WÓÓ“H‹ˆÛÝ\˜ÙWÚYÎˆÈœÜ˜×ÙÙ[Ü™Yˆ—KˆÙ™šXÚX[Ú[™Ù™—Ý\›Îˆ×Kˆ[˜]˜Z[X›WÛÜ—Ý[šÛ›ÝÛŽˆYKˆ™\šYšYYØ]ˆ›Ýš[˜ÙK›\ÝÝ™\šYšYYØ]ˆNÂˆBˆÛÛœÝY™™XÝ]™HHY™™XÝ]™UY\‘›Ü’[YÜ˜][ÛŠ[YÜ˜][Û‹›ÝÓ\ÊNÂˆ™]\›ˆÂˆ›Ýš[˜ÙWÚYˆ›Ü›X[^™Y›Ýš[˜ÙRYˆ›Ýš[˜ÙWÛ˜[YNˆ›Ýš[˜ÙKœ›Ýš[˜ÙWÛ˜[YKˆØØ[]WÜÛYÎˆ›Ü›X[^™YØØ[]TÛYËˆ\œš]ÜžWÜÝ]\Îˆ›Ýš[˜ÙK\œš]ÜžWÜÝ]\ËˆÛÛ™šYÝ\™YÛØØ[Û[Øš[]WÝY\Žˆ[YÜ˜][Û‹Y\‹ˆØØ[Û[Øš[]WÝY\ŽˆY™™XÝ]™KY\‹ˆÛÝ\˜ÙWÚYÎˆY™™XÝ]™KœÛÝ\˜Ù\Ë™š[\Š]šY[˜ÙU\ØX›JK›X\

ÛÝ\˜ÙJHOˆÛÝ\˜ÙKšY
KˆÙ™šXÚX[Ú[™Ù™—Ý\›ÎˆY™™XÝ]™KœØY™R[™Ù™œË›X\

][JHOˆ][K\›
Kˆ[˜]˜Z[X›WÛÜ—Ý[šÛ›ÝÛŽˆY™™XÝ]™KY\ˆOOH•ÕT”’UÔ–WÓÓ“H‹ˆ™\šYšYYØ]ˆÒUWÒS•QÔUSÓ”Ë™\šYšYYØ]ˆNÂŸB—×Û˜[YJÙ]ÛÝ™\˜YÙK™Ù]ÛÝ™\˜YÙHŠNÂ™[˜Ý[ÛˆÙ][Øš[]JÛYË›ÝÓ\ÈH]K››ÝÊ
K›Ýš[˜ÙRYH[
HÂˆÛÛœÝ›Ü›X[^™YÛYÈHÛYÚYžJÛYÊNÂˆÛÛœÝØ[™Y]\ÈHÒUWÒS•QÔUSÓ”Ë˜Ú]Y\Ë™š[\Š
Ú]JHOˆÚ]KœÛYÈOOH›Ü›X[^™YÛYÊNÂˆÛÛœÝ[YÜ˜][ÛˆH›Ýš[˜ÙRYÈš[™Ú]R[YÜ˜][ÛŠ›Ü›X[^™YÛYËÝš[™Ê›Ýš[˜ÙRY
KÛYÊHˆØ[™Y]\Ë›[™ÝOOHHÈØ[™Y]\ÖÌHˆ[ÂˆYˆ
Z[YÜ˜][ÛŠH™]\›ˆ[ÂˆÛÛœÝY™™XÝ]™HHY™™XÝ]™UY\‘›Ü’[YÜ˜][ÛŠ[YÜ˜][Û‹›ÝÓ\ÊNÂˆÛÛœÝ˜\™HHY™™XÝ]™K™˜\™U\ØX›HÈÈ‹‹š[YÜ˜][Û‹™˜\™KÛÝ\˜ÙNˆY™™XÝ]™K™˜\™TÛÝ\˜ÙHHˆ[ÂˆYˆ
[YÜ˜][Û‹Y\ˆOOHY™™XÝ]™KY\ŠH[Z]]™[
›[Øš[]WÜÛÝ\˜ÙWÜÝ[H‹È[™Ú[ØÛ\ÜÎˆ›[Øš[]H‹›Ýš[˜ÙWÚYˆ[YÜ˜][Û‹œ›Ýš[˜ÙWÚYØØ[]WØÛÝ™\˜YÙWÝY\ŽˆY™™XÝ]™KY\‹ÛÝ\˜ÙWÚYˆ[YÜ˜][Û‹œÛÝ\˜ÙWÚYÖÌK™\Ý[ØÛ\ÜÎˆ™YÜ˜YYˆJNÂˆ™]\›ˆÂˆÚ]Nˆ[YÜ˜][Û‹˜Ú]Kˆ›Ýš[˜ÙNˆ[YÜ˜][Û‹œ›Ýš[˜ÙKˆ›Ýš[˜ÙWÚYˆ[YÜ˜][Û‹œ›Ýš[˜ÙWÚYˆÛÛ™šYÝ\™YÝY\Žˆ[YÜ˜][Û‹Y\‹ˆY\ŽˆY™™XÝ]™KY\‹ˆÝXÝ\™YÜÝ]\ÎˆY™™XÝ]™KY\ˆOOH•ÕT”’UÔ–WÓÓ“HˆÈ•SURSP“WÒS—Õ“ÖHˆˆ[YÜ˜][Û‹œÝXÝ\™YÜÝ]\ËˆÛÝ\˜ÙWÚYÎˆY™™XÝ]™KœÛÝ\˜Ù\Ë™š[\Š]šY[˜ÙU\ØX›JK›X\

ÛÝ\˜ÙJHOˆÛÝ\˜ÙKšY
KˆÛÝ\˜Ù\ÎˆY™™XÝ]™KœÛÝ\˜Ù\Ëˆ˜\™Kˆ˜\™WÜÝ]\Îˆ[YÜ˜][Û‹™˜\™HÈ˜\™HÈÕT”‘S•Õ‘T’Q’QQˆˆ”ÕSWÕSURSP“Hˆˆ•SURSP“H‹ˆ[™Ù™œÎˆY™™XÝ]™KœØY™R[™Ù™œËˆ›Ý]Nˆ[ˆ]Nˆ[ˆ›ÝšY\—Ü™\Ù[˜ÙNˆ×BˆNÂŸB—×Û˜[YJÙ][Øš[]K™Ù][Øš[]HŠNÂ™[˜Ý[Ûˆ[Øš[]QXÚ\Ú[Û‘œ™\Ú™\ÜÊÛÝ\˜Ù\ÊHÂˆÛÛœÝ\ÝH\œ˜^Kš\Ð\œ˜^JÛÝ\˜Ù\ÊHÈÛÝ\˜Ù\Èˆ×NÂˆÛÛœÝÝ]\ÈH\Ý›X\

ÛÝ\˜ÙJHOˆÛÝ\˜ÙOË™œ™\Ú™\Ü×ÜÝ]JK™š[\Š›ÛÛX[ŠNÂˆÛÛœÝ™\šYšYYH\Ý›X\

ÛÝ\˜ÙJHOˆ]Kœ\œÙJÛÝ\˜ÙOË™\šYšYYØ]ÏÈˆŠJK™š[\Š[X™\‹š\Ñš[š]JNÂˆ]Ý]HH[šÛ›ÝÛˆŽÂˆYˆ
Ý]\Ë›[™Ý	‰ˆÝ]\Ë™]™\žJ
˜[YJHOˆ˜[YHOOH‘”‘TÒŠJHÝ]HH™œ™\ÚŽÂˆ[ÙHYˆ
Ý]\Ëš[˜ÛY\Ê‘”‘TÒŠJHÝ]HH›Z^YŽÂˆ[ÙHYˆ
Ý]\Ëš[˜ÛY\Ê”ÕSHŠJHÝ]HHœÝ[HŽÂˆ™]\›ˆÈÝ]K™\šYšYYØ]ˆ™\šYšYY›[™ÝÈ™]È]JX]›X^
‹‹™\šYšYY
JKÒTÓÔÝš[™Ê
Hˆ[NÂŸB—×Û˜[YJ[Øš[]QXÚ\Ú[Û‘œ™\Ú™\ÜË›[Øš[]QXÚ\Ú[Û‘œ™\Ú™\ÜÈŠNÂ™[˜Ý[Ûˆ[Øš[]QXÚ\Ú[Û”›Ý™[˜[˜ÙJÛÝ\˜Ù\ÊHÂˆ™]\›ˆ
\œ˜^Kš\Ð\œ˜^JÛÝ\˜Ù\ÊHÈÛÝ\˜Ù\Èˆ×JK›X\

ÛÝ\˜ÙJHOˆ
ÂˆYˆÛÝ\˜ÙKšYˆ]]Üš]NˆÛÝ\˜ÙK˜]]Üš]Kˆ]WØÛ\ÜÎˆÛÝ\˜ÙK™]WØÛ\ÜËˆØ[›ÛšXØ[Ý\›ˆÛÝ\˜ÙK˜Ø[›ÛšXØ[Ý\›ˆ™\šYšYYØ]ˆÛÝ\˜ÙK™\šYšYYØ]ˆœ™\Ú™\Ü×ÜÝ]NˆÛÝ\˜ÙK™œ™\Ú™\Ü×ÜÝ]Kˆ[[YWØÛZ[\×Ø[ÝÙYˆÛÝ\˜ÙKœ[[YWØÛZ[\×Ø[ÝÙYˆ\ÝÜÝ]NˆÛÝ\˜ÙK\ÝÜÝ]BˆJJNÂŸB—×Û˜[YJ[Øš[]QXÚ\Ú[Û”›Ý™[˜[˜ÙK›[Øš[]QXÚ\Ú[Û”›Ý™[˜[˜ÙHŠNÂ™[˜Ý[ÛˆZ[˜Z[Ý]XÐÛÛ^
\Ý[˜][Û‹›ÝÓ\ÈH]K››ÝÊ
JHÂˆYˆ
\Ý[˜][ÛË\œš]ÜžWÝ™\šYšYYOOHYJH™]\›ˆ[ÂˆÛÛœÝ™X\˜žHH™X\™\Ý˜Z[Ý][ÛœÊ\Ý[˜][ÛË˜ÛÛÜ™[˜]\ËËL”ÓÑ”ÑHŠNÂˆYˆ
[™X\˜žK›[™Ý
H™]\›ˆ[ÂˆÛÛœÝØ][ÙÔÛÝ\˜ÙHHÛÝ\˜ÙQ]šY[˜ÙJRSÔÕUP×ÔÓÕTÑKšY›ÝÓ\ÊNÂˆÛÛœÝ[™Ù™”ÛÝ\˜ÙHHÛÝ\˜ÙQ]šY[˜ÙJRSÒS‘Ñ‘—ÔÓÕTÑKšY›ÝÓ\ÊNÂˆÛÛœÝ[™Ù™”ØY™HHS‘Ñ‘—ÐSÕÓTÕš\ÊRSÒS‘Ñ‘—ÕT“
H	‰ˆ]šY[˜ÙU\ØX›J[™Ù™”ÛÝ\˜ÙJNÂˆYˆ
Z[™Ù™”ØY™JH™]\›ˆ[ÂˆÛÛœÝ˜XÝÈH™X\˜žK›X\

Ý][ÛŠHOˆ
ÂˆÚ[™ˆœ˜Z[ÜÝ][Û—Ü™Y™\™[˜ÙH‹ˆ[ÙNˆœ˜Z[‹ˆX™[ˆ‘\ÝXÚpìÛˆ™\œ›ÝšX\šXHÙ\˜Ø[˜H0­ÈØ]0è[ÙÛÈÙšXÚX[ŒŒˆ‹ˆ˜[YNˆÝ][Û‹›˜[YKˆ[™NˆÝ][Û‹›[™Kˆœ˜[˜Úˆ[ˆÜ\˜]ÜŽˆÝ][Û‹›Ü\˜]Ü‹ˆ\Ý[˜ÙWÛY]\œÎˆÝ][Û‹™\Ý[˜ÙWÛY]\œËˆØ][Ù×ÚYˆÝ][Û‹˜Ø][Ù×ÚYˆ]WØ\×ÛÙŽˆRSÔÕUSÓ—ÐÐUSÑ×ÓQUK™]WØ\×ÛÙ‹ˆÛÝ\˜ÙNˆØ][ÙÔÛÝ\˜ÙBˆJJNÂˆÛÛœÝ[™Ù™œÈHÞÂˆYˆ™[™\×Ø\™Ù[[›Ü×ÚÜ˜\š[Ü×ÛÙšXÚX[‹ˆ[ÙNˆœ˜Z[‹ˆX™[ˆÛÛœÝ[\ˆÜ˜\š[ÜË\šY˜\ÈH™XÛÜœšYÜÈÙšXÚX[\È‹ˆ\›ˆRSÒS‘Ñ‘—ÕT“ˆ™\]Z\™\×ØÛÛ™š\›X][ÛŽˆYKˆÚ[™ÛWÝ\ÙNˆYKˆÙ[™×ØÛÛÜ™Îˆ˜[ÙKˆÙ[™×Ü]Y\žNˆ˜[ÙKˆÛÝ\˜ÙNˆ[™Ù™”ÛÝ\˜ÙBˆWNÂˆ™]\›ˆÂˆÛÝ™\˜YÙNˆ”ŒWÓÑ‘’PÒPSÔÕUP×ÒS‘Ñ‘ˆ‹ˆ]˜Z[X›WÛ[Ù\Îˆ×Kˆ˜XÝËˆ[™Ù™œËˆÛÝ\˜Ù\ÎˆØØ][ÙÔÛÝ\˜ÙK[™Ù™”ÛÝ\˜ÙWK™š[\Š›ÛÛX[ŠBˆNÂŸB—×Û˜[YJZ[˜Z[Ý]XÐÛÛ^˜Z[˜Z[Ý]XÐÛÛ^ŠNÂ™[˜Ý[ÛˆZ[[Øš[]QXÚ\Ú[ÛŠ\Ý[˜][Û‹›ÝÓ\ÈH]K››ÝÊ
JHÂˆÛÛœÝ\œš]ÜžU™\šYšYYH\Ý[˜][ÛË\œš]ÜžWÝ™\šYšYYOOHYNÂˆÛÛœÝ›Ýš[˜ÙRYH\œš]ÜžU™\šYšYYÈÝš[™Ê\Ý[˜][ÛËœ›Ýš[˜ÙOËšYÏÈˆŠHˆˆŽÂˆÛÛœÝØØ[]S˜[YHH\œš]ÜžU™\šYšYYÈ^
\Ý[˜][ÛË›ØØ[]OË›˜[YJHˆˆŽÂˆÛÛœÝØØ[]TÛYÈH\œš]ÜžU™\šYšYYÈÛYÚYžJ\Ý[˜][ÛË›ØØ[]OËœÛYÈØØ[]S˜[YJHˆˆŽÂˆÛÛœÝ[YÜ˜][ÛˆH\œš]ÜžU™\šYšYY	‰ˆ›Ýš[˜ÙRY	‰ˆØØ[]S˜[YHÈš[™Ú]R[YÜ˜][ÛŠØØ[]TÛYË›Ýš[˜ÙRYØØ[]S˜[YJHˆ[ÂˆÛÛœÝ[YÜ˜][Û”ÛYÈH[YÜ˜][ÛËœÛYÈÏÈ[ÂˆÛÛœÝ[Øš[]HH[YÜ˜][Û”ÛYÈÈÙ][Øš[]J[YÜ˜][Û”ÛYË›ÝÓ\Ë›Ýš[˜ÙRY
Hˆ[ÂˆÛÛœÝ˜Z[HZ[˜Z[Ý]XÐÛÛ^
\Ý[˜][Û‹›ÝÓ\ÊNÂˆÛÛœÝ˜XÝÈH×NÂˆYˆ
[Øš[]OË™˜\™OË˜[YHOH[
H˜XÝËœ\Ú
ÂˆÚ[™ˆ™˜\™H‹ˆ[ÙNˆ˜\È‹ˆX™[ˆ[Øš[]K™˜\™KœØÛÜKˆ˜[YNˆ[Øš[]K™˜\™K˜[YKˆÝ\œ™[˜ÞNˆ[Øš[]K™˜\™K˜Ý\œ™[˜ÞHÏÈT”È‹ˆY™™XÝ]™WÙœ›ÛNˆ[Øš[]K™˜\™K™Y™™XÝ]™WÙœ›ÛHÏÈ[ˆ™\šYšYYØ]ˆ[Øš[]K™˜\™K™\šYšYYØ]ÏÈ[Øš[]K™˜\™KœÛÝ\˜ÙOË™\šYšYYØ]ÏÈ[ˆÛÝ\˜ÙNˆ[Øš[]K™˜\™KœÛÝ\˜ÙHÏÈ[ˆJNÂˆ˜XÝËœ\Ú
‹‹Š˜Z[Ë™˜XÝÈÏÈ×JJNÂˆÛÛœÝ\Ò[™Ù™œÈH
\œ˜^Kš\Ð\œ˜^J[Øš[]OËš[™Ù™œÊHÈ[Øš[]Kš[™Ù™œÈˆ×JK›X\

[™Ù™ŠHOˆ
È‹‹š[™Ù™‹[ÙNˆ˜\ÈˆJJNÂˆÛÛœÝ[™Ù™œÈHË‹‹˜\Ò[™Ù™œË‹‹Š˜Z[Ëš[™Ù™œÈÏÈ×JWNÂˆÛÛœÝ\ÐÛÝ™\˜YÙHH[Øš[]OËY\ˆÏÈ•ÕT”’UÔ–WÓÓ“HŽÂˆÛÛœÝÛÝ™\˜YÙHH\ÐÛÝ™\˜YÙHOOH•ÕT”’UÔ–WÓÓ“HˆÈ\ÐÛÝ™\˜YÙHˆ˜Z[Ë˜ÛÝ™\˜YÙHÏÈ\ÐÛÝ™\˜YÙNÂˆÛÛœÝÙ™šXÚX[XÝ[ÛœÈH[™Ù™œË›X\

[™Ù™ŠHOˆ
Âˆ\Nˆ›Ü[—ÛÙ™šXÚX[Ú[™Ù™ˆ‹ˆ[ÙNˆ[™Ù™‹›[ÙHÏÈ[ˆX™[ˆ[™Ù™‹›X™[ˆ\›ˆ[™Ù™‹\›ˆÛÝ\˜ÙNˆ[™Ù™‹œÛÝ\˜ÙHÏÈ[ˆJJNÂˆÛÛœÝ\ÙY[˜\Ù[[™PXÝ[ÛœÈH\œš]ÜžU™\šYšYYÈÂˆÈ\Nˆ˜ÛÛœÝ[Û˜]šYØ][Ûˆ‹˜]™[Û[ÙNˆ˜[œÚ]‹X™[ˆÛÛœÝ[\ˆ˜[œÜÜH0î˜›XÛÈˆKˆÈ\Nˆ˜ÛÛœÝ[Û˜]šYØ][Ûˆ‹˜]™[Û[ÙNˆØ[Ú[™È‹X™[ˆÛÛœÝ[\ˆHYHˆKˆÈ\Nˆ˜ÛÛœÝ[Û˜]šYØ][Ûˆ‹˜]™[Û[ÙNˆ˜šXÞXÛ[™È‹X™[ˆÛÛœÝ[\ˆ[ˆšXÚHˆKˆÈ\Nˆ˜ÛÛœÝ[Û˜]šYØ][Ûˆ‹˜]™[Û[ÙNˆ™š]š[™È‹X™[ˆÛÛœÝ[\ˆ[ˆ]]ÈˆBˆHˆ×NÂˆ]Ý]HH[šÛ›ÝÛˆŽÂˆYˆ
[™Ù™œË›[™Ý\ÙY[˜\Ù[[™PXÝ[ÛœË›[™Ý
HÝ]HHš[™Ù™ˆŽÂˆ[ÙHYˆ
˜XÝË›[™Ý
HÝ]HH˜]˜Z[X›HŽÂˆ[ÙHYˆ
\œš]ÜžU™\šYšYY	‰ˆZ[YÜ˜][ÛŠHÝ]HH[˜]˜Z[X›HŽÂˆÛÛœÝ]˜Z[X›S[Ù\ÈH×NÂˆYˆ
[Øš[]H	‰ˆ\ÐÛÝ™\˜YÙHOOH•ÕT”’UÔ–WÓÓ“Hˆ	‰ˆ
\Ò[™Ù™œË›[™Ý˜XÝËœÛÛYJ
˜XÝ
HOˆ˜XÝ›[ÙHOOH˜\ÈŠJJH]˜Z[X›S[Ù\Ëœ\Ú
˜\ÈŠNÂˆ›Üˆ
ÛÛœÝ[ÙHÙˆ˜Z[Ë˜]˜Z[X›WÛ[Ù\ÈÏÈ×JHYˆ
X]˜Z[X›S[Ù\Ëš[˜ÛY\Ê[ÙJJH]˜Z[X›S[Ù\Ëœ\Ú
[ÙJNÂˆÛÛœÝÛÝ\˜ÙPÛ\ÜÈH[™Ù™œË›[™Ý\ÙY[˜\Ù[[™PXÝ[ÛœË›[™ÝÈš[™Ù™ˆˆˆ[šÛ›ÝÛˆŽÂˆÛÛœÝÛÝ\˜Ù\ÈHË‹‹Š[Øš[]OËœÛÝ\˜Ù\ÈÏÈ×JK‹‹Š˜Z[ËœÛÝ\˜Ù\ÈÏÈ×JWK™š[\Š›ÛÛX[ŠNÂˆÛÛœÝ[š\]YTÛÝ\˜Ù\ÈHË‹‹›™]ÈX\
ÛÝ\˜Ù\Ë›X\

ÛÝ\˜ÙJHOˆÜÛÝ\˜ÙKšYÛÝ\˜ÙWJJK˜[Y\Ê
WNÂˆÛÛœÝ›Ý™[˜[˜ÙHH[Øš[]QXÚ\Ú[Û”›Ý™[˜[˜ÙJ[š\]YTÛÝ\˜Ù\ÊNÂˆÛÛœÝœ™\Ú™\ÜÈH[Øš[]QXÚ\Ú[Û‘œ™\Ú™\ÜÊ[š\]YTÛÝ\˜Ù\ÊNÂˆÛÛœÝ™^XÝ[ÛœÈHË‹‹›Ù™šXÚX[XÝ[ÛœË‹‹\ÙY[˜\Ù[[™PXÝ[Ûœ×NÂˆYˆ
[™^XÝ[ÛœË›[™Ý
H™^XÝ[ÛœËœ\Ú
ˆÈ\NˆšY]×ÛX\‹X™[ˆ•™\ˆXšXØXÚpìÛˆ[ˆ[X\HˆKˆÈ\Nˆœ™Yš[™WÙ\Ý[˜][Ûˆ‹X™[ˆ\œš]ÜžU™\šYšYYÈ”›Ø˜\ˆÝ›È\Ý[›Èˆˆ”™XÚ\Ø\ˆÈ›Û™\ˆH[[\ˆ[\Ý[›ÈˆBˆ
NÂˆ™]\›ˆÂˆÝ]Kˆ\Ý[˜][Û‹ˆ[YÜ˜][Û—ÜÛYÎˆ[YÜ˜][Û”ÛYËˆÛÝ™\˜YÙKˆ[ÙWØÛÝ™\˜YÙNˆÈ\Îˆ[YÜ˜][ÛˆÈ\ÐÛÝ™\˜YÙHˆ[˜Z[ˆ˜Z[Ë˜ÛÝ™\˜YÙHÏÈ[Kˆ]˜Z[X›WÛ[Ù\Îˆ]˜Z[X›S[Ù\ËˆÛÝ\˜ÙWØÛ\ÜÎˆÛÝ\˜ÙPÛ\ÜËˆœ™\Ú™\ÜËˆ›Ý™[˜[˜ÙKˆ˜XÝËˆ[™Ù™œËˆ™^ØXÝ[ÛœÎˆ™^XÝ[ÛœÂˆNÂŸB—×Û˜[YJZ[[Øš[]QXÚ\Ú[Û‹˜Z[[Øš[]QXÚ\Ú[ÛˆŠNÂ˜ÛÛœÝÐS•WÑ‘WÐ•T×ÑPÕÈHØš™XÝ™œ™Y^™JÂˆ˜\™WÜÛÝ\˜ÙNˆØš™XÝ™œ™Y^™JÂˆYˆœÜ˜×ÜØ[WÙ™WÙ˜\™WÌŒŒLMH‹ˆ]]Üš]Nˆ“][šXÚ\[YYHØ[H™H‹ˆØ[›ÛšXØ[Ý\›ˆšÎ‹ËÝ˜[œÜ\™[˜ÚXKœØ[Y™XÚ]YY™ÛÝ‹˜\‹Û›Ü›X]]˜KÙXÜ™]ËLLŒ‹È‹ˆÛÝ\˜ÙWÙ]NˆŒŒ‹LKLMH‹ˆ™\šYšYYØ]ˆŒŒ‹LKLŒ•NŒŒŒˆ‹ˆœ™\Ú™\Ü×Ý™\ÚÛÜÙXÛÛ™ÎˆNLŒˆJKˆ]šX][Ûœ×ÜÛÝ\˜ÙNˆØš™XÝ™œ™Y^™JÂˆYˆœÜ˜×ÜØ[WÙ™WÙ]šX][ÛœÈ‹ˆ]]Üš]Nˆ“][šXÚ\[YYHØ[H™H‹ˆØ[›ÛšXØ[Ý\›ˆšÎ‹ËÜØ[Y™XÚ]YY™ÛÝ‹˜\‹Ù\Ýš[ÜËÈ‹ˆÛÝ\˜ÙWÙ]NˆŒŒ‹LKLŒH‹ˆ™\šYšYYØ]ˆŒŒ‹LKLŒ•NŒŒŒˆ‚ˆJKˆ˜[œÚ]Ý\›ˆšÎ‹ËÜØ[Y™XÚ]YY™ÛÝ‹˜\‹ÜÙXÜ™]\šXKYKYÛØšY\››ËXÛÛ›Û[[Ýš[YY\ÙYÝ\šYYÚ]YY[˜KØÛÛXÝ]›ÜËÈ‹ˆ[Ù˜\™WØ\œÎˆŒLLKŒLKˆœ™\]Y[Ù˜\™WØ\œÎˆNLŸJNÂ™[˜Ý[Ûˆ\Õ™\šYšYYØ[Q™PÚ]J\Ý[˜][ÛŠHÂˆYˆ
\Ý[˜][ÛË\œš]ÜžWÝ™\šYšYYOOHYHÝš[™Ê\Ý[˜][ÛËœ›Ýš[˜ÙOËšYÏÈˆŠHOOHŽˆŠH™]\›ˆ˜[ÙNÂˆÛÛœÝÛYÈHÝš[™Ê\Ý[˜][ÛË›ØØ[]OËœÛYÈÏÈ\Ý[˜][ÛËš[YÜ˜][Û—ÜÛYÈÏÈˆŠKÓÝÙ\Ø\ÙJ
NÂˆÛÛœÝØØ[]HH›Û^
\Ý[˜][ÛË›ØØ[]OË›˜[YHÏÈˆŠNÂˆ™]\›ˆÛYÈOOHœØ[KY™HˆØØ[]HOOHœØ[H™HŽÂŸB™[˜Ý[ÛˆÛÝ\˜ÙQœ™\Ú]
ÛÝ\˜ÙK›ÝÓ\ÊHÂˆÛÛœÝ™\šYšYYH]Kœ\œÙJÛÝ\˜ÙOË™\šYšYYØ]ÏÈˆŠNÂˆÛÛœÝH[X™\ŠÛÝ\˜ÙOË™œ™\Ú™\Ü×Ý™\ÚÛÜÙXÛÛ™ÊNÂˆ™]\›ˆ[X™\‹š\Ñš[š]J™\šYšYY
H	‰ˆ[X™\‹š\Ñš[š]J
H	‰ˆˆ	‰ˆ›ÝÓ\ÈH™\šYšYY	‰ˆ›ÝÓ\ÈH™\šYšYYH
ˆLÂŸB™[˜Ý[ÛˆØ[Q™P\Ó[ÙSÜ[ÛŠ\Ý[˜][Û‹›ÝÓ\ÊHÂˆYˆ
Z\Õ™\šYšYYØ[Q™PÚ]J\Ý[˜][ÛŠJH™]\›ˆ[ÂˆÛÛœÝœ™\ÚHÛÝ\˜ÙQœ™\Ú]
ÐS•WÑ‘WÐ•T×ÑPÕË™˜\™WÜÛÝ\˜ÙK›ÝÓ\ÊNÂˆÛÛœÝ˜\™TÛÝ\˜ÙHHÈ‹‹”ÐS•WÑ‘WÐ•T×ÑPÕË™˜\™WÜÛÝ\˜ÙHNÂˆ™]\›ˆÂˆ[ÙNˆ˜\È‹ˆÙ[XÝX›Nˆ˜[ÙKˆ›Ý]WØ]˜Z[X›Nˆ˜[ÙKˆ]˜Z[Xš[]WÜÝ]Nˆœ\X[‹ˆšXÙWÜÝ]Nˆœ™\ÚÈšÛ›ÝÛˆˆˆ[šÛ›ÝÛˆ‹ˆ]WÜÝ]Nˆ››ÝÚ[YÜ˜]Y‹ˆ™X[[YWÜÝ]Nˆ››ÝÚ[YÜ˜]Y‹ˆ˜\™NˆÂˆÝ]Nˆœ™\ÚÈ˜Ý\œ™[ˆˆ[™\šYšYY‹ˆš[X\žNˆœ™\ÚÈÈX™[ˆ•\šY˜H[˜H‹Ý\œ™[˜ÞNˆT”È‹[[Ý[ˆÐS•WÑ‘WÐ•T×ÑPÕË™[Ù˜\™WØ\œÈHˆ[ˆœ™\]Y[ˆœ™\ÚÈÂˆX™[ˆ›Û]Èœ™XÝY[HØ[H™H‹ˆÝ\œ™[˜ÞNˆT”È‹ˆ[[Ý[ˆÐS•WÑ‘WÐ•T×ÑPÕË™œ™\]Y[Ù˜\™WØ\œËˆ[YÚXš[]NˆÂˆ”ÕP‘H™YÚ\Ý˜YHH›ÛXœ™HHH\œÛÛ˜H\ÝX\šXH‹ˆ™ÛZXÚ[[ÈXÛ\˜YÈ[ˆHÚ]YYHØ[H™H‹ˆœYÛÈ™\YÛÈÛÛˆÕP‘H°ë\ÚXØHÈÕP‘HYÚ][‹ˆ››È\XØHHYÛÜÈÛÛˆ\š™]HH0êXš]ËÜ°êY]Ëš[]\˜Hš\X[šHTˆ‚ˆBˆHˆ[ˆÛÝ\˜ÙNˆ˜\™TÛÝ\˜ÙBˆKˆ\ØÛÜÝ\™\ÎˆÂˆÝpè[™È\ØNˆ›È[YÜ˜YÈ‹ˆ•Y[\È™X[›È\ÜÛšX›H[ˆ“ÖH‹ˆ“H\šY˜Hœ™XÝY[H\[™HH[YÚXš[YYÈ›È\È[™XÚ[È^XÝÈHØYHšXZ™Kˆ‚ˆKˆXÝ[ÛœÎˆÂˆÈYˆœØ[WÙ™WÝÚ[—Ø\œš]™\È‹X™[ˆÛÛœÝ[\ˆÝpè[™È\ØH‹\›ˆÐS•WÑ‘WÐ•T×ÑPÕË˜[œÚ]Ý\›ÛÝ\˜ÙNˆÈYˆœÜ˜×ÜØ[WÙ™WØ\È‹]]Üš]Nˆ“][šXÚ\[YYHØ[H™H‹™\šYšYYØ]ˆÐS•WÑ‘WÐ•T×ÑPÕË™˜\™WÜÛÝ\˜ÙK™\šYšYYØ]HKˆÈYˆœØ[WÙ™WÙ]šX][ÛœÈ‹X™[ˆ•™\ˆ\Ý°ë[ÜÈÙšXÚX[\È‹\›ˆÐS•WÑ‘WÐ•T×ÑPÕË™]šX][Ûœ×ÜÛÝ\˜ÙK˜Ø[›ÛšXØ[Ý\›ÛÝ\˜ÙNˆÈ‹‹”ÐS•WÑ‘WÐ•T×ÑPÕË™]šX][Ûœ×ÜÛÝ\˜ÙHHBˆKˆ›Ý™[˜[˜ÙNˆÙ˜\™TÛÝ\˜ÙKÈ‹‹”ÐS•WÑ‘WÐ•T×ÑPÕË™]šX][Ûœ×ÜÛÝ\˜ÙHWBˆNÂŸB—×Û˜[YJ\Õ™\šYšYYØ[Q™PÚ]Kš\Õ™\šYšYYØ[Q™PÚ]HŠNÂ—×Û˜[YJÛÝ\˜ÙQœ™\Ú]œÛÝ\˜ÙQœ™\Ú]ŠNÂ—×Û˜[YJØ[Q™P\Ó[ÙSÜ[Û‹œØ[Q™P\Ó[ÙSÜ[ÛˆŠNÂ˜ÛÛœÝ“ÕUS‘×Ô“Ñ’STÈHØš™XÝ™œ™Y^™JÂˆØ[Ú[™Îˆœ›Ý]YY›ÛÝ‹ˆšXÞXÛNˆœ›Ý]YXšZÙH‹ˆ]]Îˆœ›Ý]YXØ\ˆ‚ŸJNÂ˜ÛÛœÝ“ÕUS‘×Ô“Õ’QTˆHØš™XÝ™œ™Y^™JÂˆYˆœ›Ý][™×ÛÜ[œÝ™Y]X\ÙH‹ˆ]]Üš]Nˆ‘“ÔÔÑÒTÈÈÜ[”Ý™Y]X\›Ý][™ÈÙ\šXÙH‹ˆ˜\ÙWÝ\›ˆšÎ‹ËÜ›Ý][™Ë›Ü[œÝ™Y]X\™H‹ˆ]šX][ÛŽˆ°ªHÜ[”Ý™Y]X\ÛÛšX]ÜœÈ‹ˆX^ÜœÎˆKˆ[Y[Ý]Û\ÎˆŒˆØXÚWÝÛ\ÎˆLŒˆÚ\˜ÝZ]ÛÜ[—Û\ÎˆÌŸJNÂ™[˜Ý[Ûˆ˜[Y›Ý]TÚ[
Z\ŠHÂˆ™]\›ˆ\œ˜^Kš\Ð\œ˜^JZ\ŠH	‰ˆZ\‹›[™ÝHˆ	‰ˆ[X™\‹š\Ñš[š]J[X™\ŠZ\–ÌJJH	‰ˆ[X™\‹š\Ñš[š]J[X™\ŠZ\–ÌWJJH	‰ˆ[X™\ŠZ\–ÌJHHLN	‰ˆ[X™\ŠZ\–ÌJHHN	‰ˆ[X™\ŠZ\–ÌWJHHNL	‰ˆ[X™\ŠZ\–ÌWJHHLÂŸB™[˜Ý[Ûˆ˜[Y]T›Ý]QÙ[ÛY]žJÙ[ÛY]žJHÂˆYˆ
YÙ[ÛY]žHÙ[ÛY]žK\HOOH“[™TÝš[™ÈˆP\œ˜^Kš\Ð\œ˜^JÙ[ÛY]žK˜ÛÛÜ™[˜]\ÊHÙ[ÛY]žK˜ÛÛÜ™[˜]\Ë›[™ÝˆÙ[ÛY]žK˜ÛÛÜ™[˜]\Ë›[™ÝˆŒ
H™]\›ˆ[ÂˆYˆ
YÙ[ÛY]žK˜ÛÛÜ™[˜]\Ë™]™\žJ˜[Y›Ý]TÚ[
JH™]\›ˆ[Âˆ™]\›ˆÈ\Nˆ“[™TÝš[™È‹ÛÛÜ™[˜]\ÎˆÙ[ÛY]žK˜ÛÛÜ™[˜]\Ë›X\

Z\ŠHOˆÓ[X™\ŠZ\–ÌJK[X™\ŠZ\–ÌWJWJHNÂŸB™[˜Ý[Ûˆ›Ý]PÛÛÜ™[˜]J˜[YJHÂˆÛÛœÝ]H[X™\Š˜[YOË›]
KÛˆH[X™\Š˜[YOË›ÛŠNÂˆYˆ
S[X™\‹š\Ñš[š]J]
HS[X™\‹š\Ñš[š]JÛŠH]NL]ˆLÛˆLNÛˆˆN
H™]\›ˆ[Âˆ™]\›ˆÈ]ÛˆNÂŸB™[˜Ý[Ûˆ›Ý]PØXÚRÙ^J[ÙKÜšYÚ[‹\Ý[˜][ÛŠHÂˆÛÛœÝ›Ý[™H
ŠHOˆ[X™\ŠŠKÑš^Y
JNÂˆ™]\›ˆ	Û[Ù_N‰Ü›Ý[™
ÜšYÚ[‹›]
_K	Ü›Ý[™
ÜšYÚ[‹›ÛŠ_N‰Ü›Ý[™
\Ý[˜][Û‹›]
_K	Ü›Ý[™
\Ý[˜][Û‹›ÛŠ_XÂŸB˜\Þ[˜È[˜Ý[ÛˆXÜ]Z\™S™]ÛÜšÔ›Ý]J[ÙKÜšYÚ[’[œ]\Ý[˜][Û’[œ]™]Ú[\H™]Ú›ÝÓ\ÈH]K››ÝÊ
JHÂˆÛÛœÝ›Ùš[HH“ÕUS‘×Ô“Ñ’STÖÛ[ÙWNÂˆÛÛœÝÜšYÚ[ˆH›Ý]PÛÛÜ™[˜]JÜšYÚ[’[œ]
K\Ý[˜][ÛˆH›Ý]PÛÛÜ™[˜]J\Ý[˜][Û’[œ]
NÂˆYˆ
\›Ùš[H[ÜšYÚ[ˆY\Ý[˜][ÛŠH™]\›ˆ[ÂˆÛÛœÝÛÛÜ™ÈH	ÛÜšYÚ[‹›ÛŸK	ÛÜšYÚ[‹›]NÉÙ\Ý[˜][Û‹›ÛŸK	Ù\Ý[˜][Û‹›]XÂˆÛÛœÝ\›H	Ô“ÕUS‘×Ô“Õ’QT‹˜˜\ÙWÝ\›KÉÜ›Ùš[_KÜ›Ý]KÝŒKÙš]š[™ËÉØÛÛÜ™ßOÛÝ™\šY]ÏY[	™Ù[ÛY]šY\ÏYÙ[ÚœÛÛ‰œÝ\ÏY˜[ÙXÂˆÛÛœÝÛÛ›Û\ˆH™]ÈX›ÜÛÛ›Û\Š
NÂˆÛÛœÝ[Y\ˆHÙ][Y[Ý]


HOˆÛÛ›Û\‹˜X›Ü

K“ÕUS‘×Ô“Õ’QT‹[Y[Ý]Û\ÊNÂˆžHÂˆÛÛœÝ™\ÜÛœÙHH]ØZ]™]Ú[\
\›ÈY]Ùˆ‘ÑU‹XY\œÎˆÈ•\Ù\‹PYÙ[Žˆ•“ÖKS[Øš[]KÌKŒ

ÚÎ‹ËÝ›ÞKX\œÚ[[Û™[X\ÜÛÍÛÜšÙ\œË™]‹ÊH‹XØÙ\Žˆ˜\XØ][Û‹ÚœÛÛˆˆKÚYÛ˜[ˆÛÛ›Û\‹œÚYÛ˜[JNÂˆYˆ
\™\ÜÛœÙOË›ÚÊH™]\›ˆ[ÂˆÛÛœÝ^[ØYH]ØZ]™\ÜÛœÙKšœÛÛŠ
NÂˆÛÛœÝ›Ý]HH\œ˜^Kš\Ð\œ˜^J^[ØYËœ›Ý]\ÊHÈ^[ØYœ›Ý]\ÖÌHˆ[ÂˆÛÛœÝÙ[ÛY]žHH˜[Y]T›Ý]QÙ[ÛY]žJ›Ý]OË™Ù[ÛY]žJNÂˆÛÛœÝ\Ý[˜ÙHH[X™\Š›Ý]OË™\Ý[˜ÙJNÂˆYˆ
YÙ[ÛY]žHS[X™\‹š\Ñš[š]J\Ý[˜ÙJH\Ý[˜ÙHH
H™]\›ˆ[Âˆ™]\›ˆÈÙ[ÛY]žK\Ý[˜ÙWÛNˆX]œ›Ý[™
\Ý[˜ÙJKÛÝ\˜ÙNˆ“ÕUS‘×Ô“Õ’QT‹šYÛÝ\˜ÙWØÛ\ÜÎˆ›™]ÛÜš×Ü›Ý]H‹ØœÙ\™YØ]ˆ™]È]J›ÝÓ\ÊKÒTÓÔÝš[™Ê
K]šX][ÛŽˆ“ÕUS‘×Ô“Õ’QT‹˜]šX][Û‹ØXÚWÚ]ˆ˜[ÙHNÂˆHØ]ÚÂˆ™]\›ˆ[ÂˆHš[˜[HÂˆÛX\•[Y[Ý]
[Y\ŠNÂˆBŸB—×Û˜[YJXÜ]Z\™S™]ÛÜšÔ›Ý]K˜XÜ]Z\™S™]ÛÜšÔ›Ý]HŠNÂ˜\Þ[˜È[˜Ý[ÛˆXÜ]Z\™S™]ÛÜšÔ›Ý]\Ê[Ù\ËÜšYÚ[’[œ]\Ý[˜][Û’[œ]™]Ú[\H™]Ú›ÝÓ\ÈH]K››ÝÊ
K[ˆHßJHÂˆÛÛœÝÜšYÚ[ˆH›Ý]PÛÛÜ™[˜]JÜšYÚ[’[œ]
K\Ý[˜][ÛˆH›Ý]PÛÛÜ™[˜]J\Ý[˜][Û’[œ]
NÂˆÛÛœÝ[\HH

HOˆØš™XÝ™œ›ÛQ[šY\Ê[Ù\Ë›X\

[ÙJHOˆÛ[ÙK[JJNÂˆYˆ
[ÜšYÚ[ˆY\Ý[˜][ÛŠH™]\›ˆ[\J
NÂˆYˆ
™]Ú[\OOH™]Ú
HÂˆÛÛœÝÛÛÜ™[˜]ÜˆH[Ë”“ÕUS‘×ÐÓÓÔ‘SUÔŽÂˆYˆ
XÛÛÜ™[˜]ÜËšYœ›ÛS˜[YHXÛÛÜ™[˜]ÜË™Ù]
H™]\›ˆ[\J
NÂˆžHÂˆÛÛœÝÝXˆHÛÛÜ™[˜]Ü‹™Ù]
ÛÛÜ™[˜]Ü‹šYœ›ÛS˜[YJ™ÛØ˜[ŠJNÂˆÛÛœÝ™\ÜÛœÙHH]ØZ]ÝX‹™™]Ú
šÎ‹ËÜ›Ý][™ËXÛÛÜ™[˜]Ü‹š[\›˜[Ü›Ý]\È‹ÈY]Ùˆ”ÔÕ‹XY\œÎˆÈ˜ÛÛ[]\HŽˆ˜\XØ][Û‹ÚœÛÛˆˆK›ÙNˆ”ÓÓ‹œÝš[™ÚYžJÈ[Ù\ËÜšYÚ[‹\Ý[˜][ÛˆJHJNÂˆYˆ
\™\ÜÛœÙK›ÚÊH™]\›ˆ[\J
NÂˆÛÛœÝ›ÙHH]ØZ]™\ÜÛœÙKšœÛÛŠ
NÂˆ™]\›ˆØš™XÝ™œ›ÛQ[šY\Ê[Ù\Ë›X\

[ÙJHOˆÛ[ÙK›ÙOËœ›Ý]\ÏË–Û[ÙWHÏÈ[JJNÂˆHØ]ÚÂˆ™]\›ˆ[\J
NÂˆBˆBˆÛÛœÝ›Ý]\ÈHßNÂˆ›Üˆ
ÛÛœÝ[ÙHÙˆ[Ù\ÊH›Ý]\ÖÛ[ÙWHH]ØZ]XÜ]Z\™S™]ÛÜšÔ›Ý]J[ÙKÜšYÚ[‹\Ý[˜][Û‹™]Ú[\›ÝÓ\ÊNÂˆ™]\›ˆ›Ý]\ÎÂŸB—×Û˜[YJXÜ]Z\™S™]ÛÜšÔ›Ý]\Ë˜XÜ]Z\™S™]ÛÜšÔ›Ý]\ÈŠNÂ™[˜Ý[Ûˆ›Ý]Q\Ý[˜ÙQ\Ü^J\Ý[˜ÙSJHÂˆÛÛœÝˆH[X™\Š\Ý[˜ÙSJNÂˆYˆ
S[X™\‹š\Ñš[š]JŠHˆH
H™]\›ˆ[Âˆ™]\›ˆˆLÈ	ÓX]œ›Ý[™
Š_HXˆ	ÊˆÈL
KÑš^Y
ˆLÈHˆ
_HÛXÂŸB™[˜Ý[Ûˆ›Ý]Y[ÙSÜ[ÛŠ[ÙK›Ý]KšXÙJHÂˆYˆ
\›Ý]JH™]\›ˆ[ÂˆÛÛœÝšXÙTÝ]HHšXÙHÈšÛ›ÝÛˆˆˆ[šÛ›ÝÛˆŽÂˆ™]\›ˆÂˆ[ÙKˆÙ[XÝX›NˆYKˆ›Ý]WØ]˜Z[X›NˆYKˆ]˜Z[Xš[]WÜÝ]Nˆ˜]˜Z[X›H‹ˆšXÙWÜÝ]NˆšXÙTÝ]Kˆ›Ý]NˆÈÙ[ÛY]žNˆ›Ý]K™Ù[ÛY]žKÛÝ\˜ÙNˆ›Ý]KœÛÝ\˜ÙKØœÙ\™YØ]ˆ›Ý]K›ØœÙ\™YØ]]šX][ÛŽˆ›Ý]K˜]šX][ÛˆKˆ\Ý[˜ÙWÛNˆ›Ý]K™\Ý[˜ÙWÛKˆ\Ý[˜ÙWÙ\Ü^Nˆ›Ý]Q\Ý[˜ÙQ\Ü^J›Ý]K™\Ý[˜ÙWÛJKˆšXÙNˆšXÙHÏÈ[ˆ\ØÛÜÝ\™\ÎˆÂˆ”™XÛÜœšYÈØ[Ý[YÈÛØœ™H™YÜ[”Ý™Y]X\È›È[\XØH\ÝYÈ[°è[œÚ]ÈšHY[\È\Ý[XYËˆ‹ˆ‹‹ŠšXÙTÝ]HOOH[šÛ›ÝÛˆˆÈÈ”™XÚ[È›È\ÜÛšX›H—Hˆ×JBˆKˆ›Ý™[˜[˜ÙNˆÞÈYˆ“ÕUS‘×Ô“Õ’QT‹šY]]Üš]Nˆ“ÕUS‘×Ô“Õ’QT‹˜]]Üš]K]šX][ÛŽˆ“ÕUS‘×Ô“Õ’QT‹˜]šX][ÛˆWKˆ™^ØXÝ[ÛœÎˆ×BˆNÂŸB™[˜Ý[Ûˆœ™YS[ÙSÜ[ÛŠ[ÙK›Ý]JHÂˆ™]\›ˆ›Ý]Y[ÙSÜ[ÛŠ[ÙK›Ý]K›Ý]HÈÈÝ\œ™[˜ÞNˆT”È‹[[Ý[ˆÚ[™ˆ™œ™YH‹ÛÝ\˜ÙNˆš[š[œÚX×Þ™\›×ÛX\™Ú[˜[Ù˜\™HˆHˆ[
NÂŸB™[˜Ý[Ûˆ›Û”Ù[XÝX›S[ÙJ[ÙK™X\ÛÛ‹^˜HHßJHÂˆ™]\›ˆÈ[ÙKÙ[XÝX›Nˆ˜[ÙK›Ý]WØ]˜Z[X›Nˆ˜[ÙK]˜Z[Xš[]WÜÝ]Nˆ[˜]˜Z[X›H‹šXÙWÜÝ]Nˆ[šÛ›ÝÛˆ‹™X\ÛÛ‹‹‹™^˜HNÂŸB™[˜Ý[Ûˆ]]Ó[ÙSÜ[ÛŠ›Ý]JHÂˆYˆ
\›Ý]JH™]\›ˆ›Û”Ù[XÝX›S[ÙJ˜]]È‹œ›Ý]WÝ[˜]˜Z[X›H‹ÈšXÙNˆ[\ØÛÜÝ\™\ÎˆÈ”™XÚ[È›È\ÜÛšX›H—HJNÂˆ™]\›ˆ›Ý]Y[ÙSÜ[ÛŠ˜]]È‹›Ý]K[
NÂŸB˜\Þ[˜È[˜Ý[ÛˆÛÛ\]S[Øš[]PÛÛ\]][ÛŠ^[ØY™]Ú[\H™]Ú›ÝÓ\ÈH]K››ÝÊ
K[ˆHßJHÂˆYˆ
\^[ØY\[Ùˆ^[ØYOOH›Øš™XÝŠH›ÝÈ™]È›ÞQ\œ›ÜŠ›[Øš[]WØÛÛ\]][Û—Ú[˜[Y‹
NÂˆÛÛœÝÜšYÚ[ˆH^[ØY›ÜšYÚ[‹\Ý[˜][ÛˆH^[ØY™\Ý[˜][ÛŽÂˆYˆ
\›Ý]PÛÛÜ™[˜]JÜšYÚ[Ë˜ÛÛÜ™[˜]\ÊH\›Ý]PÛÛÜ™[˜]J\Ý[˜][ÛË˜ÛÛÜ™[˜]\ÊJH›ÝÈ™]È›ÞQ\œ›ÜŠ›[Øš[]WØÛÛ\]][Û—ØÛÛÜ™[˜]\×Ü™\]Z\™Y‹
NÂˆYˆ
\Ý[˜][ÛË\œš]ÜžWÝ™\šYšYYOOHYJH›ÝÈ™]È›ÞQ\œ›ÜŠ›[Øš[]WØÛÛ\]][Û—Ù\Ý[˜][Û—Ý[™\šYšYY‹JNÂˆÛÛœÝ˜\ÙQXÚ\Ú[ÛˆHZ[[Øš[]QXÚ\Ú[ÛŠ\Ý[˜][Û‹›ÝÓ\ÊNÂˆÛÛœÝ›Ý]\ÈH]ØZ]XÜ]Z\™S™]ÛÜšÔ›Ý]\ÊÈØ[Ú[™È‹˜šXÞXÛH‹˜]]È—KÜšYÚ[‹˜ÛÛÜ™[˜]\Ë\Ý[˜][Û‹˜ÛÛÜ™[˜]\Ë™]Ú[\›ÝÓ\Ë[ŠNÂˆÛÛœÝØ[Ú[™Ô›Ý]HH›Ý]\ËØ[Ú[™ËšXÞXÛT›Ý]HH›Ý]\Ë˜šXÞXÛK]]Ô›Ý]HH›Ý]\Ë˜]]ÎÂˆÛÛœÝ[ÙSÜ[ÛœÈH×NÂˆÛÛœÝØ[Ú[™ÈHœ™YS[ÙSÜ[ÛŠØ[Ú[™È‹Ø[Ú[™Ô›Ý]JNÂˆÛÛœÝšXÞXÛHHœ™YS[ÙSÜ[ÛŠ˜šXÞXÛH‹šXÞXÛT›Ý]JNÂˆYˆ
Ø[Ú[™ÊH[ÙSÜ[ÛœËœ\Ú
Ø[Ú[™ÊNÈ[ÙH[ÙSÜ[ÛœËœ\Ú
›Û”Ù[XÝX›S[ÙJØ[Ú[™È‹œ›Ý]WÝ[˜]˜Z[X›HŠJNÂˆYˆ
šXÞXÛJH[ÙSÜ[ÛœËœ\Ú
šXÞXÛJNÈ[ÙH[ÙSÜ[ÛœËœ\Ú
›Û”Ù[XÝX›S[ÙJ˜šXÞXÛH‹œ›Ý]WÝ[˜]˜Z[X›HŠJNÂˆ[ÙSÜ[ÛœËœ\Ú
]]Ó[ÙSÜ[ÛŠ]]Ô›Ý]JJNÂˆÛÛœÝØ[Q™P\ÈHØ[Q™P\Ó[ÙSÜ[ÛŠ\Ý[˜][Û‹›ÝÓ\ÊNÂˆYˆ
Ø[Q™P\ÊH[ÙSÜ[ÛœËœ\Ú
Ø[Q™P\ÊNÂˆ[ÙHYˆ
˜\ÙQXÚ\Ú[Û‹š[YÜ˜][Û—ÜÛYÈ˜\ÙQXÚ\Ú[Û‹š[™Ù™œËœÛÛYJ

HOˆ›[ÙHOOH˜\ÈŠJH[ÙSÜ[ÛœËœ\Ú
›Û”Ù[XÝX›S[ÙJ˜\È‹œ›Ý]WØ[™Ù˜\™WÝ[˜]˜Z[X›H‹ÈšXÙNˆ[JJNÂˆYˆ

˜\ÙQXÚ\Ú[Û‹™˜XÝÈÏÈ×JKœÛÛYJ
ŠHOˆ‹›[ÙHOOHœ˜Z[ŠH
˜\ÙQXÚ\Ú[Û‹š[™Ù™œÈÏÈ×JKœÛÛYJ

HOˆ›[ÙHOOHœ˜Z[ŠJH[ÙSÜ[ÛœËœ\Ú
›Û”Ù[XÝX›S[ÙJœ˜Z[‹][Ü›Ý]WØ[™Ø\XØX›WÙ˜\™WÛ›ÝÚ›Ú[WØ]˜Z[X›H‹ÈšXÙNˆ[JJNÂˆ™]\›ˆÂˆÙ\™\—Ø]]Üš]]]™NˆYKˆ\Ý[˜][Û‹ˆÜšYÚ[ŽˆÈ‹‹›ÜšYÚ[‹X™[ˆ^
ÜšYÚ[Ë›X™[
H“ÜšYÙ[ˆˆKˆ[ÙWÛÜ[ÛœÎˆ[ÙSÜ[ÛœËˆÙ[XÝX›WÛ[Ù\Îˆ[ÙSÜ[ÛœË™š[\Š
Ü[ÛŠHOˆÜ[Û‹œÙ[XÝX›JK›X\

Ü[ÛŠHOˆÜ[Û‹›[ÙJKˆ[™›×ØXÝ[ÛœÎˆ˜\ÙQXÚ\Ú[Û‹š[™Ù™œËˆ›Ý™[˜[˜ÙNˆ˜\ÙQXÚ\Ú[Û‹œ›Ý™[˜[˜ÙKˆÛÛ\]YØ]ˆ™]È]J›ÝÓ\ÊKÒTÓÔÝš[™Ê
Kˆ˜XœšXØ]YØÛZ[\ÎˆˆNÂŸB—×Û˜[YJÛÛ\]S[Øš[]PÛÛ\]][Û‹˜ÛÛ\]S[Øš[]PÛÛ\]][ÛˆŠNÂ™[˜Ý[Ûˆ[[Y]žT˜]P[ÝÙY

HÂˆÛÛœÝ›ÝÈH]K››ÝÊ
NÂˆYˆ
][[Y]žUÚ[™ÝËœÝ\Y]›ÝÈH[[Y]žUÚ[™ÝËœÝ\Y]HSSQU–WÐÓÓ•PÕÚ[™Ý×Û\ÊHÂˆ[[Y]žUÚ[™ÝËœÝ\Y]H›ÝÎÂˆ[[Y]žUÚ[™ÝË˜ÛÝ[HÂˆBˆ[[Y]žUÚ[™ÝË˜ÛÝ[
ÏHNÂˆ™]\›ˆ[[Y]žUÚ[™ÝË˜ÛÝ[HSSQU–WÐÓÓ•PÕ›X^Ù]™[×Ü\—Ú\ÛÛ]WÝÚ[™ÝÎÂŸB—×Û˜[YJ[[Y]žT˜]P[ÝÙY[[Y]žT˜]P[ÝÙYŠNÂ™[˜Ý[Ûˆ˜[Y]U[[Y]žQ[Y[œÚ[ÛŠÙ^K˜[YJHÂˆYˆ
\[Ùˆ˜[YHOOH˜›ÛÛX[ˆŠHÂˆYˆ
Ù^HOOH˜ØXÚWÚ]Ø›ÛÛX[ˆŠH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÝ˜[YWÚ[˜[Y‹
NÂˆ™]\›ŽÂˆBˆYˆ
\[Ùˆ˜[YHOOH›[X™\ˆŠHÂˆYˆ
S[X™\‹š\Ñš[š]J˜[YJJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÝ˜[YWÚ[˜[Y‹
NÂˆ™]\›ŽÂˆBˆYˆ
\[Ùˆ˜[YHOOHœÝš[™Èˆ˜[YK›[™ÝH˜[YK›[™Ýˆ
H›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÝ˜[YWÚ[˜[Y‹
NÂˆYˆ
K×–ÐKV˜K^ŒNWËŽ‹WJÉË\Ý
˜[YJJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÝ˜[YWÚ[˜[Y‹
NÂˆYˆ
Ù^HOOHœ›Ýš[˜ÙWÚYˆ	‰ˆK×—ÌŸIË\Ý
˜[YJJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÝ˜[YWÚ[˜[Y‹
NÂˆYˆ
Ù^HOOH›ØØ[]WØÛÝ™\˜YÙWÝY\ˆˆ	‰ˆK×•ÌNWWÖÐKVŒNW×JÉË\Ý
˜[YJJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÝ˜[YWÚ[˜[Y‹
NÂˆYˆ
Ù^HOOHœÛÝ\˜ÙWÚYˆ	‰ˆK×œÜ˜×ÖØK^ŒNW×JÉË\Ý
˜[YJJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÝ˜[YWÚ[˜[Y‹
NÂˆYˆ
Ù^HOOHœÝ]\×ØÛÙWØÛ\ÜÈˆ	‰ˆK×–ÌŒÍW^	Ë\Ý
˜[YJJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÝ˜[YWÚ[˜[Y‹
NÂˆYˆ
Ù^HOOH›][˜ÞWØXÚÙ]ˆ	‰ˆVÈ›L\È‹ŒLÌŽN[\È‹ŒÌÎNN[\È‹ŒWÌÜÈ‹™ÝÜÈ—Kš[˜ÛY\Ê˜[YJJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÝ˜[YWÚ[˜[Y‹
NÂŸB—×Û˜[YJ˜[Y]U[[Y]žQ[Y[œÚ[Û‹˜[Y]U[[Y]žQ[Y[œÚ[ÛˆŠNÂ™[˜Ý[Ûˆ˜[Y]U[[Y]žT^[ØY
^[ØY
HÂˆYˆ
\^[ØY\[Ùˆ^[ØYOOH›Øš™XÝˆ\œ˜^Kš\Ð\œ˜^J^[ØY
JH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÚ[˜[Y‹
NÂˆYˆ
USSQU–WÐÓÓ•PÕ™]™[Ëš[˜ÛY\Ê^[ØY™]™[
JH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÙ]™[Û›ÝØ[ÝÙY‹
NÂˆ›Üˆ
ÛÛœÝ›Ü˜šY[ˆÙˆSSQU–WÐÓÓ•PÕ™›Ü˜šY[—ÙšY[ÊHÂˆYˆ
Øš™XÝœ›ÝÝ\Kš\ÓÝÛ”›Ü\K˜Ø[
^[ØY›Ü˜šY[ŠJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÙšY[Û›ÝØ[ÝÙY‹
NÂˆBˆÛÛœÝ[Y[œÚ[ÛœÈH^[ØY™[Y[œÚ[ÛœÈÏÈßNÂˆYˆ
\[Ùˆ[Y[œÚ[ÛœÈOOH›Øš™XÝˆ\œ˜^Kš\Ð\œ˜^J[Y[œÚ[ÛœÊJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÚ[˜[Y‹
NÂˆ›Üˆ
ÛÛœÝÚÙ^K˜[YWHÙˆØš™XÝ™[šY\Ê[Y[œÚ[ÛœÊJHÂˆYˆ
USSQU–WÐÓÓ•PÕ™[Y[œÚ[ÛœËš[˜ÛY\ÊÙ^JJH›ÝÈ™]È›ÞQ\œ›ÜŠ[[Y]žWÙ[Y[œÚ[Û—Û›ÝØ[ÝÙY‹
NÂˆ˜[Y]U[[Y]žQ[Y[œÚ[ÛŠÙ^K˜[YJNÂˆBˆ™]\›ˆÈ]™[ˆ^[ØY™]™[[Y[œÚ[ÛœÈNÂŸB—×Û˜[YJ˜[Y]U[[Y]žT^[ØY˜[Y]U[[Y]žT^[ØYŠNÂ™[˜Ý[ÛˆX[

HÂˆ™]\›ˆÂˆÚÎˆYKˆÙ\šXÙNˆ›ÞKX\‹ˆ™\œÚ[ÛŽˆ‘SPTÑWÓQUKœ™[X\ÙWÚYˆZ[Ú\Úˆ‘SPTÑWÓQUK˜Z[ÚYˆÛÝ\˜ÙWØÛÛ[Z]ˆ‘SPTÑWÓQUKœÛÝ\˜ÙWØÛÛ[Z]ˆÛÛ™šY×ÙYÙ\Ýˆ‘SPTÑWÓQUK˜ÛÛ™šY×ÙYÙ\Ýˆ™YÚ\ÝžWÙYÙ\Ýˆ‘SPTÑWÓQUKœ™YÚ\ÝžWÙYÙ\Ýˆ›Ý™[˜[˜ÙNˆ“Õ‘SSÑKˆ™X]\™\ÎˆÈ]]ˆ˜[ÙK›ÚXÙNˆ˜[ÙKZWÜ™\]Z\™Yˆ˜[ÙKØNˆYK˜][Û˜[Ý\œš]ÜžNˆYK›Ý][™ÎˆYK[Øš[]WØÛÛ\]][ÛŽˆYKX\Ü›ÝšY\ŽˆTÐÓÓ‘’QË“PTÔ“Õ’QT‹šYBˆNÂŸB—×Û˜[YJX[šX[ŠNÂ‹ËÈØ[H™HÔÎˆ[ˆÜZ[‹ÛÝ\˜ÙKX]\ÝY”ÓÓˆ™ZXÛHY\\‹‚‹ËÈ›È[™ØÝ[Y[YTÈ˜XÚÙ[™\ÈØ[YÜˆ[˜X›YžHY˜][‚˜ÛÛœÝÑ—ÑÔ×ÓPVÐQÑWÓTÏLŒÂ˜ÛÛœÝÑ—ÑÔ×ÓPVÕ‘RPÓTÏLMŽÂ˜ÛÛœÝÑ—ÑÔ×ÐÐPÒWÓTÏMLÂ›]Ù‘ÜÐØXÚO[[Â™[˜Ý[ÛˆÙ‘ÜÔÛÝ\˜ÙJ[^ßJ^ÂˆYŠ[‹•“ÖWÔÑ—ÑÔ×Ô‘UTÑWÐT“Õ‘QOOIÖQTÉÊ\™]\›ˆ[ÂˆYŠ\[Ùˆ[‹•“ÖWÔÑ—ÑÔ×Ñ‘QQÕT“OOIÜÝš[™Éß\[Ùˆ[‹•“ÖWÔÑ—ÑÔ×ÔÓÕTÑWÒQOOIÜÝš[™Éßˆ\[Ùˆ[‹•“ÖWÔÑ—ÑÔ×ÐT“Õ‘QÒÔÕOOIÜÝš[™Éß\[Ùˆ[‹•“ÖWÔÑ—ÑÔ×ÓPÑS”ÑWÕT“OOIÜÝš[™ÉÊ\™]\›ˆ[Âˆž^ÂˆÛÛœÝ\›[™]ÈT“
[‹•“ÖWÔÑ—ÑÔ×Ñ‘QQÕT“
KXÙ[œÙO[™]ÈT“
[‹•“ÖWÔÑ—ÑÔ×ÓPÑS”ÑWÕT“
NÂˆYŠ\›œ›ÝØÛÛOOIÚÎ‰ß\›šÜÝ˜[YHOOY[‹•“ÖWÔÑ—ÑÔ×ÐT“Õ‘QÒÔÕˆK×–ØK^ŒNK‹WJ×–ØK^—^Ì‹IÚK\Ý
\›šÜÝ˜[YJ_\›\Ù\›˜[Y_\›œ\ÜÝÛÜ™ˆ\›œÙX\˜Ú\›š\ÚXÙ[œÙKœ›ÝØÛÛOOIÚÎ‰ßXÙ[œÙK\Ù\›˜[Y_XÙ[œÙKœ\ÜÝÛÜ™ˆK×œÙ—ÙÜ×ÖØK^ŒNW×^Ì‹IË\Ý
[‹•“ÖWÔÑ—ÑÔ×ÔÓÕTÑWÒQ
J\™]\›ˆ[Âˆ™]\›ˆÝ\›\›ÔÝš[™Ê
KÛÝ\˜ÙWÚY™[‹•“ÖWÔÑ—ÑÔ×ÔÓÕTÑWÒQXÙ[œÙN›XÙ[œÙKÔÝš[™Ê
_NÂˆXØ]ÚÜ™]\›ˆ[BŸB™[˜Ý[Ûˆ›Ü›X[^™TÙ‘ÜÕ™ZXÛ\Ê^[ØYÛÝ\˜ÙRY›ÝÏQ]K››ÝÊ
J^ÂˆYŠ\^[ØYP\œ˜^Kš\Ð\œ˜^J^[ØY™ZXÛ\Ê_^[ØY™ZXÛ\Ë›[™ÝŒMŠ\™]\›ˆ[ÂˆÛÛœÝÙY[[™]ÈÙ]

KØœÙ\˜][ÛœÏV×NÂˆ›ÜŠÛÛœÝ][HÙˆ^[ØY™ZXÛ\Ê^ÂˆYŠZ][_\[Ùˆ][HOOIÛØš™XÝ	ÊXÛÛ[YNÂˆÛÛœÝY]\[Ùˆ][KšYOOIÜÝš[™ÉÏÚ][KšYš[J
N‰ÉÎÂˆYŠK×–ÐKV˜K^ŒNN—ËW^ÌKIË\Ý
Y
_ÙY[‹š\ÊY
JXÛÛ[YNÂˆÛÛœÝ]Z][K›]ÛZ][K›ÛŽÂˆYŠ\[Ùˆ]OOIÛ[X™\‰ß\[ÙˆÛˆOOIÛ[X™\‰ßS[X™\‹š\Ñš[š]J]
_S[X™\‹š\Ñš[š]JÛŠ_ˆ]LÌKŽM_]ˆLÌKŒßÛˆMŒKŒÛˆˆMŒŒÊXÛÛ[YNÂˆYŠ\[Ùˆ][K›ØœÙ\™YØ]OOIÜÝš[™ÉßK×—ÍKWWË\Ý
][K›ØœÙ\™YØ]
JXÛÛ[YNÂˆÛÛœÝQ]Kœ\œÙJ][K›ØœÙ\™YØ]
KYÙO[›ÝË]ÂˆYŠS[X™\‹š\Ñš[š]J
_YÙOMLYÙO”Ñ—ÑÔ×ÓPVÐQÑWÓTÊXÛÛ[YNÂˆÙY[‹˜Y
Y
NÂˆÛÛœÝØœÏ^ÚYœÛÝ\˜ÙRY
ÉÎ‰ÊÚYÛÝ\˜ÙWÚYœÛÝ\˜ÙRY]Û‹ˆ[\Ü˜[ÜÝ]N‰Ü™X[[YIËØœÙ\™YØ]›™]È]J
KÒTÓÔÝš[™Ê
KØœÙ\™YÜÜÚ][Û—ÛÛ›NY_NÂˆ›ÜŠÛÛœÝÙ^HÙˆÉÜ›Ý]WÚY	Ë	Ýš\ÚY	Ë	Û[™I×J^ÂˆYŠ\[Ùˆ][VÚÙ^WOOOIÜÝš[™ÉÉ‰š][VÚÙ^WK›[™ÝM	‰š][VÚÙ^WKš[J
JBˆØœÖÚÙ^WOZ][VÚÙ^WKš[J
NÂˆBˆØœÙ\˜][ÛœËœ\Ú
ØœÊNÂˆYŠØœÙ\˜][ÛœË›[™ÝTÑ—ÑÔ×ÓPVÕ‘RPÓTÊXœ™XZÎÂˆBˆ™]\›ˆØœÙ\˜][ÛœÎÂŸB˜\Þ[˜È[˜Ý[Ûˆ™XYØ[Q™QÜÊ[^ßK™]Ú[\Y™]Ú›ÝÏQ]K››ÝÊ
J^ÂˆÛÛœÝÛÝ\˜ÙO\Ù‘ÜÔÛÝ\˜ÙJ[ŠNÂˆYŠ\ÛÝ\˜ÙJ\™]\›ˆÛÚÎYKÝ]\Î‰Û›ÝÚ[YÜ˜]Y	ËÛÝ\˜ÙWÚY›[ØœÙ\˜][ÛœÎ–×_NÂˆÛÛœÝÙ^O\ÛÝ\˜ÙKœÛÝ\˜ÙWÚY
Éß	ÊÜÛÝ\˜ÙK\›ÂˆYŠÙ‘ÜÐØXÚOËšÙ^OOOZÙ^I‰››ÝË\Ù‘ÜÐØXÚK˜]Ñ—ÑÔ×ÐÐPÒWÓTÊ\™]\›ˆÙ‘ÜÐØXÚK˜[YNÂˆ]˜[YNÂˆž^ÂˆÛÛœÝ™\ÜÛœÙOX]ØZ]™]Ú[\
ÛÝ\˜ÙK\›ÚXY\œÎžØXØÙ\‰Ø\XØ][Û‹ÚœÛÛ‰ßK™Y\™XÝ‰Ù\œ›Ü‰ËˆÚYÛ˜[X›ÜÚYÛ˜[[Y[Ý]
L
_JNÂˆÛÛœÝZ[YO\™\ÜÛœÙKšXY\œË™Ù]
	ØÛÛ[]\IÊ_	ÉÎÂˆYŠ\™\ÜÛœÙK›ÚßK×˜\XØ][Û—ÚœÛÛŠÎŽß	
KÚK\Ý
Z[YJJBˆ›ÝÈ™]È\œ›ÜŠ	Ú[˜[YÜÛÝ\˜ÙWÜ™\ÜÛœÙIÊNÂˆÛÛœÝÛÛ[X]ØZ]™\ÜÛœÙK^

NÂˆYŠÛÛ[›[™ÝŒMŒ
]›ÝÈ™]È\œ›ÜŠ	ÜÛÝ\˜ÙWÜ™\ÜÛœÙWÝÛ×Û\™ÙIÊNÂˆÛÛœÝØœÙ\˜][ÛœÏ[›Ü›X[^™TÙ‘ÜÕ™ZXÛ\Ê”ÓÓ‹œ\œÙJÛÛ[
KÛÝ\˜ÙKœÛÝ\˜ÙWÚY›ÝÊNÂˆYŠ[ØœÙ\˜][ÛœÊ]›ÝÈ™]È\œ›ÜŠ	Ú[˜[YÜÛÝ\˜ÙWÜØÚ[XIÊNÂˆ˜[YO^ÛÚÎYKÝ]\Î›ØœÙ\˜][ÛœË›[™ÝÉÛ]™IÎ‰Û›×ØÝ\œ™[ÜÜÚ][ÛœÉËˆÛÝ\˜ÙWÚYœÛÝ\˜ÙKœÛÝ\˜ÙWÚYØœÙ\˜][ÛœßNÂˆXØ]ÚÂˆ˜[YO^ÛÚÎYKÝ]\Î‰ÜÛÝ\˜ÙWÝ[˜]˜Z[X›IËÛÝ\˜ÙWÚYœÛÝ\˜ÙKœÛÝ\˜ÙWÚYØœÙ\˜][ÛœÎ–×_NÂˆBˆÙ‘ÜÐØXÚO^ÚÙ^K]››ÝË˜[Y_NÂˆ™]\›ˆ˜[YNÂŸB˜\Þ[˜È[˜Ý[Ûˆ\T™\ÜÛœÙJ™\]Y\Ý[‹\ÊHÂˆÛÛœÝ\›H™]ÈT“
™\]Y\Ý\›
NÂˆÛÛœÝ™]Ú[\H\ÏË\Ý™X[Q™]ÚÏÈ™]ÚÂˆYˆ
\›œ]˜[YHOOH‹Ø\KÝ˜[œÚ]ÜØ[KY™KÝ™ZXÛ\ÈŠHÂˆYŠ™\]Y\Ý›Y]ÙOOH‘ÑUŠ\™]\›ˆY]Ù›Ý[ÝÙY
È‘ÑU—JNÂˆ™]\›ˆœÛÛŠ]ØZ]™XYØ[Q™QÜÊ[‹™]Ú[\
JNÂˆBˆYˆ
\›œ]˜[YHOOH‹Ø\KÚX[ŠHÂˆYˆ
™\]Y\Ý›Y]ÙOOH‘ÑUŠH™]\›ˆY]Ù›Ý[ÝÙY
È‘ÑU—JNÂˆ™]\›ˆœÛÛŠX[

JNÂˆBˆYˆ
\›œ]˜[YHOOH‹Ø\KÙ\Ý[˜][ÛœËÜÝYÙÙ\ÝŠHÂˆYˆ
™\]Y\Ý›Y]ÙOOH”ÔÕŠH™]\›ˆY]Ù›Ý[ÝÙY
È”ÔÕ—JNÂˆÛÛœÝ^[ØYH]ØZ]\œÙTÛX[œÛÛ›ÙJ™\]Y\Ý
NÂˆ™]\›ˆœÛÛŠ]ØZ]ÝYÙÙ\Ý\Ý[˜][ÛœÊ^[ØY™]Ú[\
JNÂˆBˆYˆ
\›œ]˜[YHOOH‹Ø\KÙ\Ý[˜][ÛœËÜ™\ÛÛ™HŠHÂˆYˆ
™\]Y\Ý›Y]ÙOOH”ÔÕŠH™]\›ˆY]Ù›Ý[ÝÙY
È”ÔÕ—JNÂˆÛÛœÝ^[ØYH]ØZ]\œÙTÛX[œÛÛ›ÙJ™\]Y\Ý
NÂˆ™]\›ˆœÛÛŠ]ØZ]™\ÛÛ™Q\Ý[˜][Û”Ù[XÝ[ÛŠ^[ØY™]Ú[\
JNÂˆBˆYˆ
\›œ]˜[YHOOH‹Ø\KÙ\Ý[˜][Û‹Ü™\ÛÛ™Hˆ\›œ]˜[YHOOH‹Ø\KÛÜšYÚ[‹Ü™\ÛÛ™HŠHÂˆYˆ
™\]Y\Ý›Y]ÙOOH”ÔÕŠH™]\›ˆY]Ù›Ý[ÝÙY
È”ÔÕ—JNÂˆÛÛœÝ^[ØYH]ØZ]\œÙTÛX[œÛÛ›ÙJ™\]Y\Ý
NÂˆ™]\›ˆœÛÛŠ]ØZ]™\ÛÛ™PY™\ÜÊ^[ØY™]Ú[\
JNÂˆBˆYˆ
\›œ]˜[YHOOH‹Ø\KÛØØ][Û‹Ü™]™\œÙHŠHÂˆYˆ
™\]Y\Ý›Y]ÙOOH”ÔÕŠH™]\›ˆY]Ù›Ý[ÝÙY
È”ÔÕ—JNÂˆÛÛœÝ^[ØYH]ØZ]\œÙTÛX[œÛÛ›ÙJ™\]Y\Ý
NÂˆ™]\›ˆœÛÛŠ]ØZ]™]™\œÙSØØ][ÛŠ^[ØY™]Ú[\
JNÂˆBˆYˆ
\›œ]˜[YHOOH‹Ø\KÜ˜Y\‹Ý˜Z[œËÛ™X\˜žHŠHÂˆYˆ
™\]Y\Ý›Y]ÙOOH”ÔÕŠH™]\›ˆY]Ù›Ý[ÝÙY
È”ÔÕ—JNÂˆÛÛœÝ^[ØYH]ØZ]\œÙTÛX[œÛÛ›ÙJ™\]Y\Ý
NÂˆYˆ
]˜[YÛÛÜ™[˜]\Ê^[ØY˜ÛÛÜ™[˜]\ÊJH›ÝÈ™]È›ÞQ\œ›ÜŠš[˜[YØÛÛÜ™[˜]\È‹
NÂˆYˆ
]˜Z[”˜Y\ÛÝ™\˜YÙTÝ\ÜY
^[ØY˜ÛÛÜ™[˜]\ÊJH™]\›ˆœÛÛŠÈÚÎˆYK˜Y\Žˆ[œÝ\ÜY˜Z[”˜Y\”Û˜\ÚÝ
^[ØY˜ÛÛÜ™[˜]\ÊHJNÂˆÛÛœÝ›ÝšY\”™\Ý[H]ØZ]\Ë˜Z[”Ù\šXÙPY\\‹œ™XY

NÂˆ™]\›ˆœÛÛŠÈÚÎˆYK˜Y\ŽˆZ[˜Z[”˜Y\”Û˜\ÚÝ
ÈÛÛÜ™[˜]\Îˆ^[ØY˜ÛÛÜ™[˜]\Ë›ÝšY\”™\Ý[›ÝÓ\Îˆ]K››ÝÊ
HJHJNÂˆBˆYˆ
\›œ]˜[YKœÝ\ÕÚ]
‹Ø\KØÛÝ™\˜YÙKÈŠJHÂˆYˆ
™\]Y\Ý›Y]ÙOOH‘ÑUŠH™]\›ˆY]Ù›Ý[ÝÙY
È‘ÑU—JNÂˆÛÛœÝ\ÈH\›œ]˜[YKœÜ]
‹ÈŠK™š[\Š›ÛÛX[ŠNÂˆYˆ
\Ë›[™ÝOOH
H™]\›ˆœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆ››ÝÙ›Ý[™ˆK
NÂˆÛÛœÝÛÝ™\˜YÙHHÙ]ÛÝ™\˜YÙJ\ÖÌ—KXÛÙUT’PÛÛ\Û™[
\ÖÌ×JJNÂˆ™]\›ˆÛÝ™\˜YÙHÈœÛÛŠÈÚÎˆYKÛÝ™\˜YÙHJHˆœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆ˜ÛÝ™\˜YÙWÛ›ÝÙ›Ý[™ˆK
NÂˆBˆYˆ
\›œ]˜[YHOOH‹Ø\KÛ[Øš[]KØÛÛ\]HŠHÂˆYˆ
™\]Y\Ý›Y]ÙOOH”ÔÕŠH™]\›ˆY]Ù›Ý[ÝÙY
È”ÔÕ—JNÂˆÛÛœÝ^[ØYH]ØZ]\œÙTÛX[œÛÛ›ÙJ™\]Y\Ý
NÂˆ™]\›ˆœÛÛŠÈÚÎˆYKÛÛ\]][ÛŽˆ]ØZ]ÛÛ\]S[Øš[]PÛÛ\]][ÛŠ^[ØY™]Ú[\]K››ÝÊ
K[ŠHJNÂˆBˆYˆ
\›œ]˜[YKœÝ\ÕÚ]
‹Ø\KÛ[Øš[]KÈŠJHÂˆYˆ
™\]Y\Ý›Y]ÙOOH‘ÑUŠH™]\›ˆY]Ù›Ý[ÝÙY
È‘ÑU—JNÂˆÛÛœÝÛYÈHXÛÙUT’PÛÛ\Û™[
\›œ]˜[YKœÛXÙJ‹Ø\KÛ[Øš[]KÈ‹›[™Ý
JNÂˆÛÛœÝ[Øš[]HHÙ][Øš[]JÛYÊNÂˆYˆ
[[Øš[]JH™]\›ˆœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆ›[Øš[]WÛ›ÝÚ[YÜ˜]Y‹Y\Žˆ•ÕT”’UÔ–WÓÓ“HˆK
NÂˆ[Z]]™[
›[Øš[]WÜÛÝ\˜ÙWÛÚÈ‹È[™Ú[ØÛ\ÜÎˆ›[Øš[]H‹›Ýš[˜ÙWÚYˆ[Øš[]Kœ›Ýš[˜ÙWÚYØØ[]WØÛÝ™\˜YÙWÝY\Žˆ[Øš[]KY\‹ÛÝ\˜ÙWÚYˆ[Øš[]KœÛÝ\˜ÙWÚYÖÌK™\Ý[ØÛ\ÜÎˆ˜]˜Z[X›WÛY]Y]HˆJNÂˆ™]\›ˆœÛÛŠÈÚÎˆYK[Øš[]HJNÂˆBˆYˆ
\›œ]˜[YHOOH‹Ø\KÛ[Øš[]KØÛÛ\]HŠHÂˆYˆ
™\]Y\Ý›Y]ÙOOH”ÔÕŠH™]\›ˆY]Ù›Ý[ÝÙY
È”ÔÕ—JNÂˆÛÛœÝ^[ØYH]ØZ]\œÙTÛX[œÛÛ›ÙJ™\]Y\Ý
NÂˆ™]\›ˆœÛÛŠÈÚÎˆYKÛÛ\]][ÛŽˆ]ØZ]ÛÛ\]S[Øš[]PÛÛ\]][ÛŠ^[ØY™]Ú[\]K››ÝÊ
K[ŠHJNÂˆBˆYˆ
\›œ]˜[YHOOH‹Ø\KÝ[[Y]žHŠHÂˆYˆ
™\]Y\Ý›Y]ÙOOH”ÔÕŠH™]\›ˆY]Ù›Ý[ÝÙY
È”ÔÕ—JNÂˆÛÛœÝÛÛ[\HH™\]Y\ÝšXY\œË™Ù]
˜ÛÛ[]\HŠHÏÈˆŽÂˆYˆ
K×˜\XØ][Û—ÚœÛÛŠÎ—ÊŽß	
KÚK\Ý
ÛÛ[\JJH™]\›ˆœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆ[œÝ\ÜYÛYYXWÝ\HˆKMJNÂˆÛÛœÝÜšYÚ[ˆH™\]Y\ÝšXY\œË™Ù]
›ÜšYÚ[ˆŠNÂˆYˆ
ÜšYÚ[ˆ	‰ˆÜšYÚ[ˆOOH\››ÜšYÚ[ŠH™]\›ˆœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆ˜Ü›ÜÜ×ÛÜšYÚ[—Ù›Ü˜šY[ˆˆKÊNÂˆÛÛœÝ™]ÚÚ]HH™\]Y\ÝšXY\œË™Ù]
œÙXËY™]Ú\Ú]HŠNÂˆYˆ
™]ÚÚ]H	‰ˆVÈœØ[YK[ÜšYÚ[ˆ‹››Û™H—Kš[˜ÛY\Ê™]ÚÚ]JJH™]\›ˆœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆ˜Ü›ÜÜ×ÛÜšYÚ[—Ù›Ü˜šY[ˆˆKÊNÂˆYˆ
][[Y]žT˜]P[ÝÙY

JH™]\›ˆœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆœ˜]WÛ[Z]YˆKŽJNÂˆÛÛœÝ^[ØYH]ØZ]\œÙTÛX[œÛÛ›ÙJ™\]Y\ÝSSQU–WÐÓÓ•PÕ›X^Ø›ÙWØž]\ÊNÂˆÛÛœÝ˜[Y]YH˜[Y]U[[Y]žT^[ØY
^[ØY
NÂˆ[Z]]™[
˜[Y]Y™]™[˜[Y]Y™[Y[œÚ[ÛœÊNÂˆ™]\›ˆœÛÛŠÈÚÎˆYHJNÂˆBˆ™]\›ˆœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆ››ÝÙ›Ý[™ˆK
NÂŸB—×Û˜[YJ\T™\ÜÛœÙK˜\T™\ÜÛœÙHŠNÂ™[˜Ý[ÛˆÜ™X]T™\]Y\Ý[™\Š\ÈHßJHÂˆÛÛœÝ˜Z[”Ù\šXÙPY\\ˆH\Ë˜Z[”Ù\šXÙPY\\ˆÏÈÜ™X]TØ\›ZY[ÔØÚY[YY\\ŠÈ™]Ú[\ˆ\Ë\Ý™X[Q™]ÚÏÈ™]ÚJNÂˆÛÛœÝ™\]Y\Ý\ÈHÈ‹‹™\Ë˜Z[”Ù\šXÙPY\\ˆNÂˆ™]\›ˆÊˆ×ÔT‘W×È
‹È×Û˜[YJ\Þ[˜È[˜Ý[Ûˆ[™J™\]Y\Ý[ˆHßJHÂˆÛÛœÝÝ\YH]K››ÝÊ
NÂˆÛÛœÝ\›H™]ÈT“
™\]Y\Ý\›
NÂˆ]™\ÜÛœÙNÂˆžHÂˆYˆ
\›œ]˜[YKœÝ\ÕÚ]
‹Ø\KÈŠJH™\ÜÛœÙHH]ØZ]\T™\ÜÛœÙJ™\]Y\Ý[‹™\]Y\Ý\ÊNÂˆ[ÙHYˆ
Y[‹TÔÑUÊH™\ÜÛœÙHHœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆ˜\ÜÙ]×Øš[™[™×Ý[˜]˜Z[X›HˆKLÊNÂˆ[ÙH™\ÜÛœÙHHÚ]ÙXÝ\š]J]ØZ][‹TÔÑUË™™]Ú
™\]Y\Ý
JNÂˆHØ]Ú
\œ›ÜŠHÂˆYˆ
\œ›Üˆ[œÝ[˜Ù[Ùˆ›ÞQ\œ›ÜŠH™\ÜÛœÙHHœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆ\œ›Ü‹˜ÛÙK]Z[ˆ\œ›Ü‹™]Z[ÏÈ›ÚYK\œ›Ü‹œÝ]\ÊNÂˆ[ÙHÂˆÛÛœÛÛK™\œ›ÜŠ”ÓÓ‹œÝš[™ÚYžJÈ]™[ˆš[\›˜[Ù\œ›Üˆ‹™[X\ÙWÚYˆ‘SPTÑWÓQUKœ™[X\ÙWÚY\œ›Ü—ØÛ\ÜÎˆ[š[™YˆJJNÂˆ™\ÜÛœÙHHœÛÛŠÈÚÎˆ˜[ÙK\œ›ÜŽˆš[\›˜[Ù\œ›ÜˆˆKL
NÂˆBˆBˆ[Z]]™[
œ™\]Y\ÝØÛÛ\]Y‹È[™Ú[ØÛ\ÜÎˆ\›œ]˜[YKœÝ\ÕÚ]
‹Ø\KÈŠHÈ\›œ]˜[YKœÜ]
‹ÈŠKœÛXÙJKÊKš›Ú[Š—ÈŠHˆ˜\ÜÙ]‹Ý]\×ØÛÙWØÛ\ÜÎˆÝ]\ÐÛ\ÜÊ™\ÜÛœÙKœÝ]\ÊK][˜ÞWØXÚÙ]ˆ][˜ÞPXÚÙ]
]K››ÝÊ
HHÝ\Y
HJNÂˆ™]\›ˆ™\ÜÛœÙNÂˆKš[™HŠNÂŸB—×Û˜[YJÜ™X]T™\]Y\Ý[™\‹˜Ü™X]T™\]Y\Ý[™\ˆŠNÂ˜\ˆY˜][[™\ˆHÜ™X]T™\]Y\Ý[™\Š
NÂ˜\ˆÛÜšÙ\—ÙY˜][HÈ™]ÚˆÊˆ×ÔT‘W×È
‹È×Û˜[YJ
™\]Y\Ý[ŠHOˆY˜][[™\Š™\]Y\Ý[ŠK™™]ÚŠHNÂ™^ÜÂˆ›ÛZ[˜][PÛÛÜ™[˜]Ü‹ˆ›ÞQ\œ›Ü‹ˆ›Ü›X[^™TÙ‘ÜÕ™ZXÛ\Ëˆ™XYØ[Q™QÜËˆÙ‘ÜÔÛÝ\˜ÙKˆÛ\ÜÚYžTÛÝ\˜ÙQœ™\Ú™\ÜËˆÜ™X]T™\]Y\Ý[™\‹ˆÛÜšÙ\—ÙY˜][\ÈY˜][ˆ™]ÚÙ[Ô™Y‹ˆÙ]ÛÝ™\˜YÙKˆÙ][Øš[]KˆZ[[Øš[]QXÚ\Ú[Û‹ˆÛÛ\]S[Øš[]PÛÛ\]][Û‹ˆ]Y\žS›Ü›X[^™\‹ˆÛÛ^[›™\‹ˆY\Q\Ý[˜][ÛØ[™Y]\Ëˆ˜[šÑ\Ý[˜][ÛØ[™Y]\Ëˆ™X\™\Ý˜Z[Ý][ÛœËˆ˜Z[”˜Y\ÛÝ™\˜YÙTÝ\ÜYˆZ[˜Z[”˜Y\”Û˜\ÚÝˆÜ™X]TØ\›ZY[ÔØÚY[YY\\‹ˆ\œÙTØ\›ZY[ÔØÚY[YÙ\šXÙKˆ›Ü›X[^™QÙ[Ô™Y”XÙKˆ™\ÛÛ™PY™\ÜËˆ™\ÛÛ™Q\Ý[˜][Û”Ù[XÝ[Û‹ˆ™]™\œÙSØØ][Û‹ˆÛÝ\˜ÙQ]šY[˜ÙKˆÝYÙÙ\Ý\Ý[˜][ÛœËˆ˜[Y]U[[Y]žT^[ØYŸNÂ‹ËÈÈÛÝ\˜ÙSX\[™ÕT“]ÛÜšÙ\‹šœË›X\‚