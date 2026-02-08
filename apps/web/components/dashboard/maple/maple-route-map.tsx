'use client'

import { Skeleton } from '@/components/ui/skeleton'
import type { LocationSample } from '@/lib/types/apple-health.types'
import { MapPin, Navigation } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Google Maps type declarations
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
    google: { maps: typeof google.maps }
    initMap: () => void
  }
}

interface MapleRouteMapProps {
  samples: LocationSample[]
  hrSamples?: Array<{ timestamp: string; bpm: number }>
  className?: string
  showElevation?: boolean
  colorByHeartRate?: boolean
}

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script'

// HR zone colors (matching fitness dashboard)
const HR_ZONE_COLORS = {
  zone1: '#10b981', // Green - Rest/Light
  zone2: '#22c55e', // Light Green - Warm up
  zone3: '#eab308', // Yellow - Fat burn
  zone4: '#f97316', // Orange - Cardio
  zone5: '#ef4444', // Red - Peak
}

function getHrZoneColor(bpm: number, maxHr: number = 185): string {
  const percentage = (bpm / maxHr) * 100
  if (percentage < 50) return HR_ZONE_COLORS.zone1
  if (percentage < 60) return HR_ZONE_COLORS.zone2
  if (percentage < 70) return HR_ZONE_COLORS.zone3
  if (percentage < 85) return HR_ZONE_COLORS.zone4
  return HR_ZONE_COLORS.zone5
}

export function MapleRouteMap({
  samples,
  hrSamples,
  className = '',
  colorByHeartRate = false,
}: MapleRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const polylinesRef = useRef<google.maps.Polyline[]>([])
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)

  // Fetch API key
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

  // Load Google Maps script
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

    return () => {
      // Don't remove the script on cleanup as other components might need it
    }
  }, [apiKey])

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || samples.length === 0) return

    // Clear existing polylines and markers
    polylinesRef.current.forEach((polyline) => polyline.setMap(null))
    polylinesRef.current = []
    markersRef.current.forEach((marker) => (marker.map = null))
    markersRef.current = []

    // Calculate bounds
    const bounds = new google.maps.LatLngBounds()
    const path = samples.map((sample) => {
      const latLng = { lat: sample.latitude, lng: sample.longitude }
      bounds.extend(latLng)
      return latLng
    })

    // Create or update map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        mapId: 'maple-route-map',
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

    // Create polyline(s)
    if (colorByHeartRate && hrSamples && hrSamples.length > 0) {
      // Create segments colored by HR
      const hrMap = new Map(hrSamples.map((s) => [new Date(s.timestamp).getTime(), s.bpm]))

      for (let i = 0; i < path.length - 1; i++) {
        const sample = samples[i]
        if (!sample) continue
        const sampleTime = new Date(sample.timestamp).getTime()

        // Find closest HR sample
        let closestBpm = 120 // Default
        let minDiff = Infinity
        for (const [time, bpm] of hrMap) {
          const diff = Math.abs(time - sampleTime)
          if (diff < minDiff) {
            minDiff = diff
            closestBpm = bpm
          }
        }

        const segment = new google.maps.Polyline({
          path: [path[i], path[i + 1]],
          strokeColor: getHrZoneColor(closestBpm),
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        })
        polylinesRef.current.push(segment)
      }
    } else {
      // Single color polyline
      const polyline = new google.maps.Polyline({
        path,
        strokeColor: '#3b82f6', // Blue
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      })
      polylinesRef.current.push(polyline)
    }

    // Add start marker
    if (path.length > 0) {
      const startMarkerContent = document.createElement('div')
      startMarkerContent.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
      `

      const startMarker = new google.maps.marker.AdvancedMarkerElement({
        position: path[0],
        map,
        content: startMarkerContent,
        title: 'Start',
      })
      markersRef.current.push(startMarker)

      // Add end marker
      const endMarkerContent = document.createElement('div')
      endMarkerContent.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `

      const endMarker = new google.maps.marker.AdvancedMarkerElement({
        position: path[path.length - 1],
        map,
        content: endMarkerContent,
        title: 'End',
      })
      markersRef.current.push(endMarker)
    }
  }, [samples, hrSamples, colorByHeartRate])

  // Initialize map when ready
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

  if (samples.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl bg-muted/50 p-8 ${className}`}
      >
        <Navigation className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No route data available</p>
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

// Static map image for thumbnails
export function MapleRouteMapStatic({
  samples,
  className = '',
  width = 400,
  height = 200,
}: {
  samples: LocationSample[]
  className?: string
  width?: number
  height?: number
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (samples.length === 0) return

    // Downsample path for URL length limits
    const step = Math.max(1, Math.floor(samples.length / 50))
    const path = samples
      .filter((_, i) => i % step === 0)
      .map((s) => `${s.latitude.toFixed(5)},${s.longitude.toFixed(5)}`)
      .join('|')

    fetch('/api/config/maps')
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) {
          const url = `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&path=color:0x3b82f6ff|weight:3|${path}&key=${data.apiKey}`
          setImageUrl(url)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
  }, [samples, width, height])

  if (error || samples.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-muted/50 ${className}`}
        style={{ width, height }}
      >
        <MapPin className="size-6 text-muted-foreground" />
      </div>
    )
  }

  if (!imageUrl) {
    return <Skeleton className={className} style={{ width, height }} />
  }

  return (
    <img
      src={imageUrl}
      alt="Walk route"
      className={`rounded-lg object-cover ${className}`}
      width={width}
      height={height}
      onError={() => setError(true)}
    />
  )
}
