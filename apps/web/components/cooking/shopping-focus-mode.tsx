'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCooking } from '@/hooks/use-cooking-data'
import { useShoppingState } from '@/hooks/use-shopping-state'
import type { ShoppingListItem } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { categorizeIngredient, CATEGORY_ORDER } from '@/lib/utils/shopping-utils'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  Circle,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

interface ShoppingFocusModeProps {
  open: boolean
  onClose: () => void
}

export function ShoppingFocusMode({ open, onClose }: ShoppingFocusModeProps) {
  const { shoppingList } = useCooking()
  const shopState = useShoppingState(shoppingList?.id ?? null)
  const {
    manualItems,
    toggleItem,
    hideItem,
    isChecked: isItemChecked,
    isHidden: isItemHidden,
    clearChecked,
    toggleManualItem,
    addManualItem,
    removeManualItem,
  } = shopState

  const [newItemInput, setNewItemInput] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAddItem = () => {
    if (!newItemInput.trim()) return
    addManualItem(newItemInput)
    setNewItemInput('')
    inputRef.current?.focus()
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

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

  const visibleItemCount = grouped.reduce((sum, [, items]) => sum + items.length, 0) + manualItems.length
  const checkedCount =
    grouped.reduce((sum, [, items]) => sum + items.filter((i) => isItemChecked(i.ingredient)).length, 0) +
    manualItems.filter((i) => i.checked).length
  const hasCheckedItems = checkedCount > 0
  const progressPercent = visibleItemCount > 0 ? Math.round((checkedCount / visibleItemCount) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'max-w-full h-[100dvh] sm:max-w-full sm:h-[100dvh] p-0 border-0 gap-0',
          'bg-background',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
        )}
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Shopping List</DialogTitle>
        </VisuallyHidden>

        <div className="flex h-full flex-col">
          {/* ── Header ── */}
          <div className="shrink-0 border-b border-border/40 bg-card/50 px-4 pt-4 pb-3 safe-area-inset-top">
            {/* Top row: close + title */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-green-500/15">
                  <ShoppingCart className="size-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight">Shopping List</h2>
                  <p className="text-xs text-muted-foreground">
                    {checkedCount} of {visibleItemCount} items
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-12 rounded-full bg-muted/50 hover:bg-muted"
                onClick={onClose}
              >
                <X className="size-6" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-3">
              <ProgressRing percent={progressPercent} size={40} />
              <div className="flex-1">
                <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-green-500"
                    initial={false}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {visibleItemCount - checkedCount} remaining
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-green-500">
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Add item input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Plus className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  ref={inputRef}
                  placeholder="Add an item..."
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem() }}
                  className="h-11 pl-10 text-sm bg-muted/40 border-border/40"
                />
              </div>
              <Button
                size="sm"
                className="h-11 px-4"
                onClick={handleAddItem}
                disabled={!newItemInput.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* ── Scrollable item list ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-3 space-y-1">
              {visibleItemCount === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingCart className="size-12 mx-auto mb-3 text-muted-foreground/15" />
                  <p className="text-sm text-muted-foreground">Your shopping list is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add meals to your plan to auto-generate items</p>
                </div>
              ) : (
                <>
                  {grouped.map(([category, items]) => {
                    const unchecked = items.filter((i) => !isItemChecked(i.ingredient))
                    const checked = items.filter((i) => isItemChecked(i.ingredient))
                    const sortedItems = [...unchecked, ...checked]
                    const categoryChecked = checked.length
                    const isCatCollapsed = collapsedCategories.has(category)

                    return (
                      <div key={category} className="mb-2">
                        <button
                          onClick={() => toggleCategory(category)}
                          className="flex w-full items-center gap-2 py-2 text-left touch-manipulation"
                        >
                          <ChevronDown
                            className={cn(
                              'size-4 text-muted-foreground transition-transform',
                              isCatCollapsed && '-rotate-90'
                            )}
                          />
                          <span className="text-sm font-semibold flex-1">{category}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {categoryChecked}/{items.length}
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {!isCatCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-0.5 pb-1">
                                {sortedItems.map((item) => {
                                  const isChecked = isItemChecked(item.ingredient)
                                  return (
                                    <FocusItemRow
                                      key={item.ingredient}
                                      label={item.ingredient}
                                      detail={item.amount > 0 ? `${Math.round(item.amount * 100) / 100} ${item.unit}` : item.unit || undefined}
                                      checked={isChecked}
                                      onToggle={() => toggleItem(item.ingredient)}
                                      onRemove={() => hideItem(item.ingredient)}
                                    />
                                  )
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}

                  {/* Manual items */}
                  {manualItems.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 py-2">
                        <span className="text-sm font-semibold flex-1">Custom Items</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {manualItems.filter((i) => i.checked).length}/{manualItems.length}
                        </span>
                      </div>
                      <div className="space-y-0.5 pb-1">
                        {manualItems.map((item, index) => (
                          <FocusItemRow
                            key={`manual-${index}`}
                            label={item.name}
                            checked={item.checked}
                            onToggle={() => toggleManualItem(index)}
                            onRemove={() => removeManualItem(index)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Bottom bar ── */}
          {hasCheckedItems && (
            <div className="shrink-0 border-t border-border/40 bg-card/50 px-4 py-3 safe-area-inset-bottom">
              <Button
                variant="outline"
                className="w-full h-11 gap-2 text-sm"
                onClick={clearChecked}
              >
                <Trash2 className="size-4" />
                Clear {checkedCount} checked item{checkedCount !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Focus Item Row (large touch targets) ──

function FocusItemRow({
  label,
  detail,
  checked,
  onToggle,
  onRemove,
}: {
  label: string
  detail?: string
  checked: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <motion.div
      layout
      initial={false}
      animate={{ opacity: checked ? 0.45 : 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-3 transition-colors touch-manipulation',
        checked ? 'bg-muted/20' : 'bg-muted/40 active:bg-muted/60'
      )}
    >
      {/* Checkbox - 44px touch target */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center size-11 shrink-0 -ml-1 touch-manipulation"
      >
        {checked ? (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="size-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm"
          >
            <Check className="size-4 text-white" />
          </motion.div>
        ) : (
          <Circle className="size-6 text-muted-foreground/40" />
        )}
      </button>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          'text-[15px] leading-tight transition-colors',
          checked ? 'line-through text-muted-foreground' : 'font-medium'
        )}>
          {label}
        </span>
        {detail && (
          <span className="text-xs text-muted-foreground/60 ml-1.5">
            {detail}
          </span>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="flex items-center justify-center size-9 shrink-0 rounded-lg text-muted-foreground/40 active:bg-destructive/10 active:text-destructive transition-colors touch-manipulation"
        title="Remove"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  )
}

// ── Progress Ring ──

function ProgressRing({ percent, size = 40 }: { percent: number; size?: number }) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          strokeLinecap="round"
          className="text-green-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold tabular-nums">{percent}%</span>
      </div>
    </div>
  )
}
