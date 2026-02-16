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
    AlertCircle,
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
    Zap
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
  elevation_gain_meters: number | null
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
  // Indoor/outdoor flag
  is_indoor: boolean | null
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
  recorded_at?: string
}

export interface SyncMetadata {
  lastSyncTimestamp: string | null
  totalDays?: number
  dateRange?: {
    start: string
    end: string
  }
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
    hiking: <Footprints className={sizeClass} />,
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
  hiking: <Footprints className="size-5" />,
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
  hiking: 'text-emerald-400',
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
  hiking: 'bg-emerald-400/10',
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
  hiking: 'border-emerald-400/60',
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
  hiking: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
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
  hiking: 'Hike',
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

// Hex colors for charts
const WORKOUT_HEX_COLORS: Record<string, string> = {
  running: '#22c55e',
  walking: '#60a5fa',
  hiking: '#34d399',
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

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return format(date, 'MMM d')
}

function isSyncStale(timestamp: string | null, thresholdHours: number = 6): boolean {
  if (!timestamp) return true
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours > thresholdHours
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
// SYNC STATUS INDICATOR
// ============================================

interface SyncStatusIndicatorProps {
  lastSyncTimestamp: string | null
  staleThresholdHours?: number
  className?: string
}

function SyncStatusIndicator({
  lastSyncTimestamp,
  staleThresholdHours = 6,
  className,
}: SyncStatusIndicatorProps) {
  const isStale = isSyncStale(lastSyncTimestamp, staleThresholdHours)
  const timeDisplay = lastSyncTimestamp
    ? formatRelativeTime(lastSyncTimestamp)
    : 'never'

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs',
        isStale ? 'text-amber-500' : 'text-muted-foreground',
        className
      )}
    >
      {isStale ? (
        <AlertCircle className="size-3.5 animate-pulse" />
      ) : (
        <Watch className="size-3.5" />
      )}
      <span>
        {isStale ? 'Stale data' : 'Synced'} {timeDisplay}
      </span>
    </div>
  )
}

// ============================================
// WEEKLY PROGRESS (Merged rings + streaks)
// ============================================

interface WeeklyProgressProps {
  dailyMetrics: DailyMetrics[]
  className?: string
}

function WeeklyProgress({ dailyMetrics, className }: WeeklyProgressProps) {
  // Get last 7 days of data
  const last7Days = useMemo(() => {
    const days: Array<{
      date: Date
      dateStr: string
      dayLabel: string
      metrics: DailyMetrics | null
      moveComplete: boolean
      exerciseComplete: boolean
      standComplete: boolean
      ringsComplete: number
    }> = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Yest' : format(date, 'EEE')
      const metrics = dailyMetrics.find(m => m.date === dateStr) || null

      const moveGoal = metrics?.move_goal || 500
      const exerciseGoal = metrics?.exercise_goal || 30
      const standGoal = metrics?.stand_goal || 12

      const moveComplete = metrics ? metrics.active_calories >= moveGoal : false
      const exerciseComplete = metrics ? metrics.exercise_minutes >= exerciseGoal : false
      const standComplete = metrics ? metrics.stand_hours >= standGoal : false

      days.push({
        date,
        dateStr,
        dayLabel,
        metrics,
        moveComplete,
        exerciseComplete,
        standComplete,
        ringsComplete: [moveComplete, exerciseComplete, standComplete].filter(Boolean).length,
      })
    }

    return days
  }, [dailyMetrics])

  const perfectDays = last7Days.filter(day => day.ringsComplete === 3).length

  // Streak calculations
  const streakData = useMemo(() => {
    const sortedMetrics = [...dailyMetrics].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const calculateStreak = (
      checkFn: (m: DailyMetrics) => boolean
    ): { current: number; best: number } => {
      let longestStreak = 0
      let tempStreak = 0

      sortedMetrics.forEach(m => {
        const metricDate = new Date(m.date)
        metricDate.setHours(0, 0, 0, 0)
        if (metricDate > today) return
        if (checkFn(m)) {
          tempStreak++
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          tempStreak = 0
        }
      })

      let currentStreak = 0
      for (let i = sortedMetrics.length - 1; i >= 0; i--) {
        const m = sortedMetrics[i]
        if (!m) continue
        const metricDate = new Date(m.date)
        metricDate.setHours(0, 0, 0, 0)
        if (metricDate > today) continue
        if (checkFn(m)) currentStreak++
        else break
      }

      return { current: currentStreak, best: longestStreak }
    }

    return {
      move: calculateStreak(m => m.active_calories >= (m.move_goal || 500)),
      exercise: calculateStreak(m => m.exercise_minutes >= (m.exercise_goal || 30)),
      stand: calculateStreak(m => m.stand_hours >= (m.stand_goal || 12)),
    }
  }, [dailyMetrics])

  const streaks = [
    { name: 'Move', color: '#FF2D55', ...streakData.move },
    { name: 'Exercise', color: '#92E82A', ...streakData.exercise },
    { name: 'Stand', color: '#00D4FF', ...streakData.stand },
  ]

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card p-3', className)}>
      <div className="flex items-center gap-4">
        {/* 7-day ring row - compact */}
        <div className="flex flex-1 justify-between gap-1">
          {last7Days.map(day => (
            <div
              key={day.dateStr}
              className="flex flex-col items-center gap-0.5"
            >
              <MiniActivityRings
                move={day.metrics?.active_calories || 0}
                moveGoal={day.metrics?.move_goal || 500}
                exercise={day.metrics?.exercise_minutes || 0}
                exerciseGoal={day.metrics?.exercise_goal || 30}
                stand={day.metrics?.stand_hours || 0}
                standGoal={day.metrics?.stand_goal || 12}
                size={28}
              />
              <span className={cn(
                'text-[9px]',
                day.ringsComplete === 3
                  ? 'font-medium text-green-500'
                  : 'text-muted-foreground'
              )}>
                {day.dayLabel}
              </span>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-border/30" />

        {/* Streaks inline */}
        <div className="flex items-center gap-3">
          {streaks.map(streak => (
            <div key={streak.name} className="flex items-center gap-1.5 text-[11px]">
              <div
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: streak.color }}
              />
              <span className="font-bold tabular-nums" style={{ color: streak.color }}>
                {streak.current}
              </span>
              <span className="text-muted-foreground">
                / {streak.best}
              </span>
            </div>
          ))}
        </div>

        {/* Perfect days badge */}
        {perfectDays > 0 && (
          <>
            <div className="h-8 w-px bg-border/30" />
            <div className="flex items-center gap-1 text-[11px]">
              <Sparkles className="size-3 text-green-500" />
              <span className="font-medium text-green-500">{perfectDays}</span>
              <span className="text-muted-foreground hidden sm:inline">perfect</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// MONTHLY RING CALENDAR
// ============================================

interface MonthlyRingCalendarProps {
  dailyMetrics: DailyMetrics[]
  className?: string
}

function MonthlyRingCalendar({ dailyMetrics, className }: MonthlyRingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Generate calendar data for the current month
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday

    // Create a map of date -> metrics for quick lookup
    const metricsMap = new Map<string, DailyMetrics>()
    dailyMetrics.forEach(m => metricsMap.set(m.date, m))

    const weeks: Array<Array<{
      date: Date | null
      dateStr: string | null
      dayNum: number | null
      metrics: DailyMetrics | null
      ringsComplete: number
      isToday: boolean
      isFuture: boolean
    }>> = []

    let currentWeek: typeof weeks[0] = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({
        date: null,
        dateStr: null,
        dayNum: null,
        metrics: null,
        ringsComplete: 0,
        isToday: false,
        isFuture: false,
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = format(date, 'yyyy-MM-dd')
      const metrics = metricsMap.get(dateStr) || null
      const isTodayDate = date.getTime() === today.getTime()
      const isFuture = date.getTime() > today.getTime()

      let ringsComplete = 0
      if (metrics) {
        const moveGoal = metrics.move_goal || 500
        const exerciseGoal = metrics.exercise_goal || 30
        const standGoal = metrics.stand_goal || 12
        if (metrics.active_calories >= moveGoal) ringsComplete++
        if (metrics.exercise_minutes >= exerciseGoal) ringsComplete++
        if (metrics.stand_hours >= standGoal) ringsComplete++
      }

      currentWeek.push({
        date,
        dateStr,
        dayNum: day,
        metrics,
        ringsComplete,
        isToday: isTodayDate,
        isFuture,
      })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    // Add empty cells for remaining days
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push({
        date: null,
        dateStr: null,
        dayNum: null,
        metrics: null,
        ringsComplete: 0,
        isToday: false,
        isFuture: false,
      })
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
  }, [currentMonth, dailyMetrics])

  // Stats for the month
  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let perfectDays = 0
    let totalDaysWithData = 0
    let totalRingsClosed = 0

    dailyMetrics.forEach(m => {
      const date = new Date(m.date)
      if (date.getFullYear() === year && date.getMonth() === month && date <= today) {
        totalDaysWithData++
        const moveGoal = m.move_goal || 500
        const exerciseGoal = m.exercise_goal || 30
        const standGoal = m.stand_goal || 12
        let rings = 0
        if (m.active_calories >= moveGoal) rings++
        if (m.exercise_minutes >= exerciseGoal) rings++
        if (m.stand_hours >= standGoal) rings++
        totalRingsClosed += rings
        if (rings === 3) perfectDays++
      }
    })

    return { perfectDays, totalDaysWithData, totalRingsClosed }
  }, [currentMonth, dailyMetrics])

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    const today = new Date()
    if (nextMonth <= today) {
      setCurrentMonth(nextMonth)
    }
  }

  const canGoNext = useMemo(() => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    return nextMonth <= new Date()
  }, [currentMonth])

  const getRingColorClass = (ringsComplete: number, isFuture: boolean): string => {
    if (isFuture) return 'bg-muted/20'
    switch (ringsComplete) {
      case 0: return 'bg-muted/30'
      case 1: return 'bg-amber-500/30'
      case 2: return 'bg-lime-500/40'
      case 3: return 'bg-green-500/50'
      default: return 'bg-muted/30'
    }
  }

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card p-3', className)}>
      {/* Header with month navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="rounded-md p-0.5 hover:bg-muted"
        >
          <ChevronDown className="size-4 rotate-90" />
        </button>
        <h3 className="text-xs font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={goToNextMonth}
          disabled={!canGoNext}
          className={cn(
            'rounded-md p-0.5',
            canGoNext ? 'hover:bg-muted' : 'opacity-30 cursor-not-allowed'
          )}
        >
          <ChevronDown className="size-4 -rotate-90" />
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid gap-1">
        {calendarData.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-md text-xs transition-colors',
                  day.dayNum !== null && getRingColorClass(day.ringsComplete, day.isFuture),
                  day.isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                  day.ringsComplete === 3 && !day.isFuture && 'font-medium text-green-700 dark:text-green-300'
                )}
                title={day.dateStr ? `${day.dateStr}: ${day.ringsComplete}/3 rings` : undefined}
              >
                {day.dayNum}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend and stats */}
      <div className="mt-2 flex items-center justify-between border-t border-border/30 pt-2">
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="flex items-center gap-0.5">
            <div className="size-2 rounded-sm bg-muted/30" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="size-2 rounded-sm bg-amber-500/30" />
            <span>1</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="size-2 rounded-sm bg-lime-500/40" />
            <span>2</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="size-2 rounded-sm bg-green-500/50" />
            <span>3</span>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {monthStats.perfectDays} perfect
        </div>
      </div>
    </div>
  )
}

// ============================================
// MONTH SNAPSHOT (Replaces plain calendar sidebar)
// ============================================

interface MonthSnapshotProps {
  workouts: AppleWorkout[]
  dailyMetrics: DailyMetrics[]
  onWorkoutClick: (workoutId: string) => void
}

function MonthSnapshot({ workouts, dailyMetrics, onWorkoutClick }: MonthSnapshotProps) {
  const now = new Date()
  const currentMonthNum = now.getMonth()
  const currentYear = now.getFullYear()
  const todayDate = now.getDate()

  // Month workouts
  const monthWorkouts = useMemo(() => {
    return workouts.filter(w => {
      const d = new Date(w.start_date)
      return d.getMonth() === currentMonthNum && d.getFullYear() === currentYear
    })
  }, [workouts, currentMonthNum, currentYear])

  // Month metrics
  const monthMetrics = useMemo(() => {
    return dailyMetrics.filter(m => {
      const d = new Date(m.date)
      return d.getMonth() === currentMonthNum && d.getFullYear() === currentYear
    })
  }, [dailyMetrics, currentMonthNum, currentYear])

  // Type distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    monthWorkouts.forEach(w => {
      const label = WORKOUT_LABELS[w.workout_type] || w.workout_type
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [monthWorkouts])

  const totalMonthWorkouts = monthWorkouts.length

  // Month totals
  const monthTotals = useMemo(() => {
    const totalDuration = monthWorkouts.reduce((s, w) => s + w.duration, 0)
    const totalCalories = monthWorkouts.reduce((s, w) => s + w.active_calories, 0)
    const totalDistance = monthWorkouts.reduce((s, w) => s + (w.distance_miles || 0), 0)
    return { totalDuration, totalCalories, totalDistance }
  }, [monthWorkouts])

  // Active days + consistency
  const activeDays = useMemo(() => {
    const days = new Set(monthWorkouts.map(w => format(new Date(w.start_date), 'yyyy-MM-dd')))
    return days.size
  }, [monthWorkouts])

  // Ring stats this month
  const monthRingStats = useMemo(() => {
    let perfect = 0
    monthMetrics.forEach(m => {
      const mc = m.active_calories >= (m.move_goal || 500)
      const ec = m.exercise_minutes >= (m.exercise_goal || 30)
      const sc = m.stand_hours >= (m.stand_goal || 12)
      if (mc && ec && sc) perfect++
    })
    return { perfect }
  }, [monthMetrics])

  // Day-by-day heatmap (compact GitHub-style grid)
  const dayGrid = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonthNum + 1, 0).getDate()
    const workoutsByDay = new Map<number, number>()
    monthWorkouts.forEach(w => {
      const day = new Date(w.start_date).getDate()
      workoutsByDay.set(day, (workoutsByDay.get(day) || 0) + 1)
    })
    const grid: Array<{ day: number; count: number; isToday: boolean; isFuture: boolean }> = []
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({
        day: d,
        count: workoutsByDay.get(d) || 0,
        isToday: d === todayDate,
        isFuture: d > todayDate,
      })
    }
    return grid
  }, [currentYear, currentMonthNum, todayDate, monthWorkouts])

  // Best day
  const bestDay = useMemo(() => {
    if (monthWorkouts.length === 0) return null
    const dayMap = new Map<string, { date: string; count: number; calories: number; duration: number }>()
    monthWorkouts.forEach(w => {
      const dateStr = format(new Date(w.start_date), 'yyyy-MM-dd')
      const existing = dayMap.get(dateStr) || { date: dateStr, count: 0, calories: 0, duration: 0 }
      existing.count++
      existing.calories += w.active_calories
      existing.duration += w.duration
      dayMap.set(dateStr, existing)
    })
    return Array.from(dayMap.values()).sort((a, b) => b.calories - a.calories)[0] || null
  }, [monthWorkouts])

  const consistencyPct = todayDate > 0 ? Math.round((activeDays / todayDate) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="rounded-xl border border-border/50 bg-card p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-semibold">{format(now, 'MMMM yyyy')}</h3>
          <span className="text-[10px] text-muted-foreground">{totalMonthWorkouts} workouts</span>
        </div>

        {/* Day heatmap grid - compact */}
        <div className="mb-3 flex flex-wrap gap-[3px]">
          {dayGrid.map(d => (
            <div
              key={d.day}
              className={cn(
                'flex size-[18px] items-center justify-center rounded-[3px] text-[8px] transition-colors',
                d.isFuture && 'bg-muted/15 text-muted-foreground/30',
                !d.isFuture && d.count === 0 && 'bg-muted/30 text-muted-foreground/50',
                !d.isFuture && d.count === 1 && 'bg-green-500/30 text-green-300',
                !d.isFuture && d.count === 2 && 'bg-green-500/50 text-green-200',
                !d.isFuture && d.count >= 3 && 'bg-green-500/70 text-green-100 font-medium',
                d.isToday && 'ring-1 ring-primary ring-offset-1 ring-offset-background',
              )}
              title={`${format(new Date(currentYear, currentMonthNum, d.day), 'MMM d')}: ${d.count} workout${d.count !== 1 ? 's' : ''}`}
            >
              {d.day}
            </div>
          ))}
        </div>

        {/* Consistency + Perfect days */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted/40">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-green-500 transition-all"
                style={{ width: `${consistencyPct}%` }}
              />
            </div>
            <span className="font-bold tabular-nums text-green-500">{consistencyPct}%</span>
            <span className="text-muted-foreground text-[10px]">active</span>
          </div>
          {monthRingStats.perfect > 0 && (
            <>
              <div className="h-3 w-px bg-border/30" />
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 text-amber-500" />
                <span className="font-bold tabular-nums text-amber-500">{monthRingStats.perfect}</span>
                <span className="text-muted-foreground text-[10px]">perfect</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Month totals */}
      <div className="rounded-xl border border-border/50 bg-card p-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">This Month</h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-bold tabular-nums">{formatDuration(monthTotals.totalDuration)}</div>
            <div className="text-[9px] text-muted-foreground">Duration</div>
          </div>
          <div>
            <div className="text-sm font-bold tabular-nums text-orange-500">{Math.round(monthTotals.totalCalories).toLocaleString()}</div>
            <div className="text-[9px] text-muted-foreground">Calories</div>
          </div>
          <div>
            <div className="text-sm font-bold tabular-nums text-green-500">{monthTotals.totalDistance.toFixed(1)}</div>
            <div className="text-[9px] text-muted-foreground">Miles</div>
          </div>
        </div>
      </div>

      {/* Workout type breakdown */}
      {typeDistribution.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Breakdown</h4>
          <div className="space-y-1.5">
            {typeDistribution.map(([type, count]) => {
              const pct = totalMonthWorkouts > 0 ? (count / totalMonthWorkouts) * 100 : 0
              // Find the original type key for color lookup
              const typeKey = Object.entries(WORKOUT_LABELS).find(([, v]) => v === type)?.[0] || 'other'
              const hexColor = WORKOUT_HEX_COLORS[typeKey] || WORKOUT_HEX_COLORS.other || '#6b7280'
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="w-16 truncate text-[10px] text-muted-foreground">{type}</span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: hexColor }}
                    />
                  </div>
                  <span className="w-5 text-right text-[10px] font-medium tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Best day callout */}
      {bestDay && (
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Best Day</h4>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">{format(new Date(bestDay.date), 'EEEE, MMM d')}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{bestDay.count} workout{bestDay.count !== 1 ? 's' : ''}</span>
                <span className="text-orange-500 font-medium">{Math.round(bestDay.calories)} cal</span>
                <span>{formatDuration(bestDay.duration)}</span>
              </div>
            </div>
            <Zap className="size-4 text-amber-500" />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// RING STREAKS
// ============================================

interface RingStreaksProps {
  dailyMetrics: DailyMetrics[]
  className?: string
}

interface StreakData {
  current: number
  longest: number
  completionPercent: number
}

function RingStreaks({ dailyMetrics, className }: RingStreaksProps) {
  const streakData = useMemo(() => {
    // Sort metrics by date ascending
    const sortedMetrics = [...dailyMetrics].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const calculateStreak = (
      checkFn: (m: DailyMetrics) => boolean
    ): StreakData => {
      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 0
      let completedDays = 0

      // Calculate streaks and completion
      sortedMetrics.forEach(m => {
        const metricDate = new Date(m.date)
        metricDate.setHours(0, 0, 0, 0)

        // Only count days up to today
        if (metricDate > today) return

        if (checkFn(m)) {
          tempStreak++
          completedDays++
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          tempStreak = 0
        }
      })

      // Current streak: count backwards from today
      for (let i = sortedMetrics.length - 1; i >= 0; i--) {
        const m = sortedMetrics[i]
        if (!m) continue
        const metricDate = new Date(m.date)
        metricDate.setHours(0, 0, 0, 0)

        if (metricDate > today) continue

        if (checkFn(m)) {
          currentStreak++
        } else {
          break
        }
      }

      const totalDays = sortedMetrics.filter(m => {
        const d = new Date(m.date)
        d.setHours(0, 0, 0, 0)
        return d <= today
      }).length

      return {
        current: currentStreak,
        longest: longestStreak,
        completionPercent: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
      }
    }

    const move = calculateStreak(m => {
      const goal = m.move_goal || 500
      return m.active_calories >= goal
    })

    const exercise = calculateStreak(m => {
      const goal = m.exercise_goal || 30
      return m.exercise_minutes >= goal
    })

    const stand = calculateStreak(m => {
      const goal = m.stand_goal || 12
      return m.stand_hours >= goal
    })

    const allRings = calculateStreak(m => {
      const moveGoal = m.move_goal || 500
      const exerciseGoal = m.exercise_goal || 30
      const standGoal = m.stand_goal || 12
      return (
        m.active_calories >= moveGoal &&
        m.exercise_minutes >= exerciseGoal &&
        m.stand_hours >= standGoal
      )
    })

    return { move, exercise, stand, allRings }
  }, [dailyMetrics])

  const rings = [
    { name: 'Move', color: '#FF2D55', data: streakData.move, icon: <Flame className="size-3.5" /> },
    { name: 'Exercise', color: '#92E82A', data: streakData.exercise, icon: <Activity className="size-3.5" /> },
    { name: 'Stand', color: '#00D4FF', data: streakData.stand, icon: <TrendingUp className="size-3.5" /> },
  ]

  return (
    <div className={cn('rounded-xl bg-muted/30 p-4', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Zap className="size-4 text-amber-500" />
          Ring Streaks
        </h3>
        {/* Perfect days streak */}
        {streakData.allRings.current > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
            <Sparkles className="size-3" />
            {streakData.allRings.current} perfect day{streakData.allRings.current !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Individual ring streaks */}
      <div className="space-y-3">
        {rings.map(ring => (
          <div key={ring.name} className="flex items-center gap-3">
            {/* Ring indicator */}
            <div
              className="flex size-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${ring.color}20`, color: ring.color }}
            >
              {ring.icon}
            </div>

            {/* Streak info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{ring.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ring.data.completionPercent}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${ring.data.completionPercent}%`,
                    backgroundColor: ring.color,
                  }}
                />
              </div>
            </div>

            {/* Streak numbers */}
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums" style={{ color: ring.color }}>
                {ring.data.current}
              </div>
              <div className="text-[10px] text-muted-foreground">
                best: {ring.data.longest}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* All rings streak summary */}
      <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
        <span className="text-xs text-muted-foreground">All rings closed</span>
        <div className="flex items-center gap-3 text-xs">
          <span>
            Current: <strong>{streakData.allRings.current}</strong>
          </span>
          <span className="text-muted-foreground">|</span>
          <span>
            Best: <strong>{streakData.allRings.longest}</strong>
          </span>
          <span className="text-muted-foreground">|</span>
          <span>{streakData.allRings.completionPercent}%</span>
        </div>
      </div>
    </div>
  )
}

// Mini Activity Rings for weekly view
interface MiniActivityRingsProps {
  move: number
  moveGoal: number
  exercise: number
  exerciseGoal: number
  stand: number
  standGoal: number
  size?: number
}

function MiniActivityRings({
  move,
  moveGoal,
  exercise,
  exerciseGoal,
  stand,
  standGoal,
  size = 32,
}: MiniActivityRingsProps) {
  const strokeWidth = size * 0.12
  const radius = (size - strokeWidth) / 2

  const moveProgress = Math.min((move / moveGoal) * 100, 100)
  const exerciseProgress = Math.min((exercise / exerciseGoal) * 100, 100)
  const standProgress = Math.min((stand / standGoal) * 100, 100)

  const rings = [
    { progress: moveProgress, color: '#FF2D55' },
    { progress: exerciseProgress, color: '#92E82A' },
    { progress: standProgress, color: '#00D4FF' },
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
              />
            </g>
          )
        })}
      </svg>
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
  const isRunning = workout.workout_type === 'running'
  const isOutdoorRun = isRunning && workout.is_indoor === false
  const isIndoorRun = isRunning && workout.is_indoor === true
  const textColor = isOutdoorRun
    ? 'text-cyan-500'
    : (WORKOUT_TEXT_COLORS[workout.workout_type] ?? WORKOUT_TEXT_COLORS.other ?? 'text-gray-500')
  const bgColor = isOutdoorRun
    ? 'bg-cyan-500/10'
    : (WORKOUT_BG_COLORS[workout.workout_type] ?? WORKOUT_BG_COLORS.other ?? 'bg-gray-500/10')
  const borderColor = isOutdoorRun
    ? 'border-cyan-500/30'
    : (WORKOUT_BORDER_COLORS[workout.workout_type] ?? WORKOUT_BORDER_COLORS.other ?? 'border-gray-500/40')
  const icon = getWorkoutIcon(workout.workout_type, 'md')
  const label = isOutdoorRun ? 'Outdoor Run' : isIndoorRun ? 'Indoor Run' : (WORKOUT_LABELS[workout.workout_type] || workout.workout_type)
  const isCardio = [
    'running',
    'walking',
    'hiking',
    'cycling',
    'rowing',
    'stairClimbing',
    'elliptical',
  ].includes(workout.workout_type)

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-lg transition-all',
        'hover:bg-muted/40 active:bg-muted/60',
        'border-l-[3px] pl-3 pr-2 py-2',
        borderColor
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn('rounded-md p-1.5', bgColor, textColor)}>
        {icon}
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', textColor)}>
            {label}
          </span>
          {showTimeOfDay && (
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              {timeOfDay.icon}
              {format(startTime, 'h:mm a')}
            </span>
          )}
        </div>

        {/* Stats row - tighter */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
          <span className="flex items-center gap-1 font-medium">
            <Timer className="text-muted-foreground size-3" />
            {formatDuration(workout.duration)}
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Flame className="size-3 text-orange-500" />
            {Math.round(workout.active_calories)} cal
          </span>
          {workout.hr_average && (
            <span className="flex items-center gap-1 font-medium">
              <Heart className="size-3 text-red-500" />
              {workout.hr_average} bpm
            </span>
          )}
          {isCardio && workout.distance_miles && (
            <span className="flex items-center gap-1 font-medium">
              <Route className="size-3 text-blue-500" />
              {workout.distance_miles.toFixed(2)} mi
            </span>
          )}
          {workout.workout_type === 'running' && workout.pace_average && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {formatPace(workout.pace_average)}/mi
            </span>
          )}
          {workout.workout_type === 'running' && workout.cadence_average && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Footprints className="size-3" />
              {workout.cadence_average} spm
            </span>
          )}
          {workout.elevation_gain_meters != null && workout.elevation_gain_meters > 0 && (
            <span className="flex items-center gap-1 text-green-500">
              <TrendingUp className="size-3" />
              {Math.round(workout.elevation_gain_meters * 3.28084)} ft
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="text-muted-foreground/40 size-4 shrink-0 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5" />
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
    <div className="transition-all">
      {/* Day Header - Always visible */}
      <div
        className="group flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Date badge */}
        <div
          className={cn(
            'flex size-9 shrink-0 flex-col items-center justify-center rounded-lg text-center',
            isCurrentDay
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/60'
          )}
        >
          <span className="text-[8px] font-semibold tracking-wider uppercase leading-none">
            {format(group.date, 'EEE')}
          </span>
          <span className="text-xs font-bold leading-tight">
            {format(group.date, 'd')}
          </span>
        </div>

        {/* Day info - single line */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{group.displayName}</span>
            {/* Workout type pills */}
            <div className="hidden items-center gap-1 sm:flex">
              {Object.entries(typeBreakdown).map(([type, count]) => (
                <span
                  key={type}
                  className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {type}{count > 1 ? ` ×${count}` : ''}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-x-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Timer className="size-2.5" />
              {formatDuration(group.totalDuration)}
            </span>
            <span className="flex items-center gap-1">
              <Flame className="size-2.5 text-orange-500" />
              {Math.round(group.totalCalories)} cal
            </span>
            {group.totalDistance > 0 && (
              <span className="flex items-center gap-1">
                <Route className="size-2.5 text-blue-500" />
                {group.totalDistance.toFixed(1)} mi
              </span>
            )}
            {group.avgHr > 0 && (
              <span className="hidden items-center gap-1 sm:flex">
                <Heart className="size-2.5 text-red-500" />
                {group.avgHr} avg
              </span>
            )}
          </div>
        </div>

        {/* Expand */}
        <div className={cn(
          'text-muted-foreground/50 transition-transform duration-200',
          expanded && 'rotate-180'
        )}>
          <ChevronDown className="size-3.5" />
        </div>
      </div>

      {/* Expanded workout list */}
      <div className={cn(
        'grid transition-all duration-200',
        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}>
        <div className="overflow-hidden">
          <div className="space-y-0.5 px-2 pb-2">
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
  dailyMetrics: DailyMetrics[]
  onWorkoutClick: (workoutId: string) => void
  lastSyncTimestamp?: string | null
}

function TodayHero({ workouts, metrics, dailyMetrics, onWorkoutClick, lastSyncTimestamp }: TodayHeroProps) {
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

  const avgHr =
    todayWorkouts.filter(w => w.hr_average).length > 0
      ? Math.round(
          todayWorkouts
            .filter(w => w.hr_average)
            .reduce((sum, w) => sum + w.hr_average!, 0) /
            todayWorkouts.filter(w => w.hr_average).length
        )
      : 0

  const syncTimestamp = metrics?.recorded_at || lastSyncTimestamp || null

  // Past 6 days (not including today) for the subtle history strip
  const recentDays = useMemo(() => {
    const days: Array<{
      dateStr: string
      dayLabel: string
      metrics: DailyMetrics | null
      ringsComplete: number
    }> = []
    for (let i = 6; i >= 1; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayLabel = i === 1 ? 'Y' : format(date, 'EEEEE')
      const m = dailyMetrics.find(dm => dm.date === dateStr) || null
      let ringsComplete = 0
      if (m) {
        if (m.active_calories >= (m.move_goal || 500)) ringsComplete++
        if (m.exercise_minutes >= (m.exercise_goal || 30)) ringsComplete++
        if (m.stand_hours >= (m.stand_goal || 12)) ringsComplete++
      }
      days.push({ dateStr, dayLabel, metrics: m, ringsComplete })
    }
    return days
  }, [dailyMetrics])

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      {/* Main row */}
      <div className="flex items-center gap-4">
        {/* Activity Rings - compact */}
        {metrics && (
          <div className="shrink-0">
            <ActivityRings
              move={metrics.active_calories}
              moveGoal={metrics.move_goal || 500}
              exercise={metrics.exercise_minutes}
              exerciseGoal={metrics.exercise_goal || 30}
              stand={metrics.stand_hours}
              standGoal={metrics.stand_goal || 12}
              size={80}
            />
          </div>
        )}

        {/* Info column */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Today</h2>
            <span className="text-muted-foreground text-xs">
              {format(new Date(), 'EEEE, MMMM d')}
            </span>
            <SyncStatusIndicator
              lastSyncTimestamp={syncTimestamp}
              className="ml-auto hidden sm:flex"
            />
          </div>

          {/* Ring legend - horizontal inline */}
          {metrics && (
            <div className="mt-1 flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#FF2D55]" />
                <span className="text-muted-foreground">Move</span>
                <span className="font-medium tabular-nums" style={{ color: '#FF2D55' }}>{metrics.active_calories}</span>
                <span className="text-muted-foreground">/{metrics.move_goal || 500}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#92E82A]" />
                <span className="text-muted-foreground">Exercise</span>
                <span className="font-medium tabular-nums" style={{ color: '#92E82A' }}>{metrics.exercise_minutes}</span>
                <span className="text-muted-foreground">/{metrics.exercise_goal || 30}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#00D4FF]" />
                <span className="text-muted-foreground">Stand</span>
                <span className="font-medium tabular-nums" style={{ color: '#00D4FF' }}>{metrics.stand_hours}</span>
                <span className="text-muted-foreground">/{metrics.stand_goal || 12}</span>
              </span>
            </div>
          )}

          {/* Workout summary line */}
          {todayWorkouts.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
              {todayWorkouts.map(w => {
                const tc = WORKOUT_TEXT_COLORS[w.workout_type] ?? WORKOUT_TEXT_COLORS.other
                return (
                  <span key={w.id} className={cn('flex items-center gap-1 font-medium', tc)}>
                    {getWorkoutIcon(w.workout_type, 'sm')}
                    {WORKOUT_LABELS[w.workout_type] || w.workout_type}
                    <span className="text-muted-foreground font-normal">{formatDuration(w.duration)}</span>
                  </span>
                )
              })}
            </div>
          ) : (
            <div className="text-muted-foreground mt-1.5 text-xs">
              No workouts yet today
            </div>
          )}
        </div>

        {/* Right side: past 6 days as subtle mini rings - desktop */}
        <div className="hidden shrink-0 items-center gap-3 border-l border-border/20 pl-4 md:flex">
          {/* Stats when workouts exist */}
          {todayWorkouts.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-xs">
                <div className="text-center">
                  <div className="text-sm font-bold tabular-nums">{formatDuration(totalDuration)}</div>
                  <div className="text-muted-foreground text-[10px]">Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold tabular-nums text-orange-500">{Math.round(totalCalories)}</div>
                  <div className="text-muted-foreground text-[10px]">Calories</div>
                </div>
                {totalDistance > 0 && (
                  <div className="text-center">
                    <div className="text-sm font-bold tabular-nums text-green-500">{totalDistance.toFixed(1)}</div>
                    <div className="text-muted-foreground text-[10px]">Miles</div>
                  </div>
                )}
                {avgHr > 0 && (
                  <div className="text-center">
                    <div className="text-sm font-bold tabular-nums text-red-500">{avgHr}</div>
                    <div className="text-muted-foreground text-[10px]">Avg HR</div>
                  </div>
                )}
              </div>
              <div className="h-8 w-px bg-border/20" />
            </>
          )}

          {/* Past 6 days mini rings */}
          <div className="flex items-center gap-1.5">
            {recentDays.map(day => (
              <div key={day.dateStr} className="flex flex-col items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
                <MiniActivityRings
                  move={day.metrics?.active_calories || 0}
                  moveGoal={day.metrics?.move_goal || 500}
                  exercise={day.metrics?.exercise_minutes || 0}
                  exerciseGoal={day.metrics?.exercise_goal || 30}
                  stand={day.metrics?.stand_hours || 0}
                  standGoal={day.metrics?.stand_goal || 12}
                  size={22}
                />
                <span className={cn(
                  'text-[8px] leading-none',
                  day.ringsComplete === 3 ? 'text-green-500' : 'text-muted-foreground/60'
                )}>
                  {day.dayLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded workout tiles - only when workouts exist */}
      {todayWorkouts.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border/20 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {todayWorkouts.map(workout => (
            <TodayWorkoutTile
              key={workout.id}
              workout={workout}
              onClick={() => onWorkoutClick(workout.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Today's workout tile - compact inline design
interface TodayWorkoutTileProps {
  workout: AppleWorkout
  onClick: () => void
}

function TodayWorkoutTile({ workout, onClick }: TodayWorkoutTileProps) {
  const isRunning = workout.workout_type === 'running'
  const isOutdoorRun = isRunning && workout.is_indoor === false
  const isIndoorRun = isRunning && workout.is_indoor === true
  const textColor = isOutdoorRun
    ? 'text-cyan-500'
    : (WORKOUT_TEXT_COLORS[workout.workout_type] ?? WORKOUT_TEXT_COLORS.other ?? 'text-gray-500')
  const bgColor = isOutdoorRun
    ? 'bg-cyan-500/10'
    : (WORKOUT_BG_COLORS[workout.workout_type] ?? WORKOUT_BG_COLORS.other ?? 'bg-gray-500/10')
  const borderColor = isOutdoorRun
    ? 'border-cyan-500/30'
    : (WORKOUT_BORDER_COLORS[workout.workout_type] ?? WORKOUT_BORDER_COLORS.other ?? 'border-gray-500/40')
  const icon = getWorkoutIcon(workout.workout_type, 'sm')
  const label = isOutdoorRun ? 'Outdoor Run' : isIndoorRun ? 'Indoor Run' : (WORKOUT_LABELS[workout.workout_type] || workout.workout_type)
  const isCardio = [
    'running',
    'walking',
    'hiking',
    'cycling',
    'rowing',
    'stairClimbing',
    'elliptical',
  ].includes(workout.workout_type)

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-all',
        'border-l-[3px] hover:bg-muted/40 active:scale-[0.99]',
        bgColor,
        borderColor
      )}
      onClick={onClick}
    >
      <div className={cn('rounded-md p-1.5', bgColor, textColor)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', textColor)}>{label}</span>
          <span className="text-muted-foreground text-[10px]">
            {format(new Date(workout.start_date), 'h:mm a')}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Timer className="size-3" />
            <span className="font-medium text-foreground">{formatDuration(workout.duration)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Flame className="size-3 text-orange-500" />
            <span className="font-medium text-foreground">{Math.round(workout.active_calories)} cal</span>
          </span>
          {workout.hr_average && (
            <span className="flex items-center gap-1">
              <Heart className="size-3 text-red-500" />
              <span className="font-medium text-foreground">{workout.hr_average} bpm</span>
            </span>
          )}
          {isCardio && workout.distance_miles && (
            <span className="flex items-center gap-1">
              <Route className="size-3 text-blue-500" />
              <span className="font-medium text-foreground">{workout.distance_miles.toFixed(2)} mi</span>
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="text-muted-foreground/40 size-4 shrink-0 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5" />
    </div>
  )
}

// ============================================
// WEEKLY SUMMARY BAR (Horizontal stat bar with trends)
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
      icon: <Dumbbell className="size-4 text-purple-500" />,
    },
    {
      label: 'Duration',
      value: summary.totalDurationMin,
      unit: 'min',
      icon: <Timer className="size-4 text-blue-500" />,
    },
    {
      label: 'Calories',
      value: summary.totalCalories.toLocaleString(),
      unit: '',
      trend: calorieTrend,
      icon: <Flame className="size-4 text-orange-500" />,
    },
    {
      label: 'Distance',
      value: summary.totalDistanceMiles.toFixed(1),
      unit: 'mi',
      trend: distanceTrend,
      icon: <Route className="size-4 text-green-500" />,
    },
  ]

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card px-4 py-2.5">
      {/* Label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Calendar className="text-muted-foreground size-3.5" />
        <span className="text-xs font-semibold">This Week</span>
      </div>

      {/* Stats inline */}
      <div className="flex flex-1 items-center gap-4 sm:gap-6">
        {stats.map(stat => (
          <div key={stat.label} className="flex items-center gap-1.5">
            <div className="shrink-0 opacity-70">{stat.icon}</div>
            <span className="text-sm font-bold tabular-nums">
              {stat.value}
            </span>
            {stat.unit && (
              <span className="text-muted-foreground text-[10px]">
                {stat.unit}
              </span>
            )}
            {stat.trend && (
              <span
                className={cn(
                  'flex items-center text-[10px]',
                  stat.trend > 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {stat.trend > 0 ? (
                  <TrendingUp className="size-2.5" />
                ) : (
                  <TrendingDown className="size-2.5" />
                )}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Week label - desktop only */}
      <span className="text-muted-foreground hidden text-[10px] sm:block">
        Week of {format(new Date(summary.weekStart), 'MMM d')}
      </span>
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
// TRAINING OVERVIEW STRIP
// ============================================

interface TrainingOverviewProps {
  workouts: AppleWorkout[]
  dailyMetrics: DailyMetrics[]
}

function TrainingOverview({ workouts, dailyMetrics }: TrainingOverviewProps) {
  // Workout streak (consecutive days)
  const workoutStreak = useMemo(() => {
    if (workouts.length === 0) return 0
    const workoutDays = new Set(
      workouts.map(w => format(new Date(w.start_date), 'yyyy-MM-dd'))
    )
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = format(d, 'yyyy-MM-dd')
      if (workoutDays.has(key)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    return streak
  }, [workouts])

  // Ring streaks (last 30 days)
  const ringStreaks = useMemo(() => {
    const sorted = [...dailyMetrics]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30)

    const calc = (fn: (m: DailyMetrics) => boolean) => {
      let current = 0
      for (const m of sorted) {
        if (fn(m)) current++
        else break
      }
      return current
    }

    return {
      move: calc(m => m.active_calories >= (m.move_goal || 500)),
      exercise: calc(m => m.exercise_minutes >= (m.exercise_goal || 30)),
      stand: calc(m => m.stand_hours >= (m.stand_goal || 12)),
    }
  }, [dailyMetrics])

  // Averages (last 7 days)
  const weekAvg = useMemo(() => {
    const last7 = dailyMetrics.slice(0, 7)
    if (last7.length === 0) return null
    const avgSteps = Math.round(last7.reduce((s, m) => s + m.steps, 0) / last7.length)
    const avgCal = Math.round(last7.reduce((s, m) => s + m.active_calories, 0) / last7.length)
    const avgExercise = Math.round(last7.reduce((s, m) => s + m.exercise_minutes, 0) / last7.length)
    return { avgSteps, avgCal, avgExercise }
  }, [dailyMetrics])

  if (!weekAvg && workoutStreak === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-xs">
      {/* Workout streak */}
      {workoutStreak > 0 && (
        <div className="flex items-center gap-1.5">
          <Zap className="size-3.5 text-amber-500" />
          <span className="font-bold tabular-nums text-amber-500">{workoutStreak}</span>
          <span className="text-muted-foreground">day streak</span>
        </div>
      )}

      {/* Ring streaks */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-[10px]">Rings:</span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[#FF2D55]" />
          <span className="font-bold tabular-nums" style={{ color: '#FF2D55' }}>{ringStreaks.move}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[#92E82A]" />
          <span className="font-bold tabular-nums" style={{ color: '#92E82A' }}>{ringStreaks.exercise}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[#00D4FF]" />
          <span className="font-bold tabular-nums" style={{ color: '#00D4FF' }}>{ringStreaks.stand}</span>
        </span>
        <span className="text-muted-foreground text-[10px]">day streaks</span>
      </div>

      {/* Separator */}
      <div className="hidden h-4 w-px bg-border/30 sm:block" />

      {/* 7-day averages */}
      {weekAvg && (
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-[10px]">7d avg:</span>
          <span className="flex items-center gap-1">
            <Footprints className="size-3 text-blue-500" />
            <span className="font-medium tabular-nums">{weekAvg.avgSteps.toLocaleString()}</span>
            <span className="text-muted-foreground text-[10px]">steps</span>
          </span>
          <span className="flex items-center gap-1">
            <Flame className="size-3 text-orange-500" />
            <span className="font-medium tabular-nums">{weekAvg.avgCal}</span>
            <span className="text-muted-foreground text-[10px]">cal</span>
          </span>
          <span className="flex items-center gap-1">
            <Timer className="size-3 text-green-500" />
            <span className="font-medium tabular-nums">{weekAvg.avgExercise}</span>
            <span className="text-muted-foreground text-[10px]">min</span>
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// HEALTH VITALS ROW (Promoted from sidebar)
// ============================================

interface HealthVitalsRowProps {
  dailyMetrics: DailyMetrics[]
}

function HealthVitalsRow({ dailyMetrics }: HealthVitalsRowProps) {
  const currentMetrics = dailyMetrics[0]
  const previousMetrics = dailyMetrics[1]

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

  const hasAnyData = currentMetrics?.resting_heart_rate || currentMetrics?.heart_rate_variability || currentMetrics?.vo2_max
  if (!hasAnyData) return null

  const vitals = [
    currentMetrics?.resting_heart_rate ? {
      icon: <Heart className="size-3.5 text-red-500" />,
      label: 'Resting HR',
      value: currentMetrics.resting_heart_rate,
      unit: 'bpm',
      trend: hrTrend,
      trendInverted: true,
      bgColor: 'bg-red-500/10',
    } : null,
    currentMetrics?.heart_rate_variability ? {
      icon: <HeartPulse className="size-3.5 text-purple-500" />,
      label: 'HRV',
      value: Math.round(currentMetrics.heart_rate_variability),
      unit: 'ms',
      trend: hrvTrend,
      trendInverted: false,
      bgColor: 'bg-purple-500/10',
    } : null,
    currentMetrics?.vo2_max ? {
      icon: <Wind className="size-3.5 text-cyan-500" />,
      label: 'VO2 Max',
      value: currentMetrics.vo2_max.toFixed(1),
      unit: '',
      trend: vo2Trend,
      trendInverted: false,
      bgColor: 'bg-cyan-500/10',
    } : null,
  ].filter(Boolean) as {
    icon: React.ReactNode
    label: string
    value: number | string
    unit: string
    trend: number | null
    trendInverted: boolean
    bgColor: string
  }[]

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5">
      {vitals.map((vital, i) => {
        const isGood = vital.trendInverted ? (vital.trend && vital.trend < 0) : (vital.trend && vital.trend > 0)
        const isBad = vital.trendInverted ? (vital.trend && vital.trend > 0) : (vital.trend && vital.trend < 0)

        return (
          <div key={vital.label} className="flex items-center gap-1.5">
            {i > 0 && <div className="mx-1.5 h-5 w-px bg-border/30" />}
            <div className={cn('flex size-6 shrink-0 items-center justify-center rounded-md', vital.bgColor)}>
              {vital.icon}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold tabular-nums">{vital.value}</span>
              {vital.unit && (
                <span className="text-muted-foreground text-[10px]">{vital.unit}</span>
              )}
              {vital.trend && (
                <span className={cn(
                  'flex items-center text-[10px]',
                  isGood && 'text-green-500',
                  isBad && 'text-red-500',
                  !isGood && !isBad && 'text-muted-foreground'
                )}>
                  {vital.trend > 0 ? (
                    <TrendingUp className="size-2.5" />
                  ) : (
                    <TrendingDown className="size-2.5" />
                  )}
                </span>
              )}
            </div>
            <span className="text-muted-foreground text-[10px] hidden sm:block">{vital.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// UNIFIED ANALYTICS (Merged workout + daily metrics insights)
// ============================================

type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'
type AnalyticsTab = 'volume' | 'performance' | 'activity' | 'health'

interface UnifiedAnalyticsProps {
  workouts: AppleWorkout[]
  dailyMetrics: DailyMetrics[]
  onWorkoutClick: (workoutId: string) => void
}

// Keep old interface for backwards compat in case it's referenced
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

// Old WorkoutInsights removed - replaced by UnifiedAnalytics
function _LegacyWorkoutInsights({ workouts, onWorkoutClick }: WorkoutInsightsProps) {
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
// UNIFIED ANALYTICS COMPONENT
// ============================================

function UnifiedAnalytics({ workouts, dailyMetrics, onWorkoutClick }: UnifiedAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('volume')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [selectedType, setSelectedType] = useState<string>('all')

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
      case '7d': cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break
      case '30d': cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break
      case '90d': cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break
      case '6m': cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break
      case '1y': cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break
      case 'all': default: cutoffDate = new Date(0)
    }
    return workouts.filter(w => new Date(w.start_date) >= cutoffDate)
  }, [workouts, timeRange])

  // Filter daily metrics by time range
  const filteredMetrics = useMemo(() => {
    const now = new Date()
    let cutoffDate: Date
    switch (timeRange) {
      case '7d': cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break
      case '30d': cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break
      case '90d': cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break
      case '6m': cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break
      case '1y': cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break
      case 'all': default: cutoffDate = new Date(0)
    }
    return dailyMetrics
      .filter(m => new Date(m.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [dailyMetrics, timeRange])

  const typeFilteredWorkouts = useMemo(() => {
    if (selectedType === 'all') return filteredWorkouts
    return filteredWorkouts.filter(w => w.workout_type === selectedType)
  }, [filteredWorkouts, selectedType])

  // === VOLUME DATA ===
  const [volumeMetric, setVolumeMetric] = useState<'duration' | 'distance'>('distance')

  const volumeChartData = useMemo(() => {
    const grouped = new Map<string, Record<string, number>>()
    const useWeekly = timeRange === '6m' || timeRange === '1y' || timeRange === 'all'
    filteredWorkouts.forEach(w => {
      const date = new Date(w.start_date)
      let key: string
      if (useWeekly) {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = format(weekStart, 'MMM d')
      } else {
        key = format(date, 'MMM d')
      }
      if (!grouped.has(key)) grouped.set(key, {})
      const dayData = grouped.get(key)!
      const type = w.workout_type
      const value = volumeMetric === 'duration' ? w.duration / 60 : (w.distance_miles || 0)
      dayData[type] = (dayData[type] || 0) + value
    })
    return Array.from(grouped.entries())
      .map(([date, data]) => ({ date, ...data }))
      .slice(-20)
  }, [filteredWorkouts, timeRange, volumeMetric])

  const distributionData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredWorkouts.forEach(w => { counts[w.workout_type] = (counts[w.workout_type] || 0) + 1 })
    return Object.entries(counts).map(([type, count]) => ({
      type,
      label: WORKOUT_LABELS[type] || type,
      count,
      color: WORKOUT_HEX_COLORS[type] || WORKOUT_HEX_COLORS.other,
    }))
  }, [filteredWorkouts])

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

  // === PERFORMANCE DATA ===
  const performanceData = useMemo(() => {
    const grouped = new Map<string, { hr: number[]; pace: number[]; calories: number[]; effort: number[] }>()
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
      if (!grouped.has(key)) grouped.set(key, { hr: [], pace: [], calories: [], effort: [] })
      const dayData = grouped.get(key)!
      if (w.hr_average) dayData.hr.push(w.hr_average)
      if (w.pace_average && w.pace_average > 0 && w.pace_average < 30) dayData.pace.push(w.pace_average)
      dayData.calories.push(w.active_calories / (w.duration / 60))
      if (w.effort_score && w.effort_score > 0) dayData.effort.push(w.effort_score)
    })
    return Array.from(grouped.entries())
      .map(([date, data]) => ({
        date,
        avgHr: data.hr.length > 0 ? Math.round(data.hr.reduce((a, b) => a + b, 0) / data.hr.length) : null,
        calPerMin: data.calories.length > 0 ? Math.round(data.calories.reduce((a, b) => a + b, 0) / data.calories.length * 10) / 10 : null,
        effort: data.effort.length > 0 ? Math.round(data.effort.reduce((a, b) => a + b, 0) / data.effort.length) : null,
      }))
      .slice(-20)
  }, [typeFilteredWorkouts, timeRange])

  const performanceChartConfig: ChartConfig = {
    avgHr: { label: 'Avg HR', color: '#ef4444' },
    calPerMin: { label: 'Cal/min', color: '#f97316' },
    effort: { label: 'Effort', color: '#a855f7' },
  }

  // === ACTIVITY DATA (from daily metrics) ===
  const activityTrendData = useMemo(() => {
    const useWeekly = timeRange === '6m' || timeRange === '1y' || timeRange === 'all'
    if (!useWeekly) {
      return filteredMetrics.map(m => ({
        date: format(new Date(m.date), 'MMM d'),
        steps: m.steps,
        activeCalories: Math.round(m.active_calories),
        exerciseMinutes: m.exercise_minutes,
      }))
    }
    const weekGroups = new Map<string, DailyMetrics[]>()
    filteredMetrics.forEach(m => {
      const date = new Date(m.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const key = format(weekStart, 'MMM d')
      if (!weekGroups.has(key)) weekGroups.set(key, [])
      weekGroups.get(key)!.push(m)
    })
    return Array.from(weekGroups.entries()).map(([date, metrics]) => ({
      date,
      steps: Math.round(metrics.reduce((sum, m) => sum + m.steps, 0) / metrics.length),
      activeCalories: Math.round(metrics.reduce((sum, m) => sum + m.active_calories, 0) / metrics.length),
      exerciseMinutes: Math.round(metrics.reduce((sum, m) => sum + m.exercise_minutes, 0) / metrics.length),
    }))
  }, [filteredMetrics, timeRange])

  const activityChartConfig: ChartConfig = {
    steps: { label: 'Steps', color: '#60a5fa' },
    activeCalories: { label: 'Active Cal', color: '#f97316' },
  }

  // === RING COMPLETION DATA ===
  const ringCompletionData = useMemo(() => {
    return filteredMetrics.map(m => {
      const moveGoal = m.move_goal || 500
      const exerciseGoal = m.exercise_goal || 30
      const standGoal = m.stand_goal || 12
      return {
        date: format(new Date(m.date), 'MMM d'),
        move: Math.min(100, Math.round((m.active_calories / moveGoal) * 100)),
        exercise: Math.min(100, Math.round((m.exercise_minutes / exerciseGoal) * 100)),
        stand: Math.min(100, Math.round((m.stand_hours / standGoal) * 100)),
      }
    })
  }, [filteredMetrics])

  const ringChartConfig: ChartConfig = {
    move: { label: 'Move', color: '#FF2D55' },
    exercise: { label: 'Exercise', color: '#92E82A' },
    stand: { label: 'Stand', color: '#00D4FF' },
  }

  // === RING SUMMARY STATS ===
  const ringStats = useMemo(() => {
    if (filteredMetrics.length === 0) return null
    let moveClosed = 0
    let exerciseClosed = 0
    let standClosed = 0
    let perfectDays = 0
    filteredMetrics.forEach(m => {
      const mc = m.active_calories >= (m.move_goal || 500)
      const ec = m.exercise_minutes >= (m.exercise_goal || 30)
      const sc = m.stand_hours >= (m.stand_goal || 12)
      if (mc) moveClosed++
      if (ec) exerciseClosed++
      if (sc) standClosed++
      if (mc && ec && sc) perfectDays++
    })
    const total = filteredMetrics.length
    return {
      movePct: Math.round((moveClosed / total) * 100),
      exercisePct: Math.round((exerciseClosed / total) * 100),
      standPct: Math.round((standClosed / total) * 100),
      perfectDays,
      total,
    }
  }, [filteredMetrics])

  // === WORKOUT STREAK ===
  const workoutStreak = useMemo(() => {
    if (workouts.length === 0) return 0
    const workoutDays = new Set(
      workouts.map(w => format(new Date(w.start_date), 'yyyy-MM-dd'))
    )
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = format(d, 'yyyy-MM-dd')
      if (workoutDays.has(key)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    return streak
  }, [workouts])

  // === HEALTH DATA (from daily metrics) ===
  const healthTrendData = useMemo(() => {
    return filteredMetrics
      .filter(m => m.resting_heart_rate || m.heart_rate_variability)
      .map(m => ({
        date: format(new Date(m.date), 'MMM d'),
        restingHR: m.resting_heart_rate,
        hrv: m.heart_rate_variability ? Math.round(m.heart_rate_variability) : null,
        vo2Max: m.vo2_max,
      }))
  }, [filteredMetrics])

  const healthChartConfig: ChartConfig = {
    restingHR: { label: 'Resting HR', color: '#ef4444' },
    hrv: { label: 'HRV', color: '#a855f7' },
    vo2Max: { label: 'VO2 Max', color: '#06b6d4' },
  }

  // Health averages
  const healthAvg = useMemo(() => {
    const withHR = filteredMetrics.filter(m => m.resting_heart_rate && m.resting_heart_rate > 0)
    const withHRV = filteredMetrics.filter(m => m.heart_rate_variability && m.heart_rate_variability > 0)
    const withVO2 = filteredMetrics.filter(m => m.vo2_max && m.vo2_max > 0)
    return {
      avgHR: withHR.length > 0 ? Math.round(withHR.reduce((s, m) => s + m.resting_heart_rate!, 0) / withHR.length) : null,
      avgHRV: withHRV.length > 0 ? Math.round(withHRV.reduce((s, m) => s + m.heart_rate_variability!, 0) / withHRV.length) : null,
      avgVO2: withVO2.length > 0 ? (withVO2.reduce((s, m) => s + m.vo2_max!, 0) / withVO2.length).toFixed(1) : null,
    }
  }, [filteredMetrics])

  // === PERSONAL RECORDS (merged workout + daily) ===
  const personalRecords = useMemo(() => {
    const records: {
      id: string
      label: string
      value: string
      date: string
      workoutId?: string
      icon: React.ReactNode
    }[] = []

    const relevantWorkouts = selectedType === 'all'
      ? filteredWorkouts
      : filteredWorkouts.filter(w => w.workout_type === selectedType)

    if (relevantWorkouts.length > 0) {
      // Fastest pace
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

      // Most calories
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
    }

    // Daily records
    if (filteredMetrics.length > 0) {
      const maxSteps = filteredMetrics.reduce((best, m) => m.steps > best.steps ? m : best)
      records.push({
        id: 'max-steps',
        label: 'Most Steps',
        value: maxSteps.steps.toLocaleString(),
        date: format(new Date(maxSteps.date), 'MMM d'),
        icon: <Footprints className="size-4 text-blue-500" />,
      })

      // Most exercise minutes
      const maxExercise = filteredMetrics.reduce((best, m) => m.exercise_minutes > best.exercise_minutes ? m : best)
      if (maxExercise.exercise_minutes > 0) {
        records.push({
          id: 'max-exercise',
          label: 'Most Exercise',
          value: maxExercise.exercise_minutes + ' min',
          date: format(new Date(maxExercise.date), 'MMM d'),
          icon: <Activity className="size-4 text-green-500" />,
        })
      }

      // Lowest resting HR
      const withHR = filteredMetrics.filter(m => m.resting_heart_rate && m.resting_heart_rate > 0)
      if (withHR.length > 0) {
        const lowestHR = withHR.reduce((best, m) => (m.resting_heart_rate! < best.resting_heart_rate!) ? m : best)
        records.push({
          id: 'lowest-rhr',
          label: 'Lowest Resting HR',
          value: lowestHR.resting_heart_rate + ' bpm',
          date: format(new Date(lowestHR.date), 'MMM d'),
          icon: <Heart className="size-4 text-red-500" />,
        })
      }

      // Highest HRV
      const withHRV = filteredMetrics.filter(m => m.heart_rate_variability && m.heart_rate_variability > 0)
      if (withHRV.length > 0) {
        const highestHRV = withHRV.reduce((best, m) => (m.heart_rate_variability! > best.heart_rate_variability!) ? m : best)
        records.push({
          id: 'highest-hrv',
          label: 'Highest HRV',
          value: Math.round(highestHRV.heart_rate_variability!) + ' ms',
          date: format(new Date(highestHRV.date), 'MMM d'),
          icon: <HeartPulse className="size-4 text-purple-500" />,
        })
      }
    }

    return records.slice(0, 8)
  }, [filteredWorkouts, filteredMetrics, selectedType])

  // Summary stats
  const summaryStats = useMemo(() => {
    if (filteredMetrics.length === 0 && filteredWorkouts.length === 0) return null
    const totalSteps = filteredMetrics.reduce((sum, m) => sum + m.steps, 0)
    const totalCalories = filteredMetrics.reduce((sum, m) => sum + m.active_calories, 0)
    const totalExercise = filteredMetrics.reduce((sum, m) => sum + m.exercise_minutes, 0)
    return {
      totalWorkouts: filteredWorkouts.length,
      totalSteps,
      totalCalories: Math.round(totalCalories),
      totalExercise,
      avgSteps: filteredMetrics.length > 0 ? Math.round(totalSteps / filteredMetrics.length) : 0,
    }
  }, [filteredWorkouts, filteredMetrics])

  const tabs: { value: AnalyticsTab; label: string; icon: React.ReactNode }[] = [
    { value: 'volume', label: 'Volume', icon: <Dumbbell className="size-3.5" /> },
    { value: 'performance', label: 'Performance', icon: <TrendingUp className="size-3.5" /> },
    { value: 'activity', label: 'Activity', icon: <Footprints className="size-3.5" /> },
    { value: 'health', label: 'Health', icon: <HeartPulse className="size-3.5" /> },
  ]

  if (workouts.length === 0 && dailyMetrics.length === 0) return null

  // Inline filter components
  const timeRangeFilter = (
    <div className="flex rounded-md bg-muted/40 p-0.5">
      {TIME_RANGES.map(range => (
        <button
          key={range.value}
          onClick={() => setTimeRange(range.value)}
          className={cn(
            'rounded-sm px-1.5 py-0.5 text-[10px] font-medium transition-all',
            timeRange === range.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  )

  const workoutTypeFilter = workoutTypes.length > 1 ? (
    <div className="flex flex-wrap items-center gap-1">
      <button
        onClick={() => setSelectedType('all')}
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-medium transition-all',
          selectedType === 'all'
            ? 'bg-foreground/10 text-foreground'
            : 'text-muted-foreground hover:text-foreground'
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
              'rounded-full px-2 py-0.5 text-[10px] font-medium transition-all',
              isSelected
                ? cn(bgColor, textColor)
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {WORKOUT_LABELS[type] || type}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <div className="space-y-3">
      {/* Header: just title + tab bar */}
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Activity className="size-4 text-primary" />
          Analytics
        </h2>
        <div className="flex rounded-md bg-muted/30 p-0.5">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] font-medium transition-all',
                activeTab === tab.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content grid: Chart + Records */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
        {/* Main chart area */}
        <div className="rounded-xl border border-border/50 bg-card p-3">
          {/* VOLUME TAB */}
          {activeTab === 'volume' && (
            <div>
              {/* Card-level filters */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">Volume Over Time</h3>
                <div className="flex rounded-md bg-muted/30 p-0.5">
                  <button
                    onClick={() => setVolumeMetric('duration')}
                    className={cn(
                      'rounded-sm px-2 py-0.5 text-[10px] font-medium',
                      volumeMetric === 'duration' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Duration
                  </button>
                  <button
                    onClick={() => setVolumeMetric('distance')}
                    className={cn(
                      'rounded-sm px-2 py-0.5 text-[10px] font-medium',
                      volumeMetric === 'distance' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Distance
                  </button>
                </div>
                <div className="flex-1" />
                {timeRangeFilter}
              </div>
              {workoutTypeFilter && (
                <div className="mb-3">{workoutTypeFilter}</div>
              )}

              {volumeChartData.length > 0 ? (
                <div>
                  <ChartContainer config={volumeChartConfig} className="h-[220px] w-full">
                    <BarChart data={volumeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={35} tickFormatter={(v) => volumeMetric === 'duration' ? `${v}m` : `${v}mi`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {workoutTypes.map(type => (
                        <Bar key={type} dataKey={type} stackId="volume" fill={WORKOUT_HEX_COLORS[type] || WORKOUT_HEX_COLORS.other} radius={[2, 2, 0, 0]} />
                      ))}
                    </BarChart>
                  </ChartContainer>

                  {/* Inline distribution */}
                  {distributionData.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/20 pt-3">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Distribution:</span>
                      {distributionData.map(item => (
                        <button
                          key={item.type}
                          onClick={() => setSelectedType(item.type === selectedType ? 'all' : item.type)}
                          className={cn(
                            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-all',
                            selectedType === item.type ? 'bg-background/80 ring-1 ring-border' : 'hover:bg-background/50'
                          )}
                        >
                          <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.label}</span>
                          <span className="text-muted-foreground">{item.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">No data for selected period</div>
              )}
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {activeTab === 'performance' && (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">Performance Trends</h3>
                <div className="flex-1" />
                {timeRangeFilter}
              </div>
              {workoutTypeFilter && (
                <div className="mb-3">{workoutTypeFilter}</div>
              )}
              {performanceData.length > 0 && performanceData.some(d => d.avgHr || d.calPerMin) ? (
                <div>
                  <ChartContainer config={performanceChartConfig} className="h-[220px] w-full">
                    <LineChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis yAxisId="hr" orientation="left" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={35} domain={['dataMin - 10', 'dataMax + 10']} />
                      <YAxis yAxisId="cal" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={35} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line yAxisId="hr" type="monotone" dataKey="avgHr" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls />
                      <Line yAxisId="cal" type="monotone" dataKey="calPerMin" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
                      {performanceData.some(d => d.effort) && (
                        <Line yAxisId="cal" type="monotone" dataKey="effort" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls strokeDasharray="4 2" />
                      )}
                    </LineChart>
                  </ChartContainer>
                  <div className="mt-2 flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-0.5 w-4 rounded bg-red-500" />
                      <span className="text-muted-foreground">Avg HR (bpm)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-0.5 w-4 rounded bg-orange-500" />
                      <span className="text-muted-foreground">Cal/min</span>
                    </div>
                    {performanceData.some(d => d.effort) && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-0.5 w-4 rounded bg-purple-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #a855f7 0, #a855f7 4px, transparent 4px, transparent 6px)' }} />
                        <span className="text-muted-foreground">Effort</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">No performance data for selected filters</div>
              )}
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold">Daily Activity</h3>
                <div className="flex-1" />
                {timeRangeFilter}
              </div>

              {/* Period summary strip */}
              {summaryStats && (
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Footprints className="size-3 text-blue-500" />
                    <span className="font-bold tabular-nums text-blue-500">{summaryStats.avgSteps.toLocaleString()}</span>
                    <span className="text-muted-foreground text-[10px]">avg steps/day</span>
                  </div>
                  <div className="h-3 w-px bg-border/30" />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Flame className="size-3 text-orange-500" />
                    <span className="font-bold tabular-nums text-orange-500">{summaryStats.totalCalories.toLocaleString()}</span>
                    <span className="text-muted-foreground text-[10px]">total cal</span>
                  </div>
                  <div className="h-3 w-px bg-border/30" />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Timer className="size-3 text-green-500" />
                    <span className="font-bold tabular-nums text-green-500">{summaryStats.totalExercise}</span>
                    <span className="text-muted-foreground text-[10px]">exercise min</span>
                  </div>
                  {workoutStreak > 0 && (
                    <>
                      <div className="h-3 w-px bg-border/30" />
                      <div className="flex items-center gap-1.5 text-xs">
                        <Zap className="size-3 text-amber-500" />
                        <span className="font-bold tabular-nums text-amber-500">{workoutStreak}</span>
                        <span className="text-muted-foreground text-[10px]">day streak</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Steps + Calories chart */}
              {activityTrendData.length > 0 ? (
                <div>
                  <ChartContainer config={activityChartConfig} className="h-[180px] w-full">
                    <BarChart data={activityTrendData.slice(-20)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar yAxisId="left" dataKey="steps" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="activeCalories" stroke="#f97316" strokeWidth={2} dot={false} />
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-blue-500" /> Steps</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded bg-orange-500" /> Active Cal</span>
                  </div>
                </div>
              ) : (
                <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">No activity data</div>
              )}

              {/* Ring completion area chart */}
              {ringCompletionData.length > 0 && (
                <div className="mt-4 border-t border-border/20 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground">Ring Completion %</h4>
                    {ringStats && (
                      <div className="flex items-center gap-2 text-[10px]">
                        <span style={{ color: '#FF2D55' }}>{ringStats.movePct}%</span>
                        <span style={{ color: '#92E82A' }}>{ringStats.exercisePct}%</span>
                        <span style={{ color: '#00D4FF' }}>{ringStats.standPct}%</span>
                        {ringStats.perfectDays > 0 && (
                          <span className="flex items-center gap-0.5 text-green-500">
                            <Sparkles className="size-2.5" />
                            {ringStats.perfectDays} perfect
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChartContainer config={ringChartConfig} className="h-[120px] w-full">
                    <AreaChart data={ringCompletionData.slice(-30)} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="move" stroke="#FF2D55" fill="#FF2D55" fillOpacity={0.15} strokeWidth={1.5} dot={false} />
                      <Area type="monotone" dataKey="exercise" stroke="#92E82A" fill="#92E82A" fillOpacity={0.1} strokeWidth={1.5} dot={false} />
                      <Area type="monotone" dataKey="stand" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.08} strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ChartContainer>
                </div>
              )}
            </div>
          )}

          {/* HEALTH TAB */}
          {activeTab === 'health' && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold">Health Metrics</h3>
                <div className="flex-1" />
                {timeRangeFilter}
              </div>

              {/* Health averages strip */}
              {healthAvg && (healthAvg.avgHR || healthAvg.avgHRV || healthAvg.avgVO2) && (
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  {healthAvg.avgHR && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Heart className="size-3 text-red-500" />
                      <span className="font-bold tabular-nums text-red-500">{healthAvg.avgHR}</span>
                      <span className="text-muted-foreground text-[10px]">avg RHR</span>
                    </div>
                  )}
                  {healthAvg.avgHRV && (
                    <>
                      <div className="h-3 w-px bg-border/30" />
                      <div className="flex items-center gap-1.5 text-xs">
                        <HeartPulse className="size-3 text-purple-500" />
                        <span className="font-bold tabular-nums text-purple-500">{healthAvg.avgHRV}</span>
                        <span className="text-muted-foreground text-[10px]">avg HRV</span>
                      </div>
                    </>
                  )}
                  {healthAvg.avgVO2 && (
                    <>
                      <div className="h-3 w-px bg-border/30" />
                      <div className="flex items-center gap-1.5 text-xs">
                        <Wind className="size-3 text-cyan-500" />
                        <span className="font-bold tabular-nums text-cyan-500">{healthAvg.avgVO2}</span>
                        <span className="text-muted-foreground text-[10px]">avg VO2</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {healthTrendData.length > 0 ? (
                <div>
                  <ChartContainer config={healthChartConfig} className="h-[220px] w-full">
                    <LineChart data={healthTrendData.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="restingHR" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                      <Line type="monotone" dataKey="hrv" stroke="#a855f7" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                      <Line type="monotone" dataKey="vo2Max" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    </LineChart>
                  </ChartContainer>
                  <div className="mt-2 flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-0.5 w-4 rounded bg-red-500" />
                      <span className="text-muted-foreground">Resting HR</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-0.5 w-4 rounded bg-purple-500" />
                      <span className="text-muted-foreground">HRV (ms)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-0.5 w-4 rounded bg-cyan-500" />
                      <span className="text-muted-foreground">VO2 Max</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">No health data for selected period</div>
              )}
            </div>
          )}
        </div>

        {/* Records sidebar */}
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
            <h3 className="text-xs font-semibold">Records</h3>
          </div>

          {personalRecords.length > 0 ? (
            <div className="space-y-1">
              {personalRecords.map(record => (
                <button
                  key={record.id}
                  onClick={() => record.workoutId && onWorkoutClick(record.workoutId)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md bg-muted/30 px-2 py-1.5 text-left transition-all',
                    record.workoutId && 'hover:bg-muted/50 cursor-pointer'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {record.icon}
                    <div>
                      <div className="text-[11px] font-medium leading-tight">{record.label}</div>
                      <div className="text-muted-foreground text-[9px]">{record.date}</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold tabular-nums">{record.value}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-[100px] items-center justify-center text-muted-foreground text-xs">
              No records yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Keep WorkoutInsights as a wrapper for backwards compatibility
function WorkoutInsights({ workouts, onWorkoutClick }: WorkoutInsightsProps) {
  // This is now unused - UnifiedAnalytics replaces it
  return null
}

// Keep DailyMetricsInsights interface
interface DailyMetricsInsightsProps {
  dailyMetrics: DailyMetrics[]
  className?: string
}

function DailyMetricsInsights({ dailyMetrics, className }: DailyMetricsInsightsProps) {
  // This is now unused - UnifiedAnalytics replaces it
  return null
}

// Legacy code below kept for reference but unused
function _LegacyDailyMetricsInsights({ dailyMetrics, className }: DailyMetricsInsightsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [selectedMetric, setSelectedMetric] = useState<'rings' | 'steps' | 'calories' | 'health'>('rings')

  // Filter metrics by time range
  const filteredMetrics = useMemo(() => {
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

    return dailyMetrics
      .filter(m => new Date(m.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [dailyMetrics, timeRange])

  // Calculate ring completion data
  const ringCompletionData = useMemo(() => {
    return filteredMetrics.map(m => {
      const moveGoal = m.move_goal || 500
      const exerciseGoal = m.exercise_goal || 30
      const standGoal = m.stand_goal || 12

      return {
        date: format(new Date(m.date), 'MMM d'),
        fullDate: m.date,
        movePercent: Math.min((m.active_calories / moveGoal) * 100, 150),
        exercisePercent: Math.min((m.exercise_minutes / exerciseGoal) * 100, 150),
        standPercent: Math.min((m.stand_hours / standGoal) * 100, 150),
        moveComplete: m.active_calories >= moveGoal,
        exerciseComplete: m.exercise_minutes >= exerciseGoal,
        standComplete: m.stand_hours >= standGoal,
        allComplete: m.active_calories >= moveGoal && m.exercise_minutes >= exerciseGoal && m.stand_hours >= standGoal,
      }
    })
  }, [filteredMetrics])

  // Calculate step and calorie trends
  const activityTrendData = useMemo(() => {
    // Group by week for longer time ranges
    const useWeekly = timeRange === '6m' || timeRange === '1y' || timeRange === 'all'

    if (!useWeekly) {
      return filteredMetrics.map(m => ({
        date: format(new Date(m.date), 'MMM d'),
        steps: m.steps,
        activeCalories: Math.round(m.active_calories),
        totalCalories: Math.round(m.total_calories),
        exerciseMinutes: m.exercise_minutes,
      }))
    }

    // Group by week
    const weekGroups = new Map<string, DailyMetrics[]>()
    filteredMetrics.forEach(m => {
      const date = new Date(m.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const key = format(weekStart, 'MMM d')
      if (!weekGroups.has(key)) weekGroups.set(key, [])
      weekGroups.get(key)!.push(m)
    })

    return Array.from(weekGroups.entries()).map(([date, metrics]) => ({
      date,
      steps: Math.round(metrics.reduce((sum, m) => sum + m.steps, 0) / metrics.length),
      activeCalories: Math.round(metrics.reduce((sum, m) => sum + m.active_calories, 0) / metrics.length),
      totalCalories: Math.round(metrics.reduce((sum, m) => sum + m.total_calories, 0) / metrics.length),
      exerciseMinutes: Math.round(metrics.reduce((sum, m) => sum + m.exercise_minutes, 0) / metrics.length),
    }))
  }, [filteredMetrics, timeRange])

  // Health metrics trends
  const healthTrendData = useMemo(() => {
    return filteredMetrics
      .filter(m => m.resting_heart_rate || m.heart_rate_variability || m.vo2_max)
      .map(m => ({
        date: format(new Date(m.date), 'MMM d'),
        restingHR: m.resting_heart_rate,
        hrv: m.heart_rate_variability ? Math.round(m.heart_rate_variability) : null,
        vo2Max: m.vo2_max ? Math.round(m.vo2_max * 10) / 10 : null,
      }))
  }, [filteredMetrics])

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (filteredMetrics.length === 0) return null

    const totalDays = filteredMetrics.length
    let perfectDays = 0
    let moveDays = 0
    let exerciseDays = 0
    let standDays = 0
    let totalSteps = 0
    let totalCalories = 0
    let totalExercise = 0

    filteredMetrics.forEach(m => {
      const moveGoal = m.move_goal || 500
      const exerciseGoal = m.exercise_goal || 30
      const standGoal = m.stand_goal || 12

      const moveComplete = m.active_calories >= moveGoal
      const exerciseComplete = m.exercise_minutes >= exerciseGoal
      const standComplete = m.stand_hours >= standGoal

      if (moveComplete) moveDays++
      if (exerciseComplete) exerciseDays++
      if (standComplete) standDays++
      if (moveComplete && exerciseComplete && standComplete) perfectDays++

      totalSteps += m.steps
      totalCalories += m.active_calories
      totalExercise += m.exercise_minutes
    })

    const avgSteps = Math.round(totalSteps / totalDays)
    const avgCalories = Math.round(totalCalories / totalDays)
    const avgExercise = Math.round(totalExercise / totalDays)

    // Health averages
    const hrMetrics = filteredMetrics.filter(m => m.resting_heart_rate)
    const hrvMetrics = filteredMetrics.filter(m => m.heart_rate_variability)
    const avgRestingHR = hrMetrics.length > 0
      ? Math.round(hrMetrics.reduce((sum, m) => sum + (m.resting_heart_rate || 0), 0) / hrMetrics.length)
      : null
    const avgHRV = hrvMetrics.length > 0
      ? Math.round(hrvMetrics.reduce((sum, m) => sum + (m.heart_rate_variability || 0), 0) / hrvMetrics.length)
      : null

    return {
      totalDays,
      perfectDays,
      perfectPercent: Math.round((perfectDays / totalDays) * 100),
      moveDays,
      movePercent: Math.round((moveDays / totalDays) * 100),
      exerciseDays,
      exercisePercent: Math.round((exerciseDays / totalDays) * 100),
      standDays,
      standPercent: Math.round((standDays / totalDays) * 100),
      avgSteps,
      avgCalories,
      avgExercise,
      avgRestingHR,
      avgHRV,
      totalSteps,
      totalCalories: Math.round(totalCalories),
      totalExercise,
    }
  }, [filteredMetrics])

  // Personal records
  const personalRecords = useMemo(() => {
    if (filteredMetrics.length === 0) return []

    const records: {
      id: string
      label: string
      value: string
      date: string
      icon: React.ReactNode
    }[] = []

    // Most steps
    const maxSteps = filteredMetrics.reduce((best, m) => m.steps > best.steps ? m : best)
    records.push({
      id: 'max-steps',
      label: 'Most Steps',
      value: maxSteps.steps.toLocaleString(),
      date: format(new Date(maxSteps.date), 'MMM d'),
      icon: <Footprints className="size-4 text-blue-500" />,
    })

    // Most calories
    const maxCalories = filteredMetrics.reduce((best, m) => m.active_calories > best.active_calories ? m : best)
    records.push({
      id: 'max-calories',
      label: 'Most Calories',
      value: Math.round(maxCalories.active_calories).toLocaleString() + ' cal',
      date: format(new Date(maxCalories.date), 'MMM d'),
      icon: <Flame className="size-4 text-orange-500" />,
    })

    // Most exercise
    const maxExercise = filteredMetrics.reduce((best, m) => m.exercise_minutes > best.exercise_minutes ? m : best)
    records.push({
      id: 'max-exercise',
      label: 'Most Exercise',
      value: maxExercise.exercise_minutes + ' min',
      date: format(new Date(maxExercise.date), 'MMM d'),
      icon: <Activity className="size-4 text-green-500" />,
    })

    // Lowest resting HR (good)
    const hrMetrics = filteredMetrics.filter(m => m.resting_heart_rate && m.resting_heart_rate > 30)
    if (hrMetrics.length > 0) {
      const lowestHR = hrMetrics.reduce((best, m) =>
        (m.resting_heart_rate || 999) < (best.resting_heart_rate || 999) ? m : best
      )
      records.push({
        id: 'lowest-hr',
        label: 'Lowest Resting HR',
        value: lowestHR.resting_heart_rate + ' bpm',
        date: format(new Date(lowestHR.date), 'MMM d'),
        icon: <Heart className="size-4 text-red-500" />,
      })
    }

    // Highest HRV (good)
    const hrvMetrics = filteredMetrics.filter(m => m.heart_rate_variability)
    if (hrvMetrics.length > 0) {
      const highestHRV = hrvMetrics.reduce((best, m) =>
        (m.heart_rate_variability || 0) > (best.heart_rate_variability || 0) ? m : best
      )
      records.push({
        id: 'highest-hrv',
        label: 'Highest HRV',
        value: Math.round(highestHRV.heart_rate_variability || 0) + ' ms',
        date: format(new Date(highestHRV.date), 'MMM d'),
        icon: <HeartPulse className="size-4 text-purple-500" />,
      })
    }

    return records
  }, [filteredMetrics])

  // Weekly comparison
  const weeklyComparison = useMemo(() => {
    if (filteredMetrics.length < 14) return null

    const thisWeekMetrics = filteredMetrics.slice(-7)
    const lastWeekMetrics = filteredMetrics.slice(-14, -7)

    const thisWeekAvgSteps = Math.round(thisWeekMetrics.reduce((sum, m) => sum + m.steps, 0) / 7)
    const lastWeekAvgSteps = Math.round(lastWeekMetrics.reduce((sum, m) => sum + m.steps, 0) / 7)
    const stepsChange = thisWeekAvgSteps - lastWeekAvgSteps
    const stepsChangePercent = lastWeekAvgSteps > 0 ? Math.round((stepsChange / lastWeekAvgSteps) * 100) : 0

    const thisWeekAvgCals = Math.round(thisWeekMetrics.reduce((sum, m) => sum + m.active_calories, 0) / 7)
    const lastWeekAvgCals = Math.round(lastWeekMetrics.reduce((sum, m) => sum + m.active_calories, 0) / 7)
    const calsChange = thisWeekAvgCals - lastWeekAvgCals
    const calsChangePercent = lastWeekAvgCals > 0 ? Math.round((calsChange / lastWeekAvgCals) * 100) : 0

    return {
      thisWeekAvgSteps,
      lastWeekAvgSteps,
      stepsChange,
      stepsChangePercent,
      thisWeekAvgCals,
      lastWeekAvgCals,
      calsChange,
      calsChangePercent,
    }
  }, [filteredMetrics])

  const ringChartConfig: ChartConfig = {
    movePercent: { label: 'Move', color: '#FF2D55' },
    exercisePercent: { label: 'Exercise', color: '#92E82A' },
    standPercent: { label: 'Stand', color: '#00D4FF' },
  }

  const activityChartConfig: ChartConfig = {
    steps: { label: 'Steps', color: '#60a5fa' },
    activeCalories: { label: 'Active Cal', color: '#f97316' },
    exerciseMinutes: { label: 'Exercise', color: '#22c55e' },
  }

  const healthChartConfig: ChartConfig = {
    restingHR: { label: 'Resting HR', color: '#ef4444' },
    hrv: { label: 'HRV', color: '#a855f7' },
    vo2Max: { label: 'VO2 Max', color: '#06b6d4' },
  }

  if (dailyMetrics.length === 0) {
    return null
  }

  return (
    <div className={cn('mt-8 space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Target className="size-5 text-primary" />
            Activity Insights
          </h2>
          <p className="text-muted-foreground text-sm">
            {filteredMetrics.length} days of activity data
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric selector */}
          <div className="flex rounded-lg bg-muted/50 p-1">
            {[
              { value: 'rings', label: 'Rings' },
              { value: 'steps', label: 'Activity' },
              { value: 'health', label: 'Health' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedMetric(option.value as typeof selectedMetric)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  selectedMetric === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Time range selector */}
          <div className="flex rounded-lg bg-muted/50 p-1">
            {TIME_RANGES.map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                  timeRange === range.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      {summaryStats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Sparkles className="size-3.5 text-green-500" />
              Perfect Days
            </div>
            <div className="mt-1 text-2xl font-bold">{summaryStats.perfectDays}</div>
            <div className="text-muted-foreground text-xs">
              {summaryStats.perfectPercent}% of {summaryStats.totalDays} days
            </div>
          </div>

          <div className="rounded-xl bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Footprints className="size-3.5 text-blue-500" />
              Avg Steps
            </div>
            <div className="mt-1 text-2xl font-bold">{summaryStats.avgSteps.toLocaleString()}</div>
            {weeklyComparison && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                weeklyComparison.stepsChange >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {weeklyComparison.stepsChange >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {weeklyComparison.stepsChangePercent}% vs last week
              </div>
            )}
          </div>

          <div className="rounded-xl bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Flame className="size-3.5 text-orange-500" />
              Avg Calories
            </div>
            <div className="mt-1 text-2xl font-bold">{summaryStats.avgCalories.toLocaleString()}</div>
            {weeklyComparison && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                weeklyComparison.calsChange >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {weeklyComparison.calsChange >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {weeklyComparison.calsChangePercent}% vs last week
              </div>
            )}
          </div>

          <div className="rounded-xl bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Activity className="size-3.5 text-green-500" />
              Avg Exercise
            </div>
            <div className="mt-1 text-2xl font-bold">{summaryStats.avgExercise} min</div>
            <div className="text-muted-foreground text-xs">
              {summaryStats.totalExercise.toLocaleString()} min total
            </div>
          </div>
        </div>
      )}

      {/* Ring Completion Stats */}
      {summaryStats && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl bg-muted/30 p-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#FF2D55]/20">
              <Flame className="size-6 text-[#FF2D55]" />
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Move Ring</div>
              <div className="text-xl font-bold">{summaryStats.movePercent}%</div>
              <div className="text-muted-foreground text-xs">{summaryStats.moveDays}/{summaryStats.totalDays} days</div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl bg-muted/30 p-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#92E82A]/20">
              <Activity className="size-6 text-[#92E82A]" />
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Exercise Ring</div>
              <div className="text-xl font-bold">{summaryStats.exercisePercent}%</div>
              <div className="text-muted-foreground text-xs">{summaryStats.exerciseDays}/{summaryStats.totalDays} days</div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl bg-muted/30 p-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#00D4FF]/20">
              <TrendingUp className="size-6 text-[#00D4FF]" />
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Stand Ring</div>
              <div className="text-xl font-bold">{summaryStats.standPercent}%</div>
              <div className="text-muted-foreground text-xs">{summaryStats.standDays}/{summaryStats.totalDays} days</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="rounded-xl bg-muted/30 p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">
            {selectedMetric === 'rings' && 'Ring Completion Over Time'}
            {selectedMetric === 'steps' && 'Activity Trends'}
            {selectedMetric === 'health' && 'Health Metrics'}
          </h3>

          {selectedMetric === 'rings' && ringCompletionData.length > 0 && (
            <ChartContainer config={ringChartConfig} className="h-[250px] w-full">
              <AreaChart data={ringCompletionData.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 150]}
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="movePercent"
                  stroke="#FF2D55"
                  fill="#FF2D55"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="exercisePercent"
                  stroke="#92E82A"
                  fill="#92E82A"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="standPercent"
                  stroke="#00D4FF"
                  fill="#00D4FF"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}

          {selectedMetric === 'steps' && activityTrendData.length > 0 && (
            <ChartContainer config={activityChartConfig} className="h-[250px] w-full">
              <BarChart data={activityTrendData.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="left" dataKey="steps" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="activeCalories" stroke="#f97316" strokeWidth={2} dot={false} />
              </BarChart>
            </ChartContainer>
          )}

          {selectedMetric === 'health' && healthTrendData.length > 0 && (
            <ChartContainer config={healthChartConfig} className="h-[250px] w-full">
              <LineChart data={healthTrendData.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="restingHR"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="hrv"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          )}

          {((selectedMetric === 'rings' && ringCompletionData.length === 0) ||
            (selectedMetric === 'steps' && activityTrendData.length === 0) ||
            (selectedMetric === 'health' && healthTrendData.length === 0)) && (
            <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
              No data for selected period
            </div>
          )}
        </div>

        {/* Personal Records */}
        <div className="rounded-xl bg-muted/30 p-5">
          <h3 className="mb-4 font-semibold">Personal Bests</h3>

          {personalRecords.length > 0 ? (
            <div className="space-y-2">
              {personalRecords.map(record => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg bg-background/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    {record.icon}
                    <div>
                      <div className="text-sm font-medium">{record.label}</div>
                      <div className="text-muted-foreground text-xs">{record.date}</div>
                    </div>
                  </div>
                  <div className="font-bold tabular-nums">{record.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
              No records yet
            </div>
          )}

          {/* Health averages */}
          {summaryStats && (summaryStats.avgRestingHR || summaryStats.avgHRV) && (
            <div className="mt-4 border-t border-border/30 pt-4">
              <h4 className="mb-3 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Health Averages
              </h4>
              <div className="space-y-2">
                {summaryStats.avgRestingHR && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Heart className="size-4 text-red-500" />
                      Resting HR
                    </span>
                    <span className="font-medium">{summaryStats.avgRestingHR} bpm</span>
                  </div>
                )}
                {summaryStats.avgHRV && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <HeartPulse className="size-4 text-purple-500" />
                      HRV
                    </span>
                    <span className="font-medium">{summaryStats.avgHRV} ms</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Totals Row */}
      {summaryStats && (
        <div className="rounded-xl bg-gradient-to-r from-primary/5 to-transparent p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Calendar className="size-4" />
            Period Totals ({TIME_RANGES.find(r => r.value === timeRange)?.label})
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">{summaryStats.totalSteps.toLocaleString()}</div>
              <div className="text-muted-foreground text-sm">Total Steps</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">{summaryStats.totalCalories.toLocaleString()}</div>
              <div className="text-muted-foreground text-sm">Active Calories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{summaryStats.totalExercise.toLocaleString()}</div>
              <div className="text-muted-foreground text-sm">Exercise Minutes</div>
            </div>
          </div>
        </div>
      )}
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
  syncMetadata?: SyncMetadata | null
  className?: string
}

export function FitnessDashboard({
  workouts,
  dailyMetrics,
  weeklySummary,
  onWorkoutClick,
  syncMetadata,
  className,
}: FitnessDashboardProps) {
  const dayGroups = useMemo(() => groupWorkoutsByDay(workouts), [workouts])
  const todayMetrics = dailyMetrics[0] ?? null
  const otherGroups = dayGroups.filter(g => !isToday(g.date))

  return (
    <div className={cn('space-y-3', className)}>
      {/* ==================== TIER 1: AT A GLANCE ==================== */}
      <div className="space-y-2">
        <TodayHero
          workouts={workouts}
          metrics={todayMetrics}
          dailyMetrics={dailyMetrics}
          onWorkoutClick={onWorkoutClick}
          lastSyncTimestamp={syncMetadata?.lastSyncTimestamp}
        />
        <div className="flex gap-2">
          {weeklySummary[0] && (
            <div className="flex-1">
              <WeeklyStatsSection
                summary={weeklySummary[0]}
                previousSummary={weeklySummary[1]}
              />
            </div>
          )}
          <HealthVitalsRow dailyMetrics={dailyMetrics} />
        </div>
        <TrainingOverview workouts={workouts} dailyMetrics={dailyMetrics} />
      </div>

      {/* ==================== TIER 2: TRAINING LOG ==================== */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
        {/* Recent Days */}
        {otherGroups.length > 0 && (
          <div className="divide-y divide-border/20 rounded-xl border border-border/50 bg-card">
            {otherGroups.slice(0, 7).map((group, idx) => (
              <DayGroupSection
                key={group.dateKey}
                group={group}
                onWorkoutClick={onWorkoutClick}
                defaultExpanded={idx === 0}
              />
            ))}
          </div>
        )}

        {/* Month Snapshot - desktop sidebar */}
        <div className="hidden lg:block">
          <MonthSnapshot
            workouts={workouts}
            dailyMetrics={dailyMetrics}
            onWorkoutClick={onWorkoutClick}
          />
        </div>
      </div>

      {/* Month Snapshot - mobile */}
      <div className="lg:hidden">
        <MonthSnapshot
          workouts={workouts}
          dailyMetrics={dailyMetrics}
          onWorkoutClick={onWorkoutClick}
        />
      </div>

      {/* ==================== TIER 3: ANALYTICS ==================== */}
      {(workouts.length > 0 || dailyMetrics.length > 0) && (
        <UnifiedAnalytics
          workouts={workouts}
          dailyMetrics={dailyMetrics}
          onWorkoutClick={onWorkoutClick}
        />
      )}

      {/* Empty state */}
      {workouts.length === 0 && dailyMetrics.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border/50 py-12 text-center">
          <Watch className="text-muted-foreground/30 mx-auto mb-3 size-12" />
          <h3 className="mb-1 text-sm font-semibold">No workouts yet</h3>
          <p className="text-muted-foreground text-xs">
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
            move={metrics.active_calories}
            moveGoal={metrics.move_goal || 500}
            exercise={metrics.exercise_minutes}
            exerciseGoal={metrics.exercise_goal || 30}
            stand={metrics.stand_hours}
            standGoal={metrics.stand_goal || 12}
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
