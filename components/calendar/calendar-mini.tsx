"use client"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { getEventsForDay } from "@/lib/utils/calendar-utils"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { DayButton, DayButtonProps } from "react-day-picker"
import { Button } from "@/components/ui/button"
import React from "react"

interface CalendarMiniProps {
  currentDate: Date
  selectedDate: Date | null
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
}

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

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <Calendar
        mode="single"
        selected={selectedDate || undefined}
        onSelect={(date) => date && onSelectDate(date)}
        month={currentDate}
        onMonthChange={onSelectDate}
        className="w-full"
        classNames={{
          months: "flex flex-col",
          month: "space-y-2",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-8 font-normal text-[0.7rem]",
          row: "flex w-full mt-1",
          cell: cn(
            "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
            "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
          ),
          day: cn(
            "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-brand text-white hover:bg-brand hover:text-white focus:bg-brand focus:text-white",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground/50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_hidden: "invisible",
        }}
        components={{
          DayButton: (props) => (
            <MiniDayButton {...props} daysWithEvents={daysWithEvents} />
          ),
        }}
      />
    </div>
  )
}

interface MiniDayButtonProps extends DayButtonProps {
  daysWithEvents: Set<string>
}

function MiniDayButton({ day, modifiers, daysWithEvents, ...props }: MiniDayButtonProps) {
  const dateKey = format(day.date, "yyyy-MM-dd")
  const hasEvents = daysWithEvents.has(dateKey)
  const isSelected = modifiers.selected
  const isToday = modifiers.today

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative h-8 w-8 p-0 font-normal",
        isSelected && "bg-brand text-white hover:bg-brand hover:text-white",
        isToday && !isSelected && "bg-accent",
        modifiers.outside && "text-muted-foreground/50",
        modifiers.disabled && "text-muted-foreground opacity-50"
      )}
      disabled={modifiers.disabled}
      {...props}
    >
      {day.date.getDate()}
      {hasEvents && !isSelected && (
        <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand" />
      )}
    </Button>
  )
}
