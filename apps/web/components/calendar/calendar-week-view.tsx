'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { getEventColor } from '@/lib/types/calendar-views.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import { cn } from '@/lib/utils'
import {
  calculateEventPositions,
  formatEventTime,
  getEventsForDay,
  getWeekDays,
  isAllDayEvent,
} from '@/lib/utils/calendar-utils'
import { format, startOfWeek } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface CalendarWeekViewProps {
  currentDate: Date
  selectedDate: Date | null
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
  direction?: 'left' | 'right'
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 48 // pixels - reduced for better fit on tablets

export function CalendarWeekView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onSelectEvent,
  direction = 'right',
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(currentDate, selectedDate, events)
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })

  // Scroll to 8 AM on mount and date change so the working day (8am-8pm) is visible
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]')
        if (viewport) {
          viewport.scrollTop = 8 * HOUR_HEIGHT
        }
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [currentDate])

  // Get all-day events for the week
  const allDayEvents = events.filter(isAllDayEvent)

  const slideVariants = {
    enter: (dir: 'left' | 'right') => ({
      x: dir === 'right' ? 30 : -30,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'left' | 'right') => ({
      x: dir === 'right' ? -30 : 30,
      opacity: 0,
    }),
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with day names */}
      <div className="border-border/60 bg-card/50 flex shrink-0 border-b">
        {/* Time column spacer */}
        <div className="border-border/40 w-14 shrink-0 border-r" />

        {/* Day headers */}
        <div className="grid flex-1 grid-cols-7">
          {weekDays.map(day => (
            <button
              key={day.date.toISOString()}
              onClick={() => onSelectDate(day.date)}
              className={cn(
                'border-border/40 flex flex-col items-center gap-0.5 border-r py-2 transition-colors last:border-r-0',
                'hover:bg-muted/50',
                day.isSelected && 'bg-brand/10'
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wide',
                  day.isToday ? 'text-brand' : 'text-muted-foreground/80'
                )}
              >
                {day.dayName}
              </span>
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-sm font-semibold',
                  day.isToday && 'bg-brand text-white',
                  day.isSelected && !day.isToday && 'bg-brand/20 text-brand'
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
        <div className="border-border/60 bg-muted/30 flex shrink-0 border-b">
          <div className="border-border/40 text-muted-foreground/80 flex w-14 shrink-0 items-center justify-center border-r text-[10px] font-semibold tracking-wide">
            ALL DAY
          </div>
          <div className="grid min-h-[36px] flex-1 grid-cols-7">
            {weekDays.map(day => {
              const dayAllDayEvents = allDayEvents.filter(
                e => getEventsForDay(day.date, [e]).length > 0
              )
              return (
                <div
                  key={day.date.toISOString()}
                  className="border-border/40 flex flex-col gap-0.5 border-r p-1.5 last:border-r-0"
                >
                  {dayAllDayEvents.slice(0, 2).map(event => {
                    const colors = getEventColor(event.colorId)
                    return (
                      <button
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className={cn(
                          'truncate rounded-md px-2 py-1 text-left text-[11px] font-semibold',
                          'hover:ring-brand/50 hover:ring-1',
                          colors?.bg,
                          colors?.text
                        )}
                      >
                        {event.summary}
                      </button>
                    )
                  })}
                  {dayAllDayEvents.length > 2 && (
                    <span className="text-muted-foreground/80 text-[10px] font-medium">
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
          key={format(weekStart, 'yyyy-MM-dd')}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full" ref={scrollRef}>
            <div
              className="flex"
              style={{ height: HOURS.length * HOUR_HEIGHT }}
            >
              {/* Time labels */}
              <div className="border-border/40 bg-card/30 relative w-14 shrink-0 border-r">
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="text-muted-foreground/90 absolute right-0 left-0 -translate-y-2 pr-2 text-right text-[11px] font-medium tabular-nums"
                    style={{ top: hour * HOUR_HEIGHT }}
                  >
                    {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div className="relative grid flex-1 grid-cols-7">
                {/* Hour lines */}
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="border-border/40 absolute inset-x-0 border-t"
                    style={{ top: hour * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator */}
                <CurrentTimeIndicator />

                {/* Day columns with events */}
                {weekDays.map(day => {
                  const dayEvents = day.events.filter(e => !isAllDayEvent(e))
                  const positions = calculateEventPositions(
                    dayEvents,
                    day.date,
                    0,
                    24,
                    HOUR_HEIGHT
                  )

                  return (
                    <div
                      key={day.date.toISOString()}
                      className={cn(
                        'border-border/40 relative border-r last:border-r-0',
                        day.isToday && 'bg-brand/[0.07]'
                      )}
                      onClick={() => onSelectDate(day.date)}
                    >
                      {positions.map(pos => {
                        const colors = getEventColor(pos.event.colorId)
                        return (
                          <button
                            key={pos.event.id}
                            onClick={e => {
                              e.stopPropagation()
                              onSelectEvent(pos.event)
                            }}
                            className={cn(
                              'absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left transition-all shadow-sm',
                              'hover:ring-brand/50 hover:z-10 hover:ring-2 hover:shadow-md',
                              colors?.bg,
                              colors?.border
                            )}
                            style={{
                              top: pos.top,
                              height: pos.height,
                              left: `${pos.left}%`,
                              width: `calc(${pos.width}% - 6px)`,
                              marginLeft: 3,
                            }}
                          >
                            <span
                              className={cn(
                                'block truncate text-[11px] font-semibold leading-tight',
                                colors?.text
                              )}
                            >
                              {pos.event.summary}
                            </span>
                            <span
                              className={cn(
                                'block truncate text-[10px] font-medium opacity-80',
                                colors?.text
                              )}
                            >
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
