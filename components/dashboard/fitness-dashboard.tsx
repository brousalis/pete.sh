"use client"

import { useState, useMemo } from "react"
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
  ChevronRight,
  Calendar,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Target,
  Dumbbell,
  Bike,
  Route,
  BarChart3,
  Clock,
  Award,
  Plus,
  Minus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { format, isToday, isYesterday, startOfDay, differenceInDays } from "date-fns"

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
  cadence_average: number | null
  pace_average: number | null
  pace_best: number | null
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
function getWorkoutIcon(type: string, size: "sm" | "md" | "lg" = "md") {
  const sizeClass = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5"
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

const WORKOUT_COLORS: Record<string, string> = {
  running: "text-green-500 bg-green-500/10 border-green-500/30",
  walking: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  cycling: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  functionalStrengthTraining: "text-purple-500 bg-purple-500/10 border-purple-500/30",
  traditionalStrengthTraining: "text-purple-500 bg-purple-500/10 border-purple-500/30",
  coreTraining: "text-pink-500 bg-pink-500/10 border-pink-500/30",
  hiit: "text-red-500 bg-red-500/10 border-red-500/30",
  rowing: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
  stairClimbing: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  elliptical: "text-teal-500 bg-teal-500/10 border-teal-500/30",
  other: "text-gray-500 bg-gray-500/10 border-gray-500/30",
}

const WORKOUT_LABELS: Record<string, string> = {
  running: "Run",
  walking: "Walk",
  cycling: "Cycle",
  functionalStrengthTraining: "Strength",
  traditionalStrengthTraining: "Weights",
  coreTraining: "Core",
  hiit: "HIIT",
  rowing: "Row",
  stairClimbing: "Stairs",
  elliptical: "Elliptical",
  other: "Workout",
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

function getTimeOfDay(date: Date): { icon: React.ReactNode; label: string } {
  const hour = date.getHours()
  if (hour < 6) return { icon: <Moon className="size-3" />, label: "Night" }
  if (hour < 12) return { icon: <Sunrise className="size-3" />, label: "Morning" }
  if (hour < 17) return { icon: <Sun className="size-3" />, label: "Afternoon" }
  if (hour < 21) return { icon: <Sunset className="size-3" />, label: "Evening" }
  return { icon: <Moon className="size-3" />, label: "Night" }
}

function getDayDisplayName(date: Date): string {
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  const daysAgo = differenceInDays(new Date(), date)
  if (daysAgo < 7) return format(date, "EEEE")
  return format(date, "EEE, MMM d")
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
      const totalCalories = dayWorkouts.reduce((sum, w) => sum + w.active_calories, 0)
      const totalDistance = dayWorkouts.reduce((sum, w) => sum + (w.distance_miles || 0), 0)
      const hrValues = dayWorkouts.filter(w => w.hr_average).map(w => w.hr_average!)
      const avgHr = hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 0
      
      // Sort workouts by time within the day
      dayWorkouts.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      
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
  move, moveGoal, exercise, exerciseGoal, stand, standGoal, 
  size = 100, 
  className,
  showLegend = false 
}: ActivityRingsProps) {
  const strokeWidth = size * 0.08
  const radius = (size - strokeWidth) / 2
  
  const moveProgress = Math.min((move / moveGoal) * 100, 100)
  const exerciseProgress = Math.min((exercise / exerciseGoal) * 100, 100)
  const standProgress = Math.min((stand / standGoal) * 100, 100)
  
  const rings = [
    { progress: moveProgress, color: "#FF2D55", label: "Move", value: move, goal: moveGoal, unit: "cal", icon: <Flame className="size-3" /> },
    { progress: exerciseProgress, color: "#92E82A", label: "Exercise", value: exercise, goal: exerciseGoal, unit: "min", icon: <Activity className="size-3" /> },
    { progress: standProgress, color: "#00D4FF", label: "Stand", value: stand, goal: standGoal, unit: "hrs", icon: <TrendingUp className="size-3" /> },
  ]
  
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {rings.map((ring, i) => {
            const r = radius - (i * strokeWidth * 1.4)
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
        <div className="flex flex-col gap-1.5 w-full">
          {rings.map((ring) => (
            <div key={ring.label} className="flex items-center justify-between text-xs">
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
// WORKOUT SESSION CARD
// ============================================

interface WorkoutSessionCardProps {
  workout: AppleWorkout
  onClick?: () => void
  showTimeOfDay?: boolean
  isFirst?: boolean
  isLast?: boolean
}

function WorkoutSessionCard({ workout, onClick, showTimeOfDay = true, isFirst, isLast }: WorkoutSessionCardProps) {
  const startTime = new Date(workout.start_date)
  const timeOfDay = getTimeOfDay(startTime)
  const colorClass = WORKOUT_COLORS[workout.workout_type] || WORKOUT_COLORS.other
  const icon = getWorkoutIcon(workout.workout_type, "md")
  const label = WORKOUT_LABELS[workout.workout_type] || workout.workout_type
  const isCardio = ['running', 'walking', 'cycling', 'rowing', 'stairClimbing', 'elliptical'].includes(workout.workout_type)

  return (
    <div 
      className={cn(
        "relative pl-7 md:pl-8 pb-4 md:pb-5 group cursor-pointer",
        !isLast && "border-l-2 border-border/50 ml-2.5"
      )}
      onClick={onClick}
    >
      {/* Timeline dot */}
      <div className={cn(
        "absolute -left-[11px] top-0 size-5 md:size-6 rounded-full border-2 bg-background flex items-center justify-center",
        colorClass.split(' ')[0],
        "border-current"
      )}>
        <div className="size-2.5 md:size-3 rounded-full bg-current" />
      </div>

      {/* Card */}
      <Card className={cn(
        "border-2 transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.99]",
        colorClass.split(' ').slice(1).join(' ')
      )}>
        <CardContent className="p-4 md:p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 md:p-2.5 rounded-lg", colorClass.split(' ').slice(1).join(' '))}>
                {icon}
              </div>
              <div>
                <div className="font-semibold text-base md:text-lg">{label}</div>
                <div className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5">
                  {showTimeOfDay && (
                    <>
                      {timeOfDay.icon}
                      <span>{format(startTime, 'h:mm a')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Stats row - responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-wrap gap-3 md:gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Timer className="size-4 text-muted-foreground" />
              <span className="font-medium">{formatDuration(workout.duration)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="size-4 text-orange-500" />
              <span className="font-medium">{Math.round(workout.active_calories)} cal</span>
            </div>
            {workout.hr_average && (
              <div className="flex items-center gap-1.5">
                <Heart className="size-4 text-red-500" />
                <span className="font-medium">{workout.hr_average} bpm</span>
              </div>
            )}
            {isCardio && workout.distance_miles && (
              <div className="flex items-center gap-1.5">
                <Route className="size-4 text-blue-500" />
                <span className="font-medium">{workout.distance_miles.toFixed(2)} mi</span>
              </div>
            )}
            {workout.workout_type === 'running' && workout.pace_average && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-4" />
                <span>{formatPace(workout.pace_average)}/mi</span>
              </div>
            )}
            {workout.workout_type === 'running' && workout.cadence_average && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Footprints className="size-4" />
                <span>{workout.cadence_average} spm</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// DAY GROUP CARD
// ============================================

interface DayGroupCardProps {
  group: DayGroup
  onWorkoutClick: (workoutId: string) => void
  defaultExpanded?: boolean
}

function DayGroupCard({ group, onWorkoutClick, defaultExpanded = false }: DayGroupCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isCurrentDay = isToday(group.date)
  
  // Get workout type breakdown
  const typeBreakdown = group.workouts.reduce((acc, w) => {
    const type = WORKOUT_LABELS[w.workout_type] || w.workout_type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isCurrentDay && "border-primary/50 bg-primary/5"
    )}>
      {/* Day Header - Always visible */}
      <div 
        className="p-4 md:p-5 cursor-pointer hover:bg-muted/30 transition-colors active:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Date badge */}
            <div className={cn(
              "flex flex-col items-center justify-center size-14 md:size-16 rounded-xl",
              isCurrentDay ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wide">
                {format(group.date, 'EEE')}
              </span>
              <span className="text-xl md:text-2xl font-bold leading-none">
                {format(group.date, 'd')}
              </span>
            </div>
            
            {/* Day info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base md:text-lg">{group.displayName}</span>
                {isCurrentDay && (
                  <Badge variant="default" className="text-xs px-2 py-0.5">
                    Today
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                <span className="font-medium">{group.workoutCount} session{group.workoutCount !== 1 ? 's' : ''}</span>
                <span className="hidden sm:inline">•</span>
                <div className="hidden sm:flex items-center gap-1">
                  {Object.entries(typeBreakdown).map(([type, count], i) => (
                    <span key={type} className="flex items-center gap-0.5">
                      {i > 0 && <span className="text-muted-foreground/50">,</span>}
                      <span>{count} {type}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Day totals */}
          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden md:flex items-center gap-4 lg:gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-muted-foreground" />
                <span className="font-semibold">{formatDuration(group.totalDuration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-orange-500" />
                <span className="font-semibold">{Math.round(group.totalCalories)} cal</span>
              </div>
              {group.totalDistance > 0 && (
                <div className="flex items-center gap-2">
                  <Route className="size-4 text-blue-500" />
                  <span className="font-semibold">{group.totalDistance.toFixed(1)} mi</span>
                </div>
              )}
              {group.avgHr > 0 && (
                <div className="flex items-center gap-2">
                  <Heart className="size-4 text-red-500" />
                  <span className="font-semibold">{group.avgHr} avg</span>
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="icon" className="size-10 md:size-11">
              {expanded ? <Minus className="size-5" /> : <Plus className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile/Tablet totals - shown below on smaller screens */}
        <div className="md:hidden flex items-center flex-wrap gap-3 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Timer className="size-4 text-muted-foreground" />
            <span className="font-medium">{formatDuration(group.totalDuration)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="size-4 text-orange-500" />
            <span className="font-medium">{Math.round(group.totalCalories)} cal</span>
          </div>
          {group.totalDistance > 0 && (
            <div className="flex items-center gap-1.5">
              <Route className="size-4 text-blue-500" />
              <span className="font-medium">{group.totalDistance.toFixed(1)} mi</span>
            </div>
          )}
          {group.avgHr > 0 && (
            <div className="flex items-center gap-1.5">
              <Heart className="size-4 text-red-500" />
              <span className="font-medium">{group.avgHr} avg</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded workout list */}
      {expanded && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 border-t bg-muted/10">
          <div className="pt-4 md:pt-5">
            {group.workouts.map((workout, idx) => (
              <WorkoutSessionCard
                key={workout.id}
                workout={workout}
                onClick={() => onWorkoutClick(workout.id)}
                isFirst={idx === 0}
                isLast={idx === group.workouts.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ============================================
// TODAY HERO CARD
// ============================================

interface TodayHeroProps {
  workouts: AppleWorkout[]
  metrics: DailyMetrics | null
  onWorkoutClick: (workoutId: string) => void
}

function TodayHero({ workouts, metrics, onWorkoutClick }: TodayHeroProps) {
  const todayWorkouts = workouts.filter(w => isToday(new Date(w.start_date)))
  const totalDuration = todayWorkouts.reduce((sum, w) => sum + w.duration, 0)
  const totalCalories = todayWorkouts.reduce((sum, w) => sum + w.active_calories, 0)
  const totalDistance = todayWorkouts.reduce((sum, w) => sum + (w.distance_miles || 0), 0)
  
  // Get best stats from today
  const avgHr = todayWorkouts.filter(w => w.hr_average).length > 0
    ? Math.round(todayWorkouts.filter(w => w.hr_average).reduce((sum, w) => sum + w.hr_average!, 0) / todayWorkouts.filter(w => w.hr_average).length)
    : 0
  
  const runs = todayWorkouts.filter(w => w.workout_type === 'running')
  const bestPace = runs.length > 0 && runs.some(r => r.pace_best)
    ? Math.min(...runs.filter(r => r.pace_best).map(r => r.pace_best!))
    : null

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-5 md:p-6">
        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
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
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold">Today</h2>
              <div className="text-sm text-muted-foreground mt-1">
                {format(new Date(), 'EEEE, MMMM d')}
              </div>
              
              {todayWorkouts.length > 0 ? (
                <div className="mt-4">
                  <Badge variant="secondary" className="font-medium text-sm px-3 py-1">
                    {todayWorkouts.length} workout{todayWorkouts.length !== 1 ? 's' : ''} completed
                  </Badge>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground mt-4">
                  No workouts yet today
                </div>
              )}
            </div>
          </div>

          {/* Right: Today's workout summary stats - always visible when workouts exist */}
          {todayWorkouts.length > 0 && (
            <div className="md:border-l md:pl-6">
              <div className="text-sm font-medium text-muted-foreground mb-4">Today's Sessions</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="size-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Duration</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold">{formatDuration(totalDuration)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="size-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground">Calories</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold">{Math.round(totalCalories)}</div>
                </div>
                {totalDistance > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Route className="size-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Miles</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{totalDistance.toFixed(2)}</div>
                  </div>
                )}
                {avgHr > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="size-4 text-red-500" />
                      <span className="text-xs text-muted-foreground">Avg HR</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{avgHr} <span className="text-sm font-normal text-muted-foreground">bpm</span></div>
                  </div>
                )}
                {bestPace && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="size-4 text-amber-500" />
                      <span className="text-xs text-muted-foreground">Best Pace</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{formatPace(bestPace)} <span className="text-sm font-normal text-muted-foreground">/mi</span></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today's workouts timeline */}
        {todayWorkouts.length > 0 && (
          <div className="mt-6 pt-5 border-t">
            <div className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="size-4" />
              Today's Timeline
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayWorkouts.map((workout) => {
                const colorClass = WORKOUT_COLORS[workout.workout_type] || WORKOUT_COLORS.other
                const icon = getWorkoutIcon(workout.workout_type, "md")
                const label = WORKOUT_LABELS[workout.workout_type] || workout.workout_type
                const isCardio = ['running', 'walking', 'cycling', 'rowing', 'stairClimbing', 'elliptical'].includes(workout.workout_type)
                
                return (
                  <div
                    key={workout.id}
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                      colorClass.split(' ').slice(1).join(' ')
                    )}
                    onClick={() => onWorkoutClick(workout.id)}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-2 rounded-lg", colorClass.split(' ').slice(1).join(' '))}>
                          {icon}
                        </div>
                        <div>
                          <div className="font-semibold text-base">{label}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(workout.start_date), 'h:mm a')}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </div>
                    
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Timer className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{formatDuration(workout.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Flame className="size-3.5 text-orange-500" />
                        <span className="font-medium">{Math.round(workout.active_calories)} cal</span>
                      </div>
                      {workout.hr_average && (
                        <div className="flex items-center gap-1.5">
                          <Heart className="size-3.5 text-red-500" />
                          <span className="font-medium">{workout.hr_average} bpm</span>
                        </div>
                      )}
                      {isCardio && workout.distance_miles && (
                        <div className="flex items-center gap-1.5">
                          <Route className="size-3.5 text-blue-500" />
                          <span className="font-medium">{workout.distance_miles.toFixed(2)} mi</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// WEEKLY STATS BAR
// ============================================

interface WeeklyStatsBarProps {
  summary: WeeklySummary
  previousSummary?: WeeklySummary
}

function WeeklyStatsBar({ summary, previousSummary }: WeeklyStatsBarProps) {
  const getTrend = (current: number, previous: number | undefined) => {
    if (!previous) return null
    const diff = ((current - previous) / previous) * 100
    if (Math.abs(diff) < 1) return null
    return diff
  }

  const workoutTrend = getTrend(summary.totalWorkouts, previousSummary?.totalWorkouts)
  const calorieTrend = getTrend(summary.totalCalories, previousSummary?.totalCalories)
  const distanceTrend = getTrend(summary.totalDistanceMiles, previousSummary?.totalDistanceMiles)

  const stats = [
    { 
      label: "Workouts", 
      value: summary.totalWorkouts, 
      unit: "", 
      trend: workoutTrend,
      icon: <Dumbbell className="size-5 text-purple-500" />
    },
    { 
      label: "Duration", 
      value: summary.totalDurationMin, 
      unit: "min", 
      icon: <Timer className="size-5 text-blue-500" />
    },
    { 
      label: "Calories", 
      value: summary.totalCalories.toLocaleString(), 
      unit: "", 
      trend: calorieTrend,
      icon: <Flame className="size-5 text-orange-500" />
    },
    { 
      label: "Distance", 
      value: summary.totalDistanceMiles.toFixed(1), 
      unit: "mi", 
      trend: distanceTrend,
      icon: <Route className="size-5 text-green-500" />
    },
  ]

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-muted-foreground" />
            <span className="font-semibold">This Week</span>
          </div>
          <span className="text-sm text-muted-foreground">
            Week of {format(new Date(summary.weekStart), 'MMM d')}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 md:gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex justify-center mb-2">{stat.icon}</div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-xl md:text-2xl font-bold tabular-nums">{stat.value}</span>
                {stat.unit && <span className="text-xs md:text-sm text-muted-foreground">{stat.unit}</span>}
                {stat.trend && (
                  <span className={cn(
                    "text-xs flex items-center ml-0.5",
                    stat.trend > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {stat.trend > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
        
        {/* Workout type breakdown */}
        {Object.keys(summary.workoutTypes).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {Object.entries(summary.workoutTypes).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-xs px-2.5 py-1">
                {WORKOUT_LABELS[type] || type}: {count}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
  className
}: FitnessDashboardProps) {
  const dayGroups = useMemo(() => groupWorkoutsByDay(workouts), [workouts])
  const todayMetrics = dailyMetrics.length > 0 ? dailyMetrics[0] : null
  const todayGroup = dayGroups.find(g => isToday(g.date))
  const otherGroups = dayGroups.filter(g => !isToday(g.date))

  return (
    <div className={cn("space-y-5 md:space-y-6", className)}>
      {/* Today Hero Section */}
      <TodayHero
        workouts={workouts}
        metrics={todayMetrics}
        onWorkoutClick={onWorkoutClick}
      />

      {/* Weekly Stats */}
      {weeklySummary[0] && (
        <WeeklyStatsBar 
          summary={weeklySummary[0]} 
          previousSummary={weeklySummary[1]} 
        />
      )}

      {/* Previous Days */}
      {otherGroups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-muted-foreground flex items-center gap-2 px-1">
            <BarChart3 className="size-5" />
            Recent Days
          </h3>
          {otherGroups.map((group, idx) => (
            <DayGroupCard
              key={group.dateKey}
              group={group}
              onWorkoutClick={onWorkoutClick}
              defaultExpanded={idx === 0}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {workouts.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <Watch className="size-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold text-lg mb-2">No workouts yet</h3>
            <p className="text-muted-foreground">
              Complete a workout with PeteWatch to see it here
            </p>
          </CardContent>
        </Card>
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
  className
}: TodayActivityBarProps) {
  const todayWorkouts = workouts.filter(w => isToday(new Date(w.start_date)))
  const totalDuration = todayWorkouts.reduce((sum, w) => sum + w.duration, 0)
  const totalCalories = todayWorkouts.reduce((sum, w) => sum + w.active_calories, 0)
  const totalDistance = todayWorkouts.reduce((sum, w) => sum + (w.distance_miles || 0), 0)
  
  // Activity ring progress
  const moveProgress = metrics ? Math.min((metrics.active_calories / (metrics.move_goal || 500)) * 100, 100) : 0
  const exerciseProgress = metrics ? Math.min((metrics.exercise_minutes / (metrics.exercise_goal || 30)) * 100, 100) : 0
  const standProgress = metrics ? Math.min((metrics.stand_hours / (metrics.stand_goal || 12)) * 100, 100) : 0

  if (todayWorkouts.length === 0 && !metrics) {
    return null
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg bg-muted/30 border",
      className
    )}>
      {/* Mini Activity Rings */}
      {metrics && (
        <div className="flex items-center gap-3 pr-3 border-r">
          <MiniActivityRings
            move={moveProgress}
            exercise={exerciseProgress}
            stand={standProgress}
            size={40}
          />
          <div className="hidden sm:flex flex-col gap-0.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[#FF2D55]" />
              <span className="text-muted-foreground">{metrics.active_calories}/{metrics.move_goal || 500}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[#92E82A]" />
              <span className="text-muted-foreground">{metrics.exercise_minutes}/{metrics.exercise_goal || 30}m</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[#00D4FF]" />
              <span className="text-muted-foreground">{metrics.stand_hours}/{metrics.stand_goal || 12}h</span>
            </div>
          </div>
        </div>
      )}

      {/* Today's workouts summary */}
      {todayWorkouts.length > 0 ? (
        <>
          <div className="flex items-center gap-2 pr-3 border-r">
            <div className="text-center">
              <div className="text-lg font-bold leading-none">{todayWorkouts.length}</div>
              <div className="text-[9px] text-muted-foreground">Workouts</div>
            </div>
          </div>

          {/* Workout pills */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            {todayWorkouts.slice(0, 4).map((workout) => {
              const colorClass = WORKOUT_COLORS[workout.workout_type] || WORKOUT_COLORS.other
              const icon = getWorkoutIcon(workout.workout_type, "sm")
              const label = WORKOUT_LABELS[workout.workout_type] || workout.workout_type
              
              return (
                <button
                  key={workout.id}
                  onClick={() => onWorkoutClick?.(workout.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs whitespace-nowrap transition-all hover:scale-105",
                    colorClass.split(' ').slice(1).join(' '),
                    onWorkoutClick && "cursor-pointer"
                  )}
                >
                  {icon}
                  <span className="font-medium">{label}</span>
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
          <div className="hidden md:flex items-center gap-4 pl-3 border-l text-xs">
            <div className="flex items-center gap-1">
              <Timer className="size-3.5 text-muted-foreground" />
              <span className="font-medium">{formatDuration(totalDuration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Flame className="size-3.5 text-orange-500" />
              <span className="font-medium">{Math.round(totalCalories)}</span>
            </div>
            {totalDistance > 0 && (
              <div className="flex items-center gap-1">
                <Route className="size-3.5 text-green-500" />
                <span className="font-medium">{totalDistance.toFixed(1)} mi</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 text-xs text-muted-foreground">
          No workouts recorded today
        </div>
      )}

      {/* View All */}
      {onViewAll && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs shrink-0"
          onClick={onViewAll}
        >
          <Watch className="size-3.5 mr-1" />
          Details
          <ChevronRight className="size-3 ml-0.5" />
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

function MiniActivityRings({ move, exercise, stand, size = 40 }: MiniActivityRingsProps) {
  const strokeWidth = size * 0.12
  const radius = (size - strokeWidth) / 2
  
  const rings = [
    { progress: move, color: "#FF2D55" },
    { progress: exercise, color: "#92E82A" },
    { progress: stand, color: "#00D4FF" },
  ]
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {rings.map((ring, i) => {
          const r = radius - (i * strokeWidth * 1.3)
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
