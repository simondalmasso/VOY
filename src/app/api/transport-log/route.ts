import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

const VALID_TRANSPORTS = ['uber', 'didi', 'bus', 'walk', 'taxi', 'other']

function isValidCoordinate(lat: unknown, lon: unknown): boolean {
  if (typeof lat !== 'number' || typeof lon !== 'number') return false
  if (Number.isNaN(lat) || Number.isNaN(lon)) return false
  if (lat < -90 || lat > 90) return false
  if (lon < -180 || lon > 180) return false
  return true
}

/**
 * Generate a deterministic dedup hash from origin, destination, transport,
 * and the current 60-second time bucket.
 * DB UNIQUE constraint handles atomicity — no transaction needed.
 */
function generateDedupHash(
  oLat: number, oLon: number,
  dLat: number, dLon: number,
  transport: string
): string {
  const oLatR = Math.round(oLat * 1000)
  const oLonR = Math.round(oLon * 1000)
  const dLatR = Math.round(dLat * 1000)
  const dLonR = Math.round(dLon * 1000)
  const timeBucket = Math.floor(Date.now() / 60_000)
  return `${oLatR}:${oLonR}:${dLatR}:${dLonR}:${transport}:${timeBucket}`
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { originLat, originLon, originName, destLat, destLon, destName, transport, price } = body as Record<string, unknown>

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

    const oLat = Number(originLat)
    const oLon = Number(originLon)
    const dLat = Number(destLat)
    const dLon = Number(destLon)

    const resolvedTransport = transport || 'bus'
    if (typeof resolvedTransport !== 'string' || !VALID_TRANSPORTS.includes(resolvedTransport)) {
      return NextResponse.json(
        { error: `Invalid transport type. Must be one of: ${VALID_TRANSPORTS.join(', ')}` },
        { status: 400 }
      )
    }

    if (price !== undefined && price !== null) {
      if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'Price must be a valid non-negative number' }, { status: 400 })
      }
    }

    const dedupHash = generateDedupHash(oLat, oLon, dLat, dLon, resolvedTransport)

    try {
      const transportLog = await db.transportLog.create({
        data: {
          originLat: oLat,
          originLon: oLon,
          originName: originName || '',
          destLat: dLat,
          destLon: dLon,
          destName: destName.trim(),
          transport: resolvedTransport,
          price: price != null ? Number(price) : null,
          dedupHash,
        },
      })

      return NextResponse.json(transportLog, { status: 201 })
    } catch (createError) {
      // Prisma unique constraint violation → P2002
      if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Duplicate entry: a similar transport log was created within the last 60 seconds' },
          { status: 409 }
        )
      }
      throw createError
    }
  } catch (error) {
    console.error('Error creating transport log:', error)
    return NextResponse.json({ error: 'Failed to create transport log' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    let limit = 50
    const limitParam = searchParams.get('limit')
    if (limitParam !== null) {
      const parsed = Number(limitParam)
      if (Number.isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        return NextResponse.json({ error: 'Limit must be a positive integer' }, { status: 400 })
      }
      limit = Math.min(parsed, 200)
    }

    let offset = 0
    const offsetParam = searchParams.get('offset')
    if (offsetParam !== null) {
      const parsed = Number(offsetParam)
      if (Number.isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        return NextResponse.json({ error: 'Offset must be a non-negative integer' }, { status: 400 })
      }
      offset = parsed
    }

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
