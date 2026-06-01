/**
 * Shared weather cache and fetch logic.
 * Used by both /api/weather and /api/estimate to avoid redundant Open-Meteo calls.
 */

// ─── In-memory cache for Open-Meteo (10 min TTL) ─────────────────────────────

const cache = new Map<string, { data: OpenMeteoResponse | null; expires: number }>()

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number | null
    relative_humidity_2m?: number | null
    precipitation?: number | null
    weather_code?: number | null
  }
}

function getCached(key: string): OpenMeteoResponse | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: OpenMeteoResponse | null, ttlMs = 600_000): void {
  cache.set(key, { data, expires: Date.now() + ttlMs })
  if (cache.size > 50) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

// ─── Fetch Open-Meteo current weather ─────────────────────────────────────────

export async function fetchOpenMeteoCurrent(lat: number, lon: number): Promise<OpenMeteoResponse | null> {
  const cacheKey = `weather:${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=America%2FBuenos_Aires`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) return null

    const data: OpenMeteoResponse = await response.json()
    setCache(cacheKey, data)
    return data
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

// ─── Precipitation helper (for estimate route) ────────────────────────────────

export async function fetchPrecipitation(lat: number, lon: number): Promise<number> {
  const data = await fetchOpenMeteoCurrent(lat, lon)
  const precip = data?.current?.precipitation
  return typeof precip === 'number' && precip > 0 ? precip : 0
}

// ─── WMO Weather interpretation codes ─────────────────────────────────────────

export const weatherDescriptions: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  56: 'Llovizna helada ligera',
  57: 'Llovizna helada intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada ligera',
  67: 'Lluvia helada intensa',
  71: 'Nevada ligera',
  73: 'Nevada moderada',
  75: 'Nevada intensa',
  77: 'Granizo',
  80: 'Chubasco ligero',
  81: 'Chubasco moderado',
  82: 'Chubasco violento',
  85: 'Chubasco de nieve ligero',
  86: 'Chubasco de nieve intenso',
  95: 'Tormenta',
  96: 'Tormenta con granizo leve',
  99: 'Tormenta con granizo fuerte',
}
