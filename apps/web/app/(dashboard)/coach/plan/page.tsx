'use client'

import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { SessionCard } from '@/components/coach/session-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { PlanWeekView, TodaySession } from '@/lib/types/coach-ui.types'
import { SPORT_LABELS } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CoachPlanPage() {
  const [weeks, setWeeks] = useState<PlanWeekView[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<TodaySession | null>(null)
  const [moving, setMoving] = useState(false)
  const [moveResult, setMoveResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const from = mondayOffset(offset)
      const to = addDays(from, 27)

      const response = await fetch(`/api/coach/plan?from=${from}&to=${to}`, {
        credentials: 'include',
      })
      const payload = await response.json()
      if (payload.success) setWeeks(payload.data.weeks as PlanWeekView[])
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Move a session, checking the guardrails first.
   *
   * The dry run is what makes dragging safe: the athlete sees "this would put
   * two runs 24 hours apart" before committing, not after.
   */
  async function moveSession(session: TodaySession, toDate: string) {
    setMoving(true)
    setMoveResult(null)

    const proposal = {
      summary: `Move "${session.title}" to ${toDate}`,
      changes: [
        {
          action: 'move' as const,
          sessionId: session.id,
          toDate,
          reason: 'Moved from the plan calendar.',
        },
      ],
    }

    try {
      const dryRun = await fetch('/api/coach/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dryRun: true, proposal }),
      }).then((response) => response.json())

      const report = dryRun?.data?.guardrailReport
      const blocking =
        report?.violations?.filter(
          (violation: { severity: string }) =>
            violation.severity === 'block' || violation.severity === 'red_flag'
        ) ?? []

      if (blocking.length > 0) {
        setMoveResult(
          `Blocked: ${blocking.map((violation: { message: string }) => violation.message).join(' ')}`
        )
        return
      }

      const applied = await fetch('/api/coach/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ proposal }),
      }).then((response) => response.json())

      if (applied?.data?.applied) {
        setMoveResult(null)
        setSelected(null)
        await load()
      } else {
        setMoveResult(applied?.data?.summary ?? 'The move was rejected.')
      }
    } finally {
      setMoving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Plan</h1>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setOffset((value) => value - 4)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOffset(0)} disabled={offset === 0}>
            Today
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setOffset((value) => value + 4)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      {moveResult ? (
        <Card className="border-accent-rose/40 bg-accent-rose/5">
          <CardContent className="flex gap-2 pt-5 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-rose" />
            <p>{moveResult}</p>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : weeks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No sessions scheduled in this window. The Sunday planning job generates the coming week.
          </CardContent>
        </Card>
      ) : (
        weeks.map((week) => (
          <WeekRow
            key={week.weekStart}
            week={week}
            selected={selected}
            onSelect={setSelected}
            onDrop={moveSession}
            moving={moving}
          />
        ))
      )}

      {selected ? (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-2xl px-4 md:bottom-4">
          <div className="rounded-lg border border-border bg-background p-2 shadow-lg">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">
                Tap a day to move this session
              </span>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                Cancel
              </Button>
            </div>
            <SessionCard session={selected} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function WeekRow({
  week,
  selected,
  onSelect,
  onDrop,
  moving,
}: {
  week: PlanWeekView
  selected: TodaySession | null
  onSelect: (session: TodaySession | null) => void
  onDrop: (session: TodaySession, toDate: string) => void
  moving: boolean
}) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(week.weekStart, index))
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Week of{' '}
          {new Date(`${week.weekStart}T12:00:00`).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </h2>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {week.plannedTss} TSS planned
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const sessions = week.sessions.filter((session) => session.sessionDate === date)
          const isToday = date === today
          const isTarget = selected != null && selected.sessionDate !== date

          return (
            <button
              key={date}
              type="button"
              disabled={!isTarget || moving}
              onClick={() => {
                if (isTarget && selected) onDrop(selected, date)
              }}
              className={cn(
                'min-h-[84px] rounded-md border p-1 text-left transition-colors',
                isToday ? 'border-primary/60' : 'border-border',
                isTarget ? 'cursor-pointer hover:bg-muted' : 'cursor-default'
              )}
            >
              <div className="mb-1 flex items-baseline justify-between px-0.5">
                <span className="text-[9px] uppercase text-muted-foreground">
                  {DAY_NAMES[index]}
                </span>
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    isToday ? 'font-bold' : 'text-muted-foreground'
                  )}
                >
                  {date.slice(8)}
                </span>
              </div>

              <div className="space-y-0.5">
                {sessions.map((session) => (
                  <span
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelect(selected?.id === session.id ? null : session)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.stopPropagation()
                        onSelect(selected?.id === session.id ? null : session)
                      }
                    }}
                    className={cn(
                      'block truncate rounded px-1 py-0.5 text-[9px] leading-tight',
                      sportColour(session.sport),
                      selected?.id === session.id && 'ring-1 ring-primary',
                      session.status === 'completed' && 'opacity-50 line-through',
                      session.guardrail && !session.guardrail.passed && 'ring-1 ring-accent-rose'
                    )}
                    title={session.title}
                  >
                    {SPORT_LABELS[session.sport] ?? session.sport}
                    {session.durationMinutes ? ` ${session.durationMinutes}'` : ''}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function sportColour(sport: string): string {
  switch (sport) {
    case 'swim':
      return 'bg-accent-azure/20 text-accent-azure'
    case 'bike':
      return 'bg-accent-gold/20 text-accent-gold'
    case 'run':
      return 'bg-accent-ember/20 text-accent-ember'
    case 'strength':
      return 'bg-accent-sage/20 text-accent-sage'
    case 'rest':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function mondayOffset(weekOffset: number): string {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff + weekOffset * 7)
  return date.toLocaleDateString('en-CA')
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}
