'use client'

import { useState, useEffect } from 'react'
import { Save, X, Plus, Trash2, GripVertical, Clock, Users, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { apiPost, apiPut } from '@/lib/api/client'
import type {
  Recipe,
  RecipeWithIngredients,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeIngredient,
  RecipeStep,
} from '@/lib/types/cooking.types'
import { useToast } from '@/hooks/use-toast'

interface RecipeEditorProps {
  recipe?: RecipeWithIngredients
  onSave?: (recipe: RecipeWithIngredients) => void
  onCancel?: () => void
}

export function RecipeEditor({ recipe, onSave, onCancel }: RecipeEditorProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [showCommitMessage, setShowCommitMessage] = useState(false)

  const [formData, setFormData] = useState<CreateRecipeInput>({
    name: '',
    description: '',
    source: 'custom',
    prep_time: undefined,
    cook_time: undefined,
    servings: undefined,
    difficulty: undefined,
    tags: [],
    image_url: '',
    instructions: [],
    notes: '',
    is_favorite: false,
    ingredients: [],
  })

  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        description: recipe.description || '',
        source: recipe.source,
        source_url: recipe.source_url,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        tags: recipe.tags || [],
        image_url: recipe.image_url || '',
        instructions: recipe.instructions || [],
        notes: recipe.notes || '',
        is_favorite: recipe.is_favorite,
        ingredients: recipe.ingredients.map((ing) => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          notes: ing.notes,
          order_index: ing.order_index,
        })),
      })
    }
  }, [recipe])

  const handleInputChange = (field: keyof CreateRecipeInput, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [
        ...(prev.ingredients || []),
        {
          name: '',
          amount: undefined,
          unit: '',
          notes: '',
          order_index: prev.ingredients?.length || 0,
        },
      ],
    }))
  }

  const handleRemoveIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index) || [],
    }))
  }

  const handleIngredientChange = (
    index: number,
    field: keyof RecipeIngredient,
    value: string | number | undefined
  ) => {
    setFormData((prev) => {
      const ingredients = [...(prev.ingredients || [])]
      const existing = ingredients[index]
      if (existing) {
        ingredients[index] = { ...existing, [field]: value }
      }
      return { ...prev, ingredients }
    })
  }

  const handleAddInstruction = () => {
    setFormData((prev) => ({
      ...prev,
      instructions: [
        ...(prev.instructions || []),
        {
          step_number: (prev.instructions?.length || 0) + 1,
          instruction: '',
        },
      ],
    }))
  }

  const handleRemoveInstruction = (index: number) => {
    setFormData((prev) => {
      const instructions = (prev.instructions || []).filter((_, i) => i !== index)
      // Renumber steps
      return {
        ...prev,
        instructions: instructions.map((step, i) => ({ ...step, step_number: i + 1 })),
      }
    })
  }

  const handleInstructionChange = (index: number, instruction: string) => {
    setFormData((prev) => {
      const instructions = [...(prev.instructions || [])]
      const existing = instructions[index]
      if (existing) {
        instructions[index] = { ...existing, instruction }
      }
      return { ...prev, instructions }
    })
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Recipe name is required',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      let savedRecipe: RecipeWithIngredients

      if (recipe) {
        // Update existing recipe
        const updateData: UpdateRecipeInput = {
          ...formData,
          commit_message: showCommitMessage && commitMessage ? commitMessage : undefined,
        }
        const response = await apiPut<RecipeWithIngredients>(
          `/api/cooking/recipes/${recipe.id}`,
          updateData
        )

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to update recipe')
        }

        savedRecipe = response.data
      } else {
        // Create new recipe
        const response = await apiPost<RecipeWithIngredients>('/api/cooking/recipes', formData)

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create recipe')
        }

        savedRecipe = response.data
      }

      toast({
        title: 'Success',
        description: recipe ? 'Recipe updated' : 'Recipe created',
      })

      onSave?.(savedRecipe)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save recipe',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Recipe Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., Chicken Tikka Masala"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="A brief description of the recipe..."
            className="mt-1.5"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="prep_time">Prep Time (minutes)</Label>
            <Input
              id="prep_time"
              type="number"
              value={formData.prep_time || ''}
              onChange={(e) =>
                handleInputChange('prep_time', e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="cook_time">Cook Time (minutes)</Label>
            <Input
              id="cook_time"
              type="number"
              value={formData.cook_time || ''}
              onChange={(e) =>
                handleInputChange('cook_time', e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="servings">Servings</Label>
            <Input
              id="servings"
              type="number"
              value={formData.servings || ''}
              onChange={(e) =>
                handleInputChange('servings', e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={formData.difficulty || 'all'}
              onValueChange={(value) =>
                handleInputChange('difficulty', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">None</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="image_url">Image URL</Label>
          <Input
            id="image_url"
            value={formData.image_url}
            onChange={(e) => handleInputChange('image_url', e.target.value)}
            placeholder="https://..."
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ingredients</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddIngredient}>
            <Plus className="size-4 mr-1" />
            Add Ingredient
          </Button>
        </div>

        <div className="space-y-2">
          {formData.ingredients?.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="pt-2 text-muted-foreground">
                <GripVertical className="size-4" />
              </div>
              <div className="flex-1 grid grid-cols-12 gap-2">
                <Input
                  placeholder="Ingredient name"
                  value={ingredient.name}
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  className="col-span-5"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={ingredient.amount || ''}
                  onChange={(e) =>
                    handleIngredientChange(
                      index,
                      'amount',
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  className="col-span-3"
                />
                <Input
                  placeholder="Unit"
                  value={ingredient.unit || ''}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  className="col-span-2"
                />
                <Input
                  placeholder="Notes"
                  value={ingredient.notes || ''}
                  onChange={(e) => handleIngredientChange(index, 'notes', e.target.value)}
                  className="col-span-2"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveIngredient(index)}
                className="mt-1"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Instructions</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddInstruction}>
            <Plus className="size-4 mr-1" />
            Add Step
          </Button>
        </div>

        <div className="space-y-2">
          {formData.instructions?.map((step, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
                {step.step_number}
              </div>
              <Textarea
                value={step.instruction}
                onChange={(e) => handleInstructionChange(index, e.target.value)}
                placeholder="Describe this step..."
                className="flex-1"
                rows={2}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveInstruction(index)}
                className="mt-1"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddTag()
              }
            }}
            placeholder="Add a tag..."
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={handleAddTag}>
            Add
          </Button>
        </div>
        {formData.tags && formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Additional notes, tips, or variations..."
          className="mt-1.5"
          rows={3}
        />
      </div>

      {/* Favorite toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_favorite"
          checked={formData.is_favorite}
          onChange={(e) => handleInputChange('is_favorite', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="is_favorite" className="cursor-pointer">
          Mark as favorite
        </Label>
      </div>

      {/* Commit message (for updates) */}
      {recipe && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show_commit"
              checked={showCommitMessage}
              onChange={(e) => setShowCommitMessage(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="show_commit" className="cursor-pointer">
              Add commit message for this change
            </Label>
          </div>
          {showCommitMessage && (
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="e.g., Reduced salt, added more spices"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            <X className="size-4 mr-2" />
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={loading || !formData.name.trim()}>
          <Save className="size-4 mr-2" />
          {loading ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
        </Button>
      </div>
    </div>
  )
}
