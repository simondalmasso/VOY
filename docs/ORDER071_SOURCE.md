# ORDER-071 3D topology provenance

The first Santa Fe 3D vertical slice uses a bounded build-time OpenStreetMap snapshot.

- Source: OpenStreetMap public map API snapshot.
- Frozen file: `order071/source/santa-fe-osm-snapshot.json`.
- BBOX: `[-60.7115,-31.6565,-60.7085,-31.6545]`.
- Attribution: © OpenStreetMap contributors.
- License: ODbL 1.0.
- Acquisition phase: build-time only.
- Runtime OSM/Overpass geometry queries: none.

Each building keeps its OSM way ID, version and timestamp. Height semantics are explicit: source `height` when present, otherwise `building:levels × 3 m`, otherwise a generic 9 m extrusion. Inferred/generic heights are never described as measured.

Three.js is pinned to `0.186.0` under MIT and copied into the built static client only for lazy 3D activation. The normal 2D path does not preload Three.js or topology assets.
