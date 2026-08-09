import { mount } from 'svelte';
import App from './App.svelte';
import './styles/tokens.css';
import './styles/global.css';
import './styles/issue36-polish.css';
import './styles/ui-compaction.css';
import './styles/map-first.css';
import './styles/map-first-contract.css';
import { recordTelemetry } from './lib/telemetry';

const target = document.getElementById('app');
if (!target) throw new Error('app_mount_missing');
mount(App, { target });

document.documentElement.dataset.voyBuild = __VOY_BUILD_HASH__;

if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(registration => {
      registration.update().catch(() => undefined);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) worker.postMessage({ type: 'SKIP_WAITING' });
        });
      });
    }).catch(() => undefined);
  });
}

addEventListener('error', () => recordTelemetry('js_error', 1));
addEventListener('unhandledrejection', () => recordTelemetry('promise_rejection', 1));
