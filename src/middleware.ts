import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * VOY Lite Runtime Middleware
 *
 * Single Source of Truth: public/VOY-Lite.html
 *
 * Architecture:
 *   / → middleware rewrite → /VOY-Lite.html (served as static file)
 *   Browser URL stays as / — no iframe, no React shell, no duplicate HTML
 *
 * All VOY assets get no-cache headers to prevent stale versions.
 */

const VOY_HTML = '/VOY-Lite.html';
const NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PRIMARY: Rewrite / to VOYv2.html — single entry point, zero iframe
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = VOY_HTML;
    const response = NextResponse.rewrite(url);
    for (const [k, v] of Object.entries(NO_CACHE_HEADERS)) {
      response.headers.set(k, v);
    }
    return response;
  }

  // NO-CACHE: Force fresh copies of all VOY runtime assets
  if (pathname === VOY_HTML || pathname.startsWith('/core/') || pathname.startsWith('/ui/')) {
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(NO_CACHE_HEADERS)) {
      response.headers.set(k, v);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/VOY-Lite.html', '/core/:path*', '/ui/:path*'],
};
