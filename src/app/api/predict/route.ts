import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RawTrip {
  destLat: number
  destLon: number
  destName: string
  createdAt: string
}

interface Prediction {
  destLat: number
  destLon: number
  destName: string
  score: number
  confidence: 'low' | 'medium' | 'high'
}

// ─── In-memory cache for predictions (2 min TTL) ─────────────────────────────
// Avoids hitting the DB on every GPS update; predictions don't change
// meaningfully in 2 minutes.

const predictCache = new Map<string, { data: { predictions: Prediction[]; totalRecords: number; currentHour: number; currentDayOfWeek: number }; expires: number }>()

function getPredictCached(key: string): { data: { predictions: Prediction[]; totalRecords: number; currentHour: number; currentDayOfWeek: number }; expires: number } | null {
  const entry = predictCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    predictCache.delete(key)
    return null
  }
  return entry
}

function setPredictCache(key: string, data: { predictions: Prediction[]; totalRecords: number; currentHour: number; currentDayOfWeek: number }, ttlMs = 120_000): void {
  predictCache.set(key, { data, expires: Date.now() + ttlMs })
  if (predictCache.size > 50) {
    const oldest = predictCache.keys().next().value
    if (oldest !== undefined) predictCache.delete(oldest)
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

    // Check cache first (round to 3 decimals ≈ 111m for cache key)
    const cacheKey = `predict:${lat.toFixed(3)},${lon.toFixed(3)}`
    const cached = getPredictCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached.data)
    }

    // Get current hour and day of week in user's timezone
    const timezone = 'America/Argentina/Buenos_Aires'
    const now = new Date()

    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    let currentHour = parseInt(hourFormatter.format(now), 10)
    if (isNaN(currentHour)) {
      const utcHour = now.getUTCHours()
      currentHour = (utcHour - 3 + 24) % 24
    }

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    })
    const dayName = dayFormatter.format(now)
    const dayMap: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    }
    let currentDayOfWeek = dayMap[dayName]
    if (currentDayOfWeek === undefined) {
      const utcDay = now.getUTCDay()
      const utcHour = now.getUTCHours()
      currentDayOfWeek = utcHour < 3 ? (utcDay - 1 + 7) % 7 : utcDay
    }

    // Query using BETWEEN for index usage (not ABS())
    const proximityDeg = 0.005
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    const latMin = lat - proximityDeg
    const latMax = lat + proximityDeg
    const lonMin = lon - proximityDeg
    const lonMax = lon + proximityDeg
    const results: RawTrip[] = await db.$queryRaw`
      SELECT destLat, destLon, destName, createdAt FROM Ride
      WHERE originLat BETWEEN ${latMin} AND ${latMax}
      AND originLon BETWEEN ${lonMin} AND ${lonMax}
      AND createdAt >= ${sixMonthsAgo}
      UNION ALL
      SELECT destLat, destLon, destName, createdAt FROM TransportLog
      WHERE originLat BETWEEN ${latMin} AND ${latMax}
      AND originLon BETWEEN ${lonMin} AND ${lonMax}
      AND createdAt >= ${sixMonthsAgo}
      ORDER BY createdAt DESC
      LIMIT 200
    `

    if (results.length < 1) {
      const emptyResult = {
        predictions: [],
        message: 'Insufficient data',
        totalRecords: results.length,
        currentHour,
        currentDayOfWeek,
      }
      setPredictCache(cacheKey, { predictions: [], totalRecords: 0, currentHour, currentDayOfWeek })
      return NextResponse.json(emptyResult)
    }

    // Group by rounded destination (3 decimal places ≈ 111m)
    const groups: Map<
      string,
      {
        lat: number
        lon: number
        names: string[]
        trips: { hour: number; dayOfWeek: number }[]
      }
    > = new Map()

    for (const trip of results) {
      const roundedLat = Math.round(trip.destLat * 1000) / 1000
      const roundedLon = Math.round(trip.destLon * 1000) / 1000
      const key = `${roundedLat},${roundedLon}`

      if (!groups.has(key)) {
        groups.set(key, { lat: roundedLat, lon: roundedLon, names: [], trips: [] })
      }

      const group = groups.get(key)!
      group.names.push(trip.destName)

      const tripDate = new Date(trip.createdAt)
      if (isNaN(tripDate.getTime())) continue

      const tripHour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false,
        }).format(tripDate),
        10
      )
      if (isNaN(tripHour)) continue

      const tripDayName = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
      }).format(tripDate)
      const tripDayOfWeek = dayMap[tripDayName]
      if (tripDayOfWeek === undefined) continue

      group.trips.push({ hour: tripHour, dayOfWeek: tripDayOfWeek })
    }

    const predictions: Prediction[] = []

    for (const [, group] of groups) {
      const totalCount = group.trips.length

      const hourMatch = group.trips.filter((t) => {
        const diff = Math.abs(t.hour - currentHour)
        return diff <= 2 || diff >= 22
      }).length

      const dayMatch = group.trips.filter((t) => t.dayOfWeek === currentDayOfWeek).length

      const score = totalCount * 0.3 + hourMatch * 0.4 + dayMatch * 0.3

      const nameCounts: Map<string, number> = new Map()
      for (const name of group.names) {
        nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
      }
      const destName = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

      let confidence: 'low' | 'medium' | 'high'
      if (score < 1) {
        confidence = 'low'
      } else if (score < 3) {
        confidence = 'medium'
      } else {
        confidence = 'high'
      }

      predictions.push({
        destLat: group.lat,
        destLon: group.lon,
        destName,
        score: Math.round(score * 100) / 100,
        confidence,
      })
    }

    predictions.sort((a, b) => b.score - a.score)
    const top3 = predictions.slice(0, 3)

    const result = {
      predictions: top3,
      totalRecords: results.length,
      currentHour,
      currentDayOfWeek,
    }

    setPredictCache(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictions', predictions: [] },
      { status: 500 }
    )
  }
}
