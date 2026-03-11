'use client'

import { CookingMode } from '@/components/cooking/cooking-mode'
import { ShoppingCard } from '@/components/cooking/cooking-sidebar'
import { FridgeManager } from '@/components/cooking/fridge-manager'
import { FridgeScanButton, FridgeScanner } from '@/components/cooking/fridge-scanner'
import { MealPlanSwipeDialog } from '@/components/cooking/meal-plan-swipe-dialog'
import { MealPlanWizardDialog } from '@/components/cooking/meal-plan-wizard-dialog'
import { RecipeDetailSheet } from '@/components/cooking/recipe-detail'
import { RecipeEditor } from '@/components/cooking/recipe-editor'
import type { SourceFilter } from '@/components/cooking/recipe-list'
import { RecipeList } from '@/components/cooking/recipe-list'
import { ShoppingFocusMode } from '@/components/cooking/shopping-focus-mode'
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
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Dices, ImageIcon, Plus, Search, ShoppingCart, Snowflake, Star, Wand2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DINNER_ONLY = ['dinner'] as const
const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

function DashboardCookingContent() {
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
  } = cooking

  const [swipeOpen, setSwipeOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [nutritionFilter, setNutritionFilter] = useState('all')
  const [cardImageSize, setCardImageSize] = useState(100)
  const [showFridgeScanner, setShowFridgeScanner] = useState(false)
  const [showFridgeManager, setShowFridgeManager] = useState(false)
  const [showShoppingFocus, setShowShoppingFocus] = useState(false)
  const recipeListScrollRef = useRef<HTMLDivElement>(null)

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

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Top bar: Meal plan controls (day cards handle the plan) */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50 bg-card/40">
          <div className="flex items-center gap-2">
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

        <div className="flex-1 min-h-0 flex overflow-hidden pt-3">
          {/* Shopping sidebar - collapsible */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="hidden shrink-0 flex-col border-r border-border overflow-hidden lg:flex"
                style={{ display: 'flex' }}
              >
                <ScrollArea className="flex-1 min-h-0">
                  <ShoppingCard
                    onOpenFocusMode={() => setShowShoppingFocus(true)}
                    onCollapse={() => setSidebarOpen(false)}
                  />
                </ScrollArea>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Recipe area */}
          <div className="flex flex-1 flex-col overflow-hidden min-w-0 rounded-xl border border-border/50 bg-card">
            {/* Recipe Header: Search + Filters (matching main cooking page) */}
            <div className="border-b border-border/40">
              {/* Row 1: Search + Actions */}
              <div className="flex items-center gap-2.5 px-3 py-2">
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="flex items-center justify-center size-7 rounded-md transition-all shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Show shopping list"
                  >
                    <ShoppingCart className="size-3.5" />
                  </button>
                )}

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

                  <Button
                    onClick={() => {
                      setEditingRecipe(null)
                      setShowEditor(true)
                      setSelectedRecipeId(null)
                    }}
                    size="sm"
                    className="h-8 gap-1.5 px-3"
                  >
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline text-xs">New</span>
                  </Button>
                </div>
              </div>

              {/* Row 2: Filter Bar */}
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
            </div>

            {/* Recipe List - max height ~8 recipes (4 rows × 2 cols) */}
            <main className="flex-1 min-h-0 overflow-hidden">
              <div ref={recipeListScrollRef} className="h-full max-h-[580px] overflow-y-auto p-3">
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
                  <RecipeList
                    filters={filterState}
                    onRecipeClick={handleRecipeClick}
                    onNewRecipe={() => {
                      setEditingRecipe(null)
                      setShowEditor(true)
                      setSelectedRecipeId(null)
                    }}
                    cardImageSize={cardImageSize}
                    scrollRootRef={recipeListScrollRef}
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      </div>

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
