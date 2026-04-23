'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { Button } from '@/components/ui/button'
import { useCooking } from '@/hooks/use-cooking-data'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { Check, Clock, Flame, UtensilsCrossed, Users } from 'lucide-react'
import Link from 'next/link'

type MealType = 'breakfast' | 'lunch' | 'dinner'

export function MealDetail({ meal }: { meal: MealType }) {
  const { mealPlan: dashboardMealPlan, dayOfWeek, recipes } = useDashboardV3()
  const cooking = useCooking()
  const mealPlan = cooking.mealPlan ?? dashboardMealPlan
  const dayMeals = mealPlan?.meals[dayOfWeek]
  const recipeId = dayMeals?.[meal]
  const recipe =
    typeof recipeId === 'string'
      ? recipes.find(r => r.id === recipeId) ?? null
      : null

  const completion = recipe ? cooking.isSlotCompleted(dayOfWeek, meal) : null

  if (!recipe) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm ring-1 ring-border/40 ring-inset">
        <UtensilsCrossed className="size-7 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3 capitalize">
          No {meal} planned
        </p>
        <Link href="/cooking">
          <Button variant="outline" size="sm" className="text-xs">
            Plan meals
          </Button>
        </Link>
      </div>
    )
  }

  const imageUrl = resolveRecipeImageUrl(recipe.image_url)
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
      {imageUrl ? (
        <div className="relative h-40 bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {meal}
            </span>
            <h3 className="text-lg font-bold mt-0.5">{recipe.name}</h3>
          </div>
        </div>
      ) : (
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-accent-sage/8 via-accent-sage/4 to-transparent">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {meal}
          </span>
          <h3 className="text-lg font-bold mt-0.5">{recipe.name}</h3>
        </div>
      )}

      <div className="p-5 space-y-4">
        <div className="flex items-center gap-4 text-sm">
          {totalTime > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="tabular-nums font-medium">{totalTime} min</span>
            </div>
          )}
          {recipe.calories_per_serving && (
            <div className="flex items-center gap-1.5">
              <Flame className="size-3.5 text-accent-ember" />
              <span className="tabular-nums font-medium">
                {recipe.calories_per_serving} cal
              </span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-muted-foreground" />
              <span className="tabular-nums font-medium">
                {recipe.servings}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (completion) {
                cooking.deleteCompletion(completion.id)
              } else {
                void cooking.createCompletion({
                  recipe_id: recipe.id,
                  meal_plan_id: cooking.mealPlan?.id ?? '',
                  day_of_week: dayOfWeek,
                  meal_type: meal,
                })
              }
            }}
            className={cn(
              'h-7 text-xs rounded-md px-3',
              completion
                ? 'bg-muted text-muted-foreground hover:bg-muted/70'
                : 'bg-accent-sage text-white hover:bg-accent-sage/90'
            )}
          >
            {completion ? (
              <>
                <Check className="size-3 mr-1" /> Cooked
              </>
            ) : (
              'Mark cooked'
            )}
          </Button>
          <Link href={`/cooking`}>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Open recipe
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
