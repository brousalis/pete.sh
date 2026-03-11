'use client'

import type { Recipe } from '@/lib/types/cooking.types'
import { resolveRecipeImageUrl } from '@/lib/utils'
import { CalendarCheck, ChefHat, Clock, ChevronRight } from 'lucide-react'

interface TonightRecipeBoxProps {
  recipe: Recipe
  onClick: () => void
  label?: string
}

export function TonightRecipeBox({ recipe, onClick, label = "Tonight's Recipe" }: TonightRecipeBoxProps) {
  const imageUrl = resolveRecipeImageUrl(recipe.image_url)
  const prepTime = recipe.prep_time ?? 0
  const cookTime = recipe.cook_time ?? 0
  const totalTime = prepTime + cookTime

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="group relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-accent-ember/[0.06] cursor-pointer transition-all hover:shadow-md hover:border-primary/30 mb-4"
      aria-label={`${label}: ${recipe.name}. Open recipe.`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-md">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/15 to-accent-ember/15 flex items-center justify-center">
              <ChefHat className="size-5 text-primary/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CalendarCheck className="size-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              {label}
            </span>
          </div>
          <h4 className="text-[13px] font-semibold line-clamp-1">
            {recipe.name}
          </h4>
          {recipe.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
              {recipe.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalTime > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              <span className="font-bold tabular-nums">{totalTime}m</span>
            </span>
          )}
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  )
}
