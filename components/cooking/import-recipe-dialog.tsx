'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiPost } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import type { TraderJoesRecipe, RecipeWithIngredients } from '@/lib/types/cooking.types'

interface ImportRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: TraderJoesRecipe
  onImportComplete?: () => void
}

export function ImportRecipeDialog({
  open,
  onOpenChange,
  recipe,
  onImportComplete,
}: ImportRecipeDialogProps) {
  const { toast } = useToast()
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    setImporting(true)
    try {
      const response = await apiPost<RecipeWithIngredients>(
        '/api/cooking/trader-joes/import',
        recipe
      )

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Recipe imported successfully',
        })
        onImportComplete?.()
        onOpenChange(false)
      } else {
        throw new Error(response.error || 'Failed to import recipe')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import recipe',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Recipe</DialogTitle>
          <DialogDescription>
            Import "{recipe.name}" into your recipe collection?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {recipe.image_url && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <img
                src={recipe.image_url}
                alt={recipe.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="space-y-2 text-sm">
            {recipe.recipe_data.description && (
              <div>
                <p className="font-medium mb-1">Description</p>
                <p className="text-muted-foreground">{recipe.recipe_data.description}</p>
              </div>
            )}

            {(recipe.recipe_data.prep_time || recipe.recipe_data.cook_time) && (
              <div>
                <p className="font-medium mb-1">Time</p>
                <p className="text-muted-foreground">
                  {recipe.recipe_data.prep_time && `Prep: ${recipe.recipe_data.prep_time} min`}
                  {recipe.recipe_data.prep_time && recipe.recipe_data.cook_time && ' • '}
                  {recipe.recipe_data.cook_time && `Cook: ${recipe.recipe_data.cook_time} min`}
                </p>
              </div>
            )}

            {recipe.recipe_data.servings && (
              <div>
                <p className="font-medium mb-1">Servings</p>
                <p className="text-muted-foreground">{recipe.recipe_data.servings}</p>
              </div>
            )}

            {recipe.recipe_data.ingredients && recipe.recipe_data.ingredients.length > 0 && (
              <div>
                <p className="font-medium mb-1">Ingredients ({recipe.recipe_data.ingredients.length})</p>
                <ul className="text-muted-foreground space-y-1">
                  {recipe.recipe_data.ingredients.slice(0, 5).map((ing, i) => (
                    <li key={i} className="text-xs">
                      • {ing}
                    </li>
                  ))}
                  {recipe.recipe_data.ingredients.length > 5 && (
                    <li className="text-xs text-muted-foreground/70">
                      +{recipe.recipe_data.ingredients.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="size-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
