"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  Watch, 
  ChevronLeft, 
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { EnhancedWorkoutDetailView } from "@/components/dashboard/enhanced-workout-detail"
import { FitnessDashboard } from "@/components/dashboard/fitness-dashboard"
import type { AppleWorkout, DailyMetrics, WeeklySummary } from "@/components/dashboard/fitness-dashboard"
import { apiGet } from "@/lib/api/client"

export default function AppleWatchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
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
        apiGet<DailyMetrics | DailyMetrics[]>('/api/apple-health/daily?days=7'),
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
      console.error('Error fetching Apple Watch data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Sync URL param with state
  useEffect(() => {
    if (workoutIdFromUrl && workoutIdFromUrl !== selectedWorkoutId) {
      setSelectedWorkoutId(workoutIdFromUrl)
    }
  }, [workoutIdFromUrl, selectedWorkoutId])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleWorkoutSelect = (workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    router.push(`/fitness/watch?workout=${workoutId}`, { scroll: false })
  }

  const handleBackFromDetail = () => {
    setSelectedWorkoutId(null)
    router.push('/fitness/watch', { scroll: false })
  }

  // Workout detail view
  if (selectedWorkoutId) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackFromDetail}
          >
            <ChevronLeft className="size-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">Workout Details</h1>
        </div>
        <ScrollArea className="flex-1">
          <EnhancedWorkoutDetailView workoutId={selectedWorkoutId} />
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
            <Watch className="size-5" />
            <h1 className="text-lg font-semibold">Apple Watch</h1>
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
            <span>Loading workout data...</span>
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
