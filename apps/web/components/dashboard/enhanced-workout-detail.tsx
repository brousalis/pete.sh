'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api/client'
import { cn } from '@/lib/utils'
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
  CheckCircle2,
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
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Watch,
  Wind,
  Zap,
} from 'lucide-react'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
  hrAverage?: number | null
  showHr?: boolean
  showCadence?: boolean
  showPace?: boolean
  showCyclingSpeed?: boolean
  showCyclingPower?: boolean
  className?: string
}

// Custom tooltip component
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: number }) {
  if (!active || !payload || payload.length === 0) return null

  const hrData = payload.find(p => p.dataKey === 'hr')
  const cadenceData = payload.find(p => p.dataKey === 'cadence')
  const paceData = payload.find(p => p.dataKey === 'pace')
  const speedData = payload.find(p => p.dataKey === 'cyclingSpeed')
  const powerData = payload.find(p => p.dataKey === 'cyclingPower')

  return (
    <div className="bg-popover/95 rounded-lg border border-border/50 px-3 py-2 shadow-xl backdrop-blur-sm">
      <div className="text-muted-foreground mb-2 text-xs font-medium">
        {formatElapsedTime(label || 0)}
      </div>
      <div className="space-y-1">
        {hrData && hrData.value != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Heart className="size-3 text-red-500" />
              <span className="text-xs text-muted-foreground">Heart Rate</span>
            </div>
            <span className="text-sm font-semibold text-red-400">{Math.round(hrData.value)} bpm</span>
          </div>
        )}
        {cadenceData && cadenceData.value != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Footprints className="size-3 text-blue-400" />
              <span className="text-xs text-muted-foreground">Cadence</span>
            </div>
            <span className="text-sm font-semibold text-blue-400">{Math.round(cadenceData.value)} spm</span>
          </div>
        )}
        {paceData && paceData.value != null && paceData.value > 0 && paceData.value < 30 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="size-3 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Pace</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">{formatPace(paceData.value)}/mi</span>
          </div>
        )}
        {speedData && speedData.value != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="size-3 text-cyan-400" />
              <span className="text-xs text-muted-foreground">Speed</span>
            </div>
            <span className="text-sm font-semibold text-cyan-400">{speedData.value.toFixed(1)} mph</span>
          </div>
        )}
        {powerData && powerData.value != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="size-3 text-amber-400" />
              <span className="text-xs text-muted-foreground">Power</span>
            </div>
            <span className="text-sm font-semibold text-amber-400">{Math.round(powerData.value)} W</span>
          </div>
        )}
      </div>
    </div>
  )
}

function TimeSeriesChart({
  data,
  hrAverage,
  showHr = true,
  showCadence = true,
  showPace = true,
  showCyclingSpeed = false,
  showCyclingPower = false,
  className,
}: TimeSeriesChartProps) {
  const [activeMetrics, setActiveMetrics] = useState({
    hr: showHr,
    cadence: showCadence,
    pace: showPace,
    cyclingSpeed: showCyclingSpeed,
    cyclingPower: showCyclingPower,
  })

  // Calculate stats and ranges
  const stats = useMemo(() => {
    const hrValues = data.filter(d => d.hr !== null).map(d => d.hr!)
    const cadenceValues = data.filter(d => d.cadence !== null).map(d => d.cadence!)
    const paceValues = data.filter(d => d.pace !== null && d.pace > 0 && d.pace < 30).map(d => d.pace!)

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
      },
      pace: {
        min: paceValues.length > 0 ? Math.min(...paceValues) : 0,
        max: paceValues.length > 0 ? Math.max(...paceValues) : 15,
        avg: paceValues.length > 0 ? paceValues.reduce((a, b) => a + b, 0) / paceValues.length : 0,
      },
    }
  }, [data])

  // Sample data for performance (take every Nth point if too many)
  // Also forward-fill cadence values so tooltips always show the last known value
  const chartData = useMemo(() => {
    const maxPoints = 300
    const sampled = data.length <= maxPoints 
      ? data 
      : data.filter((_, idx) => idx % Math.ceil(data.length / maxPoints) === 0)
    
    // Forward-fill null values for cadence so tooltip always shows something
    let lastCadence: number | null = null
    let lastPace: number | null = null
    
    return sampled.map(point => {
      if (point.cadence != null) lastCadence = point.cadence
      if (point.pace != null && point.pace > 0 && point.pace < 30) lastPace = point.pace
      
      return {
        ...point,
        cadence: point.cadence ?? lastCadence,
        pace: point.pace ?? lastPace,
      }
    })
  }, [data])

  if (data.length === 0) return null

  const toggleMetric = (metric: keyof typeof activeMetrics) => {
    setActiveMetrics(prev => ({ ...prev, [metric]: !prev[metric] }))
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toggle buttons and stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {showHr && (
            <button
              onClick={() => toggleMetric('hr')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
                activeMetrics.hr
                  ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              <Heart className="size-3" />
              Heart Rate
            </button>
          )}
          {showCadence && stats.cadence.avg > 0 && (
            <button
              onClick={() => toggleMetric('cadence')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
                activeMetrics.cadence
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              <Footprints className="size-3" />
              Cadence
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {activeMetrics.hr && (
            <span>
              <span className="text-red-400 font-medium">{stats.hr.min}–{stats.hr.max}</span> bpm
            </span>
          )}
          {activeMetrics.cadence && stats.cadence.avg > 0 && (
            <span>
              <span className="text-blue-400 font-medium">{stats.cadence.min}–{stats.cadence.max}</span> spm
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 45, left: 5, bottom: 5 }}>
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
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

            <XAxis
              dataKey="elapsedSeconds"
              tickFormatter={(value) => formatElapsedTime(value)}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />

            <YAxis
              yAxisId="left"
              domain={[stats.hr.min - 10, stats.hr.max + 10]}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: '#ef4444', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[stats.cadence.min - 10, stats.cadence.max + 10]}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: '#60a5fa', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />

            <Tooltip content={<ChartTooltip />} />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="hr"
              stroke="transparent"
              fill="url(#perfHrGrad)"
              connectNulls={true}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="hr"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              connectNulls={true}
            />

            <Area
              yAxisId="right"
              type="monotone"
              dataKey="cadence"
              stroke="transparent"
              fill="url(#perfCadenceGrad)"
              connectNulls={true}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cadence"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              connectNulls={true}
            />

            {/* Pace Line (inverted - lower is better) */}
            {activeMetrics.pace && stats.pace.avg > 0 && (
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="pace"
                stroke="#34d399"
                strokeWidth={1}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
                activeDot={{ r: 3, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {/* Cycling Speed */}
            {activeMetrics.cyclingSpeed && (
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="cyclingSpeed"
                stroke="#22d3ee"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                activeDot={{ r: 3, fill: '#22d3ee', stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {/* Cycling Power */}
            {activeMetrics.cyclingPower && (
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="cyclingPower"
                stroke="#fbbf24"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                activeDot={{ r: 3, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            <Legend
              verticalAlign="bottom"
              height={30}
              content={() => null}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive legend / toggles */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {showHr && (
          <button
            onClick={() => toggleMetric('hr')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all',
              activeMetrics.hr
                ? 'bg-red-500/20 text-red-400'
                : 'bg-muted/30 text-muted-foreground'
            )}
          >
            <Heart className="size-3" />
            Heart Rate
          </button>
        )}
        {showCadence && stats.cadence.avg > 0 && (
          <button
            onClick={() => toggleMetric('cadence')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all',
              activeMetrics.cadence
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-muted/30 text-muted-foreground'
            )}
          >
            <Footprints className="size-3" />
            Cadence
          </button>
        )}
        {showPace && stats.pace.avg > 0 && (
          <button
            onClick={() => toggleMetric('pace')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all',
              activeMetrics.pace
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-muted/30 text-muted-foreground'
            )}
          >
            <Activity className="size-3" />
            Pace
          </button>
        )}
        {showCyclingSpeed && (
          <button
            onClick={() => toggleMetric('cyclingSpeed')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all',
              activeMetrics.cyclingSpeed
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-muted/30 text-muted-foreground'
            )}
          >
            <Activity className="size-3" />
            Speed
          </button>
        )}
        {showCyclingPower && (
          <button
            onClick={() => toggleMetric('cyclingPower')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all',
              activeMetrics.cyclingPower
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-muted/30 text-muted-foreground'
            )}
          >
            <Zap className="size-3" />
            Power
          </button>
        )}
      </div>
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

function EventTimeline({
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

  const getPositionPercent = (timestamp: string) => {
    const elapsed = (new Date(timestamp).getTime() - startTime.getTime()) / 1000
    return (elapsed / workoutDuration) * 100
  }

  return (
    <div className={className}>
      {/* Timeline bar */}
      <div className="bg-muted/40 relative h-4 w-full overflow-hidden rounded">
        {/* Segments */}
        {segments.map((seg, idx) => {
          const left = getPositionPercent(seg.timestamp)
          const width = seg.duration ? (seg.duration / workoutDuration) * 100 : 1
          return (
            <div
              key={`seg-${idx}`}
              className="absolute top-0 h-full bg-green-500/70"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
            />
          )
        })}
        {/* Pause markers */}
        {pauses.map((p, idx) => {
          const left = getPositionPercent(p.timestamp)
          return (
            <div
              key={`pause-${idx}`}
              className="absolute top-0 h-full w-0.5 bg-orange-500"
              style={{ left: `${left}%` }}
            />
          )
        })}
      </div>

      {/* Time labels */}
      <div className="text-muted-foreground mt-1 flex justify-between text-xs">
        <span>0:00</span>
        <span>{formatElapsedTime(workoutDuration / 2)}</span>
        <span>{formatElapsedTime(workoutDuration)}</span>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs">
        {segments.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-green-500" />
            {segments.length} segments
          </span>
        )}
        {pauses.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-orange-500" />
            {pauses.length} pauses
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

function SplitsChart({ splits, className }: { splits: WorkoutSplit[]; className?: string }) {
  if (splits.length === 0) return null

  const paces = splits.map(s => s.avgPace)
  const minPace = Math.min(...paces)
  const maxPace = Math.max(...paces)
  const range = maxPace - minPace || 1
  const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length
  const hasElevation = splits.some(s => s.elevationChange != null && s.elevationChange !== 0)

  return (
    <div className={className}>
      {/* Bars */}
      <div className="flex h-20 items-end gap-1">
        {splits.map((split, idx) => {
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
              <span className="text-muted-foreground text-[10px]">{split.splitNumber}</span>
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 rounded border border-border/50 bg-popover px-2 py-1.5 text-xs shadow-lg group-hover:block">
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
          {splits.map((split, idx) => {
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
// ROUTE MAP (for outdoor workouts)
// ============================================

function WorkoutRouteMap({ route, hrSamples }: { route: RouteData; hrSamples: HrSample[] }) {
  const samples = route.samples
  if (!samples || samples.length < 2) return null

  // Convert to the format MapleRouteMap expects
  const locationSamples = samples.map(s => ({
    timestamp: s.timestamp,
    latitude: s.latitude,
    longitude: s.longitude,
    altitude: s.altitude,
    speed: s.speed,
    course: s.course,
    horizontalAccuracy: s.horizontalAccuracy,
    verticalAccuracy: s.verticalAccuracy,
  }))

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">Route</div>
      <div className="overflow-hidden rounded-lg border border-border/30">
        <WorkoutRouteMapCanvas
          locations={locationSamples}
          hrSamples={hrSamples}
          totalElevationGain={route.total_elevation_gain}
          totalElevationLoss={route.total_elevation_loss}
        />
      </div>
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

// Canvas-based route map rendering (no Google Maps dependency)
function WorkoutRouteMapCanvas({
  locations,
  hrSamples,
  totalElevationGain,
  totalElevationLoss,
}: {
  locations: RouteLocationSample[]
  hrSamples: HrSample[]
  totalElevationGain: number | null
  totalElevationLoss: number | null
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || locations.length < 2) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Calculate bounds
    const lats = locations.map(l => l.latitude)
    const lngs = locations.map(l => l.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const padding = 24
    const drawWidth = width - padding * 2
    const drawHeight = height - padding * 2

    // Maintain aspect ratio using Mercator-like projection
    const latRange = maxLat - minLat || 0.001
    const lngRange = maxLng - minLng || 0.001
    const midLat = (minLat + maxLat) / 2
    const lngScale = Math.cos((midLat * Math.PI) / 180)
    const adjustedLngRange = lngRange * lngScale

    const scaleX = drawWidth / adjustedLngRange
    const scaleY = drawHeight / latRange
    const scale = Math.min(scaleX, scaleY)

    const toX = (lng: number) => padding + ((lng - minLng) * lngScale - (adjustedLngRange - adjustedLngRange * (scale / scaleX)) / 2) * scale
    const toY = (lat: number) => height - padding - ((lat - minLat) - (latRange - latRange * (scale / scaleY)) / 2) * scale

    // Clear
    ctx.fillStyle = 'hsl(0 0% 7%)'
    ctx.fillRect(0, 0, width, height)

    // Build HR lookup for coloring
    const hrByTime = new Map<number, number>()
    for (const s of hrSamples) {
      hrByTime.set(new Date(s.timestamp).getTime(), s.bpm)
    }

    // HR zone colors
    const getHrColor = (bpm: number) => {
      const maxHr = 185
      const pct = bpm / maxHr
      if (pct >= 0.85) return '#ef4444' // peak - red
      if (pct >= 0.7) return '#f97316'  // cardio - orange
      if (pct >= 0.6) return '#22c55e'  // fat burn - green
      if (pct >= 0.5) return '#3b82f6'  // warmup - blue
      return '#6b7280' // rest - gray
    }

    // Draw route segments colored by HR
    for (let i = 0; i < locations.length - 1; i++) {
      const from = locations[i]!
      const to = locations[i + 1]!

      // Find nearest HR sample
      const ts = new Date(from.timestamp).getTime()
      let nearestHr = 140 // default
      let minDiff = Infinity
      for (const [hrTs, bpm] of hrByTime) {
        const diff = Math.abs(ts - hrTs)
        if (diff < minDiff) {
          minDiff = diff
          nearestHr = bpm
        }
      }

      ctx.beginPath()
      ctx.moveTo(toX(from.longitude), toY(from.latitude))
      ctx.lineTo(toX(to.longitude), toY(to.latitude))
      ctx.strokeStyle = hrSamples.length > 0 ? getHrColor(nearestHr) : '#22c55e'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    // Start marker (green)
    const start = locations[0]!
    ctx.beginPath()
    ctx.arc(toX(start.longitude), toY(start.latitude), 6, 0, Math.PI * 2)
    ctx.fillStyle = '#22c55e'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // End marker (red)
    const end = locations[locations.length - 1]!
    ctx.beginPath()
    ctx.arc(toX(end.longitude), toY(end.latitude), 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [locations, hrSamples])

  return (
    <canvas
      ref={canvasRef}
      className="h-56 w-full bg-background"
      style={{ imageRendering: 'auto' }}
    />
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

  // Calculate cumulative distance for x-axis
  const chartData: { distance: number; altitude: number; altitudeFt: number }[] = []
  let cumulativeDistance = 0

  for (let i = 0; i < altitudeSamples.length; i++) {
    const sample = altitudeSamples[i]!
    if (i > 0) {
      const prev = altitudeSamples[i - 1]!
      // Haversine approximation for short distances
      const dLat = (sample.latitude - prev.latitude) * Math.PI / 180
      const dLng = (sample.longitude - prev.longitude) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(prev.latitude * Math.PI / 180) * Math.cos(sample.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      cumulativeDistance += 6371000 * c // meters
    }
    chartData.push({
      distance: cumulativeDistance / 1609.344, // miles
      altitude: sample.altitude!,
      altitudeFt: sample.altitude! * 3.28084,
    })
  }

  // Downsample if too many points
  const maxPoints = 200
  const downsampleRate = Math.max(1, Math.floor(chartData.length / maxPoints))
  const downsampled = chartData.filter((_, i) => i % downsampleRate === 0)

  const minAlt = Math.min(...downsampled.map(d => d.altitudeFt))
  const maxAlt = Math.max(...downsampled.map(d => d.altitudeFt))
  const altRange = maxAlt - minAlt

  return (
    <div>
      <div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">Elevation Profile</div>
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={downsampled} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              domain={[Math.floor(minAlt - altRange * 0.1), Math.ceil(maxAlt + altRange * 0.1)]}
              tickFormatter={(v: number) => `${Math.round(v)}`}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload
                return (
                  <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-lg">
                    <div className="font-medium">{d.altitudeFt.toFixed(0)} ft</div>
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Distance (mi)</span>
        <span>Elevation (ft)</span>
      </div>
    </div>
  )
}

// ============================================
// RUNNING DYNAMICS CHARTS
// ============================================

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
  // Build metrics array for display
  const metrics: { label: string; value: string; unit: string; color: string; description: string }[] = []

  if (strideLengthAvg != null) {
    const cm = strideLengthAvg * 100
    metrics.push({
      label: 'Stride Length',
      value: cm.toFixed(0),
      unit: 'cm',
      color: 'text-blue-400',
      description: cm >= 110 ? 'Long stride' : cm >= 90 ? 'Good stride' : 'Short stride',
    })
  }

  if (runningPowerAvg != null) {
    metrics.push({
      label: 'Running Power',
      value: Math.round(runningPowerAvg).toString(),
      unit: 'W',
      color: 'text-amber-400',
      description: runningPowerAvg >= 300 ? 'High power' : runningPowerAvg >= 200 ? 'Moderate power' : 'Low power',
    })
  }

  if (groundContactTimeAvg != null) {
    metrics.push({
      label: 'Ground Contact',
      value: Math.round(groundContactTimeAvg).toString(),
      unit: 'ms',
      color: 'text-purple-400',
      description: groundContactTimeAvg <= 220 ? 'Elite' : groundContactTimeAvg <= 260 ? 'Good' : 'Needs work',
    })
  }

  if (verticalOscillationAvg != null) {
    metrics.push({
      label: 'Vertical Oscillation',
      value: verticalOscillationAvg.toFixed(1),
      unit: 'cm',
      color: 'text-cyan-400',
      description: verticalOscillationAvg <= 7 ? 'Efficient' : verticalOscillationAvg <= 10 ? 'Normal' : 'High bounce',
    })
  }

  if (metrics.length === 0) return null

  return (
    <div>
      <div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">Running Dynamics</div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border/30 bg-muted/20 p-3">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{m.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={cn('text-xl font-bold tabular-nums', m.color)}>{m.value}</span>
              <span className="text-muted-foreground text-xs">{m.unit}</span>
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">{m.description}</div>
          </div>
        ))}
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
    : (WORKOUT_TYPE_LABELS[workout.workout_type] || workout.workout_type)
  const hasAnalytics = analytics !== null
  const hasEvents = data.workoutEvents && data.workoutEvents.length > 0
  const hasRoute = route != null && route.samples != null && route.samples.length >= 2
  const hasRunningDynamics = isRunning && (workout.stride_length_avg != null || workout.running_power_avg != null || workout.ground_contact_time_avg != null || workout.vertical_oscillation_avg != null)

  return (
    <div className={cn(' px-4 py-4', className)}>
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <header className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground -ml-2 h-8 px-2">
              <ChevronLeft className="mr-1 size-4" />Back
            </Button>
          )}
          <div className="text-muted-foreground text-sm">
            {format(new Date(workout.start_date), 'EEEE, MMMM d, yyyy')}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{workoutLabel}</h1>
          {isRunning && isOutdoor && (
            <div className="flex items-center gap-1 rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-400">
              <MapPin className="size-3.5" />
              Outdoor
            </div>
          )}
          {isRunning && isIndoor && (
            <div className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
              <Dumbbell className="size-3.5" />
              Indoor
            </div>
          )}
          {workout.effort_score && (
            <div className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              workout.effort_score >= 8 ? 'bg-red-500/20 text-red-400' :
              workout.effort_score >= 6 ? 'bg-orange-500/20 text-orange-400' :
              workout.effort_score >= 4 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
            )}>
              <Activity className="size-3.5" />
              {workout.effort_score.toFixed(1)}/10
            </div>
          )}
          {workout.elevation_gain_meters != null && workout.elevation_gain_meters > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
              <Mountain className="size-3.5" />
              {Math.round(workout.elevation_gain_meters * 3.28084)} ft
            </div>
          )}
        </div>
        <div className="text-muted-foreground mt-1 text-sm">
          {format(new Date(workout.start_date), 'h:mm a')} – {format(new Date(workout.end_date), 'h:mm a')} • {workout.source}
        </div>
      </header>

      {/* ============================================ */}
      {/* KEY TAKEAWAYS (Full Width) */}
      {/* ============================================ */}
      {advice.keyTakeaways.length > 0 && (
        <section className="mb-8">
          <KeyTakeaways advice={advice} />
        </section>
      )}

      {/* ============================================ */}
      {/* ROUTE MAP & ELEVATION (Full Width, outdoor only) */}
      {/* ============================================ */}
      {hasRoute && (
        <section className="mb-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <WorkoutRouteMap route={route!} hrSamples={data.hrSamples} />
            <ElevationProfileChart route={route!} />
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* TWO COLUMN LAYOUT */}
      {/* ============================================ */}
      <div className="grid gap-10 lg:grid-cols-2">
        {/* LEFT COLUMN: DATA */}
        <div className="space-y-8">
          {/* Primary Stats */}
          <section>
            <SectionLabel>Summary</SectionLabel>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <Stat label="Duration" value={formatDuration(workout.duration)} size="large" />
              <Stat label="Calories" value={Math.round(workout.active_calories)} unit="kcal" color="text-orange-500" size="large" />
              {workout.distance_miles && <Stat label="Distance" value={workout.distance_miles.toFixed(2)} unit="mi" color="text-blue-500" size="large" />}
              {workout.hr_average && <Stat label="Avg HR" value={workout.hr_average} unit="bpm" color="text-red-500" subtext={`${workout.hr_min}–${workout.hr_max}`} size="large" />}
            </div>
          </section>

          {/* Running/Cycling specific */}
          {(isRunning || isCycling) && (
            <section>
              <SectionLabel>{isRunning ? 'Running' : 'Cycling'} Metrics</SectionLabel>
              <div className="grid grid-cols-2 gap-6">
                {isRunning && workout.pace_average && <Stat label="Avg Pace" value={formatPace(workout.pace_average)} unit="/mi" color="text-emerald-500" subtext={workout.pace_best ? `Best: ${formatPace(workout.pace_best)}` : undefined} />}
                {isRunning && workout.cadence_average && <Stat label="Cadence" value={workout.cadence_average} unit="spm" subtext={workout.cadence_average >= 170 ? 'Optimal' : 'Below optimal'} />}
                {isCycling && workout.cycling_avg_speed && <Stat label="Avg Speed" value={workout.cycling_avg_speed.toFixed(1)} unit="mph" color="text-cyan-500" subtext={workout.cycling_max_speed ? `Max: ${workout.cycling_max_speed.toFixed(1)}` : undefined} />}
                {isCycling && workout.cycling_avg_power && <Stat label="Avg Power" value={Math.round(workout.cycling_avg_power)} unit="W" color="text-amber-500" />}
                {isCycling && workout.cycling_avg_cadence && <Stat label="Cadence" value={workout.cycling_avg_cadence} unit="rpm" />}
              </div>
            </section>
          )}

          {/* Running Dynamics (rich cards for outdoor runs) */}
          {hasRunningDynamics && (
            <section>
              <RunningDynamicsCharts
                strideLengthAvg={workout.stride_length_avg}
                runningPowerAvg={workout.running_power_avg}
                groundContactTimeAvg={workout.ground_contact_time_avg}
                verticalOscillationAvg={workout.vertical_oscillation_avg}
              />
            </section>
          )}

          {/* Training Analysis */}
          {hasAnalytics && (
            <section>
              <SectionLabel>Training Analysis</SectionLabel>
              <div className="divide-border/30 -my-0.5 divide-y">
                <MetricRow
                  icon={<Zap className="size-4 text-amber-500" />}
                  label="Training Load"
                  value={analytics.trainingImpulse.trimp}
                  badge={{ label: analytics.trainingImpulse.intensity, variant: analytics.trainingImpulse.intensity === 'easy' ? 'good' : analytics.trainingImpulse.intensity === 'moderate' ? 'neutral' : 'warning' }}
                />
                <MetricRow
                  icon={<Heart className="size-4 text-red-500" />}
                  label="Cardiac Drift"
                  value={`${analytics.cardiacDrift.driftPercentage > 0 ? '+' : ''}${analytics.cardiacDrift.driftPercentage}%`}
                  badge={{ label: analytics.cardiacDrift.interpretation, variant: analytics.cardiacDrift.interpretation === 'minimal' ? 'good' : analytics.cardiacDrift.interpretation === 'moderate' ? 'neutral' : 'warning' }}
                  description={`${analytics.cardiacDrift.firstHalfAvgHr} → ${analytics.cardiacDrift.secondHalfAvgHr} bpm`}
                />
                <MetricRow
                  icon={<TrendingUp className="size-4 text-blue-500" />}
                  label="Aerobic Decoupling"
                  value={`${analytics.aerobicDecoupling.decouplingPercentage}%`}
                  badge={{ label: analytics.aerobicDecoupling.interpretation, variant: ['excellent', 'good'].includes(analytics.aerobicDecoupling.interpretation) ? 'good' : analytics.aerobicDecoupling.interpretation === 'moderate' ? 'neutral' : 'warning' }}
                />
                <MetricRow
                  icon={<Wind className="size-4 text-cyan-500" />}
                  label="Efficiency Factor"
                  value={analytics.efficiencyFactor.toFixed(3)}
                />
                {isRunning && analytics.cadenceAnalysis.average > 0 && (
                  <MetricRow
                    icon={<Footprints className="size-4 text-green-500" />}
                    label="Cadence"
                    value={analytics.cadenceAnalysis.average}
                    unit="spm"
                    badge={{ label: analytics.cadenceAnalysis.optimalRange ? 'Optimal' : 'Low', variant: analytics.cadenceAnalysis.optimalRange ? 'good' : 'neutral' }}
                    description={`Range: ${analytics.cadenceAnalysis.min}–${analytics.cadenceAnalysis.max}`}
                  />
                )}
                <MetricRow
                  icon={<Activity className="size-4 text-purple-500" />}
                  label="HR Variability"
                  value={analytics.hrVariability.range}
                  unit="bpm"
                  description={`${analytics.hrVariability.min}–${analytics.hrVariability.max}`}
                />
              </div>
            </section>
          )}

          {/* Insights */}
          {hasAnalytics && analytics.insights.length > 0 && (
            <section>
              <SectionLabel>Insights</SectionLabel>
              <div className="divide-border/30 -my-0.5 divide-y">
                {analytics.insights.map((insight, idx) => (
                  <InsightRow key={idx} insight={insight} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: CHARTS & ADVICE */}
        <div className="space-y-8">
          {/* Zone-Colored HR Chart (Apple Fitness style) */}
          {hasAnalytics && analytics.timeSeriesData.length > 0 && data.hrZonesConfig && (
            <section>
              <ZoneColoredHrChart
                data={analytics.timeSeriesData}
                hrZonesConfig={data.hrZonesConfig}
                hrAverage={workout.hr_average}
              />
            </section>
          )}

          {/* HR Zones Bar - Moved directly under zone chart */}
          {workout.hr_zones && workout.hr_zones.length > 0 && (
            <section className="-mt-4">
              <HrZonesBar zones={workout.hr_zones} />
            </section>
          )}

          {/* Zone Analysis Card */}
          {workout.hr_zones && workout.hr_zones.length > 0 && (
            <section>
              <ZoneAnalysisCard advice={advice} zones={workout.hr_zones} />
            </section>
          )}

          {/* Recovery & Next Steps */}
          <section>
            <RecoveryNextSteps advice={advice} />
          </section>

          {/* Performance Chart (Multi-metric) */}
          {hasAnalytics && analytics.timeSeriesData.length > 0 && (
            <section>
              <SectionLabel>Performance Metrics</SectionLabel>
              <TimeSeriesChart
                data={analytics.timeSeriesData}
                hrAverage={workout.hr_average}
                showHr={true}
                showCadence={isRunning && workout.cadence_average !== null}
                showPace={isRunning && workout.pace_average !== null}
                showCyclingSpeed={isCycling && workout.cycling_avg_speed !== null}
                showCyclingPower={isCycling && workout.cycling_avg_power !== null}
              />
            </section>
          )}

          {/* Event Timeline */}
          {hasEvents && (
            <section>
              <SectionLabel>Activity Timeline</SectionLabel>
              <EventTimeline
                events={data.workoutEvents}
                workoutDuration={workout.duration}
                startTime={new Date(workout.start_date)}
              />
            </section>
          )}

          {/* Splits Chart */}
          {hasAnalytics && analytics.splits.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <SectionLabel>Mile Splits</SectionLabel>
                {analytics.paceAnalysis.splitStrategy === 'negative' && (
                  <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400 text-xs">
                    <Award className="mr-1 size-3" />Negative Split
                  </Badge>
                )}
              </div>
              <SplitsChart splits={analytics.splits} />
            </section>
          )}

          {/* Events List */}
          {hasEvents && (
            <section>
              <SectionLabel>Events ({data.workoutEvents.length})</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {data.workoutEvents.slice(0, 16).map((event, idx) => {
                  const isPause = event.event_type.includes('pause')
                  const isResume = event.event_type.includes('resume')
                  const isSegment = event.event_type === 'segment'

                  return (
                    <div key={idx} className={cn(
                      'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs',
                      isPause ? 'bg-orange-500/20 text-orange-400' :
                      isResume ? 'bg-green-500/20 text-green-400' :
                      isSegment ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                    )}>
                      {isPause ? <Pause className="size-3" /> : isResume ? <Play className="size-3" /> : <Activity className="size-3" />}
                      {format(new Date(event.timestamp), 'h:mm:ss')}
                    </div>
                  )
                })}
                {data.workoutEvents.length > 16 && (
                  <span className="text-muted-foreground self-center text-xs">+{data.workoutEvents.length - 16} more</span>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="text-muted-foreground border-border/30 mt-10 flex items-center justify-between border-t pt-4 text-xs">
        <div className="flex items-center gap-2">
          <Watch className="size-4" />
          {workout.source}
        </div>
        {hasAnalytics && (
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4" />
            Enhanced Analytics
          </div>
        )}
      </footer>
    </div>
  )
}

export default EnhancedWorkoutDetailView
