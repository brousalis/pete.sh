'use client'

import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import {
  differenceInMinutes,
  format,
  isToday,
  isTomorrow,
  parseISO,
} from 'date-fns'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  RefreshCw,
  Database,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api/client'

interface CalendarResponse {
  events: CalendarEvent[]
  source: 'live' | 'cache' | 'none'
  authenticated: boolean
  authAvailable: boolean
  authUrl?: string
  message?: string
}

export function CalendarCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'live' | 'cache' | 'none'>('none')
  const [authAvailable, setAuthAvailable] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<CalendarResponse>('/api/calendar/upcoming?maxResults=10')

      if (!response.success) {
        console.error('[CalendarCard] Error response:', response)
        throw new Error(response.error || 'Failed to fetch events')
      }

      if (response.data) {
        // Handle new response format with metadata
        setEvents(response.data.events || [])
        setSource(response.data.source || 'none')
        setAuthAvailable(response.data.authAvailable || false)
        setAuthUrl(response.data.authUrl || null)
      } else {
        setEvents([])
        setSource('none')
      }
    } catch (err) {
      console.error('[CalendarCard] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 300000) // 5 min
    return () => clearInterval(interval)
  }, [])

  const isAllDayEvent = (event: CalendarEvent) => {
    // All-day events have a date but no dateTime
    return !event.start.dateTime && !!event.start.date
  }

  const getEventStartTime = (event: CalendarEvent): Date | null => {
    // For all-day events, parse the date string (YYYY-MM-DD)
    if (event.start.date) {
      // Parse as UTC to avoid timezone issues with all-day events
      const dateStr = event.start.date
      const parts = dateStr.split('-').map(Number)
      const year = parts[0]
      const month = parts[1]
      const day = parts[2]
      if (
        year === undefined ||
        month === undefined ||
        day === undefined ||
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day)
      ) {
        return null
      }
      return new Date(Date.UTC(year, month - 1, day))
    }
    // For timed events, parse the ISO dateTime string
    if (event.start.dateTime) {
      return parseISO(event.start.dateTime)
    }
    return null
  }

  const formatEventTime = (event: CalendarEvent) => {
    const isAllDay = isAllDayEvent(event)
    const startTime = getEventStartTime(event)

    if (!startTime) return { display: 'All day', full: 'All day event' }

    const now = new Date()
    const currentYear = now.getFullYear()
    const eventYear = startTime.getFullYear()
    const showYear = eventYear !== currentYear

    // For all-day events, ALWAYS show month and day clearly
    if (isAllDay) {
      if (isToday(startTime)) {
        return {
          display: `Today, ${format(startTime, 'MMMM d')}${showYear ? `, ${eventYear}` : ''}`,
          full: format(startTime, 'EEEE, MMMM d, yyyy'),
        }
      } else if (isTomorrow(startTime)) {
        return {
          display: `Tomorrow, ${format(startTime, 'MMMM d')}${showYear ? `, ${eventYear}` : ''}`,
          full: format(startTime, 'EEEE, MMMM d, yyyy'),
        }
      } else {
        // ALWAYS show month and day number clearly: "Mon, Jan 13" or "Mon, Jan 13, 2025"
        return {
          display: showYear
            ? format(startTime, 'EEE, MMM d, yyyy')
            : format(startTime, 'EEE, MMM d'),
          full: format(startTime, 'EEEE, MMMM d, yyyy'),
        }
      }
    }

    // For timed events
    const minutesUntil = differenceInMinutes(startTime, now)

    if (minutesUntil > 0 && minutesUntil <= 60) {
      return {
        display: `in ${minutesUntil} min`,
        full: format(startTime, "EEEE, MMMM d, yyyy 'at' h:mm a"),
      }
    }

    // For timed events, show day, month, day number, and time
    if (isToday(startTime)) {
      return {
        display: `Today, ${format(startTime, 'h:mm a')}`,
        full: format(startTime, "EEEE, MMMM d, yyyy 'at' h:mm a"),
      }
    } else if (isTomorrow(startTime)) {
      return {
        display: `Tomorrow, ${format(startTime, 'h:mm a')}`,
        full: format(startTime, "EEEE, MMMM d, yyyy 'at' h:mm a"),
      }
    } else {
      // Show: "Mon, Jan 13, 7:30 PM" or "Mon, Jan 13, 2025, 7:30 PM" if different year
      return {
        display: showYear
          ? `${format(startTime, 'EEE, MMM d, yyyy')}, ${format(startTime, 'h:mm a')}`
          : `${format(startTime, 'EEE, MMM d')}, ${format(startTime, 'h:mm a')}`,
        full: format(startTime, "EEEE, MMMM d, yyyy 'at' h:mm a"),
      }
    }
  }

  const isEventSoon = (event: CalendarEvent) => {
    // Only timed events can be "soon"
    if (isAllDayEvent(event)) return false
    const startTime = getEventStartTime(event)
    if (!startTime) return false
    const minutesUntil = differenceInMinutes(startTime, new Date())
    return minutesUntil > 0 && minutesUntil <= 30
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="text-brand size-5" />
            <h3 className="text-foreground text-sm font-semibold">Calendar</h3>
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg border p-4">
          <div className="text-muted-foreground flex items-center gap-2">
            <AlertCircle className="size-4" />
            <p className="text-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvents}
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-brand size-5" />
          <h3 className="text-foreground text-sm font-semibold">Calendar</h3>
          {/* Source indicator */}
          {source === 'cache' && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground" title="Showing cached data">
              <Database className="size-2.5" />
              cached
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Auth button when available but not authenticated */}
          {authAvailable && source === 'cache' && authUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = authUrl)}
              className="gap-1.5 text-xs"
            >
              Connect
            </Button>
          )}
          <Link href="/calendar">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              View All
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchEvents}
            disabled={loading}
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading && events.length === 0 ? (
        <div className="bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-lg p-4 text-sm">
          <RefreshCw className="size-4 animate-spin" />
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="bg-muted/20 flex flex-col items-center justify-center rounded-xl p-8 text-center">
          <div className="bg-muted/50 flex size-12 items-center justify-center rounded-full">
            <Calendar className="text-muted-foreground size-6" />
          </div>
          <p className="text-muted-foreground mt-3 text-sm font-medium">
            No upcoming events
          </p>
          <p className="text-muted-foreground/70 mt-1 text-xs">
            Your schedule is clear
          </p>
        </div>
      ) : (
        <TooltipProvider delayDuration={300}>
          <div className="space-y-2">
            {events.slice(0, 4).map(event => {
              const isSoon = isEventSoon(event)
              const isAllDay = isAllDayEvent(event)
              const timeInfo = formatEventTime(event)

              return (
                <div
                  key={event.id}
                  className={`group hover:border-border/80 flex items-start gap-3 rounded-lg border p-3.5 transition-all hover:shadow-sm ${
                    isSoon
                      ? 'border-brand/50 bg-brand/5 ring-brand/20 ring-1'
                      : isAllDay
                        ? 'border-border/60 bg-card/40'
                        : 'border-border bg-card/50'
                  }`}
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                      isSoon
                        ? 'bg-brand/20'
                        : isAllDay
                          ? 'bg-muted/60'
                          : 'bg-muted'
                    }`}
                  >
                    {isAllDay ? (
                      <CalendarDays
                        className={`size-4.5 ${
                          isSoon ? 'text-brand' : 'text-muted-foreground'
                        }`}
                      />
                    ) : (
                      <Calendar
                        className={`size-4.5 ${
                          isSoon ? 'text-brand' : 'text-muted-foreground'
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <TooltipPrimitive.Root>
                        <TooltipPrimitive.Trigger asChild>
                          <h4 className="text-foreground cursor-help truncate text-sm leading-tight font-semibold">
                            {event.summary}
                          </h4>
                        </TooltipPrimitive.Trigger>
                        <TooltipPrimitive.Portal>
                          <TooltipPrimitive.Content
                            side="top"
                            className="bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 z-50 max-w-xs rounded-md px-3 py-1.5 text-xs shadow-md"
                          >
                            <p className="font-medium">{event.summary}</p>
                            {event.description && (
                              <p className="mt-1 text-xs opacity-80">
                                {event.description}
                              </p>
                            )}
                          </TooltipPrimitive.Content>
                        </TooltipPrimitive.Portal>
                      </TooltipPrimitive.Root>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isSoon && (
                          <span className="bg-brand rounded-full px-2 py-0.5 text-[10px] font-medium text-white">
                            Soon
                          </span>
                        )}
                        {isAllDay && !isSoon && (
                          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                            All day
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <TooltipPrimitive.Root>
                        <TooltipPrimitive.Trigger asChild>
                          <span className="text-muted-foreground flex cursor-help items-center gap-1.5 font-medium">
                            {isAllDay ? (
                              <CalendarDays className="size-3.5 shrink-0" />
                            ) : (
                              <Clock className="size-3.5 shrink-0" />
                            )}
                            <span>{timeInfo.display}</span>
                          </span>
                        </TooltipPrimitive.Trigger>
                        <TooltipPrimitive.Portal>
                          <TooltipPrimitive.Content className="bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 z-50 rounded-md px-3 py-1.5 text-xs shadow-md">
                            <p>{timeInfo.full}</p>
                          </TooltipPrimitive.Content>
                        </TooltipPrimitive.Portal>
                      </TooltipPrimitive.Root>
                      {event.location && (
                        <TooltipPrimitive.Root>
                          <TooltipPrimitive.Trigger asChild>
                            <span className="text-muted-foreground flex max-w-[200px] cursor-help items-center gap-1.5 truncate">
                              <MapPin className="size-3.5 shrink-0" />
                              <span className="truncate">
                                {event.location.split(',')[0]}
                              </span>
                            </span>
                          </TooltipPrimitive.Trigger>
                          <TooltipPrimitive.Portal>
                            <TooltipPrimitive.Content className="bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 z-50 max-w-xs rounded-md px-3 py-1.5 text-xs shadow-md">
                              <p>{event.location}</p>
                            </TooltipPrimitive.Content>
                          </TooltipPrimitive.Portal>
                        </TooltipPrimitive.Root>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  )
}
