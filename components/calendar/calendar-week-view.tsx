"use client"

import { cn } from "@/lib/utils"
import {
  getWeekDays,
  getEventsForDay,
  calculateEventPositions,
  isAllDayEvent,
  formatEventTime,
} from "@/lib/utils/calendar-utils"
import { getEventColor } from "@/lib/types/calendar-views.types"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import { format, startOfWeek, addDays } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRef, useEffect } from "react"

interface CalendarWeekViewProps {
  currentDate: Date
  selectedDate: Date | null
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
  direction?: "left" | "right"
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 60 // pixels

export function CalendarWeekView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onSelectEvent,
  direction = "right",
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(currentDate, selectedDate, events)
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTarget = 8 * HOUR_HEIGHT - 20
      scrollRef.current.scrollTop = scrollTarget
    }
  }, [])

  // Get all-day events for the week
  const allDayEvents = events.filter(isAllDayEvent)

  const slideVariants = {
    enter: (dir: "left" | "right") => ({
      x: dir === "right" ? 30 : -30,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: "left" | "right") => ({
      x: dir === "right" ? -30 : 30,
      opacity: 0,
    }),
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with day names */}
      <div className="flex shrink-0 border-b border-border/50">
        {/* Time column spacer */}
        <div className="w-16 shrink-0 border-r border-border/30" />

        {/* Day headers */}
        <div className="grid flex-1 grid-cols-7">
          {weekDays.map((day) => (
            <button
              key={day.date.toISOString()}
              onClick={() => onSelectDate(day.date)}
              className={cn(
                "flex flex-col items-center gap-0.5 border-r border-border/30 py-2 transition-colors last:border-r-0",
                "hover:bg-muted/50",
                day.isSelected && "bg-brand/10"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium uppercase",
                  day.isToday ? "text-brand" : "text-muted-foreground"
                )}
              >
                {day.dayName}
              </span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                  day.isToday && "bg-brand text-white",
                  day.isSelected && !day.isToday && "bg-brand/20 text-brand"
                )}
              >
                {day.dayNumber}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="flex shrink-0 border-b border-border/50 bg-muted/20">
          <div className="flex w-16 shrink-0 items-center justify-center border-r border-border/30 text-[10px] font-medium text-muted-foreground">
            ALL DAY
          </div>
          <div className="grid min-h-[40px] flex-1 grid-cols-7">
            {weekDays.map((day) => {
              const dayAllDayEvents = allDayEvents.filter((e) =>
                getEventsForDay(day.date, [e]).length > 0
              )
              return (
                <div
                  key={day.date.toISOString()}
                  className="flex flex-col gap-0.5 border-r border-border/30 p-1 last:border-r-0"
                >
                  {dayAllDayEvents.slice(0, 2).map((event) => {
                    const colors = getEventColor(event.colorId)
                    return (
                      <button
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className={cn(
                          "truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium",
                          "hover:ring-1 hover:ring-brand/50",
                          colors.bg,
                          colors.text
                        )}
                      >
                        {event.summary}
                      </button>
                    )
                  })}
                  {dayAllDayEvents.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayAllDayEvents.length - 2}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Time grid */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={format(weekStart, "yyyy-MM-dd")}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="flex" style={{ height: HOURS.length * HOUR_HEIGHT }}>
              {/* Time labels */}
              <div className="relative w-16 shrink-0 border-r border-border/30">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 -translate-y-2 pr-2 text-right text-[10px] font-medium text-muted-foreground"
                    style={{ top: hour * HOUR_HEIGHT }}
                  >
                    {format(new Date().setHours(hour, 0, 0, 0), "h a")}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div className="relative grid flex-1 grid-cols-7">
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-border/20"
                    style={{ top: hour * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator */}
                <CurrentTimeIndicator />

                {/* Day columns with events */}
                {weekDays.map((day) => {
                  const dayEvents = day.events.filter((e) => !isAllDayEvent(e))
                  const positions = calculateEventPositions(dayEvents, day.date)

                  return (
                    <div
                      key={day.date.toISOString()}
                      className={cn(
                        "relative border-r border-border/30 last:border-r-0",
                        day.isToday && "bg-brand/5"
                      )}
                      onClick={() => onSelectDate(day.date)}
                    >
                      {positions.map((pos) => {
                        const colors = getEventColor(pos.event.colorId)
                        return (
                          <button
                            key={pos.event.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectEvent(pos.event)
                            }}
                            className={cn(
                              "absolute overflow-hidden rounded border-l-2 px-1 py-0.5 text-left transition-all",
                              "hover:ring-1 hover:ring-brand/50 hover:z-10",
                              colors.bg,
                              colors.border
                            )}
                            style={{
                              top: pos.top,
                              height: pos.height,
                              left: `${pos.left}%`,
                              width: `calc(${pos.width}% - 4px)`,
                              marginLeft: 2,
                            }}
                          >
                            <span className={cn("block truncate text-[10px] font-semibold", colors.text)}>
                              {pos.event.summary}
                            </span>
                            <span className="block truncate text-[9px] text-muted-foreground">
                              {formatEventTime(pos.event)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function CurrentTimeIndicator() {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const top = (hours * 60 + minutes) * (HOUR_HEIGHT / 60)

  // Get current day of week (0-6)
  const dayOfWeek = now.getDay()
  const leftPercent = (dayOfWeek / 7) * 100

  return (
    <div
      className="absolute z-20 flex items-center"
      style={{
        top,
        left: `${leftPercent}%`,
        width: `${100 / 7}%`,
      }}
    >
      <div className="size-2 rounded-full bg-red-500" />
      <div className="h-0.5 flex-1 bg-red-500" />
    </div>
  )
}
