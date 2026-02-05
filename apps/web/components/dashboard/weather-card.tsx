'use client'

import { DashboardCardHeader } from '@/components/dashboard/dashboard-card-header'
import { apiGet } from '@/lib/api/client'
import type {
  WeatherForecast,
  WeatherObservation,
} from '@/lib/types/weather.types'
import { format } from 'date-fns'
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Cloudy,
  Droplets,
  Eye,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export function WeatherCard() {
  const [current, setCurrent] = useState<WeatherObservation | null>(null)
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [currentRes, forecastRes] = await Promise.all([
        apiGet<WeatherObservation>('/api/weather/current'),
        apiGet<WeatherForecast>('/api/weather/forecast'),
      ])

      if (currentRes.success && currentRes.data) {
        setCurrent(currentRes.data)
      }
      if (forecastRes.success && forecastRes.data) {
        setForecast(forecastRes.data)
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
      <div className="bg-card ring-border rounded-2xl p-5 ring-1">
        <div className="flex items-center gap-2">
          <RefreshCw className="text-muted-foreground size-5 animate-spin" />
          <span className="text-muted-foreground text-sm">
            Loading weather...
          </span>
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
  const forecastDays =
    forecast?.properties.periods.filter(p => p.isDaytime).slice(0, 5) || []

  const isClear = current?.properties.textDescription
    ?.toLowerCase()
    .includes('clear')

  return (
    <div className="space-y-4">
      <DashboardCardHeader
        icon={
          isClear ? (
            <Sun className="size-5 text-sky-500 dark:text-sky-400" />
          ) : (
            <Cloudy className="size-5 text-sky-500 dark:text-sky-400" />
          )
        }
        iconContainerClassName="bg-sky-500/10"
        title="Weather"
        onRefresh={fetchData}
        refreshing={loading}
      />

      {/* Current Conditions */}
      {current && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-muted/50 flex items-center gap-1.5 rounded-xl p-2 sm:gap-2 sm:p-3">
            <Droplets className="size-4 shrink-0 text-blue-500" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] sm:text-xs">Humidity</p>
              <p className="text-sm font-semibold sm:text-base">
                {humidity ? `${Math.round(humidity)}%` : '--'}
              </p>
            </div>
          </div>
          <div className="bg-muted/50 flex items-center gap-1.5 rounded-xl p-2 sm:gap-2 sm:p-3">
            <Wind className="size-4 shrink-0 text-slate-500" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] sm:text-xs">Wind</p>
              <p className="text-sm font-semibold sm:text-base">
                {windMph ? `${windMph} mph` : '--'}
              </p>
            </div>
          </div>
          <div className="bg-muted/50 flex items-center gap-1.5 rounded-xl p-2 sm:gap-2 sm:p-3">
            <Eye className="size-4 shrink-0 text-cyan-500" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] sm:text-xs">Visibility</p>
              <p className="text-sm font-semibold sm:text-base">
                {visMiles ? `${visMiles} mi` : '--'}
              </p>
            </div>
          </div>
          {/* <div className="bg-muted/50 flex items-center gap-2 rounded-xl p-3">
            <Gauge className="size-4 text-purple-500" />
            <div>
              <p className="text-muted-foreground text-xs">Condition</p>
              <p className="truncate text-sm font-semibold">
                {current.properties.textDescription || '--'}
              </p>
            </div>
          </div> */}
        </div>
      )}

      {/* 5-Day Forecast */}
      {forecastDays.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {forecastDays.map((day, idx) => (
            <div
              key={day.number}
              className={`flex flex-col items-center rounded-xl p-3 text-center transition-colors ${
                idx === 0
                  ? 'bg-brand/10 border-brand/20 border-2'
                  : 'bg-muted/30'
              }`}
            >
              <p className="text-muted-foreground text-xs font-medium">
                {idx === 0 ? 'Today' : format(new Date(day.startTime), 'EEE')}
              </p>
              <div className="my-2">
                {getConditionIcon(day.shortForecast, 'size-6')}
              </div>
              <p className="text-lg font-bold">{day.temperature}°</p>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-[10px] leading-tight">
                {day.shortForecast}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
