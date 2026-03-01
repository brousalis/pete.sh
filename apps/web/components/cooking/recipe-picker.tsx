'use client'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TagMultiSelect } from '@/components/ui/tag-multi-select'
import { useCooking } from '@/hooks/use-cooking-data'
import type { Recipe } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import {
  Check,
  ChefHat,
  Clock,
  Minus,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface RecipePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (recipeId: string) => void
  selectedId?: string
}

type SourceFilter = 'all' | 'custom' | 'trader_joes'
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard'

export function RecipePickerDialog({
  open,
  onOpenChange,
  onSelect,
  selectedId,
}: RecipePickerDialogProps) {
  const { recipes, recipesLoading } = useCooking()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setSearch('')
      setSourceFilter('all')
      setDifficultyFilter('all')
      setFavoritesOnly(false)
      setSelectedTags(new Set())
      setHighlightIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

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

  const filtered = useMemo(() => {
    let result = recipes

    if (search) {
      const lower = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.description?.toLowerCase().includes(lower) ||
          r.tags?.some((t) => t.toLowerCase().includes(lower))
      )
    }

    if (sourceFilter !== 'all') {
      result = result.filter((r) => r.source === sourceFilter)
    }

    if (difficultyFilter !== 'all') {
      result = result.filter((r) => r.difficulty === difficultyFilter)
    }

    if (favoritesOnly) {
      result = result.filter((r) => r.is_favorite)
    }

    if (selectedTags.size > 0) {
      result = result.filter((r) => {
        const recipeTags = r.tags?.map((t) => t.toLowerCase()) || []
        return Array.from(selectedTags).every((st) => recipeTags.includes(st))
      })
    }

    return result
  }, [recipes, search, sourceFilter, difficultyFilter, favoritesOnly, selectedTags])

  const { favorites, rest } = useMemo(() => {
    const favs: Recipe[] = []
    const others: Recipe[] = []
    for (const r of filtered) {
      if (r.is_favorite) favs.push(r)
      else others.push(r)
    }
    return { favorites: favs, rest: others }
  }, [filtered])

  const flatList = useMemo(() => {
    const items: Recipe[] = []
    items.push(...favorites)
    items.push(...rest)
    return items
  }, [favorites, rest])

  useEffect(() => {
    setHighlightIndex(0)
  }, [search, sourceFilter, difficultyFilter, favoritesOnly, selectedTags])

  const handleSelect = useCallback(
    (recipeId: string) => {
      onSelect(recipeId)
      onOpenChange(false)
    },
    [onSelect, onOpenChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = flatList.length + (selectedId ? 1 : 0)
      if (totalItems === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIndex((i) => Math.min(i + 1, totalItems - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const offset = selectedId ? 1 : 0
        if (selectedId && highlightIndex === 0) {
          handleSelect('')
        } else {
          const recipe = flatList[highlightIndex - offset]
          if (recipe) handleSelect(recipe.id)
        }
      }
    },
    [flatList, highlightIndex, selectedId, handleSelect]
  )

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-highlight-index="${highlightIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex])

  const hasActiveFilters = sourceFilter !== 'all' || difficultyFilter !== 'all' || favoritesOnly || selectedTags.size > 0

  const clearFilters = useCallback(() => {
    setSourceFilter('all')
    setDifficultyFilter('all')
    setFavoritesOnly(false)
    setSelectedTags(new Set())
  }, [])

  let itemIndex = 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Choose a recipe</DialogTitle>
          <DialogDescription>Search and pick a recipe for your meal plan</DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <div className="border-b border-border/50 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              ref={inputRef}
              placeholder="Search recipes by name, description, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 pr-10 text-sm bg-muted/40 border-border/40 rounded-lg"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="border-b border-border/50 px-4 py-2 flex flex-wrap items-center gap-2">
          {/* Source pills */}
          <div className="flex items-center rounded-lg border border-border/40 p-0.5 bg-muted/30">
            {([
              { value: 'all' as SourceFilter, label: 'All' },
              { value: 'custom' as SourceFilter, label: 'Mine' },
              { value: 'trader_joes' as SourceFilter, label: "TJ's" },
            ] as const).map((s) => (
              <button
                key={s.value}
                onClick={() => setSourceFilter(s.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                  sourceFilter === s.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border/40" />

          {/* Favorites toggle */}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
              favoritesOnly
                ? 'bg-amber-500/15 text-amber-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Star className={cn('size-3', favoritesOnly && 'fill-amber-500')} />
            Favorites
          </button>

          {/* Difficulty pills */}
          <div className="flex items-center rounded-lg border border-border/40 p-0.5 bg-muted/30">
            {([
              { value: 'all' as DifficultyFilter, label: 'Any' },
              { value: 'easy' as DifficultyFilter, label: 'Easy' },
              { value: 'medium' as DifficultyFilter, label: 'Med' },
              { value: 'hard' as DifficultyFilter, label: 'Hard' },
            ] as const).map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficultyFilter(d.value)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium transition-all',
                  difficultyFilter === d.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          {allTags.length > 0 && (
            <>
              <div className="h-5 w-px bg-border/40" />
              <TagMultiSelect
                tags={allTags}
                selected={selectedTags}
                onSelectedChange={setSelectedTags}
              />
            </>
          )}

          {hasActiveFilters && (
            <>
              <div className="h-5 w-px bg-border/40" />
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3" />
                Clear
              </button>
            </>
          )}

          <div className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Recipe list */}
        <ScrollArea className="flex-1 min-h-0 max-h-[calc(85vh-180px)]" ref={listRef}>
          <div className="p-2 space-y-1">
            {/* Clear selection */}
            {selectedId && (
              <button
                data-highlight-index={itemIndex}
                onClick={() => handleSelect('')}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors text-muted-foreground',
                  highlightIndex === itemIndex++ ? 'bg-muted/80' : 'hover:bg-muted/50'
                )}
              >
                <div className="size-10 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <Minus className="size-4" />
                </div>
                <span className="font-medium">Remove recipe</span>
              </button>
            )}

            {recipesLoading ? (
              <div className="py-16 text-center">
                <div className="size-6 mx-auto mb-3 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60" />
                <span className="text-sm text-muted-foreground">Loading recipes...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <ChefHat className="size-8 mx-auto mb-2 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  {search || hasActiveFilters ? 'No recipes match your filters' : 'No recipes yet'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {favorites.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-2">
                      <Star className="size-3 text-amber-500 fill-amber-500" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Favorites
                      </span>
                      <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                        {favorites.length}
                      </span>
                    </div>
                    {favorites.map((recipe) => {
                      const idx = selectedId ? itemIndex++ : itemIndex++
                      return (
                        <RecipePickerItem
                          key={recipe.id}
                          recipe={recipe}
                          selected={recipe.id === selectedId}
                          highlighted={highlightIndex === idx}
                          highlightIndex={idx}
                          onClick={() => handleSelect(recipe.id)}
                          onHover={() => setHighlightIndex(idx)}
                        />
                      )
                    })}
                  </div>
                )}

                {rest.length > 0 && (
                  <div>
                    {favorites.length > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-2 mt-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          All recipes
                        </span>
                        <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                          {rest.length}
                        </span>
                      </div>
                    )}
                    {rest.map((recipe) => {
                      const idx = selectedId ? itemIndex++ : itemIndex++
                      return (
                        <RecipePickerItem
                          key={recipe.id}
                          recipe={recipe}
                          selected={recipe.id === selectedId}
                          highlighted={highlightIndex === idx}
                          highlightIndex={idx}
                          onClick={() => handleSelect(recipe.id)}
                          onHover={() => setHighlightIndex(idx)}
                        />
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
  medium: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
  hard: 'bg-red-500/15 text-red-500 border-red-500/20',
}

function RecipePickerItem({
  recipe,
  selected,
  highlighted,
  highlightIndex,
  onClick,
  onHover,
}: {
  recipe: Recipe
  selected: boolean
  highlighted: boolean
  highlightIndex: number
  onClick: () => void
  onHover: () => void
}) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const resolvedImage = resolveRecipeImageUrl(recipe.image_url)

  return (
    <button
      data-highlight-index={highlightIndex}
      onClick={onClick}
      onMouseEnter={onHover}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
        selected
          ? 'bg-primary/10 ring-1 ring-primary/20'
          : highlighted
            ? 'bg-muted/80'
            : 'hover:bg-muted/50'
      )}
    >
      {/* Thumbnail */}
      <div className="size-11 shrink-0 overflow-hidden rounded-lg">
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <ChefHat className="size-4 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate leading-tight">{recipe.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {totalTime > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {totalTime}m
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Users className="size-3" />
              {recipe.servings}
            </span>
          )}
          {recipe.difficulty && (
            <Badge
              variant="outline"
              className={cn('text-[9px] h-4 px-1.5 font-medium', difficultyColors[recipe.difficulty])}
            >
              {recipe.difficulty}
            </Badge>
          )}
          {recipe.source === 'trader_joes' && (
            <Badge className="h-4 px-1.5 text-[9px] bg-red-600 text-white border-0">
              TJ&apos;s
            </Badge>
          )}
          {recipe.is_favorite && !selected && (
            <Star className="size-3 text-amber-500 fill-amber-500" />
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="size-6 shrink-0 rounded-full bg-primary flex items-center justify-center">
          <Check className="size-3.5 text-primary-foreground" />
        </div>
      )}
    </button>
  )
}
