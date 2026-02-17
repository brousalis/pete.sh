'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import type { TraderJoesRecipe } from '@/lib/types/cooking.types'
import { resolveRecipeImageUrl } from '@/lib/utils'
import {
    Clock,
    Download,
    ExternalLink,
    Users,
    X
} from 'lucide-react'

interface TraderJoesDetailSheetProps {
  recipe: TraderJoesRecipe | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport?: (recipe: TraderJoesRecipe) => void
}

export function TraderJoesDetailSheet({
  recipe,
  open,
  onOpenChange,
  onImport,
}: TraderJoesDetailSheetProps) {
  if (!recipe) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-2xl p-0 overflow-hidden"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="shrink-0 border-b p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white text-[10px] border-0 shrink-0">
                    TJ's
                  </Badge>
                  <SheetTitle className="text-lg line-clamp-2">
                    {recipe.name}
                  </SheetTitle>
                </div>
                {recipe.recipe_data.description && (
                  <SheetDescription className="mt-1 line-clamp-2">
                    {recipe.recipe_data.description}
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

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                className="h-8"
                onClick={() => onImport?.(recipe)}
              >
                <Download className="size-4 mr-1.5" />
                Import Recipe
              </Button>
              {recipe.url && (
                <a
                  href={recipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="h-8">
                    <ExternalLink className="size-3.5 mr-1.5" />
                    View on TJ's
                  </Button>
                </a>
              )}
            </div>
          </SheetHeader>

          {/* Content */}
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
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {recipe.recipe_data.prep_time && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="size-3" />
                    {recipe.recipe_data.prep_time} min
                  </Badge>
                )}
                {recipe.recipe_data.servings && (
                  <Badge variant="secondary" className="gap-1">
                    <Users className="size-3" />
                    Serves {recipe.recipe_data.servings}
                  </Badge>
                )}
              </div>

              {/* Categories */}
              {recipe.recipe_data.categories &&
                recipe.recipe_data.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {recipe.recipe_data.categories.map((cat) => (
                      <Badge key={cat} variant="secondary">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}

              {/* Tags */}
              {recipe.recipe_data.tags &&
                recipe.recipe_data.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {recipe.recipe_data.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

              <Separator />

              {/* Ingredients */}
              {recipe.recipe_data.ingredients &&
                recipe.recipe_data.ingredients.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Ingredients</h4>
                    <ul className="space-y-1.5">
                      {recipe.recipe_data.ingredients.map(
                        (ingredient, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-sm"
                          >
                            <div className="size-4 rounded-full border-2 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">
                              {ingredient}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {/* Instructions */}
              {recipe.recipe_data.instructions &&
                recipe.recipe_data.instructions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Instructions</h4>
                    <ol className="space-y-3">
                      {recipe.recipe_data.instructions.map(
                        (instruction, idx) => (
                          <li key={idx} className="flex gap-3">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                              {idx + 1}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                              {instruction}
                            </p>
                          </li>
                        )
                      )}
                    </ol>
                  </div>
                )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
