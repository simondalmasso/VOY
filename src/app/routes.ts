export type AppRoute = '/' | '/about' | '/coverage' | '/sources' | '/privacy' | '/terms' | '/support' | '/account' | '/contact';
export type PublicRoute = Exclude<AppRoute, '/' | '/account'>;

const ROUTES = new Set<AppRoute>(['/', '/about', '/coverage', '/sources', '/privacy', '/terms', '/support', '/account', '/contact']);

export function currentRoute(pathname = location.pathname): AppRoute {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ROUTES.has(normalized as AppRoute) ? normalized as AppRoute : '/';
}
