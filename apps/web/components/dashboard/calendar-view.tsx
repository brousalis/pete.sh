"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, MapPin, RefreshCw, AlertCircle, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
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

export function CalendarView() {
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
      const response = await apiGet<CalendarResponse>("/api/calendar/upcoming?maxResults=20")
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch events")
      }
      if (response.data) {
        setEvents(response.data.events || [])
        setSource(response.data.source || 'none')
        setAuthAvailable(response.data.authAvailable || false)
        setAuthUrl(response.data.authUrl || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar events")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    // Refresh every 5 minutes
    const interval = setInterval(fetchEvents, 300000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            <p className="text-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvents}
            className="w-fit"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (loading && events.length === 0) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading calendar events...</p>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-5" />
          <p className="text-sm">No upcoming events</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Upcoming Events</h3>
        <Button variant="ghost" size="sm" onClick={fetchEvents} disabled={loading} className="gap-2">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="space-y-2">
        {events.map((event) => {
          const startTime = event.start.dateTime
            ? parseISO(event.start.dateTime)
            : event.start.date
              ? parseISO(event.start.date)
              : null
          const endTime = event.end.dateTime
            ? parseISO(event.end.dateTime)
            : event.end.date
              ? parseISO(event.end.date)
              : null

          return (
            <div key={event.id} className="rounded-lg bg-card p-3 ">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                  <Calendar className="size-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground">{event.summary}</h4>
                  {startTime && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="size-4" />
                      <span>
                        {format(startTime, "MMM d, h:mm a")}
                        {endTime && ` - ${format(endTime, "h:mm a")}`}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
