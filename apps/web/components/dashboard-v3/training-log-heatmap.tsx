'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import {
  addDays,
  format,
  isSameDay,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import { useMemo } from 'react'

const DAY_KEYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const WEEKS = 8

function getLoad(
  focus: string,
  morningDone: boolean,
  workoutDone: boolean,
  nightDone: boolean
): number {
  if (focus === 'Rest') {
    return (Number(morningDone) + Number(nightDone)) * 0.25
  }
  let base = 0
  switch (focus) {
    case 'HIIT':
    case 'Hybrid':
      base = 1
      break
    case 'Strength':
    case 'Circuit':
      base = 0.85
      break
    case 'Endurance':
      base = 0.75
      break
    case 'Core/Posture':
    case 'Core':
      base = 0.55
      break
    case 'Active Recovery':
      base = 0.3
      break
    default:
      base = 0.4
  }
  const completionBoost =
    (Number(morningDone) * 0.1 +
      Number(workoutDone) * 0.65 +
      Number(nightDone) * 0.1) /
    0.85
  return base * (0.3 + 0.7 * completionBoost)
}

function loadColor(load: number, isFuture: boolean): string {
  if (isFuture) return 'bg-muted/20'
  if (load <= 0.05) return 'bg-muted/30'
  if (load < 0.25) return 'bg-accent-sage/20'
  if (load < 0.5) return 'bg-accent-sage/40'
  if (load < 0.75) return 'bg-accent-sage/60'
  return 'bg-accent-sage/90'
}

function computeWeekNumber(date: Date): number {
  const soy = new Date(date.getFullYear(), 0, 1)
  const d = Math.floor((date.getTime() - soy.getTime()) / 86400000)
  return Math.ceil((d + soy.getDay() + 1) / 7)
}

export function TrainingLogHeatmap() {
  const { selectedDate, navigateToDay, routine } = useDashboardV3()

  const weeks = useMemo(() => {
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
    const start = subWeeks(thisWeek, WEEKS - 1)
    return Array.from({ length: WEEKS }, (_, i) => addDays(start, i * 7))
  }, [])

  const now = new Date()

  return (
    <div className="px-2 pt-3 pb-2 border-t border-border/40">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Training Log
        </span>
        <span className="text-[8px] text-muted-foreground/40">
          {WEEKS}w
        </span>
      </div>

      <div className="flex gap-[3px]">
        {/* Day labels on the left */}
        <div className="flex flex-col gap-[3px] pt-[11px] shrink-0">
          {DAY_LABELS.map((d, i) => (
            <div
              key={i}
              className={cn(
                'h-[12px] w-[8px] flex items-center justify-center text-[7px] font-semibold text-muted-foreground/40',
                i % 2 === 1 ? '' : 'opacity-0'
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div className="flex gap-[3px] flex-1 min-w-0">
          {weeks.map(weekStart => {
            const weekNum = computeWeekNumber(weekStart)
            return (
              <div key={weekStart.toISOString()} className="flex flex-col gap-[3px] flex-1 min-w-0">
                <div className="text-[7px] text-muted-foreground/40 text-center leading-none tabular-nums h-[9px]">
                  {weekNum}
                </div>
                {DAY_KEYS.map((dayKey, i) => {
                  const date = addDays(weekStart, i)
                  const isFuture = date > now && !isSameDay(date, now)
                  const isActive = isSameDay(date, selectedDate)
                  const isToday = isSameDay(date, now)
                  const schedule = routine?.schedule[dayKey]
                  const focus = schedule?.focus || 'Rest'
                  const week = routine?.weeks.find(
                    w => w.weekNumber === weekNum
                  )
                  const dayData = week?.days[dayKey]
                  const morningDone = dayData?.morningRoutine?.completed || false
                  const workoutDone = dayData?.workout?.completed || false
                  const nightDone = dayData?.nightRoutine?.completed || false

                  const load = getLoad(
                    focus,
                    morningDone,
                    workoutDone,
                    nightDone
                  )
                  const color = loadColor(load, isFuture)

                  return (
                    <Tooltip key={dayKey}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const dir =
                              date > selectedDate ? 'forward' : 'backward'
                            navigateToDay(date, dir)
                          }}
                          className={cn(
                            'aspect-square w-full rounded-sm transition-all hover:ring-1 hover:ring-border',
                            color,
                            isActive && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                            isToday && !isActive && 'ring-1 ring-primary/70'
                          )}
                          aria-label={format(date, 'MMM d')}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-semibold">
                          {format(date, 'EEE, MMM d')}
                        </p>
                        <p className="text-muted-foreground">
                          {focus}
                          {!isFuture && (
                            <> · Load {(load * 100).toFixed(0)}%</>
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 px-1">
        <span className="text-[8px] text-muted-foreground/50">less</span>
        {[0, 0.3, 0.55, 0.75, 0.95].map(l => (
          <div
            key={l}
            className={cn('size-[8px] rounded-sm', loadColor(l, false))}
          />
        ))}
        <span className="text-[8px] text-muted-foreground/50">more</span>
      </div>
    </div>
  )
}
