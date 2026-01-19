"use client"

import { useState, useEffect } from "react"
import { RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WeatherForecast } from "@/lib/types/weather.types"
import { format } from "date-fns"

export function WeatherForecast() {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchForecast = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/weather/forecast")
      if (!response.ok) throw new Error("Failed to fetch forecast")
      const data = await response.json()
      if (data.success && data.data) {
        setForecast(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forecast")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForecast()
  }, [])

  if (loading && !forecast) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading forecast...</p>
        </div>
      </div>
    )
  }

  if (error || !forecast) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="text-sm">{error || "No forecast data"}</p>
        </div>
      </div>
    )
  }

  // Get first 5 periods (5-day forecast)
  const periods = forecast.properties.periods.slice(0, 10).filter((p) => p.isDaytime)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">5-Day Forecast</h3>
        <Button variant="ghost" size="sm" onClick={fetchForecast} disabled={loading} className="gap-2">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {periods.map((period) => (
          <div
            key={period.number}
            className="rounded-lg bg-card p-3  text-center"
          >
            <p className="text-xs font-medium text-foreground">
              {format(new Date(period.startTime), "EEE")}
            </p>
            <div className="mt-2">
              {period.icon && (
                <img
                  src={period.icon}
                  alt={period.shortForecast}
                  className="mx-auto size-10"
                />
              )}
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">
              {period.temperature}°{period.temperatureUnit}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{period.shortForecast}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
