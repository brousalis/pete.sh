'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { EnhancedWorkoutDetailView } from '@/components/coach/activity/enhanced-workout-detail'
import {
  FitnessDashboard,
  type AppleWorkout,
  type DailyMetrics,
  type SyncMetadata,
  type WeeklySummary,
} from '@/components/coach/activity/fitness-dashboard'
import { Button } from '@/components/ui/button'

interface ActivitiesResponse {
  workouts: AppleWorkout[]
  dailyMetrics: DailyMetrics[]
  weeklySummary: WeeklySummary[]
  syncMetadata: SyncMetadata | null
}

export function RailActivity() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workoutIdFromUrl = searchParams.get('workout')

  const [workouts, setWorkouts] = useState<AppleWorkout[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([])
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(workoutIdFromUrl)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/coach/activities?limit=50&days=90&weeks=4', {
        credentials: 'include',
      }).then((r) => r.json()) as { success: boolean; data?: ActivitiesResponse; error?: string }

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load activities')
      }

      setWorkouts(response.data.workouts ?? [])
      setDailyMetrics(response.data.dailyMetrics ?? [])
      setWeeklySummary(response.data.weeklySummary ?? [])
      setSyncMetadata(response.data.syncMetadata ?? null)
    } catch (err) {
      console.error('Error fetching activity data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    setSelectedWorkoutId(workoutIdFromUrl)
  }, [workoutIdFromUrl])

  const setWorkoutParam = useCallback(
    (workoutId: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('panel', 'activity')
      if (workoutId) params.set('workout', workoutId)
      else params.delete('workout')
      router.replace(`/coach?${params.toString()}`, { scroll: false })
      setSelectedWorkoutId(workoutId)
    },
    [router, searchParams]
  )

  const handleRefresh = () => {
    setRefreshing(true)
    void fetchData()
  }

  if (selectedWorkoutId) {
    return (
      <div className="px-5 py-4 md:px-8">
        <EnhancedWorkoutDetailView
          workoutId={selectedWorkoutId}
          onBack={() => setWorkoutParam(null)}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="size-4 animate-spin text-ink-3" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-20 text-center md:px-8">
        <p className="t-body text-ink-2">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="px-5 py-4 md:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="t-subtitle text-ink-1">Activity</h1>
          <p className="t-micro text-ink-3">Workouts, rings, and training history</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 size-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <FitnessDashboard
        workouts={workouts}
        dailyMetrics={dailyMetrics}
        weeklySummary={weeklySummary}
        syncMetadata={syncMetadata}
        onWorkoutClick={(id) => setWorkoutParam(id)}
        className="pb-4"
      />
    </div>
  )
}
