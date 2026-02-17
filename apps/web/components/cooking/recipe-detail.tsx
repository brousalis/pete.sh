'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { apiDelete, apiGet } from '@/lib/api/client'
import type { RecipeWithIngredients } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import {
    Beef,
    ChefHat,
    Clock,
    Droplets,
    Edit,
    ExternalLink,
    Flame,
    History,
    Minus,
    PlayCircle,
    Plus,
    RotateCcw,
    Star,
    Trash2,
    Wheat,
    X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AddToMealPlanPopover } from './add-to-meal-plan-popover'
import { RecipeVersionHistory } from './recipe-version-history'

interface RecipeDetailSheetProps {
  recipeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (recipe: RecipeWithIngredients) => void
  onDelete?: () => void
  onStartCooking?: (recipe: RecipeWithIngredients) => void
}

export function RecipeDetailSheet({
  recipeId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onStartCooking,
}: RecipeDetailSheetProps) {
  const { toast } = useToast()
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [scaledServings, setScaledServings] = useState<number | null>(null)

  useEffect(() => {
    if (recipeId && open) {
      fetchRecipe(recipeId)
    }
    if (!open) {
      setScaledServings(null)
    }
  }, [recipeId, open])

  const fetchRecipe = async (id: string) => {
    setLoading(true)
    try {
      const response = await apiGet<RecipeWithIngredients>(
        `/api/cooking/recipes/${id}`
      )
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
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!recipe) return
    setDeleting(true)
    try {
      const response = await apiDelete(`/api/cooking/recipes/${recipe.id}`)
      if (response.success) {
        toast({ title: 'Recipe deleted' })
        onOpenChange(false)
        onDelete?.()
      } else {
        throw new Error(response.error || 'Failed to delete')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete recipe',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  // Recipe scaling
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

  const totalTime = recipe
    ? (recipe.prep_time || 0) + (recipe.cook_time || 0)
    : 0

  const difficultyColors = {
    easy: 'bg-green-500/10 text-green-600',
    medium: 'bg-yellow-500/10 text-yellow-600',
    hard: 'bg-red-500/10 text-red-600',
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl lg:max-w-2xl p-0 overflow-hidden"
        >
          {loading ? (
            <RecipeDetailSkeleton />
          ) : !recipe ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <ChefHat className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Recipe not found</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* Header */}
              <SheetHeader className="shrink-0 border-b p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-lg line-clamp-2">
                        {recipe.name}
                      </SheetTitle>
                      {recipe.is_favorite && (
                        <Star className="size-4 shrink-0 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                    {recipe.description && (
                      <SheetDescription className="mt-1 line-clamp-2">
                        {recipe.description}
                      </SheetDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3">
                  {recipe.instructions && recipe.instructions.length > 0 && (
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => onStartCooking?.(recipe)}
                    >
                      <PlayCircle className="size-4 mr-1.5" />
                      Start Cooking
                    </Button>
                  )}
                  <AddToMealPlanPopover
                    recipeId={recipe.id}
                    recipeName={recipe.name}
                    variant="button"
                  />
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => onEdit(recipe)}
                    >
                      <Edit className="size-3.5 mr-1.5" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </SheetHeader>

              {/* Scrollable content */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                  {/* Image */}
                  {resolveRecipeImageUrl(recipe.image_url) && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                      <img
                        src={resolveRecipeImageUrl(recipe.image_url)!}
                        alt={recipe.name}
                        className="h-full w-full object-cover"
                      />
                      {recipe.source === 'trader_joes' && (
                        <Badge className="absolute right-3 top-3 bg-red-600 text-white border-0">
                          Trader Joe's
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Meta pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {totalTime > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="size-3" />
                        {totalTime} min
                        {recipe.prep_time && recipe.cook_time && (
                          <span className="text-muted-foreground ml-1 text-[10px]">
                            ({recipe.prep_time}p + {recipe.cook_time}c)
                          </span>
                        )}
                      </Badge>
                    )}
                    {recipe.difficulty && (
                      <Badge
                        className={cn(
                          'border-0',
                          difficultyColors[recipe.difficulty]
                        )}
                      >
                        {recipe.difficulty}
                      </Badge>
                    )}
                    {recipe.source === 'trader_joes' && recipe.source_url && (
                      <a
                        href={recipe.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge
                          variant="outline"
                          className="gap-1 cursor-pointer hover:bg-muted"
                        >
                          <ExternalLink className="size-3" />
                          View on TJ's
                        </Badge>
                      </a>
                    )}
                  </div>

                  {/* Tags */}
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Nutrition */}
                  {recipe.calories_per_serving && (
                    <NutritionCard
                      calories={recipe.calories_per_serving}
                      protein={recipe.protein_g}
                      fat={recipe.fat_g}
                      carbs={recipe.carbs_g}
                      scaleFactor={scaleFactor}
                    />
                  )}

                  {/* Content tabs */}
                  <Tabs defaultValue="ingredients">
                    <TabsList layoutId="recipe-detail-tabs" className="w-full">
                      <TabsTrigger
                        value="ingredients"
                        layoutId="recipe-detail-tabs"
                        className="flex-1"
                      >
                        Ingredients
                      </TabsTrigger>
                      <TabsTrigger
                        value="instructions"
                        layoutId="recipe-detail-tabs"
                        className="flex-1"
                      >
                        Steps
                      </TabsTrigger>
                      <TabsTrigger
                        value="notes"
                        layoutId="recipe-detail-tabs"
                        className="flex-1"
                      >
                        Notes
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        layoutId="recipe-detail-tabs"
                        className="flex-1"
                      >
                        <History className="size-3.5 mr-1" />
                        History
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ingredients" className="mt-4">
                      {/* Servings adjuster */}
                      {recipe.servings && (
                        <div className="flex items-center justify-between mb-4 rounded-lg border p-3">
                          <div>
                            <span className="text-sm font-medium">Servings</span>
                            {isScaled && (
                              <span className="text-[10px] text-muted-foreground ml-2">
                                Scaled from {recipe.servings}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isScaled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => setScaledServings(null)}
                              >
                                <RotateCcw className="size-3" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                setScaledServings(
                                  Math.max(1, (displayServings || 1) - 1)
                                )
                              }
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="text-sm font-semibold w-6 text-center tabular-nums">
                              {displayServings}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                setScaledServings((displayServings || 1) + 1)
                              }
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {recipe.ingredients && recipe.ingredients.length > 0 ? (
                        <ul className="space-y-2">
                          {recipe.ingredients.map((ingredient, index) => (
                            <li
                              key={ingredient.id || index}
                              className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                            >
                              <div className="size-5 rounded-full border-2 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium">
                                  {ingredient.name}
                                </span>
                                {(ingredient.amount || ingredient.unit) && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {scaleAmount(ingredient.amount)}{' '}
                                    {ingredient.unit}
                                  </span>
                                )}
                                {ingredient.notes && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({ingredient.notes})
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No ingredients listed
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="instructions" className="mt-4">
                      {recipe.instructions && recipe.instructions.length > 0 ? (
                        <ol className="space-y-4">
                          {recipe.instructions.map((step, index) => (
                            <li key={index} className="flex gap-3">
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                                {step.step_number}
                              </div>
                              <div className="flex-1 pt-0.5">
                                <p className="text-sm leading-relaxed">
                                  {step.instruction}
                                </p>
                                {step.duration && (
                                  <Badge
                                    variant="outline"
                                    className="mt-1.5 text-[10px] gap-1"
                                  >
                                    <Clock className="size-2.5" />~
                                    {step.duration} min
                                  </Badge>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No instructions listed
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="notes" className="mt-4">
                      {recipe.notes ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {recipe.notes}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No notes
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-4">
                      <RecipeVersionHistory
                        recipeId={recipe.id}
                        onRestore={() => fetchRecipe(recipe.id)}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{recipe?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function NutritionCard({
  calories,
  protein,
  fat,
  carbs,
  scaleFactor,
}: {
  calories: number
  protein?: number
  fat?: number
  carbs?: number
  scaleFactor: number
}) {
  const scale = (val: number | undefined) =>
    val ? Math.round(val * scaleFactor) : null

  const scaledCal = Math.round(calories * scaleFactor)
  const scaledProtein = scale(protein)
  const scaledFat = scale(fat)
  const scaledCarbs = scale(carbs)

  const totalMacros = (scaledProtein || 0) + (scaledFat || 0) + (scaledCarbs || 0)

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="size-4 text-orange-500" />
          <span className="text-sm font-semibold">
            {scaledCal} calories
          </span>
          <span className="text-[10px] text-muted-foreground">per serving</span>
        </div>
        {(scaledProtein || scaledFat || scaledCarbs) && (
          <div className="grid grid-cols-3 gap-3">
            {scaledProtein && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Beef className="size-3 text-red-500" />
                  <span className="text-xs text-muted-foreground">Protein</span>
                </div>
                <span className="text-sm font-semibold">{scaledProtein}g</span>
                {totalMacros > 0 && (
                  <Progress
                    value={(scaledProtein / totalMacros) * 100}
                    className="h-1 mt-1"
                  />
                )}
              </div>
            )}
            {scaledFat && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Droplets className="size-3 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Fat</span>
                </div>
                <span className="text-sm font-semibold">{scaledFat}g</span>
                {totalMacros > 0 && (
                  <Progress
                    value={(scaledFat / totalMacros) * 100}
                    className="h-1 mt-1"
                  />
                )}
              </div>
            )}
            {scaledCarbs && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Wheat className="size-3 text-amber-600" />
                  <span className="text-xs text-muted-foreground">Carbs</span>
                </div>
                <span className="text-sm font-semibold">{scaledCarbs}g</span>
                {totalMacros > 0 && (
                  <Progress
                    value={(scaledCarbs / totalMacros) * 100}
                    className="h-1 mt-1"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecipeDetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
