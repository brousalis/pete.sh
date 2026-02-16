"use client"

import { EnhancedWorkoutDetailView } from "@/components/dashboard/enhanced-workout-detail"
import type { AppleWorkout, DailyMetrics, WeeklySummary } from "@/components/dashboard/fitness-dashboard"
import { FitnessDashboard } from "@/components/dashboard/fitness-dashboard"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiGet } from "@/lib/api/client"
import {
  Activity,
  ChevronLeft,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

export default function ActivityDashboardPage() {
  const searchParams = useSearchParams()
  const workoutIdFromUrl = searchParams.get('workout')

  const [workouts, setWorkouts] = useState<AppleWorkout[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(workoutIdFromUrl)

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [workoutsRes, dailyRes, summaryRes] = await Promise.all([
        apiGet<AppleWorkout[]>('/api/apple-health/workout?limit=50'),
        apiGet<DailyMetrics | DailyMetrics[]>('/api/apple-health/daily?days=90'),
        apiGet<{ weeks: WeeklySummary[] }>('/api/apple-health/summary?weeks=4'),
      ])

      if (workoutsRes.success) {
        setWorkouts(workoutsRes.data || [])
      }

      if (dailyRes.success) {
        setDailyMetrics(Array.isArray(dailyRes.data) ? dailyRes.data : [dailyRes.data].filter((d): d is DailyMetrics => Boolean(d)))
      }

      if (summaryRes.success) {
        setWeeklySummary(summaryRes.data?.weeks || [])
      }
    } catch (error) {
      console.error('Error fetching activity data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Sync URL param → state (handles direct navigation & browser back/forward)
  useEffect(() => {
    setSelectedWorkoutId(workoutIdFromUrl)
  }, [workoutIdFromUrl])

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      setSelectedWorkoutId(params.get('workout'))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleWorkoutSelect = (workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    window.history.pushState(null, '', `/fitness/activity?workout=${workoutId}`)
  }

  const handleBackFromDetail = () => {
    setSelectedWorkoutId(null)
    window.history.pushState(null, '', '/fitness/activity')
  }

  // Workout detail view
  if (selectedWorkoutId) {
    return (
      <div className="h-full flex flex-col">
        <ScrollArea className="flex-1">
          <EnhancedWorkoutDetailView
            workoutId={selectedWorkoutId}
            onBack={handleBackFromDetail}
          />
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/fitness">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="size-4 mr-1" />
              Fitness
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Activity Dashboard</h1>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`size-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="size-5 animate-spin" />
            <span>Loading activity data...</span>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <FitnessDashboard
            workouts={workouts}
            dailyMetrics={dailyMetrics}
            weeklySummary={weeklySummary}
            onWorkoutClick={handleWorkoutSelect}
            className="pb-4"
          />
        </ScrollArea>
      )}
    </div>
  )
}
