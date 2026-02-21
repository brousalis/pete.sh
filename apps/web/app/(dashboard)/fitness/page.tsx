'use client'

import { FitnessKanbanView } from '@/components/dashboard/fitness-kanban-view'
import { FitnessSingleView } from '@/components/dashboard/fitness-single-view'
import { RoutineEditor } from '@/components/dashboard/routine-editor'
import { format, isValid, parseISO } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

type FitnessTab = 'today' | 'week' | 'edit'

export default function FitnessPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const dayParam = searchParams.get('day')
  const [activeTab, setActiveTab] = useState<FitnessTab>(
    tabParam === 'edit' ? 'edit' : tabParam === 'today' || dayParam ? 'today' : 'week'
  )

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

  const handleTabChange = useCallback((tab: FitnessTab, date?: Date) => {
    setActiveTab(tab)
    let newUrl = '/fitness'
    if (tab === 'week') {
      newUrl = '/fitness?tab=week'
    } else if (tab === 'edit') {
      newUrl = '/fitness?tab=edit'
    } else if (tab === 'today' && date) {
      newUrl = `/fitness?day=${format(date, 'yyyy-MM-dd')}`
    }
    window.history.replaceState(null, '', newUrl)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {activeTab === 'today' && (
        <FitnessSingleView
          initialDate={initialDate}
          onSwitchToEdit={() => handleTabChange('edit')}
          onSwitchToWeek={() => handleTabChange('week')}
        />
      )}
      {activeTab === 'week' && (
        <FitnessKanbanView
          onSwitchToDay={(date) => handleTabChange('today', date)}
          onSwitchToEdit={() => handleTabChange('edit')}
        />
      )}
      {activeTab === 'edit' && (
        <RoutineEditor onBack={() => handleTabChange('today')} />
      )}
    </div>
  )
}
