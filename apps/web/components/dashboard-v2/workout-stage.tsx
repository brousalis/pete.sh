'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getFocusConfig } from '@/lib/constants/fitness-colors'
import type { Exercise } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Dumbbell,
  Flame,
  Footprints,
  Moon,
  Play,
  SkipForward,
  Sun,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'

interface ExerciseRowProps {
  exercise: Exercise
  completed: boolean
  onToggle: () => void
  focusColor: string
  index: number
}

function ExerciseRow({
  exercise,
  completed,
  onToggle,
  focusColor,
  index,
}: ExerciseRowProps) {
  const [flashGreen, setFlashGreen] = useState(false)

  const handleToggle = useCallback(() => {
    if (!completed) {
      setFlashGreen(true)
      setTimeout(() => setFlashGreen(false), 400)
    }
    onToggle()
  }, [completed, onToggle])

  const meta = [
    exercise.sets && exercise.reps
      ? `${exercise.sets} sets × ${exercise.reps} reps`
      : null,
    exercise.duration ? `${exercise.duration}s` : null,
    exercise.rest ? `${exercise.rest}s rest` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={cn(
        'py-3 flex items-start gap-3 border-b border-border/20 last:border-0',
        'hover:bg-muted/10 transition-colors rounded-lg -mx-1 px-1',
        completed && 'bg-accent-sage/5',
        flashGreen && 'bg-accent-sage/10'
      )}
    >
      {/* Checkbox */}
      <motion.button
        onClick={handleToggle}
        whileTap={{ scale: 0.85 }}
        className={cn(
          'size-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors',
          completed
            ? 'bg-accent-sage border-accent-sage'
            : 'border-border/50 hover:border-accent-sage/50'
        )}
      >
        {completed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Check className="size-3 text-white" />
          </motion.div>
        )}
      </motion.button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            completed
              ? 'text-muted-foreground line-through'
              : 'text-foreground'
          )}
        >
          {exercise.name}
        </p>
        {meta && (
          <p className="text-[11px] text-muted-foreground">{meta}</p>
        )}
        {(exercise.notes || exercise.form) && (
          <p className="text-[11px] text-muted-foreground/50 mt-0.5 pl-2 border-l border-border/30">
            {exercise.notes || exercise.form}
          </p>
        )}
      </div>

      {/* Right side badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {exercise.isElbowSafe && (
          <Badge className="h-4 px-1.5 text-[9px] bg-accent-sage/15 text-accent-sage border-0">
            Safe
          </Badge>
        )}
        {exercise.youtubeVideoId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://youtube.com/watch?v=${exercise.youtubeVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/40 hover:text-accent-rose transition-colors"
                >
                  <Play className="size-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Watch demo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </motion.div>
  )
}

interface WorkoutSectionProps {
  title: string
  icon: React.ReactNode
  exercises: Exercise[]
  completedIds: Set<string>
  onToggleExercise: (id: string) => void
  focusColor: string
  defaultOpen?: boolean
}

function WorkoutSection({
  title,
  icon,
  exercises,
  completedIds,
  onToggleExercise,
  focusColor,
  defaultOpen = true,
}: WorkoutSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const completedCount = exercises.filter(e => completedIds.has(e.id)).length
  const progress =
    exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0

  if (exercises.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
        <span className={focusColor}>{icon}</span>
        <span className="text-sm font-semibold text-foreground flex-1 text-left">
          {title}
        </span>
        <div className="w-16 h-1 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-sage"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>
        <span className="text-[10px]  text-muted-foreground">
          {completedCount}/{exercises.length}
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-5">
          {exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              completed={completedIds.has(ex.id)}
              onToggle={() => onToggleExercise(ex.id)}
              focusColor={focusColor}
              index={i}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function WorkoutStage() {
  const {
    workout,
    routine,
    focusType,
    isRestDay,
    dayOfWeek,
    weekNumber,
    mealPlan,
    recipes,
  } = useDashboardV2()

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
  const displayCompleted = Math.min(completedCount, totalExercises)
  const overallProgress =
    totalExercises > 0 ? (displayCompleted / totalExercises) * 100 : 0

  const schedule = routine?.schedule[dayOfWeek]

  // Rest day variant
  if (isRestDay) {
    const dayMeals = mealPlan?.meals[dayOfWeek]
    const mealEntries = ['breakfast', 'lunch', 'dinner'] as const
    const morningRoutine = routine?.dailyRoutines.morning
    const nightRoutine = routine?.dailyRoutines.night

    return (
      <div className="rounded-2xl overflow-hidden overflow-y-auto scrollbar-hide border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
        {/* Rest day header */}
        <div className="bg-gradient-to-r from-accent-slate/8 via-accent-slate/4 to-transparent px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-accent-slate/10 flex items-center justify-center">
              <Footprints className="size-5 text-accent-slate" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Rest Day</h2>
              <p className="text-xs text-muted-foreground">
                {schedule?.goal || '10k Steps (No Gym)'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Morning routine */}
          {morningRoutine && (
            <div className="rounded-xl bg-accent-gold/[0.07] border border-accent-gold/15 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="size-4 text-accent-gold" />
                <span className="text-sm font-semibold">{morningRoutine.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{morningRoutine.duration}m</span>
              </div>
              <div className="space-y-2">
                {morningRoutine.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">{ex.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 ">{ex.duration}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meals */}
          {dayMeals && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s Meals</span>
              {mealEntries.map(meal => {
                const recipeId = dayMeals[meal]
                if (!recipeId) return null
                const recipe = recipes.find(r => r.id === recipeId)
                return (
                  <div
                    key={meal}
                    className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2.5"
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 w-14">
                      {meal}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {recipe?.name || 'Unknown recipe'}
                    </span>
                    {recipe?.calories_per_serving && (
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {recipe.calories_per_serving} cal
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Night routine */}
          {nightRoutine && (
            <div className="rounded-xl bg-accent-violet/[0.07] border border-accent-violet/15 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="size-4 text-accent-violet" />
                <span className="text-sm font-semibold">{nightRoutine.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{nightRoutine.duration}m</span>
              </div>
              <div className="space-y-2">
                {nightRoutine.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">{ex.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 ">{ex.duration}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link href="/fitness/activity" className="block">
            <Button variant="outline" size="sm" className="w-full text-xs">
              Activity Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="rounded-2xl border border-border bg-card flex items-center justify-center p-12 shadow-sm ring-1 ring-border/40 ring-inset">
        <div className="text-center">
          <Dumbbell className="size-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No workout loaded for this day</p>
        </div>
      </div>
    )
  }

  const FocusIcon = focusConfig.icon

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col min-h-0 border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
      {/* Hero header */}
      <div
        className={cn(
          'px-5 py-4 bg-gradient-to-r border-b border-border',
          focusConfig.gradient
        )}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">
            {workout.name}
          </h2>
          {routine?.updatedAt && (
            <span className="text-[9px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              v{routine.weeks.length || 1}
            </span>
          )}
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

      {/* Progress bar */}
      <div className="px-5 py-2.5 flex items-center gap-3 border-b border-border">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-sage/60"
            animate={{ width: `${overallProgress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums" title={`${displayCompleted} of ${totalExercises} exercises completed`}>
          {displayCompleted}/{totalExercises}
        </span>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {workout.warmup && workout.warmup.exercises.length > 0 && (
          <WorkoutSection
            title={workout.warmup.name || 'Warm Up'}
            icon={<Flame className="size-4" />}
            exercises={workout.warmup.exercises}
            completedIds={completedExercises}
            onToggleExercise={toggleExercise}
            focusColor={focusConfig.color}
            defaultOpen={false}
          />
        )}

        <WorkoutSection
          title="Main Workout"
          icon={<FocusIcon className="size-4" />}
          exercises={workout.exercises}
          completedIds={completedExercises}
          onToggleExercise={toggleExercise}
          focusColor={focusConfig.color}
        />

        {workout.finisher && workout.finisher.length > 0 && (
          <WorkoutSection
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
            <WorkoutSection
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
          <WorkoutSection
            title={workout.mobility.name || 'Mobility'}
            icon={<Zap className="size-4" />}
            exercises={workout.mobility.exercises}
            completedIds={completedExercises}
            onToggleExercise={toggleExercise}
            focusColor={focusConfig.color}
            defaultOpen={false}
          />
        )}

        {/* Notes */}
        {workout.notes && workout.notes.length > 0 && (
          <div className="bg-muted/30 rounded-xl mx-5 mb-4 mt-2 p-4 border-l-2 border-muted-foreground/30">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Notes
            </p>
            <ul className="list-disc pl-4 space-y-1">
              {workout.notes.map((note, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground leading-relaxed"
                >
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-muted/30">
        <span className="text-xs text-muted-foreground tabular-nums">
          {displayCompleted} of {totalExercises} completed
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <SkipForward className="size-3.5" />
            Skip
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs rounded-lg px-4 bg-accent-sage text-white hover:bg-accent-sage/90 transition-colors"
          >
            Complete
          </Button>
        </div>
      </div>
    </div>
  )
}
