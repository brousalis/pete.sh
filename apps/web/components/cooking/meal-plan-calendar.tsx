'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useCooking } from '@/hooks/use-cooking-data'
import { useToast } from '@/hooks/use-toast'
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations'
import type { DayOfWeek } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import {
    addDays,
    addWeeks,
    format,
    isToday,
    startOfWeek,
    subWeeks,
} from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Calendar as CalendarIcon,
    ChefHat,
    ChevronLeft,
    ChevronRight,
    Dices,
    Flame,
    MessageSquare,
    Plus,
    Settings2,
    ShoppingCart,
    SkipForward,
    Undo2,
    X,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { RecipePicker } from './recipe-picker'

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const DINNER_ONLY = ['dinner'] as const

const MEAL_COLORS = {
  breakfast: 'border-amber-500/30 bg-amber-500/5',
  lunch: 'border-blue-500/30 bg-blue-500/5',
  dinner: 'border-purple-500/30 bg-purple-500/5',
  snack: 'border-green-500/30 bg-green-500/5',
} as const

interface MealPlanCalendarProps {
  onRecipeClick?: (recipeId: string) => void
  onGenerateShoppingList?: () => void
}

export function MealPlanCalendar({
  onRecipeClick,
  onGenerateShoppingList,
}: MealPlanCalendarProps) {
  const {
    currentWeek,
    setCurrentWeek,
    mealPlan,
    mealPlanLoading,
    updateMealSlot,
    getRecipeById,
    mealPlanMode,
    setMealPlanMode,
    skipDay,
    unskipDay,
    randomFillDinner,
  } = useCooking()
  const { toast } = useToast()

  const [pickerSlot, setPickerSlot] = useState<{
    day: DayOfWeek
    meal: string
  } | null>(null)
  const [skipNoteDay, setSkipNoteDay] = useState<DayOfWeek | null>(null)
  const [skipNoteText, setSkipNoteText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [randomizing, setRandomizing] = useState<DayOfWeek | null>(null)

  const activeMealTypes = mealPlanMode === 'dinner-only' ? DINNER_ONLY : ALL_MEAL_TYPES

  const handlePreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const handleThisWeek = () =>
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const handleMealSelect = async (recipeId: string) => {
    if (!pickerSlot) return
    await updateMealSlot(pickerSlot.day, pickerSlot.meal, recipeId || null)
    setPickerSlot(null)
  }

  const handleRemoveMeal = async (day: DayOfWeek, mealType: string) => {
    await updateMealSlot(day, mealType, null)
  }

  const handleSkipDay = async (day: DayOfWeek) => {
    setSkipNoteDay(day)
    setSkipNoteText('')
  }

  const confirmSkip = async () => {
    if (!skipNoteDay) return
    await skipDay(skipNoteDay, skipNoteText || undefined)
    setSkipNoteDay(null)
    setSkipNoteText('')
  }

  const handleRandomFill = useCallback(async (day: DayOfWeek) => {
    setRandomizing(day)
    try {
      await randomFillDinner(day)
    } finally {
      setRandomizing(null)
    }
  }, [randomFillDinner])

  const plannedMealsCount = DAYS.reduce((count, day) => {
    const dayMeals = mealPlan?.meals[day]
    if (!dayMeals || dayMeals.skipped) return count
    return (
      count +
      activeMealTypes.filter(
        (mt) => dayMeals[mt as keyof typeof dayMeals]
      ).length
    )
  }, 0)

  const getDayCalories = (day: DayOfWeek): number | null => {
    const dayMeals = mealPlan?.meals[day]
    if (!dayMeals) return null
    let total = 0
    let hasData = false
    activeMealTypes.forEach((mt) => {
      const recipeId = dayMeals[mt as keyof typeof dayMeals]
      if (recipeId && typeof recipeId === 'string') {
        const recipe = getRecipeById(recipeId)
        if (recipe?.calories_per_serving) {
          total += recipe.calories_per_serving
          hasData = true
        }
      }
    })
    return hasData ? total : null
  }

  if (mealPlanLoading) {
    return <MealPlanSkeleton isDinnerOnly={mealPlanMode === 'dinner-only'} />
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={handlePreviousWeek}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {format(currentWeek, 'MMM d')} –{' '}
              {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
            </span>
          </div>
          <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={handleNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={handleThisWeek}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {plannedMealsCount} {mealPlanMode === 'dinner-only' ? 'dinners' : 'meals'} planned
          </Badge>

          {/* Settings toggle */}
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="size-8 rounded-lg">
                <Settings2 className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Meal Plan Mode
                </p>
                <div className="flex items-center gap-1 rounded-lg border border-border/50 p-0.5">
                  <button
                    onClick={() => setMealPlanMode('dinner-only')}
                    className={cn(
                      'flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                      mealPlanMode === 'dinner-only'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Dinners Only
                  </button>
                  <button
                    onClick={() => setMealPlanMode('all-meals')}
                    className={cn(
                      'flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                      mealPlanMode === 'all-meals'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    All Meals
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {onGenerateShoppingList && plannedMealsCount > 0 && (
            <Button size="sm" className="h-8" onClick={onGenerateShoppingList}>
              <ShoppingCart className="size-3.5 mr-1.5" />
              Shopping List
            </Button>
          )}
        </div>
      </div>

      {/* Week grid */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7"
      >
        {DAYS.map((day, dayIndex) => {
          const dayDate = addDays(currentWeek, dayIndex)
          const dayMeals = mealPlan?.meals[day]
          const isDayToday = isToday(dayDate)
          const dayCalories = getDayCalories(day)
          const isSkipped = dayMeals?.skipped === true
          const skipNote = dayMeals?.skip_note

          return (
            <motion.div key={day} variants={staggerItemVariants}>
              <Card
                className={cn(
                  'transition-shadow hover:shadow-md',
                  isDayToday && 'ring-2 ring-primary/30',
                  isSkipped && 'opacity-60'
                )}
              >
                <CardContent className="p-3">
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isDayToday
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        )}
                      >
                        {format(dayDate, 'EEE')}
                      </span>
                      <span
                        className={cn(
                          'text-lg font-bold block leading-tight',
                          isDayToday && 'text-primary'
                        )}
                      >
                        {format(dayDate, 'd')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {dayCalories && !isSkipped && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-0.5 h-5"
                        >
                          <Flame className="size-2.5 text-orange-500" />
                          {dayCalories}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Skipped state */}
                  {isSkipped ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-2.5">
                        <SkipForward className="size-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-muted-foreground block">
                            Skipped
                          </span>
                          {skipNote && (
                            <span className="text-[11px] text-muted-foreground/70 line-clamp-2 block mt-0.5">
                              {skipNote}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-[10px]"
                        onClick={() => unskipDay(day)}
                      >
                        <Undo2 className="size-3 mr-1" />
                        Restore day
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Meal slots */}
                      <div className="space-y-1.5">
                        {activeMealTypes.map((mealType) => {
                          const recipeId =
                            dayMeals?.[mealType as keyof typeof dayMeals]
                          const recipe =
                            recipeId && typeof recipeId === 'string'
                              ? getRecipeById(recipeId)
                              : null

                          if (recipe) {
                            return (
                              <div
                                key={mealType}
                                className={cn(
                                  'group relative flex items-center gap-2 rounded-lg border p-1.5 cursor-pointer transition-colors',
                                  MEAL_COLORS[mealType]
                                )}
                                onClick={() => onRecipeClick?.(recipe.id)}
                              >
                                {resolveRecipeImageUrl(recipe.image_url) ? (
                                  <img
                                    src={resolveRecipeImageUrl(recipe.image_url)}
                                    alt=""
                                    className="size-7 rounded object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="size-7 rounded bg-muted flex items-center justify-center shrink-0">
                                    <ChefHat className="size-3 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  {mealPlanMode === 'all-meals' && (
                                    <span className="text-[10px] text-muted-foreground capitalize block">
                                      {mealType}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-medium leading-tight line-clamp-1 block">
                                    {recipe.name}
                                  </span>
                                </div>
                                <button
                                  className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5 hover:bg-background/80"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveMeal(day, mealType)
                                  }}
                                >
                                  <X className="size-3 text-muted-foreground" />
                                </button>
                              </div>
                            )
                          }

                          return (
                            <Popover
                              key={mealType}
                              open={
                                pickerSlot?.day === day &&
                                pickerSlot?.meal === mealType
                              }
                              onOpenChange={(open) => {
                                if (!open) setPickerSlot(null)
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg border border-dashed p-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/50"
                                  onClick={() =>
                                    setPickerSlot({ day, meal: mealType })
                                  }
                                >
                                  <Plus className="size-3" />
                                  {mealPlanMode === 'all-meals' ? (
                                    <span className="capitalize">{mealType}</span>
                                  ) : (
                                    <span>Add dinner</span>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-80 p-0"
                                align="start"
                              >
                                <RecipePicker
                                  onSelect={handleMealSelect}
                                  onClose={() => setPickerSlot(null)}
                                  selectedId={
                                    typeof recipeId === 'string'
                                      ? recipeId
                                      : undefined
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                          )
                        })}
                      </div>

                      {/* Day action buttons */}
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30">
                        <button
                          className={cn(
                            'flex items-center justify-center flex-1 rounded-md p-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                            randomizing === day && 'animate-pulse'
                          )}
                          onClick={() => handleRandomFill(day)}
                          disabled={randomizing !== null}
                          title="Random dinner"
                        >
                          <Dices className="size-3 mr-1" />
                          Random
                        </button>
                        <div className="h-3 w-px bg-border/40" />
                        <button
                          className="flex items-center justify-center flex-1 rounded-md p-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => handleSkipDay(day)}
                          title="Skip this day"
                        >
                          <SkipForward className="size-3 mr-1" />
                          Skip
                        </button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Skip note dialog */}
      <AnimatePresence>
        {skipNoteDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSkipNoteDay(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-xl bg-background border shadow-xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <SkipForward className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">
                    Skip {skipNoteDay.charAt(0).toUpperCase() + skipNoteDay.slice(1)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Add an optional note (e.g. "eating out", "leftovers")
                  </p>
                </div>
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Reason for skipping..."
                  value={skipNoteText}
                  onChange={(e) => setSkipNoteText(e.target.value)}
                  className="h-10 pl-9 text-sm rounded-lg"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmSkip()
                  }}
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setSkipNoteDay(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={confirmSkip}
                >
                  Skip Day
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MealPlanSkeleton({ isDinnerOnly }: { isDinnerOnly: boolean }) {
  const slotCount = isDinnerOnly ? 1 : 4
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-10 w-12" />
              {Array.from({ length: slotCount }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
