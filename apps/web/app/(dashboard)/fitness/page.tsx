'use client'

import { FitnessSingleView } from '@/components/dashboard/fitness-single-view'
import { RoutineEditor } from '@/components/dashboard/routine-editor'
import { isValid, parseISO } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

type FitnessTab = 'today' | 'edit'

export default function FitnessPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const dayParam = searchParams.get('day') // e.g., "2026-02-04"
  const [activeTab, setActiveTab] = useState<FitnessTab>(
    tabParam === 'edit' ? 'edit' : 'today'
  )

  // Parse the day param to get the initial date to display
  const initialDate = useMemo((): Date | null => {
    if (!dayParam) return null
    try {
      const date = parseISO(dayParam)
      if (!isValid(date)) return null
      return date
    } catch {
      return null
    }
  }, [dayParam])

  const handleTabChange = (tab: FitnessTab) => {
    setActiveTab(tab)
    // Update URL without full navigation
    const newUrl = tab === 'today' ? '/fitness' : `/fitness?tab=${tab}`
    window.history.replaceState(null, '', newUrl)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {activeTab === 'today' ? (
        <FitnessSingleView
          initialDate={initialDate}
          onSwitchToEdit={() => handleTabChange('edit')}
        />
      ) : (
        <RoutineEditor onBack={() => handleTabChange('today')} />
      )}
    </div>
  )
}
