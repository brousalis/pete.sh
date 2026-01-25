/**
 * Calendar Utility Functions
 * Helper functions for calendar views and event management
 */

import type { DayCell, EventPosition, TimeSlot, WeekDay } from "@/lib/types/calendar-views.types"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getHours,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks
} from "date-fns"

/**
 * Get all days to display in a month view (including days from prev/next months)
 */
export function getMonthDays(
  date: Date,
  selectedDate: Date | null,
  events: CalendarEvent[]
): DayCell[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return days.map((day) => ({
    date: day,
    isCurrentMonth: isSameMonth(day, date),
    isToday: isToday(day),
    isSelected: selectedDate ? isSameDay(day, selectedDate) : false,
    isWeekend: isWeekend(day),
    events: getEventsForDay(day, events),
  }))
}

/**
 * Get days for a week view
 */
export function getWeekDays(
  date: Date,
  selectedDate: Date | null,
  events: CalendarEvent[]
): WeekDay[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 })
  const days = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  })

  return days.map((day) => ({
    date: day,
    dayName: format(day, "EEE"),
    dayNumber: day.getDate(),
    isToday: isToday(day),
    isSelected: selectedDate ? isSameDay(day, selectedDate) : false,
    events: getEventsForDay(day, events),
  }))
}

/**
 * Get events that occur on a specific day
 */
export function getEventsForDay(day: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)

  return events.filter((event) => {
    const eventStart = getEventStartDate(event)
    const eventEnd = getEventEndDate(event)

    if (!eventStart) return false

    // For all-day events, check if the day falls within the event range
    if (isAllDayEvent(event)) {
      // All-day events: end date is exclusive in Google Calendar
      const effectiveEnd = eventEnd ? subDays(eventEnd, 1) : eventStart
      return (
        (isSameDay(day, eventStart) || isAfter(day, eventStart)) &&
        (isSameDay(day, effectiveEnd) || isBefore(day, effectiveEnd))
      )
    }

    // For timed events, check if the event overlaps with the day
    return isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
           (eventEnd && isWithinInterval(dayEnd, { start: eventStart, end: eventEnd })) ||
           (eventEnd && isBefore(eventStart, dayStart) && isAfter(eventEnd, dayEnd))
  })
}

/**
 * Get time slots for a day view (hourly)
 */
export function getTimeSlots(day: Date, events: CalendarEvent[]): TimeSlot[] {
  const slots: TimeSlot[] = []

  for (let hour = 0; hour < 24; hour++) {
    const slotEvents = events.filter((event) => {
      if (isAllDayEvent(event)) return false
      const eventStart = getEventStartDate(event)
      if (!eventStart) return false
      return isSameDay(eventStart, day) && getHours(eventStart) === hour
    })

    slots.push({
      hour,
      label: format(new Date().setHours(hour, 0, 0, 0), "h a"),
      events: slotEvents,
    })
  }

  return slots
}

/**
 * Calculate event positions for day/week view (handles overlapping events)
 */
export function calculateEventPositions(
  events: CalendarEvent[],
  day: Date,
  startHour: number = 0,
  endHour: number = 24
): EventPosition[] {
  const timedEvents = events.filter((e) => !isAllDayEvent(e))
  const dayStart = startOfDay(day)

  // Sort events by start time, then by duration (longer events first)
  const sortedEvents = [...timedEvents].sort((a, b) => {
    const aStart = getEventStartDate(a)
    const bStart = getEventStartDate(b)
    if (!aStart || !bStart) return 0

    const startDiff = aStart.getTime() - bStart.getTime()
    if (startDiff !== 0) return startDiff

    const aDuration = getEventDuration(a)
    const bDuration = getEventDuration(b)
    return bDuration - aDuration // Longer events first
  })

  const positions: EventPosition[] = []
  const columns: { event: CalendarEvent; end: Date }[][] = []

  sortedEvents.forEach((event) => {
    const eventStart = getEventStartDate(event)
    const eventEnd = getEventEndDate(event)
    if (!eventStart || !eventEnd) return

    // Find a column for this event
    let columnIndex = columns.findIndex((column) =>
      column.every((item) => isBefore(item.end, eventStart) || isSameDay(item.end, eventStart) && item.end <= eventStart)
    )

    if (columnIndex === -1) {
      columnIndex = columns.length
      columns.push([])
    }

    columns[columnIndex]?.push({ event, end: eventEnd })

    // Calculate position
    const minutesFromStart = differenceInMinutes(eventStart, dayStart)
    const duration = differenceInMinutes(eventEnd, eventStart)
    const hourHeight = 60 // pixels per hour
    const minuteHeight = hourHeight / 60

    positions.push({
      event,
      top: (minutesFromStart - startHour * 60) * minuteHeight,
      height: Math.max(duration * minuteHeight, 24), // Minimum height
      left: 0, // Will be calculated after all events are processed
      width: 100, // Will be calculated after all events are processed
      column: columnIndex,
      totalColumns: 0, // Will be calculated after all events are processed
    })
  })

  // Update widths and positions based on total columns
  const totalColumns = columns.length
  positions.forEach((pos) => {
    pos.totalColumns = totalColumns
    pos.width = totalColumns > 0 ? 100 / totalColumns : 100
    pos.left = pos.column * pos.width
  })

  return positions
}

/**
 * Check if an event is an all-day event
 */
export function isAllDayEvent(event: CalendarEvent): boolean {
  return !event.start.dateTime && !!event.start.date
}

/**
 * Get event start date
 */
export function getEventStartDate(event: CalendarEvent): Date | null {
  if (event.start.dateTime) {
    return parseISO(event.start.dateTime)
  }
  if (event.start.date) {
    // Parse all-day date as local date
    const [year, month, day] = event.start.date.split("-").map(Number)
    if (year !== undefined && month !== undefined && day !== undefined) {
      return new Date(year, month - 1, day)
    }
  }
  return null
}

/**
 * Get event end date
 */
export function getEventEndDate(event: CalendarEvent): Date | null {
  if (event.end.dateTime) {
    return parseISO(event.end.dateTime)
  }
  if (event.end.date) {
    // Parse all-day date as local date
    const [year, month, day] = event.end.date.split("-").map(Number)
    if (year !== undefined && month !== undefined && day !== undefined) {
      return new Date(year, month - 1, day)
    }
  }
  return null
}

/**
 * Get event duration in minutes
 */
export function getEventDuration(event: CalendarEvent): number {
  const start = getEventStartDate(event)
  const end = getEventEndDate(event)
  if (!start || !end) return 0
  return differenceInMinutes(end, start)
}

/**
 * Format event time for display
 */
export function formatEventTime(event: CalendarEvent): string {
  if (isAllDayEvent(event)) {
    return "All day"
  }

  const start = getEventStartDate(event)
  const end = getEventEndDate(event)

  if (!start) return ""

  if (end && !isSameDay(start, end)) {
    return `${format(start, "MMM d, h:mm a")} - ${format(end, "MMM d, h:mm a")}`
  }

  if (end) {
    return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`
  }

  return format(start, "h:mm a")
}

/**
 * Navigation helpers
 */
export function navigateDate(
  date: Date,
  direction: "prev" | "next",
  viewMode: "month" | "week" | "day" | "agenda"
): Date {
  switch (viewMode) {
    case "month":
      return direction === "next" ? addMonths(date, 1) : subMonths(date, 1)
    case "week":
      return direction === "next" ? addWeeks(date, 1) : subWeeks(date, 1)
    case "day":
    case "agenda":
      return direction === "next" ? addDays(date, 1) : subDays(date, 1)
    default:
      return date
  }
}

/**
 * Get the title for the current view
 */
export function getViewTitle(date: Date, viewMode: "month" | "week" | "day" | "agenda"): string {
  switch (viewMode) {
    case "month":
      return format(date, "MMMM yyyy")
    case "week":
      const weekStart = startOfWeek(date, { weekStartsOn: 0 })
      const weekEnd = addDays(weekStart, 6)
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`
      }
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    case "day":
      return format(date, "EEEE, MMMM d, yyyy")
    case "agenda":
      return `Upcoming - ${format(date, "MMMM yyyy")}`
    default:
      return format(date, "MMMM yyyy")
  }
}

/**
 * Filter events by search query
 */
export function filterEvents(events: CalendarEvent[], searchQuery: string): CalendarEvent[] {
  if (!searchQuery.trim()) return events

  const query = searchQuery.toLowerCase()
  return events.filter(
    (event) =>
      event.summary?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
  )
}

/**
 * Group events by date for agenda view
 */
export function groupEventsByDate(
  events: CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()

  events.forEach((event) => {
    const start = getEventStartDate(event)
    if (!start) return

    const dateKey = format(start, "yyyy-MM-dd")
    const existing = grouped.get(dateKey) || []
    existing.push(event)
    grouped.set(dateKey, existing)
  })

  // Sort events within each day
  grouped.forEach((dayEvents, key) => {
    grouped.set(
      key,
      dayEvents.sort((a, b) => {
        const aAllDay = isAllDayEvent(a)
        const bAllDay = isAllDayEvent(b)
        if (aAllDay && !bAllDay) return -1
        if (!aAllDay && bAllDay) return 1
        const aStart = getEventStartDate(a)
        const bStart = getEventStartDate(b)
        if (!aStart || !bStart) return 0
        return aStart.getTime() - bStart.getTime()
      })
    )
  })

  return grouped
}
