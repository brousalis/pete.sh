'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getFocusConfig } from '@/lib/constants/fitness-colors'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

const DAY_KEYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

/** Normalize focus to rough intensity for the volume bar. */
function focusIntensity(focus: string | undefined): number {
  switch (focus) {
    case 'HIIT':
    case 'Hybrid':
      return 1
    case 'Strength':
    case 'Circuit':
      return 0.85
    case 'Endurance':
      return 0.75
    case 'Core/Posture':
    case 'Core':
      return 0.5
    case 'Active Recovery':
      return 0.25
    case 'Rest':
    default:
      return 0
  }
}

function computeWeekNumber(date: Date): number {
  const soy = new Date(date.getFullYear(), 0, 1)
  const d = Math.floor((date.getTime() - soy.getTime()) / 86400000)
  return Math.ceil((d + soy.getDay() + 1) / 7)
}

export function WeekRail() {
  const { selectedDate, navigateToDay, routine } = useDashboardV3()
  const [viewWeek, setViewWeek] = useState(() =>
    startOfWeek(selectedDate, { weekStartsOn: 1 })
  )

  const weekStart = useMemo(
    () => startOfWeek(viewWeek, { weekStartsOn: 1 }),
    [viewWeek]
  )

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  return (
    <div className="flex flex-col gap-2 p-2 min-h-0">
      {/* Week header with prev/next */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setViewWeek(subWeeks(viewWeek, 1))}
          className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          W{computeWeekNumber(weekStart)}
        </span>
        <button
          type="button"
          onClick={() => setViewWeek(addWeeks(viewWeek, 1))}
          className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      {/* 7 day cells */}
      <div className="flex flex-col gap-1">
        {weekDays.map((date, i) => {
          const dayKey = DAY_KEYS[i]!
          const isActive = isSameDay(date, selectedDate)
          const isToday = isSameDay(date, new Date())
          const isPast = date < new Date() && !isToday
          const schedule = routine?.schedule[dayKey]
          const focus = schedule?.focus || 'Rest'
          const focusConfig = getFocusConfig(focus)
          const intensity = focusIntensity(focus)
          const isRest = focus === 'Rest' || focus === 'Active Recovery'

          const weekNumber = computeWeekNumber(date)
          const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
          const dayData = week?.days[dayKey]
          const morningDone = dayData?.morningRoutine?.completed || false
          const workoutDone = dayData?.workout?.completed || false
          const nightDone = dayData?.nightRoutine?.completed || false

          const completionDots = isRest
            ? [morningDone, nightDone]
            : [morningDone, workoutDone, nightDone]
          const allDone =
            completionDots.length > 0 && completionDots.every(Boolean)
          const someMissed =
            isPast && !allDone && completionDots.some(d => !d)

          return (
            <Tooltip key={dayKey}>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  onClick={() => {
                    const dir = date > selectedDate ? 'forward' : 'backward'
                    navigateToDay(date, dir)
                  }}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ x: 2 }}
                  className={cn(
                    'relative flex flex-col items-stretch gap-1 px-2 py-2 rounded-md border transition-all',
                    isActive
                      ? cn(
                          'bg-card border-border shadow-sm',
                          focusConfig.bgStrong
                        )
                      : 'border-transparent hover:bg-muted/40',
                    allDone && isPast && !isActive && 'bg-accent-sage/[0.06]'
                  )}
                >
                  {/* Active left accent */}
                  {isActive && (
                    <motion.div
                      layoutId="week-rail-active"
                      className={cn(
                        'absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full',
                        focusConfig.color.replace('text-', 'bg-')
                      )}
                    />
                  )}

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span
                        className={cn(
                          'text-[9px] font-semibold uppercase tracking-wider leading-none',
                          isActive
                            ? 'text-foreground/70'
                            : 'text-muted-foreground/50'
                        )}
                      >
                        {format(date, 'EEE')}
                      </span>
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums leading-none',
                          isActive
                            ? 'text-foreground'
                            : isToday
                              ? 'text-foreground/90'
                              : 'text-foreground/60'
                        )}
                      >
                        {format(date, 'd')}
                      </span>
                    </div>
                    {isToday && !isActive && (
                      <div className="size-1 rounded-full bg-primary" />
                    )}
                  </div>

                  {/* Intensity bar */}
                  <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        focusConfig.color.replace('text-', 'bg-'),
                        isActive ? 'opacity-90' : 'opacity-50'
                      )}
                      style={{ width: `${intensity * 100}%` }}
                    />
                  </div>

                  {/* Completion dots */}
                  <div className="flex items-center justify-center gap-[3px]">
                    {completionDots.map((done, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'size-[4px] rounded-full transition-colors',
                          done
                            ? 'bg-accent-sage'
                            : someMissed
                              ? 'bg-accent-rose/50'
                              : 'bg-muted-foreground/25'
                        )}
                      />
                    ))}
                  </div>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <p className="font-semibold">{format(date, 'EEEE, MMM d')}</p>
                <p className="text-muted-foreground">
                  {focus} · {schedule?.goal || ''}
                </p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
