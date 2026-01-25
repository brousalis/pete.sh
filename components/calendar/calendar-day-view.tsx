"use client"

import { cn } from "@/lib/utils"
import {
  getEventsForDay,
  calculateEventPositions,
  isAllDayEvent,
  formatEventTime,
} from "@/lib/utils/calendar-utils"
import { getEventColor } from "@/lib/types/calendar-views.types"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRef, useEffect } from "react"
import { MapPin, Clock, CalendarDays } from "lucide-react"

interface CalendarDayViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
  direction?: "left" | "right"
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 72 // Larger for day view

export function CalendarDayView({
  currentDate,
  events,
  onSelectEvent,
  direction = "right",
}: CalendarDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayEvents = getEventsForDay(currentDate, events)
  const allDayEvents = dayEvents.filter(isAllDayEvent)
  const timedEvents = dayEvents.filter((e) => !isAllDayEvent(e))
  const positions = calculateEventPositions(timedEvents, currentDate)

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTarget = 8 * HOUR_HEIGHT - 20
      scrollRef.current.scrollTop = scrollTarget
    }
  }, [])

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

  const isToday =
    format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-border/50 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-14 flex-col items-center justify-center rounded-xl",
              isToday ? "bg-brand text-white" : "bg-muted"
            )}
          >
            <span className="text-[10px] font-semibold uppercase">
              {format(currentDate, "EEE")}
            </span>
            <span className="text-2xl font-bold leading-none">
              {format(currentDate, "d")}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {format(currentDate, "EEEE")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {format(currentDate, "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Event count */}
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          <span>{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="shrink-0 border-b border-border/50 bg-muted/10 px-4 py-2">
          <div className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
            All Day
          </div>
          <div className="flex flex-wrap gap-2">
            {allDayEvents.map((event) => {
              const colors = getEventColor(event.colorId)
              return (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-l-3 px-3 py-2 text-left transition-all",
                    "hover:ring-2 hover:ring-brand/30",
                    colors?.bg,
                    colors?.border
                  )}
                >
                  <span className={cn("font-medium", colors?.text)}>
                    {event.summary}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {event.location.split(",")[0]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Time grid */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={format(currentDate, "yyyy-MM-dd")}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full" ref={scrollRef}>
            <div
              className="relative flex"
              style={{ height: HOURS.length * HOUR_HEIGHT }}
            >
              {/* Time labels */}
              <div className="relative w-20 shrink-0 border-r border-border/30">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 -translate-y-2 pr-3 text-right text-xs font-medium text-muted-foreground"
                    style={{ top: hour * HOUR_HEIGHT }}
                  >
                    {format(new Date().setHours(hour, 0, 0, 0), "h:mm a")}
                  </div>
                ))}
              </div>

              {/* Events column */}
              <div className="relative flex-1">
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-border/20"
                    style={{ top: hour * HOUR_HEIGHT }}
                  >
                    {/* Half-hour line */}
                    <div
                      className="absolute inset-x-0 border-t border-border/10"
                      style={{ top: HOUR_HEIGHT / 2 }}
                    />
                  </div>
                ))}

                {/* Current time indicator */}
                {isToday && <DayCurrentTimeIndicator hourHeight={HOUR_HEIGHT} />}

                {/* Events */}
                {positions.map((pos) => {
                  const colors = getEventColor(pos.event.colorId)
                  return (
                    <button
                      key={pos.event.id}
                      onClick={() => onSelectEvent(pos.event)}
                      className={cn(
                        "absolute overflow-hidden rounded-lg border-l-3 p-3 text-left transition-all",
                        "hover:ring-2 hover:ring-brand/50 hover:z-10",
                        colors?.bg,
                        colors?.border
                      )}
                      style={{
                        top: pos.top,
                        height: Math.max(pos.height, 40),
                        left: `calc(${pos.left}% + 8px)`,
                        width: `calc(${pos.width}% - 16px)`,
                      }}
                    >
                      <div className="flex h-full flex-col">
                        <span
                          className={cn(
                            "font-semibold leading-tight",
                            colors?.text
                          )}
                        >
                          {pos.event.summary}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {formatEventTime(pos.event)}
                        </span>
                        {pos.event.location && pos.height > 60 && (
                          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            <span className="truncate">
                              {pos.event.location.split(",")[0]}
                            </span>
                          </span>
                        )}
                      </div>
                    </button>
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

function DayCurrentTimeIndicator({ hourHeight }: { hourHeight: number }) {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const top = (hours * 60 + minutes) * (hourHeight / 60)

  return (
    <div className="absolute inset-x-0 z-20 flex items-center" style={{ top }}>
      <div className="size-3 rounded-full bg-red-500 shadow-lg" />
      <div className="h-0.5 flex-1 bg-red-500" />
    </div>
  )
}
