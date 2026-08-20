<script lang="ts">
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { currentRoute } from './app/routes';
  import { cameraPaddingFor, deriveInteractionState, nextCollapsedSnap, type SheetSnap } from './app/interaction';
  import type { Coordinates } from './core/coordinates';
  import type { TravelMode } from './core/duration';
  import { territoryLabel, type TerritoryContext } from './core/territory';
  import DestinationSearch from './components/DestinationSearch.svelte';
  import OriginControl from './components/OriginControl.svelte';
  import MapViewport from './components/MapViewport.svelte';
  import ModeSelector from './components/ModeSelector.svelte';
  import TripDecisionSheet from './components/TripDecisionSheet.svelte';
  import StatusMessage from './components/StatusMessage.svelte';
  import OfflineBanner from './components/OfflineBanner.svelte';
  import ConfirmExternalAction from './components/ConfirmExternalAction.svelte';
  import LegalView from './components/LegalView.svelte';
  import AccountView from './components/AccountView.svelte';
  import type { Destination } from './features/destination/destination.types';
  import { destination } from './features/destination/destination.store';
  import { trip } from './features/trip/trip.store';
  import { resolveRoute } from './features/trip/trip.service';
  import type { ProviderOptionModel } from './features/providers/provider.types';
  import { providerOptions } from './features/providers/provider.registry';
  import { consumeExternalAction, createExternalAction, type ExternalAction } from './features/providers/provider.actions';
  import { health, type HealthPayload } from './lib/api';
  import { loadPreferences, savePreferences, type Preferences } from './lib/storage';

  const routePath = currentRoute();
  let origin: Coordinates | null = null;
  let originTerritory: TerritoryContext | null = null;
  let originLabel = 'Elegí tu origen';
  let selectedDestination: Destination | null = null;
  let mode: TravelMode = 'app';
  let routeResult = get(trip).route;
  let options: ProviderOptionModel[] = [];
  let message = 'Elegí origen y destino para comparar lo que VOY puede verificar.';
  let tone: 'info' | 'error' | 'success' = 'info';
  let controller: AbortController | null = null;
  let action: ExternalAction | null = null;
  let capabilities: HealthPayload['features'] | null = null;
  let voiceOpen = false;
  let VoiceComponent: typeof import('./components/VoiceAssistant.svelte').default | null = null;
  let theme: Preferences['theme'] = 'system';
  let analyticsPreference = false;

  let searchFocused = false;
  let searchResultsOpen = false;
  let manualOriginOpen = false;
  let searchDismissToken = 0;
  let originDismissToken = 0;
  let routeLoading = false;
  let sheetSnap: SheetSnap = 'peek';
  let keyboardOpen = false;
  let viewportWidth = 390;
  let offline = false;

  function applyTheme(value: Preferences['theme']): void {
    if (value === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = value;
    dispatchEvent(new CustomEvent('voy-theme-change', { detail: value }));
  }

  function cycleTheme(): void {
    theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    applyTheme(theme);
    savePreferences({ theme, analytics: analyticsPreference });
  }

  $: themeLabel = theme === 'system' ? 'Auto' : theme === 'light' ? 'Claro' : 'Oscuro';
  $: activeTerritory = selectedDestination?.territory || originTerritory;
  $: activeTerritoryLabel = territoryLabel(activeTerritory);
  $: localCoverageKey = originTerritory?.coverageKey === 'santa-fe' && selectedDestination?.coverageKey === 'santa-fe' ? 'santa-fe' : '_default';
  $: routeReady = Boolean(selectedDestination && (routeResult || options.length));
  $: effectiveSheetSnap = keyboardOpen ? 'peek' : sheetSnap;
  $: interactionState = deriveInteractionState({
    searchFocused,
    searchResults: searchResultsOpen,
    manualOrigin: manualOriginOpen,
    destinationSelected: Boolean(selectedDestination),
    originReady: Boolean(origin),
    routeLoading,
    routeReady,
    sheetSnap: effectiveSheetSnap,
    externalConfirmation: Boolean(action),
    voiceActive: voiceOpen,
    offline,
    recoverableError: tone === 'error'
  });
  $: mapPadding = cameraPaddingFor(effectiveSheetSnap, viewportWidth, keyboardOpen, searchFocused || searchResultsOpen);
  $: mapInteractionEnabled = interactionState !== 'EXTERNAL_CONFIRMATION' && interactionState !== 'VOICE_ACTIVE';

  function dismissTransient(): boolean {
    if (searchResultsOpen || searchFocused) {
      searchDismissToken += 1;
      searchResultsOpen = false;
      searchFocused = false;
      return true;
    }
    if (manualOriginOpen) {
      originDismissToken += 1;
      manualOriginOpen = false;
      return true;
    }
    if (action) { action = null; return true; }
    if (voiceOpen) { voiceOpen = false; return true; }
    const collapsed = nextCollapsedSnap(sheetSnap);
    if (routeReady && collapsed) { sheetSnap = collapsed; return true; }
    return false;
  }

  function onEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    if (dismissTransient()) { event.preventDefault(); event.stopPropagation(); }
  }

  onMount(() => {
    const preferences = loadPreferences();
    theme = preferences.theme;
    analyticsPreference = preferences.analytics;
    applyTheme(theme);
    void health().then(payload => { capabilities = payload.features || null; }).catch(() => { capabilities = null; });

    const viewport = window.visualViewport;
    const syncViewport = () => {
      viewportWidth = window.innerWidth;
      const visibleHeight = viewport?.height ?? window.innerHeight;
      keyboardOpen = visibleHeight < window.innerHeight * 0.78;
    };
    const syncOnline = () => { offline = !navigator.onLine; };
    syncViewport(); syncOnline();
    viewport?.addEventListener('resize', syncViewport);
    addEventListener('resize', syncViewport);
    addEventListener('online', syncOnline);
    addEventListener('offline', syncOnline);
    addEventListener('keydown', onEscape, true);

    const rootState = { ...(history.state || {}), voyRoot: true };
    history.replaceState(rootState, '', location.href);
    history.pushState({ ...rootState, voyGuard: true }, '', location.href);
    const onPopState = () => {
      if (dismissTransient()) queueMicrotask(() => history.pushState({ ...rootState, voyGuard: true }, '', location.href));
      else history.back();
    };
    addEventListener('popstate', onPopState);

    return () => {
      viewport?.removeEventListener('resize', syncViewport);
      removeEventListener('resize', syncViewport);
      removeEventListener('online', syncOnline);
      removeEventListener('offline', syncOnline);
      removeEventListener('keydown', onEscape, true);
      removeEventListener('popstate', onPopState);
    };
  });

  async function openVoice(): Promise<void> {
    VoiceComponent ||= (await import('./components/VoiceAssistant.svelte')).default;
    searchDismissToken += 1;
    originDismissToken += 1;
    searchFocused = false;
    searchResultsOpen = false;
    manualOriginOpen = false;
    sheetSnap = 'peek';
    voiceOpen = true;
  }

  function isRouteEligibleDestination(value: Destination | null): value is Destination {
    return Boolean(value?.routeEligible && value.territoryVerified && value.territory?.countryId === 'AR');
  }

  async function calculate(): Promise<void> {
    if (!origin || !originTerritory || !selectedDestination) return;
    if (!isRouteEligibleDestination(selectedDestination)) {
      controller?.abort(); routeResult = null; options = []; routeLoading = false;
      message = 'El destino no tiene contexto territorial argentino suficiente para calcular un viaje.';
      tone = 'error'; return;
    }
    controller?.abort();
    const activeController = new AbortController();
    controller = activeController;
    routeLoading = true;
    message = mode === 'bus' ? 'Verificando datos territoriales de transporte…' : 'Calculando una referencia verificable…';
    tone = 'info';
    try {
      if (mode === 'bus') {
        routeResult = null;
        options = await providerOptions(null, mode, localCoverageKey);
        trip.set({ origin, originLabel, route: null, mode, loading: false, error: '' });
        message = localCoverageKey === 'santa-fe'
          ? 'No recomendamos líneas de colectivo hasta contar con recorridos, paradas, frecuencias y sentidos actuales.'
          : `VOY resolvió ${activeTerritoryLabel}, pero no tiene transporte público local verificado para recomendar.`;
        tone = 'info'; sheetSnap = 'peek'; return;
      }
      routeResult = await resolveRoute(origin, selectedDestination.coordinates, mode, activeController.signal);
      options = await providerOptions(routeResult, mode, localCoverageKey);
      trip.set({ origin, originLabel, route: routeResult, mode, loading: false, error: '' });
      if (routeResult.source === 'osrm_route') {
        message = localCoverageKey === 'santa-fe'
          ? 'Ruta calculada. Revisá la procedencia y condiciones de cada opción.'
          : `Ruta calculada en ${activeTerritoryLabel}. Las opciones locales sólo aparecen cuando VOY tiene evidencia territorial vigente.`;
        tone = 'success';
      } else {
        message = 'No hubo ruta vial verificable: mostramos sólo una estimación en línea recta.';
        tone = 'info';
      }
      sheetSnap = 'peek';
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        routeResult = null; options = [];
        message = 'No pudimos calcular el viaje con evidencia suficiente. Revisá origen y destino.';
        tone = 'error';
      }
    } finally {
      if (controller === activeController) routeLoading = false;
    }
  }

  function setOrigin(coordinates: Coordinates, label: string, territory: TerritoryContext): void {
    origin = coordinates;
    originTerritory = territory;
    originLabel = label;
    manualOriginOpen = false;
    void calculate();
  }

  function setDestination(value: Destination): void {
    if (!isRouteEligibleDestination(value)) {
      selectedDestination = null; destination.set(null); routeResult = null; options = []; routeLoading = false;
      message = 'Ese destino no tiene contexto territorial argentino suficiente.'; tone = 'error'; return;
    }
    selectedDestination = value;
    destination.set(value);
    searchFocused = false; searchResultsOpen = false; sheetSnap = 'peek';
    void calculate();
  }

  function setMode(value: TravelMode): void { mode = value; sheetSnap = 'peek'; void calculate(); }

  function choose(option: ProviderOptionModel): void {
    if (!origin || !isRouteEligibleDestination(selectedDestination) || localCoverageKey !== 'santa-fe' || !option.available || !option.external || (option.id !== 'uber' && option.id !== 'didi')) return;
    action = createExternalAction(option.id, origin, selectedDestination.coordinates);
  }

  function confirmAction(): void {
    if (!action) return;
    try { const url = consumeExternalAction(action); action = null; location.assign(url); }
    catch { action = null; message = 'La confirmación venció. Volvé a elegir la opción.'; tone = 'error'; }
  }
</script>

{#if routePath === '/account'}
  <AccountView />
{:else if routePath !== '/'}
  <LegalView route={routePath} />
{:else}
  <OfflineBanner />
  <main class="app-shell" data-testid="app-shell" data-interaction-state={interactionState} data-coverage-key={localCoverageKey}>
    <header class="brand">
      <a href="/" aria-label="VOY inicio" class="brand-link"><img src="/brand/voy-mark.svg" width="38" height="38" alt="" /><span>VOY</span></a>
      <div class="brand-context"><span>{activeTerritory ? activeTerritoryLabel : 'Argentina'}</span><span aria-hidden="true">·</span><span>movilidad verificable</span></div>
      <div class="header-actions"><a class="account-link" href="/account">Cuenta</a><button type="button" class="theme-toggle" on:click={cycleTheme} aria-label={`Tema: ${themeLabel}. Cambiar tema`} data-testid="theme-toggle"><span aria-hidden="true">◐</span><span>{themeLabel}</span></button></div>
    </header>

    <div class="journey-layout map-first-layout" data-testid="map-first-layout" data-interaction-state={interactionState} data-sheet-snap={effectiveSheetSnap} data-keyboard-open={keyboardOpen ? 'true' : 'false'}>
      <section class="controls planner" aria-label="Planificar viaje">
        <div class="planner-intro">
          <p class="eyebrow">Movilidad urbana · Argentina</p>
          <p class="planner-promise">Cuánto cuesta. Cuánto tarda. Qué podés verificar.</p>
          <p class="territory-truth" data-testid="territory-truth">{activeTerritory ? activeTerritoryLabel : 'Argentina'} · {localCoverageKey === 'santa-fe' ? 'cobertura local verificada por componente' : 'base territorial nacional; movilidad local sólo con evidencia'}</p>
        </div>
        <div class="journey-builder" data-testid="journey-builder">
          <DestinationSearch onSelect={setDestination} dismissToken={searchDismissToken} onFocusState={(value) => searchFocused = value} onResultsState={(value) => searchResultsOpen = value} />
          <OriginControl label={originLabel} onOrigin={setOrigin} dismissToken={originDismissToken} onManualState={(value) => manualOriginOpen = value} />
        </div>
        {#if origin && selectedDestination}<ModeSelector value={mode} onChange={setMode} />{/if}
        <StatusMessage {message} {tone} />
        {#if capabilities?.voice && !voiceOpen}<button type="button" class="assistant-trigger" on:click={openVoice} data-testid="voice-open"><span class="assistant-label"><img src="/brand/voy-assistant.svg" width="24" height="28" alt="" />Asistente VOY</span><span aria-hidden="true">↗</span></button>{/if}
        {#if voiceOpen && VoiceComponent}<svelte:component this={VoiceComponent} onClose={() => voiceOpen = false} />{/if}
      </section>

      <MapViewport origin={origin} destination={selectedDestination?.coordinates || null} route={routeResult} cameraPadding={mapPadding} interactionEnabled={mapInteractionEnabled} />

      {#if selectedDestination && (routeResult || options.length)}
        <TripDecisionSheet route={routeResult} {options} onChoose={choose} destination={selectedDestination} snap={effectiveSheetSnap} onSnapChange={(value) => sheetSnap = value} />
      {:else}
        <section class="decision-empty" aria-label="Comparación pendiente" data-testid="decision-empty">
          <span class="decision-index">01</span>
          <div><strong>Armá el viaje.</strong><p>Resolvé origen y destino. VOY separa territorio, ruta y cobertura local para no inventar opciones.</p></div>
        </section>
      {/if}
    </div>

    <footer><span>Hecho en Santa Fe, Argentina</span><a href="/about">Acerca de</a><a href="/coverage">Cobertura</a><a href="/privacy">Privacidad</a><a href="/terms">Términos</a><a href="/sources">Fuentes</a><a href="/support">Soporte</a></footer>
  </main>
  <ConfirmExternalAction {action} onConfirm={confirmAction} onCancel={() => action = null} />
{/if}

<style>
  .brand-link{gap:8px}.brand-link img{flex:0 0 auto}.header-actions{justify-self:end;display:flex;align-items:center;gap:8px}.account-link{min-height:44px;display:inline-flex;align-items:center;padding:0 10px;text-decoration:none;font-size:13px;font-weight:700;border-bottom:1px solid transparent}.account-link:hover{border-color:currentColor}.assistant-label{display:inline-flex;align-items:center;gap:8px}.territory-truth{margin:9px 0 0;color:var(--voy-muted);font-size:12px;line-height:1.45;max-width:48ch}
  @media(max-width:560px){.brand-context{display:none}.brand{grid-template-columns:1fr auto}.header-actions{gap:4px}.account-link{padding:0 6px}.theme-toggle{min-width:72px}.planner-promise{max-width:18ch}}
</style>
