/**
 * Shared Nominatim rate limiter.
 * Both /api/geocode and /api/reverse-geocode must share the same rate limiter
 * to respect Nominatim's 1 request/second usage policy across all routes.
 */

let lastNominatimCall = 0

export async function waitForNominatimRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastNominatimCall
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed))
  }
  lastNominatimCall = Date.now()
}
