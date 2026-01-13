'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Droplets, Wind, Gauge, Eye, Cloud, CloudRain, CloudSnow, Sun, Cloudy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import type { WeatherObservation, WeatherForecast } from '@/lib/types/weather.types'

export function WeatherCard() {
  const [current, setCurrent] = useState<WeatherObservation | null>(null)
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [currentRes, forecastRes] = await Promise.all([
        fetch('/api/weather/current'),
        fetch('/api/weather/forecast'),
      ])

      if (currentRes.ok) {
        const data = await currentRes.json()
        if (data.success) setCurrent(data.data)
      }
      if (forecastRes.ok) {
        const data = await forecastRes.json()
        if (data.success) setForecast(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch weather', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 600000) // 10 min
    return () => clearInterval(interval)
  }, [])

  const getConditionIcon = (description: string, size = 'size-10') => {
    const condition = description.toLowerCase()
    if (condition.includes('sun') || condition.includes('clear')) {
      return <Sun className={`${size} text-amber-400`} />
    }
    if (condition.includes('rain') || condition.includes('drizzle')) {
      return <CloudRain className={`${size} text-blue-400`} />
    }
    if (condition.includes('snow')) {
      return <CloudSnow className={`${size} text-cyan-300`} />
    }
    if (condition.includes('cloud') || condition.includes('overcast')) {
      return <Cloudy className={`${size} text-slate-400`} />
    }
    return <Cloud className={`${size} text-slate-400`} />
  }

  if (loading && !current) {
    return (
      <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading weather...</span>
        </div>
      </div>
    )
  }

  const tempC = current?.properties.temperature.value
  const tempF = tempC ? Math.round((tempC * 9) / 5 + 32) : null
  const humidity = current?.properties.relativeHumidity?.value
  const windSpeed = current?.properties.windSpeed?.value
  const windMph = windSpeed ? Math.round(windSpeed * 2.237) : null
  const visibility = current?.properties.visibility?.value
  const visMiles = visibility ? (visibility / 1609.34).toFixed(1) : null

  // Get 5-day forecast (daytime only)
  const forecastDays = forecast?.properties.periods
    .filter(p => p.isDaytime)
    .slice(0, 5) || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Weather</h3>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Current Conditions */}
      {current && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
            <Droplets className="size-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="font-semibold">{humidity ? `${Math.round(humidity)}%` : '--'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
            <Wind className="size-4 text-slate-500" />
            <div>
              <p className="text-xs text-muted-foreground">Wind</p>
              <p className="font-semibold">{windMph ? `${windMph} mph` : '--'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
            <Eye className="size-4 text-cyan-500" />
            <div>
              <p className="text-xs text-muted-foreground">Visibility</p>
              <p className="font-semibold">{visMiles ? `${visMiles} mi` : '--'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
            <Gauge className="size-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Condition</p>
              <p className="truncate text-sm font-semibold">
                {current.properties.textDescription || '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5-Day Forecast */}
      {forecastDays.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {forecastDays.map((day, idx) => (
            <div
              key={day.number}
              className={`flex flex-col items-center rounded-xl p-3 text-center transition-colors ${
                idx === 0 ? 'bg-brand/10 ring-1 ring-brand/30' : 'bg-muted/30'
              }`}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {idx === 0 ? 'Today' : format(new Date(day.startTime), 'EEE')}
              </p>
              <div className="my-2">
                {getConditionIcon(day.shortForecast, 'size-6')}
              </div>
              <p className="text-lg font-bold">{day.temperature}°</p>
              <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground leading-tight">
                {day.shortForecast}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
