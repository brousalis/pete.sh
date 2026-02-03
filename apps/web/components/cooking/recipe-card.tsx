'use client'

import { Clock, Users, ChefHat, Star, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Recipe } from '@/lib/types/cooking.types'

interface RecipeCardProps {
  recipe: Recipe
  onClick?: () => void
  className?: string
}

export function RecipeCard({ recipe, onClick, className }: RecipeCardProps) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const difficultyColors = {
    easy: 'bg-green-500/10 text-green-600 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    hard: 'bg-red-500/10 text-red-600 border-red-500/20',
  }

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Image or placeholder */}
        {recipe.image_url ? (
          <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={recipe.image_url}
              alt={recipe.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {recipe.is_favorite && (
              <div className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5">
                <Star className="size-4 fill-yellow-500 text-yellow-500" />
              </div>
            )}
          </div>
        ) : (
          <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
            <ChefHat className="size-8 text-muted-foreground" />
            {recipe.is_favorite && (
              <div className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5">
                <Star className="size-4 fill-yellow-500 text-yellow-500" />
              </div>
            )}
          </div>
        )}

        {/* Recipe info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
              {recipe.name}
            </h3>
            {recipe.source === 'trader_joes' && recipe.source_url && (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>

          {recipe.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {totalTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>{totalTime}m</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <Users className="size-3" />
                <span>{recipe.servings}</span>
              </div>
            )}
            {recipe.difficulty && (
              <Badge
                variant="outline"
                className={cn('text-[10px] h-5 px-1.5', difficultyColors[recipe.difficulty])}
              >
                {recipe.difficulty}
              </Badge>
            )}
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-1.5">
                  {tag}
                </Badge>
              ))}
              {recipe.tags.length > 3 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  +{recipe.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
