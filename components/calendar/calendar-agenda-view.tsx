"use client"

import { cn } from "@/lib/utils"
import {
  groupEventsByDate,
  isAllDayEvent,
  formatEventTime,
  getEventStartDate,
} from "@/lib/utils/calendar-utils"
import { getEventColor } from "@/lib/types/calendar-views.types"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import { format, isToday, isTomorrow, parseISO, addYears } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  ChevronRight,
} from "lucide-react"

interface CalendarAgendaViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
}

export function CalendarAgendaView({
  currentDate,
  events,
  onSelectDate,
  onSelectEvent,
}: CalendarAgendaViewProps) {
  // Show upcoming events for the next year
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneYearFromNow = addYears(today, 1)

  const filteredEvents = events.filter((event) => {
    const start = getEventStartDate(event)
    if (!start) return false
    // Include events from today up to one year from now
    return start >= today && start <= oneYearFromNow
  })

  // Group events by date
  const groupedEvents = groupEventsByDate(filteredEvents)

  // Show dates with events (up to 1 year)
  const visibleDates = Array.from(groupedEvents.keys()).sort()

  if (filteredEvents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <Calendar className="size-10 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">No Upcoming Events</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your schedule is clear for the upcoming period
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-4">
        <AnimatePresence mode="popLayout">
          {visibleDates.map((dateKey, index) => {
            const dayEvents = groupedEvents.get(dateKey) || []
            const date = parseISO(dateKey)

            return (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
              >
                <AgendaDateGroup
                  date={date}
                  events={dayEvents}
                  onSelectDate={onSelectDate}
                  onSelectEvent={onSelectEvent}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ScrollArea>
  )
}

interface AgendaDateGroupProps {
  date: Date
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
}

function AgendaDateGroup({
  date,
  events,
  onSelectDate,
  onSelectEvent,
}: AgendaDateGroupProps) {
  const today = isToday(date)
  const tomorrow = isTomorrow(date)

  const getDateLabel = () => {
    if (today) return "Today"
    if (tomorrow) return "Tomorrow"
    return format(date, "EEEE")
  }

  return (
    <div className="mb-4">
      {/* Date header */}
      <button
        onClick={() => onSelectDate(date)}
        className={cn(
          "group mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
          "hover:bg-muted/50",
          today && "bg-brand/10"
        )}
      >
        <div
          className={cn(
            "flex size-12 flex-col items-center justify-center rounded-xl",
            today ? "bg-brand text-white" : "bg-muted"
          )}
        >
          <span className="text-[10px] font-semibold uppercase">
            {format(date, "MMM")}
          </span>
          <span className="text-xl font-bold leading-none">
            {format(date, "d")}
          </span>
        </div>
        <div className="flex-1">
          <h3
            className={cn(
              "font-semibold",
              today ? "text-brand" : "text-foreground"
            )}
          >
            {getDateLabel()}
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(date, "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>

      {/* Events list */}
      <div className="ml-[60px] space-y-2">
        {events.map((event) => (
          <AgendaEventCard
            key={event.id}
            event={event}
            onSelect={() => onSelectEvent(event)}
          />
        ))}
      </div>
    </div>
  )
}

interface AgendaEventCardProps {
  event: CalendarEvent
  onSelect: () => void
}

function AgendaEventCard({ event, onSelect }: AgendaEventCardProps) {
  const colors = getEventColor(event.colorId)
  const allDay = isAllDayEvent(event)

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border-l-3 p-3 text-left transition-all",
        "hover:ring-2 hover:ring-brand/30 hover:shadow-sm",
        colors.bg,
        colors.border
      )}
    >
      {/* Time/All-day indicator */}
      <div className="flex w-20 shrink-0 flex-col items-start">
        {allDay ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-3.5" />
            All day
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="size-3.5" />
            {formatEventTime(event).split(" - ")[0]}
          </div>
        )}
      </div>

      {/* Event details */}
      <div className="min-w-0 flex-1">
        <h4 className={cn("font-semibold leading-tight", colors.text)}>
          {event.summary}
        </h4>
        {event.location && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
        {event.description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            {event.description}
          </p>
        )}
      </div>

      {/* Arrow indicator */}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
