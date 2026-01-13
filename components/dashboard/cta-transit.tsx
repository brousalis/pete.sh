"use client"

import { useState, useEffect } from "react"
import { CTARouteCard } from "./cta-route-card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import type { CTABusResponse, CTATrainResponse } from "@/lib/types/cta.types"
import { toast } from "sonner"

export function CTATransit() {
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
          setError("CTA API not configured")
          return
        }
        throw new Error("Failed to fetch transit data")
      }
      const data = await response.json()
      if (data.success && data.data) {
        setBusData(data.data.bus || {})
        setTrainData(data.data.train || {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transit data")
      toast.error("Failed to load transit data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransit()
    // Refresh every 30 seconds
    const interval = setInterval(fetchTransit, 30000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Please configure CTA API key in .env.local
        </p>
      </div>
    )
  }

  const busRoutes = ["76", "36", "22"]
  const trainLines = ["Brn", "P"] // Brown and Purple lines
  const hasData = Object.keys(busData).length > 0 || Object.keys(trainData).length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">CTA Transit</h2>
        <Button variant="ghost" size="sm" onClick={fetchTransit} disabled={loading} className="gap-2">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {loading && !hasData ? (
        <div className="rounded-xl bg-background p-4 ring-1 ring-border">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading transit data...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {busRoutes.map((route) => {
            const routeData = busData[route]
            const predictions = routeData?.["bustime-response"]?.prd || []
            const routeError = routeData?.["bustime-response"]?.error?.[0]?.msg

            return (
              <CTARouteCard
                key={route}
                route={route}
                type="bus"
                predictions={predictions}
                error={routeError}
              />
            )
          })}
          {trainLines.map((line) => {
            const lineData = trainData[line]
            if (!lineData) return null

            const lineName = line === "Brn" ? "Brown" : line === "P" ? "Purple" : line
            const lineCode = line === "Brn" ? "Brn" : "P"
            
            // Filter for southbound trains (trDr: 5 = Southbound to Loop) going to the loop
            // Only show trains matching the requested line
            const predictions =
              lineData.ctatt?.eta
                ?.filter((eta) => {
                  // Filter by route code and direction (5 = Southbound to Loop)
                  // trDr: 1 = Northbound, trDr: 5 = Southbound to Loop
                  // Handle both string and number types from API
                  const trDr = typeof eta.trDr === "string" ? parseInt(eta.trDr, 10) : eta.trDr
                  return eta.rt === lineCode && trDr === 5
                })
                .slice(0, 3) // Limit to 3 predictions
                .map((eta) => {
                  const minutes = Math.round(
                    (new Date(eta.arrT).getTime() - new Date().getTime()) / 60000
                  )
                  return {
                    prdctdn: minutes <= 0 ? "DUE" : minutes.toString(),
                    stpnm: eta.destNm || "Loop",
                  }
                }) || []

            const hasError = lineData.ctatt?.errCd !== "0" && lineData.ctatt?.errCd !== undefined

            return (
              <CTARouteCard
                key={line}
                route={lineName}
                type="train"
                predictions={predictions}
                error={hasError ? lineData.ctatt?.errNm || "Failed to load train data" : undefined}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
