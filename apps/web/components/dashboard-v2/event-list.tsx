'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import { AlertCircle, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

function getRelativeTime(event: CalendarEvent): string {
  const start = event.start.dateTime
    ? new Date(event.start.dateTime)
    : event.start.date
      ? new Date(event.start.date)
      : null
  if (!start) return 'All day'

  const now = new Date()
  const diff = start.getTime() - now.getTime()

  if (diff < 0) return 'Now'
  if (diff < 60 * 60 * 1000) return `in ${Math.round(diff / 60000)}m`
  if (diff < 24 * 60 * 60 * 1000) return `in ${Math.round(diff / 3600000)}h`

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (start.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }

  return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function EventList() {
  const { calendarEvents, errors } = useDashboardV2()

  const events = useMemo(() => {
    const now = new Date()
    return calendarEvents
      .filter(e => {
        const start = e.start.dateTime
          ? new Date(e.start.dateTime)
          : e.start.date
            ? new Date(e.start.date)
            : null
        return start && start >= new Date(now.getTime() - 3600000)
      })
      .slice(0, 4)
  }, [calendarEvents])

  if (errors.calendarEvents) {
    return (
      <div className="rounded-xl p-4 border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Upcoming</span>
        </div>
        <div className="flex items-center gap-2 text-accent-rose/70">
          <AlertCircle className="size-3.5" />
          <span className="text-[11px]">Failed to load events</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4 border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Upcoming</span>
        </div>
        <Link href="/calendar" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          View all
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="py-2 text-center">
          <p className="text-[11px] text-muted-foreground">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {events.map(event => (
            <div
              key={event.id}
              className="py-2.5 border-b border-border/60 last:border-0 flex items-start gap-2.5 first:pt-0"
            >
              <div className="size-[6px] rounded-full bg-accent-azure mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-foreground truncate">{event.summary}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{getRelativeTime(event)}</span>
                  {event.location && (
                    <span className="text-[10px] text-muted-foreground/80 truncate flex items-center gap-0.5">
                      <MapPin className="size-2.5" />
                      {event.location.split(',')[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
