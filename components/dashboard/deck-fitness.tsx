"use client"

import { useState, useEffect } from "react"
import { Dumbbell, CheckCircle2, Circle, Flame, RefreshCw } from "lucide-react"
import type { WeeklyRoutine, DayOfWeek, Workout, ConsistencyStats } from "@/lib/types/fitness.types"

export function DeckFitness() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null)
  const [consistency, setConsistency] = useState<ConsistencyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [routineRes, workoutRes, consistencyRes] = await Promise.all([
          fetch("/api/fitness/routine"),
          fetch(`/api/fitness/workout/${new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()}`),
          fetch("/api/fitness/consistency"),
        ])

        if (routineRes.ok) {
          const routineData = await routineRes.json()
          if (routineData.success) {
            setRoutine(routineData.data)
          }
        }

        if (workoutRes.ok) {
          const workoutData = await workoutRes.json()
          if (workoutData.success && workoutData.data) {
            setTodayWorkout(workoutData.data)
          }
        }

        if (consistencyRes.ok) {
          const consistencyData = await consistencyRes.json()
          if (consistencyData.success) {
            setConsistency(consistencyData.data)
          }
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

  if (loading || !routine) {
    return (
      <div className="rounded-2xl bg-card p-3 shadow-lg ring-1 ring-border">
        <div className="flex items-center justify-center py-2">
          <RefreshCw className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const today = getCurrentDay()
  const weekNumber = getCurrentWeekNumber()
  const week = routine.weeks.find((w) => w.weekNumber === weekNumber)
  const todayData = week?.days[today]
  const scheduleInfo = routine.schedule[today]

  const morningCompleted = todayData?.morningRoutine?.completed || false
  const nightCompleted = todayData?.nightRoutine?.completed || false
  const workoutCompleted = todayData?.workout?.completed || false

  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg ring-1 ring-border">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="rounded-lg bg-red-500/20 p-1.5">
            <Dumbbell className="size-4 text-red-500" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Fitness</div>
            {consistency && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="size-3 text-orange-500" />
                <span>{consistency.currentStreak} day streak</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-1.5">
        <div
          className={`flex items-center justify-between rounded-lg border p-1.5 ${
            morningCompleted ? "border-green-500/50 bg-green-500/10" : "border-border bg-background/50"
          }`}
        >
          <span className="text-xs font-medium text-foreground">Morning</span>
          {morningCompleted ? (
            <CheckCircle2 className="size-3.5 text-green-500" />
          ) : (
            <Circle className="size-3.5 text-muted-foreground" />
          )}
        </div>

        <div
          className={`flex items-center justify-between rounded-lg border p-1.5 ${
            nightCompleted ? "border-green-500/50 bg-green-500/10" : "border-border bg-background/50"
          }`}
        >
          <span className="text-xs font-medium text-foreground">Night</span>
          {nightCompleted ? (
            <CheckCircle2 className="size-3.5 text-green-500" />
          ) : (
            <Circle className="size-3.5 text-muted-foreground" />
          )}
        </div>

        {todayWorkout && scheduleInfo?.focus !== "Active Recovery" && (
          <div
            className={`flex items-center justify-between rounded-lg border p-1.5 ${
              workoutCompleted
                ? "border-green-500/50 bg-green-500/10"
                : "border-border bg-background/50"
            }`}
          >
            <span className="truncate text-xs font-medium text-foreground">
              {todayWorkout.name}
            </span>
            {workoutCompleted ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
            ) : (
              <Circle className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
        )}

        {scheduleInfo?.focus === "Active Recovery" && (
          <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-1.5 text-center">
            <div className="text-xs font-medium text-foreground">Active Recovery</div>
          </div>
        )}
      </div>
    </div>
  )
}
