const KEY = 'voy_preferences_v1';
export interface Preferences { theme: 'light' | 'dark' | 'system'; analytics: boolean }
const DEFAULTS: Preferences = { theme: 'system', analytics: false };
export function loadPreferences(storage: Storage = localStorage): Preferences {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system', analytics: parsed.analytics === true };
  } catch { return { ...DEFAULTS }; }
}
export function savePreferences(value: Preferences, storage: Storage = localStorage): void {
  try { storage.setItem(KEY, JSON.stringify(value)); } catch { /* storage may be blocked */ }
}
export function clearVoyData(storage: Storage = localStorage): void {
  try { storage.removeItem(KEY); } catch { /* storage may be blocked */ }
}
