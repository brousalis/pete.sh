'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useReducedMotionPreference } from '@/hooks/use-animation'
import { useCooking } from '@/hooks/use-cooking-data'
import { useToast } from '@/hooks/use-toast'
import { apiGet } from '@/lib/api/client'
import type {
  DayOfWeek,
  Recipe,
  RecipeIngredient,
  RecipeStep,
  RecipeWithIngredients,
} from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import {
  getEligibleDinnerRecipes,
  type MealPlanDiscoveryFilters,
} from '@/lib/utils/meal-plan-discovery'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { addDays, format } from 'date-fns'
import useEmblaCarousel from 'embla-carousel-react'
import { Check, ChefHat, Clock, Dices, ListOrdered, Star, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10)
  }
}

export interface MealPlanSwipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MealPlanSwipeDialog({ open, onOpenChange }: MealPlanSwipeDialogProps) {
  const {
    recipes,
    recipesLoading,
    mealPlan,
    currentWeek,
    updateMealPlanBulk,
    refreshMealPlan,
  } = useCooking()
  const { toast } = useToast()
  const reducedMotion = useReducedMotionPreference()

  const [targetDay, setTargetDay] = useState<DayOfWeek | 'next-empty'>('next-empty')
  const [candidates, setCandidates] = useState<Recipe[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [assignments, setAssignments] = useState<Partial<Record<DayOfWeek, string>>>({})
  const [pendingClose, setPendingClose] = useState(false)
  const [showSwipeHint, setShowSwipeHint] = useState(true)
  const [quickFilter, setQuickFilter] = useState(false)

  const emptyDays = useMemo(() => {
    return DAYS.filter((day) => {
      const dm = mealPlan?.meals[day]
      if (dm?.skipped) return false
      if (dm?.dinner || assignments[day]) return false
      return true
    })
  }, [mealPlan?.meals, assignments])

  const targetDaysForMode = useMemo(() => {
    if (targetDay === 'next-empty') return emptyDays
    return [targetDay]
  }, [targetDay, emptyDays])

  const effectiveTargetDay = useMemo(() => {
    const filledCount = Object.keys(assignments).length
    if (targetDay === 'next-empty') {
      return emptyDays[filledCount] ?? null
    }
    return targetDay
  }, [targetDay, assignments, emptyDays])

  const filters: MealPlanDiscoveryFilters = useMemo(
    () => ({
      maxPrepTime: quickFilter ? 30 : null,
    }),
    [quickFilter]
  )

  const recomputeCandidates = useCallback(() => {
    const eligible = getEligibleDinnerRecipes(recipes, filters)
    setCandidates(eligible)
    setCurrentIndex(0)
  }, [recipes, filters])

  useEffect(() => {
    if (open && recipes.length > 0) {
      recomputeCandidates()
    }
  }, [open, recipes, recomputeCandidates])

  useEffect(() => {
    if (!open) {
      setAssignments({})
      setCurrentIndex(0)
      setPendingClose(false)
    }
  }, [open])

  const hasAssignments = Object.keys(assignments).length > 0
  const isDirty = hasAssignments

  const handleClose = useCallback(() => {
    if (isDirty && !pendingClose) {
      setPendingClose(true)
    } else {
      onOpenChange(false)
    }
  }, [isDirty, pendingClose, onOpenChange])

  const handleConfirmClose = useCallback(async (action: 'save' | 'discard') => {
    setPendingClose(false)
    if (action === 'save' && hasAssignments) {
      const updates: Partial<Record<DayOfWeek, { dinner: string }>> = {}
      for (const [day, recipeId] of Object.entries(assignments)) {
        if (recipeId) updates[day as DayOfWeek] = { dinner: recipeId }
      }
      await updateMealPlanBulk(updates)
      await refreshMealPlan()
      toast({ title: `${Object.keys(assignments).length} meals added to your plan` })
    }
    onOpenChange(false)
  }, [assignments, hasAssignments, updateMealPlanBulk, refreshMealPlan, toast, onOpenChange])

  const applyAndClose = useCallback(async () => {
    if (hasAssignments) {
      const updates: Partial<Record<DayOfWeek, { dinner: string }>> = {}
      for (const [day, recipeId] of Object.entries(assignments)) {
        if (recipeId) updates[day as DayOfWeek] = { dinner: recipeId }
      }
      await updateMealPlanBulk(updates)
      await refreshMealPlan()
      toast({ title: `${Object.keys(assignments).length} meals added to your plan` })
    }
    onOpenChange(false)
  }, [assignments, hasAssignments, updateMealPlanBulk, refreshMealPlan, toast, onOpenChange])

  const handleLike = useCallback(() => {
    if (effectiveTargetDay && currentIndex < candidates.length) {
      const recipe = candidates[currentIndex]!
      triggerHaptic()
      setAssignments((prev) => ({ ...prev, [effectiveTargetDay]: recipe.id }))
      setCurrentIndex((i) => i + 1)
      setShowSwipeHint(false)
    }
  }, [effectiveTargetDay, currentIndex, candidates])

  const handlePass = useCallback(() => {
    if (currentIndex < candidates.length) {
      triggerHaptic()
      setCurrentIndex((i) => i + 1)
      setShowSwipeHint(false)
    }
  }, [currentIndex, candidates])

  const handleReshuffle = useCallback(() => {
    const assignedIds = new Set(Object.values(assignments).filter(Boolean))
    const eligible = getEligibleDinnerRecipes(recipes, filters).filter(
      (r) => !assignedIds.has(r.id)
    )
    setCandidates(eligible)
    setCurrentIndex(0)
  }, [recipes, filters, assignments])

  const currentRecipe = candidates[currentIndex]
  const hasMoreCards = currentIndex < candidates.length
  const allTargetDaysFilled =
    targetDaysForMode.length > 0 &&
    targetDaysForMode.every((d) => assignments[d])
  const exhaustedWithUnfilled =
    !hasMoreCards && targetDaysForMode.some((d) => !assignments[d])

  const zeroRecipes = recipes.length === 0 && !recipesLoading
  const zeroEligible =
    !zeroRecipes && candidates.length === 0 && !recipesLoading
  const allFilled =
    targetDay === 'next-empty' && emptyDays.length === 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className={cn(
          'fixed inset-0 top-0 left-0 right-0 bottom-0 z-50 h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 p-0 border-0 gap-0 overflow-hidden rounded-none bg-background',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
        )}
        style={{ display: 'flex', flexDirection: 'column' }}
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Swipe to plan meals</DialogTitle>
        </VisuallyHidden>

        <div className="flex flex-1 min-h-0 flex-col">
          {/* Header */}
          <div className="shrink-0 border-b border-border/40 bg-card/50 px-4 pt-4 pb-3 safe-area-inset-top">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/15">
                  <Dices className="size-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold leading-tight">Swipe to plan</h2>
                  <p className="text-xs text-muted-foreground">
                    {effectiveTargetDay
                      ? `Picking for ${format(addDays(currentWeek, DAYS.indexOf(effectiveTargetDay)), 'EEEE')}`
                      : allTargetDaysFilled
                        ? 'All done!'
                        : `${Object.keys(assignments).length} planned`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 rounded-full"
                onClick={handleClose}
                aria-label="Close"
              >
                <X className="size-5" />
              </Button>
            </div>

            {/* Day picker + Quick filter — all visible, no scroll */}
            <div className="mt-3 space-y-2">
              {/* Row 1: Mode + filter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTargetDay('next-empty')}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    targetDay === 'next-empty'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  Next empty
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFilter((v) => !v)}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    quickFilter ? 'bg-amber-500/15 text-amber-600' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  Quick &lt;30m
                </button>
              </div>
              {/* Row 2: All 7 days in a compact grid */}
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day) => {
                  const dayDate = addDays(currentWeek, DAYS.indexOf(day))
                  const isFilled = assignments[day] || mealPlan?.meals[day]?.dinner
                  const isSkipped = mealPlan?.meals[day]?.skipped
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => (isSkipped ? undefined : setTargetDay(day))}
                      disabled={isSkipped}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg py-2 min-w-0 text-[10px] transition-colors',
                        isSkipped
                          ? 'opacity-40 cursor-not-allowed bg-muted/30'
                          : targetDay === day
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : isFilled
                              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <span className="font-medium truncate w-full text-center">
                        {format(dayDate, 'EEE')}
                      </span>
                      <span className="tabular-nums">{format(dayDate, 'd')}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Body — scrollable when expanded cards overflow */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-4 overflow-y-auto">
            {pendingClose ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <p className="text-sm font-medium">Save {Object.keys(assignments).length} meals to your plan?</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPendingClose(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => handleConfirmClose('discard')}>
                    Discard
                  </Button>
                  <Button onClick={() => handleConfirmClose('save')}>Save</Button>
                </div>
              </div>
            ) : zeroRecipes ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <ChefHat className="size-16 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Add recipes first to swipe and plan.</p>
                <Button onClick={() => onOpenChange(false)}>Got it</Button>
              </div>
            ) : zeroEligible ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <ChefHat className="size-16 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No dinner recipes yet. Add more or adjust filters.</p>
                <Button onClick={() => onOpenChange(false)}>Got it</Button>
              </div>
            ) : allFilled ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="size-8 text-green-500" />
                </div>
                <p className="text-base font-semibold">Your week is fully planned!</p>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            ) : exhaustedWithUnfilled ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-base font-medium">That&apos;s all we have!</p>
                <p className="text-sm text-muted-foreground">
                  {targetDaysForMode.filter((d) => !assignments[d]).length} days still open.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleReshuffle}>
                    Reshuffle and continue
                  </Button>
                  <Button onClick={applyAndClose}>Done</Button>
                </div>
              </div>
            ) : allTargetDaysFilled ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="size-8 text-green-500" />
                </div>
                <p className="text-base font-semibold">All done for this round!</p>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(assignments).length} meals planned.
                </p>
                <div className="flex gap-3">
                  {emptyDays.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setTargetDay('next-empty')}
                    >
                      Plan more days
                    </Button>
                  )}
                  <Button onClick={applyAndClose}>Save and close</Button>
                </div>
              </div>
            ) : hasMoreCards ? (
              <SwipeCardStack
                candidates={candidates}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
                reducedMotion={reducedMotion}
                showHint={showSwipeHint}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">No more cards.</p>
                <Button onClick={applyAndClose}>Save and close</Button>
              </div>
            )}
          </div>

          {/* Footer - tap buttons + progress */}
          {hasMoreCards && !pendingClose && !zeroRecipes && !zeroEligible && !allFilled && !exhaustedWithUnfilled && !allTargetDaysFilled && (
            <div className="shrink-0 border-t border-border/40 px-4 py-3 safe-area-inset-bottom flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="icon"
                className="size-12 rounded-full border-2 border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500"
                onClick={handlePass}
                aria-label="Skip recipe"
              >
                <X className="size-6" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums min-w-[4rem] text-center">
                {Object.keys(assignments).length} / {targetDaysForMode.length || 7} planned
              </span>
              <Button
                variant="default"
                size="icon"
                className="size-12 rounded-full bg-green-500 hover:bg-green-600"
                onClick={handleLike}
                aria-label="Add recipe"
              >
                <Check className="size-6" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Helper to parse instructions from API (array or JSON string) */
function parseInstructions(instructions: unknown): RecipeStep[] {
  if (!instructions) return []
  if (Array.isArray(instructions)) return instructions as RecipeStep[]
  if (typeof instructions === 'string') {
    try { return JSON.parse(instructions) as RecipeStep[] } catch { return [] }
  }
  return []
}

/** Helper to format ingredient amount for display */
function formatIngredientAmount(amount?: number | null, unit?: string | null): string {
  if (amount == null && !unit) return ''
  if (amount != null && unit) return `${amount} ${unit}`
  if (amount != null) return String(amount)
  return unit ?? ''
}

interface SwipeCardStackProps {
  candidates: Recipe[]
  currentIndex: number
  onIndexChange: (index: number) => void
  reducedMotion: boolean
  showHint: boolean
}

function SwipeCardStack({
  candidates,
  currentIndex,
  onIndexChange,
  reducedMotion,
  showHint,
}: SwipeCardStackProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    align: 'center',
    containScroll: 'trimSnaps',
    dragFree: false,
    skipSnaps: false,
    loop: false,
    watchDrag: (_, evt) => {
      const target = evt?.target as HTMLElement | null
      if (!target) return true
      return !target.closest('[data-swipe-skip]')
    },
  })

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      onIndexChange(emblaApi.selectedScrollSnap())
    }
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onIndexChange])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.scrollTo(currentIndex, true)
  }, [emblaApi, currentIndex])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  return (
    <div
      className="relative w-full max-w-[340px] min-h-[420px] flex flex-col items-center"
      tabIndex={0}
      role="group"
      aria-label="Recipe cards - swipe or use arrows to browse, use buttons to add or skip"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          scrollPrev()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          scrollNext()
        }
      }}
    >
      {/* {showHint && (
        <p className="absolute top-2 left-0 right-0 text-center text-xs text-muted-foreground z-10">
          Swipe left for previous, right for next
        </p>
      )} */}

      <div ref={emblaRef} className="overflow-hidden w-full max-w-[320px] flex-1 cursor-grab active:cursor-grabbing">
        <div className="flex">
          {candidates.map((recipe, index) => (
            <div
              key={recipe.id}
              className="flex-[0_0_100%] min-w-0"
            >
              <SwipeCard
                recipe={recipe}
                isCurrent={index === currentIndex}
                reducedMotion={reducedMotion}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface SwipeCardProps {
  recipe: Recipe
  isCurrent: boolean
  reducedMotion: boolean
}

/** TJ/category tags to hide from display (show fun tags only) */
const HIDE_TAGS = new Set([
  'desserts', 'dessert', 'baking', 'quick bites', 'snacks', 'appetizers',
  'main dishes', 'dinners', 'breakfast', 'drinks', 'beverages',
])

function SwipeCard({
  recipe,
  isCurrent,
  reducedMotion,
}: SwipeCardProps) {
  const [fullRecipe, setFullRecipe] = useState<RecipeWithIngredients | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isCurrent) return
    setLoading(true)
    apiGet<RecipeWithIngredients>(`/api/cooking/recipes/${recipe.id}`)
      .then((res) => {
        if (res.success && res.data) setFullRecipe(res.data)
      })
      .finally(() => setLoading(false))
  }, [isCurrent, recipe.id])

  const instructions = useMemo(
    () => (fullRecipe ? parseInstructions(fullRecipe.instructions) : []),
    [fullRecipe]
  )
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const stepCount = (() => {
    const i = recipe.instructions
    if (Array.isArray(i)) return i.length
    if (typeof i === 'string') {
      try { return (JSON.parse(i) as unknown[]).length } catch { return 0 }
    }
    return 0
  })()
  const imageUrl = resolveRecipeImageUrl(recipe.image_url)

  const displayTags = (recipe.tags || [])
    .filter((t) => !HIDE_TAGS.has(t.toLowerCase()))
    .slice(0, 6)

  const nutritionHints = (recipe.nutrition_category || []).filter((c) =>
    ['high-protein', 'low-carb', 'low-calorie', 'high-fiber', 'balanced'].includes(c)
  ).slice(0, 3)

  const showFullContent = isCurrent
  const data = fullRecipe ?? recipe

  return (
    <div className="w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden shadow-xl border border-border/50 bg-card flex flex-col max-h-[70dvh]">
      {/* Image — fixed at top */}
      <div className="relative aspect-[4/3] w-full shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={recipe.name}
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/80 to-muted/40">
            <ChefHat className="size-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
          {recipe.source === 'trader_joes' && (
            <span className="rounded px-1.5 py-0.5 bg-red-600/90 text-[10px] font-semibold text-white">
              TJ&apos;s
            </span>
          )}
          {recipe.is_favorite && (
            <Star className="size-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
          )}
        </div>
      </div>

      {/* Scrollable content — everything at once */}
      <div
        data-swipe-skip
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3 space-y-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <h3 className="text-base font-bold leading-tight">{recipe.name}</h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {totalTime > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="size-3" />
              {totalTime} min
            </span>
          )}
          {recipe.servings != null && recipe.servings > 0 && (
            <span className="flex items-center gap-0.5">
              <Users className="size-3" />
              {recipe.servings} servings
            </span>
          )}
          {recipe.difficulty && (
            <span className="capitalize font-medium">{recipe.difficulty}</span>
          )}
          {stepCount > 0 && (
            <span className="flex items-center gap-0.5">
              <ListOrdered className="size-3" />
              {stepCount} steps
            </span>
          )}
        </div>

        {data.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {data.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {nutritionHints.map((hint) => (
            <span
              key={hint}
              className="rounded-md bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400"
            >
              {hint.replace(/-/g, ' ')}
            </span>
          ))}
          {recipe.calories_per_serving != null && recipe.calories_per_serving > 0 && (
            <span className="text-[10px] text-muted-foreground">
              ~{Math.round(recipe.calories_per_serving)} cal/serving
            </span>
          )}
        </div>

        {showFullContent && (
          <>
            {loading ? (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : fullRecipe ? (
              <>
                {fullRecipe.ingredients && fullRecipe.ingredients.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <h4 className="text-xs font-semibold mb-1.5">Ingredients</h4>
                    <ul className="space-y-1">
                      {fullRecipe.ingredients
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((ing: RecipeIngredient, idx: number) => (
                          <li key={ing.id || idx} className="flex gap-2 text-xs">
                            <span className="size-4 shrink-0 rounded-full border-2 mt-0.5" />
                            <span>
                              {formatIngredientAmount(ing.amount, ing.unit) && (
                                <span className="text-muted-foreground">
                                  {formatIngredientAmount(ing.amount, ing.unit)}{' '}
                                </span>
                              )}
                              <span className="font-medium">{ing.name}</span>
                              {ing.notes && (
                                <span className="text-muted-foreground"> ({ing.notes})</span>
                              )}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {instructions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold mb-1.5">Instructions</h4>
                    <ol className="space-y-2">
                      {instructions.map((step, idx) => (
                        <li key={idx} className="flex gap-2 text-xs">
                          <div className="size-5 shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                            {step.step_number}
                          </div>
                          <p className="leading-relaxed pt-0.5">{step.instruction}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
