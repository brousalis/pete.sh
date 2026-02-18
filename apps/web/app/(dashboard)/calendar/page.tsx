'use client'

import {
    CalendarAgendaView,
    CalendarDayView,
    CalendarEventDetail,
    CalendarFitnessSidebar,
    CalendarHeader,
    CalendarMealPlanSidebar,
    CalendarMini,
    CalendarMobileInfo,
    CalendarMonthGrid,
    CalendarWeekView,
} from '@/components/calendar'
import { useConnectivity } from '@/components/connectivity-provider'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSwipe } from '@/hooks/use-swipe'
import { apiGet } from '@/lib/api/client'
import type { CalendarViewMode } from '@/lib/types/calendar-views.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type { MealPlan, Recipe } from '@/lib/types/cooking.types'
import type { ConsistencyStats, WeeklyRoutine } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import {
    filterEvents,
    generateFitnessEvents,
    generateMealPlanEvents,
    navigateDate,
} from '@/lib/utils/calendar-utils'
import { format, isSameDay, startOfWeek } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Calendar, Database, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface CalendarResponse {
  events: CalendarEvent[]
  source: 'live' | 'cache' | 'none'
  authenticated: boolean
  authAvailable: boolean
  authUrl?: string
  message?: string
}

export default function CalendarPage() {
  // State
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [searchQuery, setSearchQuery] = useState('')
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>(
    'right'
  )
  const [showMiniCalendar, setShowMiniCalendar] = useState(true)
  const [mobileInfoActive, setMobileInfoActive] = useState(false)
  const [source, setSource] = useState<'live' | 'cache' | 'none'>('none')
  const [authAvailable, setAuthAvailable] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)

  // Fitness state
  const [fitnessRoutine, setFitnessRoutine] = useState<WeeklyRoutine | null>(
    null
  )
  const [consistencyStats, setConsistencyStats] =
    useState<ConsistencyStats | null>(null)
  const [fitnessLoading, setFitnessLoading] = useState(true)

  // Meal plan state
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [mealPlanLoading, setMealPlanLoading] = useState(true)

  const searchParams = useSearchParams()
  const hasTriedRetry = useRef(false)
  const { isInitialized: isConnectivityInitialized } = useConnectivity()

  // Fetch events with optional retry for post-OAuth race condition
  const fetchEvents = useCallback(
    async (retryOnFailure = false): Promise<boolean> => {
      try {
        setLoading(true)
        setError(null)
        const response = await apiGet<CalendarResponse>(
          '/api/calendar/upcoming?maxResults=100'
        )

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch events')
        }

        if (response.data) {
          setEvents(response.data.events || [])
          setSource(response.data.source || 'none')
          setAuthAvailable(response.data.authAvailable || false)
          setAuthUrl(response.data.authUrl || null)

          // Return true if we got authenticated data
          return response.data.source === 'live' || response.data.authenticated
        }
        return false
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load calendar events'
        )
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Fetch fitness data
  const fetchFitnessData = useCallback(async () => {
    try {
      setFitnessLoading(true)
      const [routineRes, consistencyRes] = await Promise.all([
        apiGet<WeeklyRoutine>('/api/fitness/routine'),
        apiGet<ConsistencyStats>('/api/fitness/consistency'),
      ])

      if (routineRes.success && routineRes.data) {
        setFitnessRoutine(routineRes.data)
      }

      if (consistencyRes.success && consistencyRes.data) {
        setConsistencyStats(consistencyRes.data)
      }
    } catch (err) {
      console.error('Failed to fetch fitness data:', err)
    } finally {
      setFitnessLoading(false)
    }
  }, [])

  // Fetch meal plan data for the current week (no cache — always fresh from DB)
  const fetchMealPlanData = useCallback(async (date: Date) => {
    try {
      setMealPlanLoading(true)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')

      const [mealPlanRes, recipesRes] = await Promise.all([
        apiGet<MealPlan>(`/api/cooking/meal-plans?week_start=${weekStartStr}`, {
          cache: 'no-store',
        }),
        apiGet<Recipe[]>('/api/cooking/recipes', { cache: 'no-store' }),
      ])

      if (mealPlanRes.success && mealPlanRes.data) {
        setMealPlan(mealPlanRes.data)
      } else {
        setMealPlan(null)
      }

      if (recipesRes.success && recipesRes.data) {
        setRecipes(recipesRes.data)
      }
    } catch (err) {
      console.error('Failed to fetch meal plan data:', err)
    } finally {
      setMealPlanLoading(false)
    }
  }, [])

  // Week key for the currently viewed week (Monday-based) — refetch meal plan when it changes
  const currentWeekKey = useMemo(
    () => format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    [currentDate]
  )

  useEffect(() => {
    // Wait for connectivity check to complete before fetching
    // This ensures we use the correct API base URL (local vs prod)
    if (!isConnectivityInitialized) {
      return
    }

    const init = async () => {
      const isAuthSuccess = searchParams.get('auth') === 'success'

      // Fetch calendar and fitness in parallel; meal plan is loaded by week-change effect below
      const [gotAuthData] = await Promise.all([
        fetchEvents(),
        fetchFitnessData(),
      ])

      // If this is a fresh OAuth redirect and we didn't get auth data,
      // retry once after a short delay (handles race condition with token storage)
      if (isAuthSuccess && !gotAuthData && !hasTriedRetry.current) {
        hasTriedRetry.current = true
        console.log('[Calendar] Post-OAuth: retrying fetch after delay...')
        await new Promise(resolve => setTimeout(resolve, 500))
        await fetchEvents()
      }
    }

    init()
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchEvents()
      fetchFitnessData()
      fetchMealPlanData(currentDate)
    }, 300000)
    return () => clearInterval(interval)
  }, [fetchEvents, fetchFitnessData, fetchMealPlanData, searchParams, isConnectivityInitialized])

  // Refetch meal plan when user navigates to a different week (sidebar + meal plan events)
  useEffect(() => {
    if (!isConnectivityInitialized) return
    fetchMealPlanData(currentDate)
  }, [currentWeekKey, isConnectivityInitialized, fetchMealPlanData, currentDate])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case 'ArrowLeft':
          handleDateChange(
            new Date(
              currentDate.getTime() - getDaysToNavigate() * 24 * 60 * 60 * 1000
            ),
            'left'
          )
          break
        case 'ArrowRight':
          handleDateChange(
            new Date(
              currentDate.getTime() + getDaysToNavigate() * 24 * 60 * 60 * 1000
            ),
            'right'
          )
          break
        case 't':
        case 'T':
          handleDateChange(new Date())
          break
        case 'Escape':
          setSelectedEvent(null)
          break
        case 'm':
        case 'M':
          setViewMode('month')
          break
        case 'w':
        case 'W':
          setViewMode('week')
          break
        case 'd':
        case 'D':
          setViewMode('day')
          break
        case 'a':
        case 'A':
          setViewMode('agenda')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentDate, viewMode])

  const getDaysToNavigate = () => {
    switch (viewMode) {
      case 'month':
        return 30
      case 'week':
        return 7
      case 'day':
      case 'agenda':
        return 1
      default:
        return 1
    }
  }

  // Handlers
  const handleDateChange = (date: Date, direction?: 'left' | 'right') => {
    if (direction) {
      setSlideDirection(direction)
    }
    setCurrentDate(date)
    setSelectedDate(date)
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    // If in month view and clicking a date, optionally switch to day view
    // Or just highlight the date - depends on UX preference
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const handleCloseEventDetail = () => {
    setSelectedEvent(null)
  }

  const handleToggleMobileInfo = () => {
    setMobileInfoActive(prev => !prev)
  }

  const handleViewModeChange = (mode: CalendarViewMode) => {
    setViewMode(mode)
    // When switching to a calendar view mode, dismiss mobile info panel
    setMobileInfoActive(false)
  }

  const handleNavigateToDateFromDetail = (date: Date) => {
    setCurrentDate(date)
    setSelectedDate(date)
    setViewMode('day')
    setSelectedEvent(null)
  }

  // Generate fitness events for the current view's date range
  const fitnessEvents = useMemo(() => {
    if (!fitnessRoutine) return []

    // Get a generous date range for the view (1 month before and after current date)
    const startDate = new Date(currentDate)
    startDate.setMonth(startDate.getMonth() - 1)
    const endDate = new Date(currentDate)
    endDate.setMonth(endDate.getMonth() + 1)

    return generateFitnessEvents(fitnessRoutine, startDate, endDate)
  }, [fitnessRoutine, currentDate])

  // Generate meal plan events for the current week
  const mealPlanEvents = useMemo(() => {
    if (!mealPlan) return []

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    return generateMealPlanEvents(mealPlan, recipes, weekStart, weekEnd)
  }, [mealPlan, recipes, currentDate])

  // Merge calendar events with fitness and meal plan events
  const allEvents = useMemo(() => {
    return [...events, ...fitnessEvents, ...mealPlanEvents]
  }, [events, fitnessEvents, mealPlanEvents])

  // Filter events based on search
  const filteredEvents = filterEvents(allEvents, searchQuery)

  // Events for the selected date (used in sidebar + mobile info)
  const selectedDateEvents = useMemo(() => {
    const dateToCheck = selectedDate || new Date()
    return filterEvents(
      events.filter(e => {
        const eventStart = e.start.dateTime
          ? new Date(e.start.dateTime)
          : e.start.date
            ? new Date(e.start.date)
            : null
        if (!eventStart) return false
        return isSameDay(eventStart, dateToCheck)
      }),
      searchQuery
    ).slice(0, 8)
  }, [events, selectedDate, searchQuery])

  // Swipe handlers for touch navigation
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      const newDate = navigateDate(currentDate, 'next', viewMode)
      handleDateChange(newDate, 'right')
    },
    onSwipeRight: () => {
      const newDate = navigateDate(currentDate, 'prev', viewMode)
      handleDateChange(newDate, 'left')
    },
  })

  // Render error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
            <AlertCircle className="text-destructive size-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Unable to Load Calendar</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
          <Button
            onClick={() => fetchEvents()}
            variant="outline"
            className="mt-2"
          >
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Show connect prompt if no events and auth is available
  const showConnectPrompt =
    events.length === 0 &&
    authAvailable &&
    (source === 'cache' || source === 'none')

  return (
    <div className="-m-3 flex h-[calc(100%+24px)] flex-col overflow-hidden sm:-m-5 sm:h-[calc(100%+40px)] md:-mx-6 md:-my-6 md:h-[calc(100%+48px)]">
      {/* Header */}
      <div className="relative">
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          searchQuery={searchQuery}
          isLoading={loading}
          mobileInfoActive={mobileInfoActive}
          onDateChange={handleDateChange}
          onViewModeChange={handleViewModeChange}
          onSearchChange={setSearchQuery}
          onRefresh={fetchEvents}
          onToggleMobileInfo={handleToggleMobileInfo}
        />
        {/* Source indicator and auth button */}
        <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
          {source === 'cache' && (
            <span
              className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
              title="Showing cached data"
            >
              <Database className="size-2.5" />
              cached
            </span>
          )}
          {authAvailable && !source.includes('live') && authUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = authUrl)}
              className="h-7 gap-1.5 text-xs"
            >
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* Main content area - optimized for iPad Mini horizontal (1024x768) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Mini calendar, fitness, and upcoming (hidden on small screens, shown on tablet+) */}
        <aside
          className={cn(
            'border-border/50 bg-card/30 hidden shrink-0 flex-col gap-3 overflow-hidden border-r p-3 md:flex',
            'w-[250px] lg:w-[270px]'
          )}
        >
          {/* Mini Calendar */}
          <CalendarMini
            currentDate={currentDate}
            selectedDate={selectedDate}
            events={events}
            fitnessRoutine={fitnessRoutine}
            mealPlan={mealPlan}
            onSelectDate={date => {
              handleSelectDate(date)
              handleDateChange(date)
            }}
          />

          {/* Fitness Sidebar */}
          <CalendarFitnessSidebar
            routine={fitnessRoutine}
            consistencyStats={consistencyStats}
            selectedDate={selectedDate}
            loading={fitnessLoading}
          />

          {/* Meal Plan Sidebar */}
          <CalendarMealPlanSidebar
            mealPlan={mealPlan}
            recipes={recipes}
            selectedDate={selectedDate}
            loading={mealPlanLoading}
          />

          {/* Today's Events Quick View */}
          <div className="border-border/50 bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
            <div className="border-border/50 shrink-0 border-b px-3 py-2">
              <h3 className="text-xs font-semibold">
                {selectedDate && isSameDay(selectedDate, new Date())
                  ? "Today's Events"
                  : selectedDate
                    ? `Events on ${format(selectedDate, 'MMM d')}`
                    : 'Upcoming Events'}
              </h3>
            </div>
            <ScrollArea className="flex-1 p-2">
              <UpcomingEventsList
                events={selectedDateEvents.slice(0, 5)}
                onSelectEvent={handleSelectEvent}
              />
            </ScrollArea>
          </div>
        </aside>

        {/* Main calendar view */}
        <main className="flex flex-1 overflow-hidden">
          {/* Mobile Info Panel - shown when info tab is active on mobile */}
          {mobileInfoActive && (
            <div className="flex-1 overflow-hidden md:hidden">
              <CalendarMobileInfo
                routine={fitnessRoutine}
                consistencyStats={consistencyStats}
                selectedDate={selectedDate}
                loading={fitnessLoading}
                todayEvents={selectedDateEvents}
                onSelectEvent={handleSelectEvent}
                mealPlan={mealPlan}
                recipes={recipes}
                mealPlanLoading={mealPlanLoading}
              />
            </div>
          )}

          {/* Calendar grid/view - with swipe gestures for touch navigation */}
          <div
            className={cn(
              'bg-background flex-1 touch-pan-y overflow-hidden',
              selectedEvent && 'lg:flex-[2]',
              mobileInfoActive && 'hidden md:flex md:flex-1'
            )}
            {...swipeHandlers}
          >
            {loading && events.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="text-muted-foreground size-8 animate-spin" />
                  <p className="text-muted-foreground text-sm">
                    Loading calendar...
                  </p>
                </div>
              </div>
            ) : showConnectPrompt ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="flex max-w-md flex-col items-center gap-4 text-center">
                  <div className="bg-muted flex size-16 items-center justify-center rounded-full">
                    <Calendar className="text-muted-foreground size-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      Connect Your Calendar
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      Connect Google Calendar to see your events in real-time.
                    </p>
                  </div>
                  {authUrl && (
                    <Button
                      onClick={() => (window.location.href = authUrl)}
                      className="mt-2"
                    >
                      <Calendar className="mr-2 size-4" />
                      Connect Google Calendar
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {viewMode === 'month' && (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    <CalendarMonthGrid
                      currentDate={currentDate}
                      selectedDate={selectedDate}
                      events={filteredEvents}
                      onSelectDate={handleSelectDate}
                      onSelectEvent={handleSelectEvent}
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
                      currentDate={currentDate}
                      selectedDate={selectedDate}
                      events={filteredEvents}
                      onSelectDate={handleSelectDate}
                      onSelectEvent={handleSelectEvent}
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
                      currentDate={selectedDate || currentDate}
                      events={filteredEvents}
                      onSelectEvent={handleSelectEvent}
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
                      currentDate={currentDate}
                      events={filteredEvents}
                      onSelectDate={handleSelectDate}
                      onSelectEvent={handleSelectEvent}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Event detail panel - desktop: slides in from right */}
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
        </main>
      </div>

      {/* Event detail panel - mobile: fullscreen overlay */}
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

// Helper component for the sidebar upcoming events list
function UpcomingEventsList({
  events,
  onSelectEvent,
}: {
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}) {
  if (events.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-center">
        <div className="text-muted-foreground text-sm">
          <Calendar className="mx-auto mb-2 size-6 opacity-50" />
          No events
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {events.map(event => {
        const startTime = event.start.dateTime
          ? format(new Date(event.start.dateTime), 'h:mm a')
          : 'All day'

        return (
          <button
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className={cn(
              'border-border/50 w-full rounded-lg border px-2 py-1.5 text-left transition-all',
              'hover:border-brand/30 hover:bg-muted/50'
            )}
          >
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  'mt-1 size-1.5 shrink-0 rounded-full',
                  event.colorId ? `bg-chart-${event.colorId}` : 'bg-brand'
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">
                  {event.summary}
                </div>
                <div className="text-muted-foreground text-[10px]">
                  {startTime}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
