"use client"

import { cn } from "@/lib/utils"
import { getMonthDays } from "@/lib/utils/calendar-utils"
import { getEventColor } from "@/lib/types/calendar-views.types"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

interface CalendarMonthGridProps {
  currentDate: Date
  selectedDate: Date | null
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
  direction?: "left" | "right"
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CalendarMonthGrid({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onSelectEvent,
  direction = "right",
}: CalendarMonthGridProps) {
  const days = getMonthDays(currentDate, selectedDate, events)

  const slideVariants = {
    enter: (dir: "left" | "right") => ({
      x: dir === "right" ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: "left" | "right") => ({
      x: dir === "right" ? -50 : 50,
      opacity: 0,
    }),
  }

  return (
    <div className="flex h-full flex-col">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border/60 bg-card/50">
        {WEEKDAY_LABELS.map((day, index) => (
          <div
            key={day}
            className={cn(
              "px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider",
              index === 0 || index === 6
                ? "text-muted-foreground/60"
                : "text-muted-foreground/80"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={format(currentDate, "yyyy-MM")}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="grid flex-1 grid-cols-7 grid-rows-6"
        >
          {days.map((day, index) => {
            const hasEvents = day.events.length > 0
            const maxVisibleEvents = 3
            const visibleEvents = day.events.slice(0, maxVisibleEvents)
            const remainingEvents = day.events.length - maxVisibleEvents

            return (
              <div
                key={index}
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  "group relative flex min-h-[90px] cursor-pointer flex-col border-b border-r border-border/40 p-1.5 transition-colors",
                  "hover:bg-muted/50",
                  !day.isCurrentMonth && "bg-muted/20",
                  day.isSelected && "bg-brand/10 ring-1 ring-brand/30 ring-inset",
                  day.isToday && !day.isSelected && "bg-brand/[0.07]"
                )}
              >
                {/* Day Number */}
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      day.isToday && "bg-brand text-white",
                      !day.isToday && day.isSelected && "bg-brand/20 text-brand",
                      !day.isCurrentMonth && "text-muted-foreground/50",
                      day.isWeekend && day.isCurrentMonth && !day.isToday && !day.isSelected && "text-muted-foreground/60"
                    )}
                  >
                    {day.date.getDate()}
                  </span>
                  {hasEvents && !day.isToday && (
                    <span className="mr-1 mt-1 size-1.5 rounded-full bg-brand" />
                  )}
                </div>

                {/* Events */}
                <div className="mt-1 flex flex-1 flex-col gap-0.5 overflow-hidden">
                  {visibleEvents.map((event) => {
                    const colors = getEventColor(event.colorId)
                    return (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectEvent(event)
                        }}
                        className={cn(
                          "truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight transition-all",
                          "hover:ring-1 hover:ring-brand/50",
                          colors?.bg,
                          colors?.text,
                          "border-l-2",
                          colors?.border
                        )}
                        title={event.summary}
                      >
                        {event.summary}
                      </button>
                    )
                  })}
                  {remainingEvents > 0 && (
                    <span className="px-1.5 text-[10px] font-semibold text-muted-foreground/80">
                      +{remainingEvents} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
