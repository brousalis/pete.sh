'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCooking } from '@/hooks/use-cooking-data'
import type { Recipe } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { ChefHat, Clock, Search, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'

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

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2 p-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-64">
        <div className="p-1">
          {/* Clear selection option */}
          <button
            onClick={() => onSelect('')}
            className="flex w-full items-center gap-2 rounded-md p-2 text-left text-xs hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="size-3.5" />
            <span>No recipe</span>
          </button>

          {recipesLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Loading recipes...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No recipes found
            </div>
          ) : (
            filtered.map((recipe) => (
              <RecipePickerItem
                key={recipe.id}
                recipe={recipe}
                selected={recipe.id === selectedId}
                onClick={() => onSelect(recipe.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
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

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors',
        selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
      )}
    >
      {resolveRecipeImageUrl(recipe.image_url) ? (
        <img
          src={resolveRecipeImageUrl(recipe.image_url)}
          alt=""
          className="size-9 rounded-md object-cover shrink-0"
        />
      ) : (
        <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
          <ChefHat className="size-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{recipe.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          {totalTime > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="size-2.5" />
              {totalTime}m
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-0.5">
              <Users className="size-2.5" />
              {recipe.servings}
            </span>
          )}
          {recipe.source === 'trader_joes' && (
            <Badge
              variant="outline"
              className="h-3.5 px-1 text-[8px] border-red-500/30 text-red-600"
            >
              TJ
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}
