'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  ConsistencyStats,
  DayOfWeek,
  WeeklyRoutine,
} from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import {
  Calendar,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Moon,
  Sun,
  Target,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

interface CalendarFitnessSidebarProps {
  routine: WeeklyRoutine | null
  consistencyStats: ConsistencyStats | null
  selectedDate: Date | null
  loading?: boolean
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const DAY_LABELS: Record<DayOfWeek, string> = {
  sunday: 'S',
  monday: 'M',
  tuesday: 'T',
  wednesday: 'W',
  thursday: 'T',
  friday: 'F',
  saturday: 'S',
}

// Map focus to icons and colors
const FOCUS_CONFIG: Record<
  string,
  { icon: typeof Dumbbell; color: string; bg: string }
> = {
  Strength: {
    icon: Dumbbell,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  'Core/Posture': {
    icon: Target,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  Hybrid: { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  Endurance: { icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10' },
  Circuit: { icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10' },
  HIIT: { icon: Flame, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  Rest: { icon: Calendar, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  'Active Recovery': {
    icon: Sun,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
}

function getDayOfWeekFromDate(date: Date): DayOfWeek {
  return date
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as DayOfWeek
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  )
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

export function CalendarFitnessSidebar({
  routine,
  consistencyStats,
  selectedDate,
  loading = false,
}: CalendarFitnessSidebarProps) {
  const viewDate = selectedDate || new Date()
  const dayOfWeek = getDayOfWeekFromDate(viewDate)
  const weekNumber = getWeekNumber(viewDate)
  const isToday = isSameDay(viewDate, new Date())

  // Get schedule and completion for selected day
  const daySchedule = routine?.schedule[dayOfWeek]
  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  // Get focus config
  const focusKey = daySchedule?.focus || 'Rest'
  const focusConfig = FOCUS_CONFIG[focusKey] || FOCUS_CONFIG.Rest
  const FocusIcon = focusConfig.icon

  // Calculate week's completion for the mini week view
  const weekStart = startOfWeek(viewDate, { weekStartsOn: 0 })

  if (loading) {
    return (
      <div className="border-border/50 bg-card flex flex-col gap-3 overflow-hidden rounded-xl border">
        <div className="border-border/50 flex items-center gap-2 border-b px-3 py-2">
          <Dumbbell className="text-muted-foreground size-4" />
          <span className="text-xs font-semibold">Fitness</span>
        </div>
        <div className="flex items-center justify-center p-6">
          <span className="text-muted-foreground text-xs">Loading...</span>
        </div>
      </div>
    )
  }

  if (!routine) {
    return (
      <div className="border-border/50 bg-card flex flex-col gap-3 overflow-hidden rounded-xl border">
        <div className="border-border/50 flex items-center gap-2 border-b px-3 py-2">
          <Dumbbell className="text-muted-foreground size-4" />
          <span className="text-xs font-semibold">Fitness</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
          <Dumbbell className="text-muted-foreground/50 size-6" />
          <span className="text-muted-foreground text-xs">
            No routine configured
          </span>
          <Link href="/fitness?tab=edit">
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Set Up Routine
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const isRestDay = focusKey === 'Rest' || focusKey === 'Active Recovery'

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border-border/50 bg-card flex flex-col gap-2 overflow-hidden rounded-xl border">
        {/* Header */}
        <div className="border-border/50 flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-6 items-center justify-center rounded-md',
                focusConfig.bg
              )}
            >
              <FocusIcon className={cn('size-3.5', focusConfig.color)} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold">
                {isToday ? 'Today' : format(viewDate, 'EEE, MMM d')}
              </span>
              <span className="text-muted-foreground text-[10px]">
                {daySchedule?.focus}
              </span>
            </div>
          </div>
          <Link href="/fitness">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[10px]"
            >
              View
              <ChevronRight className="size-3" />
            </Button>
          </Link>
        </div>

        {/* Day's Goal */}
        {daySchedule?.goal && (
          <div className="px-3">
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {daySchedule.goal}
            </p>
          </div>
        )}

        {/* Completion Status - Only show if not a rest day or if there are routines */}
        <div className="flex flex-col gap-1.5 px-3 pb-2">
          {/* Workout completion */}
          {!isRestDay && (
            <CompletionItem
              icon={Dumbbell}
              label="Workout"
              completed={dayData?.workout?.completed}
              completedAt={dayData?.workout?.completedAt}
              iconColor={focusConfig.color}
            />
          )}

          {/* Morning routine */}
          <CompletionItem
            icon={Sun}
            label="Morning Stretch"
            completed={dayData?.morningRoutine?.completed}
            completedAt={dayData?.morningRoutine?.completedAt}
            iconColor="text-amber-500"
          />

          {/* Night routine */}
          <CompletionItem
            icon={Moon}
            label="Night Stretch"
            completed={dayData?.nightRoutine?.completed}
            completedAt={dayData?.nightRoutine?.completedAt}
            iconColor="text-indigo-400"
          />
        </div>

        {/* Week Overview */}
        <div className="border-border/50 border-t px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-medium">
              This Week
            </span>
            {consistencyStats && (
              <div className="flex items-center gap-1">
                <Flame className="size-3 text-orange-500" />
                <span className="text-[10px] font-semibold">
                  {consistencyStats.currentStreak}
                </span>
              </div>
            )}
          </div>

          {/* Mini week view */}
          <div className="flex gap-0.5">
            {DAYS_OF_WEEK.map((day, index) => {
              const dayDate = addDays(weekStart, index)
              const dayWeekData = week?.days[day]
              const dayScheduleData = routine.schedule[day]
              const isRest =
                dayScheduleData?.focus === 'Rest' ||
                dayScheduleData?.focus === 'Active Recovery'
              const isSelectedDay = isSameDay(dayDate, viewDate)
              const isTodayDay = isSameDay(dayDate, new Date())
              const isPast = dayDate < new Date() && !isTodayDay

              // Determine completion status
              const hasWorkout = !isRest
              const workoutDone = dayWeekData?.workout?.completed
              const morningDone = dayWeekData?.morningRoutine?.completed
              const nightDone = dayWeekData?.nightRoutine?.completed

              // Calculate completion level
              let completionLevel = 0
              if (hasWorkout) {
                if (workoutDone) completionLevel++
                if (morningDone) completionLevel++
                if (nightDone) completionLevel++
              } else {
                if (morningDone) completionLevel++
                if (nightDone) completionLevel++
              }

              const maxLevel = hasWorkout ? 3 : 2
              const isFullyComplete = completionLevel === maxLevel
              const isPartialComplete =
                completionLevel > 0 && completionLevel < maxLevel

              return (
                <Tooltip key={day}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex flex-1 flex-col items-center gap-0.5 rounded-md py-1 transition-colors',
                        isSelectedDay && 'bg-primary/10 ring-primary/30 ring-1',
                        isTodayDay && !isSelectedDay && 'bg-muted/50'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[9px] font-medium',
                          isSelectedDay
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        )}
                      >
                        {DAY_LABELS[day]}
                      </span>
                      <div
                        className={cn(
                          'flex size-4 items-center justify-center rounded-full transition-all',
                          isRest && 'bg-slate-200 dark:bg-slate-700',
                          !isRest && isFullyComplete && 'bg-green-500',
                          !isRest && isPartialComplete && 'bg-amber-400',
                          !isRest &&
                            !isPartialComplete &&
                            !isFullyComplete &&
                            isPast &&
                            'bg-red-400/60',
                          !isRest &&
                            !isPartialComplete &&
                            !isFullyComplete &&
                            !isPast &&
                            'bg-muted'
                        )}
                      >
                        {isFullyComplete && (
                          <Check className="size-2.5 text-white" />
                        )}
                        {isRest && (
                          <span className="text-[8px] text-slate-500">R</span>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="font-medium">
                      {format(dayDate, 'EEEE')} - {dayScheduleData?.focus}
                    </div>
                    {!isRest && (
                      <div className="text-muted-foreground mt-1 space-y-0.5 text-[10px]">
                        <div className="flex items-center gap-1">
                          <Dumbbell className="size-2.5" />
                          Workout: {workoutDone ? 'Done' : 'Not done'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Sun className="size-2.5" />
                          AM: {morningDone ? 'Done' : 'Not done'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Moon className="size-2.5" />
                          PM: {nightDone ? 'Done' : 'Not done'}
                        </div>
                      </div>
                    )}
                    {isRest && (
                      <div className="text-muted-foreground mt-1 space-y-0.5 text-[10px]">
                        <div className="flex items-center gap-1">
                          <Sun className="size-2.5" />
                          AM: {morningDone ? 'Done' : 'Not done'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Moon className="size-2.5" />
                          PM: {nightDone ? 'Done' : 'Not done'}
                        </div>
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>

        {/* Consistency Stats */}
        {consistencyStats && (
          <div className="border-border/50 border-t px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="mb-0.5 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Week</span>
                  <span className="font-medium">
                    {consistencyStats.weeklyCompletion}%
                  </span>
                </div>
                <Progress
                  value={consistencyStats.weeklyCompletion}
                  className="h-1"
                />
              </div>
              <div className="flex-1">
                <div className="mb-0.5 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Month</span>
                  <span className="font-medium">
                    {consistencyStats.monthlyCompletion}%
                  </span>
                </div>
                <Progress
                  value={consistencyStats.monthlyCompletion}
                  className="h-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// Helper component for completion items
function CompletionItem({
  icon: Icon,
  label,
  completed,
  completedAt,
  iconColor,
}: {
  icon: typeof Dumbbell
  label: string
  completed?: boolean
  completedAt?: string
  iconColor: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
        completed ? 'bg-green-500/10' : 'bg-muted/30'
      )}
    >
      <Icon
        className={cn('size-3.5', completed ? 'text-green-500' : iconColor)}
      />
      <span
        className={cn(
          'flex-1 text-[11px] font-medium',
          completed ? 'text-green-700 dark:text-green-400' : 'text-foreground'
        )}
      >
        {label}
      </span>
      {completed ? (
        <div className="flex items-center gap-1">
          <Check className="size-3 text-green-500" />
          {completedAt && (
            <span className="text-muted-foreground text-[9px]">
              {format(new Date(completedAt), 'h:mm a')}
            </span>
          )}
        </div>
      ) : (
        <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
          Pending
        </Badge>
      )}
    </div>
  )
}
