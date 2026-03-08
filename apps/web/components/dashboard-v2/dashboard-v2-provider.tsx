'use client'

import {
  type DashboardV2State,
  useDashboardV2Data,
} from '@/hooks/use-dashboard-v2-data'
import { createContext, useContext } from 'react'

const DashboardV2Context = createContext<DashboardV2State | null>(null)

export function DashboardV2Provider({
  children,
}: {
  children: React.ReactNode
}) {
  const state = useDashboardV2Data()
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
