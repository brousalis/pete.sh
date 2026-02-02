'use client'

import { DashboardCardHeader } from '@/components/dashboard/dashboard-card-header'
import { Badge } from '@/components/ui/badge'
import { apiGet } from '@/lib/api/client'
import type {
  ConsistencyStats,
  DayOfWeek,
  WeeklyRoutine,
  Workout,
} from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  Moon,
  Sun,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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
  const [consistencyStats, setConsistencyStats] =
    useState<ConsistencyStats | null>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const day = getCurrentDay()
        const [routineRes, workoutRes, consistencyRes] = await Promise.all([
          apiGet<WeeklyRoutine>('/api/fitness/routine'),
          apiGet<Workout>(`/api/fitness/workout/${day}`),
          apiGet<ConsistencyStats>('/api/fitness/consistency'),
        ])

        if (routineRes.success && routineRes.data) {
          setRoutine(routineRes.data)
        }

        if (workoutRes.success && workoutRes.data) {
          setTodayWorkout(workoutRes.data)
        }

        if (consistencyRes.success && consistencyRes.data) {
          setConsistencyStats(consistencyRes.data)
        }
      } catch (error) {
        console.error('Failed to fetch fitness data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-4 flex items-center gap-2">
          <div className="bg-muted size-5 rounded" />
          <div className="bg-muted h-5 w-20 rounded" />
        </div>
        <div className="space-y-3">
          <div className="bg-muted h-12 rounded-lg" />
          <div className="bg-muted h-12 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!routine) {
    return null
  }

  const today = getCurrentDay()
  const weekNumber = getCurrentWeekNumber()
  const week = routine.weeks.find(w => w.weekNumber === weekNumber)
  const todayData = week?.days[today]
  const scheduleInfo = routine.schedule[today]
  const hasInjuryProtocol = routine.injuryProtocol?.status === 'active'
  const isRestDay = scheduleInfo?.focus === 'Rest'

  const morningDone = todayData?.morningRoutine?.completed || false
  const nightDone = todayData?.nightRoutine?.completed || false
  const workoutDone = todayData?.workout?.completed || false

  // Calculate today's progress
  const totalTasks = isRestDay ? 2 : 3 // morning, night, and workout (if not rest day)
  const completedTasks =
    (morningDone ? 1 : 0) +
    (nightDone ? 1 : 0) +
    (workoutDone && !isRestDay ? 1 : 0)

  return (
    <div>
      <DashboardCardHeader
        icon={<Dumbbell className="size-5 text-blue-500" />}
        iconContainerClassName="bg-blue-500/10"
        title="Fitness"
        badge={
          hasInjuryProtocol ? (
            <Badge
              variant="destructive"
              className="h-4 gap-0.5 px-1.5 text-[10px]"
            >
              <AlertTriangle className="size-2.5" />
            </Badge>
          ) : undefined
        }
        viewHref="/fitness"
        viewLabel="View"
        rightExtra={
          consistencyStats && consistencyStats.currentStreak > 0 ? (
            <div className="flex items-center gap-1 text-orange-500">
              <Flame className="size-4" />
              <span className="text-sm font-bold">
                {consistencyStats.currentStreak}
              </span>
            </div>
          ) : undefined
        }
      />

      {/* Progress indicator */}
      <div className="mb-4 flex gap-1">
        {Array.from({ length: totalTasks }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < completedTasks ? 'bg-green-500' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Today's Summary */}
      <div className="space-y-2">
        {/* Morning Routine */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border p-2.5 transition-colors',
            morningDone
              ? 'border-green-500/20 bg-green-500/5'
              : 'border-amber-500/20 bg-amber-500/5'
          )}
        >
          <div
            className={cn(
              'rounded-md p-1.5',
              morningDone ? 'bg-green-500/10' : 'bg-amber-500/10'
            )}
          >
            <Sun
              className={cn(
                'size-4',
                morningDone ? 'text-green-500' : 'text-amber-500'
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              {routine.dailyRoutines.morning.name}
            </div>
            <div className="text-muted-foreground text-[11px]">
              {routine.dailyRoutines.morning.duration}m ·{' '}
              {routine.dailyRoutines.morning.exercises.length} stretches
            </div>
          </div>
          {morningDone && <Check className="size-4 shrink-0 text-green-500" />}
        </div>

        {/* Today's Workout / Rest Day */}
        {isRestDay ? (
          <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5">
            <div className="rounded-md bg-blue-500/10 p-1.5">
              <Footprints className="size-4 text-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Rest Day</div>
              <div className="text-muted-foreground text-[11px]">
                {scheduleInfo?.goal || '10,000 Steps'}
              </div>
            </div>
          </div>
        ) : todayWorkout ? (
          <Link href="/fitness" className="block">
            <div
              className={cn(
                'hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-2.5 transition-colors',
                workoutDone
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-blue-500/20 bg-blue-500/5'
              )}
            >
              <div
                className={cn(
                  'rounded-md p-1.5',
                  workoutDone ? 'bg-green-500/10' : 'bg-blue-500/10'
                )}
              >
                <Dumbbell
                  className={cn(
                    'size-4',
                    workoutDone ? 'text-green-500' : 'text-blue-500'
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {todayWorkout.name}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {scheduleInfo?.focus} · {todayWorkout.exercises.length}{' '}
                  exercises
                </div>
              </div>
              {workoutDone ? (
                <Check className="size-4 shrink-0 text-green-500" />
              ) : (
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              )}
            </div>
          </Link>
        ) : null}

        {/* Night Routine */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border p-2.5 transition-colors',
            nightDone
              ? 'border-green-500/20 bg-green-500/5'
              : 'border-indigo-500/20 bg-indigo-500/5'
          )}
        >
          <div
            className={cn(
              'rounded-md p-1.5',
              nightDone ? 'bg-green-500/10' : 'bg-indigo-500/10'
            )}
          >
            <Moon
              className={cn(
                'size-4',
                nightDone ? 'text-green-500' : 'text-indigo-500'
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              {routine.dailyRoutines.night.name}
            </div>
            <div className="text-muted-foreground text-[11px]">
              {routine.dailyRoutines.night.duration}m ·{' '}
              {routine.dailyRoutines.night.exercises.length} stretches
            </div>
          </div>
          {nightDone && <Check className="size-4 shrink-0 text-green-500" />}
        </div>
      </div>

      {/* Quick Stats Footer */}
      {consistencyStats && (
        <div className="text-muted-foreground mt-4 flex items-center justify-between border-t pt-3 text-xs">
          <span>Week: {consistencyStats.weeklyCompletion}%</span>
          <span>Month: {consistencyStats.monthlyCompletion}%</span>
          <span>Best: {consistencyStats.longestStreak} days</span>
        </div>
      )}
    </div>
  )
}
