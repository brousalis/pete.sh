'use client'

import { useState, useEffect } from 'react'
import {
  Save,
  X,
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { apiPost, apiPut } from '@/lib/api/client'
import type {
  RecipeWithIngredients,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeIngredient,
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
      const instructions = (prev.instructions || []).filter(
        (_, i) => i !== index
      )
      return {
        ...prev,
        instructions: instructions.map((step, i) => ({
          ...step,
          step_number: i + 1,
        })),
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
        const updateData: UpdateRecipeInput = {
          ...formData,
          commit_message:
            showCommitMessage && commitMessage ? commitMessage : undefined,
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
        const response = await apiPost<RecipeWithIngredients>(
          '/api/cooking/recipes',
          formData
        )

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create recipe')
        }

        savedRecipe = response.data
      }

      toast({
        title: recipe ? 'Recipe updated' : 'Recipe created',
      })

      onSave?.(savedRecipe)
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to save recipe',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button variant="ghost" size="icon" className="size-8" onClick={onCancel}>
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold">
            {recipe ? 'Edit Recipe' : 'New Recipe'}
          </h1>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading || !formData.name.trim()}
          >
            <Save className="size-4 mr-1.5" />
            {loading ? 'Saving...' : recipe ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              onChange={(e) =>
                handleInputChange('description', e.target.value)
              }
              placeholder="A brief description..."
              className="mt-1.5"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="prep_time">Prep (min)</Label>
              <Input
                id="prep_time"
                type="number"
                value={formData.prep_time || ''}
                onChange={(e) =>
                  handleInputChange(
                    'prep_time',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="cook_time">Cook (min)</Label>
              <Input
                id="cook_time"
                type="number"
                value={formData.cook_time || ''}
                onChange={(e) =>
                  handleInputChange(
                    'cook_time',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={formData.servings || ''}
                onChange={(e) =>
                  handleInputChange(
                    'servings',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty || 'none'}
                onValueChange={(value) =>
                  handleInputChange(
                    'difficulty',
                    value === 'none' ? undefined : value
                  )
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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

          {/* Favorite & Tags row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="is_favorite"
                checked={formData.is_favorite}
                onCheckedChange={(checked) =>
                  handleInputChange('is_favorite', checked)
                }
              />
              <Label htmlFor="is_favorite" className="cursor-pointer text-sm">
                Favorite
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Ingredients</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleAddIngredient}
            >
              <Plus className="size-3.5 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.ingredients && formData.ingredients.length > 0 ? (
            <div className="space-y-2">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="pt-2.5 text-muted-foreground cursor-grab">
                    <GripVertical className="size-4" />
                  </div>
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <Input
                      placeholder="Name"
                      value={ingredient.name}
                      onChange={(e) =>
                        handleIngredientChange(index, 'name', e.target.value)
                      }
                      className="col-span-5"
                    />
                    <Input
                      type="number"
                      placeholder="Amt"
                      value={ingredient.amount || ''}
                      onChange={(e) =>
                        handleIngredientChange(
                          index,
                          'amount',
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                      className="col-span-2"
                    />
                    <Input
                      placeholder="Unit"
                      value={ingredient.unit || ''}
                      onChange={(e) =>
                        handleIngredientChange(index, 'unit', e.target.value)
                      }
                      className="col-span-2"
                    />
                    <Input
                      placeholder="Notes"
                      value={ingredient.notes || ''}
                      onChange={(e) =>
                        handleIngredientChange(index, 'notes', e.target.value)
                      }
                      className="col-span-3"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 mt-0.5 shrink-0"
                    onClick={() => handleRemoveIngredient(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No ingredients yet.{' '}
              <button
                onClick={handleAddIngredient}
                className="text-primary hover:underline"
              >
                Add one
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Instructions</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleAddInstruction}
            >
              <Plus className="size-3.5 mr-1" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.instructions && formData.instructions.length > 0 ? (
            <div className="space-y-3">
              {formData.instructions.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold mt-1">
                    {step.step_number}
                  </div>
                  <Textarea
                    value={step.instruction}
                    onChange={(e) =>
                      handleInstructionChange(index, e.target.value)
                    }
                    placeholder="Describe this step..."
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 mt-1 shrink-0"
                    onClick={() => handleRemoveInstruction(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No instructions yet.{' '}
              <button
                onClick={handleAddInstruction}
                className="text-primary hover:underline"
              >
                Add a step
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tags & Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tags & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-1.5">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
              >
                Add
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

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
        </CardContent>
      </Card>

      {/* Commit message for updates */}
      {recipe && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="show_commit"
                  checked={showCommitMessage}
                  onCheckedChange={setShowCommitMessage}
                />
                <Label htmlFor="show_commit" className="cursor-pointer text-sm">
                  Add a change note
                </Label>
              </div>
            </div>
            {showCommitMessage && (
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="e.g., Reduced salt, added more spices"
                className="mt-3"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom action bar */}
      <div className="flex justify-end gap-2 pb-6">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={loading || !formData.name.trim()}
        >
          <Save className="size-4 mr-1.5" />
          {loading ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
        </Button>
      </div>
    </div>
  )
}
