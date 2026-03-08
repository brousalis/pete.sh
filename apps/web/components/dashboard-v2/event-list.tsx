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
      <div className="rounded-xl p-4 border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="size-3.5 text-white/40" />
          <span className="text-xs font-semibold text-white/80">Upcoming</span>
        </div>
        <div className="flex items-center gap-2 text-red-400/70">
          <AlertCircle className="size-3.5" />
          <span className="text-[11px]">Failed to load events</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4 border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-white/40" />
          <span className="text-xs font-semibold text-white/80">Upcoming</span>
        </div>
        <Link href="/calendar" className="text-[10px] text-white/35 hover:text-white/60 transition-colors">
          View all
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="py-2 text-center">
          <p className="text-[11px] text-white/40">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {events.map(event => (
            <div
              key={event.id}
              className="py-2 border-b border-white/[0.04] last:border-0 flex items-start gap-2.5"
            >
              <div className="size-[6px] rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white/80 truncate">{event.summary}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-white/45">{getRelativeTime(event)}</span>
                  {event.location && (
                    <span className="text-[10px] text-white/35 truncate flex items-center gap-0.5">
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
