import { NextRequest, NextResponse } from 'next/server'
import { fetchOpenMeteoCurrent, weatherDescriptions } from '@/lib/weather'

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
        { error: 'Coordinates out of range' },
        { status: 400 }
      )
    }

    const data = await fetchOpenMeteoCurrent(lat, lon)

    if (!data || !data.current) {
      return NextResponse.json(
        { error: 'No current weather data available', weather: null },
        { status: 200 }
      )
    }

    const current = data.current
    const weatherCode = current.weather_code ?? 0

    const result = {
      weather: {
        temperature: current.temperature_2m ?? null,
        humidity: current.relative_humidity_2m ?? null,
        precipitation: current.precipitation ?? null,
        weatherCode,
        description: weatherDescriptions[weatherCode] ?? 'Desconocido',
      },
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Weather error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather data', weather: null },
      { status: 200 }
    )
  }
}
