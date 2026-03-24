'use client'

import { AiCoachPanel } from '@/components/dashboard/ai-coach-panel'
import { MiniDayProgressRing } from '@/components/dashboard/mini-day-progress-ring'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { DateNavigator } from '@/components/ui/date-navigator'
import { PageHeader, PageHeaderRow } from '@/components/ui/page-header'
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
import { ViewToggle } from '@/components/ui/view-toggle'
import { useDateNavigation } from '@/hooks/use-date-navigation'
import { apiGet } from '@/lib/api/client'
import { HEX } from '@/lib/constants/colors'
import type {
    DailyRoutine,
    DayOfWeek,
    Exercise,
    RoutineCompletion,
    WeeklyRoutine,
    Workout,
    WorkoutCompletion,
} from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import {
    DAYS_OF_WEEK,
    DAY_LABELS,
    FOCUS_CONFIG,
    FOCUS_CONFIG_FALLBACK,
    getDayCompletionProgress,
    getFitnessStatusForDay,
    getWeekNumber,
    type FitnessStatus,
    type FitnessStatusDetails,
    type FocusConfigEntry,
} from '@/lib/utils/fitness-ui'
import {
    addDays,
    format,
    isToday as isDateToday,
    startOfWeek,
} from 'date-fns'
import {
    Activity,
    ArrowRight,
    Ban,
    Calendar,
    CalendarDays,
    Check,
    ChevronDown,
    Columns3,
    Dumbbell,
    Moon,
    Settings,
    Sun,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface FitnessKanbanViewProps {
  /** When set (e.g. "Fitness" when embedded), show section title on same line as filters. */
  sectionTitle?: string
  onSwitchToDay: (date?: Date) => void
  onSwitchToEdit?: () => void
}

export function FitnessKanbanView({
  sectionTitle,
  onSwitchToDay,
  onSwitchToEdit,
}: FitnessKanbanViewProps) {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [workoutDefs, setWorkoutDefs] = useState<Record<string, Workout> | null>(null)
  const [loading, setLoading] = useState(true)
  const weekNav = useDateNavigation({ granularity: 'week', weekStartsOn: 1, constrainFuture: true })
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [aiCoachOpen, setAiCoachOpen] = useState(false)
  const [aiCoachReadiness, setAiCoachReadiness] = useState<number | null>(null)

  const weekStart = weekNav.currentDate
  const isCurrentWeek = weekNav.isAtToday

  const fetchData = useCallback(async () => {
    try {
      const [routineRes, defsRes, readinessRes] = await Promise.all([
        apiGet<WeeklyRoutine>('/api/fitness/routine'),
        apiGet<{ definitions: Record<string, Workout> }>('/api/fitness/workout-definitions'),
        apiGet<{ score: number }>('/api/fitness/ai-coach/readiness'),
      ])

      if (routineRes.success && routineRes.data) setRoutine(routineRes.data)
      if (defsRes.success && defsRes.data) setWorkoutDefs(defsRes.data.definitions)
      if (readinessRes.success && readinessRes.data) setAiCoachReadiness(readinessRes.data.score)
    } catch {
      toast.error('Failed to load fitness data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading weekly view...</div>
      </div>
    )
  }

  if (!routine) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">No routine data found</div>
      </div>
    )
  }

  const weekDays = DAYS_OF_WEEK.map((day, index) => {
    const date = addDays(weekStart, index)
    const schedule = routine.schedule[day]
    const focus = schedule?.focus || 'Rest'
    const isRestDay = focus === 'Rest' || focus === 'Active Recovery'
    const focusConfig = FOCUS_CONFIG[focus] || FOCUS_CONFIG_FALLBACK
    const isToday = isDateToday(date)
    const isFuture = date > new Date() && !isToday
    const { status, details } = getFitnessStatusForDay(date, routine)
    const completionProgress = isFuture ? 0 : getDayCompletionProgress(details, isRestDay)
    const workout = workoutDefs?.[day] ?? null
    const weekNumber = getWeekNumber(date)
    const weekData = routine.weeks.find(w => w.weekNumber === weekNumber)
    const dayCompletion = weekData?.days[day]

    return {
      day, date, schedule, focus, isRestDay, focusConfig, isToday, isFuture,
      status, details, completionProgress, workout, dayCompletion,
    }
  })

  const completedDays = weekDays.filter(d => d.status === 'complete' || d.status === 'skipped').length
  const totalActiveDays = weekDays.filter(d => !d.isFuture).length
  const weeklyProgress = totalActiveDays > 0 ? Math.round((completedDays / 7) * 100) : 0

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-0 flex-col">
        {/* Header */}
        <PageHeader
          // secondaryRow={
          //   <div className="px-0 py-0">
          //     <div className="flex items-center gap-3">
          //       {/* <div className="flex items-center gap-2 text-xs text-muted-foreground">
          //         <span className="font-medium text-foreground">{completedDays}/7</span>
          //         <span>days completed</span>
          //       </div> */}
          //       <div className="flex-1 flex items-center gap-2">
          //         {weekDays.map(d => (
          //           <div
          //             key={d.day}
          //             className={cn(
          //               'h-1.5 flex-1 rounded-full transition-colors',
          //               d.status === 'complete' && 'bg-accent-sage',
          //               d.status === 'partial' && 'bg-accent-gold',
          //               d.status === 'skipped' && 'bg-slate-400',
          //               d.status === 'missed' && 'bg-accent-rose/60',
          //               (d.status === 'future' || d.status === 'rest') && 'bg-muted/50',
          //               d.isToday && d.status !== 'complete' && d.status !== 'partial' && 'bg-primary/30',
          //             )}
          //           />
          //         ))}
          //       </div>
          //       {/* <span className="text-xs font-medium tabular-nums text-muted-foreground">
          //         {weeklyProgress}%
          //       </span> */}
          //     </div>
          //   </div>
          // }
        >
          <PageHeaderRow>
          {sectionTitle && (
            <div className="flex items-center gap-2 shrink-0">
              <Dumbbell className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{sectionTitle}</h2>
            </div>
          )}
          {/* Left: Week navigation */}
          <div className="flex items-center gap-1.5">
            <DateNavigator
              label={weekNav.label}
              onPrev={weekNav.goToPrev}
              onNext={weekNav.goToNext}
              onToday={weekNav.goToToday}
              onLabelClick={() => setDatePickerOpen(true)}
              isAtToday={weekNav.isAtToday}
              disableNext={!weekNav.canGoNext}
            />

            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Calendar className="size-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={weekNav.currentDate}
                  onSelect={(date) => {
                    if (date) {
                      weekNav.setDate(startOfWeek(date, { weekStartsOn: 1 }))
                      setDatePickerOpen(false)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <ViewToggle
              options={[
                { value: 'day' as const, label: 'Day', icon: <CalendarDays className="size-3.5" /> },
                { value: 'week' as const, label: 'Week', icon: <Columns3 className="size-3.5" /> },
              ]}
              value="week"
              onChange={(val) => { if (val === 'day') onSwitchToDay() }}
              className="hidden sm:flex"
            />

          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* <Tooltip>
              <TooltipTrigger asChild>
                <AiCoachButton
                  onClick={() => setAiCoachOpen(true)}
                  readinessScore={aiCoachReadiness ?? undefined}
                />
              </TooltipTrigger>
              <TooltipContent>AI Fitness Coach</TooltipContent>
            </Tooltip> */}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden h-8 w-8 text-muted-foreground hover:text-foreground touch-manipulation"
                  onClick={() => onSwitchToDay()}
                >
                  <CalendarDays className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Day View</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/fitness/activity">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs font-medium touch-manipulation">
                    <Activity className="size-4" />
                    <span className="hidden sm:inline">Activity</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Activity Dashboard</TooltipContent>
            </Tooltip>

            {onSwitchToEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground touch-manipulation" onClick={onSwitchToEdit}>
                    <Settings className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Routine</TooltipContent>
              </Tooltip>
            )}
          </div>
          </PageHeaderRow>
        </PageHeader>

        {/* Desktop Kanban Grid (>=768px) */}
        <div className="hidden md:grid md:grid-cols-7 md:gap-2 md:flex-1 md:min-h-0 md:overflow-hidden px-0 sm:px-0">
          {weekDays.map(d => (
            <KanbanColumn
              key={d.day}
              {...d}
              morningRoutine={routine.dailyRoutines.morning}
              nightRoutine={routine.dailyRoutines.night}
              onDayClick={(date) => onSwitchToDay(date)}
            />
          ))}
        </div>

        {/* Mobile Layout (<768px): Vertical stack */}
        <div className="md:hidden flex-1 overflow-y-auto px-1 pb-4 space-y-2">
          {weekDays.map(d => (
            <MobileKanbanRow
              key={d.day}
              {...d}
              morningRoutine={routine.dailyRoutines.morning}
              nightRoutine={routine.dailyRoutines.night}
              onDayClick={(date) => onSwitchToDay(date)}
            />
          ))}
        </div>
      </div>

      <AiCoachPanel open={aiCoachOpen} onOpenChange={setAiCoachOpen} />
    </TooltipProvider>
  )
}


// ---------- Desktop Kanban Column ----------

interface KanbanColumnProps {
  day: DayOfWeek
  date: Date
  schedule: { focus: string; goal: string } | undefined
  focus: string
  isRestDay: boolean
  focusConfig: FocusConfigEntry
  isToday: boolean
  isFuture: boolean
  status: FitnessStatus
  details: FitnessStatusDetails
  completionProgress: number
  workout: Workout | null
  dayCompletion: { workout?: WorkoutCompletion; morningRoutine?: RoutineCompletion; nightRoutine?: RoutineCompletion } | undefined
  morningRoutine: DailyRoutine
  nightRoutine: DailyRoutine
  onDayClick: (date: Date) => void
}

function KanbanColumn({
  day, date, schedule, focus, isRestDay, focusConfig, isToday, isFuture,
  status, details, completionProgress, workout, dayCompletion,
  morningRoutine, nightRoutine, onDayClick,
}: KanbanColumnProps) {
  const FocusIcon = focusConfig.icon
  const ringColor = status === 'complete' ? HEX.sage : status === 'partial' ? HEX.gold : status === 'skipped' ? HEX.slate : HEX.sage

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl transition-all min-h-0 overflow-hidden',
        isToday && 'border-primary/30 bg-gradient-to-b from-primary/[0.06] to-primary/[0.02] shadow-[0_0_12px_-3px] shadow-primary/20',
        !isToday && status === 'complete' && 'bg-accent-sage/[0.03]',
        isFuture && !isToday && 'opacity-50',
        !isToday && !isFuture && 'border-border/50',
        status === 'complete' && 'border-accent-sage/30',
      )}
    >
      {/* Column Header */}
      <button
        onClick={() => onDayClick(date)}
        className="flex flex-col items-center gap-0.5 px-2 py-2 border-b border-border/30 hover:bg-muted/30 transition-colors touch-manipulation"
      >
        <span className={cn(
          'text-[10px] font-semibold uppercase tracking-wide',
          isToday ? 'text-primary' : 'text-muted-foreground',
        )}>
          {DAY_LABELS[day]}
        </span>
        <MiniDayProgressRing
          progress={completionProgress}
          size={26}
          strokeWidth={2.5}
          color={ringColor}
        >
          <FocusIcon className={cn('size-3.5', focusConfig.color)} />
        </MiniDayProgressRing>
        <span className={cn(
          'text-[9px] font-medium leading-tight truncate w-full text-center',
          focusConfig.color,
        )}>
          {focus}
        </span>
      </button>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
        {/* Morning Card */}
        <KanbanCard
          type="morning"
          label={morningRoutine.name}
          duration={morningRoutine.duration}
          exerciseCount={morningRoutine.exercises.length}
          routineExercises={morningRoutine.exercises}
          completed={details.morning}
          skipped={details.morningSkipped}
          completion={dayCompletion?.morningRoutine}
          isFuture={isFuture}
          isToday={isToday}
          onNavigate={() => onDayClick(date)}
        />

        {/* Workout Card */}
        {isRestDay ? (
          <div
            onClick={() => onDayClick(date)}
            className={cn(
              'rounded-lg border border-dashed p-2.5 text-center cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md',
              status === 'complete' ? 'border-accent-sage/30 bg-accent-sage/5' :
              status === 'skipped' ? 'border-muted bg-muted/20 opacity-60' :
              'border-border/50 bg-muted/10',
            )}
          >
            <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Rest Day</div>
            {schedule?.goal && (
              <div className="text-[10px] text-muted-foreground/70 truncate">{schedule.goal}</div>
            )}
            {status === 'complete' && <Check className="size-3 text-accent-sage mx-auto mt-1" />}
            {status === 'skipped' && <Ban className="size-3 text-muted-foreground mx-auto mt-1" />}
          </div>
        ) : (
          <WorkoutKanbanCard
            workout={workout}
            focus={focus}
            focusConfig={focusConfig}
            goal={schedule?.goal}
            completed={details.workout}
            skipped={details.workoutSkipped}
            exercisesCompleted={dayCompletion?.workout?.exercisesCompleted}
            isFuture={isFuture}
            isToday={isToday}
            onNavigate={() => onDayClick(date)}
          />
        )}

        {/* Night Card */}
        <KanbanCard
          type="night"
          label={nightRoutine.name}
          duration={nightRoutine.duration}
          exerciseCount={nightRoutine.exercises.length}
          routineExercises={nightRoutine.exercises}
          completed={details.night}
          skipped={details.nightSkipped}
          completion={dayCompletion?.nightRoutine}
          isFuture={isFuture}
          isToday={isToday}
          onNavigate={() => onDayClick(date)}
        />
      </div>
    </div>
  )
}

// ---------- Kanban Card (Morning / Night) ----------

interface KanbanCardProps {
  type: 'morning' | 'night'
  label: string
  duration: number
  exerciseCount: number
  routineExercises: DailyRoutine['exercises']
  completed: boolean
  skipped: boolean
  completion?: RoutineCompletion
  isFuture: boolean
  isToday: boolean
  onNavigate: () => void
}

function KanbanCard({
  type, label, duration, exerciseCount, routineExercises,
  completed, skipped, completion, isFuture, isToday, onNavigate,
}: KanbanCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isMorning = type === 'morning'
  const Icon = isMorning ? Sun : Moon

  return (
    <div
      className={cn(
        'rounded-lg border transition-all overflow-hidden',
        completed && 'border-accent-sage/30 bg-accent-sage/5',
        skipped && 'border-muted bg-muted/10 opacity-60',
        !completed && !skipped && !isFuture && isToday && (isMorning ? 'border-accent-gold/20 bg-accent-gold/5' : 'border-accent-violet/20 bg-accent-violet/5'),
        !completed && !skipped && isFuture && 'border-dashed border-border/40',
        !completed && !skipped && !isFuture && !isToday && 'border-border/50',
      )}
    >
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-2 text-left cursor-pointer hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'flex items-center justify-center size-5 rounded shrink-0',
            completed ? 'bg-accent-sage/15' :
            skipped ? 'bg-muted' :
            isMorning ? 'bg-accent-gold/10' : 'bg-accent-violet/10',
          )}>
            {completed ? (
              <Check className="size-3 text-accent-sage" />
            ) : skipped ? (
              <Ban className="size-3 text-muted-foreground" />
            ) : (
              <Icon className={cn('size-3', isMorning ? 'text-accent-gold' : 'text-accent-violet')} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn(
              'text-[11px] font-medium leading-tight truncate',
              skipped && 'line-through text-muted-foreground',
              completed && 'text-accent-sage',
            )}>
              {label}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {exerciseCount} exercises · {duration}m
            </div>
          </div>
          <ChevronDown className={cn(
            'size-3 text-muted-foreground/50 shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )} />
        </div>
      </button>

      {/* Expanded exercise list */}
      {expanded && (
        <div className="border-t border-border/20 animate-in slide-in-from-top-1 fade-in-0 duration-150">
          <div className="px-2 py-1.5 space-y-0.5">
            {routineExercises.map((ex, i) => (
              <div key={i} className="flex items-center gap-1.5 py-0.5">
                <div className={cn(
                  'size-1 rounded-full shrink-0',
                  completed ? 'bg-accent-sage' :
                  skipped ? 'bg-muted-foreground/30' :
                  isMorning ? 'bg-accent-gold/50' : 'bg-accent-violet/50',
                )} />
                <span className={cn(
                  'text-[10px] flex-1 truncate',
                  skipped && 'line-through text-muted-foreground',
                )}>
                  {ex.name}
                </span>
                <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
                  {ex.duration >= 60 ? `${Math.floor(ex.duration / 60)}m` : `${ex.duration}s`}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate() }}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 border-t border-border/20 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            View Full Day <ArrowRight className="size-2.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- Workout Kanban Card ----------

interface WorkoutKanbanCardProps {
  workout: Workout | null
  focus: string
  focusConfig: FocusConfigEntry
  goal?: string
  completed: boolean
  skipped: boolean
  exercisesCompleted?: string[]
  isFuture: boolean
  isToday: boolean
  onNavigate: () => void
}

function WorkoutKanbanCard({
  workout, focus, focusConfig, goal,
  completed, skipped, exercisesCompleted,
  isFuture, isToday, onNavigate,
}: WorkoutKanbanCardProps) {
  const [expanded, setExpanded] = useState(true)
  const FocusIcon = focusConfig.icon
  const totalExercises = workout?.exercises.length ?? 0
  const completedCount = exercisesCompleted?.length ?? 0
  const completedIds = new Set(exercisesCompleted ?? [])
  const hasProgress = completedCount > 0 && !completed
  const progressPct = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0

  const hasSections = {
    warmup: !!workout?.warmup,
    finisher: (workout?.finisher?.length ?? 0) > 0,
    metabolic: !!workout?.metabolicFlush,
    mobility: !!workout?.mobility,
  }

  return (
    <div
      className={cn(
        'rounded-lg border transition-all relative overflow-hidden',
        completed && 'border-accent-sage/30 bg-accent-sage/5',
        skipped && 'border-muted bg-muted/10 opacity-60',
        hasProgress && 'border-accent-gold/30 bg-accent-gold/5',
        !completed && !skipped && !hasProgress && !isFuture && isToday && 'border-primary/20 bg-primary/[0.03]',
        !completed && !skipped && !hasProgress && isFuture && 'border-dashed border-border/40',
        !completed && !skipped && !hasProgress && !isFuture && !isToday && 'border-border/50',
      )}
    >
      {/* Focus color accent bar */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1 rounded-l-lg',
        completed ? 'bg-accent-sage' :
        skipped ? 'bg-slate-400' :
        hasProgress ? 'bg-accent-gold' :
        focusConfig.accent,
      )} />

      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-2.5 pl-3.5 text-left cursor-pointer hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-1">
          <div className={cn(
            'flex items-center justify-center size-5 rounded shrink-0',
            completed ? 'bg-accent-sage/15' :
            skipped ? 'bg-muted' :
            focusConfig.bg,
          )}>
            {completed ? (
              <Check className="size-3 text-accent-sage" />
            ) : skipped ? (
              <Ban className="size-3 text-muted-foreground" />
            ) : (
              <FocusIcon className={cn('size-3', focusConfig.color)} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn(
              'text-[11px] font-semibold leading-tight truncate',
              skipped && 'line-through text-muted-foreground',
              completed && 'text-accent-sage',
            )}>
              {workout?.name || focus}
            </div>
          </div>
          <ChevronDown className={cn(
            'size-3 text-muted-foreground/50 shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )} />
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
          {totalExercises > 0 && <span>{totalExercises} exercises</span>}
          {workout?.duration && (
            <>
              <span>·</span>
              <span>{workout.duration}m</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 mb-1.5">
          {hasSections.warmup && <div className="size-1.5 rounded-full bg-accent-azure/60" />}
          <div className={cn('size-1.5 rounded-full', completed ? 'bg-accent-sage' : focusConfig.accent)} />
          {hasSections.finisher && <div className="size-1.5 rounded-full bg-accent-ember/60" />}
          {hasSections.metabolic && <div className="size-1.5 rounded-full bg-accent-rose/60" />}
          {hasSections.mobility && <div className="size-1.5 rounded-full bg-teal-400/60" />}
        </div>

        {(completed || hasProgress) && totalExercises > 0 && (
          <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                completed ? 'bg-accent-sage' : 'bg-accent-gold',
              )}
              style={{ width: `${completed ? 100 : progressPct}%` }}
            />
          </div>
        )}

        {!expanded && goal && !completed && !skipped && (
          <div className="text-[9px] text-muted-foreground/60 truncate mt-1">{goal}</div>
        )}
      </button>

      {/* Expanded exercise detail */}
      {expanded && (
        <div className="border-t border-border/20 pl-3.5 animate-in slide-in-from-top-1 fade-in-0 duration-150">
          {goal && (
            <div className="px-2 pt-1.5 pb-1 text-[10px] text-muted-foreground">{goal}</div>
          )}

          {workout?.warmup && (
            <InlineExerciseSection
              title="Warmup"
              dotColor="bg-accent-azure"
              exercises={workout.warmup.exercises}
              completedIds={completedIds}
              skipped={skipped}
            />
          )}

          {workout && workout.exercises.length > 0 && (
            <InlineExerciseSection
              title={`Main${totalExercises > 0 ? ` (${completedCount}/${totalExercises})` : ''}`}
              dotColor={completed ? 'bg-accent-sage' : focusConfig.accent}
              exercises={workout.exercises}
              completedIds={completedIds}
              skipped={skipped}
              showDetails
            />
          )}

          {workout?.finisher && workout.finisher.length > 0 && (
            <InlineExerciseSection
              title="Finisher"
              dotColor="bg-accent-ember"
              exercises={workout.finisher}
              completedIds={completedIds}
              skipped={skipped}
            />
          )}

          {workout?.metabolicFlush && (
            <InlineExerciseSection
              title="Metabolic Flush"
              dotColor="bg-accent-rose"
              exercises={workout.metabolicFlush.exercises}
              completedIds={completedIds}
              skipped={skipped}
            />
          )}

          {workout?.mobility && (
            <InlineExerciseSection
              title="Mobility"
              dotColor="bg-teal-400"
              exercises={workout.mobility.exercises}
              completedIds={completedIds}
              skipped={skipped}
            />
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onNavigate() }}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 border-t border-border/20 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            View Full Day <ArrowRight className="size-2.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- Inline Exercise Section (for expanded cards) ----------

function InlineExerciseSection({
  title, dotColor, exercises, completedIds, skipped, showDetails,
}: {
  title: string
  dotColor: string
  exercises: Exercise[]
  completedIds: Set<string>
  skipped: boolean
  showDetails?: boolean
}) {
  return (
    <div className="px-2 py-1 border-b border-border/10 last:border-b-0">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-0.5">
        {title}
      </div>
      {exercises.map((ex, i) => {
        const isDone = completedIds.has(ex.id)
        return (
          <div key={ex.id || i} className="flex items-center gap-1.5 py-[1px]">
            <div className={cn(
              'size-1 rounded-full shrink-0',
              isDone ? 'bg-accent-sage' :
              skipped ? 'bg-muted-foreground/30' :
              dotColor,
            )} />
            <span className={cn(
              'text-[10px] flex-1 truncate',
              isDone && 'text-accent-sage',
              skipped && !isDone && 'line-through text-muted-foreground',
            )}>
              {ex.name}
            </span>
            {showDetails && (
              <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
                {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` :
                 ex.duration ? (ex.duration >= 60 ? `${Math.floor(ex.duration / 60)}m` : `${ex.duration}s`) :
                 ''}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------- Mobile Kanban Row ----------

interface MobileKanbanRowProps {
  day: DayOfWeek
  date: Date
  schedule: { focus: string; goal: string } | undefined
  focus: string
  isRestDay: boolean
  focusConfig: FocusConfigEntry
  isToday: boolean
  isFuture: boolean
  status: FitnessStatus
  details: FitnessStatusDetails
  completionProgress: number
  workout: Workout | null
  dayCompletion: { workout?: WorkoutCompletion; morningRoutine?: RoutineCompletion; nightRoutine?: RoutineCompletion } | undefined
  morningRoutine: DailyRoutine
  nightRoutine: DailyRoutine
  onDayClick: (date: Date) => void
}

function MobileKanbanRow({
  day, date, schedule, focus, isRestDay, focusConfig,
  isToday, isFuture, status, details, completionProgress,
  workout, dayCompletion, morningRoutine, nightRoutine, onDayClick,
}: MobileKanbanRowProps) {
  const [expanded, setExpanded] = useState(true)
  const FocusIcon = focusConfig.icon
  const ringColor = status === 'complete' ? HEX.sage : status === 'partial' ? HEX.gold : status === 'skipped' ? HEX.slate : HEX.sage
  const totalExercises = workout?.exercises.length ?? 0
  const completedCount = dayCompletion?.workout?.exercisesCompleted?.length ?? 0
  const completedIds = new Set<string>(dayCompletion?.workout?.exercisesCompleted ?? [])

  return (
    <div className={cn(
      'rounded-xl border transition-all overflow-hidden',
      isToday && 'border-primary/30 bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] shadow-[0_0_12px_-3px] shadow-primary/20',
      !isToday && status === 'complete' && 'bg-accent-sage/[0.03] border-accent-sage/20',
      !isToday && status === 'skipped' && 'opacity-60 border-muted',
      isFuture && !isToday && 'opacity-50 border-dashed',
      !isToday && !isFuture && status !== 'complete' && status !== 'skipped' && 'border-border/50',
    )}>
      {/* Collapsed row header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-3 text-left transition-all touch-manipulation active:bg-muted/20"
      >
        <MiniDayProgressRing
          progress={completionProgress}
          size={36}
          strokeWidth={3}
          color={ringColor}
        >
          <FocusIcon className={cn('size-4', focusConfig.color)} />
        </MiniDayProgressRing>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-bold',
              isToday ? 'text-primary' : 'text-foreground',
            )}>
              {DAY_LABELS[day]} {format(date, 'd')}
            </span>
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              focusConfig.bg, focusConfig.color,
            )}>
              {focus}
            </span>
            {isToday && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                TODAY
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {schedule?.goal || (isRestDay ? 'Rest day' : 'No workout scheduled')}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <StatusDot completed={details.morning} skipped={details.morningSkipped} icon={Sun} label="Morning" />
            {!isRestDay && (
              <StatusDot
                completed={details.workout}
                skipped={details.workoutSkipped}
                icon={Dumbbell}
                label="Workout"
                progress={totalExercises > 0 && completedCount > 0 && !details.workout ? `${completedCount}/${totalExercises}` : undefined}
              />
            )}
            <StatusDot completed={details.night} skipped={details.nightSkipped} icon={Moon} label="Night" />
          </div>
          <div className={cn(
            'transition-transform duration-200',
            expanded && 'rotate-180',
          )}>
            <ChevronDown className="size-4 text-muted-foreground" />
          </div>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-border/30 animate-in slide-in-from-top-1 fade-in-0 duration-200">
          {/* Three section cards */}
          <div className="p-3 space-y-2">
            {/* Morning */}
            <MobileDetailSection
              type="morning"
              label={morningRoutine.name}
              duration={morningRoutine.duration}
              exercises={morningRoutine.exercises.map(ex => ({ name: ex.name, detail: ex.duration >= 60 ? `${Math.floor(ex.duration / 60)}m` : `${ex.duration}s` }))}
              completed={details.morning}
              skipped={details.morningSkipped}
            />

            {/* Workout */}
            {isRestDay ? (
              <div className="rounded-lg bg-muted/20 border border-dashed border-border/40 p-2.5 text-center">
                <div className="text-xs text-muted-foreground">Rest Day</div>
              </div>
            ) : (
              <MobileDetailSection
                type="workout"
                label={workout?.name || focus}
                duration={workout?.duration}
                focusConfig={focusConfig}
                exercises={workout?.exercises.map(ex => ({
                  name: ex.name,
                  detail: ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration ? `${ex.duration >= 60 ? `${Math.floor(ex.duration / 60)}m` : `${ex.duration}s`}` : '',
                  id: ex.id,
                })) ?? []}
                completed={details.workout}
                skipped={details.workoutSkipped}
                completedIds={completedIds}
                warmupCount={workout?.warmup?.exercises.length}
                finisherCount={workout?.finisher?.length}
              />
            )}

            {/* Night */}
            <MobileDetailSection
              type="night"
              label={nightRoutine.name}
              duration={nightRoutine.duration}
              exercises={nightRoutine.exercises.map(ex => ({ name: ex.name, detail: ex.duration >= 60 ? `${Math.floor(ex.duration / 60)}m` : `${ex.duration}s` }))}
              completed={details.night}
              skipped={details.nightSkipped}
            />
          </div>

          {/* Navigate button */}
          <div className="px-3 pb-3">
            <Button
              size="sm"
              className="w-full h-9 text-xs font-medium gap-1.5"
              onClick={() => onDayClick(date)}
            >
              View Full Day
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Mobile Detail Section ----------

function MobileDetailSection({
  type, label, duration, focusConfig, exercises,
  completed, skipped, completedIds, warmupCount, finisherCount,
}: {
  type: 'morning' | 'night' | 'workout'
  label: string
  duration?: number
  focusConfig?: FocusConfigEntry
  exercises: { name: string; detail: string; id?: string }[]
  completed: boolean
  skipped: boolean
  completedIds?: Set<string>
  warmupCount?: number
  finisherCount?: number
}) {
  const isMorning = type === 'morning'
  const isWorkout = type === 'workout'
  const Icon = isMorning ? Sun : isWorkout ? (focusConfig?.icon ?? Dumbbell) : Moon
  const accentBg = isMorning ? 'bg-accent-gold/5' : isWorkout ? (focusConfig?.bg ?? 'bg-muted/10') : 'bg-accent-violet/5'
  const iconColor = isMorning ? 'text-accent-gold' : isWorkout ? (focusConfig?.color ?? 'text-foreground') : 'text-accent-violet'

  return (
    <div className={cn(
      'rounded-lg border p-2.5 relative overflow-hidden',
      completed && 'border-accent-sage/20 bg-accent-sage/5',
      skipped && 'border-muted opacity-60',
      !completed && !skipped && 'border-border/40',
      !completed && !skipped && accentBg,
    )}>
      {isWorkout && focusConfig && (
        <div className={cn('absolute left-0 top-0 bottom-0 w-1', completed ? 'bg-accent-sage' : skipped ? 'bg-slate-400' : focusConfig.accent)} />
      )}
      <div className={cn(isWorkout && 'pl-1.5')}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className={cn(
            'flex items-center justify-center size-6 rounded-md',
            completed ? 'bg-accent-sage/15' : skipped ? 'bg-muted' : accentBg,
          )}>
            {completed ? (
              <Check className="size-3.5 text-accent-sage" />
            ) : skipped ? (
              <Ban className="size-3.5 text-muted-foreground" />
            ) : (
              <Icon className={cn('size-3.5', iconColor)} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className={cn(
              'text-xs font-semibold',
              completed && 'text-accent-sage',
              skipped && 'line-through text-muted-foreground',
            )}>
              {label}
            </span>
          </div>
          {duration && (
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{duration}m</span>
          )}
        </div>

        {/* Section badges for workout */}
        {isWorkout && (warmupCount || finisherCount) && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {warmupCount && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-azure/10 text-accent-azure font-medium">
                Warmup · {warmupCount}
              </span>
            )}
            {finisherCount && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-ember/10 text-accent-ember font-medium">
                Finisher · {finisherCount}
              </span>
            )}
          </div>
        )}

        {/* Exercise list */}
        <div className="space-y-0.5">
          {exercises.slice(0, 6).map((ex, i) => {
            const isDone = completedIds?.has(ex.id ?? '') ?? false
            return (
              <div key={ex.id || i} className="flex items-center gap-1.5 py-0.5">
                <div className={cn(
                  'size-1.5 rounded-full shrink-0',
                  isDone ? 'bg-accent-sage' :
                  completed ? 'bg-accent-sage' :
                  skipped ? 'bg-muted-foreground/30' :
                  isMorning ? 'bg-accent-gold/50' : isWorkout ? (focusConfig?.accent ?? 'bg-muted') : 'bg-accent-violet/50',
                )} />
                <span className={cn(
                  'text-[11px] flex-1 truncate',
                  isDone && 'text-accent-sage',
                  skipped && !isDone && 'line-through text-muted-foreground',
                )}>
                  {ex.name}
                </span>
                {ex.detail && (
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{ex.detail}</span>
                )}
              </div>
            )
          })}
          {exercises.length > 6 && (
            <div className="text-[10px] text-muted-foreground/60 pt-0.5">
              +{exercises.length - 6} more
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Status Dot for Mobile Row ----------

function StatusDot({
  completed, skipped, icon: Icon, label, progress,
}: {
  completed: boolean
  skipped: boolean
  icon: typeof Sun
  label: string
  progress?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          'flex flex-col items-center gap-0.5',
        )}>
          <div className={cn(
            'flex items-center justify-center size-7 rounded-lg',
            completed && 'bg-accent-sage/15',
            skipped && 'bg-muted',
            !completed && !skipped && 'bg-muted/50',
          )}>
            {completed ? (
              <Check className="size-3.5 text-accent-sage" />
            ) : skipped ? (
              <Ban className="size-3 text-muted-foreground" />
            ) : (
              <Icon className="size-3.5 text-muted-foreground" />
            )}
          </div>
          {progress && (
            <span className="text-[9px] font-medium text-accent-gold">{progress}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}: {completed ? 'Done' : skipped ? 'Skipped' : progress || 'Pending'}
      </TooltipContent>
    </Tooltip>
  )
}
