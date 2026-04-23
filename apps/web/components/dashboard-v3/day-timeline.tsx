'use client'

import {
  useDashboardV3,
  type TimelineItemId,
} from '@/components/dashboard-v3/dashboard-v3-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCooking } from '@/hooks/use-cooking-data'
import { getFocusConfig } from '@/lib/constants/fitness-colors'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Check,
  Coffee,
  Dumbbell,
  Moon,
  Sun,
  Sunset,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'

interface TimelineItem {
  id: TimelineItemId
  time: string
  label: string
  detail: string | null
  duration: string | null
  icon: LucideIcon
  iconColor: string
  iconBg: string
  status: 'done' | 'active' | 'pending' | 'skipped' | 'none'
  disabled?: boolean
}

export function DayTimeline() {
  const {
    routine,
    workout,
    mealPlan: dashboardMealPlan,
    recipes,
    dayOfWeek,
    weekNumber,
    focusType,
    isRestDay,
    activeItem,
    setActiveItem,
  } = useDashboardV3()

  const cooking = useCooking()
  const mealPlan = cooking.mealPlan ?? dashboardMealPlan
  const dayMeals = mealPlan?.meals[dayOfWeek]
  const focusConfig = getFocusConfig(focusType)

  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]
  const morningDone = dayData?.morningRoutine?.completed || false
  const workoutDone = dayData?.workout?.completed || false
  const nightDone = dayData?.nightRoutine?.completed || false

  const morningRoutine = routine?.dailyRoutines.morning
  const nightRoutine = routine?.dailyRoutines.night
  const trainingTime = routine?.userProfile?.schedule?.trainingTime || '10:00'

  const getRecipe = (id: string | undefined | null | boolean) => {
    if (!id || typeof id !== 'string') return null
    return recipes.find(r => r.id === id) ?? null
  }

  const items = useMemo<TimelineItem[]>(() => {
    const breakfast = getRecipe(dayMeals?.breakfast)
    const lunch = getRecipe(dayMeals?.lunch)
    const dinner = getRecipe(dayMeals?.dinner)
    const dinnerDone = dinner
      ? !!cooking.isSlotCompleted(dayOfWeek, 'dinner')
      : false
    const lunchDone = lunch
      ? !!cooking.isSlotCompleted(dayOfWeek, 'lunch')
      : false
    const breakfastDone = breakfast
      ? !!cooking.isSlotCompleted(dayOfWeek, 'breakfast')
      : false

    const list: TimelineItem[] = [
      {
        id: 'morning',
        time: '06:00',
        label: morningRoutine?.name || 'Morning Routine',
        detail: morningRoutine
          ? `${morningRoutine.exercises.length} ${morningRoutine.exercises.length === 1 ? 'movement' : 'movements'}`
          : null,
        duration: morningRoutine ? `${morningRoutine.duration}m` : null,
        icon: Sun,
        iconColor: 'text-accent-gold',
        iconBg: 'bg-accent-gold/15',
        status: morningDone ? 'done' : 'pending',
      },
      {
        id: 'breakfast',
        time: '07:30',
        label: breakfast?.name || 'Breakfast',
        detail: breakfast ? 'Fuel up' : 'No meal planned',
        duration: null,
        icon: Coffee,
        iconColor: 'text-accent-ember',
        iconBg: 'bg-accent-ember/15',
        status: breakfast ? (breakfastDone ? 'done' : 'pending') : 'none',
        disabled: !breakfast,
      },
      {
        id: 'workout',
        time: trainingTime,
        label: isRestDay ? 'Rest Day' : workout?.name || 'Main Workout',
        detail: isRestDay
          ? (routine?.schedule[dayOfWeek]?.goal ?? '10k Steps')
          : workout
            ? `${workout.exercises.length} ${workout.exercises.length === 1 ? 'exercise' : 'exercises'}`
            : focusType,
        duration: workout?.duration ? `${workout.duration}m` : null,
        icon: isRestDay ? Sunset : Dumbbell,
        iconColor: isRestDay ? 'text-accent-slate' : focusConfig.color,
        iconBg: isRestDay ? 'bg-accent-slate/15' : focusConfig.bgStrong,
        status: isRestDay
          ? 'none'
          : workoutDone
            ? 'done'
            : 'active',
      },
      {
        id: 'lunch',
        time: '13:00',
        label: lunch?.name || 'Lunch',
        detail: lunch ? 'Recovery meal' : 'No meal planned',
        duration: null,
        icon: UtensilsCrossed,
        iconColor: 'text-accent-sage',
        iconBg: 'bg-accent-sage/15',
        status: lunch ? (lunchDone ? 'done' : 'pending') : 'none',
        disabled: !lunch,
      },
      {
        id: 'dinner',
        time: '19:00',
        label: dinner?.name || 'Dinner',
        detail: dinner ? 'Evening meal' : 'No meal planned',
        duration: null,
        icon: UtensilsCrossed,
        iconColor: 'text-accent-azure',
        iconBg: 'bg-accent-azure/15',
        status: dinner ? (dinnerDone ? 'done' : 'pending') : 'none',
        disabled: !dinner,
      },
      {
        id: 'night',
        time: '21:00',
        label: nightRoutine?.name || 'Night Routine',
        detail: nightRoutine
          ? `${nightRoutine.exercises.length} ${nightRoutine.exercises.length === 1 ? 'movement' : 'movements'}`
          : null,
        duration: nightRoutine ? `${nightRoutine.duration}m` : null,
        icon: Moon,
        iconColor: 'text-accent-violet',
        iconBg: 'bg-accent-violet/15',
        status: nightDone ? 'done' : 'pending',
      },
    ]

    return list
  }, [
    morningDone,
    workoutDone,
    nightDone,
    morningRoutine,
    nightRoutine,
    workout,
    isRestDay,
    focusType,
    focusConfig,
    dayMeals,
    dayOfWeek,
    recipes,
    trainingTime,
    routine,
    cooking,
  ])

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Daily Flow
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          Tap a block to focus
        </span>
      </div>

      <div className="relative py-2">
        {/* Vertical line */}
        <div className="absolute left-[34px] top-4 bottom-4 w-px bg-border/40" />

        <div className="flex flex-col">
          {items.map((item, idx) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            const isDone = item.status === 'done'
            const isRunning = item.status === 'active'

            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => setActiveItem(item.id)}
                disabled={item.disabled}
                whileTap={{ scale: item.disabled ? 1 : 0.99 }}
                className={cn(
                  'relative flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  !item.disabled && 'hover:bg-muted/30',
                  isActive && 'bg-muted/50'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="timeline-active"
                    className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[var(--brand)]"
                  />
                )}

                {/* Time */}
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/60 w-10 shrink-0">
                  {item.time}
                </span>

                {/* Icon node */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'relative size-7 rounded-full flex items-center justify-center shrink-0 border-2 border-card z-10',
                        item.iconBg,
                        isDone && 'bg-accent-sage/20'
                      )}
                    >
                      {isDone ? (
                        <Check className="size-3.5 text-accent-sage" />
                      ) : (
                        <Icon className={cn('size-3.5', item.iconColor)} />
                      )}
                      {isRunning && !isDone && (
                        <motion.div
                          className={cn(
                            'absolute inset-0 rounded-full border-2',
                            item.iconColor.replace('text-', 'border-')
                          )}
                          animate={{
                            scale: [1, 1.3, 1.3],
                            opacity: [0.6, 0, 0],
                          }}
                          transition={{ duration: 1.6, repeat: Infinity }}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-medium truncate',
                        isDone && 'text-muted-foreground line-through'
                      )}
                    >
                      {item.label}
                    </span>
                    {item.duration && (
                      <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0">
                        {item.duration}
                      </span>
                    )}
                  </div>
                  {item.detail && (
                    <p className="text-[11px] text-muted-foreground/70 truncate">
                      {item.detail}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                {isRunning && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-accent-sage px-1.5 py-0.5 rounded bg-accent-sage/10 shrink-0">
                    Up next
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
