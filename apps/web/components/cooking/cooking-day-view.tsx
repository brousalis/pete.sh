'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { apiGet } from '@/lib/api/client'
import type {
  DayMeals,
  DayOfWeek,
  MealPlan,
  MealPlanMode,
  Recipe,
  RecipeStep,
  RecipeWithIngredients,
} from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { format, isSameDay } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Beef,
  Check,
  ChefHat,
  ChevronDown,
  Circle,
  Clock,
  Dices,
  Flame,
  MessageSquareText,
  Play,
  Plus,
  SkipForward,
  Undo2,
  UtensilsCrossed,
  Wand2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const DATE_TO_DAY: Record<number, DayOfWeek> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
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

function getSecondaryMeals(
  dayMeals: DayMeals | undefined,
  primaryId: string | undefined,
  mealPlanMode: MealPlanMode,
  getRecipeById: (id: string) => Recipe | undefined
): { mealType: string; recipe: Recipe }[] {
  if (!dayMeals || mealPlanMode === 'dinner-only') return []
  const results: { mealType: string; recipe: Recipe }[] = []
  for (const mt of MEAL_TYPES) {
    const id = dayMeals[mt as keyof DayMeals]
    if (id && typeof id === 'string' && id !== primaryId) {
      const recipe = getRecipeById(id)
      if (recipe) results.push({ mealType: mt, recipe })
    }
  }
  return results
}

function parseInstructions(instructions: unknown): RecipeStep[] {
  if (!instructions) return []
  if (Array.isArray(instructions)) return instructions as RecipeStep[]
  if (typeof instructions === 'string') {
    try {
      return JSON.parse(instructions) as RecipeStep[]
    } catch {
      return []
    }
  }
  return []
}

interface CookingDayViewProps {
  selectedDate: Date
  mealPlan: MealPlan | null
  getRecipeById: (id: string) => Recipe | undefined
  mealPlanMode: MealPlanMode
  isSlotCompleted: (day: DayOfWeek, meal: string) => { id: string } | undefined
  onRecipeClick: (recipeId: string) => void
  onStartCooking: (recipe: Recipe) => void
  onAddDinner: (day: DayOfWeek) => void
  onRandomFill: (day: DayOfWeek) => void
  onUnskipDay: (day: DayOfWeek) => void
  onPlanWeek: () => void
  onRecipeLoaded?: (recipe: RecipeWithIngredients | null) => void
  randomizingDay?: DayOfWeek | null
}

export function CookingDayView({
  selectedDate,
  mealPlan,
  getRecipeById,
  mealPlanMode,
  isSlotCompleted,
  onRecipeClick,
  onStartCooking,
  onAddDinner,
  onRandomFill,
  onUnskipDay,
  onPlanWeek,
  onRecipeLoaded,
  randomizingDay,
}: CookingDayViewProps) {
  const dayKey = DATE_TO_DAY[selectedDate.getDay()]
  const dayMeals = dayKey ? mealPlan?.meals[dayKey] : undefined
  const isSkipped = dayMeals?.skipped === true
  const isToday = isSameDay(selectedDate, new Date())

  const primaryRecipe = useMemo(
    () => getPrimaryRecipe(dayMeals, mealPlanMode, getRecipeById),
    [dayMeals, mealPlanMode, getRecipeById]
  )

  const secondaryMeals = useMemo(
    () => getSecondaryMeals(dayMeals, primaryRecipe?.id, mealPlanMode, getRecipeById),
    [dayMeals, primaryRecipe?.id, mealPlanMode, getRecipeById]
  )

  const [fullRecipe, setFullRecipe] = useState<RecipeWithIngredients | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchRecipe = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await apiGet<RecipeWithIngredients>(`/api/cooking/recipes/${id}`)
      if (res.success && res.data) {
        setFullRecipe(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch recipe for day view:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (primaryRecipe?.id) {
      fetchRecipe(primaryRecipe.id)
    } else {
      setFullRecipe(null)
    }
  }, [primaryRecipe?.id, fetchRecipe])

  useEffect(() => {
    onRecipeLoaded?.(fullRecipe)
  }, [fullRecipe, onRecipeLoaded])

  const dinnerCompleted = dayKey ? isSlotCompleted(dayKey, 'dinner') : undefined
  const imageUrl = primaryRecipe ? resolveRecipeImageUrl(primaryRecipe.image_url) : undefined
  const totalTime = primaryRecipe ? (primaryRecipe.prep_time ?? 0) + (primaryRecipe.cook_time ?? 0) : 0
  const dayLabel = isToday ? 'Today' : format(selectedDate, 'EEEE')

  const steps = useMemo(
    () => parseInstructions(fullRecipe?.instructions),
    [fullRecipe?.instructions]
  )

  if (!dayKey) return null

  if (isSkipped) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <SkipForward className="size-10 text-muted-foreground/20" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {dayLabel} skipped
          </p>
          {dayMeals?.skip_note && (
            <p className="mt-1 text-xs text-muted-foreground/60">{dayMeals.skip_note}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onUnskipDay(dayKey)}
        >
          <Undo2 className="size-3" />
          Unskip
        </Button>
      </div>
    )
  }

  if (!primaryRecipe) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="rounded-full bg-muted/40 p-4">
          <UtensilsCrossed className="size-8 text-muted-foreground/25" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground/70">
            No recipe for {dayLabel}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/40">Plan something delicious</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onAddDinner(dayKey)}
          >
            <Plus className="size-3" />
            Pick recipe
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onRandomFill(dayKey)}
            disabled={!!randomizingDay}
          >
            <Dices className={cn('size-3', randomizingDay === dayKey && 'animate-spin')} />
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
    <div className="flex h-full min-h-0">
      {/* Left column: Hero image + actions (desktop) */}
      <div className="flex w-[38%] shrink-0 flex-col border-r border-border/30 max-lg:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={primaryRecipe.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative flex-1 min-h-0 overflow-hidden"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={primaryRecipe.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/80 to-muted/40">
                <ChefHat className="size-14 text-muted-foreground/15" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />

            {dinnerCompleted && (
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-accent-sage/90 px-2.5 py-1 text-white shadow-lg">
                <Check className="size-3.5" />
                <span className="text-xs font-semibold">Cooked</span>
              </div>
            )}

            <div className="absolute left-3 top-3">
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm',
                isToday
                  ? 'bg-primary/80 text-primary-foreground'
                  : 'bg-black/40 text-white/90',
              )}>
                {dayLabel} {format(selectedDate, 'd')}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4">
              <motion.div
                key={primaryRecipe.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">
                  {primaryRecipe.name}
                </h3>
                {primaryRecipe.description && (
                  <p className="mt-1.5 text-xs text-white/70 line-clamp-2 leading-relaxed">
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
                  {primaryRecipe.calories_per_serving != null && (
                    <span className="flex items-center gap-0.5 text-[10px] text-white/80">
                      <Flame className="size-2.5" />
                      {Math.round(primaryRecipe.calories_per_serving)}
                    </span>
                  )}
                  {primaryRecipe.protein_g != null && (
                    <span className="text-[10px] text-white/80 flex items-center gap-0.5">
                      <Beef className="size-2.5" />
                      {Math.round(primaryRecipe.protein_g)}g
                    </span>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Secondary meals */}
        {secondaryMeals.length > 0 && (
          <div className="border-t border-border/30 bg-card/80 px-3 py-2 space-y-1">
            {secondaryMeals.map(({ mealType, recipe }) => {
              const thumb = resolveRecipeImageUrl(recipe.image_url)
              return (
                <button
                  key={mealType}
                  onClick={() => onRecipeClick(recipe.id)}
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 w-4">
                    {MEAL_TYPE_LABELS[mealType]?.[0]}
                  </span>
                  {thumb ? (
                    <img src={thumb} alt={recipe.name} className="size-4 rounded object-cover shrink-0" />
                  ) : (
                    <UtensilsCrossed className="size-3 text-muted-foreground/30 shrink-0" />
                  )}
                  <span className="text-[11px] font-medium truncate min-w-0">{recipe.name}</span>
                </button>
              )
            })}
          </div>
        )}

      </div>

      {/* Right column: Steps-focused content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile-only: compact header */}
        <div className="lg:hidden border-b border-border/30 p-3">
          <div className="flex items-center gap-3">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={primaryRecipe.name}
                className="size-16 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                  isToday
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {dayLabel}
                </span>
                {dinnerCompleted && (
                  <span className="text-[10px] font-semibold text-accent-sage flex items-center gap-0.5">
                    <Check className="size-3" /> Cooked
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold leading-tight line-clamp-1 mt-1">
                {primaryRecipe.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {totalTime > 0 && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="size-2.5" /> {totalTime}m
                  </span>
                )}
                {primaryRecipe.difficulty && (
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {primaryRecipe.difficulty}
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              className="h-8 gap-1 text-xs shrink-0"
              onClick={() => onStartCooking(primaryRecipe)}
            >
              <Play className="size-3" />
              Cook
            </Button>
          </div>
        </div>

        {/* Mobile-only: collapsible ingredients */}
        {fullRecipe && fullRecipe.ingredients.length > 0 && (
          <MobileIngredients recipe={fullRecipe} />
        )}

        {loading ? (
          <DayViewSkeleton />
        ) : fullRecipe && steps.length > 0 ? (
          <div className="p-4">
            {/* Steps header */}
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-[11px] font-medium text-muted-foreground">
                Preparation
              </h4>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                {steps.length} {steps.length === 1 ? 'step' : 'steps'}
              </span>
            </div>

            {/* Steps list with connecting line */}
            <ol className="relative">
              {/* Connecting line */}
              {steps.length > 1 && (
                <div className="absolute left-[13px] top-[28px] bottom-[28px] w-px bg-border/60" />
              )}
              {steps.map((step, index) => (
                <li
                  key={index}
                  className={cn(
                    'relative flex gap-3.5',
                    index < steps.length - 1 ? 'pb-5' : ''
                  )}
                >
                  <div className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-primary/60 bg-card text-xs font-semibold text-primary">
                    {step.step_number}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm leading-relaxed">{step.instruction}</p>
                    {step.duration && (
                      <Badge variant="outline" className="mt-1.5 text-[10px] gap-1 border-border/50 text-muted-foreground">
                        <Clock className="size-2.5" />~{step.duration} min
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {/* Notes callout */}
            {fullRecipe.notes && (
              <div className="mt-6 rounded-lg border-l-2 border-accent-sage/30 bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquareText className="size-3 text-muted-foreground/40" />
                  <span className="text-[10px] font-medium text-muted-foreground/50">
                    Notes
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {fullRecipe.notes}
                </p>
              </div>
            )}
          </div>
        ) : fullRecipe ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <UtensilsCrossed className="size-8 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground/50">No instructions yet</p>

            {fullRecipe.notes && (
              <div className="mt-6 w-full rounded-lg border-l-2 border-accent-sage/30 bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquareText className="size-3 text-muted-foreground/40" />
                  <span className="text-[10px] font-medium text-muted-foreground/50">
                    Notes
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {fullRecipe.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <DayViewSkeleton />
        )}
      </div>
    </div>
  )
}

function MobileIngredients({ recipe }: { recipe: RecipeWithIngredients }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="lg:hidden border-b border-border/30">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors"
      >
        <span className="text-xs font-medium text-muted-foreground">
          Ingredients ({recipe.ingredients.length})
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground/50 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {recipe.ingredients.map((ingredient) => (
            <div
              key={ingredient.id}
              className="flex items-center gap-2 py-0.5"
            >
              <Circle className="size-3.5 text-muted-foreground/30 shrink-0" />
              <span className="text-[11px] font-medium">{ingredient.name}</span>
              {(ingredient.amount || ingredient.unit) && (
                <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">
                  {ingredient.amount ? `${ingredient.amount} ` : ''}{ingredient.unit}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DayViewSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
