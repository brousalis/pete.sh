'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Stepper } from '@/components/ui/stepper'
import { TagMultiSelect } from '@/components/ui/tag-multi-select'
import { Textarea } from '@/components/ui/textarea'
import { useCooking } from '@/hooks/use-cooking-data'
import { useToast } from '@/hooks/use-toast'
import { apiGet, apiPost } from '@/lib/api/client'
import type { DayMeals, DayOfWeek, MealPlan, Recipe } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { getEligibleDinnerRecipes } from '@/lib/utils/meal-plan-discovery'
import { slideInLeftVariants, slideInRightVariants } from '@/lib/animations'
import {
  addDays,
  format,
  isToday,
  startOfWeek,
} from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChefHat,
  Clock,
  Loader2,
  Sparkles,
  Star,
  Users,
  Wand2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RecipePickerDialog } from './recipe-picker'

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const STEPS = ['Preferences', 'Filters', 'Discover', 'Review']

type ApplyMode = 'fill-empty' | 'replace-all'
type VarietyMode = 'mix' | 'favorites'

interface RecipeHintsResponse {
  prioritizedIds: string[]
  excludedIds?: string[]
  reasoning?: string
}

export interface MealPlanWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MealPlanWizardDialog({ open, onOpenChange }: MealPlanWizardDialogProps) {
  const {
    recipes,
    recipesLoading,
    mealPlan,
    currentWeek,
    updateMealPlanBulk,
    refreshMealPlan,
  } = useCooking()
  const { toast } = useToast()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [applyMode, setApplyMode] = useState<ApplyMode>('fill-empty')
  const [varietyMode, setVarietyMode] = useState<VarietyMode>('mix')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [maxPrepTime, setMaxPrepTime] = useState<number | ''>('')
  const [aiHint, setAiHint] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [suggestions, setSuggestions] = useState<Partial<Record<DayOfWeek, { dinner: string }>>>({})
  const [pickerSlot, setPickerSlot] = useState<{ day: DayOfWeek } | null>(null)
  const [pendingClose, setPendingClose] = useState(false)

  const hasSuggestions = Object.keys(suggestions).length > 0
  const isDirty = hasSuggestions && step >= 2

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep(0)
      setApplyMode('fill-empty')
      setVarietyMode('mix')
      setSelectedTags(new Set())
      setDifficultyFilter('all')
      setMaxPrepTime('')
      setAiHint('')
      setSuggestions({})
      setPickerSlot(null)
      setPendingClose(false)
    }
  }, [open])

  const handleClose = useCallback(() => {
    if (isDirty && !pendingClose) {
      setPendingClose(true)
    } else {
      onOpenChange(false)
    }
  }, [isDirty, pendingClose, onOpenChange])

  const handleConfirmClose = useCallback(() => {
    setPendingClose(false)
    onOpenChange(false)
  }, [onOpenChange])

  const handleBack = useCallback(() => {
    setDirection('prev')
    setStep((s) => Math.max(0, s - 1))
  }, [])

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setDirection('next')
      setStep((s) => s + 1)
    }
  }, [step])

  const allTags = useMemo(() => {
    const tagCounts = new Map<string, number>()
    for (const r of recipes) {
      r.tags?.forEach((t) => {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
      })
    }
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
  }, [recipes])

  const runDiscovery = useCallback(async () => {
    if (recipes.length === 0) return

    setDiscovering(true)
    try {
      const maxTime = typeof maxPrepTime === 'number' ? maxPrepTime : null
      let eligible = getEligibleDinnerRecipes(
        recipes,
        {
          tags: selectedTags.size > 0 ? selectedTags : undefined,
          difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
          maxPrepTime: maxTime != null && maxTime > 0 ? maxTime : null,
        },
        false
      )

      if (eligible.length === 0) {
        eligible = getEligibleDinnerRecipes(recipes, {}, false)
        if (eligible.length > 0) {
          toast({ title: 'Filters too strict — using all dinner-appropriate recipes' })
        } else {
          eligible = [...recipes]
          toast({ title: 'No dinner recipes found — using all recipes' })
        }
      }

      // Fetch AI hints if prompt provided
      let prioritizedIds: string[] = []
      let excludedIds: string[] = []
      if (aiHint.trim()) {
        try {
          const candidates = eligible.map((r) => ({
            id: r.id,
            name: r.name,
            tags: r.tags,
            prep_time: r.prep_time,
            cook_time: r.cook_time,
            difficulty: r.difficulty,
            description: r.description?.slice(0, 200),
          }))
          const res = await apiPost<RecipeHintsResponse>('/api/cooking/ai-chef/recipe-hints', {
            prompt: aiHint.trim(),
            candidates,
          })
          if (res.success && res.data) {
            prioritizedIds = res.data.prioritizedIds || []
            excludedIds = res.data.excludedIds || []
          }
        } catch {
          toast({ title: 'AI suggestions unavailable — using your filters only' })
        }
      }

      // Apply AI: remove excluded, boost prioritized
      let filtered = eligible.filter((r) => !excludedIds.includes(r.id))
      if (filtered.length === 0) filtered = eligible

      // Fetch recent plans for recency scoring
      let recentRecipeIds = new Set<string>()
      try {
        const recentRes = await apiGet<MealPlan[]>('/api/cooking/meal-plans?recent_weeks=3')
        const recentPlans = recentRes.success && recentRes.data ? recentRes.data : []
        for (const plan of recentPlans) {
          for (const d of DAYS) {
            const dm = plan.meals[d]
            if (dm?.dinner) recentRecipeIds.add(dm.dinner)
          }
        }
      } catch {
        // Proceed without recency
      }

      // Score and sort
      const scored = filtered.map((r) => {
        let score = 0
        if (prioritizedIds.includes(r.id)) score += 50
        if (recentRecipeIds.has(r.id)) score -= 20
        if (varietyMode === 'favorites' && r.is_favorite) score += 15
        return { recipe: r, score }
      })
      scored.sort((a, b) => b.score - a.score)

      // Shuffle top candidates for variety
      const shuffle = <T,>(arr: T[]): T[] => {
        const out = [...arr]
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          const tmp = out[i]
          out[i] = out[j]!
          out[j] = tmp!
        }
        return out
      }

      const shuffled = shuffle(scored.map((s) => s.recipe))

      // Build assignments: 1 per day, no repeats, respect skipped
      const result: Partial<Record<DayOfWeek, { dinner: string }>> = {}
      const used = new Set<string>()

      const targetDays = DAYS.filter((day) => {
        if (applyMode === 'fill-empty') {
          const dm = mealPlan?.meals[day]
          if (dm?.skipped) return false
          if (dm?.dinner) return false
        }
        return true
      })

      for (const day of targetDays) {
        const picked = shuffled.find((r) => !used.has(r.id))
        if (picked) {
          result[day] = { dinner: picked.id }
          used.add(picked.id)
        }
      }

      setSuggestions(result)
      setStep(3)
    } catch (err) {
      console.error('[MealPlanWizard] Discovery failed:', err)
      toast({ title: 'Failed to discover meals', variant: 'destructive' })
    } finally {
      setDiscovering(false)
    }
  }, [
    recipes,
    selectedTags,
    difficultyFilter,
    maxPrepTime,
    aiHint,
    varietyMode,
    applyMode,
    mealPlan,
    toast,
  ])

  const handleApply = useCallback(async () => {
    if (Object.keys(suggestions).length === 0) return

    const updates: Partial<Record<DayOfWeek, Partial<DayMeals>>> = {}
    for (const [day, val] of Object.entries(suggestions)) {
      if (val?.dinner) {
        updates[day as DayOfWeek] = { dinner: val.dinner }
      }
    }

    if (applyMode === 'fill-empty') {
      const existing = mealPlan?.meals || {}
      for (const d of DAYS) {
        const existingDay = existing[d]
        if (existingDay?.skipped) continue
        if (existingDay?.dinner && !updates[d]) continue
        if (updates[d]) {
          updates[d] = { ...existingDay, ...updates[d] }
        }
      }
    }

    await updateMealPlanBulk(updates)
    await refreshMealPlan()
    onOpenChange(false)
  }, [suggestions, applyMode, mealPlan, updateMealPlanBulk, refreshMealPlan, onOpenChange])

  const handleMealSelect = useCallback((recipeId: string) => {
    if (!pickerSlot) return
    setSuggestions((prev) => ({
      ...prev,
      [pickerSlot.day]: { dinner: recipeId },
    }))
    setPickerSlot(null)
  }, [pickerSlot])

  const zeroRecipes = recipes.length === 0 && !recipesLoading

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : handleClose())}>
      <DialogContent
        className="sm:max-w-[420px] max-h-[95dvh] p-0 gap-0 overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 px-4 pt-4 pb-2 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-5 text-primary" />
            Plan my week
          </DialogTitle>
          <DialogDescription>Configure preferences and discover meals for the week</DialogDescription>
          <Stepper
            steps={STEPS}
            currentStep={step}
            onStepClick={step > 0 ? (i) => setStep(i) : undefined}
            className="mt-3"
          />
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {zeroRecipes ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <ChefHat className="size-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Add recipes first to use the meal plan wizard.</p>
              <Button onClick={() => onOpenChange(false)}>Got it</Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4">
                  <AnimatePresence mode="wait">
                    {step === 0 && (
                      <motion.div
                        key="step0"
                        initial={direction === 'next' ? 'hidden' : 'exit'}
                        animate="visible"
                        exit="exit"
                        variants={direction === 'next' ? slideInRightVariants : slideInLeftVariants}
                        className="space-y-4"
                      >
                        <div>
                          <p className="text-sm font-medium mb-2">When applying</p>
                          <div className="flex gap-2">
                            <Button
                              variant={applyMode === 'fill-empty' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setApplyMode('fill-empty')}
                            >
                              Fill empty only
                            </Button>
                            <Button
                              variant={applyMode === 'replace-all' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setApplyMode('replace-all')}
                            >
                              Replace all
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Variety</p>
                          <div className="flex gap-2">
                            <Button
                              variant={varietyMode === 'mix' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setVarietyMode('mix')}
                            >
                              Mix it up
                            </Button>
                            <Button
                              variant={varietyMode === 'favorites' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setVarietyMode('favorites')}
                            >
                              Favor favorites
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 1 && (
                      <motion.div
                        key="step1"
                        initial={direction === 'next' ? 'hidden' : 'exit'}
                        animate="visible"
                        exit="exit"
                        variants={direction === 'next' ? slideInRightVariants : slideInLeftVariants}
                        className="space-y-4"
                      >
                        <div>
                          <p className="text-sm font-medium mb-2">Tags</p>
                          <TagMultiSelect
                            tags={allTags}
                            selected={selectedTags}
                            onSelectedChange={setSelectedTags}
                            placeholder="Any tags"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Difficulty</p>
                          <div className="flex flex-wrap gap-1">
                            {['all', 'easy', 'medium', 'hard'].map((d) => (
                              <Button
                                key={d}
                                variant={difficultyFilter === d ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDifficultyFilter(d)}
                              >
                                {d === 'all' ? 'Any' : d}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Max total time (min)</p>
                          <Input
                            type="number"
                            placeholder="No limit"
                            value={maxPrepTime}
                            onChange={(e) => setMaxPrepTime(e.target.value ? Number(e.target.value) : '')}
                            min={5}
                            max={180}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                            <Sparkles className="size-3.5 text-accent-gold" />
                            AI hint (optional)
                          </p>
                          <Textarea
                            placeholder="e.g., light meals, use chicken, avoid dairy, quick weeknights"
                            value={aiHint}
                            onChange={(e) => setAiHint(e.target.value)}
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="step2"
                        initial={direction === 'next' ? 'hidden' : 'exit'}
                        animate="visible"
                        exit="exit"
                        variants={direction === 'next' ? slideInRightVariants : slideInLeftVariants}
                        className="space-y-4"
                      >
                        <p className="text-sm text-muted-foreground">
                          Click below to discover meal suggestions based on your preferences.
                        </p>
                        <Button
                          className="w-full h-12"
                          onClick={runDiscovery}
                          disabled={discovering}
                        >
                          {discovering ? (
                            <>
                              <Loader2 className="size-4 animate-spin mr-2" />
                              {aiHint.trim() ? 'AI thinking…' : 'Discovering…'}
                            </>
                          ) : (
                            <>
                              <Wand2 className="size-4 mr-2" />
                              Suggest meals
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={runDiscovery}
                          disabled={discovering}
                        >
                          Shuffle (new suggestions)
                        </Button>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div
                        key="step3"
                        initial={direction === 'next' ? 'hidden' : 'exit'}
                        animate="visible"
                        exit="exit"
                        variants={direction === 'next' ? slideInRightVariants : slideInLeftVariants}
                        className="space-y-4"
                      >
                        {Object.keys(suggestions).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No suggestions yet. Go back to Discover.</p>
                        ) : (
                          <div className="space-y-2">
                            {DAYS.map((day, i) => {
                              const dayDate = addDays(currentWeek, i)
                              const sug = suggestions[day]
                              const recipeId = sug?.dinner
                              const recipe = recipes.find((r) => r.id === recipeId)
                              const isDayToday = isToday(dayDate)

                              return (
                                <div
                                  key={day}
                                  className={cn(
                                    'flex items-center gap-3 rounded-lg border p-3',
                                    isDayToday && 'border-primary/30 bg-primary/5'
                                  )}
                                >
                                  <div className="w-16 shrink-0">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {format(dayDate, 'EEE')}
                                    </span>
                                    <span className="block text-sm font-bold">{format(dayDate, 'd')}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {recipe ? (
                                      <div className="flex items-center gap-3">
                                        <div className="size-10 shrink-0 overflow-hidden rounded-lg">
                                          {resolveRecipeImageUrl(recipe.image_url) ? (
                                            <img
                                              src={resolveRecipeImageUrl(recipe.image_url)!}
                                              alt=""
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <div className="h-full w-full bg-muted flex items-center justify-center">
                                              <ChefHat className="size-4 text-muted-foreground/40" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium truncate">{recipe.name}</p>
                                          <div className="flex gap-2 text-xs text-muted-foreground">
                                            {((recipe.prep_time || 0) + (recipe.cook_time || 0)) > 0 && (
                                              <span className="flex items-center gap-0.5">
                                                <Clock className="size-3" />
                                                {(recipe.prep_time || 0) + (recipe.cook_time || 0)}m
                                              </span>
                                            )}
                                            {recipe.servings && (
                                              <span className="flex items-center gap-0.5">
                                                <Users className="size-3" />
                                                {recipe.servings}
                                              </span>
                                            )}
                                            {recipe.is_favorite && <Star className="size-3 fill-accent-gold" />}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPickerSlot({ day })}
                                    className="shrink-0"
                                  >
                                    {recipe ? 'Change' : 'Add'}
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              <DialogFooter className="shrink-0 border-t border-border/50 px-4 py-3 gap-2">
                {pendingClose ? (
                  <div className="flex flex-col gap-2 w-full">
                    <p className="text-sm text-muted-foreground">Discard changes?</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleConfirmClose} className="flex-1">
                        Discard
                      </Button>
                      <Button onClick={() => setPendingClose(false)} className="flex-1">
                        Keep editing
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {step > 0 ? (
                      <Button variant="outline" onClick={handleBack}>
                        <ChevronLeft className="size-4 mr-1" />
                        Back
                      </Button>
                    ) : (
                      <div />
                    )}
                    <div className="flex-1" />
                    {step < STEPS.length - 1 ? (
                      <Button
                        onClick={() => (step === 2 ? runDiscovery() : handleNext())}
                        disabled={step === 2 && discovering}
                      >
                        {step === 2 ? (
                          discovering ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            'Discover'
                          )
                        ) : (
                          'Next'
                        )}
                      </Button>
                    ) : (
                      <Button onClick={handleApply} disabled={Object.keys(suggestions).length === 0}>
                        Apply
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>

      <RecipePickerDialog
        open={pickerSlot != null}
        onOpenChange={(o) => !o && setPickerSlot(null)}
        onSelect={handleMealSelect}
        selectedId={pickerSlot ? suggestions[pickerSlot.day]?.dinner : undefined}
      />
    </Dialog>
  )
}
