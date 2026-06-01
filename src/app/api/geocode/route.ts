import { NextRequest, NextResponse } from 'next/server'

// ─── In-memory cache for Nominatim (5 min TTL, respects 1 req/s policy) ──────

const cache = new Map<string, { data: unknown; expires: number }>()

function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: unknown, ttlMs = 300_000): void {
  cache.set(key, { data, expires: Date.now() + ttlMs })
  // Evict oldest entries if cache grows too large
  if (cache.size > 200) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

// ─── Rate limiter (1 request per second to Nominatim) ────────────────────────

let lastNominatimCall = 0

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastNominatimCall
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed))
  }
  lastNominatimCall = Date.now()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')
    const limitParam = searchParams.get('limit')
    const limit = parseInt(limitParam ?? '5', 10)

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameter: q (search query)' },
        { status: 400 }
      )
    }

    if (isNaN(limit) || limit < 1 || limit > 20) {
      return NextResponse.json(
        { error: 'Invalid limit: must be a number between 1 and 20' },
        { status: 400 }
      )
    }

    // Check cache first
    const cacheKey = `geocode:${q.trim().toLowerCase()}:${limit}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q.trim())}&format=json&limit=${limit}&accept-language=es`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let response: Response
    try {
      // Wait for rate limit before calling Nominatim
      await waitForRateLimit()
      response = await fetch(url, {
        headers: {
          'User-Agent': 'MovilidadAsistente/1.0',
        },
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Geocoding request timed out', results: [] },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to connect to geocoding service', results: [] },
        { status: 502 }
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Geocoding service returned status ${response.status}`, results: [] },
        { status: 502 }
      )
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Unexpected response from geocoding service', results: [] },
        { status: 502 }
      )
    }

    const result = { results: data }
    setCache(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Geocode error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode address', results: [] },
      { status: 500 }
    )
  }
}
