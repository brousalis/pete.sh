'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { HR_ZONE_COLORS } from '@/lib/constants/colors'
import type { LocationSample } from '@/lib/types/apple-health.types'
import { MapPin, Navigation } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

declare namespace google.maps {
  class Map {
    constructor(element: HTMLElement, options: MapOptions)
    fitBounds(bounds: LatLngBounds, padding?: { top: number; bottom: number; left: number; right: number }): void
  }
  class LatLngBounds {
    constructor()
    extend(latLng: LatLngLiteral): void
  }
  class Polyline {
    constructor(options: PolylineOptions)
    setMap(map: Map | null): void
  }
  namespace marker {
    class AdvancedMarkerElement {
      constructor(options: AdvancedMarkerElementOptions)
      map: Map | null
    }
    interface AdvancedMarkerElementOptions {
      position: LatLngLiteral
      map: Map
      content: HTMLElement
      title?: string
    }
  }
  interface MapOptions {
    mapId?: string
    disableDefaultUI?: boolean
    zoomControl?: boolean
    gestureHandling?: string
    styles?: MapTypeStyle[]
  }
  interface LatLngLiteral {
    lat: number
    lng: number
  }
  interface PolylineOptions {
    path: LatLngLiteral[]
    strokeColor?: string
    strokeOpacity?: number
    strokeWeight?: number
    map?: Map
  }
  interface MapTypeStyle {
    featureType?: string
    elementType?: string
    stylers?: { visibility?: string }[]
  }
}

declare global {
  interface Window {
    google?: { maps: typeof google.maps }
    initMap?: () => void
  }
}

interface WorkoutRouteMapProps {
  samples: LocationSample[]
  hrSamples?: Array<{ timestamp: string; bpm: number }>
  className?: string
  colorByHeartRate?: boolean
}

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script'

function getHrZoneColor(bpm: number, maxHr: number = 185): string {
  const percentage = (bpm / maxHr) * 100
  if (percentage < 50) return HR_ZONE_COLORS.rest.hex
  if (percentage < 60) return HR_ZONE_COLORS.warmup.hex
  if (percentage < 70) return HR_ZONE_COLORS.fatBurn.hex
  if (percentage < 85) return HR_ZONE_COLORS.cardio.hex
  return HR_ZONE_COLORS.peak.hex
}

export function WorkoutRouteMap({
  samples,
  hrSamples,
  className = '',
  colorByHeartRate = false,
}: WorkoutRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const polylinesRef = useRef<google.maps.Polyline[]>([])
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/config/maps')
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) {
          setApiKey(data.apiKey)
        } else {
          setError('Google Maps API key not configured')
          setIsLoading(false)
        }
      })
      .catch(() => {
        setError('Failed to load map configuration')
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!apiKey) return

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (existingScript) {
      if (window.google?.maps) {
        setIsLoading(false)
      }
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=weekly`
    script.async = true
    script.defer = true
    script.onload = () => {
      setIsLoading(false)
    }
    script.onerror = () => {
      setError('Failed to load Google Maps')
      setIsLoading(false)
    }
    document.head.appendChild(script)
  }, [apiKey])

  const hasRouteData = samples.length > 0

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || !hasRouteData) return

    polylinesRef.current.forEach((polyline) => polyline.setMap(null))
    polylinesRef.current = []
    markersRef.current.forEach((marker) => (marker.map = null))
    markersRef.current = []

    const bounds = new google.maps.LatLngBounds()
    const path = samples.map((sample) => {
      const latLng = { lat: sample.latitude, lng: sample.longitude }
      bounds.extend(latLng)
      return latLng
    })

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        mapId: 'workout-route-map',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      })
    }

    const map = mapInstanceRef.current
    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 })

    if (path.length >= 2 && colorByHeartRate && hrSamples && hrSamples.length > 0) {
      const hrMap = new Map(hrSamples.map((s) => [new Date(s.timestamp).getTime(), s.bpm]))

      for (let i = 0; i < path.length - 1; i++) {
        const sample = samples[i]
        const currentPoint = path[i]
        const nextPoint = path[i + 1]
        if (!sample || !currentPoint || !nextPoint) continue
        const sampleTime = new Date(sample.timestamp).getTime()

        let closestBpm = 120
        let minDiff = Infinity
        for (const [time, bpm] of hrMap) {
          const diff = Math.abs(time - sampleTime)
          if (diff < minDiff) {
            minDiff = diff
            closestBpm = bpm
          }
        }

        const segment = new google.maps.Polyline({
          path: [currentPoint, nextPoint],
          strokeColor: getHrZoneColor(closestBpm),
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        })
        polylinesRef.current.push(segment)
      }
    } else if (path.length >= 2) {
      const polyline = new google.maps.Polyline({
        path,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      })
      polylinesRef.current.push(polyline)
    }

    const startPosition = path[0]
    const endPosition = path.length > 0 ? path[path.length - 1] : null
    if (startPosition && endPosition) {
      const startMarkerContent = document.createElement('div')
      startMarkerContent.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 bg-accent-sage rounded-full border-2 border-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
      `

      const startMarker = new google.maps.marker.AdvancedMarkerElement({
        position: startPosition,
        map,
        content: startMarkerContent,
        title: 'Start',
      })
      markersRef.current.push(startMarker)

      const endMarkerContent = document.createElement('div')
      endMarkerContent.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 bg-accent-rose rounded-full border-2 border-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `

      const endMarker = new google.maps.marker.AdvancedMarkerElement({
        position: endPosition,
        map,
        content: endMarkerContent,
        title: 'End',
      })
      markersRef.current.push(endMarker)
    }
  }, [samples, hrSamples, colorByHeartRate, hasRouteData])

  useEffect(() => {
    if (!isLoading && !error && window.google?.maps) {
      initializeMap()
    }
  }, [isLoading, error, initializeMap])

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl bg-muted/50 p-8 ${className}`}
      >
        <MapPin className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!hasRouteData) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl bg-muted/50 p-8 ${className}`}
      >
        <Navigation className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No GPS data recorded for this workout</p>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="h-full w-full" />
        </div>
      )}
      <div ref={mapRef} className="h-full w-full min-h-[300px]" />
    </div>
  )
}

/** @deprecated Use WorkoutRouteMap */
export const MapleRouteMap = WorkoutRouteMap
