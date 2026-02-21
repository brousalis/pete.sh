'use client'

import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  startOfDay,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { useCallback, useMemo, useState } from 'react'

type Granularity = 'day' | 'week' | 'month'

interface UseDateNavigationOptions {
  granularity: Granularity
  weekStartsOn?: 0 | 1
  initialDate?: Date
  constrainFuture?: boolean
}

export interface DateNavigation {
  currentDate: Date
  setDate: (date: Date) => void
  goToPrev: () => void
  goToNext: () => void
  goToToday: () => void
  isAtToday: boolean
  canGoNext: boolean
  canGoPrev: boolean
  label: string
}

function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  if (isSameMonth(weekStart, weekEnd)) {
    return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd')}`
  }
  return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`
}

function getLabel(date: Date, granularity: Granularity, weekStartsOn: 0 | 1): string {
  switch (granularity) {
    case 'day':
      return format(date, 'EEEE, MMM d')
    case 'week': {
      const ws = startOfWeek(date, { weekStartsOn })
      const we = addDays(ws, 6)
      return formatWeekLabel(ws, we)
    }
    case 'month':
      return format(date, 'MMMM yyyy')
  }
}

function checkIsAtToday(date: Date, granularity: Granularity, weekStartsOn: 0 | 1): boolean {
  const now = new Date()
  switch (granularity) {
    case 'day':
      return isSameDay(date, now)
    case 'week':
      return isSameWeek(date, now, { weekStartsOn })
    case 'month':
      return isSameMonth(date, now)
  }
}

export function useDateNavigation({
  granularity,
  weekStartsOn = 1,
  initialDate,
  constrainFuture = false,
}: UseDateNavigationOptions): DateNavigation {
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (initialDate) return initialDate
    if (granularity === 'week') return startOfWeek(new Date(), { weekStartsOn })
    if (granularity === 'day') return startOfDay(new Date())
    return new Date()
  })

  const setDate = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  const goToPrev = useCallback(() => {
    setCurrentDate(prev => {
      switch (granularity) {
        case 'day': return subDays(prev, 1)
        case 'week': return subWeeks(prev, 1)
        case 'month': return subMonths(prev, 1)
      }
    })
  }, [granularity])

  const goToNext = useCallback(() => {
    setCurrentDate(prev => {
      switch (granularity) {
        case 'day': return addDays(prev, 1)
        case 'week': return addWeeks(prev, 1)
        case 'month': return addMonths(prev, 1)
      }
    })
  }, [granularity])

  const goToToday = useCallback(() => {
    if (granularity === 'week') {
      setCurrentDate(startOfWeek(new Date(), { weekStartsOn }))
    } else if (granularity === 'day') {
      setCurrentDate(startOfDay(new Date()))
    } else {
      setCurrentDate(new Date())
    }
  }, [granularity, weekStartsOn])

  const isAtToday = useMemo(
    () => checkIsAtToday(currentDate, granularity, weekStartsOn),
    [currentDate, granularity, weekStartsOn]
  )

  const canGoNext = constrainFuture ? !isAtToday : true
  const canGoPrev = true

  const label = useMemo(
    () => getLabel(currentDate, granularity, weekStartsOn),
    [currentDate, granularity, weekStartsOn]
  )

  return {
    currentDate,
    setDate,
    goToPrev,
    goToNext,
    goToToday,
    isAtToday,
    canGoNext,
    canGoPrev,
    label,
  }
}
