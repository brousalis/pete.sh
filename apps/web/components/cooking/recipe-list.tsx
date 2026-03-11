'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCooking } from '@/hooks/use-cooking-data'
import type { Recipe } from '@/lib/types/cooking.types'
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
import { RecipeCardCompact, RecipeCardCompactSkeleton } from './recipe-card'

export type SourceFilter = 'all' | 'my-recipes' | 'trader-joes'

export interface RecipeFilterState {
  search: string
  debouncedSearch: string
  sourceFilter: SourceFilter
  difficultyFilter: string
  favoritesOnly: boolean
  selectedCategories: Set<string>
  setSelectedCategories: (cats: Set<string>) => void
  nutritionFilter: string
}

interface RecipeListProps {
  filters: RecipeFilterState
  sidebarOpen?: boolean
  onRecipeClick?: (recipe: Recipe) => void
  onNewRecipe?: () => void
  className?: string
  cardImageSize?: number
  /** Scroll container ref for IntersectionObserver. Use when list is inside a constrained scroll area to prevent infinite load. */
  scrollRootRef?: React.RefObject<HTMLDivElement | null>
}

export function RecipeList({
  filters,
  onRecipeClick,
  onNewRecipe,
  className,
  cardImageSize,
  scrollRootRef,
}: RecipeListProps) {
  const {
    recipes,
    recipesLoading,
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
    selectedCategories,
    setSelectedCategories,
    nutritionFilter,
  } = filters

  const [displayCount, setDisplayCount] = useState(30)

  const [randomSeed, setRandomSeed] = useState(0)
  const randomTjRecipe = useMemo(() => {
    const tj = recipes.filter((r) => r.source === 'trader_joes')
    if (tj.length === 0) return null
    const idx = (Date.now() + randomSeed) % tj.length
    return tj[idx]
  }, [recipes, randomSeed])

  const filteredRecipes = useMemo(() => {
    let filtered = [...recipes]

    // Source filtering
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
    if (selectedCategories.size > 0) {
      filtered = filtered.filter((r) => {
        const recipeTags = r.tags?.map((t) => t.toLowerCase()) || []
        return Array.from(selectedCategories).every((cat) => recipeTags.includes(cat))
      })
    }
    return filtered
  }, [recipes, debouncedSearch, sourceFilter, difficultyFilter, favoritesOnly, nutritionFilter, selectedCategories])

  // Fridge ingredient matching
  const fridgeMatchScores = useMemo(() => {
    if (!fridgeFilterActive || fridgeIngredients.length === 0) return new Map<string, number>()

    const scores = new Map<string, number>()
    const fridgeTokens = fridgeIngredients.map((item) => tokenizeIngredient(item))

    for (const recipe of filteredRecipes) {
      const nameLower = recipe.name.toLowerCase()
      let matchCount = 0
      for (const fridgeItem of fridgeTokens) {
        if (fridgeItem.some((token) => nameLower.includes(token))) {
          matchCount++
        }
      }
      scores.set(recipe.id, matchCount > 0 ? matchCount / Math.max(fridgeIngredients.length, 1) : 0)
    }

    return scores
  }, [fridgeFilterActive, fridgeIngredients, filteredRecipes])

  type ScoredItem = { recipe: Recipe; score: number }
  const { readyToCook, almostThere, otherRecipes } = useMemo(() => {
    if (!fridgeFilterActive) {
      return { readyToCook: [] as ScoredItem[], almostThere: [] as ScoredItem[], otherRecipes: [] as ScoredItem[] }
    }
    const allItems: ScoredItem[] = filteredRecipes.map((r) => ({
      recipe: r,
      score: fridgeMatchScores.get(r.id) || 0,
    }))

    allItems.sort((a, b) => b.score - a.score)

    const ready = allItems.filter((i) => i.score >= 0.8)
    const almost = allItems.filter((i) => i.score >= 0.5 && i.score < 0.8)
    const other = allItems.filter((i) => i.score < 0.5 && i.score > 0)

    return { readyToCook: ready, almostThere: almost, otherRecipes: other }
  }, [fridgeFilterActive, filteredRecipes, fridgeMatchScores])

  const isLoading = recipesLoading
  const totalResults = filteredRecipes.length
  const hasActiveFilters =
    debouncedSearch || difficultyFilter !== 'all' || favoritesOnly || selectedCategories.size > 0 || fridgeFilterActive

  const visibleRecipes = useMemo(
    () => filteredRecipes.slice(0, displayCount),
    [filteredRecipes, displayCount]
  )
  const hasMoreRecipes = filteredRecipes.length > displayCount

  useEffect(() => {
    setDisplayCount(30)
  }, [debouncedSearch, sourceFilter, selectedCategories, difficultyFilter, favoritesOnly, fridgeFilterActive])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadMore = useCallback(() => {
    if (hasMoreRecipes) setDisplayCount((c) => c + 30)
  }, [hasMoreRecipes])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const root = scrollRootRef?.current ?? null
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) loadMore() },
      { root, rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, scrollRootRef])

  const showDiscovery =
    sourceFilter !== 'my-recipes' && !debouncedSearch && selectedCategories.size === 0

  return (
    <div className={cn('space-y-2', className)}>
      {/* Active filter pills */}
      {(debouncedSearch || difficultyFilter !== 'all' || selectedCategories.size > 0 || fridgeFilterActive) && (
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
          {Array.from(selectedCategories).map((cat) => (
            <Badge key={cat} variant="secondary" className="text-xs gap-1 pr-1 h-6">
              {cat}
              <button
                onClick={() => {
                  const next = new Set(selectedCategories)
                  next.delete(cat)
                  setSelectedCategories(next)
                }}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {fridgeFilterActive && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1 h-6 bg-accent-sage/10 text-accent-sage border-accent-sage/20">
              <Snowflake className="size-3" />
              Fridge
              <button
                onClick={() => setFridgeFilterActive(false)}
                className="rounded-full p-0.5 hover:bg-accent-sage/20"
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
        <div className="flex items-center gap-1.5 flex-wrap rounded-lg border border-accent-sage/20 bg-accent-sage/5 px-3 py-2 w-full text-left">
          <Snowflake className="size-3.5 text-accent-sage shrink-0" />
          <span className="text-xs font-medium text-accent-sage shrink-0">
            Filtering with:
          </span>
          {fridgeIngredients.slice(0, 8).map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-full bg-accent-sage/10 px-2 py-0.5 text-[11px] text-accent-sage"
            >
              {item}
            </span>
          ))}
          {fridgeIngredients.length > 8 && (
            <span className="text-[11px] text-accent-sage/70">
              +{fridgeIngredients.length - 8} more
            </span>
          )}
        </div>
      )}

      {/* Try Something New -- discovery card */}
      {showDiscovery && randomTjRecipe && (
        <div
          className="group relative overflow-hidden rounded-lg border border-primary/10 bg-gradient-to-r from-accent-ember/[0.04] to-accent-gold/[0.04] cursor-pointer transition-all hover:shadow-md hover:border-primary/20 mb-4"
          onClick={() => onRecipeClick?.(randomTjRecipe)}
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
                  <div className="h-full w-full bg-gradient-to-br from-primary/10 to-accent-ember/10 flex items-center justify-center">
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
              {(randomTjRecipe.prep_time ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="size-3" />
                  <span className="font-bold tabular-nums">{randomTjRecipe.prep_time}m</span>
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
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
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
              dotColor="bg-accent-sage"
              titleColor="text-accent-sage"
              items={readyToCook}
              onRecipeClick={onRecipeClick}
              fridgeFilterActive={fridgeFilterActive}
            />
          )}
          {almostThere.length > 0 && (
            <FridgeTierSection
              title="Almost There"
              subtitle="50-79% ingredients matched"
              dotColor="bg-accent-gold"
              titleColor="text-accent-gold"
              items={almostThere}
              onRecipeClick={onRecipeClick}
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
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
            {visibleRecipes.map((recipe) => (
              <RecipeCardCompact
                key={recipe.id}
                recipe={recipe}
                onClick={() => onRecipeClick?.(recipe)}
                cookCount={cookCountMap.get(recipe.id)}
                imageSize={cardImageSize}
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
  fridgeFilterActive,
}: {
  title: string
  subtitle?: string
  dotColor: string
  titleColor: string
  items: Array<{ recipe: Recipe; score: number }>
  onRecipeClick?: (recipe: Recipe) => void
  fridgeFilterActive: boolean
}) {
  const iconBgMap: Record<string, string> = {
    'text-accent-sage': 'bg-accent-sage/10',
    'text-accent-gold': 'bg-accent-gold/10',
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
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
        {items.map((item) => (
          <RecipeCardCompact
            key={item.recipe.id}
            recipe={item.recipe}
            onClick={() => onRecipeClick?.(item.recipe)}
            fridgeScore={item.score}
            fridgeFilterActive={fridgeFilterActive}
          />
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
