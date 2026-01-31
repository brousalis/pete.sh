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
  Sparkles,
  Route,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

  const { hrRange, cadenceRange, paceRange, filteredData, stats } = useMemo(() => {
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
      filteredData: data.filter((_, i) => i % 2 === 0), // Downsample for performance
      stats: {
        minHr: hrValues.length > 0 ? Math.min(...hrValues) : 0,
        maxHr: hrValues.length > 0 ? Math.max(...hrValues) : 0,
        avgHr: hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 0
      }
    }
  }, [data])

  const chartHeight = height - 30 // Reserve space for labels
  const normalizeHr = (hr: number) => {
    return chartHeight - 10 - ((hr - hrRange.min) / (hrRange.max - hrRange.min)) * (chartHeight - 20)
  }

  const normalizeCadence = (cadence: number) => {
    return chartHeight - 10 - ((cadence - cadenceRange.min) / (cadenceRange.max - cadenceRange.min)) * (chartHeight - 20)
  }

  // Pace is inverted (lower is better)
  const normalizePace = (pace: number) => {
    return chartHeight - 10 - ((paceRange.max - pace) / (paceRange.max - paceRange.min)) * (chartHeight - 20)
  }

  const width = 100
  const xScale = (i: number) => (i / (filteredData.length - 1 || 1)) * width

  // Generate smooth paths using bezier curves
  const generateSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return ''
    
    let path = `M ${points[0].x},${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpX = (prev.x + curr.x) / 2
      path += ` Q ${cpX},${prev.y} ${cpX},${(prev.y + curr.y) / 2} Q ${cpX},${curr.y} ${curr.x},${curr.y}`
    }
    
    return path
  }

  // Generate paths
  const hrPointsArray = filteredData
    .map((d, i) => d.hr !== null ? { x: xScale(i), y: normalizeHr(d.hr) } : null)
    .filter(Boolean) as { x: number; y: number }[]

  const cadencePointsArray = filteredData
    .map((d, i) => d.cadence !== null ? { x: xScale(i), y: normalizeCadence(d.cadence) } : null)
    .filter(Boolean) as { x: number; y: number }[]

  const pacePointsArray = filteredData
    .map((d, i) => d.pace !== null && d.pace > 0 && d.pace < 30 ? { x: xScale(i), y: normalizePace(d.pace) } : null)
    .filter(Boolean) as { x: number; y: number }[]

  const hrPath = hrPointsArray.map(p => `${p.x},${p.y}`).join(' L ')
  const cadencePath = cadencePointsArray.map(p => `${p.x},${p.y}`).join(' L ')
  const pacePath = pacePointsArray.map(p => `${p.x},${p.y}`).join(' L ')

  const hovered = hoveredIndex !== null ? filteredData[hoveredIndex] : null
  const totalDuration = data.length > 0 ? data[data.length - 1].elapsedSeconds : 0

  return (
    <div className={cn("relative", className)}>
      {/* Chart Container */}
      <div className="relative rounded-lg bg-muted/20 p-2">
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="w-full"
          style={{ height: chartHeight }}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="hrGradientFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(239 68 68)" stopOpacity="0.4" />
              <stop offset="50%" stopColor="rgb(239 68 68)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="rgb(239 68 68)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="paceGradientFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34 197 94)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(34 197 94)" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <line
              key={i}
              x1={0}
              y1={chartHeight * ratio}
              x2={width}
              y2={chartHeight * ratio}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="0.3"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* HR area fill */}
          {showHr && hrPath && (
            <path
              d={`M ${hrPath} L ${width},${chartHeight - 10} L 0,${chartHeight - 10} Z`}
              fill="url(#hrGradientFill)"
            />
          )}

          {/* Pace line (green) - thinner, behind HR */}
          {showPace && pacePath && (
            <path
              d={`M ${pacePath}`}
              fill="none"
              stroke="rgb(34 197 94)"
              strokeWidth="1.5"
              strokeOpacity="0.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Cadence line (blue) */}
          {showCadence && cadencePath && (
            <path
              d={`M ${cadencePath}`}
              fill="none"
              stroke="rgb(59 130 246)"
              strokeWidth="1.5"
              strokeOpacity="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* HR line (red) - main line, on top */}
          {showHr && hrPath && (
            <path
              d={`M ${hrPath}`}
              fill="none"
              stroke="rgb(239 68 68)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              filter="url(#glow)"
            />
          )}

          {/* Hover detection areas */}
          {filteredData.map((_, i) => (
            <rect
              key={i}
              x={xScale(i) - (width / filteredData.length / 2)}
              y={0}
              width={width / filteredData.length}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ))}

          {/* Hover indicator line */}
          {hoveredIndex !== null && (
            <>
              <line
                x1={xScale(hoveredIndex)}
                y1={0}
                x2={xScale(hoveredIndex)}
                y2={chartHeight}
                stroke="white"
                strokeOpacity="0.6"
                strokeWidth="1"
                strokeDasharray="3,3"
                vectorEffect="non-scaling-stroke"
              />
              {/* Hover dots */}
              {hovered?.hr && showHr && (
                <circle
                  cx={xScale(hoveredIndex)}
                  cy={normalizeHr(hovered.hr)}
                  r="3"
                  fill="rgb(239 68 68)"
                  stroke="white"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {hovered?.cadence && showCadence && (
                <circle
                  cx={xScale(hoveredIndex)}
                  cy={normalizeCadence(hovered.cadence)}
                  r="2.5"
                  fill="rgb(59 130 246)"
                  stroke="white"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {hovered?.pace && hovered.pace > 0 && hovered.pace < 30 && showPace && (
                <circle
                  cx={xScale(hoveredIndex)}
                  cy={normalizePace(hovered.pace)}
                  r="2.5"
                  fill="rgb(34 197 94)"
                  stroke="white"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hovered && (
          <div className="absolute top-3 right-3 bg-background/95 border border-border/50 rounded-lg p-2.5 text-xs shadow-xl backdrop-blur-md z-10 min-w-[120px]">
            <div className="font-semibold mb-1.5 text-foreground border-b border-border/30 pb-1">
              {formatElapsedTime(hovered.elapsedSeconds)}
            </div>
            <div className="space-y-1">
              {showHr && hovered.hr && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <Heart className="size-3" />
                    <span>HR</span>
                  </span>
                  <span className="font-medium text-foreground">{hovered.hr} <span className="text-muted-foreground font-normal">bpm</span></span>
                </div>
              )}
              {showCadence && hovered.cadence && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Footprints className="size-3" />
                    <span>Cadence</span>
                  </span>
                  <span className="font-medium text-foreground">{hovered.cadence} <span className="text-muted-foreground font-normal">spm</span></span>
                </div>
              )}
              {showPace && hovered.pace && hovered.pace > 0 && hovered.pace < 30 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-green-400">
                    <Gauge className="size-3" />
                    <span>Pace</span>
                  </span>
                  <span className="font-medium text-foreground">{formatPace(hovered.pace)} <span className="text-muted-foreground font-normal">/mi</span></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Y-axis labels - HR range */}
        {showHr && stats.maxHr > 0 && (
          <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-between text-[9px] text-red-400/70 pointer-events-none font-medium">
            <span>{stats.maxHr}</span>
            <span>{stats.minHr}</span>
          </div>
        )}
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
        <span>0:00</span>
        <span>{formatElapsedTime(Math.round(totalDuration / 2))}</span>
        <span>{formatElapsedTime(totalDuration)}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3 text-xs">
        {showHr && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1 bg-red-500 rounded-full" />
            <span className="text-muted-foreground">Heart Rate</span>
          </div>
        )}
        {showCadence && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1 bg-blue-500 rounded-full" />
            <span className="text-muted-foreground">Cadence</span>
          </div>
        )}
        {showPace && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1 bg-green-500 rounded-full" />
            <span className="text-muted-foreground">Pace</span>
          </div>
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

  const minPace = Math.min(...splits.map(s => s.avgPace))
  const maxPace = Math.max(...splits.map(s => s.avgPace))
  const paceRange = maxPace - minPace || 1

  // Calculate bar width based on pace (faster = longer bar)
  const getPaceBarWidth = (pace: number) => {
    // Invert so faster pace = longer bar
    const normalized = 1 - (pace - minPace) / paceRange
    return Math.max(20, normalized * 100) // Min 20%, max 100%
  }

  const showCadence = splits.some(s => s.avgCadence !== null)

  return (
    <div className={cn("space-y-2", className)}>
      {splits.map((split) => {
        const isFastest = split.avgPace === minPace
        const isSlowest = split.avgPace === maxPace
        const barWidth = getPaceBarWidth(split.avgPace)

        return (
          <div 
            key={split.splitNumber}
            className={cn(
              "relative rounded-lg p-3 border transition-colors",
              isFastest ? "border-green-500/50 bg-green-500/5" : 
              isSlowest ? "border-red-500/30 bg-red-500/5" : 
              "border-border/30 bg-muted/20"
            )}
          >
            {/* Mile number and badge */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">Mile {split.splitNumber}</span>
                {isFastest && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                    <Zap className="size-2.5 mr-0.5" />
                    Fastest
                  </Badge>
                )}
              </div>
              <Badge 
                variant={split.paceVsAvg < 0 ? "default" : split.paceVsAvg > 0 ? "secondary" : "outline"}
                className="text-[10px]"
              >
                {split.paceVsAvg > 0 ? '+' : ''}{split.paceVsAvg}% vs avg
              </Badge>
            </div>

            {/* Pace bar visualization */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="size-3 text-green-500" />
                <span className="text-xs text-muted-foreground">Pace</span>
                <span className="font-mono font-semibold ml-auto">{formatPace(split.avgPace)}/mi</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    isFastest ? "bg-green-500" : isSlowest ? "bg-red-400" : "bg-primary/60"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Heart className="size-3 text-red-500" />
                <span className="text-muted-foreground">HR:</span>
                <span className="font-medium">{split.avgHr} bpm</span>
              </div>
              {showCadence && split.avgCadence && (
                <div className="flex items-center gap-1.5">
                  <Footprints className="size-3 text-blue-500" />
                  <span className="text-muted-foreground">Cadence:</span>
                  <span className="font-medium">{split.avgCadence} spm</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                <Timer className="size-3 text-muted-foreground" />
                <span className="font-medium">{formatDuration(split.timeSeconds)}</span>
              </div>
            </div>
          </div>
        )
      })}
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
// SECTION HEADER COMPONENT
// ============================================

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  description?: string
  badge?: React.ReactNode
}

function SectionHeader({ icon, title, description, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {badge}
    </div>
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
  const [showAllMetrics, setShowAllMetrics] = useState(false)

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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading workout data...
        </div>
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
  const isCardio = ['running', 'walking', 'cycling', 'rowing', 'elliptical', 'stairClimbing'].includes(workout.workout_type)
  const hasAnalytics = analytics !== null

  return (
    <div className={cn("space-y-6", className)}>
      {/* ============================================ */}
      {/* HEADER SECTION */}
      {/* ============================================ */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge className="text-sm px-2.5 py-0.5">{workoutLabel}</Badge>
          <span className="text-sm text-muted-foreground">
            {format(new Date(workout.start_date), 'EEEE, MMM d, yyyy')}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(new Date(workout.start_date), 'h:mm a')} - {format(new Date(workout.end_date), 'h:mm a')}
        </div>
      </div>

      {/* ============================================ */}
      {/* PRIMARY METRICS */}
      {/* ============================================ */}
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
            icon={<Route className="size-5 text-blue-500" />}
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

      {/* ============================================ */}
      {/* PERFORMANCE TIMELINE (Time Series Chart) */}
      {/* ============================================ */}
      {hasAnalytics && analytics.timeSeriesData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <SectionHeader
              icon={<Activity className="size-4 text-primary" />}
              title="Performance Timeline"
              description="Heart rate, cadence, and pace throughout your workout"
            />
            <TimeSeriesChart
              data={analytics.timeSeriesData}
              showHr={true}
              showCadence={isRunning && workout.cadence_average !== null}
              showPace={isRunning && workout.pace_average !== null}
              height={160}
            />
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* HEART RATE ZONES */}
      {/* ============================================ */}
      {workout.hr_zones && workout.hr_zones.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <SectionHeader
              icon={<Heart className="size-4 text-red-500" />}
              title="Heart Rate Zones"
              description="Time spent in each training zone"
            />
            <HrZonesBar zones={workout.hr_zones} showLabels={true} showDuration={true} />
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* RUNNING-SPECIFIC METRICS */}
      {/* ============================================ */}
      {isRunning && (workout.pace_average || workout.cadence_average) && (
        <div className="grid grid-cols-2 gap-3">
          {workout.pace_average && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="size-4 text-green-500" />
                  <span className="text-xs text-muted-foreground font-medium">Pace</span>
                </div>
                <div className="text-2xl font-bold">{formatPace(workout.pace_average)}<span className="text-sm font-normal text-muted-foreground">/mi</span></div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {workout.pace_best && (
                    <span className="flex items-center gap-1">
                      <Zap className="size-3 text-amber-500" />
                      Best: {formatPace(workout.pace_best)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {workout.cadence_average && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="size-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground font-medium">Cadence</span>
                </div>
                <div className="text-2xl font-bold">{workout.cadence_average} <span className="text-sm font-normal text-muted-foreground">spm</span></div>
                {hasAnalytics && (
                  <div className="mt-2">
                    {analytics.cadenceAnalysis.optimalRange ? (
                      <Badge variant="default" className="text-[10px]">Optimal (170-180)</Badge>
                    ) : analytics.cadenceAnalysis.average < 170 ? (
                      <Badge variant="secondary" className="text-[10px]">Below optimal</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Above optimal</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* MILE SPLITS */}
      {/* ============================================ */}
      {hasAnalytics && analytics.splits.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <SectionHeader
              icon={<BarChart3 className="size-4 text-purple-500" />}
              title="Mile Splits"
              description={
                analytics.paceAnalysis.splitStrategy === 'negative' 
                  ? 'Negative split - great pacing!' 
                  : analytics.paceAnalysis.splitStrategy === 'positive'
                  ? 'Positive split - slowed in second half'
                  : analytics.paceAnalysis.splitStrategy === 'variable'
                  ? 'Variable pacing throughout'
                  : 'Even pacing'
              }
              badge={
                analytics.paceAnalysis.splitStrategy === 'negative' && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Award className="size-3 mr-1" />
                    Great Pacing
                  </Badge>
                )
              }
            />
            <SplitsTable 
              splits={analytics.splits}
              avgPace={analytics.avgPace}
              avgHr={analytics.avgHr}
            />
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* PERFORMANCE INSIGHTS */}
      {/* ============================================ */}
      {hasAnalytics && analytics.insights.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            icon={<Sparkles className="size-4 text-amber-500" />}
            title="Performance Insights"
            description="AI-powered analysis of your workout"
          />
          <div className="grid gap-3">
            {analytics.insights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* ADVANCED METRICS (Collapsible) */}
      {/* ============================================ */}
      {hasAnalytics && (
        <Collapsible open={showAllMetrics} onOpenChange={setShowAllMetrics}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-12">
              <span className="flex items-center gap-2">
                <LineChart className="size-4" />
                <span className="font-medium">Advanced Training Metrics</span>
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {showAllMetrics ? 'Hide' : 'Show'} Details
                {showAllMetrics ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {/* Training Load (TRIMP) */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="size-4 text-amber-500" />
                      <span className="font-semibold text-sm">Training Load (TRIMP)</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                      {analytics.trainingImpulse.recommendation}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold">{analytics.trainingImpulse.trimp}</div>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {analytics.trainingImpulse.intensity}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cardiac Drift */}
            <Card className={cn(
              "border-l-4",
              analytics.cardiacDrift.interpretation === 'minimal' ? "border-l-green-500" :
              analytics.cardiacDrift.interpretation === 'moderate' ? "border-l-yellow-500" :
              "border-l-red-500"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="size-4 text-red-500" />
                      <span className="font-semibold text-sm">Cardiac Drift</span>
                      <Badge 
                        variant={analytics.cardiacDrift.interpretation === 'minimal' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {analytics.cardiacDrift.interpretation}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                      {analytics.cardiacDrift.recommendation}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-muted-foreground">1st Half: <span className="text-foreground font-medium">{analytics.cardiacDrift.firstHalfAvgHr} bpm</span></span>
                      <span className="text-muted-foreground">2nd Half: <span className="text-foreground font-medium">{analytics.cardiacDrift.secondHalfAvgHr} bpm</span></span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold">
                      {analytics.cardiacDrift.driftPercentage > 0 ? '+' : ''}{analytics.cardiacDrift.driftPercentage}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aerobic Decoupling */}
            <Card className={cn(
              "border-l-4",
              analytics.aerobicDecoupling.interpretation === 'excellent' ? "border-l-green-500" :
              analytics.aerobicDecoupling.interpretation === 'good' ? "border-l-blue-500" :
              analytics.aerobicDecoupling.interpretation === 'moderate' ? "border-l-yellow-500" :
              "border-l-red-500"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="size-4 text-blue-500" />
                      <span className="font-semibold text-sm">Aerobic Decoupling</span>
                      <Badge 
                        variant={analytics.aerobicDecoupling.interpretation === 'excellent' || analytics.aerobicDecoupling.interpretation === 'good' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {analytics.aerobicDecoupling.interpretation}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                      {analytics.aerobicDecoupling.recommendation}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold">{analytics.aerobicDecoupling.decouplingPercentage}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cadence Analysis (for running) */}
            {isRunning && analytics.cadenceAnalysis.average > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Footprints className="size-4 text-green-500" />
                        <span className="font-semibold text-sm">Cadence Analysis</span>
                        <Badge 
                          variant={analytics.cadenceAnalysis.optimalRange ? 'default' : 'secondary'}
                          className="text-[10px] capitalize"
                        >
                          {analytics.cadenceAnalysis.consistency.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                        {analytics.cadenceAnalysis.recommendation}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-muted-foreground">Min: <span className="text-foreground font-medium">{analytics.cadenceAnalysis.min}</span></span>
                        <span className="text-muted-foreground">Max: <span className="text-foreground font-medium">{analytics.cadenceAnalysis.max}</span></span>
                        <span className="text-muted-foreground">Std Dev: <span className="text-foreground font-medium">{analytics.cadenceAnalysis.standardDeviation}</span></span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-3xl font-bold">{analytics.cadenceAnalysis.average}</div>
                      <div className="text-xs text-muted-foreground">spm</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Efficiency Factor */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Wind className="size-4 text-cyan-500" />
                      <span className="font-semibold text-sm">Efficiency Factor</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                      Speed relative to heart rate effort. Higher is more efficient. Track this metric over time to measure aerobic fitness improvements.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold">{analytics.efficiencyFactor.toFixed(3)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HR Variability Stats */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="size-4 text-purple-500" />
                  <span className="font-semibold text-sm">Heart Rate Variability During Workout</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold">{analytics.hrVariability.min}</div>
                    <div className="text-[10px] text-muted-foreground">Min BPM</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{analytics.hrVariability.max}</div>
                    <div className="text-[10px] text-muted-foreground">Max BPM</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{analytics.hrVariability.range}</div>
                    <div className="text-[10px] text-muted-foreground">Range</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{analytics.avgHr}</div>
                    <div className="text-[10px] text-muted-foreground">Avg BPM</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Watch className="size-3" />
          <span>Recorded by {workout.source}</span>
        </div>
        {hasAnalytics && (
          <div className="flex items-center gap-1">
            <Sparkles className="size-3" />
            <span>Enhanced Analytics</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedWorkoutDetailView
