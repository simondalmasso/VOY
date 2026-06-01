'use client'

import { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import type { LatLngExpression } from 'leaflet'

// ─── Fix Leaflet default icon paths ──────────────────────────────────────────
// Leaflet's default icon references local paths that don't work with bundlers.
// This must run once before any Marker is rendered.

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Map Recenter Component ──────────────────────────────────────────────────
// MapContainer only reads `center` on first render.
// This child component uses useMap().flyTo() to update the viewport
// when the GPS position changes.

interface MapRecenterProps {
  center: LatLngExpression
  zoom?: number
}

function MapRecenter({ center, zoom = 14 }: MapRecenterProps) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 })
  }, [center, zoom, map])

  return null
}

// ─── Main MapView Component ──────────────────────────────────────────────────

interface MapViewProps {
  center: [number, number]
  origin: { lat: number; lon: number; name: string } | null
  destCoords: { lat: number; lon: number; name: string } | null
  routeCoords: [number, number][]
}

export default function MapView({ center, origin, destCoords, routeCoords }: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <MapRecenter center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {origin && origin.lat != null && origin.lon != null && (
        <Marker position={[origin.lat, origin.lon]}>
          <Popup>Tu ubicación{origin.name ? `: ${origin.name.split(',')[0]}` : ''}</Popup>
        </Marker>
      )}
      {destCoords && (
        <Marker position={[destCoords.lat, destCoords.lon]}>
          <Popup>Destino: {destCoords.name.split(',')[0]}</Popup>
        </Marker>
      )}
      {routeCoords.length === 2 && (
        <Polyline positions={routeCoords} color="#3b82f6" weight={3} opacity={0.7} />
      )}
    </MapContainer>
  )
}
