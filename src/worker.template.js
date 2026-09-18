import {OFFICIAL_GEOREF_RUNTIME_AUTHORITY_META,OFFICIAL_LOCALITY_CANON,OFFICIAL_PROVINCE_BOUNDARIES,OFFICIAL_LOCALITY_PARENT_BOUNDARIES} from './georef-authority.generated.js';
import {RAIL_STATION_CATALOG_META,RAIL_STATIONS} from './rail-stations.generated.js';

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// dist/worker/runtime-config.js
var APP_CONFIG = { "schema_version": 1, "APP_RELEASE": { "channel": "order057", "source_provenance": "CLEAN_ROOM_REPLACEMENT_DUE_TO_PROVEN_SOURCE_LOSS" }, "FEATURE_FLAGS": { "national_territory": true, "routing": false, "browser_telemetry": true, "map": true, "contextual_destination_search": true, "destination_provider_live_challenger": false, "rail_static_discovery": true, "rail_realtime": false }, "TERRITORY_SOURCE": { "id": "src_georef", "base_url": "https://apis.datos.gob.ar/georef/api/v2.0", "allowed_host": "apis.datos.gob.ar" }, "MAP_PROVIDER": { "id": "osm-standard-raster", "tile_template": "https://tile.openstreetmap.org/{z}/{x}/{y}.png", "allowed_host": "tile.openstreetmap.org", "attribution": "\xA9 OpenStreetMap contributors", "attribution_url": "https://www.openstreetmap.org/copyright", "zoom": 13, "tile_radius": 1 }, "UPSTREAM_TIMEOUTS": { "georef_ms": 3500, "destination_ms": 3500 }, "CACHE_TTLS": { "static_seconds": 604800, "registry_seconds": 3600 }, "FRESHNESS_THRESHOLDS": { "fare_seconds": 15552e3, "handoff_seconds": 7776e3 }, "TELEMETRY_SAMPLING": { "logs_head_sampling_rate": 1, "traces_head_sampling_rate": 0.1 }, "OFFICIAL_HANDOFF_ALLOWLIST": ["https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/", "https://www.rosario.gob.ar/inicio/transporte-urbano-de-pasajeros", "https://cordoba.gob.ar/tu-bondi/", "https://mendotran.mendoza.gov.ar/", "https://www.saetasalta.com.ar/", "https://buenosaires.gob.ar/gcaba_historico/innovacion/ciudadinteligente/como-llego", "https://www.ushuaia.gob.ar/recorrido-colectivos", "https://resistencia.gob.ar/recorridos-de-colectivos", "https://www.formosatuciudad.gob.ar/servicios/transporte-urbano", "https://turismo.larioja.gob.ar/comercios/rioja-bus/", "https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos"], "CSP_HOST_ALLOWLIST": ["https://tile.openstreetmap.org"], "DESTINATION_SOURCE": { "id": "photon_public_georef_verified", "base_url": "https://photon.komoot.io", "allowed_host": "photon.komoot.io", "countrycode": "AR" } };
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
  const categoryWords=new Set(["cancha","estadio","club","terminal","hospital","sanatorio","aeropuerto","airport","estacion","station","puente","bridge","universidad","facultad","shopping","mall","plaza","parque"]);
  const all=words(query);const entity=all.filter(token=>!categoryWords.has(token)&&!ROAD_QUERY_WORDS.has(token)&&!["de","del","la","las","el","los","y","en","a","al"].includes(token));const q=entity.length?entity:all;
  const primary=words(candidate.display_primary);
  if(!q.length||!primary.length)return 0;
  let hits=0;for(const token of q)if(primary.some(p=>fuzzyTokenMatch(token,p)))hits++;
  return hits/q.length;
}
__name(primaryEntityCoverage,"primaryEntityCoverage");
function roadIntentBonus(context,candidate){
  const q=words(correctCommonQueryTypos(stripExplicitCommaGeography(context.query,context.explicit_geography)));
  if(!q.length||!ROAD_QUERY_WORDS.has(q[0]))return 0;
  const types=(candidate.provider_types??[]).map(foldText);
  return types.some(type=>ROAD_PROVIDER_TYPES.has(type))?6500:-1500;
}
__name(roadIntentBonus,"roadIntentBonus");
function exactPrimaryIntentBonus(context,candidate){
  let q=correctCommonQueryTypos(stripExplicitCommaGeography(context.query,context.explicit_geography));
  q=normalizeRoadVocabulary(q).replace(/\b\d{3,6}\b/g,"").replace(/\s+/g," ").trim();
  const p=normalizeRoadVocabulary(candidate.display_primary);
  return foldText(q)&&foldText(q)===foldText(p)?1800:0;
}
__name(exactPrimaryIntentBonus,"exactPrimaryIntentBonus");
function explicitCommaLocalityIntentBonus(context,candidate){
  if(!candidateLooksLikeSettlement(candidate))return 0;
  return explicitHeadMatchesCandidateLocality(context.query,candidate,context)?12000:0;
}
__name(explicitCommaLocalityIntentBonus,"explicitCommaLocalityIntentBonus");
function rankDestinationCandidates(candidates, context) {
  const explicit = context.explicit_geography, origin = context.origin;
  const originCoords = origin?.coordinates;
  return candidates.map((candidate, index) => {
    const locality = candidateLocality(candidate), province = candidateProvince(candidate), pid = candidateProvinceId(candidate);
    const distance = candidate.distance_meters ?? haversineMeters(originCoords, candidate.coordinates);
    let score = 0;
    const entityQuery=stripExplicitCommaGeography(context.query,context.explicit_geography);
    score += tokenCoverage(entityQuery,candidate) * 6e3;
    score += tokenOrderScore(entityQuery,candidate) * 1e3;
    score += primaryEntityCoverage(entityQuery,candidate) * 3e3;
    score += roadIntentBonus(context,candidate);
    const categoryHints=QueryNormalizer(context.query).category_hints;
    if(categoryHints.length){
      const types=(candidate.provider_types??[]).map(foldText), nameHints=QueryNormalizer(candidate.display_primary).category_hints;
      const categoryMatch=categoryHints.some(h=>nameHints.includes(h)||types.some(t=>t===foldText(h)||(h==="stadium"&&["sports_centre","pitch"].includes(t))||(h==="station"&&["bus_station","bus_stop","train_station"].includes(t))||(h==="aerodrome"&&t==="airport")));
      score += categoryMatch?2200:-1200;
    }
    const exactIntentBonus=exactPrimaryIntentBonus(context,candidate);
    score += exactIntentBonus;
    if(candidateIsNamedSettlement(candidate) && foldText(candidate.display_primary)===foldText(entityQuery))score += 8000;
    const primaryFold=foldText(candidate.display_primary);
    const entityFold=foldText(entityQuery);
    if((candidate.provider_types??[]).map(foldText).includes("administrative") && /^(?:partido|departamento|provincia|municipio|municipalidad)\b/.test(primaryFold) && !/\b(?:partido|departamento|provincia|municipio|municipalidad)\b/.test(entityFold))score -= 4000;
    score += explicitCommaLocalityIntentBonus(context,candidate);
    if (explicit?.province) {
      const match = pid === explicit.province.id || foldText(province) === foldText(explicit.province.name);
      score += match ? 2e4 : -2e4;
    }
    if (explicit?.locality) {
      const localityMatch = foldText(locality) === foldText(explicit.locality.name);
      const provinceMatch = explicit?.province && (pid === explicit.province.id || foldText(province) === foldText(explicit.province.name));
      score += localityMatch ? 3e4 : provinceMatch ? -2e3 : -3e4;
    }
    if (!explicit && origin) {
      if (origin.locality && foldText(locality) === foldText(origin.locality)) score += 7e3;
      if (origin.province_id && pid === origin.province_id) score += 3e3;
      else if (origin.province && foldText(province) === foldText(origin.province)) score += 3e3;
      if (distance !== null) score -= Math.min(5e3, distance / 100);
    }
    score += Math.max(0, 800 - Number(candidate.provider_rank ?? index) * 80);
    if (candidate.confidence_class === "high") score += 500;
    else if (candidate.confidence_class === "low") score -= 500;
    return { ...candidate, distance_meters: distance, rank_score: Math.round(score * 100) / 100, _stable: index };
  }).sort((a, b) => b.rank_score - a.rank_score || Number(a.provider_rank ?? a._stable) - Number(b.provider_rank ?? b._stable) || String(a.candidate_id).localeCompare(String(b.candidate_id))).map(({ _stable, ...c }) => c);
}
__name(rankDestinationCandidates, "rankDestinationCandidates");
function cleanDisplay(primary, secondary) {
  return { display_primary: text(primary).slice(0, 160), display_secondary: text(secondary).slice(0, 180) };
}
__name(cleanDisplay, "cleanDisplay");
function normalizeGeoRefCandidates(candidates = []) {
  return candidates.map((c, i) => {
    const d = cleanDisplay(c.label, `${c.locality?.name ?? ""}${c.province?.name ? ` \xB7 ${c.province.name}` : ""}`);
    return {
      candidate_id: `georef:${text(c.source_entity_id) || i + 1}`,
      candidate_ref: `georef:${text(c.source_entity_id) || i + 1}`,
      provider: "georef_baseline",
      provider_place_id_or_ref: text(c.source_entity_id) || null,
      ...d,
      coordinates: validCoordinates(c.coordinates),
      locality: c.locality,
      province: c.province,
      provider_rank: i,
      provider_types: ["address"],
      confidence_class: "territorial",
      attribution_requirement: null,
      coverage: c.coverage,
      integration_slug: c.integration_slug
    };
  }).filter((c) => c.display_primary && c.coordinates);
}
__name(normalizeGeoRefCandidates, "normalizeGeoRefCandidates");
function publicCandidate(candidate) {
  return {
    candidate_id: candidate.candidate_id,
    candidate_ref: candidate.candidate_ref,
    provider: candidate.provider,
    display_primary: candidate.display_primary,
    display_secondary: candidate.display_secondary,
    coordinates: candidate.coordinates,
    distance_meters: candidate.distance_meters ?? null,
    provider_rank: candidate.provider_rank,
    provider_types: candidate.provider_types,
    confidence_class: candidate.confidence_class,
    attribution_requirement: candidate.attribution_requirement,
    locality: candidate.locality ?? null,
    province: candidate.province ?? null,
    territory_verified: candidate.territory_verified ?? false,
    territory_verification: candidate.territory_verification ?? "unverified",
    territory_authority: candidate.territory_authority ?? null,
    coverage: candidate.coverage ?? null,
    integration_slug: candidate.integration_slug ?? null
  };
}
__name(publicCandidate, "publicCandidate");

// dist/worker/worker.js
var PROVENANCE = "CLEAN_ROOM_REPLACEMENT_DUE_TO_PROVEN_SOURCE_LOSS";
var JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
var RETRYABLE_STATUS = /* @__PURE__ */ new Set([429, 502, 503, 504]);
var SOURCE_BY_ID = new Map(MOBILITY_SOURCES.sources.map((source) => [source.id, source]));
var RAIL_HANDOFF_URL = "https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos";
var RAIL_STATIC_SOURCE = {
  id: "src_rail_station_catalog_2022",
  authority: "Datos Argentina / ADIFSE-SOFSE",
  jurisdiction: "AR",
  canonical_url: RAIL_STATION_CATALOG_META.canonical_dataset_url,
  data_class: "OFFICIAL_STATIC_RAIL_CATALOG",
  auth_requirement: "NONE",
  freshness_threshold_seconds: 31536000,
  last_successful_verification: "2023-03-27T14:15:12Z",
  runtime_claims_allowed: true,
  trust_state: "TRUSTED_FOR_IDENTITY_GEOMETRY_ONLY"
};
var RAIL_HANDOFF_SOURCE = {
  id: "src_trenes_argentinos_handoff",
  authority: "Trenes Argentinos Operaciones / Argentina.gob.ar",
  jurisdiction: "AR",
  canonical_url: RAIL_HANDOFF_URL,
  data_class: "OFFICIAL_WEB_PAGE",
  auth_requirement: "NONE",
  freshness_threshold_seconds: 7776000,
  last_successful_verification: "2026-09-05T14:00:00Z",
  runtime_claims_allowed: true,
  trust_state: "TRUSTED_FOR_DECLARED_SCOPE"
};
SOURCE_BY_ID.set(RAIL_STATIC_SOURCE.id, RAIL_STATIC_SOURCE);
SOURCE_BY_ID.set(RAIL_HANDOFF_SOURCE.id, RAIL_HANDOFF_SOURCE);

var TRAIN_RADAR_SOURCE = Object.freeze({
  id: "src_trenes_argentinos_sarmiento_diferencial",
  authority: "Trenes Argentinos Operaciones / SOFSE",
  url: "https://www.argentina.gob.ar/noticias/el-servicio-diferencial-entre-once-haedo-moreno-de-la-linea-sarmiento-suma-servicios-los",
  published_at: "2026-08-21",
  access_method: "public_html",
  license: "CC BY 4.0 unless otherwise declared by Argentina.gob.ar"
});
var TRAIN_RADAR_CACHE_TTL_MS = 300000;
var TRAIN_RADAR_RADIUS_METERS = 8000;
var TRAIN_RADAR_STATION_NAMES = new Set(["once", "haedo", "moreno"]);

function decodeTrainSourceHtml(value) {
  return String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&aacute;/gi, "á").replace(/&eacute;/gi, "é").replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó").replace(/&uacute;/gi, "ú").replace(/&ntilde;/gi, "ñ")
    .replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}
function normalizeTrainTime(value) {
  const [h, m] = String(value).split(":");
  return `${String(Number(h)).padStart(2, "0")}:${m}`;
}
function parseSarmientoScheduledService(html, observedAt = new Date().toISOString()) {
  const plain = foldText(decodeTrainSourceHtml(html));
  if (!plain.includes("once-haedo-moreno") || !plain.includes("linea sarmiento") || !plain.includes("dias habiles")) throw new Error("rail_source_contract_invalid");
  const outbound = plain.match(/sale a las (\d{1,2}:\d{2}).{0,160}?haedo a las (\d{1,2}:\d{2}).{0,160}?moreno a las (\d{1,2}:\d{2})/);
  const inbound = plain.match(/de moreno parte a las (\d{1,2}:\d{2}).{0,160}?haedo a las (\d{1,2}:\d{2}).{0,160}?once a las (\d{1,2}:\d{2})/);
  if (!outbound || !inbound) throw new Error("rail_source_contract_invalid");
  return {
    source: TRAIN_RADAR_SOURCE,
    observed_at: observedAt,
    temporal_state: "scheduled",
    line: "Sarmiento",
    branch: "Once-Haedo-Moreno diferencial",
    service: {
      days: "weekdays",
      stations: {
        Once: [normalizeTrainTime(outbound[1]), normalizeTrainTime(inbound[3])],
        Haedo: [normalizeTrainTime(outbound[2]), normalizeTrainTime(inbound[2])],
        Moreno: [normalizeTrainTime(outbound[3]), normalizeTrainTime(inbound[1])]
      }
    }
  };
}
function createSarmientoScheduledAdapter({ fetchImpl = fetch, now = Date.now, ttlMs = TRAIN_RADAR_CACHE_TTL_MS, timeoutMs = 3500 } = {}) {
  let cached = null;
  return {
    async read() {
      const current = Number(now());
      if (cached && current - cached.fetched_at_ms <= ttlMs) return { available: true, reason: null, observation: cached.observation, cache_hit: true };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(TRAIN_RADAR_SOURCE.url, { headers: { accept: "text/html,application/xhtml+xml" }, signal: controller.signal });
        if (!response?.ok) throw new Error("rail_source_unavailable");
        const observation = parseSarmientoScheduledService(await response.text(), new Date(current).toISOString());
        cached = { fetched_at_ms: current, observation };
        return { available: true, reason: null, observation, cache_hit: false };
      } catch (error) {
        cached = null;
        return { available: false, reason: error?.message === "rail_source_contract_invalid" ? "source_contract_invalid" : "source_unavailable", observation: null, cache_hit: false };
      } finally {
        clearTimeout(timer);
      }
    }
  };
}
function buildTrainRadarSnapshot({ coordinates, providerResult, nowMs = Date.now(), freshnessMs = TRAIN_RADAR_CACHE_TTL_MS } = {}) {
  const center = validCoordinates(coordinates);
  if (!center) throw new VoyError("invalid_coordinates", 400);
  const observation = providerResult?.available ? providerResult.observation : null;
  const observedMs = Date.parse(observation?.observed_at ?? "");
  const fresh = observation && Number.isFinite(observedMs) && nowMs - observedMs <= freshnessMs && nowMs >= observedMs;
  const sourceStatus = !providerResult?.available ? "unavailable" : fresh ? "available" : "stale";
  const nearby = nearestRailStations(center, 10, TRAIN_RADAR_RADIUS_METERS, "SOFSE")
    .filter((station) => TRAIN_RADAR_STATION_NAMES.has(foldText(station.name)) && railLineIdentity(station.line) === "sarmiento")
    .slice(0, 3);
  return {
    source_status: sourceStatus,
    radius_meters: TRAIN_RADAR_RADIUS_METERS,
    source: TRAIN_RADAR_SOURCE,
    stations: nearby.map((station) => {
      const times = fresh ? observation.service.stations[station.name] ?? null : null;
      return {
        source: TRAIN_RADAR_SOURCE,
        observed_at: fresh ? observation.observed_at : null,
        temporal_state: times ? "scheduled" : "unknown",
        station: {
          id: `rail:${station.catalog_id}`,
          name: station.name,
          coordinates: { lat: station.lat, lon: station.lon },
          distance_meters: station.distance_meters,
          catalog_source: station.source_id
        },
        line: "Sarmiento",
        branch: times ? observation.branch : null,
        service: times ? { days: observation.service.days, scheduled_times: [...times] } : null
      };
    })
  };
}
var JURISDICTION_BY_ID = new Map(JURISDICTIONS.jurisdictions.map((item) => [item.province_id, item]));
var cityKey = /* @__PURE__ */ __name((provinceId, localitySlug) => `${String(provinceId ?? "")}:${String(localitySlug ?? "")}`, "cityKey");
var CITY_BY_KEY = new Map(CITY_INTEGRATIONS.cities.map((item) => [cityKey(item.province_id, item.slug), item]));
var HANDOFF_ALLOWLIST = new Set(APP_CONFIG.OFFICIAL_HANDOFF_ALLOWLIST);
var telemetryWindow = { startedAt: 0, count: 0 };
var destinationWindow = { startedAt: 0, count: 0 };
var DESTINATION_PROVIDER = DESTINATION_PROVIDERS.production_provider;
const ROUTER_QUEUE_MAX=32;
const ROUTE_CACHE_MAX=96;
const ROUTE_CACHE_SCAN_LIMIT=ROUTE_CACHE_MAX+1;
var SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "geolocation=(self), microphone=(), camera=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin"
};
var NominatimCoordinator = class {
  static { __name(this, "NominatimCoordinator"); }
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.tail = Promise.resolve();
    this.pendingAdmissions = 0;
  }
  async fetch(request) {
    if (request.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers: JSON_HEADERS });
    const payload = await request.json().catch(() => null);
    if(this.pendingAdmissions>=ROUTER_QUEUE_MAX)return new Response(JSON.stringify({ok:false,error:"router_queue_full"}),{status:503,headers:JSON_HEADERS});
    this.pendingAdmissions+=1;
    const job=this.tail.then(()=>this.route(payload));
    this.tail=job.catch(()=>null);
    try{
      const value=await job.catch(()=>null);
      return new Response(JSON.stringify(value ?? { ok: false, error: "route_unavailable" }), { status: value?.ok ? 200 : 503, headers: JSON_HEADERS });
    }finally{this.pendingAdmissions=Math.max(0,this.pendingAdmissions-1);}
  }
  async route(payload) {
    const mode = String(payload?.mode ?? "");
    const profile = ROUTING_PROFILES[mode];
    const origin = routeCoordinate(payload?.origin), destination = routeCoordinate(payload?.destination);
    if (!profile || !origin || !destination) return { ok: false, error: "invalid_route_request" };
    const key = routeCacheKey(mode, origin, destination);
    const now = Date.now();
    const cacheKey=`cache:${key}`;
    const cached = await this.state.storage.get(cacheKey);
    if (cached && now - Number(cached.stored_at) < ROUTING_PROVIDER.cache_ttl_ms) return { ok: true, route: { ...cached.value, cache_hit: true } };
    if(cached)await this.state.storage.delete(cacheKey);
    const circuitUntil = Number(await this.state.storage.get("circuit_until") ?? 0);
    if (now < circuitUntil) return { ok: false, error: "circuit_open" };
    const lastFetch = Number(await this.state.storage.get("last_fetch_at") ?? 0);
    const wait = Math.max(0, 1000 - (Date.now() - lastFetch));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    await this.state.storage.put("last_fetch_at", Date.now());
    const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const url = `${ROUTING_PROVIDER.base_url}/${profile}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ROUTING_PROVIDER.timeout_ms);
    try {
      const response = await fetch(url, { method: "GET", headers: { "User-Agent": "VOY-Mobility/1.0 (+https://voy-app.simondalmasso44.workers.dev/)", "Accept": "application/json" }, signal: controller.signal });
      if (!response.ok) {
        if (response.status >= 500 || response.status === 429) await this.state.storage.put("circuit_until", Date.now() + ROUTING_PROVIDER.circuit_open_ms);
        return { ok: false, error: `upstream_${response.status}` };
      }
      const body = await response.json();
      const candidate = Array.isArray(body?.routes) ? body.routes[0] : null;
      const geometry = validateRouteGeometry(candidate?.geometry);
      const distance = Number(candidate?.distance);
      if (!geometry || !Number.isFinite(distance) || distance <= 0) return { ok: false, error: "invalid_upstream_route" };
      const value = { geometry, distance_m: Math.round(distance), source: ROUTING_PROVIDER.id, source_class: "network_route", observed_at: new Date().toISOString(), attribution: ROUTING_PROVIDER.attribution, cache_hit: false };
      const storedAt=Date.now();
      await prunePersistentRouteCacheForInsert(this.state.storage,cacheKey,storedAt);
      await this.state.storage.put(cacheKey, { stored_at: storedAt, value });
      return { ok: true, route: value };
    } catch {
      await this.state.storage.put("circuit_until", Date.now() + ROUTING_PROVIDER.circuit_open_ms);
      return { ok: false, error: "upstream_unavailable" };
    } finally { clearTimeout(timer); }
  }
};
var VoyError = class extends Error {
  static {
    __name(this, "VoyError");
  }
  constructor(code, status = 500, detail = null) {
    super(code);
    this.name = "VoyError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
};
function withSecurity(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
__name(withSecurity, "withSecurity");
function json(body, status = 200, extraHeaders = {}) {
  return withSecurity(new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extraHeaders } }));
}
__name(json, "json");
function methodNotAllowed(allowed) {
  return json({ ok: false, error: "method_not_allowed" }, 405, { allow: allowed.join(", ") });
}
__name(methodNotAllowed, "methodNotAllowed");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");
function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}
__name(byteLength, "byteLength");
function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}
__name(normalizeText, "normalizeText");
function slugify(value) {
  return normalizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
__name(slugify, "slugify");
function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
__name(numeric, "numeric");
function validLatLon(lat, lon) {
  return lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
__name(validLatLon, "validLatLon");
function entityName(entity) {
  return normalizeText(entity?.nombre ?? entity?.name ?? entity?.nomenclatura ?? "");
}
__name(entityName, "entityName");
function entityId(entity) {
  const value = entity?.id ?? entity?.codigo ?? entity?.code;
  return value === void 0 || value === null ? null : String(value);
}
__name(entityId, "entityId");
function extractProvince(item) {
  return item?.provincia ?? item?.ubicacion?.provincia ?? item?.localidad?.provincia ?? item?.municipio?.provincia ?? null;
}
__name(extractProvince, "extractProvince");
function extractLocality(item) {
  const candidates = [
    item?.localidad,
    item?.ubicacion?.localidad,
    item?.localidad_censal,
    item?.gobierno_local,
    item?.municipio,
    item?.departamento
  ];
  return candidates.find((entity) => entityName(entity)) ?? candidates.find((entity) => entityId(entity)) ?? null;
}
__name(extractLocality, "extractLocality");
function extractCoordinates(item) {
  const location = item?.ubicacion ?? item?.centroide ?? item?.geometria?.centroide ?? item?.localidad?.centroide ?? null;
  const lat = numeric(location?.lat ?? location?.latitude ?? item?.lat ?? item?.latitude);
  const lon = numeric(location?.lon ?? location?.lng ?? location?.longitude ?? item?.lon ?? item?.lng ?? item?.longitude);
  return validLatLon(lat, lon) ? { lat, lon } : null;
}
__name(extractCoordinates, "extractCoordinates");
function findCityIntegration(localitySlug, provinceId, localityName = "") {
  const normalizedProvinceId = String(provinceId ?? "");
  const normalizedSlug = slugify(localitySlug);
  if (normalizedProvinceId === "02") return CITY_BY_KEY.get(cityKey("02", "caba")) ?? null;
  const direct = CITY_BY_KEY.get(cityKey(normalizedProvinceId, normalizedSlug));
  if (direct) return direct;
  return null;
}
__name(findCityIntegration, "findCityIntegration");
function extractLabel(item) {
  const direct = normalizeText(item?.nomenclatura ?? item?.direccion ?? item?.nombre ?? item?.label);
  if (direct) return direct;
  const street = entityName(item?.calle);
  const height = normalizeText(item?.altura?.valor ?? item?.altura);
  if (street) return [street, height].filter(Boolean).join(" ");
  return "";
}
__name(extractLabel, "extractLabel");
function normalizeGeoRefPlace(item) {
  if (!item || typeof item !== "object") return null;
  const province = extractProvince(item);
  const locality = extractLocality(item);
  const provinceName = entityName(province);
  const provinceId = entityId(province);
  const localityName = entityName(locality);
  const localityId = entityId(locality);
  const coordinates = extractCoordinates(item);
  const label = extractLabel(item) || localityName;
  if (!provinceName || !provinceId || !localityName || !label || !coordinates) return null;
  const localitySlug = slugify(localityName);
  const integration = findCityIntegration(localitySlug, provinceId, localityName);
  const jurisdiction = JURISDICTION_BY_ID.get(provinceId) ?? null;
  return {
    source_id: "src_georef",
    source_entity_id: entityId(item),
    label,
    province: { id: provinceId, name: provinceName },
    locality: { id: localityId, name: localityName, slug: localitySlug },
    coordinates,
    territory_verified: true,
    territory_verification: "full",
    territory_authority: "live_georef",
    coverage: integration ? effectiveTierForIntegration(integration).tier : "T0_TERRITORY_ONLY",
    integration_slug: integration?.slug ?? null
  };
}
__name(normalizeGeoRefPlace, "normalizeGeoRefPlace");
function normalizeDirectionCollection(payload) {
  if (!payload || typeof payload !== "object") throw new VoyError("upstream_schema_invalid", 502);
  const collections = [payload.direcciones, payload.resultados, payload.results, payload.data];
  const found = collections.find(Array.isArray);
  if (!found) throw new VoyError("upstream_schema_invalid", 502);
  const normalized = found.map(normalizeGeoRefPlace).filter(Boolean);
  if (found.length > 0 && normalized.length === 0) throw new VoyError("upstream_schema_invalid", 502);
  return normalized;
}
__name(normalizeDirectionCollection, "normalizeDirectionCollection");
function normalizeReversePayload(payload) {
  if (!payload || typeof payload !== "object") throw new VoyError("upstream_schema_invalid", 502);
  const candidates = [payload.ubicacion, ...Array.isArray(payload.ubicaciones) ? payload.ubicaciones : [], ...Array.isArray(payload.resultados) ? payload.resultados : []].filter(Boolean);
  const normalized = candidates.map(normalizeGeoRefPlace).filter(Boolean);
  if (!normalized.length) throw new VoyError("upstream_schema_invalid", 502);
  return normalized[0];
}
__name(normalizeReversePayload, "normalizeReversePayload");
function emitEvent(event, dimensions = {}) {
  if (!TELEMETRY_CONTRACT.events.includes(event)) return;
  const safe = { event, release_id: RELEASE_META.release_id, timestamp: nowIso() };
  for (const [key, value] of Object.entries(dimensions)) {
    if (TELEMETRY_CONTRACT.dimensions.includes(key) && ["string", "number", "boolean"].includes(typeof value)) safe[key] = value;
  }
  console.log(JSON.stringify(safe));
}
__name(emitEvent, "emitEvent");
function statusClass(status) {
  return status >= 500 ? "5xx" : status >= 400 ? "4xx" : status >= 300 ? "3xx" : status >= 200 ? "2xx" : "other";
}
__name(statusClass, "statusClass");
function latencyBucket(ms) {
  return ms < 100 ? "lt100ms" : ms < 300 ? "100_299ms" : ms < 1e3 ? "300_999ms" : ms < 3e3 ? "1_3s" : "gt3s";
}
__name(latencyBucket, "latencyBucket");
async function parseSmallJsonBody(request, maxBytes = 4096) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new VoyError("request_too_large", 413);
  const raw = await request.text();
  if (byteLength(raw) > maxBytes) throw new VoyError("request_too_large", 413);
  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw new VoyError("invalid_json", 400);
  }
}
__name(parseSmallJsonBody, "parseSmallJsonBody");
async function fetchGeoRef(pathname, searchParams, fetchImpl = fetch, timeoutMs = APP_CONFIG.UPSTREAM_TIMEOUTS.georef_ms) {
  if (!pathname.startsWith("/")) throw new VoyError("internal_upstream_path_invalid", 500);
  const url = new URL(`${APP_CONFIG.TERRITORY_SOURCE.base_url}${pathname}`);
  if (url.hostname !== APP_CONFIG.TERRITORY_SOURCE.allowed_host) throw new VoyError("internal_upstream_host_invalid", 500);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== void 0 && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  let lastClass = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(url.toString(), { method: "GET", headers: { accept: "application/json" }, signal: controller.signal });
    } catch (error) {
      clearTimeout(timer);
      if (error?.name === "AbortError") {
        emitEvent("upstream_timeout", { endpoint_class: "georef", result_class: "timeout" });
        throw new VoyError("external_dependency_unavailable", 503, "timeout");
      }
      throw new VoyError("external_dependency_unavailable", 503, "network_error");
    }
    clearTimeout(timer);
    if (RETRYABLE_STATUS.has(response.status)) {
      lastClass = response.status === 429 ? "rate_limited" : "upstream_5xx";
      if (response.status >= 500) emitEvent("upstream_5xx", { endpoint_class: "georef", status_code_class: "5xx" });
      if (attempt < 2) continue;
      throw new VoyError("external_dependency_unavailable", 503, lastClass);
    }
    if (!response.ok) throw new VoyError("upstream_rejected", 502, statusClass(response.status));
    const text2 = await response.text();
    if (byteLength(text2) > 262144) throw new VoyError("upstream_response_too_large", 502);
    let payload;
    try {
      payload = JSON.parse(text2);
    } catch {
      throw new VoyError("upstream_schema_invalid", 502);
    }
    return payload;
  }
  throw new VoyError("external_dependency_unavailable", 503, lastClass ?? "unknown");
}
__name(fetchGeoRef, "fetchGeoRef");
function buildResolveParams(query, province, locality) {
  const params = { direccion: query, max: 5 };
  if (province) params.provincia = province;
  if (locality) params.localidad = locality;
  return params;
}
__name(buildResolveParams, "buildResolveParams");
async function resolveAddress(payload, fetchImpl = fetch) {
  const query = normalizeText(payload?.query);
  const province = normalizeText(payload?.province);
  const locality = normalizeText(payload?.locality);
  if (query.length < 3 || query.length > 160 || province.length > 80 || locality.length > 100) throw new VoyError("invalid_query", 400);
  const upstream = await fetchGeoRef("/direcciones", buildResolveParams(query, province, locality), fetchImpl);
  const candidates = normalizeDirectionCollection(upstream);
  if (!candidates.length) {
    emitEvent("territory_resolve_unverified", { endpoint_class: "territory", result_class: "not_found" });
    return { ok: false, result_class: "unverified", error: "territory_unverified", candidates: [], requires_context: !province && !locality };
  }
  const unique = [];
  const seen = /* @__PURE__ */ new Set();
  for (const candidate of candidates) {
    const key = `${candidate.label}|${candidate.province.id}|${candidate.locality.id}|${candidate.coordinates.lat}|${candidate.coordinates.lon}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  }
  const resultClass = unique.length === 1 ? "resolved" : "ambiguous";
  emitEvent(resultClass === "resolved" ? "territory_resolve_ok" : "territory_resolve_ambiguous", { endpoint_class: "territory", province_id: unique[0].province.id, result_class: resultClass });
  return { ok: true, result_class: resultClass, candidates: unique, source: { id: "src_georef", retrieved_at: nowIso() } };
}
__name(resolveAddress, "resolveAddress");
function destinationRateAllowed() {
  const now = Date.now();
  if (!destinationWindow.startedAt || now - destinationWindow.startedAt >= 6e4) {
    destinationWindow.startedAt = now;
    destinationWindow.count = 0;
  }
  destinationWindow.count += 1;
  return destinationWindow.count <= DESTINATION_PROVIDERS.suggest_rate_limit_per_isolate_minute;
}
__name(destinationRateAllowed, "destinationRateAllowed");
function validateSessionToken(value) {
  const token = normalizeText(value);
  if (!token) return "";
  if (token.length < DESTINATION_PROVIDERS.session_token_min_chars || token.length > DESTINATION_PROVIDERS.session_token_max_chars || !/^[A-Za-z0-9_-]+$/.test(token)) throw new VoyError("invalid_session_token", 400);
  return token;
}
__name(validateSessionToken, "validateSessionToken");
function resultCountBucket(n) {
  return n === 0 ? "0" : n === 1 ? "1" : n <= 3 ? "2_3" : "4_5";
}
__name(resultCountBucket, "resultCountBucket");
function destinationContextFilters(context) {
  const explicit = context.explicit_geography;
  if (explicit?.locality || explicit?.province) return { province: explicit?.province?.name ?? "", locality: explicit?.locality?.name ?? "" };
  if (context.search_scope === "national") return { province: "", locality: "" };
  if (context.origin) return { province: context.origin.province ?? "", locality: context.search_scope === "province" ? "" : context.origin.locality ?? "" };
  return { province: "", locality: "" };
}
__name(destinationContextFilters, "destinationContextFilters");
function meaningfulDestinationTokens(query, context) {
  const stop = new Set(["de","del","la","las","el","los","y","en","a","al","av","avda","avenida","calle","ruta","autopista","bv","blvd","boulevard","bulevar","cancha","estadio","club","historico","historica","regional"]);
  const geo = new Set();
  for (const x of [context?.explicit_geography?.locality?.name, context?.explicit_geography?.province?.name]) {
    for (const w of words(x || "")) geo.add(w);
  }
  return words(query).filter((w) => !stop.has(w) && !geo.has(w) && /[a-z]/.test(w));
}
__name(meaningfulDestinationTokens, "meaningfulDestinationTokens");
function editDistance(a,b,maxDistance=Infinity){
  const x=String(a??""),y=String(b??"");
  if(x===y)return 0;
  if(Math.abs(x.length-y.length)>maxDistance)return maxDistance+1;
  let prev=Array.from({length:y.length+1},(_,i)=>i);
  for(let i=1;i<=x.length;i++){
    const cur=[i];let rowMin=i;
    for(let j=1;j<=y.length;j++){
      const v=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(x[i-1]===y[j-1]?0:1));
      cur[j]=v;rowMin=Math.min(rowMin,v);
    }
    if(rowMin>maxDistance)return maxDistance+1;
    prev=cur;
  }
  return prev[y.length];
}
__name(editDistance,"editDistance");
function editDistanceAtMostOne(a,b){return editDistance(a,b,1)<=1;}
__name(editDistanceAtMostOne,"editDistanceAtMostOne");
function fuzzyTokenMatch(a,b){
  if(a===b)return true;
  if(Math.min(a.length,b.length)>=4&&(a.startsWith(b)||b.startsWith(a)))return true;
  const allowance=Math.max(a.length,b.length)>=7&&Math.min(a.length,b.length)>=5?2:Math.min(a.length,b.length)>=4?1:0;
  return allowance>0&&editDistance(a,b,allowance)<=allowance;
}
__name(fuzzyTokenMatch,"fuzzyTokenMatch");
const DESTINATION_QUERY_LEXICON=["san","martin","sarmiento","rivadavia","velez","sarsfield","corrientes","belgrano","urquiza"];
const DESTINATION_QUERY_ABBREVIATIONS=Object.freeze({sna:"san",pal:"palacio",gral:"general"});
function correctCommonQueryTypos(value){return text(value).split(/\s+/).map(raw=>{const f=foldText(raw).replace(/[^a-z0-9]/g,"");const abbreviation=DESTINATION_QUERY_ABBREVIATIONS[f];if(abbreviation)return abbreviation;if(f.length<5)return raw;const m=DESTINATION_QUERY_LEXICON.find(x=>editDistanceAtMostOne(f,x));return m||raw;}).join(" ");}
__name(correctCommonQueryTypos,"correctCommonQueryTypos");
function explicitCommaDestinationHead(query,context){
  if(!context?.explicit_geography || !text(query).includes(","))return "";
  return text(query).split(",")[0].trim();
}
__name(explicitCommaDestinationHead,"explicitCommaDestinationHead");
function explicitHeadMatchesCandidateLocality(query,candidate,context){
  const rawHead=explicitCommaDestinationHead(query,context),locality=foldText(candidateLocality(candidate));
  const explicitLocality=context?.explicit_geography?.locality?.name;if(!rawHead||!locality||!explicitLocality)return false;
  const row=matchLocalityFragment(rawHead,context?.explicit_geography?.province?.id||'',false);
  return Boolean(row&&foldText(row.name)===foldText(explicitLocality)&&locality===foldText(explicitLocality));
}
__name(explicitHeadMatchesCandidateLocality,"explicitHeadMatchesCandidateLocality");
function candidateLooksLikeSettlement(candidate){
  const types=(candidate?.provider_types??[]).map(foldText);
  return types.some(type=>["city","town","village","hamlet","locality","municipality","administrative"].includes(type));
}
__name(candidateLooksLikeSettlement,"candidateLooksLikeSettlement");
function candidateIsNamedSettlement(candidate){
  const types=(candidate?.provider_types??[]).map(foldText);
  return types.some(type=>["city","town","village","hamlet","locality","municipality"].includes(type));
}
__name(candidateIsNamedSettlement,"candidateIsNamedSettlement");
function candidateTextPlausible(query,candidate,context){
  const explicitLocality=context?.explicit_geography?.locality?.name;
  if(explicitLocality && candidateLooksLikeSettlement(candidate) && foldText(candidateLocality(candidate))===foldText(explicitLocality))return true;
  const semanticQuery=correctCommonQueryTypos(stripExplicitCommaGeography(query,context?.explicit_geography));
  const commaExplicit=Boolean(context?.explicit_geography && text(query).includes(","));
  let tokenContext=commaExplicit?{...context,explicit_geography:null}:context;
  if(!context?.explicit_geography && candidateLooksLikeSettlement(candidate)){
    const trailingProvince=matchTrailingProvince(semanticQuery,{allowAmbiguousBuenosAires:true})||matchTrailingProvince(semanticQuery,{allowAmbiguousBuenosAires:true,allowTypo:true});
    if(trailingProvince&&candidateProvinceId(candidate)===trailingProvince.id)tokenContext={...context,explicit_geography:{province:{id:trailingProvince.id,name:trailingProvince.name}}};
  }
  const q=meaningfulDestinationTokens(semanticQuery,tokenContext);
  if(!q.length)return false;
  const primary=words([candidate.display_primary,candidate.search_text].filter(Boolean).join(" ")).map((w)=>w==="boulevard"?"bulevar":w);
  if(!primary.length)return false;
  let hits=0;
  for(const token of q){
    if(primary.some((h)=>fuzzyTokenMatch(token,h))) hits++;
  }
  const primaryMatch=q.length===1?hits===1:q.length===2?hits===2:hits>=2&&hits/q.length>=0.6;
  if(primaryMatch)return true;
  return commaExplicit && candidateLooksLikeSettlement(candidate) && explicitHeadMatchesCandidateLocality(query,candidate,context);
}
__name(candidateTextPlausible,"candidateTextPlausible");
function normalizeRoadVocabulary(value){
  return text(value).replace(/\bboulevard\b/gi,"Bulevar").replace(/\bbv\.?\b/gi,"Bulevar");
}
__name(normalizeRoadVocabulary,"normalizeRoadVocabulary");
function commaSuffixMatchesProvince(context){
  const explicit=context?.explicit_geography;
  if(!explicit?.province || !text(context?.query).includes(","))return false;
  const suffix=foldText(text(context.query).split(",").slice(1).join(",").trim());
  const row=PROVINCES.find(([id])=>id===explicit.province.id);
  return Boolean(row && (suffix===foldText(row[1]) || (row[2]??[]).some(alias=>suffix===foldText(alias))));
}
__name(commaSuffixMatchesProvince,"commaSuffixMatchesProvince");
function photonQuerySuffix(context){
  const explicit=context.explicit_geography;
  if(explicit && commaSuffixMatchesProvince(context))return explicit.province.name;
  return explicit?.locality?.name || explicit?.province?.name || (!explicit && context.search_scope==='local' ? context.origin?.locality : !explicit && context.search_scope==='province' ? context.origin?.province : '');
}
__name(photonQuerySuffix,"photonQuerySuffix");
function withPhotonSuffix(value,context){
  let q=text(value);const suffix=photonQuerySuffix(context);
  if(suffix && !foldText(q).includes(foldText(suffix)))q=`${q} ${suffix}`;
  return text(q);
}
__name(withPhotonSuffix,"withPhotonSuffix");
function photonProviderQuery(context){
  const explicit=context.explicit_geography;
  let head=stripExplicitCommaGeography(context.query,explicit);
  if(explicit?.locality && !text(context.query).includes(",")){
    const rawParts=stripTerminalCountryQualifier(context.query).split(/\s+/).filter(Boolean);
    const matched=Math.max(0,Number(explicit.matched_suffix_tokens||0));
    if(matched>0&&rawParts.length>matched){
      const entityHead=rawParts.slice(0,-matched).join(' ');
      head=`${entityHead} ${explicit.locality.name}`.trim();
    }
  }
  if(explicit?.locality && text(context.query).includes(",")){
    const foldedHead=foldText(head);
    const row=LOCALITIES.find(([name])=>foldText(name)===foldText(explicit.locality.name));
    if(row && (foldText(row[0])===foldedHead || (row[2]??[]).some(alias=>foldText(alias)===foldedHead))) head=explicit.locality.name;
  }
  const q=normalizeRoadVocabulary(correctCommonQueryTypos(head));
  const outbound=withPhotonSuffix(q,context);
  return explicit?outbound.normalize("NFD").replace(/[\u0300-\u036f]/g,""):outbound;
}
__name(photonProviderQuery,"photonProviderQuery");
function explicitHeadKnownLocality(context){
  const explicit=context?.explicit_geography;
  if(!explicit?.locality || !text(context?.query).includes(','))return false;
  const head=text(context.query).split(',')[0].trim();
  const row=matchLocalityFragment(head,explicit.province?.id||explicit.locality.province_id||'',false);
  return Boolean(row&&foldText(row.name)===foldText(explicit.locality.name));
}
__name(explicitHeadKnownLocality,"explicitHeadKnownLocality");
function photonRetryQuery(context){
  if(context.explicit_geography){
    const head=stripExplicitCommaGeography(context.query,context.explicit_geography);
    if(/\b\d{1,6}\b/.test(head)){
      const q=normalizeRoadVocabulary(correctCommonQueryTypos(head.replace(/\b\d{1,6}\b/g,'').replace(/\s+/g,' ').trim()));
      const retry=withPhotonSuffix(q,context).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if(foldText(retry)!==foldText(photonProviderQuery(context)))return retry;
    }
    const nonCommaExactSettlement=Boolean(!text(context.query).includes(',') && context.explicit_geography.locality && Number(context.explicit_geography.matched_suffix_tokens||0)>=words(stripTerminalCountryQualifier(context.query)).length);
    if(!explicitHeadKnownLocality(context) && !nonCommaExactSettlement)return null;
    const retry=normalizeRoadVocabulary(correctCommonQueryTypos(context.explicit_geography.locality.name)).normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    return foldText(retry)===foldText(photonProviderQuery(context))?null:retry;
  }
  if(context.search_scope!=="local" || !context.origin?.locality)return null;
  let q=correctCommonQueryTypos(stripExplicitCommaGeography(context.query,context.explicit_geography));
  if(/\b(?:historico|historica)\b/i.test(foldText(q)))q=q.replace(/\b(?:hist[oó]rico|hist[oó]rica)\b/gi,"").replace(/\s+/g," ").trim();
  else if(/^\s*(?:boulevard|bulevar|bv\.?)\s+/i.test(q))q=q.replace(/^\s*(?:boulevard|bulevar|bv\.?)\s+/i,"");
  else if(/\b\d{1,6}\b/.test(q))q=q.replace(/\b\d{1,6}\b/g,"").replace(/\s+/g," ").trim();
  else return null;
  q=normalizeRoadVocabulary(q);
  const retry=withPhotonSuffix(q,context);
  return foldText(retry)===foldText(photonProviderQuery(context))?null:retry;
}
__name(photonRetryQuery,"photonRetryQuery");
const SEARCH_CATEGORY_ALIASES=Object.freeze({cancha:["estadio","club"],estadio:["cancha","club"],terminal:["terminal de omnibus","estacion"],hospital:["sanatorio"],sanatorio:["hospital"],aeropuerto:["airport"],estacion:["station"],puente:["bridge"],universidad:["facultad"],facultad:["universidad"],shopping:["mall"]});
const SEARCH_CATEGORY_TYPES=Object.freeze({cancha:"stadium",estadio:"stadium",club:"stadium",terminal:"station",hospital:"hospital",sanatorio:"hospital",aeropuerto:"aerodrome",airport:"aerodrome",estacion:"station",station:"station",puente:"bridge",bridge:"bridge",universidad:"university",facultad:"university",shopping:"mall",mall:"mall"});
const SEARCH_CATEGORY_CANONICAL=Object.freeze(["cancha","estadio","terminal","hospital","sanatorio","aeropuerto","estacion","puente","universidad","facultad","shopping"]);
const SEARCH_CATEGORY_ABBREVIATIONS=Object.freeze({term:"terminal",univ:"universidad",uni:"universidad",hosp:"hospital",aero:"aeropuerto",estac:"estacion"});
function canonicalSearchCategoryToken(raw){
  const f=foldText(raw).replace(/[^a-z]/g,'');if(!f)return null;
  if(SEARCH_CATEGORY_TYPES[f])return f;if(SEARCH_CATEGORY_ABBREVIATIONS[f])return SEARCH_CATEGORY_ABBREVIATIONS[f];if(f.length<5)return null;
  const ranked=SEARCH_CATEGORY_CANONICAL.map(term=>({term,d:editDistance(f,term,2)})).filter(x=>x.d<=2).sort((a,b)=>a.d-b.d||a.term.localeCompare(b.term));
  return ranked.length&&(!ranked[1]||ranked[0].d<ranked[1].d)?ranked[0].term:null;
}
__name(canonicalSearchCategoryToken,"canonicalSearchCategoryToken");
function normalizeSearchCategoryTokens(value){return text(value).split(/\s+/).map(raw=>{const c=canonicalSearchCategoryToken(raw);return c&&c!==foldText(raw).replace(/[^a-z]/g,'')?c:raw;}).join(' ');}
__name(normalizeSearchCategoryTokens,"normalizeSearchCategoryTokens");
function QueryNormalizer(value){
  const original=text(value).replace(/\s+/g," ").trim(),semanticBase=normalizeSearchCategoryTokens(original),folded=foldText(original).replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
  const semanticFolded=foldText(semanticBase),category_hints=[...new Set(words(semanticFolded).map(w=>SEARCH_CATEGORY_TYPES[w]).filter(Boolean))],rewrite_variants=[];
  if(foldText(semanticBase)!==foldText(original))rewrite_variants.push(semanticBase);
  for(const token of words(semanticFolded)){for(const alias of SEARCH_CATEGORY_ALIASES[token]??[])rewrite_variants.push(semanticBase.replace(new RegExp(`\\b${token}\\b`,'i'),alias));}
  return {original,folded,category_hints,rewrite_variants:[...new Set(rewrite_variants)].slice(0,3)};
}
__name(QueryNormalizer,"QueryNormalizer");
function ContextPlanner(context){
  const normalized=QueryNormalizer(context?.query);const rows=[{kind:"original",query:normalized.original}];
  if(!context?.explicit_geography&&context?.origin?.locality)rows.push({kind:"local_context",query:`${normalized.original} ${context.origin.locality}${context.origin.province?` ${context.origin.province}`:""}`});
  for(const q of normalized.rewrite_variants)rows.push({kind:"semantic",query:q});
  return rows.filter((row,i,a)=>row.query&&a.findIndex(x=>foldText(x.query)===foldText(row.query))===i).slice(0,3);
}
__name(ContextPlanner,"ContextPlanner");
function destinationQueryVariants(context){
  const original=stripTerminalCountryQualifier(context.query), primary=photonProviderQuery(context), variants=[primary];
  const retry=photonRetryQuery(context);if(retry)variants.push(retry);
  const explicitLocality=context?.explicit_geography?.locality?.name||'';
  const entityText=stripExplicitCommaGeography(context.query,context.explicit_geography);
  const compactCategory=words(normalizeSearchCategoryTokens(correctCommonQueryTypos(entityText))).map(canonicalSearchCategoryToken).find(Boolean);
  const sameNameCapital=compactCategory&&!explicitLocality&&context?.explicit_geography?.province?matchLocalityFragment(context.explicit_geography.province.name,context.explicit_geography.province.id,false):null;
  const compactLocality=explicitLocality||sameNameCapital?.name||'';
  if(compactCategory&&compactLocality)variants.push(`${compactCategory} ${compactLocality}`);
  const plan=ContextPlanner(context), semantic=plan.filter(row=>row.kind==="semantic"), localPlan=plan.find(row=>row.kind==="local_context");
  for(const row of semantic){
    if(!context.explicit_geography && context.origin?.locality)variants.push(`${row.query} ${context.origin.locality}${context.origin.province?` ${context.origin.province}`:""}`);
    else variants.push(row.query);
  }
  if(localPlan)variants.push(localPlan.query);
  if(!semantic.length && foldText(original)!==foldText(primary))variants.push(original);
  const seen=new Set();return variants.map(text).filter(q=>q.length>=3).filter(q=>{const k=foldText(q);if(seen.has(k))return false;seen.add(k);return true}).slice(0,3);
}
__name(destinationQueryVariants,"destinationQueryVariants");
function dedupeDestinationCandidates(candidates){const map=new Map();for(const c of candidates){const key=c.candidate_ref||`${Number(c.coordinates?.lat).toFixed(5)},${Number(c.coordinates?.lon).toFixed(5)}:${foldText(c.display_primary)}`;const prev=map.get(key);if(!prev||Number(c.rank_score??-Infinity)>Number(prev.rank_score??-Infinity))map.set(key,c);}return [...map.values()];}
__name(dedupeDestinationCandidates,"dedupeDestinationCandidates");
function candidateMatchesExplicitGeography(candidate,context){
  const explicit=context?.explicit_geography;if(!explicit)return true;
  if(explicit.province){const pid=candidateProvinceId(candidate),province=candidateProvince(candidate);if(pid!==explicit.province.id&&foldText(province)!==foldText(explicit.province.name))return false;}
  const comma=Boolean(text(context?.query).includes(','));
  if(explicit.locality&&!comma&&foldText(candidateLocality(candidate))!==foldText(explicit.locality.name)){
    const localityPhrase=foldText(explicit.locality.name),primary=foldText(candidate.display_primary);
    const strongNamedEntity=QueryNormalizer(context.query).category_hints.length>0 && localityPhrase && (` ${primary} `).includes(` ${localityPhrase} `);
    if(!strongNamedEntity)return false;
  }
  return true;
}
__name(candidateMatchesExplicitGeography,"candidateMatchesExplicitGeography");
function candidateMatchesLocalContext(candidate,context){
  if(context.explicit_geography || context.search_scope!=="local" || !context.origin?.locality)return true;
  const localityMatch=foldText(candidate.locality?.name)===foldText(context.origin.locality);
  const provinceMatch=!context.origin.province_id || candidate.province?.id===context.origin.province_id || foldText(candidate.province?.name)===foldText(context.origin.province);
  return localityMatch&&provinceMatch;
}
__name(candidateMatchesLocalContext,"candidateMatchesLocalContext");
const LOCALITY_COARSE_FOCUS=Object.freeze({
  "82|santa fe":{lat:-31.6333,lon:-60.7},"82|rosario":{lat:-32.9468,lon:-60.6393},"14|cordoba":{lat:-31.4167,lon:-64.1833},
  "50|mendoza":{lat:-32.8895,lon:-68.8458},"66|salta":{lat:-24.7821,lon:-65.4232},"30|parana":{lat:-31.7413,lon:-60.5115},
  "82|rafaela":{lat:-31.2503,lon:-61.4867},"82|reconquista":{lat:-29.1443,lon:-59.6436},"06|san nicolas de los arroyos":{lat:-33.3358,lon:-60.2252},
  "02|ciudad autonoma de buenos aires":{lat:-34.6037,lon:-58.3816},"94|ushuaia":{lat:-54.8019,lon:-68.303},"22|resistencia":{lat:-27.4514,lon:-58.9867},
  "34|formosa":{lat:-26.1775,lon:-58.1781},"46|la rioja":{lat:-29.4131,lon:-66.8558}
});
function coarseLocalityFocus(provinceId,localityName){
  const key=`${text(provinceId)}|${foldText(localityName)}`;
  return LOCALITY_COARSE_FOCUS[key]??null;
}
__name(coarseLocalityFocus,"coarseLocalityFocus");
function destinationFocus(context){
  const explicit=context.explicit_geography;
  if(explicit){
    const locality=explicit.locality;if(!locality)return null;
    return coarseLocalityFocus(locality.province_id||explicit.province?.id,locality.name);
  }
  if(context.search_scope!=="local")return null;
  return coarseLocalityFocus(context.origin?.province_id,context.origin?.locality);
}
__name(destinationFocus,"destinationFocus");
async function fetchPhotonSuggestions(context,fetchImpl=fetch,queryOverride=null){
  const source=APP_CONFIG.DESTINATION_SOURCE;
  const url=new URL(`${source.base_url}/api`);
  if(url.hostname!==source.allowed_host)throw new VoyError("internal_upstream_host_invalid",500);
  url.searchParams.set("q",queryOverride||photonProviderQuery(context));
  url.searchParams.set("limit","12");
  url.searchParams.set("countrycode",source.countrycode);
  const focus=destinationFocus(context);
  if(focus){
    url.searchParams.set("lat",String(focus.lat));url.searchParams.set("lon",String(focus.lon));url.searchParams.set("zoom","13");url.searchParams.set("location_bias_scale","0.02");
    // Soft location bias only: never hard-bound ambiguous destination retrieval to the origin.
  }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),APP_CONFIG.UPSTREAM_TIMEOUTS.destination_ms);
  let response;
  try{response=await fetchImpl(url.toString(),{method:"GET",headers:{accept:"application/json","user-agent":"VOY/ORDER056 bounded destination discovery"},signal:controller.signal});}
  catch(error){clearTimeout(timer);throw new VoyError("external_dependency_unavailable",503,error?.name==="AbortError"?"destination_timeout":"destination_network_error");}
  clearTimeout(timer);
  if(!response.ok)throw new VoyError("external_dependency_unavailable",503,`destination_${statusClass(response.status)}`);
  const raw=await response.text();
  if(byteLength(raw)>524288)throw new VoyError("upstream_response_too_large",502);
  let payload;try{payload=JSON.parse(raw)}catch{throw new VoyError("upstream_schema_invalid",502)}
  if(!Array.isArray(payload?.features))throw new VoyError("upstream_schema_invalid",502);
  return payload.features;
}
__name(fetchPhotonSuggestions,"fetchPhotonSuggestions");
function normalizePhotonFeature(feature,index){
  const p=feature?.properties??{}, co=feature?.geometry?.coordinates;
  const coordinates=validCoordinates({lat:co?.[1],lon:co?.[0]});
  const primary=text(p.name||p.street||p.city||p.locality);
  if(!coordinates||!primary)return null;
  const locality=text(p.city||p.town||p.village||p.locality||'');
  const province=text(p.state||'');
  const ref=`photon:${text(p.osm_type||'x')}:${text(p.osm_id||index+1)}`;
  const searchText=[p.name,p.alt_name,p.official_name,p.short_name,p.operator,p.brand,p.street,p.city,p.town,p.village,p.locality].map(text).filter(Boolean).join(" ");
  return {candidate_id:ref,candidate_ref:ref,provider:"photon_georef_contextual",provider_place_id_or_ref:ref,display_primary:primary,display_secondary:[locality,province].filter(Boolean).join(" · "),search_text:searchText,coordinates,locality:{id:"",name:locality,slug:slugify(locality)},province:{id:"",name:province},provider_rank:index,provider_types:[text(p.osm_value||p.type||p.osm_key||"unknown")],confidence_class:"provider",attribution_requirement:"OpenStreetMap contributors",coverage:null,integration_slug:null};
}
__name(normalizePhotonFeature,"normalizePhotonFeature");
function canonicalDestinationLocality(territory){
  const pid=territory?.province?.id;
  const name=territory?.locality?.name||"";
  if(pid==="02")return {id:territory.locality?.id??"",name:"Ciudad Autónoma de Buenos Aires",slug:"caba"};
  if(pid==="06" && foldText(name)==="san nicolas")return {id:territory.locality?.id??"",name:"San Nicolás de los Arroyos",slug:"san-nicolas-de-los-arroyos"};
  return territory.locality;
}
__name(canonicalDestinationLocality,"canonicalDestinationLocality");
function pointInOfficialRing(lon,lat,ring){

  let inside=false;

  for(let i=0,j=ring.length-1;i<ring.length;j=i++){

    const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];

    if(((yi>lat)!==(yj>lat)) && lon<((xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;

  }

  return inside;

}

__name(pointInOfficialRing,"pointInOfficialRing");

function officialProvinceAtCoordinates(coords){

  const c=validCoordinates(coords);if(!c)return null;

  const matches=[];

  for(const [id,name,bbox,rings] of OFFICIAL_PROVINCE_BOUNDARIES){

    if(c.lon<bbox[0]||c.lat<bbox[1]||c.lon>bbox[2]||c.lat>bbox[3])continue;

    let inside=false;

    for(const ring of rings)if(pointInOfficialRing(c.lon,c.lat,ring))inside=!inside;

    if(inside)matches.push({id,name});

  }

  return matches.length===1?matches[0]:null;

}

__name(officialProvinceAtCoordinates,"officialProvinceAtCoordinates");

function localityInitialEquivalent(left,right){
  const a=words(left),b=words(right);
  if(!a.length||a.length!==b.length)return false;
  let expanded=0;
  for(let i=0;i<a.length;i++){
    if(a[i]===b[i])continue;
    if(a[i].length===1&&b[i].startsWith(a[i])){expanded++;continue;}
    if(b[i].length===1&&a[i].startsWith(b[i])){expanded++;continue;}
    return false;
  }
  return expanded>0;
}
__name(localityInitialEquivalent,"localityInitialEquivalent");

function officialLocalityCanonical(rawLocality,provinceId){

  if(!provinceId)return null;

  let locality=text(rawLocality).split(";")[0].trim();

  if(provinceId==="02")return OFFICIAL_LOCALITY_CANON["02|ciudad autonoma de buenos aires"]||"Ciudad Autónoma de Buenos Aires";

  if(foldText(locality)==="santa fe capital")locality="Santa Fe";

  if(foldText(locality)==="san nicolas")locality="San Nicolás de los Arroyos";

  const known=LOCALITIES.find(x=>foldText(x[0])===foldText(locality)||x[2]?.some(alias=>foldText(alias)===foldText(locality)));

  if(known && known[1]===provinceId)locality=known[0];

  let canonical=OFFICIAL_LOCALITY_CANON[`${provinceId}|${foldText(locality)}`]||null;
  if(!canonical){
    const initialMatches=officialLocalitySearchRows().filter(row=>row.province_id===provinceId&&localityInitialEquivalent(locality,row.name));
    const uniqueInitial=new Map();for(const row of initialMatches)uniqueInitial.set(foldText(row.name),row.name);
    if(uniqueInitial.size===1)canonical=[...uniqueInitial.values()][0];
  }
  if(!canonical && foldText(locality).length>=5){
    const fuzzy=officialLocalitySearchRows().filter(row=>row.province_id===provinceId && editDistance(foldText(locality),row.alias,1)<=1);
    const unique=new Map();for(const row of fuzzy)unique.set(foldText(row.name),row.name);
    if(unique.size===1)canonical=[...unique.values()][0];
  }
  return canonical;

}

__name(officialLocalityCanonical,"officialLocalityCanonical");

function officialLocalityParentContains(localityName,provinceId,coords){

  const key=`${provinceId}|${foldText(localityName)}`;

  if(provinceId==="02"&&key==="02|ciudad autonoma de buenos aires")return true;

  const shapes=OFFICIAL_LOCALITY_PARENT_BOUNDARIES[key];

  if(!shapes)return null;

  const c=validCoordinates(coords);if(!c)return false;

  return shapes.some(([_kind,_id,_name,bbox,rings])=>{

    if(c.lon<bbox[0]||c.lat<bbox[1]||c.lon>bbox[2]||c.lat>bbox[3])return false;

    let inside=false;

    for(const ring of rings)if(pointInOfficialRing(c.lon,c.lat,ring))inside=!inside;

    return inside;

  });

}

__name(officialLocalityParentContains,"officialLocalityParentContains");

function canonicalizePhotonTerritory(candidate,context=null){

  const providerLocality=text(candidate.locality?.name).split(";")[0].trim();

  const providerProvince=text(candidate.province?.name);

  const spatialProvince=officialProvinceAtCoordinates(candidate.coordinates);

  const province=spatialProvince?{id:spatialProvince.id,name:spatialProvince.name}:null;

  let localityInput=providerLocality;

  if(candidateLooksLikeSettlement(candidate)){
    const namedSettlement=spatialProvince?officialLocalityCanonical(candidate.display_primary,spatialProvince.id):null;
    if(namedSettlement)localityInput=namedSettlement;
    else if(!localityInput)localityInput=candidate.display_primary;
  }

  let canonicalLocality=spatialProvince?officialLocalityCanonical(localityInput,spatialProvince.id):null;

  if(!canonicalLocality&&spatialProvince&&context?.explicit_geography?.locality&&candidateLooksLikeSettlement(candidate)){
    const expectedProvinceId=context.explicit_geography.province?.id||context.explicit_geography.locality.province_id||'';
    const requested=officialLocalityCanonical(context.explicit_geography.locality.name,spatialProvince.id)||text(context.explicit_geography.locality.name);
    const primary=foldText(candidate.display_primary),target=foldText(requested);
    const namedMatch=target&&(` ${primary} `).includes(` ${target} `);
    if((!expectedProvinceId||expectedProvinceId===spatialProvince.id)&&namedMatch){
      const requestedParent=officialLocalityParentContains(requested,spatialProvince.id,candidate.coordinates);
      if(requestedParent!==false)canonicalLocality=requested;
    }
  }

  const parentCheck=canonicalLocality&&spatialProvince?officialLocalityParentContains(canonicalLocality,spatialProvince.id,candidate.coordinates):null;

  const locality=canonicalLocality&&parentCheck!==false?{id:"",name:canonicalLocality,slug:slugify(canonicalLocality)}:null;

  const fullyVerified=Boolean(province&&locality);

  const partiallyVerified=Boolean(province&&!locality);

  const integration=fullyVerified?findCityIntegration(locality.slug,province.id,locality.name):null;

  return {

    ...candidate,

    locality,

    province,

    display_secondary:[providerLocality,province?.name||providerProvince].filter(Boolean).join(" · "),

    confidence_class:fullyVerified?"official_offline_territory":partiallyVerified?"official_offline_province":"provider_unverified",

    territory_verified:fullyVerified,

    territory_verification:fullyVerified?"full":partiallyVerified?"partial":"unverified",

    territory_authority:province?"pinned_official_georef_snapshot":null,

    coverage:integration?effectiveTierForIntegration(integration).tier:"T0_TERRITORY_ONLY",

    integration_slug:integration?.slug??null

  };

}

__name(canonicalizePhotonTerritory,"canonicalizePhotonTerritory");
async function georefFallbackSuggestions(context,fetchImpl){
  const filters=destinationContextFilters(context);
  const providerQuery=stripExplicitCommaGeography(context.query,context.explicit_geography);
  const baseline=await resolveAddress({query:providerQuery,province:filters.province,locality:filters.locality},fetchImpl);
  return rankDestinationCandidates(normalizeGeoRefCandidates(baseline.candidates??[]).filter(c=>candidateTextPlausible(context.query,c,context)),context).slice(0,DESTINATION_PROVIDERS.max_initial_suggestions);
}
__name(georefFallbackSuggestions,"georefFallbackSuggestions");
async function suggestDestinations(payload, fetchImpl = fetch) {
  const context=buildDestinationContext(payload), query=context.query;
  if(query.length<DESTINATION_PROVIDERS.query_min_chars||query.length>DESTINATION_PROVIDERS.query_max_chars)throw new VoyError("invalid_query",400);
  validateSessionToken(context.session_token);
  if(!destinationRateAllowed())throw new VoyError("rate_limited",429);
  let ranked=[],fallbackStage=context.search_scope==='national'?'national':context.search_scope==='province'?'province':'local';
  try{
    const normalizeBatch=(features)=>features.map(normalizePhotonFeature).filter(Boolean).map(c=>canonicalizePhotonTerritory(c,context)).filter(c=>candidateTextPlausible(query,c,context)).filter(c=>candidateMatchesExplicitGeography(c,context));
    const variants=destinationQueryVariants(context);
    let verified=[];
    for(const variant of variants){
      try{verified.push(...normalizeBatch(await fetchPhotonSuggestions(context,fetchImpl,variant)))}catch(error){if(!verified.length)throw error;}
    }
    verified=dedupeDestinationCandidates(verified);
    ranked=rankDestinationCandidates(verified,context).slice(0,DESTINATION_PROVIDERS.max_initial_suggestions);
  }catch(error){emitEvent("destination_suggest_error",{endpoint_class:"destination",provider_id:DESTINATION_PROVIDER,error_class:error?.code??"upstream",outcome_class:"fallback"});}
  if(!ranked.length){
    try{ranked=await georefFallbackSuggestions(context,fetchImpl)}catch{}
  }
  emitEvent(ranked.length?"destination_suggest_ok":"destination_suggest_empty",{endpoint_class:"destination",provider_id:DESTINATION_PROVIDER,result_count_bucket:resultCountBucket(ranked.length),fallback_stage:fallbackStage,outcome_class:ranked.length?"results":"empty"});
  return {ok:true,provider:DESTINATION_PROVIDER,result_class:ranked.length?"suggestions":"unverified",suggestions:ranked.map(publicCandidate),requires_national_expansion:!ranked.length&&context.search_scope!=="national",fallback_stage:fallbackStage};
}
__name(suggestDestinations, "suggestDestinations");
async function resolveDestinationSelection(payload, fetchImpl = fetch) {
  validateSessionToken(payload?.session_token);
  const ref = normalizeText(payload?.candidate_ref);
  if (!/^(?:georef|photon):[A-Za-z0-9._:-]{1,120}$/.test(ref)) throw new VoyError("invalid_candidate_ref", 400);
  const coords = payload?.coordinates;
  const lat = numeric(coords?.lat), lon = numeric(coords?.lon);
  if (!validLatLon(lat, lon)) throw new VoyError("invalid_coordinates", 400);
  try {
    const final = await reverseLocation({ lat, lon }, fetchImpl);
    emitEvent("destination_resolve_ok", { endpoint_class: "destination", provider_id: DESTINATION_PROVIDER, province_id: final.candidate.province.id, outcome_class: "resolved" });
    return { ok: true, result_class: "resolved", provider: DESTINATION_PROVIDER, destination: final.candidate, mobility_decision: buildMobilityDecision(final.candidate) };
  } catch (error) {
    emitEvent("destination_resolve_error", { endpoint_class: "destination", provider_id: DESTINATION_PROVIDER, error_class: error?.code ?? "upstream", outcome_class: "map_resolvable_territory_unverified" });
    if (ref.startsWith("photon:") && ["external_dependency_unavailable","upstream_rejected","upstream_schema_invalid"].includes(error?.code)) {
      const destination={source_id:"photon_discovery",source_entity_id:ref,label:"Destino seleccionado",province:null,locality:null,coordinates:{lat,lon},coverage:"T0_TERRITORY_ONLY",integration_slug:null,territory_verified:false};
      return {ok:true,result_class:"map_resolvable_territory_unverified",provider:DESTINATION_PROVIDER,territory_verified:false,destination,mobility_decision:buildMobilityDecision(destination)};
    }
    throw error;
  }
}
__name(resolveDestinationSelection, "resolveDestinationSelection");
async function reverseLocation(payload, fetchImpl = fetch) {
  const lat = numeric(payload?.lat);
  const lon = numeric(payload?.lon);
  if (!validLatLon(lat, lon)) throw new VoyError("invalid_coordinates", 400);
  const upstream = await fetchGeoRef("/ubicacion", { lat, lon }, fetchImpl);
  const candidate = normalizeReversePayload(upstream);
  emitEvent("territory_resolve_ok", { endpoint_class: "reverse", province_id: candidate.province.id, result_class: "resolved" });
  return { ok: true, result_class: "resolved", candidate, source: { id: "src_georef", retrieved_at: nowIso() } };
}
__name(reverseLocation, "reverseLocation");
function classifySourceFreshness(source, nowMs = Date.now()) {
  const verifiedMs = Date.parse(source?.last_successful_verification ?? "");
  const ttlSeconds = Number(source?.freshness_threshold_seconds);
  const runtimeClaimsAllowed = source?.runtime_claims_allowed !== false;
  if (!runtimeClaimsAllowed) return source?.trust_state === "QUARANTINED" ? "QUARANTINED" : "UNTRUSTED";
  if (!Number.isFinite(verifiedMs) || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return "UNKNOWN";
  if (nowMs < verifiedMs) return "UNKNOWN";
  return nowMs - verifiedMs <= ttlSeconds * 1e3 ? "FRESH" : "STALE";
}
__name(classifySourceFreshness, "classifySourceFreshness");
function sourceEvidence(sourceId, nowMs = Date.now()) {
  const source = SOURCE_BY_ID.get(sourceId);
  if (!source) return null;
  const ttlSeconds = Number(source.freshness_threshold_seconds);
  const runtimeClaimsAllowed = source.runtime_claims_allowed !== false;
  const freshness_state = classifySourceFreshness(source, nowMs);
  return {
    id: source.id,
    authority: source.authority,
    data_class: source.data_class,
    verified_at: source.last_successful_verification ?? null,
    freshness_threshold_seconds: Number.isFinite(ttlSeconds) ? ttlSeconds : null,
    freshness_state,
    runtime_claims_allowed: runtimeClaimsAllowed,
    trust_state: source.trust_state ?? (runtimeClaimsAllowed ? "TRUSTED_FOR_DECLARED_SCOPE" : "UNTRUSTED"),
    canonical_url: source.canonical_url
  };
}
__name(sourceEvidence, "sourceEvidence");
function evidenceUsable(evidence) {
  return Boolean(evidence && evidence.runtime_claims_allowed && evidence.freshness_state === "FRESH");
}
__name(evidenceUsable, "evidenceUsable");
function effectiveTierForIntegration(integration, nowMs = Date.now()) {
  const sources = integration.source_ids.map((id) => sourceEvidence(id, nowMs)).filter(Boolean);
  const primarySource = sources.find(evidenceUsable) ?? null;
  const safeHandoffs = integration.handoffs.map((item) => {
    const source = sourceEvidence(item.source_id ?? integration.source_ids[0], nowMs);
    const safe = HANDOFF_ALLOWLIST.has(item.url) && evidenceUsable(source);
    return { ...item, safe, source };
  }).filter((item) => item.safe);
  const fareSource = integration.fare ? sourceEvidence(integration.fare.source_id, nowMs) : null;
  const fareUsable = Boolean(integration.fare && evidenceUsable(fareSource));
  let tier = "T0_TERRITORY_ONLY";
  if (safeHandoffs.length) tier = "T1_OFFICIAL_HANDOFF";
  if (safeHandoffs.length && fareUsable && integration.tier === "T4_FARE_VERIFIED") tier = "T4_FARE_VERIFIED";
  return { tier, sources, primarySource, safeHandoffs, fareSource, fareUsable };
}
__name(effectiveTierForIntegration, "effectiveTierForIntegration");
function getCoverage(provinceId, localitySlug, nowMs = Date.now()) {
  const normalizedProvinceId = String(provinceId ?? "");
  const normalizedLocalitySlug = slugify(localitySlug);
  const province = JURISDICTION_BY_ID.get(normalizedProvinceId);
  if (!province) return null;
  const integration = findCityIntegration(normalizedLocalitySlug, normalizedProvinceId, localitySlug);
  if (!integration) {
    return {
      province_id: normalizedProvinceId,
      province_name: province.province_name,
      locality_slug: normalizedLocalitySlug,
      territory_status: province.territory_status,
      configured_local_mobility_tier: province.local_mobility_tier,
      local_mobility_tier: "T0_TERRITORY_ONLY",
      source_ids: ["src_georef"],
      official_handoff_urls: [],
      unavailable_or_unknown: true,
      verified_at: province.last_verified_at
    };
  }
  const effective = effectiveTierForIntegration(integration, nowMs);
  return {
    province_id: normalizedProvinceId,
    province_name: province.province_name,
    locality_slug: normalizedLocalitySlug,
    territory_status: province.territory_status,
    configured_local_mobility_tier: integration.tier,
    local_mobility_tier: effective.tier,
    source_ids: effective.sources.filter(evidenceUsable).map((source) => source.id),
    official_handoff_urls: effective.safeHandoffs.map((item) => item.url),
    unavailable_or_unknown: effective.tier === "T0_TERRITORY_ONLY",
    verified_at: CITY_INTEGRATIONS.verified_at
  };
}
__name(getCoverage, "getCoverage");
function getMobility(slug, nowMs = Date.now(), provinceId = null) {
  const normalizedSlug = slugify(slug);
  const candidates = CITY_INTEGRATIONS.cities.filter((city) => city.slug === normalizedSlug);
  const integration = provinceId ? findCityIntegration(normalizedSlug, String(provinceId), slug) : candidates.length === 1 ? candidates[0] : null;
  if (!integration) return null;
  const effective = effectiveTierForIntegration(integration, nowMs);
  const fare = effective.fareUsable ? { ...integration.fare, source: effective.fareSource } : null;
  if (integration.tier !== effective.tier) emitEvent("mobility_source_stale", { endpoint_class: "mobility", province_id: integration.province_id, locality_coverage_tier: effective.tier, source_id: integration.source_ids[0], result_class: "degraded" });
  return {
    city: integration.city,
    province: integration.province,
    province_id: integration.province_id,
    configured_tier: integration.tier,
    tier: effective.tier,
    structured_status: effective.tier === "T0_TERRITORY_ONLY" ? "UNAVAILABLE_IN_VOY" : integration.structured_status,
    source_ids: effective.sources.filter(evidenceUsable).map((source) => source.id),
    sources: effective.sources,
    fare,
    fare_status: integration.fare ? fare ? "CURRENT_VERIFIED" : "STALE_UNAVAILABLE" : "UNAVAILABLE",
    handoffs: effective.safeHandoffs,
    route: null,
    eta: null,
    provider_presence: []
  };
}
__name(getMobility, "getMobility");
function mobilityDecisionFreshness(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const states = list.map((source) => source?.freshness_state).filter(Boolean);
  const verified = list.map((source) => Date.parse(source?.verified_at ?? "")).filter(Number.isFinite);
  let state = "unknown";
  if (states.length && states.every((value) => value === "FRESH")) state = "fresh";
  else if (states.includes("FRESH")) state = "mixed";
  else if (states.includes("STALE")) state = "stale";
  return { state, verified_at: verified.length ? new Date(Math.max(...verified)).toISOString() : null };
}
__name(mobilityDecisionFreshness, "mobilityDecisionFreshness");
function mobilityDecisionProvenance(sources) {
  return (Array.isArray(sources) ? sources : []).map((source) => ({
    id: source.id,
    authority: source.authority,
    data_class: source.data_class,
    canonical_url: source.canonical_url,
    verified_at: source.verified_at,
    freshness_state: source.freshness_state,
    runtime_claims_allowed: source.runtime_claims_allowed,
    trust_state: source.trust_state
  }));
}
__name(mobilityDecisionProvenance, "mobilityDecisionProvenance");
function buildRailStaticContext(destination, nowMs = Date.now()) {
  if (destination?.territory_verified !== true) return null;
  const nearby = nearestRailStations(destination?.coordinates, 3, 5000, "SOFSE");
  if (!nearby.length) return null;
  const catalogSource = sourceEvidence(RAIL_STATIC_SOURCE.id, nowMs);
  const handoffSource = sourceEvidence(RAIL_HANDOFF_SOURCE.id, nowMs);
  const handoffSafe = HANDOFF_ALLOWLIST.has(RAIL_HANDOFF_URL) && evidenceUsable(handoffSource);
  if (!handoffSafe) return null;
  const facts = nearby.map((station) => ({
    kind: "rail_station_reference",
    mode: "rail",
    label: "Estación ferroviaria cercana · catálogo oficial 2022",
    value: station.name,
    line: station.line,
    branch: null,
    operator: station.operator,
    distance_meters: station.distance_meters,
    catalog_id: station.catalog_id,
    data_as_of: RAIL_STATION_CATALOG_META.data_as_of,
    source: catalogSource
  }));
  const handoffs = [{
    id: "trenes_argentinos_horarios_oficial",
    mode: "rail",
    label: "Consultar horarios, tarifas y recorridos oficiales",
    url: RAIL_HANDOFF_URL,
    requires_confirmation: true,
    single_use: true,
    sends_coords: false,
    sends_query: false,
    source: handoffSource
  }];
  return {
    coverage: "R1_OFFICIAL_STATIC_HANDOFF",
    available_modes: [],
    facts,
    handoffs,
    sources: [catalogSource, handoffSource].filter(Boolean)
  };
}
__name(buildRailStaticContext, "buildRailStaticContext");
function buildMobilityDecision(destination, nowMs = Date.now()) {
  const territoryVerified = destination?.territory_verified === true;
  const provinceId = territoryVerified ? String(destination?.province?.id ?? "") : "";
  const localityName = territoryVerified ? text(destination?.locality?.name) : "";
  const localitySlug = territoryVerified ? slugify(destination?.locality?.slug || localityName) : "";
  const integration = territoryVerified && provinceId && localityName ? findCityIntegration(localitySlug, provinceId, localityName) : null;
  const integrationSlug = integration?.slug ?? null;
  const mobility = integrationSlug ? getMobility(integrationSlug, nowMs, provinceId) : null;
  const rail = buildRailStaticContext(destination, nowMs);
  const facts = [];
  if (mobility?.fare?.value != null) facts.push({
    kind: "fare",
    mode: "bus",
    label: mobility.fare.scope,
    value: mobility.fare.value,
    currency: mobility.fare.currency ?? "ARS",
    effective_from: mobility.fare.effective_from ?? null,
    verified_at: mobility.fare.verified_at ?? mobility.fare.source?.verified_at ?? null,
    source: mobility.fare.source ?? null
  });
  facts.push(...(rail?.facts ?? []));
  const busHandoffs = (Array.isArray(mobility?.handoffs) ? mobility.handoffs : []).map((handoff) => ({ ...handoff, mode: "bus" }));
  const handoffs = [...busHandoffs, ...(rail?.handoffs ?? [])];
  const busCoverage = mobility?.tier ?? "T0_TERRITORY_ONLY";
  const coverage = busCoverage !== "T0_TERRITORY_ONLY" ? busCoverage : rail?.coverage ?? busCoverage;
  const officialActions = handoffs.map((handoff) => ({
    type: "open_official_handoff",
    mode: handoff.mode ?? null,
    label: handoff.label,
    url: handoff.url,
    source: handoff.source ?? null
  }));
  const usefulBaselineActions = territoryVerified ? [
    { type: "consult_navigation", travel_mode: "transit", label: "Consultar transporte público" },
    { type: "consult_navigation", travel_mode: "walking", label: "Consultar a pie" },
    { type: "consult_navigation", travel_mode: "bicycling", label: "Consultar en bici" },
    { type: "consult_navigation", travel_mode: "driving", label: "Consultar en auto" }
  ] : [];
  let state = "unknown";
  if (handoffs.length || usefulBaselineActions.length) state = "handoff";
  else if (facts.length) state = "available";
  else if (territoryVerified && !integration) state = "unavailable";
  const availableModes = [];
  if (mobility && busCoverage !== "T0_TERRITORY_ONLY" && (busHandoffs.length || facts.some((fact) => fact.mode === "bus"))) availableModes.push("bus");
  for (const mode of rail?.available_modes ?? []) if (!availableModes.includes(mode)) availableModes.push(mode);
  const sourceClass = handoffs.length || usefulBaselineActions.length ? "handoff" : "unknown";
  const sources = [...(mobility?.sources ?? []), ...(rail?.sources ?? [])].filter(Boolean);
  const uniqueSources = [...new Map(sources.map((source) => [source.id, source])).values()];
  const provenance = mobilityDecisionProvenance(uniqueSources);
  const freshness = mobilityDecisionFreshness(uniqueSources);
  const nextActions = [...officialActions, ...usefulBaselineActions];
  if (!nextActions.length) nextActions.push(
    { type: "view_map", label: "Ver ubicación en el mapa" },
    { type: "refine_destination", label: territoryVerified ? "Probar otro destino" : "Precisar o volver a intentar el destino" }
  );
  return {
    state,
    destination,
    integration_slug: integrationSlug,
    coverage,
    mode_coverage: { bus: integration ? busCoverage : null, rail: rail?.coverage ?? null },
    available_modes: availableModes,
    source_class: sourceClass,
    freshness,
    provenance,
    facts,
    handoffs,
    next_actions: nextActions
  };
}
__name(buildMobilityDecision, "buildMobilityDecision");
const ROUTING_PROFILES = Object.freeze({
  walking: "routed-foot",
  bicycle: "routed-bike",
  auto: "routed-car"
});
const ROUTING_PROVIDER = Object.freeze({
  id: "routing_openstreetmap_de",
  authority: "FOSSGIS / OpenStreetMap routing service",
  base_url: "https://routing.openstreetmap.de",
  attribution: "© OpenStreetMap contributors",
  max_rps: 1,
  timeout_ms: 6000,
  cache_ttl_ms: 120000,
  circuit_open_ms: 30000
});
const routingRuntime = { lastRealFetchAt: 0, circuitUntil: 0, cache: new Map() };
async function prunePersistentRouteCacheForInsert(storage,incomingKey,nowMs=Date.now()){
  let page=await storage.list({prefix:"cache:",limit:ROUTE_CACHE_SCAN_LIMIT});
  let entries=[...page.entries()];
  while(page.size===ROUTE_CACHE_SCAN_LIMIT){
    const lastKey=[...page.keys()].at(-1);
    page=await storage.list({prefix:"cache:",startAfter:lastKey,limit:ROUTE_CACHE_SCAN_LIMIT});
    if(!page.size)break;
    entries.push(...page.entries());
  }
  const active=[];
  for(const [key,record] of entries){
    if(key===incomingKey)continue;
    const storedAt=Number(record?.stored_at);
    if(!Number.isFinite(storedAt)||nowMs-storedAt>=ROUTING_PROVIDER.cache_ttl_ms){await storage.delete(key);continue;}
    active.push({key,stored_at:storedAt});
  }
  active.sort((a,b)=>a.stored_at-b.stored_at||String(a.key).localeCompare(String(b.key)));
  while(active.length>=ROUTE_CACHE_MAX){const victim=active.shift();await storage.delete(victim.key);}
}
__name(prunePersistentRouteCacheForInsert,"prunePersistentRouteCacheForInsert");
function validRoutePoint(pair) {
  return Array.isArray(pair) && pair.length >= 2 && Number.isFinite(Number(pair[0])) && Number.isFinite(Number(pair[1])) && Number(pair[0]) >= -180 && Number(pair[0]) <= 180 && Number(pair[1]) >= -90 && Number(pair[1]) <= 90;
}
function validateRouteGeometry(geometry) {
  if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2 || geometry.coordinates.length > 20000) return null;
  if (!geometry.coordinates.every(validRoutePoint)) return null;
  return { type: "LineString", coordinates: geometry.coordinates.map((pair) => [Number(pair[0]), Number(pair[1])]) };
}
function routeCoordinate(value) {
  const lat = Number(value?.lat), lon = Number(value?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}
function routeCacheKey(mode, origin, destination) {
  const round = (n) => Number(n).toFixed(5);
  return `${mode}:${round(origin.lat)},${round(origin.lon)}:${round(destination.lat)},${round(destination.lon)}`;
}
async function acquireNetworkRoute(mode, originInput, destinationInput, fetchImpl = fetch, nowMs = Date.now(), env = {}) {
  const profile = ROUTING_PROFILES[mode];
  const origin = routeCoordinate(originInput), destination = routeCoordinate(destinationInput);
  if (!profile || !origin || !destination) return null;
  const key = routeCacheKey(mode, origin, destination);
  const isRealFetch = fetchImpl === fetch;
  if (isRealFetch) {
    const coordinator = env?.ROUTING_COORDINATOR;
    if (!coordinator?.idFromName || !coordinator?.get) return null;
    try {
      const stub = coordinator.get(coordinator.idFromName("global"));
      const response = await stub.fetch("https://routing-coordinator.internal/route", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, origin, destination }) });
      if (!response.ok) return null;
      const body = await response.json();
      return body?.ok && body?.route ? body.route : null;
    } catch { return null; }
  }
  const cached = isRealFetch ? routingRuntime.cache.get(key) : null;
  if (cached && nowMs - cached.stored_at < ROUTING_PROVIDER.cache_ttl_ms) return { ...cached.value, cache_hit: true };
  if (isRealFetch && Date.now() < routingRuntime.circuitUntil) return null;
  if (isRealFetch) {
    const wait = Math.max(0, 1000 - (Date.now() - routingRuntime.lastRealFetchAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    routingRuntime.lastRealFetchAt = Date.now();
  }
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = `${ROUTING_PROVIDER.base_url}/${profile}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROUTING_PROVIDER.timeout_ms);
  try {
    const response = await fetchImpl(url, { method: "GET", headers: { "User-Agent": "VOY-Mobility/1.0 (+https://voy-app.simondalmasso44.workers.dev/)", "Accept": "application/json" }, signal: controller.signal });
    if (!response?.ok) {
      if (isRealFetch && Number(response?.status) >= 500) routingRuntime.circuitUntil = Date.now() + ROUTING_PROVIDER.circuit_open_ms;
      return null;
    }
    const payload = await response.json();
    const route = Array.isArray(payload?.routes) ? payload.routes[0] : null;
    const geometry = validateRouteGeometry(route?.geometry);
    const distance = Number(route?.distance);
    if (!geometry || !Number.isFinite(distance) || distance <= 0) return null;
    const value = {
      geometry,
      distance_m: Math.round(distance),
      source: ROUTING_PROVIDER.id,
      source_class: "network_route",
      observed_at: new Date(nowMs).toISOString(),
      attribution: ROUTING_PROVIDER.attribution,
      cache_hit: false
    };
    if (isRealFetch) {
      routingRuntime.cache.set(key, { stored_at: nowMs, value });
      if (routingRuntime.cache.size > 96) routingRuntime.cache.delete(routingRuntime.cache.keys().next().value);
    }
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
__name(acquireNetworkRoute, "acquireNetworkRoute");
function routeDistanceDisplay(distanceM) {
  const n = Number(distanceM);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1000 ? `${Math.round(n)} m` : `${(n / 1000).toFixed(n < 10000 ? 1 : 0)} km`;
}
function freeModeOption(mode, route) {
  if (!route) return null;
  return {
    mode,
    selectable: true,
    route: { geometry: route.geometry, source: route.source, observed_at: route.observed_at, attribution: route.attribution },
    distance_m: route.distance_m,
    distance_display: routeDistanceDisplay(route.distance_m),
    price: { currency: "ARS", amount: 0, kind: "free", source: "intrinsic_zero_marginal_fare" },
    disclosures: ["Recorrido calculado sobre red OpenStreetMap; no implica estado del tránsito ni tiempo estimado."],
    provenance: [{ id: ROUTING_PROVIDER.id, authority: ROUTING_PROVIDER.authority, attribution: ROUTING_PROVIDER.attribution }],
    next_actions: []
  };
}
function nonSelectableMode(mode, reason, extra = {}) {
  return { mode, selectable: false, reason, ...extra };
}
async function computeMobilityComputation(payload, fetchImpl = fetch, nowMs = Date.now(), env = {}) {
  if (!payload || typeof payload !== "object") throw new VoyError("mobility_computation_invalid", 400);
  const origin = payload.origin, destination = payload.destination;
  if (!routeCoordinate(origin?.coordinates) || !routeCoordinate(destination?.coordinates)) throw new VoyError("mobility_computation_coordinates_required", 400);
  if (destination?.territory_verified !== true) throw new VoyError("mobility_computation_destination_unverified", 409);
  const baseDecision = buildMobilityDecision(destination, nowMs);
  const walkingRoute = await acquireNetworkRoute("walking", origin.coordinates, destination.coordinates, fetchImpl, nowMs, env);
  const bicycleRoute = await acquireNetworkRoute("bicycle", origin.coordinates, destination.coordinates, fetchImpl, nowMs, env);
  const modeOptions = [];
  const walking = freeModeOption("walking", walkingRoute);
  const bicycle = freeModeOption("bicycle", bicycleRoute);
  if (walking) modeOptions.push(walking); else modeOptions.push(nonSelectableMode("walking", "route_unavailable"));
  if (bicycle) modeOptions.push(bicycle); else modeOptions.push(nonSelectableMode("bicycle", "route_unavailable"));
  modeOptions.push(nonSelectableMode("auto", "truthful_current_price_input_unavailable", { price: null }));
  if (baseDecision.integration_slug || baseDecision.handoffs.some((h) => h.mode === "bus")) modeOptions.push(nonSelectableMode("bus", "truthful_route_and_applicable_fare_not_jointly_available", { price: null }));
  if ((baseDecision.facts ?? []).some((f) => f.mode === "rail") || (baseDecision.handoffs ?? []).some((h) => h.mode === "rail")) modeOptions.push(nonSelectableMode("rail", "truthful_route_and_applicable_fare_not_jointly_available", { price: null }));
  return {
    server_authoritative: true,
    destination,
    origin: { ...origin, label: text(origin?.label) || "Origen" },
    mode_options: modeOptions,
    selectable_modes: modeOptions.filter((option) => option.selectable).map((option) => option.mode),
    info_actions: baseDecision.handoffs,
    provenance: baseDecision.provenance,
    computed_at: new Date(nowMs).toISOString(),
    fabricated_claims: 0
  };
}
__name(computeMobilityComputation, "computeMobilityComputation");
function telemetryRateAllowed() {
  const now = Date.now();
  if (!telemetryWindow.startedAt || now - telemetryWindow.startedAt >= TELEMETRY_CONTRACT.window_ms) {
    telemetryWindow.startedAt = now;
    telemetryWindow.count = 0;
  }
  telemetryWindow.count += 1;
  return telemetryWindow.count <= TELEMETRY_CONTRACT.max_events_per_isolate_window;
}
__name(telemetryRateAllowed, "telemetryRateAllowed");
function validateTelemetryDimension(key, value) {
  if (typeof value === "boolean") {
    if (key !== "cache_hit_boolean") throw new VoyError("telemetry_value_invalid", 400);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new VoyError("telemetry_value_invalid", 400);
    return;
  }
  if (typeof value !== "string" || value.length < 1 || value.length > 80) throw new VoyError("telemetry_value_invalid", 400);
  if (!/^[A-Za-z0-9_.:-]+$/.test(value)) throw new VoyError("telemetry_value_invalid", 400);
  if (key === "province_id" && !/^\d{2}$/.test(value)) throw new VoyError("telemetry_value_invalid", 400);
  if (key === "locality_coverage_tier" && !/^T[0-9]_[A-Z0-9_]+$/.test(value)) throw new VoyError("telemetry_value_invalid", 400);
  if (key === "source_id" && !/^src_[a-z0-9_]+$/.test(value)) throw new VoyError("telemetry_value_invalid", 400);
  if (key === "status_code_class" && !/^[2345]xx$/.test(value)) throw new VoyError("telemetry_value_invalid", 400);
  if (key === "latency_bucket" && !["lt100ms", "100_299ms", "300_999ms", "1_3s", "gt3s"].includes(value)) throw new VoyError("telemetry_value_invalid", 400);
}
__name(validateTelemetryDimension, "validateTelemetryDimension");
function validateTelemetryPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new VoyError("telemetry_invalid", 400);
  if (!TELEMETRY_CONTRACT.events.includes(payload.event)) throw new VoyError("telemetry_event_not_allowed", 400);
  for (const forbidden of TELEMETRY_CONTRACT.forbidden_fields) {
    if (Object.prototype.hasOwnProperty.call(payload, forbidden)) throw new VoyError("telemetry_field_not_allowed", 400);
  }
  const dimensions = payload.dimensions ?? {};
  if (typeof dimensions !== "object" || Array.isArray(dimensions)) throw new VoyError("telemetry_invalid", 400);
  for (const [key, value] of Object.entries(dimensions)) {
    if (!TELEMETRY_CONTRACT.dimensions.includes(key)) throw new VoyError("telemetry_dimension_not_allowed", 400);
    validateTelemetryDimension(key, value);
  }
  return { event: payload.event, dimensions };
}
__name(validateTelemetryPayload, "validateTelemetryPayload");
function health() {
  return {
    ok: true,
    service: "voy-app",
    version: RELEASE_META.release_id,
    build_hash: RELEASE_META.build_id,
    source_commit: RELEASE_META.source_commit,
    config_digest: RELEASE_META.config_digest,
    registry_digest: RELEASE_META.registry_digest,
    provenance: PROVENANCE,
    features: { auth: false, voice: false, ai_required: false, pwa: true, national_territory: true, routing: true, mobility_computation: true, map_provider: APP_CONFIG.MAP_PROVIDER.id }
  };
}
__name(health, "health");
async function apiResponse(request, env, deps) {
  const url = new URL(request.url);
  const fetchImpl = deps?.upstreamFetch ?? fetch;
  if (url.pathname === "/api/health") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json(health());
  }
  if (url.pathname === "/api/destinations/suggest") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await parseSmallJsonBody(request);
    return json(await suggestDestinations(payload, fetchImpl));
  }
  if (url.pathname === "/api/destinations/resolve") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await parseSmallJsonBody(request);
    return json(await resolveDestinationSelection(payload, fetchImpl));
  }
  if (url.pathname === "/api/destination/resolve" || url.pathname === "/api/origin/resolve") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await parseSmallJsonBody(request);
    return json(await resolveAddress(payload, fetchImpl));
  }
  if (url.pathname === "/api/location/reverse") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await parseSmallJsonBody(request);
    return json(await reverseLocation(payload, fetchImpl));
  }
  if (url.pathname === "/api/radar/trains/nearby") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await parseSmallJsonBody(request);
    const providerResult = await deps.trainServiceAdapter.read();
    return json({ ok: true, radar: buildTrainRadarSnapshot({ coordinates: payload.coordinates, providerResult, nowMs: Date.now() }) });
  }
  if (url.pathname.startsWith("/api/coverage/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 4) return json({ ok: false, error: "not_found" }, 404);
    const coverage = getCoverage(parts[2], decodeURIComponent(parts[3]));
    return coverage ? json({ ok: true, coverage }) : json({ ok: false, error: "coverage_not_found" }, 404);
  }
  if (url.pathname === "/api/mobility/compute") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await parseSmallJsonBody(request);
    return json({ ok: true, computation: await computeMobilityComputation(payload, fetchImpl, Date.now(), env) });
  }
  if (url.pathname.startsWith("/api/mobility/")) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const slug = decodeURIComponent(url.pathname.slice("/api/mobility/".length));
    const mobility = getMobility(slug);
    if (!mobility) return json({ ok: false, error: "mobility_not_integrated", tier: "T0_TERRITORY_ONLY" }, 404);
    emitEvent("mobility_source_ok", { endpoint_class: "mobility", province_id: mobility.province_id, locality_coverage_tier: mobility.tier, source_id: mobility.source_ids[0], result_class: "available_metadata" });
    return json({ ok: true, mobility });
  }
  if (url.pathname === "/api/mobility/compute") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const payload = await parseSmallJsonBody(request);
    return json({ ok: true, computation: await computeMobilityComputation(payload, fetchImpl, Date.now(), env) });
  }
  if (url.pathname === "/api/telemetry") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const contentType = request.headers.get("content-type") ?? "";
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) return json({ ok: false, error: "unsupported_media_type" }, 415);
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin) return json({ ok: false, error: "cross_origin_forbidden" }, 403);
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return json({ ok: false, error: "cross_origin_forbidden" }, 403);
    if (!telemetryRateAllowed()) return json({ ok: false, error: "rate_limited" }, 429);
    const payload = await parseSmallJsonBody(request, TELEMETRY_CONTRACT.max_body_bytes);
    const validated = validateTelemetryPayload(payload);
    emitEvent(validated.event, validated.dimensions);
    return json({ ok: true });
  }
  return json({ ok: false, error: "not_found" }, 404);
}
__name(apiResponse, "apiResponse");
function createRequestHandler(deps = {}) {
  const trainServiceAdapter = deps.trainServiceAdapter ?? createSarmientoScheduledAdapter({ fetchImpl: deps.upstreamFetch ?? fetch });
  const requestDeps = { ...deps, trainServiceAdapter };
  return /* @__PURE__ */ __name(async function handle(request, env = {}) {
    const started = Date.now();
    const url = new URL(request.url);
    let response;
    try {
      if (url.pathname.startsWith("/api/")) response = await apiResponse(request, env, requestDeps);
      else if (!env.ASSETS) response = json({ ok: false, error: "assets_binding_unavailable" }, 503);
      else response = withSecurity(await env.ASSETS.fetch(request));
    } catch (error) {
      if (error instanceof VoyError) response = json({ ok: false, error: error.code, detail: error.detail ?? void 0 }, error.status);
      else {
        console.error(JSON.stringify({ event: "internal_error", release_id: RELEASE_META.release_id, error_class: "unhandled" }));
        response = json({ ok: false, error: "internal_error" }, 500);
      }
    }
    emitEvent("request_completed", { endpoint_class: url.pathname.startsWith("/api/") ? url.pathname.split("/").slice(1, 3).join("_") : "asset", status_code_class: statusClass(response.status), latency_bucket: latencyBucket(Date.now() - started) });
    return response;
  }, "handle");
}
__name(createRequestHandler, "createRequestHandler");
var defaultHandler = createRequestHandler();
var worker_default = { fetch: /* @__PURE__ */ __name((request, env) => defaultHandler(request, env), "fetch") };
export {
  NominatimCoordinator,
  VoyError,
  classifySourceFreshness,
  createRequestHandler,
  worker_default as default,
  fetchGeoRef,
  getCoverage,
  getMobility,
  buildMobilityDecision,
  computeMobilityComputation,
  QueryNormalizer,
  ContextPlanner,
  dedupeDestinationCandidates,
  rankDestinationCandidates,
  nearestRailStations,
  buildTrainRadarSnapshot,
  createSarmientoScheduledAdapter,
  parseSarmientoScheduledService,
  normalizeGeoRefPlace,
  resolveAddress,
  resolveDestinationSelection,
  reverseLocation,
  sourceEvidence,
  suggestDestinations,
  validateTelemetryPayload
};
//# sourceMappingURL=worker.js.map

