'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RecipeCard } from './recipe-card'
import { apiGet } from '@/lib/api/client'
import type { Recipe, RecipeFilters } from '@/lib/types/cooking.types'

interface RecipeListProps {
  onRecipeClick?: (recipe: Recipe) => void
  onNewRecipe?: () => void
  className?: string
}

export function RecipeList({ onRecipeClick, onNewRecipe, className }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<RecipeFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchRecipes()
  }, [filters])

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.tags?.length) queryParams.append('tags', filters.tags.join(','))
      if (filters.source) queryParams.append('source', filters.source)
      if (filters.difficulty) queryParams.append('difficulty', filters.difficulty)
      if (filters.is_favorite !== undefined)
        queryParams.append('is_favorite', filters.is_favorite.toString())

      const query = queryParams.toString()
      const response = await apiGet<Recipe[]>(`/api/cooking/recipes${query ? `?${query}` : ''}`)

      if (response.success && response.data) {
        setRecipes(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setFilters((prev) => ({ ...prev, search: value || undefined }))
  }

  const handleFilterChange = (key: keyof RecipeFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const clearFilters = () => {
    setSearch('')
    setFilters({})
  }

  const hasActiveFilters = Object.keys(filters).length > 0 || search.length > 0

  return (
    <div className={className}>
      {/* Search and filters */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-muted' : ''}
          >
            <Filter className="size-4" />
          </Button>
          {onNewRecipe && (
            <Button onClick={onNewRecipe} size="icon">
              <Plus className="size-4" />
            </Button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-lg border bg-card p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Source</label>
                <Select
                  value={filters.source || 'all'}
                  onValueChange={(value) => handleFilterChange('source', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="trader_joes">Trader Joe's</SelectItem>
                    <SelectItem value="imported">Imported</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Difficulty</label>
                <Select
                  value={filters.difficulty || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('difficulty', value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={filters.is_favorite ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  handleFilterChange('is_favorite', filters.is_favorite ? undefined : 'true')
                }
                className="h-8 text-xs"
              >
                Favorites Only
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5">
            {filters.source && (
              <Badge variant="secondary" className="text-xs">
                {filters.source}
              </Badge>
            )}
            {filters.difficulty && (
              <Badge variant="secondary" className="text-xs">
                {filters.difficulty}
              </Badge>
            )}
            {filters.is_favorite && (
              <Badge variant="secondary" className="text-xs">
                Favorites
              </Badge>
            )}
            {search && (
              <Badge variant="secondary" className="text-xs">
                Search: {search}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Recipe grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {hasActiveFilters ? 'No recipes match your filters' : 'No recipes yet'}
          </p>
          {onNewRecipe && !hasActiveFilters && (
            <Button onClick={onNewRecipe} variant="outline" size="sm" className="mt-4">
              <Plus className="size-4 mr-2" />
              Create your first recipe
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => onRecipeClick?.(recipe)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
