'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { ExerciseSection } from '@/components/dashboard-v3/detail/exercise-primitives'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getFocusConfig } from '@/lib/constants/fitness-colors'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Dumbbell,
  Flame,
  Footprints,
  SkipForward,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'

export function WorkoutDetail() {
  const {
    workout,
    routine,
    focusType,
    isRestDay,
    dayOfWeek,
    weekNumber,
  } = useDashboardV3()

  const focusConfig = getFocusConfig(focusType)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(
    () => {
      const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
      const dayData = week?.days[dayOfWeek]
      return new Set(dayData?.workout?.exercisesCompleted || [])
    }
  )

  const toggleExercise = useCallback((id: string) => {
    setCompletedExercises(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const allExercises = useMemo(() => {
    if (!workout) return []
    return [
      ...(workout.warmup?.exercises || []),
      ...workout.exercises,
      ...(workout.finisher || []),
      ...(workout.metabolicFlush?.exercises || []),
      ...(workout.mobility?.exercises || []),
    ]
  }, [workout])

  const totalExercises = allExercises.length
  const completedCount = allExercises.filter(e =>
    completedExercises.has(e.id)
  ).length
  const overallProgress =
    totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0

  const schedule = routine?.schedule[dayOfWeek]

  if (isRestDay) {
    return (
      <div className="rounded-lg overflow-hidden border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
        <div className="px-5 py-4 bg-gradient-to-r from-accent-slate/8 via-accent-slate/4 to-transparent border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-accent-slate/10 flex items-center justify-center">
              <Footprints className="size-4 text-accent-slate" />
            </div>
            <div>
              <h3 className="text-base font-bold">Rest Day</h3>
              <p className="text-xs text-muted-foreground">
                {schedule?.goal || '10k Steps (No Gym)'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-5 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Active recovery · log a walk and stretch.
          </p>
          <Link href="/fitness/activity">
            <Button variant="outline" size="sm" className="text-xs">
              Activity Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="rounded-lg border border-border bg-card flex items-center justify-center p-10 shadow-sm ring-1 ring-border/40 ring-inset">
        <div className="text-center">
          <Dumbbell className="size-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No workout loaded for this day
          </p>
        </div>
      </div>
    )
  }

  const FocusIcon = focusConfig.icon

  return (
    <div className="rounded-lg overflow-hidden flex flex-col min-h-0 border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
      <div
        className={cn(
          'px-5 py-3.5 bg-gradient-to-r border-b border-border',
          focusConfig.gradient
        )}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-base font-semibold text-foreground">
            {workout.name}
          </h3>
          {routine?.injuryProtocol?.status === 'active' && (
            <Badge className="h-4 gap-0.5 px-1.5 text-[10px] bg-accent-rose/15 text-accent-rose border-0">
              <AlertTriangle className="size-2.5" />
              Injury
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {schedule?.focus} · {schedule?.goal}
        </p>
      </div>

      <div className="px-5 py-2.5 flex items-center gap-3 border-b border-border">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-sage/60"
            animate={{ width: `${overallProgress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {completedCount}/{totalExercises}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {workout.warmup && workout.warmup.exercises.length > 0 && (
          <ExerciseSection
            title={workout.warmup.name || 'Warm Up'}
            icon={<Flame className="size-4" />}
            exercises={workout.warmup.exercises}
            completedIds={completedExercises}
            onToggleExercise={toggleExercise}
            focusColor={focusConfig.color}
            defaultOpen={false}
          />
        )}

        <ExerciseSection
          title="Main Workout"
          icon={<FocusIcon className="size-4" />}
          exercises={workout.exercises}
          completedIds={completedExercises}
          onToggleExercise={toggleExercise}
          focusColor={focusConfig.color}
        />

        {workout.finisher && workout.finisher.length > 0 && (
          <ExerciseSection
            title="Finisher"
            icon={<Zap className="size-4" />}
            exercises={workout.finisher}
            completedIds={completedExercises}
            onToggleExercise={toggleExercise}
            focusColor={focusConfig.color}
            defaultOpen={false}
          />
        )}

        {workout.metabolicFlush &&
          workout.metabolicFlush.exercises.length > 0 && (
            <ExerciseSection
              title={workout.metabolicFlush.name || 'Metabolic Flush'}
              icon={<Flame className="size-4" />}
              exercises={workout.metabolicFlush.exercises}
              completedIds={completedExercises}
              onToggleExercise={toggleExercise}
              focusColor={focusConfig.color}
              defaultOpen={false}
            />
          )}

        {workout.mobility && workout.mobility.exercises.length > 0 && (
          <ExerciseSection
            title={workout.mobility.name || 'Mobility'}
            icon={<Zap className="size-4" />}
            exercises={workout.mobility.exercises}
            completedIds={completedExercises}
            onToggleExercise={toggleExercise}
            focusColor={focusConfig.color}
            defaultOpen={false}
          />
        )}

        {workout.notes && workout.notes.length > 0 && (
          <div className="bg-muted/20 mx-5 mb-4 mt-2 p-3 rounded-md border-l-2 border-muted-foreground/30">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">
              Notes
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {workout.notes.map((note, i) => (
                <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-border px-5 py-2.5 flex items-center justify-between bg-muted/20">
        <span className="text-xs text-muted-foreground tabular-nums">
          {completedCount} of {totalExercises} done
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="size-3" />
            Skip
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs rounded-md px-3.5 bg-accent-sage text-white hover:bg-accent-sage/90"
          >
            Complete
          </Button>
        </div>
      </div>
    </div>
  )
}
