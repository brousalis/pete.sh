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
export const EVENT_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  '1': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500',
  },
  '2': {
    bg: 'bg-green-500/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-500',
  },
  '3': {
    bg: 'bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500',
  },
  '4': {
    bg: 'bg-red-500/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-500',
  },
  '5': {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-500',
  },
  '6': {
    bg: 'bg-orange-500/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-500',
  },
  '7': {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-500',
  },
  '8': {
    bg: 'bg-gray-500/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-500',
  },
  '9': {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500',
  },
  '10': {
    bg: 'bg-pink-500/20',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-500',
  },
  '11': {
    bg: 'bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500',
  },
  // Fitness event colors - uses Dumbbell icon indicator
  fitness: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-400 border-l-orange-500',
  },
  'fitness-complete': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-400 border-l-emerald-500',
  },
  default: { bg: 'bg-brand/20', text: 'text-brand', border: 'border-brand' },
}

export function getEventColor(colorId?: string) {
  return EVENT_COLORS[colorId || 'default'] || EVENT_COLORS.default
}
