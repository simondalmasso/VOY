import { cloudflare } from '@cloudflare/vite-plugin';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

const buildHash = process.env.BUILD_HASH || 'dev';

export default defineConfig({
  define: {
    __VOY_BUILD_HASH__: JSON.stringify(buildHash),
    __VOY_VERSION__: JSON.stringify('V8.0.0')
  },
  plugins: [
    { name: 'voy-build-identity', transformIndexHtml(html) { return html.replaceAll('__VOY_BUILD_HASH__', buildHash); } },
    svelte(), cloudflare()
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl')) return 'maplibre';
          if (id.includes('/features/voice/') || id.includes('VoiceAssistant.svelte')) return 'voice';
          if (id.includes('/features/auth/')) return 'auth';
          return undefined;
        }
      }
    }
  }
});
