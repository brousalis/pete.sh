"use client"

import { useState, useEffect } from "react"
import { Calendar, CheckCircle2, Circle, AlertTriangle, Sun, Moon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DailyRoutineCard } from "./daily-routine-card"
import { format } from "date-fns"
import type { WeeklyRoutine, DayOfWeek, Workout } from "@/lib/types/fitness.types"
import { toast } from "sonner"

export function TodayFocus() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get routine
        const routineRes = await fetch("/api/fitness/routine")
        if (routineRes.ok) {
          const routineData = await routineRes.json()
          if (routineData.success) {
            setRoutine(routineData.data)
          }
        }

        // Get today's workout
        const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek
        const workoutRes = await fetch(`/api/fitness/workout/${today}`)
        if (workoutRes.ok) {
          const workoutData = await workoutRes.json()
          if (workoutData.success && workoutData.data) {
            setTodayWorkout(workoutData.data)
          }
        }
      } catch (error) {
        console.error("Failed to fetch today's data", error)
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
      const response = await fetch(`/api/fitness/routine/${type}/complete?day=${day}&week=${weekNumber}`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to mark routine complete")

      // Refresh routine data
      const routineRes = await fetch("/api/fitness/routine")
      if (routineRes.ok) {
        const routineData = await routineRes.json()
        if (routineData.success) {
          setRoutine(routineData.data)
        }
      }
    } catch (error) {
      throw error
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5" />
                {dayName} - {format(new Date(), "MMM d")}
              </CardTitle>
              <CardDescription className="mt-1">
                {scheduleInfo?.focus} • {scheduleInfo?.goal}
              </CardDescription>
            </div>
            {routine.injuryProtocol.status === "active" && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                Injury Protocol Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Daily Routines */}
          <div className="space-y-3">
            <DailyRoutineCard
              routine={routine.dailyRoutines.morning}
              completion={todayData?.morningRoutine}
              day={today}
              onComplete={() => handleRoutineComplete("morning")}
            />
            <DailyRoutineCard
              routine={routine.dailyRoutines.night}
              completion={todayData?.nightRoutine}
              day={today}
              onComplete={() => handleRoutineComplete("night")}
            />
          </div>

          {/* Today's Workout */}
          {todayWorkout && scheduleInfo?.focus !== "Active Recovery" && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {todayData?.workout?.completed ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                    <h3 className="font-semibold">{todayWorkout.name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{todayWorkout.goal}</p>
                  {todayWorkout.exercises.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {todayWorkout.exercises.length} exercises
                    </div>
                  )}
                </div>
                <Button
                  variant={todayData?.workout?.completed ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    // Navigate to workout detail
                    window.location.href = `/fitness/workout/${today}`
                  }}
                >
                  {todayData?.workout?.completed ? "View" : "Start"}
                </Button>
              </div>
            </div>
          )}

          {scheduleInfo?.focus === "Active Recovery" && (
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Active Recovery Day - {todayWorkout?.exercises[0]?.notes || "10,000 Steps"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
