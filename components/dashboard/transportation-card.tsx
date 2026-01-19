'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle, Car, MapPin, Loader2, Train, Bus, PersonStanding, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MapsLocationPicker } from './maps-location-picker'
import type { CTABusResponse, CTATrainResponse } from '@/lib/types/cta.types'
import { getWalkingTime, getUrgencyLevel, type UrgencyLevel } from '@/lib/types/cta.types'
import type { MapsLocation } from '@/lib/types/maps.types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// CTA Brand Colors
const CTA_COLORS = {
  Brown: { bg: 'bg-[#62361B]', text: 'text-white', border: 'border-[#62361B]' },
  Purple: { bg: 'bg-[#522398]', text: 'text-white', border: 'border-[#522398]' },
  Red: { bg: 'bg-[#C60C30]', text: 'text-white', border: 'border-[#C60C30]' },
  Blue: { bg: 'bg-[#00A1DE]', text: 'text-white', border: 'border-[#00A1DE]' },
  Green: { bg: 'bg-[#009B3A]', text: 'text-white', border: 'border-[#009B3A]' },
  Orange: { bg: 'bg-[#F9461C]', text: 'text-white', border: 'border-[#F9461C]' },
  Pink: { bg: 'bg-[#E27EA6]', text: 'text-white', border: 'border-[#E27EA6]' },
  Yellow: { bg: 'bg-[#F9E300]', text: 'text-black', border: 'border-[#F9E300]' },
  bus: { bg: 'bg-[#565A5C]', text: 'text-white', border: 'border-[#565A5C]' },
}

// Urgency styling
function getUrgencyRowStyles(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'missed':
      return {
        row: 'bg-muted/30 opacity-60',
        text: 'text-muted-foreground',
      }
    case 'leave-now':
      return {
        row: 'bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800',
        text: 'text-red-600 dark:text-red-400',
      }
    case 'prepare':
      return {
        row: 'bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800',
        text: 'text-orange-600 dark:text-orange-400',
      }
    case 'upcoming':
      return {
        row: 'bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-300 dark:border-yellow-800',
        text: 'text-yellow-600 dark:text-yellow-400',
      }
    default:
      return {
        row: 'bg-muted/30',
        text: '',
      }
  }
}

interface ArrivalBadgeProps {
  minutes: string
  urgency: UrgencyLevel
  isFirst?: boolean
}

function ArrivalBadge({ minutes, urgency, isFirst }: ArrivalBadgeProps) {
  const isDue = minutes === 'DUE' || minutes === '1'
  
  // Apply urgency styling to first badge
  const urgencyBg = isFirst ? {
    'missed': 'bg-gray-400 text-white line-through',
    'leave-now': 'bg-red-500 text-white animate-pulse',
    'prepare': 'bg-orange-500 text-white',
    'upcoming': 'bg-yellow-500 text-black',
    'normal': isDue ? 'animate-pulse bg-brand text-white' : 'bg-muted text-foreground',
  }[urgency] : (isDue ? 'animate-pulse bg-brand text-white' : 'bg-muted text-foreground')

  return (
    <div
      className={cn(
        'flex min-w-[52px] items-center justify-center rounded-md px-2 py-1.5 font-mono text-sm font-bold tabular-nums',
        urgencyBg
      )}
    >
      {minutes === 'DUE' ? 'DUE' : `${minutes}m`}
    </div>
  )
}

interface CTARouteRowProps {
  type: 'train' | 'bus'
  route: string
  lineName?: string
  destination: string
  arrivals: string[]
}

function CTARouteRow({ type, route, lineName, destination, arrivals }: CTARouteRowProps) {
  const colors = type === 'train' && lineName
    ? CTA_COLORS[lineName as keyof typeof CTA_COLORS] || CTA_COLORS.bus
    : CTA_COLORS.bus

  // Get walking time for this route
  const walkingTime = getWalkingTime(route, type)
  
  // Calculate urgency based on first arrival
  const firstArrival = arrivals[0]
  const firstMinutes = firstArrival === 'DUE' ? 0 : parseInt(firstArrival, 10)
  const urgency = !isNaN(firstMinutes) ? getUrgencyLevel(firstMinutes, walkingTime) : 'normal'
  const urgencyStyles = getUrgencyRowStyles(urgency)
  
  // Check if any arrival is catchable
  const hasCatchable = arrivals.some(time => {
    const mins = time === 'DUE' ? 0 : parseInt(time, 10)
    return !isNaN(mins) && mins >= walkingTime
  })

  return (
    <div className={cn(
      'rounded-lg p-3 transition-all duration-300',
      urgencyStyles.row,
      urgency === 'normal' && 'hover:bg-muted/50'
    )}>
      {/* Urgency Alert Banner */}
      {urgency === 'leave-now' && (
        <div className="flex items-center justify-center gap-2 rounded-md px-2 py-1 mb-2 text-xs font-bold bg-red-500 text-white animate-pulse">
          <AlertTriangle className="size-3" />
          LEAVE NOW!
          <span className="font-normal">({firstMinutes}m arrival, {walkingTime}m walk)</span>
        </div>
      )}
      {urgency === 'prepare' && (
        <div className="flex items-center justify-center gap-2 rounded-md px-2 py-1 mb-2 text-xs font-bold bg-orange-500 text-white">
          <AlertTriangle className="size-3" />
          Get ready to leave
          <span className="font-normal">({firstMinutes}m arrival, {walkingTime}m walk)</span>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        {/* Route Badge */}
        <div className={`flex items-center justify-center rounded-lg ${colors.bg} ${colors.text} min-w-[44px] h-10 px-2`}>
          {type === 'train' ? (
            <Train className="size-5" />
          ) : (
            <span className="text-base font-bold">{route}</span>
          )}
        </div>

        {/* Route Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {type === 'train' && lineName && (
              <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>
                {lineName}
              </span>
            )}
            {type === 'bus' && (
              <span className="text-sm font-semibold text-foreground">
                Bus {route}
              </span>
            )}
            {/* Walking time indicator */}
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <PersonStanding className="size-3" />
              {walkingTime}m
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="truncate text-xs text-muted-foreground">
              to {destination}
            </p>
            {/* Catchable indicator */}
            {arrivals.length > 0 && (
              hasCatchable ? (
                <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                  Catchable
                </span>
              ) : (
                <span className="text-[10px] font-medium text-red-500">
                  Too late
                </span>
              )
            )}
          </div>
        </div>

        {/* Arrival Times */}
        <div className="flex items-center gap-1.5">
          {arrivals.length > 0 ? (
            arrivals.slice(0, 2).map((time, idx) => {
              const mins = time === 'DUE' ? 0 : parseInt(time, 10)
              const arrivalUrgency = !isNaN(mins) ? getUrgencyLevel(mins, walkingTime) : 'normal'
              return (
                <ArrivalBadge
                  key={idx}
                  minutes={time}
                  urgency={arrivalUrgency}
                  isFirst={idx === 0}
                />
              )
            })
          ) : (
            <span className="text-xs text-muted-foreground italic">No arrivals</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function TransportationCard() {
  const [busData, setBusData] = useState<Record<string, CTABusResponse>>({})
  const [trainData, setTrainData] = useState<Record<string, CTATrainResponse>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLyft, setShowLyft] = useState(false)
  const [pickup, setPickup] = useState<MapsLocation | null>(null)
  const [dropoff, setDropoff] = useState<MapsLocation | null>(null)
  const [lyftLoading, setLyftLoading] = useState(false)

  const fetchTransit = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/cta/all')
      if (!response.ok) {
        if (response.status === 400) {
          setError('CTA API not configured')
          return
        }
        throw new Error('Failed to fetch transit data')
      }
      const data = await response.json()
      if (data.success && data.data) {
        setBusData(data.data.bus || {})
        setTrainData(data.data.train || {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransit()
    const interval = setInterval(fetchTransit, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [])

  const handleLyftRequest = async () => {
    if (!pickup || !dropoff) {
      toast.error('Please select both pickup and dropoff locations')
      return
    }
    setLyftLoading(true)
    try {
      const response = await fetch('/api/lyft/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_type: 'lyft',
          origin: {
            lat: pickup.geometry.location.lat,
            lng: pickup.geometry.location.lng,
            address: pickup.formatted_address,
          },
          destination: {
            lat: dropoff.geometry.location.lat,
            lng: dropoff.geometry.location.lng,
            address: dropoff.formatted_address,
          },
        }),
      })
      if (response.ok) {
        toast.success('Ride requested!')
        setPickup(null)
        setDropoff(null)
        setShowLyft(false)
      }
    } catch {
      toast.error('Failed to request ride')
    } finally {
      setLyftLoading(false)
    }
  }

  // Process bus routes
  const busRoutes = ['76', '36', '22']
  const processedBusRoutes = busRoutes.map(route => {
    const routeData = busData[route]
    const predictions = routeData?.['bustime-response']?.prd || []
    const routeError = routeData?.['bustime-response']?.error?.[0]?.msg

    return {
      route,
      destination: predictions[0]?.stpnm || 'Downtown',
      arrivals: predictions.slice(0, 3).map(p => p.prdctdn === 'DUE' ? 'DUE' : p.prdctdn),
      error: routeError,
    }
  })

  // Process train lines
  const trainLines = [
    { code: 'Brn', name: 'Brown' },
    { code: 'P', name: 'Purple' },
  ]
  const processedTrainLines = trainLines.map(({ code, name }) => {
    const lineData = trainData[code]
    const predictions = lineData?.ctatt?.eta
      ?.filter(eta => {
        const trDr = typeof eta.trDr === 'string' ? parseInt(eta.trDr, 10) : eta.trDr
        return eta.rt === code && trDr === 5 // Southbound to Loop
      })
      .slice(0, 3)
      .map(eta => {
        const minutes = Math.round(
          (new Date(eta.arrT).getTime() - new Date().getTime()) / 60000
        )
        return minutes <= 0 ? 'DUE' : minutes.toString()
      }) || []

    return {
      code,
      name,
      destination: lineData?.ctatt?.eta?.[0]?.destNm || 'Loop',
      arrivals: predictions,
    }
  })

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-5 ">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Getting Around</h3>
          {/* CTA Logo style badge */}
          <span className="rounded bg-[#00A1DE] px-1.5 py-0.5 text-[10px] font-bold text-white">
            CTA
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showLyft ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowLyft(!showLyft)}
            className="gap-1.5 text-xs"
          >
            <Car className="size-3.5" />
            Lyft
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchTransit} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Lyft Request Form */}
      {showLyft && (
        <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Car className="size-4 text-pink-500" />
            <span className="text-sm font-medium">Request a Ride</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Pickup
              </label>
              <MapsLocationPicker onSelect={setPickup} placeholder="Search pickup..." />
              {pickup && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  <span className="truncate">{pickup.formatted_address}</span>
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Dropoff
              </label>
              <MapsLocationPicker onSelect={setDropoff} placeholder="Search dropoff..." />
              {dropoff && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  <span className="truncate">{dropoff.formatted_address}</span>
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleLyftRequest}
            disabled={!pickup || !dropoff || lyftLoading}
            className="w-full gap-2 bg-pink-500 hover:bg-pink-600"
          >
            {lyftLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Car className="size-4" />
                Request Lyft
              </>
            )}
          </Button>
        </div>
      )}

      {/* Transit Arrivals */}
      {loading && Object.keys(busData).length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-4">
          <RefreshCw className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading arrivals...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Train Lines */}
          {processedTrainLines.map(line => (
            <CTARouteRow
              key={line.code}
              type="train"
              route={line.code}
              lineName={line.name}
              destination={line.destination}
              arrivals={line.arrivals}
            />
          ))}

          {/* Bus Routes */}
          {processedBusRoutes.map(route => (
            !route.error && (
              <CTARouteRow
                key={route.route}
                type="bus"
                route={route.route}
                destination={route.destination}
                arrivals={route.arrivals}
              />
            )
          ))}
        </div>
      )}

      {/* Live indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
        Live updates every 30s
      </div>
    </div>
  )
}
