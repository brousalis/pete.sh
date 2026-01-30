"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Heart,
  Footprints,
  Flame,
  Timer,
  TrendingUp,
  TrendingDown,
  Activity,
  Watch,
  Zap,
  Target,
  Award,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Gauge,
  BarChart3,
  LineChart,
  Clock,
  Battery,
  Wind,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { apiGet } from "@/lib/api/client"
import { format } from "date-fns"
import type { EnhancedWorkoutAnalytics, PerformanceInsight, WorkoutSplit } from "@/lib/utils/workout-analytics"

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

interface WorkoutDetailResponse {
  workout: AppleWorkout
  hrSamples: HrSample[]
  hrChart: HrSample[]
  cadenceSamples: { timestamp: string; steps_per_minute: number }[]
  paceSamples: { timestamp: string; minutes_per_mile: number }[]
  analytics: EnhancedWorkoutAnalytics | null
}

// ============================================
// CONSTANTS
// ============================================

const ZONE_COLORS: Record<HeartRateZone['name'], { bg: string; text: string; bar: string; fill: string }> = {
  rest: { bg: 'bg-gray-500/20', text: 'text-gray-400', bar: 'bg-gray-500', fill: 'fill-gray-500' },
  warmup: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500', fill: 'fill-blue-500' },
  fatBurn: { bg: 'bg-green-500/20', text: 'text-green-400', bar: 'bg-green-500', fill: 'fill-green-500' },
  cardio: { bg: 'bg-orange-500/20', text: 'text-orange-400', bar: 'bg-orange-500', fill: 'fill-orange-500' },
  peak: { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-500', fill: 'fill-red-500' },
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
  if (!minutesPerMile || minutesPerMile <= 0 || minutesPerMile > 30) return '--:--'
  const mins = Math.floor(minutesPerMile)
  const secs = Math.round((minutesPerMile - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================
// MULTI-AXIS TIME SERIES CHART
// ============================================

interface TimeSeriesChartProps {
  data: EnhancedWorkoutAnalytics['timeSeriesData']
  showHr?: boolean
  showCadence?: boolean
  showPace?: boolean
  height?: number
  className?: string
}

function TimeSeriesChart({
  data,
  showHr = true,
  showCadence = true,
  showPace = true,
  height = 200,
  className
}: TimeSeriesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const { hrRange, cadenceRange, paceRange, filteredData } = useMemo(() => {
    // Filter out null values and get ranges
    const hrValues = data.filter(d => d.hr !== null).map(d => d.hr!)
    const cadenceValues = data.filter(d => d.cadence !== null).map(d => d.cadence!)
    const paceValues = data.filter(d => d.pace !== null && d.pace > 0 && d.pace < 30).map(d => d.pace!)

    return {
      hrRange: {
        min: hrValues.length > 0 ? Math.min(...hrValues) - 5 : 0,
        max: hrValues.length > 0 ? Math.max(...hrValues) + 5 : 200
      },
      cadenceRange: {
        min: cadenceValues.length > 0 ? Math.min(...cadenceValues) - 5 : 0,
        max: cadenceValues.length > 0 ? Math.max(...cadenceValues) + 5 : 200
      },
      paceRange: {
        min: paceValues.length > 0 ? Math.min(...paceValues) - 0.5 : 6,
        max: paceValues.length > 0 ? Math.max(...paceValues) + 0.5 : 15
      },
      filteredData: data.filter((_, i) => i % 2 === 0) // Downsample for performance
    }
  }, [data])

  const normalizeHr = (hr: number) => {
    return height - 20 - ((hr - hrRange.min) / (hrRange.max - hrRange.min)) * (height - 40)
  }

  const normalizeCadence = (cadence: number) => {
    return height - 20 - ((cadence - cadenceRange.min) / (cadenceRange.max - cadenceRange.min)) * (height - 40)
  }

  // Pace is inverted (lower is better)
  const normalizePace = (pace: number) => {
    return height - 20 - ((paceRange.max - pace) / (paceRange.max - paceRange.min)) * (height - 40)
  }

  const width = 100
  const xScale = (i: number) => (i / (filteredData.length - 1)) * width

  // Generate paths
  const hrPoints = filteredData
    .map((d, i) => d.hr !== null ? `${xScale(i)},${normalizeHr(d.hr)}` : null)
    .filter(Boolean)
    .join(' L ')

  const cadencePoints = filteredData
    .map((d, i) => d.cadence !== null ? `${xScale(i)},${normalizeCadence(d.cadence)}` : null)
    .filter(Boolean)
    .join(' L ')

  const pacePoints = filteredData
    .map((d, i) => d.pace !== null && d.pace > 0 && d.pace < 30 ? `${xScale(i)},${normalizePace(d.pace)}` : null)
    .filter(Boolean)
    .join(' L ')

  const hovered = hoveredIndex !== null ? filteredData[hoveredIndex] : null

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="10" height="20" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
          </pattern>
          <linearGradient id="hrGradientFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(239 68 68)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(239 68 68)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* HR area fill */}
        {showHr && hrPoints && (
          <path
            d={`M ${hrPoints} L ${width},${height - 20} L 0,${height - 20} Z`}
            fill="url(#hrGradientFill)"
          />
        )}

        {/* Pace line (green) */}
        {showPace && pacePoints && (
          <path
            d={`M ${pacePoints}`}
            fill="none"
            stroke="rgb(34 197 94)"
            strokeWidth="1.5"
            strokeOpacity="0.8"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Cadence line (blue) */}
        {showCadence && cadencePoints && (
          <path
            d={`M ${cadencePoints}`}
            fill="none"
            stroke="rgb(59 130 246)"
            strokeWidth="1.5"
            strokeOpacity="0.8"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* HR line (red) */}
        {showHr && hrPoints && (
          <path
            d={`M ${hrPoints}`}
            fill="none"
            stroke="rgb(239 68 68)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Hover detection areas */}
        {filteredData.map((_, i) => (
          <rect
            key={i}
            x={xScale(i) - (width / filteredData.length / 2)}
            y={0}
            width={width / filteredData.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
          />
        ))}

        {/* Hover indicator */}
        {hoveredIndex !== null && (
          <line
            x1={xScale(hoveredIndex)}
            y1={0}
            x2={xScale(hoveredIndex)}
            y2={height}
            stroke="white"
            strokeOpacity="0.5"
            strokeWidth="1"
            strokeDasharray="2,2"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute top-2 right-2 bg-background/95 border rounded-lg p-2 text-xs shadow-lg backdrop-blur-sm">
          <div className="font-medium mb-1">{formatElapsedTime(hovered.elapsedSeconds)}</div>
          {showHr && hovered.hr && (
            <div className="flex items-center gap-1.5 text-red-400">
              <Heart className="size-3" />
              <span>{hovered.hr} bpm</span>
            </div>
          )}
          {showCadence && hovered.cadence && (
            <div className="flex items-center gap-1.5 text-blue-400">
              <Footprints className="size-3" />
              <span>{hovered.cadence} spm</span>
            </div>
          )}
          {showPace && hovered.pace && hovered.pace > 0 && hovered.pace < 30 && (
            <div className="flex items-center gap-1.5 text-green-400">
              <Gauge className="size-3" />
              <span>{formatPace(hovered.pace)}/mi</span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        {showHr && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-red-500 rounded" />
            <span className="text-muted-foreground">Heart Rate</span>
          </div>
        )}
        {showCadence && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-blue-500 rounded" />
            <span className="text-muted-foreground">Cadence</span>
          </div>
        )}
        {showPace && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-green-500 rounded" />
            <span className="text-muted-foreground">Pace</span>
          </div>
        )}
      </div>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4 text-[10px] text-muted-foreground pointer-events-none">
        {showHr && (
          <>
            <span>{hrRange.max}</span>
            <span>{hrRange.min}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// HR ZONES BAR
// ============================================

interface HrZonesBarProps {
  zones: HeartRateZone[]
  showLabels?: boolean
  showDuration?: boolean
  className?: string
}

function HrZonesBar({ zones, showLabels = true, showDuration = false, className }: HrZonesBarProps) {
  const orderedZones = ['fatBurn', 'cardio', 'peak'] as const
  const sortedZones = orderedZones
    .map(name => zones.find(z => z.name === name))
    .filter(Boolean) as HeartRateZone[]

  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-6 rounded-full overflow-hidden flex bg-muted/30">
        {sortedZones.map(zone => (
          zone.percentage > 0 && (
            <div
              key={zone.name}
              className={cn("h-full transition-all relative group", ZONE_COLORS[zone.name].bar)}
              style={{ width: `${zone.percentage}%` }}
              title={`${ZONE_LABELS[zone.name]}: ${zone.percentage}%`}
            >
              {zone.percentage > 10 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
                  {zone.percentage}%
                </span>
              )}
            </div>
          )
        ))}
      </div>

      {showLabels && (
        <div className="flex flex-wrap gap-2 text-xs">
          {sortedZones.map(zone => (
            zone.percentage > 0 && (
              <div
                key={zone.name}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full",
                  ZONE_COLORS[zone.name].bg,
                  ZONE_COLORS[zone.name].text
                )}
              >
                <span className="font-medium">{ZONE_LABELS[zone.name]}</span>
                <span>{zone.percentage}%</span>
                {showDuration && zone.duration > 0 && (
                  <span className="opacity-75">({formatDuration(zone.duration)})</span>
                )}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// SPLITS TABLE
// ============================================

interface SplitsTableProps {
  splits: WorkoutSplit[]
  avgPace: number
  avgHr: number
  className?: string
}

function SplitsTable({ splits, avgPace, avgHr, className }: SplitsTableProps) {
  if (splits.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Not enough distance for mile splits
      </div>
    )
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Mile</th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">Pace</th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">HR</th>
            {splits.some(s => s.avgCadence !== null) && (
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Cadence</th>
            )}
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">vs Avg</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((split, idx) => {
            const isFastest = split.avgPace === Math.min(...splits.map(s => s.avgPace))
            const isSlowest = split.avgPace === Math.max(...splits.map(s => s.avgPace))

            return (
              <tr 
                key={split.splitNumber} 
                className={cn(
                  "border-b border-border/30",
                  isFastest && "bg-green-500/10",
                  isSlowest && "bg-red-500/10"
                )}
              >
                <td className="py-2 px-2 font-medium">
                  {split.splitNumber}
                  {isFastest && <Award className="inline size-3 ml-1 text-green-500" />}
                </td>
                <td className="text-right py-2 px-2 font-mono">
                  {formatPace(split.avgPace)}
                </td>
                <td className="text-right py-2 px-2">
                  <span className="flex items-center justify-end gap-1">
                    <Heart className="size-3 text-red-500" />
                    {split.avgHr}
                  </span>
                </td>
                {splits.some(s => s.avgCadence !== null) && (
                  <td className="text-right py-2 px-2">
                    {split.avgCadence || '-'}
                  </td>
                )}
                <td className="text-right py-2 px-2">
                  <Badge 
                    variant={split.paceVsAvg < 0 ? "default" : split.paceVsAvg > 0 ? "destructive" : "secondary"}
                    className="text-[10px] px-1.5"
                  >
                    {split.paceVsAvg > 0 ? '+' : ''}{split.paceVsAvg}%
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// INSIGHT CARD
// ============================================

interface InsightCardProps {
  insight: PerformanceInsight
  className?: string
}

function InsightCard({ insight, className }: InsightCardProps) {
  const iconMap: Record<string, React.ReactNode> = {
    'heart': <Heart className="size-4" />,
    'trending-up': <TrendingUp className="size-4" />,
    'trending-down': <TrendingDown className="size-4" />,
    'footprints': <Footprints className="size-4" />,
    'target': <Target className="size-4" />,
    'award': <Award className="size-4" />,
    'alert-triangle': <AlertTriangle className="size-4" />,
    'flame': <Flame className="size-4" />,
    'zap': <Zap className="size-4" />,
    'clock': <Clock className="size-4" />,
    'battery-charging': <Battery className="size-4" />,
  }

  const categoryStyles: Record<PerformanceInsight['category'], { bg: string; border: string; icon: string }> = {
    strength: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: 'text-green-500' },
    improvement: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-500' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-500' },
    info: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: 'text-purple-500' },
  }

  const styles = categoryStyles[insight.category]

  return (
    <div className={cn(
      "rounded-lg border p-3",
      styles.bg,
      styles.border,
      className
    )}>
      <div className="flex gap-3">
        <div className={cn("mt-0.5", styles.icon)}>
          {insight.icon ? iconMap[insight.icon] || <Info className="size-4" /> : <Info className="size-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm">{insight.title}</span>
            {insight.metric && (
              <Badge variant="outline" className="text-[10px]">
                {insight.metric}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// METRIC CARD
// ============================================

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

function MetricCard({ icon, label, value, subValue, trend, className }: MetricCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-3 text-center">
        <div className="mb-1 flex justify-center">
          {icon}
        </div>
        <div className="text-lg font-semibold flex items-center justify-center gap-1">
          {value}
          {trend === 'up' && <TrendingUp className="size-3 text-green-500" />}
          {trend === 'down' && <TrendingDown className="size-3 text-red-500" />}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {subValue && (
          <div className="text-[10px] text-muted-foreground mt-0.5">{subValue}</div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// MAIN ENHANCED WORKOUT DETAIL VIEW
// ============================================

interface EnhancedWorkoutDetailViewProps {
  workoutId: string
  onClose?: () => void
  className?: string
}

export function EnhancedWorkoutDetailView({ workoutId, onClose, className }: EnhancedWorkoutDetailViewProps) {
  const [data, setData] = useState<WorkoutDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)

  useEffect(() => {
    async function fetchWorkout() {
      try {
        const response = await apiGet<WorkoutDetailResponse>(`/api/apple-health/workout/${workoutId}`)
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
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-sm text-muted-foreground">Loading workout data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-sm text-muted-foreground">Workout not found</div>
      </div>
    )
  }

  const { workout, analytics } = data
  const workoutLabel = WORKOUT_TYPE_LABELS[workout.workout_type] || workout.workout_type
  const isRunning = workout.workout_type === 'running'
  const hasAnalytics = analytics !== null

  return (
    <div className={cn("space-y-4", className)}>
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
        <MetricCard
          icon={<Timer className="size-5 text-muted-foreground" />}
          label="Duration"
          value={formatDuration(workout.duration)}
        />
        <MetricCard
          icon={<Flame className="size-5 text-orange-500" />}
          label="Active Cal"
          value={Math.round(workout.active_calories)}
        />
        {workout.distance_miles && (
          <MetricCard
            icon={<Activity className="size-5 text-blue-500" />}
            label="Miles"
            value={workout.distance_miles.toFixed(2)}
          />
        )}
        {workout.hr_average && (
          <MetricCard
            icon={<Heart className="size-5 text-red-500" />}
            label="Avg BPM"
            value={workout.hr_average}
            subValue={`${workout.hr_min} - ${workout.hr_max}`}
          />
        )}
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <LineChart className="size-3.5" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-1.5" disabled={!hasAnalytics}>
            <BarChart3 className="size-3.5" />
            <span>Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1.5" disabled={!hasAnalytics}>
            <Target className="size-3.5" />
            <span>Insights</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Time series chart */}
          {hasAnalytics && analytics.timeSeriesData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="size-4" />
                  Performance Timeline
                </CardTitle>
                <CardDescription className="text-xs">
                  Heart rate, cadence, and pace throughout your workout
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  data={analytics.timeSeriesData}
                  showHr={true}
                  showCadence={isRunning && workout.cadence_average !== null}
                  showPace={isRunning && workout.pace_average !== null}
                  height={180}
                />
              </CardContent>
            </Card>
          )}

          {/* HR Zones */}
          {workout.hr_zones && workout.hr_zones.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="size-4 text-red-500" />
                  Heart Rate Zones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HrZonesBar zones={workout.hr_zones} showLabels={true} showDuration={true} />
              </CardContent>
            </Card>
          )}

          {/* Running-specific metrics */}
          {isRunning && (
            <div className="grid grid-cols-2 gap-3">
              {workout.pace_average && (
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Gauge className="size-3" />
                      Avg Pace
                    </div>
                    <div className="text-xl font-semibold">{formatPace(workout.pace_average)}<span className="text-sm font-normal">/mi</span></div>
                    {workout.pace_best && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Best: {formatPace(workout.pace_best)}/mi
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {workout.cadence_average && (
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Footprints className="size-3" />
                      Avg Cadence
                    </div>
                    <div className="text-xl font-semibold">{workout.cadence_average} <span className="text-sm font-normal">spm</span></div>
                    {hasAnalytics && analytics.cadenceAnalysis.optimalRange && (
                      <div className="text-xs text-green-500 mt-1">
                        In optimal range (170-180)
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4 mt-4">
          {hasAnalytics && (
            <>
              {/* Mile Splits */}
              {analytics.splits.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="size-4" />
                      Mile Splits
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {analytics.paceAnalysis.splitStrategy === 'negative' 
                        ? 'Negative split - great pacing!' 
                        : analytics.paceAnalysis.splitStrategy === 'positive'
                        ? 'Positive split - started fast, slowed down'
                        : analytics.paceAnalysis.splitStrategy === 'variable'
                        ? 'Variable pacing throughout'
                        : 'Even pacing'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SplitsTable 
                      splits={analytics.splits}
                      avgPace={analytics.avgPace}
                      avgHr={analytics.avgHr}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Advanced Metrics Collapsible */}
              <Collapsible open={showAdvancedMetrics} onOpenChange={setShowAdvancedMetrics}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="size-4" />
                      Advanced Performance Metrics
                    </span>
                    {showAdvancedMetrics ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  {/* Cardiac Drift */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            <Heart className="size-4 text-red-500" />
                            Cardiac Drift
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 max-w-md">
                            {analytics.cardiacDrift.recommendation}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {analytics.cardiacDrift.driftPercentage > 0 ? '+' : ''}{analytics.cardiacDrift.driftPercentage}%
                          </div>
                          <Badge 
                            variant={
                              analytics.cardiacDrift.interpretation === 'minimal' ? 'default' :
                              analytics.cardiacDrift.interpretation === 'moderate' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {analytics.cardiacDrift.interpretation}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        <span>1st Half Avg: {analytics.cardiacDrift.firstHalfAvgHr} bpm</span>
                        <span>2nd Half Avg: {analytics.cardiacDrift.secondHalfAvgHr} bpm</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Aerobic Decoupling */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="size-4 text-blue-500" />
                            Aerobic Decoupling
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 max-w-md">
                            {analytics.aerobicDecoupling.recommendation}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {analytics.aerobicDecoupling.decouplingPercentage}%
                          </div>
                          <Badge 
                            variant={
                              analytics.aerobicDecoupling.interpretation === 'excellent' ? 'default' :
                              analytics.aerobicDecoupling.interpretation === 'good' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {analytics.aerobicDecoupling.interpretation}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Training Impulse */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            <Zap className="size-4 text-amber-500" />
                            Training Load (TRIMP)
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 max-w-md">
                            {analytics.trainingImpulse.recommendation}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {analytics.trainingImpulse.trimp}
                          </div>
                          <Badge variant="outline">
                            {analytics.trainingImpulse.intensity}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cadence Analysis (for running) */}
                  {isRunning && analytics.cadenceAnalysis.average > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              <Footprints className="size-4 text-green-500" />
                              Cadence Analysis
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 max-w-md">
                              {analytics.cadenceAnalysis.recommendation}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {analytics.cadenceAnalysis.average} <span className="text-sm font-normal">spm</span>
                            </div>
                            <Badge 
                              variant={analytics.cadenceAnalysis.optimalRange ? 'default' : 'secondary'}
                            >
                              {analytics.cadenceAnalysis.consistency.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                          <span>Min: {analytics.cadenceAnalysis.min}</span>
                          <span>Max: {analytics.cadenceAnalysis.max}</span>
                          <span>Std Dev: {analytics.cadenceAnalysis.standardDeviation}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Efficiency Factor */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <Wind className="size-4 text-cyan-500" />
                          Efficiency Factor
                        </div>
                        <div className="text-xl font-bold">
                          {analytics.efficiencyFactor.toFixed(3)}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Speed relative to heart rate effort. Higher is more efficient. Track this over time to measure fitness gains.
                      </p>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-3 mt-4">
          {hasAnalytics && analytics.insights.length > 0 ? (
            analytics.insights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              No insights available for this workout
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Source */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
        <Watch className="size-3" />
        <span>Recorded by {workout.source}</span>
      </div>
    </div>
  )
}

export default EnhancedWorkoutDetailView
