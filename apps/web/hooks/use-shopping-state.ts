'use client'

import { apiPut } from '@/lib/api/client'
import type {
    ManualItem,
    ShoppingList,
    ShoppingListItem,
    ShoppingListStatePatch,
    ShoppingTrip,
    TripItem,
} from '@/lib/types/cooking.types'
import { normalizeIngredientName } from '@/lib/utils/shopping-utils'
import { useCallback, useEffect, useRef, useState } from 'react'

export type { ManualItem, ShoppingTrip, TripItem }

interface ShoppingState {
  checkedItems: Set<string>
  hiddenItems: Set<string>
  manualItems: ManualItem[]
  trips: ShoppingTrip[]
  toggleItem: (ingredient: string) => void
  hideItem: (ingredient: string) => void
  unhideItem: (ingredient: string) => void
  isChecked: (ingredient: string) => boolean
  isHidden: (ingredient: string) => boolean
  completeTrip: (currentItems: ShoppingListItem[]) => void
  undoLastTrip: () => void
  clearTrips: () => void
  toggleManualItem: (index: number) => void
  addManualItem: (name: string) => void
  removeManualItem: (index: number) => void
}

const LEGACY_KEY_PREFIX = 'shopping-list-'

function persistToServer(listId: string, patch: ShoppingListStatePatch) {
  apiPut(`/api/cooking/shopping-lists/${listId}/state`, patch).catch((err) =>
    console.error('Failed to persist shopping state:', err)
  )
}

/**
 * One-time migration: if the server has empty state but localStorage has data
 * for this list, push it to the server and clear the local entry.
 */
function migrateFromLocalStorage(
  list: ShoppingList
): { checked: string[]; hidden: string[]; manual: ManualItem[]; trips: ShoppingTrip[] } | null {
  if (typeof window === 'undefined') return null
  const key = `${LEGACY_KEY_PREFIX}${list.id}`
  const raw = localStorage.getItem(key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    const localChecked: string[] = parsed.checked || []
    const localHidden: string[] = parsed.hidden || []
    const localManual: ManualItem[] = parsed.manual || []
    const localTrips: ShoppingTrip[] = parsed.trips || []

    const hasLocalData =
      localChecked.length > 0 || localHidden.length > 0 || localManual.length > 0 || localTrips.length > 0
    const serverIsEmpty =
      list.checked_items.length === 0 &&
      list.hidden_items.length === 0 &&
      list.manual_items.length === 0 &&
      list.trips.length === 0

    if (hasLocalData && serverIsEmpty) {
      const normalizedChecked = [...new Set(localChecked.map(normalizeIngredientName))]
      const normalizedHidden = [...new Set(localHidden.map(normalizeIngredientName))]
      const migrated = {
        checked: normalizedChecked,
        hidden: normalizedHidden,
        manual: localManual,
        trips: localTrips,
      }

      persistToServer(list.id, {
        checked_items: migrated.checked,
        hidden_items: migrated.hidden,
        manual_items: migrated.manual,
        trips: migrated.trips,
      })

      localStorage.removeItem(key)
      return migrated
    }

    // Server already has data — just clean up the stale local entry
    localStorage.removeItem(key)
    return null
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function useShoppingState(shoppingList: ShoppingList | null): ShoppingState {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set())
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [trips, setTrips] = useState<ShoppingTrip[]>([])

  const listIdRef = useRef<string | null>(null)

  // Sync state from server data (or migrate from localStorage)
  useEffect(() => {
    if (!shoppingList) {
      if (listIdRef.current) {
        setCheckedItems(new Set())
        setHiddenItems(new Set())
        setManualItems([])
        setTrips([])
        listIdRef.current = null
      }
      return
    }

    if (listIdRef.current === shoppingList.id) return
    listIdRef.current = shoppingList.id

    const migrated = migrateFromLocalStorage(shoppingList)

    if (migrated) {
      setCheckedItems(new Set(migrated.checked))
      setHiddenItems(new Set(migrated.hidden))
      setManualItems(migrated.manual)
      setTrips(migrated.trips)
    } else {
      setCheckedItems(new Set(shoppingList.checked_items || []))
      setHiddenItems(new Set(shoppingList.hidden_items || []))
      setManualItems(shoppingList.manual_items || [])
      setTrips(shoppingList.trips || [])
    }
  }, [shoppingList])

  const getListId = useCallback(() => listIdRef.current, [])

  const sync = useCallback(
    (patch: ShoppingListStatePatch) => {
      const id = getListId()
      if (id) persistToServer(id, patch)
    },
    [getListId]
  )

  const toggleItem = useCallback(
    (ingredient: string) => {
      const key = normalizeIngredientName(ingredient)
      setCheckedItems((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        sync({ checked_items: Array.from(next) })
        return next
      })
    },
    [sync]
  )

  const hideItem = useCallback(
    (ingredient: string) => {
      const key = normalizeIngredientName(ingredient)
      setHiddenItems((prev) => {
        const next = new Set(prev)
        next.add(key)
        sync({ hidden_items: Array.from(next) })
        return next
      })
    },
    [sync]
  )

  const unhideItem = useCallback(
    (ingredient: string) => {
      const key = normalizeIngredientName(ingredient)
      setHiddenItems((prev) => {
        const next = new Set(prev)
        next.delete(key)
        sync({ hidden_items: Array.from(next) })
        return next
      })
    },
    [sync]
  )

  const isChecked = useCallback(
    (ingredient: string) => checkedItems.has(normalizeIngredientName(ingredient)),
    [checkedItems]
  )

  const isHidden = useCallback(
    (ingredient: string) => hiddenItems.has(normalizeIngredientName(ingredient)),
    [hiddenItems]
  )

  const completeTrip = useCallback(
    (currentItems: ShoppingListItem[]) => {
      const tripItems: TripItem[] = []
      for (const item of currentItems) {
        if (checkedItems.has(normalizeIngredientName(item.ingredient))) {
          tripItems.push({
            ingredient: normalizeIngredientName(item.ingredient),
            amount: item.amount,
            unit: item.unit,
          })
        }
      }
      const tripManualItems = manualItems.filter((m) => m.checked).map((m) => m.name)

      if (tripItems.length === 0 && tripManualItems.length === 0) return

      const newTrip: ShoppingTrip = {
        id: crypto.randomUUID(),
        completedAt: new Date().toISOString(),
        items: tripItems,
        manualItems: tripManualItems,
      }

      const newHidden = new Set(hiddenItems)
      checkedItems.forEach((item) => newHidden.add(item))
      const newManual = manualItems.filter((m) => !m.checked)
      const newTrips = [...trips, newTrip]

      setCheckedItems(new Set())
      setHiddenItems(newHidden)
      setManualItems(newManual)
      setTrips(newTrips)
      sync({
        checked_items: [],
        hidden_items: Array.from(newHidden),
        manual_items: newManual,
        trips: newTrips,
      })
    },
    [checkedItems, hiddenItems, manualItems, trips, sync]
  )

  const undoLastTrip = useCallback(() => {
    if (trips.length === 0) return

    const lastTrip = trips[trips.length - 1]!
    const newTrips = trips.slice(0, -1)

    const newHidden = new Set(hiddenItems)
    for (const item of lastTrip.items) {
      newHidden.delete(item.ingredient)
    }

    const restoredManual: ManualItem[] = lastTrip.manualItems.map((name) => ({
      name,
      checked: false,
    }))
    const newManual = [...manualItems, ...restoredManual]

    setHiddenItems(newHidden)
    setManualItems(newManual)
    setTrips(newTrips)
    sync({
      hidden_items: Array.from(newHidden),
      manual_items: newManual,
      trips: newTrips,
    })
  }, [trips, hiddenItems, manualItems, sync])

  const clearTrips = useCallback(() => {
    setTrips([])
    sync({ trips: [] })
  }, [sync])

  const toggleManualItem = useCallback(
    (index: number) => {
      setManualItems((prev) => {
        const next = prev.map((item, i) =>
          i === index ? { name: item.name, checked: !item.checked } : item
        )
        sync({ manual_items: next })
        return next
      })
    },
    [sync]
  )

  const addManualItem = useCallback(
    (name: string) => {
      if (!name.trim()) return
      setManualItems((prev) => {
        const next = [...prev, { name: name.trim(), checked: false }]
        sync({ manual_items: next })
        return next
      })
    },
    [sync]
  )

  const removeManualItem = useCallback(
    (index: number) => {
      setManualItems((prev) => {
        const next = prev.filter((_, i) => i !== index)
        sync({ manual_items: next })
        return next
      })
    },
    [sync]
  )

  return {
    checkedItems,
    hiddenItems,
    manualItems,
    trips,
    toggleItem,
    hideItem,
    unhideItem,
    isChecked,
    isHidden,
    completeTrip,
    undoLastTrip,
    clearTrips,
    toggleManualItem,
    addManualItem,
    removeManualItem,
  }
}
