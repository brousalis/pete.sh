'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback } from 'react'

import { ChatShellFallback } from '@/components/coach/chat/chat-shell'
import { ContextRail } from '@/components/coach/desk/context-rail'
import { useTodayData } from '@/components/coach/desk/rail-today'
import {
  parseDeskPanel,
  type DeskPanel,
} from '@/components/coach/desk/desk-types'

/**
 * Single-surface coaching desk. Today / Plan / Load / Activity / More / Coach
 * are tabs. Chat is a tab, not a rail. Knee lives under More.
 */
export function CoachDesk() {
  return (
    <Suspense fallback={<ChatShellFallback />}>
      <CoachDeskInner />
    </Suspense>
  )
}

function CoachDeskInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const panel = parseDeskPanel(
    searchParams.get('panel') ?? (searchParams.get('focus') === 'coach' ? 'coach' : null)
  )
  const { data: today, loading, error, reload, setSessionStatus } = useTodayData()

  const setPanel = useCallback(
    (next: DeskPanel) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'today') params.delete('panel')
      else params.set('panel', next)
      params.delete('focus')
      if (next !== 'activity') params.delete('workout')
      const query = params.toString()
      router.replace(query ? `/coach?${query}` : '/coach', { scroll: false })
    },
    [router, searchParams]
  )

  return (
    <ContextRail
      panel={panel}
      onPanelChange={setPanel}
      today={today}
      todayLoading={loading}
      todayError={error}
      onTodayReload={() => void reload()}
      onSessionStatus={setSessionStatus}
      className="h-full min-h-0"
    />
  )
}
