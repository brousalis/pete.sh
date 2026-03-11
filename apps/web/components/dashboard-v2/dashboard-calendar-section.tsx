'use client'

import {
  CalendarAgendaView,
  CalendarDayView,
  CalendarEventDetail,
  CalendarFitnessSidebar,
  CalendarHeader,
  CalendarMealPlanSidebar,
  CalendarMini,
  CalendarMonthGrid,
  CalendarWeekView,
} from '@/components/calendar'
import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import type { CalendarViewMode } from '@/lib/types/calendar-views.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import { cn } from '@/lib/utils'
import {
  filterEvents,
  generateFitnessEvents,
  generateMealPlanEvents
} from '@/lib/utils/calendar-utils'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'

export function DashboardCalendarSection() {
  const {
    routine,
    consistencyStats,
    mealPlan,
    recipes,
    calendarEvents,
    selectedDate,
    navigateToDay,
    refetch,
    loading: dashboardLoading,
  } = useDashboardV2()

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [searchQuery, setSearchQuery] = useState('')
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')

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
    () => [...mealPlanEvents, ...fitnessEvents, ...(calendarEvents ?? [])],
    [mealPlanEvents, fitnessEvents, calendarEvents]
  )

  const filteredEvents = filterEvents(allEvents, searchQuery)

  const selectedDateEvents = useMemo(() => {
    return filterEvents(
      (calendarEvents ?? []).filter((e) => {
        const eventStart = e.start.dateTime
          ? new Date(e.start.dateTime)
          : e.start.date
            ? new Date(e.start.date)
            : null
        if (!eventStart) return false
        return isSameDay(eventStart, selectedDate)
      }),
      searchQuery
    ).slice(0, 8)
  }, [calendarEvents, selectedDate, searchQuery])

  const handleDateChange = (date: Date, direction?: 'left' | 'right') => {
    if (direction) setSlideDirection(direction)
    navigateToDay(date, date > selectedDate ? 'forward' : 'backward')
  }

  const handleSelectDate = (date: Date) => {
    handleDateChange(date)
  }

  const handleCloseEventDetail = () => setSelectedEvent(null)

  const handleNavigateToDateFromDetail = (date: Date) => {
    navigateToDay(date, date > selectedDate ? 'forward' : 'backward')
    setSelectedEvent(null)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Full-width section title row: Calendar + date nav + view mode + search (matches Cooking) */}
      <CalendarHeader
        sectionTitle="Calendar"
        currentDate={selectedDate}
        viewMode={viewMode}
        searchQuery={searchQuery}
        isLoading={dashboardLoading}
        onDateChange={handleDateChange}
        onViewModeChange={setViewMode}
        onSearchChange={setSearchQuery}
        onRefresh={refetch}
      />

      {/* Content: sidebar + main calendar */}
      <div className="relative flex-1 min-h-0">
      {/* Left sidebar - in normal flow, determines container height */}
      <aside
        className={cn(
          'hidden flex-col border-r border-border/50 md:flex',
          'w-[280px]'
        )}
      >
        <CalendarMini
          currentDate={selectedDate}
          selectedDate={selectedDate}
          events={calendarEvents ?? []}
          fitnessRoutine={routine}
          mealPlan={mealPlan}
          onSelectDate={(date) => handleDateChange(date)}
        />

        <CalendarFitnessSidebar
          routine={routine}
          consistencyStats={consistencyStats}
          selectedDate={selectedDate}
          loading={false}
        />

        <CalendarMealPlanSidebar
          mealPlan={mealPlan}
          recipes={recipes}
          selectedDate={selectedDate}
          loading={false}
        />

        <div className="border-border/50 bg-card flex flex-col overflow-hidden border">
          <div className="border-border/50 shrink-0 border-b px-3 py-2">
            <h3 className="text-xs font-semibold">
              {isSameDay(selectedDate, new Date())
                ? "Today's Events"
                : `Events on ${format(selectedDate, 'MMM d')}`}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {selectedDateEvents.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-center">
                <span className="text-muted-foreground text-xs">No events</span>
              </div>
            ) : (
              selectedDateEvents.slice(0, 5).map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full rounded-lg border border-border/50 px-2 py-1.5 text-left transition-all hover:border-brand/30 hover:bg-muted/50"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        'mt-1 size-1.5 shrink-0 rounded-full',
                        event.colorId ? `bg-chart-${event.colorId}` : 'bg-brand'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{event.summary}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {event.start.dateTime
                          ? format(new Date(event.start.dateTime), 'h:mm a')
                          : 'All day'}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main calendar view - absolutely positioned, height constrained by sidebar */}
      <main className="absolute top-0 bottom-0 left-[calc(268px+0.75rem)] right-0 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <AnimatePresence mode="wait" custom={slideDirection}>
            {viewMode === 'month' && (
              <motion.div
                key="month"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <CalendarMonthGrid
                  currentDate={selectedDate}
                  selectedDate={selectedDate}
                  events={filteredEvents}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={setSelectedEvent}
                  direction={slideDirection}
                />
              </motion.div>
            )}
            {viewMode === 'week' && (
              <motion.div
                key="week"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <CalendarWeekView
                  currentDate={weekStart}
                  selectedDate={selectedDate}
                  events={filteredEvents}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={setSelectedEvent}
                  weekStartsOn={1}
                  direction={slideDirection}
                />
              </motion.div>
            )}
            {viewMode === 'day' && (
              <motion.div
                key="day"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <CalendarDayView
                  currentDate={selectedDate}
                  events={filteredEvents}
                  onSelectEvent={setSelectedEvent}
                  direction={slideDirection}
                />
              </motion.div>
            )}
            {viewMode === 'agenda' && (
              <motion.div
                key="agenda"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <CalendarAgendaView
                  currentDate={selectedDate}
                  events={filteredEvents}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={setSelectedEvent}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Event detail panel - desktop */}
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

      {/* Event detail - mobile fullscreen */}
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
    </div>
  )
}
