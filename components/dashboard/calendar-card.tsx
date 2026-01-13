'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO, isToday, isTomorrow, differenceInMinutes } from 'date-fns'
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
      const response = await fetch('/api/calendar/upcoming?hours=48')
      if (!response.ok) {
        if (response.status === 401) {
          setError('not_authenticated')
          return
        }
        throw new Error('Failed to fetch events')
      }
      const data = await response.json()
      if (data.success && data.data) {
        setEvents(data.data)
      }
    } catch (err) {
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

  const formatEventTime = (event: CalendarEvent) => {
    const startTime = event.start.dateTime
      ? parseISO(event.start.dateTime)
      : event.start.date
        ? parseISO(event.start.date)
        : null

    if (!startTime) return 'All day'

    const now = new Date()
    const minutesUntil = differenceInMinutes(startTime, now)

    if (minutesUntil > 0 && minutesUntil <= 60) {
      return `in ${minutesUntil} min`
    }

    let dayLabel = ''
    if (isToday(startTime)) {
      dayLabel = 'Today'
    } else if (isTomorrow(startTime)) {
      dayLabel = 'Tomorrow'
    } else {
      dayLabel = format(startTime, 'EEE')
    }

    return `${dayLabel}, ${format(startTime, 'h:mm a')}`
  }

  const isEventSoon = (event: CalendarEvent) => {
    const startTime = event.start.dateTime
      ? parseISO(event.start.dateTime)
      : null
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
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Calendar className="size-4" />
          No upcoming events
        </div>
      ) : (
        <div className="space-y-2">
          {events.slice(0, 4).map(event => {
            const isSoon = isEventSoon(event)

            return (
              <div
                key={event.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-all ${
                  isSoon
                    ? 'border-brand/50 bg-brand/5 ring-1 ring-brand/20'
                    : 'border-border bg-card/50'
                }`}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    isSoon ? 'bg-brand/20' : 'bg-muted'
                  }`}
                >
                  <Calendar
                    className={`size-4 ${
                      isSoon ? 'text-brand' : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate text-sm font-medium">
                      {event.summary}
                    </h4>
                    {isSoon && (
                      <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-white">
                        Soon
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatEventTime(event)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">
                          {event.location.split(',')[0]}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
