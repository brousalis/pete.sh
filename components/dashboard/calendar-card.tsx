'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { format, parseISO, isToday, isTomorrow, differenceInMinutes, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import type { CalendarEvent } from '@/lib/types/calendar.types'

export function CalendarCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('[CalendarCard] Fetching events from /api/calendar/upcoming?maxResults=10')
      const response = await fetch('/api/calendar/upcoming?maxResults=10')
      console.log('[CalendarCard] Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[CalendarCard] Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        if (response.status === 401) {
          setError('not_authenticated')
          return
        }
        throw new Error(errorData.error || 'Failed to fetch events')
      }
      
      const data = await response.json()
      console.log('[CalendarCard] Response data:', {
        success: data.success,
        hasData: !!data.data,
        dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
        dataLength: Array.isArray(data.data) ? data.data.length : 'N/A',
        fullData: data,
      })
      
      if (data.success && data.data) {
        console.log('[CalendarCard] Setting events:', data.data)
        setEvents(data.data)
      } else {
        console.warn('[CalendarCard] Unexpected response structure:', data)
        setEvents([])
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
      const [year, month, day] = dateStr.split('-').map(Number)
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
        full: format(startTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a'),
      }
    }

    // For timed events, show day, month, day number, and time
    if (isToday(startTime)) {
      return {
        display: `Today, ${format(startTime, 'h:mm a')}`,
        full: format(startTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a'),
      }
    } else if (isTomorrow(startTime)) {
      return {
        display: `Tomorrow, ${format(startTime, 'h:mm a')}`,
        full: format(startTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a'),
      }
    } else {
      // Show: "Mon, Jan 13, 7:30 PM" or "Mon, Jan 13, 2025, 7:30 PM" if different year
      return {
        display: showYear
          ? `${format(startTime, 'EEE, MMM d, yyyy')}, ${format(startTime, 'h:mm a')}`
          : `${format(startTime, 'EEE, MMM d')}, ${format(startTime, 'h:mm a')}`,
        full: format(startTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a'),
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

  if (error === 'not_authenticated') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-brand" />
            <h3 className="text-sm font-semibold text-foreground">Calendar</h3>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="size-4" />
            <p className="text-sm">Google Calendar not connected</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = '/api/calendar/auth')}
            className="mt-3"
          >
            Connect Google Calendar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-5 text-brand" />
          <h3 className="text-sm font-semibold text-foreground">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-muted/20 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/50">
            <Calendar className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium text-muted-foreground">No upcoming events</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Your schedule is clear</p>
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
                  className={`group flex items-start gap-3 rounded-lg border p-3.5 transition-all hover:border-border/80 hover:shadow-sm ${
                    isSoon
                      ? 'border-brand/50 bg-brand/5 ring-1 ring-brand/20'
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
                          <h4 className="truncate text-sm font-semibold text-foreground cursor-help leading-tight">
                            {event.summary}
                          </h4>
                        </TooltipPrimitive.Trigger>
                        <TooltipPrimitive.Portal>
                          <TooltipPrimitive.Content
                            side="top"
                            className="z-50 max-w-xs rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95"
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSoon && (
                          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-white">
                            Soon
                          </span>
                        )}
                        {isAllDay && !isSoon && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            All day
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <TooltipPrimitive.Root>
                        <TooltipPrimitive.Trigger asChild>
                          <span className="flex items-center gap-1.5 text-muted-foreground cursor-help font-medium">
                            {isAllDay ? (
                              <CalendarDays className="size-3.5 shrink-0" />
                            ) : (
                              <Clock className="size-3.5 shrink-0" />
                            )}
                            <span>{timeInfo.display}</span>
                          </span>
                        </TooltipPrimitive.Trigger>
                        <TooltipPrimitive.Portal>
                          <TooltipPrimitive.Content
                            className="z-50 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                          >
                            <p>{timeInfo.full}</p>
                          </TooltipPrimitive.Content>
                        </TooltipPrimitive.Portal>
                      </TooltipPrimitive.Root>
                      {event.location && (
                        <TooltipPrimitive.Root>
                          <TooltipPrimitive.Trigger asChild>
                            <span className="flex items-center gap-1.5 truncate max-w-[200px] text-muted-foreground cursor-help">
                              <MapPin className="size-3.5 shrink-0" />
                              <span className="truncate">
                                {event.location.split(',')[0]}
                              </span>
                            </span>
                          </TooltipPrimitive.Trigger>
                          <TooltipPrimitive.Portal>
                            <TooltipPrimitive.Content
                              className="z-50 max-w-xs rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                            >
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
