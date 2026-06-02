import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Test DB connectivity with a lightweight query
    await db.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
      features: {
        rides: true,
        transportLog: true,
        predict: true,
        estimate: true,
      },
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'error',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
      features: {
        rides: true,
        transportLog: true,
        predict: true,
        estimate: true,
      },
    }, { status: 503 })
  }
}
