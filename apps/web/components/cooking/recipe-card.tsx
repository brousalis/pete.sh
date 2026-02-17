'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { transitions } from '@/lib/animations'
import type { Recipe } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ChefHat, Clock, ExternalLink, Flame, Star, Users } from 'lucide-react'
import { AddToMealPlanPopover } from './add-to-meal-plan-popover'

interface RecipeCardProps {
  recipe: Recipe
  onClick?: () => void
  onToggleFavorite?: (recipe: Recipe) => void
  className?: string
  fridgeScore?: number
  fridgeFilterActive?: boolean
}

export function RecipeCard({
  recipe,
  onClick,
  onToggleFavorite,
  className,
  fridgeScore,
  fridgeFilterActive: isFridgeActive,
}: RecipeCardProps) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const resolvedImage = resolveRecipeImageUrl(recipe.image_url)
  const difficultyColors = {
    easy: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
    medium: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
    hard: 'bg-red-500/15 text-red-500 border-red-500/20',
  }

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={transitions.springGentle}
    >
      <Card
        className={cn(
          'group cursor-pointer overflow-hidden border-border/50 transition-all hover:shadow-lg hover:border-border hover:bg-card/80',
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-0">
          {/* Image area */}
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

            {/* Subtle gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Top badges */}
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              {recipe.source === 'trader_joes' && (
                <Badge className="bg-red-600 text-white text-[10px] h-5 px-1.5 border-0 shadow-md">
                  TJ&apos;s
                </Badge>
              )}
              {isFridgeActive && fridgeScore != null && fridgeScore > 0 && (
                <FridgeMatchBadge score={fridgeScore} />
              )}
              {recipe.is_favorite && (
                <div className="rounded-full bg-black/40 p-1 backdrop-blur-sm">
                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                </div>
              )}
            </div>

            {/* Bottom info overlay */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-2.5 pb-2">
              <div className="flex items-center gap-1.5">
                {recipe.calories_per_serving && (
                  <Badge className="bg-black/40 text-white backdrop-blur-sm border-0 text-[10px] h-5 shadow-sm">
                    <Flame className="size-2.5 mr-0.5 text-orange-400" />
                    {recipe.calories_per_serving}
                  </Badge>
                )}
                {totalTime > 0 && (
                  <Badge className="bg-black/40 text-white backdrop-blur-sm border-0 text-[10px] h-5 shadow-sm">
                    <Clock className="size-2.5 mr-0.5" />
                    {totalTime}m
                  </Badge>
                )}
              </div>
              <div
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <AddToMealPlanPopover
                  recipeId={recipe.id}
                  recipeName={recipe.name}
                  variant="icon"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug line-clamp-1 flex-1">
                {recipe.name}
              </h3>
              {recipe.source === 'trader_joes' && recipe.source_url && (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                >
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>

            {recipe.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {recipe.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {recipe.servings && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <Users className="size-2.5" />
                  {recipe.servings}
                </span>
              )}
              {recipe.difficulty && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] h-4 px-1.5 font-medium',
                    difficultyColors[recipe.difficulty]
                  )}
                >
                  {recipe.difficulty}
                </Badge>
              )}
              {recipe.tags && recipe.tags.length > 0 && (
                <>
                  {recipe.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] h-4 px-1.5 font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {recipe.tags.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{recipe.tags.length - 2}
                    </span>
                  )}
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

export function RecipeCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Skeleton className="aspect-[16/10] w-full rounded-none" />
        <div className="space-y-1.5 px-3 py-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-1.5 pt-0.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
