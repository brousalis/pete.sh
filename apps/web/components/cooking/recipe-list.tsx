'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useCooking } from '@/hooks/use-cooking-data'
import { staggerContainerVariants, staggerItemVariants, transitions } from '@/lib/animations'
import type { Recipe, TraderJoesRecipe } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    ChefHat,
    Clock,
    Download,
    ExternalLink,
    Plus,
    Search,
    Shuffle,
    SlidersHorizontal,
    Snowflake,
    Users,
    X,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { FridgeScanButton, FridgeScanner } from './fridge-scanner'
import { RecipeCard, RecipeCardSkeleton } from './recipe-card'

type SourceFilter = 'all' | 'my-recipes' | 'trader-joes'

interface RecipeListProps {
  onRecipeClick?: (recipe: Recipe) => void
  onTjRecipeClick?: (recipe: TraderJoesRecipe) => void
  onNewRecipe?: () => void
  onImportTj?: (recipe: TraderJoesRecipe) => void
  className?: string
}

export function RecipeList({
  onRecipeClick,
  onTjRecipeClick,
  onNewRecipe,
  onImportTj,
  className,
}: RecipeListProps) {
  const {
    recipes,
    tjRecipes,
    recipesLoading,
    tjRecipesLoading,
    fridgeIngredients,
    fridgeFilterActive,
    setFridgeFilterActive,
    latestScan,
  } = useCooking()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [showFridgeScanner, setShowFridgeScanner] = useState(false)

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

  const tjCategories = useMemo(() => {
    const cats = new Map<string, number>()
    tjRecipes.forEach((r) => {
      r.recipe_data.categories?.forEach((c) => {
        cats.set(c, (cats.get(c) || 0) + 1)
      })
    })
    return Array.from(cats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
  }, [tjRecipes])

  const [randomSeed, setRandomSeed] = useState(0)
  const randomTjRecipe = useMemo(() => {
    if (tjRecipes.length === 0) return null
    const idx = (Date.now() + randomSeed) % tjRecipes.length
    return tjRecipes[idx]
  }, [tjRecipes, randomSeed])

  const filteredRecipes = useMemo(() => {
    if (sourceFilter === 'trader-joes') return []
    let filtered = [...recipes]
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.description?.toLowerCase().includes(lower) ||
          r.tags?.some((t) => t.toLowerCase().includes(lower))
      )
    }
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter((r) => r.difficulty === difficultyFilter)
    }
    if (favoritesOnly) {
      filtered = filtered.filter((r) => r.is_favorite)
    }
    return filtered
  }, [recipes, debouncedSearch, sourceFilter, difficultyFilter, favoritesOnly])

  const filteredTjRecipes = useMemo(() => {
    if (sourceFilter === 'my-recipes') return []
    let filtered = [...tjRecipes]
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.recipe_data.description?.toLowerCase().includes(lower) ||
          r.recipe_data.ingredients?.some((i) =>
            i.toLowerCase().includes(lower)
          ) ||
          r.recipe_data.tags?.some((t) => t.toLowerCase().includes(lower))
      )
    }
    if (selectedCategory) {
      filtered = filtered.filter(
        (r) =>
          r.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          r.recipe_data.categories?.some(
            (c) => c.toLowerCase() === selectedCategory.toLowerCase()
          )
      )
    }
    return filtered
  }, [tjRecipes, debouncedSearch, sourceFilter, selectedCategory])

  // Fridge ingredient matching
  const fridgeMatchScores = useMemo(() => {
    if (!fridgeFilterActive || fridgeIngredients.length === 0) return new Map<string, number>()

    const scores = new Map<string, number>()
    const fridgeTokens = fridgeIngredients.map((item) => tokenizeIngredient(item))

    // Score TJ recipes
    for (const recipe of filteredTjRecipes) {
      const ingredients = recipe.recipe_data.ingredients || []
      if (ingredients.length === 0) continue
      let matched = 0
      for (const fridgeItem of fridgeTokens) {
        if (ingredients.some((ing) => ingredientMatches(fridgeItem, tokenizeIngredient(ing)))) {
          matched++
        }
      }
      const score = matched / ingredients.length
      scores.set(`tj-${recipe.id}`, score)
    }

    // Score own recipes by name matching (no ingredients loaded in list view)
    for (const recipe of filteredRecipes) {
      const nameLower = recipe.name.toLowerCase()
      let matchCount = 0
      for (const fridgeItem of fridgeTokens) {
        if (fridgeItem.some((token) => nameLower.includes(token))) {
          matchCount++
        }
      }
      scores.set(`own-${recipe.id}`, matchCount > 0 ? matchCount / Math.max(fridgeIngredients.length, 1) : 0)
    }

    return scores
  }, [fridgeFilterActive, fridgeIngredients, filteredTjRecipes, filteredRecipes])

  // Tiered results when fridge filter is active
  type ScoredItem = { type: 'own'; recipe: Recipe; score: number } | { type: 'tj'; recipe: TraderJoesRecipe; score: number }
  const { readyToCook, almostThere, otherRecipes } = useMemo(() => {
    if (!fridgeFilterActive) {
      return { readyToCook: [] as ScoredItem[], almostThere: [] as ScoredItem[], otherRecipes: [] as ScoredItem[] }
    }
    const allItems: ScoredItem[] = []

    for (const r of filteredRecipes) {
      allItems.push({ type: 'own', recipe: r, score: fridgeMatchScores.get(`own-${r.id}`) || 0 })
    }
    for (const r of filteredTjRecipes) {
      allItems.push({ type: 'tj', recipe: r, score: fridgeMatchScores.get(`tj-${r.id}`) || 0 })
    }

    allItems.sort((a, b) => b.score - a.score)

    const ready = allItems.filter((i) => i.score >= 0.8)
    const almost = allItems.filter((i) => i.score >= 0.5 && i.score < 0.8)
    const other = allItems.filter((i) => i.score < 0.5 && i.score > 0)

    return { readyToCook: ready, almostThere: almost, otherRecipes: other }
  }, [fridgeFilterActive, filteredRecipes, filteredTjRecipes, fridgeMatchScores])

  const isLoading =
    (sourceFilter !== 'trader-joes' && recipesLoading) ||
    (sourceFilter !== 'my-recipes' && tjRecipesLoading)
  const totalResults = filteredRecipes.length + filteredTjRecipes.length
  const hasActiveFilters =
    debouncedSearch || difficultyFilter !== 'all' || favoritesOnly || selectedCategory || fridgeFilterActive

  const showDiscovery =
    sourceFilter !== 'my-recipes' && !debouncedSearch && !selectedCategory

  return (
    <div className={className}>
      {/* Source toggle + Search */}
      <div className="space-y-3">
        {/* Source toggle - pill style */}
        <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-1">
          {(
            [
              { value: 'all', label: 'All', count: recipes.length + tjRecipes.length },
              { value: 'my-recipes', label: 'My Recipes', count: recipes.length },
              { value: 'trader-joes', label: "Trader Joe's", count: tjRecipes.length },
            ] as const
          ).map((source) => (
            <button
              key={source.value}
              onClick={() => {
                setSourceFilter(source.value)
                setSelectedCategory('')
              }}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                sourceFilter === source.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {source.label}
              <span className={cn(
                'ml-1.5 text-xs tabular-nums',
                sourceFilter === source.value
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/60'
              )}>
                {source.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recipes, ingredients, tags..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <FridgeScanButton onClick={() => setShowFridgeScanner(true)} />
          <Button
            variant="outline"
            size="icon"
            className={cn('size-9 shrink-0', showFilters && 'bg-muted border-muted-foreground/30')}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
          {onNewRecipe && (
            <Button onClick={onNewRecipe} size="icon" className="size-9 shrink-0">
              <Plus className="size-4" />
            </Button>
          )}
        </div>

        {/* My Fridge toggle */}
        {latestScan && fridgeIngredients.length > 0 && (
          <button
            onClick={() => setFridgeFilterActive(!fridgeFilterActive)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border',
              fridgeFilterActive
                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            )}
          >
            <Snowflake className="size-3.5" />
            My Fridge ({fridgeIngredients.length})
            {fridgeFilterActive && (
              <X className="size-3 ml-0.5" />
            )}
          </button>
        )}

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={transitions.smooth}
              className="overflow-hidden"
            >
              <div className="rounded-lg border bg-card/50 p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      Difficulty
                    </label>
                    <Select
                      value={difficultyFilter}
                      onValueChange={setDifficultyFilter}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant={favoritesOnly ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFavoritesOnly(!favoritesOnly)}
                      className="h-8 text-xs w-full"
                    >
                      Favorites Only
                    </Button>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setDebouncedSearch('')
                      setDifficultyFilter('all')
                      setFavoritesOnly(false)
                      setSelectedCategory('')
                    }}
                    className="h-7 text-xs"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5">
            {debouncedSearch && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                &ldquo;{debouncedSearch}&rdquo;
                <button
                  onClick={() => { setSearch(''); setDebouncedSearch('') }}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {difficultyFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                {difficultyFilter}
                <button
                  onClick={() => setDifficultyFilter('all')}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {favoritesOnly && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                Favorites
                <button
                  onClick={() => setFavoritesOnly(false)}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                {selectedCategory}
                <button
                  onClick={() => setSelectedCategory('')}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {fridgeFilterActive && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1 bg-green-500/10 text-green-600 border-green-500/20">
                <Snowflake className="size-3" />
                Fridge filter
                <button
                  onClick={() => setFridgeFilterActive(false)}
                  className="rounded-full p-0.5 hover:bg-green-500/20"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Discovery section */}
      {showDiscovery && tjCategories.length > 0 && (
        <div className="mt-4 space-y-3">
          {/* Category pills */}
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 pb-2">
              {tjCategories.map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary"
                >
                  {cat}
                  <span className="ml-1 text-muted-foreground text-[10px]">
                    {count}
                  </span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Try Something New */}
          {randomTjRecipe && (
            <div
              className="group relative overflow-hidden rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md hover:border-border"
              onClick={() => onTjRecipeClick?.(randomTjRecipe)}
            >
              <div className="flex gap-0">
                {/* Image side */}
                <div className="relative w-28 shrink-0 overflow-hidden">
                  {resolveRecipeImageUrl(randomTjRecipe.image_url) ? (
                    <img
                      src={resolveRecipeImageUrl(randomTjRecipe.image_url)}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                      <ChefHat className="size-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Content side */}
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shuffle className="size-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                      Try Something New
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold line-clamp-1">
                    {randomTjRecipe.name}
                  </h4>
                  {randomTjRecipe.recipe_data.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {randomTjRecipe.recipe_data.description}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 mt-1.5 -ml-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      setRandomSeed((s) => s + 1)
                    }}
                  >
                    <Shuffle className="size-3 mr-1" />
                    Shuffle
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground mt-3 mb-1">
          {totalResults} recipe{totalResults !== 1 ? 's' : ''}
          {selectedCategory && ` in ${selectedCategory}`}
        </p>
      )}

      {/* Recipe grid */}
      <div className="mt-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : fridgeFilterActive && (readyToCook.length > 0 || almostThere.length > 0) ? (
          /* Tiered fridge results */
          <div className="space-y-6">
            {readyToCook.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-2 rounded-full bg-green-500" />
                  <h3 className="text-sm font-semibold text-green-600">
                    Ready to Cook
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    80%+ ingredients matched
                  </span>
                </div>
                <motion.div
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                >
                  {readyToCook.map((item) => (
                    <motion.div key={`${item.type}-${item.recipe.id}`} variants={staggerItemVariants}>
                      {item.type === 'own' ? (
                        <RecipeCard
                          recipe={item.recipe}
                          onClick={() => onRecipeClick?.(item.recipe as Recipe)}
                          fridgeScore={item.score}
                          fridgeFilterActive={fridgeFilterActive}
                        />
                      ) : (
                        <TjRecipeCard
                          recipe={item.recipe as TraderJoesRecipe}
                          onClick={() => onTjRecipeClick?.(item.recipe as TraderJoesRecipe)}
                          onImport={() => onImportTj?.(item.recipe as TraderJoesRecipe)}
                          fridgeScore={item.score}
                          fridgeFilterActive={fridgeFilterActive}
                        />
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {almostThere.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-2 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-semibold text-amber-600">
                    Almost There
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    50-79% ingredients matched
                  </span>
                </div>
                <motion.div
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                >
                  {almostThere.map((item) => (
                    <motion.div key={`${item.type}-${item.recipe.id}`} variants={staggerItemVariants}>
                      {item.type === 'own' ? (
                        <RecipeCard
                          recipe={item.recipe}
                          onClick={() => onRecipeClick?.(item.recipe as Recipe)}
                          fridgeScore={item.score}
                          fridgeFilterActive={fridgeFilterActive}
                        />
                      ) : (
                        <TjRecipeCard
                          recipe={item.recipe as TraderJoesRecipe}
                          onClick={() => onTjRecipeClick?.(item.recipe as TraderJoesRecipe)}
                          onImport={() => onImportTj?.(item.recipe as TraderJoesRecipe)}
                          fridgeScore={item.score}
                          fridgeFilterActive={fridgeFilterActive}
                        />
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {otherRecipes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-2 rounded-full bg-muted-foreground/30" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Other Matches
                  </h3>
                </div>
                <motion.div
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                >
                  {otherRecipes.map((item) => (
                    <motion.div key={`${item.type}-${item.recipe.id}`} variants={staggerItemVariants}>
                      {item.type === 'own' ? (
                        <RecipeCard
                          recipe={item.recipe}
                          onClick={() => onRecipeClick?.(item.recipe as Recipe)}
                          fridgeScore={item.score}
                          fridgeFilterActive={fridgeFilterActive}
                        />
                      ) : (
                        <TjRecipeCard
                          recipe={item.recipe as TraderJoesRecipe}
                          onClick={() => onTjRecipeClick?.(item.recipe as TraderJoesRecipe)}
                          onImport={() => onImportTj?.(item.recipe as TraderJoesRecipe)}
                          fridgeScore={item.score}
                          fridgeFilterActive={fridgeFilterActive}
                        />
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {readyToCook.length === 0 && almostThere.length === 0 && otherRecipes.length === 0 && (
              <div className="py-16 text-center">
                <Snowflake className="size-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No recipes match your fridge items
                </p>
                <Button
                  onClick={() => setFridgeFilterActive(false)}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Clear fridge filter
                </Button>
              </div>
            )}
          </div>
        ) : totalResults === 0 ? (
          <div className="py-16 text-center">
            <ChefHat className="size-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'No recipes match your filters'
                : 'No recipes yet'}
            </p>
            {onNewRecipe && !hasActiveFilters && sourceFilter !== 'trader-joes' && (
              <Button
                onClick={onNewRecipe}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <Plus className="size-4 mr-2" />
                Create your first recipe
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            {/* Own recipes first */}
            {filteredRecipes.map((recipe) => (
              <motion.div key={`own-${recipe.id}`} variants={staggerItemVariants}>
                <RecipeCard
                  recipe={recipe}
                  onClick={() => onRecipeClick?.(recipe)}
                />
              </motion.div>
            ))}

            {/* TJ recipes */}
            {filteredTjRecipes.map((recipe) => (
              <motion.div key={`tj-${recipe.id}`} variants={staggerItemVariants}>
                <TjRecipeCard
                  recipe={recipe}
                  onClick={() => onTjRecipeClick?.(recipe)}
                  onImport={() => onImportTj?.(recipe)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Fridge Scanner Sheet */}
      <FridgeScanner
        open={showFridgeScanner}
        onOpenChange={setShowFridgeScanner}
      />
    </div>
  )
}

// Ingredient matching utilities
const SKIP_WORDS = new Set([
  'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'lbs', 'g', 'ml', 'kg',
  'box', 'jar', 'can', 'package', 'bag', 'bunch', 'head', 'piece', 'pieces',
  'small', 'medium', 'large', 'fresh', 'frozen', 'dried', 'chopped', 'diced',
  'sliced', 'minced', 'ground', 'boneless', 'skinless', 'to', 'of', 'and',
  'or', 'a', 'an', 'the', 'for', 'with', 'about', 'approximately',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
  '½', '¼', '¾', '⅓', '⅔', '⅛',
])

function tokenizeIngredient(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !SKIP_WORDS.has(word))
}

function ingredientMatches(fridgeTokens: string[], recipeTokens: string[]): boolean {
  if (fridgeTokens.length === 0 || recipeTokens.length === 0) return false
  return fridgeTokens.some((ft) =>
    recipeTokens.some((rt) => rt.includes(ft) || ft.includes(rt))
  )
}

function TjRecipeCard({
  recipe,
  onClick,
  onImport,
  fridgeScore,
  fridgeFilterActive: isFridgeActive,
}: {
  recipe: TraderJoesRecipe
  onClick?: () => void
  onImport?: () => void
  fridgeScore?: number
  fridgeFilterActive?: boolean
}) {
  const resolvedImage = resolveRecipeImageUrl(recipe.image_url)

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={transitions.springGentle}
    >
      <Card
        className="group cursor-pointer overflow-hidden border-border/50 transition-all hover:shadow-lg hover:border-border"
        onClick={onClick}
      >
        <CardContent className="p-0">
          <div className="relative aspect-[16/10] w-full overflow-hidden">
            {resolvedImage ? (
              <img
                src={resolvedImage}
                alt={recipe.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500/10 to-orange-500/10">
                <ChefHat className="size-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <Badge className="bg-red-600 text-white text-[10px] h-5 px-1.5 border-0 shadow-md">
                TJ&apos;s
              </Badge>
              {isFridgeActive && fridgeScore != null && fridgeScore > 0 && (
                <FridgeMatchBadge score={fridgeScore} />
              )}
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-2.5 pb-2">
              <div className="flex items-center gap-1.5">
                {recipe.recipe_data.prep_time && (
                  <Badge className="bg-black/40 text-white backdrop-blur-sm border-0 text-[10px] h-5 shadow-sm">
                    <Clock className="size-2.5 mr-0.5" />
                    {recipe.recipe_data.prep_time}m
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                className="h-6 text-[10px] px-2 bg-white/90 text-black hover:bg-white backdrop-blur-sm shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onImport?.()
                }}
              >
                <Download className="size-3 mr-1" />
                Import
              </Button>
            </div>
          </div>

          <div className="space-y-1 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug line-clamp-1 flex-1">
                {recipe.name}
              </h3>
              {recipe.url && (
                <a
                  href={recipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>

            {recipe.recipe_data.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {recipe.recipe_data.description}
              </p>
            )}

            <div className="flex items-center gap-1.5 pt-0.5">
              {recipe.recipe_data.servings && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <Users className="size-2.5" />
                  {recipe.recipe_data.servings}
                </span>
              )}
              {recipe.recipe_data.categories &&
                recipe.recipe_data.categories.length > 0 && (
                  <>
                    {recipe.recipe_data.categories.slice(0, 2).map((cat) => (
                      <Badge
                        key={cat}
                        variant="secondary"
                        className="text-[10px] h-4 px-1.5 font-normal"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function FridgeMatchBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-muted-foreground'
  const bgColor = pct >= 80 ? 'bg-green-900/80' : pct >= 50 ? 'bg-amber-900/80' : 'bg-black/50'

  return (
    <div className={cn('flex items-center gap-1 rounded-full px-1.5 py-0.5 backdrop-blur-sm shadow-sm', bgColor)}>
      {/* Mini circular progress */}
      <svg className="size-3.5" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20" />
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${score * 37.7} 37.7`}
          strokeDashoffset="0"
          transform="rotate(-90 8 8)"
          className={color}
          strokeLinecap="round"
        />
      </svg>
      <span className={cn('text-[10px] font-semibold', color)}>
        {pct}%
      </span>
    </div>
  )
}
