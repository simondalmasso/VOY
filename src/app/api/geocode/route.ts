import { NextRequest, NextResponse } from 'next/server'

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

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q.trim())}&format=json&limit=${limit}&accept-language=es`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let response: Response
    try {
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

    return NextResponse.json({ results: data })
  } catch (error) {
    console.error('Geocode error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode address', results: [] },
      { status: 500 }
    )
  }
}
