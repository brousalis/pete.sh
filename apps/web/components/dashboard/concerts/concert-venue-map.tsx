'use client'

import { Skeleton } from '@/components/ui/skeleton'
import type { Concert } from '@/lib/types/concerts.types'
import { useCallback, useEffect, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-namespace */
declare namespace google.maps {
  class Map {
    constructor(el: HTMLElement, opts?: Record<string, unknown>)
    fitBounds(bounds: LatLngBounds, padding?: Record<string, number>): void
  }
  class LatLngBounds {
    extend(point: { lat: number; lng: number }): void
  }
  namespace marker {
    class AdvancedMarkerElement {
      constructor(opts: { position: { lat: number; lng: number }; map: Map; content?: HTMLElement; title?: string })
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

declare global {
  interface Window {
    initConcertMap?: () => void
  }
}

interface ConcertVenueMapProps {
  concerts?: Concert[]
  singleVenue?: { lat: number; lng: number; name: string; address?: string }
  height?: string
  className?: string
}

export function ConcertVenueMap({
  concerts,
  singleVenue,
  height = '300px',
  className,
}: ConcertVenueMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      setMapLoaded(true)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''
    if (!apiKey) {
      setLoading(false)
      return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setMapLoaded(true)
          clearInterval(checkLoaded)
        }
      }, 100)
      return () => clearInterval(checkLoaded)
    }

    window.initConcertMap = () => {
      setMapLoaded(true)
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initConcertMap&libraries=marker`
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    return () => {
      delete window.initConcertMap
    }
  }, [])

  // Initialize map
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return

    const defaultCenter = { lat: 41.8781, lng: -87.6298 } // Chicago

    const map = new window.google.maps.Map(mapRef.current, {
      center: singleVenue
        ? { lat: singleVenue.lat, lng: singleVenue.lng }
        : defaultCenter,
      zoom: singleVenue ? 15 : 11,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'cooperative',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    } as Record<string, unknown>)

    mapInstanceRef.current = map

    if (singleVenue) {
      // Single venue marker
      const marker = document.createElement('div')
      marker.className = 'concert-map-marker'
      marker.style.cssText = `
        width: 32px; height: 32px;
        background: var(--brand, #f59e0b);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      `
      marker.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'

      new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: singleVenue.lat, lng: singleVenue.lng },
        map,
        content: marker,
        title: singleVenue.name,
      })
    } else if (concerts && concerts.length > 0) {
      // Multiple venue markers
      const bounds = new window.google.maps.LatLngBounds()
      const venueMap = new Map<string, { lat: number; lng: number; concerts: Concert[] }>()

      for (const concert of concerts) {
        if (!concert.venue_lat || !concert.venue_lng) continue
        const key = `${concert.venue_lat},${concert.venue_lng}`
        if (!venueMap.has(key)) {
          venueMap.set(key, { lat: concert.venue_lat, lng: concert.venue_lng, concerts: [] })
        }
        venueMap.get(key)!.concerts.push(concert)
        bounds.extend({ lat: concert.venue_lat, lng: concert.venue_lng })
      }

      for (const [, venue] of venueMap) {
        const count = venue.concerts.length
        const isUpcoming = venue.concerts.some((c) => c.status === 'upcoming')

        const marker = document.createElement('div')
        marker.style.cssText = `
          width: ${count > 1 ? 36 : 28}px;
          height: ${count > 1 ? 36 : 28}px;
          background: ${isUpcoming ? 'var(--brand, #f59e0b)' : 'hsl(var(--muted-foreground))' };
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 11px; font-weight: 700;
          cursor: pointer;
        `
        if (count > 1) {
          marker.textContent = String(count)
        }

        new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat: venue.lat, lng: venue.lng },
          map,
          content: marker,
          title: venue.concerts.map((c) => c.artist_name).join(', '),
        })
      }

      if (venueMap.size > 1) {
        map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 })
      }
    }

    setLoading(false)
  }, [concerts, singleVenue])

  useEffect(() => {
    if (mapLoaded) {
      initMap()
    }
  }, [mapLoaded, initMap])

  return (
    <div className={className} style={{ height, position: 'relative' }}>
      {loading && (
        <Skeleton className="absolute inset-0 rounded-xl" />
      )}
      <div
        ref={mapRef}
        className="size-full rounded-xl"
        style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }}
      />
    </div>
  )
}
