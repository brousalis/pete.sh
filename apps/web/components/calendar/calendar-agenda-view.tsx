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
import { format, isToday, isTomorrow, isThisWeek, parseISO, addYears, differenceInDays } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  ChevronRight,
  Dumbbell,
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
      <div className="p-3 sm:p-4">
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

        {/* End of events indicator */}
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="size-1.5 rounded-full bg-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} upcoming
          </p>
        </div>
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
  const thisWeek = isThisWeek(date, { weekStartsOn: 0 })

  const getDateLabel = () => {
    if (today) return "Today"
    if (tomorrow) return "Tomorrow"
    return format(date, "EEEE")
  }

  const getRelativeLabel = () => {
    if (today || tomorrow) return format(date, "MMMM d, yyyy")
    const daysAway = differenceInDays(date, new Date())
    if (daysAway <= 6) return `In ${daysAway} days`
    return format(date, "MMMM d, yyyy")
  }

  return (
    <div className="mb-2">
      {/* Date header - more compact on mobile */}
      <button
        onClick={() => onSelectDate(date)}
        className={cn(
          "group mb-1.5 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors sm:gap-3 sm:px-3",
          "hover:bg-muted/50 active:scale-[0.99]",
          today && "bg-brand/8"
        )}
      >
        <div
          className={cn(
            "flex size-11 flex-col items-center justify-center rounded-lg sm:size-12 sm:rounded-xl",
            today ? "bg-brand text-white shadow-sm shadow-brand/30" : "bg-muted"
          )}
        >
          <span className="text-[9px] font-semibold uppercase leading-tight sm:text-[10px]">
            {format(date, "MMM")}
          </span>
          <span className="text-lg font-bold leading-none sm:text-xl">
            {format(date, "d")}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-sm font-semibold sm:text-base",
              today ? "text-brand" : "text-foreground"
            )}
          >
            {getDateLabel()}
          </h3>
          <p className="text-xs text-muted-foreground">
            {getRelativeLabel()}
          </p>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>

      {/* Events list - better mobile layout */}
      <div className="space-y-1.5 pl-2 sm:ml-[56px] sm:pl-0">
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
  const isFitness = event.colorId === "fitness" || event.colorId === "fitness-complete"
  const isCompleted = event.colorId === "fitness-complete"

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5 text-left transition-all sm:py-3",
        "hover:ring-1 hover:ring-brand/20 hover:shadow-sm",
        "active:scale-[0.99] active:bg-muted/30",
        "touch-manipulation",
        colors?.bg,
        colors?.border
      )}
    >
      {/* Time / indicator column */}
      <div className="flex w-16 shrink-0 flex-col items-start sm:w-20">
        {allDay ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span className="hidden sm:inline">All day</span>
            <span className="sm:hidden">All day</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="size-3.5" />
            <span>{formatEventTime(event).split(" - ")[0]}</span>
          </div>
        )}
      </div>

      {/* Event details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {isFitness && (
            <Dumbbell className={cn(
              "size-3.5 shrink-0",
              isCompleted ? "text-emerald-500" : "text-orange-500"
            )} />
          )}
          <h4 className={cn(
            "truncate text-sm font-semibold leading-tight sm:text-sm",
            colors?.text
          )}>
            {event.summary}
            {isCompleted && " \u2713"}
          </h4>
        </div>
        {event.description && !isFitness && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {event.description}
          </p>
        )}
        {isFitness && event.description && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
            {event.description}
          </p>
        )}
        {event.location && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
