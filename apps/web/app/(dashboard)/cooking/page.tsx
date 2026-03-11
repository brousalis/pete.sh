'use client'

import { useOnAssistantClosed } from '@/components/assistant-modal-provider'
import { CookingMode } from '@/components/cooking/cooking-mode'
import { HorizontalMealPlan, MobileMealPlanView, ShoppingCard } from '@/components/cooking/cooking-sidebar'
import { FridgeManager } from '@/components/cooking/fridge-manager'
import { FridgeScanButton, FridgeScanner } from '@/components/cooking/fridge-scanner'
import { RecipeDetailSheet } from '@/components/cooking/recipe-detail'
import { RecipeEditor } from '@/components/cooking/recipe-editor'
import type { SourceFilter } from '@/components/cooking/recipe-list'
import { RecipeList } from '@/components/cooking/recipe-list'
import { ShoppingFocusMode } from '@/components/cooking/shopping-focus-mode'
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
import { CookingProvider, useCooking } from '@/hooks/use-cooking-data'
import type {
    Recipe,
    RecipeWithIngredients,
} from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    CalendarDays,
    ChefHat,
    Expand,
    Filter,
    ImageIcon,
    Plus,
    Search,
    ShoppingCart,
    Snowflake,
    Star,
    X,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

type MobileTab = 'plan' | 'shopping' | 'recipes'

export default function CookingPage() {
  return (
    <CookingProvider>
      <Suspense>
        <CookingPageContent />
      </Suspense>
    </CookingProvider>
  )
}

function CookingPageContent() {
  const {
    recipes,
    sidebarOpen,
    setSidebarOpen,
    selectedRecipeId,
    setSelectedRecipeId,
    showEditor,
    setShowEditor,
    editingRecipe,
    setEditingRecipe,
    refreshRecipes,
    refreshMealPlan,
    showCookingMode,
    setShowCookingMode,
    cookingRecipe,
    setCookingRecipe,
    fridgeIngredients,
    fridgeFilterActive,
    setFridgeFilterActive,
  } = useCooking()

  // Refetch meal plan when user closes Assistant (e.g. after applying changes there)
  useOnAssistantClosed(refreshMealPlan)

  const searchParams = useSearchParams()
  const hydratedFromUrl = useRef(false)

  // ── Filter state ──
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [nutritionFilter, setNutritionFilter] = useState<string>('all')
  const [cardImageSize, setCardImageSize] = useState(160)
  const [showFridgeScanner, setShowFridgeScanner] = useState(false)
  const [showFridgeManager, setShowFridgeManager] = useState(false)
  const [showShoppingFocus, setShowShoppingFocus] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('plan')
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false)

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value)
      if (debounceTimer) clearTimeout(debounceTimer)
      const timer = setTimeout(() => setDebouncedSearch(value), 250)
      setDebounceTimer(timer)
    },
    [debounceTimer]
  )

  const hasActiveFilters =
    debouncedSearch || difficultyFilter !== 'all' || favoritesOnly || selectedCategories.size > 0 || fridgeFilterActive || nutritionFilter !== 'all'

  const clearAllFilters = useCallback(() => {
    setSearch('')
    setDebouncedSearch('')
    setDifficultyFilter('all')
    setFavoritesOnly(false)
    setSelectedCategories(new Set())
    setNutritionFilter('all')
    setFridgeFilterActive(false)
  }, [setFridgeFilterActive])

  // ── URL sync ──
  useEffect(() => {
    if (hydratedFromUrl.current) return
    const recipeParam = searchParams.get('recipe')
    if (recipeParam && recipes.length > 0) {
      setSelectedRecipeId(recipeParam)
    }
    hydratedFromUrl.current = true
  }, [searchParams, recipes, setSelectedRecipeId])

  const updateUrlParam = useCallback((key: string, value: string | null) => {
    const url = new URL(window.location.href)
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
    window.history.replaceState({}, '', url.toString())
  }, [])

  // ── Handlers ──
  const handleRecipeClick = useCallback(
    (recipe: Recipe) => {
      setSelectedRecipeId(recipe.id)
      updateUrlParam('recipe', recipe.id)
    },
    [setSelectedRecipeId, updateUrlParam]
  )

  const handleNewRecipe = useCallback(() => {
    setEditingRecipe(null)
    setShowEditor(true)
  }, [setEditingRecipe, setShowEditor])

  const handleEditRecipe = useCallback(
    (recipe: RecipeWithIngredients) => {
      setEditingRecipe(recipe)
      setShowEditor(true)
      setSelectedRecipeId(null)
      updateUrlParam('recipe', null)
    },
    [setEditingRecipe, setShowEditor, setSelectedRecipeId, updateUrlParam]
  )

  const handleSaveRecipe = useCallback(
    async (_recipe: RecipeWithIngredients) => {
      setShowEditor(false)
      setEditingRecipe(null)
      await refreshRecipes()
    },
    [setShowEditor, setEditingRecipe, refreshRecipes]
  )

  const handleCancelEdit = useCallback(() => {
    setShowEditor(false)
    setEditingRecipe(null)
  }, [setShowEditor, setEditingRecipe])

  const handleDeleteRecipe = useCallback(async () => {
    setSelectedRecipeId(null)
    updateUrlParam('recipe', null)
    await refreshRecipes()
  }, [setSelectedRecipeId, updateUrlParam, refreshRecipes])

  const handleStartCooking = useCallback(
    (recipe: RecipeWithIngredients) => {
      setCookingRecipe(recipe)
      setShowCookingMode(true)
      setSelectedRecipeId(null)
      updateUrlParam('recipe', null)
    },
    [setCookingRecipe, setShowCookingMode, setSelectedRecipeId, updateUrlParam]
  )

  const handleSidebarRecipeClick = useCallback(
    (recipeId: string) => {
      setSelectedRecipeId(recipeId)
      updateUrlParam('recipe', recipeId)
    },
    [setSelectedRecipeId, updateUrlParam]
  )

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

  // Search-filtered recipe counts by source
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

  const totalRecipeCount = recipes.length

  const { shoppingList } = useCooking()
  const shoppingItemCount = shoppingList?.items?.length ?? 0
  const activeFilterCount = [
    difficultyFilter !== 'all',
    nutritionFilter !== 'all',
    favoritesOnly,
    fridgeFilterActive,
    selectedCategories.size > 0,
  ].filter(Boolean).length

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        {/* ═══════════════════════════════════════════════════════ */}
        {/* ── MOBILE: Tab Navigation ── */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="md:hidden shrink-0 pt-2 pb-1">
          <div className="flex items-center gap-1 rounded-xl bg-muted/60">
            {([
              { key: 'plan' as MobileTab, label: 'Plan', icon: CalendarDays },
              { key: 'shopping' as MobileTab, label: 'Shop', icon: ShoppingCart, badge: shoppingItemCount > 0 ? shoppingItemCount : undefined },
              { key: 'recipes' as MobileTab, label: 'Recipes', icon: ChefHat, badge: totalRecipeCount > 0 ? totalRecipeCount : undefined },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-all touch-manipulation',
                  mobileTab === tab.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground active:bg-muted/80'
                )}
              >
                <tab.icon className="size-3.5" />
                <span>{tab.label}</span>
                {tab.badge != null && (
                  <span className={cn(
                    'text-[10px] tabular-nums',
                    mobileTab === tab.key ? 'text-muted-foreground' : 'opacity-50'
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ── MOBILE: Tab Content ── */}
        {/* ═══════════════════════════════════════════════════════ */}

        {/* Mobile: Meal Plan Tab */}
        <div className={cn('md:hidden flex-1 overflow-hidden', mobileTab !== 'plan' && 'hidden')}>
          <MobileMealPlanView onRecipeClick={handleSidebarRecipeClick} />
        </div>

        {/* Mobile: Shopping Tab */}
        <div className={cn('md:hidden flex-1 overflow-y-auto', mobileTab !== 'shopping' && 'hidden')}>
          <div className="p-3 space-y-3">
            <Button
              className="w-full h-12 gap-2 text-sm bg-accent-sage hover:bg-accent-sage/90 text-white rounded-xl"
              onClick={() => setShowShoppingFocus(true)}
            >
              <Expand className="size-4" />
              Open Shopping Mode
            </Button>
            <ShoppingCard
              onOpenFocusMode={() => setShowShoppingFocus(true)}
            />
          </div>
        </div>

        {/* Mobile: Recipes Tab */}
        <div className={cn('md:hidden flex-1 flex flex-col overflow-hidden', mobileTab !== 'recipes' && 'hidden')}>
          {/* Mobile recipe header */}
          <div className="shrink-0 px-3 pt-2 pb-2 space-y-2">
            {/* Search row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  placeholder="Search recipes..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={cn(
                    'h-10 pl-9 text-sm bg-card border-border/40 rounded-xl',
                    search && 'pr-9'
                  )}
                />
                {search && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <Button onClick={handleNewRecipe} size="icon" className="size-10 rounded-xl shrink-0">
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Source + filter toggle row */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border/40 p-0.5 bg-muted/30">
                {([
                  { value: 'all' as SourceFilter, label: 'All', count: searchFilteredCounts.mine + searchFilteredCounts.tj },
                  { value: 'my-recipes' as SourceFilter, label: 'Mine', count: searchFilteredCounts.mine },
                  { value: 'trader-joes' as SourceFilter, label: "TJ's", count: searchFilteredCounts.tj },
                ]).map((source) => (
                  <button
                    key={source.value}
                    onClick={() => { setSourceFilter(source.value); setSelectedCategories(new Set()) }}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-xs font-medium transition-all flex items-center gap-1 touch-manipulation',
                      sourceFilter === source.value
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    )}
                  >
                    <span>{source.label}</span>
                    <span className="tabular-nums text-[10px] opacity-60">{source.count}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              <button
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={cn(
                  'flex items-center justify-center size-9 rounded-lg transition-all touch-manipulation',
                        favoritesOnly
                          ? 'bg-accent-gold/15 text-accent-gold'
                          : 'text-muted-foreground active:bg-muted'
                )}
              >
                <Star className={cn('size-4', favoritesOnly && 'fill-accent-gold')} />
              </button>

              {fridgeIngredients.length > 0 && (
                <button
                  onClick={() => setShowFridgeManager(true)}
                  className={cn(
                    'flex items-center justify-center size-9 rounded-lg transition-all touch-manipulation',
                    fridgeFilterActive
                      ? 'bg-accent-sage/15 text-accent-sage'
                      : 'text-muted-foreground active:bg-muted'
                  )}
                >
                  <Snowflake className="size-4" />
                </button>
              )}

              <button
                onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
                className={cn(
                  'flex items-center justify-center size-9 rounded-lg transition-all touch-manipulation relative',
                  mobileFiltersExpanded || activeFilterCount > 0
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground active:bg-muted'
                )}
              >
                <Filter className="size-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Expandable filters */}
            <AnimatePresence>
              {mobileFiltersExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-1 pb-1">
                    {/* Selects row */}
                    <div className="flex items-center gap-2">
                      {categoriesWithCounts.length > 0 && (
                        <TagMultiSelect
                          tags={categoriesWithCounts}
                          selected={selectedCategories}
                          onSelectedChange={setSelectedCategories}
                          triggerClassName="h-9 text-xs"
                        />
                      )}
                      <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                        <SelectTrigger className="h-9 flex-1 text-xs bg-card border-border/40 rounded-lg">
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
                        <SelectTrigger className="h-9 flex-1 text-xs bg-card border-border/40 rounded-lg">
                          <SelectValue placeholder="Nutrition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Nutrition</SelectItem>
                          <SelectItem value="high-protein">High Protein</SelectItem>
                          <SelectItem value="low-carb">Low Carb</SelectItem>
                          <SelectItem value="low-calorie">Low Calorie</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="high-fiber">High Fiber</SelectItem>
                          <SelectItem value="post-workout">Post-Workout</SelectItem>
                          <SelectItem value="pre-workout-friendly">Pre-Workout</SelectItem>
                          <SelectItem value="rest-day">Rest Day</SelectItem>
                          <SelectItem value="recomp-friendly">Recomp Friendly</SelectItem>
                        </SelectContent>
                      </Select>

                      {hasActiveFilters && (
                        <button
                          onClick={clearAllFilters}
                          className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 px-2 py-1.5 rounded-lg active:bg-muted"
                        >
                          <X className="size-3.5" />
                          Clear
                        </button>
                      )}
                    </div>

                    <FridgeScanButton onClick={() => setShowFridgeScanner(true)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile recipe list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {showEditor ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <RecipeEditor
                  recipe={editingRecipe || undefined}
                  onSave={handleSaveRecipe}
                  onCancel={handleCancelEdit}
                />
              </motion.div>
            ) : (
              <RecipeList
                filters={filterState}
                onRecipeClick={handleRecipeClick}
                onNewRecipe={handleNewRecipe}
                cardImageSize={cardImageSize}
              />
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ── DESKTOP: Existing Layout ── */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="hidden md:block shrink-0">
          <HorizontalMealPlan onRecipeClick={handleSidebarRecipeClick} />
        </div>

        <div className="hidden md:flex flex-1 overflow-hidden pt-3">
          <div className="flex flex-1 overflow-hidden rounded-xl border border-border/50 bg-card">
            {/* Shopping list column - left side */}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="hidden shrink-0 flex-col border-r border-border/40 overflow-hidden lg:flex"
                  style={{ display: 'flex' }}
                >
                  <ScrollArea className="flex-1 min-h-0">
                    <ShoppingCard onOpenFocusMode={() => setShowShoppingFocus(true)} onCollapse={() => setSidebarOpen(false)} />
                  </ScrollArea>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Recipe area - main content */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              {/* ── Recipe Header: Search + Filters ── */}
              <div className="border-b border-border/40">
                {/* Row 1: Title + Search + Actions */}
                <div className="flex items-center gap-2.5 px-4 py-2">
                  {!sidebarOpen && (
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="flex items-center justify-center size-7 rounded-md transition-all shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Show shopping list"
                    >
                      <ShoppingCart className="size-3.5" />
                    </button>
                  )}

                  {/* <div className="flex items-center gap-1.5 shrink-0">
                    <ChefHat className="size-4 text-orange-500" />
                    <span className="text-xs font-bold">Recipes</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{totalRecipeCount}</span>
                  </div> */}

                  <div className="relative flex-1 min-w-0 max-w-lg">
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
                        className="w-20"
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

                    <Button onClick={handleNewRecipe} size="sm" className="h-8 gap-1.5 px-3">
                      <Plus className="size-3.5" />
                      <span className="hidden sm:inline text-xs">New Recipe</span>
                    </Button>
                  </div>
                </div>

                {/* Row 2: Filter Bar */}
                <div className="flex items-center gap-2 px-4 py-1.5 border-t border-border/20">
                  <div className="flex items-center rounded-lg border border-border/40 p-0.5 shrink-0 bg-muted/30">
                    {([
                      { value: 'all' as SourceFilter, label: 'All', count: searchFilteredCounts.mine + searchFilteredCounts.tj },
                      { value: 'my-recipes' as SourceFilter, label: 'Mine', count: searchFilteredCounts.mine },
                      { value: 'trader-joes' as SourceFilter, label: "TJ's", count: searchFilteredCounts.tj },
                    ]).map((source) => (
                      <button
                        key={source.value}
                        onClick={() => { setSourceFilter(source.value); setSelectedCategories(new Set()) }}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1.5',
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
                    <SelectTrigger className="h-7 w-[110px] text-xs shrink-0 bg-muted/30 border-border/40">
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
                    <SelectTrigger className="h-7 w-[130px] text-xs shrink-0 bg-muted/30 border-border/40">
                      <SelectValue placeholder="Nutrition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Nutrition</SelectItem>
                      <SelectItem value="high-protein">High Protein</SelectItem>
                      <SelectItem value="low-carb">Low Carb</SelectItem>
                      <SelectItem value="low-calorie">Low Calorie</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="high-fiber">High Fiber</SelectItem>
                      <SelectItem value="post-workout">Post-Workout</SelectItem>
                      <SelectItem value="pre-workout-friendly">Pre-Workout</SelectItem>
                      <SelectItem value="rest-day">Rest Day</SelectItem>
                      <SelectItem value="recomp-friendly">Recomp Friendly</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <X className="size-3" />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ── Recipe List (scrollable) ── */}
              <main className="flex-1 overflow-y-auto">
                <div className="p-3">
                  {showEditor ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <RecipeEditor
                        recipe={editingRecipe || undefined}
                        onSave={handleSaveRecipe}
                        onCancel={handleCancelEdit}
                      />
                    </motion.div>
                  ) : (
                    <RecipeList
                      filters={filterState}
                      onRecipeClick={handleRecipeClick}
                      onNewRecipe={handleNewRecipe}
                      cardImageSize={cardImageSize}
                    />
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      {/* ── Overlay sheets/dialogs ── */}
      <RecipeDetailSheet
        recipeId={selectedRecipeId}
        open={!!selectedRecipeId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecipeId(null)
            updateUrlParam('recipe', null)
          }
        }}
        onEdit={handleEditRecipe}
        onDelete={handleDeleteRecipe}
        onStartCooking={handleStartCooking}
      />

      <FridgeScanner
        open={showFridgeScanner}
        onOpenChange={setShowFridgeScanner}
      />

      <ShoppingFocusMode
        open={showShoppingFocus}
        onClose={() => setShowShoppingFocus(false)}
      />

      <FridgeManager
        open={showFridgeManager}
        onOpenChange={setShowFridgeManager}
        onOpenScanner={() => setShowFridgeScanner(true)}
      />

      <AnimatePresence>
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
      </AnimatePresence>
    </>
  )
}
