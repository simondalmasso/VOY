# Santa Fe citywide 3D buildings (VOY)

VOY's urban 3D renderer uses four content-addressed PMTiles shards derived from Overture Maps Buildings release 2026-07-22.0 plus OpenStreetMap-derived buildings. The manifest records 264,425 features, the source release, exact SHA-256 digests, shard sizes, ODbL-1.0 licensing, and required attribution.

Attribution: © OpenStreetMap contributors; © Overture Maps Foundation.

The heights are visual massing, not surveyed measurements. The source manifest classifies 211 features as explicit-height, 225 as floor-derived, 77,585 as estimated, and 186,404 as fallback-derived.

The four PMTiles files total about 53 MiB and are not stored as repository blobs. The fetch-citywide-3d.mjs script retrieves the four pinned names from the same-owner STRACKER transport at build time using bounded 4 MiB query-v1 ranges. It rejects non-206 responses, mismatched Content-Range, missing transport markers, size mismatches, hash mismatches, invalid PMTiles metadata, and out-of-coverage archives. The ignored build-assets/santa-fe-3d directory is only a local cache; production runtime requests are same-origin VOY Worker/Assets requests and do not depend on STRACKER.

Each shard is content-addressed and below 25 MiB. The Worker serves byte ranges only for the four matching asset-name patterns and requires an exact Range header. Browser loading is lazy; it does not download all archives as one payload.

The local curated downtown GeoJSON remains a detail layer. Overture/OSM layers provide city-scale building massing. If the dataset manifest, range transport, or WebGL initialization fails, VOY must fall back to 2D rather than imply citywide 3D is available. Do not precache the entire dataset in the service worker by default.