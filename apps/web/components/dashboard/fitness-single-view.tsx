'use client'

import type {
    AppleWorkout,
    DailyMetrics,
} from '@/components/dashboard/fitness-dashboard'
import { StretchPanel } from '@/components/dashboard/stretch-panel'
import { WorkoutCenter } from '@/components/dashboard/workout-center'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
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
    Activity,
    ArrowLeft,
    Ban,
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

type FitnessStatus = 'complete' | 'partial' | 'missed' | 'rest' | 'future' | 'skipped'

interface FitnessStatusDetails {
  workout: boolean
  workoutSkipped: boolean
  morning: boolean
  morningSkipped: boolean
  night: boolean
  nightSkipped: boolean
  isRest: boolean
  skipped: boolean
  skippedReason?: string
}

function getFitnessStatusForDay(
  date: Date,
  routine: WeeklyRoutine | null | undefined
): { status: FitnessStatus; details: FitnessStatusDetails } {
  const defaultDetails: FitnessStatusDetails = { workout: false, workoutSkipped: false, morning: false, morningSkipped: false, night: false, nightSkipped: false, isRest: false, skipped: false }
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
  const workoutSkipped = dayData?.workout?.skipped ?? false
  const morningDone = dayData?.morningRoutine?.completed ?? false
  const morningExplicitlySkipped = dayData?.morningRoutine?.skipped ?? false
  const nightDone = dayData?.nightRoutine?.completed ?? false
  const nightExplicitlySkipped = dayData?.nightRoutine?.skipped ?? false

  // Routines inherit skipped state from workout if not completed
  const morningSkipped = morningExplicitlySkipped || (workoutSkipped && !morningDone)
  const nightSkipped = nightExplicitlySkipped || (workoutSkipped && !nightDone)

  const details: FitnessStatusDetails = {
    workout: workoutDone,
    workoutSkipped: workoutSkipped,
    morning: morningDone,
    morningSkipped: morningSkipped,
    night: nightDone,
    nightSkipped: nightSkipped,
    isRest: isRestDay,
    skipped: workoutSkipped || morningExplicitlySkipped || nightExplicitlySkipped,
    skippedReason: dayData?.workout?.skippedReason || dayData?.morningRoutine?.skippedReason || dayData?.nightRoutine?.skippedReason,
  }

  if (isFutureDate && !isToday) {
    return { status: 'future', details }
  }

  // Check if entire day is skipped (all activities skipped)
  const allSkipped = isRestDay
    ? (morningSkipped && nightSkipped) && !morningDone && !nightDone
    : (workoutSkipped || !schedule?.workout) && morningSkipped && nightSkipped && !workoutDone && !morningDone && !nightDone

  if (allSkipped) {
    return { status: 'skipped', details }
  }

  // Check for skipped workout first (before checking completion)
  if (workoutSkipped && !isRestDay && !workoutDone) {
    return { status: 'skipped', details }
  }

  if (isRestDay) {
    // For rest days, check if routines are done or skipped
    if (morningDone && nightDone) return { status: 'complete', details }
    if (morningDone || nightDone) return { status: 'partial', details }
    if (morningSkipped && nightSkipped) return { status: 'skipped', details }
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
    // Allow selecting future dates within current week for preview
    const weekEnd = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6)
    if (date > weekEnd) return // Don't allow dates past this week
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

              // Check if this date is within current week (allow preview)
              const weekEnd = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6)
              const isFuturePastWeek = day > weekEnd
              const isFutureThisWeek = isFutureDate && day <= weekEnd

              return (
                <Tooltip key={day.toISOString()}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      disabled={isFuturePastWeek}
                      className={cn(
                        'group relative flex aspect-square flex-col items-center justify-center rounded-lg p-0.5 transition-all',
                        'hover:ring-2 hover:ring-inset',
                        isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/40',
                        isFuturePastWeek && 'cursor-not-allowed opacity-40',
                        isFutureThisWeek && 'opacity-70',
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
                          'bg-red-500/10',
                        !isSelected &&
                          !isToday &&
                          isCurrentMonth &&
                          status === 'skipped' &&
                          'bg-slate-500/15'
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
                          {status === 'skipped' && (
                            <div className="flex size-3 items-center justify-center rounded-full bg-slate-500">
                              <Ban className="size-2 text-white" />
                            </div>
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
                                    : details.workoutSkipped
                                      ? 'text-slate-500'
                                      : 'text-muted-foreground'
                                )}
                              />
                              <span
                                className={
                                  details.workout
                                    ? 'text-green-600 dark:text-green-400'
                                    : details.workoutSkipped
                                      ? 'text-slate-600 dark:text-slate-400'
                                      : ''
                                }
                              >
                                Workout: {details.workout ? 'Done' : details.workoutSkipped ? 'Skipped' : 'Not done'}
                              </span>
                            </div>
                          )}
                          {details.skipped && details.skippedReason && (
                            <div className="text-[10px] text-slate-500 italic pl-4">
                              "{details.skippedReason}"
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Sun
                              className={cn(
                                'size-2.5',
                                details.morning
                                  ? 'text-green-500'
                                  : details.morningSkipped
                                    ? 'text-slate-500'
                                    : 'text-muted-foreground'
                              )}
                            />
                            <span
                              className={
                                details.morning
                                  ? 'text-green-600 dark:text-green-400'
                                  : details.morningSkipped
                                    ? 'text-slate-600 dark:text-slate-400'
                                    : ''
                              }
                            >
                              Morning: {details.morning ? 'Done' : details.morningSkipped ? 'Skipped' : 'Not done'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Moon
                              className={cn(
                                'size-2.5',
                                details.night
                                  ? 'text-green-500'
                                  : details.nightSkipped
                                    ? 'text-slate-500'
                                    : 'text-muted-foreground'
                              )}
                            />
                            <span
                              className={
                                details.night
                                  ? 'text-green-600 dark:text-green-400'
                                  : details.nightSkipped
                                    ? 'text-slate-600 dark:text-slate-400'
                                    : ''
                              }
                            >
                              Night: {details.night ? 'Done' : details.nightSkipped ? 'Skipped' : 'Not done'}
                            </span>
                          </div>
                        </div>
                      )}

                      {isFutureThisWeek && (
                        <div className="text-muted-foreground text-[10px] italic">
                          Click to preview
                        </div>
                      )}
                      {isFuturePastWeek && (
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
        <div className="flex items-center gap-1">
          <div className="flex size-3 items-center justify-center rounded-full bg-slate-500">
            <Ban className="size-2 text-white" />
          </div>
          <span className="text-muted-foreground text-[10px]">Skipped</span>
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
  const [selectedDayAppleWorkouts, setSelectedDayAppleWorkouts] = useState<AppleWorkout[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [completingMorning, setCompletingMorning] = useState(false)
  const [completingNight, setCompletingNight] = useState(false)
  const [completingWorkout, setCompletingWorkout] = useState(false)
  const [skippingWorkout, setSkippingWorkout] = useState(false)
  const [openVideoId, setOpenVideoId] = useState<string | null>(null)
  const [skipDayDialogOpen, setSkipDayDialogOpen] = useState(false)
  const [skipDayReason, setSkipDayReason] = useState('')
  const [activeVersionNumber, setActiveVersionNumber] = useState<number | null>(null)

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
  // Fix: Compare actual dates, not just day names (e.g., both Jan 27 and Feb 3 could be "tuesday")
  const isViewingToday = viewingDate ? isSameDay(viewingDate, new Date()) : (selectedDay === null || selectedDay === today)
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
        workoutDefsRes,
      ] = await Promise.all([
        apiGet<WeeklyRoutine>('/api/fitness/routine'),
        apiGet<Workout>(`/api/fitness/workout/${day}`),
        apiGet<ConsistencyStats>('/api/fitness/consistency'),
        apiGet<AppleWorkout[]>('/api/apple-health/workout?limit=10'),
        apiGet<DailyMetrics | DailyMetrics[]>('/api/apple-health/daily?days=1'),
        apiGet<{ version: { number: number; name: string } | null }>('/api/fitness/workout-definitions'),
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

      if (workoutDefsRes.success && workoutDefsRes.data?.version) {
        setActiveVersionNumber(workoutDefsRes.data.version.number)
      }
    } catch (error) {
      console.error('Failed to fetch fitness data', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch workout for selected day
  const fetchSelectedDayWorkout = useCallback(async (day: DayOfWeek, date?: Date) => {
    try {
      // Fetch the workout definition
      const response = await apiGet<Workout>(`/api/fitness/workout/${day}`)
      if (response.success && response.data) {
        setSelectedDayWorkout(response.data)
      } else {
        setSelectedDayWorkout(null)
      }

      // If we have a specific date, fetch Apple Watch workouts for that date
      if (date) {
        const dateStr = format(date, 'yyyy-MM-dd')
        const appleRes = await apiGet<AppleWorkout[]>(`/api/apple-health/workout?date=${dateStr}&limit=10`)
        if (appleRes.success && appleRes.data) {
          setSelectedDayAppleWorkouts(appleRes.data)
        } else {
          setSelectedDayAppleWorkouts([])
        }
      } else {
        setSelectedDayAppleWorkouts([])
      }
    } catch (error) {
      console.error('Failed to fetch workout for day', error)
      setSelectedDayWorkout(null)
      setSelectedDayAppleWorkouts([])
    }
  }, [])

  // Handle day selection
  const handleDaySelect = (day: DayOfWeek) => {
    if (day === today) {
      setSelectedDay(null)
      setSelectedDayWorkout(null)
      setSelectedDayAppleWorkouts([])
    } else {
      setSelectedDay(day)
      // For day picker (same week), calculate the date
      const todayDate = new Date()
      const todayDayIndex = DAYS_OF_WEEK.indexOf(today)
      const selectedDayIndex = DAYS_OF_WEEK.indexOf(day)
      const dayDiff = selectedDayIndex - todayDayIndex
      const selectedDate = addDays(todayDate, dayDiff)
      fetchSelectedDayWorkout(day, selectedDate)
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
        setSelectedDayAppleWorkouts([])
        setViewingDate(null)
        window.history.replaceState(null, '', '/fitness')
        return
      }

      const dayOfWeek = date
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase() as DayOfWeek

      setSelectedDay(dayOfWeek)
      setViewingDate(date)
      fetchSelectedDayWorkout(dayOfWeek, date)

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

  // Navigate to next day (allow future dates within current week for preview)
  const handleNextDay = useCallback(() => {
    const currentDate = viewingDate || new Date()
    const nextDate = addDays(startOfDay(currentDate), 1)
    // Allow navigating to future dates within the week for preview
    const weekEnd = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6)
    if (nextDate > weekEnd) {
      // Don't go past the current week
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
        fetchSelectedDayWorkout(initialDayOfWeek, initialDate)
      }
    }
  }, [initialDate, fetchSelectedDayWorkout])

  // Handle morning routine completion
  const handleMorningComplete = async () => {
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
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
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
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
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
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
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
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
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
    setCompletingWorkout(true)

    try {
      const response = await apiPost(`/api/fitness/workout/${day}/complete?week=${weekNumber}`, {
        exercisesCompleted,
      })
      if (!response.success) throw new Error('Failed')
      await fetchData()
      // Refetch selected day workout if viewing a different day
      if (!isViewingToday && viewingDate) {
        await fetchSelectedDayWorkout(day as DayOfWeek, viewingDate)
      }
      toast.success('Workout completed!')
    } catch {
      toast.error('Failed to complete workout')
    } finally {
      setCompletingWorkout(false)
    }
  }

  // Handle workout uncomplete (undo completion)
  const handleWorkoutUncomplete = async () => {
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
    setCompletingWorkout(true)

    try {
      const response = await apiDelete(`/api/fitness/workout/${day}/complete?week=${weekNumber}`)
      if (!response.success) throw new Error('Failed')
      await fetchData()
      // Refetch selected day workout if viewing a different day
      if (!isViewingToday && viewingDate) {
        await fetchSelectedDayWorkout(day as DayOfWeek, viewingDate)
      }
      toast.success('Workout unmarked')
    } catch {
      toast.error('Failed to undo completion')
    } finally {
      setCompletingWorkout(false)
    }
  }

  // Handle workout skip
  const handleWorkoutSkip = async (reason: string) => {
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
    setSkippingWorkout(true)

    try {
      const response = await apiPost(`/api/fitness/workout/${day}/skip?week=${weekNumber}`, {
        reason,
      })
      if (!response.success) throw new Error('Failed')
      await fetchData()
      // Refetch selected day workout if viewing a different day
      if (!isViewingToday && viewingDate) {
        await fetchSelectedDayWorkout(day as DayOfWeek, viewingDate)
      }
      toast.success('Workout skipped')
    } catch {
      toast.error('Failed to skip workout')
    } finally {
      setSkippingWorkout(false)
    }
  }

  // Handle workout unskip
  const handleWorkoutUnskip = async () => {
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
    setSkippingWorkout(true)

    try {
      const response = await apiDelete(`/api/fitness/workout/${day}/skip?week=${weekNumber}`)
      if (!response.success) throw new Error('Failed')
      await fetchData()
      // Refetch selected day workout if viewing a different day
      if (!isViewingToday && viewingDate) {
        await fetchSelectedDayWorkout(day as DayOfWeek, viewingDate)
      }
      toast.success('Skip undone')
    } catch {
      toast.error('Failed to undo skip')
    } finally {
      setSkippingWorkout(false)
    }
  }

  // Handle morning routine unskip
  const handleMorningUnskip = async () => {
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
    setCompletingMorning(true)

    try {
      const response = await apiDelete(
        `/api/fitness/routine/morning/skip?day=${day}&week=${weekNumber}`
      )
      if (!response.success) throw new Error('Failed')
      await fetchData()
      toast.success('Morning routine unskipped')
    } catch {
      toast.error('Failed to unskip routine')
    } finally {
      setCompletingMorning(false)
    }
  }

  // Handle night routine unskip
  const handleNightUnskip = async () => {
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
    setCompletingNight(true)

    try {
      const response = await apiDelete(
        `/api/fitness/routine/night/skip?day=${day}&week=${weekNumber}`
      )
      if (!response.success) throw new Error('Failed')
      await fetchData()
      toast.success('Night routine unskipped')
    } catch {
      toast.error('Failed to unskip routine')
    } finally {
      setCompletingNight(false)
    }
  }

  // Handle skip entire day (all 3 activities)
  const handleSkipDay = async (reason: string) => {
    const day = isViewingToday ? getCurrentDay() : viewingDay
    const weekNumber = isViewingToday ? getCurrentWeekNumber() : viewingWeekNumber
    setSkippingWorkout(true)

    try {
      const response = await apiPost(`/api/fitness/day/${day}/skip?week=${weekNumber}`, {
        reason,
      })
      if (!response.success) throw new Error('Failed')
      await fetchData()
      // Refetch selected day workout if viewing a different day
      if (!isViewingToday && viewingDate) {
        await fetchSelectedDayWorkout(day as DayOfWeek, viewingDate)
      }
      toast.success('Day skipped')
    } catch {
      toast.error('Failed to skip day')
    } finally {
      setSkippingWorkout(false)
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
        {/* Unified Header - Single cohesive section */}
        <header className="mb-2 sm:mb-3 shrink-0 px-1 sm:px-0">
          <div className="bg-card/40 rounded-lg sm:rounded-xl border border-border/50 overflow-hidden">
            {/* Standard Header - Tablet and Desktop only (≥640px) */}
            <div className="hidden sm:flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3">
              {/* Date Picker */}
              <Popover open={dayPickerOpen} onOpenChange={(open) => {
                if (open) {
                  // Refresh data when opening the date picker to ensure calendar shows current state
                  fetchData()
                }
                setDayPickerOpen(open)
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-auto min-h-[44px] py-1.5 px-2 sm:px-3 hover:bg-muted/50 rounded-xl shrink-0 transition-all touch-manipulation',
                      !isViewingToday && 'bg-amber-500/10 hover:bg-amber-500/20 ring-1 ring-amber-500/20'
                    )}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Large day number */}
                      <span className={cn(
                        'text-2xl sm:text-3xl font-bold tabular-nums leading-none',
                        !isViewingToday ? 'text-amber-500' : 'text-foreground'
                      )}>
                        {format(viewingDate || new Date(), 'd')}
                      </span>
                      {/* Weekday and month stacked */}
                      <div className="flex flex-col items-start leading-tight">
                        <span className={cn(
                          'text-[10px] sm:text-xs font-semibold uppercase tracking-wide',
                          !isViewingToday ? 'text-amber-500' : 'text-foreground'
                        )}>
                          {format(viewingDate || new Date(), 'EEE')}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {format(viewingDate || new Date(), 'MMM')}
                        </span>
                      </div>
                      {/* Dropdown indicator */}
                      <ChevronDown className={cn(
                        'size-3.5 sm:size-4 ml-0.5 transition-transform',
                        dayPickerOpen && 'rotate-180',
                        !isViewingToday ? 'text-amber-500/60' : 'text-muted-foreground'
                      )} />
                    </div>
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

              {/* Navigation - 40px+ touch targets */}
              <div className="flex items-center shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-9 sm:w-9 touch-manipulation"
                  onClick={handlePrevDay}
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-9 sm:w-9 touch-manipulation"
                  onClick={handleNextDay}
                  disabled={isViewingToday}
                >
                  <ChevronRight className="size-5" />
                </Button>
              </div>

              {/* Week Strip - Desktop: centered, Mobile: horizontal scroll */}
              <div className="hidden flex-1 md:flex items-center justify-center">
                <div className="flex items-center gap-1 rounded-xl bg-muted/20 p-1.5">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const daySchedule = routine.schedule[day]
                    const weekStart = startOfWeek(viewingDate || new Date(), { weekStartsOn: 1 })
                    const dayDate = addDays(weekStart, index)
                    const isTodayDay = isDateToday(dayDate)
                    const isSelected = viewingDate ? isSameDay(dayDate, viewingDate) : isTodayDay
                    const isFutureDate = dayDate > new Date() && !isTodayDay
                    const focus = daySchedule?.focus || 'Rest'
                    const isRestDay = focus === 'Rest' || focus === 'Active Recovery'
                    const focusConfig = FOCUS_CONFIG[focus] || {
                      icon: Calendar,
                      color: 'text-muted-foreground',
                      bg: 'bg-muted',
                    }
                    const FocusIcon = focusConfig.icon
                    const { status, details } = getFitnessStatusForDay(dayDate, routine)

                    // Calculate completion progress for the ring
                    const completionProgress = isFutureDate ? 0 : getDayCompletionProgress(details, isRestDay)
                    const ringColor = status === 'complete' ? '#10b981' : status === 'partial' ? '#f59e0b' : status === 'skipped' ? '#64748b' : '#10b981'

                    return (
                      <Tooltip key={day}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigateToDate(dayDate)}
                            className={cn(
                              'relative flex flex-col items-center w-12 py-1.5 rounded-lg transition-all',
                              isSelected
                                ? 'bg-foreground/10 shadow-md ring-1 ring-foreground/10'
                                : 'hover:bg-muted/50',
                              isTodayDay && !isSelected && 'ring-2 ring-inset ring-primary/40',
                              isFutureDate && !isSelected && 'opacity-40'
                            )}
                          >
                            {/* Day label */}
                            <span className={cn(
                              'text-[10px] font-semibold uppercase tracking-wide mb-0.5',
                              isSelected ? 'text-foreground' : 'text-muted-foreground'
                            )}>
                              {DAY_LABELS[day]}
                            </span>

                            {/* Icon with progress ring */}
                            <MiniDayProgressRing
                              progress={completionProgress}
                              size={26}
                              strokeWidth={2.5}
                              color={ringColor}
                            >
                              <FocusIcon className={cn(
                                'size-3.5',
                                isSelected ? focusConfig.color : 'text-muted-foreground/70'
                              )} />
                            </MiniDayProgressRing>

                            {/* Status indicator below ring */}
                            <div className="h-2 mt-0.5 flex items-center justify-center">
                              {status === 'complete' && (
                                <Check className="size-2.5 text-emerald-500" />
                              )}
                              {status === 'skipped' && (
                                <Ban className="size-2.5 text-muted-foreground" />
                              )}
                              {status === 'missed' && (
                                <div className="size-1.5 rounded-full bg-red-400/60" />
                              )}
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs p-2">
                          <div className="font-semibold">{format(dayDate, 'EEEE, MMM d')}</div>
                          <div className="text-muted-foreground">{focus}</div>
                          {!isFutureDate && completionProgress > 0 && (
                            <div className="mt-1 text-[10px] text-emerald-500">
                              {completionProgress}% complete
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>

              {/* Mobile Week Strip - Horizontal scroll with snap */}
              <div className="flex flex-1 md:hidden overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-1">
                <div className="flex items-center gap-1.5 px-1">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const daySchedule = routine.schedule[day]
                    const weekStart = startOfWeek(viewingDate || new Date(), { weekStartsOn: 1 })
                    const dayDate = addDays(weekStart, index)
                    const isTodayDay = isDateToday(dayDate)
                    const isSelected = viewingDate ? isSameDay(dayDate, viewingDate) : isTodayDay
                    const isFutureDate = dayDate > new Date() && !isTodayDay
                    const focus = daySchedule?.focus || 'Rest'
                    const isRestDay = focus === 'Rest' || focus === 'Active Recovery'
                    const focusConfig = FOCUS_CONFIG[focus] || {
                      icon: Calendar,
                      color: 'text-muted-foreground',
                      bg: 'bg-muted',
                    }
                    const FocusIcon = focusConfig.icon
                    const { status, details } = getFitnessStatusForDay(dayDate, routine)

                    // Calculate completion progress for the ring
                    const completionProgress = isFutureDate ? 0 : getDayCompletionProgress(details, isRestDay)
                    const ringColor = status === 'complete' ? '#10b981' : status === 'partial' ? '#f59e0b' : status === 'skipped' ? '#64748b' : '#10b981'

                    return (
                      <button
                        key={day}
                        onClick={() => navigateToDate(dayDate)}
                        className={cn(
                          'relative flex flex-col items-center justify-center min-w-[44px] min-h-[56px] py-2 px-1.5 rounded-xl transition-all touch-manipulation snap-center',
                          isSelected
                            ? 'bg-foreground/10 shadow-md ring-1 ring-foreground/10'
                            : 'active:bg-muted/50',
                          isTodayDay && !isSelected && 'ring-2 ring-inset ring-primary/40',
                          isFutureDate && !isSelected && 'opacity-40'
                        )}
                      >
                        {/* Day label */}
                        <span className={cn(
                          'text-[10px] font-semibold uppercase tracking-wide mb-0.5',
                          isSelected ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {DAY_LABELS[day]}
                        </span>

                        {/* Icon with progress ring */}
                        <MiniDayProgressRing
                          progress={completionProgress}
                          size={24}
                          strokeWidth={2}
                          color={ringColor}
                        >
                          <FocusIcon className={cn(
                            'size-3',
                            isSelected ? focusConfig.color : 'text-muted-foreground/70'
                          )} />
                        </MiniDayProgressRing>

                        {/* Status indicator */}
                        <div className="h-2 mt-0.5 flex items-center justify-center">
                          {status === 'complete' && (
                            <Check className="size-2.5 text-emerald-500" />
                          )}
                          {status === 'skipped' && (
                            <Ban className="size-2.5 text-muted-foreground" />
                          )}
                          {status === 'missed' && (
                            <div className="size-1.5 rounded-full bg-red-400/60" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions - Grouped with consistent sizing */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Today button - prominent when viewing past dates */}
                {!isViewingToday && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 sm:h-9 gap-1.5 px-3 sm:px-4 text-xs font-semibold touch-manipulation shadow-sm"
                    onClick={() => {
                      setSelectedDay(null)
                      setSelectedDayWorkout(null)
                      setViewingDate(null)
                      window.history.replaceState(null, '', '/fitness')
                    }}
                  >
                    <ArrowLeft className="size-3.5" />
                    <span>Today</span>
                  </Button>
                )}

                {/* Skip Day button */}
                <Dialog open={skipDayDialogOpen} onOpenChange={setSkipDayDialogOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground touch-manipulation">
                          <Ban className="size-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Skip Day</TooltipContent>
                  </Tooltip>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Skip Day</DialogTitle>
                      <DialogDescription>
                        Skip all fitness activities for {isViewingToday ? 'today' : format(viewingDate || new Date(), 'EEEE, MMM d')}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="skip-day-reason">Reason</Label>
                        <Input
                          id="skip-day-reason"
                          placeholder="e.g., Sick, Travel, Rest day..."
                          value={skipDayReason}
                          onChange={(e) => setSkipDayReason(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && skipDayReason.trim()) {
                              handleSkipDay(skipDayReason.trim())
                              setSkipDayDialogOpen(false)
                              setSkipDayReason('')
                            }
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setSkipDayDialogOpen(false); setSkipDayReason('') }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (skipDayReason.trim()) {
                            handleSkipDay(skipDayReason.trim())
                            setSkipDayDialogOpen(false)
                            setSkipDayReason('')
                          }
                        }}
                        disabled={!skipDayReason.trim() || skippingWorkout}
                      >
                        {skippingWorkout ? 'Skipping...' : 'Skip Day'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Activity Dashboard link */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/fitness/activity">
                      <Button variant="outline" size="sm" className="h-8 sm:h-9 gap-1.5 px-2.5 sm:px-3 text-xs font-medium touch-manipulation">
                        <Activity className="size-4" />
                        <span className="hidden sm:inline">Activity</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Activity Dashboard</TooltipContent>
                </Tooltip>

                {/* Settings/Edit button */}
                {onSwitchToEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground touch-manipulation" onClick={onSwitchToEdit}>
                        <Settings className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit Routine</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* ============================================
                COMPACT HEADER FOR ALL MOBILE DEVICES
                Optimized 2-row layout for screens < 640px (sm breakpoint)
                ============================================ */}
            <div className="sm:hidden">
              {/* Row 1: Date + Nav + Actions */}
              <div className="flex items-center justify-between gap-1.5 px-2 py-2">
                {/* Left: Compact Date Picker with integrated nav */}
                <div className="flex items-center">
                  {/* Prev button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 touch-manipulation"
                    onClick={handlePrevDay}
                  >
                    <ChevronLeft className="size-5" />
                  </Button>

                  {/* Date Picker - Compact but readable */}
                  <Popover open={dayPickerOpen} onOpenChange={(open) => {
                    if (open) fetchData()
                    setDayPickerOpen(open)
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-10 px-2.5 hover:bg-muted/50 rounded-xl shrink-0 transition-all touch-manipulation',
                          !isViewingToday && 'bg-amber-500/10 hover:bg-amber-500/20 ring-1 ring-amber-500/20'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {/* Day number */}
                          <span className={cn(
                            'text-xl font-bold tabular-nums leading-none',
                            !isViewingToday ? 'text-amber-500' : 'text-foreground'
                          )}>
                            {format(viewingDate || new Date(), 'd')}
                          </span>
                          {/* Weekday and month stacked */}
                          <div className="flex flex-col items-start leading-tight">
                            <span className={cn(
                              'text-[10px] font-semibold uppercase tracking-wide',
                              !isViewingToday ? 'text-amber-500' : 'text-foreground'
                            )}>
                              {format(viewingDate || new Date(), 'EEE')}
                            </span>
                            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                              {format(viewingDate || new Date(), 'MMM')}
                            </span>
                          </div>
                          <ChevronDown className={cn(
                            'size-3.5 transition-transform',
                            dayPickerOpen && 'rotate-180',
                            !isViewingToday ? 'text-amber-500/60' : 'text-muted-foreground'
                          )} />
                        </div>
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

                  {/* Next button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 touch-manipulation"
                    onClick={handleNextDay}
                    disabled={isViewingToday}
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-0.5">
                  {/* Today button */}
                  {!isViewingToday && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-9 gap-1.5 px-3 text-xs font-semibold touch-manipulation shadow-sm"
                      onClick={() => {
                        setSelectedDay(null)
                        setSelectedDayWorkout(null)
                        setViewingDate(null)
                        window.history.replaceState(null, '', '/fitness')
                      }}
                    >
                      <ArrowLeft className="size-3.5" />
                      Today
                    </Button>
                  )}

                  {/* Skip Day */}
                  <Dialog open={skipDayDialogOpen} onOpenChange={setSkipDayDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground touch-manipulation">
                        <Ban className="size-4" />
                      </Button>
                    </DialogTrigger>
                  </Dialog>

                  {/* Activity link */}
                  <Link href="/fitness/activity">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground touch-manipulation">
                      <Activity className="size-4" />
                    </Button>
                  </Link>

                  {/* Settings */}
                  {onSwitchToEdit && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground touch-manipulation" onClick={onSwitchToEdit}>
                      <Settings className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Row 2: Full-width Week Strip */}
              <div className="border-t border-border/30 px-1.5 py-1.5">
                <div className="flex items-center justify-between gap-1">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const daySchedule = routine.schedule[day]
                    const weekStart = startOfWeek(viewingDate || new Date(), { weekStartsOn: 1 })
                    const dayDate = addDays(weekStart, index)
                    const isTodayDay = isDateToday(dayDate)
                    const isSelected = viewingDate ? isSameDay(dayDate, viewingDate) : isTodayDay
                    const isFutureDate = dayDate > new Date() && !isTodayDay
                    const focus = daySchedule?.focus || 'Rest'
                    const isRestDay = focus === 'Rest' || focus === 'Active Recovery'
                    const focusConfig = FOCUS_CONFIG[focus] || {
                      icon: Calendar,
                      color: 'text-muted-foreground',
                      bg: 'bg-muted',
                    }
                    const FocusIcon = focusConfig.icon
                    const { status, details } = getFitnessStatusForDay(dayDate, routine)
                    const completionProgress = isFutureDate ? 0 : getDayCompletionProgress(details, isRestDay)
                    const ringColor = status === 'complete' ? '#10b981' : status === 'partial' ? '#f59e0b' : status === 'skipped' ? '#64748b' : '#10b981'

                    return (
                      <button
                        key={day}
                        onClick={() => navigateToDate(dayDate)}
                        className={cn(
                          'relative flex flex-col items-center justify-center flex-1 min-h-[52px] py-1.5 rounded-xl transition-all touch-manipulation',
                          isSelected
                            ? 'bg-foreground/10 shadow-sm ring-1 ring-foreground/10'
                            : 'active:bg-muted/50',
                          isTodayDay && !isSelected && 'ring-1.5 ring-inset ring-primary/40',
                          isFutureDate && !isSelected && 'opacity-40'
                        )}
                      >
                        {/* 2-letter day label */}
                        <span className={cn(
                          'text-[10px] font-semibold uppercase tracking-tight mb-0.5',
                          isSelected ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {DAY_LABELS[day].slice(0, 2)}
                        </span>

                        {/* Progress ring with icon */}
                        <MiniDayProgressRing
                          progress={completionProgress}
                          size={22}
                          strokeWidth={2}
                          color={ringColor}
                        >
                          <FocusIcon className={cn(
                            'size-2.5',
                            isSelected ? focusConfig.color : 'text-muted-foreground/70'
                          )} />
                        </MiniDayProgressRing>

                        {/* Status indicator */}
                        <div className="h-2 mt-0.5 flex items-center justify-center">
                          {status === 'complete' && (
                            <Check className="size-2.5 text-emerald-500" />
                          )}
                          {status === 'skipped' && (
                            <Ban className="size-2.5 text-muted-foreground" />
                          )}
                          {status === 'missed' && (
                            <div className="size-1.5 rounded-full bg-red-400/60" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Row: Activity Summary - Seamlessly integrated */}
            {((isViewingToday && (appleWorkouts.length > 0 || dailyMetrics)) ||
              (!isViewingToday && selectedDayAppleWorkouts.length > 0) ||
              consistencyStats) && (
              <div className="border-t border-border/30">
                <UnifiedActivitySummary
                  workouts={isViewingToday ? appleWorkouts : selectedDayAppleWorkouts}
                  metrics={isViewingToday ? dailyMetrics : null}
                  consistencyStats={consistencyStats}
                  viewingDate={viewingDate}
                  onWorkoutClick={id => router.push(`/fitness/activity?workout=${id}`)}
                  onViewAll={() => router.push('/fitness/activity')}
                />
              </div>
            )}
          </div>
        </header>

        {/* Main 3-Panel Layout - Stacks vertically on mobile, workout first */}
        <div className="flex flex-col gap-2 sm:gap-3 overflow-y-auto pb-4 md:pb-0 md:grid md:min-h-0 md:flex-1 md:grid-cols-[200px_1fr_200px] xl:grid-cols-[280px_1fr_280px] 2xl:grid-cols-[320px_1fr_320px] md:overflow-hidden">
          {/* Morning Panel - Shows viewed day's data (order-2 on mobile to show after workout) */}
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
            onUnskip={handleMorningUnskip}
            daySkipped={
              isViewingToday
                ? todayData?.workout?.skipped
                : viewingDayData?.workout?.skipped
            }
            daySkippedReason={
              isViewingToday
                ? todayData?.workout?.skippedReason
                : viewingDayData?.workout?.skippedReason
            }
            className="order-2 md:order-none"
          />

          {/* Workout Center - Shows selected day's workout (order-1 on mobile to show first) */}
          <WorkoutCenter
            workout={isViewingRestDay ? null : displayWorkout}
            day={viewingDay}
            focus={viewingDaySchedule?.focus}
            goal={viewingDaySchedule?.goal}
            completion={displayCompletion}
            hasInjuryProtocol={hasInjuryProtocol}
            onComplete={handleWorkoutComplete}
            onUncomplete={handleWorkoutUncomplete}
            isCompleting={completingWorkout}
            openVideoId={openVideoId}
            onVideoToggle={handleVideoToggle}
            isPreview={!isViewingToday}
            appleWorkouts={isViewingToday ? appleWorkouts : selectedDayAppleWorkouts}
            onSkip={handleWorkoutSkip}
            onUnskip={handleWorkoutUnskip}
            isSkipping={skippingWorkout}
            versionNumber={activeVersionNumber}
            className="order-1 md:order-none"
          />

          {/* Night Panel - Shows viewed day's data (order-3 on mobile to show last) */}
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
            onUnskip={handleNightUnskip}
            daySkipped={
              isViewingToday
                ? todayData?.workout?.skipped
                : viewingDayData?.workout?.skipped
            }
            daySkippedReason={
              isViewingToday
                ? todayData?.workout?.skippedReason
                : viewingDayData?.workout?.skippedReason
            }
            className="order-3 md:order-none"
          />
        </div>

      </div>
    </TooltipProvider>
  )
}

// Mini Progress Ring for Week Strip - Shows completion percentage around icon
interface MiniDayProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  children: React.ReactNode
}

function MiniDayProgressRing({
  progress,
  size = 28,
  strokeWidth = 2,
  color = '#10b981', // emerald-500
  children,
}: MiniDayProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - Math.min(progress, 100) / 100)
  const center = size / 2

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90 transform"
      >
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress ring */}
        {progress > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>
      {/* Icon centered inside */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// Helper to calculate day completion percentage
function getDayCompletionProgress(details: FitnessStatusDetails, isRestDay: boolean): number {
  const items = isRestDay
    ? [details.morning, details.night] // Rest days: 2 items
    : [details.morning, details.workout, details.night] // Workout days: 3 items
  const completed = items.filter(Boolean).length
  return Math.round((completed / items.length) * 100)
}

// Unified Activity Summary - Combines Activity Bar and Consistency Stats
interface UnifiedActivitySummaryProps {
  workouts: AppleWorkout[]
  metrics: DailyMetrics | null
  consistencyStats: ConsistencyStats | null
  viewingDate?: Date | null
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
  hiking: 'Hike',
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
  viewingDate,
  onWorkoutClick,
  onViewAll,
}: UnifiedActivitySummaryProps) {
  // Filter workouts to the date being viewed (or today if not specified)
  const targetDate = viewingDate || new Date()
  const dateWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.start_date)
    return (
      workoutDate.getDate() === targetDate.getDate() &&
      workoutDate.getMonth() === targetDate.getMonth() &&
      workoutDate.getFullYear() === targetDate.getFullYear()
    )
  })

  const totalDuration = dateWorkouts.reduce((sum, w) => sum + w.duration, 0)
  const totalCalories = dateWorkouts.reduce((sum, w) => sum + w.active_calories, 0)
  const totalDistance = dateWorkouts.reduce((sum, w) => sum + (w.distance_miles || 0), 0)

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

  const hasActivity = dateWorkouts.length > 0 || metrics
  const hasStats = consistencyStats

  if (!hasActivity && !hasStats) return null

  const hasMultipleWorkouts = dateWorkouts.length > 1

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 px-2 sm:px-3 py-2">
      {/* Row 1 (mobile) / Left (desktop): Rings + workout pills */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none min-w-0 flex-1">
        {/* Activity Rings */}
        {metrics && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-default shrink-0 rounded-lg bg-muted/30 p-1">
                <ActivityRings
                  move={moveProgress}
                  exercise={exerciseProgress}
                  stand={standProgress}
                  size={32}
                  metrics={metrics}
                  animate
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full bg-[#FF2D55]" />
                    <span className="text-xs">Move</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums">
                    {metrics.active_calories}/{metrics.move_goal || 500} cal
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full bg-[#92E82A]" />
                    <span className="text-xs">Exercise</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums">
                    {metrics.exercise_minutes}/{metrics.exercise_goal || 30} min
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full bg-[#00D4FF]" />
                    <span className="text-xs">Stand</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums">
                    {metrics.stand_hours}/{metrics.stand_goal || 12} hrs
                  </span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Separator - desktop only */}
        {metrics && dateWorkouts.length > 0 && (
          <div className="hidden sm:block h-6 w-px bg-border/30 shrink-0" />
        )}

        {/* Workout count and pills - with visual grouping */}
        {dateWorkouts.length > 0 ? (
          <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
            {/* Workout count badge - desktop only */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 rounded-lg bg-muted/40 px-2.5 py-1">
              <Dumbbell className="size-3.5 text-muted-foreground" />
              <span className="text-base font-bold tabular-nums leading-none">{dateWorkouts.length}</span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {dateWorkouts.length === 1 ? 'workout' : 'workouts'}
              </span>
            </div>

            {/* Workout pills with accent border */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none min-w-0">
              {dateWorkouts.slice(0, 3).map(workout => {
                const defaultStyle = { icon: Dumbbell, color: 'text-foreground/60', bg: 'bg-muted/50' }
                const typeStyle = WORKOUT_TYPE_STYLES[workout.workout_type] ?? defaultStyle
                const Icon = typeStyle.icon
                const label = WORKOUT_LABELS[workout.workout_type] || workout.workout_type

                // Get hex color for border from type style
                const borderColorMap: Record<string, string> = {
                  running: 'border-l-green-500',
                  walking: 'border-l-teal-500',
                  hiking: 'border-l-emerald-500',
                  cycling: 'border-l-blue-500',
                  swimming: 'border-l-cyan-500',
                  functionalStrengthTraining: 'border-l-purple-500',
                  traditionalStrengthTraining: 'border-l-purple-500',
                  coreTraining: 'border-l-pink-500',
                  hiit: 'border-l-red-500',
                  rowing: 'border-l-cyan-500',
                  stairClimbing: 'border-l-amber-500',
                  elliptical: 'border-l-teal-500',
                  yoga: 'border-l-pink-500',
                  other: 'border-l-slate-500',
                }
                const borderColor = borderColorMap[workout.workout_type] || 'border-l-slate-500'

                return (
                  <Tooltip key={workout.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onWorkoutClick?.(workout.id)}
                        className={cn(
                          'flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs transition-all whitespace-nowrap touch-manipulation',
                          'bg-muted/30 hover:bg-muted/50 active:bg-muted/60 hover:shadow-sm',
                          'border-l-[3px]',
                          borderColor,
                          onWorkoutClick && 'cursor-pointer'
                        )}
                      >
                        <Icon className={cn('size-3 sm:size-3.5', typeStyle.color)} />
                        <span className="font-semibold">{label}</span>
                        {/* Hide per-pill duration on mobile when multiple workouts — totals row covers it */}
                        <span className={cn(
                          'text-muted-foreground text-[9px] sm:text-[10px] tabular-nums font-medium',
                          hasMultipleWorkouts && 'hidden sm:inline'
                        )}>
                          {formatWorkoutDuration(workout.duration)}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div className="font-semibold">{label}</div>
                        <div className="text-muted-foreground">
                          {formatWorkoutDuration(workout.duration)} · {Math.round(workout.active_calories)} cal
                          {workout.distance_miles && ` · ${workout.distance_miles.toFixed(2)} mi`}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
              {dateWorkouts.length > 3 && (
                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium shrink-0 px-1">
                  +{dateWorkouts.length - 3} more
                </span>
              )}
            </div>
          </div>
        ) : hasActivity ? (
          <div className="flex-1 text-[10px] sm:text-xs text-muted-foreground">
            No workouts
          </div>
        ) : null}
      </div>

      {/* Row 2 (mobile) / Right (desktop): Aggregate totals with visual grouping */}
      {dateWorkouts.length > 0 && (
        <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
          <div className="hidden sm:block h-6 w-px bg-border/30 shrink-0" />

          {/* Stats group with subtle background */}
          <div className="flex items-center gap-3 sm:gap-4 rounded-lg bg-muted/20 px-2.5 sm:px-3 py-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-default">
                  <Calendar className="size-3.5 text-blue-500/70" />
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatWorkoutDuration(totalDuration)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total Duration</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-default">
                  <Flame className="size-3.5 text-orange-500/70" />
                  <span className="font-semibold tabular-nums text-foreground">
                    {Math.round(totalCalories)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Active Calories</TooltipContent>
            </Tooltip>

            {totalDistance > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-default">
                    <Target className="size-3.5 text-green-500/70" />
                    <span className="font-semibold tabular-nums text-foreground">
                      {totalDistance.toFixed(1)} mi
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Total Distance</TooltipContent>
              </Tooltip>
            )}
          </div>

          {onViewAll && (
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex h-7 px-2.5 text-xs font-medium"
              onClick={onViewAll}
            >
              Details
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Activity Rings Component - Apple Watch style with entrance animation
interface ActivityRingsProps {
  move: number
  exercise: number
  stand: number
  size?: number
  metrics?: DailyMetrics | null
  animate?: boolean
}

function ActivityRings({ move, exercise, stand, size = 44, metrics, animate = false }: ActivityRingsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (animate) {
      // Trigger animation after mount
      const timer = setTimeout(() => setMounted(true), 50)
      return () => clearTimeout(timer)
    }
    setMounted(true)
    return undefined
  }, [animate])

  // Scale stroke width based on size for better proportions
  const strokeWidth = size >= 36 ? size * 0.12 : size * 0.14
  const gap = size >= 36 ? 2 : 1.5
  const outerRadius = (size - strokeWidth) / 2
  const middleRadius = outerRadius - strokeWidth - gap
  const innerRadius = middleRadius - strokeWidth - gap

  const rings = [
    { progress: move, color: '#FF2D55', radius: outerRadius, label: 'Move', delay: 0 },
    { progress: exercise, color: '#92E82A', radius: middleRadius, label: 'Exercise', delay: 100 },
    { progress: stand, color: '#00D4FF', radius: innerRadius, label: 'Stand', delay: 200 },
  ]

  const center = size / 2
  const overallProgress = Math.round((move + exercise + stand) / 3)

  return (
    <div className={cn(
      'relative transition-all duration-300',
      animate && !mounted && 'scale-90 opacity-0',
      animate && mounted && 'scale-100 opacity-100'
    )}>
      <svg width={size} height={size} className="transform -rotate-90">
        {rings.map((ring, index) => {
          const circumference = 2 * Math.PI * ring.radius
          // Animate from full dashoffset to target
          const targetOffset = circumference * (1 - Math.min(ring.progress, 100) / 100)
          const strokeDashoffset = animate && !mounted ? circumference : targetOffset

          return (
            <g key={index}>
              {/* Background ring */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                opacity={0.15}
              />
              {/* Progress ring with animation */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all ease-out"
                style={{
                  filter: `drop-shadow(0 0 ${size * 0.06}px ${ring.color}50)`,
                  transitionDuration: animate ? `${800 + ring.delay}ms` : '700ms',
                  transitionDelay: animate ? `${ring.delay}ms` : '0ms',
                }}
              />
            </g>
          )
        })}
      </svg>
      {/* Center percentage indicator */}
      {metrics && size >= 32 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            'font-bold text-muted-foreground/70 tabular-nums transition-opacity duration-500',
            size >= 36 ? 'text-[9px]' : 'text-[8px]',
            animate && !mounted && 'opacity-0',
            animate && mounted && 'opacity-100'
          )}>
            {overallProgress}%
          </span>
        </div>
      )}
    </div>
  )
}
