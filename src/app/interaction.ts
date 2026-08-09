export type InteractionState =
  | 'IDLE'
  | 'SEARCH_FOCUSED'
  | 'SEARCH_RESULTS'
  | 'DESTINATION_SELECTED'
  | 'ORIGIN_REQUIRED'
  | 'ORIGIN_READY'
  | 'ROUTE_LOADING'
  | 'ROUTE_READY'
  | 'DECISION_PEEK'
  | 'DECISION_HALF'
  | 'DECISION_EXPANDED'
  | 'EXTERNAL_CONFIRMATION'
  | 'VOICE_ACTIVE'
  | 'OFFLINE'
  | 'ERROR_RECOVERABLE';

export type SheetSnap = 'peek' | 'half' | 'expanded';
export type MapPadding = { top: number; right: number; bottom: number; left: number };

export interface InteractionInputs {
  searchFocused: boolean;
  searchResults: boolean;
  manualOrigin: boolean;
  destinationSelected: boolean;
  originReady: boolean;
  routeLoading: boolean;
  routeReady: boolean;
  sheetSnap: SheetSnap;
  externalConfirmation: boolean;
  voiceActive: boolean;
  offline: boolean;
  recoverableError: boolean;
}

export interface StateContract {
  visible: readonly string[];
  hidden: readonly string[];
  mapInteraction: 'enabled' | 'disabled';
  mapPadding: 'BASE' | 'SEARCH' | 'PEEK' | 'HALF' | 'EXPANDED';
  keyboard: 'normal' | 'search-safe' | 'dismissed';
  focus: string;
  back: string;
  escape: string;
  scrollOwner: 'page' | 'search-results' | 'sheet' | 'modal' | 'voice';
  ariaLive: 'off' | 'polite' | 'assertive';
}

const base: StateContract = {
  visible: ['map', 'planner'],
  hidden: [],
  mapInteraction: 'enabled',
  mapPadding: 'BASE',
  keyboard: 'normal',
  focus: 'none',
  back: 'navigate',
  escape: 'none',
  scrollOwner: 'page',
  ariaLive: 'polite'
};

export const STATE_CONTRACTS: Record<InteractionState, StateContract> = {
  IDLE: { ...base },
  SEARCH_FOCUSED: { ...base, visible: ['map', 'planner', 'search'], mapPadding: 'SEARCH', keyboard: 'search-safe', focus: 'destination-input', back: 'close-search', escape: 'close-search' },
  SEARCH_RESULTS: { ...base, visible: ['map', 'planner', 'search-results'], mapPadding: 'SEARCH', keyboard: 'search-safe', focus: 'destination-input', back: 'close-search-results', escape: 'close-search-results', scrollOwner: 'search-results' },
  DESTINATION_SELECTED: { ...base, visible: ['map', 'planner', 'destination'], focus: 'origin-primary-action' },
  ORIGIN_REQUIRED: { ...base, visible: ['map', 'planner', 'origin'], focus: 'origin-primary-action' },
  ORIGIN_READY: { ...base, visible: ['map', 'planner', 'mode-selector'], focus: 'mode-selector' },
  ROUTE_LOADING: { ...base, visible: ['map', 'planner', 'route-loading'], ariaLive: 'polite' },
  ROUTE_READY: { ...base, visible: ['map', 'planner', 'route'], mapPadding: 'PEEK' },
  DECISION_PEEK: { ...base, visible: ['map', 'planner', 'decision-sheet'], mapPadding: 'PEEK', back: 'navigate', escape: 'none', scrollOwner: 'sheet' },
  DECISION_HALF: { ...base, visible: ['map', 'planner', 'decision-sheet'], mapPadding: 'HALF', back: 'sheet-peek', escape: 'sheet-peek', scrollOwner: 'sheet' },
  DECISION_EXPANDED: { ...base, visible: ['map', 'planner', 'decision-sheet'], mapPadding: 'EXPANDED', back: 'sheet-half', escape: 'sheet-half', scrollOwner: 'sheet' },
  EXTERNAL_CONFIRMATION: { ...base, visible: ['map', 'external-confirmation'], hidden: ['planner-interaction', 'sheet-interaction'], mapInteraction: 'disabled', keyboard: 'dismissed', focus: 'external-confirmation', back: 'close-modal', escape: 'close-modal', scrollOwner: 'modal', ariaLive: 'assertive' },
  VOICE_ACTIVE: { ...base, visible: ['map', 'planner', 'voice'], mapInteraction: 'disabled', focus: 'voice', back: 'close-voice', escape: 'close-voice', scrollOwner: 'voice' },
  OFFLINE: { ...base, visible: ['map', 'planner', 'offline-banner'], ariaLive: 'assertive' },
  ERROR_RECOVERABLE: { ...base, visible: ['map', 'planner', 'error'], ariaLive: 'assertive' }
};

export function deriveInteractionState(input: InteractionInputs): InteractionState {
  if (input.externalConfirmation) return 'EXTERNAL_CONFIRMATION';
  if (input.voiceActive) return 'VOICE_ACTIVE';
  if (input.searchResults) return 'SEARCH_RESULTS';
  if (input.searchFocused) return 'SEARCH_FOCUSED';
  if (input.manualOrigin) return 'ORIGIN_REQUIRED';
  if (input.routeLoading) return 'ROUTE_LOADING';
  if (input.routeReady) {
    if (input.sheetSnap === 'expanded') return 'DECISION_EXPANDED';
    if (input.sheetSnap === 'half') return 'DECISION_HALF';
    return 'DECISION_PEEK';
  }
  if (input.originReady && input.destinationSelected) return 'ORIGIN_READY';
  if (input.destinationSelected) return 'DESTINATION_SELECTED';
  if (input.recoverableError) return 'ERROR_RECOVERABLE';
  if (input.offline) return 'OFFLINE';
  return 'IDLE';
}

export function nextCollapsedSnap(snap: SheetSnap): SheetSnap | null {
  if (snap === 'expanded') return 'half';
  if (snap === 'half') return 'peek';
  return null;
}

export function nextExpandedSnap(snap: SheetSnap): SheetSnap {
  if (snap === 'peek') return 'half';
  return 'expanded';
}

export function cameraPaddingFor(
  snap: SheetSnap,
  viewportWidth: number,
  keyboardOpen: boolean,
  searchActive: boolean
): MapPadding {
  if (viewportWidth >= 760) {
    const bottom = snap === 'expanded' ? 250 : snap === 'half' ? 190 : 118;
    return { top: 38, right: 34, bottom, left: 34 };
  }
  if (keyboardOpen) return { top: 118, right: 24, bottom: 58, left: 24 };
  const top = searchActive ? 208 : 176;
  const bottom = snap === 'expanded' ? 250 : snap === 'half' ? 205 : 132;
  return { top, right: 24, bottom, left: 24 };
}
