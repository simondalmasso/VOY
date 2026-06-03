---
Task ID: 1
Agent: main
Task: VOY v2 HARDENING - Implement all 13 fixes on movilidad.html

Work Log:
- Read current movilidad.html (1010 lines) to understand full state
- Analyzed all 13 fixes for risk and feasibility
- Implemented FIX 1-12 as targeted edits in a complete rewrite of movilidad.html
- Changed page.tsx to iframe-based approach to serve movilidad.html at / route
- Verified with Agent Browser: autocomplete, cards rendering, GPS status, weather emoji

Stage Summary:
- All 12 code fixes implemented successfully
- Browser verification confirmed: inline autocomplete works, moto card matches auto layout, empty state shows only "Elegí origen y destino", weather shows only emoji, GPS shows only 📍🟢/📍❌
- FIX 13 (audit) pending
