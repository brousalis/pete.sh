'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCooking } from '@/hooks/use-cooking-data'
import type { Recipe } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { Check, ChefHat, Clock, Minus, Search, Star, Users, X } from 'lucide-react'
import { useMemo, useRef, useState, useEffect } from 'react'

interface RecipePickerProps {
  onSelect: (recipeId: string) => void
  onClose?: () => void
  selectedId?: string
  className?: string
}

export function RecipePicker({
  onSelect,
  onClose,
  selectedId,
  className,
}: RecipePickerProps) {
  const { recipes, recipesLoading } = useCooking()
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return recipes
    const lower = search.toLowerCase()
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.description?.toLowerCase().includes(lower) ||
        r.tags?.some((t) => t.toLowerCase().includes(lower))
    )
  }, [recipes, search])

  const { favorites, rest } = useMemo(() => {
    const favs: Recipe[] = []
    const others: Recipe[] = []
    for (const r of filtered) {
      if (r.is_favorite) favs.push(r)
      else others.push(r)
    }
    return { favorites: favs, rest: others }
  }, [filtered])

  const hasResults = favorites.length > 0 || rest.length > 0

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground">Choose a recipe</h3>
          {onClose && (
            <Button variant="ghost" size="icon" className="size-6 -mr-1" onClick={onClose}>
              <X className="size-3" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            ref={inputRef}
            placeholder="Search by name or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/50 border-border/40"
          />
        </div>
      </div>

      <ScrollArea className="max-h-72">
        <div className="px-1.5 pb-1.5 space-y-1">
          {/* Clear selection */}
          {selectedId && (
            <button
              onClick={() => onSelect('')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-muted/60 transition-colors text-muted-foreground"
            >
              <div className="size-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                <Minus className="size-3.5" />
              </div>
              <span className="font-medium">Remove recipe</span>
            </button>
          )}

          {recipesLoading ? (
            <div className="py-8 text-center">
              <div className="size-5 mx-auto mb-2 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground">Loading recipes...</span>
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center">
              <ChefHat className="size-6 mx-auto mb-1.5 text-muted-foreground/20" />
              <p className="text-[11px] text-muted-foreground">
                {search ? 'No recipes match your search' : 'No recipes yet'}
              </p>
            </div>
          ) : (
            <>
              {/* Favorites section */}
              {favorites.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                    <Star className="size-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Favorites
                    </span>
                  </div>
                  {favorites.map((recipe) => (
                    <RecipePickerItem
                      key={recipe.id}
                      recipe={recipe}
                      selected={recipe.id === selectedId}
                      onClick={() => onSelect(recipe.id)}
                    />
                  ))}
                </div>
              )}

              {/* All recipes */}
              {rest.length > 0 && (
                <div>
                  {favorites.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 mt-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        All recipes
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">{rest.length}</span>
                    </div>
                  )}
                  {rest.map((recipe) => (
                    <RecipePickerItem
                      key={recipe.id}
                      recipe={recipe}
                      selected={recipe.id === selectedId}
                      onClick={() => onSelect(recipe.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
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
  onClick,
}: {
  recipe: Recipe
  selected: boolean
  onClick: () => void
}) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const resolvedImage = resolveRecipeImageUrl(recipe.image_url)

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
        selected
          ? 'bg-primary/10 ring-1 ring-primary/20'
          : 'hover:bg-muted/60'
      )}
    >
      {/* Thumbnail */}
      <div className="size-9 shrink-0 overflow-hidden rounded-md">
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <ChefHat className="size-3.5 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium truncate leading-tight">{recipe.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {totalTime > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="size-2.5" />
              {totalTime}m
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Users className="size-2.5" />
              {recipe.servings}
            </span>
          )}
          {recipe.difficulty && (
            <Badge
              variant="outline"
              className={cn('text-[8px] h-3.5 px-1 font-medium', difficultyColors[recipe.difficulty])}
            >
              {recipe.difficulty}
            </Badge>
          )}
          {recipe.source === 'trader_joes' && (
            <Badge className="h-3.5 px-1 text-[8px] bg-red-600 text-white border-0">
              TJ&apos;s
            </Badge>
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="size-5 shrink-0 rounded-full bg-primary flex items-center justify-center">
          <Check className="size-3 text-primary-foreground" />
        </div>
      )}
    </button>
  )
}
