"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Dumbbell, 
  Sun, 
  Moon, 
  Flame, 
  ChevronRight, 
  Check,
  AlertTriangle,
  Footprints
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { 
  WeeklyRoutine, 
  DayOfWeek, 
  Workout, 
  ConsistencyStats 
} from "@/lib/types/fitness.types"

/**
 * FitnessWidget - A compact dashboard widget showing today's fitness at a glance.
 * 
 * Shows:
 * - Current streak
 * - Morning/night routine status
 * - Today's workout summary
 * - Quick link to full fitness page
 */
export function FitnessWidget() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null)
  const [consistencyStats, setConsistencyStats] = useState<ConsistencyStats | null>(null)
  const [loading, setLoading] = useState(true)

  const getCurrentDay = (): DayOfWeek => {
    return new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek
  }

  const getCurrentWeekNumber = (): number => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const day = getCurrentDay()
        const [routineRes, workoutRes, consistencyRes] = await Promise.all([
          fetch("/api/fitness/routine"),
          fetch(`/api/fitness/workout/${day}`),
          fetch("/api/fitness/consistency"),
        ])

        if (routineRes.ok) {
          const data = await routineRes.json()
          if (data.success) setRoutine(data.data)
        }

        if (workoutRes.ok) {
          const data = await workoutRes.json()
          if (data.success && data.data) setTodayWorkout(data.data)
        }

        if (consistencyRes.ok) {
          const data = await consistencyRes.json()
          if (data.success) setConsistencyStats(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch fitness data", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-5 rounded bg-muted" />
          <div className="h-5 w-20 rounded bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-12 rounded-lg bg-muted" />
          <div className="h-12 rounded-lg bg-muted" />
        </div>
      </div>
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
  const hasInjuryProtocol = routine.injuryProtocol?.status === "active"
  const isRestDay = scheduleInfo?.focus === "Rest"

  const morningDone = todayData?.morningRoutine?.completed || false
  const nightDone = todayData?.nightRoutine?.completed || false
  const workoutDone = todayData?.workout?.completed || false

  // Calculate today's progress
  const totalTasks = isRestDay ? 2 : 3 // morning, night, and workout (if not rest day)
  const completedTasks = (morningDone ? 1 : 0) + (nightDone ? 1 : 0) + (workoutDone && !isRestDay ? 1 : 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-blue-500" />
          <h2 className="font-semibold">Fitness</h2>
          {hasInjuryProtocol && (
            <Badge variant="destructive" className="text-[10px] h-4 gap-0.5 px-1.5">
              <AlertTriangle className="size-2.5" />
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {consistencyStats && consistencyStats.currentStreak > 0 && (
            <div className="flex items-center gap-1 text-orange-500">
              <Flame className="size-4" />
              <span className="text-sm font-bold">{consistencyStats.currentStreak}</span>
            </div>
          )}
          <Link href="/fitness">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              View
              <ChevronRight className="size-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: totalTasks }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < completedTasks ? "bg-green-500" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Today's Summary */}
      <div className="space-y-2">
        {/* Morning Routine */}
        <div className={cn(
          "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
          morningDone 
            ? "bg-green-500/5 border-green-500/20" 
            : "bg-amber-500/5 border-amber-500/20"
        )}>
          <div className={cn(
            "rounded-md p-1.5",
            morningDone ? "bg-green-500/10" : "bg-amber-500/10"
          )}>
            <Sun className={cn(
              "size-4",
              morningDone ? "text-green-500" : "text-amber-500"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{routine.dailyRoutines.morning.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {routine.dailyRoutines.morning.duration}m · {routine.dailyRoutines.morning.exercises.length} stretches
            </div>
          </div>
          {morningDone && (
            <Check className="size-4 text-green-500 shrink-0" />
          )}
        </div>

        {/* Today's Workout / Rest Day */}
        {isRestDay ? (
          <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-blue-500/5 border-blue-500/20">
            <div className="rounded-md p-1.5 bg-blue-500/10">
              <Footprints className="size-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Rest Day</div>
              <div className="text-[11px] text-muted-foreground">
                {scheduleInfo?.goal || "10,000 Steps"}
              </div>
            </div>
          </div>
        ) : todayWorkout ? (
          <Link href="/fitness" className="block">
            <div className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg border transition-colors hover:bg-muted/50",
              workoutDone 
                ? "bg-green-500/5 border-green-500/20" 
                : "bg-blue-500/5 border-blue-500/20"
            )}>
              <div className={cn(
                "rounded-md p-1.5",
                workoutDone ? "bg-green-500/10" : "bg-blue-500/10"
              )}>
                <Dumbbell className={cn(
                  "size-4",
                  workoutDone ? "text-green-500" : "text-blue-500"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{todayWorkout.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {scheduleInfo?.focus} · {todayWorkout.exercises.length} exercises
                </div>
              </div>
              {workoutDone ? (
                <Check className="size-4 text-green-500 shrink-0" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              )}
            </div>
          </Link>
        ) : null}

        {/* Night Routine */}
        <div className={cn(
          "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
          nightDone 
            ? "bg-green-500/5 border-green-500/20" 
            : "bg-indigo-500/5 border-indigo-500/20"
        )}>
          <div className={cn(
            "rounded-md p-1.5",
            nightDone ? "bg-green-500/10" : "bg-indigo-500/10"
          )}>
            <Moon className={cn(
              "size-4",
              nightDone ? "text-green-500" : "text-indigo-500"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{routine.dailyRoutines.night.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {routine.dailyRoutines.night.duration}m · {routine.dailyRoutines.night.exercises.length} stretches
            </div>
          </div>
          {nightDone && (
            <Check className="size-4 text-green-500 shrink-0" />
          )}
        </div>
      </div>

      {/* Quick Stats Footer */}
      {consistencyStats && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
          <span>Week: {consistencyStats.weeklyCompletion}%</span>
          <span>Month: {consistencyStats.monthlyCompletion}%</span>
          <span>Best: {consistencyStats.longestStreak} days</span>
        </div>
      )}
    </div>
  )
}
