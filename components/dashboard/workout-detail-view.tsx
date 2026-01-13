"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Circle, AlertTriangle, Clock, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { Workout, Exercise } from "@/lib/types/fitness.types"
import type { DayOfWeek } from "@/lib/types/fitness.types"

interface WorkoutDetailViewProps {
  day: DayOfWeek
  onComplete?: () => void
}

export function WorkoutDetailView({ day, onComplete }: WorkoutDetailViewProps) {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        const response = await fetch(`/api/fitness/workout/${day}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setWorkout(data.data)
          }
        }
      } catch (error) {
        console.error("Failed to fetch workout", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkout()
  }, [day])

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const response = await fetch(`/api/fitness/workout/${day}/complete`, {
        method: "POST",
        body: JSON.stringify({
          exercisesCompleted: Array.from(completedExercises),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to mark workout complete")

      toast.success("Workout completed!")
      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      toast.error("Failed to complete workout")
    } finally {
      setIsCompleting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading workout...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!workout) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No workout found</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  // Allow completion even if not all exercises are marked (for flexibility)
  const hasCompletedExercises = completedExercises.size > 0
  const hasElbowSafeExercises = workout.exercises.some((ex) => ex.isElbowSafe === false && ex.alternative)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{workout.name}</CardTitle>
              <CardDescription className="mt-1">{workout.goal}</CardDescription>
            </div>
            {hasElbowSafeExercises && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                Injury Protocol
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warmup */}
          {workout.warmup && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <RotateCcw className="size-4" />
                {workout.warmup.name} ({workout.warmup.duration} mins)
              </h3>
              <div className="space-y-2">
                {workout.warmup.exercises.map((exercise) => (
                  <div key={exercise.id} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{exercise.name}</div>
                        {exercise.sets && exercise.reps && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {exercise.sets} sets × {exercise.reps} reps
                          </div>
                        )}
                        {exercise.duration && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {Math.floor(exercise.duration / 60)}:{(exercise.duration % 60).toString().padStart(2, "0")}
                          </div>
                        )}
                        {exercise.notes && (
                          <div className="mt-1 text-xs text-muted-foreground">{exercise.notes}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Main Exercises */}
          <div>
            <h3 className="mb-3 font-semibold">Exercises</h3>
            <div className="space-y-3">
              {workout.exercises.map((exercise) => {
                const isCompleted = completedExercises.has(exercise.id)
                const shouldUseAlternative = exercise.isElbowSafe === false && exercise.alternative
                const displayExercise = shouldUseAlternative ? exercise.alternative! : exercise

                return (
                  <Card
                    key={exercise.id}
                    className={`cursor-pointer transition-all hover:ring-2 ${
                      isCompleted ? "ring-2 ring-green-500/50 bg-green-50/50 dark:bg-green-950/10" : ""
                    }`}
                    onClick={() => toggleExercise(exercise.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isCompleted ? (
                            <CheckCircle2 className="size-5 text-green-500" />
                          ) : (
                            <Circle className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{displayExercise.name}</h4>
                              {shouldUseAlternative && (
                                <Badge variant="outline" className="mt-1">
                                  Elbow Safe Alternative
                                </Badge>
                              )}
                            </div>
                            {displayExercise.sets && displayExercise.reps && (
                              <Badge variant="secondary">
                                {displayExercise.sets}×{displayExercise.reps}
                              </Badge>
                            )}
                            {displayExercise.duration && (
                              <Badge variant="secondary">
                                <Clock className="mr-1 size-3" />
                                {displayExercise.duration}s
                              </Badge>
                            )}
                          </div>
                          {displayExercise.form && (
                            <p className="mt-2 text-sm text-muted-foreground">{displayExercise.form}</p>
                          )}
                          {displayExercise.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">{displayExercise.notes}</p>
                          )}
                          {exercise.rest && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Rest: {exercise.rest}s
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Finisher */}
          {workout.finisher && workout.finisher.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 font-semibold">Finisher</h3>
                <div className="space-y-2">
                  {workout.finisher.map((exercise) => {
                    const shouldUseAlternative = exercise.isElbowSafe === false && exercise.alternative
                    const displayExercise = shouldUseAlternative ? exercise.alternative! : exercise

                    return (
                      <div key={exercise.id} className="rounded-lg border bg-muted/30 p-3">
                        <div className="font-medium">{displayExercise.name}</div>
                        {displayExercise.form && (
                          <p className="mt-1 text-sm text-muted-foreground">{displayExercise.form}</p>
                        )}
                        {displayExercise.notes && (
                          <p className="mt-1 text-xs text-muted-foreground">{displayExercise.notes}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {workout.notes && workout.notes.length > 0 && (
            <>
              <Separator />
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertTitle>Important Notes</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {workout.notes.map((note, idx) => (
                      <li key={idx} className="text-sm">{note}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Complete Button */}
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full"
            size="lg"
          >
            {isCompleting ? "Completing..." : "Complete Workout"}
          </Button>
          {completedExercises.size > 0 && completedExercises.size < workout.exercises.length && (
            <p className="text-center text-xs text-muted-foreground">
              {completedExercises.size} of {workout.exercises.length} exercises completed
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
