'use client'

import { FitnessKanbanView } from '@/components/dashboard/fitness-kanban-view'
import { FitnessSingleView } from '@/components/dashboard/fitness-single-view'
import { RoutineEditor } from '@/components/dashboard/routine-editor'
import { format, isValid, parseISO } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

type FitnessTab = 'today' | 'week' | 'edit'

export interface FitnessPageContentProps {
  /** When true, uses internal state only (no URL sync). Use when embedded in dashboard. */
  embedded?: boolean
  /** When embedded, the date is controlled by the parent. Pass selectedDate from dashboard. */
  selectedDate?: Date
  /** When embedded, called when fitness view wants to navigate (e.g. user picks day from week view). */
  onDateChange?: (date: Date) => void
}

export function FitnessPageContent({
  embedded = false,
  selectedDate: controlledSelectedDate,
  onDateChange,
}: FitnessPageContentProps) {
  const searchParams = useSearchParams()

  // When embedded, always use 'today' and null initially; otherwise derive from URL
  const tabParam = embedded ? null : searchParams.get('tab')
  const dayParam = embedded ? null : searchParams.get('day')

  const [activeTab, setActiveTab] = useState<FitnessTab>(
    tabParam === 'edit' ? 'edit' : tabParam === 'week' ? 'week' : 'today'
  )

  const [embeddedDate, setEmbeddedDate] = useState<Date | null>(null)

  const initialDate = useMemo((): Date | null => {
    if (embedded && controlledSelectedDate) return controlledSelectedDate
    if (embedded) return embeddedDate
    if (!dayParam) return null
    try {
      const date = parseISO(dayParam)
      if (!isValid(date)) return null
      return date
    } catch {
      return null
    }
  }, [embedded, controlledSelectedDate, embeddedDate, dayParam])

  const handleTabChange = useCallback(
    (tab: FitnessTab, date?: Date) => {
      setActiveTab(tab)
      if (tab === 'today' && date) {
        setEmbeddedDate(date)
        onDateChange?.(date)
      } else if (tab === 'today') {
        setEmbeddedDate(null)
      }

      if (!embedded) {
        let newUrl = '/fitness'
        if (tab === 'week') {
          newUrl = '/fitness?tab=week'
        } else if (tab === 'edit') {
          newUrl = '/fitness?tab=edit'
        } else if (tab === 'today' && date) {
          newUrl = `/fitness?day=${format(date, 'yyyy-MM-dd')}`
        }
        window.history.replaceState(null, '', newUrl)
      }
    },
    [embedded, onDateChange]
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      {activeTab === 'today' && (
        <FitnessSingleView
          initialDate={initialDate}
          controlledDate={embedded ? controlledSelectedDate ?? null : null}
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
