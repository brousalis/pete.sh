'use client'

import { useState, useEffect } from 'react'
import {
  Edit,
  Trash2,
  Clock,
  Users,
  ChefHat,
  Star,
  ExternalLink,
  History,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RecipeVersionHistory } from './recipe-version-history'
import { apiGet, apiDelete } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { RecipeWithIngredients, RecipeVersion } from '@/lib/types/cooking.types'

interface RecipeDetailProps {
  recipeId: string
  onEdit?: (recipe: RecipeWithIngredients) => void
  onDelete?: () => void
  onBack?: () => void
}

export function RecipeDetail({ recipeId, onEdit, onDelete, onBack }: RecipeDetailProps) {
  const { toast } = useToast()
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchRecipe()
  }, [recipeId])

  const fetchRecipe = async () => {
    setLoading(true)
    try {
      const response = await apiGet<RecipeWithIngredients>(`/api/cooking/recipes/${recipeId}`)

      if (response.success && response.data) {
        setRecipe(response.data)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load recipe',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to fetch recipe:', error)
      toast({
        title: 'Error',
        description: 'Failed to load recipe',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await apiDelete(`/api/cooking/recipes/${recipeId}`)

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Recipe deleted',
        })
        onDelete?.()
      } else {
        throw new Error(response.error || 'Failed to delete recipe')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete recipe',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ChefHat className="size-8 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Recipe not found</p>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="mt-4">
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
        )}
      </div>
    )
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const difficultyColors = {
    easy: 'bg-green-500/10 text-green-600 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    hard: 'bg-red-500/10 text-red-600 border-red-500/20',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <h1 className="text-2xl font-bold">{recipe.name}</h1>
            {recipe.is_favorite && (
              <Star className="size-5 fill-yellow-500 text-yellow-500" />
            )}
          </div>
          {recipe.description && (
            <p className="text-muted-foreground mb-3">{recipe.description}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {totalTime > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-4" />
                <span>{totalTime} min</span>
                {recipe.prep_time && recipe.cook_time && (
                  <span className="text-xs">({recipe.prep_time} prep + {recipe.cook_time} cook)</span>
                )}
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="size-4" />
                <span>{recipe.servings} servings</span>
              </div>
            )}
            {recipe.difficulty && (
              <Badge
                variant="outline"
                className={cn('text-xs', difficultyColors[recipe.difficulty])}
              >
                {recipe.difficulty}
              </Badge>
            )}
            {recipe.source === 'trader_joes' && recipe.source_url && (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-4" />
                <span className="text-xs">View on Trader Joe's</span>
              </a>
            )}
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {recipe.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit(recipe)}>
              <Edit className="size-4 mr-2" />
              Edit
            </Button>
          )}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="size-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Recipe</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{recipe.name}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Image */}
      {recipe.image_url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="ingredients" className="w-full">
        <TabsList>
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="history">
            <History className="size-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={ingredient.id || index} className="flex items-start gap-2">
                      <CheckCircle2 className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium">{ingredient.name}</span>
                        {(ingredient.amount || ingredient.unit) && (
                          <span className="text-muted-foreground ml-2">
                            {ingredient.amount} {ingredient.unit}
                          </span>
                        )}
                        {ingredient.notes && (
                          <span className="text-muted-foreground text-sm ml-2">
                            ({ingredient.notes})
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No ingredients listed</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.instructions && recipe.instructions.length > 0 ? (
                <ol className="space-y-4">
                  {recipe.instructions.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {step.step_number}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm leading-relaxed">{step.instruction}</p>
                        {step.duration && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ~{step.duration} minutes
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">No instructions listed</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.notes ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{recipe.notes}</p>
              ) : (
                <p className="text-muted-foreground text-sm">No notes</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <RecipeVersionHistory recipeId={recipeId} onRestore={fetchRecipe} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
