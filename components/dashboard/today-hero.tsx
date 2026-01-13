'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Cloud, CloudRain, CloudSnow, Sun, Thermometer, MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { WeatherObservation } from '@/lib/types/weather.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'

export function TodayHero() {
  const [time, setTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [weather, setWeather] = useState<WeatherObservation | null>(null)
  const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Fetch weather
    fetch('/api/weather/current')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success && data.data) {
          setWeather(data.data)
        }
      })
      .catch(() => {})

    // Fetch next event
    fetch('/api/calendar/upcoming?hours=24')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success && data.data?.[0]) {
          setNextEvent(data.data[0])
        }
      })
      .catch(() => {})
  }, [])

  const getGreeting = () => {
    const hour = time.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getWeatherIcon = () => {
    if (!weather) return <Cloud className="size-8 text-slate-400" />
    const condition = weather.properties.textDescription?.toLowerCase() || ''
    if (condition.includes('sun') || condition.includes('clear')) {
      return <Sun className="size-8 text-amber-400" />
    }
    if (condition.includes('rain') || condition.includes('drizzle')) {
      return <CloudRain className="size-8 text-blue-400" />
    }
    if (condition.includes('snow')) {
      return <CloudSnow className="size-8 text-cyan-300" />
    }
    return <Cloud className="size-8 text-slate-400" />
  }

  const tempC = weather?.properties.temperature.value
  const tempF = tempC ? Math.round((tempC * 9) / 5 + 32) : null

  if (!mounted) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
        <div className="h-24 animate-pulse rounded-lg bg-white/5" />
      </div>
    )
  }

  const timeString = format(time, 'h:mm')
  const ampm = format(time, 'a')
  const dateString = format(time, 'EEEE, MMMM d')

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 size-40 rounded-full bg-blue-500/10 blur-2xl" />

      <div className="relative z-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left: Time & Greeting */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-white/60">{getGreeting()}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight text-white md:text-6xl tabular-nums">
                {timeString}
              </span>
              <span className="text-2xl font-medium text-white/50 md:text-3xl">
                {ampm}
              </span>
            </div>
            <p className="text-base text-white/70 md:text-lg">{dateString}</p>
          </div>

          {/* Right: Weather + Next Event */}
          <div className="flex flex-col gap-4 md:items-end">
            {/* Weather */}
            {weather && (
              <div className="flex items-center gap-3">
                {getWeatherIcon()}
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white md:text-4xl tabular-nums">
                      {tempF ?? '--'}
                    </span>
                    <span className="text-lg text-white/50">°F</span>
                  </div>
                  <p className="text-sm text-white/60">
                    {weather.properties.textDescription || 'Weather'}
                  </p>
                </div>
              </div>
            )}

            {/* Next Event */}
            {nextEvent && (
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5 backdrop-blur-sm">
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand/20">
                  <Calendar className="size-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {nextEvent.summary}
                  </p>
                  <p className="text-xs text-white/50">
                    {nextEvent.start.dateTime
                      ? format(parseISO(nextEvent.start.dateTime), 'h:mm a')
                      : 'All day'}
                    {nextEvent.location && (
                      <span className="ml-2">
                        <MapPin className="mb-0.5 inline size-3" /> {nextEvent.location.split(',')[0]}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
