import { NextRequest, NextResponse } from 'next/server'
import { waitForNominatimRateLimit } from '@/lib/nominatim'

// ─── In-memory cache for Nominatim reverse geocode (10 min TTL) ──────────────

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

function setCache(key: string, data: unknown, ttlMs = 600_000): void {
  cache.set(key, { data, expires: Date.now() + ttlMs })
  if (cache.size > 100) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const latParam = searchParams.get('lat')
    const lonParam = searchParams.get('lon')

    if (!latParam || !lonParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat and lon' },
        { status: 400 }
      )
    }

    const lat = parseFloat(latParam)
    const lon = parseFloat(lonParam)

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'Invalid coordinates: lat and lon must be valid numbers' },
        { status: 400 }
      )
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of range: lat must be -90 to 90, lon must be -180 to 180' },
        { status: 400 }
      )
    }

    // Check cache (round to 4 decimals ≈ 11m for cache key)
    const cacheKey = `revgeo:${lat.toFixed(4)},${lon.toFixed(4)}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let response: Response
    try {
      // Wait for shared Nominatim rate limit before calling
      await waitForNominatimRateLimit()
      response = await fetch(url, {
        headers: {
          'User-Agent': 'MovilidadAsistente/1.0',
        },
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      const fallback = {
        displayName: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        city: null,
        road: null,
        neighborhood: null,
        lat,
        lon,
        fallback: true,
        error: fetchError instanceof DOMException && fetchError.name === 'AbortError'
          ? 'Reverse geocoding request timed out'
          : 'Failed to connect to reverse geocoding service',
      }
      setCache(cacheKey, fallback, 60_000) // Cache fallbacks for 1 min only
      return NextResponse.json(fallback)
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const fallback = {
        displayName: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        city: null,
        road: null,
        neighborhood: null,
        lat,
        lon,
        fallback: true,
        error: `Reverse geocoding service returned status ${response.status}`,
      }
      setCache(cacheKey, fallback, 60_000)
      return NextResponse.json(fallback)
    }

    const data = await response.json()

    if (data.error) {
      const fallback = {
        displayName: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        city: null,
        road: null,
        neighborhood: null,
        lat,
        lon,
        fallback: true,
        error: data.error,
      }
      setCache(cacheKey, fallback, 60_000)
      return NextResponse.json(fallback)
    }

    const address = data.address ?? {}

    const result = {
      displayName: data.display_name ?? `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      city: address.city ?? address.town ?? address.village ?? address.hamlet ?? null,
      road: address.road ?? address.street ?? address.pedestrian ?? null,
      neighborhood: address.neighbourhood ?? address.suburb ?? address.quarter ?? null,
      lat,
      lon,
    }
    setCache(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Reverse geocode error:', error)
    return NextResponse.json(
      { error: 'Failed to reverse geocode coordinates' },
      { status: 500 }
    )
  }
}
