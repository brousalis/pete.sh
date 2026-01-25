"use client"

import { useState, useEffect, useRef } from "react"
import { Bus, Train, Clock, AlertCircle, PersonStanding, AlertTriangle } from "lucide-react"
import type { CTABusPrediction } from "@/lib/types/cta.types"
import { getWalkingTime, getUrgencyLevel, type UrgencyLevel } from "@/lib/types/cta.types"
import { cn } from "@/lib/utils"

// Minimal prediction type that the component actually uses
// Accepts either full CTABusPrediction or just the fields we need
type PredictionDisplay = Pick<CTABusPrediction, "prdctdn" | "stpnm">

interface CTARouteCardProps {
  route: string
  type: "bus" | "train"
  predictions: (CTABusPrediction | PredictionDisplay)[]
  error?: string
}

function getUrgencyStyles(urgency: UrgencyLevel): {
  badge: string
  text: string
  bg: string
  icon: string
} {
  switch (urgency) {
    case "missed":
      return {
        badge: "bg-gray-500 text-white",
        text: "text-muted-foreground line-through",
        bg: "",
        icon: "text-muted-foreground",
      }
    case "leave-now":
      return {
        badge: "bg-red-500 text-white animate-pulse",
        text: "text-red-600 dark:text-red-400 font-bold",
        bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
        icon: "text-red-500",
      }
    case "prepare":
      return {
        badge: "bg-orange-500 text-white",
        text: "text-orange-600 dark:text-orange-400 font-semibold",
        bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
        icon: "text-orange-500",
      }
    case "upcoming":
      return {
        badge: "bg-yellow-500 text-black",
        text: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
        icon: "text-yellow-500",
      }
    default:
      return {
        badge: "",
        text: "text-foreground",
        bg: "",
        icon: "text-muted-foreground",
      }
  }
}

function getUrgencyLabel(urgency: UrgencyLevel): string | null {
  switch (urgency) {
    case "leave-now":
      return "LEAVE NOW!"
    case "prepare":
      return "Get ready"
    case "upcoming":
      return "Coming up"
    default:
      return null
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
    <div className="relative overflow-hidden rounded-md mb-3">
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
        "relative flex items-center justify-center gap-2 px-2 py-1.5 text-xs font-medium text-white",
        isLeaveNow && progress < 30 && "animate-pulse"
      )}>
        <AlertTriangle className="size-3" />
        {isLeaveNow ? 'LEAVE NOW!' : 'Get ready to leave'}
        <span className="font-normal">({arrivalMinutes}m arrival, {walkingTime}m walk)</span>
      </div>
    </div>
  )
}

export function CTARouteCard({ route, type, predictions, error }: CTARouteCardProps) {
  const walkingTime = getWalkingTime(route, type)

  if (error) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-4" />
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  const Icon = type === "bus" ? Bus : Train

  // Calculate urgency for the first prediction (next arrival)
  const firstPrediction = predictions[0]
  const firstArrivalMinutes = firstPrediction
    ? (firstPrediction.prdctdn === "DUE" ? 0 : parseInt(firstPrediction.prdctdn, 10))
    : null
  const urgency = firstArrivalMinutes !== null && !isNaN(firstArrivalMinutes)
    ? getUrgencyLevel(firstArrivalMinutes, walkingTime)
    : "normal"
  const urgencyStyles = getUrgencyStyles(urgency)
  const urgencyLabel = getUrgencyLabel(urgency)

  // Check if there's a catchable arrival (any arrival where you can still make it)
  const hasCatchable = predictions.some((pred) => {
    const minutes = pred.prdctdn === "DUE" ? 0 : parseInt(pred.prdctdn, 10)
    return !isNaN(minutes) && minutes >= walkingTime
  })

  return (
    <div className={cn(
      "rounded-xl bg-background p-4 border transition-all duration-300",
      urgency !== "normal" && urgencyStyles.bg,
      urgency === "normal" && "border-transparent"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-5", urgency !== "normal" ? urgencyStyles.icon : "text-brand")} />
          <span className="font-semibold text-foreground">
            {type === "bus" ? `Bus ${route}` : `${route} Line`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PersonStanding className="size-3" />
          <span>{walkingTime}m walk</span>
        </div>
      </div>

      {/* Urgency alert banner with countdown progress */}
      {(urgency === "leave-now" || urgency === "prepare") && firstArrivalMinutes !== null && (
        <UrgencyBanner
          urgency={urgency}
          arrivalMinutes={firstArrivalMinutes}
          walkingTime={walkingTime}
        />
      )}

      {predictions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No predictions available</p>
      ) : (
        <div className="space-y-2">
          {predictions.slice(0, 3).map((pred, idx) => {
            const minutes = pred.prdctdn === "DUE" ? 0 : parseInt(pred.prdctdn, 10)
            const canMakeIt = !isNaN(minutes) && minutes >= walkingTime
            const predUrgency = !isNaN(minutes) ? getUrgencyLevel(minutes, walkingTime) : "normal"
            const predStyles = getUrgencyStyles(predUrgency)

            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-2 text-sm rounded-md px-2 py-1 -mx-2",
                  idx === 0 && urgency !== "normal" && "bg-background/50"
                )}
              >
                <Clock className={cn("size-4", idx === 0 ? predStyles.icon : "text-muted-foreground")} />
                <span className={cn(idx === 0 ? predStyles.text : "text-foreground")}>
                  {pred.prdctdn === "DUE" ? "Due" : `${pred.prdctdn} min`}
                </span>
                <span className="text-muted-foreground text-xs">to {pred.stpnm}</span>
                {canMakeIt && idx === 0 && (
                  <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">
                    Catchable
                  </span>
                )}
                {!canMakeIt && idx === 0 && minutes > 0 && (
                  <span className="ml-auto text-xs text-red-500 font-medium">
                    Too late
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Show next catchable if first one is missed */}
      {!hasCatchable && predictions.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground italic">
          No catchable arrivals - next one too soon
        </p>
      )}
    </div>
  )
}
