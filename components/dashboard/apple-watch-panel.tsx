"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Watch, 
  RefreshCw, 
  ChevronLeft,
  Footprints,
  Heart,
  Activity,
  Flame
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { apiGet } from "@/lib/api/client"
import {
  WorkoutCard,
  DailyMetricsCard,
  WeeklySummaryCard,
  HrZonesBar,
} from "./workout-analytics"
import { EnhancedWorkoutDetailView } from "./enhanced-workout-detail"

// ============================================
// TYPES
// ============================================

interface AppleWorkout {
  id: string
  healthkit_id: string
  workout_type: string
  start_date: string
  end_date: string
  duration: number
  active_calories: number
  total_calories: number
  distance_meters: number | null
  distance_miles: number | null
  hr_average: number | null
  hr_min: number | null
  hr_max: number | null
  hr_zones: any[] | null
  cadence_average: number | null
  pace_average: number | null
  pace_best: number | null
  source: string
}

interface DailyMetrics {
  date: string
  steps: number
  active_calories: number
  exercise_minutes: number
  stand_hours: number
  resting_heart_rate: number | null
  heart_rate_variability: number | null
  vo2_max: number | null
}

interface WeeklySummary {
  weekStart: string
  totalWorkouts: number
  totalDurationMin: number
  totalCalories: number
  totalDistanceMiles: number
  avgHr: number
  workoutTypes: Record<string, number>
}

// ============================================
// MAIN COMPONENT
// ============================================

interface AppleWatchPanelProps {
  className?: string
  maxHeight?: string
}

export function AppleWatchPanel({ className, maxHeight = "calc(100vh - 200px)" }: AppleWatchPanelProps) {
  const [workouts, setWorkouts] = useState<AppleWorkout[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics | null>(null)
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch all Apple Health data
  const fetchData = useCallback(async () => {
    try {
      setError(null)
      
      const [workoutsData, dailyData, summaryData] = await Promise.all([
        apiGet<AppleWorkout[]>('/api/apple-health/workout?limit=10'),
        apiGet<DailyMetrics | DailyMetrics[]>('/api/apple-health/daily?days=1'),
        apiGet<{ weeks: WeeklySummary[] }>('/api/apple-health/summary?weeks=2'),
      ])

      if (workoutsData.success) {
        setWorkouts(workoutsData.data || [])
      }

      if (dailyData.success && dailyData.data) {
        // Get today's or most recent metrics
        const metrics = Array.isArray(dailyData.data) ? dailyData.data[0] : dailyData.data
        if (metrics) {
          setDailyMetrics(metrics)
        }
      }

      if (summaryData.success && summaryData.data?.weeks) {
        setWeeklySummary(summaryData.data.weeks)
      }
    } catch (err) {
      console.error('Error fetching Apple Health data:', err)
      setError('Unable to load Apple Watch data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  // Empty state
  if (!loading && workouts.length === 0 && !dailyMetrics) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Watch className="size-4" />
            Apple Watch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Watch className="size-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-2">No Apple Watch data yet</p>
            <p className="text-xs text-muted-foreground">
              Sync workouts from PeteWatch to see your health data here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Workout detail view
  if (selectedWorkoutId) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setSelectedWorkoutId(null)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <CardTitle className="text-sm">Workout Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea style={{ maxHeight }}>
            <EnhancedWorkoutDetailView workoutId={selectedWorkoutId} />
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  // Main view
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Watch className="size-4" />
            Apple Watch
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-sm text-muted-foreground">{error}</div>
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-4 pr-2">
              {/* Today's Activity */}
              {dailyMetrics && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    Today
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Footprints className="size-4 mx-auto mb-1 text-green-500" />
                      <div className="text-sm font-semibold">{dailyMetrics.steps.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">Steps</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Flame className="size-4 mx-auto mb-1 text-orange-500" />
                      <div className="text-sm font-semibold">{Math.round(dailyMetrics.active_calories)}</div>
                      <div className="text-[10px] text-muted-foreground">Cal</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Activity className="size-4 mx-auto mb-1 text-lime-500" />
                      <div className="text-sm font-semibold">{dailyMetrics.exercise_minutes}</div>
                      <div className="text-[10px] text-muted-foreground">Min</div>
                    </div>
                    {dailyMetrics.resting_heart_rate && (
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <Heart className="size-4 mx-auto mb-1 text-red-500" />
                        <div className="text-sm font-semibold">{dailyMetrics.resting_heart_rate}</div>
                        <div className="text-[10px] text-muted-foreground">RHR</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Weekly Summary */}
              {weeklySummary[0] && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    This Week
                  </h4>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="text-2xl font-bold">{weeklySummary[0].totalWorkouts}</div>
                      <div className="text-xs text-muted-foreground">Workouts</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{weeklySummary[0].totalDurationMin} min</div>
                      <div className="text-xs text-muted-foreground">{weeklySummary[0].totalCalories.toLocaleString()} cal</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Workouts */}
              {workouts.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    Recent Workouts
                  </h4>
                  <div className="space-y-2">
                    {workouts.slice(0, 5).map(workout => (
                      <WorkoutCard
                        key={workout.id}
                        workout={workout}
                        onClick={() => setSelectedWorkoutId(workout.id)}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPACT WIDGET (For dashboard overview)
// ============================================

interface AppleWatchWidgetProps {
  className?: string
  onClick?: () => void
}

export function AppleWatchWidget({ className, onClick }: AppleWatchWidgetProps) {
  const [latestWorkout, setLatestWorkout] = useState<AppleWorkout | null>(null)
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWidgetData() {
      try {
        const [workoutsData, dailyData] = await Promise.all([
          apiGet<AppleWorkout[]>('/api/apple-health/workout?limit=1'),
          apiGet<DailyMetrics | DailyMetrics[]>('/api/apple-health/daily?days=1'),
        ])

        if (workoutsData.success && workoutsData.data && workoutsData.data.length > 0) {
          const firstWorkout = workoutsData.data[0]
          if (firstWorkout) {
            setLatestWorkout(firstWorkout)
          }
        }

        if (dailyData.success && dailyData.data) {
          const metrics = Array.isArray(dailyData.data) ? dailyData.data[0] : dailyData.data
          if (metrics) {
            setDailyMetrics(metrics)
          }
        }
      } catch (err) {
        console.error('Error fetching watch data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWidgetData()
  }, [])

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="size-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!latestWorkout && !dailyMetrics) {
    return null // Don't show widget if no data
  }

  return (
    <Card 
      className={cn("cursor-pointer hover:border-primary/50 transition-colors", className)}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Watch className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Apple Watch</span>
        </div>

        <div className="flex items-center justify-between">
          {dailyMetrics && (
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold">{dailyMetrics.steps.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Steps</div>
              </div>
              {dailyMetrics.resting_heart_rate && (
                <div className="text-center">
                  <div className="text-lg font-semibold flex items-center gap-1">
                    <Heart className="size-3 text-red-500" />
                    {dailyMetrics.resting_heart_rate}
                  </div>
                  <div className="text-[10px] text-muted-foreground">RHR</div>
                </div>
              )}
            </div>
          )}

          {latestWorkout && (
            <Badge variant="secondary" className="text-xs">
              {latestWorkout.workout_type}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
