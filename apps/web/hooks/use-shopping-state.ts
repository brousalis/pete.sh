'use client'

import { useCallback, useEffect, useState } from 'react'
import { normalizeIngredientName } from '@/lib/utils/shopping-utils'

export interface ManualItem {
  name: string
  checked: boolean
}

interface ShoppingState {
  checkedItems: Set<string>
  hiddenItems: Set<string>
  manualItems: ManualItem[]
  toggleItem: (ingredient: string) => void
  hideItem: (ingredient: string) => void
  unhideItem: (ingredient: string) => void
  isChecked: (ingredient: string) => boolean
  isHidden: (ingredient: string) => boolean
  clearChecked: () => void
  toggleManualItem: (index: number) => void
  addManualItem: (name: string) => void
  removeManualItem: (index: number) => void
}

const STORAGE_KEY_PREFIX = 'shopping-list-'

function loadState(listId: string) {
  if (typeof window === 'undefined') return { checked: [], hidden: [], manual: [] }
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${listId}`)
    if (!raw) return { checked: [], hidden: [], manual: [] }
    const parsed = JSON.parse(raw)
    return {
      checked: parsed.checked || [],
      hidden: parsed.hidden || [],
      manual: parsed.manual || [],
    }
  } catch {
    return { checked: [], hidden: [], manual: [] }
  }
}

/**
 * Migrate old localStorage keys to normalized versions.
 * Normalizes all checked/hidden ingredient names so that state
 * persists across shopping list regenerations even when display names change.
 */
function migrateToNormalized(items: string[]): string[] {
  const migrated = new Set<string>()
  for (const item of items) {
    migrated.add(normalizeIngredientName(item))
  }
  return Array.from(migrated)
}

function saveState(listId: string, checked: Set<string>, hidden: Set<string>, manual: ManualItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${listId}`,
    JSON.stringify({
      checked: Array.from(checked),
      hidden: Array.from(hidden),
      manual,
    })
  )
}

export function useShoppingState(listId: string | null): ShoppingState {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set())
  const [manualItems, setManualItems] = useState<ManualItem[]>([])

  useEffect(() => {
    if (!listId) return
    const state = loadState(listId)
    // Migrate old raw-name keys to normalized keys
    const normalizedChecked = new Set(migrateToNormalized(state.checked))
    const normalizedHidden = new Set(migrateToNormalized(state.hidden))
    setCheckedItems(normalizedChecked)
    setHiddenItems(normalizedHidden)
    setManualItems(state.manual)
    // Persist the migrated state back
    saveState(listId, normalizedChecked, normalizedHidden, state.manual)
  }, [listId])

  const persist = useCallback(
    (checked: Set<string>, hidden: Set<string>, manual: ManualItem[]) => {
      if (listId) saveState(listId, checked, hidden, manual)
    },
    [listId]
  )

  const toggleItem = useCallback(
    (ingredient: string) => {
      const key = normalizeIngredientName(ingredient)
      setCheckedItems((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        persist(next, hiddenItems, manualItems)
        return next
      })
    },
    [persist, hiddenItems, manualItems]
  )

  const hideItem = useCallback(
    (ingredient: string) => {
      const key = normalizeIngredientName(ingredient)
      setHiddenItems((prev) => {
        const next = new Set(prev)
        next.add(key)
        persist(checkedItems, next, manualItems)
        return next
      })
    },
    [persist, checkedItems, manualItems]
  )

  const unhideItem = useCallback(
    (ingredient: string) => {
      const key = normalizeIngredientName(ingredient)
      setHiddenItems((prev) => {
        const next = new Set(prev)
        next.delete(key)
        persist(checkedItems, next, manualItems)
        return next
      })
    },
    [persist, checkedItems, manualItems]
  )

  const isChecked = useCallback(
    (ingredient: string) => checkedItems.has(normalizeIngredientName(ingredient)),
    [checkedItems]
  )

  const isHidden = useCallback(
    (ingredient: string) => hiddenItems.has(normalizeIngredientName(ingredient)),
    [hiddenItems]
  )

  const clearChecked = useCallback(() => {
    const newHidden = new Set(hiddenItems)
    checkedItems.forEach((item) => newHidden.add(item))
    const newManual = manualItems.filter((m) => !m.checked)
    setCheckedItems(new Set())
    setHiddenItems(newHidden)
    setManualItems(newManual)
    persist(new Set(), newHidden, newManual)
  }, [checkedItems, hiddenItems, manualItems, persist])

  const toggleManualItem = useCallback(
    (index: number) => {
      setManualItems((prev) => {
        const next = prev.map((item, i) =>
          i === index ? { name: item.name, checked: !item.checked } : item
        )
        persist(checkedItems, hiddenItems, next)
        return next
      })
    },
    [persist, checkedItems, hiddenItems]
  )

  const addManualItem = useCallback(
    (name: string) => {
      if (!name.trim()) return
      setManualItems((prev) => {
        const next = [...prev, { name: name.trim(), checked: false }]
        persist(checkedItems, hiddenItems, next)
        return next
      })
    },
    [persist, checkedItems, hiddenItems]
  )

  const removeManualItem = useCallback(
    (index: number) => {
      setManualItems((prev) => {
        const next = prev.filter((_, i) => i !== index)
        persist(checkedItems, hiddenItems, next)
        return next
      })
    },
    [persist, checkedItems, hiddenItems]
  )

  return {
    checkedItems,
    hiddenItems,
    manualItems,
    toggleItem,
    hideItem,
    unhideItem,
    isChecked,
    isHidden,
    clearChecked,
    toggleManualItem,
    addManualItem,
    removeManualItem,
  }
}
