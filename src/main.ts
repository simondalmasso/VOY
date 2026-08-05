import { mount } from 'svelte';
import App from './App.svelte';
import './styles/tokens.css';
import './styles/global.css';
import { recordTelemetry } from './lib/telemetry';

const target = document.getElementById('app');
if (!target) throw new Error('app_mount_missing');
mount(App, { target });

document.documentElement.dataset.voyBuild = __VOY_BUILD_HASH__;

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined));
}

addEventListener('error', () => recordTelemetry('js_error', 1));
addEventListener('unhandledrejection', () => recordTelemetry('promise_rejection', 1));
