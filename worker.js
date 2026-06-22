// ============================================================
//  VOY Lite — Cloudflare Worker (rewrite /)
//  Replica exactamente el comportamiento del middleware Next.js:
//  / → /VOY-Lite.html
//  Todo lo demás → assets estáticos
// ============================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Root → VOY-Lite.html
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/VOY-Lite.html';
      return env.ASSETS.fetch(new Request(url, request));
    }

    // Todo lo demás lo resuelve el asset binding (core/, ui/, VOY-Lite.html, etc.)
    return env.ASSETS.fetch(request);
  }
};
