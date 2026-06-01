import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RawTrip {
  destLat: number
  destLon: number
  destName: string
  // SQLite $queryRaw returns DateTime columns as strings (ISO 8601)
  createdAt: string
}

interface Prediction {
  destLat: number
  destLon: number
  destName: string
  score: number
  confidence: 'low' | 'medium' | 'high'
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
      // Fallback to UTC-3 (Argentina) if Intl fails — same strategy as detectFactors
      const utcHour = now.getUTCHours()
      currentHour = (utcHour - 3 + 24) % 24
    }

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    })
    const dayName = dayFormatter.format(now)
    const dayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    }
    let currentDayOfWeek = dayMap[dayName]
    if (currentDayOfWeek === undefined) {
      // Fallback: Argentina UTC-3, compute day from UTC offset
      const utcDay = now.getUTCDay()
      const utcHour = now.getUTCHours()
      // If it's before 3am UTC, it's still the previous day in Argentina
      currentDayOfWeek = utcHour < 3 ? (utcDay - 1 + 7) % 7 : utcDay
    }

    // Query rides and transport_log using raw SQL with UNION ALL
    // IMPORTANT: Prisma with SQLite uses camelCase column names and PascalCase table names
    // Proximity: 0.005° ≈ 555m at equator, reasonable for "same neighborhood" matching
    // Date filter: only consider trips from the last 6 months for relevant predictions
    const proximityDeg = 0.005
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    const results: RawTrip[] = await db.$queryRaw`
      SELECT destLat, destLon, destName, createdAt FROM Ride
      WHERE ABS(originLat - ${lat}) < ${proximityDeg} AND ABS(originLon - ${lon}) < ${proximityDeg}
      AND createdAt >= ${sixMonthsAgo}
      UNION ALL
      SELECT destLat, destLon, destName, createdAt FROM TransportLog
      WHERE ABS(originLat - ${lat}) < ${proximityDeg} AND ABS(originLon - ${lon}) < ${proximityDeg}
      AND createdAt >= ${sixMonthsAgo}
      ORDER BY createdAt DESC
      LIMIT 200
    `

    if (results.length < 1) {
      return NextResponse.json({
        predictions: [],
        message: 'Insufficient data',
        totalRecords: results.length,
      })
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

      // Parse hour and day of week from createdAt in the user's timezone
      const tripDate = new Date(trip.createdAt)
      if (isNaN(tripDate.getTime())) continue // Skip invalid dates

      const tripHour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false,
        }).format(tripDate),
        10
      )
      if (isNaN(tripHour)) continue // Skip if hour parsing fails

      const tripDayName = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
      }).format(tripDate)
      const tripDayOfWeek = dayMap[tripDayName]
      if (tripDayOfWeek === undefined) continue // Skip if day parsing fails

      group.trips.push({ hour: tripHour, dayOfWeek: tripDayOfWeek })
    }

    // Calculate scores for each group
    const predictions: Prediction[] = []

    for (const [, group] of groups) {
      const totalCount = group.trips.length

      // Hour match: count trips where hour is within ±2 of current hour (wrapping around midnight)
      const hourMatch = group.trips.filter((t) => {
        const diff = Math.abs(t.hour - currentHour)
        return diff <= 2 || diff >= 22 // wraps around midnight
      }).length

      // Day match: count trips on same day of week
      const dayMatch = group.trips.filter((t) => t.dayOfWeek === currentDayOfWeek).length

      const score = totalCount * 0.3 + hourMatch * 0.4 + dayMatch * 0.3

      // Pick the most common destName
      const nameCounts: Map<string, number> = new Map()
      for (const name of group.names) {
        nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
      }
      const destName = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

      // Determine confidence based on score
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

    // Sort by score descending and return top 3
    predictions.sort((a, b) => b.score - a.score)
    const top3 = predictions.slice(0, 3)

    return NextResponse.json({
      predictions: top3,
      totalRecords: results.length,
      currentHour,
      currentDayOfWeek,
    })
  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictions', predictions: [] },
      { status: 500 }
    )
  }
}
