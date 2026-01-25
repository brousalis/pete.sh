"use client"

import {
  CalendarAgendaView,
  CalendarDayView,
  CalendarEventDetail,
  CalendarHeader,
  CalendarMini,
  CalendarMonthGrid,
  CalendarWeekView,
} from "@/components/calendar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSwipe } from "@/hooks/use-swipe"
import type { CalendarViewMode } from "@/lib/types/calendar-views.types"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import { cn } from "@/lib/utils"
import { filterEvents, navigateDate } from "@/lib/utils/calendar-utils"
import { format, isSameDay } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Calendar, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

export default function CalendarPage() {
  // State
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week")
  const [searchQuery, setSearchQuery] = useState("")
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right")
  const [showMiniCalendar, setShowMiniCalendar] = useState(true)

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/calendar/upcoming?maxResults=100")

      if (!response.ok) {
        if (response.status === 401) {
          setError("not_authenticated")
          return
        }
        if (response.status === 400) {
          setError("Google Calendar not configured")
          return
        }
        throw new Error("Failed to fetch events")
      }

      const data = await response.json()
      if (data.success && data.data) {
        setEvents(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar events")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    // Refresh every 5 minutes
    const interval = setInterval(fetchEvents, 300000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case "ArrowLeft":
          handleDateChange(
            new Date(currentDate.getTime() - getDaysToNavigate() * 24 * 60 * 60 * 1000),
            "left"
          )
          break
        case "ArrowRight":
          handleDateChange(
            new Date(currentDate.getTime() + getDaysToNavigate() * 24 * 60 * 60 * 1000),
            "right"
          )
          break
        case "t":
        case "T":
          handleDateChange(new Date())
          break
        case "Escape":
          setSelectedEvent(null)
          break
        case "m":
        case "M":
          setViewMode("month")
          break
        case "w":
        case "W":
          setViewMode("week")
          break
        case "d":
        case "D":
          setViewMode("day")
          break
        case "a":
        case "A":
          setViewMode("agenda")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentDate, viewMode])

  const getDaysToNavigate = () => {
    switch (viewMode) {
      case "month":
        return 30
      case "week":
        return 7
      case "day":
      case "agenda":
        return 1
      default:
        return 1
    }
  }

  // Handlers
  const handleDateChange = (date: Date, direction?: "left" | "right") => {
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

  const handleNavigateToDateFromDetail = (date: Date) => {
    setCurrentDate(date)
    setSelectedDate(date)
    setViewMode("day")
    setSelectedEvent(null)
  }

  // Filter events based on search
  const filteredEvents = filterEvents(events, searchQuery)

  // Swipe handlers for touch navigation
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      const newDate = navigateDate(currentDate, "next", viewMode)
      handleDateChange(newDate, "right")
    },
    onSwipeRight: () => {
      const newDate = navigateDate(currentDate, "prev", viewMode)
      handleDateChange(newDate, "left")
    },
  })

  // Render error state
  if (error) {
    const isNotAuthenticated = error === "not_authenticated"

    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {isNotAuthenticated
                ? "Connect Your Calendar"
                : "Unable to Load Calendar"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isNotAuthenticated
                ? "Please authorize access to your Google Calendar to view your events."
                : error}
            </p>
          </div>
          {isNotAuthenticated ? (
            <Button
              onClick={() => (window.location.href = "/api/calendar/auth")}
              className="mt-2"
            >
              <Calendar className="mr-2 size-4" />
              Connect Google Calendar
            </Button>
          ) : (
            <Button onClick={fetchEvents} variant="outline" className="mt-2">
              <RefreshCw className="mr-2 size-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="-m-3 flex h-[calc(100%+24px)] flex-col overflow-hidden sm:-m-5 sm:h-[calc(100%+40px)] md:-mx-6 md:-my-6 md:h-[calc(100%+48px)]">
      {/* Header */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        searchQuery={searchQuery}
        isLoading={loading}
        onDateChange={handleDateChange}
        onViewModeChange={setViewMode}
        onSearchChange={setSearchQuery}
        onRefresh={fetchEvents}
      />

      {/* Main content area - optimized for iPad Mini horizontal (1024x768) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Mini calendar and upcoming (hidden on small screens, shown on tablet+) */}
        <aside
          className={cn(
            "hidden shrink-0 flex-col gap-3 overflow-hidden border-r border-border/50 bg-card/30 p-3 md:flex",
            "w-[250px] lg:w-[270px]"
          )}
        >
          {/* Mini Calendar */}
          <CalendarMini
            currentDate={currentDate}
            selectedDate={selectedDate}
            events={events}
            onSelectDate={(date) => {
              handleSelectDate(date)
              handleDateChange(date)
            }}
          />

          {/* Today's Events Quick View */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border/50 bg-card">
            <div className="shrink-0 border-b border-border/50 px-3 py-2">
              <h3 className="text-xs font-semibold">
                {selectedDate && isSameDay(selectedDate, new Date())
                  ? "Today's Events"
                  : selectedDate
                    ? `Events on ${format(selectedDate, "MMM d")}`
                    : "Upcoming Events"}
              </h3>
            </div>
            <ScrollArea className="flex-1 p-2">
              <UpcomingEventsList
                events={filterEvents(
                  events.filter((e) => {
                    if (!selectedDate) return true
                    const eventStart = e.start.dateTime
                      ? new Date(e.start.dateTime)
                      : e.start.date
                        ? new Date(e.start.date)
                        : null
                    if (!eventStart) return false
                    return isSameDay(eventStart, selectedDate)
                  }),
                  searchQuery
                ).slice(0, 5)}
                onSelectEvent={handleSelectEvent}
              />
            </ScrollArea>
          </div>
        </aside>

        {/* Main calendar view */}
        <main className="flex flex-1 overflow-hidden">
          {/* Calendar grid/view - with swipe gestures for touch navigation */}
          <div
            className={cn(
              "flex-1 overflow-hidden bg-background touch-pan-y",
              selectedEvent && "lg:flex-[2]"
            )}
            {...swipeHandlers}
          >
            {loading && events.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Loading calendar...
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {viewMode === "month" && (
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
                {viewMode === "week" && (
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
                {viewMode === "day" && (
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
                {viewMode === "agenda" && (
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

          {/* Event detail panel (slides in from right) */}
          <AnimatePresence>
            {selectedEvent && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 overflow-hidden border-l border-border/50"
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
        <div className="text-sm text-muted-foreground">
          <Calendar className="mx-auto mb-2 size-6 opacity-50" />
          No events
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {events.map((event) => {
        const startTime = event.start.dateTime
          ? format(new Date(event.start.dateTime), "h:mm a")
          : "All day"

        return (
          <button
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className={cn(
              "w-full rounded-lg border border-border/50 px-2 py-1.5 text-left transition-all",
              "hover:border-brand/30 hover:bg-muted/50"
            )}
          >
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  "mt-1 size-1.5 shrink-0 rounded-full",
                  event.colorId ? `bg-chart-${event.colorId}` : "bg-brand"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">
                  {event.summary}
                </div>
                <div className="text-[10px] text-muted-foreground">{startTime}</div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
