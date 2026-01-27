"use client"

import { useState, useEffect } from "react"
import { RefreshCw, AlertCircle, Thermometer, Droplets, Wind } from "lucide-react"
import type { WeatherObservation } from "@/lib/types/weather.types"
import { Button } from "@/components/ui/button"
import { apiGet } from "@/lib/api/client"

export function WeatherWidget() {
  const [current, setCurrent] = useState<WeatherObservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCurrent = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<WeatherObservation>("/api/weather/current")
      if (!response.success) throw new Error(response.error || "Failed to fetch weather")
      if (response.data) {
        setCurrent(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrent()
    // Refresh every 10 minutes
    const interval = setInterval(fetchCurrent, 600000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !current) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading weather...</p>
        </div>
      </div>
    )
  }

  if (error || !current) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="text-sm">{error || "No weather data"}</p>
        </div>
      </div>
    )
  }

  const temp = current.properties.temperature.value
  const tempC = temp ? Math.round((temp * 9) / 5 + 32) : null
  const humidity = current.properties.relativeHumidity?.value
  const windSpeed = current.properties.windSpeed?.value

  return (
    <div className="rounded-xl bg-background p-4 ">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Current Weather</h3>
        <Button variant="ghost" size="sm" onClick={fetchCurrent} disabled={loading} className="gap-2">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="space-y-3">
        {tempC !== null && (
          <div className="flex items-center gap-2">
            <Thermometer className="size-5 text-brand" />
            <span className="text-2xl font-bold text-foreground">{tempC}°F</span>
            <span className="text-sm text-muted-foreground">
              {current.properties.textDescription}
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {humidity !== null && (
            <div className="flex items-center gap-2">
              <Droplets className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Humidity: {Math.round(humidity)}%</span>
            </div>
          )}
          {windSpeed !== null && (
            <div className="flex items-center gap-2">
              <Wind className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Wind: {Math.round(windSpeed * 2.237)} mph
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
