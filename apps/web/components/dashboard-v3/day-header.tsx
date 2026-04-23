'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { Button } from '@/components/ui/button'
import { getFocusConfig } from '@/lib/constants/fitness-colors'
import { cn } from '@/lib/utils'
import { addDays, format, isSameDay, isToday as isTodayFn } from 'date-fns'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function DayProgressRing({
  completed,
  total,
  size = 56,
}: {
  completed: number
  total: number
  size?: number
}) {
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? completed / total : 0
  const pct = Math.round(progress * 100)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        className="absolute inset-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-accent-sage"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold tabular-nums">{pct}%</span>
      </div>
    </div>
  )
}

export function DayHeader() {
  const {
    selectedDate,
    navigateToDay,
    goToToday,
    focusType,
    isRestDay,
    routine,
    dayOfWeek,
    weekNumber,
  } = useDashboardV3()

  const isToday = isSameDay(selectedDate, new Date())
  const focusConfig = getFocusConfig(focusType)
  const FocusIcon = focusConfig.icon

  const schedule = routine?.schedule[dayOfWeek]
  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]
  const morningDone = dayData?.morningRoutine?.completed ? 1 : 0
  const workoutDone = dayData?.workout?.completed ? 1 : 0
  const nightDone = dayData?.nightRoutine?.completed ? 1 : 0

  const totalItems = isRestDay ? 2 : 3
  const completedItems = morningDone + (isRestDay ? 0 : workoutDone) + nightDone

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        'ring-1 ring-border/40 ring-inset'
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-60',
          focusConfig.gradient
        )}
      />

      <div className="relative px-5 py-4 flex items-center gap-4">
        {/* Date block */}
        <div className="flex flex-col">
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-[0.15em]',
              isToday ? 'text-accent-sage' : 'text-muted-foreground/60'
            )}
          >
            {isToday
              ? 'Today'
              : isTodayFn(addDays(selectedDate, 1))
                ? 'Yesterday'
                : isTodayFn(addDays(selectedDate, -1))
                  ? 'Tomorrow'
                  : format(selectedDate, 'EEEE')}
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-bold tabular-nums leading-none">
              {format(selectedDate, 'd')}
            </span>
            <span className="text-sm font-medium text-muted-foreground leading-none">
              {format(selectedDate, 'MMM')}
            </span>
          </div>
        </div>

        {/* Focus pill */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
              focusConfig.bgStrong
            )}
          >
            <FocusIcon className={cn('size-3', focusConfig.color)} />
            <span
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wider',
                focusConfig.color
              )}
            >
              {focusType}
            </span>
          </div>
          {schedule?.goal && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {schedule.goal}
            </span>
          )}
        </div>

        {/* Progress ring */}
        <DayProgressRing completed={completedItems} total={totalItems} />

        {/* Nav buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              navigateToDay(addDays(selectedDate, -1), 'backward')
            }
            className="size-7 rounded-md flex items-center justify-center hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              navigateToDay(addDays(selectedDate, 1), 'forward')
            }
            className="size-7 rounded-md flex items-center justify-center hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </button>
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-7 px-2.5 text-[10px] rounded-full ml-1"
            >
              Today
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
