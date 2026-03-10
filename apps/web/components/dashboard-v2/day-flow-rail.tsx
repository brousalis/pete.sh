'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { StreakFlame } from '@/components/dashboard-v2/streak-flame'
import { getFocusConfig } from '@/lib/constants/fitness-colors'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Check,
  CircleCheck,
  Dumbbell,
  Footprints,
  Moon,
  Sun,
  UtensilsCrossed,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

function useTimeAwareGlow(
  morningDone: boolean,
  workoutDone: boolean,
  nightDone: boolean,
  isRestDay: boolean
): 'morning' | 'workout' | 'dinner' | 'night' | null {
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(timer)
  }, [])

  if (hour < 12 && !morningDone) return 'morning'
  if (hour >= 10 && hour < 16 && !workoutDone && !isRestDay) return 'workout'
  if (hour >= 17 && hour < 20) return 'dinner'
  if (hour >= 20 && !nightDone) return 'night'
  return null
}

interface TimelineNodeProps {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  completed: boolean
  completedAt?: string
  glowing: boolean
  onComplete?: () => void
  onUncomplete?: () => void
  children?: React.ReactNode
}

function TimelineNode({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  completed,
  completedAt,
  glowing,
  onComplete,
  onUncomplete,
  children,
}: TimelineNodeProps) {
  return (
    <div className="flex gap-2.5 relative">
      {/* Node circle */}
      <div
        className={cn(
          'size-7 rounded-full flex items-center justify-center shrink-0 transition-all relative z-10',
          completed ? 'bg-accent-sage/15' : iconBg,
          glowing && !completed && 'ring-2 ring-primary/20'
        )}
      >
        {completed ? (
          <Check className="size-3.5 text-accent-sage" />
        ) : (
          <span className={iconColor}>{icon}</span>
        )}
      </div>

      {/* Content - stacked vertically for clarity */}
      <div className="flex-1 min-w-0 pb-4">
        <p
          className={cn(
            'text-[13px] font-medium leading-tight',
            completed ? 'text-accent-sage/80' : 'text-foreground'
          )}
        >
          {title}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-px">{subtitle}</p>

        {/* Status row */}
        <div className="flex items-center gap-2 mt-1">
          {completed ? (
            <>
              <span className="text-[9px] text-accent-sage/70">Done</span>
              {completedAt && (
                <span className="text-[9px] text-muted-foreground/40">
                  {format(new Date(completedAt), 'h:mm a')}
                </span>
              )}
              {onUncomplete && (
                <motion.button
                  onClick={onUncomplete}
                  whileTap={{ scale: 0.95 }}
                  className="text-[9px] text-muted-foreground/30 hover:text-muted-foreground transition-colors ml-auto"
                >
                  Undo
                </motion.button>
              )}
            </>
          ) : (
            <>
              {onComplete && (
                <motion.button
                  onClick={onComplete}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/40 hover:text-accent-sage transition-colors"
                >
                  <CircleCheck className="size-3" />
                  Mark done
                </motion.button>
              )}
            </>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}

export function DayFlowRail() {
  const {
    routine,
    workout,
    mealPlan,
    recipes,
    consistencyStats,
    dayOfWeek,
    weekNumber,
    focusType,
    isRestDay,
    completeRoutine,
    uncompleteRoutine,
  } = useDashboardV2()

  const focusConfig = getFocusConfig(focusType)
  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  const morningDone = dayData?.morningRoutine?.completed || false
  const morningAt = dayData?.morningRoutine?.completedAt
  const workoutDone = dayData?.workout?.completed || false
  const workoutAt = dayData?.workout?.completedAt
  const nightDone = dayData?.nightRoutine?.completed || false
  const nightAt = dayData?.nightRoutine?.completedAt

  const glowTarget = useTimeAwareGlow(morningDone, workoutDone, nightDone, isRestDay)

  const dinnerRecipe = useMemo(() => {
    const dayMeals = mealPlan?.meals[dayOfWeek]
    const dinnerId = dayMeals?.dinner
    if (!dinnerId) return null
    return recipes.find(r => r.id === dinnerId) ?? null
  }, [mealPlan, dayOfWeek, recipes])

  const handleCompleteMorning = useCallback(() => completeRoutine('morning'), [completeRoutine])
  const handleUncompleteMorning = useCallback(() => uncompleteRoutine('morning'), [uncompleteRoutine])
  const handleCompleteNight = useCallback(() => completeRoutine('night'), [completeRoutine])
  const handleUncompleteNight = useCallback(() => uncompleteRoutine('night'), [uncompleteRoutine])

  const schedule = routine?.schedule[dayOfWeek]

  return (
    <div className="hidden md:flex flex-col bg-card/30 border-r border-border/20 overflow-y-auto scrollbar-hide">
      <div className="px-3 py-3 flex flex-col flex-1">
        <div className="relative">
          {/* Gradient timeline line */}
          <div className="absolute left-[13px] top-4 bottom-4 w-px bg-gradient-to-b from-accent-gold/30 via-muted/10 to-accent-violet/30" />

          <TimelineNode
            icon={<Sun className="size-3.5" />}
            iconBg="bg-accent-gold/15"
            iconColor="text-accent-gold"
            title={routine?.dailyRoutines.morning.name || 'Morning Stretch'}
            subtitle={`${routine?.dailyRoutines.morning.duration || 5}m · ${routine?.dailyRoutines.morning.exercises.length || 0} exercises`}
            completed={morningDone}
            completedAt={morningAt}
            glowing={glowTarget === 'morning'}
            onComplete={handleCompleteMorning}
            onUncomplete={handleUncompleteMorning}
          />

          <TimelineNode
            icon={isRestDay ? <Footprints className="size-3.5" /> : <Dumbbell className="size-3.5" />}
            iconBg={isRestDay ? 'bg-accent-slate/15' : focusConfig.bgStrong}
            iconColor={isRestDay ? 'text-accent-slate' : focusConfig.color}
            title={isRestDay ? (schedule?.focus || 'Rest Day') : (workout?.name || 'Workout')}
            subtitle={
              isRestDay
                ? schedule?.goal || '10k Steps (No Gym)'
                : `${focusType} · ${workout?.exercises.length || 0} exercises`
            }
            completed={workoutDone}
            completedAt={workoutAt}
            glowing={glowTarget === 'workout'}
          >
            {glowTarget === 'workout' && !workoutDone && !isRestDay && (
              <motion.p
                className={cn('mt-0.5 text-[10px] font-medium', focusConfig.color)}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                It&apos;s go time
              </motion.p>
            )}
          </TimelineNode>

          <TimelineNode
            icon={<UtensilsCrossed className="size-3.5" />}
            iconBg="bg-accent-sage/15"
            iconColor="text-accent-sage"
            title={dinnerRecipe?.name || 'Dinner'}
            subtitle={
              dinnerRecipe
                ? `${(dinnerRecipe.prep_time || 0) + (dinnerRecipe.cook_time || 0)}m cook time`
                : 'No dinner planned'
            }
            completed={false}
            glowing={glowTarget === 'dinner'}
          />

          <TimelineNode
            icon={<Moon className="size-3.5" />}
            iconBg="bg-accent-violet/15"
            iconColor="text-accent-violet"
            title={routine?.dailyRoutines.night.name || 'Night Stretch'}
            subtitle={`${routine?.dailyRoutines.night.duration || 9}m · ${routine?.dailyRoutines.night.exercises.length || 0} exercises`}
            completed={nightDone}
            completedAt={nightAt}
            glowing={glowTarget === 'night'}
            onComplete={handleCompleteNight}
            onUncomplete={handleUncompleteNight}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-auto border-t border-border/20 px-3 py-3">
        {consistencyStats ? (
          <StreakFlame
            streak={consistencyStats.currentStreak}
            weeklyCompletion={consistencyStats.weeklyCompletion}
            monthlyCompletion={consistencyStats.monthlyCompletion}
            longestStreak={consistencyStats.longestStreak}
          />
        ) : (
          <p className="text-[10px] text-muted-foreground">Loading stats...</p>
        )}
      </div>
    </div>
  )
}
