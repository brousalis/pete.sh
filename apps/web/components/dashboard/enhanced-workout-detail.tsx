'use client'

import { MapleRouteMap } from '@/components/dashboard/maple/maple-route-map'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { getWorkoutDisplayLabel } from '@/lib/utils/workout-labels'
import type {
    EnhancedWorkoutAnalytics,
    PerformanceInsight,
    WorkoutSplit,
} from '@/lib/utils/workout-analytics'
import { format } from 'date-fns'
import {
    Activity,
    AlertTriangle,
    Award,
    Battery,
    ChevronLeft,
    Clock,
    Dumbbell,
    Flame,
    Footprints,
    Heart,
    Info,
    Lightbulb,
    MapPin,
    Mountain,
    RefreshCw,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Watch,
    Wind,
    Zap
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'

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
  elevation_gain_meters: number | null
  hr_average: number | null
  hr_min: number | null
  hr_max: number | null
  hr_zones: HeartRateZone[] | null
  cadence_average: number | null
  pace_average: number | null
  pace_best: number | null
  stride_length_avg: number | null
  running_power_avg: number | null
  ground_contact_time_avg: number | null
  vertical_oscillation_avg: number | null
  cycling_avg_speed: number | null
  cycling_max_speed: number | null
  cycling_avg_cadence: number | null
  cycling_avg_power: number | null
  cycling_max_power: number | null
  effort_score: number | null
  is_indoor: boolean | null
  source: string
}

interface HrSample {
  timestamp: string
  bpm: number
}

interface CyclingSpeedSample {
  timestamp: string
  speed_mph: number
}

interface CyclingCadenceSample {
  timestamp: string
  rpm: number
}

interface CyclingPowerSample {
  timestamp: string
  watts: number
}

interface WorkoutEventData {
  event_type: string
  timestamp: string
  duration: number | null
  segment_index: number | null
  lap_number: number | null
}

interface SplitData {
  split_number: number
  split_type: string
  distance_meters: number
  time_seconds: number
  avg_pace: number | null
  avg_heart_rate: number | null
  avg_cadence: number | null
  elevation_change: number | null
}

interface RouteLocationSample {
  timestamp: string
  latitude: number
  longitude: number
  altitude?: number
  speed?: number
  course?: number
  horizontalAccuracy?: number
  verticalAccuracy?: number
}

interface RouteData {
  id: string
  workout_id: string
  total_distance_meters: number | null
  total_elevation_gain: number | null
  total_elevation_loss: number | null
  samples: RouteLocationSample[] | null
}

interface HrZoneConfig {
  zone: number
  label: string
  maxBpm?: number
  minBpm?: number
  color: string
}

interface HrZonesConfig {
  maxHr: number
  restingHr: number | null
  zones: HrZoneConfig[]
}

interface WorkoutDetailResponse {
  workout: AppleWorkout
  hrSamples: HrSample[]
  hrChart: HrSample[]
  cadenceSamples: { timestamp: string; steps_per_minute: number }[]
  paceSamples: { timestamp: string; minutes_per_mile: number }[]
  cyclingSpeedSamples: CyclingSpeedSample[]
  cyclingCadenceSamples: CyclingCadenceSample[]
  cyclingPowerSamples: CyclingPowerSample[]
  workoutEvents: WorkoutEventData[]
  splits: SplitData[]
  route: RouteData | null
  gpsPaceData: Array<{ elapsedSeconds: number; pace: number; speed: number }> | null
  analytics: EnhancedWorkoutAnalytics | null
  hrZonesConfig: HrZonesConfig | null
}

// ============================================
// CONSTANTS
// ============================================

const ZONE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  rest: { bg: 'bg-gray-500/20', text: 'text-gray-400', bar: 'bg-gray-500' },
  warmup: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500' },
  fatBurn: { bg: 'bg-green-500/20', text: 'text-green-400', bar: 'bg-green-500' },
  cardio: { bg: 'bg-orange-500/20', text: 'text-orange-400', bar: 'bg-orange-500' },
  peak: { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-500' },
}

const DEFAULT_ZONE_COLOR = { bg: 'bg-gray-500/20', text: 'text-gray-400', bar: 'bg-gray-500' }

const ZONE_LABELS: Record<string, string> = {
  rest: 'Rest',
  warmup: 'Warm Up',
  fatBurn: 'Fat Burn',
  cardio: 'Cardio',
  peak: 'Peak',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) return `${hrs}h ${mins}m`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

function formatPace(minutesPerMile: number): string {
  if (!minutesPerMile || minutesPerMile <= 0 || minutesPerMile > 30) return '--:--'
  const mins = Math.floor(minutesPerMile)
  const secs = Math.round((minutesPerMile - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================
// ADVICE GENERATION HELPERS
// ============================================

type IconType = 'zap' | 'target' | 'refresh' | 'heart' | 'alert' | 'award' | 'trending-down' | 'footprints' | 'flame' | 'trending-up'

interface WorkoutAdvice {
  keyTakeaways: Array<{ iconType: IconType; text: string; type: 'positive' | 'neutral' | 'improvement' }>
  trainingType: { label: string; description: string; iconType: IconType; iconColor: string }
  recoveryTime: { hours: number; description: string }
  nextWorkoutSuggestion: string
  zoneAnalysis: string
}

function generateWorkoutAdvice(
  workout: AppleWorkout,
  analytics: EnhancedWorkoutAnalytics | null,
  hrZones: HeartRateZone[] | null
): WorkoutAdvice {
  const takeaways: WorkoutAdvice['keyTakeaways'] = []

  // Determine training type based on zones
  const peakPercent = hrZones?.find(z => z.name === 'peak')?.percentage || 0
  const cardioPercent = hrZones?.find(z => z.name === 'cardio')?.percentage || 0
  const fatBurnPercent = hrZones?.find(z => z.name === 'fatBurn')?.percentage || 0

  let trainingType: WorkoutAdvice['trainingType']
  let recoveryHours: number
  let nextWorkout: string
  let zoneAnalysis: string

  // High intensity (mostly peak/cardio)
  if (peakPercent >= 50) {
    trainingType = {
      label: 'VO2 Max / Speed Work',
      description: 'High-intensity effort targeting peak cardiovascular capacity',
      iconType: 'zap',
      iconColor: 'text-red-500'
    }
    recoveryHours = 48
    nextWorkout = 'Easy recovery run or rest day recommended'
    zoneAnalysis = `You spent ${peakPercent}% in your peak zone - this was a maximal effort that builds speed and VO2max.`
  } else if (peakPercent + cardioPercent >= 60) {
    trainingType = {
      label: 'Threshold Training',
      description: 'Sustained hard effort building lactate threshold',
      iconType: 'flame',
      iconColor: 'text-orange-500'
    }
    recoveryHours = 36
    nextWorkout = 'Easy run or cross-training tomorrow'
    zoneAnalysis = `With ${cardioPercent}% in cardio and ${peakPercent}% in peak, this was a solid threshold workout improving your ability to sustain hard efforts.`
  } else if (cardioPercent >= 40) {
    trainingType = {
      label: 'Tempo / Aerobic Power',
      description: 'Moderate-hard effort building aerobic efficiency',
      iconType: 'trending-up',
      iconColor: 'text-amber-500'
    }
    recoveryHours = 24
    nextWorkout = 'Another moderate effort or easy run'
    zoneAnalysis = `${cardioPercent}% in the cardio zone indicates good aerobic development - you're building the engine.`
  } else if (fatBurnPercent >= 40) {
    trainingType = {
      label: 'Aerobic Base',
      description: 'Building endurance foundation and fat adaptation',
      iconType: 'heart',
      iconColor: 'text-green-500'
    }
    recoveryHours = 12
    nextWorkout = 'Good to train again tomorrow - consider adding intensity'
    zoneAnalysis = `${fatBurnPercent}% in fat burn zone - great for building aerobic base and teaching your body to burn fat efficiently.`
  } else {
    trainingType = {
      label: 'Recovery / Easy',
      description: 'Low-intensity effort promoting recovery',
      iconType: 'refresh',
      iconColor: 'text-blue-500'
    }
    recoveryHours = 8
    nextWorkout = 'Ready for any workout - this promoted recovery'
    zoneAnalysis = 'This was a recovery effort, keeping heart rate low to promote adaptation from previous hard efforts.'
  }

  // Adjust recovery based on effort score
  if (workout.effort_score) {
    if (workout.effort_score >= 8) recoveryHours = Math.max(recoveryHours, 48)
    else if (workout.effort_score >= 6) recoveryHours = Math.max(recoveryHours, 36)
  }

  // Generate key takeaways
  // 1. Effort/intensity summary
  if (workout.effort_score) {
    if (workout.effort_score >= 8) {
      takeaways.push({
        iconType: 'zap',
        text: `High intensity effort (${workout.effort_score.toFixed(1)}/10) - excellent work pushing your limits`,
        type: 'positive'
      })
    } else if (workout.effort_score >= 5) {
      takeaways.push({
        iconType: 'target',
        text: `Moderate effort (${workout.effort_score.toFixed(1)}/10) - solid training stimulus`,
        type: 'positive'
      })
    } else {
      takeaways.push({
        iconType: 'refresh',
        text: `Easy effort (${workout.effort_score.toFixed(1)}/10) - good for recovery and base building`,
        type: 'neutral'
      })
    }
  }

  // 2. Cardiac drift analysis
  if (analytics) {
    if (analytics.cardiacDrift.driftPercentage <= 3) {
      takeaways.push({
        iconType: 'heart',
        text: `Excellent cardiac efficiency - only ${analytics.cardiacDrift.driftPercentage}% drift indicates strong aerobic fitness`,
        type: 'positive'
      })
    } else if (analytics.cardiacDrift.driftPercentage <= 7) {
      takeaways.push({
        iconType: 'heart',
        text: `Normal cardiac drift (${analytics.cardiacDrift.driftPercentage}%) - good pacing and hydration`,
        type: 'neutral'
      })
    } else {
      takeaways.push({
        iconType: 'alert',
        text: `High cardiac drift (${analytics.cardiacDrift.driftPercentage}%) - consider better pacing, hydration, or more base training`,
        type: 'improvement'
      })
    }

    // 3. Pacing strategy
    if (analytics.paceAnalysis && analytics.splits.length > 1) {
      if (analytics.paceAnalysis.splitStrategy === 'negative') {
        takeaways.push({
          iconType: 'award',
          text: 'Negative split achieved - textbook pacing with a strong finish',
          type: 'positive'
        })
      } else if (analytics.paceAnalysis.splitStrategy === 'positive') {
        const paceDropPercent = Math.round(((analytics.paceAnalysis.worst - analytics.paceAnalysis.best) / analytics.paceAnalysis.best) * 100)
        if (paceDropPercent > 10) {
          takeaways.push({
            iconType: 'trending-down',
            text: `Pace faded ~${paceDropPercent}% - try starting more conservatively`,
            type: 'improvement'
          })
        }
      }
    }

    // 4. Cadence feedback for running
    if (workout.workout_type === 'running' && analytics.cadenceAnalysis.average > 0) {
      if (analytics.cadenceAnalysis.optimalRange) {
        takeaways.push({
          iconType: 'footprints',
          text: `Optimal cadence (${analytics.cadenceAnalysis.average} spm) - efficient running form`,
          type: 'positive'
        })
      } else if (analytics.cadenceAnalysis.average < 165) {
        takeaways.push({
          iconType: 'footprints',
          text: `Low cadence (${analytics.cadenceAnalysis.average} spm) - try shorter, quicker steps to reduce injury risk`,
          type: 'improvement'
        })
      }
    }
  }

  // Limit to top 3-4 takeaways
  const limitedTakeaways = takeaways.slice(0, 4)

  return {
    keyTakeaways: limitedTakeaways,
    trainingType,
    recoveryTime: { hours: recoveryHours, description: getRecoveryDescription(recoveryHours) },
    nextWorkoutSuggestion: nextWorkout,
    zoneAnalysis
  }
}

function getRecoveryDescription(hours: number): string {
  if (hours <= 12) return 'Light recovery - ready for most workouts'
  if (hours <= 24) return 'Moderate recovery - avoid high intensity tomorrow'
  if (hours <= 36) return 'Significant recovery needed - easy day recommended'
  return 'Full recovery needed - rest or very easy activity only'
}

// Helper to render icon from type string
function renderIcon(iconType: IconType, className?: string) {
  const iconClass = cn('size-4', className)
  switch (iconType) {
    case 'zap': return <Zap className={iconClass} />
    case 'target': return <Target className={iconClass} />
    case 'refresh': return <RefreshCw className={iconClass} />
    case 'heart': return <Heart className={iconClass} />
    case 'alert': return <AlertTriangle className={iconClass} />
    case 'award': return <Award className={iconClass} />
    case 'trending-down': return <TrendingDown className={iconClass} />
    case 'trending-up': return <TrendingUp className={iconClass} />
    case 'footprints': return <Footprints className={iconClass} />
    case 'flame': return <Flame className={iconClass} />
    default: return <Info className={iconClass} />
  }
}

// ============================================
// KEY TAKEAWAYS COMPONENT
// ============================================

function KeyTakeaways({ advice }: { advice: WorkoutAdvice }) {
  if (advice.keyTakeaways.length === 0) return null

  const typeColors = {
    positive: 'border-green-500/30 bg-green-500/5',
    neutral: 'border-blue-500/30 bg-blue-500/5',
    improvement: 'border-amber-500/30 bg-amber-500/5'
  }

  const iconColors = {
    positive: 'text-green-500',
    neutral: 'text-blue-500',
    improvement: 'text-amber-500'
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="size-4 text-amber-400" />
        <span className="text-sm font-semibold">Key Takeaways</span>
      </div>
      <div className="space-y-2">
        {advice.keyTakeaways.map((takeaway, idx) => (
          <div
            key={idx}
            className={cn(
              'flex items-start gap-3 rounded-lg border px-3 py-2.5',
              typeColors[takeaway.type]
            )}
          >
            <div className={cn('mt-0.5 shrink-0', iconColors[takeaway.type])}>
              {renderIcon(takeaway.iconType)}
            </div>
            <span className="text-sm leading-relaxed">{takeaway.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// RECOVERY & NEXT STEPS COMPONENT
// ============================================

function RecoveryNextSteps({ advice }: { advice: WorkoutAdvice }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Battery className="size-4 text-emerald-400" />
        <span className="text-sm font-semibold">Recovery & Next Steps</span>
      </div>

      <div className="space-y-4">
        {/* Training Type */}
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted/50 p-2">
            {renderIcon(advice.trainingType.iconType, advice.trainingType.iconColor)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{advice.trainingType.label}</div>
            <div className="text-xs text-muted-foreground">{advice.trainingType.description}</div>
          </div>
        </div>

        {/* Recovery Time */}
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted/50 p-2">
            <Clock className="size-4 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              {advice.recoveryTime.hours}h recovery suggested
            </div>
            <div className="text-xs text-muted-foreground">{advice.recoveryTime.description}</div>
          </div>
        </div>

        {/* Next Workout */}
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted/50 p-2">
            <Dumbbell className="size-4 text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Next Workout</div>
            <div className="text-xs text-muted-foreground">{advice.nextWorkoutSuggestion}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ZONE ANALYSIS COMPONENT
// ============================================

function ZoneAnalysisCard({ advice, zones }: { advice: WorkoutAdvice; zones: HeartRateZone[] | null }) {
  if (!zones || zones.length === 0) return null

  const activeZones = zones.filter(z => z.percentage > 0)
  if (activeZones.length === 0) return null

  const getZoneColor = (name: string) => ZONE_COLORS[name] || DEFAULT_ZONE_COLOR

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Target className="size-4 text-cyan-400" />
        <span className="text-sm font-semibold">Zone Analysis</span>
      </div>

      {/* Zone Bar */}
      <div className="mb-3">
        <div className="flex h-6 w-full overflow-hidden rounded-lg">
          {activeZones.map((zone, idx) => {
            const colors = getZoneColor(zone.name)
            return (
              <div
                key={idx}
                className={cn(colors.bar, 'flex items-center justify-center transition-all')}
                style={{ width: `${zone.percentage}%`, opacity: 0.9 }}
              >
                {zone.percentage >= 15 && (
                  <span className="text-[10px] font-semibold text-white/90">{zone.percentage}%</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {activeZones.map((zone, idx) => {
            const colors = getZoneColor(zone.name)
            return (
              <span key={idx} className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-sm', colors.bar)} />
                <span className={colors.text}>{ZONE_LABELS[zone.name] || zone.name}</span>
                <span className="text-muted-foreground">{zone.percentage}%</span>
                <span className="text-muted-foreground">({formatDuration(zone.duration)})</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Analysis Text */}
      <div className="rounded-lg bg-muted/30 px-3 py-2">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {advice.zoneAnalysis}
        </p>
      </div>
    </div>
  )
}

// ============================================
// PERFORMANCE CHART (Recharts)
// ============================================

interface TimeSeriesChartProps {
  data: EnhancedWorkoutAnalytics['timeSeriesData']
  gpsPaceData?: Array<{ elapsedSeconds: number; pace: number; speed: number }> | null
  hrAverage?: number | null
  showHr?: boolean
  showCadence?: boolean
  showPace?: boolean
  showGpsPace?: boolean
  showCyclingSpeed?: boolean
  showCyclingPower?: boolean
  className?: string
}

// Custom tooltip - reads original values from the data point (not normalized values)
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string; payload?: Record<string, unknown> }>; label?: number }) {
  if (!active || !payload || payload.length === 0) return null

  // Get the underlying data point to read original (un-normalized) values
  const point = payload[0]?.payload as Record<string, unknown> | undefined
  const hr = point?.hr as number | null | undefined
  const cadence = point?.cadence as number | null | undefined
  const pace = point?.pace as number | null | undefined
  const cyclingSpeed = point?.cyclingSpeed as number | null | undefined
  const cyclingPower = point?.cyclingPower as number | null | undefined

  // Check which metrics are being displayed (by checking if their dataKey exists in payload)
  const hasHr = payload.some(p => p.dataKey === 'hr' || p.dataKey === '_nHr')
  const hasCadence = payload.some(p => p.dataKey === 'cadence' || p.dataKey === '_nCadence')
  const hasPace = payload.some(p => p.dataKey === 'pace' || p.dataKey === '_nPace')
  const hasGpsPaceMetric = payload.some(p => p.dataKey === 'gpsPace' || p.dataKey === '_nGpsPace')
  const hasSpeed = payload.some(p => p.dataKey === 'cyclingSpeed')
  const hasPower = payload.some(p => p.dataKey === 'cyclingPower')
  const gpsPace = point?.gpsPace as number | null | undefined

  return (
    <div className="bg-popover/95 rounded-lg border border-border/50 px-3 py-2 shadow-xl backdrop-blur-sm">
      <div className="text-muted-foreground mb-2 text-xs font-medium">
        {formatElapsedTime(label || 0)}
      </div>
      <div className="space-y-1">
        {hasHr && hr != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Heart className="size-3 text-red-500" />
              <span className="text-xs text-muted-foreground">Heart Rate</span>
            </div>
            <span className="text-sm font-semibold text-red-400">{Math.round(hr)} bpm</span>
          </div>
        )}
        {hasCadence && cadence != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Footprints className="size-3 text-blue-400" />
              <span className="text-xs text-muted-foreground">Cadence</span>
            </div>
            <span className="text-sm font-semibold text-blue-400">{Math.round(cadence)} spm</span>
          </div>
        )}
        {hasGpsPaceMetric && gpsPace != null && gpsPace > 0 && gpsPace < 30 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="size-3 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Pace</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">{formatPace(gpsPace)}/mi</span>
          </div>
        )}
        {hasPace && !hasGpsPaceMetric && pace != null && pace > 0 && pace < 30 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="size-3 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Pace</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">{formatPace(pace)}/mi</span>
          </div>
        )}
        {hasSpeed && cyclingSpeed != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="size-3 text-cyan-400" />
              <span className="text-xs text-muted-foreground">Speed</span>
            </div>
            <span className="text-sm font-semibold text-cyan-400">{(cyclingSpeed as number).toFixed(1)} mph</span>
          </div>
        )}
        {hasPower && cyclingPower != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="size-3 text-amber-400" />
              <span className="text-xs text-muted-foreground">Power</span>
            </div>
            <span className="text-sm font-semibold text-amber-400">{Math.round(cyclingPower as number)} W</span>
          </div>
        )}
      </div>
    </div>
  )
}

function TimeSeriesChart({
  data,
  gpsPaceData,
  hrAverage,
  showHr = true,
  showCadence = true,
  showPace = true,
  showGpsPace = false,
  showCyclingSpeed = false,
  showCyclingPower = false,
  className,
}: TimeSeriesChartProps) {
  const hasGpsPace = gpsPaceData != null && gpsPaceData.length >= 5
  const [activeMetrics, setActiveMetrics] = useState({
    hr: showHr,
    cadence: showCadence,
    pace: hasGpsPace ? false : showPace, // Hide HealthKit pace when GPS pace available
    gpsPace: hasGpsPace ? true : showGpsPace,
    cyclingSpeed: showCyclingSpeed,
    cyclingPower: showCyclingPower,
  })

  // Sync activeMetrics with prop changes
  useEffect(() => {
    setActiveMetrics(prev => ({
      ...prev,
      hr: showHr,
      cadence: showCadence,
      pace: hasGpsPace ? false : showPace,
      gpsPace: hasGpsPace ? true : showGpsPace,
      cyclingSpeed: showCyclingSpeed,
      cyclingPower: showCyclingPower,
    }))
  }, [showHr, showCadence, showPace, showGpsPace, hasGpsPace, showCyclingSpeed, showCyclingPower])

  // Calculate stats and ranges
  const stats = useMemo(() => {
    const hrValues = data.filter(d => d.hr !== null).map(d => d.hr!)
    const cadenceValues = data.filter(d => d.cadence !== null).map(d => d.cadence!)
    const paceValues = data.filter(d => d.pace !== null && d.pace > 0 && d.pace < 30).map(d => d.pace!)
    const gpsPaceValues = gpsPaceData?.map(p => p.pace) ?? []

    return {
      hr: {
        min: hrValues.length > 0 ? Math.min(...hrValues) : 0,
        max: hrValues.length > 0 ? Math.max(...hrValues) : 200,
        avg: hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 0,
      },
      cadence: {
        min: cadenceValues.length > 0 ? Math.min(...cadenceValues) : 0,
        max: cadenceValues.length > 0 ? Math.max(...cadenceValues) : 200,
        avg: cadenceValues.length > 0 ? Math.round(cadenceValues.reduce((a, b) => a + b, 0) / cadenceValues.length) : 0,
        uniqueCount: new Set(cadenceValues).size,
      },
      pace: {
        min: paceValues.length > 0 ? Math.min(...paceValues) : 0,
        max: paceValues.length > 0 ? Math.max(...paceValues) : 15,
        avg: paceValues.length > 0 ? paceValues.reduce((a, b) => a + b, 0) / paceValues.length : 0,
      },
      gpsPace: {
        min: gpsPaceValues.length > 0 ? Math.min(...gpsPaceValues) : 0,
        max: gpsPaceValues.length > 0 ? Math.max(...gpsPaceValues) : 15,
        avg: gpsPaceValues.length > 0 ? gpsPaceValues.reduce((a, b) => a + b, 0) / gpsPaceValues.length : 0,
      },
    }
  }, [data, gpsPaceData])

  // Sample data for performance (take every Nth point if too many)
  // Linearly interpolate sparse cadence/pace between known points
  const chartData = useMemo(() => {
    const maxPoints = 300
    const sampled = data.length <= maxPoints
      ? [...data]
      : data.filter((_, idx) => idx % Math.ceil(data.length / maxPoints) === 0)

    // Build lookup of known cadence/pace values by index for interpolation
    const knownCadence: { idx: number; val: number }[] = []
    const knownPace: { idx: number; val: number }[] = []
    sampled.forEach((p, i) => {
      if (p.cadence != null) knownCadence.push({ idx: i, val: p.cadence })
      if (p.pace != null && p.pace > 0 && p.pace < 30) knownPace.push({ idx: i, val: p.pace })
    })

    // Linearly interpolate between known points
    const lerp = (known: { idx: number; val: number }[], i: number): number | null => {
      if (known.length === 0) return null
      // Before first known point or after last -- no extrapolation
      if (i < known[0]!.idx || i > known[known.length - 1]!.idx) return null
      // Find surrounding known points
      let lo = 0, hi = known.length - 1
      while (lo < hi - 1) {
        const mid = Math.floor((lo + hi) / 2)
        if (known[mid]!.idx <= i) lo = mid; else hi = mid
      }
      const a = known[lo]!, b = known[hi]!
      if (a.idx === i) return a.val
      if (b.idx === i) return b.val
      if (a.idx === b.idx) return a.val
      const t = (i - a.idx) / (b.idx - a.idx)
      return a.val + t * (b.val - a.val)
    }

    // Build GPS pace lookup by elapsed seconds for merging
    const gpsPaceMap = new Map<number, number>()
    if (gpsPaceData) {
      for (const pt of gpsPaceData) gpsPaceMap.set(pt.elapsedSeconds, pt.pace)
    }

    return sampled.map((point, i) => ({
      ...point,
      cadence: point.cadence ?? lerp(knownCadence, i),
      pace: (point.pace != null && point.pace > 0 && point.pace < 30) ? point.pace : lerp(knownPace, i),
      gpsPace: gpsPaceMap.get(point.elapsedSeconds) ?? null,
    }))
  }, [data, gpsPaceData])

  if (data.length === 0) return null

  const toggleMetric = (metric: keyof typeof activeMetrics) => {
    setActiveMetrics(prev => ({ ...prev, [metric]: !prev[metric] }))
  }

  // Primary metric determines the Y-axis domain; secondary metrics are normalized to this range
  const primaryMetric = activeMetrics.hr ? 'hr'
    : activeMetrics.gpsPace && stats.gpsPace.avg > 0 ? 'gpsPace'
    : activeMetrics.cadence ? 'cadence'
    : activeMetrics.pace ? 'pace' : 'hr'
  const primaryDomain: [number, number] = primaryMetric === 'hr'
    ? [stats.hr.min - 10, stats.hr.max + 10]
    : primaryMetric === 'cadence'
      ? [stats.cadence.min - 5, stats.cadence.max + 5]
      : primaryMetric === 'gpsPace' && stats.gpsPace.avg > 0
        ? [stats.gpsPace.min - 1, stats.gpsPace.max + 1]
        : primaryMetric === 'pace' && stats.pace.avg > 0
          ? [stats.pace.min - 1, stats.pace.max + 1]
          : [0, 200]

  const activeCount = [activeMetrics.hr, activeMetrics.cadence, activeMetrics.pace, activeMetrics.gpsPace, activeMetrics.cyclingSpeed, activeMetrics.cyclingPower].filter(Boolean).length
  const hasSecondaryMetrics = activeCount >= 2

  // Normalize a secondary metric's values into the primary axis range
  const normalizedData = useMemo(() => {
    const [pMin, pMax] = primaryDomain
    const normalize = (val: number | null, srcMin: number, srcMax: number): number | null => {
      if (val == null) return null
      if (srcMax === srcMin) return (pMin + pMax) / 2
      return pMin + ((val - srcMin) / (srcMax - srcMin)) * (pMax - pMin)
    }

    return chartData.map(point => ({
      ...point,
      // Normalized fields for secondary metrics (prefixed with _n)
      _nCadence: primaryMetric !== 'cadence' && activeMetrics.cadence
        ? normalize(point.cadence, stats.cadence.min - 5, stats.cadence.max + 5)
        : undefined,
      _nPace: primaryMetric !== 'pace' && activeMetrics.pace
        ? normalize(point.pace, stats.pace.min - 1, stats.pace.max + 1)
        : undefined,
      _nHr: primaryMetric !== 'hr' && activeMetrics.hr
        ? normalize(point.hr, stats.hr.min - 10, stats.hr.max + 10)
        : undefined,
      _nGpsPace: primaryMetric !== 'gpsPace' && activeMetrics.gpsPace
        ? normalize(point.gpsPace, stats.gpsPace.min - 1, stats.gpsPace.max + 1)
        : undefined,
    }))
  }, [chartData, primaryDomain, primaryMetric, activeMetrics, stats])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Metric toggles */}
      <div className="flex flex-wrap items-center gap-2">
        {showHr && (
          <button
            onClick={() => toggleMetric('hr')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
              activeMetrics.hr
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <Heart className="size-3" />HR
          </button>
        )}
        {showCadence && stats.cadence.avg > 0 && (
          <button
            onClick={() => toggleMetric('cadence')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
              activeMetrics.cadence
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <Footprints className="size-3" />Cadence
          </button>
        )}
        {hasGpsPace && (
          <button
            onClick={() => toggleMetric('gpsPace')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
              activeMetrics.gpsPace
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <Activity className="size-3" />Pace
          </button>
        )}
        {!hasGpsPace && showPace && stats.pace.avg > 0 && (
          <button
            onClick={() => toggleMetric('pace')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
              activeMetrics.pace
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <Activity className="size-3" />Pace
          </button>
        )}
        {showCyclingSpeed && (
          <button
            onClick={() => toggleMetric('cyclingSpeed')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
              activeMetrics.cyclingSpeed
                ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <Activity className="size-3" />Speed
          </button>
        )}
        {showCyclingPower && (
          <button
            onClick={() => toggleMetric('cyclingPower')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
              activeMetrics.cyclingPower
                ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <Zap className="size-3" />Power
          </button>
        )}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          {activeMetrics.hr && stats.hr.avg > 0 && (
            <span><span className="text-red-400 font-medium">{stats.hr.min}–{stats.hr.max}</span> bpm</span>
          )}
          {activeMetrics.cadence && stats.cadence.avg > 0 && (
            <span><span className="text-blue-400 font-medium">{stats.cadence.min}–{stats.cadence.max}</span> spm</span>
          )}
          {activeMetrics.gpsPace && stats.gpsPace.avg > 0 && (
            <span><span className="text-emerald-400 font-medium">{formatPace(stats.gpsPace.min)}–{formatPace(stats.gpsPace.max)}</span> /mi</span>
          )}
          {activeMetrics.pace && stats.pace.avg > 0 && !activeMetrics.gpsPace && (
            <span><span className="text-emerald-400 font-medium">{formatPace(stats.pace.min)}–{formatPace(stats.pace.max)}</span> /mi</span>
          )}
        </div>
      </div>

      {/* Chart - always uses single-axis AreaChart; secondary metrics are normalized to primary scale */}
      <div className="h-52 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={normalizedData} margin={{ top: 10, right: hasSecondaryMetrics ? 42 : 10, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="perfHrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="perfCadenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="perfGpsPaceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="elapsedSeconds"
              tickFormatter={(v) => formatElapsedTime(v)}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              domain={primaryDomain}
              stroke="rgba(255,255,255,0.3)"
              tick={{
                fill: primaryMetric === 'hr' ? '#ef4444' : primaryMetric === 'cadence' ? '#60a5fa' : (primaryMetric === 'gpsPace' || primaryMetric === 'pace') ? '#34d399' : '#94a3b8',
                fontSize: 10
              }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip content={<ChartTooltip />} />

            {/* Primary HR */}
            {activeMetrics.hr && primaryMetric === 'hr' && (
              <Area type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} fill="url(#perfHrGrad)" connectNulls />
            )}
            {/* Normalized HR (when not primary) */}
            {activeMetrics.hr && primaryMetric !== 'hr' && (
              <Area type="monotone" dataKey="_nHr" stroke="#ef4444" strokeWidth={2} fill="url(#perfHrGrad)" connectNulls />
            )}

            {/* Primary Cadence */}
            {activeMetrics.cadence && primaryMetric === 'cadence' && (
              <Area type="monotone" dataKey="cadence" stroke="#60a5fa" strokeWidth={2} fill="url(#perfCadenceGrad)" connectNulls />
            )}
            {/* Normalized Cadence (when not primary) */}
            {activeMetrics.cadence && primaryMetric !== 'cadence' && (
              <Area type="monotone" dataKey="_nCadence" stroke="#60a5fa" strokeWidth={2} fill="url(#perfCadenceGrad)" connectNulls />
            )}

            {/* Primary GPS Pace */}
            {activeMetrics.gpsPace && stats.gpsPace.avg > 0 && primaryMetric === 'gpsPace' && (
              <Area type="monotone" dataKey="gpsPace" stroke="#34d399" strokeWidth={2} fill="url(#perfGpsPaceGrad)" connectNulls />
            )}
            {/* Normalized GPS Pace (when not primary) */}
            {activeMetrics.gpsPace && stats.gpsPace.avg > 0 && primaryMetric !== 'gpsPace' && (
              <Area type="monotone" dataKey="_nGpsPace" stroke="#34d399" strokeWidth={2} fill="url(#perfGpsPaceGrad)" connectNulls />
            )}

            {/* Primary HealthKit Pace (fallback when no GPS) */}
            {activeMetrics.pace && stats.pace.avg > 0 && primaryMetric === 'pace' && (
              <Area type="monotone" dataKey="pace" stroke="#34d399" strokeWidth={1.5} fill="transparent" connectNulls />
            )}
            {/* Normalized HealthKit Pace (when not primary) */}
            {activeMetrics.pace && stats.pace.avg > 0 && primaryMetric !== 'pace' && (
              <Area type="monotone" dataKey="_nPace" stroke="#34d399" strokeWidth={1.5} fill="transparent" connectNulls />
            )}

            {activeMetrics.cyclingSpeed && <Area type="monotone" dataKey="cyclingSpeed" stroke="#22d3ee" strokeWidth={1.5} fill="transparent" connectNulls />}
            {activeMetrics.cyclingPower && <Area type="monotone" dataKey="cyclingPower" stroke="#fbbf24" strokeWidth={1.5} fill="transparent" connectNulls />}
          </AreaChart>
        </ResponsiveContainer>

        {/* Right-side scale labels for secondary metrics */}
        {hasSecondaryMetrics && (
          <div className="absolute right-0 top-[10px] bottom-[25px] flex flex-col justify-between text-[9px] pr-0.5">
            {activeMetrics.cadence && primaryMetric !== 'cadence' && (
              <>
                <span className="text-blue-400/70 tabular-nums">{stats.cadence.max + 5}</span>
                <span className="text-blue-400/70 tabular-nums">{stats.cadence.min - 5}</span>
              </>
            )}
            {activeMetrics.hr && primaryMetric !== 'hr' && (
              <>
                <span className="text-red-400/70 tabular-nums">{stats.hr.max + 10}</span>
                <span className="text-red-400/70 tabular-nums">{stats.hr.min - 10}</span>
              </>
            )}
            {activeMetrics.gpsPace && stats.gpsPace.avg > 0 && primaryMetric !== 'gpsPace' && (
              <>
                <span className="text-emerald-400/70 tabular-nums">{formatPace(stats.gpsPace.max + 1)}</span>
                <span className="text-emerald-400/70 tabular-nums">{formatPace(stats.gpsPace.min - 1)}</span>
              </>
            )}
            {activeMetrics.pace && stats.pace.avg > 0 && primaryMetric !== 'pace' && !activeMetrics.gpsPace && (
              <>
                <span className="text-emerald-400/70 tabular-nums">{formatPace(stats.pace.max + 1)}</span>
                <span className="text-emerald-400/70 tabular-nums">{formatPace(stats.pace.min - 1)}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// CADENCE DISTRIBUTION & ANALYSIS
// ============================================

const CADENCE_ZONES = [
  { label: '<160', min: 0, max: 160, color: '#ef4444', desc: 'Overstriding' },
  { label: '160–165', min: 160, max: 165, color: '#f97316', desc: 'Low' },
  { label: '165–170', min: 165, max: 170, color: '#eab308', desc: 'Below Optimal' },
  { label: '170–175', min: 170, max: 175, color: '#22c55e', desc: 'Optimal' },
  { label: '175–180', min: 175, max: 180, color: '#10b981', desc: 'Optimal' },
  { label: '180–185', min: 180, max: 185, color: '#06b6d4', desc: 'Elite' },
  { label: '185+', min: 185, max: Infinity, color: '#8b5cf6', desc: 'Sprint' },
]

function CadenceDistributionChart({
  data,
  cadenceAnalysis,
  className,
}: {
  data: EnhancedWorkoutAnalytics['timeSeriesData']
  cadenceAnalysis: { average: number; min: number; max: number; standardDeviation: number; consistency: string; optimalRange: boolean; recommendation: string }
  className?: string
}) {
  const distribution = useMemo(() => {
    const cadencePoints = data.filter(p => p.cadence != null).map(p => p.cadence!)
    if (cadencePoints.length === 0) return []

    return CADENCE_ZONES.map(zone => {
      const count = cadencePoints.filter(c => c >= zone.min && c < zone.max).length
      const pct = Math.round((count / cadencePoints.length) * 100)
      return { ...zone, count, pct }
    }).filter(z => z.count > 0)
  }, [data])

  const hrCadenceCorrelation = useMemo(() => {
    const paired = data.filter(p => p.hr != null && p.cadence != null)
    if (paired.length < 10) return null

    const half = Math.floor(paired.length / 2)
    const firstHalf = paired.slice(0, half)
    const secondHalf = paired.slice(half)

    const avgCad1 = Math.round(firstHalf.reduce((s, p) => s + p.cadence!, 0) / firstHalf.length)
    const avgHr1 = Math.round(firstHalf.reduce((s, p) => s + p.hr!, 0) / firstHalf.length)
    const avgCad2 = Math.round(secondHalf.reduce((s, p) => s + p.cadence!, 0) / secondHalf.length)
    const avgHr2 = Math.round(secondHalf.reduce((s, p) => s + p.hr!, 0) / secondHalf.length)

    const cadDelta = avgCad2 - avgCad1
    const hrDelta = avgHr2 - avgHr1
    const stepsPerBeat = cadenceAnalysis.average > 0 && paired.length > 0
      ? (paired.reduce((s, p) => s + p.cadence!, 0) / paired.length) / (paired.reduce((s, p) => s + p.hr!, 0) / paired.length)
      : 0

    return { avgCad1, avgHr1, avgCad2, avgHr2, cadDelta, hrDelta, stepsPerBeat }
  }, [data, cadenceAnalysis.average])

  if (distribution.length === 0) return null

  // Sparse cadence: fewer than 3 unique values or only 1 zone - show simplified view
  const uniqueValues = new Set(data.filter(p => p.cadence != null).map(p => p.cadence!))
  const isSparse = uniqueValues.size <= 3

  if (isSparse) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-muted-foreground">Average Cadence</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-semibold',
              cadenceAnalysis.optimalRange ? 'bg-green-500/20 text-green-400' : cadenceAnalysis.average < 165 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
            )}>
              {cadenceAnalysis.optimalRange ? 'Optimal' : cadenceAnalysis.average < 165 ? 'Below Optimal' : 'Good'}
            </span>
            <span className="text-lg font-bold tabular-nums text-blue-400">{cadenceAnalysis.average}</span>
            <span className="text-muted-foreground">spm</span>
          </div>
        </div>
        {cadenceAnalysis.recommendation && (
          <p className="text-[10px] leading-relaxed text-muted-foreground/80 rounded-lg bg-muted/20 px-2.5 py-1.5">{cadenceAnalysis.recommendation}</p>
        )}
        {hrCadenceCorrelation && hrCadenceCorrelation.stepsPerBeat > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Steps/Beat: <span className="font-medium text-purple-400 tabular-nums">{hrCadenceCorrelation.stepsPerBeat.toFixed(2)}</span></span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Cadence zones bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium text-muted-foreground">Cadence Distribution</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-semibold',
              cadenceAnalysis.optimalRange ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
            )}>
              {cadenceAnalysis.optimalRange ? 'Optimal' : cadenceAnalysis.average < 165 ? 'Low' : 'Good'}
            </span>
            <span className="tabular-nums text-muted-foreground">{cadenceAnalysis.average} avg</span>
          </div>
        </div>

        {/* Horizontal stacked zone bar */}
        <div className="relative h-5 w-full overflow-hidden rounded-full bg-muted/30">
          <div className="flex h-full">
            {distribution.map((zone, i) => (
              <div
                key={i}
                className="relative h-full transition-all"
                style={{ width: `${zone.pct}%`, backgroundColor: zone.color }}
                title={`${zone.label} spm: ${zone.pct}%`}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          {distribution.map((zone, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="size-2 rounded-full" style={{ backgroundColor: zone.color }} />
              <span>{zone.label}</span>
              <span className="font-medium tabular-nums" style={{ color: zone.color }}>{zone.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution bar chart */}
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="rounded-lg border border-border/50 bg-popover/95 px-2.5 py-1.5 text-xs shadow-xl backdrop-blur-sm">
                    <div className="font-medium" style={{ color: d?.color }}>{d?.label} spm</div>
                    <div className="text-muted-foreground">{d?.pct}% of workout ({d?.count} samples)</div>
                    <div className="text-muted-foreground/70">{d?.desc}</div>
                  </div>
                )
              }}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {distribution.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Consistency & Efficiency stats strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Range</span>
          <span className="font-medium tabular-nums text-blue-400">{cadenceAnalysis.min}–{cadenceAnalysis.max}</span>
          <span className="text-muted-foreground">spm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Std Dev</span>
          <span className="font-medium tabular-nums text-blue-400">±{cadenceAnalysis.standardDeviation}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Consistency</span>
          <span className={cn(
            'rounded px-1 py-0.5 text-[10px] font-medium',
            cadenceAnalysis.consistency === 'very_consistent' ? 'bg-green-500/15 text-green-400' :
            cadenceAnalysis.consistency === 'consistent' ? 'bg-blue-500/15 text-blue-400' :
            'bg-amber-500/15 text-amber-400'
          )}>
            {cadenceAnalysis.consistency.replace('_', ' ')}
          </span>
        </div>
        {hrCadenceCorrelation && hrCadenceCorrelation.stepsPerBeat > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Steps/Beat</span>
            <span className="font-medium tabular-nums text-purple-400">{hrCadenceCorrelation.stepsPerBeat.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* HR-Cadence first half vs second half comparison */}
      {hrCadenceCorrelation && (
        <div className="rounded-lg bg-muted/20 p-2.5">
          <div className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">HR × Cadence Drift</div>
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <div className="text-muted-foreground/70 text-[10px]">First Half</div>
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-red-400 tabular-nums">{hrCadenceCorrelation.avgHr1} <span className="text-muted-foreground font-normal">bpm</span></span>
                <span className="font-medium text-blue-400 tabular-nums">{hrCadenceCorrelation.avgCad1} <span className="text-muted-foreground font-normal">spm</span></span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground/70 text-[10px]">Second Half</div>
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-red-400 tabular-nums">{hrCadenceCorrelation.avgHr2} <span className="text-muted-foreground font-normal">bpm</span></span>
                <span className="font-medium text-blue-400 tabular-nums">{hrCadenceCorrelation.avgCad2} <span className="text-muted-foreground font-normal">spm</span></span>
              </div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>HR drift: <span className={cn('font-medium', hrCadenceCorrelation.hrDelta > 5 ? 'text-amber-400' : 'text-green-400')}>
              {hrCadenceCorrelation.hrDelta > 0 ? '+' : ''}{hrCadenceCorrelation.hrDelta} bpm
            </span></span>
            <span>Cadence drift: <span className={cn('font-medium', Math.abs(hrCadenceCorrelation.cadDelta) > 3 ? 'text-amber-400' : 'text-green-400')}>
              {hrCadenceCorrelation.cadDelta > 0 ? '+' : ''}{hrCadenceCorrelation.cadDelta} spm
            </span></span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// ZONE-COLORED HR CHART (Apple Fitness style)
// ============================================

interface ZoneColoredHrChartProps {
  data: EnhancedWorkoutAnalytics['timeSeriesData']
  hrZonesConfig: HrZonesConfig
  hrAverage?: number | null
  className?: string
}

function ZoneColoredHrChart({ data, hrZonesConfig, hrAverage, className }: ZoneColoredHrChartProps) {
  const [hoverData, setHoverData] = useState<{ x: number; hr: number; zone: number; zoneLabel: string; zoneColor: string; time: number } | null>(null)
  const chartRef = React.useRef<HTMLDivElement>(null)

  if (data.length === 0 || !hrZonesConfig || hrZonesConfig.zones.length < 5) return null

  const zones = hrZonesConfig.zones

  // Get zone for a given BPM using minBpm thresholds from Apple Watch
  // Zone 1: <135, Zone 2: 136-147, Zone 3: 148-158, Zone 4: 159-169, Zone 5: 170+
  const getZoneForBpm = (bpm: number): { zone: number; color: string; label: string } => {
    const z5 = zones[4]
    const z4 = zones[3]
    const z3 = zones[2]
    const z2 = zones[1]
    const z1 = zones[0]

    // Check from highest to lowest zone using minBpm
    if (z5 && z5.minBpm && bpm >= z5.minBpm) return { zone: 5, color: z5.color, label: z5.label }
    if (z4 && z4.minBpm && bpm >= z4.minBpm) return { zone: 4, color: z4.color, label: z4.label }
    if (z3 && z3.minBpm && bpm >= z3.minBpm) return { zone: 3, color: z3.color, label: z3.label }
    if (z2 && z2.minBpm && bpm >= z2.minBpm) return { zone: 2, color: z2.color, label: z2.label }
    return { zone: 1, color: z1?.color || '#60a5fa', label: z1?.label || 'Zone 1' }
  }

  const getZoneColor = (bpm: number): string => getZoneForBpm(bpm).color
  const getZoneNumber = (bpm: number): number => getZoneForBpm(bpm).zone

  // Sample data for performance
  const maxPoints = 200
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const chartData = useMemo(() => {
    if (data.length <= maxPoints) return data.filter(d => d.hr !== null)
    const step = Math.ceil(data.length / maxPoints)
    return data.filter((d, idx) => idx % step === 0 && d.hr !== null)
  }, [data])

  // Calculate stats
  const hrValues = chartData.filter(d => d.hr !== null).map(d => d.hr!)
  if (hrValues.length === 0) return null

  const minHr = Math.min(...hrValues)
  const maxHr = Math.max(...hrValues)
  const lastPoint = chartData[chartData.length - 1]
  const totalSeconds = lastPoint ? lastPoint.elapsedSeconds : 0

  // Build segments with zone colors
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const segments = useMemo(() => {
    const segs: { startIdx: number; endIdx: number; color: string; zone: number }[] = []
    let currentZone = -1
    let segStart = 0

    chartData.forEach((point, idx) => {
      if (point.hr === null) return
      const zone = getZoneNumber(point.hr)
      if (zone !== currentZone) {
        if (currentZone !== -1) {
          const startPoint = chartData[segStart]
          if (startPoint && startPoint.hr !== null) {
            segs.push({
              startIdx: segStart,
              endIdx: idx,
              color: getZoneColor(startPoint.hr),
              zone: currentZone,
            })
          }
        }
        segStart = idx
        currentZone = zone
      }
    })
    // Push last segment
    if (currentZone !== -1) {
      const startPoint = chartData[segStart]
      if (startPoint && startPoint.hr !== null) {
        segs.push({
          startIdx: segStart,
          endIdx: chartData.length - 1,
          color: getZoneColor(startPoint.hr),
          zone: currentZone,
        })
      }
    }
    return segs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData])

  // SVG dimensions
  const width = 400
  const height = 140
  const padding = { top: 15, right: 40, bottom: 30, left: 45 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Scale functions
  const xScale = (idx: number) => padding.left + (idx / (chartData.length - 1)) * chartWidth
  const yScale = (hr: number) => padding.top + chartHeight - ((hr - minHr + 10) / (maxHr - minHr + 20)) * chartHeight

  // Build path for each segment
  const segmentPaths = segments.map((seg, segIdx) => {
    const points: string[] = []
    for (let i = seg.startIdx; i <= seg.endIdx; i++) {
      const point = chartData[i]
      if (point && point.hr !== null) {
        const x = xScale(i)
        const y = yScale(point.hr)
        points.push(`${points.length === 0 ? 'M' : 'L'} ${x} ${y}`)
      }
    }
    return { path: points.join(' '), color: seg.color, key: segIdx }
  })

  // Y-axis ticks
  const yTicks = [minHr, Math.round((minHr + maxHr) / 2), maxHr]

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with avg HR */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="size-4 text-red-500" />
          <span className="text-sm font-medium">Heart Rate</span>
        </div>
        {hrAverage && (
          <div className="text-right">
            <span className="text-2xl font-bold text-red-500">{hrAverage}</span>
            <span className="text-muted-foreground ml-1 text-xs">BPM AVG</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        className="relative"
        onMouseMove={(e) => {
          if (!chartRef.current) return
          const rect = chartRef.current.getBoundingClientRect()
          const relativeX = e.clientX - rect.left
          const svgWidth = rect.width
          const dataX = ((relativeX / svgWidth) * width - padding.left) / chartWidth
          const dataIdx = Math.round(dataX * (chartData.length - 1))

          if (dataIdx >= 0 && dataIdx < chartData.length) {
            const point = chartData[dataIdx]
            if (point && point.hr != null) {
              const zoneInfo = getZoneForBpm(point.hr)
              setHoverData({
                x: relativeX,
                hr: point.hr,
                zone: zoneInfo.zone,
                zoneLabel: zoneInfo.label,
                zoneColor: zoneInfo.color,
                time: point.elapsedSeconds
              })
            }
          }
        }}
        onMouseLeave={() => setHoverData(null)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Zone background bands */}
          {hrZonesConfig.zones.map((zone, idx) => {
            const topBpm = idx === 4 ? maxHr + 10 : (hrZonesConfig.zones[idx + 1]?.maxBpm || zone.minBpm || 0)
            const bottomBpm = zone.maxBpm || zone.minBpm || minHr
            const y1 = yScale(topBpm)
            const y2 = yScale(bottomBpm)
            if (y1 >= padding.top + chartHeight || y2 <= padding.top) return null
            return (
              <rect
                key={idx}
                x={padding.left}
                y={Math.max(y1, padding.top)}
                width={chartWidth}
                height={Math.min(y2, padding.top + chartHeight) - Math.max(y1, padding.top)}
                fill={zone.color}
                fillOpacity={0.08}
              />
            )
          })}

          {/* Grid lines */}
          {yTicks.map((tick, idx) => (
            <line
              key={idx}
              x1={padding.left}
              y1={yScale(tick)}
              x2={padding.left + chartWidth}
              y2={yScale(tick)}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="2 4"
            />
          ))}

          {/* Average HR line */}
          {hrAverage && (
            <line
              x1={padding.left}
              y1={yScale(hrAverage)}
              x2={padding.left + chartWidth}
              y2={yScale(hrAverage)}
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
          )}

          {/* Zone-colored HR line segments */}
          {segmentPaths.map(({ path, color, key }) => (
            <path
              key={key}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Hover indicator line */}
          {hoverData && (
            <>
              <line
                x1={hoverData.x / (chartRef.current?.getBoundingClientRect().width || 1) * width}
                y1={padding.top}
                x2={hoverData.x / (chartRef.current?.getBoundingClientRect().width || 1) * width}
                y2={padding.top + chartHeight}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={1}
              />
              <circle
                cx={hoverData.x / (chartRef.current?.getBoundingClientRect().width || 1) * width}
                cy={yScale(hoverData.hr)}
                r={5}
                fill={hoverData.zoneColor}
                stroke="#fff"
                strokeWidth={2}
              />
            </>
          )}

          {/* Y-axis labels */}
          {yTicks.map((tick, idx) => (
            <text
              key={idx}
              x={padding.left - 8}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: '10px' }}
            >
              {tick}
            </text>
          ))}

          {/* X-axis labels */}
          <text x={padding.left} y={height - 8} className="fill-muted-foreground" style={{ fontSize: '10px' }}>
            {formatElapsedTime(0)}
          </text>
          <text x={padding.left + chartWidth / 2} y={height - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '10px' }}>
            {formatElapsedTime(totalSeconds / 2)}
          </text>
          <text x={padding.left + chartWidth} y={height - 8} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: '10px' }}>
            {formatElapsedTime(totalSeconds)}
          </text>

          {/* Min/Max labels on right */}
          <text x={width - 5} y={yScale(maxHr) + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: '10px' }}>
            {maxHr}
          </text>
          <text x={width - 5} y={yScale(minHr) + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: '10px' }}>
            {minHr}
          </text>
        </svg>

        {/* Tooltip */}
        {hoverData && (
          <div
            className="absolute pointer-events-none bg-popover/95 rounded-lg border border-border/50 px-3 py-2 shadow-xl backdrop-blur-sm z-10"
            style={{
              left: Math.min(hoverData.x + 10, (chartRef.current?.getBoundingClientRect().width || 300) - 140),
              top: 20
            }}
          >
            <div className="text-muted-foreground mb-1.5 text-xs font-medium">
              {formatElapsedTime(hoverData.time)}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Heart className="size-3" style={{ color: hoverData.zoneColor }} />
                <span className="text-xs text-muted-foreground">Heart Rate</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: hoverData.zoneColor }}>
                {Math.round(hoverData.hr)} bpm
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 mt-1">
              <span className="text-xs text-muted-foreground">Zone</span>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: hoverData.zoneColor }} />
                <span className="text-xs font-medium" style={{ color: hoverData.zoneColor }}>
                  {hoverData.zoneLabel}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zone legend - showing exact BPM ranges from Apple Watch */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
        {hrZonesConfig.zones.map((zone) => {
          // Build BPM range string based on zone
          let rangeStr = ''
          if (zone.zone === 1) {
            rangeStr = `<${(zone.maxBpm || 0) + 1}`
          } else if (zone.zone === 5) {
            rangeStr = `${zone.minBpm}+`
          } else {
            rangeStr = `${zone.minBpm}-${zone.maxBpm}`
          }
          return (
            <div key={zone.zone} className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
              <span style={{ color: zone.color }} className="font-medium">{zone.label}</span>
              <span className="text-muted-foreground">{rangeStr}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// EVENT TIMELINE (CSS-based, not SVG)
// ============================================

function WorkoutStructure({
  events,
  workoutDuration,
  startTime,
  className,
}: {
  events: WorkoutEventData[]
  workoutDuration: number
  startTime: Date
  className?: string
}) {
  if (events.length === 0) return null

  const segments = events.filter(e => e.event_type === 'segment')
  const pauses = events.filter(e => e.event_type.includes('pause'))
  const resumes = events.filter(e => e.event_type.includes('resume'))

  const totalPauseTime = pauses.reduce((sum, p) => {
    if (p.duration) return sum + p.duration
    const pauseTime = new Date(p.timestamp).getTime()
    const nextResume = resumes.find(r => new Date(r.timestamp).getTime() > pauseTime)
    if (nextResume) return sum + (new Date(nextResume.timestamp).getTime() - pauseTime) / 1000
    return sum
  }, 0)
  const activeTime = workoutDuration - totalPauseTime
  const activePercent = Math.round((activeTime / workoutDuration) * 100)

  const getPositionPercent = (timestamp: string) => {
    const elapsed = (new Date(timestamp).getTime() - startTime.getTime()) / 1000
    return Math.min(100, Math.max(0, (elapsed / workoutDuration) * 100))
  }

  // Calculate longest and shortest segments
  const segmentDurations = segments.filter(s => s.duration != null).map(s => s.duration!)
  const longestSeg = segmentDurations.length > 0 ? Math.max(...segmentDurations) : null
  const shortestSeg = segmentDurations.length > 1 ? Math.min(...segmentDurations) : null
  const avgSegDuration = segmentDurations.length > 0
    ? segmentDurations.reduce((a, b) => a + b, 0) / segmentDurations.length
    : null

  return (
    <div className={className}>
      {/* Visual timeline */}
      <div className="bg-muted/30 relative h-3 w-full overflow-hidden rounded-full">
        {segments.map((seg, idx) => {
          const left = getPositionPercent(seg.timestamp)
          const width = seg.duration ? (seg.duration / workoutDuration) * 100 : 1
          return (
            <div
              key={`seg-${idx}`}
              className="absolute top-0 h-full bg-green-500/60"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.3)}%` }}
            />
          )
        })}
        {pauses.map((p, idx) => (
          <div
            key={`pause-${idx}`}
            className="absolute top-0 h-full w-[2px] bg-orange-400"
            style={{ left: `${getPositionPercent(p.timestamp)}%` }}
          />
        ))}
      </div>

      {/* Stats strip */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-1.5 rounded-full bg-green-500" />
          <span className="font-medium text-foreground">{formatDuration(activeTime)}</span> active
          <span className="text-muted-foreground/50">({activePercent}%)</span>
        </span>
        {pauses.length > 0 && totalPauseTime > 0 && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-orange-400" />
            <span className="font-medium text-foreground">{formatDuration(totalPauseTime)}</span> paused
            <span className="text-muted-foreground/50">({pauses.length}x)</span>
          </span>
        )}
        {segments.length > 1 && (
          <span className="text-muted-foreground">
            {segments.length} segments
          </span>
        )}
        {avgSegDuration != null && segments.length > 1 && (
          <span className="text-muted-foreground">
            avg <span className="font-medium text-foreground">{formatDuration(avgSegDuration)}</span>
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================
// HR ZONES (CSS-based flexbox)
// ============================================

function HrZonesBar({ zones, className }: { zones: HeartRateZone[]; className?: string }) {
  const activeZones = zones.filter(z => z.percentage > 0)
  if (activeZones.length === 0) return null

  const getZoneColor = (name: string) => ZONE_COLORS[name] || DEFAULT_ZONE_COLOR
  const getZoneLabel = (name: string) => ZONE_LABELS[name] || name

  return (
    <div className={className}>
      {/* Bar */}
      <div className="flex h-5 w-full overflow-hidden rounded">
        {activeZones.map((zone, idx) => {
          const colors = getZoneColor(zone.name)
          return (
            <div
              key={idx}
              className={cn(colors.bar)}
              style={{ width: `${zone.percentage}%`, opacity: 0.85 }}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {activeZones.map((zone, idx) => {
          const colors = getZoneColor(zone.name)
          return (
            <span key={idx} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-sm', colors.bar)} />
              <span className={colors.text}>{getZoneLabel(zone.name)}</span>
              <span className="text-muted-foreground">{zone.percentage}%</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// SPLITS BAR CHART (CSS-based)
// ============================================

function SplitsChart({ splits, gpsPaceData, totalDistance, className }: {
  splits: WorkoutSplit[]
  gpsPaceData?: Array<{ elapsedSeconds: number; pace: number }> | null
  totalDistance?: number | null
  className?: string
}) {
  if (splits.length === 0 && (!gpsPaceData || gpsPaceData.length < 5)) return null

  // For short runs (<=1 split), generate quarter-mile sub-splits from GPS pace data
  const useGpsSubSplits = splits.length <= 1 && gpsPaceData && gpsPaceData.length >= 5 && totalDistance && totalDistance > 0
  const displaySplits = useMemo(() => {
    if (!useGpsSubSplits || !gpsPaceData || !totalDistance) return splits

    // Divide workout into ~quarter-mile segments based on elapsed time ratio
    const totalMiles = totalDistance / 1609.34
    const segmentMiles = 0.25
    const numSegments = Math.max(2, Math.ceil(totalMiles / segmentMiles))
    const totalTime = gpsPaceData[gpsPaceData.length - 1]!.elapsedSeconds - gpsPaceData[0]!.elapsedSeconds

    const subSplits: WorkoutSplit[] = []
    for (let i = 0; i < numSegments; i++) {
      const startFrac = i / numSegments
      const endFrac = (i + 1) / numSegments
      const startTime = gpsPaceData[0]!.elapsedSeconds + startFrac * totalTime
      const endTime = gpsPaceData[0]!.elapsedSeconds + endFrac * totalTime

      const segmentPoints = gpsPaceData.filter(p => p.elapsedSeconds >= startTime && p.elapsedSeconds < endTime)
      if (segmentPoints.length === 0) continue

      const avgPace = segmentPoints.reduce((s, p) => s + p.pace, 0) / segmentPoints.length
      const distMeters = (totalDistance / numSegments)

      subSplits.push({
        splitNumber: i + 1,
        distanceMeters: distMeters,
        timeSeconds: (endTime - startTime),
        avgPace,
        avgHr: 0,
        avgCadence: 0,
        elevationChange: null as unknown as number,
        paceVsAvg: 0,
        hrVsAvg: 0,
        efficiencyFactor: 0,
      })
    }
    return subSplits
  }, [splits, gpsPaceData, totalDistance, useGpsSubSplits])

  if (displaySplits.length === 0) return null

  const paces = displaySplits.map(s => s.avgPace)
  const minPace = Math.min(...paces)
  const maxPace = Math.max(...paces)
  const range = maxPace - minPace || 1
  const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length
  const hasElevation = displaySplits.some(s => s.elevationChange != null && s.elevationChange !== 0)

  return (
    <div className={className}>
      {useGpsSubSplits && (
        <div className="mb-2 text-[10px] text-muted-foreground/70">GPS-derived quarter-mile segments</div>
      )}
      {/* Bars */}
      <div className="flex h-20 items-end gap-1">
        {displaySplits.map((split, idx) => {
          const isFastest = split.avgPace === minPace
          const heightPercent = 30 + ((maxPace - split.avgPace) / range) * 70
          return (
            <div key={idx} className="group relative flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full rounded-t transition-all',
                  isFastest ? 'bg-green-500' : 'bg-muted-foreground/40'
                )}
                style={{ height: `${heightPercent}%` }}
              />
              <span className="text-muted-foreground text-[10px]">{useGpsSubSplits ? `¼${split.splitNumber}` : split.splitNumber}</span>
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 rounded border border-border/50 bg-popover px-2 py-1.5 text-xs shadow-lg group-hover:block whitespace-nowrap">
                <div className="font-medium">{formatPace(split.avgPace)}/mi</div>
                {split.avgHr > 0 && <div className="text-muted-foreground">{split.avgHr} bpm</div>}
                {hasElevation && split.elevationChange != null && (
                  <div className={cn('text-muted-foreground', split.elevationChange > 0 ? 'text-green-400' : split.elevationChange < 0 ? 'text-red-400' : '')}>
                    {split.elevationChange > 0 ? '+' : ''}{Math.round(split.elevationChange * 3.28084)} ft
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Best: <span className="font-medium text-green-400">{formatPace(minPace)}/mi</span>
        </span>
        <span className="text-muted-foreground">
          Avg: <span className="font-medium">{formatPace(avgPace)}/mi</span>
        </span>
      </div>

      {/* Elevation per split (if available) */}
      {hasElevation && (
        <div className="mt-2 flex h-6 items-end gap-1">
          {displaySplits.map((split, idx) => {
            const elev = split.elevationChange ?? 0
            const elevFt = Math.round(elev * 3.28084)
            return (
              <div key={idx} className="flex flex-1 justify-center">
                <span className={cn(
                  'text-[9px] tabular-nums',
                  elevFt > 0 ? 'text-green-400' : elevFt < 0 ? 'text-red-400' : 'text-muted-foreground'
                )}>
                  {elevFt > 0 ? '+' : ''}{elevFt}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// STAT COMPONENT
// ============================================

function Stat({ label, value, unit, subtext, color, size = 'default' }: {
  label: string
  value: string | number
  unit?: string
  subtext?: string
  color?: string
  size?: 'default' | 'large'
}) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">{label}</div>
      <div className={cn('flex items-baseline gap-1', size === 'large' ? 'text-2xl' : 'text-lg')}>
        <span className={cn('font-semibold tabular-nums', color)}>{value}</span>
        {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
      </div>
      {subtext && <div className="text-muted-foreground text-xs">{subtext}</div>}
    </div>
  )
}

// ============================================
// METRIC ROW
// ============================================

function MetricRow({ icon, label, value, unit, badge, description }: {
  icon: React.ReactNode
  label: string
  value: string | number
  unit?: string
  badge?: { label: string; variant: 'good' | 'neutral' | 'warning' }
  description?: string
}) {
  const badgeColors = {
    good: 'bg-green-500/20 text-green-400',
    neutral: 'bg-blue-500/20 text-blue-400',
    warning: 'bg-amber-500/20 text-amber-400',
  }

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="text-muted-foreground shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{label}</span>
            {badge && <span className={cn('rounded px-1.5 py-0.5 text-[10px]', badgeColors[badge.variant])}>{badge.label}</span>}
          </div>
          {description && <div className="text-muted-foreground text-xs">{description}</div>}
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <span className="text-base font-semibold tabular-nums">{value}</span>
        {unit && <span className="text-muted-foreground ml-1 text-xs">{unit}</span>}
      </div>
    </div>
  )
}

// ============================================
// INSIGHT ROW
// ============================================

function InsightRow({ insight }: { insight: PerformanceInsight }) {
  const icons = {
    positive: <TrendingUp className="size-4 text-green-400" />,
    negative: <TrendingDown className="size-4 text-red-400" />,
    neutral: <Info className="size-4 text-blue-400" />,
    warning: <AlertTriangle className="size-4 text-amber-400" />,
  }

  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="mt-0.5 shrink-0">{(icons as any)[insight.category]}</div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{insight.title}</div>
        <div className="text-muted-foreground text-xs leading-relaxed">{insight.description}</div>
      </div>
    </div>
  )
}

// ============================================
// ROUTE MAP (for outdoor workouts) — uses Google Maps via MapleRouteMap
// ============================================

function WorkoutRouteMap({ route, hrSamples }: { route: RouteData; hrSamples: HrSample[] }) {
  const samples = route.samples
  if (!samples || samples.length < 2) return null

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">Route</div>
      <MapleRouteMap
        samples={samples}
        hrSamples={hrSamples}
        className="h-[280px]"
        colorByHeartRate
      />
      {(route.total_elevation_gain != null || route.total_elevation_loss != null) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {route.total_elevation_gain != null && (
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3 text-green-400" />
              +{Math.round(route.total_elevation_gain * 3.28084)} ft gain
            </span>
          )}
          {route.total_elevation_loss != null && (
            <span className="flex items-center gap-1">
              <TrendingDown className="size-3 text-red-400" />
              -{Math.round(route.total_elevation_loss * 3.28084)} ft loss
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// ELEVATION PROFILE CHART
// ============================================

function ElevationProfileChart({ route }: { route: RouteData }) {
  const samples = route.samples
  if (!samples || samples.length < 2) return null

  // Filter samples with altitude data
  const altitudeSamples = samples.filter(s => s.altitude != null)
  if (altitudeSamples.length < 2) return null

  // Calculate cumulative distance for x-axis and include speed for pace overlay
  const rawChartData: { distance: number; altitude: number; altitudeFt: number; pace: number | null }[] = []
  let cumulativeDistance = 0

  for (let i = 0; i < altitudeSamples.length; i++) {
    const sample = altitudeSamples[i]!
    if (i > 0) {
      const prev = altitudeSamples[i - 1]!
      const dLat = (sample.latitude - prev.latitude) * Math.PI / 180
      const dLng = (sample.longitude - prev.longitude) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(prev.latitude * Math.PI / 180) * Math.cos(sample.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      cumulativeDistance += 6371000 * c
    }
    // Compute pace from speed (min/mi)
    let pace: number | null = null
    if (sample.speed != null && sample.speed > 0.5 && sample.speed < 6.5) {
      pace = 26.8224 / sample.speed
    }
    rawChartData.push({
      distance: cumulativeDistance / 1609.344,
      altitude: sample.altitude!,
      altitudeFt: sample.altitude! * 3.28084,
      pace,
    })
  }

  // Downsample
  const maxPoints = 200
  const downsampleRate = Math.max(1, Math.floor(rawChartData.length / maxPoints))
  const downsampled = rawChartData.filter((_, i) => i % downsampleRate === 0)

  // Smooth pace with rolling average for display
  const smoothedData = downsampled.map((d, i) => {
    const windowSize = 5
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(downsampled.length, i + Math.ceil(windowSize / 2))
    const pacePoints = downsampled.slice(start, end).filter(p => p.pace != null).map(p => p.pace!)
    const smoothedPace = pacePoints.length > 0 ? pacePoints.reduce((a, b) => a + b, 0) / pacePoints.length : null
    return { ...d, pace: smoothedPace }
  })

  const hasPaceData = smoothedData.some(d => d.pace != null)

  const minAlt = Math.min(...smoothedData.map(d => d.altitudeFt))
  const maxAlt = Math.max(...smoothedData.map(d => d.altitudeFt))
  const altRange = maxAlt - minAlt

  // Normalize pace into altitude range for single-axis overlay
  const paceValues = smoothedData.filter(d => d.pace != null).map(d => d.pace!)
  const minPace = paceValues.length > 0 ? Math.min(...paceValues) : 0
  const maxPace = paceValues.length > 0 ? Math.max(...paceValues) : 15
  const altDomainMin = Math.floor(minAlt - altRange * 0.1)
  const altDomainMax = Math.ceil(maxAlt + altRange * 0.1)

  const chartDataWithNormPace = hasPaceData ? smoothedData.map(d => ({
    ...d,
    // Normalize pace into altitude domain (note: pace is inverted - lower = faster)
    normalizedPace: d.pace != null
      ? altDomainMin + ((maxPace - d.pace) / (maxPace - minPace || 1)) * (altDomainMax - altDomainMin)
      : null,
  })) : smoothedData.map(d => ({ ...d, normalizedPace: null }))

  return (
    <div>
      <div className="text-muted-foreground mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
        <span>Elevation Profile</span>
        {hasPaceData && (
          <span className="text-[10px] font-normal normal-case text-orange-400/70">
            Pace: {formatPace(minPace)}–{formatPace(maxPace)}/mi
          </span>
        )}
      </div>
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartDataWithNormPace} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distance"
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[altDomainMin, altDomainMax]}
              tickFormatter={(v: number) => `${Math.round(v)}`}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload as { altitudeFt: number; distance: number; pace: number | null }
                return (
                  <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-lg">
                    <div className="font-medium">{d.altitudeFt.toFixed(0)} ft</div>
                    {d.pace != null && <div className="text-orange-400">{formatPace(d.pace)}/mi</div>}
                    <div className="text-muted-foreground">Mile {d.distance.toFixed(2)}</div>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="altitudeFt"
              stroke="#22c55e"
              strokeWidth={1.5}
              fill="url(#elevGradient)"
              dot={false}
              isAnimationActive={false}
            />
            {hasPaceData && (
              <Area
                type="monotone"
                dataKey="normalizedPace"
                stroke="#f97316"
                strokeWidth={1.5}
                fill="transparent"
                dot={false}
                connectNulls
                isAnimationActive={false}
                strokeDasharray="4 2"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Distance (mi)</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-green-500 rounded" />Elev</span>
          {hasPaceData && <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-orange-500 rounded" style={{ borderTop: '1px dashed' }} />Pace</span>}
        </div>
      </div>
    </div>
  )
}

// ============================================
// RUNNING DYNAMICS CHARTS
// ============================================

// Gauge bar component for running dynamics (Apple Fitness style)
function DynamicsGauge({ label, value, unit, zones, markerColor }: {
  label: string
  value: number
  unit: string
  zones: Array<{ min: number; max: number; color: string; label: string }>
  markerColor: string
}) {
  const totalMin = zones[0]!.min
  const totalMax = zones[zones.length - 1]!.max
  const range = totalMax - totalMin
  const clampedValue = Math.max(totalMin, Math.min(totalMax, value))
  const pct = ((clampedValue - totalMin) / range) * 100

  // Find which zone the value is in
  const activeZone = zones.find(z => value >= z.min && value < z.max) || zones[zones.length - 1]!

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-sm font-bold tabular-nums', markerColor)}>{unit === 'cm' && value < 10 ? value.toFixed(1) : Math.round(value)}</span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
          <span className={cn('ml-1 rounded px-1 py-0.5 text-[9px] font-medium', {
            'bg-green-500/20 text-green-400': activeZone.label === 'Elite' || activeZone.label === 'Efficient' || activeZone.label === 'Excellent',
            'bg-blue-500/20 text-blue-400': activeZone.label === 'Good' || activeZone.label === 'Normal',
            'bg-amber-500/20 text-amber-400': activeZone.label === 'Average' || activeZone.label === 'Moderate',
            'bg-red-500/20 text-red-400': activeZone.label === 'High' || activeZone.label === 'Short' || activeZone.label === 'Low',
          })}>{activeZone.label}</span>
        </div>
      </div>
      {/* Gauge bar */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full">
        <div className="flex h-full">
          {zones.map((zone, i) => {
            const zonePct = ((zone.max - zone.min) / range) * 100
            return (
              <div
                key={i}
                className="h-full"
                style={{ width: `${zonePct}%`, backgroundColor: zone.color, opacity: 0.4 }}
              />
            )
          })}
        </div>
        {/* Value marker */}
        <div
          className="absolute top-[-2px] h-[calc(100%+4px)] w-[3px] rounded-full shadow-sm"
          style={{ left: `${pct}%`, backgroundColor: markerColor, transform: 'translateX(-50%)' }}
        />
      </div>
      {/* Range labels */}
      <div className="flex justify-between text-[9px] text-muted-foreground/60">
        <span>{zones[0]!.min}{unit}</span>
        <span>{zones[zones.length - 1]!.max}{unit}</span>
      </div>
    </div>
  )
}

function RunningDynamicsCharts({
  strideLengthAvg,
  runningPowerAvg,
  groundContactTimeAvg,
  verticalOscillationAvg,
}: {
  strideLengthAvg: number | null
  runningPowerAvg: number | null
  groundContactTimeAvg: number | null
  verticalOscillationAvg: number | null
}) {
  const hasAny = strideLengthAvg != null || runningPowerAvg != null || groundContactTimeAvg != null || verticalOscillationAvg != null
  if (!hasAny) return null

  return (
    <div>
      <div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">Running Dynamics</div>
      <div className="space-y-4">
        {groundContactTimeAvg != null && (
          <DynamicsGauge
            label="Ground Contact Time"
            value={groundContactTimeAvg}
            unit="ms"
            markerColor="#a855f7"
            zones={[
              { min: 180, max: 220, color: '#22c55e', label: 'Elite' },
              { min: 220, max: 260, color: '#3b82f6', label: 'Good' },
              { min: 260, max: 300, color: '#eab308', label: 'Average' },
              { min: 300, max: 360, color: '#ef4444', label: 'High' },
            ]}
          />
        )}
        {verticalOscillationAvg != null && (
          <DynamicsGauge
            label="Vertical Oscillation"
            value={verticalOscillationAvg}
            unit="cm"
            markerColor="#06b6d4"
            zones={[
              { min: 4, max: 7, color: '#22c55e', label: 'Efficient' },
              { min: 7, max: 10, color: '#3b82f6', label: 'Normal' },
              { min: 10, max: 13, color: '#eab308', label: 'Moderate' },
              { min: 13, max: 16, color: '#ef4444', label: 'High' },
            ]}
          />
        )}
        {strideLengthAvg != null && (
          <DynamicsGauge
            label="Stride Length"
            value={strideLengthAvg * 100}
            unit="cm"
            markerColor="#3b82f6"
            zones={[
              { min: 60, max: 80, color: '#ef4444', label: 'Short' },
              { min: 80, max: 100, color: '#eab308', label: 'Average' },
              { min: 100, max: 120, color: '#3b82f6', label: 'Good' },
              { min: 120, max: 150, color: '#22c55e', label: 'Excellent' },
            ]}
          />
        )}
        {runningPowerAvg != null && (
          <DynamicsGauge
            label="Running Power"
            value={runningPowerAvg}
            unit="W"
            markerColor="#f59e0b"
            zones={[
              { min: 100, max: 200, color: '#3b82f6', label: 'Low' },
              { min: 200, max: 300, color: '#22c55e', label: 'Good' },
              { min: 300, max: 400, color: '#eab308', label: 'Moderate' },
              { min: 400, max: 500, color: '#ef4444', label: 'High' },
            ]}
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// SECTION LABEL
// ============================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">{children}</div>
}

// ============================================
// MAIN COMPONENT
// ============================================

interface EnhancedWorkoutDetailViewProps {
  workoutId: string
  onBack?: () => void
  className?: string
}

export function EnhancedWorkoutDetailView({ workoutId, onBack, className }: EnhancedWorkoutDetailViewProps) {
  const [data, setData] = useState<WorkoutDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkout() {
      try {
        const response = await apiGet<WorkoutDetailResponse>(`/api/apple-health/workout/${workoutId}`)
        if (response.success && response.data) setData(response.data)
      } catch (error) {
        console.error('Error fetching workout:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchWorkout()
  }, [workoutId])

  // Generate personalized advice - must be before early returns to maintain hook order
  const advice = useMemo(() => {
    if (!data) return null
    return generateWorkoutAdvice(data.workout, data.analytics, data.workout.hr_zones)
  }, [data])

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-12', className)}>
        <div className="text-muted-foreground flex items-center gap-2">
          <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
          Loading...
        </div>
      </div>
    )
  }

  if (!data || !advice) {
    return (
      <div className={cn('flex items-center justify-center p-12', className)}>
        <div className="text-muted-foreground">Workout not found</div>
      </div>
    )
  }

  const { workout, analytics, route } = data
  const isRunning = workout.workout_type === 'running'
  const isCycling = workout.workout_type === 'cycling'
  const isOutdoor = workout.is_indoor === false || (workout.is_indoor == null && route != null)
  const isIndoor = workout.is_indoor === true || (workout.is_indoor == null && isRunning && route == null)
  const workoutLabel = isRunning
    ? (isOutdoor ? 'Outdoor Run' : isIndoor ? 'Indoor Run' : 'Run')
    : getWorkoutDisplayLabel(workout.workout_type)
  const hasAnalytics = analytics !== null
  const hasEvents = data.workoutEvents && data.workoutEvents.length > 0
  const hasRoute = route != null && route.samples != null && route.samples.length >= 2
  const hasRunningDynamics = isRunning && (workout.stride_length_avg != null || workout.running_power_avg != null || workout.ground_contact_time_avg != null || workout.vertical_oscillation_avg != null)

  return (
    <div className={cn('space-y-3 px-1 py-2', className)}>
      {/* ============================================ */}
      {/* TIER 1: HERO HEADER CARD */}
      {/* ============================================ */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        {/* Top row: back + date/source */}
        <div className="mb-2 flex items-center justify-between">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground -ml-2 h-7 px-2 text-xs">
              <ChevronLeft className="mr-0.5 size-3.5" />Back
            </Button>
          )}
          <div className="text-muted-foreground text-xs">
            {format(new Date(workout.start_date), 'EEE, MMM d')} · {format(new Date(workout.start_date), 'h:mm a')} – {format(new Date(workout.end_date), 'h:mm a')}
          </div>
        </div>

        {/* Title + badges row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{workoutLabel}</h1>
          {isRunning && isOutdoor && (
            <span className="flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
              <MapPin className="size-3" />Outdoor
            </span>
          )}
          {isRunning && isIndoor && (
            <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">
              <Dumbbell className="size-3" />Indoor
            </span>
          )}
          {workout.effort_score != null && workout.effort_score > 0 && (
            <span className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              workout.effort_score >= 8 ? 'bg-red-500/15 text-red-400' :
              workout.effort_score >= 6 ? 'bg-orange-500/15 text-orange-400' :
              workout.effort_score >= 4 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-green-500/15 text-green-400'
            )}>
              <Activity className="size-3" />{workout.effort_score.toFixed(1)}/10
            </span>
          )}
          {workout.elevation_gain_meters != null && workout.elevation_gain_meters > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
              <Mountain className="size-3" />{Math.round(workout.elevation_gain_meters * 3.28084)} ft
            </span>
          )}
        </div>

        {/* Horizontal stat strip */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/30 pt-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration</div>
            <div className="text-base font-semibold tabular-nums">{formatDuration(workout.duration)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Calories</div>
            <div className="text-base font-semibold tabular-nums text-orange-500">{Math.round(workout.active_calories)}<span className="ml-0.5 text-xs text-muted-foreground font-normal">kcal</span></div>
          </div>
          {workout.distance_miles != null && workout.distance_miles > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Distance</div>
              <div className="text-base font-semibold tabular-nums text-blue-500">{workout.distance_miles.toFixed(2)}<span className="ml-0.5 text-xs text-muted-foreground font-normal">mi</span></div>
            </div>
          )}
          {workout.hr_average != null && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg HR</div>
              <div className="text-base font-semibold tabular-nums text-red-500">{workout.hr_average}<span className="ml-0.5 text-xs text-muted-foreground font-normal">bpm</span></div>
            </div>
          )}
          {isRunning && workout.pace_average != null && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Pace</div>
              <div className="text-base font-semibold tabular-nums text-emerald-500">{formatPace(workout.pace_average)}<span className="ml-0.5 text-xs text-muted-foreground font-normal">/mi</span></div>
            </div>
          )}
          {isRunning && workout.cadence_average != null && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Cadence</div>
              <div className="text-base font-semibold tabular-nums">{workout.cadence_average}<span className="ml-0.5 text-xs text-muted-foreground font-normal">spm</span></div>
            </div>
          )}
          {isCycling && workout.cycling_avg_speed != null && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Speed</div>
              <div className="text-base font-semibold tabular-nums text-cyan-500">{workout.cycling_avg_speed.toFixed(1)}<span className="ml-0.5 text-xs text-muted-foreground font-normal">mph</span></div>
            </div>
          )}
          {isCycling && workout.cycling_avg_power != null && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Power</div>
              <div className="text-base font-semibold tabular-nums text-amber-500">{Math.round(workout.cycling_avg_power)}<span className="ml-0.5 text-xs text-muted-foreground font-normal">W</span></div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* TIER 2: COACH'S ANALYSIS */}
      {/* ============================================ */}
      {(advice.keyTakeaways.length > 0 || advice.trainingType) && (
        <div className="rounded-xl border border-border/50 bg-card p-3">
          {/* Key takeaways as compact pills */}
          {advice.keyTakeaways.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {advice.keyTakeaways.map((takeaway, idx) => {
                const pillColors = {
                  positive: 'border-green-500/20 text-green-400',
                  neutral: 'border-blue-500/20 text-blue-400',
                  improvement: 'border-amber-500/20 text-amber-400',
                }
                return (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <div className={cn('mt-0.5 shrink-0', pillColors[takeaway.type])}>
                      {renderIcon(takeaway.iconType, 'size-3')}
                    </div>
                    <span className="text-muted-foreground leading-relaxed">{takeaway.text}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Recovery strip */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border/20 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {renderIcon(advice.trainingType.iconType, cn('size-3', advice.trainingType.iconColor))}
              <span className="font-medium text-foreground">{advice.trainingType.label}</span>
            </div>
            <span className="text-border/60">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3 text-blue-400" />
              <span>{advice.recoveryTime.hours}h recovery</span>
            </div>
            <span className="text-border/60">|</span>
            <div className="flex items-center gap-1.5">
              <Dumbbell className="size-3 text-purple-400" />
              <span>{advice.nextWorkoutSuggestion}</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* TIER 3: HR CHART + TRAINING ANALYSIS (2-col) */}
      {/* ============================================ */}
      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        {/* Left: HR Chart */}
        {hasAnalytics && analytics.timeSeriesData.length > 0 && data.hrZonesConfig && (
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <ZoneColoredHrChart
              data={analytics.timeSeriesData}
              hrZonesConfig={data.hrZonesConfig}
              hrAverage={workout.hr_average}
            />

            {/* Zones bar directly below */}
            {workout.hr_zones && workout.hr_zones.length > 0 && (
              <div className="mt-2 border-t border-border/20 pt-2">
                <HrZonesBar zones={workout.hr_zones} />
                <div className="mt-1.5 rounded-lg bg-muted/20 px-2.5 py-1.5">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{advice.zoneAnalysis}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right: Training Analysis + Insights */}
        <div className="space-y-3">
          {hasAnalytics && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <span className="mb-2 block text-xs font-semibold">Training Analysis</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/20 p-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Zap className="size-3 text-amber-500" />Training Load</div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">{analytics.trainingImpulse.trimp}</span>
                    <span className={cn(
                      'rounded px-1 py-0.5 text-[9px] font-medium',
                      analytics.trainingImpulse.intensity === 'easy' ? 'bg-green-500/20 text-green-400' :
                      analytics.trainingImpulse.intensity === 'moderate' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                    )}>{analytics.trainingImpulse.intensity}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/20 p-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Heart className="size-3 text-red-500" />Cardiac Drift</div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">{analytics.cardiacDrift.driftPercentage > 0 ? '+' : ''}{analytics.cardiacDrift.driftPercentage}%</span>
                    <span className={cn(
                      'rounded px-1 py-0.5 text-[9px] font-medium',
                      analytics.cardiacDrift.interpretation === 'minimal' ? 'bg-green-500/20 text-green-400' :
                      analytics.cardiacDrift.interpretation === 'moderate' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                    )}>{analytics.cardiacDrift.interpretation}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{analytics.cardiacDrift.firstHalfAvgHr} → {analytics.cardiacDrift.secondHalfAvgHr} bpm</div>
                </div>
                <div className="rounded-lg bg-muted/20 p-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><TrendingUp className="size-3 text-blue-500" />Aerobic Decoupling</div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">{analytics.aerobicDecoupling.decouplingPercentage}%</span>
                    <span className={cn(
                      'rounded px-1 py-0.5 text-[9px] font-medium',
                      ['excellent', 'good'].includes(analytics.aerobicDecoupling.interpretation) ? 'bg-green-500/20 text-green-400' :
                      analytics.aerobicDecoupling.interpretation === 'moderate' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                    )}>{analytics.aerobicDecoupling.interpretation}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/20 p-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Wind className="size-3 text-cyan-500" />Efficiency Factor</div>
                  <div className="mt-0.5">
                    <span className="text-sm font-semibold tabular-nums">{analytics.efficiencyFactor.toFixed(3)}</span>
                  </div>
                </div>
                {isRunning && analytics.cadenceAnalysis.average > 0 && (
                  <div className="rounded-lg bg-muted/20 p-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Footprints className="size-3 text-green-500" />Cadence</div>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold tabular-nums">{analytics.cadenceAnalysis.average}<span className="ml-0.5 text-[10px] text-muted-foreground font-normal">spm</span></span>
                      <span className={cn(
                        'rounded px-1 py-0.5 text-[9px] font-medium',
                        analytics.cadenceAnalysis.optimalRange ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                      )}>{analytics.cadenceAnalysis.optimalRange ? 'Optimal' : 'Low'}</span>
                    </div>
                  </div>
                )}
                <div className="rounded-lg bg-muted/20 p-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Activity className="size-3 text-purple-500" />HR Variability</div>
                  <div className="mt-0.5">
                    <span className="text-sm font-semibold tabular-nums">{analytics.hrVariability.range}<span className="ml-0.5 text-[10px] text-muted-foreground font-normal">bpm</span></span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{analytics.hrVariability.min}–{analytics.hrVariability.max}</div>
                </div>
              </div>
            </div>
          )}

          {hasAnalytics && analytics.insights.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <span className="mb-2 block text-xs font-semibold">Insights</span>
              <div className="space-y-1.5">
                {analytics.insights.map((insight, idx) => (
                  <InsightRow key={idx} insight={insight} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* TIER 4: ROUTE & ELEVATION (outdoor only) */}
      {/* ============================================ */}
      {hasRoute && (
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <WorkoutRouteMap route={route!} hrSamples={data.hrSamples} />
            <ElevationProfileChart route={route!} />
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* TIER 5: SPLITS + TIMELINE + DYNAMICS */}
      {/* ============================================ */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Left: Splits + Performance chart */}
        <div className="space-y-3">
          {hasAnalytics && analytics.splits.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold">Mile Splits</span>
                {analytics.paceAnalysis.splitStrategy === 'negative' && (
                  <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400 text-[10px] h-5 px-1.5">
                    <Award className="mr-0.5 size-3" />Negative Split
                  </Badge>
                )}
              </div>
              <SplitsChart splits={analytics.splits} gpsPaceData={data.gpsPaceData} totalDistance={workout.distance_meters} />
            </div>
          )}

          {hasAnalytics && analytics.timeSeriesData.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <span className="mb-2 block text-xs font-semibold">Performance Metrics</span>
              <TimeSeriesChart
                data={analytics.timeSeriesData}
                gpsPaceData={data.gpsPaceData}
                hrAverage={workout.hr_average}
                showHr={workout.hr_average !== null && workout.hr_average > 0}
                showCadence={isRunning && workout.cadence_average !== null}
                showPace={isRunning && workout.pace_average !== null}
                showGpsPace={data.gpsPaceData != null && data.gpsPaceData.length >= 5}
                showCyclingSpeed={isCycling && workout.cycling_avg_speed !== null}
                showCyclingPower={isCycling && workout.cycling_avg_power !== null}
              />
            </div>
          )}

          {/* Cadence Analysis (running only) */}
          {hasAnalytics && isRunning && analytics.cadenceAnalysis.average > 0 && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <span className="mb-2 block text-xs font-semibold">Cadence Analysis</span>
              <CadenceDistributionChart
                data={analytics.timeSeriesData}
                cadenceAnalysis={analytics.cadenceAnalysis}
              />
            </div>
          )}
        </div>

        {/* Right: Timeline + Running Dynamics */}
        <div className="space-y-3">
          {hasEvents && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <span className="mb-2 block text-xs font-semibold">Workout Structure</span>
              <WorkoutStructure
                events={data.workoutEvents}
                workoutDuration={workout.duration}
                startTime={new Date(workout.start_date)}
              />
            </div>
          )}

          {hasRunningDynamics && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <RunningDynamicsCharts
                strideLengthAvg={workout.stride_length_avg}
                runningPowerAvg={workout.running_power_avg}
                groundContactTimeAvg={workout.ground_contact_time_avg}
                verticalOscillationAvg={workout.vertical_oscillation_avg}
              />
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="text-muted-foreground border-border/20 mt-1 flex items-center justify-between border-t pt-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <Watch className="size-3.5" />
          {workout.source}
        </div>
        {hasAnalytics && (
          <div className="flex items-center gap-1">
            <Sparkles className="size-3.5" />
            Enhanced Analytics
          </div>
        )}
      </footer>
    </div>
  )
}

export default EnhancedWorkoutDetailView
