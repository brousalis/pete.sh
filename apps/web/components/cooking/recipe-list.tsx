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
import { transitions } from '@/lib/animations'
import type { Recipe, TraderJoesRecipe } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    ChefHat,
    ChevronDown,
    Clock,
    Download,
    ExternalLink,
    Plus,
    Search,
    Shuffle,
    SlidersHorizontal,
    Snowflake,
    Star,
    Users,
    X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FridgeManager } from './fridge-manager'
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
  const [showFridgeManager, setShowFridgeManager] = useState(false)
  const [displayCount, setDisplayCount] = useState(30)

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

  const visibleTjRecipes = useMemo(
    () => filteredTjRecipes.slice(0, displayCount),
    [filteredTjRecipes, displayCount]
  )
  const hasMoreRecipes = filteredTjRecipes.length > displayCount

  useEffect(() => {
    setDisplayCount(30)
  }, [debouncedSearch, sourceFilter, selectedCategory, difficultyFilter, favoritesOnly, fridgeFilterActive])

  const showDiscovery =
    sourceFilter !== 'my-recipes' && !debouncedSearch && !selectedCategory

  return (
    <div className={cn('space-y-3', className)}>
      {/* ── Unified Toolbar ── */}
      <div className="sticky top-0 z-10 pt-1 pb-3 bg-muted/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recipes, ingredients, tags..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-9 pl-9 text-sm rounded-lg bg-background/60 border-border/50 focus-visible:bg-background"
            />
          </div>

          <div className="flex items-center rounded-lg border border-border/50 p-0.5 shrink-0">
            {([
              { value: 'all' as const, label: 'All' },
              { value: 'my-recipes' as const, label: 'Mine' },
              { value: 'trader-joes' as const, label: "TJ's" },
            ]).map((source) => (
              <button
                key={source.value}
                onClick={() => { setSourceFilter(source.value); setSelectedCategory('') }}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                  sourceFilter === source.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {source.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={cn(
              'flex items-center justify-center size-9 rounded-lg border transition-all shrink-0',
              favoritesOnly
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
            )}
            title="Favorites"
          >
            <Star className={cn('size-3.5', favoritesOnly && 'fill-amber-500')} />
          </button>

          {fridgeIngredients.length > 0 && (
            <button
              onClick={() => setShowFridgeManager(true)}
              className={cn(
                'flex items-center justify-center size-9 rounded-lg border transition-all shrink-0',
                fridgeFilterActive
                  ? 'bg-green-500/15 text-green-500 border-green-500/30'
                  : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
              )}
              title="Manage fridge items"
            >
              <Snowflake className="size-3.5" />
            </button>
          )}

          <FridgeScanButton onClick={() => setShowFridgeScanner(true)} />

          <Button
            variant="outline"
            size="icon"
            className={cn(
              'size-9 shrink-0 rounded-lg',
              showFilters && 'bg-primary/10 border-primary/30 text-primary'
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Filter panel (expanded) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transitions.smooth}
            className="overflow-hidden"
          >
            <div className="rounded-xl border bg-card/50 p-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block font-medium">
                  Difficulty
                </label>
                <Select
                  value={difficultyFilter}
                  onValueChange={setDifficultyFilter}
                >
                  <SelectTrigger className="h-10 rounded-lg">
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
                    setFridgeFilterActive(false)
                  }}
                  className="h-8 text-xs"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats summary bar */}
      {!isLoading && (
        <div className="flex items-center gap-3 rounded-lg bg-card/50 border border-border/50 px-3 py-2">
          <button
            onClick={() => { setSourceFilter('all'); setSelectedCategory('') }}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              sourceFilter === 'all' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ChefHat className="size-3.5" />
            <span>Total</span>
            <span className="font-bold tabular-nums">{recipes.length + tjRecipes.length}</span>
          </button>
          <div className="h-5 w-px bg-border/30" />
          <button
            onClick={() => { setSourceFilter('my-recipes'); setSelectedCategory('') }}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              sourceFilter === 'my-recipes' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>Mine</span>
            <span className="font-bold tabular-nums text-blue-500">{recipes.length}</span>
          </button>
          <div className="h-5 w-px bg-border/30" />
          <button
            onClick={() => { setSourceFilter('trader-joes'); setSelectedCategory('') }}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              sourceFilter === 'trader-joes' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>TJ&apos;s</span>
            <span className="font-bold tabular-nums text-red-500">{tjRecipes.length}</span>
          </button>
          <div className="h-5 w-px bg-border/30" />
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Star className={cn('size-3.5', favoritesOnly ? 'fill-amber-500 text-amber-500' : '')} />
            <span className="font-bold tabular-nums text-amber-500">
              {recipes.filter((r) => r.is_favorite).length}
            </span>
          </button>
          {hasActiveFilters && (
            <>
              <div className="h-5 w-px bg-border/30" />
              <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
                {totalResults} result{totalResults !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      )}

      {/* Active filter pills */}
      {(debouncedSearch || difficultyFilter !== 'all' || selectedCategory || fridgeFilterActive) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {debouncedSearch && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1 h-6">
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
            <Badge variant="secondary" className="text-xs gap-1 pr-1 h-6">
              {difficultyFilter}
              <button
                onClick={() => setDifficultyFilter('all')}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {selectedCategory && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1 h-6">
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
            <Badge variant="secondary" className="text-xs gap-1 pr-1 h-6 bg-green-500/10 text-green-500 border-green-500/20">
              <Snowflake className="size-3" />
              Fridge
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

      {/* Fridge contents summary when filter is active */}
      {fridgeFilterActive && fridgeIngredients.length > 0 && (
        <button
          onClick={() => setShowFridgeManager(true)}
          className="flex items-center gap-1.5 flex-wrap rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 w-full text-left transition-colors hover:bg-green-500/10"
        >
          <Snowflake className="size-3.5 text-green-500 shrink-0" />
          <span className="text-xs font-medium text-green-600 dark:text-green-400 shrink-0">
            Filtering with:
          </span>
          {fridgeIngredients.slice(0, 8).map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] text-green-700 dark:text-green-300"
            >
              {item}
            </span>
          ))}
          {fridgeIngredients.length > 8 && (
            <span className="text-[11px] text-green-600/70 dark:text-green-400/70">
              +{fridgeIngredients.length - 8} more
            </span>
          )}
        </button>
      )}

      {/* ── Category chips ── */}
      {showDiscovery && tjCategories.length > 0 && (
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-1">
            {tjCategories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                  selectedCategory === cat
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-card border-border/60 hover:bg-muted hover:border-muted-foreground/30'
                )}
              >
                {cat}
                <span className={cn(
                  'ml-1.5 text-[10px] tabular-nums',
                  selectedCategory === cat ? 'text-primary/70' : 'text-muted-foreground/60'
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Try Something New — discovery card */}
      {showDiscovery && randomTjRecipe && (
        <div
          className="group relative overflow-hidden rounded-xl border border-primary/10 border-l-[3px] border-l-primary bg-gradient-to-r from-primary/5 to-orange-500/5 cursor-pointer transition-all hover:shadow-md hover:border-primary/20 hover:border-l-primary"
          onClick={() => onTjRecipeClick?.(randomTjRecipe)}
        >
          <div className="flex">
            <div className="relative w-28 shrink-0 overflow-hidden">
              {resolveRecipeImageUrl(randomTjRecipe.image_url) ? (
                <img
                  src={resolveRecipeImageUrl(randomTjRecipe.image_url)}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/10 to-orange-500/10 flex items-center justify-center">
                  <ChefHat className="size-5 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <Shuffle className="size-3 text-primary" />
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                    Try Something New
                  </span>
                </div>
                <button
                  className="flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    setRandomSeed((s) => s + 1)
                  }}
                  title="Shuffle"
                >
                  <Shuffle className="size-3" />
                </button>
              </div>
              <h4 className="text-sm font-semibold line-clamp-1">
                {randomTjRecipe.name}
              </h4>
              {randomTjRecipe.recipe_data.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {randomTjRecipe.recipe_data.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                {randomTjRecipe.recipe_data.prep_time && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3" />
                    <span className="font-bold tabular-nums">{randomTjRecipe.recipe_data.prep_time}m</span>
                  </span>
                )}
                {randomTjRecipe.recipe_data.servings && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="size-3" />
                    <span className="font-bold tabular-nums">{randomTjRecipe.recipe_data.servings}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      ) : fridgeFilterActive && (readyToCook.length > 0 || almostThere.length > 0) ? (
        <div className="space-y-6">
          {readyToCook.length > 0 && (
            <FridgeTierSection
              title="Ready to Cook"
              subtitle="80%+ ingredients matched"
              dotColor="bg-green-500"
              titleColor="text-green-500"
              items={readyToCook}
              onRecipeClick={onRecipeClick}
              onTjRecipeClick={onTjRecipeClick}
              onImportTj={onImportTj}
              fridgeFilterActive={fridgeFilterActive}
            />
          )}
          {almostThere.length > 0 && (
            <FridgeTierSection
              title="Almost There"
              subtitle="50-79% ingredients matched"
              dotColor="bg-amber-500"
              titleColor="text-amber-500"
              items={almostThere}
              onRecipeClick={onRecipeClick}
              onTjRecipeClick={onTjRecipeClick}
              onImportTj={onImportTj}
              fridgeFilterActive={fridgeFilterActive}
            />
          )}
          {otherRecipes.length > 0 && (
            <FridgeTierSection
              title="Other Matches"
              dotColor="bg-muted-foreground/30"
              titleColor="text-muted-foreground"
              items={otherRecipes}
              onRecipeClick={onRecipeClick}
              onTjRecipeClick={onTjRecipeClick}
              onImportTj={onImportTj}
              fridgeFilterActive={fridgeFilterActive}
            />
          )}
          {readyToCook.length === 0 && almostThere.length === 0 && otherRecipes.length === 0 && (
            <EmptyState
              icon={<Snowflake className="size-10" />}
              message="No recipes match your fridge items"
              action={{ label: 'Clear fridge filter', onClick: () => setFridgeFilterActive(false) }}
            />
          )}
        </div>
      ) : totalResults === 0 ? (
        <EmptyState
          icon={<ChefHat className="size-10" />}
          message={hasActiveFilters ? 'No recipes match your filters' : 'No recipes yet'}
          action={onNewRecipe && !hasActiveFilters && sourceFilter !== 'trader-joes'
            ? { label: 'Create your first recipe', onClick: onNewRecipe, icon: <Plus className="size-4 mr-2" /> }
            : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredRecipes.map((recipe) => (
              <div key={`own-${recipe.id}`}>
                <RecipeCard
                  recipe={recipe}
                  onClick={() => onRecipeClick?.(recipe)}
                />
              </div>
            ))}
            {visibleTjRecipes.map((recipe) => (
              <div key={`tj-${recipe.id}`}>
                <TjRecipeCard
                  recipe={recipe}
                  onClick={() => onTjRecipeClick?.(recipe)}
                  onImport={() => onImportTj?.(recipe)}
                />
              </div>
            ))}
          </div>
          {hasMoreRecipes && (
            <button
              onClick={() => setDisplayCount((c) => c + 30)}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card hover:border-border transition-all"
            >
              <ChevronDown className="size-4" />
              Show more
              <span className="text-xs tabular-nums text-muted-foreground/70">
                ({filteredTjRecipes.length - displayCount} remaining)
              </span>
            </button>
          )}
        </>
      )}

      <FridgeScanner
        open={showFridgeScanner}
        onOpenChange={setShowFridgeScanner}
      />

      <FridgeManager
        open={showFridgeManager}
        onOpenChange={setShowFridgeManager}
        onOpenScanner={() => setShowFridgeScanner(true)}
      />
    </div>
  )
}

// ── Extracted sub-components ──

function EmptyState({
  icon,
  message,
  action,
}: {
  icon: React.ReactNode
  message: string
  action?: { label: string; onClick: () => void; icon?: React.ReactNode }
}) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-3 text-muted-foreground/30">{icon}</div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm" className="mt-4">
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  )
}

function FridgeTierSection({
  title,
  subtitle,
  dotColor,
  titleColor,
  items,
  onRecipeClick,
  onTjRecipeClick,
  onImportTj,
  fridgeFilterActive,
}: {
  title: string
  subtitle?: string
  dotColor: string
  titleColor: string
  items: Array<{ type: 'own'; recipe: Recipe; score: number } | { type: 'tj'; recipe: TraderJoesRecipe; score: number }>
  onRecipeClick?: (recipe: Recipe) => void
  onTjRecipeClick?: (recipe: TraderJoesRecipe) => void
  onImportTj?: (recipe: TraderJoesRecipe) => void
  fridgeFilterActive: boolean
}) {
  const iconBgMap: Record<string, string> = {
    'text-green-500': 'bg-green-500/10',
    'text-amber-500': 'bg-amber-500/10',
    'text-muted-foreground': 'bg-muted-foreground/10',
  }
  const iconBg = iconBgMap[titleColor] || 'bg-muted/30'

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn('flex items-center justify-center rounded-md p-1.5', iconBg)}>
          <Snowflake className={cn('size-3.5', titleColor)} />
        </div>
        <div>
          <h3 className={cn('text-xs font-semibold uppercase tracking-wider', titleColor)}>{title}</h3>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{items.length} recipe{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <div key={`${item.type}-${item.recipe.id}`}>
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
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ingredient matching utilities ──

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

// ── TJ Recipe Card ──

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
        className="group cursor-pointer overflow-hidden border-border/50 transition-all hover:shadow-lg hover:border-border hover:bg-card/80"
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
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/80 to-muted/40">
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
