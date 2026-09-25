'use client'

import { AlertTriangle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { LoadSection } from '@/components/coach/desk/load-section'
import { PlanDatePicker } from '@/components/coach/desk/plan-date-picker'
import { SessionCard } from '@/components/coach/session-card'
import { Chip, EmptyNote, Panel, Section } from '@/components/coach/ui/panel'
import { TermTip } from '@/components/coach/ui/term-tip'
import { sportClasses } from '@/components/coach/ui/tone'
import { Button } from '@/components/ui/button'
import {
  addDays,
  alignedWeekOffset,
  chicagoMondayOf,
  chicagoToday,
  isValidIsoDate,
  shiftChicagoDate,
} from '@/lib/coach-dates'
import type { PlanWeekView, TodaySession, YearPlanView } from '@/lib/types/coach-ui.types'
import { SPORT_LABELS } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SLOT_ORDER = ['morning', 'afternoon', 'evening', 'anytime', 'primary']

const TOTAL_WEEKS = 48

export function RailPlan() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateFromUrl = searchParams.get('date')

  const [weeks, setWeeks] = useState<PlanWeekView[]>([])
  const [yearPlan, setYearPlan] = useState<YearPlanView | null>(null)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(() =>
    isValidIsoDate(dateFromUrl) ? alignedWeekOffset(dateFromUrl) : 0
  )
  const [showMore, setShowMore] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    isValidIsoDate(dateFromUrl) ? dateFromUrl : null
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [movingSession, setMovingSession] = useState<TodaySession | null>(null)
  const [moving, setMoving] = useState(false)
  const [moveResult, setMoveResult] = useState<string | null>(null)

  const setDateParam = useCallback(
    (date: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('panel', 'plan')
      if (date) params.set('date', date)
      else params.delete('date')
      router.replace(`/coach?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const jumpToDate = useCallback(
    (date: string, opts?: { syncUrl?: boolean }) => {
      const nextOffset = alignedWeekOffset(date)
      const windowStart = addDays(chicagoMondayOf(chicagoToday()), nextOffset * 7)
      const firstWeekEnd = addDays(windowStart, 6)
      setSelectedDate(date)
      setOffset(nextOffset)
      // Expand the strip when the day isn't in the first visible week.
      setShowMore(date > firstWeekEnd)
      if (opts?.syncUrl !== false) setDateParam(date)
    },
    [setDateParam]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const from = addDays(chicagoMondayOf(chicagoToday()), offset * 7)
      const to = addDays(from, 27)
      const response = await fetch(`/api/coach/plan?from=${from}&to=${to}`, {
        credentials: 'include',
      })
      const payload = await response.json()
      if (payload.success) {
        const loaded = payload.data.weeks as PlanWeekView[]
        setWeeks(loaded)
        setYearPlan((payload.data.yearPlan as YearPlanView | null) ?? null)

        setSelectedDate((current) => {
          if (current && current >= from && current <= to) return current
          // Week pager moved past the selection — drop it rather than show
          // an empty day detail for a date that isn't in this window.
          if (current && (current < from || current > to)) return null

          const dated = loaded.flatMap((week) => week.sessions)
          const today = chicagoToday()
          if (dated.some((session) => session.sessionDate === today)) return today
          return dated.find((session) => session.sessionDate)?.sessionDate ?? null
        })
      }
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => {
    void load()
  }, [load])

  // Deep-link: URL date wins when it changes externally.
  useEffect(() => {
    if (!isValidIsoDate(dateFromUrl)) return
    if (dateFromUrl === selectedDate) return
    jumpToDate(dateFromUrl, { syncUrl: false })
    // Intentionally only react to URL changes, not selectedDate.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL → state only
  }, [dateFromUrl])

  // Keep ?date= aligned with the open day.
  useEffect(() => {
    const urlDate = searchParams.get('date')
    if (selectedDate === urlDate) return
    if (!selectedDate && !urlDate) return
    setDateParam(selectedDate)
  }, [selectedDate, searchParams, setDateParam])

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
        setMovingSession(null)
        jumpToDate(toDate)
        await load()
      } else {
        setMoveResult(applied?.data?.summary ?? 'The move was rejected.')
      }
    } finally {
      setMoving(false)
    }
  }

  const visibleWeeks = showMore ? weeks : weeks.slice(0, 1)
  const peakTss = Math.max(
    1,
    ...weeks.flatMap((w) =>
      w.sessions.map((s) => {
        const actual = s.activity?.tss
        if (actual != null && actual > 0) return Math.max(s.plannedLoad ?? 0, actual)
        return s.plannedLoad ?? 0
      })
    )
  )

  const selectedSessions = selectedDate
    ? weeks
        .flatMap((week) => week.sessions)
        .filter((session) => session.sessionDate === selectedDate)
        .sort((a, b) => slotRank(a.slot) - slotRank(b.slot))
    : []

  function handleDayClick(date: string) {
    if (movingSession) {
      if (movingSession.sessionDate !== date && !moving) {
        void moveSession(movingSession, date)
      }
      return
    }
    setSelectedDate((current) => (current === date ? null : date))
  }

  function goToday() {
    jumpToDate(chicagoToday())
  }

  const headerDate = selectedDate ?? chicagoToday()
  const headerIsToday = headerDate === chicagoToday()
  const headerLabel = headerIsToday
    ? 'Today'
    : new Date(`${headerDate}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

  return (
    <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-display">Plan</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/coach/tests"
            className="t-label font-medium text-ink-3 underline-offset-4 transition-colors hover:text-ink-1 hover:underline"
          >
            Baseline tests
          </Link>
          <div className="flex items-center gap-0.5 rounded-control bg-surface-1 p-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-ink-2"
              aria-label="Previous four weeks"
              onClick={() => setOffset((v) => v - 4)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 px-2.5 t-label font-medium text-ink-2"
              onClick={() => setPickerOpen(true)}
              aria-label="Jump to date"
            >
              <CalendarDays className="size-3.5" />
              {headerLabel}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 t-label font-medium text-ink-2"
              onClick={goToday}
              disabled={offset === 0 && headerIsToday && selectedDate === chicagoToday()}
            >
              Today
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-ink-2"
              aria-label="Next four weeks"
              onClick={() => setOffset((v) => v + 4)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <PlanDatePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        date={selectedDate}
        onSelect={(date) => jumpToDate(date)}
      />

      {loading && !yearPlan ? <YearPlanSummarySkeleton /> : null}
      {yearPlan ? <YearPlanSummary plan={yearPlan} /> : null}

      {moveResult ? (
        <Panel tone="alert" className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tone-alert" />
          <p className="t-body text-ink-2">{moveResult}</p>
        </Panel>
      ) : null}

      {movingSession ? (
        <Panel tone="brand" className="flex items-center justify-between gap-3 py-2.5">
          <p className="min-w-0 t-body text-ink-2">
            Moving <span className="font-medium text-ink-1">{movingSession.title}</span> — pick a
            day
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 shrink-0 text-ink-2"
            disabled={moving}
            onClick={() => {
              setMovingSession(null)
              setMoveResult(null)
            }}
          >
            <X className="mr-1 size-3.5" />
            Cancel
          </Button>
        </Panel>
      ) : null}

      <LoadSection />

      {loading ? (
        <div className="flex justify-center border-t border-line py-16">
          <Loader2 className="size-4 animate-spin text-ink-3" />
        </div>
      ) : weeks.length === 0 ? (
        <div className="space-y-6 border-t border-line pt-6">
          <EmptyNote>
            No sessions in this window. The Sunday planning job fills the coming week.
          </EmptyNote>
          {selectedDate && !movingSession ? (
            <DayDetail
              date={selectedDate}
              sessions={[]}
              onMove={() => undefined}
              onClose={() => setSelectedDate(null)}
              onShiftDay={(delta) => jumpToDate(shiftChicagoDate(selectedDate, delta))}
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-6 border-t border-line pt-6">
          {/* The week strip is navigation: it wants width, not height. The
              selected day is the content, so it gets the full column below. */}
          <div className="space-y-5">
            {visibleWeeks.map((week) => (
              <WeekBlock
                key={week.weekStart}
                week={week}
                peakTss={peakTss}
                selectedDate={selectedDate}
                movingSession={movingSession}
                moving={moving}
                onDayClick={handleDayClick}
              />
            ))}
            {weeks.length > 1 ? (
              <button
                type="button"
                onClick={() => setShowMore((value) => !value)}
                className="w-full rounded-control border border-dashed border-line py-2 t-label font-medium text-ink-3 transition-colors hover:border-line-strong hover:text-ink-1"
              >
                {showMore ? 'Show this week only' : `Show the next ${weeks.length - 1} weeks`}
              </button>
            ) : null}
          </div>

          {selectedDate && !movingSession ? (
            <DayDetail
              date={selectedDate}
              sessions={selectedSessions}
              onMove={(session) => {
                setMoveResult(null)
                setMovingSession(session)
              }}
              onClose={() => setSelectedDate(null)}
              onShiftDay={(delta) => jumpToDate(shiftChicagoDate(selectedDate, delta))}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

function DayDetail({
  date,
  sessions,
  onMove,
  onClose,
  onShiftDay,
}: {
  date: string
  sessions: TodaySession[]
  onMove: (session: TodaySession) => void
  onClose: () => void
  onShiftDay: (delta: number) => void
}) {
  const plannedTss = sessions.reduce((sum, session) => sum + (session.plannedLoad ?? 0), 0)
  const minutes = sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0)
  const isToday = date === chicagoToday()

  return (
    <section className="space-y-3.5 border-t border-line pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-0.5 rounded-control bg-surface-1 p-0.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-ink-2"
              aria-label="Previous day"
              onClick={() => onShiftDay(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="min-w-[10rem] px-1 text-center t-title">
              {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-ink-2"
              aria-label="Next day"
              onClick={() => onShiftDay(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {sessions.length > 0 ? (
            <div className="flex items-baseline gap-3">
              {minutes > 0 ? <Tally value={minutes} unit="min" /> : null}
              {plannedTss > 0 ? <Tally value={plannedTss} unit="TSS" tip="tss" /> : null}
            </div>
          ) : null}
          {isToday ? <Chip tone="brand">Today</Chip> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="t-label font-medium text-ink-3 transition-colors hover:text-ink-1"
        >
          Close
        </button>
      </div>

      {sessions.length === 0 ? (
        <Panel>
          <EmptyNote>No sessions planned.</EmptyNote>
        </Panel>
      ) : (
        // Auto-fit keeps each card near a comfortable reading measure: two up
        // on a wide desk, one up when the column narrows.
        <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(28rem,1fr))]">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              defaultShowSteps
              onMove={session.status === 'planned' ? onMove : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function Tally({ value, unit, tip }: { value: number; unit: string; tip?: 'tss' }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="t-num t-num-sm text-ink-1">{value}</span>
      {tip ? (
        <TermTip term={tip} className="t-micro text-ink-3">
          {unit}
        </TermTip>
      ) : (
        <span className="t-micro text-ink-3">{unit}</span>
      )}
    </span>
  )
}

/** Reserves the year-plan panel height so the calendar doesn't jump when data arrives. */
function YearPlanSummarySkeleton() {
  return (
    <Panel className="px-5 py-5" aria-hidden>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="h-5 w-44 animate-pulse rounded-chip bg-surface-3" />
          <div className="h-3.5 w-64 max-w-full animate-pulse rounded-chip bg-surface-3" />
        </div>
        <div className="flex items-baseline gap-4">
          <div className="space-y-1.5 text-right">
            <div className="ml-auto h-7 w-12 animate-pulse rounded-chip bg-surface-3" />
            <div className="ml-auto h-3 w-14 animate-pulse rounded-chip bg-surface-3" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="ml-auto h-7 w-14 animate-pulse rounded-chip bg-surface-3" />
            <div className="ml-auto h-3 w-10 animate-pulse rounded-chip bg-surface-3" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-0.5">
        {[18, 22, 28, 16].map((span, index) => (
          <div key={index} className="min-w-0 flex-none" style={{ flexBasis: `${span}%` }}>
            <div className="h-1.5 animate-pulse rounded-full bg-surface-3" />
            <div className="mt-1.5 h-3 w-3/4 animate-pulse rounded-chip bg-surface-3" />
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-line pt-3.5">
        <div className="h-4 w-56 max-w-full animate-pulse rounded-chip bg-surface-3" />
      </div>
    </Panel>
  )
}

/**
 * The year is the point of the product, so it gets a literal progress track:
 * phase spans sized by their week count, with the current phase lit.
 */
function YearPlanSummary({ plan }: { plan: YearPlanView }) {
  const [expanded, setExpanded] = useState(false)
  const raceLabel = new Date(`${plan.goalRaceDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const goalLabel = plan.goalTimeSeconds ? formatGoalTime(plan.goalTimeSeconds) : null
  const currentPhase = plan.phases.find((phase) => phase.current) ?? plan.phases[0]
  const week = plan.currentWeek ?? 0

  return (
    <Panel className="px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-title">{plan.name}</p>
          <p className="mt-1 t-label text-ink-3">
            {[plan.goalRaceName ?? 'Goal race', raceLabel, goalLabel].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-right">
            <p className="t-num t-num-lg text-ink-1">{Math.max(0, plan.daysToRace)}</p>
            <p className="mt-0.5 t-micro text-ink-3">days out</p>
          </div>
          <div className="text-right">
            <p className="t-num t-num-lg text-ink-2">
              {week}
              <span className="text-[0.6em] text-ink-3">/{TOTAL_WEEKS}</span>
            </p>
            <p className="mt-0.5 t-micro text-ink-3">weeks</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-0.5" role="presentation">
        {plan.phases.map((phase) => {
          const span = phase.weekTo - phase.weekFrom + 1
          const filled =
            week >= phase.weekTo
              ? 1
              : week < phase.weekFrom
                ? 0
                : (week - phase.weekFrom + 1) / span
          return (
            <div
              key={`${phase.weekFrom}-${phase.weekTo}`}
              className="min-w-0 flex-none"
              style={{ flexBasis: `${(span / TOTAL_WEEKS) * 100}%` }}
              title={`${phase.label} · weeks ${phase.weekFrom}–${phase.weekTo}`}
            >
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn('h-full rounded-full', phase.current ? 'bg-brand' : 'bg-ink-3')}
                  style={{ width: `${filled * 100}%` }}
                />
              </div>
              <p
                className={cn(
                  'mt-1.5 truncate t-micro',
                  phase.current ? 'text-ink-1' : 'text-ink-3'
                )}
              >
                {phase.label}
              </p>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="mt-4 flex w-full items-start justify-between gap-3 border-t border-line pt-3.5 text-left text-ink-2 transition-colors hover:text-ink-1"
      >
        <span className="min-w-0 t-body">
          {plan.currentBlock ? (
            <span className="font-medium text-ink-1">
              Block {plan.currentBlock.number}: {plan.currentBlock.name}
            </span>
          ) : currentPhase ? (
            <>
              <span className="font-medium text-ink-1">{currentPhase.label}</span> —{' '}
              {currentPhase.intent}
            </>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'mt-0.5 size-4 shrink-0 text-ink-3 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded ? (
        <div className="animate-fade-in-up mt-3 space-y-2.5">
          {plan.currentBlock && plan.currentBlock.goals.length > 0 ? (
            <ul className="space-y-1.5">
              {plan.currentBlock.goals.map((goal) => (
                <li key={goal} className="flex gap-2 t-label text-ink-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand" aria-hidden />
                  {goal}
                </li>
              ))}
            </ul>
          ) : null}
          <ol className="space-y-1 border-t border-line pt-2.5">
            {plan.phases.map((phase) => (
              <li
                key={`${phase.weekFrom}-${phase.weekTo}`}
                className={cn(
                  'flex gap-3 rounded-chip px-2 py-1.5',
                  phase.current ? 'bg-surface-2' : ''
                )}
              >
                <span className="t-num t-num-sm w-12 shrink-0 text-ink-3">
                  {phase.weekFrom}–{phase.weekTo}
                </span>
                <span className="min-w-0">
                  <span className={cn('t-label font-medium', phase.current ? 'text-ink-1' : 'text-ink-2')}>
                    {phase.label}
                  </span>
                  <span className="block t-label text-ink-3">{phase.intent}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Panel>
  )
}

function formatGoalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : `${minutes} min`
}

function WeekBlock({
  week,
  peakTss,
  selectedDate,
  movingSession,
  moving,
  onDayClick,
}: {
  week: PlanWeekView
  peakTss: number
  selectedDate: string | null
  movingSession: TodaySession | null
  moving: boolean
  onDayClick: (date: string) => void
}) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(week.weekStart, index))
  const today = chicagoToday()

  return (
    <Section
      title={`Week of ${new Date(`${week.weekStart}T12:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`}
      action={
        <span className="inline-flex items-baseline gap-1">
          <span className="t-num t-num-sm text-ink-1">{week.plannedTss}</span>
          <TermTip term="tss" className="t-micro text-ink-3">
            TSS planned
          </TermTip>
        </span>
      }
    >
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date, index) => (
          <DayCell
            key={date}
            date={date}
            dayLabel={DAY_NAMES[index] ?? ''}
            sessions={week.sessions.filter((s) => s.sessionDate === date)}
            peakTss={peakTss}
            isToday={date === today}
            isSelected={selectedDate === date}
            movingSession={movingSession}
            moving={moving}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </Section>
  )
}

function DayCell({
  date,
  dayLabel,
  sessions,
  peakTss,
  isToday,
  isSelected,
  movingSession,
  moving,
  onDayClick,
}: {
  date: string
  dayLabel: string
  sessions: TodaySession[]
  peakTss: number
  isToday: boolean
  isSelected: boolean
  movingSession: TodaySession | null
  moving: boolean
  onDayClick: (date: string) => void
}) {
  const isMoveTarget = movingSession != null && movingSession.sessionDate !== date
  const isMoveOrigin = movingSession?.sessionDate === date
  const disabled = moving || (movingSession != null && !isMoveTarget)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onDayClick(date)}
      aria-pressed={isSelected}
      className={cn(
        'flex min-h-[108px] flex-col gap-2 rounded-control p-2.5 text-left transition-colors',
        isSelected ? 'bg-surface-3' : 'bg-surface-1 hover:bg-surface-2',
        isToday && !isSelected && 'ring-1 ring-brand/50 ring-inset',
        isMoveTarget && 'ring-1 ring-brand ring-inset ring-dashed',
        isMoveOrigin && 'opacity-50',
        disabled && 'cursor-default opacity-40'
      )}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="t-micro text-ink-3">{dayLabel}</span>
        <span
          className={cn(
            't-num t-num-md',
            isToday ? 'text-brand' : isSelected ? 'text-ink-1' : 'text-ink-2'
          )}
        >
          {date.slice(8)}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {sessions.length === 0 ? (
          <span className="block t-label text-ink-3/70">Rest</span>
        ) : (
          sessions.map((session) => {
            const sport = sportClasses(session.sport)
            const linked = session.status === 'completed' && session.activity != null
            const actualMin =
              linked && session.activity
                ? Math.round(session.activity.durationSeconds / 60)
                : null
            const durationLabel = actualMin ?? session.durationMinutes
            const load =
              linked && session.activity?.tss != null && session.activity.tss > 0
                ? session.activity.tss
                : (session.plannedLoad ?? 0)
            return (
              <span
                key={session.id}
                title={`${session.title}${load ? ` · ${Math.round(load)} TSS` : ''}`}
                className={cn(
                  'block min-w-0',
                  session.status === 'completed' && !linked && 'opacity-50'
                )}
              >
                <span className="flex items-baseline gap-1.5">
                  <span
                    className={cn('size-1.5 shrink-0 translate-y-[-1px] rounded-full', sport.dot)}
                    aria-hidden
                  />
                  <span className="truncate t-label text-ink-1">
                    {SPORT_LABELS[session.sport] ?? session.sport}
                  </span>
                  {durationLabel ? (
                    <span className="t-num ml-auto shrink-0 text-[11px] text-ink-3">
                      {durationLabel}′
                    </span>
                  ) : null}
                </span>
                {/* Bar length encodes load (actual when linked), so the weekly
                    shape is visible without opening a single day. */}
                <span className="mt-1 block h-[3px] overflow-hidden rounded-full bg-surface-3">
                  <span
                    className={cn('block h-full rounded-full', sport.bar)}
                    style={{
                      width: `${Math.max(12, peakTss > 0 ? (load / peakTss) * 100 : 12)}%`,
                    }}
                  />
                </span>
              </span>
            )
          })
        )}
      </div>

      {sessions.some((s) => s.guardrail && !s.guardrail.passed) ? (
        <Chip tone="alert" className="px-1.5 py-0">
          blocked
        </Chip>
      ) : null}
    </button>
  )
}

function slotRank(slot: string): number {
  const index = SLOT_ORDER.indexOf(slot)
  return index === -1 ? SLOT_ORDER.length : index
}
