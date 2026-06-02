---
Task ID: 1
Agent: main
Task: Fix GPS "Permiso de ubicación denegado" error and Uber/DiDi buttons below map

Work Log:
- Analyzed the user's two main issues from the uploaded screenshot and message
- Issue 1: GPS permission denied error on file:// protocol - every time the page opens, it shows a scary red error
- Issue 2: Uber/DiDi "pedir" buttons end up below/under the map, making them hard to access on small screens
- Fixed standalone HTML (movilidad.html):
  - GPS: Added location.protocol === 'file:' check at top of tryGPS() → auto-calls useDefaultOrigin()
  - GPS: Changed error callback to auto-fallback to Santa Fe center instead of showing red error
  - GPS: Changed invalid coords handler to auto-fallback too
  - Action bar: Added fixed sticky bottom bar with Uber/DiDi deep link buttons
  - Action bar: Shows when estimate is available, hides when destination is cleared or error occurs
  - Footer: Added padding-bottom: 80px to prevent action bar overlap
- Fixed React page.tsx:
  - GPS: Added fallbackToSantaFe callback that auto-sets Santa Fe center + shows toast
  - GPS: Moved showToast definition earlier in component to avoid initialization order error
  - GPS: Added file:// protocol check with window guard for SSR
  - GPS: Changed all error paths to call fallbackToSantaFe() instead of showing error
  - Action bar: Added sticky fixed bottom bar with Uber/DiDi buttons showing prices
  - Footer: Added pb-20 padding for action bar clearance
- Verified: lint passes, dev server compiles successfully, all pages return 200

Stage Summary:
- Both standalone HTML and React page now auto-set Santa Fe center when GPS fails
- Both versions now have a sticky bottom action bar with Uber/DiDi buttons always visible
- No existing functionality was broken
