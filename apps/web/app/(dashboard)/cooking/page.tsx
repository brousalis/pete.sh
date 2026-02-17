'use client'

import { CookingMode } from '@/components/cooking/cooking-mode'
import { ImportRecipeDialog } from '@/components/cooking/import-recipe-dialog'
import { MealPlanCalendar } from '@/components/cooking/meal-plan-calendar'
import { RecipeDetailSheet } from '@/components/cooking/recipe-detail'
import { RecipeEditor } from '@/components/cooking/recipe-editor'
import { RecipeList } from '@/components/cooking/recipe-list'
import { ShoppingList } from '@/components/cooking/shopping-list'
import { TraderJoesDetailSheet } from '@/components/cooking/trader-joes-detail'
import { Button } from '@/components/ui/button'
import { CookingProvider, useCooking } from '@/hooks/use-cooking-data'
import { fadeUpVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type {
    Recipe,
    RecipeWithIngredients,
    TraderJoesRecipe,
} from '@/lib/types/cooking.types'
import { AnimatePresence, motion } from 'framer-motion'
import {
    CalendarDays,
    ChefHat,
    Plus,
    ShoppingCart,
    UtensilsCrossed,
} from 'lucide-react'
import { useCallback, useState } from 'react'

export default function CookingPage() {
  return (
    <CookingProvider>
      <CookingPageContent />
    </CookingProvider>
  )
}

type CookingTab = 'recipes' | 'meal-plan' | 'shopping-list'

function CookingPageContent() {
  const {
    recipes,
    tjRecipes,
    mealPlan,
    shoppingList,
    activeTab,
    setActiveTab,
    selectedRecipeId,
    setSelectedRecipeId,
    selectedTjRecipe,
    setSelectedTjRecipe,
    showEditor,
    setShowEditor,
    editingRecipe,
    setEditingRecipe,
    refreshRecipes,
    refreshShoppingList,
    showCookingMode,
    setShowCookingMode,
    cookingRecipe,
    setCookingRecipe,
  } = useCooking()

  const [importRecipe, setImportRecipe] = useState<TraderJoesRecipe | null>(
    null
  )

  const plannedMealsCount = (() => {
    if (!mealPlan) return 0
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ] as const
    const meals = ['breakfast', 'lunch', 'dinner', 'snack'] as const
    let count = 0
    days.forEach((day) => {
      const dayMeals = mealPlan.meals[day]
      if (dayMeals) {
        meals.forEach((m) => {
          if (dayMeals[m]) count++
        })
      }
    })
    return count
  })()
  const shoppingItemCount = shoppingList?.items.length || 0

  const handleRecipeClick = useCallback(
    (recipe: Recipe) => {
      setSelectedRecipeId(recipe.id)
    },
    [setSelectedRecipeId]
  )

  const handleTjRecipeClick = useCallback(
    (recipe: TraderJoesRecipe) => {
      setSelectedTjRecipe(recipe)
    },
    [setSelectedTjRecipe]
  )

  const handleNewRecipe = useCallback(() => {
    setEditingRecipe(null)
    setShowEditor(true)
  }, [setEditingRecipe, setShowEditor])

  const handleEditRecipe = useCallback(
    (recipe: RecipeWithIngredients) => {
      setEditingRecipe(recipe)
      setShowEditor(true)
      setSelectedRecipeId(null)
    },
    [setEditingRecipe, setShowEditor, setSelectedRecipeId]
  )

  const handleSaveRecipe = useCallback(
    async (_recipe: RecipeWithIngredients) => {
      setShowEditor(false)
      setEditingRecipe(null)
      await refreshRecipes()
    },
    [setShowEditor, setEditingRecipe, refreshRecipes]
  )

  const handleCancelEdit = useCallback(() => {
    setShowEditor(false)
    setEditingRecipe(null)
  }, [setShowEditor, setEditingRecipe])

  const handleDeleteRecipe = useCallback(async () => {
    setSelectedRecipeId(null)
    await refreshRecipes()
  }, [setSelectedRecipeId, refreshRecipes])

  const handleImportTj = useCallback((recipe: TraderJoesRecipe) => {
    setImportRecipe(recipe)
  }, [])

  const handleImportComplete = useCallback(
    async (_imported: RecipeWithIngredients) => {
      setImportRecipe(null)
      setSelectedTjRecipe(null)
      await refreshRecipes()
    },
    [setSelectedTjRecipe, refreshRecipes]
  )

  const handleStartCooking = useCallback(
    (recipe: RecipeWithIngredients) => {
      setCookingRecipe(recipe)
      setShowCookingMode(true)
      setSelectedRecipeId(null)
    },
    [setCookingRecipe, setShowCookingMode, setSelectedRecipeId]
  )

  const handleMealPlanRecipeClick = useCallback(
    (recipeId: string) => {
      setSelectedRecipeId(recipeId)
    },
    [setSelectedRecipeId]
  )

  const handleGenerateShoppingList = useCallback(async () => {
    await refreshShoppingList()
    setActiveTab('shopping-list')
  }, [refreshShoppingList, setActiveTab])

  if (showEditor) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
      >
        <RecipeEditor
          recipe={editingRecipe || undefined}
          onSave={handleSaveRecipe}
          onCancel={handleCancelEdit}
        />
      </motion.div>
    )
  }

  const tabs: { value: CookingTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { value: 'recipes', label: 'Recipes', icon: UtensilsCrossed },
    { value: 'meal-plan', label: 'Meal Plan', icon: CalendarDays, badge: plannedMealsCount || undefined },
    { value: 'shopping-list', label: 'Shopping', icon: ShoppingCart, badge: shoppingItemCount || undefined },
  ]

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
        className="space-y-5"
      >
        {/* Compact header with inline tab navigation */}
        <div className="flex items-end border-b border-border/40">
          <div className="flex items-center gap-2.5 pb-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/15">
              <ChefHat className="size-4 text-orange-500" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Cooking</h1>
          </div>

          <nav className="ml-4 flex items-end">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.value
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 pb-2.5 text-sm font-medium transition-colors -mb-px border-b-2',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                  {tab.badge != null && tab.badge > 0 && (
                    <span className={cn(
                      'ml-0.5 flex items-center justify-center rounded-full text-[10px] font-semibold tabular-nums min-w-[16px] h-[16px] px-0.5',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted-foreground/15 text-muted-foreground'
                    )}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {activeTab === 'recipes' && (
            <div className="ml-auto pb-2">
              <Button onClick={handleNewRecipe} size="icon" className="size-8 rounded-lg">
                <Plus className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'recipes' && (
            <motion.div
              key="recipes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <RecipeList
                onRecipeClick={handleRecipeClick}
                onTjRecipeClick={handleTjRecipeClick}
                onNewRecipe={handleNewRecipe}
                onImportTj={handleImportTj}
              />
            </motion.div>
          )}

          {activeTab === 'meal-plan' && (
            <motion.div
              key="meal-plan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <MealPlanCalendar
                onRecipeClick={handleMealPlanRecipeClick}
                onGenerateShoppingList={handleGenerateShoppingList}
              />
            </motion.div>
          )}

          {activeTab === 'shopping-list' && (
            <motion.div
              key="shopping-list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ShoppingList />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recipe detail sheet (own recipes) */}
      <RecipeDetailSheet
        recipeId={selectedRecipeId}
        open={!!selectedRecipeId}
        onOpenChange={(open) => {
          if (!open) setSelectedRecipeId(null)
        }}
        onEdit={handleEditRecipe}
        onDelete={handleDeleteRecipe}
        onStartCooking={handleStartCooking}
      />

      {/* TJ recipe detail sheet */}
      <TraderJoesDetailSheet
        recipe={selectedTjRecipe}
        open={!!selectedTjRecipe}
        onOpenChange={(open) => {
          if (!open) setSelectedTjRecipe(null)
        }}
        onImport={handleImportTj}
      />

      {/* Import dialog */}
      {importRecipe && (
        <ImportRecipeDialog
          open={!!importRecipe}
          onOpenChange={(open) => {
            if (!open) setImportRecipe(null)
          }}
          recipe={importRecipe}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Cooking mode overlay */}
      <AnimatePresence>
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
      </AnimatePresence>
    </>
  )
}
