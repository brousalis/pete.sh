'use client'

import { FitnessSingleView } from '@/components/dashboard/fitness-single-view'
import { format, isValid, parseISO } from 'date-fns'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

// Kanban view + routine editor are secondary tabs — only load when user switches away from 'today'.
const FitnessKanbanView = dynamic(() =>
  import('@/components/dashboard/fitness-kanban-view').then(m => ({ default: m.FitnessKanbanView })),
  { ssr: false }
)
const RoutineEditor = dynamic(() =>
  import('@/components/dashboard/routine-editor').then(m => ({ default: m.RoutineEditor })),
  { ssr: false }
)

type FitnessTab = 'today' | 'week' | 'edit'

export interface FitnessPageContentProps {
  /** When true, uses internal state only (no URL sync). Use when embedded in dashboard. */
  embedded?: boolean
  /** When embedded, show this section title on the same line as Day/Week filters. */
  sectionTitle?: string
  /** When embedded, the date is controlled by the parent. Pass selectedDate from dashboard. */
  selectedDate?: Date
  /** When embedded, called when fitness view wants to navigate (e.g. user picks day from week view). */
  onDateChange?: (date: Date) => void
}

export function FitnessPageContent({
  embedded = false,
  sectionTitle,
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
          sectionTitle={sectionTitle}
          onSwitchToEdit={() => handleTabChange('edit')}
          onSwitchToWeek={() => handleTabChange('week')}
        />
      )}
      {activeTab === 'week' && (
        <FitnessKanbanView
          sectionTitle={sectionTitle}
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
