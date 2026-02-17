'use client'

import { CookingMode } from '@/components/cooking/cooking-mode'
import { ImportRecipeDialog } from '@/components/cooking/import-recipe-dialog'
import { MealPlanCalendar } from '@/components/cooking/meal-plan-calendar'
import { RecipeDetailSheet } from '@/components/cooking/recipe-detail'
import { RecipeEditor } from '@/components/cooking/recipe-editor'
import { RecipeList } from '@/components/cooking/recipe-list'
import { ShoppingList } from '@/components/cooking/shopping-list'
import { TraderJoesDetailSheet } from '@/components/cooking/trader-joes-detail'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CookingProvider, useCooking } from '@/hooks/use-cooking-data'
import { fadeUpVariants } from '@/lib/animations'
import type {
    Recipe,
    RecipeWithIngredients,
    TraderJoesRecipe,
} from '@/lib/types/cooking.types'
import { AnimatePresence, motion } from 'framer-motion'
import {
    CalendarDays,
    ChefHat,
    ShoppingCart,
} from 'lucide-react'
import { useCallback, useState } from 'react'

export default function CookingPage() {
  return (
    <CookingProvider>
      <CookingPageContent />
    </CookingProvider>
  )
}

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

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
        className="space-y-4"
      >
        {/* Page header */}
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold">Cooking</h1>
            <p className="text-sm text-muted-foreground">
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} &middot; {tjRecipes.length} from Trader Joe&apos;s
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList
            layoutId="cooking-tabs"
            className="w-full sm:w-auto"
          >
            <TabsTrigger
              value="recipes"
              layoutId="cooking-tabs"
              className="gap-1.5"
            >
              <ChefHat className="size-4" />
              Recipes
            </TabsTrigger>
            <TabsTrigger
              value="meal-plan"
              layoutId="cooking-tabs"
              className="gap-1.5"
            >
              <CalendarDays className="size-4" />
              Meal Plan
              {plannedMealsCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 px-1 text-[10px]"
                >
                  {plannedMealsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="shopping-list"
              layoutId="cooking-tabs"
              className="gap-1.5"
            >
              <ShoppingCart className="size-4" />
              Shopping
              {shoppingItemCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 px-1 text-[10px]"
                >
                  {shoppingItemCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="mt-4">
            <RecipeList
              onRecipeClick={handleRecipeClick}
              onTjRecipeClick={handleTjRecipeClick}
              onNewRecipe={handleNewRecipe}
              onImportTj={handleImportTj}
            />
          </TabsContent>

          <TabsContent value="meal-plan" className="mt-4">
            <MealPlanCalendar
              onRecipeClick={handleMealPlanRecipeClick}
              onGenerateShoppingList={handleGenerateShoppingList}
            />
          </TabsContent>

          <TabsContent value="shopping-list" className="mt-4">
            <ShoppingList />
          </TabsContent>
        </Tabs>
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
