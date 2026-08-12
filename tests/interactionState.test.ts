import { describe, expect, test } from 'bun:test';
import { cameraPaddingFor, deriveInteractionState, nextCollapsedSnap, nextExpandedSnap, STATE_CONTRACTS } from '../src/app/interaction';

describe('map-first interaction state machine', () => {
  const base = {
    searchFocused: false,
    searchResults: false,
    manualOrigin: false,
    destinationSelected: false,
    originReady: false,
    routeLoading: false,
    routeReady: false,
    sheetSnap: 'peek' as const,
    externalConfirmation: false,
    voiceActive: false,
    offline: false,
    recoverableError: false
  };

  test('prioritizes transient primary surfaces deterministically', () => {
    expect(deriveInteractionState(base)).toBe('IDLE');
    expect(deriveInteractionState({ ...base, searchFocused: true })).toBe('SEARCH_FOCUSED');
    expect(deriveInteractionState({ ...base, searchFocused: true, searchResults: true })).toBe('SEARCH_RESULTS');
    expect(deriveInteractionState({ ...base, routeReady: true, sheetSnap: 'half' })).toBe('DECISION_HALF');
    expect(deriveInteractionState({ ...base, routeReady: true, sheetSnap: 'expanded' })).toBe('DECISION_EXPANDED');
    expect(deriveInteractionState({ ...base, routeReady: true, externalConfirmation: true })).toBe('EXTERNAL_CONFIRMATION');
    expect(deriveInteractionState({ ...base, routeReady: true, voiceActive: true })).toBe('VOICE_ACTIVE');
  });

  test('sheet hierarchy is reversible and bounded', () => {
    expect(nextExpandedSnap('peek')).toBe('half');
    expect(nextExpandedSnap('half')).toBe('expanded');
    expect(nextExpandedSnap('expanded')).toBe('expanded');
    expect(nextCollapsedSnap('expanded')).toBe('half');
    expect(nextCollapsedSnap('half')).toBe('peek');
    expect(nextCollapsedSnap('peek')).toBeNull();
  });

  test('all required states declare interaction contracts', () => {
    const required = [
      'IDLE','SEARCH_FOCUSED','SEARCH_RESULTS','DESTINATION_SELECTED','ORIGIN_REQUIRED','ORIGIN_READY',
      'ROUTE_LOADING','ROUTE_READY','DECISION_PEEK','DECISION_HALF','DECISION_EXPANDED',
      'EXTERNAL_CONFIRMATION','VOICE_ACTIVE','OFFLINE','ERROR_RECOVERABLE'
    ] as const;
    for (const state of required) {
      const contract = STATE_CONTRACTS[state];
      expect(contract).toBeDefined();
      expect(contract.visible.length).toBeGreaterThan(0);
      expect(contract.focus.length).toBeGreaterThan(0);
      expect(contract.back.length).toBeGreaterThan(0);
      expect(contract.escape.length).toBeGreaterThan(0);
    }
  });

  test('camera padding changes only at stable product states', () => {
    const peek = cameraPaddingFor('peek', 390, false, false);
    const half = cameraPaddingFor('half', 390, false, false);
    const expanded = cameraPaddingFor('expanded', 390, false, false);
    const keyboard = cameraPaddingFor('expanded', 390, true, true);
    expect(peek.bottom).toBeLessThan(half.bottom);
    expect(half.bottom).toBeLessThan(expanded.bottom);
    expect(keyboard.bottom).toBeLessThan(peek.bottom);
    expect(keyboard.top).toBeLessThan(peek.top);
  });
});
