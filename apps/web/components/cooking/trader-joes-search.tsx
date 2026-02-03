'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2, ExternalLink, Download, Clock, Users, ChefHat, Tag, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ImportRecipeDialog } from './import-recipe-dialog'
import { apiGet } from '@/lib/api/client'
import type { TraderJoesRecipe } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'

interface TraderJoesSearchProps {
  onImport?: (recipe: TraderJoesRecipe) => void
}

export function TraderJoesSearch({ onImport }: TraderJoesSearchProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [allRecipes, setAllRecipes] = useState<TraderJoesRecipe[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<TraderJoesRecipe | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Load all recipes on mount
  useEffect(() => {
    fetchRecipes()
  }, [])

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Filter recipes based on search, category, and tag
  const filteredRecipes = useMemo(() => {
    let filtered = [...allRecipes]

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchLower) ||
          recipe.recipe_data.description?.toLowerCase().includes(searchLower) ||
          recipe.recipe_data.ingredients?.some((ing) => ing.toLowerCase().includes(searchLower)) ||
          recipe.recipe_data.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          recipe.recipe_data.categories?.some((cat) => cat.toLowerCase().includes(searchLower))
      )
    }

    if (category !== 'all') {
      filtered = filtered.filter((recipe) => {
        const recipeCategory = recipe.category?.toLowerCase() || ''
        const recipeCategories = recipe.recipe_data.categories?.map((c) => c.toLowerCase()) || []
        return recipeCategory === category.toLowerCase() || recipeCategories.includes(category.toLowerCase())
      })
    }

    if (selectedTag) {
      filtered = filtered.filter((recipe) =>
        recipe.recipe_data.tags?.some((tag) => tag.toLowerCase() === selectedTag.toLowerCase())
      )
    }

    return filtered
  }, [allRecipes, debouncedSearch, category, selectedTag])

  // Get unique categories and tags from all recipes
  const categories = useMemo(() => {
    const cats = new Set<string>()
    allRecipes.forEach((recipe) => {
      if (recipe.category) cats.add(recipe.category)
      recipe.recipe_data.categories?.forEach((cat) => cats.add(cat))
    })
    return Array.from(cats).sort()
  }, [allRecipes])

  const tags = useMemo(() => {
    const tagSet = new Set<string>()
    allRecipes.forEach((recipe) => {
      recipe.recipe_data.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [allRecipes])

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const response = await apiGet<TraderJoesRecipe[]>('/api/cooking/trader-joes/search')

      if (response.success && response.data) {
        setAllRecipes(response.data)
      }
    } catch (error) {
      console.error('Failed to search TJ recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecipeClick = (recipe: TraderJoesRecipe) => {
    setSelectedRecipe(recipe)
    setDetailDialogOpen(true)
  }

  const handleImport = (recipe: TraderJoesRecipe) => {
    setSelectedRecipe(recipe)
    setImportDialogOpen(true)
  }

  const handleImportComplete = () => {
    setImportDialogOpen(false)
    setSelectedRecipe(null)
    onImport?.(selectedRecipe!)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search controls */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search recipes, ingredients, descriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat.toLowerCase()}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags filter */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="size-3" />
                Filter by tag:
              </span>
              {selectedTag && (
                <Badge
                  variant="default"
                  className="cursor-pointer gap-1"
                  onClick={() => setSelectedTag('')}
                >
                  {selectedTag}
                  <X className="size-3" />
                </Badge>
              )}
              {tags
                .filter((tag) => tag !== selectedTag)
                .slice(0, 10)
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
            </div>
          )}

          {/* Results count */}
          {!loading && (
            <div className="text-xs text-muted-foreground">
              Showing {filteredRecipes.length} of {allRecipes.length} recipes
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              {search || category !== 'all' || selectedTag
                ? 'No recipes match your filters'
                : 'Loading recipes...'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRecipes.map((recipe) => (
              <Card
                key={recipe.id}
                className="group cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
                onClick={() => handleRecipeClick(recipe)}
              >
                <CardContent className="p-4">
                  {recipe.image_url ? (
                    <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg">
                      <img
                        src={recipe.image_url}
                        alt={recipe.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                      <ChefHat className="size-8 text-muted-foreground" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
                        {recipe.name}
                      </h3>
                      {recipe.url && (
                        <a
                          href={recipe.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>

                    {/* Categories */}
                    {recipe.recipe_data.categories && recipe.recipe_data.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recipe.recipe_data.categories.slice(0, 2).map((cat) => (
                          <Badge key={cat} variant="secondary" className="text-[10px] h-5 px-1.5">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    {recipe.recipe_data.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {recipe.recipe_data.description}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {recipe.recipe_data.prep_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>{recipe.recipe_data.prep_time}m</span>
                        </div>
                      )}
                      {recipe.recipe_data.servings && (
                        <div className="flex items-center gap-1">
                          <Users className="size-3" />
                          <span>Serves {recipe.recipe_data.servings}</span>
                        </div>
                      )}
                      {recipe.recipe_data.ingredients && recipe.recipe_data.ingredients.length > 0 && (
                        <div className="text-[10px]">
                          {recipe.recipe_data.ingredients.length} ingredients
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {recipe.recipe_data.tags && recipe.recipe_data.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recipe.recipe_data.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] h-5 px-1.5">
                            {tag}
                          </Badge>
                        ))}
                        {recipe.recipe_data.tags.length > 3 && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                            +{recipe.recipe_data.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleImport(recipe)
                      }}
                    >
                      <Download className="size-4 mr-2" />
                      Import Recipe
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recipe Detail Dialog */}
      {selectedRecipe && (
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedRecipe.name}</DialogTitle>
              <DialogDescription>
                {selectedRecipe.recipe_data.description}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
              <div className="space-y-6">
                {/* Image */}
                {selectedRecipe.image_url && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <img
                      src={selectedRecipe.image_url}
                      alt={selectedRecipe.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {selectedRecipe.recipe_data.prep_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      <span>{selectedRecipe.recipe_data.prep_time} minutes</span>
                    </div>
                  )}
                  {selectedRecipe.recipe_data.servings && (
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <span>Serves {selectedRecipe.recipe_data.servings}</span>
                    </div>
                  )}
                  {selectedRecipe.url && (
                    <a
                      href={selectedRecipe.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="size-4" />
                      <span>View on Trader Joe's</span>
                    </a>
                  )}
                </div>

                {/* Categories */}
                {selectedRecipe.recipe_data.categories && selectedRecipe.recipe_data.categories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipe.recipe_data.categories.map((cat) => (
                        <Badge key={cat} variant="secondary">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedRecipe.recipe_data.tags && selectedRecipe.recipe_data.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipe.recipe_data.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Ingredients */}
                {selectedRecipe.recipe_data.ingredients &&
                  selectedRecipe.recipe_data.ingredients.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Ingredients</h4>
                      <ul className="space-y-1 list-disc list-inside text-sm">
                        {selectedRecipe.recipe_data.ingredients.map((ingredient, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            {ingredient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Instructions */}
                {selectedRecipe.recipe_data.instructions &&
                  selectedRecipe.recipe_data.instructions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Instructions</h4>
                      <ol className="space-y-2 list-decimal list-inside text-sm">
                        {selectedRecipe.recipe_data.instructions.map((instruction, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            {instruction}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
              </div>
            </ScrollArea>
            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={() => {
                  setDetailDialogOpen(false)
                  handleImport(selectedRecipe)
                }}
              >
                <Download className="size-4 mr-2" />
                Import Recipe
              </Button>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Import Dialog */}
      {selectedRecipe && (
        <ImportRecipeDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          recipe={selectedRecipe}
          onImportComplete={handleImportComplete}
        />
      )}
    </>
  )
}
