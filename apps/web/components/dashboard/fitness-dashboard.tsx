'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import {
    differenceInDays,
    format,
    isToday,
    isYesterday,
    startOfDay,
} from 'date-fns'
import {
    Activity,
    Bike,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    Dumbbell,
    Flame,
    Footprints,
    Heart,
    HeartPulse,
    Moon,
    Route,
    Sparkles,
    Sun,
    Sunrise,
    Sunset,
    Target,
    Timer,
    TrendingDown,
    TrendingUp,
    Watch,
    Wind,
    Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'

// ============================================
// TYPES
// ============================================

export interface AppleWorkout {
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

export interface DailyMetrics {
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

export interface WeeklySummary {
  weekStart: string
  totalWorkouts: number
  totalDurationMin: number
  totalCalories: number
  totalDistanceMiles: number
  avgHr: number
  workoutTypes: Record<string, number>
}

interface DayGroup {
  date: Date
  dateKey: string
  displayName: string
  workouts: AppleWorkout[]
  totalDuration: number
  totalCalories: number
  totalDistance: number
  avgHr: number
  workoutCount: number
}

// ============================================
// CONSTANTS
// ============================================

// Icon factory for different sizes
function getWorkoutIcon(type: string, size: 'sm' | 'md' | 'lg' = 'md') {
  const sizeClass =
    size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5'
  const icons: Record<string, React.ReactNode> = {
    running: <Route className={sizeClass} />,
    walking: <Footprints className={sizeClass} />,
    cycling: <Bike className={sizeClass} />,
    functionalStrengthTraining: <Dumbbell className={sizeClass} />,
    traditionalStrengthTraining: <Dumbbell className={sizeClass} />,
    coreTraining: <Target className={sizeClass} />,
    hiit: <Zap className={sizeClass} />,
    rowing: <Activity className={sizeClass} />,
    stairClimbing: <TrendingUp className={sizeClass} />,
    elliptical: <Activity className={sizeClass} />,
    other: <Activity className={sizeClass} />,
  }
  return icons[type] || icons.other
}

const WORKOUT_ICONS: Record<string, React.ReactNode> = {
  running: <Route className="size-5" />,
  walking: <Footprints className="size-5" />,
  cycling: <Bike className="size-5" />,
  functionalStrengthTraining: <Dumbbell className="size-5" />,
  traditionalStrengthTraining: <Dumbbell className="size-5" />,
  coreTraining: <Target className="size-5" />,
  hiit: <Zap className="size-5" />,
  rowing: <Activity className="size-5" />,
  stairClimbing: <TrendingUp className="size-5" />,
  elliptical: <Activity className="size-5" />,
  other: <Activity className="size-5" />,
}

// Separated color mappings for more granular control
const WORKOUT_TEXT_COLORS: Record<string, string> = {
  running: 'text-green-500',
  walking: 'text-blue-400',
  cycling: 'text-orange-500',
  functionalStrengthTraining: 'text-purple-500',
  traditionalStrengthTraining: 'text-purple-500',
  coreTraining: 'text-pink-500',
  hiit: 'text-red-500',
  rowing: 'text-cyan-500',
  stairClimbing: 'text-amber-500',
  elliptical: 'text-teal-500',
  other: 'text-gray-500',
}

const WORKOUT_BG_COLORS: Record<string, string> = {
  running: 'bg-green-500/10',
  walking: 'bg-blue-400/10',
  cycling: 'bg-orange-500/10',
  functionalStrengthTraining: 'bg-purple-500/10',
  traditionalStrengthTraining: 'bg-purple-500/10',
  coreTraining: 'bg-pink-500/10',
  hiit: 'bg-red-500/10',
  rowing: 'bg-cyan-500/10',
  stairClimbing: 'bg-amber-500/10',
  elliptical: 'bg-teal-500/10',
  other: 'bg-gray-500/10',
}

const WORKOUT_BORDER_COLORS: Record<string, string> = {
  running: 'border-green-500/60',
  walking: 'border-blue-400/60',
  cycling: 'border-orange-500/60',
  functionalStrengthTraining: 'border-purple-500/60',
  traditionalStrengthTraining: 'border-purple-500/60',
  coreTraining: 'border-pink-500/60',
  hiit: 'border-red-500/60',
  rowing: 'border-cyan-500/60',
  stairClimbing: 'border-amber-500/60',
  elliptical: 'border-teal-500/60',
  other: 'border-gray-500/60',
}

// Combined for backwards compatibility
const WORKOUT_COLORS: Record<string, string> = {
  running: 'text-green-500 bg-green-500/10 border-green-500/30',
  walking: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  cycling: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  functionalStrengthTraining:
    'text-purple-500 bg-purple-500/10 border-purple-500/30',
  traditionalStrengthTraining:
    'text-purple-500 bg-purple-500/10 border-purple-500/30',
  coreTraining: 'text-pink-500 bg-pink-500/10 border-pink-500/30',
  hiit: 'text-red-500 bg-red-500/10 border-red-500/30',
  rowing: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
  stairClimbing: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  elliptical: 'text-teal-500 bg-teal-500/10 border-teal-500/30',
  other: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
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
  if (!minutesPerMile || minutesPerMile <= 0 || minutesPerMile > 30)
    return '--:--'
  const mins = Math.floor(minutesPerMile)
  const secs = Math.round((minutesPerMile - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getTimeOfDay(date: Date): { icon: React.ReactNode; label: string } {
  const hour = date.getHours()
  if (hour < 6) return { icon: <Moon className="size-3" />, label: 'Night' }
  if (hour < 12)
    return { icon: <Sunrise className="size-3" />, label: 'Morning' }
  if (hour < 17) return { icon: <Sun className="size-3" />, label: 'Afternoon' }
  if (hour < 21)
    return { icon: <Sunset className="size-3" />, label: 'Evening' }
  return { icon: <Moon className="size-3" />, label: 'Night' }
}

function getDayDisplayName(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  const daysAgo = differenceInDays(new Date(), date)
  if (daysAgo < 7) return format(date, 'EEEE')
  return format(date, 'EEE, MMM d')
}

function groupWorkoutsByDay(workouts: AppleWorkout[]): DayGroup[] {
  const groups = new Map<string, AppleWorkout[]>()

  workouts.forEach(workout => {
    const date = startOfDay(new Date(workout.start_date))
    const key = date.toISOString()
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(workout)
  })

  return Array.from(groups.entries())
    .map(([key, dayWorkouts]) => {
      const date = new Date(key)
      const totalDuration = dayWorkouts.reduce((sum, w) => sum + w.duration, 0)
      const totalCalories = dayWorkouts.reduce(
        (sum, w) => sum + w.active_calories,
        0
      )
      const totalDistance = dayWorkouts.reduce(
        (sum, w) => sum + (w.distance_miles || 0),
        0
      )
      const hrValues = dayWorkouts
        .filter(w => w.hr_average)
        .map(w => w.hr_average!)
      const avgHr =
        hrValues.length > 0
          ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
          : 0

      // Sort workouts by time within the day
      dayWorkouts.sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      )

      return {
        date,
        dateKey: key,
        displayName: getDayDisplayName(date),
        workouts: dayWorkouts,
        totalDuration,
        totalCalories,
        totalDistance,
        avgHr,
        workoutCount: dayWorkouts.length,
      }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

// ============================================
// ACTIVITY RINGS COMPONENT
// ============================================

interface ActivityRingsProps {
  move: number
  moveGoal: number
  exercise: number
  exerciseGoal: number
  stand: number
  standGoal: number
  size?: number
  className?: string
  showLegend?: boolean
}

function ActivityRings({
  move,
  moveGoal,
  exercise,
  exerciseGoal,
  stand,
  standGoal,
  size = 100,
  className,
  showLegend = false,
}: ActivityRingsProps) {
  const strokeWidth = size * 0.08
  const radius = (size - strokeWidth) / 2

  const moveProgress = Math.min((move / moveGoal) * 100, 100)
  const exerciseProgress = Math.min((exercise / exerciseGoal) * 100, 100)
  const standProgress = Math.min((stand / standGoal) * 100, 100)

  const rings = [
    {
      progress: moveProgress,
      color: '#FF2D55',
      label: 'Move',
      value: move,
      goal: moveGoal,
      unit: 'cal',
      icon: <Flame className="size-3" />,
    },
    {
      progress: exerciseProgress,
      color: '#92E82A',
      label: 'Exercise',
      value: exercise,
      goal: exerciseGoal,
      unit: 'min',
      icon: <Activity className="size-3" />,
    },
    {
      progress: standProgress,
      color: '#00D4FF',
      label: 'Stand',
      value: stand,
      goal: standGoal,
      unit: 'hrs',
      icon: <TrendingUp className="size-3" />,
    },
  ]

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 transform">
          {rings.map((ring, i) => {
            const r = radius - i * strokeWidth * 1.4
            const c = 2 * Math.PI * r
            const offset = c - (ring.progress / 100) * c

            return (
              <g key={ring.label}>
                {/* Background ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={0.2}
                />
                {/* Progress ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={offset}
                  className="transition-all duration-500"
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Ring Legend */}
      {showLegend && (
        <div className="flex w-full flex-col gap-1.5">
          {rings.map(ring => (
            <div
              key={ring.label}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: ring.color }}
                />
                <span className="text-muted-foreground">{ring.label}</span>
              </div>
              <div className="font-medium tabular-nums">
                <span style={{ color: ring.color }}>{ring.value}</span>
                <span className="text-muted-foreground">/{ring.goal}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// WORKOUT ROW (Clean, borderless design)
// ============================================

interface WorkoutRowProps {
  workout: AppleWorkout
  onClick?: () => void
  showTimeOfDay?: boolean
}

function WorkoutRow({
  workout,
  onClick,
  showTimeOfDay = true,
}: WorkoutRowProps) {
  const startTime = new Date(workout.start_date)
  const timeOfDay = getTimeOfDay(startTime)
  const textColor = WORKOUT_TEXT_COLORS[workout.workout_type] ?? WORKOUT_TEXT_COLORS.other ?? 'text-gray-500'
  const bgColor = WORKOUT_BG_COLORS[workout.workout_type] ?? WORKOUT_BG_COLORS.other ?? 'bg-gray-500/10'
  const borderColor = WORKOUT_BORDER_COLORS[workout.workout_type] ?? WORKOUT_BORDER_COLORS.other ?? 'border-gray-500/40'
  const icon = getWorkoutIcon(workout.workout_type, 'md')
  const label = WORKOUT_LABELS[workout.workout_type] || workout.workout_type
  const isCardio = [
    'running',
    'walking',
    'cycling',
    'rowing',
    'stairClimbing',
    'elliptical',
  ].includes(workout.workout_type)

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg transition-all',
        'hover:bg-muted/40 active:bg-muted/60',
        'border-l-4 pl-4 pr-3 py-3',
        borderColor
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={cn('rounded-lg p-2.5', bgColor, textColor)}>
          {icon}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-base font-semibold', textColor)}>
              {label}
            </span>
            {showTimeOfDay && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                {timeOfDay.icon}
                {format(startTime, 'h:mm a')}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <Timer className="text-muted-foreground size-3.5" />
              {formatDuration(workout.duration)}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Flame className="size-3.5 text-orange-500" />
              {Math.round(workout.active_calories)} cal
            </span>
            {workout.hr_average && (
              <span className="flex items-center gap-1.5 font-medium">
                <Heart className="size-3.5 text-red-500" />
                {workout.hr_average} bpm
              </span>
            )}
            {isCardio && workout.distance_miles && (
              <span className="flex items-center gap-1.5 font-medium">
                <Route className="size-3.5 text-blue-500" />
                {workout.distance_miles.toFixed(2)} mi
              </span>
            )}
            {workout.workout_type === 'running' && workout.pace_average && (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {formatPace(workout.pace_average)}/mi
              </span>
            )}
            {workout.workout_type === 'running' && workout.cadence_average && (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Footprints className="size-3.5" />
                {workout.cadence_average} spm
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="text-muted-foreground/50 size-5 shrink-0 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5" />
      </div>
    </div>
  )
}

// ============================================
// DAY GROUP SECTION (Card-free design)
// ============================================

interface DayGroupSectionProps {
  group: DayGroup
  onWorkoutClick: (workoutId: string) => void
  defaultExpanded?: boolean
}

function DayGroupSection({
  group,
  onWorkoutClick,
  defaultExpanded = false,
}: DayGroupSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isCurrentDay = isToday(group.date)

  // Get workout type breakdown
  const typeBreakdown = group.workouts.reduce(
    (acc, w) => {
      const type = WORKOUT_LABELS[w.workout_type] || w.workout_type
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className={cn(
      'rounded-xl transition-all',
      isCurrentDay && 'bg-primary/5'
    )}>
      {/* Day Header - Always visible */}
      <div
        className="group cursor-pointer px-4 py-3 transition-colors md:px-5 md:py-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Date badge - cleaner circle design */}
            <div
              className={cn(
                'flex size-12 flex-col items-center justify-center rounded-full md:size-14',
                isCurrentDay 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/60'
              )}
            >
              <span className="text-[10px] font-semibold tracking-wider uppercase md:text-[11px]">
                {format(group.date, 'EEE')}
              </span>
              <span className="text-lg leading-none font-bold md:text-xl">
                {format(group.date, 'd')}
              </span>
            </div>

            {/* Day info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold md:text-lg">
                  {group.displayName}
                </span>
              </div>
              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <span>
                  {group.workoutCount} session{group.workoutCount !== 1 ? 's' : ''}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  {Object.entries(typeBreakdown)
                    .map(([type, count]) => `${count} ${type}`)
                    .join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Day totals + expand indicator */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Stats - desktop */}
            <div className="hidden items-center gap-3 text-sm lg:flex lg:gap-5">
              <span className="flex items-center gap-1.5">
                <Timer className="text-muted-foreground size-4" />
                <span className="font-medium tabular-nums">
                  {formatDuration(group.totalDuration)}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Flame className="size-4 text-orange-500" />
                <span className="font-medium tabular-nums">
                  {Math.round(group.totalCalories)} cal
                </span>
              </span>
              {group.totalDistance > 0 && (
                <span className="flex items-center gap-1.5">
                  <Route className="size-4 text-blue-500" />
                  <span className="font-medium tabular-nums">
                    {group.totalDistance.toFixed(1)} mi
                  </span>
                </span>
              )}
              {group.avgHr > 0 && (
                <span className="flex items-center gap-1.5">
                  <Heart className="size-4 text-red-500" />
                  <span className="font-medium tabular-nums">{group.avgHr} avg</span>
                </span>
              )}
            </div>

            {/* Expand indicator */}
            <div className={cn(
              'text-muted-foreground/60 transition-transform duration-200',
              expanded && 'rotate-180'
            )}>
              <ChevronDown className="size-5" />
            </div>
          </div>
        </div>

        {/* Mobile totals - inline below header */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs lg:hidden">
          <span className="flex items-center gap-1">
            <Timer className="text-muted-foreground size-3.5" />
            {formatDuration(group.totalDuration)}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="size-3.5 text-orange-500" />
            {Math.round(group.totalCalories)} cal
          </span>
          {group.totalDistance > 0 && (
            <span className="flex items-center gap-1">
              <Route className="size-3.5 text-blue-500" />
              {group.totalDistance.toFixed(1)} mi
            </span>
          )}
          {group.avgHr > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="size-3.5 text-red-500" />
              {group.avgHr} avg
            </span>
          )}
        </div>
      </div>

      {/* Expanded workout list - smooth animation */}
      <div className={cn(
        'grid transition-all duration-200',
        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}>
        <div className="overflow-hidden">
          <div className="space-y-1 px-2 pb-3 md:px-3 md:pb-4">
            {group.workouts.map(workout => (
              <WorkoutRow
                key={workout.id}
                workout={workout}
                onClick={() => onWorkoutClick(workout.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TODAY HERO SECTION (Card-free design)
// ============================================

interface TodayHeroProps {
  workouts: AppleWorkout[]
  metrics: DailyMetrics | null
  onWorkoutClick: (workoutId: string) => void
}

function TodayHero({ workouts, metrics, onWorkoutClick }: TodayHeroProps) {
  const todayWorkouts = workouts.filter(w => isToday(new Date(w.start_date)))
  const totalDuration = todayWorkouts.reduce((sum, w) => sum + w.duration, 0)
  const totalCalories = todayWorkouts.reduce(
    (sum, w) => sum + w.active_calories,
    0
  )
  const totalDistance = todayWorkouts.reduce(
    (sum, w) => sum + (w.distance_miles || 0),
    0
  )

  // Get best stats from today
  const avgHr =
    todayWorkouts.filter(w => w.hr_average).length > 0
      ? Math.round(
          todayWorkouts
            .filter(w => w.hr_average)
            .reduce((sum, w) => sum + w.hr_average!, 0) /
            todayWorkouts.filter(w => w.hr_average).length
        )
      : 0

  return (
    <div className="from-primary/5 rounded-2xl bg-gradient-to-br to-transparent p-5 md:p-6">
      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr]">
        {/* Left: Activity Rings with Legend */}
        <div className="flex items-start gap-5 md:gap-6">
          {metrics && (
            <ActivityRings
              move={metrics.active_calories}
              moveGoal={metrics.move_goal || 500}
              exercise={metrics.exercise_minutes}
              exerciseGoal={metrics.exercise_goal || 30}
              stand={metrics.stand_hours}
              standGoal={metrics.stand_goal || 12}
              size={130}
              showLegend
            />
          )}

          {/* Today header - positioned next to rings on mobile/tablet */}
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold">Today</h2>
            <div className="text-muted-foreground mt-1 text-sm">
              {format(new Date(), 'EEEE, MMMM d')}
            </div>

            {todayWorkouts.length > 0 ? (
              <div className="mt-4">
                <Badge
                  variant="secondary"
                  className="px-3 py-1 text-sm font-medium"
                >
                  {todayWorkouts.length} workout
                  {todayWorkouts.length !== 1 ? 's' : ''} completed
                </Badge>
              </div>
            ) : (
              <div className="text-muted-foreground mt-4 text-sm">
                No workouts yet today
              </div>
            )}
          </div>
        </div>

        {/* Right: Today's workout summary stats */}
        {todayWorkouts.length > 0 && (
          <div className="md:border-l md:border-border/30 md:pl-6">
            <div className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
              Today's Sessions
            </div>
            <div className="flex flex-wrap gap-6 md:gap-8">
              <StatBlock
                icon={<Timer className="size-4 text-blue-500" />}
                label="Duration"
                value={formatDuration(totalDuration)}
              />
              <StatBlock
                icon={<Flame className="size-4 text-orange-500" />}
                label="Calories"
                value={Math.round(totalCalories).toString()}
              />
              {totalDistance > 0 && (
                <StatBlock
                  icon={<Route className="size-4 text-green-500" />}
                  label="Miles"
                  value={totalDistance.toFixed(2)}
                />
              )}
              {avgHr > 0 && (
                <StatBlock
                  icon={<Heart className="size-4 text-red-500" />}
                  label="Avg HR"
                  value={avgHr.toString()}
                  unit="bpm"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Today's workouts - responsive grid */}
      {todayWorkouts.length > 0 && (
        <div className="mt-6 border-t border-border/30 pt-5">
          <div className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <Clock className="size-3.5" />
            Today's Timeline
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {todayWorkouts.map(workout => (
              <TodayWorkoutTile
                key={workout.id}
                workout={workout}
                onClick={() => onWorkoutClick(workout.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Stat block for Today section
interface StatBlockProps {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
}

function StatBlock({ icon, label, value, unit }: StatBlockProps) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums md:text-2xl">
        {value}
        {unit && (
          <span className="text-muted-foreground ml-1 text-sm font-normal">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

// Today's workout tile - cleaner design
interface TodayWorkoutTileProps {
  workout: AppleWorkout
  onClick: () => void
}

function TodayWorkoutTile({ workout, onClick }: TodayWorkoutTileProps) {
  const textColor = WORKOUT_TEXT_COLORS[workout.workout_type] ?? WORKOUT_TEXT_COLORS.other ?? 'text-gray-500'
  const bgColor = WORKOUT_BG_COLORS[workout.workout_type] ?? WORKOUT_BG_COLORS.other ?? 'bg-gray-500/10'
  const borderColor = WORKOUT_BORDER_COLORS[workout.workout_type] ?? WORKOUT_BORDER_COLORS.other ?? 'border-gray-500/40'
  const icon = getWorkoutIcon(workout.workout_type, 'md')
  const label = WORKOUT_LABELS[workout.workout_type] || workout.workout_type
  const isCardio = [
    'running',
    'walking',
    'cycling',
    'rowing',
    'stairClimbing',
    'elliptical',
  ].includes(workout.workout_type)

  return (
    <div
      className={cn(
        'group cursor-pointer rounded-xl p-4 transition-all',
        'border-l-4 hover:bg-muted/40 active:scale-[0.98]',
        bgColor,
        borderColor
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('rounded-lg p-2', bgColor, textColor)}>
            {icon}
          </div>
          <div>
            <div className={cn('text-base font-semibold', textColor)}>{label}</div>
            <div className="text-muted-foreground text-xs">
              {format(new Date(workout.start_date), 'h:mm a')}
            </div>
          </div>
        </div>
        <ChevronRight className="text-muted-foreground/50 size-5 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="flex items-center gap-1.5">
          <Timer className="text-muted-foreground size-3.5" />
          <span className="font-medium">{formatDuration(workout.duration)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Flame className="size-3.5 text-orange-500" />
          <span className="font-medium">{Math.round(workout.active_calories)} cal</span>
        </span>
        {workout.hr_average && (
          <span className="flex items-center gap-1.5">
            <Heart className="size-3.5 text-red-500" />
            <span className="font-medium">{workout.hr_average} bpm</span>
          </span>
        )}
        {isCardio && workout.distance_miles && (
          <span className="flex items-center gap-1.5">
            <Route className="size-3.5 text-blue-500" />
            <span className="font-medium">{workout.distance_miles.toFixed(2)} mi</span>
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================
// WEEKLY STATS SECTION (Responsive: horizontal on mobile, vertical on sidebar)
// ============================================

interface WeeklyStatsSectionProps {
  summary: WeeklySummary
  previousSummary?: WeeklySummary
}

function WeeklyStatsSection({ summary, previousSummary }: WeeklyStatsSectionProps) {
  const getTrend = (current: number, previous: number | undefined) => {
    if (!previous) return null
    const diff = ((current - previous) / previous) * 100
    if (Math.abs(diff) < 1) return null
    return diff
  }

  const workoutTrend = getTrend(
    summary.totalWorkouts,
    previousSummary?.totalWorkouts
  )
  const calorieTrend = getTrend(
    summary.totalCalories,
    previousSummary?.totalCalories
  )
  const distanceTrend = getTrend(
    summary.totalDistanceMiles,
    previousSummary?.totalDistanceMiles
  )

  const stats = [
    {
      label: 'Workouts',
      value: summary.totalWorkouts,
      unit: '',
      trend: workoutTrend,
      icon: <Dumbbell className="size-5 text-purple-500" />,
    },
    {
      label: 'Duration',
      value: summary.totalDurationMin,
      unit: 'min',
      icon: <Timer className="size-5 text-blue-500" />,
    },
    {
      label: 'Calories',
      value: summary.totalCalories.toLocaleString(),
      unit: '',
      trend: calorieTrend,
      icon: <Flame className="size-5 text-orange-500" />,
    },
    {
      label: 'Distance',
      value: summary.totalDistanceMiles.toFixed(1),
      unit: 'mi',
      trend: distanceTrend,
      icon: <Route className="size-5 text-green-500" />,
    },
  ]

  return (
    <div className="rounded-xl bg-muted/30 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground size-4" />
          <span className="font-semibold">This Week</span>
        </div>
        <span className="text-muted-foreground text-sm">
          Week of {format(new Date(summary.weekStart), 'MMM d')}
        </span>
      </div>

      {/* Stats - 4-col grid on mobile/tablet, 2x2 grid on lg sidebar */}
      <div className="grid grid-cols-4 gap-3 lg:grid-cols-2 lg:gap-4">
        {stats.map(stat => (
          <div 
            key={stat.label} 
            className="text-center lg:flex lg:items-center lg:gap-3 lg:rounded-lg lg:bg-background/40 lg:p-3 lg:text-left"
          >
            <div className="mb-2 flex justify-center lg:mb-0 lg:shrink-0">
              {stat.icon}
            </div>
            <div className="lg:min-w-0 lg:flex-1">
              <div className="flex items-center justify-center gap-1 lg:justify-start">
                <span className="text-xl font-bold tabular-nums lg:text-lg">
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="text-muted-foreground text-xs">
                    {stat.unit}
                  </span>
                )}
                {stat.trend && (
                  <span
                    className={cn(
                      'ml-0.5 flex items-center text-xs',
                      stat.trend > 0 ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {stat.trend > 0 ? (
                      <TrendingUp className="size-3.5" />
                    ) : (
                      <TrendingDown className="size-3.5" />
                    )}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Workout type breakdown - wrapping pills */}
      {Object.keys(summary.workoutTypes).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/30 pt-4">
          {Object.entries(summary.workoutTypes).map(([type, count]) => {
            const textColor = WORKOUT_TEXT_COLORS[type] ?? WORKOUT_TEXT_COLORS.other
            return (
              <span
                key={type}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 text-xs font-medium',
                  textColor
                )}
              >
                {WORKOUT_LABELS[type] || type}: {count}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// INSIGHTS PANEL (Health Metrics + Activity Heatmap)
// ============================================

interface InsightsPanelProps {
  dailyMetrics: DailyMetrics[]
  workouts: AppleWorkout[]
}

function InsightsPanel({ dailyMetrics, workouts }: InsightsPanelProps) {
  // Get current and previous metrics for trends
  const currentMetrics = dailyMetrics[0]
  const previousMetrics = dailyMetrics[1]

  // Calculate streak
  const streak = useMemo(() => {
    const workoutDays = new Set(
      workouts.map(w => startOfDay(new Date(w.start_date)).toISOString())
    )
    let count = 0
    const today = startOfDay(new Date())
    
    // Check backwards from today (or yesterday if no workout today yet)
    let checkDate = today
    if (!workoutDays.has(checkDate.toISOString())) {
      checkDate = new Date(checkDate)
      checkDate.setDate(checkDate.getDate() - 1)
    }
    
    while (workoutDays.has(checkDate.toISOString())) {
      count++
      checkDate = new Date(checkDate)
      checkDate.setDate(checkDate.getDate() - 1)
    }
    
    return count
  }, [workouts])

  // Generate activity heatmap data (last 5 weeks)
  const heatmapData = useMemo(() => {
    const weeks: { date: Date; hasWorkout: boolean; count: number }[][] = []
    const workoutCounts = new Map<string, number>()
    
    workouts.forEach(w => {
      const key = startOfDay(new Date(w.start_date)).toISOString()
      workoutCounts.set(key, (workoutCounts.get(key) || 0) + 1)
    })

    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday
    
    // Start from 5 weeks ago, aligned to Sunday
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - currentDay - 28) // Go back 4 full weeks + current partial week
    
    for (let week = 0; week < 5; week++) {
      const weekData: { date: Date; hasWorkout: boolean; count: number }[] = []
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + week * 7 + day)
        const key = startOfDay(date).toISOString()
        const count = workoutCounts.get(key) || 0
        weekData.push({
          date,
          hasWorkout: count > 0,
          count,
        })
      }
      weeks.push(weekData)
    }
    
    return weeks
  }, [workouts])

  // Health metric trend calculation
  const getMetricTrend = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null
    const diff = current - previous
    if (Math.abs(diff) < 0.5) return null
    return diff
  }

  const hrTrend = getMetricTrend(
    currentMetrics?.resting_heart_rate ?? null,
    previousMetrics?.resting_heart_rate ?? null
  )
  const hrvTrend = getMetricTrend(
    currentMetrics?.heart_rate_variability ?? null,
    previousMetrics?.heart_rate_variability ?? null
  )
  const vo2Trend = getMetricTrend(
    currentMetrics?.vo2_max ?? null,
    previousMetrics?.vo2_max ?? null
  )

  return (
    <div className="space-y-4">
      {/* Health Metrics */}
      <div className="rounded-xl bg-muted/30 p-5">
        <div className="mb-4 flex items-center gap-2">
          <HeartPulse className="size-4 text-red-500" />
          <span className="font-semibold">Health Metrics</span>
        </div>

        <div className="space-y-3">
          {/* Resting Heart Rate */}
          {currentMetrics?.resting_heart_rate && (
            <HealthMetricRow
              icon={<Heart className="size-4 text-red-500" />}
              label="Resting HR"
              value={currentMetrics.resting_heart_rate}
              unit="bpm"
              trend={hrTrend}
              trendInverted // Lower HR is better
            />
          )}

          {/* HRV */}
          {currentMetrics?.heart_rate_variability && (
            <HealthMetricRow
              icon={<Activity className="size-4 text-purple-500" />}
              label="HRV"
              value={Math.round(currentMetrics.heart_rate_variability)}
              unit="ms"
              trend={hrvTrend}
            />
          )}

          {/* VO2 Max */}
          {currentMetrics?.vo2_max && (
            <HealthMetricRow
              icon={<Wind className="size-4 text-blue-500" />}
              label="VO2 Max"
              value={currentMetrics.vo2_max.toFixed(1)}
              unit=""
              trend={vo2Trend}
            />
          )}

          {/* Fallback if no health data */}
          {!currentMetrics?.resting_heart_rate && 
           !currentMetrics?.heart_rate_variability && 
           !currentMetrics?.vo2_max && (
            <div className="text-muted-foreground py-4 text-center text-sm">
              No health metrics available
            </div>
          )}
        </div>
      </div>

      {/* Activity Heatmap + Streak */}
      <div className="rounded-xl bg-muted/30 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span className="font-semibold">Activity</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
              <Zap className="size-3" />
              {streak} day streak
            </div>
          )}
        </div>

        {/* Mini Heatmap */}
        <div className="space-y-2">
          {/* Day labels */}
          <div className="mb-1 grid grid-cols-7 gap-1 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <span key={i} className="text-muted-foreground text-[10px]">
                {day}
              </span>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-1">
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIdx) => {
                  const isToday = startOfDay(new Date()).getTime() === startOfDay(day.date).getTime()
                  const isFuture = day.date > new Date()
                  
                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        'aspect-square rounded-sm transition-colors',
                        isFuture && 'bg-transparent',
                        !isFuture && !day.hasWorkout && 'bg-muted/50',
                        !isFuture && day.count === 1 && 'bg-green-500/40',
                        !isFuture && day.count === 2 && 'bg-green-500/60',
                        !isFuture && day.count >= 3 && 'bg-green-500/80',
                        isToday && 'ring-1 ring-primary ring-offset-1 ring-offset-background'
                      )}
                      title={`${format(day.date, 'MMM d')}: ${day.count} workout${day.count !== 1 ? 's' : ''}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              <div className="size-2.5 rounded-sm bg-muted/50" />
              <div className="size-2.5 rounded-sm bg-green-500/40" />
              <div className="size-2.5 rounded-sm bg-green-500/60" />
              <div className="size-2.5 rounded-sm bg-green-500/80" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Health metric row component
interface HealthMetricRowProps {
  icon: React.ReactNode
  label: string
  value: number | string
  unit: string
  trend: number | null
  trendInverted?: boolean // If true, negative trend is good (e.g., lower resting HR)
}

function HealthMetricRow({ icon, label, value, unit, trend, trendInverted }: HealthMetricRowProps) {
  const isGood = trendInverted ? (trend && trend < 0) : (trend && trend > 0)
  const isBad = trendInverted ? (trend && trend > 0) : (trend && trend < 0)

  return (
    <div className="flex items-center justify-between rounded-lg bg-background/40 p-3">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-bold tabular-nums">{value}</span>
        {unit && <span className="text-muted-foreground text-xs">{unit}</span>}
        {trend && (
          <span className={cn(
            'flex items-center text-xs',
            isGood && 'text-green-500',
            isBad && 'text-red-500',
            !isGood && !isBad && 'text-muted-foreground'
          )}>
            {trend > 0 ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================
// WORKOUT INSIGHTS (Full-width historical analysis)
// ============================================

type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'

interface WorkoutInsightsProps {
  workouts: AppleWorkout[]
  onWorkoutClick: (workoutId: string) => void
}

// Time range options
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
]

// Get hex colors for charts
const WORKOUT_HEX_COLORS: Record<string, string> = {
  running: '#22c55e',
  walking: '#60a5fa',
  cycling: '#f97316',
  functionalStrengthTraining: '#a855f7',
  traditionalStrengthTraining: '#a855f7',
  coreTraining: '#ec4899',
  hiit: '#ef4444',
  rowing: '#06b6d4',
  stairClimbing: '#f59e0b',
  elliptical: '#14b8a6',
  other: '#6b7280',
}

function WorkoutInsights({ workouts, onWorkoutClick }: WorkoutInsightsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [volumeMetric, setVolumeMetric] = useState<'duration' | 'distance'>('duration')

  // Get unique workout types from data
  const workoutTypes = useMemo(() => {
    const types = new Set(workouts.map(w => w.workout_type))
    return Array.from(types)
  }, [workouts])

  // Filter workouts by time range
  const filteredWorkouts = useMemo(() => {
    const now = new Date()
    let cutoffDate: Date

    switch (timeRange) {
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '6m':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        cutoffDate = new Date(0)
    }

    return workouts.filter(w => new Date(w.start_date) >= cutoffDate)
  }, [workouts, timeRange])

  // Filter by type if selected
  const typeFilteredWorkouts = useMemo(() => {
    if (selectedType === 'all') return filteredWorkouts
    return filteredWorkouts.filter(w => w.workout_type === selectedType)
  }, [filteredWorkouts, selectedType])

  // Aggregate data for volume chart
  const volumeChartData = useMemo(() => {
    const grouped = new Map<string, Record<string, number>>()
    
    // Determine grouping interval based on time range
    const useWeekly = timeRange === '6m' || timeRange === '1y' || timeRange === 'all'
    
    filteredWorkouts.forEach(w => {
      const date = new Date(w.start_date)
      let key: string
      
      if (useWeekly) {
        // Group by week
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = format(weekStart, 'MMM d')
      } else {
        // Group by day
        key = format(date, 'MMM d')
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, {})
      }
      
      const dayData = grouped.get(key)!
      const type = w.workout_type
      const value = volumeMetric === 'duration' 
        ? w.duration / 60 // Convert to minutes
        : (w.distance_miles || 0)
      
      dayData[type] = (dayData[type] || 0) + value
    })

    // Convert to array and sort by date
    return Array.from(grouped.entries())
      .map(([date, data]) => ({ date, ...data }))
      .slice(-20) // Last 20 data points
  }, [filteredWorkouts, timeRange, volumeMetric])

  // Aggregate data for distribution chart
  const distributionData = useMemo(() => {
    const counts: Record<string, number> = {}
    
    filteredWorkouts.forEach(w => {
      counts[w.workout_type] = (counts[w.workout_type] || 0) + 1
    })

    return Object.entries(counts).map(([type, count]) => ({
      type,
      label: WORKOUT_LABELS[type] || type,
      count,
      color: WORKOUT_HEX_COLORS[type] || WORKOUT_HEX_COLORS.other,
    }))
  }, [filteredWorkouts])

  // Calculate personal records
  const personalRecords = useMemo(() => {
    const records: {
      id: string
      label: string
      value: string
      date: string
      workoutId: string
      icon: React.ReactNode
    }[] = []

    const relevantWorkouts = selectedType === 'all' 
      ? filteredWorkouts 
      : filteredWorkouts.filter(w => w.workout_type === selectedType)

    if (relevantWorkouts.length === 0) return records

    // Fastest pace (running/walking)
    const runningWorkouts = relevantWorkouts.filter(
      w => (w.workout_type === 'running' || w.workout_type === 'walking') && w.pace_best
    )
    if (runningWorkouts.length > 0) {
      const fastest = runningWorkouts.reduce((best, w) => 
        (w.pace_best && (!best.pace_best || w.pace_best < best.pace_best)) ? w : best
      )
      if (fastest.pace_best) {
        records.push({
          id: 'fastest-pace',
          label: 'Fastest Pace',
          value: formatPace(fastest.pace_best) + '/mi',
          date: format(new Date(fastest.start_date), 'MMM d'),
          workoutId: fastest.id,
          icon: <Zap className="size-4 text-amber-500" />,
        })
      }
    }

    // Longest distance
    const distanceWorkouts = relevantWorkouts.filter(w => w.distance_miles && w.distance_miles > 0)
    if (distanceWorkouts.length > 0) {
      const longest = distanceWorkouts.reduce((best, w) => 
        (w.distance_miles && w.distance_miles > (best.distance_miles || 0)) ? w : best
      )
      if (longest.distance_miles) {
        records.push({
          id: 'longest-distance',
          label: 'Longest Distance',
          value: longest.distance_miles.toFixed(2) + ' mi',
          date: format(new Date(longest.start_date), 'MMM d'),
          workoutId: longest.id,
          icon: <Route className="size-4 text-blue-500" />,
        })
      }
    }

    // Highest calories
    const calorieWorkout = relevantWorkouts.reduce((best, w) => 
      w.active_calories > best.active_calories ? w : best
    )
    records.push({
      id: 'most-calories',
      label: 'Most Calories',
      value: Math.round(calorieWorkout.active_calories).toString() + ' cal',
      date: format(new Date(calorieWorkout.start_date), 'MMM d'),
      workoutId: calorieWorkout.id,
      icon: <Flame className="size-4 text-orange-500" />,
    })

    // Longest duration
    const longestDuration = relevantWorkouts.reduce((best, w) => 
      w.duration > best.duration ? w : best
    )
    records.push({
      id: 'longest-duration',
      label: 'Longest Workout',
      value: formatDuration(longestDuration.duration),
      date: format(new Date(longestDuration.start_date), 'MMM d'),
      workoutId: longestDuration.id,
      icon: <Timer className="size-4 text-blue-500" />,
    })

    // Highest effort score (if available)
    const effortWorkouts = relevantWorkouts.filter(w => w.effort_score && w.effort_score > 0)
    if (effortWorkouts.length > 0) {
      const highestEffort = effortWorkouts.reduce((best, w) => 
        (w.effort_score && w.effort_score > (best.effort_score || 0)) ? w : best
      )
      if (highestEffort.effort_score) {
        records.push({
          id: 'highest-effort',
          label: 'Highest Effort',
          value: highestEffort.effort_score.toFixed(1) + '/10',
          date: format(new Date(highestEffort.start_date), 'MMM d'),
          workoutId: highestEffort.id,
          icon: <Target className="size-4 text-red-500" />,
        })
      }
    }

    return records.slice(0, 4) // Max 4 records
  }, [filteredWorkouts, selectedType])

  // Performance trend data
  const performanceData = useMemo(() => {
    // Group workouts and calculate averages
    const grouped = new Map<string, { hr: number[]; pace: number[]; calories: number[] }>()
    
    const useWeekly = timeRange === '6m' || timeRange === '1y' || timeRange === 'all'
    
    typeFilteredWorkouts.forEach(w => {
      const date = new Date(w.start_date)
      let key: string
      
      if (useWeekly) {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = format(weekStart, 'MMM d')
      } else {
        key = format(date, 'MMM d')
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, { hr: [], pace: [], calories: [] })
      }
      
      const dayData = grouped.get(key)!
      if (w.hr_average) dayData.hr.push(w.hr_average)
      if (w.pace_average && w.pace_average > 0 && w.pace_average < 30) {
        dayData.pace.push(w.pace_average)
      }
      dayData.calories.push(w.active_calories / (w.duration / 60)) // cal/min
    })

    return Array.from(grouped.entries())
      .map(([date, data]) => ({
        date,
        avgHr: data.hr.length > 0 
          ? Math.round(data.hr.reduce((a, b) => a + b, 0) / data.hr.length) 
          : null,
        avgPace: data.pace.length > 0 
          ? data.pace.reduce((a, b) => a + b, 0) / data.pace.length 
          : null,
        calPerMin: data.calories.length > 0 
          ? Math.round(data.calories.reduce((a, b) => a + b, 0) / data.calories.length * 10) / 10
          : null,
      }))
      .slice(-20)
  }, [typeFilteredWorkouts, timeRange])

  // Chart config for volume chart
  const volumeChartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    workoutTypes.forEach(type => {
      config[type] = {
        label: WORKOUT_LABELS[type] || type,
        color: WORKOUT_HEX_COLORS[type] || WORKOUT_HEX_COLORS.other,
      }
    })
    return config
  }, [workoutTypes])

  // Chart config for performance
  const performanceChartConfig: ChartConfig = {
    avgHr: { label: 'Avg HR', color: '#ef4444' },
    avgPace: { label: 'Avg Pace', color: '#22c55e' },
    calPerMin: { label: 'Cal/min', color: '#f97316' },
  }

  const totalWorkouts = filteredWorkouts.length

  if (workouts.length === 0) return null

  return (
    <div className="mt-8 space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-2 border-b border-border/30 pb-4">
        <Activity className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Workout Insights</h2>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 rounded-xl bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Time Range Selector */}
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Period</span>
          <div className="flex rounded-lg bg-background/60 p-1">
            {TIME_RANGES.map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  timeRange === range.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider - visible on larger screens */}
        <div className="hidden h-8 w-px bg-border/50 sm:block" />

        {/* Workout Type Filter */}
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Type</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                selectedType === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground'
              )}
            >
              All
            </button>
            {workoutTypes.map(type => {
              const textColor = WORKOUT_TEXT_COLORS[type] ?? WORKOUT_TEXT_COLORS.other
              const bgColor = WORKOUT_BG_COLORS[type] ?? WORKOUT_BG_COLORS.other
              const isSelected = selectedType === type
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                    isSelected
                      ? cn(bgColor, textColor, 'shadow-sm')
                      : 'bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground'
                  )}
                >
                  {WORKOUT_LABELS[type] || type}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Volume Chart - spans 2 columns */}
        <div className="rounded-xl bg-muted/30 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Volume Over Time</h3>
            <div className="flex rounded-lg bg-background/50 p-0.5">
              <button
                onClick={() => setVolumeMetric('duration')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                  volumeMetric === 'duration'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Duration
              </button>
              <button
                onClick={() => setVolumeMetric('distance')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                  volumeMetric === 'distance'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Distance
              </button>
            </div>
          </div>

          {volumeChartData.length > 0 ? (
            <ChartContainer config={volumeChartConfig} className="h-[200px] w-full">
              <BarChart data={volumeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  width={35}
                  tickFormatter={(v) => volumeMetric === 'duration' ? `${v}m` : `${v}mi`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                />
                {workoutTypes.map(type => (
                  <Bar
                    key={type}
                    dataKey={type}
                    stackId="volume"
                    fill={WORKOUT_HEX_COLORS[type] || WORKOUT_HEX_COLORS.other}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
              No data for selected period
            </div>
          )}
        </div>

        {/* Distribution Chart */}
        <div className="rounded-xl bg-muted/30 p-5">
          <h3 className="mb-4 font-semibold">Distribution</h3>
          
          {distributionData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ChartContainer config={{}} className="h-[140px] w-full">
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                    onClick={(data) => setSelectedType(data.type)}
                    className="cursor-pointer"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="transparent"
                        opacity={selectedType === 'all' || selectedType === entry.type ? 1 : 0.3}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                </PieChart>
              </ChartContainer>
              
              {/* Center stat */}
              <div className="-mt-[100px] mb-8 text-center">
                <div className="text-2xl font-bold">{totalWorkouts}</div>
                <div className="text-muted-foreground text-xs">workouts</div>
              </div>

              {/* Legend */}
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {distributionData.slice(0, 5).map(item => (
                  <button
                    key={item.type}
                    onClick={() => setSelectedType(item.type === selectedType ? 'all' : item.type)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] transition-all',
                      selectedType === item.type ? 'bg-background/80 ring-1 ring-border' : 'hover:bg-background/50'
                    )}
                  >
                    <div 
                      className="size-2 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
              No data
            </div>
          )}
        </div>

        {/* Performance Trends - spans 2 columns */}
        <div className="rounded-xl bg-muted/30 p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Performance Trends</h3>
          
          {performanceData.length > 0 && performanceData.some(d => d.avgHr || d.calPerMin) ? (
            <ChartContainer config={performanceChartConfig} className="h-[180px] w-full">
              <LineChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  yAxisId="hr"
                  orientation="left"
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  width={35}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <YAxis 
                  yAxisId="cal"
                  orientation="right"
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  yAxisId="hr"
                  type="monotone" 
                  dataKey="avgHr" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line 
                  yAxisId="cal"
                  type="monotone" 
                  dataKey="calPerMin" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">
              No performance data for selected filters
            </div>
          )}
          
          {/* Legend */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded bg-red-500" />
              <span className="text-muted-foreground">Avg HR (bpm)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded bg-orange-500" />
              <span className="text-muted-foreground">Cal/min</span>
            </div>
          </div>
        </div>

        {/* Personal Records */}
        <div className="rounded-xl bg-muted/30 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <h3 className="font-semibold">Personal Records</h3>
          </div>
          
          {personalRecords.length > 0 ? (
            <div className="space-y-2">
              {personalRecords.map(record => (
                <button
                  key={record.id}
                  onClick={() => onWorkoutClick(record.workoutId)}
                  className="flex w-full items-center justify-between rounded-lg bg-background/40 p-3 text-left transition-all hover:bg-background/60"
                >
                  <div className="flex items-center gap-3">
                    {record.icon}
                    <div>
                      <div className="text-sm font-medium">{record.label}</div>
                      <div className="text-muted-foreground text-xs">{record.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">{record.value}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-[150px] items-center justify-center text-muted-foreground text-sm">
              No records yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

interface FitnessDashboardProps {
  workouts: AppleWorkout[]
  dailyMetrics: DailyMetrics[]
  weeklySummary: WeeklySummary[]
  onWorkoutClick: (workoutId: string) => void
  className?: string
}

export function FitnessDashboard({
  workouts,
  dailyMetrics,
  weeklySummary,
  onWorkoutClick,
  className,
}: FitnessDashboardProps) {
  const dayGroups = useMemo(() => groupWorkoutsByDay(workouts), [workouts])
  const todayMetrics = dailyMetrics[0] ?? null
  const otherGroups = dayGroups.filter(g => !isToday(g.date))

  return (
    <div className={cn('', className)}>
      {/* Mobile: stacked layout | Desktop: two columns */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Main Column - Today + Recent Days */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Today Hero Section */}
          <TodayHero
            workouts={workouts}
            metrics={todayMetrics}
            onWorkoutClick={onWorkoutClick}
          />

          {/* Weekly Stats + Insights - visible on mobile only */}
          <div className="space-y-4 lg:hidden">
            {weeklySummary[0] && (
              <WeeklyStatsSection
                summary={weeklySummary[0]}
                previousSummary={weeklySummary[1]}
              />
            )}
            <InsightsPanel
              dailyMetrics={dailyMetrics}
              workouts={workouts}
            />
          </div>

          {/* Recent Days - scrollable container */}
          {otherGroups.length > 0 && (
            <div>
              <h3 className="text-muted-foreground mb-3 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider">
                <Calendar className="size-4" />
                Recent Days
              </h3>
              <div className="max-h-[500px] overflow-y-auto rounded-xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                <div className="divide-y divide-border/30 bg-muted/20">
                  {otherGroups.map((group, idx) => (
                    <DayGroupSection
                      key={group.dateKey}
                      group={group}
                      onWorkoutClick={onWorkoutClick}
                      defaultExpanded={idx === 0}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Weekly Stats + Insights (desktop only, sticky) */}
        <div className="hidden w-[340px] shrink-0 lg:block xl:w-[380px]">
          <div className="sticky top-4 space-y-4">
            {weeklySummary[0] && (
              <WeeklyStatsSection
                summary={weeklySummary[0]}
                previousSummary={weeklySummary[1]}
              />
            )}
            <InsightsPanel
              dailyMetrics={dailyMetrics}
              workouts={workouts}
            />
          </div>
        </div>
      </div>

      {/* Historical Insights - Full Width */}
      {workouts.length > 0 && (
        <WorkoutInsights
          workouts={workouts}
          onWorkoutClick={onWorkoutClick}
        />
      )}

      {/* Empty state - cleaner design */}
      {workouts.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border/50 py-16 text-center">
          <Watch className="text-muted-foreground/30 mx-auto mb-4 size-16" />
          <h3 className="mb-2 text-lg font-semibold">No workouts yet</h3>
          <p className="text-muted-foreground text-sm">
            Complete a workout with PeteWatch to see it here
          </p>
        </div>
      )}
    </div>
  )
}

export default FitnessDashboard

// ============================================
// COMPACT TODAY'S ACTIVITY BAR (for embedding in main fitness page)
// ============================================

interface TodayActivityBarProps {
  workouts: AppleWorkout[]
  metrics: DailyMetrics | null
  onWorkoutClick?: (workoutId: string) => void
  onViewAll?: () => void
  className?: string
}

export function TodayActivityBar({
  workouts,
  metrics,
  onWorkoutClick,
  onViewAll,
  className,
}: TodayActivityBarProps) {
  const todayWorkouts = workouts.filter(w => isToday(new Date(w.start_date)))
  const totalDuration = todayWorkouts.reduce((sum, w) => sum + w.duration, 0)
  const totalCalories = todayWorkouts.reduce(
    (sum, w) => sum + w.active_calories,
    0
  )
  const totalDistance = todayWorkouts.reduce(
    (sum, w) => sum + (w.distance_miles || 0),
    0
  )

  // Activity ring progress
  const moveProgress = metrics
    ? Math.min(
        (metrics.active_calories / (metrics.move_goal || 500)) * 100,
        100
      )
    : 0
  const exerciseProgress = metrics
    ? Math.min(
        (metrics.exercise_minutes / (metrics.exercise_goal || 30)) * 100,
        100
      )
    : 0
  const standProgress = metrics
    ? Math.min((metrics.stand_hours / (metrics.stand_goal || 12)) * 100, 100)
    : 0

  if (todayWorkouts.length === 0 && !metrics) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl bg-muted/30 p-3',
        className
      )}
    >
      {/* Mini Activity Rings */}
      {metrics && (
        <div className="flex items-center gap-3 border-r border-border/30 pr-3">
          <MiniActivityRings
            move={moveProgress}
            exercise={exerciseProgress}
            stand={standProgress}
            size={40}
          />
          <div className="hidden flex-col gap-0.5 text-[10px] sm:flex">
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[#FF2D55]" />
              <span className="text-muted-foreground">
                {metrics.active_calories}/{metrics.move_goal || 500}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[#92E82A]" />
              <span className="text-muted-foreground">
                {metrics.exercise_minutes}/{metrics.exercise_goal || 30}m
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[#00D4FF]" />
              <span className="text-muted-foreground">
                {metrics.stand_hours}/{metrics.stand_goal || 12}h
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Today's workouts summary */}
      {todayWorkouts.length > 0 ? (
        <>
          <div className="flex items-center gap-2 border-r border-border/30 pr-3">
            <div className="text-center">
              <div className="text-lg leading-none font-bold">
                {todayWorkouts.length}
              </div>
              <div className="text-muted-foreground text-[9px]">Workouts</div>
            </div>
          </div>

          {/* Workout pills - cleaner design */}
          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {todayWorkouts.slice(0, 4).map(workout => {
              const textColor = WORKOUT_TEXT_COLORS[workout.workout_type] ?? WORKOUT_TEXT_COLORS.other
              const bgColor = WORKOUT_BG_COLORS[workout.workout_type] ?? WORKOUT_BG_COLORS.other
              const borderColor = WORKOUT_BORDER_COLORS[workout.workout_type] ?? WORKOUT_BORDER_COLORS.other
              const icon = getWorkoutIcon(workout.workout_type, 'sm')
              const label = WORKOUT_LABELS[workout.workout_type] || workout.workout_type

              return (
                <button
                  key={workout.id}
                  onClick={() => onWorkoutClick?.(workout.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border-l-2 px-2.5 py-1.5 text-xs whitespace-nowrap transition-all hover:bg-muted/50',
                    bgColor,
                    borderColor,
                    onWorkoutClick && 'cursor-pointer'
                  )}
                >
                  <span className={textColor}>{icon}</span>
                  <span className={cn('font-medium', textColor)}>{label}</span>
                  <span className="text-muted-foreground hidden sm:inline">
                    {formatDuration(workout.duration)}
                  </span>
                </button>
              )
            })}
            {todayWorkouts.length > 4 && (
              <Badge variant="secondary" className="text-[10px]">
                +{todayWorkouts.length - 4} more
              </Badge>
            )}
          </div>

          {/* Totals */}
          <div className="hidden items-center gap-4 border-l border-border/30 pl-3 text-xs md:flex">
            <div className="flex items-center gap-1">
              <Timer className="text-muted-foreground size-3.5" />
              <span className="font-medium">
                {formatDuration(totalDuration)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Flame className="size-3.5 text-orange-500" />
              <span className="font-medium">{Math.round(totalCalories)}</span>
            </div>
            {totalDistance > 0 && (
              <div className="flex items-center gap-1">
                <Route className="size-3.5 text-green-500" />
                <span className="font-medium">
                  {totalDistance.toFixed(1)} mi
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-muted-foreground flex-1 text-xs">
          No workouts recorded today
        </div>
      )}

      {/* View All */}
      {onViewAll && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={onViewAll}
        >
          <Watch className="mr-1 size-3.5" />
          Details
          <ChevronRight className="ml-0.5 size-3" />
        </Button>
      )}
    </div>
  )
}

// Mini Activity Rings for compact display
interface MiniActivityRingsProps {
  move: number
  exercise: number
  stand: number
  size?: number
}

function MiniActivityRings({
  move,
  exercise,
  stand,
  size = 40,
}: MiniActivityRingsProps) {
  const strokeWidth = size * 0.12
  const radius = (size - strokeWidth) / 2

  const rings = [
    { progress: move, color: '#FF2D55' },
    { progress: exercise, color: '#92E82A' },
    { progress: stand, color: '#00D4FF' },
  ]

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 transform">
        {rings.map((ring, i) => {
          const r = radius - i * strokeWidth * 1.3
          const c = 2 * Math.PI * r
          const offset = c - (ring.progress / 100) * c

          return (
            <g key={i}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeOpacity={0.2}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
