'use client'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getFocusConfig, getTempColor } from '@/lib/constants/fitness-colors'
import type { MealPlan } from '@/lib/types/cooking.types'
import type { DayOfWeek, WeeklyRoutine } from '@/lib/types/fitness.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { format, isSameDay } from 'date-fns'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  Check,
  Dices,
  Ellipsis,
  Plus,
  ShoppingCart,
  SkipForward,
  Undo2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useState } from 'react'

interface WeekDayCellProps {
  date: Date
  dayOfWeek: DayOfWeek
  isActive: boolean
  routine: WeeklyRoutine | null
  tempF: number | null
  onClick: () => void
  mealPlan?: MealPlan | null
  getRecipeById?: (id: string) => {
    name: string
    prep_time?: number
    cook_time?: number
    image_url?: string
  } | undefined
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

function CookingActionsPopover({
  dayOfWeek,
  dinnerId,
  dinnerCompletion,
  isRandomizing,
  randomizingDay,
  onMarkCooked,
  onRemoveMeal,
  onAddToShopping,
  onRandomFill,
  onSkipDay,
}: {
  dayOfWeek: DayOfWeek
  dinnerId: string | null
  dinnerCompletion: { id: string } | null | undefined
  isRandomizing: boolean
  randomizingDay?: DayOfWeek | null
  onMarkCooked?: (day: DayOfWeek, meal: string, recipeId: string) => void
  onRemoveMeal?: (day: DayOfWeek, meal: string) => void
  onAddToShopping?: (recipeId: string) => void
  onRandomFill?: (day: DayOfWeek) => void
  onSkipDay?: (day: DayOfWeek) => void
}) {
  const [open, setOpen] = useState(false)
  const hasActions = onRemoveMeal || (onAddToShopping && dinnerId) || onRandomFill || onSkipDay

  if (!hasActions) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-cooking-action
          onClick={(e) => e.stopPropagation()}
          className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
        >
          <Ellipsis className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        className="w-auto min-w-[130px] p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-0.5" data-cooking-action>
          {onMarkCooked && dinnerId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMarkCooked(dayOfWeek, 'dinner', dinnerId)
                setOpen(false)
              }}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors w-full text-left',
                dinnerCompletion
                  ? 'text-accent-sage hover:bg-accent-sage/10'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <Check className="size-3.5" />
              {dinnerCompletion ? 'Undo cooked' : 'Mark cooked'}
            </button>
          )}
          {onRemoveMeal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveMeal(dayOfWeek, 'dinner')
                setOpen(false)
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full text-left"
            >
              <X className="size-3.5" />
              Remove
            </button>
          )}
          {onAddToShopping && dinnerId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAddToShopping(dinnerId)
                setOpen(false)
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground hover:bg-accent-gold/10 hover:text-accent-gold transition-colors w-full text-left"
            >
              <ShoppingCart className="size-3.5" />
              Add to list
            </button>
          )}
          {onRandomFill && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRandomFill(dayOfWeek)
                setOpen(false)
              }}
              disabled={!!randomizingDay}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground hover:bg-muted transition-colors w-full text-left',
                isRandomizing && 'animate-pulse'
              )}
            >
              <Dices className="size-3.5" />
              Randomize
            </button>
          )}
          {onSkipDay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSkipDay(dayOfWeek)
                setOpen(false)
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground hover:bg-muted transition-colors w-full text-left"
            >
              <SkipForward className="size-3.5" />
              Skip day
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function RecipeThumb({ src, name }: { src?: string; name: string }) {
  const resolved = resolveRecipeImageUrl(src)
  if (resolved) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={name}
        className="size-3.5 rounded-[3px] object-cover shrink-0"
      />
    )
  }
  return <UtensilsCrossed className="size-3 text-muted-foreground/40 shrink-0" />
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
  const workoutName = !isRest ? schedule?.workout?.name : null

  const dayMeals = mealPlan?.meals[dayOfWeek]
  const isSkipped = dayMeals?.skipped === true
  const dinnerId = !isSkipped && dayMeals?.dinner && typeof dayMeals.dinner === 'string' ? dayMeals.dinner : null
  const dinnerRecipe = dinnerId && getRecipeById ? getRecipeById(dinnerId) : null
  const dinnerCompletion = dinnerId && isSlotCompleted ? isSlotCompleted(dayOfWeek, 'dinner') : null
  const isRandomizing = randomizingDay === dayOfWeek
  const hasCooking = !!(mealPlan && getRecipeById)

  const totalTime = dinnerRecipe
    ? (dinnerRecipe.prep_time ?? 0) + (dinnerRecipe.cook_time ?? 0)
    : 0

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

  const focusLabel = focus === 'Core/Posture' ? 'Core' : focus === 'Active Recovery' ? 'Recov' : focus

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleCellClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick(e as unknown as React.MouseEvent) } }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex flex-col gap-[3px] pt-3 pb-1 px-2 min-w-0 cursor-pointer group/cell transition-all duration-150',
        isActive
          ? 'bg-muted/80'
          : 'hover:bg-muted/40',
        allDone && isPast && !isActive && 'bg-accent-sage/[0.04]',
      )}
    >
      {/* Top accent: focus color for all, primary animated for active */}
      <div
        className={cn(
          'absolute top-0 inset-x-0',
          isActive ? 'h-[3px]' : 'h-[2px]',
          isActive ? '' : focusConfig.bg.replace('/10', '/20'),
        )}
      />
      {isActive && (
        <div className="absolute top-0 inset-x-0 h-[3px] bg-[var(--brand)]" />
      )}

      {/* Row 1: Day + Date + Focus badge + Dots */}
      <div className="flex items-center gap-1 min-w-0">
        <span
          className={cn(
            'text-[10px] font-medium uppercase tracking-wide leading-none shrink-0',
            isActive ? 'text-foreground/60' : 'text-muted-foreground/50'
          )}
        >
          {format(date, 'EEE')}
        </span>
        <span
          className={cn(
            'text-[13px] font-bold tabular-nums leading-none shrink-0',
            isActive
              ? 'text-foreground'
              : isToday
                ? 'text-foreground/90'
                : 'text-foreground/60'
          )}
        >
          {format(date, 'd')}
        </span>
        {isToday && !isActive && (
          <div className="size-1 rounded-full bg-primary shrink-0" />
        )}
        <span
          className={cn(
            'text-[7px] font-bold px-1 py-[1.5px] rounded leading-none uppercase tracking-wider shrink-0',
            isActive
              ? cn(focusConfig.bgStrong, focusConfig.color)
              : cn(focusConfig.bg, focusConfig.color, 'opacity-80')
          )}
        >
          {focusLabel}
        </span>
        <div className="flex gap-[3px] ml-auto shrink-0">
          {completionDots.map((done, i) => (
            <div
              key={i}
              className={cn(
                'size-[4px] rounded-full transition-colors',
                done
                  ? 'bg-accent-sage'
                  : isPast
                    ? 'bg-accent-rose/40'
                    : 'bg-muted-foreground/20'
              )}
            />
          ))}
        </div>
      </div>

      {/* Row 2: Workout name */}
      {workoutName ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'text-[9px] leading-none truncate max-w-full',
                isActive ? 'text-foreground/50' : 'text-muted-foreground/40'
              )}
            >
              {workoutName}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{workoutName}</TooltipContent>
        </Tooltip>
      ) : (
        <span className={cn(
          'text-[9px] leading-none italic',
          isActive ? 'text-foreground/30' : 'text-muted-foreground/25'
        )}>
          {isRest ? 'Rest day' : ''}
        </span>
      )}

      {/* Row 3: Cooking + Meta */}
      <div className="flex items-center gap-1 min-w-0">
        {hasCooking ? (
          <div className="flex-1 min-w-0 flex items-center gap-1" data-cooking-action>
            {isSkipped ? (
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-muted-foreground/45 italic leading-none">Skipped</span>
                {onUnskipDay && (
                  <button
                    type="button"
                    data-cooking-action
                    onClick={(e) => { e.stopPropagation(); onUnskipDay(dayOfWeek) }}
                    className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors"
                  >
                    <Undo2 className="size-2.5" />
                  </button>
                )}
              </div>
            ) : dinnerRecipe ? (
              <>
                {dinnerCompletion ? (
                  <Check className="size-3 text-accent-sage shrink-0" />
                ) : (
                  <RecipeThumb src={dinnerRecipe.image_url} name={dinnerRecipe.name} />
                )}
                <button
                  type="button"
                  data-cooking-action
                  onClick={(e) => { e.stopPropagation(); dinnerId && onRecipeClick?.(dinnerId) }}
                  className={cn(
                    'text-[10px] font-medium leading-none truncate min-w-0 hover:underline transition-colors',
                    dinnerCompletion
                      ? 'text-accent-sage'
                      : isActive
                        ? 'text-foreground/80'
                        : 'text-foreground/65'
                  )}
                  title={dinnerRecipe.name}
                >
                  {dinnerRecipe.name}
                </button>
                {totalTime > 0 && (
                  <span className="text-[8px] text-muted-foreground/35 shrink-0 leading-none">{totalTime}m</span>
                )}
                <div className="shrink-0 opacity-0 group-hover/cell:opacity-100 transition-opacity [@media(hover:none)]:opacity-100">
                  <CookingActionsPopover
                    dayOfWeek={dayOfWeek}
                    dinnerId={dinnerId}
                    dinnerCompletion={dinnerCompletion}
                    isRandomizing={isRandomizing}
                    randomizingDay={randomizingDay}
                    onMarkCooked={onMarkCooked}
                    onRemoveMeal={onRemoveMeal}
                    onAddToShopping={onAddToShopping}
                    onRandomFill={onRandomFill}
                    onSkipDay={onSkipDay}
                  />
                </div>
              </>
            ) : onAddDinner ? (
              <div className="flex items-center gap-0.5" data-cooking-action>
                <button
                  data-cooking-action
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAddDinner(dayOfWeek) }}
                  className="flex items-center gap-0.5 text-[9px] text-muted-foreground/40 hover:text-foreground rounded px-0.5 py-0.5 hover:bg-muted/50 transition-colors"
                >
                  <Plus className="size-2.5" />
                  <span>{mealPlanMode === 'dinner-only' ? 'Dinner' : 'Add'}</span>
                </button>
                {onRandomFill && (
                  <button
                    type="button"
                    data-cooking-action
                    onClick={(e) => { e.stopPropagation(); onRandomFill(dayOfWeek) }}
                    disabled={!!randomizingDay}
                    className={cn(
                      'rounded p-0.5 text-muted-foreground/35 hover:text-foreground hover:bg-muted transition-colors',
                      isRandomizing && 'animate-pulse'
                    )}
                  >
                    <Dices className="size-2.5" />
                  </button>
                )}
                {onSkipDay && (
                  <button
                    type="button"
                    data-cooking-action
                    onClick={(e) => { e.stopPropagation(); onSkipDay(dayOfWeek) }}
                    className="rounded p-0.5 text-muted-foreground/35 hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <SkipForward className="size-2.5" />
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right meta: temp + events */}
        <div className="flex items-center gap-1 shrink-0">
          {tempF != null && (
            <span className={cn('text-[10px] font-medium tabular-nums leading-none', getTempColor(tempF))}>
              {tempF}°
            </span>
          )}
          {eventCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-px text-[9px] text-muted-foreground/50 leading-none tabular-nums">
                  <CalendarDays className="size-2.5" />
                  {eventCount}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{eventCount} {eventCount === 1 ? 'event' : 'events'}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </motion.div>
  )
}
