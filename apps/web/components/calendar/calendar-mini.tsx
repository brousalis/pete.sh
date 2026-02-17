'use client'

import { Button } from '@/components/ui/button'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type { DayOfWeek as CookingDayOfWeek, MealPlan } from '@/lib/types/cooking.types'
import type { DayOfWeek, WeeklyRoutine } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import { getEventsForDay } from '@/lib/utils/calendar-utils'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarMiniProps {
  currentDate: Date
  selectedDate: Date | null
  events: CalendarEvent[]
  fitnessRoutine?: WeeklyRoutine | null
  mealPlan?: MealPlan | null
  onSelectDate: (date: Date) => void
}

function getDayOfWeekFromDate(date: Date): DayOfWeek {
  return date
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as DayOfWeek
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  )
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

type FitnessStatus = 'complete' | 'partial' | 'rest' | 'none'

function getFitnessStatusForDay(
  date: Date,
  routine: WeeklyRoutine | null | undefined
): FitnessStatus {
  if (!routine) return 'none'

  const dayOfWeek = getDayOfWeekFromDate(date)
  const weekNumber = getWeekNumber(date)
  const schedule = routine.schedule[dayOfWeek]
  const week = routine.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  const isRestDay =
    schedule?.focus === 'Rest' || schedule?.focus === 'Active Recovery'

  if (isRestDay) {
    // For rest days, check if routines are done
    const morningDone = dayData?.morningRoutine?.completed
    const nightDone = dayData?.nightRoutine?.completed
    if (morningDone && nightDone) return 'complete'
    if (morningDone || nightDone) return 'partial'
    return 'rest'
  }

  // For workout days
  const workoutDone = dayData?.workout?.completed
  const morningDone = dayData?.morningRoutine?.completed
  const nightDone = dayData?.nightRoutine?.completed

  if (workoutDone && morningDone && nightDone) return 'complete'
  if (workoutDone || morningDone || nightDone) return 'partial'
  return 'none'
}

type MealPlanStatus = 'planned' | 'skipped' | 'none'

function getMealPlanStatusForDay(
  date: Date,
  mealPlan: MealPlan | null | undefined
): MealPlanStatus {
  if (!mealPlan?.meals) return 'none'

  const dayMap: Record<number, CookingDayOfWeek> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }
  const dayOfWeek = dayMap[date.getDay()] as CookingDayOfWeek
  const dayMeals = mealPlan.meals[dayOfWeek]

  if (!dayMeals) return 'none'
  if (dayMeals.skipped) return 'skipped'

  const hasMeals =
    dayMeals.breakfast || dayMeals.lunch || dayMeals.dinner || dayMeals.snack
  return hasMeals ? 'planned' : 'none'
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function CalendarMini({
  currentDate,
  selectedDate,
  events,
  fitnessRoutine,
  mealPlan,
  onSelectDate,
}: CalendarMiniProps) {
  // Get all days in the current month that have events
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysWithEvents = new Set<string>()

  eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach(day => {
    const dayEvents = getEventsForDay(day, events)
    if (dayEvents.length > 0) {
      daysWithEvents.add(format(day, 'yyyy-MM-dd'))
    }
  })

  // Get calendar grid days (including days from prev/next months to fill the grid)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  // Group days into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const handlePrevMonth = () => {
    onSelectDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    onSelectDate(addMonths(currentDate, 1))
  }

  return (
    <div className="border-border/50 bg-card shrink-0 rounded-xl border p-3">
      {/* Header with navigation */}
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handlePrevMonth}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(currentDate, 'MMMM yyyy')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleNextMonth}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-0">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="text-muted-foreground/80 py-1 text-center text-[10px] font-semibold"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid gap-0.5">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-0">
            {week.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const hasEvents = daysWithEvents.has(dateKey)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())
              const isPast = day < new Date() && !isToday

              // Get fitness status for the day
              const fitnessStatus = isCurrentMonth
                ? getFitnessStatusForDay(day, fitnessRoutine)
                : 'none'

              // Get meal plan status for the day
              const mealPlanStatus = isCurrentMonth
                ? getMealPlanStatusForDay(day, mealPlan)
                : 'none'

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-md text-xs font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    !isCurrentMonth && 'text-muted-foreground/50',
                    isToday &&
                      !isSelected &&
                      'bg-brand/15 text-brand font-semibold',
                    isSelected &&
                      'bg-brand hover:bg-brand text-white hover:text-white font-semibold'
                  )}
                >
                  {day.getDate()}
                  {/* Indicator dots container */}
                  <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                    {/* Calendar event dot */}
                    {hasEvents && !isSelected && isCurrentMonth && (
                      <span className="bg-brand size-1 rounded-full" />
                    )}
                    {/* Fitness status dot */}
                    {!isSelected &&
                      isCurrentMonth &&
                      fitnessStatus !== 'none' && (
                        <span
                          className={cn(
                            'size-1 rounded-full',
                            fitnessStatus === 'complete' && 'bg-green-500',
                            fitnessStatus === 'partial' && 'bg-amber-400',
                            fitnessStatus === 'rest' && 'bg-slate-400'
                          )}
                        />
                      )}
                    {/* Meal plan status dot */}
                    {!isSelected &&
                      isCurrentMonth &&
                      mealPlanStatus !== 'none' && (
                        <span
                          className={cn(
                            'size-1 rounded-full',
                            mealPlanStatus === 'planned' && 'bg-teal-500',
                            mealPlanStatus === 'skipped' && 'bg-slate-400'
                          )}
                        />
                      )}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
