# ORDER-104 release blockers: Gemini bus asset and request budget

## Bus marker provenance

- Recovered source: artifacts-live/source-assets/gemini-bus-source-746791.png
- Original SHA-256: d5fdf5a9984842d667b997a7dcd1ead6f2913d0d40e03adc16ba7074d6d38609
- Original dimensions: 1376 × 768; PNG color type 2 (RGB), so it did not contain alpha despite ALPHA in the filename. The checkerboard was baked into the RGB pixels.
- Reproducible derivation: python scripts/prepare-gemini-bus-sprite.py
- Shipped derivative: public/transit/markers/bus-top.png, 34 × 102, RGBA PNG with real transparent, opaque and antialiased pixels. The image is cropped from the original, the neutral checkerboard is removed, the front is rotated to north, and alpha-aware area downsampling preserves the original yellow/black design.
- The 2D marker rotates the sprite with the measured GPS bearing. The 3D symbol uses the same sprite; the rejected blue GLM bus-side sprite is not used or shipped.

## Cloudflare request budget

- Native Santa Fe GPS polling is now capped at one request per selected line per 30 seconds (previous interval: 15 seconds), halving steady-state Worker requests for an actively selected line from 4/minute to 2/minute.
- Repeated calls for the same line within the interval are deduplicated in memory. Switching to a different line can request that line immediately.
- Hidden tabs do not poll. Returning to a visible tab triggers a poll only if the selected line's budget is overdue.
- The 5-second isolate cache for the upstream Cuándo Pasa adapter remains unchanged; live responses remain no-store and positions are never fabricated.

## Browser visual acceptance

- Harness: scripts/order104-browser-marker-visual.mjs; screenshot/report artifacts are under artifacts-live/order104-browser-visual/.
- Real Chromium with the actual built client, MapLibre vector renderer, CSS, marker DOM, tracker store and interpolation path. Only the basemap style is a deterministic local GeoJSON fixture; the Worker/API is intercepted and must receive zero calls.
- Desktop 1440×900 and mobile 390×844 both pass with four synthetic GPS markers, all visible, no horizontal overflow, no browser console errors, no page errors, and zero same-origin /api/* calls.
- Cardinal heading checks: north 0°, east 90°, south 180°, west 270°. Both the tracker frame and computed CSS rotation match each expected heading with 0° error.
- A new measured GPS fix moves the rendered marker by 5 CSS pixels during the observation window in both viewports. Synthetic-fixture banner remains visible; no real fleet data is represented.
