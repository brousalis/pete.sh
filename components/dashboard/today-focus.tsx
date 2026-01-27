"use client"

import { useState, useEffect } from "react"
import { Calendar, CheckCircle2, Circle, AlertTriangle, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DailyRoutineCard } from "./daily-routine-card"
import { format } from "date-fns"
import type { WeeklyRoutine, DayOfWeek, Workout } from "@/lib/types/fitness.types"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { apiGet, apiPost } from "@/lib/api/client"

export function TodayFocus() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null)
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
      const response = await apiPost(`/api/fitness/routine/${type}/complete?day=${day}&week=${weekNumber}`)
      if (!response.success) throw new Error("Failed to mark routine complete")

      // Refresh routine data
      const routineRes = await apiGet<WeeklyRoutine>("/api/fitness/routine")
      if (routineRes.success && routineRes.data) {
        setRoutine(routineRes.data)
      }
    } catch (error) {
      throw error
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
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
  const isActiveRecovery = scheduleInfo?.focus === "Active Recovery"

  return (
    <Card>
      {/* Compact Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="size-5 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{dayName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground text-sm">{format(new Date(), "MMM d")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {scheduleInfo?.focus} • {scheduleInfo?.goal}
              </p>
            </div>
          </div>
          {routine.injuryProtocol.status === "active" && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="size-3" />
              Injury Protocol Active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {/* Daily Routines - Compact */}
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

        {/* Today's Workout - Compact */}
        {todayWorkout && !isActiveRecovery && (
          <Link 
            href={`/fitness/workout/${today}`}
            className="block"
          >
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-muted/50",
              todayData?.workout?.completed 
                ? "bg-green-500/5 border-green-500/20" 
                : "bg-muted/30"
            )}>
              {todayData?.workout?.completed ? (
                <CheckCircle2 className="size-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="size-5 text-muted-foreground shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{todayWorkout.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {todayWorkout.exercises.length} exercises
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{todayWorkout.goal}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {todayData?.workout?.completed ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                    Done
                  </Badge>
                ) : (
                  <Button size="sm" variant="default" className="h-7 px-3 text-xs">
                    Start
                  </Button>
                )}
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        )}

        {isActiveRecovery && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
            <div className="flex-1">
              <span className="text-sm font-medium">Active Recovery</span>
              <p className="text-xs text-muted-foreground">
                {todayWorkout?.exercises[0]?.notes || "10,000 Steps"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
