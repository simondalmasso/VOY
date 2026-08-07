import { describe, expect, test } from 'bun:test';
import { clearVoyData, loadPreferences, savePreferences } from '../src/lib/storage';
class MemoryStorage implements Storage {
  #data = new Map<string, string>();
  get length() { return this.#data.size; }
  clear() { this.#data.clear(); }
  getItem(key: string) { return this.#data.get(key) ?? null; }
  key(index: number) { return [...this.#data.keys()][index] ?? null; }
  removeItem(key: string) { this.#data.delete(key); }
  setItem(key: string, value: string) { this.#data.set(key, value); }
}
describe('local storage boundaries', () => {
  test('tolerates corrupt storage and can erase data', () => {
    const storage = new MemoryStorage(); storage.setItem('voy_preferences_v1', '{bad');
    expect(loadPreferences(storage)).toEqual({ theme: 'system', analytics: false });
    savePreferences({ theme: 'dark', analytics: false }, storage);
    expect(loadPreferences(storage).theme).toBe('dark');
    clearVoyData(storage); expect(storage.length).toBe(0);
  });
});
