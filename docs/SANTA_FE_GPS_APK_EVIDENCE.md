# Santa Fe GPS — APK static evidence (2026-10-08)

Mode: PUBLIC_PRODUCT_RECOVERY. Source code and deployment remain source-of-truth; this is external binary observation, not source authorization.

Target: Nicolas Cavallin, `ncdev.cuandopasa`, XAPK variant described as 6.3.3 (524) distributed by APKPure. Downloaded file size 54,133,827 bytes.
XAPK SHA-256: `88271368785b43c27428d1712c16fe74b2f3fd7059b36a3822dde02a0ad79d94`.
Base APK SHA-256: `0f26ef8799d5bd5bd8bc11abb03d5e42352a399ac8a332a3ef82d1ac039392fe`.
Artifact hash recorded; APK signing certificate not independently verified against Google Play.
Static extraction only; no execution, login, proxying, interception, certificate bypass or access-token collection.

The base APK contains React Native/Expo Hermes `assets/index.android.bundle` (6,242,824 bytes), bytecode version **98**, 38,708 decoded strings and 28,481 function headers. The Hermes tool warns that v98 is newer than its formally supported versions; the string inventory was structurally decoded but is not full semantic analysis.

Observed source host strings (not documentary API endpoints): `api.cuandopasa.app` and `api.cuandopasa.com.ar`. Third-party API clients can be undocumented; **do not consume these hosts from VOY without permission / publication and schema validation**.

App-side symbol strings include `busId`, `busLatitude`, `busLongitude`, `UltimaFechaHoraGPS`, `positionTimestamp`, `normalizePositionTimestamp`, `isReliablePosition`, `dedupeByBusId`, `routeIds`, `tripId`, and `POSITION_MAX_AGE_5_MIN`. String presence suggests the client processes vehicle observations and temporal reliability; it does not prove endpoint semantics, actual update rates, data licensing or observed current position.

Current VOY: static published Santa Fe line geometry is separate from vehicle observations. Live GPS remains unintegrated. Until a reuse-authorized machine-readable source is confirmed, public VOY may link transparently to an external viewing service but must not claim possession of real-time GPS.

Data contract for a future approved adapter: source id, vehicle id (pseudonym), line/route id, coordinates, observed_at, retrieved_at, temporal state, license/attribution, response freshness budget, scope limits, bounded fetch cache, and fail-closed behavior. Never infer current vehicles from published static routes.

READY_FOR_NATIVE_GPS=NO
