"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Circle, Calendar, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import type { WeeklyRoutine, DayOfWeek, FitnessProgress } from "@/lib/types/fitness.types"

export function WeeklySchedule() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [progress, setProgress] = useState<FitnessProgress | null>(null)
  const [currentWeek, setCurrentWeek] = useState(1)
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
            if (routineData.data.weeks.length > 0) {
              setCurrentWeek(routineData.data.weeks[0].weekNumber)
            }
          }
        }

        // Get progress
        const progressRes = await fetch(`/api/fitness/progress?week=${currentWeek}`)
        if (progressRes.ok) {
          const progressData = await progressRes.json()
          if (progressData.success) {
            setProgress(progressData.data)
          }
        }
      } catch (error) {
        console.error("Failed to fetch data", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentWeek])

  const getCurrentWeekNumber = (): number => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  const getWeekStartDate = (weekNumber: number): Date => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = (weekNumber - 1) * 7
    const weekStart = new Date(startOfYear)
    weekStart.setDate(startOfYear.getDate() + days - startOfYear.getDay() + 1) // Monday
    return weekStart
  }

  if (loading || !routine || !progress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  const days: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const weekStart = getWeekStartDate(currentWeek)
  const isCurrentWeek = currentWeek === getCurrentWeekNumber()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Week {currentWeek}
            {isCurrentWeek && <Badge variant="secondary">Current</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek((prev) => Math.max(1, prev - 1))}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek((prev) => prev + 1)}
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {format(weekStart, "MMM d")} - {format(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), "MMM d")}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {days.map((day, idx) => {
            const scheduleInfo = routine.schedule[day]
            const dayProgress = progress.workoutsByDay[day]
            const isToday = day === new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek && isCurrentWeek

            return (
              <div
                key={day}
                className={`rounded-lg border p-4 transition-all ${
                  isToday ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{dayNames[idx]}</h4>
                      {isToday && <Badge variant="outline">Today</Badge>}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {scheduleInfo?.focus}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {scheduleInfo?.goal}
                    </div>

                    {/* Completion Status */}
                    <div className="mt-3 flex items-center gap-4 text-xs">
                      {dayProgress?.workout && (
                        <div className="flex items-center gap-1.5">
                          {dayProgress.workout.completed ? (
                            <CheckCircle2 className="size-4 text-green-500" />
                          ) : (
                            <Circle className="size-4 text-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">Workout</span>
                        </div>
                      )}
                      {dayProgress?.morningRoutine && (
                        <div className="flex items-center gap-1.5">
                          {dayProgress.morningRoutine.completed ? (
                            <CheckCircle2 className="size-4 text-green-500" />
                          ) : (
                            <Circle className="size-4 text-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">Morning</span>
                        </div>
                      )}
                      {dayProgress?.nightRoutine && (
                        <div className="flex items-center gap-1.5">
                          {dayProgress.nightRoutine.completed ? (
                            <CheckCircle2 className="size-4 text-green-500" />
                          ) : (
                            <Circle className="size-4 text-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">Night</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {scheduleInfo?.focus !== "Active Recovery" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/fitness/workout/${day}`
                      }}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Week Summary */}
        <div className="mt-6 rounded-lg border bg-muted/30 p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{progress.completedWorkouts}/{progress.totalWorkouts}</div>
              <div className="text-xs text-muted-foreground">Workouts</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{progress.completedMorningRoutines}/{progress.totalMorningRoutines}</div>
              <div className="text-xs text-muted-foreground">Morning</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{progress.completedNightRoutines}/{progress.totalNightRoutines}</div>
              <div className="text-xs text-muted-foreground">Night</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
