"use client"

import { useState, useEffect } from "react"
import { FitnessWorkoutCard } from "./fitness-workout-card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus, AlertCircle } from "lucide-react"
import type { WeeklyRoutine, DayOfWeek, Workout } from "@/lib/types/fitness.types"
import { toast } from "sonner"
import { apiGet, apiPost } from "@/lib/api/client"

export function FitnessRoutine() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [workoutDefinitions, setWorkoutDefinitions] = useState<Record<DayOfWeek, Workout | null>>({} as Record<DayOfWeek, Workout | null>)

  const fetchRoutine = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<WeeklyRoutine>("/api/fitness/routine")
      if (!response.success) throw new Error(response.error || "Failed to fetch routine")
      if (response.data) {
        setRoutine(response.data)
        const firstWeek = response.data.weeks[0]
        if (firstWeek) {
          setCurrentWeek(firstWeek.weekNumber)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load routine")
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkoutDefinitions = async () => {
    const days: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const definitions: Record<DayOfWeek, Workout | null> = {} as Record<DayOfWeek, Workout | null>
    
    await Promise.all(
      days.map(async (day) => {
        try {
          const response = await apiGet<Workout>(`/api/fitness/workout/${day}`)
          if (response.success && response.data) {
            definitions[day] = response.data
          } else {
            definitions[day] = null
          }
        } catch (error) {
          definitions[day] = null
        }
      })
    )
    
    setWorkoutDefinitions(definitions)
  }

  useEffect(() => {
    fetchRoutine()
    fetchWorkoutDefinitions()
  }, [])

  const handleComplete = async (day: DayOfWeek) => {
    try {
      const response = await apiPost(`/api/fitness/workout/${day}/complete?week=${currentWeek}`)
      if (!response.success) throw new Error("Failed to mark complete")
      await fetchRoutine()
      toast.success("Workout marked as complete!")
    } catch (error) {
      toast.error("Failed to mark workout complete")
    }
  }

  if (loading && !routine) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading fitness routine...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!routine) {
    return (
      <div className="rounded-xl bg-background p-4 ">
        <p className="text-sm text-muted-foreground">No routine found</p>
      </div>
    )
  }

  const currentWeekData = routine.weeks.find((w) => w.weekNumber === currentWeek)
  const days: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{routine.name}</h3>
          <p className="text-sm text-muted-foreground">Week {currentWeek}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchRoutine} disabled={loading} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="size-4" />
            Add Workout
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {days.map((day, idx) => {
          const dayData = currentWeekData?.days[day]
          const scheduleInfo = routine.schedule[day]
          const workoutDef = workoutDefinitions[day]
          
          return (
            <div key={day}>
              <h4 className="mb-2 text-sm font-medium text-foreground">{dayNames[idx]}</h4>
              {workoutDef ? (
                <FitnessWorkoutCard
                  workout={{
                    ...workoutDef,
                    completed: dayData?.workout?.completed || false,
                    completedAt: dayData?.workout?.completedAt,
                  }}
                  day={day}
                  onComplete={() => handleComplete(day)}
                />
              ) : scheduleInfo?.focus === "Active Recovery" ? (
                <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                  {scheduleInfo.goal}
                </div>
              ) : (
                <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                  {scheduleInfo?.focus || "No workout scheduled"}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
