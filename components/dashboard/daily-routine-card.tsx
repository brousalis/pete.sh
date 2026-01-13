"use client"

import { useState } from "react"
import { CheckCircle2, Circle, Sun, Moon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { DailyRoutine, RoutineCompletion } from "@/lib/types/fitness.types"
import { format } from "date-fns"

interface DailyRoutineCardProps {
  routine: DailyRoutine
  completion?: RoutineCompletion
  day: string
  onComplete: () => void
}

export function DailyRoutineCard({ routine, completion, day, onComplete }: DailyRoutineCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const isCompleted = completion?.completed || false

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await onComplete()
      toast.success(`${routine.name} completed!`)
    } catch (error) {
      toast.error("Failed to mark routine complete")
    } finally {
      setIsCompleting(false)
    }
  }

  const completedExercises = routine.exercises.length
  const Icon = routine.type === "morning" ? Sun : Moon

  return (
    <Card className={`transition-all ${isCompleted ? "opacity-75 ring-2 ring-green-500/20" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${routine.type === "morning" ? "bg-amber-100 dark:bg-amber-900/20" : "bg-indigo-100 dark:bg-indigo-900/20"}`}>
              <Icon className={`size-5 ${routine.type === "morning" ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{routine.name}</CardTitle>
              <CardDescription className="mt-1">{routine.description}</CardDescription>
            </div>
          </div>
          {isCompleted ? (
            <CheckCircle2 className="size-6 text-green-500" />
          ) : (
            <Circle className="size-6 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-4" />
            <span>{routine.duration} mins</span>
          </div>
          <Badge variant="outline">{completedExercises} exercises</Badge>
        </div>

        <div className="space-y-2">
          {routine.exercises.map((exercise, idx) => (
            <div key={idx} className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{exercise.name}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{exercise.action}</p>
                </div>
                <Badge variant="secondary" className="ml-2 shrink-0">
                  {Math.floor(exercise.duration / 60)}m
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {completion?.completedAt && (
          <p className="text-xs text-muted-foreground">
            Completed {format(new Date(completion.completedAt), "h:mm a")}
          </p>
        )}

        {!isCompleted && (
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full"
            variant={routine.type === "morning" ? "default" : "outline"}
          >
            {isCompleting ? "Completing..." : `Complete ${routine.type === "morning" ? "Morning" : "Night"} Routine`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
