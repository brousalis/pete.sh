'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  addDays,
  chicagoMondayOf,
  chicagoToday,
  monthEnd,
  monthStart,
  shiftChicagoDate,
} from '@/lib/coach-dates'
import type { PlanWeekView } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface PlanDatePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string | null
  onSelect: (date: string) => void
}

export function PlanDatePicker({ open, onOpenChange, date, onSelect }: PlanDatePickerProps) {
  const today = chicagoToday()
  const selected = date ?? today
  const [month, setMonth] = useState(() => monthStart(selected))
  const [sessionDates, setSessionDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setMonth(monthStart(date ?? chicagoToday()))
  }, [open, date])

  const loadMonthDots = useCallback(async (monthKey: string) => {
    setLoading(true)
    try {
      const from = monthStart(monthKey)
      const to = monthEnd(monthKey)
      const response = await fetch(`/api/coach/plan?from=${from}&to=${to}`, {
        credentials: 'include',
      })
      const payload = await response.json()
      if (payload.success) {
        const weeks = (payload.data.weeks as PlanWeekView[]) ?? []
        const dates = new Set<string>()
        for (const week of weeks) {
          for (const session of week.sessions) {
            if (session.sessionDate) dates.add(session.sessionDate)
          }
        }
        setSessionDates(dates)
      } else {
        setSessionDates(new Set())
      }
    } catch {
      setSessionDates(new Set())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void loadMonthDots(month)
  }, [open, month, loadMonthDots])

  const cells = useMemo(() => buildMonthCells(month), [month])

  const monthLabel = new Date(`${month}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function selectDay(day: string) {
    onSelect(day)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0 overflow-y-auto bg-surface-1">
        <SheetHeader className="pb-3">
          <SheetTitle>Jump to day</SheetTitle>
          <SheetDescription>Pick a day to see planned sessions and results.</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-ink-2"
              aria-label="Previous month"
              onClick={() => setMonth(monthStart(shiftChicagoDate(month, -1)))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2">
              <p className="t-title text-ink-1">{monthLabel}</p>
              {loading ? <Loader2 className="size-3.5 animate-spin text-ink-3" /> : null}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-ink-2"
              aria-label="Next month"
              onClick={() => {
                const next = shiftChicagoDate(monthEnd(month), 1)
                setMonth(monthStart(next))
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {DAY_NAMES.map((name) => (
              <span key={name} className="py-1 text-center t-micro text-ink-3">
                {name}
              </span>
            ))}
            {cells.map((cell, index) => {
              if (!cell) {
                return <span key={`empty-${index}`} className="aspect-square" />
              }
              const isToday = cell === today
              const isSelected = cell === selected
              const hasSession = sessionDates.has(cell)
              return (
                <button
                  key={cell}
                  type="button"
                  onClick={() => selectDay(cell)}
                  aria-pressed={isSelected}
                  aria-label={cell}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-control t-num text-[13px] transition-colors',
                    isSelected
                      ? 'bg-brand text-white'
                      : isToday
                        ? 'bg-surface-3 text-brand ring-1 ring-brand/40 ring-inset'
                        : 'text-ink-1 hover:bg-surface-2'
                  )}
                >
                  {Number(cell.slice(8))}
                  {hasSession ? (
                    <span
                      className={cn(
                        'absolute bottom-1 size-1 rounded-full',
                        isSelected ? 'bg-white/90' : 'bg-brand'
                      )}
                      aria-hidden
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-3 t-label font-medium text-ink-2"
              onClick={() => selectDay(today)}
            >
              Today
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Monday-start month grid: null = padding cell outside the month. */
function buildMonthCells(month: string): (string | null)[] {
  const start = monthStart(month)
  const end = monthEnd(month)
  const weekStart = chicagoMondayOf(start)
  const cells: (string | null)[] = []

  let cursor = weekStart
  // Fill until we've covered the month and completed the last week row.
  while (cursor <= end || cells.length % 7 !== 0) {
    const inMonth = cursor >= start && cursor <= end
    cells.push(inMonth ? cursor : null)
    cursor = addDays(cursor, 1)
    // Safety: never more than 6 weeks.
    if (cells.length >= 42) break
  }

  return cells
}
