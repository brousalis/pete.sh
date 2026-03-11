'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DayMeals, DayOfWeek, MealPlan, MealPlanMode, Recipe } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChefHat,
  Clock,
  Dices,
  Flame,
  Play,
  Plus,
  ShoppingCart,
  SkipForward,
  Undo2,
  UtensilsCrossed,
  Wand2,
  X,
} from 'lucide-react'
import { useMemo } from 'react'

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-accent-sage/15 text-accent-sage border-accent-sage/20',
  medium: 'bg-accent-gold/15 text-accent-gold border-accent-gold/20',
  hard: 'bg-accent-rose/15 text-accent-rose border-accent-rose/20',
}

const MEAL_TYPE_SHORT: Record<string, string> = {
  breakfast: 'B',
  lunch: 'L',
  dinner: 'D',
  snack: 'S',
}

interface WeekMenuViewProps {
  mealPlan: MealPlan | null
  getRecipeById: (id: string) => Recipe | undefined
  mealPlanMode: MealPlanMode
  selectedDate: Date
  sidebarOpen: boolean
  onSelectDay: (date: Date, direction: 'forward' | 'backward') => void
  onRecipeClick: (recipeId: string) => void
  onMarkCooked: (day: DayOfWeek, meal: string, recipeId: string) => void
  onRemoveMeal: (day: DayOfWeek, meal: string) => void
  onAddToShopping: (recipeId: string) => void
  onRandomFill: (day: DayOfWeek) => void
  onSkipDay: (day: DayOfWeek) => void
  onUnskipDay: (day: DayOfWeek) => void
  onStartCooking: (recipe: Recipe) => void
  onAddDinner: (day: DayOfWeek) => void
  onPlanWeek: () => void
  isSlotCompleted: (day: DayOfWeek, meal: string) => { id: string } | undefined
  randomizingDay?: DayOfWeek | null
}

interface DayInfo {
  date: Date
  dayKey: DayOfWeek
  dayMeals: DayMeals | undefined
  isToday: boolean
  isSelected: boolean
  isPast: boolean
  isSkipped: boolean
}

function useDayInfos(selectedDate: Date): DayInfo[] {
  return useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const today = new Date()
    return DAYS.map((dayKey, i) => {
      const date = addDays(weekStart, i)
      return {
        date,
        dayKey,
        dayMeals: undefined,
        isToday: isSameDay(date, today),
        isSelected: isSameDay(date, selectedDate),
        isPast: date < today && !isSameDay(date, today),
        isSkipped: false,
      }
    })
  }, [selectedDate])
}

function getMealsForDay(
  dayMeals: DayMeals | undefined,
  mealPlanMode: MealPlanMode,
  getRecipeById: (id: string) => Recipe | undefined
): { mealType: string; recipe: Recipe }[] {
  if (!dayMeals) return []
  const types = mealPlanMode === 'dinner-only' ? ['dinner'] : MEAL_TYPES
  const results: { mealType: string; recipe: Recipe }[] = []
  for (const mt of types) {
    const id = dayMeals[mt as keyof DayMeals]
    if (id && typeof id === 'string') {
      const recipe = getRecipeById(id)
      if (recipe) results.push({ mealType: mt, recipe })
    }
  }
  return results
}

function getPrimaryRecipe(
  dayMeals: DayMeals | undefined,
  mealPlanMode: MealPlanMode,
  getRecipeById: (id: string) => Recipe | undefined
): Recipe | undefined {
  if (!dayMeals) return undefined
  if (mealPlanMode === 'dinner-only') {
    const id = dayMeals.dinner
    return id && typeof id === 'string' ? getRecipeById(id) : undefined
  }
  for (const mt of ['dinner', 'lunch', 'breakfast', 'snack']) {
    const id = dayMeals[mt as keyof DayMeals]
    if (id && typeof id === 'string') {
      const recipe = getRecipeById(id)
      if (recipe) return recipe
    }
  }
  return undefined
}

// ── Hero Recipe Card ──

function HeroRecipeCard({
  dayInfo,
  dayMeals,
  mealPlanMode,
  getRecipeById,
  isSlotCompleted,
  onRecipeClick,
  onStartCooking,
  onAddDinner,
  onRandomFill,
  onUnskipDay,
  onPlanWeek,
  randomizingDay,
}: {
  dayInfo: DayInfo
  dayMeals: DayMeals | undefined
  mealPlanMode: MealPlanMode
  getRecipeById: (id: string) => Recipe | undefined
  isSlotCompleted: WeekMenuViewProps['isSlotCompleted']
  onRecipeClick: (recipeId: string) => void
  onStartCooking: (recipe: Recipe) => void
  onAddDinner: (day: DayOfWeek) => void
  onRandomFill: (day: DayOfWeek) => void
  onUnskipDay: (day: DayOfWeek) => void
  onPlanWeek: () => void
  randomizingDay?: DayOfWeek | null
}) {
  const isSkipped = dayMeals?.skipped === true
  const primaryRecipe = getPrimaryRecipe(dayMeals, mealPlanMode, getRecipeById)
  const allMeals = getMealsForDay(dayMeals, mealPlanMode, getRecipeById)
  const secondaryMeals = allMeals.filter((m) => m.recipe.id !== primaryRecipe?.id)
  const dinnerCompleted = isSlotCompleted(dayInfo.dayKey, 'dinner')
  const imageUrl = primaryRecipe ? resolveRecipeImageUrl(primaryRecipe.image_url) : undefined
  const totalTime = primaryRecipe ? (primaryRecipe.prep_time ?? 0) + (primaryRecipe.cook_time ?? 0) : 0

  if (isSkipped) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border/30 bg-muted/20 p-6">
        <SkipForward className="size-8 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {format(dayInfo.date, 'EEEE')} skipped
          </p>
          {dayMeals?.skip_note && (
            <p className="mt-1 text-xs text-muted-foreground/60">{dayMeals.skip_note}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onUnskipDay(dayInfo.dayKey)}
        >
          <Undo2 className="size-3" />
          Unskip
        </Button>
      </div>
    )
  }

  if (!primaryRecipe) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/40 bg-muted/10 p-6">
        <div className="rounded-full bg-muted/40 p-3">
          <UtensilsCrossed className="size-6 text-muted-foreground/30" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground/70">
            No recipe for {format(dayInfo.date, 'EEEE')}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/40">Plan something delicious</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onAddDinner(dayInfo.dayKey)}
          >
            <Plus className="size-3" />
            Pick recipe
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onRandomFill(dayInfo.dayKey)}
            disabled={!!randomizingDay}
          >
            <Dices className={cn('size-3', randomizingDay === dayInfo.dayKey && 'animate-spin')} />
            Surprise me
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" onClick={onPlanWeek}>
                <Wand2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Plan my week</TooltipContent>
          </Tooltip>
        </div>
      </div>
    )
  }

  return (
    <div className="group/hero relative flex h-full flex-col overflow-hidden rounded-lg border border-border/30">
      {/* Image area */}
      <div
        className="relative flex-1 min-h-0 cursor-pointer overflow-hidden"
        onClick={() => onRecipeClick(primaryRecipe.id)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={primaryRecipe.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={primaryRecipe.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/hero:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/80 to-muted/40">
                <ChefHat className="size-12 text-muted-foreground/20" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Completed overlay */}
        {dinnerCompleted && (
          <div className="absolute inset-0 bg-accent-sage/10">
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-accent-sage/90 px-2.5 py-1 text-white shadow-lg">
              <Check className="size-3.5" />
              <span className="text-xs font-semibold">Cooked</span>
            </div>
          </div>
        )}

        {/* Day label */}
        <div className="absolute left-3 top-3">
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm',
            dayInfo.isToday
              ? 'bg-primary/80 text-primary-foreground'
              : 'bg-black/40 text-white/90',
          )}>
            {dayInfo.isToday ? 'Today' : format(dayInfo.date, 'EEE')} {format(dayInfo.date, 'd')}
          </span>
        </div>

        {/* Bottom content over image */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={primaryRecipe.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-base font-bold text-white leading-tight line-clamp-2">
                {primaryRecipe.name}
              </h3>
              {primaryRecipe.description && (
                <p className="mt-1 text-xs text-white/70 line-clamp-2 leading-relaxed">
                  {primaryRecipe.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {totalTime > 0 && (
                  <Badge className="bg-white/15 text-white backdrop-blur-sm border-0 text-[10px] h-5 px-1.5">
                    <Clock className="size-2.5 mr-0.5" />
                    {totalTime}m
                  </Badge>
                )}
                {primaryRecipe.difficulty && (
                  <Badge className="bg-white/15 text-white backdrop-blur-sm border-0 text-[10px] h-5 px-1.5 capitalize">
                    {primaryRecipe.difficulty}
                  </Badge>
                )}
                <HeroNutritionRow recipe={primaryRecipe} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Secondary meals in all-meals mode */}
      {mealPlanMode === 'all-meals' && secondaryMeals.length > 0 && (
        <div className="border-t border-border/30 bg-card/80 px-2.5 py-1.5 space-y-1">
          {secondaryMeals.map(({ mealType, recipe }) => (
            <button
              key={mealType}
              onClick={() => onRecipeClick(recipe.id)}
              className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 w-3">
                {MEAL_TYPE_SHORT[mealType]}
              </span>
              <RecipeThumb src={recipe.image_url} name={recipe.name} size={16} />
              <span className="text-[11px] font-medium truncate min-w-0">{recipe.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-t border-border/30 bg-card px-2.5 py-2">
        <Button
          size="sm"
          className="h-7 gap-1.5 flex-1 text-xs"
          onClick={() => onStartCooking(primaryRecipe)}
        >
          <Play className="size-3" />
          Start Cooking
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => onRecipeClick(primaryRecipe.id)}
            >
              <ChefHat className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View recipe</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

function HeroNutritionRow({ recipe }: { recipe: Recipe }) {
  const cal = recipe.calories_per_serving
  const protein = recipe.protein_g
  if (!cal && !protein) return null
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-white/80">
      {cal != null && (
        <span className="flex items-center gap-0.5">
          <Flame className="size-2.5" />
          {Math.round(cal)}
        </span>
      )}
      {protein != null && <span>P {Math.round(protein)}g</span>}
    </div>
  )
}

function RecipeThumb({ src, name, size = 14 }: { src?: string; name: string; size?: number }) {
  const resolved = resolveRecipeImageUrl(src)
  if (resolved) {
    return (
      <img
        src={resolved}
        alt={name}
        className="rounded object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return <UtensilsCrossed className="text-muted-foreground/30 shrink-0" style={{ width: size * 0.75, height: size * 0.75 }} />
}

// ── Week Day Row (compact) ──

function WeekDayRow({
  dayInfo,
  dayMeals,
  mealPlanMode,
  getRecipeById,
  isSlotCompleted,
  onSelectDay,
  onRecipeClick,
  onMarkCooked,
  onRemoveMeal,
  onAddToShopping,
  onRandomFill,
  onSkipDay,
  onUnskipDay,
  onAddDinner,
  randomizingDay,
}: {
  dayInfo: DayInfo
  dayMeals: DayMeals | undefined
  mealPlanMode: MealPlanMode
  getRecipeById: (id: string) => Recipe | undefined
  isSlotCompleted: WeekMenuViewProps['isSlotCompleted']
  onSelectDay: (date: Date, direction: 'forward' | 'backward') => void
  onRecipeClick: (recipeId: string) => void
  onMarkCooked: WeekMenuViewProps['onMarkCooked']
  onRemoveMeal: WeekMenuViewProps['onRemoveMeal']
  onAddToShopping: WeekMenuViewProps['onAddToShopping']
  onRandomFill: (day: DayOfWeek) => void
  onSkipDay: (day: DayOfWeek) => void
  onUnskipDay: (day: DayOfWeek) => void
  onAddDinner: (day: DayOfWeek) => void
  randomizingDay?: DayOfWeek | null
}) {
  const isSkipped = dayMeals?.skipped === true
  const meals = getMealsForDay(dayMeals, mealPlanMode, getRecipeById)
  const primaryRecipe = getPrimaryRecipe(dayMeals, mealPlanMode, getRecipeById)
  const dinnerCompleted = primaryRecipe ? isSlotCompleted(dayInfo.dayKey, 'dinner') : undefined
  const totalTime = primaryRecipe ? (primaryRecipe.prep_time ?? 0) + (primaryRecipe.cook_time ?? 0) : 0
  const imageUrl = primaryRecipe ? resolveRecipeImageUrl(primaryRecipe.image_url) : undefined
  const isRandomizing = randomizingDay === dayInfo.dayKey

  return (
    <motion.div
      onClick={() => {
        const dir = dayInfo.date > new Date() ? 'forward' : 'backward'
        onSelectDay(dayInfo.date, dir)
      }}
      className={cn(
        'group/row relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer transition-all',
        dayInfo.isSelected
          ? 'bg-primary/[0.06] ring-1 ring-primary/20'
          : 'hover:bg-muted/50',
        dayInfo.isPast && !dayInfo.isSelected && 'opacity-60',
        dinnerCompleted && 'border-l-2 border-l-accent-sage',
      )}
      whileTap={{ scale: 0.99 }}
    >
      {/* Day label */}
      <div className="flex flex-col items-center w-9 shrink-0">
        <span className={cn(
          'text-[10px] font-medium uppercase tracking-wide leading-none',
          dayInfo.isToday ? 'text-primary' : 'text-muted-foreground/60'
        )}>
          {format(dayInfo.date, 'EEE')}
        </span>
        <span className={cn(
          'text-sm font-bold tabular-nums leading-tight',
          dayInfo.isToday ? 'text-primary' : dayInfo.isSelected ? 'text-foreground' : 'text-foreground/70'
        )}>
          {format(dayInfo.date, 'd')}
        </span>
        {dayInfo.isToday && (
          <div className="mt-0.5 size-1 rounded-full bg-primary" />
        )}
      </div>

      {/* Content */}
      {isSkipped ? (
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-xs text-muted-foreground/50 italic">Skipped</span>
          {dayMeals?.skip_note && (
            <span className="text-[10px] text-muted-foreground/30 truncate">{dayMeals.skip_note}</span>
          )}
        </div>
      ) : primaryRecipe ? (
        <button
          type="button"
          className="flex-1 min-w-0 flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onRecipeClick(primaryRecipe.id) }}
        >
          {/* Thumbnail */}
          <div className="relative size-11 shrink-0 overflow-hidden rounded-md">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-muted/40 flex items-center justify-center">
                <ChefHat className="size-4 text-muted-foreground/20" />
              </div>
            )}
            {dinnerCompleted && (
              <div className="absolute inset-0 bg-accent-sage/20 flex items-center justify-center">
                <Check className="size-4 text-accent-sage" />
              </div>
            )}
          </div>

          {/* Recipe info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold truncate min-w-0 leading-tight">
                {primaryRecipe.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {totalTime > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                  <Clock className="size-2.5" />
                  {totalTime}m
                </span>
              )}
              {primaryRecipe.difficulty && (
                <Badge
                  variant="outline"
                  className={cn('text-[8px] h-3.5 px-1 font-medium', DIFFICULTY_COLORS[primaryRecipe.difficulty])}
                >
                  {primaryRecipe.difficulty}
                </Badge>
              )}
              {mealPlanMode === 'all-meals' && meals.length > 1 && (
                <span className="text-[9px] text-muted-foreground/40">
                  +{meals.length - 1} more
                </span>
              )}
            </div>
          </div>
        </button>
      ) : (
        <div className="flex-1 min-w-0 flex items-center">
          <span className="text-xs text-muted-foreground/40">No dinner</span>
        </div>
      )}

      {/* Action buttons (always visible on right) */}
      <div
        className="flex items-center gap-0.5 shrink-0 ml-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isSkipped ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onUnskipDay(dayInfo.dayKey)}
                className="rounded p-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
              >
                <Undo2 className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Unskip</TooltipContent>
          </Tooltip>
        ) : primaryRecipe ? (
          <>
            {!dinnerCompleted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onMarkCooked(dayInfo.dayKey, 'dinner', primaryRecipe.id)}
                    className="rounded p-1 text-muted-foreground/40 hover:text-accent-sage hover:bg-accent-sage/10 transition-colors"
                  >
                    <Check className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Mark cooked</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onAddToShopping(primaryRecipe.id)}
                  className="rounded p-1 text-muted-foreground/40 hover:text-accent-gold hover:bg-accent-gold/10 transition-colors"
                >
                  <ShoppingCart className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Add to list</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRandomFill(dayInfo.dayKey)}
                  disabled={!!randomizingDay}
                  className={cn(
                    'rounded p-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors',
                    isRandomizing && 'animate-pulse',
                  )}
                >
                  <Dices className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Randomize</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSkipDay(dayInfo.dayKey)}
                  className="rounded p-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <SkipForward className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Skip day</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRemoveMeal(dayInfo.dayKey, 'dinner')}
                  className="rounded p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Remove</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onAddDinner(dayInfo.dayKey)}
                  className="rounded p-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Add dinner</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRandomFill(dayInfo.dayKey)}
                  disabled={!!randomizingDay}
                  className={cn(
                    'rounded p-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors',
                    isRandomizing && 'animate-pulse',
                  )}
                >
                  <Dices className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Randomize</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSkipDay(dayInfo.dayKey)}
                  className="rounded p-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <SkipForward className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Skip day</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ── Empty Week State ──

function EmptyWeekState({ onPlanWeek }: { onPlanWeek: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="rounded-full bg-muted/30 p-5">
        <UtensilsCrossed className="size-10 text-muted-foreground/20" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-muted-foreground/70">No meal plan this week</p>
        <p className="mt-1 text-xs text-muted-foreground/40">
          Set up your weekly menu to see recipes here
        </p>
      </div>
      <Button onClick={onPlanWeek} className="gap-2">
        <Wand2 className="size-4" />
        Plan My Week
      </Button>
    </div>
  )
}

// ── Compact single-column view (when sidebar is open) ──

function CompactWeekList({
  dayInfos,
  mealPlan,
  mealPlanMode,
  getRecipeById,
  selectedDate,
  isSlotCompleted,
  onSelectDay,
  onRecipeClick,
  onMarkCooked,
  onRemoveMeal,
  onAddToShopping,
  onRandomFill,
  onSkipDay,
  onUnskipDay,
  onAddDinner,
  onStartCooking,
  onPlanWeek,
  randomizingDay,
}: WeekMenuViewProps & { dayInfos: DayInfo[] }) {
  const hasAnyMeals = dayInfos.some((d) => {
    const dm = mealPlan?.meals[d.dayKey]
    return dm && !dm.skipped && getPrimaryRecipe(dm, mealPlanMode, getRecipeById)
  })

  if (!mealPlan || !hasAnyMeals) {
    return <EmptyWeekState onPlanWeek={onPlanWeek} />
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {dayInfos.map((dayInfo) => {
          const dayMeals = mealPlan?.meals[dayInfo.dayKey]
          const primaryRecipe = getPrimaryRecipe(dayMeals, mealPlanMode, getRecipeById)
          const isSelected = dayInfo.isSelected

          return (
            <div key={dayInfo.dayKey}>
              <WeekDayRow
                dayInfo={dayInfo}
                dayMeals={dayMeals}
                mealPlanMode={mealPlanMode}
                getRecipeById={getRecipeById}
                isSlotCompleted={isSlotCompleted}
                onSelectDay={onSelectDay}
                onRecipeClick={onRecipeClick}
                onMarkCooked={onMarkCooked}
                onRemoveMeal={onRemoveMeal}
                onAddToShopping={onAddToShopping}
                onRandomFill={onRandomFill}
                onSkipDay={onSkipDay}
                onUnskipDay={onUnskipDay}
                onAddDinner={onAddDinner}
                randomizingDay={randomizingDay}
              />
              {/* Expanded detail for selected day */}
              {isSelected && primaryRecipe && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden ml-11 pl-2.5 border-l-2 border-primary/20"
                >
                  <div className="py-2 space-y-1.5">
                    {primaryRecipe.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{primaryRecipe.description}</p>
                    )}
                    <Button
                      size="sm"
                      className="h-6 gap-1 text-[10px] px-2"
                      onClick={(e) => { e.stopPropagation(); onStartCooking(primaryRecipe) }}
                    >
                      <Play className="size-2.5" />
                      Cook
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// ── Main Export ──

export function WeekMenuView(props: WeekMenuViewProps) {
  const {
    mealPlan,
    getRecipeById,
    mealPlanMode,
    selectedDate,
    sidebarOpen,
    onSelectDay,
    onRecipeClick,
    onMarkCooked,
    onRemoveMeal,
    onAddToShopping,
    onRandomFill,
    onSkipDay,
    onUnskipDay,
    onStartCooking,
    onAddDinner,
    onPlanWeek,
    isSlotCompleted,
    randomizingDay,
  } = props

  const dayInfos = useDayInfos(selectedDate)

  const enrichedDayInfos = useMemo(
    () =>
      dayInfos.map((d) => ({
        ...d,
        dayMeals: mealPlan?.meals[d.dayKey],
        isSkipped: mealPlan?.meals[d.dayKey]?.skipped === true,
      })),
    [dayInfos, mealPlan]
  )

  const plannedCount = enrichedDayInfos.filter(
    (d) => !d.isSkipped && getPrimaryRecipe(d.dayMeals, mealPlanMode, getRecipeById)
  ).length

  const hasAnyMeals = plannedCount > 0

  if (sidebarOpen) {
    return (
      <CompactWeekList
        {...props}
        dayInfos={enrichedDayInfos}
      />
    )
  }

  if (!mealPlan || !hasAnyMeals) {
    return <EmptyWeekState onPlanWeek={onPlanWeek} />
  }

  const selectedDayInfo = enrichedDayInfos.find((d) => d.isSelected) ?? enrichedDayInfos[0]!
  const selectedDayMeals = mealPlan?.meals[selectedDayInfo.dayKey]

  return (
    <div className="flex gap-0">
      {/* Hero card - left */}
      <div className="w-[38%] shrink-0 p-2">
        <HeroRecipeCard
          dayInfo={selectedDayInfo}
          dayMeals={selectedDayMeals}
          mealPlanMode={mealPlanMode}
          getRecipeById={getRecipeById}
          isSlotCompleted={isSlotCompleted}
          onRecipeClick={onRecipeClick}
          onStartCooking={onStartCooking}
          onAddDinner={onAddDinner}
          onRandomFill={onRandomFill}
          onUnskipDay={onUnskipDay}
          onPlanWeek={onPlanWeek}
          randomizingDay={randomizingDay}
        />
      </div>

      {/* Day list - right */}
      <div className="flex-1 min-w-0 border-l border-border/30">
        <div className="space-y-0.5 p-2">
            {/* Week progress */}
            <div className="flex items-center justify-between px-2.5 pb-1.5 mb-1">
              <span className="text-[11px] font-medium text-muted-foreground/60">This Week</span>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {enrichedDayInfos.map((d) => {
                    const hasRecipe = !d.isSkipped && getPrimaryRecipe(d.dayMeals, mealPlanMode, getRecipeById)
                    const completed = hasRecipe && isSlotCompleted(d.dayKey, 'dinner')
                    return (
                      <div
                        key={d.dayKey}
                        className={cn(
                          'size-1.5 rounded-full transition-colors',
                          completed
                            ? 'bg-accent-sage'
                            : hasRecipe
                              ? 'bg-primary/40'
                              : d.isSkipped
                                ? 'bg-muted-foreground/15'
                                : 'bg-muted-foreground/10',
                        )}
                      />
                    )
                  })}
                </div>
                <span className="text-[10px] text-muted-foreground/40 tabular-nums">{plannedCount}/7</span>
              </div>
            </div>

            {enrichedDayInfos.map((dayInfo) => (
              <WeekDayRow
                key={dayInfo.dayKey}
                dayInfo={dayInfo}
                dayMeals={dayInfo.dayMeals}
                mealPlanMode={mealPlanMode}
                getRecipeById={getRecipeById}
                isSlotCompleted={isSlotCompleted}
                onSelectDay={onSelectDay}
                onRecipeClick={onRecipeClick}
                onMarkCooked={onMarkCooked}
                onRemoveMeal={onRemoveMeal}
                onAddToShopping={onAddToShopping}
                onRandomFill={onRandomFill}
                onSkipDay={onSkipDay}
                onUnskipDay={onUnskipDay}
                onAddDinner={onAddDinner}
                randomizingDay={randomizingDay}
              />
            ))}
          </div>
        </div>
      </div>
  )
}
