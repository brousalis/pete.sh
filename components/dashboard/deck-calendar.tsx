"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, RefreshCw, AlertCircle, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, parseISO, isToday, isTomorrow } from "date-fns"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import { apiGet } from "@/lib/api/client"

interface CalendarResponse {
  events: CalendarEvent[]
  source: 'live' | 'cache' | 'none'
  authenticated: boolean
  authAvailable: boolean
  authUrl?: string
  message?: string
}

export function DeckCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'live' | 'cache' | 'none'>('none')

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<CalendarResponse>("/api/calendar/upcoming?maxResults=3")
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch events")
      }
      if (response.data) {
        setEvents((response.data.events || []).slice(0, 3)) // Show only next 3 events
        setSource(response.data.source || 'none')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 300000) // Every 5 minutes
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-3 shadow-lg ">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="size-5 text-destructive" />
          <div className="text-xs font-medium text-destructive">{error}</div>
        </div>
      </div>
    )
  }

  const formatEventTime = (dateTime: string | undefined, date: string | undefined) => {
    if (!dateTime && !date) return null
    const time = dateTime ? parseISO(dateTime) : date ? parseISO(date) : null
    if (!time) return null

    if (isToday(time)) {
      return format(time, "h:mm a")
    }
    if (isTomorrow(time)) {
      return `Tomorrow ${format(time, "h:mm a")}`
    }
    return format(time, "MMM d, h:mm a")
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg ">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="rounded-lg bg-purple-500/20 p-1.5">
            <Calendar className="size-4 text-purple-500" />
          </div>
          <div className="text-sm font-semibold text-foreground">Calendar</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchEvents}
          disabled={loading}
          className="h-7 w-7 min-h-[44px] min-w-[44px] p-0 touch-manipulation"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-2">
            <RefreshCw className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg bg-background/50 p-2 text-center">
            <div className="text-xs text-muted-foreground">No upcoming events</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.map((event) => {
              const time = formatEventTime(event.start.dateTime, event.start.date)
              return (
                <div
                  key={event.id}
                  className="rounded-lg border border-border bg-background/50 p-1.5"
                >
                  <div className="truncate text-xs font-semibold text-foreground">
                    {event.summary}
                  </div>
                  {time && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{time}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
