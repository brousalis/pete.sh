'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Circle,
  Sun,
  Moon,
  Flame,
  ArrowRight,
  AlertTriangle,
  Dumbbell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import type {
  WeeklyRoutine,
  DayOfWeek,
  Workout,
  ConsistencyStats,
} from '@/lib/types/fitness.types'
import { toast } from 'sonner'

export function FitnessCard() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null)
  const [consistency, setConsistency] = useState<ConsistencyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [routineRes, consistencyRes] = await Promise.all([
          fetch('/api/fitness/routine'),
          fetch('/api/fitness/consistency'),
        ])

        if (routineRes.ok) {
          const data = await routineRes.json()
          if (data.success) setRoutine(data.data)
        }

        if (consistencyRes.ok) {
          const data = await consistencyRes.json()
          if (data.success) setConsistency(data.data)
        }

        // Get today's workout
        const today = new Date()
          .toLocaleDateString('en-US', { weekday: 'long' })
          .toLowerCase() as DayOfWeek
        const workoutRes = await fetch(`/api/fitness/workout/${today}`)
        if (workoutRes.ok) {
          const data = await workoutRes.json()
          if (data.success && data.data) setTodayWorkout(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch fitness data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getCurrentDay = (): DayOfWeek => {
    return new Date()
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase() as DayOfWeek
  }

  const getCurrentWeekNumber = (): number => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    )
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  const handleRoutineComplete = async (type: 'morning' | 'night') => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()

    try {
      const response = await fetch(
        `/api/fitness/routine/${type}/complete?day=${day}&week=${weekNumber}`,
        { method: 'POST' }
      )
      if (!response.ok) throw new Error('Failed')

      // Refresh data
      const [routineRes, consistencyRes] = await Promise.all([
        fetch('/api/fitness/routine'),
        fetch('/api/fitness/consistency'),
      ])

      if (routineRes.ok) {
        const data = await routineRes.json()
        if (data.success) setRoutine(data.data)
      }
      if (consistencyRes.ok) {
        const data = await consistencyRes.json()
        if (data.success) setConsistency(data.data)
      }

      toast.success(
        `${type === 'morning' ? 'Morning' : 'Night'} routine completed!`
      )
    } catch {
      toast.error('Failed to complete routine')
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-5 ">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!routine) return null

  const today = getCurrentDay()
  const weekNumber = getCurrentWeekNumber()
  const week = routine.weeks.find(w => w.weekNumber === weekNumber)
  const todayData = week?.days[today]
  const scheduleInfo = routine.schedule[today]
  const dayName = today.charAt(0).toUpperCase() + today.slice(1)

  const morningCompleted = todayData?.morningRoutine?.completed || false
  const nightCompleted = todayData?.nightRoutine?.completed || false
  const workoutCompleted = todayData?.workout?.completed || false

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-orange-500" />
          <h3 className="text-sm font-semibold text-foreground">Fitness</h3>
        </div>
        <Link href="/fitness">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            View All
            <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>

      {/* Day Info & Streak */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
        <div>
          <p className="text-sm font-medium">{dayName}</p>
          <p className="text-xs text-muted-foreground">{scheduleInfo?.focus}</p>
        </div>
        {consistency && (
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-orange-500" />
            <div className="text-right">
              <p className="text-lg font-bold leading-none">
                {consistency.currentStreak}
              </p>
              <p className="text-[10px] text-muted-foreground">streak</p>
            </div>
          </div>
        )}
      </div>

      {/* Daily Routines - Compact */}
      <div className="grid grid-cols-2 gap-2">
        {/* Morning */}
        <button
          onClick={() => !morningCompleted && handleRoutineComplete('morning')}
          disabled={morningCompleted}
          className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all ${
            morningCompleted
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-border hover:border-amber-500/50 hover:bg-amber-500/5'
          }`}
        >
          <div
            className={`rounded-md p-1.5 ${
              morningCompleted ? 'bg-green-500/20' : 'bg-amber-100 dark:bg-amber-900/20'
            }`}
          >
            {morningCompleted ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : (
              <Sun className="size-4 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {routine.dailyRoutines.morning.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {routine.dailyRoutines.morning.duration} mins
            </p>
          </div>
        </button>

        {/* Night */}
        <button
          onClick={() => !nightCompleted && handleRoutineComplete('night')}
          disabled={nightCompleted}
          className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all ${
            nightCompleted
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-border hover:border-indigo-500/50 hover:bg-indigo-500/5'
          }`}
        >
          <div
            className={`rounded-md p-1.5 ${
              nightCompleted
                ? 'bg-green-500/20'
                : 'bg-indigo-100 dark:bg-indigo-900/20'
            }`}
          >
            {nightCompleted ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : (
              <Moon className="size-4 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {routine.dailyRoutines.night.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {routine.dailyRoutines.night.duration} mins
            </p>
          </div>
        </button>
      </div>

      {/* Today's Workout */}
      {todayWorkout && scheduleInfo?.focus !== 'Active Recovery' && (
        <Link
          href={`/fitness/workout/${today}`}
          className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
            workoutCompleted
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-border hover:border-brand/50 hover:bg-brand/5'
          }`}
        >
          <div
            className={`rounded-lg p-2 ${
              workoutCompleted ? 'bg-green-500/20' : 'bg-brand/10'
            }`}
          >
            {workoutCompleted ? (
              <CheckCircle2 className="size-5 text-green-500" />
            ) : (
              <Dumbbell className="size-5 text-brand" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{todayWorkout.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {todayWorkout.goal}
            </p>
            {todayWorkout.exercises && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {todayWorkout.exercises.length} exercises
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant={workoutCompleted ? 'outline' : 'default'}
            className="shrink-0"
          >
            {workoutCompleted ? 'View' : 'Start'}
          </Button>
        </Link>
      )}

      {/* Active Recovery */}
      {scheduleInfo?.focus === 'Active Recovery' && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-center">
          <p className="text-sm font-medium">Active Recovery</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {scheduleInfo.goal}
          </p>
        </div>
      )}

      {/* Injury Protocol */}
      {routine.injuryProtocol.status === 'active' && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-2.5">
          <AlertTriangle className="size-4 text-orange-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
              Injury Protocol: {routine.injuryProtocol.name}
            </p>
          </div>
        </div>
      )}

      {/* Weekly Progress */}
      {consistency && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>This Week</span>
            <span className="font-medium">{consistency.weeklyCompletion}%</span>
          </div>
          <Progress value={consistency.weeklyCompletion} className="h-1.5" />
        </div>
      )}
    </div>
  )
}
