'use client'

import type {
  AppleWorkout,
  DailyMetrics,
} from '@/components/dashboard/fitness-dashboard'
import { TodayActivityBar } from '@/components/dashboard/fitness-dashboard'
import { StretchPanel } from '@/components/dashboard/stretch-panel'
import { WorkoutCenter } from '@/components/dashboard/workout-center'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { apiDelete, apiGet, apiPost } from '@/lib/api/client'
import type {
  ConsistencyStats,
  DayOfWeek,
  WeeklyRoutine,
  Workout,
} from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  Circle,
  Flame,
  Settings,
  Target,
  Watch,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

interface FitnessSingleViewProps {
  /** Optional initial date to display (from URL param like ?day=2026-01-29) */
  initialDate?: Date | null
  /** Callback to switch to edit routine mode */
  onSwitchToEdit?: () => void
}

/**
 * FitnessSingleView - A compact single-view fitness dashboard optimized for iPad Mini landscape.
 *
 * Layout: 3-panel design with morning/night stretch sidebars and central workout area
 * Target: 1024 x 768px (iPad Mini landscape)
 *
 * Features:
 * - Morning routine panel (left)
 * - Workout center (middle, larger)
 * - Night routine panel (right)
 * - Consistency bar (bottom)
 * - Single video at a time
 * - Timer with audio cues
 */
export function FitnessSingleView({
  initialDate,
  onSwitchToEdit,
}: FitnessSingleViewProps) {
  const router = useRouter()
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null)
  const [selectedDayWorkout, setSelectedDayWorkout] = useState<Workout | null>(
    null
  )
  const [consistencyStats, setConsistencyStats] =
    useState<ConsistencyStats | null>(null)
  const [appleWorkouts, setAppleWorkouts] = useState<AppleWorkout[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [completingMorning, setCompletingMorning] = useState(false)
  const [completingNight, setCompletingNight] = useState(false)
  const [completingWorkout, setCompletingWorkout] = useState(false)
  const [openVideoId, setOpenVideoId] = useState<string | null>(null)

  // Derive initial day from initial date
  const getInitialDay = (): DayOfWeek | null => {
    if (!initialDate) return null
    return initialDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase() as DayOfWeek
  }

  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(
    getInitialDay()
  )
  // Store the viewing date for week number calculation
  const [viewingDate, setViewingDate] = useState<Date | null>(
    initialDate || null
  )
  const [dayPickerOpen, setDayPickerOpen] = useState(false)

  const getCurrentDay = (): DayOfWeek => {
    return new Date()
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase() as DayOfWeek
  }

  const getWeekNumber = (date: Date): number => {
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    )
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  const getCurrentWeekNumber = (): number => {
    return getWeekNumber(new Date())
  }

  const today = getCurrentDay()
  const isViewingToday = selectedDay === null || selectedDay === today
  const viewingDay = selectedDay || today

  // Get the week number for the date being viewed
  const viewingWeekNumber = viewingDate
    ? getWeekNumber(viewingDate)
    : getCurrentWeekNumber()

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const day = getCurrentDay()
      const [
        routineRes,
        workoutRes,
        consistencyRes,
        appleWorkoutsRes,
        dailyMetricsRes,
      ] = await Promise.all([
        apiGet<WeeklyRoutine>('/api/fitness/routine'),
        apiGet<Workout>(`/api/fitness/workout/${day}`),
        apiGet<ConsistencyStats>('/api/fitness/consistency'),
        apiGet<AppleWorkout[]>('/api/apple-health/workout?limit=10'),
        apiGet<DailyMetrics | DailyMetrics[]>('/api/apple-health/daily?days=1'),
      ])

      if (routineRes.success && routineRes.data) {
        setRoutine(routineRes.data)
      }

      if (workoutRes.success && workoutRes.data) {
        setTodayWorkout(workoutRes.data)
      }

      if (consistencyRes.success && consistencyRes.data) {
        setConsistencyStats(consistencyRes.data)
      }

      if (appleWorkoutsRes.success && appleWorkoutsRes.data) {
        setAppleWorkouts(appleWorkoutsRes.data)
      }

      if (dailyMetricsRes.success && dailyMetricsRes.data) {
        const metrics = Array.isArray(dailyMetricsRes.data)
          ? dailyMetricsRes.data[0]
          : dailyMetricsRes.data
        setDailyMetrics(metrics || null)
      }
    } catch (error) {
      console.error('Failed to fetch fitness data', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch workout for selected day
  const fetchSelectedDayWorkout = useCallback(async (day: DayOfWeek) => {
    try {
      const response = await apiGet<Workout>(`/api/fitness/workout/${day}`)
      if (response.success && response.data) {
        setSelectedDayWorkout(response.data)
      } else {
        setSelectedDayWorkout(null)
      }
    } catch (error) {
      console.error('Failed to fetch workout for day', error)
      setSelectedDayWorkout(null)
    }
  }, [])

  // Handle day selection
  const handleDaySelect = (day: DayOfWeek) => {
    if (day === today) {
      setSelectedDay(null)
      setSelectedDayWorkout(null)
    } else {
      setSelectedDay(day)
      fetchSelectedDayWorkout(day)
    }
    setDayPickerOpen(false)
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch the initial day's workout if provided and different from today
  useEffect(() => {
    if (initialDate) {
      const initialDayOfWeek = initialDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase() as DayOfWeek
      const todayDay = getCurrentDay()
      if (initialDayOfWeek !== todayDay) {
        fetchSelectedDayWorkout(initialDayOfWeek)
      }
    }
  }, [initialDate, fetchSelectedDayWorkout])

  // Handle morning routine completion
  const handleMorningComplete = async () => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()
    setCompletingMorning(true)

    try {
      const response = await apiPost(
        `/api/fitness/routine/morning/complete?day=${day}&week=${weekNumber}`
      )
      if (!response.success) throw new Error('Failed')
      await fetchData()
      toast.success('Morning routine completed!')
    } catch {
      toast.error('Failed to complete routine')
    } finally {
      setCompletingMorning(false)
    }
  }

  // Handle night routine completion
  const handleNightComplete = async () => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()
    setCompletingNight(true)

    try {
      const response = await apiPost(
        `/api/fitness/routine/night/complete?day=${day}&week=${weekNumber}`
      )
      if (!response.success) throw new Error('Failed')
      await fetchData()
      toast.success('Night routine completed!')
    } catch {
      toast.error('Failed to complete routine')
    } finally {
      setCompletingNight(false)
    }
  }

  // Handle morning routine uncomplete
  const handleMorningUncomplete = async () => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()
    setCompletingMorning(true)

    try {
      const response = await apiDelete(
        `/api/fitness/routine/morning/complete?day=${day}&week=${weekNumber}`
      )
      if (!response.success) throw new Error('Failed')
      await fetchData()
      toast.success('Morning routine unmarked')
    } catch {
      toast.error('Failed to uncomplete routine')
    } finally {
      setCompletingMorning(false)
    }
  }

  // Handle night routine uncomplete
  const handleNightUncomplete = async () => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()
    setCompletingNight(true)

    try {
      const response = await apiDelete(
        `/api/fitness/routine/night/complete?day=${day}&week=${weekNumber}`
      )
      if (!response.success) throw new Error('Failed')
      await fetchData()
      toast.success('Night routine unmarked')
    } catch {
      toast.error('Failed to uncomplete routine')
    } finally {
      setCompletingNight(false)
    }
  }

  // Handle workout completion
  const handleWorkoutComplete = async (exercisesCompleted: string[]) => {
    const day = getCurrentDay()
    setCompletingWorkout(true)

    try {
      const response = await apiPost(`/api/fitness/workout/${day}/complete`, {
        exercisesCompleted,
      })
      if (!response.success) throw new Error('Failed')
      await fetchData()
      toast.success('Workout completed!')
    } catch {
      toast.error('Failed to complete workout')
    } finally {
      setCompletingWorkout(false)
    }
  }

  // Handle video toggle - only one video at a time
  const handleVideoToggle = (videoId: string | null) => {
    setOpenVideoId(videoId)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">
          Loading fitness data...
        </div>
      </div>
    )
  }

  if (!routine) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">
          No routine data found
        </div>
      </div>
    )
  }

  const currentWeekNumber = getCurrentWeekNumber()
  const currentWeek = routine.weeks.find(
    w => w.weekNumber === currentWeekNumber
  )
  const todayData = currentWeek?.days[today]

  // For viewing a different date, use its week number
  const viewingWeek = routine.weeks.find(
    w => w.weekNumber === viewingWeekNumber
  )
  const viewingDayData = viewingWeek?.days[viewingDay] // Completion data for the day being viewed
  const viewingDaySchedule = routine.schedule[viewingDay]
  const todaySchedule = routine.schedule[today]
  const viewingDayName =
    viewingDay.charAt(0).toUpperCase() + viewingDay.slice(1)
  const hasInjuryProtocol = routine.injuryProtocol?.status === 'active'
  const isViewingRestDay =
    viewingDaySchedule?.focus === 'Rest' ||
    viewingDaySchedule?.focus === 'Active Recovery'

  // Get the appropriate workout to display
  const displayWorkout = isViewingToday ? todayWorkout : selectedDayWorkout
  // Get the appropriate completion data for the day being viewed
  const displayCompletion = isViewingToday
    ? todayData?.workout
    : viewingDayData?.workout

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-0 flex-col">
        {/* Unified Header */}
        <header className="bg-card/50 mb-3 shrink-0 rounded-xl border p-2">
          <div className="flex items-center gap-3">
            {/* Left: Day Picker & Context */}
            <div className="flex items-center gap-2">
              <Popover open={dayPickerOpen} onOpenChange={setDayPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 gap-2 px-3 font-semibold',
                      !isViewingToday &&
                        'border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                    )}
                  >
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-muted-foreground text-[10px] font-normal">
                        {format(new Date(), 'MMM d')}
                      </span>
                      <span className="text-sm">{viewingDayName}</span>
                    </div>
                    <ChevronDown className="text-muted-foreground size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_OF_WEEK.map(day => {
                      const daySchedule = routine.schedule[day]
                      const isTodayDay = day === today
                      const isSelected = day === viewingDay
                      const isRest = daySchedule?.focus === 'Rest'

                      return (
                        <button
                          key={day}
                          onClick={() => handleDaySelect(day)}
                          className={cn(
                            'flex min-w-[48px] flex-col items-center rounded-md p-2 text-center transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted',
                            isTodayDay &&
                              !isSelected &&
                              'ring-primary/50 ring-1'
                          )}
                        >
                          <span className="text-[10px] font-medium">
                            {DAY_LABELS[day]}
                          </span>
                          <span
                            className={cn(
                              'mt-0.5 text-[9px]',
                              isSelected
                                ? 'text-primary-foreground/80'
                                : 'text-muted-foreground'
                            )}
                          >
                            {isRest ? 'Rest' : daySchedule?.focus?.slice(0, 4)}
                          </span>
                          {isTodayDay && (
                            <Circle
                              className={cn(
                                'mt-0.5 size-1.5 fill-current',
                                isSelected
                                  ? 'text-primary-foreground'
                                  : 'text-primary'
                              )}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {!isViewingToday && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 w-full text-xs"
                      onClick={() => handleDaySelect(today)}
                    >
                      <ArrowLeft className="mr-1 size-3" />
                      Back to Today
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Divider */}
              <div className="bg-border h-6 w-px" />

              {/* Workout Focus Badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'h-7 gap-1.5 px-2.5 text-xs font-semibold',
                    isViewingRestDay
                      ? 'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400'
                      : 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  )}
                >
                  {viewingDaySchedule?.focus || 'Rest'}
                </Badge>

                {/* From Calendar indicator */}
                {!isViewingToday && initialDate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-xs"
                        onClick={() => {
                          setSelectedDay(null)
                          setSelectedDayWorkout(null)
                          setViewingDate(null)
                          window.history.replaceState(null, '', '/fitness')
                        }}
                      >
                        <Calendar className="size-3.5" />
                        <ArrowLeft className="size-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Back to today (came from calendar)
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Preview indicator */}
                {!isViewingToday && !initialDate && (
                  <Badge variant="secondary" className="h-6 text-[10px]">
                    Preview
                  </Badge>
                )}
              </div>
            </div>

            {/* Center: Injury Protocol (if active) */}
            {hasInjuryProtocol && (
              <div className="hidden items-center sm:flex">
                <Badge
                  variant="outline"
                  className="h-7 gap-1.5 border-amber-600/40 bg-amber-950/30 text-amber-500"
                >
                  <AlertTriangle className="size-3" />
                  <span className="text-xs font-medium">Injury Protocol</span>
                </Badge>
              </div>
            )}

            {/* Right: Actions */}
            <div className="ml-auto flex items-center gap-1.5">
              {/* Mobile Injury indicator */}
              {hasInjuryProtocol && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex size-8 items-center justify-center rounded-md border border-amber-600/40 bg-amber-950/30 text-amber-500 sm:hidden">
                      <AlertTriangle className="size-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Injury Protocol</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/fitness/watch">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Watch className="size-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Apple Watch Data</TooltipContent>
              </Tooltip>

              {onSwitchToEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onSwitchToEdit}
                    >
                      <Settings className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Routine</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </header>

        {/* Main 3-Panel Layout */}
        <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr_200px] gap-3 xl:grid-cols-[280px_1fr_280px] 2xl:grid-cols-[320px_1fr_320px]">
          {/* Morning Panel - Shows viewed day's data */}
          <StretchPanel
            routine={routine.dailyRoutines.morning}
            type="morning"
            completion={
              isViewingToday
                ? todayData?.morningRoutine
                : viewingDayData?.morningRoutine
            }
            onComplete={handleMorningComplete}
            onUncomplete={handleMorningUncomplete}
            isCompleting={completingMorning}
            isPreview={!isViewingToday}
          />

          {/* Workout Center - Shows selected day's workout */}
          <WorkoutCenter
            workout={isViewingRestDay ? null : displayWorkout}
            day={viewingDay}
            focus={viewingDaySchedule?.focus}
            goal={viewingDaySchedule?.goal}
            completion={displayCompletion}
            hasInjuryProtocol={hasInjuryProtocol}
            onComplete={handleWorkoutComplete}
            isCompleting={completingWorkout}
            openVideoId={openVideoId}
            onVideoToggle={handleVideoToggle}
            isPreview={!isViewingToday}
          />

          {/* Night Panel - Shows viewed day's data */}
          <StretchPanel
            routine={routine.dailyRoutines.night}
            type="night"
            completion={
              isViewingToday
                ? todayData?.nightRoutine
                : viewingDayData?.nightRoutine
            }
            onComplete={handleNightComplete}
            onUncomplete={handleNightUncomplete}
            isCompleting={completingNight}
            isPreview={!isViewingToday}
          />
        </div>

        {/* Bottom Section: Consistency Bar + Today's Activity */}
        <div className="mt-3 shrink-0 space-y-2">
          {/* Today's Activity from Apple Watch */}
          <TodayActivityBar
            workouts={appleWorkouts}
            metrics={dailyMetrics}
            onWorkoutClick={id => router.push(`/fitness/watch?workout=${id}`)}
            onViewAll={() => router.push('/fitness/watch')}
          />

          {/* Compact Consistency Bar */}
          {consistencyStats && <ConsistencyBar stats={consistencyStats} />}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Compact Consistency Bar Component
interface ConsistencyBarProps {
  stats: ConsistencyStats
}

function ConsistencyBar({ stats }: ConsistencyBarProps) {
  return (
    <div className="bg-muted/30 flex items-center gap-4 rounded-lg border p-2.5 sm:gap-6">
      {/* Streaks */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Flame className="size-4 text-orange-500" />
          <div>
            <div className="text-base leading-none font-bold">
              {stats.currentStreak}
            </div>
            <div className="text-muted-foreground text-[9px]">
              Current Streak
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="size-4 text-blue-500" />
          <div>
            <div className="text-base leading-none font-bold">
              {stats.longestStreak}
            </div>
            <div className="text-muted-foreground text-[9px]">
              Longest Streak
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="bg-border h-6 w-px" />

      {/* Progress Bars */}
      <div className="flex flex-1 items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Week</span>
            <span className="font-medium">{stats.weeklyCompletion}%</span>
          </div>
          <Progress value={stats.weeklyCompletion} className="h-1" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Month</span>
            <span className="font-medium">{stats.monthlyCompletion}%</span>
          </div>
          <Progress value={stats.monthlyCompletion} className="h-1" />
        </div>
      </div>

      {/* Divider */}
      <div className="bg-border hidden h-6 w-px sm:block" />

      {/* Routine Stats */}
      <div className="hidden items-center gap-3 text-center sm:flex">
        <div>
          <div className="text-sm font-semibold">{stats.streaks.workouts}</div>
          <div className="text-muted-foreground text-[9px]">Workouts</div>
        </div>
        <div>
          <div className="text-sm font-semibold">
            {stats.streaks.morningRoutines}
          </div>
          <div className="text-muted-foreground text-[9px]">AM</div>
        </div>
        <div>
          <div className="text-sm font-semibold">
            {stats.streaks.nightRoutines}
          </div>
          <div className="text-muted-foreground text-[9px]">PM</div>
        </div>
      </div>
    </div>
  )
}
