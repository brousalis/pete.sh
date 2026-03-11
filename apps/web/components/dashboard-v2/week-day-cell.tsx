'use client'

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { getFocusConfig, getTempColor } from '@/lib/constants/fitness-colors'
import type { MealPlan } from '@/lib/types/cooking.types'
import type { DayOfWeek, WeeklyRoutine } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import { format, isSameDay } from 'date-fns'
import { motion } from 'framer-motion'
import {
    CalendarDays,
    Check,
    Dices,
    Plus,
    ShoppingCart,
    SkipForward,
    Undo2,
    X,
} from 'lucide-react'

interface WeekDayCellProps {
  date: Date
  dayOfWeek: DayOfWeek
  isActive: boolean
  routine: WeeklyRoutine | null
  tempF: number | null
  onClick: () => void
  mealPlan?: MealPlan | null
  getRecipeById?: (id: string) => { name: string } | undefined
  mealPlanMode?: 'dinner-only' | 'all-meals'
  onAddDinner?: (day: DayOfWeek) => void
  onRecipeClick?: (recipeId: string) => void
  onMarkCooked?: (day: DayOfWeek, meal: string, recipeId: string) => void
  onRemoveMeal?: (day: DayOfWeek, meal: string) => void
  onAddToShopping?: (recipeId: string) => void
  onRandomFill?: (day: DayOfWeek) => void
  onSkipDay?: (day: DayOfWeek) => void
  onUnskipDay?: (day: DayOfWeek) => void
  isSlotCompleted?: (day: DayOfWeek, meal: string) => { id: string } | undefined
  randomizingDay?: DayOfWeek | null
  eventCount?: number
}

export function WeekDayCell({
  date,
  dayOfWeek,
  isActive,
  routine,
  tempF,
  onClick,
  mealPlan,
  getRecipeById,
  mealPlanMode = 'dinner-only',
  onAddDinner,
  onRecipeClick,
  onMarkCooked,
  onRemoveMeal,
  onAddToShopping,
  onRandomFill,
  onSkipDay,
  onUnskipDay,
  isSlotCompleted,
  randomizingDay,
  eventCount = 0,
}: WeekDayCellProps) {
  const schedule = routine?.schedule[dayOfWeek]
  const focus = schedule?.focus || 'Rest'
  const focusConfig = getFocusConfig(focus)
  const isRest = focus === 'Rest' || focus === 'Active Recovery'

  const dayMeals = mealPlan?.meals[dayOfWeek]
  const isSkipped = dayMeals?.skipped === true
  const dinnerId = !isSkipped && dayMeals?.dinner && typeof dayMeals.dinner === 'string' ? dayMeals.dinner : null
  const dinnerRecipe = dinnerId && getRecipeById ? getRecipeById(dinnerId) : null
  const dinnerCompletion = dinnerId && isSlotCompleted ? isSlotCompleted(dayOfWeek, 'dinner') : null
  const isRandomizing = randomizingDay === dayOfWeek
  const hasCooking = !!(mealPlan && getRecipeById)

  const weekNumber = (() => {
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    )
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  })()

  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  const morningDone = dayData?.morningRoutine?.completed || false
  const workoutDone = dayData?.workout?.completed || false
  const nightDone = dayData?.nightRoutine?.completed || false
  const isPast = date < new Date() && !isSameDay(date, new Date())
  const isToday = isSameDay(date, new Date())

  const completionDots = isRest
    ? [morningDone, nightDone]
    : [morningDone, workoutDone, nightDone]

  const allDone = completionDots.every(Boolean) && completionDots.length > 0

  const handleCellClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-cooking-action]')) {
      e.stopPropagation()
      return
    }
    onClick()
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleCellClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick(e as unknown as React.MouseEvent) } }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 py-3 px-1 transition-colors duration-150 min-w-0 cursor-pointer',
        !isActive && 'hover:bg-muted/50',
        isActive && 'bg-muted',
        allDone && isPast && !isActive && 'bg-accent-sage/[0.03]',
      )}
    >
      {/* Active top accent line */}
      {isActive && (
        <motion.div
          className="absolute top-0 inset-x-0 h-[2px] bg-primary"
          layoutId="activeDayBar"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}

      {/* Day abbreviation */}
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wider leading-none',
          isActive ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {format(date, 'EEE')}
      </span>

      {/* Date number */}
      <span
        className={cn(
          'text-[22px] font-semibold tabular-nums leading-none',
          isActive ? 'text-foreground' : isToday ? 'text-foreground/90' : 'text-muted-foreground'
        )}
      >
        {format(date, 'd')}
      </span>

      {/* Fitness: focus badge */}
      <span
        className={cn(
          'text-[6px] font-bold px-1 py-[1px] rounded leading-none uppercase tracking-wider shrink-0',
          isActive
            ? cn(focusConfig.bgStrong, focusConfig.color)
            : cn(focusConfig.bg, focusConfig.color, 'opacity-75')
        )}
      >
        {focus === 'Core/Posture' ? 'Core' : focus === 'Active Recovery' ? 'Recov' : focus}
      </span>

      {/* Cooking: dinner / add / skipped */}
      {hasCooking && (
        <div className="w-full min-w-0 flex flex-col items-center gap-0.5 group/cooking" data-cooking-action>
          {isSkipped ? (
            <>
              <span className="text-[6px] text-muted-foreground/70 italic">
                Skipped{dayMeals?.skip_note ? ` — ${dayMeals.skip_note}` : ''}
              </span>
              {onUnskipDay && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-cooking-action
                      onClick={(e) => {
                        e.stopPropagation()
                        onUnskipDay(dayOfWeek)
                      }}
                      className="flex items-center gap-0.5 text-[7px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Undo2 className="size-2.5" />
                      Restore
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Restore day</TooltipContent>
                </Tooltip>
              )}
            </>
          ) : dinnerRecipe ? (
            <>
              <button
                type="button"
                data-cooking-action
                onClick={(e) => {
                  e.stopPropagation()
                  dinnerId && onRecipeClick?.(dinnerId)
                }}
                className={cn(
                  'text-[7px] font-medium leading-tight truncate max-w-full text-center px-0.5 hover:underline hover:text-foreground transition-colors',
                  dinnerCompletion && 'text-accent-sage'
                )}
                title={dinnerRecipe.name}
              >
                {dinnerRecipe.name}
              </button>
              <div className="flex items-center gap-0.5 opacity-0 group-hover/cooking:opacity-100 transition-opacity [@media(hover:none)]:opacity-100">
                {onMarkCooked && dinnerId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-cooking-action
                        onClick={(e) => {
                          e.stopPropagation()
                          onMarkCooked(dayOfWeek, 'dinner', dinnerId)
                        }}
                        className={cn(
                          'rounded p-0.5 transition-colors',
                          dinnerCompletion
                            ? 'text-accent-sage hover:text-accent-sage'
                            : 'text-muted-foreground hover:text-accent-sage hover:bg-accent-sage/10'
                        )}
                      >
                        <Check className="size-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {dinnerCompletion ? 'Undo cooked' : 'Mark as cooked'}
                    </TooltipContent>
                  </Tooltip>
                )}
                {onRemoveMeal && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-cooking-action
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveMeal(dayOfWeek, 'dinner')
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="size-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Remove meal</TooltipContent>
                  </Tooltip>
                )}
                {onAddToShopping && dinnerId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-cooking-action
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddToShopping(dinnerId)
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:text-accent-gold hover:bg-accent-gold/10 transition-colors"
                      >
                        <ShoppingCart className="size-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Add to shopping list</TooltipContent>
                  </Tooltip>
                )}
                {onRandomFill && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-cooking-action
                        onClick={(e) => {
                          e.stopPropagation()
                          onRandomFill(dayOfWeek)
                        }}
                        disabled={!!randomizingDay}
                        className={cn(
                          'rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                          isRandomizing && 'animate-pulse'
                        )}
                      >
                        <Dices className="size-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Random dinner</TooltipContent>
                  </Tooltip>
                )}
                {onSkipDay && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-cooking-action
                        onClick={(e) => {
                          e.stopPropagation()
                          onSkipDay(dayOfWeek)
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <SkipForward className="size-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Skip day</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </>
          ) : onAddDinner ? (
            <div className="flex items-center gap-0.5" data-cooking-action>
              <button
                data-cooking-action
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddDinner(dayOfWeek)
                }}
                className="flex items-center gap-0.5 text-[7px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
              >
                <Plus className="size-2.5" />
                <span>{mealPlanMode === 'dinner-only' ? 'Dinner' : 'Add'}</span>
              </button>
              {onRandomFill && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-cooking-action
                      onClick={(e) => {
                        e.stopPropagation()
                        onRandomFill(dayOfWeek)
                      }}
                      disabled={!!randomizingDay}
                      className={cn(
                        'rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                        isRandomizing && 'animate-pulse'
                      )}
                    >
                      <Dices className="size-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Random dinner</TooltipContent>
                </Tooltip>
              )}
              {onSkipDay && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-cooking-action
                      onClick={(e) => {
                        e.stopPropagation()
                        onSkipDay(dayOfWeek)
                      }}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <SkipForward className="size-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Skip day</TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Fitness + Calendar: temp, completion dots, event count */}
      <div className="flex items-center gap-1 mt-0.5">
        {tempF != null && (
          <span className={cn('text-[9px] font-medium leading-none', getTempColor(tempF))}>
            {tempF}°
          </span>
        )}
        <div className="flex gap-[3px]">
          {completionDots.map((done, i) => (
            <div
              key={i}
              className={cn(
                'size-[4px] rounded-full transition-colors',
                done
                  ? 'bg-accent-sage'
                  : isPast
                    ? 'bg-accent-rose/40'
                    : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
        {eventCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground" title={`${eventCount} events`}>
                <CalendarDays className="size-2.5" />
                {eventCount}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{eventCount} {eventCount === 1 ? 'event' : 'events'}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </motion.div>
  )
}
