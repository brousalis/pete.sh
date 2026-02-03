'use client'

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
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'

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
  /** Custom class name */
  className?: string
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
  className,
}: WorkoutCenterProps) {
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(
    new Set(completion?.exercisesCompleted || [])
  )
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['exercises']) // Main exercises open by default
  )

  const isWorkoutCompleted = completion?.completed || false

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
        isWorkoutCompleted && 'border-green-500/20 bg-green-500/5',
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
            isWorkoutCompleted ? 'bg-green-500/10' : 'bg-muted/20'
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
}: WorkoutSectionProps) {
  const Icon = section.icon
  const completedCount = section.exercises.filter(ex =>
    completedExercises.has(ex.id)
  ).length

  return (
    <div className={cn('overflow-hidden rounded-lg border', section.bgColor)}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button className="hover:bg-muted/30 flex w-full items-center gap-2 p-2.5 text-left transition-colors">
            <Icon className={cn('size-4 shrink-0', section.iconColor)} />
            <span className="flex-1 text-sm font-medium">{section.title}</span>
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
            {section.exercises.map(exercise => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                isCompleted={completedExercises.has(exercise.id)}
                onToggle={() => onExerciseToggle(exercise.id)}
                isVideoOpen={openVideoId === exercise.id}
                onVideoToggle={() => onVideoToggle(exercise.id)}
                useAlternative={
                  hasInjuryProtocol &&
                  exercise.isElbowSafe === false &&
                  !!exercise.alternative
                }
                isPreview={isPreview}
              />
            ))}
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
}

function ExerciseRow({
  exercise,
  isCompleted,
  onToggle,
  isVideoOpen,
  onVideoToggle,
  useAlternative,
  isPreview,
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
          ? 'border-green-500/20 bg-green-500/5'
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
