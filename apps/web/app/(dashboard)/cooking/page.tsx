'use client'

import { CookingMode } from '@/components/cooking/cooking-mode'
import { HorizontalMealPlan, ShoppingCard } from '@/components/cooking/cooking-sidebar'
import { FridgeManager } from '@/components/cooking/fridge-manager'
import { FridgeScanButton, FridgeScanner } from '@/components/cooking/fridge-scanner'
import { ImportRecipeDialog } from '@/components/cooking/import-recipe-dialog'
import { RecipeDetailSheet } from '@/components/cooking/recipe-detail'
import { RecipeEditor } from '@/components/cooking/recipe-editor'
import type { SourceFilter } from '@/components/cooking/recipe-list'
import { RecipeList } from '@/components/cooking/recipe-list'
import { ShoppingFocusMode } from '@/components/cooking/shopping-focus-mode'
import { TraderJoesDetailSheet } from '@/components/cooking/trader-joes-detail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { CookingProvider, useCooking } from '@/hooks/use-cooking-data'
import type {
    Recipe,
    RecipeWithIngredients,
    TraderJoesRecipe,
} from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    ChefHat,
    Plus,
    Search,
    ShoppingCart,
    Snowflake,
    Star,
    X,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
    tjRecipes,
    sidebarOpen,
    setSidebarOpen,
    selectedRecipeId,
    setSelectedRecipeId,
    selectedTjRecipe,
    setSelectedTjRecipe,
    showEditor,
    setShowEditor,
    editingRecipe,
    setEditingRecipe,
    refreshRecipes,
    showCookingMode,
    setShowCookingMode,
    cookingRecipe,
    setCookingRecipe,
    fridgeIngredients,
    fridgeFilterActive,
    setFridgeFilterActive,
  } = useCooking()

  const searchParams = useSearchParams()
  const [importRecipe, setImportRecipe] = useState<TraderJoesRecipe | null>(null)
  const hydratedFromUrl = useRef(false)

  // ── Filter state ──
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set())
  const [showFridgeScanner, setShowFridgeScanner] = useState(false)
  const [showFridgeManager, setShowFridgeManager] = useState(false)
  const [showShoppingFocus, setShowShoppingFocus] = useState(false)

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
    debouncedSearch || difficultyFilter !== 'all' || favoritesOnly || selectedCategory || excludedCategories.size > 0 || fridgeFilterActive

  const clearAllFilters = useCallback(() => {
    setSearch('')
    setDebouncedSearch('')
    setDifficultyFilter('all')
    setFavoritesOnly(false)
    setSelectedCategory('')
    setExcludedCategories(new Set())
    setFridgeFilterActive(false)
  }, [setFridgeFilterActive])

  // ── URL sync ──
  useEffect(() => {
    if (hydratedFromUrl.current) return
    const recipeParam = searchParams.get('recipe')
    const tjParam = searchParams.get('tj')
    if (recipeParam && recipes.length > 0) {
      setSelectedRecipeId(recipeParam)
      hydratedFromUrl.current = true
    } else if (tjParam && tjRecipes.length > 0) {
      const found = tjRecipes.find((r) => r.id === tjParam)
      if (found) setSelectedTjRecipe(found)
      hydratedFromUrl.current = true
    } else if (!recipeParam && !tjParam) {
      hydratedFromUrl.current = true
    }
  }, [searchParams, recipes, tjRecipes, setSelectedRecipeId, setSelectedTjRecipe])

  const updateUrlParam = useCallback((key: string, value: string | null) => {
    const url = new URL(window.location.href)
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
    if (key === 'recipe') url.searchParams.delete('tj')
    if (key === 'tj') url.searchParams.delete('recipe')
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

  const handleTjRecipeClick = useCallback(
    (recipe: TraderJoesRecipe) => {
      setSelectedTjRecipe(recipe)
      updateUrlParam('tj', recipe.id)
    },
    [setSelectedTjRecipe, updateUrlParam]
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

  const handleImportTj = useCallback((recipe: TraderJoesRecipe) => {
    setImportRecipe(recipe)
  }, [])

  const handleImportComplete = useCallback(
    async (_imported: RecipeWithIngredients) => {
      setImportRecipe(null)
      setSelectedTjRecipe(null)
      updateUrlParam('tj', null)
      await refreshRecipes()
    },
    [setSelectedTjRecipe, updateUrlParam, refreshRecipes]
  )

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
    selectedCategory,
    setSelectedCategory,
    excludedCategories,
  }

  // Search-filtered recipe sets (reused for counts + categories)
  const searchFilteredTj = useMemo(() => {
    let filtered = tjRecipes
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.recipe_data.description?.toLowerCase().includes(lower) ||
          r.recipe_data.ingredients?.some((i) => i.toLowerCase().includes(lower)) ||
          r.recipe_data.tags?.some((t) => t.toLowerCase().includes(lower)) ||
          r.category?.toLowerCase().includes(lower) ||
          r.recipe_data.categories?.some((c) => c.toLowerCase().includes(lower)) ||
          r.url?.toLowerCase().includes(lower) ||
          r.recipe_data.instructions?.some((s) => s.toLowerCase().includes(lower))
      )
    }
    if (excludedCategories.size > 0) {
      filtered = filtered.filter((r) => {
        const recipeCats = [
          ...(r.category ? [r.category.toLowerCase()] : []),
          ...(r.recipe_data.categories?.map((c) => c.toLowerCase()) || []),
        ]
        return !recipeCats.some((c) => excludedCategories.has(c))
      })
    }
    return filtered
  }, [tjRecipes, debouncedSearch, excludedCategories])

  const searchFilteredMineCount = useMemo(() => {
    if (!debouncedSearch) return recipes.length
    const lower = debouncedSearch.toLowerCase()
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.description?.toLowerCase().includes(lower) ||
        r.tags?.some((t) => t.toLowerCase().includes(lower))
    ).length
  }, [recipes, debouncedSearch])

  const searchFilteredCounts = useMemo(() => ({
    mine: searchFilteredMineCount,
    tj: searchFilteredTj.length,
  }), [searchFilteredMineCount, searchFilteredTj])

  // Category options with counts (from search-filtered TJ recipes)
  const categoriesWithCounts = useMemo(() => {
    const cats = new Map<string, number>()
    searchFilteredTj.forEach((r) => {
      r.recipe_data.categories?.forEach((c) => {
        cats.set(c, (cats.get(c) || 0) + 1)
      })
    })
    return Array.from(cats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
  }, [searchFilteredTj])

  const totalRecipeCount = recipes.length + tjRecipes.length

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        {/* ── Horizontal Meal Plan (focal point) ── */}
        <HorizontalMealPlan onRecipeClick={handleSidebarRecipeClick} />

        {/* ── Content: Shopping List + Recipes (card) ── */}
        <div className="flex flex-1 overflow-hidden px-3 pt-3">
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
                    <div className="p-3">
                      <ShoppingCard onOpenFocusMode={() => setShowShoppingFocus(true)} onCollapse={() => setSidebarOpen(false)} />
                    </div>
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
                  {/* Shopping list toggle (only when sidebar is hidden) */}
                  {!sidebarOpen && (
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="flex items-center justify-center size-7 rounded-md transition-all shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Show shopping list"
                    >
                      <ShoppingCart className="size-3.5" />
                    </button>
                  )}

                  {/* Title - compact inline */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ChefHat className="size-4 text-orange-500" />
                    <span className="text-xs font-bold">Recipes</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{totalRecipeCount}</span>
                  </div>

                  {/* Search */}
                  <div className="relative flex-1 min-w-0 max-w-lg">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      placeholder="Search recipes, ingredients, tags..."
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      className={cn(
                        'h-8 pl-8 text-xs bg-background/50 border-border/40 focus-visible:bg-background focus-visible:border-border',
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

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    <button
                      onClick={() => setFavoritesOnly(!favoritesOnly)}
                      className={cn(
                        'flex items-center justify-center size-8 rounded-lg transition-all',
                        favoritesOnly
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                      title="Favorites"
                    >
                      <Star className={cn('size-3.5', favoritesOnly && 'fill-amber-500')} />
                    </button>

                    {fridgeIngredients.length > 0 && (
                      <button
                        onClick={() => setShowFridgeManager(true)}
                        className={cn(
                          'flex items-center justify-center size-8 rounded-lg transition-all',
                          fridgeFilterActive
                            ? 'bg-green-500/15 text-green-500'
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
                  {/* Source toggle pills */}
                  <div className="flex items-center rounded-lg border border-border/40 p-0.5 shrink-0 bg-muted/30">
                    {([
                      { value: 'all' as SourceFilter, label: 'All', count: searchFilteredCounts.mine + searchFilteredCounts.tj },
                      { value: 'my-recipes' as SourceFilter, label: 'Mine', count: searchFilteredCounts.mine },
                      { value: 'trader-joes' as SourceFilter, label: "TJ's", count: searchFilteredCounts.tj },
                    ]).map((source) => (
                      <button
                        key={source.value}
                        onClick={() => { setSourceFilter(source.value); setSelectedCategory('') }}
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

                  <div className="h-5 w-px bg-border/40 shrink-0" />

                  {/* Category chips */}
                  <ScrollArea className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 pb-0.5">
                      {categoriesWithCounts.map(([cat, count]) => {
                        const isSelected = selectedCategory === cat
                        const isExcluded = excludedCategories.has(cat.toLowerCase())
                        return (
                          <button
                            key={cat}
                            onClick={(e) => {
                              if (e.shiftKey) {
                                // Shift+click: toggle exclude
                                setExcludedCategories((prev) => {
                                  const next = new Set(prev)
                                  const key = cat.toLowerCase()
                                  if (next.has(key)) next.delete(key)
                                  else next.add(key)
                                  return next
                                })
                                // Clear include if this category was selected
                                if (isSelected) setSelectedCategory('')
                              } else {
                                // Normal click: toggle include (and remove from excluded if it was)
                                if (isExcluded) {
                                  setExcludedCategories((prev) => {
                                    const next = new Set(prev)
                                    next.delete(cat.toLowerCase())
                                    return next
                                  })
                                } else {
                                  setSelectedCategory(isSelected ? '' : cat)
                                }
                              }
                            }}
                            className={cn(
                              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
                              isExcluded
                                ? 'bg-red-500/10 text-red-400/70 line-through decoration-red-400/50'
                                : isSelected
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                            title={isExcluded ? `Click to include "${cat}" again` : `Shift+click to hide "${cat}"`}
                          >
                            {isExcluded && <span className="text-[10px] leading-none">−</span>}
                            <span>{cat}</span>
                            <span className={cn(
                              'tabular-nums text-[10px]',
                              isExcluded ? 'opacity-50' : isSelected ? 'opacity-70' : 'opacity-50'
                            )}>
                              {count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <ScrollBar orientation="horizontal" className="h-1.5" />
                  </ScrollArea>

                  <div className="h-5 w-px bg-border/40 shrink-0" />

                  {/* Difficulty */}
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
                      onTjRecipeClick={handleTjRecipeClick}
                      onNewRecipe={handleNewRecipe}
                      onImportTj={handleImportTj}
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

      <TraderJoesDetailSheet
        recipe={selectedTjRecipe}
        open={!!selectedTjRecipe}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTjRecipe(null)
            updateUrlParam('tj', null)
          }
        }}
        onImport={handleImportTj}
      />

      {importRecipe && (
        <ImportRecipeDialog
          open={!!importRecipe}
          onOpenChange={(open) => {
            if (!open) setImportRecipe(null)
          }}
          recipe={importRecipe}
          onImportComplete={handleImportComplete}
        />
      )}

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
