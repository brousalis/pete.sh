"use client"

import { useState, useEffect, useRef } from "react"
import { Bus, Train, RefreshCw, AlertCircle, AlertTriangle, PersonStanding } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CTABusResponse, CTATrainResponse } from "@/lib/types/cta.types"
import { getWalkingTime, getUrgencyLevel, type UrgencyLevel } from "@/lib/types/cta.types"
import { cn } from "@/lib/utils"
import { apiGet } from "@/lib/api/client"

// CTA Brand Colors
const CTA_COLORS = {
  Brown: { bg: "bg-[#62361B]", text: "text-white" },
  Purple: { bg: "bg-[#522398]", text: "text-white" },
  Red: { bg: "bg-[#C60C30]", text: "text-white" },
  Blue: { bg: "bg-[#00A1DE]", text: "text-white" },
  Green: { bg: "bg-[#009B3A]", text: "text-white" },
  Orange: { bg: "bg-[#F9461C]", text: "text-white" },
  bus: { bg: "bg-[#565A5C]", text: "text-white" },
}

interface UrgencyBannerProps {
  urgency: "leave-now" | "prepare"
  arrivalMinutes: number
  walkingTime: number
  routeLabel: string
}

/**
 * Compact animated urgency banner with countdown progress bar
 */
function UrgencyBanner({ urgency, arrivalMinutes, walkingTime, routeLabel }: UrgencyBannerProps) {
  const [progress, setProgress] = useState(100)
  const startTimeRef = useRef<number>(Date.now())
  const initialBufferRef = useRef<number>(arrivalMinutes - walkingTime)

  const maxBuffer = urgency === "leave-now" ? 2 : 4

  useEffect(() => {
    const currentBuffer = arrivalMinutes - walkingTime
    startTimeRef.current = Date.now()
    initialBufferRef.current = currentBuffer

    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000
      const currentBufferSeconds = initialBufferRef.current * 60 - elapsedSeconds
      const maxBufferSeconds = maxBuffer * 60
      const newProgress = Math.max(0, Math.min(100, (currentBufferSeconds / maxBufferSeconds) * 100))
      setProgress(newProgress)
    }, 100)

    return () => clearInterval(interval)
  }, [arrivalMinutes, walkingTime, maxBuffer])

  const isLeaveNow = urgency === "leave-now"

  return (
    <div className="relative overflow-hidden rounded-md mb-2">
      {/* Progress bar background */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-100 ease-linear",
          isLeaveNow ? "bg-red-600/80" : "bg-orange-500/80"
        )}
        style={{ width: `${progress}%` }}
      />
      {/* Darker background for depleted portion */}
      <div
        className={cn("absolute inset-0", isLeaveNow ? "bg-red-900/90" : "bg-orange-900/90")}
        style={{ left: `${progress}%`, width: `${100 - progress}%` }}
      />
      {/* Content */}
      <div
        className={cn(
          "relative flex items-center justify-center gap-1.5 px-2 py-1 text-[10px] font-bold text-white",
          isLeaveNow && progress < 30 && "animate-pulse"
        )}
      >
        <AlertTriangle className="size-2.5" />
        <span>{isLeaveNow ? "LEAVE NOW!" : "Get ready"}</span>
        <span className="font-medium">
          {routeLabel} in {arrivalMinutes}m
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
  const isDue = minutes === "DUE" || minutes === "1"

  const urgencyBg = isFirst
    ? {
        missed: "bg-gray-400 text-white line-through opacity-60",
        "leave-now": "bg-red-500 text-white",
        prepare: "bg-orange-500 text-white",
        upcoming: "bg-yellow-500 text-black",
        normal: isDue ? "bg-brand text-white" : "bg-muted text-foreground",
      }[urgency]
    : isDue
      ? "bg-brand/80 text-white"
      : "bg-muted/80 text-muted-foreground"

  return (
    <div
      className={cn(
        "flex min-w-[36px] items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums",
        urgencyBg
      )}
    >
      {minutes === "DUE" ? "DUE" : `${minutes}m`}
    </div>
  )
}

interface RouteRowProps {
  type: "train" | "bus"
  route: string
  lineName?: string
  destination: string
  arrivals: string[]
  walkingTime: number
}

function RouteRow({ type, route, lineName, destination, arrivals, walkingTime }: RouteRowProps) {
  const colors =
    type === "train" && lineName
      ? CTA_COLORS[lineName as keyof typeof CTA_COLORS] || CTA_COLORS.bus
      : CTA_COLORS.bus

  // Calculate urgency based on first arrival
  const firstArrival = arrivals[0]
  const firstMinutes = firstArrival === "DUE" ? 0 : parseInt(firstArrival ?? "", 10)
  const urgency = !isNaN(firstMinutes) ? getUrgencyLevel(firstMinutes, walkingTime) : "normal"

  // Check if catchable
  const hasCatchable = arrivals.some((time) => {
    const mins = time === "DUE" ? 0 : parseInt(time, 10)
    return !isNaN(mins) && mins >= walkingTime
  })

  // Row background based on urgency
  const rowBg = {
    missed: "bg-muted/20 opacity-60",
    "leave-now": "bg-red-950/30 border-red-500/50",
    prepare: "bg-orange-950/30 border-orange-500/50",
    upcoming: "bg-yellow-950/20 border-yellow-500/30",
    normal: "bg-muted/20 border-transparent hover:bg-muted/40",
  }[urgency]

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border p-1.5 transition-all duration-300",
        rowBg
      )}
    >
      {/* Route Badge */}
      <div
        className={cn(
          "flex items-center justify-center rounded-md min-w-[32px] h-7 px-1.5",
          colors.bg,
          colors.text
        )}
      >
        {type === "train" ? (
          <Train className="size-3.5" />
        ) : (
          <span className="text-xs font-bold">{route}</span>
        )}
      </div>

      {/* Route Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {type === "train" && lineName && (
            <span className="text-[11px] font-semibold text-foreground">{lineName}</span>
          )}
          {type === "bus" && <span className="text-[11px] font-semibold text-foreground">Bus {route}</span>}
          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
            <PersonStanding className="size-2.5" />
            {walkingTime}m
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[9px] text-muted-foreground">to {destination}</p>
          {arrivals.length > 0 &&
            (hasCatchable ? (
              <span className="text-[8px] font-medium text-green-500">Catchable</span>
            ) : (
              <span className="text-[8px] font-medium text-red-400">Missed</span>
            ))}
        </div>
      </div>

      {/* Arrival Times */}
      <div className="flex items-center gap-1">
        {arrivals.length > 0 ? (
          arrivals.slice(0, 2).map((time, idx) => {
            const mins = time === "DUE" ? 0 : parseInt(time, 10)
            const arrivalUrgency = !isNaN(mins) ? getUrgencyLevel(mins, walkingTime) : "normal"
            return <ArrivalBadge key={idx} minutes={time} urgency={arrivalUrgency} isFirst={idx === 0} />
          })
        ) : (
          <span className="text-[9px] text-muted-foreground italic">--</span>
        )}
      </div>
    </div>
  )
}

export function DeckTransit() {
  const [busData, setBusData] = useState<Record<string, CTABusResponse>>({})
  const [trainData, setTrainData] = useState<Record<string, CTATrainResponse>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransit = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<{ bus: Record<string, CTABusResponse>; train: Record<string, CTATrainResponse> }>("/api/cta/all")
      if (!response.success) {
        if (response.code === "NOT_CONFIGURED") {
          setError("Not configured")
          return
        }
        throw new Error(response.error || "Failed to fetch transit")
      }
      if (response.data) {
        setBusData(response.data.bus || {})
        setTrainData(response.data.train || {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransit()
    const interval = setInterval(fetchTransit, 30000)
    return () => clearInterval(interval)
  }, [])

  const busRoutes = ["76", "36", "22"]
  const trainLines = [
    { code: "Brn", name: "Brown" },
    { code: "P", name: "Purple" },
  ]
  const hasData = Object.keys(busData).length > 0 || Object.keys(trainData).length > 0

  // Process bus routes
  const processedBusRoutes = busRoutes.map((route) => {
    const routeData = busData[route]
    const predictions = routeData?.["bustime-response"]?.prd || []
    const walkingTime = getWalkingTime(route, "bus")
    return {
      route,
      destination: predictions[0]?.stpnm || "Downtown",
      arrivals: predictions.slice(0, 3).map((p) => (p.prdctdn === "DUE" ? "DUE" : p.prdctdn)),
      walkingTime,
    }
  })

  // Process train lines
  const processedTrainLines = trainLines.map(({ code, name }) => {
    const lineData = trainData[code]
    const walkingTime = getWalkingTime(code, "train")
    const predictions =
      lineData?.ctatt?.eta
        ?.filter((eta) => {
          const trDr = typeof eta.trDr === "string" ? parseInt(eta.trDr, 10) : eta.trDr
          return eta.rt === code && trDr === 5
        })
        .slice(0, 3)
        .map((eta) => {
          const minutes = Math.round((new Date(eta.arrT).getTime() - new Date().getTime()) / 60000)
          return minutes <= 0 ? "DUE" : minutes.toString()
        }) || []

    return {
      code,
      name,
      destination: lineData?.ctatt?.eta?.[0]?.destNm || "Loop",
      arrivals: predictions,
      walkingTime,
    }
  })

  // Find most urgent route for the banner
  const allRoutes = [
    ...processedBusRoutes.map((r) => ({
      ...r,
      type: "bus" as const,
      label: `Bus ${r.route}`,
    })),
    ...processedTrainLines.map((r) => ({
      ...r,
      route: r.code,
      type: "train" as const,
      label: r.name,
    })),
  ]

  const mostUrgent = allRoutes
    .map((r) => {
      const firstArrival = r.arrivals[0]
      if (!firstArrival) return null
      const minutes = firstArrival === "DUE" ? 0 : parseInt(firstArrival, 10)
      if (isNaN(minutes)) return null
      const urgency = getUrgencyLevel(minutes, r.walkingTime)
      return { ...r, minutes, urgency }
    })
    .filter((r) => r && (r.urgency === "leave-now" || r.urgency === "prepare"))
    .sort((a, b) => {
      if (!a || !b) return 0
      if (a.urgency === "leave-now" && b.urgency !== "leave-now") return -1
      if (b.urgency === "leave-now" && a.urgency !== "leave-now") return 1
      return a.minutes - b.minutes
    })[0]

  if (error) {
    return (
      <div className="flex h-full flex-col rounded-2xl bg-card p-3 shadow-lg">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="size-5 text-destructive" />
          <div className="text-xs font-medium text-destructive">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2.5 shadow-lg">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Getting Around</span>
          <span className="rounded bg-[#00A1DE] px-1 py-0.5 text-[8px] font-bold text-white">CTA</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchTransit}
          disabled={loading}
          className="h-7 w-7 min-h-[44px] min-w-[44px] p-0 touch-manipulation"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Urgent Alert Banner */}
      {mostUrgent && (mostUrgent.urgency === "leave-now" || mostUrgent.urgency === "prepare") && (
        <UrgencyBanner
          urgency={mostUrgent.urgency}
          arrivalMinutes={mostUrgent.minutes}
          walkingTime={mostUrgent.walkingTime}
          routeLabel={mostUrgent.label}
        />
      )}

      {/* Routes */}
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {loading && !hasData ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Train Lines */}
            {processedTrainLines.map((line) => (
              <RouteRow
                key={line.code}
                type="train"
                route={line.code}
                lineName={line.name}
                destination={line.destination}
                arrivals={line.arrivals}
                walkingTime={line.walkingTime}
              />
            ))}

            {/* Bus Routes - show top 2 */}
            {processedBusRoutes.slice(0, 2).map((route) => (
              <RouteRow
                key={route.route}
                type="bus"
                route={route.route}
                destination={route.destination}
                arrivals={route.arrivals}
                walkingTime={route.walkingTime}
              />
            ))}
          </>
        )}
      </div>

      {/* Live indicator */}
      <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
        </span>
        Live every 30s
      </div>
    </div>
  )
}
