"use client"

import { useState, useEffect } from "react"
import { 
  Heart, 
  Footprints, 
  Flame, 
  Timer, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Minus,
  ChevronRight,
  Watch
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { apiGet } from "@/lib/api/client"
import { format, formatDistanceToNow } from "date-fns"

// ============================================
// TYPES
// ============================================

interface HeartRateZone {
  name: 'rest' | 'warmup' | 'fatBurn' | 'cardio' | 'peak'
  minBpm: number
  maxBpm: number
  duration: number
  percentage: number
}

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
  hr_zones: HeartRateZone[] | null
  cadence_average: number | null
  pace_average: number | null
  pace_best: number | null
  source: string
}

interface HrSample {
  timestamp: string
  bpm: number
}

interface WorkoutDetail {
  workout: AppleWorkout
  hrSamples: HrSample[]
  hrChart: HrSample[]
  cadenceSamples: { timestamp: string; steps_per_minute: number }[]
  paceSamples: { timestamp: string; minutes_per_mile: number }[]
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

// ============================================
// ZONE COLORS
// ============================================

const ZONE_COLORS: Record<HeartRateZone['name'], { bg: string; text: string; bar: string }> = {
  rest: { bg: 'bg-gray-100', text: 'text-gray-600', bar: 'bg-gray-400' },
  warmup: { bg: 'bg-blue-100', text: 'text-blue-600', bar: 'bg-blue-400' },
  fatBurn: { bg: 'bg-green-100', text: 'text-green-600', bar: 'bg-green-500' },
  cardio: { bg: 'bg-orange-100', text: 'text-orange-600', bar: 'bg-orange-500' },
  peak: { bg: 'bg-red-100', text: 'text-red-600', bar: 'bg-red-500' },
}

const ZONE_LABELS: Record<HeartRateZone['name'], string> = {
  rest: 'Rest',
  warmup: 'Warm Up',
  fatBurn: 'Fat Burn',
  cardio: 'Cardio',
  peak: 'Peak',
}

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  running: 'Run',
  walking: 'Walk',
  cycling: 'Cycle',
  functionalStrengthTraining: 'Strength',
  traditionalStrengthTraining: 'Weights',
  coreTraining: 'Core',
  hiit: 'HIIT',
  rowing: 'Row',
  stairClimbing: 'Stairs',
  elliptical: 'Elliptical',
  other: 'Workout',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}h ${mins}m`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function formatPace(minutesPerMile: number): string {
  const mins = Math.floor(minutesPerMile)
  const secs = Math.round((minutesPerMile - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}/mi`
}

// ============================================
// HR ZONES BAR COMPONENT
// ============================================

interface HrZonesBarProps {
  zones: HeartRateZone[]
  showLabels?: boolean
  className?: string
}

export function HrZonesBar({ zones, showLabels = true, className }: HrZonesBarProps) {
  // Sort zones by intensity
  const orderedZones = ['rest', 'warmup', 'fatBurn', 'cardio', 'peak'] as const
  const sortedZones = orderedZones
    .map(name => zones.find(z => z.name === name))
    .filter(Boolean) as HeartRateZone[]

  return (
    <div className={cn("space-y-2", className)}>
      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
        {sortedZones.map(zone => (
          zone.percentage > 0 && (
            <div
              key={zone.name}
              className={cn("h-full transition-all", ZONE_COLORS[zone.name].bar)}
              style={{ width: `${zone.percentage}%` }}
              title={`${ZONE_LABELS[zone.name]}: ${zone.percentage}%`}
            />
          )
        ))}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex flex-wrap gap-2 text-xs">
          {sortedZones.map(zone => (
            zone.percentage > 0 && (
              <div
                key={zone.name}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded",
                  ZONE_COLORS[zone.name].bg,
                  ZONE_COLORS[zone.name].text
                )}
              >
                <span className="font-medium">{ZONE_LABELS[zone.name]}</span>
                <span>{zone.percentage}%</span>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// HR CHART COMPONENT (Simple sparkline)
// ============================================

interface HrChartProps {
  samples: HrSample[]
  height?: number
  className?: string
}

export function HrChart({ samples, height = 60, className }: HrChartProps) {
  if (samples.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-sm", className)} style={{ height }}>
        No HR data
      </div>
    )
  }

  const bpmValues = samples.map(s => s.bpm)
  const minBpm = Math.min(...bpmValues)
  const maxBpm = Math.max(...bpmValues)
  const range = maxBpm - minBpm || 1

  // Create SVG path
  const width = 100 // percentage
  const points = samples.map((sample, i) => {
    const x = (i / (samples.length - 1)) * width
    const y = height - ((sample.bpm - minBpm) / range) * (height - 10)
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Gradient fill under line */}
        <defs>
          <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(239 68 68)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(239 68 68)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill area */}
        <path
          d={`${pathD} L ${width},${height} L 0,${height} Z`}
          fill="url(#hrGradient)"
        />
        
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="rgb(239 68 68)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Min/Max labels */}
      <div className="absolute top-0 right-0 text-[10px] text-muted-foreground">{maxBpm}</div>
      <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">{minBpm}</div>
    </div>
  )
}

// ============================================
// WORKOUT CARD COMPONENT
// ============================================

interface WorkoutCardProps {
  workout: AppleWorkout
  onClick?: () => void
  compact?: boolean
}

export function WorkoutCard({ workout, onClick, compact = false }: WorkoutCardProps) {
  const workoutLabel = WORKOUT_TYPE_LABELS[workout.workout_type] || workout.workout_type
  const isCardio = ['running', 'walking', 'cycling', 'rowing', 'stairClimbing', 'elliptical'].includes(workout.workout_type)

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start justify-between gap-3">
          {/* Left: Workout info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">
                {workoutLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(workout.start_date), { addSuffix: true })}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {/* Duration */}
              <div className="flex items-center gap-1">
                <Timer className="size-3.5 text-muted-foreground" />
                <span>{formatDuration(workout.duration)}</span>
              </div>

              {/* Calories */}
              <div className="flex items-center gap-1">
                <Flame className="size-3.5 text-orange-500" />
                <span>{Math.round(workout.active_calories)} cal</span>
              </div>

              {/* Heart rate */}
              {workout.hr_average && (
                <div className="flex items-center gap-1">
                  <Heart className="size-3.5 text-red-500" />
                  <span>{workout.hr_average} avg</span>
                </div>
              )}

              {/* Distance (cardio only) */}
              {isCardio && workout.distance_miles && (
                <div className="flex items-center gap-1">
                  <Activity className="size-3.5 text-blue-500" />
                  <span>{workout.distance_miles.toFixed(2)} mi</span>
                </div>
              )}

              {/* Pace (running) */}
              {workout.workout_type === 'running' && workout.pace_average && (
                <div className="flex items-center gap-1">
                  <Footprints className="size-3.5 text-green-500" />
                  <span>{formatPace(workout.pace_average)}</span>
                </div>
              )}

              {/* Cadence (running) */}
              {workout.workout_type === 'running' && workout.cadence_average && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>{workout.cadence_average} spm</span>
                </div>
              )}
            </div>

            {/* HR Zones (if available) */}
            {!compact && workout.hr_zones && workout.hr_zones.length > 0 && (
              <div className="mt-3">
                <HrZonesBar zones={workout.hr_zones} showLabels={false} />
              </div>
            )}
          </div>

          {/* Right: Arrow if clickable */}
          {onClick && (
            <ChevronRight className="size-5 text-muted-foreground shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// WORKOUT DETAIL VIEW
// ============================================

interface WorkoutDetailViewProps {
  workoutId: string
  onClose?: () => void
}

export function WorkoutDetailView({ workoutId, onClose }: WorkoutDetailViewProps) {
  const [data, setData] = useState<WorkoutDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkout() {
      try {
        const response = await apiGet<WorkoutDetail>(`/api/apple-health/workout/${workoutId}`)
        if (response.success && response.data) {
          setData(response.data)
        }
      } catch (error) {
        console.error('Error fetching workout:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkout()
  }, [workoutId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading workout data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Workout not found</div>
      </div>
    )
  }

  const { workout, hrChart, cadenceSamples, paceSamples } = data
  const workoutLabel = WORKOUT_TYPE_LABELS[workout.workout_type] || workout.workout_type
  const isRunning = workout.workout_type === 'running'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge>{workoutLabel}</Badge>
          <span className="text-sm text-muted-foreground">
            {format(new Date(workout.start_date), 'EEEE, MMM d, yyyy')}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(new Date(workout.start_date), 'h:mm a')} - {format(new Date(workout.end_date), 'h:mm a')}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Timer className="size-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-semibold">{formatDuration(workout.duration)}</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <Flame className="size-5 mx-auto mb-1 text-orange-500" />
            <div className="text-lg font-semibold">{Math.round(workout.active_calories)}</div>
            <div className="text-xs text-muted-foreground">Active Cal</div>
          </CardContent>
        </Card>

        {workout.distance_miles && (
          <Card>
            <CardContent className="p-3 text-center">
              <Activity className="size-5 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-semibold">{workout.distance_miles.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Miles</div>
            </CardContent>
          </Card>
        )}

        {workout.hr_average && (
          <Card>
            <CardContent className="p-3 text-center">
              <Heart className="size-5 mx-auto mb-1 text-red-500" />
              <div className="text-lg font-semibold">{workout.hr_average}</div>
              <div className="text-xs text-muted-foreground">Avg BPM</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Heart Rate Chart */}
      {hrChart.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="size-4 text-red-500" />
              Heart Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HrChart samples={hrChart} height={80} />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Min: {workout.hr_min} bpm</span>
              <span>Avg: {workout.hr_average} bpm</span>
              <span>Max: {workout.hr_max} bpm</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HR Zones */}
      {workout.hr_zones && workout.hr_zones.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Heart Rate Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <HrZonesBar zones={workout.hr_zones} showLabels={true} />
          </CardContent>
        </Card>
      )}

      {/* Running-specific metrics */}
      {isRunning && (
        <div className="grid grid-cols-2 gap-3">
          {workout.pace_average && (
            <Card>
              <CardContent className="p-3">
                <div className="text-sm text-muted-foreground mb-1">Avg Pace</div>
                <div className="text-xl font-semibold">{formatPace(workout.pace_average)}</div>
                {workout.pace_best && (
                  <div className="text-xs text-muted-foreground">
                    Best: {formatPace(workout.pace_best)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {workout.cadence_average && (
            <Card>
              <CardContent className="p-3">
                <div className="text-sm text-muted-foreground mb-1">Avg Cadence</div>
                <div className="text-xl font-semibold">{workout.cadence_average} <span className="text-sm font-normal">spm</span></div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Source */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Watch className="size-3" />
        <span>Recorded by {workout.source}</span>
      </div>
    </div>
  )
}

// ============================================
// DAILY METRICS CARD
// ============================================

interface DailyMetricsCardProps {
  metrics: DailyMetrics
  className?: string
}

export function DailyMetricsCard({ metrics, className }: DailyMetricsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Today's Activity</span>
          <Badge variant="outline" className="text-xs">
            {format(new Date(metrics.date), 'MMM d')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Steps */}
          <div className="text-center">
            <Footprints className="size-5 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-semibold">{metrics.steps.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Steps</div>
          </div>

          {/* Active calories */}
          <div className="text-center">
            <Flame className="size-5 mx-auto mb-1 text-orange-500" />
            <div className="text-lg font-semibold">{Math.round(metrics.active_calories)}</div>
            <div className="text-xs text-muted-foreground">Move</div>
          </div>

          {/* Exercise minutes */}
          <div className="text-center">
            <Activity className="size-5 mx-auto mb-1 text-lime-500" />
            <div className="text-lg font-semibold">{metrics.exercise_minutes}</div>
            <div className="text-xs text-muted-foreground">Exercise</div>
          </div>

          {/* Stand hours */}
          <div className="text-center">
            <TrendingUp className="size-5 mx-auto mb-1 text-cyan-500" />
            <div className="text-lg font-semibold">{metrics.stand_hours}/12</div>
            <div className="text-xs text-muted-foreground">Stand</div>
          </div>
        </div>

        {/* Heart metrics */}
        {(metrics.resting_heart_rate || metrics.heart_rate_variability) && (
          <div className="flex gap-4 mt-4 pt-3 border-t">
            {metrics.resting_heart_rate && (
              <div className="flex items-center gap-2">
                <Heart className="size-4 text-red-500" />
                <div>
                  <div className="text-sm font-medium">{metrics.resting_heart_rate} bpm</div>
                  <div className="text-xs text-muted-foreground">Resting HR</div>
                </div>
              </div>
            )}
            {metrics.heart_rate_variability && (
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-purple-500" />
                <div>
                  <div className="text-sm font-medium">{Math.round(metrics.heart_rate_variability)} ms</div>
                  <div className="text-xs text-muted-foreground">HRV</div>
                </div>
              </div>
            )}
            {metrics.vo2_max && (
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">{metrics.vo2_max.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">VO2 Max</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// WEEKLY SUMMARY CARD
// ============================================

interface WeeklySummary {
  weekStart: string
  totalWorkouts: number
  totalDurationMin: number
  totalCalories: number
  totalDistanceMiles: number
  avgHr: number
  workoutTypes: Record<string, number>
}

interface WeeklySummaryCardProps {
  summary: WeeklySummary
  previousSummary?: WeeklySummary
  className?: string
}

export function WeeklySummaryCard({ summary, previousSummary, className }: WeeklySummaryCardProps) {
  const trend = (current: number, previous: number | undefined) => {
    if (!previous) return null
    const diff = current - previous
    if (diff > 0) return { icon: TrendingUp, color: 'text-green-500', value: `+${diff}` }
    if (diff < 0) return { icon: TrendingDown, color: 'text-red-500', value: diff.toString() }
    return { icon: Minus, color: 'text-muted-foreground', value: '0' }
  }

  const workoutTrend = trend(summary.totalWorkouts, previousSummary?.totalWorkouts)

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Weekly Summary</span>
          <Badge variant="outline" className="text-xs">
            Week of {format(new Date(summary.weekStart), 'MMM d')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main stats */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{summary.totalWorkouts}</div>
              <div className="text-xs text-muted-foreground">Workouts</div>
            </div>
            {workoutTrend && (
              <div className={cn("flex items-center gap-1 text-sm", workoutTrend.color)}>
                <workoutTrend.icon className="size-4" />
                <span>{workoutTrend.value}</span>
              </div>
            )}
          </div>

          {/* Progress bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Duration</span>
                <span>{Math.round(summary.totalDurationMin)} min</span>
              </div>
              <Progress value={Math.min((summary.totalDurationMin / 300) * 100, 100)} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Calories</span>
                <span>{summary.totalCalories.toLocaleString()}</span>
              </div>
              <Progress value={Math.min((summary.totalCalories / 3500) * 100, 100)} className="h-1.5" />
            </div>
            {summary.totalDistanceMiles > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Distance</span>
                  <span>{summary.totalDistanceMiles.toFixed(1)} mi</span>
                </div>
                <Progress value={Math.min((summary.totalDistanceMiles / 20) * 100, 100)} className="h-1.5" />
              </div>
            )}
          </div>

          {/* Workout types */}
          {Object.keys(summary.workoutTypes).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
              {Object.entries(summary.workoutTypes).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {WORKOUT_TYPE_LABELS[type] || type}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
