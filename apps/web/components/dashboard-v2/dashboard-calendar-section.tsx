'use client'

import {
  CalendarEventDetail,
  CalendarWeekView,
} from '@/components/calendar'
import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import {
  generateFitnessEvents,
  generateMealPlanEvents,
} from '@/lib/utils/calendar-utils'
import { addDays, startOfWeek } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'

export function DashboardCalendarSection() {
  const {
    routine,
    mealPlan,
    recipes,
    calendarEvents,
    selectedDate,
    navigateToDay,
  } = useDashboardV2()

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)

  const fitnessEvents = useMemo(() => {
    if (!routine) return []
    const start = new Date(weekStart)
    start.setMonth(start.getMonth() - 1)
    const end = new Date(weekEnd)
    end.setMonth(end.getMonth() + 1)
    return generateFitnessEvents(routine, start, end)
  }, [routine, weekStart, weekEnd])

  const mealPlanEvents = useMemo(() => {
    if (!mealPlan) return []
    return generateMealPlanEvents(mealPlan, recipes, weekStart, weekEnd)
  }, [mealPlan, recipes, weekStart, weekEnd])

  const allEvents = useMemo(
    () => [...mealPlanEvents, ...fitnessEvents, ...calendarEvents],
    [mealPlanEvents, fitnessEvents, calendarEvents]
  )

  const handleSelectDate = (date: Date) => {
    const direction = date > selectedDate ? 'forward' : 'backward'
    navigateToDay(date, direction)
  }

  const handleCloseEventDetail = () => setSelectedEvent(null)

  const handleNavigateToDateFromDetail = (date: Date) => {
    navigateToDay(date, date > selectedDate ? 'forward' : 'backward')
    setSelectedEvent(null)
  }

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <div className="flex-1 flex overflow-hidden min-w-0">
        <div className="flex-1 overflow-hidden rounded-lg">
          <CalendarWeekView
            currentDate={weekStart}
            selectedDate={selectedDate}
            events={allEvents}
            onSelectDate={handleSelectDate}
            onSelectEvent={setSelectedEvent}
            weekStartsOn={1}
          />
        </div>

        <AnimatePresence>
          {selectedEvent && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-border/50 hidden shrink-0 overflow-hidden border-l md:block"
            >
              <CalendarEventDetail
                event={selectedEvent}
                onClose={handleCloseEventDetail}
                onNavigateToDate={handleNavigateToDateFromDetail}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile: fullscreen event detail */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-background fixed inset-0 z-50 md:hidden"
          >
            <CalendarEventDetail
              event={selectedEvent}
              onClose={handleCloseEventDetail}
              onNavigateToDate={handleNavigateToDateFromDetail}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
