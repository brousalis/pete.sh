"use client"

import { useState, useEffect } from "react"
import { Bus, Train, RefreshCw, AlertCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CTABusResponse, CTATrainResponse } from "@/lib/types/cta.types"
import { getWalkingTime, getUrgencyLevel, type UrgencyLevel } from "@/lib/types/cta.types"
import { cn } from "@/lib/utils"

function getCompactUrgencyStyles(urgency: UrgencyLevel): {
  border: string
  bg: string
  text: string
  badge: string
} {
  switch (urgency) {
    case "missed":
      return {
        border: "border-border opacity-50",
        bg: "bg-background/30",
        text: "text-muted-foreground line-through",
        badge: "bg-gray-400 text-white",
      }
    case "leave-now":
      return {
        border: "border-red-500",
        bg: "bg-red-50 dark:bg-red-950/40",
        text: "text-red-600 dark:text-red-400",
        badge: "bg-red-500 text-white animate-pulse",
      }
    case "prepare":
      return {
        border: "border-orange-500",
        bg: "bg-orange-50 dark:bg-orange-950/40",
        text: "text-orange-600 dark:text-orange-400",
        badge: "bg-orange-500 text-white",
      }
    case "upcoming":
      return {
        border: "border-yellow-500",
        bg: "bg-yellow-50 dark:bg-yellow-950/40",
        text: "text-yellow-600 dark:text-yellow-400",
        badge: "bg-yellow-500 text-black",
      }
    default:
      return {
        border: "border-border",
        bg: "bg-background/50",
        text: "text-foreground",
        badge: "",
      }
  }
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
      const response = await fetch("/api/cta/all")
      if (!response.ok) {
        if (response.status === 400) {
          setError("Not configured")
          return
        }
        throw new Error("Failed to fetch transit")
      }
      const data = await response.json()
      if (data.success && data.data) {
        setBusData(data.data.bus || {})
        setTrainData(data.data.train || {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransit()
    const interval = setInterval(fetchTransit, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-3 shadow-lg ">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="size-5 text-destructive" />
          <div className="text-xs font-medium text-destructive">{error}</div>
        </div>
      </div>
    )
  }

  const busRoutes = ["76", "36", "22"]
  const trainLines = ["Brn", "P"]
  const hasData = Object.keys(busData).length > 0 || Object.keys(trainData).length > 0

  const getNextArrivalInfo = (route: string, type: "bus" | "train"): {
    minutes: number | null
    display: string | null
    urgency: UrgencyLevel
    walkingTime: number
  } => {
    const walkingTime = getWalkingTime(route, type)
    
    if (type === "bus") {
      const routeData = busData[route]
      const predictions = routeData?.["bustime-response"]?.prd || []
      if (predictions.length > 0 && predictions[0]) {
        const minutes = parseInt(predictions[0].prdctdn, 10)
        const validMinutes = isNaN(minutes) ? 0 : minutes
        return {
          minutes: validMinutes,
          display: isNaN(minutes) ? "DUE" : `${minutes}m`,
          urgency: getUrgencyLevel(validMinutes, walkingTime),
          walkingTime,
        }
      }
    } else {
      const lineData = trainData[route]
      if (lineData?.ctatt?.eta) {
        const next = lineData.ctatt.eta
          .filter((eta) => {
            const trDr = typeof eta.trDr === "string" ? parseInt(eta.trDr, 10) : eta.trDr
            return eta.rt === route && trDr === 5
          })
          .slice(0, 1)[0]
        if (next) {
          const minutes = Math.round(
            (new Date(next.arrT).getTime() - new Date().getTime()) / 60000
          )
          const validMinutes = minutes <= 0 ? 0 : minutes
          return {
            minutes: validMinutes,
            display: minutes <= 0 ? "DUE" : `${minutes}m`,
            urgency: getUrgencyLevel(validMinutes, walkingTime),
            walkingTime,
          }
        }
      }
    }
    return { minutes: null, display: null, urgency: "normal", walkingTime }
  }

  // Find the most urgent upcoming transit
  const allArrivals = [
    ...busRoutes.map(route => ({ route, type: "bus" as const, ...getNextArrivalInfo(route, "bus") })),
    ...trainLines.map(line => ({ route: line, type: "train" as const, ...getNextArrivalInfo(line, "train") })),
  ].filter(a => a.minutes !== null)
  
  const mostUrgent = allArrivals.find(a => a.urgency === "leave-now" || a.urgency === "prepare")

  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg ">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "rounded-lg p-1.5",
            mostUrgent?.urgency === "leave-now" ? "bg-red-500/20 animate-pulse" :
            mostUrgent?.urgency === "prepare" ? "bg-orange-500/20" :
            "bg-orange-500/20"
          )}>
            <Bus className={cn(
              "size-4",
              mostUrgent?.urgency === "leave-now" ? "text-red-500" :
              mostUrgent?.urgency === "prepare" ? "text-orange-500" :
              "text-orange-500"
            )} />
          </div>
          <div className="text-sm font-semibold text-foreground">Transit</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchTransit}
          disabled={loading}
          className="h-7 w-7 min-h-[44px] min-w-[44px] p-0 touch-manipulation"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Urgent alert banner */}
      {mostUrgent && (mostUrgent.urgency === "leave-now" || mostUrgent.urgency === "prepare") && (
        <div className={cn(
          "flex items-center justify-center gap-1 rounded-md px-1.5 py-1 mb-1.5 text-[10px] font-medium",
          mostUrgent.urgency === "leave-now" ? "bg-red-500 text-white animate-pulse" : "bg-orange-500 text-white"
        )}>
          <AlertTriangle className="size-2.5" />
          {mostUrgent.urgency === "leave-now" ? "LEAVE NOW" : "Get ready"} - {mostUrgent.type === "bus" ? `Bus ${mostUrgent.route}` : mostUrgent.route === "Brn" ? "Brown" : "Purple"} in {mostUrgent.display}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {loading && !hasData ? (
          <div className="flex items-center justify-center py-2">
            <RefreshCw className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {busRoutes.slice(0, 2).map((route) => {
              const info = getNextArrivalInfo(route, "bus")
              const styles = getCompactUrgencyStyles(info.urgency)
              
              return (
                <div
                  key={route}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-1.5 transition-all duration-300",
                    styles.border,
                    styles.bg
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Bus className={cn("size-3", info.urgency !== "normal" && info.urgency !== "missed" ? styles.text : info.urgency === "missed" ? "text-muted-foreground" : "text-orange-500")} />
                    <span className={cn("text-xs font-semibold", styles.text)}>Bus {route}</span>
                    <span className="text-[10px] text-muted-foreground">({info.walkingTime}m)</span>
                  </div>
                  {info.display && (
                    <div className="flex items-center gap-1">
                      {info.urgency === "missed" && (
                        <span className="text-[9px] font-medium text-muted-foreground uppercase">missed</span>
                      )}
                      {info.urgency === "leave-now" && (
                        <span className="text-[9px] font-bold text-red-500 uppercase">GO!</span>
                      )}
                      <span className={cn("text-xs font-bold", styles.text)}>{info.display}</span>
                    </div>
                  )}
                </div>
              )
            })}
            {trainLines.slice(0, 1).map((line) => {
              const lineName = line === "Brn" ? "Brown" : line === "P" ? "Purple" : line
              const info = getNextArrivalInfo(line, "train")
              const styles = getCompactUrgencyStyles(info.urgency)
              
              return (
                <div
                  key={line}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-1.5 transition-all duration-300",
                    styles.border,
                    styles.bg
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Train className={cn("size-3", info.urgency !== "normal" && info.urgency !== "missed" ? styles.text : info.urgency === "missed" ? "text-muted-foreground" : "text-orange-500")} />
                    <span className={cn("text-xs font-semibold", styles.text)}>{lineName}</span>
                    <span className="text-[10px] text-muted-foreground">({info.walkingTime}m)</span>
                  </div>
                  {info.display && (
                    <div className="flex items-center gap-1">
                      {info.urgency === "missed" && (
                        <span className="text-[9px] font-medium text-muted-foreground uppercase">missed</span>
                      )}
                      {info.urgency === "leave-now" && (
                        <span className="text-[9px] font-bold text-red-500 uppercase">GO!</span>
                      )}
                      <span className={cn("text-xs font-bold", styles.text)}>{info.display}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
