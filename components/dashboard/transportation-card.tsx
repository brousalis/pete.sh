'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, AlertCircle, Car, Train, Bus, PersonStanding, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RideShareCard } from './ride-share-card'
import type { CTABusResponse, CTATrainResponse } from '@/lib/types/cta.types'
import { getWalkingTime, getUrgencyLevel, type UrgencyLevel } from '@/lib/types/cta.types'
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

interface UrgencyBannerProps {
  urgency: 'leave-now' | 'prepare'
  arrivalMinutes: number
  walkingTime: number
}

/**
 * Animated urgency banner with countdown progress bar
 * The progress bar counts down from 100% to 0% based on remaining buffer time
 */
function UrgencyBanner({ urgency, arrivalMinutes, walkingTime }: UrgencyBannerProps) {
  const [progress, setProgress] = useState(100)
  const startTimeRef = useRef<number>(Date.now())
  const initialBufferRef = useRef<number>(arrivalMinutes - walkingTime)

  // Calculate the max buffer time for each urgency level
  // leave-now: 0-1 min buffer, prepare: 2-3 min buffer
  const maxBuffer = urgency === 'leave-now' ? 2 : 4 // Buffer in minutes when progress starts at 100%

  useEffect(() => {
    // Reset refs when arrival time changes significantly
    const currentBuffer = arrivalMinutes - walkingTime
    startTimeRef.current = Date.now()
    initialBufferRef.current = currentBuffer

    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000
      const currentBufferSeconds = (initialBufferRef.current * 60) - elapsedSeconds
      
      // Calculate progress: 100% at maxBuffer minutes, 0% at 0 minutes
      const maxBufferSeconds = maxBuffer * 60
      const newProgress = Math.max(0, Math.min(100, (currentBufferSeconds / maxBufferSeconds) * 100))
      
      setProgress(newProgress)
    }, 100) // Update every 100ms for smooth animation

    return () => clearInterval(interval)
  }, [arrivalMinutes, walkingTime, maxBuffer])

  const isLeaveNow = urgency === 'leave-now'

  return (
    <div className="relative overflow-hidden rounded-md mb-2">
      {/* Progress bar background */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-100 ease-linear",
          isLeaveNow
            ? "bg-red-600/80"
            : "bg-orange-500/80"
        )}
        style={{ width: `${progress}%` }}
      />
      {/* Darker background for depleted portion */}
      <div
        className={cn(
          "absolute inset-0",
          isLeaveNow
            ? "bg-red-900/90"
            : "bg-orange-900/90"
        )}
        style={{ 
          left: `${progress}%`,
          width: `${100 - progress}%`
        }}
      />
      {/* Content */}
      <div className={cn(
        "relative flex items-center justify-center gap-2 px-2 py-1.5 text-xs font-bold text-white",
        isLeaveNow && progress < 30 && "animate-pulse"
      )}>
        <AlertTriangle className="size-3" />
        {isLeaveNow ? 'LEAVE NOW!' : 'Get ready to leave'}
        <span className="font-normal">({arrivalMinutes}m arrival, {walkingTime}m walk)</span>
      </div>
    </div>
  )
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
  const firstMinutes = firstArrival === 'DUE' ? 0 : parseInt(firstArrival ?? '', 10)
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
      {/* Urgency Alert Banner with countdown progress */}
      {(urgency === 'leave-now' || urgency === 'prepare') && (
        <UrgencyBanner
          urgency={urgency}
          arrivalMinutes={firstMinutes}
          walkingTime={walkingTime}
        />
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
  const [showRideshare, setShowRideshare] = useState(false)

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
            variant={showRideshare ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowRideshare(!showRideshare)}
            className="gap-1.5 text-xs"
          >
            <Car className="size-3.5" />
            Rideshare
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchTransit} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Rideshare Widget */}
      {showRideshare && (
        <div className="rounded-xl border bg-background/50 p-4">
          <RideShareCard compact />
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
