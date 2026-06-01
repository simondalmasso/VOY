import { NextRequest, NextResponse } from 'next/server'

// WMO Weather interpretation codes mapped to Spanish descriptions
// Reference: https://open-meteo.com/en/docs#weathervariables
const weatherDescriptions: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  56: 'Llovizna helada ligera',
  57: 'Llovizna helada intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada ligera',
  67: 'Lluvia helada intensa',
  71: 'Nevada ligera',
  73: 'Nevada moderada',
  75: 'Nevada intensa',
  77: 'Granizo',
  80: 'Chubasco ligero',
  81: 'Chubasco moderado',
  82: 'Chubasco violento',
  85: 'Chubasco de nieve ligero',
  86: 'Chubasco de nieve intenso',
  95: 'Tormenta',
  96: 'Tormenta con granizo leve',
  99: 'Tormenta con granizo fuerte',
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

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=America%2FBuenos_Aires`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Weather service request timed out', weather: null },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to connect to weather service', weather: null },
        { status: 200 }
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Weather service returned status ${response.status}`, weather: null },
        { status: 200 }
      )
    }

    const data = await response.json()

    if (!data.current) {
      return NextResponse.json(
        { error: 'No current weather data available', weather: null },
        { status: 200 }
      )
    }

    const current = data.current
    const weatherCode = current.weather_code ?? 0

    return NextResponse.json({
      weather: {
        temperature: current.temperature_2m ?? null,
        humidity: current.relative_humidity_2m ?? null,
        precipitation: current.precipitation ?? null,
        weatherCode,
        description: weatherDescriptions[weatherCode] ?? 'Desconocido',
      },
    })
  } catch (error) {
    console.error('Weather error:', error)
    // Don't break the app - return null weather
    return NextResponse.json(
      { error: 'Failed to fetch weather data', weather: null },
      { status: 200 }
    )
  }
}
