'use client'

import {
  type DashboardV2SeedData,
  type DashboardV2State,
  useDashboardV2Data,
} from '@/hooks/use-dashboard-v2-data'
import { createContext, useContext, useState, type ReactNode } from 'react'

export type TimelineItemId =
  | 'morning'
  | 'workout'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'night'

interface DashboardV3Extras {
  activeItem: TimelineItemId | null
  setActiveItem: (id: TimelineItemId | null) => void
}

type DashboardV3ContextValue = DashboardV2State & DashboardV3Extras

const DashboardV3Context = createContext<DashboardV3ContextValue | null>(null)

export function DashboardV3Provider({
  children,
  seed,
}: {
  children: ReactNode
  seed?: DashboardV2SeedData
}) {
  const state = useDashboardV2Data(seed)
  const [activeItem, setActiveItem] = useState<TimelineItemId | null>('workout')

  const value: DashboardV3ContextValue = {
    ...state,
    activeItem,
    setActiveItem,
  }

  return (
    <DashboardV3Context.Provider value={value}>
      {children}
    </DashboardV3Context.Provider>
  )
}

export function useDashboardV3(): DashboardV3ContextValue {
  const ctx = useContext(DashboardV3Context)
  if (!ctx) {
    throw new Error('useDashboardV3 must be used within DashboardV3Provider')
  }
  return ctx
}
