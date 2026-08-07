import { loadPreferences } from './storage';
export function recordTelemetry(event: 'lcp' | 'js_error' | 'promise_rejection', value = 0): void {
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1' || !loadPreferences().analytics) return;
  const payload = JSON.stringify({ event, value, route: location.pathname });
  navigator.sendBeacon?.('/api/telemetry', new Blob([payload], { type: 'application/json' }));
}
