'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { RecipeWithIngredients } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import {
  Beef,
  Check,
  Circle,
  Droplets,
  Flame,
  Minus,
  PanelLeftClose,
  Plus,
  RotateCcw,
  UtensilsCrossed,
  Wheat,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_PREFIX = 'day-ing-checked-'
const STALE_MS = 24 * 60 * 60 * 1000

interface StoredCheckState {
  checked: string[]
  ts: number
}

function loadChecked(recipeId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${recipeId}`)
    if (!raw) return new Set()
    const parsed: StoredCheckState = JSON.parse(raw)
    if (Date.now() - parsed.ts > STALE_MS) {
      localStorage.removeItem(`${STORAGE_PREFIX}${recipeId}`)
      return new Set()
    }
    return new Set(parsed.checked)
  } catch {
    return new Set()
  }
}

function saveChecked(recipeId: string, checked: Set<string>) {
  try {
    const data: StoredCheckState = { checked: [...checked], ts: Date.now() }
    localStorage.setItem(`${STORAGE_PREFIX}${recipeId}`, JSON.stringify(data))
  } catch {}
}

interface DayIngredientsSidebarProps {
  recipe: RecipeWithIngredients | null
  loading: boolean
  onCollapse: () => void
}

export function DayIngredientsSidebar({
  recipe,
  loading,
  onCollapse,
}: DayIngredientsSidebarProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [scaledServings, setScaledServings] = useState<number | null>(null)

  useEffect(() => {
    if (recipe?.id) {
      setChecked(loadChecked(recipe.id))
      setScaledServings(null)
    } else {
      setChecked(new Set())
    }
  }, [recipe?.id])

  const toggleItem = useCallback(
    (ingredientId: string) => {
      setChecked((prev) => {
        const next = new Set(prev)
        if (next.has(ingredientId)) next.delete(ingredientId)
        else next.add(ingredientId)
        if (recipe?.id) saveChecked(recipe.id, next)
        return next
      })
    },
    [recipe?.id]
  )

  const scaleFactor = useMemo(() => {
    if (!recipe?.servings || !scaledServings) return 1
    return scaledServings / recipe.servings
  }, [recipe?.servings, scaledServings])

  const displayServings = scaledServings ?? recipe?.servings
  const isScaled = scaledServings !== null && recipe?.servings !== scaledServings

  const scaleAmount = (amount: number | undefined): string => {
    if (!amount) return ''
    const scaled = amount * scaleFactor
    return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1)
  }

  const ingredients = recipe?.ingredients ?? []
  const checkedCount = ingredients.filter((i) => checked.has(i.id)).length
  const totalCount = ingredients.length
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="border-border/50 bg-card flex flex-col h-full">
        <div className="border-border/50 border-b px-3 py-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-20" />
            </div>
            <button
              onClick={onCollapse}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Hide ingredients"
            >
              <PanelLeftClose className="size-3" />
            </button>
          </div>
        </div>
        <div className="px-3 py-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="border-border/50 bg-card flex flex-col h-full">
        <div className="border-border/50 border-b px-3 py-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold">Ingredients</h3>
            <button
              onClick={onCollapse}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Hide ingredients"
            >
              <PanelLeftClose className="size-3" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <UtensilsCrossed className="size-6 mx-auto mb-2 text-muted-foreground/20" />
          <p className="text-[11px] text-muted-foreground/50">No recipe planned</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-border/50 bg-card flex flex-col h-full">
      {/* Header */}
      <div className="border-border/50 border-b px-3 py-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold">Ingredients</h3>
            {totalCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
                {checkedCount}/{totalCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <div className="h-3 w-px bg-border/40 mx-0.5" />
            <button
              onClick={onCollapse}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Hide ingredients"
            >
              <PanelLeftClose className="size-3" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-sage transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{progressPercent}%</span>
          </div>
        )}

        {/* Servings adjuster */}
        {recipe.servings && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">Servings</span>
              {isScaled && (
                <span className="text-[9px] text-muted-foreground/50">
                  (from {recipe.servings})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {isScaled && (
                <button
                  onClick={() => setScaledServings(null)}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Reset servings"
                >
                  <RotateCcw className="size-2.5" />
                </button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="size-5"
                onClick={() => setScaledServings(Math.max(1, (displayServings || 1) - 1))}
              >
                <Minus className="size-2.5" />
              </Button>
              <span className="text-[11px] font-semibold w-4 text-center tabular-nums">
                {displayServings}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-5"
                onClick={() => setScaledServings((displayServings || 1) + 1)}
              >
                <Plus className="size-2.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ingredient list */}
      <div className="px-3 py-2 space-y-0.5 flex-1 min-h-0 overflow-y-auto">
        {ingredients.length > 0 ? (
          <>
            {ingredients.map((ingredient) => {
              const isChecked = checked.has(ingredient.id)
              return (
                <div
                  key={ingredient.id}
                  className={cn(
                    'group/item flex items-center gap-1.5 rounded px-1.5 py-1.5 transition-all',
                    isChecked ? 'opacity-40' : 'hover:bg-muted/30'
                  )}
                >
                  <button onClick={() => toggleItem(ingredient.id)} className="shrink-0 mt-0.5">
                    {isChecked ? (
                      <div className="size-4 rounded-full bg-accent-sage flex items-center justify-center">
                        <Check className="size-2.5 text-white" />
                      </div>
                    ) : (
                      <Circle className="size-4 text-muted-foreground/40" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          'text-[11px] transition-colors leading-snug',
                          isChecked ? 'line-through text-muted-foreground' : 'font-medium'
                        )}
                      >
                        {ingredient.name}
                      </span>
                      {(ingredient.amount || ingredient.unit) && (
                        <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
                          {scaleAmount(ingredient.amount)} {ingredient.unit}
                        </span>
                      )}
                    </div>
                    {ingredient.notes && (
                      <span className="text-[9px] text-muted-foreground/50 italic leading-none">
                        {ingredient.notes}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-[11px] text-muted-foreground/50">No ingredients listed</p>
          </div>
        )}
      </div>

      {/* Nutrition summary */}
      {recipe.calories_per_serving != null && (
        <div className="border-t border-border/50 px-3 py-2 shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Flame className="size-2.5 text-accent-ember" />
              {Math.round(recipe.calories_per_serving * scaleFactor)}
            </span>
            {recipe.protein_g != null && (
              <span className="flex items-center gap-0.5">
                <Beef className="size-2.5 text-accent-rose" />
                {Math.round(recipe.protein_g * scaleFactor)}g
              </span>
            )}
            {recipe.fat_g != null && (
              <span className="flex items-center gap-0.5">
                <Droplets className="size-2.5 text-accent-gold" />
                {Math.round(recipe.fat_g * scaleFactor)}g
              </span>
            )}
            {recipe.carbs_g != null && (
              <span className="flex items-center gap-0.5">
                <Wheat className="size-2.5 text-accent-gold" />
                {Math.round(recipe.carbs_g * scaleFactor)}g
              </span>
            )}
            <span className="ml-auto text-[9px] text-muted-foreground/40">per serving</span>
          </div>
        </div>
      )}
    </div>
  )
}
