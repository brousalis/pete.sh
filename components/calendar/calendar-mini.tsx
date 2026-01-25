"use client"

import { cn } from "@/lib/utils"
import { getEventsForDay } from "@/lib/utils/calendar-utils"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CalendarMiniProps {
  currentDate: Date
  selectedDate: Date | null
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export function CalendarMini({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
}: CalendarMiniProps) {
  // Get all days in the current month that have events
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysWithEvents = new Set<string>()

  eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach((day) => {
    const dayEvents = getEventsForDay(day, events)
    if (dayEvents.length > 0) {
      daysWithEvents.add(format(day, "yyyy-MM-dd"))
    }
  })

  // Get calendar grid days (including days from prev/next months to fill the grid)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Group days into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const handlePrevMonth = () => {
    onSelectDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    onSelectDate(addMonths(currentDate, 1))
  }

  return (
    <div className="shrink-0 rounded-xl border border-border/50 bg-card p-3">
      {/* Header with navigation */}
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handlePrevMonth}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(currentDate, "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleNextMonth}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-0">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-[10px] font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid gap-0.5">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-0">
            {week.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd")
              const hasEvents = daysWithEvents.has(dateKey)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-md text-xs font-normal transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isToday && !isSelected && "bg-accent text-accent-foreground",
                    isSelected && "bg-brand text-white hover:bg-brand hover:text-white"
                  )}
                >
                  {day.getDate()}
                  {hasEvents && !isSelected && isCurrentMonth && (
                    <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
