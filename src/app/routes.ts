export type LegalRoute = '/' | '/privacy' | '/terms' | '/sources' | '/contact';
export function currentRoute(pathname = location.pathname): LegalRoute {
  return pathname === '/privacy' || pathname === '/terms' || pathname === '/sources' || pathname === '/contact' ? pathname : '/';
}
