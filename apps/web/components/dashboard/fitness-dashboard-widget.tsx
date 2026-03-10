"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { ConsistencyStats, DayOfWeek, WeeklyRoutine, Workout } from "@/lib/types/fitness.types"
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Flame, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { apiGet, apiPost } from "@/lib/api/client"

export function FitnessDashboardWidget() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null)
  const [consistency, setConsistency] = useState<ConsistencyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get routine
        const routineRes = await apiGet<WeeklyRoutine>("/api/fitness/routine")
        if (routineRes.success && routineRes.data) {
          setRoutine(routineRes.data)
        }

        // Get today's workout
        const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek
        const workoutRes = await apiGet<Workout>(`/api/fitness/workout/${today}`)
        if (workoutRes.success && workoutRes.data) {
          setTodayWorkout(workoutRes.data)
        }

        // Get consistency stats
        const consistencyRes = await apiGet<ConsistencyStats>("/api/fitness/consistency")
        if (consistencyRes.success && consistencyRes.data) {
          setConsistency(consistencyRes.data)
        }
      } catch (error) {
        console.error("Failed to fetch fitness data", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getCurrentDay = (): DayOfWeek => {
    return new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek
  }

  const getCurrentWeekNumber = (): number => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  const handleRoutineComplete = async (type: "morning" | "night") => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()

    try {
      const response = await apiPost(`/api/fitness/routine/${type}/complete?day=${day}&week=${weekNumber}`)
      if (!response.success) throw new Error("Failed to mark routine complete")

      // Refresh data
      const routineRes = await apiGet<WeeklyRoutine>("/api/fitness/routine")
      if (routineRes.success && routineRes.data) {
        setRoutine(routineRes.data)
      }

      const consistencyRes = await apiGet<ConsistencyStats>("/api/fitness/consistency")
      if (consistencyRes.success && consistencyRes.data) {
        setConsistency(consistencyRes.data)
      }

      toast.success(`${type === "morning" ? "Morning" : "Night"} routine completed!`)
    } catch (error) {
      toast.error("Failed to complete routine")
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fitness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!routine) {
    return null
  }

  const today = getCurrentDay()
  const weekNumber = getCurrentWeekNumber()
  const week = routine.weeks.find((w) => w.weekNumber === weekNumber)
  const todayData = week?.days[today]
  const scheduleInfo = routine.schedule[today]
  const dayName = today.charAt(0).toUpperCase() + today.slice(1)

  const morningCompleted = todayData?.morningRoutine?.completed || false
  const nightCompleted = todayData?.nightRoutine?.completed || false
  const workoutCompleted = todayData?.workout?.completed || false

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="size-5 text-accent-ember" />
              Fitness
            </CardTitle>
            <CardDescription className="mt-1">
              {dayName} • {scheduleInfo?.focus}
            </CardDescription>
          </div>
          <Link href="/fitness">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Consistency Streak */}
        {consistency && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-accent-ember" />
                <span className="text-sm font-medium">Current Streak</span>
              </div>
              <div className="text-2xl font-bold">{consistency.currentStreak}</div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {consistency.weeklyCompletion}% weekly completion
            </div>
          </div>
        )}

        {/* Daily Routines */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Daily Routines</h4>

          {/* Morning Routine */}
          <div className={`rounded-lg border p-3 transition-all ${morningCompleted ? "bg-accent-sage/5 ring-1 ring-accent-sage/20" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-accent-gold/10 p-1.5">
                  <Sun className="size-4 text-accent-gold" />
                </div>
                <div>
                  <div className="text-sm font-medium">{routine.dailyRoutines.morning.name}</div>
                  <div className="text-xs text-muted-foreground">{routine.dailyRoutines.morning.duration} mins</div>
                </div>
              </div>
              {morningCompleted ? (
                <CheckCircle2 className="size-5 text-accent-sage" />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRoutineComplete("morning")}
                  className="h-8"
                >
                  Complete
                </Button>
              )}
            </div>
          </div>

          {/* Night Routine */}
          <div className={`rounded-lg border p-3 transition-all ${nightCompleted ? "bg-accent-sage/5 ring-1 ring-accent-sage/20" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-accent-violet/10 p-1.5">
                  <Moon className="size-4 text-accent-violet" />
                </div>
                <div>
                  <div className="text-sm font-medium">{routine.dailyRoutines.night.name}</div>
                  <div className="text-xs text-muted-foreground">{routine.dailyRoutines.night.duration} mins</div>
                </div>
              </div>
              {nightCompleted ? (
                <CheckCircle2 className="size-5 text-accent-sage" />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRoutineComplete("night")}
                  className="h-8"
                >
                  Complete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Today's Workout */}
        {todayWorkout && scheduleInfo?.focus !== "Active Recovery" && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Today's Workout</h4>
            <div className={`rounded-lg border p-3 transition-all ${workoutCompleted ? "bg-accent-sage/5 ring-1 ring-accent-sage/20" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {workoutCompleted ? (
                      <CheckCircle2 className="size-4 text-accent-sage" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{todayWorkout.name}</div>
                      <div className="text-xs text-muted-foreground">{todayWorkout.goal}</div>
                    </div>
                  </div>
                  {todayWorkout.exercises && todayWorkout.exercises.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {todayWorkout.exercises.length} exercises
                    </div>
                  )}
                </div>
                <Link href={`/fitness/workout/${today}`}>
                  <Button size="sm" variant={workoutCompleted ? "outline" : "default"} className="h-8">
                    {workoutCompleted ? "View" : "Start"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Active Recovery Day */}
        {scheduleInfo?.focus === "Active Recovery" && (
          <div className="rounded-lg border bg-accent-azure/5 p-3 text-center">
            <div className="text-sm font-medium">Active Recovery</div>
            <div className="text-xs text-muted-foreground mt-1">{scheduleInfo.goal}</div>
          </div>
        )}

        {/* Injury Protocol Warning */}
        {routine.injuryProtocol.status === "active" && (
          <div className="rounded-lg border border-accent-ember/30 bg-accent-ember/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-accent-ember mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-medium text-accent-ember">
                  Injury Protocol Active
                </div>
                <div className="text-xs text-accent-ember mt-0.5">
                  {routine.injuryProtocol.name}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Progress */}
        {consistency && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>This Week</span>
              <span>{consistency.weeklyCompletion}%</span>
            </div>
            <Progress value={consistency.weeklyCompletion} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
