'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  ConsistencyStats,
  DayOfWeek,
  WeeklyRoutine,
} from '@/lib/types/fitness.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type { DayOfWeek as CookingDayOfWeek, MealPlan, Recipe } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import {
  Ban,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Coffee,
  CookingPot,
  Dumbbell,
  Flame,
  MapPin,
  Moon,
  Sandwich,
  Sun,
  Target,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { getEventColor } from '@/lib/types/calendar-views.types'

interface CalendarMobileInfoProps {
  routine: WeeklyRoutine | null
  consistencyStats: ConsistencyStats | null
  selectedDate: Date | null
  loading?: boolean
  todayEvents: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
  mealPlan?: MealPlan | null
  recipes?: Recipe[]
  mealPlanLoading?: boolean
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

const FOCUS_CONFIG: Record<
  string,
  { icon: typeof Dumbbell; color: string; bg: string; gradient: string }
> = {
  Strength: {
    icon: Dumbbell,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    gradient: 'from-orange-500/20 to-orange-500/5',
  },
  'Core/Posture': {
    icon: Target,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    gradient: 'from-blue-500/20 to-blue-500/5',
  },
  Hybrid: {
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    gradient: 'from-purple-500/20 to-purple-500/5',
  },
  Endurance: {
    icon: Flame,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    gradient: 'from-red-500/20 to-red-500/5',
  },
  Circuit: {
    icon: Zap,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    gradient: 'from-green-500/20 to-green-500/5',
  },
  HIIT: {
    icon: Flame,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    gradient: 'from-amber-500/20 to-amber-500/5',
  },
  Rest: {
    icon: Calendar,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    gradient: 'from-slate-500/20 to-slate-500/5',
  },
  'Active Recovery': {
    icon: Sun,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    gradient: 'from-teal-500/20 to-teal-500/5',
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

const MEAL_SLOTS = [
  { key: 'breakfast' as const, label: 'Breakfast', icon: Coffee },
  { key: 'lunch' as const, label: 'Lunch', icon: Sandwich },
  { key: 'dinner' as const, label: 'Dinner', icon: CookingPot },
  { key: 'snack' as const, label: 'Snack', icon: Coffee },
]

export function CalendarMobileInfo({
  routine,
  consistencyStats,
  selectedDate,
  loading = false,
  todayEvents,
  onSelectEvent,
  mealPlan,
  recipes = [],
  mealPlanLoading = false,
}: CalendarMobileInfoProps) {
  const viewDate = selectedDate || new Date()
  const dayOfWeek = getDayOfWeekFromDate(viewDate)
  const weekNumber = getWeekNumber(viewDate)
  const isToday = isSameDay(viewDate, new Date())

  // Meal plan data for selected day
  const cookingDayMap: Record<number, CookingDayOfWeek> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday',
  }
  const cookingDayOfWeek = cookingDayMap[viewDate.getDay()] as CookingDayOfWeek
  const dayMeals = mealPlan?.meals[cookingDayOfWeek]

  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>()
    recipes.forEach(r => map.set(r.id, r))
    return map
  }, [recipes])

  const filledMealSlots = useMemo(() => {
    if (!dayMeals || dayMeals.skipped) return []
    return MEAL_SLOTS.filter(slot => dayMeals[slot.key]).map(slot => ({
      ...slot,
      recipe: recipeMap.get(dayMeals[slot.key]!),
    }))
  }, [dayMeals, recipeMap])

  const daySchedule = routine?.schedule[dayOfWeek]
  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  const focusKey = daySchedule?.focus || 'Rest'
  const focusConfig = FOCUS_CONFIG[focusKey] ??
    FOCUS_CONFIG.Rest ?? {
      icon: Dumbbell,
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
      gradient: 'from-slate-500/20 to-slate-500/5',
    }
  const FocusIcon = focusConfig.icon
  const isRestDay = focusKey === 'Rest' || focusKey === 'Active Recovery'
  const weekStart = startOfWeek(viewDate, { weekStartsOn: 0 })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Dumbbell className="size-6 text-muted-foreground animate-pulse" />
          <span className="text-sm text-muted-foreground">Loading fitness data...</span>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3 pb-6">
        {/* Hero Workout Card */}
        <div className={cn(
          'relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br p-4',
          focusConfig.gradient
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex size-12 items-center justify-center rounded-xl',
                focusConfig.bg
              )}>
                <FocusIcon className={cn('size-6', focusConfig.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {isToday ? "Today's Focus" : format(viewDate, 'EEE, MMM d')}
                </p>
                <h2 className="text-lg font-bold">{focusKey}</h2>
              </div>
            </div>
            <Link href="/fitness">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
              >
                View
                <ChevronRight className="size-3.5" />
              </Button>
            </Link>
          </div>
          {daySchedule?.goal && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {daySchedule.goal}
            </p>
          )}
        </div>

        {/* Routine Status Cards */}
        {routine && (
          <div className="space-y-2">
            <h3 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Routine Status
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {!isRestDay && (
                <MobileCompletionCard
                  icon={Dumbbell}
                  label="Workout"
                  completed={dayData?.workout?.completed}
                  completedAt={dayData?.workout?.completedAt}
                  skipped={dayData?.workout?.skipped}
                  skippedReason={dayData?.workout?.skippedReason}
                  iconColor={focusConfig.color}
                  iconBg={focusConfig.bg}
                />
              )}
              <MobileCompletionCard
                icon={Sun}
                label="Morning Stretch"
                completed={dayData?.morningRoutine?.completed}
                completedAt={dayData?.morningRoutine?.completedAt}
                skipped={dayData?.morningRoutine?.skipped}
                skippedReason={dayData?.morningRoutine?.skippedReason}
                iconColor="text-amber-500"
                iconBg="bg-amber-500/10"
              />
              <MobileCompletionCard
                icon={Moon}
                label="Night Stretch"
                completed={dayData?.nightRoutine?.completed}
                completedAt={dayData?.nightRoutine?.completedAt}
                skipped={dayData?.nightRoutine?.skipped}
                skippedReason={dayData?.nightRoutine?.skippedReason}
                iconColor="text-indigo-400"
                iconBg="bg-indigo-400/10"
              />
            </div>
          </div>
        )}

        {/* Week Overview */}
        {routine && (
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                This Week
              </h3>
              {consistencyStats && (
                <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2 py-0.5">
                  <Flame className="size-3 text-orange-500" />
                  <span className="text-xs font-bold text-orange-500">
                    {consistencyStats.currentStreak}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-1">
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

                const hasWorkout = !isRest
                const workoutDone = dayWeekData?.workout?.completed
                const workoutSkipped = dayWeekData?.workout?.skipped
                const morningDone = dayWeekData?.morningRoutine?.completed
                const nightDone = dayWeekData?.nightRoutine?.completed

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
                const isPartialComplete = completionLevel > 0 && completionLevel < maxLevel
                const isSkipped = workoutSkipped && !workoutDone && hasWorkout

                return (
                  <div
                    key={day}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 rounded-lg py-2 transition-colors',
                      isSelectedDay && 'bg-primary/10 ring-1 ring-primary/30',
                      isTodayDay && !isSelectedDay && 'bg-muted/50'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[10px] font-medium',
                        isSelectedDay ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {DAY_LABELS[day]}
                    </span>
                    <div
                      className={cn(
                        'flex size-5 items-center justify-center rounded-full transition-all',
                        isRest && 'bg-slate-200 dark:bg-slate-700',
                        !isRest && isFullyComplete && 'bg-green-500',
                        !isRest && isPartialComplete && !isSkipped && 'bg-amber-400',
                        !isRest && isSkipped && 'bg-slate-500',
                        !isRest && !isPartialComplete && !isFullyComplete && !isSkipped && isPast && 'bg-red-400/60',
                        !isRest && !isPartialComplete && !isFullyComplete && !isSkipped && !isPast && 'bg-muted'
                      )}
                    >
                      {isFullyComplete && <Check className="size-3 text-white" />}
                      {isSkipped && <Ban className="size-3 text-white" />}
                      {isRest && <span className="text-[9px] text-slate-500">R</span>}
                    </div>
                    <span className={cn(
                      'text-[9px] leading-tight',
                      isSelectedDay ? 'text-primary font-medium' : 'text-muted-foreground'
                    )}>
                      {dayScheduleData?.focus?.slice(0, 3) || ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Consistency Stats */}
        {consistencyStats && (
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <h3 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Consistency
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Week</span>
                  <span className="font-bold">
                    {consistencyStats.weeklyCompletion}%
                  </span>
                </div>
                <Progress
                  value={consistencyStats.weeklyCompletion}
                  className="h-2"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Month</span>
                  <span className="font-bold">
                    {consistencyStats.monthlyCompletion}%
                  </span>
                </div>
                <Progress
                  value={consistencyStats.monthlyCompletion}
                  className="h-2"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <StatPill
                label="Streak"
                value={consistencyStats.currentStreak}
                unit="days"
                icon={<Flame className="size-3 text-orange-500" />}
              />
              <StatPill
                label="Best"
                value={consistencyStats.longestStreak}
                unit="days"
                icon={<Target className="size-3 text-blue-500" />}
              />
              <StatPill
                label="Active"
                value={consistencyStats.totalDaysActive}
                unit="total"
                icon={<Dumbbell className="size-3 text-green-500" />}
              />
            </div>
          </div>
        )}

        {/* Meal Plan */}
        {!mealPlanLoading && (
          <div className="rounded-xl border border-border/50 bg-card">
            <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-teal-500/10">
                  <UtensilsCrossed className="size-3.5 text-teal-500" />
                </div>
                <h3 className="text-xs font-semibold">
                  {isToday ? "Today's Meals" : 'Meals'}
                </h3>
              </div>
              <Link href="/cooking">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                  View
                  <ChevronRight className="size-3" />
                </Button>
              </Link>
            </div>
            <div className="p-2">
              {!mealPlan ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <UtensilsCrossed className="size-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No meal plan this week</p>
                </div>
              ) : dayMeals?.skipped ? (
                <div className="flex items-center gap-3 rounded-lg px-3 py-3">
                  <Ban className="size-4 text-slate-500" />
                  <div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Skipped</span>
                    {dayMeals.skip_note && (
                      <p className="text-[11px] text-muted-foreground">{dayMeals.skip_note}</p>
                    )}
                  </div>
                </div>
              ) : filledMealSlots.length > 0 ? (
                <div className="space-y-1.5">
                  {filledMealSlots.map(slot => {
                    const SlotIcon = slot.icon
                    return (
                      <div
                        key={slot.key}
                        className="flex items-center gap-3 rounded-lg bg-teal-500/5 px-3 py-2.5 dark:bg-teal-500/10"
                      >
                        <SlotIcon className="size-4 text-teal-600 dark:text-teal-400" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {slot.label}
                          </span>
                          <p className="truncate text-sm font-medium">
                            {slot.recipe?.name || 'Unknown recipe'}
                          </p>
                        </div>
                        {slot.recipe?.calories_per_serving && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {slot.recipe.calories_per_serving} cal
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <p className="text-xs text-muted-foreground">No meals planned</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Today's Events */}
        <div className="rounded-xl border border-border/50 bg-card">
          <div className="border-b border-border/50 px-3 py-2.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isToday ? "Today's Events" : `Events on ${format(viewDate, 'MMM d')}`}
            </h3>
          </div>
          <div className="p-2">
            {todayEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Calendar className="size-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No events</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {todayEvents.map(event => {
                  const colors = getEventColor(event.colorId)
                  const startTime = event.start.dateTime
                    ? format(new Date(event.start.dateTime), 'h:mm a')
                    : 'All day'

                  return (
                    <button
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-left transition-all',
                        'hover:bg-muted/50 active:scale-[0.99] touch-manipulation',
                        colors?.bg,
                        colors?.border
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>{startTime}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={cn('text-sm font-medium truncate block', colors?.text)}>
                          {event.summary}
                        </span>
                        {event.location && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <MapPin className="size-2.5 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/30" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* No routine fallback */}
        {!routine && (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
            <Dumbbell className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            <h3 className="text-sm font-semibold">No Routine Set Up</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Set up your fitness routine to track workouts here
            </p>
            <Link href="/fitness?tab=edit">
              <Button variant="outline" size="sm" className="mt-3 text-xs">
                Set Up Routine
              </Button>
            </Link>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

// Completion card for mobile - larger touch targets
function MobileCompletionCard({
  icon: Icon,
  label,
  completed,
  completedAt,
  skipped,
  skippedReason,
  iconColor,
  iconBg,
}: {
  icon: typeof Dumbbell
  label: string
  completed?: boolean
  completedAt?: string
  skipped?: boolean
  skippedReason?: string
  iconColor: string
  iconBg: string
}) {
  const isSkipped = skipped && !completed

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border/50 px-3 py-3 transition-colors',
        completed ? 'bg-green-500/8 border-green-500/20' : isSkipped ? 'bg-slate-500/8 border-slate-500/20' : 'bg-card'
      )}
    >
      <div className={cn(
        'flex size-9 items-center justify-center rounded-lg',
        completed ? 'bg-green-500/10' : isSkipped ? 'bg-slate-500/10' : iconBg
      )}>
        <Icon
          className={cn(
            'size-4',
            completed ? 'text-green-500' : isSkipped ? 'text-slate-500' : iconColor
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-sm font-medium',
            completed
              ? 'text-green-700 dark:text-green-400'
              : isSkipped
                ? 'text-slate-600 dark:text-slate-400'
                : 'text-foreground'
          )}
        >
          {label}
        </span>
        {completedAt && completed && (
          <p className="text-[11px] text-muted-foreground">
            Completed at {format(new Date(completedAt), 'h:mm a')}
          </p>
        )}
        {isSkipped && skippedReason && (
          <p className="text-[11px] text-slate-500 italic truncate">
            "{skippedReason}"
          </p>
        )}
      </div>
      {completed ? (
        <div className="flex size-7 items-center justify-center rounded-full bg-green-500">
          <Check className="size-4 text-white" />
        </div>
      ) : isSkipped ? (
        <div className="flex size-7 items-center justify-center rounded-full bg-slate-500">
          <Ban className="size-4 text-white" />
        </div>
      ) : (
        <Badge variant="outline" className="text-[10px] shrink-0">
          Pending
        </Badge>
      )}
    </div>
  )
}

// Small stat pill
function StatPill({
  label,
  value,
  unit,
  icon,
}: {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 py-2">
      {icon}
      <span className="text-sm font-bold">{value}</span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  )
}
