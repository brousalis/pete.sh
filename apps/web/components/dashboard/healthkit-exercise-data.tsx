'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Collapsible,
    CollapsibleContent
} from '@/components/ui/collapsible'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { apiGet } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import type { EnhancedWorkoutAnalytics } from '@/lib/utils/workout-analytics'
import { format } from 'date-fns'
import {
    Activity,
    AlertTriangle,
    Award,
    BarChart3,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    ExternalLink,
    Flame,
    Footprints,
    Gauge,
    Heart,
    Route,
    Sparkles,
    Timer,
    TrendingUp,
    Watch,
    Zap
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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
  // Running metrics
  cadence_average: number | null
  pace_average: number | null
  pace_best: number | null
  stride_length_avg: number | null
  running_power_avg: number | null
  ground_contact_time_avg: number | null
  vertical_oscillation_avg: number | null
  // Cycling metrics
  cycling_avg_speed: number | null
  cycling_max_speed: number | null
  cycling_avg_cadence: number | null
  cycling_avg_power: number | null
  cycling_max_power: number | null
  // Effort score
  effort_score: number | null
  source: string
}

interface WorkoutDetailResponse {
  workout: AppleWorkout
  hrSamples: { timestamp: string; bpm: number }[]
  hrChart: { timestamp: string; bpm: number }[]
  cadenceSamples: { timestamp: string; steps_per_minute: number }[]
  paceSamples: { timestamp: string; minutes_per_mile: number }[]
  analytics: EnhancedWorkoutAnalytics | null
}

export interface HealthKitExerciseDataProps {
  /** The HealthKit workout ID */
  workoutId: string
  /** Workout type for styling */
  workoutType: string
  /** Whether to show compact or expanded view */
  variant?: 'compact' | 'detailed'
  /** Whether to show the expand/collapse toggle */
  expandable?: boolean
  /** Custom class name */
  className?: string
  /** Click handler for the view details button */
  onViewDetails?: (workoutId: string) => void
}

// ============================================
// CONSTANTS
// ============================================

const ZONE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  rest: { bg: 'bg-gray-500/20', text: 'text-gray-400', bar: 'bg-gray-500' },
  warmup: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500' },
  fatBurn: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    bar: 'bg-green-500',
  },
  cardio: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    bar: 'bg-orange-500',
  },
  peak: { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-500' },
}

const WORKOUT_COLORS: Record<string, string> = {
  running: 'border-green-500/30 bg-green-500/5',
  walking: 'border-blue-400/30 bg-blue-400/5',
  cycling: 'border-orange-500/30 bg-orange-500/5',
  functionalStrengthTraining: 'border-purple-500/30 bg-purple-500/5',
  traditionalStrengthTraining: 'border-purple-500/30 bg-purple-500/5',
  coreTraining: 'border-pink-500/30 bg-pink-500/5',
  hiit: 'border-red-500/30 bg-red-500/5',
  rowing: 'border-cyan-500/30 bg-cyan-500/5',
}

const WORKOUT_LABELS: Record<string, string> = {
  running: 'Run',
  walking: 'Walk',
  cycling: 'Cycle',
  functionalStrengthTraining: 'Strength',
  traditionalStrengthTraining: 'Weights',
  coreTraining: 'Core',
  hiit: 'HIIT',
  rowing: 'Row',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}h ${mins}m`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function formatPace(minutesPerMile: number): string {
  if (!minutesPerMile || minutesPerMile <= 0 || minutesPerMile > 30)
    return '--:--'
  const mins = Math.floor(minutesPerMile)
  const secs = Math.round((minutesPerMile - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================
// MINI HR ZONES BAR - Ultra compact zones visualization
// ============================================

interface MiniHrZonesBarProps {
  zones: HeartRateZone[]
  className?: string
}

function MiniHrZonesBar({ zones, className }: MiniHrZonesBarProps) {
  const orderedZones = ['fatBurn', 'cardio', 'peak'] as const
  const sortedZones = orderedZones
    .map(name => zones.find(z => z.name === name))
    .filter(Boolean) as HeartRateZone[]

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'bg-muted/30 flex h-2 w-full overflow-hidden rounded-full',
              className
            )}
          >
            {sortedZones.map(
              zone =>
                zone.percentage > 0 && (
                  <div
                    key={zone.name}
                    className={cn('h-full', ZONE_COLORS[zone.name]?.bar)}
                    style={{ width: `${zone.percentage}%` }}
                  />
                )
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            {sortedZones.map(
              zone =>
                zone.percentage > 0 && (
                  <div
                    key={zone.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className={ZONE_COLORS[zone.name]?.text}>
                      {zone.name === 'fatBurn'
                        ? 'Fat Burn'
                        : zone.name.charAt(0).toUpperCase() + zone.name.slice(1)}
                    </span>
                    <span className="font-medium">{zone.percentage}%</span>
                  </div>
                )
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================
// MINI TIME SERIES CHART - Sparkline style
// ============================================

interface MiniSparklineProps {
  data: { value: number }[]
  color?: string
  height?: number
  className?: string
}

function MiniSparkline({
  data,
  color = 'rgb(239 68 68)',
  height = 24,
  className,
}: MiniSparklineProps) {
  if (data.length < 2) return null

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const width = 100
  const normalize = (v: number) => height - 2 - ((v - min) / range) * (height - 4)

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = normalize(d.value)
    return `${x},${y}`
  })

  const path = `M ${points.join(' L ')}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('w-full', className)}
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${width},${height - 2} L 0,${height - 2} Z`}
        fill="url(#sparklineFill)"
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// ============================================
// INSIGHT BADGE - Compact insight indicator
// ============================================

interface InsightBadgeProps {
  type: 'strength' | 'improvement' | 'warning' | 'info'
  title: string
  description?: string
}

function InsightBadge({ type, title, description }: InsightBadgeProps) {
  const styles = {
    strength: 'border-green-500/30 bg-green-500/10 text-green-500',
    improvement: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
    info: 'border-purple-500/30 bg-purple-500/10 text-purple-500',
  }

  const icons = {
    strength: <Award className="size-3" />,
    improvement: <TrendingUp className="size-3" />,
    warning: <AlertTriangle className="size-3" />,
    info: <Sparkles className="size-3" />,
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'h-5 gap-1 px-1.5 py-0 text-[10px] font-medium',
              styles[type]
            )}
          >
            {icons[type]}
            <span className="max-w-[80px] truncate">{title}</span>
          </Badge>
        </TooltipTrigger>
        {description && (
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {description}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================
// MAIN COMPONENT - HealthKitExerciseData
// ============================================

export function HealthKitExerciseData({
  workoutId,
  workoutType,
  variant = 'compact',
  expandable = true,
  className,
  onViewDetails,
}: HealthKitExerciseDataProps) {
  const [data, setData] = useState<WorkoutDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  // Always start expanded - the data looks great!
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    async function fetchWorkout() {
      try {
        const response = await apiGet<WorkoutDetailResponse>(
          `/api/apple-health/workout/${workoutId}`
        )
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
      <div
        className={cn(
          'bg-muted/20 flex items-center gap-2 rounded-lg p-2 text-xs',
          className
        )}
      >
        <div className="border-primary size-3 animate-spin rounded-full border border-t-transparent" />
        <span className="text-muted-foreground">Loading workout data...</span>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { workout, analytics } = data
  const isCardio = [
    'running',
    'walking',
    'cycling',
    'rowing',
    'elliptical',
  ].includes(workout.workout_type)
  const isRunning = workout.workout_type === 'running'
  const colorClass = WORKOUT_COLORS[workout.workout_type] || 'border-gray-500/30'
  const label = WORKOUT_LABELS[workout.workout_type] || workout.workout_type

  // Get top insights to display
  const topInsights = analytics?.insights.slice(0, 2) || []

  // Prepare sparkline data from HR samples
  const hrSparklineData = data.hrChart
    .filter((_, i) => i % 3 === 0) // Downsample
    .map(s => ({ value: s.bpm }))

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        colorClass,
        className
      )}
    >
      {/* Compact Header - Always visible */}
      <div
        className={cn(
          'flex items-center gap-2 p-2',
          expandable && 'cursor-pointer hover:bg-muted/30'
        )}
        onClick={expandable ? () => setExpanded(!expanded) : undefined}
      >
        {/* Workout Type Icon */}
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md',
            colorClass.replace('border-', 'bg-').replace('/30', '/20')
          )}
        >
          <Watch className="size-4" />
        </div>

        {/* Primary Metrics */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Duration & Calories */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Timer className="text-muted-foreground size-3" />
              <span className="font-medium">
                {formatDuration(workout.duration)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Flame className="size-3 text-orange-500" />
              <span className="font-medium">
                {Math.round(workout.active_calories)}
              </span>
            </div>
          </div>

          {/* Cardio-specific metrics */}
          {isCardio && workout.distance_miles && (
            <div className="flex items-center gap-1 text-xs">
              <Route className="size-3 text-blue-500" />
              <span className="font-medium">
                {workout.distance_miles.toFixed(2)} mi
              </span>
            </div>
          )}

          {/* HR Average */}
          {workout.hr_average && (
            <div className="flex items-center gap-1 text-xs">
              <Heart className="size-3 text-red-500" />
              <span className="font-medium">{workout.hr_average}</span>
            </div>
          )}

          {/* Running pace */}
          {isRunning && workout.pace_average && (
            <div className="flex items-center gap-1 text-xs">
              <Gauge className="size-3 text-green-500" />
              <span className="font-medium">
                {formatPace(workout.pace_average)}/mi
              </span>
            </div>
          )}
        </div>

        {/* Mini HR Zones */}
        {workout.hr_zones && workout.hr_zones.length > 0 && (
          <div className="hidden w-20 shrink-0 sm:block">
            <MiniHrZonesBar zones={workout.hr_zones} />
          </div>
        )}

        {/* Expand Toggle */}
        {expandable && (
          <div className="text-muted-foreground shrink-0">
            {expanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      <Collapsible open={expanded}>
        <CollapsibleContent>
          <div className="space-y-3 border-t px-2 pb-3 pt-2">
            {/* HR Sparkline */}
            {hrSparklineData.length > 5 && (
              <div>
                <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px]">
                  <Heart className="size-3 text-red-500" />
                  Heart Rate
                  <span className="ml-auto">
                    {workout.hr_min}-{workout.hr_max} bpm
                  </span>
                </div>
                <MiniSparkline
                  data={hrSparklineData}
                  color="rgb(239 68 68)"
                  height={32}
                />
              </div>
            )}

            {/* HR Zones (expanded) */}
            {workout.hr_zones && workout.hr_zones.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1 text-[10px]">
                  Zone Distribution
                </div>
                <div className="flex items-center gap-2">
                  <MiniHrZonesBar zones={workout.hr_zones} className="flex-1" />
                  <div className="flex gap-1.5 text-[10px]">
                    {workout.hr_zones
                      .filter(z => ['fatBurn', 'cardio', 'peak'].includes(z.name))
                      .map(z => (
                        <span
                          key={z.name}
                          className={cn(
                            'rounded px-1 py-0.5',
                            ZONE_COLORS[z.name]?.bg,
                            ZONE_COLORS[z.name]?.text
                          )}
                        >
                          {z.percentage}%
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Running Analysis */}
            {isRunning && analytics && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Pace Analysis */}
                {workout.pace_average && (
                  <div className="bg-muted/30 rounded-md p-2">
                    <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px]">
                      <Gauge className="size-3 text-green-500" />
                      Pace
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">
                        {formatPace(workout.pace_average)}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        /mi avg
                      </span>
                    </div>
                    {workout.pace_best && (
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
                        <Zap className="size-2.5 text-amber-500" />
                        Best: {formatPace(workout.pace_best)}
                      </div>
                    )}
                  </div>
                )}

                {/* Cadence */}
                {workout.cadence_average && (
                  <div className="bg-muted/30 rounded-md p-2">
                    <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px]">
                      <Footprints className="size-3 text-blue-500" />
                      Cadence
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">
                        {workout.cadence_average}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        spm
                      </span>
                    </div>
                    {analytics.cadenceAnalysis?.optimalRange ? (
                      <Badge
                        variant="outline"
                        className="mt-0.5 h-4 border-green-500/30 bg-green-500/10 px-1 py-0 text-[9px] text-green-500"
                      >
                        Optimal
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">
                        Target: 170-180
                      </span>
                    )}
                  </div>
                )}

                {/* Cardiac Drift */}
                {analytics.cardiacDrift && (
                  <div className="bg-muted/30 rounded-md p-2">
                    <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px]">
                      <Activity className="size-3 text-purple-500" />
                      Cardiac Drift
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span
                        className={cn(
                          'text-lg font-bold',
                          analytics.cardiacDrift.interpretation === 'minimal'
                            ? 'text-green-500'
                            : analytics.cardiacDrift.interpretation ===
                                'excessive'
                              ? 'text-red-500'
                              : ''
                        )}
                      >
                        {analytics.cardiacDrift.driftPercentage > 0 ? '+' : ''}
                        {analytics.cardiacDrift.driftPercentage}%
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'mt-0.5 h-4 px-1 py-0 text-[9px] capitalize',
                        analytics.cardiacDrift.interpretation === 'minimal'
                          ? 'border-green-500/30 bg-green-500/10 text-green-500'
                          : analytics.cardiacDrift.interpretation === 'excessive'
                            ? 'border-red-500/30 bg-red-500/10 text-red-500'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                      )}
                    >
                      {analytics.cardiacDrift.interpretation}
                    </Badge>
                  </div>
                )}

                {/* Training Load */}
                {analytics.trainingImpulse && (
                  <div className="bg-muted/30 rounded-md p-2">
                    <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px]">
                      <Zap className="size-3 text-amber-500" />
                      Training Load
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">
                        {analytics.trainingImpulse.trimp}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        TRIMP
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="mt-0.5 h-4 px-1 py-0 text-[9px] capitalize"
                    >
                      {analytics.trainingImpulse.intensity}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Mile Splits Summary */}
            {isRunning && analytics?.splits && analytics.splits.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px]">
                  <BarChart3 className="size-3 text-purple-500" />
                  Mile Splits
                  {analytics.paceAnalysis?.splitStrategy === 'negative' && (
                    <Badge
                      variant="outline"
                      className="ml-1 h-4 border-green-500/30 bg-green-500/10 px-1 py-0 text-[9px] text-green-500"
                    >
                      <Award className="mr-0.5 size-2.5" />
                      Negative Split
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {analytics.splits.map((split, idx) => {
                    const isFastest =
                      split.avgPace ===
                      Math.min(...analytics.splits.map(s => s.avgPace))
                    return (
                      <TooltipProvider key={idx} delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'flex-1 rounded py-1 text-center text-[10px] font-medium',
                                isFastest
                                  ? 'bg-green-500/20 text-green-500'
                                  : 'bg-muted/50'
                              )}
                            >
                              {formatPace(split.avgPace)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div>Mile {split.splitNumber}</div>
                            <div className="text-muted-foreground">
                              HR: {split.avgHr} bpm
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Insights */}
            {topInsights.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {topInsights.map((insight, idx) => (
                  <InsightBadge
                    key={idx}
                    type={insight.category}
                    title={insight.title}
                    description={insight.description}
                  />
                ))}
              </div>
            )}

            {/* View Full Details Link */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground text-[10px]">
                {format(new Date(workout.start_date), 'h:mm a')} ·{' '}
                {workout.source}
              </span>
              <Link href={`/fitness/watch?workout=${workoutId}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px]"
                >
                  Full Analysis
                  <ExternalLink className="size-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// ============================================
// COMPACT VARIANT - For inline display
// ============================================

export interface CompactWorkoutMetricsProps {
  workout: {
    id: string
    workout_type: string
    duration: number
    active_calories: number
    distance_miles?: number | null
    hr_average?: number | null
    pace_average?: number | null
    cadence_average?: number | null
  }
  className?: string
  onViewDetails?: (workoutId: string) => void
}

export function CompactWorkoutMetrics({
  workout,
  className,
  onViewDetails,
}: CompactWorkoutMetricsProps) {
  const isCardio = [
    'running',
    'walking',
    'cycling',
    'rowing',
    'elliptical',
  ].includes(workout.workout_type)
  const isRunning = workout.workout_type === 'running'
  const colorClass = WORKOUT_COLORS[workout.workout_type] || 'border-gray-500/30'

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs',
        colorClass,
        onViewDetails && 'cursor-pointer hover:bg-muted/30',
        className
      )}
      onClick={onViewDetails ? () => onViewDetails(workout.id) : undefined}
    >
      <Watch className="text-muted-foreground size-3.5" />

      <div className="flex items-center gap-1.5">
        <Timer className="text-muted-foreground size-3" />
        <span className="font-medium">{formatDuration(workout.duration)}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Flame className="size-3 text-orange-500" />
        <span className="font-medium">{Math.round(workout.active_calories)}</span>
      </div>

      {isCardio && workout.distance_miles && (
        <div className="flex items-center gap-1.5">
          <Route className="size-3 text-blue-500" />
          <span className="font-medium">
            {workout.distance_miles.toFixed(2)} mi
          </span>
        </div>
      )}

      {workout.hr_average && (
        <div className="flex items-center gap-1.5">
          <Heart className="size-3 text-red-500" />
          <span className="font-medium">{workout.hr_average}</span>
        </div>
      )}

      {isRunning && workout.pace_average && (
        <div className="flex items-center gap-1.5">
          <Gauge className="size-3 text-green-500" />
          <span className="font-medium">{formatPace(workout.pace_average)}/mi</span>
        </div>
      )}

      {onViewDetails && (
        <ChevronRight className="text-muted-foreground ml-auto size-3.5" />
      )}
    </div>
  )
}

export default HealthKitExerciseData
