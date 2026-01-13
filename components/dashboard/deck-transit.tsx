"use client"

import { useState, useEffect } from "react"
import { Bus, Train, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CTABusResponse, CTATrainResponse } from "@/lib/types/cta.types"

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
      <div className="rounded-2xl bg-card p-3 shadow-lg ring-1 ring-border">
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

  const getNextArrival = (route: string, type: "bus" | "train") => {
    if (type === "bus") {
      const routeData = busData[route]
      const predictions = routeData?.["bustime-response"]?.prd || []
      if (predictions.length > 0) {
        const minutes = parseInt(predictions[0].prdctdn, 10)
        return isNaN(minutes) ? "DUE" : `${minutes}m`
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
          return minutes <= 0 ? "DUE" : `${minutes}m`
        }
      }
    }
    return null
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg ring-1 ring-border">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="rounded-lg bg-orange-500/20 p-1.5">
            <Bus className="size-4 text-orange-500" />
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

      <div className="flex-1 overflow-hidden">
        {loading && !hasData ? (
          <div className="flex items-center justify-center py-2">
            <RefreshCw className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {busRoutes.slice(0, 2).map((route) => {
              const next = getNextArrival(route, "bus")
              return (
                <div
                  key={route}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Bus className="size-3 text-orange-500" />
                    <span className="text-xs font-semibold text-foreground">Bus {route}</span>
                  </div>
                  {next && (
                    <span className="text-xs font-bold text-foreground">{next}</span>
                  )}
                </div>
              )
            })}
            {trainLines.slice(0, 1).map((line) => {
              const lineName = line === "Brn" ? "Brown" : line === "P" ? "Purple" : line
              const next = getNextArrival(line, "train")
              return (
                <div
                  key={line}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Train className="size-3 text-orange-500" />
                    <span className="text-xs font-semibold text-foreground">{lineName}</span>
                  </div>
                  {next && (
                    <span className="text-xs font-bold text-foreground">{next}</span>
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
