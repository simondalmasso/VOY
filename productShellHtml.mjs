function productConfig(env) {
  const clientId = String(env.VOY_GOOGLE_CLIENT_ID || '').trim();
  const authEnabled = Boolean(clientId && String(env.VOY_AUTH_SESSION_SECRET_V1 || '').trim());
  return {
    auth_enabled: authEnabled,
    google_client_id: authEnabled ? clientId : null,
    voice_enabled: env.VOY_VOICE_ENABLED === 'true' && Boolean(env.AI),
    persistent_account: false,
    trip_history_persisted: false,
    legal_effective_date: '2026-08-04'
  };
}

export async function maybeInjectProductShellHtml(request, response, env = {}) {
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) return response;
  const body = await response.text();
  if (body.includes('data-voy-product-shell')) {
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  const config = JSON.stringify(productConfig(env)).replace(/</g, '\\u003c');
  const injection = [
    '<link rel="stylesheet" href="/ui/productShell.css?v=2" data-voy-product-shell>',
    `<script data-voy-product-shell>window.VOY_PRODUCT_CONFIG=${config};</script>`,
    '<script src="/core/productShell.js?v=2" defer data-voy-product-shell></script>'
  ].join('');
  const html = body.includes('</head>') ? body.replace('</head>', `${injection}</head>`) : `${injection}${body}`;
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.set('Cache-Control', 'no-store');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export const __productShellTest = Object.freeze({ productConfig });
