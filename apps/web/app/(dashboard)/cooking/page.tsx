'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RecipeList } from '@/components/cooking/recipe-list'
import { RecipeDetail } from '@/components/cooking/recipe-detail'
import { RecipeEditor } from '@/components/cooking/recipe-editor'
import { TraderJoesSearch } from '@/components/cooking/trader-joes-search'
import { MealPlanCalendar } from '@/components/cooking/meal-plan-calendar'
import { ShoppingList } from '@/components/cooking/shopping-list'
import type { Recipe, RecipeWithIngredients } from '@/lib/types/cooking.types'

type View = 'recipes' | 'meal-plan' | 'shopping-list' | 'trader-joes'

export default function CookingPage() {
  const [view, setView] = useState<View>('recipes')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
  }

  const handleEditRecipe = (recipe: RecipeWithIngredients) => {
    setEditingRecipe(recipe)
    setShowEditor(true)
    setSelectedRecipe(null)
  }

  const handleNewRecipe = () => {
    setEditingRecipe(null)
    setShowEditor(true)
    setSelectedRecipe(null)
  }

  const handleSaveRecipe = (recipe: RecipeWithIngredients) => {
    setShowEditor(false)
    setEditingRecipe(null)
    if (selectedRecipe?.id === recipe.id) {
      setSelectedRecipe(recipe)
    }
  }

  const handleCancelEdit = () => {
    setShowEditor(false)
    setEditingRecipe(null)
  }

  const handleBack = () => {
    setSelectedRecipe(null)
  }

  if (showEditor) {
    return (
      <div className="space-y-6">
        <RecipeEditor
          recipe={editingRecipe || undefined}
          onSave={handleSaveRecipe}
          onCancel={handleCancelEdit}
        />
      </div>
    )
  }

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipeId={selectedRecipe.id}
        onEdit={handleEditRecipe}
        onBack={handleBack}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="meal-plan">Meal Plan</TabsTrigger>
          <TabsTrigger value="shopping-list">Shopping List</TabsTrigger>
          <TabsTrigger value="trader-joes">Trader Joe's</TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="mt-6">
          <RecipeList onRecipeClick={handleRecipeClick} onNewRecipe={handleNewRecipe} />
        </TabsContent>

        <TabsContent value="meal-plan" className="mt-6">
          <MealPlanCalendar />
        </TabsContent>

        <TabsContent value="shopping-list" className="mt-6">
          <ShoppingList />
        </TabsContent>

        <TabsContent value="trader-joes" className="mt-6">
          <TraderJoesSearch />
        </TabsContent>
      </Tabs>
    </div>
  )
}
