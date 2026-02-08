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

// Color mapping for calendar events
// Higher opacity backgrounds (30-35%) for better visibility on dark themes
export const EVENT_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  '1': {
    bg: 'bg-blue-500/30 dark:bg-blue-500/35',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-500',
  },
  '2': {
    bg: 'bg-green-500/30 dark:bg-green-500/35',
    text: 'text-green-800 dark:text-green-200',
    border: 'border-green-500',
  },
  '3': {
    bg: 'bg-purple-500/30 dark:bg-purple-500/35',
    text: 'text-purple-800 dark:text-purple-200',
    border: 'border-purple-500',
  },
  '4': {
    bg: 'bg-red-500/30 dark:bg-red-500/35',
    text: 'text-red-800 dark:text-red-200',
    border: 'border-red-500',
  },
  '5': {
    bg: 'bg-yellow-500/30 dark:bg-yellow-500/40',
    text: 'text-yellow-800 dark:text-yellow-200',
    border: 'border-yellow-500',
  },
  '6': {
    bg: 'bg-orange-500/30 dark:bg-orange-500/35',
    text: 'text-orange-800 dark:text-orange-200',
    border: 'border-orange-500',
  },
  '7': {
    bg: 'bg-cyan-500/30 dark:bg-cyan-500/35',
    text: 'text-cyan-800 dark:text-cyan-200',
    border: 'border-cyan-500',
  },
  '8': {
    bg: 'bg-gray-500/30 dark:bg-gray-500/40',
    text: 'text-gray-800 dark:text-gray-200',
    border: 'border-gray-500',
  },
  '9': {
    bg: 'bg-indigo-500/30 dark:bg-indigo-500/35',
    text: 'text-indigo-800 dark:text-indigo-200',
    border: 'border-indigo-500',
  },
  '10': {
    bg: 'bg-pink-500/30 dark:bg-pink-500/35',
    text: 'text-pink-800 dark:text-pink-200',
    border: 'border-pink-500',
  },
  '11': {
    bg: 'bg-rose-500/30 dark:bg-rose-500/35',
    text: 'text-rose-800 dark:text-rose-200',
    border: 'border-rose-500',
  },
  // Fitness event colors - uses Dumbbell icon indicator
  fitness: {
    bg: 'bg-orange-500/25 dark:bg-orange-500/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-400 border-l-orange-500',
  },
  'fitness-complete': {
    bg: 'bg-emerald-500/25 dark:bg-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-400 border-l-emerald-500',
  },
  default: { bg: 'bg-brand/30', text: 'text-brand', border: 'border-brand' },
}

export function getEventColor(colorId?: string) {
  return EVENT_COLORS[colorId || 'default'] || EVENT_COLORS.default
}
