'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle2,
  Circle,
  ShoppingCart,
  Plus,
  Copy,
  ChevronDown,
  ChevronRight,
  Trash2,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useCooking } from '@/hooks/use-cooking-data'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { transitions } from '@/lib/animations'
import type { ShoppingListItem } from '@/lib/types/cooking.types'

interface ManualItem {
  name: string
  checked: boolean
}

const categorizeIngredient = (name: string): string => {
  const lower = name.toLowerCase()
  if (/milk|cheese|yogurt|cream|butter|sour cream|half.and.half|crème/.test(lower))
    return 'Dairy'
  if (/egg/.test(lower)) return 'Dairy'
  if (/chicken|beef|pork|turkey|sausage|bacon|meat|steak|lamb|ground/.test(lower))
    return 'Meat & Poultry'
  if (/salmon|tuna|shrimp|fish|cod|crab|lobster|scallop/.test(lower))
    return 'Seafood'
  if (
    /lettuce|tomato|onion|garlic|pepper|carrot|celery|spinach|kale|broccoli|potato|mushroom|avocado|cucumber|zucchini|squash|cabbage|corn|pea|bean sprout|jalapeño|cilantro|parsley|basil|mint|ginger|scallion|shallot|leek/.test(
      lower
    )
  )
    return 'Produce'
  if (/apple|banana|lemon|lime|orange|berry|berries|fruit|grape|mango|pear|peach/.test(lower))
    return 'Fruits'
  if (/bread|tortilla|bun|roll|pita|naan|bagel|croissant/.test(lower))
    return 'Bakery'
  if (/rice|pasta|noodle|flour|sugar|honey|maple|oil|vinegar|sauce|broth|stock|soy|sriracha/.test(lower))
    return 'Pantry'
  if (/salt|pepper|cumin|paprika|oregano|thyme|rosemary|cinnamon|nutmeg|chili|cayenne|turmeric/.test(lower))
    return 'Spices'
  if (/can |canned|beans|lentil|chickpea|diced tomato/.test(lower))
    return 'Canned Goods'
  if (/frozen/.test(lower)) return 'Frozen'
  return 'Other'
}

const CATEGORY_ORDER = [
  'Produce',
  'Fruits',
  'Meat & Poultry',
  'Seafood',
  'Dairy',
  'Bakery',
  'Pantry',
  'Spices',
  'Canned Goods',
  'Frozen',
  'Other',
]

interface ShoppingListProps {
  onRecipeClick?: (recipeName: string) => void
}

export function ShoppingList({ onRecipeClick }: ShoppingListProps) {
  const { shoppingList, shoppingListLoading, refreshShoppingList, mealPlan } =
    useCooking()
  const { toast } = useToast()
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [newItemInput, setNewItemInput] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  )

  // Load on mount and when meal plan changes
  useEffect(() => {
    refreshShoppingList()
  }, [refreshShoppingList])

  // Restore checked state from localStorage
  useEffect(() => {
    if (shoppingList) {
      const stored = localStorage.getItem(`shopping-list-${shoppingList.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setCheckedItems(new Set(parsed.checked || []))
          setManualItems(parsed.manual || [])
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [shoppingList?.id])

  // Persist to localStorage
  const persistState = (
    checked: Set<string>,
    manual: ManualItem[]
  ) => {
    if (shoppingList) {
      localStorage.setItem(
        `shopping-list-${shoppingList.id}`,
        JSON.stringify({
          checked: Array.from(checked),
          manual,
        })
      )
    }
  }

  const handleToggleItem = (ingredient: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(ingredient)) {
      newChecked.delete(ingredient)
    } else {
      newChecked.add(ingredient)
    }
    setCheckedItems(newChecked)
    persistState(newChecked, manualItems)
  }

  const handleToggleManualItem = (index: number) => {
    const updated = manualItems.map((item, i) =>
      i === index ? { name: item.name, checked: !item.checked } : item
    )
    setManualItems(updated)
    persistState(checkedItems, updated)
  }

  const handleAddManualItem = () => {
    if (!newItemInput.trim()) return
    const updated = [...manualItems, { name: newItemInput.trim(), checked: false }]
    setManualItems(updated)
    setNewItemInput('')
    persistState(checkedItems, updated)
  }

  const handleRemoveManualItem = (index: number) => {
    const updated = manualItems.filter((_, i) => i !== index)
    setManualItems(updated)
    persistState(checkedItems, updated)
  }

  const handleCopyToClipboard = () => {
    const lines: string[] = []
    if (shoppingList) {
      grouped.forEach(([category, items]) => {
        lines.push(`\n${category}:`)
        items.forEach((item) => {
          const checked = checkedItems.has(item.ingredient)
          lines.push(
            `  ${checked ? '✓' : '○'} ${item.ingredient}${item.amount ? ` - ${item.amount} ${item.unit}` : ''}`
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

  // Group items by category
  const grouped = useMemo(() => {
    if (!shoppingList) return []
    const groups = new Map<string, ShoppingListItem[]>()
    shoppingList.items.forEach((item) => {
      const category = categorizeIngredient(item.ingredient)
      if (!groups.has(category)) groups.set(category, [])
      groups.get(category)!.push(item)
    })
    return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map(
      (cat) => [cat, groups.get(cat)!] as [string, ShoppingListItem[]]
    )
  }, [shoppingList])

  // Progress
  const totalItems =
    (shoppingList?.items.length || 0) + manualItems.length
  const checkedCount =
    (shoppingList?.items.filter((item) => checkedItems.has(item.ingredient))
      .length || 0) + manualItems.filter((i) => i.checked).length
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0

  if (shoppingListLoading) {
    return <ShoppingListSkeleton />
  }

  if (!shoppingList || (shoppingList.items.length === 0 && manualItems.length === 0)) {
    return (
      <div className="py-16 text-center">
        <ShoppingCart className="size-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground mb-1">
          No shopping list yet
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Plan your meals to automatically generate a shopping list
        </p>

        {/* Still allow manual items */}
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
            checkedItems.has(item.ingredient)
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
                        const isChecked = checkedItems.has(item.ingredient)
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
                              onToggle={() => handleToggleItem(item.ingredient)}
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
                    <button onClick={() => handleToggleManualItem(index)}>
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
                      onClick={() => handleRemoveManualItem(index)}
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
          {(amount || unit) && (
            <span className="text-xs text-muted-foreground shrink-0">
              {amount} {unit}
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
