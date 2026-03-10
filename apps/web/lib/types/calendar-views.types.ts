/**
 * Enhanced Calendar View Types
 * Types for the redesigned calendar with multiple view modes
 */

import type { CalendarEvent } from './calendar.types'

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda'

export interface CalendarViewState {
  currentDate: Date
  viewMode: CalendarViewMode
  selectedDate: Date | null
  selectedEvent: CalendarEvent | null
}

export interface DayCell {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isWeekend: boolean
  events: CalendarEvent[]
}

export interface WeekDay {
  date: Date
  dayName: string
  dayNumber: number
  isToday: boolean
  isSelected: boolean
  events: CalendarEvent[]
}

export interface TimeSlot {
  hour: number
  label: string
  events: CalendarEvent[]
}

export interface EventPosition {
  event: CalendarEvent
  top: number
  height: number
  left: number
  width: number
  column: number
  totalColumns: number
}

export interface CalendarFilters {
  searchQuery: string
  showAllDayEvents: boolean
  showTimedEvents: boolean
}

export {
  CALENDAR_EVENT_COLORS as EVENT_COLORS,
  getEventColor,
} from '@/lib/constants/colors'
