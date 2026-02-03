'use client'

import type {
  AppleWorkout,
  DailyMetrics,
} from '@/components/dashboard/fitness-dashboard'
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
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isToday as isDateToday,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Moon,
  Settings,
  Sun,
  Target,
  Watch,
  Zap
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

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Map focus to icons and colors (matching calendar-fitness-sidebar)
const FOCUS_CONFIG: Record<
  string,
  { icon: typeof Dumbbell; color: string; bg: string; ring: string }
> = {
  Strength: {
    icon: Dumbbell,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    ring: 'ring-orange-500/30',
  },
  'Core/Posture': {
    icon: Target,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/30',
  },
  Hybrid: {
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    ring: 'ring-purple-500/30',
  },
  Endurance: {
    icon: Flame,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/30',
  },
  Circuit: {
    icon: Zap,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    ring: 'ring-green-500/30',
  },
  HIIT: {
    icon: Flame,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/30',
  },
  Rest: {
    icon: Calendar,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    ring: 'ring-slate-500/30',
  },
  'Active Recovery': {
    icon: Sun,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    ring: 'ring-teal-500/30',
  },
}

type FitnessStatus = 'complete' | 'partial' | 'missed' | 'rest' | 'future'

function getFitnessStatusForDay(
  date: Date,
  routine: WeeklyRoutine | null | undefined
): { status: FitnessStatus; details: { workout: boolean; morning: boolean; night: boolean; isRest: boolean } } {
  const defaultDetails = { workout: false, morning: false, night: false, isRest: false }
  if (!routine) return { status: 'future', details: defaultDetails }

  const dayOfWeek = date
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as DayOfWeek
  const weekNumber = getWeekNumber(date)
  const schedule = routine.schedule[dayOfWeek]
  const week = routine.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  const isRestDay =
    schedule?.focus === 'Rest' || schedule?.focus === 'Active Recovery'
  const isToday = isSameDay(date, new Date())
  const isFutureDate = date > new Date()

  const workoutDone = dayData?.workout?.completed ?? false
  const morningDone = dayData?.morningRoutine?.completed ?? false
  const nightDone = dayData?.nightRoutine?.completed ?? false

  const details = {
    workout: workoutDone,
    morning: morningDone,
    night: nightDone,
    isRest: isRestDay,
  }

  if (isFutureDate && !isToday) {
    return { status: 'future', details }
  }

  if (isRestDay) {
    // For rest days, check if routines are done
    if (morningDone && nightDone) return { status: 'complete', details }
    if (morningDone || nightDone) return { status: 'partial', details }
    if (!isToday && !isFutureDate) return { status: 'missed', details }
    return { status: 'rest', details }
  }

  // For workout days
  if (workoutDone && morningDone && nightDone) return { status: 'complete', details }
  if (workoutDone || morningDone || nightDone) return { status: 'partial', details }
  if (!isToday && !isFutureDate) return { status: 'missed', details }
  return { status: 'future', details }
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  )
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

// Enhanced Fitness Date Picker Component
interface FitnessDatePickerProps {
  currentDate: Date
  selectedDate: Date | null
  routine: WeeklyRoutine | null
  onSelectDate: (date: Date) => void
  onClose: () => void
}

function FitnessDatePicker({
  currentDate,
  selectedDate,
  routine,
  onSelectDate,
  onClose,
}: FitnessDatePickerProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate || currentDate)

  // Get calendar grid days (week starts on Monday)
  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  // Group days into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const handlePrevMonth = () => setViewMonth(subMonths(viewMonth, 1))
  const handleNextMonth = () => setViewMonth(addMonths(viewMonth, 1))
  const handleToday = () => {
    onSelectDate(new Date())
    onClose()
  }

  const handleSelectDay = (date: Date) => {
    // Don't allow selecting future dates
    if (date > new Date() && !isSameDay(date, new Date())) return
    onSelectDate(date)
    onClose()
  }

  return (
    <div className="w-[340px]">
      {/* Header with month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handlePrevMonth}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleNextMonth}
          disabled={isSameMonth(viewMonth, new Date())}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map(day => (
          <div
            key={day}
            className="text-muted-foreground py-1 text-center text-[10px] font-semibold uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map(day => {
              const isCurrentMonth = isSameMonth(day, viewMonth)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())
              const isFutureDate = day > new Date() && !isToday
              const dayOfWeek = day
                .toLocaleDateString('en-US', { weekday: 'long' })
                .toLowerCase() as DayOfWeek
              const daySchedule = routine?.schedule[dayOfWeek]
              const focus = daySchedule?.focus || 'Rest'
              const focusConfig = FOCUS_CONFIG[focus] || {
                icon: Calendar,
                color: 'text-slate-400',
                bg: 'bg-slate-500/10',
                ring: 'ring-slate-500/30',
              }
              const FocusIcon = focusConfig.icon
              const isRestDay = focus === 'Rest' || focus === 'Active Recovery'
              const { status, details } = getFitnessStatusForDay(day, routine)

              return (
                <Tooltip key={day.toISOString()}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      disabled={isFutureDate}
                      className={cn(
                        'group relative flex aspect-square flex-col items-center justify-center rounded-lg p-0.5 transition-all',
                        'hover:ring-2 hover:ring-inset',
                        isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/40',
                        isFutureDate && 'cursor-not-allowed opacity-40',
                        !isSelected && !isToday && focusConfig.ring.replace('ring-', 'hover:ring-'),
                        // Today styling
                        isToday &&
                          !isSelected &&
                          'bg-accent ring-2 ring-inset ring-primary/50',
                        // Selected styling
                        isSelected &&
                          'bg-primary text-primary-foreground ring-2 ring-inset ring-primary',
                        // Status-based background (only for past days in current month)
                        !isSelected &&
                          !isToday &&
                          isCurrentMonth &&
                          status === 'complete' &&
                          'bg-green-500/15',
                        !isSelected &&
                          !isToday &&
                          isCurrentMonth &&
                          status === 'partial' &&
                          'bg-amber-500/15',
                        !isSelected &&
                          !isToday &&
                          isCurrentMonth &&
                          status === 'missed' &&
                          'bg-red-500/10'
                      )}
                    >
                      {/* Day number */}
                      <span
                        className={cn(
                          'text-xs font-medium leading-none',
                          isSelected && 'text-primary-foreground'
                        )}
                      >
                        {day.getDate()}
                      </span>

                      {/* Status indicator */}
                      {isCurrentMonth && !isFutureDate && (
                        <div className="mt-0.5 flex items-center justify-center">
                          {status === 'complete' && (
                            <div className="flex size-3 items-center justify-center rounded-full bg-green-500">
                              <Check className="size-2 text-white" />
                            </div>
                          )}
                          {status === 'partial' && (
                            <div className="flex gap-0.5">
                              {details.morning && (
                                <div className="size-1.5 rounded-full bg-amber-400" />
                              )}
                              {details.workout && !details.isRest && (
                                <div className="size-1.5 rounded-full bg-orange-400" />
                              )}
                              {details.night && (
                                <div className="size-1.5 rounded-full bg-indigo-400" />
                              )}
                            </div>
                          )}
                          {status === 'missed' && (
                            <div className="size-1.5 rounded-full bg-red-400/60" />
                          )}
                          {(status === 'rest' || status === 'future') &&
                            isRestDay && (
                              <span className="text-muted-foreground text-[8px]">
                                R
                              </span>
                            )}
                          {status === 'future' && !isRestDay && !isToday && (
                            <FocusIcon
                              className={cn(
                                'size-2.5 opacity-40',
                                isSelected
                                  ? 'text-primary-foreground'
                                  : focusConfig.color
                              )}
                            />
                          )}
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="max-w-[180px] p-2"
                    sideOffset={4}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'flex size-5 items-center justify-center rounded',
                            focusConfig.bg
                          )}
                        >
                          <FocusIcon
                            className={cn('size-3', focusConfig.color)}
                          />
                        </div>
                        <div>
                          <div className="text-xs font-medium">
                            {format(day, 'EEEE, MMM d')}
                          </div>
                          <div className="text-muted-foreground text-[10px]">
                            {focus}
                          </div>
                        </div>
                      </div>

                      {!isFutureDate && isCurrentMonth && (
                        <div className="border-border/50 space-y-0.5 border-t pt-1.5">
                          {!isRestDay && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <Dumbbell
                                className={cn(
                                  'size-2.5',
                                  details.workout
                                    ? 'text-green-500'
                                    : 'text-muted-foreground'
                                )}
                              />
                              <span
                                className={
                                  details.workout
                                    ? 'text-green-600 dark:text-green-400'
                                    : ''
                                }
                              >
                                Workout: {details.workout ? 'Done' : 'Not done'}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Sun
                              className={cn(
                                'size-2.5',
                                details.morning
                                  ? 'text-green-500'
                                  : 'text-muted-foreground'
                              )}
                            />
                            <span
                              className={
                                details.morning
                                  ? 'text-green-600 dark:text-green-400'
                                  : ''
                              }
                            >
                              Morning: {details.morning ? 'Done' : 'Not done'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Moon
                              className={cn(
                                'size-2.5',
                                details.night
                                  ? 'text-green-500'
                                  : 'text-muted-foreground'
                              )}
                            />
                            <span
                              className={
                                details.night
                                  ? 'text-green-600 dark:text-green-400'
                                  : ''
                              }
                            >
                              Night: {details.night ? 'Done' : 'Not done'}
                            </span>
                          </div>
                        </div>
                      )}

                      {isFutureDate && (
                        <div className="text-muted-foreground text-[10px] italic">
                          Future date
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 border-t border-border/50 pt-3">
        <div className="flex items-center gap-1">
          <div className="flex size-3 items-center justify-center rounded-full bg-green-500">
            <Check className="size-2 text-white" />
          </div>
          <span className="text-muted-foreground text-[10px]">Complete</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-full bg-amber-400" />
          <span className="text-muted-foreground text-[10px]">Partial</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-full bg-red-400/60" />
          <span className="text-muted-foreground text-[10px]">Missed</span>
        </div>
      </div>

      {/* Back to Today button */}
      {selectedDate && !isSameDay(selectedDate, new Date()) && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 h-8 w-full text-xs"
          onClick={handleToday}
        >
          <ArrowLeft className="mr-1.5 size-3" />
          Back to Today
        </Button>
      )}
    </div>
  )
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

  // Navigate to a specific date
  const navigateToDate = useCallback(
    (date: Date) => {
      // If the date is today, go back to the default view
      if (isDateToday(date)) {
        setSelectedDay(null)
        setSelectedDayWorkout(null)
        setViewingDate(null)
        window.history.replaceState(null, '', '/fitness')
        return
      }

      const dayOfWeek = date
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase() as DayOfWeek

      setSelectedDay(dayOfWeek)
      setViewingDate(date)
      fetchSelectedDayWorkout(dayOfWeek)

      // Update URL with the new date
      const dateStr = format(date, 'yyyy-MM-dd')
      window.history.replaceState(null, '', `/fitness?day=${dateStr}`)
    },
    [fetchSelectedDayWorkout]
  )

  // Navigate to previous day
  const handlePrevDay = useCallback(() => {
    const currentDate = viewingDate || new Date()
    const prevDate = subDays(startOfDay(currentDate), 1)
    navigateToDate(prevDate)
  }, [viewingDate, navigateToDate])

  // Navigate to next day
  const handleNextDay = useCallback(() => {
    const currentDate = viewingDate || new Date()
    const nextDate = addDays(startOfDay(currentDate), 1)
    // Don't navigate to future dates
    if (nextDate > startOfDay(new Date())) {
      // If trying to go to today or future, just go to today view
      setSelectedDay(null)
      setSelectedDayWorkout(null)
      setViewingDate(null)
      window.history.replaceState(null, '', '/fitness')
      return
    }
    navigateToDate(nextDate)
  }, [viewingDate, navigateToDate])

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
        {/* Unified Header - Two-tier design */}
        <header className="mb-3 shrink-0 space-y-2">
          {/* Primary Navigation Row */}
          <div className="bg-card/50 flex items-center gap-2 rounded-xl border p-2">
            {/* Date Picker - Compact & Clear */}
            <Popover open={dayPickerOpen} onOpenChange={setDayPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-11 gap-2 px-3',
                    !isViewingToday &&
                      'border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
                  )}
                >
                  <div className="flex flex-col items-start leading-tight">
                    <span className={cn(
                      'text-lg font-bold tabular-nums',
                      !isViewingToday && 'text-amber-500'
                    )}>
                      {format(viewingDate || new Date(), 'd')}
                    </span>
                    <span className={cn(
                      'text-[10px] font-medium uppercase tracking-wide',
                      isViewingToday ? 'text-muted-foreground' : 'text-amber-500/80'
                    )}>
                      {format(viewingDate || new Date(), 'MMM')}
                    </span>
                  </div>
                  <ChevronDown className="text-muted-foreground size-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <FitnessDatePicker
                  currentDate={new Date()}
                  selectedDate={viewingDate}
                  routine={routine}
                  onSelectDate={navigateToDate}
                  onClose={() => setDayPickerOpen(false)}
                />
              </PopoverContent>
            </Popover>

            {/* Navigation Arrows - Always visible for better UX */}
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handlePrevDay}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous day</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleNextDay}
                    disabled={isViewingToday}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isViewingToday ? 'Today' : 'Next day'}</TooltipContent>
              </Tooltip>
            </div>

            {/* Divider */}
            <div className="bg-border h-8 w-px" />

            {/* Week Strip - Visual Timeline */}
            <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
              {DAYS_OF_WEEK.map((day, index) => {
                const daySchedule = routine.schedule[day]
                const weekStart = startOfWeek(viewingDate || new Date(), { weekStartsOn: 1 })
                const dayDate = addDays(weekStart, index)
                const isTodayDay = isDateToday(dayDate)
                const isSelected = viewingDate ? isSameDay(dayDate, viewingDate) : isTodayDay
                const isFutureDate = dayDate > new Date() && !isTodayDay
                const focus = daySchedule?.focus || 'Rest'
                const focusConfig = FOCUS_CONFIG[focus] || {
                  icon: Calendar,
                  color: 'text-slate-400',
                  bg: 'bg-slate-500/10',
                  ring: 'ring-slate-500/30',
                }
                const FocusIcon = focusConfig.icon
                const { status, details } = getFitnessStatusForDay(dayDate, routine)

                return (
                  <Tooltip key={day}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !isFutureDate && navigateToDate(dayDate)}
                        disabled={isFutureDate}
                        className={cn(
                          'group relative flex min-w-[48px] flex-col items-center rounded-lg px-2 py-1.5 transition-all',
                          isSelected
                            ? cn('text-white', focusConfig.bg.replace('/10', '/90'))
                            : 'hover:bg-muted/80',
                          isTodayDay && !isSelected && 'ring-2 ring-inset ring-primary/40',
                          isFutureDate && 'cursor-not-allowed opacity-30'
                        )}
                      >
                        {/* Day Label */}
                        <span className={cn(
                          'text-[11px] font-semibold',
                          isSelected ? 'text-white' : ''
                        )}>
                          {DAY_LABELS[day]}
                        </span>

                        {/* Focus Icon */}
                        <div className={cn(
                          'my-0.5 flex size-5 items-center justify-center rounded-md transition-colors',
                          isSelected
                            ? 'bg-white/20'
                            : focusConfig.bg
                        )}>
                          <FocusIcon className={cn(
                            'size-3',
                            isSelected ? 'text-white' : focusConfig.color
                          )} />
                        </div>

                        {/* Status Indicator */}
                        <div className="flex h-2 items-center justify-center">
                          {status === 'complete' && (
                            <div className={cn(
                              'flex size-2.5 items-center justify-center rounded-full',
                              isSelected ? 'bg-white/90' : 'bg-green-500'
                            )}>
                              <Check className={cn(
                                'size-1.5',
                                isSelected ? 'text-green-600' : 'text-white'
                              )} />
                            </div>
                          )}
                          {status === 'partial' && (
                            <div className="flex gap-0.5">
                              {details.morning && (
                                <div className={cn(
                                  'size-1.5 rounded-full',
                                  isSelected ? 'bg-white/80' : 'bg-amber-400'
                                )} />
                              )}
                              {details.workout && !details.isRest && (
                                <div className={cn(
                                  'size-1.5 rounded-full',
                                  isSelected ? 'bg-white/80' : 'bg-orange-400'
                                )} />
                              )}
                              {details.night && (
                                <div className={cn(
                                  'size-1.5 rounded-full',
                                  isSelected ? 'bg-white/80' : 'bg-indigo-400'
                                )} />
                              )}
                            </div>
                          )}
                          {status === 'missed' && (
                            <div className={cn(
                              'size-1.5 rounded-full',
                              isSelected ? 'bg-white/60' : 'bg-red-400/60'
                            )} />
                          )}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="font-medium">
                        {format(dayDate, 'EEEE, MMM d')}
                      </div>
                      <div className="text-muted-foreground">{focus}</div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            {/* Mobile: Compact day indicator */}
            <div className="flex flex-1 items-center gap-2 md:hidden">
              <Badge
                variant="outline"
                className={cn(
                  'h-7 gap-1.5 px-2.5 text-xs font-semibold',
                  isViewingRestDay
                    ? 'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400'
                    : (() => {
                        const focus = viewingDaySchedule?.focus || 'Rest'
                        const config = FOCUS_CONFIG[focus] || {
                          color: 'text-orange-500',
                          bg: 'bg-orange-500/10',
                          ring: 'ring-orange-500/30',
                        }
                        return `${config.bg} ${config.color} ${config.ring.replace('ring-', 'border-')}`
                      })()
                )}
              >
                {viewingDayName} · {viewingDaySchedule?.focus || 'Rest'}
              </Badge>
            </div>

            {/* Divider */}
            <div className="bg-border h-8 w-px" />

            {/* Right Actions Group */}
            <div className="flex items-center gap-1">
              {/* Back to Today - Only when viewing past */}
              {!isViewingToday && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-xs"
                      onClick={() => {
                        setSelectedDay(null)
                        setSelectedDayWorkout(null)
                        setViewingDate(null)
                        window.history.replaceState(null, '', '/fitness')
                      }}
                    >
                      <ArrowLeft className="size-3" />
                      Today
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to today</TooltipContent>
                </Tooltip>
              )}

              {/* Injury Protocol Badge */}
              {hasInjuryProtocol && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-8 items-center gap-1.5 rounded-md border border-amber-600/40 bg-amber-950/30 px-2 text-amber-500">
                      <AlertTriangle className="size-3.5" />
                      <span className="hidden text-xs font-medium sm:inline">Injury</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Injury Protocol Active</TooltipContent>
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

          {/* Secondary Row: Activity Summary + Streaks */}
          {isViewingToday && (appleWorkouts.length > 0 || dailyMetrics || consistencyStats) && (
            <UnifiedActivitySummary
              workouts={appleWorkouts}
              metrics={dailyMetrics}
              consistencyStats={consistencyStats}
              onWorkoutClick={id => router.push(`/fitness/watch?workout=${id}`)}
              onViewAll={() => router.push('/fitness/watch')}
            />
          )}
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
            appleWorkouts={isViewingToday ? appleWorkouts : []}
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

      </div>
    </TooltipProvider>
  )
}

// Unified Activity Summary - Combines Activity Bar and Consistency Stats
interface UnifiedActivitySummaryProps {
  workouts: AppleWorkout[]
  metrics: DailyMetrics | null
  consistencyStats: ConsistencyStats | null
  onWorkoutClick?: (workoutId: string) => void
  onViewAll?: () => void
}

// Workout type styling
const WORKOUT_TYPE_STYLES: Record<string, { icon: typeof Dumbbell; color: string; bg: string }> = {
  running: { icon: Flame, color: 'text-green-500', bg: 'bg-green-500/15' },
  cycling: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/15' },
  walking: { icon: Target, color: 'text-teal-500', bg: 'bg-teal-500/15' },
  swimming: { icon: Zap, color: 'text-cyan-500', bg: 'bg-cyan-500/15' },
  functionalStrengthTraining: { icon: Dumbbell, color: 'text-purple-500', bg: 'bg-purple-500/15' },
  traditionalStrengthTraining: { icon: Dumbbell, color: 'text-purple-500', bg: 'bg-purple-500/15' },
  coreTraining: { icon: Target, color: 'text-pink-500', bg: 'bg-pink-500/15' },
  hiit: { icon: Flame, color: 'text-red-500', bg: 'bg-red-500/15' },
  rowing: { icon: Zap, color: 'text-cyan-500', bg: 'bg-cyan-500/15' },
  stairClimbing: { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/15' },
  elliptical: { icon: Zap, color: 'text-teal-500', bg: 'bg-teal-500/15' },
  yoga: { icon: Sun, color: 'text-pink-500', bg: 'bg-pink-500/15' },
  other: { icon: Dumbbell, color: 'text-slate-500', bg: 'bg-slate-500/15' },
}

const WORKOUT_LABELS: Record<string, string> = {
  running: 'Run',
  cycling: 'Cycle',
  walking: 'Walk',
  swimming: 'Swim',
  functionalStrengthTraining: 'Strength',
  traditionalStrengthTraining: 'Weights',
  coreTraining: 'Core',
  hiit: 'HIIT',
  rowing: 'Row',
  yoga: 'Yoga',
  stairClimbing: 'Stairs',
  elliptical: 'Elliptical',
  other: 'Other',
}

function formatWorkoutDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${hrs}h ${remainMins}m`
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function UnifiedActivitySummary({
  workouts,
  metrics,
  consistencyStats,
  onWorkoutClick,
  onViewAll,
}: UnifiedActivitySummaryProps) {
  const todayWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.start_date)
    const today = new Date()
    return (
      workoutDate.getDate() === today.getDate() &&
      workoutDate.getMonth() === today.getMonth() &&
      workoutDate.getFullYear() === today.getFullYear()
    )
  })

  const totalDuration = todayWorkouts.reduce((sum, w) => sum + w.duration, 0)
  const totalCalories = todayWorkouts.reduce((sum, w) => sum + w.active_calories, 0)
  const totalDistance = todayWorkouts.reduce((sum, w) => sum + (w.distance_miles || 0), 0)

  // Activity ring progress
  const moveProgress = metrics
    ? Math.min((metrics.active_calories / (metrics.move_goal || 500)) * 100, 100)
    : 0
  const exerciseProgress = metrics
    ? Math.min((metrics.exercise_minutes / (metrics.exercise_goal || 30)) * 100, 100)
    : 0
  const standProgress = metrics
    ? Math.min((metrics.stand_hours / (metrics.stand_goal || 12)) * 100, 100)
    : 0

  const hasActivity = todayWorkouts.length > 0 || metrics
  const hasStats = consistencyStats

  if (!hasActivity && !hasStats) return null

  return (
    <div className="bg-card/30 flex items-center gap-3 rounded-xl border p-2">
      {/* Streaks Section - Always visible if we have stats */}
      {hasStats && (
        <div className="flex items-center gap-3 pr-3 border-r border-border/50">
          {/* Current Streak */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/15">
                  <Flame className="size-4 text-orange-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold leading-none tabular-nums">
                    {consistencyStats.currentStreak}
                  </span>
                  <span className="text-[9px] text-muted-foreground">streak</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Current Streak</TooltipContent>
          </Tooltip>

          {/* Best Streak */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/15">
                  <Target className="size-4 text-blue-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold leading-none tabular-nums">
                    {consistencyStats.longestStreak}
                  </span>
                  <span className="text-[9px] text-muted-foreground">best</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Longest Streak</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Activity Rings - Compact */}
      {metrics && (
        <div className="flex items-center gap-2 pr-3 border-r border-border/50">
          <MiniActivityRings
            move={moveProgress}
            exercise={exerciseProgress}
            stand={standProgress}
            size={36}
          />
          <div className="hidden flex-col gap-0.5 text-[9px] sm:flex">
            <div className="flex items-center gap-1">
              <div className="size-1.5 rounded-full bg-[#FF2D55]" />
              <span className="text-muted-foreground tabular-nums">
                {metrics.active_calories}/{metrics.move_goal || 500}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="size-1.5 rounded-full bg-[#92E82A]" />
              <span className="text-muted-foreground tabular-nums">
                {metrics.exercise_minutes}/{metrics.exercise_goal || 30}m
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="size-1.5 rounded-full bg-[#00D4FF]" />
              <span className="text-muted-foreground tabular-nums">
                {metrics.stand_hours}/{metrics.stand_goal || 12}h
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Today's Workouts */}
      {todayWorkouts.length > 0 ? (
        <>
          {/* Workout Count */}
          <div className="flex items-center gap-2 pr-3 border-r border-border/50">
            <div className="text-center">
              <div className="text-lg font-bold leading-none tabular-nums">
                {todayWorkouts.length}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {todayWorkouts.length === 1 ? 'Workout' : 'Workouts'}
              </div>
            </div>
          </div>

          {/* Workout Pills - Scrollable */}
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none">
            {todayWorkouts.slice(0, 5).map(workout => {
              const defaultStyle = { icon: Dumbbell, color: 'text-slate-500', bg: 'bg-slate-500/15' }
              const typeStyle = WORKOUT_TYPE_STYLES[workout.workout_type] ?? defaultStyle
              const Icon = typeStyle.icon
              const label = WORKOUT_LABELS[workout.workout_type] || workout.workout_type

              return (
                <Tooltip key={workout.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onWorkoutClick?.(workout.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                        typeStyle.bg,
                        'hover:scale-[1.02] hover:shadow-sm',
                        onWorkoutClick && 'cursor-pointer'
                      )}
                    >
                      <Icon className={cn('size-3.5', typeStyle.color)} />
                      <span>{label}</span>
                      <span className="text-muted-foreground text-[10px] tabular-nums">
                        {formatWorkoutDuration(workout.duration)}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-medium">{label}</div>
                      <div className="text-muted-foreground">
                        {Math.round(workout.active_calories)} cal
                        {workout.distance_miles && ` · ${workout.distance_miles.toFixed(2)} mi`}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
            {todayWorkouts.length > 5 && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                +{todayWorkouts.length - 5}
              </Badge>
            )}
          </div>

          {/* Totals - Right side */}
          <div className="hidden items-center gap-3 pl-3 border-l border-border/50 md:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-default">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold tabular-nums">
                    {formatWorkoutDuration(totalDuration)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total Duration</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-default">
                  <Flame className="size-3.5 text-orange-500" />
                  <span className="text-xs font-semibold tabular-nums">
                    {Math.round(totalCalories)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Active Calories</TooltipContent>
            </Tooltip>

            {totalDistance > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 cursor-default">
                    <Target className="size-3.5 text-green-500" />
                    <span className="text-xs font-semibold tabular-nums">
                      {totalDistance.toFixed(1)} mi
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Total Distance</TooltipContent>
              </Tooltip>
            )}

            {onViewAll && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onViewAll}
              >
                Details
                <ChevronRight className="size-3 ml-0.5" />
              </Button>
            )}
          </div>
        </>
      ) : hasActivity ? (
        // No workouts today but has metrics
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          No workouts recorded today
        </div>
      ) : null}

      {/* Weekly/Monthly Progress - Compact */}
      {hasStats && (
        <div className="hidden items-center gap-3 pl-3 border-l border-border/50 lg:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-default">
                <div className="w-16">
                  <div className="flex items-center justify-between text-[9px] mb-0.5">
                    <span className="text-muted-foreground">Week</span>
                    <span className="font-medium tabular-nums">{consistencyStats.weeklyCompletion}%</span>
                  </div>
                  <Progress value={consistencyStats.weeklyCompletion} className="h-1" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Weekly Completion</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-default">
                <div className="w-16">
                  <div className="flex items-center justify-between text-[9px] mb-0.5">
                    <span className="text-muted-foreground">Month</span>
                    <span className="font-medium tabular-nums">{consistencyStats.monthlyCompletion}%</span>
                  </div>
                  <Progress value={consistencyStats.monthlyCompletion} className="h-1" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Monthly Completion</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Routine Stats - Very compact */}
      {hasStats && (
        <div className="hidden items-center gap-2 pl-3 border-l border-border/50 xl:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center cursor-default px-1">
                <div className="text-xs font-semibold tabular-nums">{consistencyStats.streaks.workouts}</div>
                <div className="text-[8px] text-muted-foreground">WO</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Workouts Completed</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center cursor-default px-1">
                <div className="text-xs font-semibold tabular-nums">{consistencyStats.streaks.morningRoutines}</div>
                <div className="text-[8px] text-muted-foreground">AM</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Morning Routines</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center cursor-default px-1">
                <div className="text-xs font-semibold tabular-nums">{consistencyStats.streaks.nightRoutines}</div>
                <div className="text-[8px] text-muted-foreground">PM</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Night Routines</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

// Mini Activity Rings Component
interface MiniActivityRingsProps {
  move: number
  exercise: number
  stand: number
  size?: number
}

function MiniActivityRings({ move, exercise, stand, size = 40 }: MiniActivityRingsProps) {
  const strokeWidth = size * 0.12
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  const rings = [
    { progress: move, color: '#FF2D55', offset: 0 },
    { progress: exercise, color: '#92E82A', offset: strokeWidth + 1 },
    { progress: stand, color: '#00D4FF', offset: (strokeWidth + 1) * 2 },
  ]

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {rings.map((ring, index) => {
        const ringRadius = radius - ring.offset
        const ringCircumference = 2 * Math.PI * ringRadius
        const strokeDashoffset = ringCircumference * (1 - ring.progress / 100)

        return (
          <g key={index}>
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={ringRadius}
              fill="none"
              stroke={ring.color}
              strokeWidth={strokeWidth}
              opacity={0.2}
            />
            {/* Progress ring */}
            <circle
              cx={center}
              cy={center}
              r={ringRadius}
              fill="none"
              stroke={ring.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </g>
        )
      })}
    </svg>
  )
}
