'use client'

import { DashboardCardHeader } from '@/components/dashboard/dashboard-card-header'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api/client'
import type { CTABusResponse, CTATrainResponse } from '@/lib/types/cta.types'
import {
  getUrgencyLevel,
  getWalkingTime,
  type UrgencyLevel,
} from '@/lib/types/cta.types'
import { cn } from '@/lib/utils'
import { CTA_LINE_COLORS } from '@/lib/constants/colors'
import {
  AlertCircle,
  AlertTriangle,
  Bus,
  Car,
  PersonStanding,
  RefreshCw,
  Train,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RideShareCard } from './ride-share-card'

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
        row: 'bg-accent-rose/10 border border-accent-rose/30',
        text: 'text-accent-rose',
      }
    case 'prepare':
      return {
        row: 'bg-accent-ember/10 border border-accent-ember/30',
        text: 'text-accent-ember',
      }
    case 'upcoming':
      return {
        row: 'bg-accent-gold/10 border border-accent-gold/30',
        text: 'text-accent-gold',
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
function UrgencyBanner({
  urgency,
  arrivalMinutes,
  walkingTime,
}: UrgencyBannerProps) {
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
      const currentBufferSeconds =
        initialBufferRef.current * 60 - elapsedSeconds

      // Calculate progress: 100% at maxBuffer minutes, 0% at 0 minutes
      const maxBufferSeconds = maxBuffer * 60
      const newProgress = Math.max(
        0,
        Math.min(100, (currentBufferSeconds / maxBufferSeconds) * 100)
      )

      setProgress(newProgress)
    }, 100) // Update every 100ms for smooth animation

    return () => clearInterval(interval)
  }, [arrivalMinutes, walkingTime, maxBuffer])

  const isLeaveNow = urgency === 'leave-now'

  return (
    <div className="relative mb-2 overflow-hidden rounded-md">
      {/* Progress bar background */}
      <div
        className={cn(
          'absolute inset-0 transition-all duration-100 ease-linear',
          isLeaveNow ? 'bg-accent-rose/80' : 'bg-accent-ember/80'
        )}
        style={{ width: `${progress}%` }}
      />
      {/* Darker background for depleted portion */}
      <div
        className={cn(
          'absolute inset-0',
          isLeaveNow ? 'bg-accent-rose/90' : 'bg-accent-ember/90'
        )}
        style={{
          left: `${progress}%`,
          width: `${100 - progress}%`,
        }}
      />
      {/* Content */}
      <div
        className={cn(
          'relative flex items-center justify-center gap-2 px-2 py-1.5 text-xs font-bold text-white',
          isLeaveNow && progress < 30 && 'animate-pulse'
        )}
      >
        <AlertTriangle className="size-3" />
        {isLeaveNow ? 'LEAVE NOW!' : 'Get ready to leave'}
        <span className="font-normal">
          ({arrivalMinutes}m arrival, {walkingTime}m walk)
        </span>
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
  const urgencyBg = isFirst
    ? {
        missed: 'bg-accent-slate text-white line-through',
        'leave-now': 'bg-accent-rose text-white animate-pulse',
        prepare: 'bg-accent-ember text-white',
        upcoming: 'bg-accent-gold text-black',
        normal: isDue
          ? 'animate-pulse bg-brand text-white'
          : 'bg-muted text-foreground',
      }[urgency]
    : isDue
      ? 'animate-pulse bg-brand text-white'
      : 'bg-muted text-foreground'

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

function CTARouteRow({
  type,
  route,
  lineName,
  destination,
  arrivals,
}: CTARouteRowProps) {
  const colors =
    type === 'train' && lineName
      ? (CTA_LINE_COLORS[lineName] ?? CTA_LINE_COLORS.bus!)
      : CTA_LINE_COLORS.bus!

  // Get walking time for this route
  const walkingTime = getWalkingTime(route, type)

  // Calculate urgency based on first arrival
  const firstArrival = arrivals[0]
  const firstMinutes =
    firstArrival === 'DUE' ? 0 : parseInt(firstArrival ?? '', 10)
  const urgency = !isNaN(firstMinutes)
    ? getUrgencyLevel(firstMinutes, walkingTime)
    : 'normal'
  const urgencyStyles = getUrgencyRowStyles(urgency)

  // Check if any arrival is catchable
  const hasCatchable = arrivals.some(time => {
    const mins = time === 'DUE' ? 0 : parseInt(time, 10)
    return !isNaN(mins) && mins >= walkingTime
  })

  return (
    <div
      className={cn(
        'rounded-lg p-3 transition-all duration-300',
        urgencyStyles.row,
        urgency === 'normal' && 'hover:bg-muted/50'
      )}
    >
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
        <div
          className={`flex items-center justify-center rounded-lg ${colors.bg} ${colors.text} h-10 min-w-[44px] px-2`}
        >
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
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}
              >
                {lineName}
              </span>
            )}
            {type === 'bus' && (
              <span className="text-foreground text-sm font-semibold">
                Bus {route}
              </span>
            )}
            {/* Walking time indicator */}
            <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
              <PersonStanding className="size-3" />
              {walkingTime}m
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-muted-foreground truncate text-xs">
              to {destination}
            </p>
            {/* Catchable indicator */}
            {arrivals.length > 0 &&
              (hasCatchable ? (
                <span className="text-[10px] font-medium text-accent-sage">
                  Catchable
                </span>
              ) : (
                <span className="text-[10px] font-medium text-accent-rose">
                  Too late
                </span>
              ))}
          </div>
        </div>

        {/* Arrival Times */}
        <div className="flex items-center gap-1.5">
          {arrivals.length > 0 ? (
            arrivals.slice(0, 2).map((time, idx) => {
              const mins = time === 'DUE' ? 0 : parseInt(time, 10)
              const arrivalUrgency = !isNaN(mins)
                ? getUrgencyLevel(mins, walkingTime)
                : 'normal'
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
            <span className="text-muted-foreground text-xs italic">
              No arrivals
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function TransportationCard() {
  const [busData, setBusData] = useState<Record<string, CTABusResponse>>({})
  const [trainData, setTrainData] = useState<Record<string, CTATrainResponse>>(
    {}
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRideshare, setShowRideshare] = useState(false)

  const fetchTransit = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<{
        bus: Record<string, CTABusResponse>
        train: Record<string, CTATrainResponse>
      }>('/api/cta/all')
      if (!response.success) {
        if (response.code === 'NOT_CONFIGURED') {
          setError('CTA API not configured')
          return
        }
        throw new Error(response.error || 'Failed to fetch transit data')
      }
      if (response.data) {
        setBusData(response.data.bus || {})
        setTrainData(response.data.train || {})
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
      arrivals: predictions
        .slice(0, 3)
        .map(p => (p.prdctdn === 'DUE' ? 'DUE' : p.prdctdn)),
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
    const predictions =
      lineData?.ctatt?.eta
        ?.filter(eta => {
          const trDr =
            typeof eta.trDr === 'string' ? parseInt(eta.trDr, 10) : eta.trDr
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
      <div className="bg-card rounded-2xl p-5">
        <div className="text-destructive flex items-center gap-2">
          <AlertCircle className="size-5" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DashboardCardHeader
        icon={<Bus className="size-5 text-[#00A1DE]" />}
        iconContainerClassName="bg-[#00A1DE]/10"
        title="Getting Around"
        badge={
          <span className="rounded bg-[#00A1DE] px-1.5 py-0.5 text-[10px] font-bold text-white">
            CTA
          </span>
        }
        viewHref="/transit"
        viewLabel="View"
        onRefresh={fetchTransit}
        refreshing={loading}
        rightExtra={
          <Button
            variant={showRideshare ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowRideshare(!showRideshare)}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <Car className="size-3.5" />
            Rideshare
          </Button>
        }
      />

      {/* Rideshare Widget */}
      {showRideshare && (
        <div className="bg-background/50 rounded-xl border p-4">
          <RideShareCard compact />
        </div>
      )}

      {/* Transit Arrivals */}
      {loading && Object.keys(busData).length === 0 ? (
        <div className="bg-muted/30 flex items-center gap-2 rounded-lg border p-4">
          <RefreshCw className="text-muted-foreground size-4 animate-spin" />
          <span className="text-muted-foreground text-sm">
            Loading arrivals...
          </span>
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
          {processedBusRoutes.map(
            route =>
              !route.error && (
                <CTARouteRow
                  key={route.route}
                  type="bus"
                  route={route.route}
                  destination={route.destination}
                  arrivals={route.arrivals}
                />
              )
          )}
        </div>
      )}

      {/* Live indicator */}
      <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-sage opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-accent-sage" />
        </span>
        Live updates every 30s
      </div>
    </div>
  )
}
