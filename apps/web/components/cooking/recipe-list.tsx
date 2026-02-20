'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCooking } from '@/hooks/use-cooking-data'
import type { Recipe, TraderJoesRecipe } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import {
    ChefHat,
    Clock,
    Plus,
    Shuffle,
    Snowflake,
    X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RecipeCardCompact, RecipeCardCompactSkeleton, TjRecipeCardCompact } from './recipe-card'

export type SourceFilter = 'all' | 'my-recipes' | 'trader-joes'

export interface RecipeFilterState {
  search: string
  debouncedSearch: string
  sourceFilter: SourceFilter
  difficultyFilter: string
  favoritesOnly: boolean
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  excludedCategories: Set<string>
  nutritionFilter: string
}

interface RecipeListProps {
  filters: RecipeFilterState
  sidebarOpen?: boolean
  onRecipeClick?: (recipe: Recipe) => void
  onTjRecipeClick?: (recipe: TraderJoesRecipe) => void
  onNewRecipe?: () => void
  onImportTj?: (recipe: TraderJoesRecipe) => void
  className?: string
}

export function RecipeList({
  filters,
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
    completions,
  } = useCooking()

  const cookCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of completions) {
      map.set(c.recipe_id, (map.get(c.recipe_id) || 0) + 1)
    }
    return map
  }, [completions])

  const {
    debouncedSearch,
    sourceFilter,
    difficultyFilter,
    favoritesOnly,
    selectedCategory,
    setSelectedCategory,
    excludedCategories,
    nutritionFilter,
  } = filters

  const [displayCount, setDisplayCount] = useState(30)

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
    if (nutritionFilter && nutritionFilter !== 'all') {
      filtered = filtered.filter((r) =>
        r.nutrition_category?.includes(nutritionFilter)
      )
    }
    return filtered
  }, [recipes, debouncedSearch, sourceFilter, difficultyFilter, favoritesOnly, nutritionFilter])

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
          r.recipe_data.tags?.some((t) => t.toLowerCase().includes(lower)) ||
          r.category?.toLowerCase().includes(lower) ||
          r.recipe_data.categories?.some((c) =>
            c.toLowerCase().includes(lower)
          ) ||
          r.url?.toLowerCase().includes(lower) ||
          r.recipe_data.instructions?.some((s) =>
            s.toLowerCase().includes(lower)
          )
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
  }, [tjRecipes, debouncedSearch, sourceFilter, selectedCategory, excludedCategories])

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
  }, [debouncedSearch, sourceFilter, selectedCategory, excludedCategories, difficultyFilter, favoritesOnly, fridgeFilterActive])

  // Infinite scroll via IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadMore = useCallback(() => {
    if (hasMoreRecipes) setDisplayCount((c) => c + 30)
  }, [hasMoreRecipes])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const showDiscovery =
    sourceFilter !== 'my-recipes' && !debouncedSearch && !selectedCategory

  return (
    <div className={cn('space-y-2', className)}>
      {/* Active filter pills */}
      {(debouncedSearch || difficultyFilter !== 'all' || selectedCategory || fridgeFilterActive) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {debouncedSearch && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1 h-6">
              &ldquo;{debouncedSearch}&rdquo;
            </Badge>
          )}
          {difficultyFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs gap-1 h-6">
              {difficultyFilter}
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
          {hasActiveFilters && (
            <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Fridge contents summary when filter is active */}
      {fridgeFilterActive && fridgeIngredients.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 w-full text-left">
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
        </div>
      )}

      {/* Try Something New -- discovery card */}
      {showDiscovery && randomTjRecipe && (
        <div
          className="group relative overflow-hidden rounded-lg border border-primary/10 border-l-[3px] border-l-primary bg-gradient-to-r from-primary/5 to-orange-500/5 cursor-pointer transition-all hover:shadow-md hover:border-primary/20 hover:border-l-primary"
          onClick={() => onTjRecipeClick?.(randomTjRecipe)}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
              {resolveRecipeImageUrl(randomTjRecipe.image_url) ? (
                <img
                  src={resolveRecipeImageUrl(randomTjRecipe.image_url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/10 to-orange-500/10 flex items-center justify-center">
                  <ChefHat className="size-4 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Shuffle className="size-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Try Something New
                </span>
              </div>
              <h4 className="text-[13px] font-semibold line-clamp-1">
                {randomTjRecipe.name}
              </h4>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {randomTjRecipe.recipe_data.prep_time && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="size-3" />
                  <span className="font-bold tabular-nums">{randomTjRecipe.recipe_data.prep_time}m</span>
                </span>
              )}
              <button
                className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setRandomSeed((s) => s + 1)
                }}
                title="Shuffle"
              >
                <Shuffle className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe list */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <RecipeCardCompactSkeleton key={i} />
          ))}
        </div>
      ) : fridgeFilterActive && (readyToCook.length > 0 || almostThere.length > 0) ? (
        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCardCompact
                key={`own-${recipe.id}`}
                recipe={recipe}
                onClick={() => onRecipeClick?.(recipe)}
                cookCount={cookCountMap.get(recipe.id)}
              />
            ))}
            {visibleTjRecipes.map((recipe) => (
              <TjRecipeCardCompact
                key={`tj-${recipe.id}`}
                recipe={recipe}
                onClick={() => onTjRecipeClick?.(recipe)}
                onImport={() => onImportTj?.(recipe)}
              />
            ))}
          </div>
          {hasMoreRecipes && (
            <div ref={sentinelRef} className="h-px" />
          )}
        </>
      )}
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
      <div className="flex items-center gap-2.5 mb-2">
        <div className={cn('flex items-center justify-center rounded-md p-1.5', iconBg)}>
          <Snowflake className={cn('size-3.5', titleColor)} />
        </div>
        <div>
          <h3 className={cn('text-xs font-semibold uppercase tracking-wider', titleColor)}>{title}</h3>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{items.length} recipe{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={`${item.type}-${item.recipe.id}`}>
            {item.type === 'own' ? (
              <RecipeCardCompact
                recipe={item.recipe}
                onClick={() => onRecipeClick?.(item.recipe as Recipe)}
                fridgeScore={item.score}
                fridgeFilterActive={fridgeFilterActive}
              />
            ) : (
              <TjRecipeCardCompact
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
