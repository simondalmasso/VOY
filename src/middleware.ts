import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * VOY Runtime Middleware (mirrors worker.js canonicalization for local preview)
 *
 * Single Source of Truth: public/VOY-Lite.html
 *
 * Rules:
 *   /VOY-Lite.html → 308 → /               (hide internal path; mirrors worker.js)
 *   /              → rewrite → /VOY-Lite.html (browser URL stays /)
 *   /core/*, /ui/* → no-cache headers (fresh dev assets)
 *
 * Host redirects (workers.dev → voy.is-a.dev) are NOT applied here so the
 * local Next.js preview stays reachable on localhost:3000. They live in
 * worker.js for the Cloudflare edge only.
 */

const VOY_HTML = '/VOY-Lite.html';
const NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hide internal entry path: /VOY-Lite.html → / (permanent, mirrors worker.js)
  if (pathname.toLowerCase() === VOY_HTML.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url, 308);
  }

  // PRIMARY: / → rewrite → /VOY-Lite.html (single entry point, browser URL = /)
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = VOY_HTML;
    const response = NextResponse.rewrite(url);
    for (const [k, v] of Object.entries(NO_CACHE_HEADERS)) {
      response.headers.set(k, v);
    }
    return response;
  }

  // NO-CACHE: Force fresh copies of all VOY runtime assets (incl. lazy-loaded navigator)
  if (pathname.startsWith('/core/') || pathname.startsWith('/ui/') || pathname.startsWith('/navigator/')) {
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(NO_CACHE_HEADERS)) {
      response.headers.set(k, v);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/VOY-Lite.html', '/core/:path*', '/ui/:path*', '/navigator/:path*'],
};
