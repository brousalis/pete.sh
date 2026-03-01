'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useCooking } from '@/hooks/use-cooking-data'
import { useReducedMotionPreference } from '@/hooks/use-animation'
import { useToast } from '@/hooks/use-toast'
import { apiGet } from '@/lib/api/client'
import {
  getEligibleDinnerRecipes,
  type MealPlanDiscoveryFilters,
} from '@/lib/utils/meal-plan-discovery'
import type {
  DayOfWeek,
  Recipe,
  RecipeIngredient,
  RecipeStep,
  RecipeWithIngredients,
} from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { transitions } from '@/lib/animations'
import { addDays, format } from 'date-fns'
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { Check, ChefHat, Clock, Dices, Info, ListOrdered, Star, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const SWIPE_VELOCITY_THRESHOLD = 200
const SWIPE_OFFSET_THRESHOLD_RATIO = 0.2

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

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      triggerHaptic()
      setCurrentIndex((i) => Math.max(0, i - 1))
      setShowSwipeHint(false)
    }
  }, [currentIndex])

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

            {/* Day picker + Quick filter */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setTargetDay('next-empty')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    targetDay === 'next-empty'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  Next empty
                </button>
                {DAYS.map((day) => {
                  const dayDate = addDays(currentWeek, DAYS.indexOf(day))
                  const isFilled = assignments[day] || mealPlan?.meals[day]?.dinner
                  const isSkipped = mealPlan?.meals[day]?.skipped
                  if (isSkipped) return null
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setTargetDay(day)}
                      className={cn(
                        'flex flex-col items-center rounded-lg px-2.5 py-1.5 min-w-[44px] text-xs transition-colors',
                        targetDay === day
                          ? 'bg-primary text-primary-foreground'
                          : isFilled
                            ? 'bg-green-500/15 text-green-600'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <span className="font-medium">{format(dayDate, 'EEE')}</span>
                      <span className="text-[10px] tabular-nums">{format(dayDate, 'd')}</span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setQuickFilter((v) => !v)}
                className={cn(
                  'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                  quickFilter ? 'bg-amber-500/15 text-amber-600' : 'bg-muted/50 text-muted-foreground'
                )}
              >
                Quick &lt;30m
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-4">
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
                onLike={handleLike}
                onPass={handlePass}
                onNext={handlePass}
                onPrevious={handlePrevious}
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

interface ExpandedRecipeOverlayProps {
  recipeId: string
  onClose: () => void
  onLike: () => void
  onPass: () => void
  reducedMotion: boolean
}

function ExpandedRecipeOverlay({
  recipeId,
  onClose,
  onLike,
  onPass,
  reducedMotion,
}: ExpandedRecipeOverlayProps) {
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setRecipe(null)
    apiGet<RecipeWithIngredients>(`/api/cooking/recipes/${recipeId}`)
      .then((res) => {
        if (!cancelled && res.success && res.data) setRecipe(res.data)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [recipeId])

  const instructions = useMemo(
    () => (recipe ? parseInstructions(recipe.instructions) : []),
    [recipe]
  )

  const totalTime = recipe ? (recipe.prep_time || 0) + (recipe.cook_time || 0) : 0

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reducedMotion ? { duration: 0.05 } : { duration: 0.2, ease: 'easeOut' }}
    >
      {/* Backdrop - tap to close */}
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/60"
        onClick={onClose}
        aria-label="Close"
      />

      <motion.div
        className="relative z-10 flex flex-1 flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl mx-4 mt-12 mb-4 max-h-[85dvh]"
        initial={{ scale: 0.94, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 24, opacity: 0 }}
        transition={
          reducedMotion
            ? { duration: 0.05 }
            : { type: 'spring', stiffness: 400, damping: 30 }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 p-3 border-b border-border/50">
          <Button variant="ghost" size="icon" className="size-10" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">Tap outside to close</span>
          <div className="size-10" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain -mb-16 pb-20">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="space-y-2 pt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ) : recipe ? (
            <div className="p-4 space-y-4">
              {/* Image */}
              <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden shrink-0">
                {resolveRecipeImageUrl(recipe.image_url) ? (
                  <img
                    src={resolveRecipeImageUrl(recipe.image_url)!}
                    alt={recipe.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted/50">
                    <ChefHat className="size-16 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute top-2 left-2 right-2 flex justify-between">
                  {recipe.source === 'trader_joes' && (
                    <span className="rounded px-2 py-0.5 bg-red-600/90 text-xs font-semibold text-white">
                      TJ&apos;s
                    </span>
                  )}
                  {recipe.is_favorite && (
                    <Star className="size-5 fill-amber-400 text-amber-400" />
                  )}
                </div>
              </div>

              {/* Name + stats */}
              <div>
                <h3 className="text-xl font-bold leading-tight">{recipe.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {totalTime > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {totalTime} min
                    </span>
                  )}
                  {recipe.servings != null && recipe.servings > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {recipe.servings} servings
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span className="capitalize">{recipe.difficulty}</span>
                  )}
                  {instructions.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ListOrdered className="size-3.5" />
                      {instructions.length} steps
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {recipe.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {recipe.description}
                </p>
              )}

              {/* Ingredients */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Ingredients</h4>
                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                  <ul className="space-y-1.5">
                    {recipe.ingredients
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((ing: RecipeIngredient, idx: number) => (
                        <li key={ing.id || idx} className="flex gap-2 text-sm">
                          <span className="size-5 shrink-0 rounded-full border-2 mt-0.5" />
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
                ) : (
                  <p className="text-sm text-muted-foreground">No ingredients listed</p>
                )}
              </div>

              {/* Instructions */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Instructions</h4>
                {instructions.length > 0 ? (
                  <ol className="space-y-3">
                    {instructions.map((step, idx) => (
                      <li key={idx} className="flex gap-3">
                        <div className="size-6 shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                          {step.step_number}
                        </div>
                        <p className="text-sm leading-relaxed pt-0.5">{step.instruction}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No instructions listed</p>
                )}
              </div>

              {/* Nutrition + tags */}
              <div className="flex flex-wrap items-center gap-2">
                {(recipe.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {(recipe.nutrition_category || []).slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"
                  >
                    {c.replace(/-/g, ' ')}
                  </span>
                ))}
                {recipe.calories_per_serving != null && recipe.calories_per_serving > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ~{Math.round(recipe.calories_per_serving)} cal/serving
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Failed to load recipe
            </div>
          )}
        </div>

        {/* Sticky action buttons */}
        {!loading && recipe && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-card to-card/95 border-t border-border/50">
            <Button
              variant="outline"
              size="icon"
              className="size-12 rounded-full border-2 border-red-500/50 text-red-500"
              onClick={onPass}
              aria-label="Skip"
            >
              <X className="size-6" />
            </Button>
            <Button
              size="icon"
              className="size-12 rounded-full bg-green-500 hover:bg-green-600"
              onClick={onLike}
              aria-label="Add to plan"
            >
              <Check className="size-6" />
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

interface SwipeCardStackProps {
  candidates: Recipe[]
  currentIndex: number
  onLike: () => void
  onPass: () => void
  onNext: () => void
  onPrevious: () => void
  reducedMotion: boolean
  showHint: boolean
}

function SwipeCardStack({
  candidates,
  currentIndex,
  onLike,
  onPass,
  onNext,
  onPrevious,
  reducedMotion,
  showHint,
}: SwipeCardStackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null)
  const x = useMotionValue(0)
  const cardWidth = 320
  const exitDistance = typeof window !== 'undefined' ? Math.max(400, window.innerWidth) : 500

  const rotate = useTransform(x, [-cardWidth, cardWidth], [-8, 8])

  useEffect(() => {
    x.set(0)
  }, [currentIndex, x])

  const handleExpandClose = useCallback(() => setExpandedRecipeId(null), [])

  const handleExpandLike = useCallback(() => {
    onLike()
    setExpandedRecipeId(null)
  }, [onLike])

  const handleExpandPass = useCallback(() => {
    onPass()
    setExpandedRecipeId(null)
  }, [onPass])

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const threshold = Math.min(120, (typeof window !== 'undefined' ? window.innerWidth : 400) * SWIPE_OFFSET_THRESHOLD_RATIO)
      const wentRight = info.offset.x > threshold || info.velocity.x > SWIPE_VELOCITY_THRESHOLD
      const wentLeft = info.offset.x < -threshold || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD

      if (wentRight) {
        animate(x, exitDistance, { type: 'spring', stiffness: 300, damping: 25 })
        setTimeout(() => {
          onNext()
          x.set(0)
        }, reducedMotion ? 50 : 200)
      } else if (wentLeft) {
        animate(x, -exitDistance, { type: 'spring', stiffness: 300, damping: 25 })
        setTimeout(() => {
          onPrevious()
          x.set(0)
        }, reducedMotion ? 50 : 200)
      } else {
        animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 })
      }
    },
    [x, onNext, onPrevious, reducedMotion, exitDistance]
  )

  const recipe = candidates[currentIndex]
  const prevRecipe = candidates[currentIndex - 1]
  const nextRecipe = candidates[currentIndex + 1]

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[340px] min-h-[420px] max-h-[65dvh] flex items-center justify-center"
      tabIndex={0}
      role="group"
      aria-label="Recipe cards - swipe or use arrows to browse, use buttons to add or skip"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onPrevious()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          onNext()
        }
      }}
    >
      {showHint && (
        <p className="absolute top-2 left-0 right-0 text-center text-xs text-muted-foreground z-10">
          Swipe left for previous, right for next
        </p>
      )}

      {/* Preloaded neighbor cards — visible when swiping */}
      {prevRecipe && (
        <SwipeCard
          recipe={prevRecipe}
          index={-1}
          style={{ x: -72, scale: 0.88, y: 12, zIndex: 0 }}
          reducedMotion={reducedMotion}
        />
      )}
      {nextRecipe && (
        <SwipeCard
          recipe={nextRecipe}
          index={1}
          style={{ x: 72, scale: 0.88, y: 12, zIndex: 0 }}
          reducedMotion={reducedMotion}
        />
      )}

      {/* Current card — draggable, on top */}
      {recipe && (
        <SwipeCard
          recipe={recipe}
          index={0}
          drag
          x={x}
          rotate={rotate}
          onDragEnd={handleDragEnd}
          onExpand={() => setExpandedRecipeId(recipe.id)}
          reducedMotion={reducedMotion}
          cardWidth={cardWidth}
        />
      )}

      {/* Expanded recipe overlay */}
      <AnimatePresence mode="wait">
        {expandedRecipeId && (
          <ExpandedRecipeOverlay
            key={expandedRecipeId}
            recipeId={expandedRecipeId}
            onClose={handleExpandClose}
            onLike={handleExpandLike}
            onPass={handleExpandPass}
            reducedMotion={reducedMotion}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

interface SwipeCardProps {
  recipe: Recipe
  index: number
  style?: React.CSSProperties
  reducedMotion: boolean
  drag?: boolean
  x?: import('framer-motion').MotionValue<number>
  rotate?: import('framer-motion').MotionValue<number>
  onDragEnd?: (event: unknown, info: { offset: { x: number }; velocity: { x: number } }) => void
  onExpand?: () => void
  cardWidth?: number
}

/** TJ/category tags to hide from display (show fun tags only) */
const HIDE_TAGS = new Set([
  'desserts', 'dessert', 'baking', 'quick bites', 'snacks', 'appetizers',
  'main dishes', 'dinners', 'breakfast', 'drinks', 'beverages',
])

function SwipeCard({
  recipe,
  index,
  style,
  reducedMotion,
  drag = false,
  x,
  rotate,
  onDragEnd,
  onExpand,
  cardWidth = 320,
}: SwipeCardProps) {
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
  const containerRef = useRef<HTMLDivElement>(null)

  const displayTags = (recipe.tags || [])
    .filter((t) => !HIDE_TAGS.has(t.toLowerCase()))
    .slice(0, 4)

  const nutritionHints = (recipe.nutrition_category || []).filter((c) =>
    ['high-protein', 'low-carb', 'low-calorie', 'high-fiber', 'balanced'].includes(c)
  ).slice(0, 2)

  return (
    <motion.div
      ref={containerRef}
      className="absolute w-full max-w-[320px] rounded-2xl overflow-hidden shadow-xl border border-border/50 bg-card flex flex-col"
      style={{
        ...style,
        touchAction: drag ? 'none' : undefined,
        ...(drag && x && rotate ? { x, rotate } : {}),
      }}
      drag={drag ? 'x' : false}
      dragConstraints={drag ? { left: -cardWidth, right: cardWidth } : undefined}
      dragElastic={0.2}
      onDragEnd={onDragEnd}
      transition={reducedMotion ? { duration: 0.05 } : transitions.springGentle}
    >
      {/* Image — compact to leave room for decision info */}
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

      {/* Info panel — scannable decision aid */}
      <div className="flex flex-col gap-2 p-3 min-h-0 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold leading-tight line-clamp-2 flex-1 min-w-0">
            {recipe.name}
          </h3>
          {onExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onExpand()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="shrink-0 size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors -mr-1"
              aria-label="View full recipe details"
            >
              <Info className="size-4" />
            </button>
          )}
        </div>

        {/* Quick stats row */}
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

        {/* Description snippet */}
        {recipe.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
            {recipe.description}
          </p>
        )}

        {/* Tags + nutrition hints */}
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
        </div>

        {/* Calories if available */}
        {recipe.calories_per_serving != null && recipe.calories_per_serving > 0 && (
          <span className="text-[10px] text-muted-foreground">
            ~{Math.round(recipe.calories_per_serving)} cal/serving
          </span>
        )}
      </div>
    </motion.div>
  )
}
