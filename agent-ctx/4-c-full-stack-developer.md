---
Task ID: 4-c
Agent: full-stack-developer
Task: Build predict, geocode, reverse-geocode, and weather API routes

Work Log:
- Read worklog.md (didn't exist yet - first agent entry) and prisma schema
- Verified db.ts imports and project structure
- Created directory structure for all 4 API routes
- Built /api/predict/route.ts with full prediction algorithm:
  - Uses Intl.DateTimeFormat for timezone-aware hour/day calculation (America/Argentina/Buenos_Aires)
  - Raw SQL with UNION ALL over rides and transport_log tables
  - JavaScript-based grouping by rounded lat/lon (3 decimal places ≈ 111m)
  - Scoring: totalCount * 0.3 + hourMatch * 0.4 + dayMatch * 0.3
  - Hour matching with ±2 wrap-around midnight
  - Returns top 3 predictions with confidence levels
  - "Insufficient data" response when <3 records found
- Built /api/geocode/route.ts with Nominatim forward geocoding:
  - 8-second timeout with AbortController
  - Custom User-Agent header "MovilidadAsistente/1.0"
  - Spanish language results (accept-language=es)
  - Proper error handling for timeouts, service failures, invalid queries
- Built /api/reverse-geocode/route.ts with Nominatim reverse geocoding:
  - Returns displayName, city, road, neighborhood, lat, lon
  - Graceful fallback to coordinates when Nominatim fails
  - 8-second timeout, custom User-Agent
- Built /api/weather/route.ts with Open-Meteo integration:
  - Returns temperature, humidity, precipitation, weatherCode, description
  - Complete WMO weather code mapping to Spanish descriptions (30+ codes)
  - Returns null weather data on failure (doesn't break the app)
  - 8-second timeout
- All files pass ESLint with zero errors

Stage Summary:
- All 4 API routes created and passing lint
- Predict route: full scoring algorithm with timezone support, raw SQL UNION ALL, JS grouping
- Geocode route: Nominatim forward geocoding with timeout and error handling
- Reverse-geocode route: Nominatim reverse geocoding with coordinate fallback
- Weather route: Open-Meteo with complete WMO code Spanish translations, graceful degradation
- All routes handle edge cases: missing params, NaN coordinates, out-of-range values, external API failures
