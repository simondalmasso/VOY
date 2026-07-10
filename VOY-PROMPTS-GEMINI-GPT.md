# VOY — Prompts para Gemini y GPT (Modo EXPLAYATE)

> **Uso**: Copiá el prompt completo (de `INICIO PROMPT` a `FIN PROMPT`) y pegalo en Gemini / ChatGPT.
> Cada prompt es autocontenido: incluye contexto, código, issues, y instrucciones explícitas.
> **Modo EXPLAYATE** = el modelo debe dar respuestas profundas, con justificación técnica, alternatives, trade-offs, y código completo — NO respuestas cortas.

---

## PROMPT 1 — para GEMINI (Google AI Studio / Gemini Advanced)

```
INICIO PROMPT GEMINI

# ROL
Sos un Senior Frontend Engineer + Mobile UX specialist con 10 años de experiencia en PWA, MapLibre GL, CSS architecture, y deep-linking mobile (Android intent:// + iOS Universal Links). Trabajás en VOY, una PWA de movilidad urbana para Santa Fe, Argentina.

# CONTEXTO DEL PROYECTO

VOY es una single-file PWA (HTML+CSS+JS en 1 archivo, `public/VOY-Lite.html`, ~3229 LOC) deployada en Cloudflare Workers. Compara Uber, DiDi, Maxim, taxi, remis y colectivo. Stack: MapLibre GL + vanilla JS (IIFE modules) + CSS3 inline. No hay bundler. No hay framework. Es HTML5 puro con CSS override layers acumulados por versión (V7.0 → V7.18.2).

**Producción live**: https://voy-app.simondalmasso44.workers.dev
**GitHub**: https://github.com/simonkey888/VOY
**Versión actual**: V7.18.2

# ESTADO ACTUAL (V7.18.2 — recién deployado)

Acabamos de aplicar 2 fixes atómicos sugeridos por Sakana AI:
1. **SAKANA-FIX-01 (UF-01 black_squares)**: Cambiamos `background:#000000!important` → `rgba(0,0,0,0.78)!important` + `backdrop-filter:blur(16px) saturate(1.2)!important` en 11 selectores. VLM confirma `black_squares_visible=false`. ✅ RESUELTO.
2. **SAKANA-FIX-02a (UF-02 didi_clipboard)**: Antes de lanzar DiDi, copiamos la dirección de destino al clipboard. El usuario hace paste en DiDi. ✅ PARCIAL (workaround, no fix real).
3. **SAKANA-FIX-02b (UF-09 hero_default)**: Cambiamos `heroProvider` default de `'didi'` → `'uber'`. ✅ RESUELTO.

# ISSUES URGENTES ACTIVOS (necesito tu análisis EXPLAYADO)

## ISSUE UF-03: CSS Specificity Debt (153 `!important`)
**Situación**: El archivo tiene 153 declaraciones `!important` acumuladas en 4 capas de override (Base L79-950 + V7.14 L950-965 + V7.16 LEGIBILITY_CORE L966-1010 + V7.17 SURGICAL_FIX L1130-1145). Cada versión añadía `!important` para ganar sobre la anterior. Ahora cualquier override nuevo necesita `!important` + source order mayor + selector más específico.

**Dead code conocido**:
- L687: `.mode-pill .mp-lbl{font-size:11px;letter-spacing:0.02em}` — DEAD (overrideado por V7.17 L1131 `font-size:16px!important`) pero sigue presente.
- L684: `[data-theme="dark"] .mode-pill{background:rgba(0,0,0,0.95)!important}` — DEAD (V7.16 fuerza `rgba(0,0,0,0.78)!important` globalmente).

**Pregunta EXPLAYADA**: Dame un plan ATÓMICO (paso a paso, 1 selector a la vez) para reducir de 153 → ≤100 `!important` SIN romper ningún computed style actualmente activo. Para cada paso:
1. ¿Qué `!important` eliminás?
2. ¿Por qué es seguro eliminarlo (qué regla lo sobreescribe o qué specificity gana)?
3. ¿Cómo verificás que no haya regresión visual?
4. ¿Cuál es el rollback si falla?

## ISSUE UF-04: Dead Code en L687
**Código muerto**: `.mode-pill .mp-lbl{font-size:11px;letter-spacing:0.02em}` en L687.

**Pregunta EXPLAYADA**:
1. ¿Es seguro eliminar esta línea completa? ¿O `letter-spacing:0.02em` sigue siendo útil (no se override en V7.17)?
2. Si elimino solo `font-size:11px` y dejo `letter-spacing:0.02em`, ¿hay alguna diferencia visual?
3. ¿Hay más dead code similar en el archivo que deba detectar? Dame un método sistemático para encontrarlo (regex, grep patterns, etc.).

## ISSUE UF-05: launchDeepLink Race Condition (1500ms)
**Código actual** (L2634-2659):
```javascript
function launchDeepLink(url){
  if(!url||url==='#')return;
  if(url.indexOf('intent://')!==0){
    window.open(url,'_blank','noopener');
    return;
  }
  var fbMatch=url.match(/S\.browser_fallback_url=([^;]+)/);
  var fallback=fbMatch?decodeURIComponent(fbMatch[1]):null;
  var appOpened=false;
  function onVisChange(){if(document.hidden)appOpened=true;}
  document.addEventListener('visibilitychange',onVisChange);
  window.location.href=url;
  setTimeout(function(){
    document.removeEventListener('visibilitychange',onVisChange);
    if(!appOpened&&!document.hidden&&fallback){
      window.location.href=fallback;
    }
  },1500);
}
```

**Problema**: El timer de 1500ms puede dispararse ANTES de que `visibilitychange` registre que la app abrió (race condition). En dispositivos lentos, la app puede tardar 1400ms en abrir, `visibilitychange` se dispara a 1450ms, pero el timer ya evaluó `!appOpened` a 1500ms y redirigió al Play Store → doble redirect (app + Play Store).

**Pregunta EXPLAYADA**:
1. ¿Cuál es el timeout óptimo? ¿1500ms es muy corto? ¿Debería ser 2000ms, 2500ms?
2. ¿Hay una API mejor que `visibilitychange` para detectar app-open? (pagehide, blur, Page Visibility API v2, etc.)
3. ¿Cómo manejo el caso de iOS donde `intent://` no funciona y solo tengo App Store links?
4. Dame el código refactorizado EXPLAYADO con comentarios explicando cada decisión.

## ISSUE UF-02: DiDi Deep-Link (fix REAL, no workaround)
**Situación actual**: Copiamos la dirección al clipboard antes de lanzar DiDi. El usuario debe pegarla manualmente.

**Pregunta EXPLAYADA**: Investigá si existe ALGUNA forma de pre-fillar DiDi con coordenadas. Específicamente:
1. ¿`didi://` scheme tiene parámetros documentados o reverse-engineered? (buscá en XDA, Reddit, DiDi APK decompilations)
2. ¿DiDi soporta Web Intents o Universal Links en Argentina?
3. ¿Existe un endpoint HTTP de DiDi que acepte `?pickup_lat=&pickup_lon=&dropoff_lat=&dropoff_lon=`?
4. ¿El botón "Compartir" de Android puede route a DiDi's search field?
5. Si no hay fix real, ¿cuál es el mejor UX workaround? (clipboard + toast es lo que tenemos — hay algo mejor?)

## ISSUE UF-08: LCP Variability (268ms — 10s)
**Datos observados** (Agent Browser, 390x844, V7.18.2):
- Mejor: 268ms (warm cache)
- Mediana: ~3s
- Peor: 10216ms (cold compile)

**Pregunta EXPLAYADA**:
1. ¿Qué bloquea el LCP en esta PWA? (MapLibre compile, CARTO style fetch, inline CSS parse, inline JS parse)
2. ¿Debería mover CSS/JS a archivos externos con cache? ¿O mantener inline para first-paint?
3. ¿`<link rel="preload">` para MapLibre y CARTO style ayudaría?
4. ¿Critical CSS inlining (above-the-fold) + async load del resto?
5. Dame un plan EXPLAYADO para estabilizar LCP < 2500ms p95.

# CÓDIGO RELEVANTE (para tu análisis)

## CSS — bloque V7.16 LEGIBILITY_CORE (L982-1010, post-V7.18.2 fix):
```css
/* SAKANA-FIX-01 (V7.18.2) — frosted glass */
.search-bar, .mode-pill, .sheet-wrap, .sheet, .cat-panel,
.dialog-overlay, .dialog, .chip, .origin-pill, .map-floating-chip, .search-dropdown{
  background:rgba(0,0,0,0.78)!important;
  -webkit-backdrop-filter:blur(16px) saturate(1.2)!important;
  backdrop-filter:blur(16px) saturate(1.2)!important;
  border:1px solid rgba(255,255,255,0.18)!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:0 0 4px rgba(0,0,0,1)!important;
  font-weight:700!important;
  line-height:1.5!important;
}
```

## CSS — dead code (L683-687):
```css
.mode-pill.active{color:#000000;background:#FFFFFF!important;border-color:#FFFFFF!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;-webkit-text-stroke:0;text-stroke:0;opacity:1}
[data-theme="dark"] .mode-pill{background:rgba(0,0,0,0.95)!important}  /* DEAD — V7.16 overrides */
[data-theme="dark"] .mode-pill.active{color:#000000;background:#FFFFFF!important;border-color:#FFFFFF!important}
.mode-pill .mp-ic{display:flex;align-items:center}
.mode-pill .mp-lbl{font-size:11px;letter-spacing:0.02em}  /* font-size DEAD — V7.17 overrides to 16px!important */
```

## CSS — V7.17 SURGICAL_FIX (L1130-1145):
```css
.mode-pill .mp-lbl{
  font-size:16px!important;
  line-height:1.5!important;
  font-weight:700!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
}
.est-badge, .ahorro-pill-badge, .search-item--empty, .bd-row{
  font-size:16px!important;
}
```

## JS — launchDeepLink (L2634-2659): [ver arriba]

## JS — buildAppLink('didi') (L2870-2877):
```javascript
if(pid==='didi'){
  var didiPlayStore='https://play.google.com/store/apps/details?id=com.didiglobal.passenger';
  var didiAppStore='https://apps.apple.com/ar/app/didi-viajes-comida-y-pagos/id1362398401';
  var _didiUA=navigator.userAgent||'';
  if(/Android/i.test(_didiUA))return 'intent://#Intent;scheme=didi;package=com.didiglobal.passenger;S.browser_fallback_url='+encodeURIComponent(didiPlayStore)+';end';
  if(/iPad|iPhone|iPod/.test(_didiUA))return didiAppStore;
  return didiPlayStore;
}
```

## JS — buildAppLink('uber') para comparar (L2858):
```javascript
if(pid==='uber')return 'https://m.uber.com/ul/?action=setPickup&pickup[latitude]='+origin.lat+'&pickup[longitude]='+origin.lon+'&pickup[formatted_address]=Origen&dropoff[latitude]='+dest.lat+'&dropoff[longitude]='+dest.lon;
```

# INSTRUCCIONES DE RESPUESTA (MODO EXPLAYATE)

1. **NO seas conciso**. Cada respuesta debe ser profunda, con justificación técnica.
2. **Para cada fix propuesto**: da código completo (old + new), explicá el mecanismo, identificá collateral risks, damé verification commands, y rollback.
3. **Priorizá atomicidad**: 1 fix = 1 cambio = 1 selector o 1 función. No propongas refactors multi-archivo.
4. **Si algo no se puede fixear**: explicá por qué técnicamente, y proponé el mejor workaround posible.
5. **Usá números, métricas, specificity values** cuando sea relevante.
6. **Al final**: dale un score de confianza (0-100%) a cada fix propuesto y explicá por qué.

Empezá con UF-03 (css_specificity_debt) porque es el más complejo. Después UF-04, UF-05, UF-02, UF-08 en orden.

FIN PROMPT GEMINI
```

---

## PROMPT 2 — para GPT (ChatGPT / GPT-4o)

```
INICIO PROMPT GPT

# SYSTEM PROMPT
You are a Principal Mobile Web Engineer specializing in PWA performance, CSS architecture, and Android/iOS deep-linking. You're reviewing VOY, a mobility PWA for Santa Fe, Argentina. Respond with MAXIMUM TECHNICAL DEPTH. Elaborate on every point. No shortcuts.

# PROJECT CONTEXT

**VOY** is a single-file PWA (`public/VOY-Lite.html`, 3229 LOC) — HTML+CSS+JS inline, no framework, no bundler. Deployed on Cloudflare Workers. Compares Uber, DiDi, Maxim, taxi, remis, bus for Santa Fe, Argentina.

- **Stack**: MapLibre GL JS + vanilla JS (IIFE modules) + CSS3 (4 override layers) + IndexedDB/LocalStorage
- **Production**: https://voy-app.simondalmasso44.workers.dev
- **GitHub**: https://github.com/simonkey888/VOY
- **Version**: V7.18.2 (just deployed)

# RECENT CHANGES (V7.18.2 — Sakana AI fixes, deployed today)

1. **UF-01 black_squares FIXED**: `background:#000000!important` → `rgba(0,0,0,0.78)!important` + `backdrop-filter:blur(16px) saturate(1.2)!important` on 11 selectors. VLM verified `black_squares_visible=false`.
2. **UF-02 didi_clipboard PARTIAL FIX**: Copy destination to clipboard before launching DiDi. User pastes manually.
3. **UF-09 hero_default FIXED**: `heroProvider` default `'didi'` → `'uber'`.

# ACTIVE URGENT ISSUES — NEED YOUR DEEP ANALYSIS

## UF-03: CSS Specificity Debt (153 `!important`)
The file has 153 `!important` declarations across 4 override layers (Base + V7.14 + V7.16 + V7.17). Each version escalated specificity to win over the previous. This is unsustainable.

**Known dead code**:
- L687: `.mode-pill .mp-lbl{font-size:11px;letter-spacing:0.02em}` — `font-size:11px` is dead (V7.17 L1131 overrides to `16px!important`), but `letter-spacing:0.02em` may still be active.
- L684: `[data-theme="dark"] .mode-pill{background:rgba(0,0,0,0.95)!important}` — dead, V7.16 forces `rgba(0,0,0,0.78)!important` globally regardless of theme.

**YOUR TASK** (EXPLAYATE):
A. Explain WHY `!important` escalation happens in CSS override layers (specificity war mechanics).
B. Give me a SYSTEMATIC method to identify which `!important` are safe to remove (dead overrides, redundant wins, etc.).
C. Propose an atomic removal plan: 5-10 specific `!important` declarations I can remove TODAY, with full justification for each (what overrides it, why safe, verification method).
D. Long-term: should I refactor to CSS layers (`@layer`), CSS variables, or BEM naming? Compare approaches for this single-file PWA context.

## UF-04: Dead Code L687
```css
.mode-pill .mp-lbl{font-size:11px;letter-spacing:0.02em}
```
V7.17 L1131 overrides `font-size` to `16px!important` but does NOT touch `letter-spacing`.

**YOUR TASK** (EXPLAYATE):
A. If I delete the entire L687 line, does `letter-spacing` revert to a default? What's the default?
B. Should I keep `letter-spacing:0.02em` (move it to V7.17 block) or remove it entirely? Aesthetic impact?
C. Give me a grep/regex pattern to find ALL similar dead declarations in the file (where a property is set at base level but overridden by `!important` later).

## UF-05: launchDeepLink Race Condition
```javascript
function launchDeepLink(url){
  if(!url||url==='#')return;
  if(url.indexOf('intent://')!==0){
    window.open(url,'_blank','noopener');
    return;
  }
  var fbMatch=url.match(/S\.browser_fallback_url=([^;]+)/);
  var fallback=fbMatch?decodeURIComponent(fbMatch[1]):null;
  var appOpened=false;
  function onVisChange(){if(document.hidden)appOpened=true;}
  document.addEventListener('visibilitychange',onVisChange);
  window.location.href=url;
  setTimeout(function(){
    document.removeEventListener('visibilitychange',onVisChange);
    if(!appOpened&&!document.hidden&&fallback){
      window.location.href=fallback;
    }
  },1500);
}
```

**Problem**: 1500ms timeout may fire before `visibilitychange` registers app-open on slow devices → double-redirect (app opens + Play Store opens).

**YOUR TASK** (EXPLAYATE):
A. Explain the EXACT race condition timing. At what device speed does it fail?
B. Compare: `visibilitychange` vs `pagehide` vs `blur` vs `Page Visibility API v2` — which is most reliable for app-open detection?
C. Should the timeout be 1500ms, 2000ms, 2500ms, or dynamic? Give me data-backed reasoning.
D. iOS has no `intent://` support — how should I handle iOS deep-links differently? (Current: App Store link only, no pre-fill possible)
E. Give me the REFACTORED code with extensive comments explaining each decision.

## UF-02: DiDi Real Deep-Link (not workaround)
Current: `intent://#Intent;scheme=didi;package=com.didiglobal.passenger;S.browser_fallback_url=...;end` — opens DiDi to home screen, no destination pre-filled. We copy address to clipboard as workaround.

**YOUR TASK** (EXPLAYATE):
A. Research: does `didi://` scheme accept ANY query parameters? (check XDA, Reddit r/androiddev, APK decompilations of com.didiglobal.passenger)
B. Does DiDi publish Universal Links for Argentina? (check didiglobal.com, developer portals)
C. Is there an HTTP endpoint like `https://didi.com/...?pickup=X&dropoff=Y` that opens the app with pre-filled route?
D. Android: can I use `navigator.share()` or Web Share Target API to send destination TO DiDi's search field?
E. If NO real fix exists, what's the BEST UX workaround? (clipboard is current — is there something better like QR code, share sheet, etc.?)
F. Confidence level (0-100%) that a real pre-fill fix exists for DiDi in Argentina 2026.

## UF-08: LCP Variability (268ms — 10216ms)
Observed LCP range on V7.18.2 (Agent Browser, mobile 390x844):
- Best: 268ms (warm)
- Median: ~3000ms
- Worst: 10216ms (cold compile)

**YOUR TASK** (EXPLAYATE):
A. What blocks LCP in a single-file PWA with MapLibre GL + inline CSS/JS + CARTO tiles?
B. Should I externalize CSS/JS for caching, or keep inline for first-paint? Trade-offs.
C. Would `<link rel="preload" as="script" href="libs/maplibre-gl.js">` help?
D. Critical CSS strategy: inline above-the-fold CSS, async-load the rest. How to implement in a single-file PWA?
E. MapLibre is ~200KB — should I lazy-load it (only when map is visible) or preload?
F. Give me a concrete plan to stabilize LCP p95 < 2500ms.

# CODE REFERENCES

## buildAppLink comparison (L2858-2893):
```javascript
// UBER — full pre-fill ✅
if(pid==='uber')return 'https://m.uber.com/ul/?action=setPickup&pickup[latitude]='+origin.lat+'&pickup[longitude]='+origin.lon+'&pickup[formatted_address]=Origen&dropoff[latitude]='+dest.lat+'&dropoff[longitude]='+dest.lon;

// DIDI — no pre-fill ❌
if(pid==='didi'){
  var didiPlayStore='https://play.google.com/store/apps/details?id=com.didiglobal.passenger';
  var didiAppStore='https://apps.apple.com/ar/app/didi-viajes-comida-y-pagos/id1362398401';
  var _didiUA=navigator.userAgent||'';
  if(/Android/i.test(_didiUA))return 'intent://#Intent;scheme=didi;package=com.didiglobal.passenger;S.browser_fallback_url='+encodeURIComponent(didiPlayStore)+';end';
  if(/iPad|iPhone|iPod/.test(_didiUA))return didiAppStore;
  return didiPlayStore;
}

// MAXIM — full pre-fill (Android) ✅
if(isAndroid){return 'intent://order?startLat='+origin.lat+'&startLon='+origin.lon+'&finishLat='+dest.lat+'&finishLon='+dest.lon+'#Intent;scheme=maxim;package=com.taxsee.taxsee;S.browser_fallback_url='+encodeURIComponent(playStore)+';end'}
```

## heroProvider (L2378, post-V7.18.2):
```javascript
var heroProvider=hero?hero.id:'uber'; // V7.18.2: changed from 'didi'
```

## CSS override layers structure:
- Base (L79-950): ~60 !important
- V7.14 (L950-965): ~5 !important
- V7.16 LEGIBILITY_CORE (L966-1010): ~45 !important (the black_squares block, now frosted glass)
- V7.17 SURGICAL_FIX (L1130-1145): ~8 !important
- Scattered inline: ~35 !important

# RESPONSE FORMAT (MANDATORY)

1. **EXPLAYATE**: Every answer must be thorough. No 1-paragraph answers. Multiple paragraphs with technical depth.
2. **Code blocks**: For every proposed fix, give complete old + new code with line context.
3. **Justification**: Why this works, mechanically. Specificity values. Cascade order. Browser compat.
4. **Collateral risk**: What else might break.
5. **Verification**: Console command or Agent Browser eval to verify.
6. **Confidence score**: 0-100% for each fix.
7. **Order**: Address UF-03 first (most complex), then UF-04, UF-05, UF-02, UF-08.

Begin.

FIN PROMPT GPT
```

---

## Notas de uso

1. **Gemini**: Pegá PROMPT 1 en Google AI Studio o Gemini Advanced. Gemini tiende a ser más visual/UX-focused — bueno para validar el frosted glass y proponer alternativas estéticas.

2. **GPT**: Pegá PROMPT 2 en ChatGPT (GPT-4o ideal). GPT tiende a ser más profundo en análisis técnico/specificity — bueno para el plan de reducción de `!important` y el refactor de launchDeepLink.

3. **Cross-validation**: Después de recibir ambas respuestas, compará:
   - Si ambos coinciden en un fix → alta confianza → aplicalo.
   - Si disienten → analizá los trade-offs antes de decidir.
   - Si uno propone algo que el otro no consideró → evaluá por separado.

4. **Ambos prompts son autocontenido**: no necesitan que pegues el código del proyecto aparte. Pero si querés darles el .md completo con TODO el código, usá `VOY-PROJECT-CODE.md` (generado por separado) como context adicional.
