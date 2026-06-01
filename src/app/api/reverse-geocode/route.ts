import { NextRequest, NextResponse } from 'next/server'

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

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`

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
      // Fallback: return coordinates as display
      return NextResponse.json({
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
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      // Fallback: return coordinates as display
      return NextResponse.json({
        displayName: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        city: null,
        road: null,
        neighborhood: null,
        lat,
        lon,
        fallback: true,
        error: `Reverse geocoding service returned status ${response.status}`,
      })
    }

    const data = await response.json()

    if (data.error) {
      // Nominatim returned an error (e.g., "Unable to geocode")
      return NextResponse.json({
        displayName: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        city: null,
        road: null,
        neighborhood: null,
        lat,
        lon,
        fallback: true,
        error: data.error,
      })
    }

    const address = data.address ?? {}

    return NextResponse.json({
      displayName: data.display_name ?? `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      city: address.city ?? address.town ?? address.village ?? address.hamlet ?? null,
      road: address.road ?? address.street ?? address.pedestrian ?? null,
      neighborhood: address.neighbourhood ?? address.suburb ?? address.quarter ?? null,
      lat,
      lon,
    })
  } catch (error) {
    console.error('Reverse geocode error:', error)
    return NextResponse.json(
      { error: 'Failed to reverse geocode coordinates' },
      { status: 500 }
    )
  }
}
