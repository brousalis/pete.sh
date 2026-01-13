"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Thermometer, Droplets, Wind } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WeatherObservation } from "@/lib/types/weather.types"

export function DeckWeather() {
  const [weather, setWeather] = useState<WeatherObservation | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchWeather = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/weather/current")
      if (!response.ok) throw new Error("Failed to fetch weather")
      const data = await response.json()
      if (data.success && data.data) {
        setWeather(data.data)
      }
    } catch (err) {
      console.error("Failed to load weather", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 600000) // Every 10 minutes
    return () => clearInterval(interval)
  }, [])

  if (loading && !weather) {
    return (
      <div className="rounded-2xl bg-card p-3 shadow-lg ring-1 ring-border">
        <div className="flex items-center justify-center gap-2">
          <RefreshCw className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="rounded-2xl bg-card p-3 shadow-lg ring-1 ring-border">
        <div className="text-sm text-muted-foreground">No weather data</div>
      </div>
    )
  }

  const temp = weather.properties.temperature.value
  const tempF = temp ? Math.round((temp * 9) / 5 + 32) : null
  const humidity = weather.properties.relativeHumidity?.value
  const windSpeed = weather.properties.windSpeed?.value
  const windSpeedMph = windSpeed ? Math.round(windSpeed * 2.237) : null

  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg ring-1 ring-border">
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
            Weather
          </div>
          {tempF !== null ? (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground tabular-nums sm:text-3xl">
                {tempF}
              </span>
              <span className="text-base font-semibold text-muted-foreground sm:text-lg">°F</span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-muted-foreground">--</div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchWeather}
          disabled={loading}
          className="h-7 w-7 min-h-[44px] min-w-[44px] p-0 touch-manipulation"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-0.5">
        {humidity !== null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Droplets className="size-3 text-blue-500" />
            <span className="text-muted-foreground">Humidity:</span>
            <span className="font-semibold text-foreground">{Math.round(humidity)}%</span>
          </div>
        )}
        {windSpeedMph !== null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Wind className="size-3 text-slate-500" />
            <span className="text-muted-foreground">Wind:</span>
            <span className="font-semibold text-foreground">{windSpeedMph} mph</span>
          </div>
        )}
      </div>
    </div>
  )
}
