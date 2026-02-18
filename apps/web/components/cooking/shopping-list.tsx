'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useCooking } from '@/hooks/use-cooking-data'
import { useShoppingState } from '@/hooks/use-shopping-state'
import { useToast } from '@/hooks/use-toast'
import { transitions } from '@/lib/animations'
import type { ShoppingListItem } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { categorizeIngredient, CATEGORY_ORDER } from '@/lib/utils/shopping-utils'
import { motion } from 'framer-motion'
import {
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Circle,
    Copy,
    Plus,
    ShoppingCart,
    X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface ShoppingListProps {
  onRecipeClick?: (recipeName: string) => void
}

export function ShoppingList({ onRecipeClick }: ShoppingListProps) {
  const { shoppingList, shoppingListLoading, refreshShoppingList } =
    useCooking()
  const { toast } = useToast()
  const shopState = useShoppingState(shoppingList ?? null)
  const {
    manualItems,
    toggleItem,
    isChecked: isItemChecked,
    isHidden: isItemHidden,
    toggleManualItem,
    addManualItem,
    removeManualItem,
  } = shopState

  const [newItemInput, setNewItemInput] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  )

  useEffect(() => {
    refreshShoppingList()
  }, [refreshShoppingList])

  const handleAddManualItem = () => {
    if (!newItemInput.trim()) return
    addManualItem(newItemInput)
    setNewItemInput('')
  }

  const handleCopyToClipboard = () => {
    const lines: string[] = []
    if (shoppingList) {
      grouped.forEach(([category, items]) => {
        lines.push(`\n${category}:`)
        items.forEach((item) => {
          const checked = isItemChecked(item.ingredient)
          const amountStr = item.amount > 0 ? ` - ${Math.round(item.amount * 100) / 100} ${item.unit}` : item.unit ? ` - ${item.unit}` : ''
          lines.push(
            `  ${checked ? '✓' : '○'} ${item.ingredient}${amountStr}`
          )
        })
      })
    }
    if (manualItems.length > 0) {
      lines.push('\nOther Items:')
      manualItems.forEach((item) => {
        lines.push(`  ${item.checked ? '✓' : '○'} ${item.name}`)
      })
    }
    navigator.clipboard.writeText(lines.join('\n'))
    toast({ title: 'Copied to clipboard' })
  }

  const toggleCategory = (category: string) => {
    const newSet = new Set(collapsedCategories)
    if (newSet.has(category)) {
      newSet.delete(category)
    } else {
      newSet.add(category)
    }
    setCollapsedCategories(newSet)
  }

  // Group visible (non-hidden) items by category
  const grouped = useMemo(() => {
    if (!shoppingList) return []
    const groups = new Map<string, ShoppingListItem[]>()
    shoppingList.items.forEach((item) => {
      if (isItemHidden(item.ingredient)) return
      const category = categorizeIngredient(item.ingredient)
      if (!groups.has(category)) groups.set(category, [])
      groups.get(category)!.push(item)
    })
    return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map(
      (cat) => [cat, groups.get(cat)!] as [string, ShoppingListItem[]]
    )
  }, [shoppingList, isItemHidden])

  const totalItems =
    grouped.reduce((sum, [, items]) => sum + items.length, 0) + manualItems.length
  const checkedCount =
    grouped.reduce((sum, [, items]) => sum + items.filter((i) => isItemChecked(i.ingredient)).length, 0) +
    manualItems.filter((i) => i.checked).length
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0

  if (shoppingListLoading) {
    return <ShoppingListSkeleton />
  }

  if (!shoppingList || (grouped.length === 0 && manualItems.length === 0)) {
    return (
      <div className="py-16 text-center">
        <ShoppingCart className="size-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground mb-1">
          No shopping list yet
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Plan your meals to automatically generate a shopping list
        </p>

        <div className="max-w-xs mx-auto">
          <div className="flex gap-2">
            <Input
              placeholder="Add an item..."
              value={newItemInput}
              onChange={(e) => setNewItemInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddManualItem()
              }}
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8" onClick={handleAddManualItem}>
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Shopping List</h2>
            <p className="text-xs text-muted-foreground">
              {checkedCount} of {totalItems} items
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCopyToClipboard}
            >
              <Copy className="size-3 mr-1" />
              Copy
            </Button>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Manual item input */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a custom item..."
          value={newItemInput}
          onChange={(e) => setNewItemInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddManualItem()
          }}
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          onClick={handleAddManualItem}
          disabled={!newItemInput.trim()}
        >
          <Plus className="size-3.5 mr-1" />
          Add
        </Button>
      </div>

      {/* Grouped items */}
      <div className="space-y-2">
        {grouped.map(([category, items]) => {
          const categoryChecked = items.filter((item) =>
            isItemChecked(item.ingredient)
          ).length
          const isCollapsed = collapsedCategories.has(category)

          return (
            <Card key={category}>
              <Collapsible open={!isCollapsed} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-t-xl">
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{category}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {categoryChecked}/{items.length}
                      </Badge>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-3 pb-3 pt-0">
                    <div className="space-y-1">
                      {items.map((item) => {
                        const isChecked = isItemChecked(item.ingredient)
                        return (
                          <motion.div
                            key={item.ingredient}
                            layout
                            transition={transitions.springGentle}
                          >
                            <ShoppingItemRow
                              ingredient={item.ingredient}
                              amount={item.amount}
                              unit={item.unit}
                              recipes={item.recipes}
                              checked={isChecked}
                              onToggle={() => toggleItem(item.ingredient)}
                              onRecipeClick={onRecipeClick}
                            />
                          </motion.div>
                        )
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}

        {/* Manual items section */}
        {manualItems.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Custom Items</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {manualItems.filter((i) => i.checked).length}/
                  {manualItems.length}
                </Badge>
              </div>
              <div className="space-y-1">
                {manualItems.map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                  >
                    <button onClick={() => toggleManualItem(index)}>
                      {item.checked ? (
                        <CheckCircle2 className="size-5 text-green-600" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                    </button>
                    <span
                      className={cn(
                        'flex-1 text-sm transition-colors',
                        item.checked && 'line-through text-muted-foreground'
                      )}
                    >
                      {item.name}
                    </span>
                    <button
                      onClick={() => removeManualItem(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function ShoppingItemRow({
  ingredient,
  amount,
  unit,
  recipes,
  checked,
  onToggle,
  onRecipeClick,
}: {
  ingredient: string
  amount?: number
  unit?: string
  recipes: string[]
  checked: boolean
  onToggle: () => void
  onRecipeClick?: (recipeName: string) => void
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg p-2 transition-colors',
        checked ? 'opacity-60' : 'hover:bg-muted/50'
      )}
    >
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        {checked ? (
          <CheckCircle2 className="size-5 text-green-600" />
        ) : (
          <Circle className="size-5 text-muted-foreground" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm transition-colors',
              checked ? 'line-through text-muted-foreground' : 'font-medium'
            )}
          >
            {ingredient}
          </span>
          {((amount ?? 0) > 0 || unit) && (
            <span className="text-xs text-muted-foreground shrink-0">
              {(amount ?? 0) > 0 ? `${Math.round((amount ?? 0) * 100) / 100} ` : ''}{unit}
            </span>
          )}
        </div>
        {recipes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {recipes.map((recipe, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] h-4 px-1 cursor-pointer hover:bg-muted"
                onClick={() => onRecipeClick?.(recipe)}
              >
                {recipe}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ShoppingListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-3 space-y-2">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
