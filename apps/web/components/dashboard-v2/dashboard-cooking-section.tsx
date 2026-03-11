'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCard } from '@/components/cooking/cooking-sidebar'
import { RecipeDetailSheet } from '@/components/cooking/recipe-detail'
import { CookingMode } from '@/components/cooking/cooking-mode'
import { RecipeEditor } from '@/components/cooking/recipe-editor'
import type { SourceFilter } from '@/components/cooking/recipe-list'
import { RecipeList } from '@/components/cooking/recipe-list'
import { useCooking } from '@/hooks/use-cooking-data'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ViewToggle } from '@/components/ui/view-toggle'
import { Dices, Wand2 } from 'lucide-react'
import { MealPlanSwipeDialog } from '@/components/cooking/meal-plan-swipe-dialog'
import { MealPlanWizardDialog } from '@/components/cooking/meal-plan-wizard-dialog'
import { useEffect, useState } from 'react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DINNER_ONLY = ['dinner'] as const
const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

function DashboardCookingContent() {
  const cooking = useCooking()
  const {
    selectedRecipeId,
    setSelectedRecipeId,
    showEditor,
    setShowEditor,
    editingRecipe,
    setEditingRecipe,
    refreshRecipes,
    showCookingMode,
    setShowCookingMode,
    cookingRecipe,
    setCookingRecipe,
  } = cooking

  const [swipeOpen, setSwipeOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [nutritionFilter, setNutritionFilter] = useState('all')
  const [cardImageSize] = useState(140)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(timer)
  }, [search])

  const filterState = {
    search,
    debouncedSearch,
    sourceFilter,
    difficultyFilter,
    favoritesOnly,
    selectedCategories,
    setSelectedCategories,
    nutritionFilter,
  }

  const handleRecipeClick = (recipe: { id: string }) => {
    setSelectedRecipeId(recipe.id)
  }

  const handleEditRecipe = (recipe: { id: string }) => {
    setEditingRecipe(recipe as never)
    setShowEditor(true)
    setSelectedRecipeId(null)
  }

  const handleDeleteRecipe = async () => {
    setSelectedRecipeId(null)
    await refreshRecipes()
  }

  const handleStartCooking = (recipe: unknown) => {
    setCookingRecipe(recipe as never)
    setShowCookingMode(true)
    setSelectedRecipeId(null)
  }

  const activeMealTypes = cooking.mealPlanMode === 'dinner-only' ? DINNER_ONLY : ALL_MEAL_TYPES
  const plannedMealsCount = DAYS.reduce((count, day) => {
    const dayMeals = cooking.mealPlan?.meals[day]
    if (!dayMeals || dayMeals.skipped) return count
    return count + activeMealTypes.filter((mt) => dayMeals[mt as keyof typeof dayMeals]).length
  }, 0)

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Compact controls bar - meal planning is now in main day cards */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50 bg-card/40">
          <div className="flex items-center gap-2">
            {plannedMealsCount > 0 && (
              <Badge variant="secondary" className="h-5 px-2 text-[10px] tabular-nums">
                {plannedMealsCount} planned
              </Badge>
            )}
            <ViewToggle
              options={[
                { value: 'dinner-only' as const, label: 'Dinners' },
                { value: 'all-meals' as const, label: 'All' },
              ]}
              value={cooking.mealPlanMode}
              onChange={cooking.setMealPlanMode}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setSwipeOpen(true)}
                  disabled={cooking.recipesLoading}
                  aria-label="Swipe to plan"
                >
                  <Dices className="size-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Swipe to plan</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setWizardOpen(true)}
                  disabled={cooking.recipesLoading}
                  aria-label="Plan my week"
                >
                  <Wand2 className="size-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Plan my week</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <MealPlanSwipeDialog open={swipeOpen} onOpenChange={setSwipeOpen} />
        <MealPlanWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} />

        <div className="flex-1 min-h-0 flex overflow-hidden pt-3">
          <aside className="hidden lg:flex shrink-0 w-[280px] flex-col border-r border-border overflow-hidden">
            <div className="p-3 overflow-y-auto flex-1">
              <ShoppingCard onOpenFocusMode={() => {}} />
            </div>
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="flex-1 overflow-y-auto p-3">
              {showEditor ? (
                <RecipeEditor
                  recipe={editingRecipe ?? undefined}
                  onSave={async () => {
                    setShowEditor(false)
                    setEditingRecipe(null)
                    await refreshRecipes()
                  }}
                  onCancel={() => {
                    setShowEditor(false)
                    setEditingRecipe(null)
                  }}
                />
              ) : (
                <RecipeList
                  filters={filterState}
                  onRecipeClick={handleRecipeClick}
                  onNewRecipe={() => {
                    setEditingRecipe(null)
                    setShowEditor(true)
                  }}
                  cardImageSize={cardImageSize}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      <RecipeDetailSheet
        recipeId={selectedRecipeId}
        open={!!selectedRecipeId}
        onOpenChange={(open) => !open && setSelectedRecipeId(null)}
        onEdit={handleEditRecipe as never}
        onDelete={handleDeleteRecipe}
        onStartCooking={handleStartCooking as never}
      />

      {showCookingMode && cookingRecipe && (
        <CookingMode
          recipe={cookingRecipe}
          open={showCookingMode}
          onClose={() => {
            setShowCookingMode(false)
            setCookingRecipe(null)
          }}
        />
      )}
    </>
  )
}

export function DashboardCookingSection() {
  return <DashboardCookingContent />
}
