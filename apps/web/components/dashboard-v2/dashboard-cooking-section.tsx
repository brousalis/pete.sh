'use client'

import { CookingDayView } from '@/components/cooking/cooking-day-view'
import { ShoppingCard } from '@/components/cooking/cooking-sidebar'
import { DayIngredientsSidebar } from '@/components/cooking/day-ingredients-sidebar'
// Camera/canvas + dialog — load on demand when opened.
import { FridgeScanButton } from '@/components/cooking/fridge-scanner'
import type { SourceFilter } from '@/components/cooking/recipe-list'
import { RecipeList } from '@/components/cooking/recipe-list'
import { TonightRecipeBox } from '@/components/cooking/tonight-recipe-box'
import { WeekMenuView } from '@/components/cooking/week-menu-view'
import dynamic from 'next/dynamic'

// Heavy dialog / drill-down modules — dynamically imported so they don't bloat
// the initial dashboard bundle. Each is only loaded when its trigger fires.
const CookingMode = dynamic(() =>
  import('@/components/cooking/cooking-mode').then(m => ({ default: m.CookingMode })),
  { ssr: false }
)
const FridgeManager = dynamic(() =>
  import('@/components/cooking/fridge-manager').then(m => ({ default: m.FridgeManager })),
  { ssr: false }
)
const FridgeScanner = dynamic(() =>
  import('@/components/cooking/fridge-scanner').then(m => ({ default: m.FridgeScanner })),
  { ssr: false }
)
const MealPlanSwipeDialog = dynamic(() =>
  import('@/components/cooking/meal-plan-swipe-dialog').then(m => ({ default: m.MealPlanSwipeDialog })),
  { ssr: false }
)
const MealPlanWizardDialog = dynamic(() =>
  import('@/components/cooking/meal-plan-wizard-dialog').then(m => ({ default: m.MealPlanWizardDialog })),
  { ssr: false }
)
const RecipeDetailSheet = dynamic(() =>
  import('@/components/cooking/recipe-detail').then(m => ({ default: m.RecipeDetailSheet })),
  { ssr: false }
)
const RecipeEditor = dynamic(() =>
  import('@/components/cooking/recipe-editor').then(m => ({ default: m.RecipeEditor })),
  { ssr: false }
)
const RecipePickerDialog = dynamic(() =>
  import('@/components/cooking/recipe-picker').then(m => ({ default: m.RecipePickerDialog })),
  { ssr: false }
)
const ShoppingFocusMode = dynamic(() =>
  import('@/components/cooking/shopping-focus-mode').then(m => ({ default: m.ShoppingFocusMode })),
  { ssr: false }
)
import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { TagMultiSelect } from '@/components/ui/tag-multi-select'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { ViewToggle } from '@/components/ui/view-toggle'
import { useCooking } from '@/hooks/use-cooking-data'
import { apiGet } from '@/lib/api/client'
import type { DayOfWeek, Recipe, RecipeWithIngredients } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ChefHat, Dices, ImageIcon, ListChecks, Play, Plus, Search, ShoppingCart, Snowflake, Star, Wand2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type CookingView = 'day' | 'week-menu' | 'browse'

const STORAGE_KEY = 'cooking-view-preference'

const VALID_VIEWS = new Set<CookingView>(['day', 'week-menu', 'browse'])

function getStoredView(): CookingView {
  if (typeof window === 'undefined') return 'day'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && VALID_VIEWS.has(stored as CookingView)) return stored as CookingView
  } catch {}
  return 'day'
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DINNER_ONLY = ['dinner'] as const
const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

const DATE_TO_DAY: Record<number, DayOfWeek> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

function DashboardCookingContent() {
  const { selectedDate, navigateToDay } = useDashboardV2()
  const cooking = useCooking()
  const {
    recipes,
    selectedRecipeId,
    setSelectedRecipeId,
    showEditor,
    setShowEditor,
    editingRecipe,
    setEditingRecipe,
    refreshRecipes,
    showCookingMode,
    setShowCookingMode,
    cookingRecipe,
    setCookingRecipe,
    sidebarOpen,
    setSidebarOpen,
    fridgeIngredients,
    fridgeFilterActive,
    setFridgeFilterActive,
    mealPlan,
    mealPlanMode,
    getRecipeById,
  } = cooking

  const [cookingView, setCookingView] = useState<CookingView>(getStoredView)
  const [swipeOpen, setSwipeOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [nutritionFilter, setNutritionFilter] = useState('all')
  const [cardImageSize, setCardImageSize] = useState(80)
  const [showFridgeScanner, setShowFridgeScanner] = useState(false)
  const [showFridgeManager, setShowFridgeManager] = useState(false)
  const [showShoppingFocus, setShowShoppingFocus] = useState(false)
  const [randomizingDay, setRandomizingDay] = useState<DayOfWeek | null>(null)
  const [pickerSlot, setPickerSlot] = useState<{ day: DayOfWeek; meal: string } | null>(null)
  const [dayRecipe, setDayRecipe] = useState<RecipeWithIngredients | null>(null)
  const recipeListScrollRef = useRef<HTMLDivElement>(null)

  const handleViewChange = useCallback((view: CookingView) => {
    setCookingView(view)
    try { localStorage.setItem(STORAGE_KEY, view) } catch {}
  }, [])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(timer)
  }, [search])

  const hasActiveFilters =
    debouncedSearch ||
    difficultyFilter !== 'all' ||
    favoritesOnly ||
    selectedCategories.size > 0 ||
    fridgeFilterActive ||
    nutritionFilter !== 'all'

  const clearAllFilters = useCallback(() => {
    setSearch('')
    setDebouncedSearch('')
    setDifficultyFilter('all')
    setFavoritesOnly(false)
    setSelectedCategories(new Set())
    setNutritionFilter('all')
    setFridgeFilterActive(false)
  }, [setFridgeFilterActive])

  const filterState = {
    search,
    debouncedSearch,
    sourceFilter,
    difficultyFilter,
    favoritesOnly,
    selectedCategories,
    setSelectedCategories,
    nutritionFilter,
  }

  const searchFilteredCounts = useMemo(() => {
    let filtered = recipes
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.description?.toLowerCase().includes(lower) ||
          r.tags?.some((t) => t.toLowerCase().includes(lower))
      )
    }
    return {
      mine: filtered.filter((r) => r.source === 'custom').length,
      tj: filtered.filter((r) => r.source === 'trader_joes').length,
    }
  }, [recipes, debouncedSearch])

  const categoriesWithCounts = useMemo(() => {
    const cats = new Map<string, number>()
    let filtered = recipes
    if (sourceFilter === 'my-recipes') {
      filtered = filtered.filter((r) => r.source === 'custom')
    } else if (sourceFilter === 'trader-joes') {
      filtered = filtered.filter((r) => r.source === 'trader_joes')
    }
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.description?.toLowerCase().includes(lower) ||
          r.tags?.some((t) => t.toLowerCase().includes(lower))
      )
    }
    filtered.forEach((r) => {
      r.tags?.forEach((t) => {
        cats.set(t, (cats.get(t) || 0) + 1)
      })
    })
    return Array.from(cats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
  }, [recipes, debouncedSearch, sourceFilter])

  const activeMealTypes = cooking.mealPlanMode === 'dinner-only' ? DINNER_ONLY : ALL_MEAL_TYPES
  const plannedMealsCount = DAYS.reduce((count, day) => {
    const dayMeals = cooking.mealPlan?.meals[day]
    if (!dayMeals || dayMeals.skipped) return count
    return count + activeMealTypes.filter((mt) => dayMeals[mt as keyof typeof dayMeals]).length
  }, 0)

  const tonightRecipe = useMemo(() => {
    if (!mealPlan || !getRecipeById) return undefined
    const dayKey = DATE_TO_DAY[selectedDate.getDay()]
    if (!dayKey) return undefined
    const dayMeals = mealPlan.meals[dayKey]
    if (!dayMeals || dayMeals.skipped) return undefined
    const recipeId =
      mealPlanMode === 'dinner-only'
        ? dayMeals.dinner
        : dayMeals.dinner ?? dayMeals.lunch ?? dayMeals.breakfast ?? dayMeals.snack
    if (!recipeId || typeof recipeId !== 'string') return undefined
    return getRecipeById(recipeId) ?? undefined
  }, [mealPlan, getRecipeById, selectedDate, mealPlanMode])

  const handleRecipeClick = (recipe: { id: string }) => setSelectedRecipeId(recipe.id)

  const handleEditRecipe = (recipe: { id: string }) => {
    setEditingRecipe(recipe as never)
    setShowEditor(true)
    setSelectedRecipeId(null)
  }

  const handleDeleteRecipe = async () => {
    setSelectedRecipeId(null)
    await refreshRecipes()
  }

  const handleStartCooking = (recipe: unknown) => {
    setCookingRecipe(recipe as never)
    setShowCookingMode(true)
    setSelectedRecipeId(null)
  }

  const handleOpenEditor = useCallback(() => {
    if (cookingView !== 'browse') handleViewChange('browse')
    setEditingRecipe(null)
    setShowEditor(true)
    setSelectedRecipeId(null)
  }, [cookingView, handleViewChange, setEditingRecipe, setShowEditor, setSelectedRecipeId])

  // ── Week menu action handlers ──

  const handleWeekRecipeClick = useCallback(
    (recipeId: string) => setSelectedRecipeId(recipeId),
    [setSelectedRecipeId]
  )

  const handleWeekMarkCooked = useCallback(
    (day: DayOfWeek, meal: string, recipeId: string) => {
      const existing = cooking.isSlotCompleted(day, meal)
      if (existing) {
        cooking.deleteCompletion(existing.id)
      } else {
        cooking.createCompletion({
          recipe_id: recipeId,
          meal_plan_id: cooking.mealPlan?.id ?? '',
          day_of_week: day,
          meal_type: meal,
        })
      }
    },
    [cooking]
  )

  const handleWeekRemoveMeal = useCallback(
    (day: DayOfWeek, meal: string) => {
      cooking.updateMealSlot(day, meal, null)
    },
    [cooking]
  )

  const handleWeekAddToShopping = useCallback(
    (recipeId: string) => {
      cooking.addRecipeToShoppingList(recipeId)
    },
    [cooking]
  )

  const handleWeekRandomFill = useCallback(
    async (day: DayOfWeek) => {
      setRandomizingDay(day)
      try {
        await cooking.randomFillDinner(day)
      } finally {
        setRandomizingDay(null)
      }
    },
    [cooking]
  )

  const handleWeekSkipDay = useCallback(
    (day: DayOfWeek) => {
      cooking.skipDay(day)
    },
    [cooking]
  )

  const handleWeekUnskipDay = useCallback(
    (day: DayOfWeek) => {
      cooking.unskipDay(day)
    },
    [cooking]
  )

  const handleWeekStartCooking = useCallback(
    async (recipe: Recipe) => {
      const res = await apiGet<RecipeWithIngredients>(`/api/cooking/recipes/${recipe.id}`)
      if (res.success && res.data) {
        setCookingRecipe(res.data as never)
        setShowCookingMode(true)
      }
    },
    [setCookingRecipe, setShowCookingMode]
  )

  const handleWeekSelectDay = useCallback(
    (date: Date, direction: 'forward' | 'backward') => {
      navigateToDay(date, direction)
    },
    [navigateToDay]
  )

  const isDayView = cookingView === 'day'
  const isWeekView = cookingView === 'week-menu'
  const isBrowseView = cookingView === 'browse'

  const handleDayRecipeLoaded = useCallback((recipe: RecipeWithIngredients | null) => {
    setDayRecipe(recipe)
    if (recipe) setSidebarOpen(true)
  }, [setSidebarOpen])

  useEffect(() => {
    if (isDayView && dayRecipe) {
      setSidebarOpen(true)
    }
  }, [isDayView, dayRecipe, setSidebarOpen])

  return (
    <>
      <div className={cn('flex flex-col h-full', isBrowseView && 'overflow-hidden')}>
        {/* Top bar: Section title + meal plan controls */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50 bg-card/40">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <ChefHat className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Cooking</h2>
            </div>
            {plannedMealsCount > 0 && (
              <Badge variant="secondary" className="h-5 px-2 text-[10px] tabular-nums">
                {plannedMealsCount} planned
              </Badge>
            )}
            <ViewToggle
              options={[
                { value: 'dinner-only' as const, label: 'Dinners' },
                { value: 'all-meals' as const, label: 'All' },
              ]}
              value={cooking.mealPlanMode}
              onChange={cooking.setMealPlanMode}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setSwipeOpen(true)}
                  disabled={cooking.recipesLoading}
                  aria-label="Swipe to plan"
                >
                  <Dices className="size-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Swipe to plan</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setWizardOpen(true)}
                  disabled={cooking.recipesLoading}
                  aria-label="Plan my week"
                >
                  <Wand2 className="size-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Plan my week</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <MealPlanSwipeDialog open={swipeOpen} onOpenChange={setSwipeOpen} />
        <MealPlanWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} />

        {/* Main content area */}
        <div className={cn('flex-1 min-h-0 flex', isBrowseView && 'overflow-hidden max-h-[488px]')}>
          {/* Shopping sidebar - collapsible */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className={cn(
                  'hidden shrink-0 lg:block',
                  isBrowseView ? 'h-full' : 'relative',
                )}
                style={{ display: 'block' }}
              >
                <aside className={cn(
                  'flex flex-col overflow-hidden min-h-0 w-[280px]',
                  isBrowseView ? 'h-full' : 'absolute inset-y-0 left-0',
                )}>
                  {isDayView ? (
                    <DayIngredientsSidebar
                      recipe={dayRecipe}
                      loading={!dayRecipe && !!mealPlan}
                      onCollapse={() => setSidebarOpen(false)}
                    />
                  ) : (
                    <ScrollArea className="flex-1 min-h-0 h-full">
                      <ShoppingCard
                        onOpenFocusMode={() => setShowShoppingFocus(true)}
                        onCollapse={() => setSidebarOpen(false)}
                      />
                    </ScrollArea>
                  )}
                </aside>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content area */}
          <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-card">
            {/* Sub-header: View toggle + contextual controls */}
            <div className="border-b border-border/40">
              <div className="flex items-center gap-2.5 px-3 py-2">
                {!sidebarOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="flex items-center justify-center size-7 rounded-md transition-all shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        {isDayView ? (
                          <ListChecks className="size-3.5" />
                        ) : (
                          <ShoppingCart className="size-3.5" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isDayView ? 'Show ingredients' : 'Show shopping list'}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* View toggle */}
                <ViewToggle
                  options={[
                    { value: 'day' as CookingView, label: 'Day' },
                    { value: 'week-menu' as CookingView, label: 'This Week' },
                    { value: 'browse' as CookingView, label: 'Browse' },
                  ]}
                  value={cookingView}
                  onChange={handleViewChange}
                />

                {/* Browse-mode controls */}
                {isBrowseView && (
                  <>
                    <div className="relative flex-1 min-w-0 max-w-md">
                      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
                      <Input
                        placeholder="Search recipes, ingredients, tags..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className={cn(
                          'h-8 pl-8 !text-xs bg-background/50 border-border/40 focus-visible:bg-background focus-visible:border-border',
                          search && 'pr-8'
                        )}
                      />
                      {search && (
                        <button
                          onClick={() => handleSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Clear search"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-auto shrink-0">
                      <div className="flex items-center gap-1.5 mr-1">
                        <ImageIcon className="size-3 text-muted-foreground shrink-0" />
                        <Slider
                          value={[cardImageSize]}
                          onValueChange={(v) => v[0] != null && setCardImageSize(v[0])}
                          min={80}
                          max={220}
                          step={10}
                          className="w-16"
                        />
                      </div>

                      <button
                        onClick={() => setFavoritesOnly(!favoritesOnly)}
                        className={cn(
                          'flex items-center justify-center size-8 rounded-lg transition-all',
                          favoritesOnly
                            ? 'bg-accent-gold/15 text-accent-gold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                        title="Favorites"
                      >
                        <Star className={cn('size-3.5', favoritesOnly && 'fill-accent-gold')} />
                      </button>

                      {fridgeIngredients.length > 0 && (
                        <button
                          onClick={() => setShowFridgeManager(true)}
                          className={cn(
                            'flex items-center justify-center size-8 rounded-lg transition-all',
                            fridgeFilterActive
                              ? 'bg-accent-sage/15 text-accent-sage'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                          title="Manage fridge items"
                        >
                          <Snowflake className="size-3.5" />
                        </button>
                      )}

                      <FridgeScanButton onClick={() => setShowFridgeScanner(true)} />

                      <Button onClick={handleOpenEditor} size="sm" className="h-8 gap-1.5 px-3">
                        <Plus className="size-3.5" />
                        <span className="hidden sm:inline text-xs">New</span>
                      </Button>
                    </div>
                  </>
                )}

                {/* Day/Week view right-side controls */}
                {(isDayView || isWeekView) && (
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    {isDayView && dayRecipe && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleWeekStartCooking(dayRecipe as Recipe)}
                      >
                        <Play className="size-3" />
                        <span className="hidden sm:inline">Cook</span>
                      </Button>
                    )}
                    {fridgeIngredients.length > 0 && (
                      <button
                        onClick={() => setShowFridgeManager(true)}
                        className={cn(
                          'flex items-center justify-center size-8 rounded-lg transition-all',
                          fridgeFilterActive
                            ? 'bg-accent-sage/15 text-accent-sage'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                        title="Manage fridge items"
                      >
                        <Snowflake className="size-3.5" />
                      </button>
                    )}
                    <Button onClick={handleOpenEditor} size="sm" className="h-8 gap-1.5 px-3">
                      <Plus className="size-3.5" />
                      <span className="hidden sm:inline text-xs">New</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Filter bar - browse mode only */}
              {isBrowseView && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/20 flex-wrap">
                  <div className="flex items-center rounded-lg border border-border/40 p-0.5 shrink-0 bg-muted/30">
                    {[
                      { value: 'all' as SourceFilter, label: 'All', count: searchFilteredCounts.mine + searchFilteredCounts.tj },
                      { value: 'my-recipes' as SourceFilter, label: 'Mine', count: searchFilteredCounts.mine },
                      { value: 'trader-joes' as SourceFilter, label: "TJ's", count: searchFilteredCounts.tj },
                    ].map((source) => (
                      <button
                        key={source.value}
                        onClick={() => {
                          setSourceFilter(source.value)
                          setSelectedCategories(new Set())
                        }}
                        className={cn(
                          'rounded-md px-2 py-1 text-xs font-medium transition-all flex items-center gap-1',
                          sourceFilter === source.value
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span>{source.label}</span>
                        <span className="tabular-nums text-[10px] opacity-60">{source.count}</span>
                      </button>
                    ))}
                  </div>

                  {categoriesWithCounts.length > 0 && (
                    <>
                      <div className="h-5 w-px bg-border/40 shrink-0" />
                      <TagMultiSelect
                        tags={categoriesWithCounts}
                        selected={selectedCategories}
                        onSelectedChange={setSelectedCategories}
                        triggerClassName="h-7 text-xs"
                      />
                    </>
                  )}

                  <div className="h-5 w-px bg-border/40 shrink-0" />

                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="h-7 w-[100px] text-xs shrink-0 bg-muted/30 border-border/40">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={nutritionFilter} onValueChange={setNutritionFilter}>
                    <SelectTrigger className="h-7 w-[120px] text-xs shrink-0 bg-muted/30 border-border/40">
                      <SelectValue placeholder="Nutrition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="high-protein">High Protein</SelectItem>
                      <SelectItem value="low-carb">Low Carb</SelectItem>
                      <SelectItem value="low-calorie">Low Calorie</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="high-fiber">High Fiber</SelectItem>
                      <SelectItem value="post-workout">Post-Workout</SelectItem>
                      <SelectItem value="pre-workout-friendly">Pre-Workout</SelectItem>
                      <SelectItem value="rest-day">Rest Day</SelectItem>
                      <SelectItem value="recomp-friendly">Recomp</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <X className="size-3" />
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Main content */}
            <main className={cn('flex-1 min-h-0', isBrowseView && 'overflow-hidden')}>
              <AnimatePresence mode="wait" initial={false}>
                {isDayView && (
                  <motion.div
                    key="day"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    <CookingDayView
                      selectedDate={selectedDate}
                      mealPlan={mealPlan}
                      getRecipeById={getRecipeById}
                      mealPlanMode={mealPlanMode}
                      isSlotCompleted={cooking.isSlotCompleted}
                      onRecipeClick={handleWeekRecipeClick}
                      onStartCooking={handleWeekStartCooking}
                      onAddDinner={(day) => setPickerSlot({ day, meal: 'dinner' })}
                      onRandomFill={handleWeekRandomFill}
                      onUnskipDay={handleWeekUnskipDay}
                      onPlanWeek={() => setWizardOpen(true)}
                      onRecipeLoaded={handleDayRecipeLoaded}
                      randomizingDay={randomizingDay}
                    />
                  </motion.div>
                )}
                {isWeekView && (
                  <motion.div
                    key="week-menu"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <WeekMenuView
                      mealPlan={mealPlan}
                      getRecipeById={getRecipeById}
                      mealPlanMode={mealPlanMode}
                      selectedDate={selectedDate}
                      sidebarOpen={sidebarOpen}
                      onSelectDay={handleWeekSelectDay}
                      onRecipeClick={handleWeekRecipeClick}
                      onMarkCooked={handleWeekMarkCooked}
                      onRemoveMeal={handleWeekRemoveMeal}
                      onAddToShopping={handleWeekAddToShopping}
                      onRandomFill={handleWeekRandomFill}
                      onSkipDay={handleWeekSkipDay}
                      onUnskipDay={handleWeekUnskipDay}
                      onStartCooking={handleWeekStartCooking}
                      onAddDinner={(day) => setPickerSlot({ day, meal: 'dinner' })}
                      onPlanWeek={() => setWizardOpen(true)}
                      isSlotCompleted={cooking.isSlotCompleted}
                      randomizingDay={randomizingDay}
                    />
                  </motion.div>
                )}
                {isBrowseView && (
                  <motion.div
                    key="browse"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    <div ref={recipeListScrollRef} className="h-full max-h-[360px] overflow-y-auto p-3">
                      {showEditor ? (
                        <RecipeEditor
                          recipe={editingRecipe ?? undefined}
                          onSave={async () => {
                            setShowEditor(false)
                            setEditingRecipe(null)
                            await refreshRecipes()
                          }}
                          onCancel={() => {
                            setShowEditor(false)
                            setEditingRecipe(null)
                          }}
                        />
                      ) : (
                        <>
                          {tonightRecipe && (
                            <TonightRecipeBox
                              recipe={tonightRecipe}
                              onClick={() => setSelectedRecipeId(tonightRecipe.id)}
                            />
                          )}
                          <RecipeList
                            filters={filterState}
                            onRecipeClick={handleRecipeClick}
                            onNewRecipe={handleOpenEditor}
                            cardImageSize={cardImageSize}
                            scrollRootRef={recipeListScrollRef}
                          />
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>

      <RecipePickerDialog
        open={!!pickerSlot}
        onOpenChange={(open) => !open && setPickerSlot(null)}
        onSelect={async (recipeId) => {
          if (!pickerSlot) return
          await cooking.updateMealSlot(pickerSlot.day, pickerSlot.meal, recipeId)
          setPickerSlot(null)
        }}
        selectedId={
          pickerSlot
            ? (() => {
                const dm = cooking.mealPlan?.meals[pickerSlot.day]
                const id = dm?.[pickerSlot.meal as keyof typeof dm]
                return typeof id === 'string' ? id : undefined
              })()
            : undefined
        }
      />

      <RecipeDetailSheet
        recipeId={selectedRecipeId}
        open={!!selectedRecipeId}
        onOpenChange={(open) => !open && setSelectedRecipeId(null)}
        onEdit={handleEditRecipe as never}
        onDelete={handleDeleteRecipe}
        onStartCooking={handleStartCooking as never}
      />

      <FridgeScanner open={showFridgeScanner} onOpenChange={setShowFridgeScanner} />
      <ShoppingFocusMode open={showShoppingFocus} onClose={() => setShowShoppingFocus(false)} />
      <FridgeManager
        open={showFridgeManager}
        onOpenChange={setShowFridgeManager}
        onOpenScanner={() => setShowFridgeScanner(true)}
      />

      {showCookingMode && cookingRecipe && (
        <CookingMode
          recipe={cookingRecipe}
          open={showCookingMode}
          onClose={() => {
            setShowCookingMode(false)
            setCookingRecipe(null)
          }}
        />
      )}
    </>
  )
}

export function DashboardCookingSection() {
  return <DashboardCookingContent />
}
