'use client'

import { Button } from '@/components/ui/button'
import type { Workout } from '@/lib/types/fitness.types'
import { format } from 'date-fns'
import { CheckCircle2, Circle } from 'lucide-react'

interface FitnessWorkoutCardProps {
  workout: Workout
  day: string
  onComplete?: () => void
  onEdit?: () => void
}

export function FitnessWorkoutCard({
  workout,
  day,
  onComplete,
  onEdit,
}: FitnessWorkoutCardProps) {
  const isCompleted = workout.completed

  return (
    <div
      className={`bg-background ring-border rounded-xl p-4 ring-1 ${
        isCompleted ? 'opacity-75' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="size-5 text-green-500" />
            ) : (
              <Circle className="text-muted-foreground size-5" />
            )}
            <h4 className="text-foreground font-semibold">{workout.name}</h4>
          </div>
          {workout.description && (
            <p className="text-muted-foreground mt-1 text-sm">
              {workout.description}
            </p>
          )}
          {workout.exercises && workout.exercises.length > 0 && (
            <div className="mt-2 space-y-1">
              {workout.exercises.slice(0, 3).map(exercise => (
                <div
                  key={exercise.id}
                  className="text-muted-foreground text-xs"
                >
                  • {exercise.name}
                  {exercise.sets &&
                    exercise.reps &&
                    ` (${exercise.sets}x${exercise.reps})`}
                </div>
              ))}
              {workout.exercises.length > 3 && (
                <div className="text-muted-foreground text-xs">
                  +{workout.exercises.length - 3} more exercises
                </div>
              )}
            </div>
          )}
          {workout.completedAt && (
            <p className="text-muted-foreground mt-2 text-xs">
              Completed {format(new Date(workout.completedAt), 'MMM d, h:mm a')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {!isCompleted && onComplete && (
          <Button
            size="sm"
            variant="outline"
            onClick={onComplete}
            className="flex-1"
          >
            Complete
          </Button>
        )}
        {onEdit && (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}
