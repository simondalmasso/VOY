---
Task ID: 1
Agent: main
Task: MODO DIABLO FASE 2 - Hardening VOY v2

Work Log:
- Created backup movilidad.backup.html
- Web-searched all providers for Santa Fe Capital 2026
- AUDIT RESULTS:
  - Uber: CONFIRMED available
  - DiDi: CONFIRMED available (since Nov 2024)
  - Maxim: CONFIRMED available
  - Cabify: CONFIRMED available (was marked unavailable, NOW FIXED)
  - Radiotaxi: CONFIRMED available
  - Remises Real: CONFIRMED available
  - TaxiApp: CONFIRMED available
  - Uber Moto: CONFIRMED available in Santa Fe
  - DiDi Moto: EXISTS in Argentina but NOT confirmed specifically in Santa Fe → "Consultar"
  - inDriver: NOT available in Argentina
  - Bolt: NOT available in Argentina
  - Maxim Moto / Radiotaxi Moto / Remis Moto / TaxiApp Moto: DO NOT EXIST → REMOVED

Changes Implemented:
1. PROVIDERS: Updated with confirmed/source data, added Cabify as available, added uber_moto and didi_moto
2. FareRegistry: Centralized all fares (taxi, bus, apps, moto) with source and updated_at
3. Removed all hardcoded fare variables (_appFares, TAXI_TARIFF, BUS_FARE_SUBE, BUS_FARE_CASH, _motoDiscount)
4. Updated all fare references to use FareRegistry
5. calcAppPrice: Now returns null for providers without public tariff (Cabify)
6. renderProviderRow: Shows "Consultar" for null prices instead of crashing
7. estimateAuto: Added Cabify (price=null)
8. estimateMoto: Only Uber Moto (confirmed) + DiDi Moto (null price). Removed all fake moto providers
9. Removed renderMotoProviderRow - moto now uses same renderProviderRow as auto
10. Added LANDMARKS array (12 Santa Fe POIs including Puente Colgante, Catedral, UNL, etc.)
11. searchPlaces: Now searches LANDMARKS in addition to BUS_STOPS and BIKE_STATIONS
12. GPS: Added silent retry with exponential backoff (3 retries, 5s/10s/15s intervals)
13. GPS: Only 📍🟢 ON / 📍❌ OFF states, no emotional messages

Stage Summary:
- All 7 priorities implemented
- Zero JS errors confirmed via Agent Browser testing
- "colg" → finds "Puente Colgante" as first result ✅
- Moto card shows only 2 real providers ✅
- Auto card shows 7 providers including Cabify ✅
- Null prices show "Consultar" ✅
- FareRegistry centralizes all fare data with provenance ✅
- GPS retry works silently ✅
---
Task ID: MODO-DIABLO-FASE-3.1
Agent: Main
Task: Implementar RecommendationEngine para VOY v2

Work Log:
- Read full movilidad.html (1139 lines) to understand _estimations structure
- Created backup at movilidad.backup.html
- Added #recommendationBlock HTML element between map-hint and cardsContainer
- Implemented computeRecommendation() function:
  - Extracts alternatives from _estimations (bus, moto providers, auto providers)
  - Skips walk/bike (free options trivialize price-based recommendations)
  - Skips providers with null price (can't score without price)
  - Normalizes price and time to [0,1] range
  - Calculates score = precio_normalizado * 0.6 + tiempo_normalizado * 0.4
  - Finds cheapest (min price), fastest (min time), balanced (min score)
  - Tie detection: if difference < 5% of best value → "Empate técnico"
- Implemented renderRecommendation() function:
  - Compact block with 🏆 header
  - Three lines: 💰 Más barato, ⚡ Más rápido, ⚖️ Mejor equilibrio
  - Tie handling shows "Empate técnico · Name1 / Name2"
  - Hidden when no estimations available
- Called renderRecommendation() from renderCards()
- Verified with Agent Browser: recommendation appears correctly
- No console errors, no regressions

Stage Summary:
- RecommendationEngine fully functional
- Example output for 2km route: Más barato: Uber Moto $2.250, Más rápido: Empate técnico · Uber/DiDi/Maxim, Mejor equilibrio: Uber Moto $2.250/6min
- Zero modifications to existing CSS, layout, cards, drag-and-drop, providers, FareRegistry
- Backup created at movilidad.backup.html
