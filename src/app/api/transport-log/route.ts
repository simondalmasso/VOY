import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const VALID_TRANSPORTS = ['uber', 'didi', 'bus', 'walk', 'taxi', 'other']

// Approximate degree delta for 50 meters
// 1 degree latitude ≈ 111,320 meters, so 50m ≈ 0.0004496 degrees
const METERS_TO_DEGREES = 50 / 111320

function isValidCoordinate(lat: unknown, lon: unknown): boolean {
  if (typeof lat !== 'number' || typeof lon !== 'number') return false
  if (Number.isNaN(lat) || Number.isNaN(lon)) return false
  if (lat < -90 || lat > 90) return false
  if (lon < -180 || lon > 180) return false
  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { originLat, originLon, originName, destLat, destLon, destName, transport, price } = body

    // Validate required fields
    if (originLat === undefined || originLat === null) {
      return NextResponse.json({ error: 'originLat is required' }, { status: 400 })
    }
    if (originLon === undefined || originLon === null) {
      return NextResponse.json({ error: 'originLon is required' }, { status: 400 })
    }
    if (destLat === undefined || destLat === null) {
      return NextResponse.json({ error: 'destLat is required' }, { status: 400 })
    }
    if (destLon === undefined || destLon === null) {
      return NextResponse.json({ error: 'destLon is required' }, { status: 400 })
    }
    if (!destName || typeof destName !== 'string' || destName.trim() === '') {
      return NextResponse.json({ error: 'destName is required' }, { status: 400 })
    }

    // Validate coordinates (coerce to number first)
    if (!isValidCoordinate(Number(originLat), Number(originLon))) {
      return NextResponse.json(
        { error: 'Invalid origin coordinates. Lat must be -90 to 90, lon must be -180 to 180' },
        { status: 400 }
      )
    }
    if (!isValidCoordinate(Number(destLat), Number(destLon))) {
      return NextResponse.json(
        { error: 'Invalid destination coordinates. Lat must be -90 to 90, lon must be -180 to 180' },
        { status: 400 }
      )
    }

    // Coerce to numbers (in case they arrive as strings)
    const oLat = Number(originLat)
    const oLon = Number(originLon)
    const dLat = Number(destLat)
    const dLon = Number(destLon)

    // Validate transport type
    const resolvedTransport = transport || 'bus'
    if (typeof resolvedTransport !== 'string' || !VALID_TRANSPORTS.includes(resolvedTransport)) {
      return NextResponse.json(
        { error: `Invalid transport type. Must be one of: ${VALID_TRANSPORTS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate price if provided
    if (price !== undefined && price !== null) {
      if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'Price must be a valid non-negative number' }, { status: 400 })
      }
    }

    // Check for duplicate entries: same origin (within 50m), same destination (within 50m),
    // same transport type, created in the last 60 seconds
    // Use $transaction to prevent TOCTOU race condition between findFirst and create
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000)

    // Calculate bounding boxes for 50m radius
    const originLatDelta = METERS_TO_DEGREES
    const originLonDelta = METERS_TO_DEGREES / Math.cos((oLat * Math.PI) / 180)
    const destLatDelta = METERS_TO_DEGREES
    const destLonDelta = METERS_TO_DEGREES / Math.cos((dLat * Math.PI) / 180)

    const result = await db.$transaction(async (tx) => {
      const duplicate = await tx.transportLog.findFirst({
        where: {
          transport: resolvedTransport,
          createdAt: { gte: sixtySecondsAgo },
          originLat: { gte: oLat - originLatDelta, lte: oLat + originLatDelta },
          originLon: { gte: oLon - originLonDelta, lte: oLon + originLonDelta },
          destLat: { gte: dLat - destLatDelta, lte: dLat + destLatDelta },
          destLon: { gte: dLon - destLonDelta, lte: dLon + destLonDelta },
        },
      })

      if (duplicate) {
        return { data: duplicate, isDuplicate: true }
      }

      const transportLog = await tx.transportLog.create({
        data: {
          originLat: oLat,
          originLon: oLon,
          originName: originName || '',
          destLat: dLat,
          destLon: dLon,
          destName: destName.trim(),
          transport: resolvedTransport,
          price: price != null ? Number(price) : null,
        },
      })

      return { data: transportLog, isDuplicate: false }
    }, { maxWait: 5000, timeout: 10000 })

    if (result.isDuplicate) {
      return NextResponse.json(
        { error: 'Duplicate entry: a similar transport log was created within the last 60 seconds' },
        { status: 409 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Error creating transport log:', error)
    return NextResponse.json({ error: 'Failed to create transport log' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    // Parse and validate limit
    let limit = 50
    const limitParam = searchParams.get('limit')
    if (limitParam !== null) {
      const parsed = Number(limitParam)
      if (Number.isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        return NextResponse.json({ error: 'Limit must be a positive integer' }, { status: 400 })
      }
      limit = Math.min(parsed, 200)
    }

    // Parse and validate offset
    let offset = 0
    const offsetParam = searchParams.get('offset')
    if (offsetParam !== null) {
      const parsed = Number(offsetParam)
      if (Number.isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        return NextResponse.json({ error: 'Offset must be a non-negative integer' }, { status: 400 })
      }
      offset = parsed
    }

    // Build where clause
    const where: { transport?: string } = {}
    const transportParam = searchParams.get('transport')
    if (transportParam) {
      if (!VALID_TRANSPORTS.includes(transportParam)) {
        return NextResponse.json(
          { error: `Invalid transport filter. Must be one of: ${VALID_TRANSPORTS.join(', ')}` },
          { status: 400 }
        )
      }
      where.transport = transportParam
    }

    // Get total count and entries
    const [total, entries] = await Promise.all([
      db.transportLog.count({ where }),
      db.transportLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ])

    return NextResponse.json({ total, entries })
  } catch (error) {
    console.error('Error fetching transport logs:', error)
    return NextResponse.json({ error: 'Failed to fetch transport logs' }, { status: 500 })
  }
}
