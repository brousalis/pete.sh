"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Watch, 
  ChevronLeft, 
  RefreshCw,
  Heart,
  Activity,
  Flame,
  TrendingUp,
  Calendar
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import {
  WorkoutCard,
  DailyMetricsCard,
  WeeklySummaryCard,
  HrChart,
} from "@/components/dashboard/workout-analytics"
import { EnhancedWorkoutDetailView } from "@/components/dashboard/enhanced-workout-detail"

// Types
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
  total_calories: number
  exercise_minutes: number
  stand_hours: number
  resting_heart_rate: number | null
  heart_rate_variability: number | null
  vo2_max: number | null
  move_goal: number | null
  exercise_goal: number | null
  stand_goal: number | null
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

interface HrTrend {
  date: string
  restingHr: number | null
  avgWorkoutHr: number | null
}

export default function AppleWatchPage() {
  const [workouts, setWorkouts] = useState<AppleWorkout[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([])
  const [hrTrends, setHrTrends] = useState<HrTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [workoutsRes, dailyRes, summaryRes, trendsRes] = await Promise.all([
        fetch('/api/apple-health/workout?limit=20'),
        fetch('/api/apple-health/daily?days=7'),
        fetch('/api/apple-health/summary?weeks=4'),
        fetch('/api/apple-health/summary?type=hr-trends&weeks=4'),
      ])

      const workoutsData = await workoutsRes.json()
      const dailyData = await dailyRes.json()
      const summaryData = await summaryRes.json()
      const trendsData = await trendsRes.json()

      if (workoutsData.success) {
        setWorkouts(workoutsData.data || [])
      }

      if (dailyData.success) {
        setDailyMetrics(Array.isArray(dailyData.data) ? dailyData.data : [dailyData.data].filter(Boolean))
      }

      if (summaryData.success) {
        setWeeklySummary(summaryData.data?.weeks || [])
      }

      if (trendsData.success) {
        setHrTrends(trendsData.data?.trends || [])
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

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  // Workout detail view
  if (selectedWorkoutId) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedWorkoutId(null)}
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

  const todayMetrics = dailyMetrics[0]

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
          <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-fit">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workouts">Workouts</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 mt-4 min-h-0">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {/* Today's Activity */}
                {todayMetrics && (
                  <DailyMetricsCard metrics={todayMetrics} />
                )}

                {/* Weekly Summary */}
                {weeklySummary[0] && (
                  <WeeklySummaryCard 
                    summary={weeklySummary[0]} 
                    previousSummary={weeklySummary[1]}
                  />
                )}

                {/* Quick Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="size-4 text-blue-500" />
                      Health Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {todayMetrics?.resting_heart_rate && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Heart className="size-4 text-red-500" />
                            <span className="text-sm">Resting HR</span>
                          </div>
                          <span className="font-semibold">{todayMetrics.resting_heart_rate} bpm</span>
                        </div>
                      )}
                      {todayMetrics?.heart_rate_variability && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="size-4 text-purple-500" />
                            <span className="text-sm">HRV</span>
                          </div>
                          <span className="font-semibold">{Math.round(todayMetrics.heart_rate_variability)} ms</span>
                        </div>
                      )}
                      {todayMetrics?.vo2_max && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="size-4 text-green-500" />
                            <span className="text-sm">VO2 Max</span>
                          </div>
                          <span className="font-semibold">{todayMetrics.vo2_max.toFixed(1)}</span>
                        </div>
                      )}
                      {weeklySummary[0] && (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="size-4 text-blue-500" />
                              <span className="text-sm">Weekly Workouts</span>
                            </div>
                            <span className="font-semibold">{weeklySummary[0].totalWorkouts}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Flame className="size-4 text-orange-500" />
                              <span className="text-sm">Weekly Calories</span>
                            </div>
                            <span className="font-semibold">{weeklySummary[0].totalCalories.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Workouts Preview */}
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Recent Workouts</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveTab("workouts")}
                      >
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {workouts.slice(0, 4).map(workout => (
                        <WorkoutCard
                          key={workout.id}
                          workout={workout}
                          onClick={() => setSelectedWorkoutId(workout.id)}
                          compact
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="flex-1 mt-4 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-3 pb-4">
                {workouts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Watch className="size-12 mx-auto mb-3 opacity-50" />
                    <p>No workouts synced yet</p>
                    <p className="text-sm mt-1">Complete a workout with PeteWatch to see it here</p>
                  </div>
                ) : (
                  workouts.map(workout => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      onClick={() => setSelectedWorkoutId(workout.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="flex-1 mt-4 min-h-0">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {/* Resting HR Trend */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="size-4 text-red-500" />
                      Resting Heart Rate Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hrTrends.filter(t => t.restingHr).length > 0 ? (
                      <div>
                        <HrChart 
                          samples={hrTrends
                            .filter(t => t.restingHr)
                            .map(t => ({ timestamp: t.date, bpm: t.restingHr! }))} 
                          height={100}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>30 days ago</span>
                          <span>Today</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Not enough data for trends
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly Comparison */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="size-4 text-blue-500" />
                      Weekly Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weeklySummary.slice(0, 4).map((week, i) => (
                        <div key={week.weekStart} className="flex items-center justify-between">
                          <div className="text-sm">
                            {i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} weeks ago`}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">{week.totalWorkouts} workouts</span>
                            <Badge variant="secondary">{week.totalCalories.toLocaleString()} cal</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Activity Last 7 Days */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="size-4 text-green-500" />
                      Daily Activity (Last 7 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {dailyMetrics.slice(0, 7).reverse().map(day => (
                        <div key={day.date} className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">
                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="text-sm font-medium">{day.steps.toLocaleString()}</div>
                          <div className="text-[10px] text-muted-foreground">steps</div>
                          <div className="text-xs mt-1">{day.exercise_minutes}m</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
