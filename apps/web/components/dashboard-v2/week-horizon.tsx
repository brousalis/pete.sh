'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { WeekDayCell } from '@/components/dashboard-v2/week-day-cell'
import { useCooking } from '@/hooks/use-cooking-data'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import {
    generateFitnessEvents,
    generateMealPlanEvents,
    getEventsForDay,
} from '@/lib/utils/calendar-utils'
import {
    addDays,
    format,
    isSameDay,
    startOfWeek,
} from 'date-fns'
import { motion } from 'framer-motion'
import { useMemo } from 'react'

const DAY_KEYS: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]

interface WeekHorizonProps {
  onAddDinner?: (day: DayOfWeek) => void
  onRecipeClick?: (recipeId: string) => void
  onMarkCooked?: (day: DayOfWeek, meal: string, recipeId: string) => void
  onRemoveMeal?: (day: DayOfWeek, meal: string) => void
  onAddToShopping?: (recipeId: string) => void
  onRandomFill?: (day: DayOfWeek) => void
  onSkipDay?: (day: DayOfWeek) => void
  onUnskipDay?: (day: DayOfWeek) => void
  isSlotCompleted?: (day: DayOfWeek, meal: string) => { id: string } | undefined
  randomizingDay?: DayOfWeek | null
}

export function WeekHorizon({
  onAddDinner,
  onRecipeClick,
  onMarkCooked,
  onRemoveMeal,
  onAddToShopping,
  onRandomFill,
  onSkipDay,
  onUnskipDay,
  isSlotCompleted,
  randomizingDay,
}: WeekHorizonProps) {
  const { selectedDate, navigateToDay, routine, forecast, calendarEvents, mealPlan: dashboardMealPlan, recipes } = useDashboardV2()
  const cooking = useCooking()

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const forecastByDay = useMemo(() => {
    const map = new Map<string, number>()
    if (!forecast?.properties.periods) return map
    for (const period of forecast.properties.periods) {
      if (!period.isDaytime) continue
      const dayKey = format(new Date(period.startTime), 'yyyy-MM-dd')
      if (!map.has(dayKey)) map.set(dayKey, period.temperature)
    }
    return map
  }, [forecast])

  const weekEnd = addDays(weekStart, 6)
  const allEvents = useMemo(() => {
    const fitness = generateFitnessEvents(routine, weekStart, weekEnd)
    const meals = generateMealPlanEvents(cooking.mealPlan ?? dashboardMealPlan, recipes, weekStart, weekEnd)
    return [...meals, ...fitness, ...(calendarEvents ?? [])]
  }, [routine, cooking.mealPlan, dashboardMealPlan, recipes, calendarEvents, weekStart, weekEnd])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const date of weekDays) {
      const events = getEventsForDay(date, allEvents)
      map.set(format(date, 'yyyy-MM-dd'), events.length)
    }
    return map
  }, [weekDays, allEvents])

  const completedDays = useMemo(() => {
    if (!routine) return 0
    const weekNum = (() => {
      const soy = new Date(selectedDate.getFullYear(), 0, 1)
      const d = Math.floor((selectedDate.getTime() - soy.getTime()) / 86400000)
      return Math.ceil((d + soy.getDay() + 1) / 7)
    })()
    const week = routine.weeks.find(w => w.weekNumber === weekNum)
    if (!week) return 0
    let count = 0
    for (const d of DAY_KEYS) {
      const focus = routine.schedule[d]?.focus
      const isRest = focus === 'Rest' || focus === 'Active Recovery'
      const dayData = week.days[d]
      if (!dayData) continue
      const m = dayData.morningRoutine?.completed
      const n = dayData.nightRoutine?.completed
      const w = dayData.workout?.completed
      if (isRest ? m && n : m && w && n) count++
    }
    return count
  }, [routine, selectedDate])

  const momentumPct = (completedDays / 7) * 100

  return (
    <div className="border-b border-border">
      <div className="grid grid-cols-7 divide-x divide-border">
        {weekDays.map((date, i) => {
          const dayKey = DAY_KEYS[i]!
          const dateKey = format(date, 'yyyy-MM-dd')
          const tempF = forecastByDay.get(dateKey) ?? null
          return (
            <WeekDayCell
              key={dayKey}
              date={date}
              dayOfWeek={dayKey}
              isActive={isSameDay(date, selectedDate)}
              routine={routine}
              tempF={tempF}
              mealPlan={cooking.mealPlan ?? dashboardMealPlan}
              getRecipeById={cooking.getRecipeById}
              mealPlanMode={cooking.mealPlanMode}
              onAddDinner={onAddDinner}
              onRecipeClick={onRecipeClick}
              onMarkCooked={onMarkCooked}
              onRemoveMeal={onRemoveMeal}
              onAddToShopping={onAddToShopping}
              onRandomFill={onRandomFill}
              onSkipDay={onSkipDay}
              onUnskipDay={onUnskipDay}
              isSlotCompleted={isSlotCompleted}
              randomizingDay={randomizingDay}
              eventCount={eventsByDate.get(dateKey) ?? 0}
              onClick={() => {
                const dir = date > selectedDate ? 'forward' : 'backward'
                navigateToDay(date, dir)
              }}
            />
          )
        })}
      </div>
      {completedDays > 0 && (
        <div className="px-3 pb-1.5">
          <div className="h-[2px] rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green-500/60 to-green-400/40"
              initial={{ width: 0 }}
              animate={{ width: `${momentumPct}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
