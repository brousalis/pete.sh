'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog'
import { useCooking } from '@/hooks/use-cooking-data'
import { useShoppingState } from '@/hooks/use-shopping-state'
import type { ShoppingListItem, ShoppingTrip } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { categorizeIngredient, CATEGORY_ORDER } from '@/lib/utils/shopping-utils'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { formatDistanceToNow } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Check,
    ChevronDown,
    Circle,
    LayoutList,
    PartyPopper,
    ShoppingBag,
    ShoppingCart,
    Undo2,
    X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

interface ShoppingFocusModeProps {
  open: boolean
  onClose: () => void
}

export function ShoppingFocusMode({ open, onClose }: ShoppingFocusModeProps) {
  const { shoppingList } = useCooking()
  const shopState = useShoppingState(shoppingList ?? null)
  const {
    manualItems,
    trips,
    toggleItem,
    hideItem,
    isChecked: isItemChecked,
    isHidden: isItemHidden,
    completeTrip,
    undoLastTrip,
    toggleManualItem,
    removeManualItem,
  } = shopState

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [showCategories, setShowCategories] = useState(true)
  const [showTripHistory, setShowTripHistory] = useState(false)
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)

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

  const flatItems = useMemo(() => {
    const all = grouped.flatMap(([, items]) => items)
    const unchecked = all.filter((i) => !isItemChecked(i.ingredient))
    const checked = all.filter((i) => isItemChecked(i.ingredient))
    return [...unchecked, ...checked]
  }, [grouped, isItemChecked])

  const visibleItemCount = grouped.reduce((sum, [, items]) => sum + items.length, 0) + manualItems.length
  const checkedCount =
    grouped.reduce((sum, [, items]) => sum + items.filter((i) => isItemChecked(i.ingredient)).length, 0) +
    manualItems.filter((i) => i.checked).length
  const hasCheckedItems = checkedCount > 0
  const progressPercent = visibleItemCount > 0 ? Math.round((checkedCount / visibleItemCount) * 100) : 0

  const totalAcquiredCount = trips.reduce((sum, t) => sum + t.items.length + t.manualItems.length, 0)
  const weekComplete = visibleItemCount === 0 && trips.length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'max-w-full h-[100dvh] sm:max-w-full sm:h-[100dvh] p-0 border-0 gap-0 overflow-hidden rounded-none',
          'bg-background',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
        )}
        style={{ display: 'flex', flexDirection: 'column' }}
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Shopping List</DialogTitle>
        </VisuallyHidden>

        <div className="flex flex-1 min-h-0 flex-col">
          {/* ── Header ── */}
          <div className="shrink-0 border-b border-border/40 bg-card/50 px-4 pt-4 pb-3 safe-area-inset-top">
            {/* Top row: close + title */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-green-500/15">
                  <ShoppingCart className="size-5 text-green-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold leading-tight">Shopping List</h2>
                    {trips.length > 0 && (
                      <span className="text-xs font-medium text-green-600 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                        Trip {trips.length + (weekComplete ? 0 : 1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {weekComplete
                      ? `All done — ${totalAcquiredCount} items across ${trips.length} trip${trips.length !== 1 ? 's' : ''}`
                      : `${checkedCount} of ${visibleItemCount} items`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'size-10 rounded-full',
                    showCategories ? 'bg-muted/50 hover:bg-muted' : 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                  onClick={() => setShowCategories((v) => !v)}
                  title={showCategories ? 'Show flat list' : 'Show categories'}
                >
                  <LayoutList className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-12 rounded-full bg-muted/50 hover:bg-muted"
                  onClick={onClose}
                >
                  <X className="size-6" />
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            {!weekComplete && (
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
            )}

            {/* Trip history toggle */}
            {trips.length > 0 && (
              <button
                onClick={() => setShowTripHistory((v) => !v)}
                className="flex w-full items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <Check className="size-3.5 text-green-500 shrink-0" />
                <span className="text-xs font-medium flex-1">
                  {trips.length} completed trip{trips.length !== 1 ? 's' : ''} &middot; {totalAcquiredCount} item{totalAcquiredCount !== 1 ? 's' : ''} acquired
                </span>
                <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', showTripHistory && 'rotate-180')} />
              </button>
            )}
          </div>

          {/* ── Trip history (collapsible) ── */}
          <AnimatePresence initial={false}>
            {showTripHistory && trips.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden shrink-0 border-b border-border/40 bg-muted/10"
              >
                <div className="px-4 py-3 space-y-2">
                  {trips.map((trip, i) => (
                    <TripHistoryCard
                      key={trip.id}
                      trip={trip}
                      tripNumber={i + 1}
                      isLatest={i === trips.length - 1}
                      isExpanded={expandedTripId === trip.id}
                      onToggleExpand={() => setExpandedTripId(expandedTripId === trip.id ? null : trip.id)}
                      onUndo={i === trips.length - 1 ? undoLastTrip : undefined}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Scrollable item list ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-3 space-y-1">
              {weekComplete ? (
                <div className="py-16 text-center">
                  <PartyPopper className="size-12 mx-auto mb-3 text-green-500/40" />
                  <p className="text-lg font-semibold text-foreground">Week Complete</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All {totalAcquiredCount} items acquired across {trips.length} trip{trips.length !== 1 ? 's' : ''}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 gap-1.5 text-muted-foreground"
                    onClick={undoLastTrip}
                  >
                    <Undo2 className="size-3.5" />
                    Undo last trip
                  </Button>
                </div>
              ) : visibleItemCount === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingCart className="size-12 mx-auto mb-3 text-muted-foreground/15" />
                  <p className="text-sm text-muted-foreground">Your shopping list is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add meals to your plan to auto-generate items</p>
                </div>
              ) : (
                <>
                  {showCategories ? (
                    grouped.map(([category, items]) => {
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
                    })
                  ) : (
                    <div className="space-y-0.5">
                      {flatItems.map((item) => {
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
                  )}

                  {/* Manual items */}
                  {manualItems.length > 0 && (
                    <div className="mb-2">
                      {showCategories && (
                        <div className="flex items-center gap-2 py-2">
                          <span className="text-sm font-semibold flex-1">Custom Items</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {manualItems.filter((i) => i.checked).length}/{manualItems.length}
                          </span>
                        </div>
                      )}
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
                className="w-full h-11 gap-2 text-sm bg-green-600 hover:bg-green-700 text-white"
                onClick={() => completeTrip(shoppingList?.items ?? [])}
              >
                <ShoppingBag className="size-4" />
                Complete Trip ({checkedCount} item{checkedCount !== 1 ? 's' : ''})
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Trip History Card ──

function TripHistoryCard({
  trip,
  tripNumber,
  isLatest,
  isExpanded,
  onToggleExpand,
  onUndo,
}: {
  trip: ShoppingTrip
  tripNumber: number
  isLatest: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onUndo?: () => void
}) {
  const itemCount = trip.items.length + trip.manualItems.length

  return (
    <div className="rounded-lg bg-card/60 border border-border/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex size-6 items-center justify-center rounded-full bg-green-500/15 shrink-0">
          <Check className="size-3 text-green-500" />
        </div>
        <button onClick={onToggleExpand} className="flex-1 text-left min-w-0">
          <span className="text-xs font-medium">Trip {tripNumber}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">
            {itemCount} item{itemCount !== 1 ? 's' : ''} &middot; {formatDistanceToNow(new Date(trip.completedAt), { addSuffix: true })}
          </span>
        </button>
        {isLatest && onUndo && (
          <button
            onClick={onUndo}
            className="shrink-0 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
          >
            <Undo2 className="size-2.5" />
            Undo
          </button>
        )}
        <button onClick={onToggleExpand} className="shrink-0 p-1">
          <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 space-y-1 border-t border-border/20 pt-2">
              {trip.items.map((item) => (
                <div key={item.ingredient} className="text-xs text-muted-foreground flex items-center gap-2">
                  <Check className="size-3 text-green-500/50 shrink-0" />
                  <span className="truncate">{item.ingredient}</span>
                  {(item.amount > 0 || item.unit) && (
                    <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-auto">
                      {item.amount > 0 ? `${Math.round(item.amount * 100) / 100} ` : ''}{item.unit}
                    </span>
                  )}
                </div>
              ))}
              {trip.manualItems.map((name) => (
                <div key={name} className="text-xs text-muted-foreground flex items-center gap-2">
                  <Check className="size-3 text-green-500/50 shrink-0" />
                  <span className="truncate">{name}</span>
                  <span className="text-[10px] text-muted-foreground/40 ml-auto">(custom)</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
