"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Thermometer, Droplets, Wind, Gauge, Eye, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WeatherObservation } from "@/lib/types/weather.types"

export function WeatherDisplay() {
  const [weather, setWeather] = useState<WeatherObservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeather = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/weather/current")
      if (!response.ok) throw new Error("Failed to fetch weather")
      const data = await response.json()
      if (data.success && data.data) {
        setWeather(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 600000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !weather) {
    return (
      <section className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </section>
    )
  }

  if (error || !weather) {
    return (
      <section className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="size-5" />
          <div>
            <p className="font-medium">{error || "No weather data"}</p>
            <Button variant="ghost" size="sm" onClick={fetchWeather} className="mt-2 h-8">
              <RefreshCw className="size-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const temp = weather.properties.temperature.value
  const tempF = temp ? Math.round((temp * 9) / 5 + 32) : null
  const feelsLike = weather.properties.heatIndex?.value || weather.properties.windChill?.value
  const feelsLikeF = feelsLike ? Math.round((feelsLike * 9) / 5 + 32) : null
  const humidity = weather.properties.relativeHumidity?.value
  const windSpeed = weather.properties.windSpeed?.value
  const windSpeedMph = windSpeed ? Math.round(windSpeed * 2.237) : null
  const pressure = weather.properties.barometricPressure?.value
  const pressureInHg = pressure ? (pressure / 3386.39).toFixed(2) : null
  const visibility = weather.properties.visibility?.value
  const visibilityMiles = visibility ? (visibility / 1609.34).toFixed(1) : null

  // Get weather condition for styling
  const condition = weather.properties.textDescription?.toLowerCase() || ""
  const isSunny = condition.includes("sun") || condition.includes("clear")
  const isCloudy = condition.includes("cloud")
  const isRainy = condition.includes("rain") || condition.includes("drizzle")
  const isSnowy = condition.includes("snow")

  // Determine background gradient based on weather
  const getGradient = () => {
    if (isSunny) return "from-amber-500/10 via-yellow-500/5 to-orange-500/10"
    if (isRainy) return "from-blue-500/10 via-indigo-500/5 to-slate-500/10"
    if (isSnowy) return "from-slate-400/10 via-blue-400/5 to-cyan-400/10"
    if (isCloudy) return "from-slate-400/10 via-gray-400/5 to-slate-500/10"
    return "from-brand/10 via-brand/5 to-brand/10"
  }

  return (
    <section className={`relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6 md:p-8 bg-gradient-to-br ${getGradient()}`}>
      {/* Decorative elements */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-brand/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 size-40 rounded-full bg-brand/5 blur-2xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="size-2 rounded-full bg-brand" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Weather</span>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mt-1">
              {weather.properties.textDescription || "Weather"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchWeather}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Main temperature display */}
        <div className="flex items-baseline gap-4 mb-6">
          <div className="flex items-baseline gap-2">
            {tempF !== null ? (
              <>
                <span className="text-6xl md:text-7xl font-bold text-foreground tabular-nums">
                  {tempF}
                </span>
                <span className="text-3xl md:text-4xl font-semibold text-muted-foreground">°F</span>
              </>
            ) : (
              <span className="text-6xl md:text-7xl font-bold text-muted-foreground">--</span>
            )}
          </div>
          {feelsLikeF !== null && feelsLikeF !== tempF && (
            <div className="text-sm text-muted-foreground">
              Feels like <span className="font-medium text-foreground">{feelsLikeF}°</span>
            </div>
          )}
        </div>

        {/* Weather metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {humidity !== null && (
            <div className="rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="size-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Humidity</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{Math.round(humidity)}%</p>
            </div>
          )}

          {windSpeedMph !== null && (
            <div className="rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wind className="size-4 text-slate-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Wind</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{windSpeedMph} mph</p>
            </div>
          )}

          {pressureInHg !== null && (
            <div className="rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="size-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Pressure</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{pressureInHg}"</p>
            </div>
          )}

          {visibilityMiles !== null && (
            <div className="rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="size-4 text-cyan-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Visibility</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{visibilityMiles} mi</p>
            </div>
          )}
        </div>

        {/* Weather icon if available */}
        {weather.properties.icon && (
          <div className="mt-6 flex justify-center">
            <img
              src={weather.properties.icon}
              alt={weather.properties.textDescription || "Weather icon"}
              className="size-24 opacity-80"
            />
          </div>
        )}
      </div>
    </section>
  )
}
