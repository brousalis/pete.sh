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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { FullscreenTimer } from '@/components/ui/fullscreen-timer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    Ban,
    ChevronDown,
    ChevronRight,
    Dumbbell,
    Expand,
    Footprints,
    PersonStanding,
    Play,
    RotateCcw,
    StretchVertical,
    Timer,
    Undo2,
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
  /** Callback when workout completion is undone */
  onUncomplete?: () => void
  /** Whether completion is in progress */
  isCompleting?: boolean
  /** Currently open video ID */
  openVideoId?: string | null
  /** Callback when video is toggled */
  onVideoToggle?: (exerciseId: string | null) => void
  /** Whether viewing in preview mode (another day) */
  isPreview?: boolean
  /** Tracked workouts for today */
  appleWorkouts?: AppleWorkout[]
  /** Custom class name */
  className?: string
  /** Callback when workout is skipped */
  onSkip?: (reason: string) => void
  /** Callback when skip is undone */
  onUnskip?: () => void
  /** Whether skip operation is in progress */
  isSkipping?: boolean
  /** Active routine version number */
  versionNumber?: number | null
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
  'recovery flush': ['cycling'], // Stationary bike recovery
  'incline walk': ['walking'],
  walk: ['walking'],
  // Rowing
  row: ['rowing'],
  rowing: ['rowing'],
  rower: ['rowing'],
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
  exercise: { name: string; notes?: string },
  workouts: AppleWorkout[]
): AppleWorkout | null {
  // Combine name and notes for matching (notes often contain equipment details like "Stationary Bike")
  const searchText = `${exercise.name} ${exercise.notes || ''}`.toLowerCase()

  // Find matching workout types for this exercise
  let matchingTypes: string[] = []
  for (const [keyword, types] of Object.entries(EXERCISE_WORKOUT_MAPPING)) {
    if (searchText.includes(keyword)) {
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
  onUncomplete,
  isCompleting = false,
  openVideoId,
  onVideoToggle,
  isPreview = false,
  appleWorkouts = [],
  className,
  onSkip,
  onUnskip,
  isSkipping = false,
  versionNumber,
}: WorkoutCenterProps) {
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(
    new Set(completion?.exercisesCompleted || [])
  )
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['exercises']) // Main exercises open by default
  )
  const [skipDialogOpen, setSkipDialogOpen] = useState(false)
  const [skipReason, setSkipReason] = useState('')
  
  // Fullscreen timer state
  const [fullscreenTimerOpen, setFullscreenTimerOpen] = useState(false)
  const [fullscreenTimerExercise, setFullscreenTimerExercise] = useState<{
    id: string
    name: string
    duration: number
    form?: string
    sectionExercises?: Exercise[]
    currentIndex?: number
  } | null>(null)

  const isWorkoutCompleted = completion?.completed || false
  const isWorkoutSkipped = completion?.skipped || false

  // Sync completedExercises when completion prop changes (e.g., viewing different dates)
  useEffect(() => {
    setCompletedExercises(new Set(completion?.exercisesCompleted || []))
  }, [completion?.exercisesCompleted])

  // Match exercises to tracked workouts
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
        exercise,
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

  // Fullscreen timer handlers
  const openFullscreenTimer = (exercise: Exercise, sectionExercises?: Exercise[]) => {
    if (!exercise.duration) return
    const currentIndex = sectionExercises?.findIndex(e => e.id === exercise.id) ?? -1
    setFullscreenTimerExercise({
      id: exercise.id,
      name: exercise.name,
      duration: exercise.duration,
      form: exercise.form,
      sectionExercises,
      currentIndex: currentIndex >= 0 ? currentIndex : undefined,
    })
    setFullscreenTimerOpen(true)
  }

  const handleFullscreenTimerComplete = () => {
    if (fullscreenTimerExercise) {
      // Mark current exercise complete
      setCompletedExercises(prev => new Set(prev).add(fullscreenTimerExercise.id))
      
      // Auto-advance to next timed exercise in section
      const { sectionExercises, currentIndex } = fullscreenTimerExercise
      if (sectionExercises && currentIndex !== undefined) {
        // Find next exercise with duration
        for (let i = currentIndex + 1; i < sectionExercises.length; i++) {
          const nextExercise = sectionExercises[i]
          if (nextExercise.duration) {
            setFullscreenTimerExercise({
              id: nextExercise.id,
              name: nextExercise.name,
              duration: nextExercise.duration,
              form: nextExercise.form,
              sectionExercises,
              currentIndex: i,
            })
            return
          }
        }
      }
      // No more timed exercises, close
      setFullscreenTimerOpen(false)
      setFullscreenTimerExercise(null)
    }
  }

  const handleFullscreenTimerSkip = () => {
    if (fullscreenTimerExercise) {
      const { sectionExercises, currentIndex } = fullscreenTimerExercise
      if (sectionExercises && currentIndex !== undefined) {
        // Find next exercise with duration
        for (let i = currentIndex + 1; i < sectionExercises.length; i++) {
          const nextExercise = sectionExercises[i]
          if (nextExercise.duration) {
            setFullscreenTimerExercise({
              id: nextExercise.id,
              name: nextExercise.name,
              duration: nextExercise.duration,
              form: nextExercise.form,
              sectionExercises,
              currentIndex: i,
            })
            return
          }
        }
      }
      setFullscreenTimerOpen(false)
      setFullscreenTimerExercise(null)
    }
  }

  const closeFullscreenTimer = () => {
    setFullscreenTimerOpen(false)
    setFullscreenTimerExercise(null)
  }

  // Check if there are more timed exercises after current one
  const hasMoreTimedExercises = () => {
    if (!fullscreenTimerExercise?.sectionExercises || fullscreenTimerExercise.currentIndex === undefined) {
      return false
    }
    const { sectionExercises, currentIndex } = fullscreenTimerExercise
    for (let i = currentIndex + 1; i < sectionExercises.length; i++) {
      if (sectionExercises[i].duration) return true
    }
    return false
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

  // Handle skip submission
  const handleSkipSubmit = () => {
    if (skipReason.trim() && onSkip) {
      onSkip(skipReason.trim())
      setSkipDialogOpen(false)
      setSkipReason('')
    }
  }

  // Handle unskip
  const handleUnskip = () => {
    if (onUnskip) {
      onUnskip()
    }
  }

  // Rest day view
  if (!workout) {
    return (
      <Card
        className={cn(
          'flex flex-col border-blue-500/20 bg-blue-500/5 py-0 md:h-full',
          className
        )}
      >
        <CardContent className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 text-center">
          <div className="mb-3 sm:mb-4 rounded-full bg-blue-500/10 p-3 sm:p-4 text-blue-500">
            <Footprints className="size-6 sm:size-8" />
          </div>
          <h2 className="mb-1 text-lg sm:text-xl font-semibold">{dayName} - Rest Day</h2>
          <p className="text-muted-foreground mb-3 sm:mb-4 text-sm">
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
        'flex flex-col py-0 md:h-full md:min-h-0 md:overflow-hidden',
        isWorkoutSkipped && 'opacity-60',
        isPreview && !isWorkoutCompleted && !isWorkoutSkipped && 'border-dashed border-muted-foreground/20',
        className
      )}
    >
      <CardContent className="flex flex-col p-0 md:min-h-0 md:flex-1 md:overflow-hidden">
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 sm:gap-3 border-b p-2.5 sm:p-3',
            isWorkoutCompleted ? 'bg-muted/20 border-border/30' : isWorkoutSkipped ? 'bg-muted/10 border-border/20' : 'bg-muted/30'
          )}
        >
          <div
            className={cn(
              'rounded-md p-1.5 sm:p-2 shrink-0',
              isWorkoutCompleted ? 'bg-muted/30 text-foreground/60' : isWorkoutSkipped ? 'bg-muted/20 text-muted-foreground' : 'bg-blue-500/10 text-blue-500'
            )}
          >
            <Dumbbell className="size-4 sm:size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className={cn(
                "truncate text-sm sm:text-base font-semibold",
                isWorkoutCompleted && "text-foreground/80",
                isWorkoutSkipped && "text-muted-foreground"
              )}>
                {workout.name}
              </h2>
              {versionNumber != null && (
                <span className="shrink-0 text-[9px] sm:text-[10px] font-medium text-muted-foreground/60 tabular-nums">
                  v{versionNumber}
                </span>
              )}
              {hasInjuryProtocol && (
                <Badge
                  className="h-4 sm:h-5 shrink-0 gap-0.5 text-[9px] sm:text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-500 border-0"
                >
                  <AlertTriangle className="size-2.5" />
                  Injury
                </Badge>
              )}
              {isWorkoutCompleted && (
                <Badge
                  className="h-4 sm:h-5 shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[9px] sm:text-[10px] font-medium"
                >
                  Done
                </Badge>
              )}
              {isWorkoutSkipped && (
                <Badge
                  className="h-4 sm:h-5 shrink-0 gap-0.5 bg-muted/50 text-muted-foreground border-0 text-[9px] sm:text-[10px] font-medium"
                >
                  <Ban className="size-2.5" />
                  Skipped
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs mt-0.5">
              <span className={cn("font-medium", isWorkoutCompleted || isWorkoutSkipped ? "text-muted-foreground" : "text-foreground/80")}>{dayName}</span>
              <span>·</span>
              <span>{focus}</span>
              {workout.goal && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span className="truncate hidden sm:inline">{workout.goal}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Skipped Banner */}
        {isWorkoutSkipped && completion?.skippedReason && (
          <div className="border-b border-border/20 bg-muted/10 px-3 py-2">
            <p className="text-[11px] text-muted-foreground/70 italic">
              "{completion.skippedReason}"
            </p>
          </div>
        )}

        {/* Sections - Scrollable on desktop only */}
        <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
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
                onOpenFullscreenTimer={!isWorkoutCompleted && !isWorkoutSkipped ? openFullscreenTimer : undefined}
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
        </div>

        {/* Footer */}
        <div
          className={cn(
            'border-t p-2.5 sm:p-3',
            isWorkoutCompleted ? 'bg-muted/10 border-border/30' : isWorkoutSkipped ? 'bg-muted/5 border-border/20' : 'bg-muted/20'
          )}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1">
              <div className={cn(
                "text-[11px] sm:text-xs",
                isWorkoutCompleted || isWorkoutSkipped ? "text-muted-foreground/60" : "text-muted-foreground"
              )}>
                {isWorkoutSkipped
                  ? `${totalExercises} exercises`
                  : isWorkoutCompleted
                    ? `${completion?.exercisesCompleted?.length || totalExercises}/${totalExercises} completed`
                    : `${completedExercises.size}/${totalExercises} exercises`}
              </div>
            </div>
            {/* Actions: Complete and Skip */}
            <div className="flex items-center gap-1.5 sm:gap-2">
                {isWorkoutSkipped ? (
                  <>
                    <span className="text-[10px] text-muted-foreground/60 font-medium hidden sm:inline">
                      Skipped
                    </span>
                    {onUnskip && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 sm:h-6 gap-1 px-2.5 sm:px-2 text-[11px] sm:text-[10px] text-muted-foreground/60 hover:text-foreground touch-manipulation"
                        onClick={handleUnskip}
                        disabled={isSkipping}
                      >
                        <Undo2 className="size-3 sm:size-2.5" />
                        Undo
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {onSkip && !isWorkoutCompleted && (
                      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 sm:h-8 gap-1 px-2.5 sm:px-2 text-muted-foreground hover:text-foreground touch-manipulation"
                          >
                            <Ban className="size-4 sm:size-3.5" />
                            <span className="hidden sm:inline">Skip</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
                          <DialogHeader>
                          <DialogTitle>Skip Workout</DialogTitle>
                          <DialogDescription>
                            Why was this workout skipped? This helps track patterns and plan recovery.
                          </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="skip-reason-today">Reason</Label>
                              <Input
                                id="skip-reason-today"
                                placeholder="e.g., Sick, Travel, Injury recovery..."
                                value={skipReason}
                                onChange={(e) => setSkipReason(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && skipReason.trim()) {
                                    handleSkipSubmit()
                                  }
                                }}
                                className="h-11 sm:h-10 text-base sm:text-sm"
                              />
                            </div>
                          </div>
                          <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                              variant="outline"
                              className="h-11 sm:h-10 touch-manipulation"
                              onClick={() => {
                                setSkipDialogOpen(false)
                                setSkipReason('')
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="h-11 sm:h-10 touch-manipulation"
                              onClick={handleSkipSubmit}
                              disabled={!skipReason.trim() || isSkipping}
                            >
                              {isSkipping ? 'Skipping...' : 'Skip Workout'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    {isWorkoutCompleted ? (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium hidden sm:inline">
                          Completed
                        </span>
                        {onUncomplete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 sm:h-6 gap-1 px-2.5 sm:px-2 text-[11px] sm:text-[10px] text-muted-foreground/60 hover:text-foreground touch-manipulation"
                            onClick={onUncomplete}
                            disabled={isCompleting}
                          >
                            <Undo2 className="size-3 sm:size-2.5" />
                            Undo
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="h-10 sm:h-8 px-4 sm:px-3 text-sm sm:text-xs touch-manipulation"
                        onClick={handleComplete}
                        disabled={isCompleting}
                      >
                        {isCompleting ? 'Completing...' : 'Complete'}
                      </Button>
                    )}
                  </>
                )}
              </div>
          </div>
        </div>

        {/* Fullscreen Timer Modal */}
        <FullscreenTimer
          isOpen={fullscreenTimerOpen}
          onClose={closeFullscreenTimer}
          duration={fullscreenTimerExercise?.duration ?? 30}
          exerciseName={fullscreenTimerExercise?.name ?? ""}
          subtitle={fullscreenTimerExercise?.form}
          onComplete={handleFullscreenTimerComplete}
          onSkip={hasMoreTimedExercises() ? handleFullscreenTimerSkip : undefined}
          variant="workout"
          autoStart
        />
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
  onOpenFullscreenTimer?: (exercise: Exercise, sectionExercises?: Exercise[]) => void
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
  onOpenFullscreenTimer,
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
  
  // Check if section has timed exercises (for showing "Start Timer" button)
  const timedExercises = section.exercises.filter(ex => ex.duration)
  const hasTimedExercises = timedExercises.length > 0
  const firstTimedExercise = timedExercises[0]

  return (
    <div className={cn('overflow-hidden rounded-lg border', section.bgColor)}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button className="active:bg-muted/30 hover:bg-muted/30 flex w-full items-center gap-2 p-3 sm:p-2.5 text-left transition-colors touch-manipulation">
            <Icon className={cn('size-4 sm:size-4 shrink-0', section.iconColor)} />
            <span className="flex-1 text-sm font-medium">{section.title}</span>
            {hasLinkedWorkouts && isWorkoutCompleted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Watch className="size-3.5 text-green-500" />
                </TooltipTrigger>
                <TooltipContent>Activity data linked</TooltipContent>
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
            {/* Start Timer button for sections with timed exercises */}
            {hasTimedExercises && onOpenFullscreenTimer && !isWorkoutCompleted && (
              <div className="pb-1">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "w-full h-9 sm:h-8 text-xs gap-1.5 touch-manipulation",
                    section.iconColor,
                    section.id === 'warmup' && "hover:bg-blue-500/10 border-blue-500/30",
                    section.id === 'metabolic' && "hover:bg-orange-500/10 border-orange-500/30",
                    section.id === 'mobility' && "hover:bg-purple-500/10 border-purple-500/30"
                  )}
                  onClick={() => onOpenFullscreenTimer(firstTimedExercise, section.exercises)}
                >
                  <Timer className="size-3.5" />
                  Start {section.title} Timer
                  <span className="text-muted-foreground ml-1">({timedExercises.length} exercises)</span>
                </Button>
              </div>
            )}
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
                    onOpenFullscreenTimer={
                      exercise.duration && onOpenFullscreenTimer
                        ? () => onOpenFullscreenTimer(exercise, section.exercises)
                        : undefined
                    }
                  />
                  {/* Show linked HealthKit workout data for cardio exercises */}
                  {showInlineWorkout && (isCompleted || isWorkoutCompleted) && (
                    <HealthKitExerciseData
                      workoutId={linkedWorkout.id}
                      workoutType={linkedWorkout.workout_type}
                      variant="detailed"
                      expandable={true}
                    />
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
  onOpenFullscreenTimer?: () => void
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
  onOpenFullscreenTimer,
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
          'flex items-start gap-2 p-2.5 sm:p-2 transition-colors touch-manipulation',
          !isPreview && 'active:bg-muted/30 hover:bg-muted/30 cursor-pointer'
        )}
        onClick={isPreview ? undefined : onToggle}
      >
        {/* Checkbox - hidden in preview mode, larger touch target on mobile */}
        {!isPreview && (
          <div className="mt-0.5 shrink-0">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => onToggle()}
              onClick={e => e.stopPropagation()}
              className="size-5 sm:size-4"
            />
          </div>
        )}

        {/* Exercise Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            <span
              className={cn(
                'text-[13px] sm:text-[13px] font-medium',
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
                  <TooltipContent>Tracked workout linked</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Metrics */}
          <div className="text-muted-foreground mt-0.5 text-[11px] sm:text-[11px]">
            {getMetrics()}
          </div>

          {/* Form cue - show full on mobile, tooltip on desktop */}
          {display.form && (
            <>
              {/* Mobile: show truncated text without tooltip */}
              <p className="text-foreground/70 mt-1 line-clamp-2 sm:hidden text-[11px]">
                {display.form}
              </p>
              {/* Desktop: show with tooltip */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-foreground/70 mt-1 line-clamp-1 cursor-help text-[11px] hidden sm:block">
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
            </>
          )}
        </div>

        {/* Fullscreen timer button for timed exercises */}
        {exercise.duration && onOpenFullscreenTimer && !isCompleted && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-6 shrink-0 gap-1 px-2 text-[11px] sm:text-[10px] touch-manipulation text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
            onClick={e => {
              e.stopPropagation()
              onOpenFullscreenTimer()
            }}
          >
            <Expand className="size-3.5 sm:size-3" />
            <span className="hidden sm:inline">Timer</span>
          </Button>
        )}

        {/* Video button - larger on mobile */}
        {videoId && (
          <Button
            variant={isVideoOpen ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 sm:h-6 shrink-0 gap-1 px-2.5 sm:px-2 text-[11px] sm:text-[10px] touch-manipulation"
            onClick={e => {
              e.stopPropagation()
              onVideoToggle()
            }}
          >
            <Play className="size-3.5 sm:size-3" />
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
