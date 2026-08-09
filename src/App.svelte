<script lang="ts">
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { currentRoute } from './app/routes';
  import { cameraPaddingFor, deriveInteractionState, nextCollapsedSnap, type SheetSnap } from './app/interaction';
  import type { Coordinates } from './core/coordinates';
  import type { TravelMode } from './core/duration';
  import DestinationSearch from './components/DestinationSearch.svelte';
  import OriginControl from './components/OriginControl.svelte';
  import MapViewport from './components/MapViewport.svelte';
  import ModeSelector from './components/ModeSelector.svelte';
  import TripDecisionSheet from './components/TripDecisionSheet.svelte';
  import StatusMessage from './components/StatusMessage.svelte';
  import OfflineBanner from './components/OfflineBanner.svelte';
  import ConfirmExternalAction from './components/ConfirmExternalAction.svelte';
  import LegalView from './components/LegalView.svelte';
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
  let originLabel = 'Elegí tu origen';
  let selectedDestination: Destination | null = null;
  let mode: TravelMode = 'app';
  let routeResult = get(trip).route;
  let options: ProviderOptionModel[] = [];
  let message = 'Elegí origen y destino para comparar opciones.';
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
    const collapsed = nextCollapsedSnap(sheetSnap);
    if (routeReady && collapsed) {
      sheetSnap = collapsed;
      return true;
    }
    if (action) {
      action = null;
      return true;
    }
    if (voiceOpen) {
      voiceOpen = false;
      return true;
    }
    return false;
  }

  function onEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    if (dismissTransient()) {
      event.preventDefault();
      event.stopPropagation();
    }
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
    syncViewport();
    syncOnline();
    viewport?.addEventListener('resize', syncViewport);
    addEventListener('resize', syncViewport);
    addEventListener('online', syncOnline);
    addEventListener('offline', syncOnline);
    addEventListener('keydown', onEscape, true);

    const rootState = { ...(history.state || {}), voyRoot: true };
    history.replaceState(rootState, '', location.href);
    history.pushState({ ...rootState, voyGuard: true }, '', location.href);
    const onPopState = () => {
      if (dismissTransient()) {
        queueMicrotask(() => history.pushState({ ...rootState, voyGuard: true }, '', location.href));
      } else {
        history.back();
      }
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

  function hasOperationalDestination(value: Destination | null): value is Destination {
    return Boolean(value?.operational && value.verified && value.confidence === 'authoritative' && value.provenance);
  }

  async function calculate(): Promise<void> {
    if (!origin || !selectedDestination) return;
    if (!hasOperationalDestination(selectedDestination)) {
      controller?.abort();
      routeResult = null;
      options = [];
      routeLoading = false;
      message = 'El destino no tiene procedencia autoritativa suficiente para calcular un viaje.';
      tone = 'error';
      return;
    }
    controller?.abort();
    const activeController = new AbortController();
    controller = activeController;
    routeLoading = true;
    message = mode === 'bus' ? 'Verificando si hay datos actuales de colectivo…' : 'Calculando una referencia verificable…';
    tone = 'info';
    try {
      if (mode === 'bus') {
        routeResult = null;
        options = await providerOptions(null, mode);
        trip.set({ origin, originLabel, route: null, mode, loading: false, error: '' });
        message = 'No recomendamos líneas de colectivo hasta contar con recorridos, paradas, frecuencias y sentidos actuales.';
        tone = 'info';
        sheetSnap = 'peek';
        return;
      }
      routeResult = await resolveRoute(origin, selectedDestination.coordinates, mode, activeController.signal);
      options = await providerOptions(routeResult, mode);
      trip.set({ origin, originLabel, route: routeResult, mode, loading: false, error: '' });
      message = routeResult.source === 'osrm_route' ? 'Ruta calculada. Revisá las condiciones de cada opción.' : 'No hubo ruta vial verificable: mostramos sólo una estimación en línea recta.';
      tone = routeResult.source === 'osrm_route' ? 'success' : 'info';
      sheetSnap = 'peek';
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        routeResult = null;
        options = [];
        message = 'No pudimos calcular el viaje. Revisá origen y destino.';
        tone = 'error';
      }
    } finally {
      if (controller === activeController) routeLoading = false;
    }
  }

  function setOrigin(coordinates: Coordinates, label: string): void {
    origin = coordinates;
    originLabel = label;
    manualOriginOpen = false;
    void calculate();
  }

  function setDestination(value: Destination): void {
    if (!hasOperationalDestination(value)) {
      selectedDestination = null;
      destination.set(null);
      routeResult = null;
      options = [];
      routeLoading = false;
      message = 'Ese destino no tiene procedencia autoritativa suficiente.';
      tone = 'error';
      return;
    }
    selectedDestination = value;
    destination.set(value);
    searchFocused = false;
    searchResultsOpen = false;
    sheetSnap = 'peek';
    void calculate();
  }

  function setMode(value: TravelMode): void {
    mode = value;
    sheetSnap = 'peek';
    void calculate();
  }

  function choose(option: ProviderOptionModel): void {
    if (!origin || !hasOperationalDestination(selectedDestination) || !option.available || !option.external || (option.id !== 'uber' && option.id !== 'didi')) return;
    sheetSnap = 'peek';
    action = createExternalAction(option.id, origin, selectedDestination.coordinates);
  }

  function confirmAction(): void {
    if (!action) return;
    try {
      const url = consumeExternalAction(action);
      action = null;
      location.assign(url);
    } catch {
      action = null;
      message = 'La confirmación venció. Volvé a elegir la opción.';
      tone = 'error';
    }
  }
</script>

{#if routePath !== '/'}
  <LegalView route={routePath} />
{:else}
  <OfflineBanner />
  <main class="app-shell" data-testid="app-shell" data-interaction-state={interactionState}>
    <header class="brand">
      <a href="/" aria-label="VOY inicio">VOY</a>
      <div class="brand-context"><span>Santa Fe</span><span aria-hidden="true">·</span><span>decisión urbana</span></div>
      <button type="button" class="theme-toggle" on:click={cycleTheme} aria-label={`Tema: ${themeLabel}. Cambiar tema`} data-testid="theme-toggle"><span aria-hidden="true">◐</span><span>{themeLabel}</span></button>
    </header>

    <div class="journey-layout map-first-layout" data-testid="map-first-layout" data-interaction-state={interactionState} data-sheet-snap={effectiveSheetSnap} data-keyboard-open={keyboardOpen ? 'true' : 'false'}>
      <section class="controls planner" aria-label="Planificar viaje">
        <div class="planner-intro" aria-hidden="true">
          <p class="eyebrow">Movilidad urbana · Santa Fe</p>
          <p class="planner-promise">Cuánto cuesta. Cuánto tarda. Qué conviene.</p>
        </div>
        <div class="journey-builder" data-testid="journey-builder">
          <DestinationSearch
            onSelect={setDestination}
            dismissToken={searchDismissToken}
            onFocusState={(value) => searchFocused = value}
            onResultsState={(value) => searchResultsOpen = value}
          />
          <OriginControl
            label={originLabel}
            onOrigin={setOrigin}
            dismissToken={originDismissToken}
            onManualState={(value) => manualOriginOpen = value}
          />
        </div>
        {#if origin && selectedDestination}<ModeSelector value={mode} onChange={setMode} />{/if}
        <StatusMessage {message} {tone} />
        {#if capabilities?.voice && !voiceOpen}<button type="button" class="assistant-trigger" on:click={openVoice} data-testid="voice-open"><span>Asistente VOY</span><span aria-hidden="true">↗</span></button>{/if}
        {#if voiceOpen && VoiceComponent}<svelte:component this={VoiceComponent} onClose={() => voiceOpen = false} />{/if}
      </section>

      <MapViewport origin={origin} destination={selectedDestination?.coordinates || null} route={routeResult} cameraPadding={mapPadding} interactionEnabled={mapInteractionEnabled} />

      {#if selectedDestination && (routeResult || options.length)}
        <TripDecisionSheet route={routeResult} {options} onChoose={choose} destination={selectedDestination} snap={effectiveSheetSnap} onSnapChange={(value) => sheetSnap = value} />
      {:else}
        <section class="decision-empty" aria-label="Comparación pendiente" data-testid="decision-empty">
          <span class="decision-index">01</span>
          <div><strong>Armá el viaje.</strong><p>Con origen y destino verificados, VOY ordena las opciones que puede sostener con datos.</p></div>
        </section>
      {/if}
    </div>

    <footer><a href="/privacy">Privacidad</a><a href="/terms">Términos</a><a href="/sources">Fuentes</a><a href="/contact">Contacto</a></footer>
  </main>
  <ConfirmExternalAction {action} onConfirm={confirmAction} onCancel={() => action = null} />
{/if}
