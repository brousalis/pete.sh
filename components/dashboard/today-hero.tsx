'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Cloud, CloudRain, CloudSnow, Sun, Thermometer, MapPin } from 'lucide-react'
import { format, parseISO, differenceInHours, isToday, isTomorrow } from 'date-fns'
import { motion } from 'framer-motion'
import type { WeatherObservation } from '@/lib/types/weather.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import { staggerContainerVariants, staggerItemVariants, fadeUpVariants, transitions } from '@/lib/animations'
import { apiGet } from '@/lib/api/client'

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
    apiGet<WeatherObservation>('/api/weather/current')
      .then(response => {
        if (response?.success && response.data) {
          setWeather(response.data)
        }
      })
      .catch(() => {})

    // Fetch next event (within 24 hours)
    apiGet<CalendarEvent[]>('/api/calendar/upcoming?maxResults=10')
      .then(response => {
        if (response?.success && response.data) {
          const now = new Date()
          const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000)

          // Find first event within 24 hours
          const eventIn24Hours = response.data.find((event: CalendarEvent) => {
            const startTime = event.start.dateTime
              ? parseISO(event.start.dateTime)
              : event.start.date
                ? parseISO(event.start.date)
                : null

            if (!startTime) return false
            return startTime >= now && startTime <= twentyFourHoursLater
          })

          if (eventIn24Hours) {
            setNextEvent(eventIn24Hours)
          }
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

  // Calculate "feels like" from heat index or wind chill
  const heatIndexC = weather?.properties.heatIndex?.value
  const windChillC = weather?.properties.windChill?.value
  const feelsLikeC = heatIndexC ?? windChillC ?? null
  const feelsLikeF = feelsLikeC !== null ? Math.round((feelsLikeC * 9) / 5 + 32) : null
  const showFeelsLike = feelsLikeF !== null && tempF !== null && feelsLikeF !== tempF

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
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.smooth}
    >
      {/* Decorative gradient orbs - animated */}
      <motion.div
        className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-brand/20 blur-3xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...transitions.smooth, delay: 0.2 }}
      />
      <motion.div
        className="pointer-events-none absolute -left-10 bottom-0 size-40 rounded-full bg-blue-500/10 blur-2xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...transitions.smooth, delay: 0.3 }}
      />

      <div className="relative z-10">
        <motion.div
          className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
          initial="hidden"
          animate="visible"
          variants={staggerContainerVariants}
        >
          {/* Left: Time & Greeting */}
          <motion.div className="space-y-1" variants={staggerItemVariants}>
            <motion.p
              className="text-sm font-medium text-white/60"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transitions.smooth, delay: 0.1 }}
            >
              {getGreeting()}
            </motion.p>
            <motion.div
              className="flex items-baseline gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transitions.smooth, delay: 0.15 }}
            >
              <span className="text-5xl font-bold tracking-tight text-white md:text-6xl tabular-nums">
                {timeString}
              </span>
              <span className="text-2xl font-medium text-white/50 md:text-3xl">
                {ampm}
              </span>
            </motion.div>
            <motion.p
              className="text-base text-white/70 md:text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...transitions.smooth, delay: 0.2 }}
            >
              {dateString}
            </motion.p>
          </motion.div>

          {/* Right: Weather + Next Event */}
          <motion.div
            className="flex flex-col gap-4 md:items-end"
            variants={staggerItemVariants}
          >
            {/* Weather */}
            {weather && (
              <motion.div
                className="flex items-center gap-4 rounded-xl bg-white/5 px-4 py-3 backdrop-blur-sm"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...transitions.smooth, delay: 0.25 }}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                <motion.span
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...transitions.springBouncy, delay: 0.35 }}
                >
                  {getWeatherIcon()}
                </motion.span>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white md:text-4xl tabular-nums">
                      {tempF ?? '--'}
                    </span>
                    <span className="text-lg text-white/50">°F</span>
                  </div>
                  {showFeelsLike && (
                    <p className="text-xs text-white/50">
                      Feels like {feelsLikeF}°
                    </p>
                  )}
                  <p className="text-xs text-white/60 font-medium">
                    {weather.properties.textDescription || 'Weather'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Next Event */}
            {nextEvent && (() => {
              const startTime = nextEvent.start.dateTime
                ? parseISO(nextEvent.start.dateTime)
                : nextEvent.start.date
                  ? parseISO(nextEvent.start.date)
                  : null

              const isAllDay = !nextEvent.start.dateTime && !!nextEvent.start.date
              const timeDisplay = startTime
                ? isToday(startTime)
                  ? `Today, ${format(startTime, 'h:mm a')}`
                  : isTomorrow(startTime)
                    ? `Tomorrow, ${format(startTime, 'h:mm a')}`
                    : isAllDay
                      ? format(startTime, 'EEE, MMM d')
                      : `${format(startTime, 'EEE, MMM d')}, ${format(startTime, 'h:mm a')}`
                : 'All day'

              return (
                <motion.div
                  className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5 backdrop-blur-sm"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...transitions.smooth, delay: 0.3 }}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                  <motion.div
                    className="flex size-9 items-center justify-center rounded-lg bg-brand/20"
                    whileHover={{ scale: 1.1 }}
                    transition={transitions.spring}
                  >
                    <Calendar className="size-4 text-brand" />
                  </motion.div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {nextEvent.summary}
                    </p>
                    <p className="text-xs text-white/50">
                      {timeDisplay}
                      {nextEvent.location && (
                        <span className="ml-2">
                          <MapPin className="mb-0.5 inline size-3" /> {nextEvent.location.split(',')[0]}
                        </span>
                      )}
                    </p>
                  </div>
                </motion.div>
              )
            })()}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
