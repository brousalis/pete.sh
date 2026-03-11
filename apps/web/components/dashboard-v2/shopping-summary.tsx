'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { Progress } from '@/components/ui/progress'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export function ShoppingSummary() {
  const { shoppingList } = useDashboardV2()

  if (!shoppingList || shoppingList.items.length === 0) return null

  const hiddenCount = (shoppingList.hidden_items || []).length
  const total = Math.max(0, shoppingList.items.length - hiddenCount)
  const checked = (shoppingList.checked_items || []).length
  const progress = total > 0 ? (checked / total) * 100 : 0

  const uncheckedItems = shoppingList.items
    .filter(
      item =>
        !shoppingList.checked_items?.includes(item.ingredient) &&
        !shoppingList.hidden_items?.includes(item.ingredient)
    )
    .slice(0, 3)

  return (
    <div className="rounded-xl p-4 border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Shopping</span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {checked}/{total}
        </span>
      </div>

      <Progress value={progress} className="h-1 mb-3" />

      {uncheckedItems.length > 0 && (
        <div className="space-y-2 mb-2.5">
          {uncheckedItems.map(item => (
            <div key={item.ingredient} className="flex items-center gap-2 py-0.5">
              <div className="size-[5px] rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">{item.ingredient}</span>
              {item.amount && (
                <span className="text-[10px] text-muted-foreground/80 shrink-0 ml-auto">
                  {item.amount} {item.unit}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <Link href="/cooking" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
        View all →
      </Link>
    </div>
  )
}
