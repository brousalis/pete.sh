'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { useCooking } from '@/hooks/use-cooking-data'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import {
  Camera,
  Plus,
  Snowflake,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useState } from 'react'

interface FridgeManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenScanner: () => void
}

export function FridgeManager({
  open,
  onOpenChange,
  onOpenScanner,
}: FridgeManagerProps) {
  const {
    fridgeIngredients,
    fridgeFilterActive,
    setFridgeFilterActive,
    latestScan,
    addFridgeItem,
    removeFridgeItem,
    clearFridge,
  } = useCooking()

  const [newItem, setNewItem] = useState('')

  const handleAddItem = useCallback(async () => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    await addFridgeItem(trimmed)
    setNewItem('')
  }, [newItem, addFridgeItem])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddItem()
      }
    },
    [handleAddItem]
  )

  const handleScanClick = useCallback(() => {
    onOpenChange(false)
    setTimeout(() => onOpenScanner(), 200)
  }, [onOpenChange, onOpenScanner])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader className="pb-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/15">
              <Snowflake className="size-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base">My Fridge</SheetTitle>
              <SheetDescription className="text-xs">
                {fridgeIngredients.length} item{fridgeIngredients.length !== 1 ? 's' : ''}
                {latestScan?.created_at && (
                  <> &middot; Updated {formatDistanceToNow(new Date(latestScan.created_at), { addSuffix: true })}</>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pt-4">
          {/* Add item input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add an ingredient..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 text-sm rounded-lg flex-1"
            />
            <Button
              onClick={handleAddItem}
              size="icon"
              className="size-9 shrink-0 rounded-lg"
              disabled={!newItem.trim()}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Filter toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Snowflake className={cn(
                'size-4',
                fridgeFilterActive ? 'text-green-500' : 'text-muted-foreground'
              )} />
              <span className="text-sm font-medium">Use as recipe filter</span>
            </div>
            <Switch
              checked={fridgeFilterActive}
              onCheckedChange={setFridgeFilterActive}
              disabled={fridgeIngredients.length === 0}
            />
          </div>

          {/* Item list */}
          {fridgeIngredients.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ingredients
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={clearFridge}
                >
                  <Trash2 className="size-3 mr-1" />
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fridgeIngredients.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="text-xs gap-1 pr-1 h-7 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                  >
                    {item}
                    <button
                      onClick={() => removeFridgeItem(item)}
                      className="rounded-full p-0.5 hover:bg-green-500/20 transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted/50 mb-3">
                <Snowflake className="size-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No items in your fridge</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add items manually or scan your fridge
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-border/50 pt-3 mt-auto space-y-2">
          <Button
            variant="outline"
            className="w-full h-9 text-sm rounded-lg"
            onClick={handleScanClick}
          >
            <Camera className="size-4 mr-2" />
            Scan Fridge
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
