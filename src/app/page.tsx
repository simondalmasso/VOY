'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeoResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface Prediction {
  destLat: number
  destLon: number
  destName: string
  score: number
  confidence: 'low' | 'medium' | 'high'
}

interface PriceBreakdown {
  low: number
  high: number
  estimate: number
}

interface EstimateData {
  uber: PriceBreakdown
  didi: PriceBreakdown
  distanceKm: number
  durationMin: number
  confidence: 'high' | 'medium' | 'low'
  factors: { weather: boolean; rushHour: boolean; weekendNight: boolean }
  cheaper: 'uber' | 'didi' | 'similar'
  deepLinks: { uber: string; didi: string }
  advice: string
}

interface WeatherData {
  temperature: number | null
  humidity: number | null
  precipitation: number | null
  weatherCode: number
  description: string
}

interface LocationState {
  lat: number | null
  lon: number | null
  name: string
  loading: boolean
  error: string | null
}

// ─── Dynamic Map Import (avoids SSR issues with Leaflet) ──────────────────────

// Dynamically import the entire map component to avoid SSR issues with Leaflet.
// Individual component dynamic imports cause react-leaflet context problems
// and prevent useMap() from working.
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

// ─── Constants ─────────────────────────────────────────────────────────────────

const SANTA_FE_CENTER: [number, number] = [-31.6256, -60.7087]
const VALID_TRANSPORTS = ['uber', 'didi', 'bus', 'walk', 'taxi', 'other'] as const
const TRANSPORT_LABELS: Record<string, string> = {
  uber: '🚗 Uber',
  didi: '🚙 DiDi',
  bus: '🚌 Colectivo',
  walk: '🚶 Caminando',
  taxi: '🚕 Taxi',
  other: '📦 Otro',
}

// ─── Helper: format price ──────────────────────────────────────────────────────

function formatPrice(val: number | null | undefined): string {
  if (val == null || Number.isNaN(val)) return '—'
  return `$${Math.round(val).toLocaleString('es-AR')}`
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  // ── State ────────────────────────────────────────────────────────────────

  const [origin, setOrigin] = useState<LocationState>({
    lat: null, lon: null, name: '', loading: false, error: null,
  })
  const [destInput, setDestInput] = useState('')
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [searchResults, setSearchResults] = useState<GeoResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [estimate, setEstimate] = useState<EstimateData | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [showTransportLog, setShowTransportLog] = useState(false)
  const [selectedTransport, setSelectedTransport] = useState<string>('uber')
  const [logPrice, setLogPrice] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  // Map is always ready — MapView handles its own Leaflet init via dynamic import

  // Refs for preventing duplicate operations
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speechRef = useRef<unknown>(null)
  const estimateAbortRef = useRef<AbortController | null>(null)
  const searchAbortRef = useRef<AbortController | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const weatherAbortRef = useRef<AbortController | null>(null)
  const predictAbortRef = useRef<AbortController | null>(null)
  const reverseGeoAbortRef = useRef<AbortController | null>(null)
  const recordRideAbortRef = useRef<AbortController | null>(null)

  // ── Online/Offline Detection ─────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      // Cleanup toast timeout on unmount
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      // Cleanup search timeout on unmount
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      // Stop SpeechRecognition if active on unmount
      if (speechRef.current && typeof (speechRef.current as { stop: () => void }).stop === 'function') {
        (speechRef.current as { stop: () => void }).stop()
      }
      // Cleanup all abort controllers on unmount
      weatherAbortRef.current?.abort()
      predictAbortRef.current?.abort()
      estimateAbortRef.current?.abort()
      searchAbortRef.current?.abort()
      reverseGeoAbortRef.current?.abort()
      recordRideAbortRef.current?.abort()
    }
  }, [])

  // ── Load Leaflet CSS (Icons are handled inside MapView.tsx) ──────────────

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
    link.crossOrigin = ''
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  // ── GPS Location ─────────────────────────────────────────────────────────

  const getGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setOrigin((prev) => ({ ...prev, error: 'Tu navegador no soporta geolocalización', loading: false }))
      return
    }

    setOrigin((prev) => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude

        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          setOrigin((prev) => ({ ...prev, error: 'Coordenadas inválidas recibidas', loading: false }))
          return
        }

        setOrigin((prev) => ({ ...prev, lat, lon, loading: false, error: null }))

        // Reverse geocode (abort any previous in-flight request)
        reverseGeoAbortRef.current?.abort()
        const geoController = new AbortController()
        reverseGeoAbortRef.current = geoController

        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`, { signal: geoController.signal })
          if (res.ok) {
            const data = await res.json()
            setOrigin((prev) => ({ ...prev, name: data.displayName || `${lat.toFixed(4)}, ${lon.toFixed(4)}` }))
          } else {
            setOrigin((prev) => ({ ...prev, name: `${lat.toFixed(4)}, ${lon.toFixed(4)}` }))
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setOrigin((prev) => ({ ...prev, name: `${lat.toFixed(4)}, ${lon.toFixed(4)}` }))
        }
      },
      (error) => {
        let msg = 'Error al obtener ubicación'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Permiso de ubicación denegado. Habilitá el GPS en tu dispositivo.'
            break
          case error.POSITION_UNAVAILABLE:
            msg = 'Ubicación no disponible. Intentá de nuevo.'
            break
          case error.TIMEOUT:
            msg = 'Tiempo de espera agotado. El GPS está lento.'
            break
        }
        setOrigin((prev) => ({ ...prev, error: msg, loading: false }))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }, [])

  // Auto-detect GPS on mount
  useEffect(() => {
    getGPS()
  }, [getGPS])

  // ── Weather ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (origin.lat == null || origin.lon == null) return

    // Abort previous in-flight weather request
    weatherAbortRef.current?.abort()
    const controller = new AbortController()
    weatherAbortRef.current = controller

    fetch(`/api/weather?lat=${origin.lat}&lon=${origin.lon}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.weather) setWeather(data.weather)
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        /* weather failure is non-critical */
      })
  }, [origin.lat, origin.lon])

  // ── Predictions ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (origin.lat == null || origin.lon == null) return

    // Abort previous in-flight predict request
    predictAbortRef.current?.abort()
    const controller = new AbortController()
    predictAbortRef.current = controller

    fetch(`/api/predict?lat=${origin.lat}&lon=${origin.lon}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.predictions && data.predictions.length > 0) {
          setPredictions(data.predictions)
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        /* prediction failure is non-critical */
      })
  }, [origin.lat, origin.lon])

  // ── Destination Search (debounced) ───────────────────────────────────────

  const searchDestination = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query || query.trim().length < 3) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      // Abort previous in-flight geocode request
      searchAbortRef.current?.abort()
      const controller = new AbortController()
      searchAbortRef.current = controller

      setSearchLoading(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}&limit=5`, {
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.results || [])
        } else {
          setSearchResults([])
        }
      } catch (err) {
        // Ignore AbortError — a newer search replaced this one
        if (err instanceof DOMException && err.name === 'AbortError') return
        setSearchResults([])
      } finally {
        if (searchAbortRef.current === controller) {
          setSearchLoading(false)
        }
      }
    }, 500)
  }, [])

  const handleDestInputChange = useCallback((value: string) => {
    setDestInput(value)
    setDestCoords(null)
    setEstimate(null)
    setEstimateError(null)
    searchDestination(value)
  }, [searchDestination])

  const selectDestination = useCallback((result: GeoResult) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    if (Number.isNaN(lat) || Number.isNaN(lon)) return
    setDestCoords({ lat, lon, name: result.display_name })
    setDestInput(result.display_name.split(',')[0]) // Short name for input
    setSearchResults([])
    setEstimate(null)
    setEstimateError(null)
  }, [])

  const selectPrediction = useCallback((pred: Prediction) => {
    setDestCoords({ lat: pred.destLat, lon: pred.destLon, name: pred.destName })
    setDestInput(pred.destName)
    setSearchResults([])
    setEstimate(null)
    setEstimateError(null)
  }, [])

  // ── Voice Input ──────────────────────────────────────────────────────────

  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    if (!SpeechRecognition) {
      showToast('El reconocimiento de voz no está disponible en este navegador', 'error')
      return
    }

    // Stop any existing recognition
    if (speechRef.current && typeof (speechRef.current as { stop: () => void }).stop === 'function') {
      (speechRef.current as { stop: () => void }).stop()
    }

    const recognition = new (SpeechRecognition as new () => {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      onresult: (event: { results: { transcript: string }[][] }) => void
      onerror: (event: { error: string }) => void
      onend: () => void
      start: () => void
      stop: () => void
    })()
    recognition.lang = 'es-AR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: { results: { transcript: string }[][] }) => {
      const transcript = event.results[0][0].transcript
      if (transcript) {
        handleDestInputChange(transcript)
      }
    }

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== 'aborted') {
        showToast(`Error de voz: ${event.error}`, 'error')
      }
    }

    recognition.onend = () => {
      speechRef.current = null
    }

    speechRef.current = recognition
    recognition.start()
    showToast('Escuchando... Decí tu destino', 'info')
  }, [handleDestInputChange])

  // ── Get Estimate ─────────────────────────────────────────────────────────

  const runEstimate = useCallback(async () => {
    if (origin.lat == null || origin.lon == null) {
      showToast('Necesitás tu ubicación para estimar', 'error')
      return
    }
    if (!destCoords) {
      showToast('Ingresá un destino para estimar', 'error')
      return
    }

    // Abort any previous in-flight estimate request
    estimateAbortRef.current?.abort()
    const controller = new AbortController()
    estimateAbortRef.current = controller

    setEstimateLoading(true)
    setEstimateError(null)

    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: origin.lat,
          originLon: origin.lon,
          originName: origin.name,
          destLat: destCoords.lat,
          destLon: destCoords.lon,
          destName: destCoords.name,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error del servidor' }))
        setEstimateError(errData.error || 'Error al estimar')
        return
      }

      const data: EstimateData = await res.json()
      setEstimate(data)
    } catch (err) {
      // Ignore AbortError — it means a newer request replaced this one
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!navigator.onLine) {
        setEstimateError('Sin conexión. Verificá tu internet.')
      } else {
        setEstimateError('Error de red. Intentá de nuevo.')
      }
    } finally {
      // Only clear loading if this is still the active request
      if (estimateAbortRef.current === controller) {
        setEstimateLoading(false)
      }
    }
  }, [origin, destCoords])

  // Auto-estimate when both origin and destination are set
  // Use a ref to avoid re-triggering when runEstimate changes due to origin.name updates
  const runEstimateRef = useRef(runEstimate)
  runEstimateRef.current = runEstimate

  useEffect(() => {
    if (origin.lat != null && origin.lon != null && destCoords) {
      runEstimateRef.current()
    }
  }, [origin.lat, origin.lon, destCoords])

  // ── Record Ride ──────────────────────────────────────────────────────────

  const recordRide = useCallback(async (transport: string) => {
    if (origin.lat == null || origin.lon == null || !destCoords) return

    // Abort any previous in-flight recordRide request
    recordRideAbortRef.current?.abort()
    const controller = new AbortController()
    recordRideAbortRef.current = controller

    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: origin.lat,
          originLon: origin.lon,
          originName: origin.name,
          destLat: destCoords.lat,
          destLon: destCoords.lon,
          destName: destCoords.name,
          priceUber: estimate?.uber.estimate ?? null,
          priceDidi: estimate?.didi.estimate ?? null,
          distanceKm: estimate?.distanceKm ?? null,
          durationMin: estimate?.durationMin ?? null,
          transport,
        }),
        signal: controller.signal,
      })
      if (!res.ok) {
        console.warn('Ride recording failed:', res.status)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.warn('Ride recording error:', err)
    }
  }, [origin, destCoords, estimate])

  // ── Log Transport ────────────────────────────────────────────────────────

  const logTransport = useCallback(async () => {
    if (origin.lat == null || origin.lon == null || !destCoords) {
      showToast('Faltan datos para registrar el viaje', 'error')
      return
    }

    setLogLoading(true)
    try {
      const price = logPrice ? parseFloat(logPrice) : null
      if (price !== null && (Number.isNaN(price) || price < 0)) {
        showToast('Precio inválido', 'error')
        return
      }

      const res = await fetch('/api/transport-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: origin.lat,
          originLon: origin.lon,
          originName: origin.name,
          destLat: destCoords.lat,
          destLon: destCoords.lon,
          destName: destCoords.name,
          transport: selectedTransport,
          price,
        }),
      })

      if (res.ok) {
        showToast('Viaje registrado ✓', 'success')
        setShowTransportLog(false)
        setLogPrice('')
      } else {
        const errData = await res.json().catch(() => ({ error: 'Error' }))
        if (res.status === 409) {
          showToast('Este viaje ya fue registrado', 'info')
        } else {
          showToast(errData.error || 'Error al registrar', 'error')
        }
      }
    } catch {
      showToast('Error de conexión al registrar', 'error')
    } finally {
      setLogLoading(false)
    }
  }, [origin, destCoords, selectedTransport, logPrice])

  // ── Open Deep Link ───────────────────────────────────────────────────────

  const openDeepLink = useCallback((url: string, transport: string) => {
    // Record the ride when user clicks a deep link
    recordRide(transport)

    // Open the deep link
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
  }, [recordRide])

  // ── Toast ────────────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ message, type })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────

  const mapCenter: [number, number] = origin.lat != null && origin.lon != null
    ? [origin.lat, origin.lon]
    : SANTA_FE_CENTER

  const routeCoords: [number, number][] = origin.lat != null && origin.lon != null && destCoords
    ? [[origin.lat, origin.lon], [destCoords.lat, destCoords.lon]]
    : []

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧭</span>
            <h1 className="text-lg font-bold">Movilidad</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Online indicator */}
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Online' : 'Sin conexión'}
            </span>
            {/* GPS status */}
            {origin.loading ? (
              <span className="text-xs text-amber-500 animate-pulse">📍 Obteniendo...</span>
            ) : origin.error ? (
              <button
                onClick={getGPS}
                className="text-xs text-red-500 underline"
                aria-label="Reintentar GPS"
              >
                📍 Sin GPS
              </button>
            ) : origin.lat != null ? (
              <span className="text-xs text-green-600">📍 GPS</span>
            ) : (
              <button
                onClick={getGPS}
                className="text-xs text-muted-foreground underline"
                aria-label="Obtener ubicación GPS"
              >
                📍 Activar GPS
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Weather strip */}
        {weather && weather.temperature != null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <span>{weather.precipitation != null && weather.precipitation > 0 ? '🌧️' : '☀️'}</span>
            <span>{Math.round(weather.temperature)}°C</span>
            <span>·</span>
            <span>{weather.description}</span>
            {weather.precipitation != null && weather.precipitation > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-600">Lluvia: {weather.precipitation}mm</span>
              </>
            )}
          </div>
        )}

        {/* Origin display */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-lg">●</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Tu ubicación</p>
              <p className="text-sm font-medium truncate">
                {origin.loading ? 'Obteniendo ubicación...' : origin.name || 'Tocá "Activar GPS"'}
              </p>
            </div>
            <button
              onClick={getGPS}
              disabled={origin.loading}
              className="text-xs bg-muted hover:bg-muted/80 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
              aria-label="Actualizar ubicación GPS"
            >
              {origin.loading ? '⏳' : '📍'} GPS
            </button>
          </div>

          {origin.error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {origin.error}
            </p>
          )}
        </div>

        {/* Destination input */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-lg">●</span>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={destInput}
                onChange={(e) => handleDestInputChange(e.target.value)}
                placeholder="¿A dónde vas?"
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                aria-label="Destino"
              />
              <button
                onClick={startVoiceInput}
                className="text-lg hover:scale-110 transition-transform p-1"
                aria-label="Búsqueda por voz"
                title="Búsqueda por voz"
              >
                🎤
              </button>
            </div>
          </div>

          {/* Search results */}
          {searchLoading && (
            <p className="text-xs text-muted-foreground animate-pulse">Buscando direcciones...</p>
          )}
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => selectDestination(result)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors text-sm"
                >
                  <p className="font-medium truncate">{result.display_name.split(',')[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">{result.display_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Predictions */}
        {predictions.length > 0 && !destCoords && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">📍 Destinos frecuentes</p>
            <div className="space-y-1">
              {predictions.map((pred, idx) => (
                <button
                  key={`pred-${idx}-${pred.destLat}-${pred.destLon}`}
                  onClick={() => selectPrediction(pred)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <span className="text-lg">
                    {pred.confidence === 'high' ? '🟢' : pred.confidence === 'medium' ? '🟡' : '🔴'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pred.destName}</p>
                    <p className="text-xs text-muted-foreground">
                      Confianza: {pred.confidence === 'high' ? 'alta' : pred.confidence === 'medium' ? 'media' : 'baja'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(pred.score * 10) / 10}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estimate Results */}
        {estimateLoading && (
          <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="animate-spin text-2xl">⏳</div>
              <p className="text-sm text-muted-foreground">Calculando estimación...</p>
            </div>
          </div>
        )}

        {estimateError && (
          <div className="bg-destructive/10 rounded-xl border border-destructive/20 p-4">
            <p className="text-sm text-destructive">{estimateError}</p>
            <button
              onClick={runEstimate}
              className="mt-2 text-xs text-destructive underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {estimate && !estimateLoading && (
          <div className="space-y-3">
            {/* Advice banner */}
            <div className={`rounded-xl p-3 text-center text-sm font-medium ${
              estimate.advice === 'Pedí ahora' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
              estimate.advice === 'Conviene esperar' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
              'bg-muted text-muted-foreground'
            }`}>
              {estimate.advice === 'Pedí ahora' && '💡 '}
              {estimate.advice === 'Conviene esperar' && '⏰ '}
              {estimate.advice === 'Precios normales' && 'ℹ️ '}
              {estimate.advice === 'Precios normales para el horario' ? '🌙 Precios normales para el horario' : estimate.advice}
            </div>

            {/* Distance & Duration */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>📏 {estimate.distanceKm.toFixed(1)} km</span>
              <span>⏱️ ~{Math.round(estimate.durationMin)} min</span>
              <span>🎯 {estimate.confidence === 'high' ? 'Alta' : estimate.confidence === 'medium' ? 'Media' : 'Baja'}</span>
            </div>

            {/* Price comparison cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Uber card */}
              <div className={`bg-card rounded-xl border p-4 space-y-2 ${
                estimate.cheaper === 'uber' ? 'border-green-500 ring-1 ring-green-500/30' : 'border-border'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Uber</span>
                  {estimate.cheaper === 'uber' && (
                    <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full px-2 py-0.5">
                      Más barato
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold">{formatPrice(estimate.uber.estimate)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(estimate.uber.low)} — {formatPrice(estimate.uber.high)}
                </p>
                <button
                  onClick={() => openDeepLink(estimate.deepLinks.uber, 'uber')}
                  className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 active:scale-[0.98] transition-all"
                >
                  Ver en Uber →
                </button>
              </div>

              {/* DiDi card */}
              <div className={`bg-card rounded-xl border p-4 space-y-2 ${
                estimate.cheaper === 'didi' ? 'border-green-500 ring-1 ring-green-500/30' : 'border-border'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">DiDi</span>
                  {estimate.cheaper === 'didi' && (
                    <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full px-2 py-0.5">
                      Más barato
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold">{formatPrice(estimate.didi.estimate)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(estimate.didi.low)} — {formatPrice(estimate.didi.high)}
                </p>
                <button
                  onClick={() => openDeepLink(estimate.deepLinks.didi, 'didi')}
                  className="w-full bg-orange-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-orange-600 active:scale-[0.98] transition-all"
                >
                  Ver en DiDi →
                </button>
              </div>
            </div>

            {/* Factors info */}
            {(estimate.factors.weather || estimate.factors.rushHour || estimate.factors.weekendNight) && (
              <div className="flex flex-wrap gap-2 justify-center">
                {estimate.factors.weather && (
                  <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full px-3 py-1">
                    🌧️ Demanda por lluvia +15%
                  </span>
                )}
                {estimate.factors.rushHour && (
                  <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full px-3 py-1">
                    🏙️ Hora pico +20%
                  </span>
                )}
                {estimate.factors.weekendNight && (
                  <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full px-3 py-1">
                    🌙 Noche de finde +30%
                  </span>
                )}
              </div>
            )}

            {/* Transport log button */}
            <div className="text-center">
              <button
                onClick={() => setShowTransportLog(!showTransportLog)}
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                {showTransportLog ? 'Ocultar registro' : 'Registrá cómo viajaste'}
              </button>
            </div>

            {/* Transport log form */}
            {showTransportLog && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-medium">¿Cómo viajaste?</p>
                <div className="grid grid-cols-3 gap-2">
                  {VALID_TRANSPORTS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTransport(t)}
                      className={`rounded-lg py-2 px-3 text-xs font-medium transition-all ${
                        selectedTransport === t
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {TRANSPORT_LABELS[t]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={logPrice}
                    onChange={(e) => setLogPrice(e.target.value)}
                    placeholder="Precio (opcional)"
                    className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={logTransport}
                    disabled={logLoading}
                    className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {logLoading ? '⏳' : '✓ Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: '280px' }}>
          <MapView
            center={mapCenter}
            origin={origin.lat != null && origin.lon != null ? { lat: origin.lat, lon: origin.lon, name: origin.name } : null}
            destCoords={destCoords}
            routeCoords={routeCoords}
          />
        </div>

        {/* Offline notice */}
        {!isOnline && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-3 text-center">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              📡 Sin conexión. Los deep links siguen funcionando si tenés Uber/DiDi instalados.
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-card border-t border-border px-4 py-3">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            Asistente de movilidad para Sofía · Estimaciones basadas en datos históricos
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Los precios son estimaciones, no precios en tiempo real. Abrí la app para ver el precio real.
          </p>
        </div>
      </footer>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-4 ${
          toast.type === 'success' ? 'bg-green-600 text-white' :
          toast.type === 'error' ? 'bg-destructive text-destructive-foreground' :
          'bg-foreground text-background'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
