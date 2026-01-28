'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, ShoppingCart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiGet, apiPost } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import type { ShoppingList, ShoppingListItem } from '@/lib/types/cooking.types'

export function ShoppingList() {
  const { toast } = useToast()
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchShoppingList()
  }, [])

  const fetchShoppingList = async () => {
    setLoading(true)
    try {
      // Get current week's meal plan
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday

      const mealPlanResponse = await apiGet<{ id: string }>(
        `/api/cooking/meal-plans?week_start=${weekStart.toISOString()}`
      )

      if (mealPlanResponse.success && mealPlanResponse.data?.id) {
        const response = await apiGet<ShoppingList>(
          `/api/cooking/meal-plans/${mealPlanResponse.data.id}/shopping-list`
        )

        if (response.success && response.data) {
          setShoppingList(response.data)
          // Initialize checked items from stored state if available
          const stored = localStorage.getItem(`shopping-list-${response.data.id}`)
          if (stored) {
            setCheckedItems(new Set(JSON.parse(stored)))
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch shopping list:', error)
      toast({
        title: 'Error',
        description: 'Failed to load shopping list',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
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

    // Save to localStorage
    if (shoppingList) {
      localStorage.setItem(
        `shopping-list-${shoppingList.id}`,
        JSON.stringify(Array.from(newChecked))
      )
    }
  }

  const handleMarkComplete = async () => {
    if (!shoppingList) return

    try {
      const response = await apiPost(
        `/api/cooking/meal-plans/${shoppingList.meal_plan_id}/shopping-list`,
        { status: 'completed' }
      )

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Shopping list marked as completed',
        })
        fetchShoppingList()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update shopping list',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!shoppingList || shoppingList.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingCart className="size-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            No shopping list yet. Create a meal plan to generate one.
          </p>
        </CardContent>
      </Card>
    )
  }

  const allChecked = shoppingList.items.every((item) => checkedItems.has(item.ingredient))
  const checkedCount = shoppingList.items.filter((item) =>
    checkedItems.has(item.ingredient)
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Shopping List</h2>
          <p className="text-sm text-muted-foreground">
            {checkedCount} of {shoppingList.items.length} items
          </p>
        </div>
        {shoppingList.status !== 'completed' && (
          <Button variant="outline" size="sm" onClick={handleMarkComplete}>
            Mark Complete
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {shoppingList.items.map((item, index) => {
              const isChecked = checkedItems.has(item.ingredient)
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => handleToggleItem(item.ingredient)}
                    className="mt-0.5 shrink-0"
                  >
                    {isChecked ? (
                      <CheckCircle2 className="size-5 text-green-600" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={isChecked ? 'line-through text-muted-foreground' : 'font-medium'}
                      >
                        {item.ingredient}
                      </span>
                      {(item.amount || item.unit) && (
                        <span className="text-sm text-muted-foreground">
                          {item.amount} {item.unit}
                        </span>
                      )}
                    </div>
                    {item.recipes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.recipes.map((recipe, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {recipe}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
