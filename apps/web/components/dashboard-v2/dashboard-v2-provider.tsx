'use client'

import {
  type DashboardV2SeedData,
  type DashboardV2State,
  useDashboardV2Data,
} from '@/hooks/use-dashboard-v2-data'
import { createContext, useContext } from 'react'

const DashboardV2Context = createContext<DashboardV2State | null>(null)

export function DashboardV2Provider({
  children,
  seed,
}: {
  children: React.ReactNode
  seed?: DashboardV2SeedData
}) {
  const state = useDashboardV2Data(seed)
  return (
    <DashboardV2Context.Provider value={state}>
      {children}
    </DashboardV2Context.Provider>
  )
}

export function useDashboardV2(): DashboardV2State {
  const ctx = useContext(DashboardV2Context)
  if (!ctx) {
    throw new Error('useDashboardV2 must be used within DashboardV2Provider')
  }
  return ctx
}

/**
 * Safe variant: returns null if used outside a DashboardV2Provider.
 * Use this in components that may be rendered in both dashboard-v2 (embedded) and
 * standalone contexts (e.g. `/fitness` page), so they can opt into seeded data.
 */
export function useOptionalDashboardV2(): DashboardV2State | null {
  return useContext(DashboardV2Context)
}
