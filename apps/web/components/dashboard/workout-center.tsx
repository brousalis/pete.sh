'use client'

import type { AppleWorkout } from '@/components/dashboard/fitness-dashboard'
import { HealthKitExerciseData } from '@/components/dashboard/healthkit-exercise-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { YouTubePlayer } from '@/components/ui/youtube-player'
import type {
  DayOfWeek,
  Exercise,
  Workout,
  WorkoutCompletion,
} from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Footprints,
  PersonStanding,
  Play,
  RotateCcw,
  StretchVertical,
  Watch,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface WorkoutCenterProps {
  /** The workout data for today */
  workout: Workout | null
  /** Day of the week */
  day: DayOfWeek
  /** Schedule focus for today */
  focus?: string
  /** Today's goal from schedule */
  goal?: string
  /** Completion state */
  completion?: WorkoutCompletion
  /** Whether injury protocol is active */
  hasInjuryProtocol?: boolean
  /** Callback when workout is completed */
  onComplete: (exercisesCompleted: string[]) => void
  /** Whether completion is in progress */
  isCompleting?: boolean
  /** Currently open video ID */
  openVideoId?: string | null
  /** Callback when video is toggled */
  onVideoToggle?: (exerciseId: string | null) => void
  /** Whether viewing in preview mode (another day) */
  isPreview?: boolean
  /** Apple Watch workouts for today */
  appleWorkouts?: AppleWorkout[]
  /** Custom class name */
  className?: string
}

// Exercise-to-workout type mapping
const EXERCISE_WORKOUT_MAPPING: Record<string, string[]> = {
  // Running exercises
  'endurance run': ['running'],
  'zone 2 run': ['running'],
  run: ['running'],
  jog: ['running'],
  'tempo run': ['running'],
  sprint: ['running', 'hiit'],
  intervals: ['running', 'hiit'],
  // Cycling/Bike exercises
  bike: ['cycling'],
  cycle: ['cycling'],
  'recovery spin': ['cycling'],
  'incline walk': ['walking'],
  walk: ['walking'],
  // Rowing
  row: ['rowing'],
  rowing: ['rowing'],
  // Strength
  strength: ['functionalStrengthTraining', 'traditionalStrengthTraining'],
  lift: ['functionalStrengthTraining', 'traditionalStrengthTraining'],
  // HIIT
  hiit: ['hiit'],
  circuit: ['hiit', 'functionalStrengthTraining'],
  // Core
  core: ['coreTraining'],
}

// Helper function to match exercise to HealthKit workout
function matchExerciseToWorkout(
  exerciseName: string,
  workouts: AppleWorkout[]
): AppleWorkout | null {
  const lowerName = exerciseName.toLowerCase()

  // Find matching workout types for this exercise
  let matchingTypes: string[] = []
  for (const [keyword, types] of Object.entries(EXERCISE_WORKOUT_MAPPING)) {
    if (lowerName.includes(keyword)) {
      matchingTypes = [...matchingTypes, ...types]
    }
  }

  if (matchingTypes.length === 0) return null

  // Find the best matching workout
  const matchingWorkout = workouts.find(w =>
    matchingTypes.includes(w.workout_type)
  )

  return matchingWorkout || null
}

interface SectionConfig {
  id: string
  title: string
  icon: React.ElementType
  iconColor: string
  bgColor: string
  exercises: Exercise[]
  duration?: number
  defaultOpen?: boolean
}

/**
 * WorkoutCenter - The main workout area showing today's exercises.
 *
 * Features:
 * - Collapsible sections for warmup, main exercises, finisher, flush, mobility
 * - Full detail view with sets/reps/form cues
 * - Checkbox completion tracking
 * - Inline video expansion
 */
export function WorkoutCenter({
  workout,
  day,
  focus,
  goal,
  completion,
  hasInjuryProtocol = false,
  onComplete,
  isCompleting = false,
  openVideoId,
  onVideoToggle,
  isPreview = false,
  appleWorkouts = [],
  className,
}: WorkoutCenterProps) {
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(
    new Set(completion?.exercisesCompleted || [])
  )
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['exercises']) // Main exercises open by default
  )

  const isWorkoutCompleted = completion?.completed || false

  // Match exercises to Apple Watch workouts
  const exerciseWorkoutMap = useMemo(() => {
    const map = new Map<string, AppleWorkout>()
    if (!workout || appleWorkouts.length === 0) return map

    // Track which workouts have been matched to avoid duplicates
    const usedWorkouts = new Set<string>()

    // Collect all exercises
    const allExercises: Exercise[] = [
      ...(workout.warmup?.exercises || []),
      ...workout.exercises,
      ...(workout.finisher || []),
      ...(workout.metabolicFlush?.exercises || []),
      ...(workout.mobility?.exercises || []),
    ]

    // Match exercises to workouts (prioritize first match)
    for (const exercise of allExercises) {
      const matchedWorkout = matchExerciseToWorkout(
        exercise.name,
        appleWorkouts.filter(w => !usedWorkouts.has(w.id))
      )
      if (matchedWorkout) {
        map.set(exercise.id, matchedWorkout)
        usedWorkouts.add(matchedWorkout.id)
      }
    }

    return map
  }, [workout, appleWorkouts])

  // When workout is completed, expand all sections so user can see what they did
  useEffect(() => {
    if (isWorkoutCompleted) {
      setExpandedSections(
        new Set(['warmup', 'exercises', 'finisher', 'metabolic', 'mobility'])
      )
    }
  }, [isWorkoutCompleted])
  const dayName = day.charAt(0).toUpperCase() + day.slice(1)

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Toggle exercise completion
  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
  }

  // Handle video toggle
  const handleVideoToggle = (exerciseId: string) => {
    if (openVideoId === exerciseId) {
      onVideoToggle?.(null)
    } else {
      onVideoToggle?.(exerciseId)
    }
  }

  // Collect all exercise IDs from workout so completing the workout marks every exercise complete
  const getAllExerciseIds = (): string[] => {
    if (!workout) return []
    const ids: string[] = []
    if (workout.warmup?.exercises?.length)
      ids.push(...workout.warmup.exercises.map(e => e.id))
    if (workout.exercises?.length) ids.push(...workout.exercises.map(e => e.id))
    if (workout.finisher?.length) ids.push(...workout.finisher.map(e => e.id))
    if (workout.metabolicFlush?.exercises?.length)
      ids.push(...workout.metabolicFlush.exercises.map(e => e.id))
    if (workout.mobility?.exercises?.length)
      ids.push(...workout.mobility.exercises.map(e => e.id))
    return Array.from(new Set([...ids, ...completedExercises]))
  }

  // Handle workout completion — pass all exercise IDs so every exercise is marked complete
  const handleComplete = () => {
    onComplete(getAllExerciseIds())
  }

  // Rest day view
  if (!workout) {
    return (
      <Card
        className={cn(
          'flex h-full flex-col border-blue-500/20 bg-blue-500/5 py-0',
          className
        )}
      >
        <CardContent className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-blue-500/10 p-4 text-blue-500">
            <Footprints className="size-8" />
          </div>
          <h2 className="mb-1 text-xl font-semibold">{dayName} - Rest Day</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {goal || 'Active Recovery'}
          </p>
          <Badge variant="secondary" className="text-xs">
            {goal || '10,000 Steps'}
          </Badge>
        </CardContent>
      </Card>
    )
  }

  // Build sections array
  const sections: SectionConfig[] = []

  if (workout.warmup && workout.warmup.exercises.length > 0) {
    sections.push({
      id: 'warmup',
      title: workout.warmup.name || 'Warm-up',
      icon: RotateCcw,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/5',
      exercises: workout.warmup.exercises,
      duration: workout.warmup.duration,
      defaultOpen: false,
    })
  }

  sections.push({
    id: 'exercises',
    title: 'Main Workout',
    icon: Dumbbell,
    iconColor: 'text-foreground',
    bgColor: 'bg-muted/30',
    exercises: workout.exercises,
    defaultOpen: true,
  })

  if (workout.finisher && workout.finisher.length > 0) {
    sections.push({
      id: 'finisher',
      title: 'Finisher',
      icon: Zap,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-500/5',
      exercises: workout.finisher,
      defaultOpen: false,
    })
  }

  if (workout.metabolicFlush && workout.metabolicFlush.exercises.length > 0) {
    sections.push({
      id: 'metabolic',
      title: workout.metabolicFlush.name || 'Metabolic Flush',
      icon: PersonStanding,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-500/5',
      exercises: workout.metabolicFlush.exercises,
      duration: workout.metabolicFlush.duration,
      defaultOpen: false,
    })
  }

  if (workout.mobility && workout.mobility.exercises.length > 0) {
    sections.push({
      id: 'mobility',
      title: workout.mobility.name || 'Mobility',
      icon: StretchVertical,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/5',
      exercises: workout.mobility.exercises,
      duration: workout.mobility.duration,
      defaultOpen: false,
    })
  }

  // Count total exercises
  const totalExercises = sections.reduce(
    (acc, s) => acc + s.exercises.length,
    0
  )

  return (
    <Card
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden py-0',
        isWorkoutCompleted && 'ring-1 ring-green-500/50',
        isPreview && !isWorkoutCompleted && 'border-dashed border-blue-500/30',
        className
      )}
    >
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-3 border-b p-3',
            isPreview ? 'bg-blue-500/5' : 'bg-muted/30'
          )}
        >
          <div
            className={cn(
              'rounded-md p-2',
              isPreview
                ? 'bg-blue-500/20 text-blue-500'
                : 'bg-blue-500/10 text-blue-500'
            )}
          >
            <Dumbbell className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold">
                {workout.name}
              </h2>
              {hasInjuryProtocol && (
                <Badge
                  variant="destructive"
                  className="h-5 shrink-0 gap-0.5 text-[10px]"
                >
                  <AlertTriangle className="size-3" />
                  Injury
                </Badge>
              )}
              {isWorkoutCompleted && (
                <Badge
                  variant="outline"
                  className="h-5 shrink-0 border-green-500/30 bg-green-500/10 text-[10px] text-green-600"
                >
                  Done
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <span className="text-foreground/80 font-medium">{dayName}</span>
              <span>·</span>
              <span>{focus}</span>
              {workout.goal && (
                <>
                  <span>·</span>
                  <span className="truncate">{workout.goal}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sections - Scrollable */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-2">
            {sections.map(section => (
              <WorkoutSection
                key={section.id}
                section={section}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                completedExercises={completedExercises}
                onExerciseToggle={toggleExercise}
                openVideoId={openVideoId}
                onVideoToggle={handleVideoToggle}
                hasInjuryProtocol={hasInjuryProtocol}
                isPreview={isPreview}
                exerciseWorkoutMap={exerciseWorkoutMap}
                isWorkoutCompleted={isWorkoutCompleted}
              />
            ))}

            {/* Notes */}
            {workout.notes && workout.notes.length > 0 && (
              <div className="bg-muted/30 border-muted rounded-md border p-2">
                <div className="text-muted-foreground mb-1 text-[11px] font-medium">
                  Notes
                </div>
                <ul className="text-foreground/80 space-y-0.5 text-[11px]">
                  {workout.notes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-muted-foreground">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div
          className={cn(
            'border-t p-3',
            'bg-muted/20'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-muted-foreground text-xs">
                {isWorkoutCompleted
                  ? `${completion?.exercisesCompleted?.length || totalExercises}/${totalExercises} exercises completed`
                  : isPreview
                    ? `${totalExercises} exercises`
                    : `${completedExercises.size}/${totalExercises} exercises`}
              </div>
            </div>
            {isPreview ? (
              isWorkoutCompleted ? (
                <Badge
                  variant="outline"
                  className="border-green-500/30 bg-green-500/10 text-xs text-green-600"
                >
                  Completed
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Preview
                </Badge>
              )
            ) : (
              <Button
                size="sm"
                className="h-8"
                onClick={handleComplete}
                disabled={isCompleting || isWorkoutCompleted}
              >
                {isCompleting
                  ? 'Completing...'
                  : isWorkoutCompleted
                    ? 'Completed'
                    : 'Complete Workout'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Workout types that should be shown at section level (not per-exercise)
const SECTION_LEVEL_WORKOUT_TYPES = [
  'functionalStrengthTraining',
  'traditionalStrengthTraining',
  'coreTraining',
]

// Section Component
interface WorkoutSectionProps {
  section: SectionConfig
  isExpanded: boolean
  onToggle: () => void
  completedExercises: Set<string>
  onExerciseToggle: (id: string) => void
  openVideoId?: string | null
  onVideoToggle: (id: string) => void
  hasInjuryProtocol?: boolean
  isPreview?: boolean
  exerciseWorkoutMap?: Map<string, AppleWorkout>
  isWorkoutCompleted?: boolean
}

function WorkoutSection({
  section,
  isExpanded,
  onToggle,
  completedExercises,
  onExerciseToggle,
  openVideoId,
  onVideoToggle,
  hasInjuryProtocol,
  isPreview,
  exerciseWorkoutMap,
  isWorkoutCompleted,
}: WorkoutSectionProps) {
  const Icon = section.icon
  const completedCount = section.exercises.filter(ex =>
    completedExercises.has(ex.id)
  ).length

  // Collect all linked workouts for this section
  const linkedWorkouts = useMemo(() => {
    if (!exerciseWorkoutMap) return []
    const workouts: AppleWorkout[] = []
    const seenIds = new Set<string>()

    section.exercises.forEach(ex => {
      const workout = exerciseWorkoutMap.get(ex.id)
      if (workout && !seenIds.has(workout.id)) {
        workouts.push(workout)
        seenIds.add(workout.id)
      }
    })
    return workouts
  }, [section.exercises, exerciseWorkoutMap])

  // Separate section-level workouts (strength/core) from exercise-level workouts (cardio)
  const sectionLevelWorkouts = linkedWorkouts.filter(w =>
    SECTION_LEVEL_WORKOUT_TYPES.includes(w.workout_type)
  )
  const exerciseLevelWorkoutIds = new Set(
    linkedWorkouts
      .filter(w => !SECTION_LEVEL_WORKOUT_TYPES.includes(w.workout_type))
      .map(w => w.id)
  )

  const hasLinkedWorkouts = linkedWorkouts.length > 0

  return (
    <div className={cn('overflow-hidden rounded-lg border', section.bgColor)}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button className="hover:bg-muted/30 flex w-full items-center gap-2 p-2.5 text-left transition-colors">
            <Icon className={cn('size-4 shrink-0', section.iconColor)} />
            <span className="flex-1 text-sm font-medium">{section.title}</span>
            {hasLinkedWorkouts && isWorkoutCompleted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Watch className="size-3.5 text-green-500" />
                </TooltipTrigger>
                <TooltipContent>Apple Watch data linked</TooltipContent>
              </Tooltip>
            )}
            {section.duration && (
              <span className="text-muted-foreground text-[11px]">
                {section.duration}m
              </span>
            )}
            <span className="text-muted-foreground text-[11px]">
              {completedCount}/{section.exercises.length}
            </span>
            {isExpanded ? (
              <ChevronDown className="text-muted-foreground size-4" />
            ) : (
              <ChevronRight className="text-muted-foreground size-4" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-1 px-2 pb-2">
            {/* Section-level workouts (strength/core) shown at top */}
            {sectionLevelWorkouts.length > 0 && isWorkoutCompleted && (
              <div className="mb-2 space-y-2">
                {sectionLevelWorkouts.map(workout => (
                  <HealthKitExerciseData
                    key={workout.id}
                    workoutId={workout.id}
                    workoutType={workout.workout_type}
                    variant="detailed"
                    expandable={true}
                  />
                ))}
              </div>
            )}

            {/* Exercise list */}
            {section.exercises.map(exercise => {
              const linkedWorkout = exerciseWorkoutMap?.get(exercise.id)
              const isCompleted = completedExercises.has(exercise.id)
              // Only show inline if it's an exercise-level workout (cardio)
              const showInlineWorkout =
                linkedWorkout && exerciseLevelWorkoutIds.has(linkedWorkout.id)

              return (
                <div key={exercise.id} className="space-y-1">
                  <ExerciseRow
                    exercise={exercise}
                    isCompleted={isCompleted}
                    onToggle={() => onExerciseToggle(exercise.id)}
                    isVideoOpen={openVideoId === exercise.id}
                    onVideoToggle={() => onVideoToggle(exercise.id)}
                    useAlternative={
                      hasInjuryProtocol &&
                      exercise.isElbowSafe === false &&
                      !!exercise.alternative
                    }
                    isPreview={isPreview}
                    hasLinkedWorkout={!!linkedWorkout}
                  />
                  {/* Show linked HealthKit workout data for cardio exercises */}
                  {showInlineWorkout && (isCompleted || isWorkoutCompleted) && (
                    <div className="ml-6">
                      <HealthKitExerciseData
                        workoutId={linkedWorkout.id}
                        workoutType={linkedWorkout.workout_type}
                        variant="detailed"
                        expandable={true}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// Exercise Row Component
interface ExerciseRowProps {
  exercise: Exercise
  isCompleted: boolean
  onToggle: () => void
  isVideoOpen: boolean
  onVideoToggle: () => void
  useAlternative?: boolean
  isPreview?: boolean
  hasLinkedWorkout?: boolean
}

function ExerciseRow({
  exercise,
  isCompleted,
  onToggle,
  isVideoOpen,
  onVideoToggle,
  useAlternative,
  isPreview,
  hasLinkedWorkout,
}: ExerciseRowProps) {
  const display =
    useAlternative && exercise.alternative ? exercise.alternative : exercise
  const videoId =
    useAlternative && exercise.alternative?.youtubeVideoId
      ? exercise.alternative.youtubeVideoId
      : exercise.youtubeVideoId

  // Format sets/reps/duration
  const getMetrics = () => {
    const parts: string[] = []
    if (display.sets) parts.push(`${display.sets} sets`)
    if (display.reps) parts.push(`${display.reps} reps`)
    if (exercise.duration && !useAlternative) {
      const mins = Math.floor(exercise.duration / 60)
      const secs = exercise.duration % 60
      if (mins > 0) {
        parts.push(`${mins}m${secs > 0 ? ` ${secs}s` : ''}`)
      } else {
        parts.push(`${secs}s`)
      }
    }
    if (exercise.rest) parts.push(`${exercise.rest}s rest`)
    return parts.join(' × ')
  }

  return (
    <div
      className={cn(
        'rounded-md border transition-colors',
        isCompleted
          ? 'border-transparent bg-muted/30'
          : 'bg-background/50 border-transparent'
      )}
    >
      <div
        className={cn(
          'flex items-start gap-2 p-2 transition-colors',
          !isPreview && 'hover:bg-muted/30 cursor-pointer'
        )}
        onClick={isPreview ? undefined : onToggle}
      >
        {/* Checkbox - hidden in preview mode */}
        {!isPreview && (
          <div className="mt-0.5 shrink-0">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => onToggle()}
              onClick={e => e.stopPropagation()}
              className="size-4"
            />
          </div>
        )}

        {/* Exercise Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'text-[13px] font-medium',
                isCompleted && 'text-muted-foreground line-through'
              )}
            >
              {display.name}
            </span>
            {useAlternative && (
              <Badge
                variant="outline"
                className="h-4 border-amber-500/30 bg-amber-500/10 py-0 text-[9px] text-amber-600"
              >
                Alt
              </Badge>
            )}
            {exercise.isElbowSafe && (
              <Badge
                variant="outline"
                className="h-4 border-green-500/30 bg-green-500/10 py-0 text-[9px] text-green-600"
              >
                Safe
              </Badge>
            )}
            {hasLinkedWorkout && isCompleted && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="h-4 gap-0.5 border-green-500/30 bg-green-500/10 py-0 text-[9px] text-green-600"
                    >
                      <Watch className="size-2.5" />
                      Tracked
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Apple Watch workout linked</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Metrics */}
          <div className="text-muted-foreground mt-0.5 text-[11px]">
            {getMetrics()}
          </div>

          {/* Form cue */}
          {display.form && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-foreground/70 mt-1 line-clamp-1 cursor-help text-[11px]">
                    {display.form}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[300px]">
                  <p className="text-xs">{display.form}</p>
                  {exercise.notes && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {exercise.notes}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Video button */}
        {videoId && (
          <Button
            variant={isVideoOpen ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 shrink-0 gap-1 px-2 text-[10px]"
            onClick={e => {
              e.stopPropagation()
              onVideoToggle()
            }}
          >
            <Play className="size-3" />
            Demo
          </Button>
        )}
      </div>

      {/* Inline Video */}
      {isVideoOpen && videoId && (
        <div className="px-2 pb-2">
          <YouTubePlayer
            videoId={videoId}
            title={display.name}
            isOpen={true}
            onToggle={onVideoToggle}
            compact
            hideTrigger
          />
        </div>
      )}
    </div>
  )
}
