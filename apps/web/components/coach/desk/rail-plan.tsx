'use client'

import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import { LoadSection } from '@/components/coach/desk/load-section'
import { PlanDatePicker } from '@/components/coach/desk/plan-date-picker'
import { DayActualsStrip } from '@/components/coach/day-actuals-strip'
import { SessionCard } from '@/components/coach/session-card'
import {
  SessionAudibleSheet,
  type AudibleSheetTarget,
} from '@/components/coach/session-audible-sheet'
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
import type {
  DayActualView,
  PlanWeekView,
  TodaySession,
  YearPlanView,
} from '@/lib/types/coach-ui.types'
import { SPORT_LABELS } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const SLOT_ORDER = ['morning', 'afternoon', 'evening', 'anytime', 'primary']

const TOTAL_WEEKS = 48

export function RailPlan() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateFromUrl = searchParams.get('date')

  const [weeks, setWeeks] = useState<PlanWeekView[]>([])
  const [yearPlan, setYearPlan] = useState<YearPlanView | null>(null)
  const [dayActualsByDate, setDayActualsByDate] = useState<
    Record<string, DayActualView[]>
  >({})
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
  const [audibleTarget, setAudibleTarget] = useState<AudibleSheetTarget | null>(
    null
  )
  const detailRef = useRef<HTMLElement | null>(null)
  const revealDetailRef = useRef(false)

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
      const windowStart = addDays(
        chicagoMondayOf(chicagoToday()),
        nextOffset * 7
      )
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
        setDayActualsByDate(
          (payload.data.dayActualsByDate as Record<string, DayActualView[]>) ??
            {}
        )

        setSelectedDate(current => {
          if (current && current >= from && current <= to) return current
          // Week pager moved past the selection — drop it rather than show
          // an empty day detail for a date that isn't in this window.
          if (current && (current < from || current > to)) return null

          const dated = loaded.flatMap(week => week.sessions)
          const today = chicagoToday()
          if (dated.some(session => session.sessionDate === today)) return today
          return dated.find(session => session.sessionDate)?.sessionDate ?? null
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
  useEffect(() => {
    if (!revealDetailRef.current) return
    revealDetailRef.current = false
    if (!selectedDate || window.innerWidth >= 768) return
    detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedDate])

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
      }).then(response => response.json())

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
      }).then(response => response.json())

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
    ...weeks.flatMap(w =>
      w.sessions.map(s => {
        const actual = s.activity?.tss
        if (actual != null && actual > 0)
          return Math.max(s.plannedLoad ?? 0, actual)
        return s.plannedLoad ?? 0
      })
    )
  )

  const selectedSessions = selectedDate
    ? weeks
        .flatMap(week => week.sessions)
        .filter(session => session.sessionDate === selectedDate)
        .sort((a, b) => slotRank(a.slot) - slotRank(b.slot))
    : []

  function handleDayClick(date: string) {
    if (movingSession) {
      if (movingSession.sessionDate !== date && !moving) {
        void moveSession(movingSession, date)
      }
      return
    }
    revealDetailRef.current = true
    setSelectedDate(current => (current === date ? null : date))
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
    <div className="space-y-6 px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <h1 className="t-display">Plan</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/coach/tests"
            className="t-label text-ink-3 hover:text-ink-1 shrink-0 font-medium underline-offset-4 transition-colors hover:underline"
          >
            Baseline tests
          </Link>
          <div className="rounded-control bg-surface-1 flex items-center gap-0.5 p-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="text-ink-2 size-10 sm:size-8"
              aria-label="Previous four weeks"
              onClick={() => setOffset(v => v - 4)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="t-label text-ink-2 h-8 gap-1.5 px-2.5 font-medium"
              onClick={() => setPickerOpen(true)}
              aria-label="Jump to date"
            >
              <CalendarDays className="size-3.5" />
              {headerLabel}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="t-label text-ink-2 h-8 px-3 font-medium"
              onClick={goToday}
              disabled={
                offset === 0 && headerIsToday && selectedDate === chicagoToday()
              }
            >
              Today
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-ink-2 size-10 sm:size-8"
              aria-label="Next four weeks"
              onClick={() => setOffset(v => v + 4)}
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
        onSelect={date => jumpToDate(date)}
      />

      {loading && !yearPlan ? <YearPlanSummarySkeleton /> : null}
      {yearPlan ? <YearPlanSummary plan={yearPlan} /> : null}

      {moveResult ? (
        <Panel tone="alert" className="flex gap-3">
          <AlertTriangle className="text-tone-alert mt-0.5 size-4 shrink-0" />
          <p className="t-body text-ink-2">{moveResult}</p>
        </Panel>
      ) : null}

      {movingSession ? (
        <Panel
          tone="brand"
          className="flex items-center justify-between gap-3 py-2.5"
        >
          <p className="t-body text-ink-2 min-w-0">
            Moving{' '}
            <span className="text-ink-1 font-medium">
              {movingSession.title}
            </span>{' '}
            — pick a day
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="text-ink-2 h-7 shrink-0"
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
        <div className="border-line flex justify-center border-t py-16">
          <Loader2 className="text-ink-3 size-4 animate-spin" />
        </div>
      ) : weeks.length === 0 ? (
        <div className="border-line space-y-6 border-t pt-6">
          <EmptyNote>
            No sessions in this window. The Sunday planning job fills the coming
            week.
          </EmptyNote>
          {selectedDate && !movingSession ? (
            <DayDetail
              date={selectedDate}
              sessions={[]}
              dayActuals={dayActualsByDate[selectedDate] ?? []}
              onMove={() => undefined}
              onAudible={session =>
                setAudibleTarget({
                  date: selectedDate,
                  focusSession: session,
                  sessions: [],
                  dayActuals: dayActualsByDate[selectedDate] ?? [],
                })
              }
              onClose={() => setSelectedDate(null)}
              onShiftDay={delta =>
                jumpToDate(shiftChicagoDate(selectedDate, delta))
              }
              sectionRef={null as unknown as RefObject<HTMLElement | null>}
            />
          ) : null}
        </div>
      ) : (
        <div className="border-line space-y-6 border-t pt-6">
          {/* The week strip is navigation: it wants width, not height. The
              selected day is the content, so it gets the full column below. */}
          <div className="space-y-5">
            {visibleWeeks.map(week => (
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
                onClick={() => setShowMore(value => !value)}
                className="rounded-control border-line t-label text-ink-3 hover:border-line-strong hover:text-ink-1 w-full border border-dashed py-2 font-medium transition-colors"
              >
                {showMore
                  ? 'Show this week only'
                  : `Show the next ${weeks.length - 1} weeks`}
              </button>
            ) : null}
          </div>

          {selectedDate && !movingSession ? (
            <DayDetail
              date={selectedDate}
              sessions={selectedSessions}
              dayActuals={dayActualsByDate[selectedDate] ?? []}
              sectionRef={detailRef}
              onMove={session => {
                setMoveResult(null)
                setMovingSession(session)
              }}
              onAudible={session =>
                setAudibleTarget({
                  date: selectedDate,
                  focusSession: session,
                  sessions: selectedSessions,
                  dayActuals: dayActualsByDate[selectedDate] ?? [],
                })
              }
              onClose={() => setSelectedDate(null)}
              onShiftDay={delta =>
                jumpToDate(shiftChicagoDate(selectedDate, delta))
              }
            />
          ) : null}
        </div>
      )}

      <SessionAudibleSheet
        target={audibleTarget}
        onOpenChange={open => {
          if (!open) setAudibleTarget(null)
        }}
        onApplied={() => void load()}
      />
    </div>
  )
}

function DayDetail({
  date,
  sessions,
  dayActuals,
  sectionRef,
  onMove,
  onAudible,
  onClose,
  onShiftDay,
}: {
  date: string
  sessions: TodaySession[]
  dayActuals: DayActualView[]
  sectionRef: RefObject<HTMLElement | null>
  onMove: (session: TodaySession) => void
  onAudible: (session: TodaySession | null) => void
  onClose: () => void
  onShiftDay: (delta: number) => void
}) {
  const plannedTss = sessions.reduce(
    (sum, session) => sum + (session.plannedLoad ?? 0),
    0
  )
  const minutes = sessions.reduce(
    (sum, session) => sum + (session.durationMinutes ?? 0),
    0
  )
  const isToday = date === chicagoToday()

  return (
    <section ref={sectionRef} className="border-line space-y-3.5 border-t pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="rounded-control bg-surface-1 flex items-center gap-0.5 p-0.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-ink-2 size-8"
              aria-label="Previous day"
              onClick={() => onShiftDay(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="t-title min-w-[10rem] px-1 text-center">
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
              className="text-ink-2 size-8"
              aria-label="Next day"
              onClick={() => onShiftDay(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {sessions.length > 0 ? (
            <div className="flex items-baseline gap-3">
              {minutes > 0 ? <Tally value={minutes} unit="min" /> : null}
              {plannedTss > 0 ? (
                <Tally value={plannedTss} unit="TSS" tip="tss" />
              ) : null}
            </div>
          ) : null}
          {isToday ? <Chip tone="brand">Today</Chip> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-control t-label text-ink-3 hover:text-ink-1 -my-1.5 px-2 py-1.5 font-medium transition-colors"
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
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(min(28rem,100%),1fr))] items-start gap-3">
          {sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              defaultShowSteps
              onMove={session.status === 'planned' ? onMove : undefined}
              onAudible={
                session.status === 'planned' || session.status === 'modified'
                  ? onAudible
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <DayActualsStrip
        actuals={dayActuals}
        restDayHint={sessions.length === 0}
        onAudible={() => onAudible(null)}
      />
    </section>
  )
}

function Tally({
  value,
  unit,
  tip,
}: {
  value: number
  unit: string
  tip?: 'tss'
}) {
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
          <div className="rounded-chip bg-surface-3 h-5 w-44 animate-pulse" />
          <div className="rounded-chip bg-surface-3 h-3.5 w-64 max-w-full animate-pulse" />
        </div>
        <div className="flex items-baseline gap-4">
          <div className="space-y-1.5 text-right">
            <div className="rounded-chip bg-surface-3 ml-auto h-7 w-12 animate-pulse" />
            <div className="rounded-chip bg-surface-3 ml-auto h-3 w-14 animate-pulse" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="rounded-chip bg-surface-3 ml-auto h-7 w-14 animate-pulse" />
            <div className="rounded-chip bg-surface-3 ml-auto h-3 w-10 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-0.5">
        {[18, 22, 28, 16].map((span, index) => (
          <div
            key={index}
            className="min-w-0 flex-none"
            style={{ flexBasis: `${span}%` }}
          >
            <div className="bg-surface-3 h-1.5 animate-pulse rounded-full" />
            <div className="rounded-chip bg-surface-3 mt-1.5 h-3 w-3/4 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="border-line mt-4 border-t pt-3.5">
        <div className="rounded-chip bg-surface-3 h-4 w-56 max-w-full animate-pulse" />
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
  const raceLabel = new Date(
    `${plan.goalRaceDate}T12:00:00`
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const goalLabel = plan.goalTimeSeconds
    ? formatGoalTime(plan.goalTimeSeconds)
    : null
  const currentPhase =
    plan.phases.find(phase => phase.current) ?? plan.phases[0]
  const week = plan.currentWeek ?? 0

  return (
    <Panel className="px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-title">{plan.name}</p>
          <p className="t-label text-ink-3 mt-1">
            {[plan.goalRaceName ?? 'Goal race', raceLabel, goalLabel]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-right">
            <p className="t-num t-num-lg text-ink-1">
              {Math.max(0, plan.daysToRace)}
            </p>
            <p className="t-micro text-ink-3 mt-0.5">days out</p>
          </div>
          <div className="text-right">
            <p className="t-num t-num-lg text-ink-2">
              {week}
              <span className="text-ink-3 text-[0.6em]">/{TOTAL_WEEKS}</span>
            </p>
            <p className="t-micro text-ink-3 mt-0.5">weeks</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-0.5" role="presentation">
        {plan.phases.map(phase => {
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
              <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
                <div
                  className={cn(
                    'h-full rounded-full',
                    phase.current ? 'bg-brand' : 'bg-ink-3'
                  )}
                  style={{ width: `${filled * 100}%` }}
                />
              </div>
              <p
                className={cn(
                  't-micro mt-1.5 hidden truncate sm:block',
                  phase.current ? 'text-ink-1' : 'text-ink-3'
                )}
              >
                {phase.label}
              </p>
            </div>
          )
        })}
      </div>

      {currentPhase ? (
        <p className="t-micro text-ink-3 mt-2 sm:hidden">
          <span className="text-ink-1">{currentPhase.label}</span> · weeks{' '}
          {currentPhase.weekFrom}–{currentPhase.weekTo}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
        className="border-line text-ink-2 hover:text-ink-1 mt-4 flex w-full items-start justify-between gap-3 border-t pt-3.5 text-left transition-colors"
      >
        <span className="t-body min-w-0">
          {plan.currentBlock ? (
            <span className="text-ink-1 font-medium">
              Block {plan.currentBlock.number}: {plan.currentBlock.name}
            </span>
          ) : currentPhase ? (
            <>
              <span className="text-ink-1 font-medium">
                {currentPhase.label}
              </span>{' '}
              — {currentPhase.intent}
            </>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'text-ink-3 mt-0.5 size-4 shrink-0 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded ? (
        <div className="animate-fade-in-up mt-3 space-y-2.5">
          {plan.currentBlock && plan.currentBlock.goals.length > 0 ? (
            <ul className="space-y-1.5">
              {plan.currentBlock.goals.map(goal => (
                <li key={goal} className="t-label text-ink-2 flex gap-2">
                  <span
                    className="bg-brand mt-1.5 size-1 shrink-0 rounded-full"
                    aria-hidden
                  />
                  {goal}
                </li>
              ))}
            </ul>
          ) : null}
          <ol className="border-line space-y-1 border-t pt-2.5">
            {plan.phases.map(phase => (
              <li
                key={`${phase.weekFrom}-${phase.weekTo}`}
                className={cn(
                  'rounded-chip flex gap-3 px-2 py-1.5',
                  phase.current ? 'bg-surface-2' : ''
                )}
              >
                <span className="t-num t-num-sm text-ink-3 w-12 shrink-0">
                  {phase.weekFrom}–{phase.weekTo}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      't-label font-medium',
                      phase.current ? 'text-ink-1' : 'text-ink-2'
                    )}
                  >
                    {phase.label}
                  </span>
                  <span className="t-label text-ink-3 block">
                    {phase.intent}
                  </span>
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
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}`
    : `${minutes} min`
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
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(week.weekStart, index)
  )
  const today = chicagoToday()

  return (
    <Section
      title={`Week of ${new Date(
        `${week.weekStart}T12:00:00`
      ).toLocaleDateString('en-US', {
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
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((date, index) => (
          <DayCell
            key={date}
            date={date}
            dayLabel={DAY_NAMES[index] ?? ''}
            dayInitial={DAY_INITIALS[index] ?? ''}
            sessions={week.sessions.filter(s => s.sessionDate === date)}
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
  dayInitial,
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
  dayInitial: string
  sessions: TodaySession[]
  peakTss: number
  isToday: boolean
  isSelected: boolean
  movingSession: TodaySession | null
  moving: boolean
  onDayClick: (date: string) => void
}) {
  const isMoveTarget =
    movingSession != null && movingSession.sessionDate !== date
  const isMoveOrigin = movingSession?.sessionDate === date
  const disabled = moving || (movingSession != null && !isMoveTarget)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onDayClick(date)}
      aria-pressed={isSelected}
      aria-label={dayCellLabel(date, dayLabel, sessions)}
      className={cn(
        'rounded-control flex min-h-[76px] flex-col gap-1.5 p-1.5 text-left transition-colors sm:min-h-[108px] sm:gap-2 sm:p-2.5',
        isSelected ? 'bg-surface-3' : 'bg-surface-1 hover:bg-surface-2',
        isToday && !isSelected && 'ring-brand/50 ring-1 ring-inset',
        isMoveTarget && 'ring-brand ring-dashed ring-1 ring-inset',
        isMoveOrigin && 'opacity-50',
        disabled && 'cursor-default opacity-40'
      )}
    >
      <div className="flex flex-col items-center gap-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-1">
        <span className="t-micro text-ink-3">
          <span className="sm:hidden">{dayInitial}</span>
          <span className="hidden sm:inline">{dayLabel}</span>
        </span>
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
          <span className="t-label text-ink-3/70 block">
            <span className="block text-center sm:hidden" aria-hidden>
              ·
            </span>
            <span className="hidden sm:inline">Rest</span>
          </span>
        ) : (
          sessions.map(session => {
            const sport = sportClasses(session.sport)
            const cancelled = session.status === 'cancelled'
            const linked =
              session.status === 'completed' && session.activity != null
            const actualMin =
              linked && session.activity
                ? Math.round(session.activity.durationSeconds / 60)
                : null
            const durationLabel = cancelled
              ? null
              : (actualMin ?? session.durationMinutes)
            const load = cancelled
              ? 0
              : linked &&
                  session.activity?.tss != null &&
                  session.activity.tss > 0
                ? session.activity.tss
                : (session.plannedLoad ?? 0)
            return (
              <span
                key={session.id}
                title={
                  cancelled
                    ? `${session.title} · cancelled`
                    : `${session.title}${load ? ` · ${Math.round(load)} TSS` : ''}`
                }
                className={cn(
                  'block min-w-0',
                  cancelled && 'opacity-40',
                  session.status === 'completed' && !linked && 'opacity-50'
                )}
              >
                <span className="hidden items-baseline gap-1.5 sm:flex">
                  <span
                    className={cn(
                      'size-1.5 shrink-0 translate-y-[-1px] rounded-full',
                      cancelled ? 'bg-ink-3' : sport.dot
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      't-label truncate',
                      cancelled
                        ? 'text-ink-3 line-through decoration-ink-3/50'
                        : 'text-ink-1'
                    )}
                  >
                    {SPORT_LABELS[session.sport] ?? session.sport}
                  </span>
                  {durationLabel ? (
                    <span className="t-num text-ink-3 ml-auto shrink-0 text-[11px]">
                      {durationLabel}′
                    </span>
                  ) : null}
                </span>
                {/* Bar length encodes load (actual when linked), so the weekly
                    shape is visible without opening a single day. */}
                {cancelled ? (
                  <>
                    {/* Mobile: faint stub so the day still shows something was planned. */}
                    <span className="bg-ink-3/25 block h-1 w-1/3 rounded-full sm:hidden" />
                    <span className="t-micro text-ink-3/80 hidden sm:block">
                      cancelled
                    </span>
                  </>
                ) : (
                  <span className="bg-surface-3 block h-1.5 overflow-hidden rounded-full sm:mt-1 sm:h-[3px]">
                    <span
                      className={cn('block h-full rounded-full', sport.bar)}
                      style={{
                        width: `${Math.max(12, peakTss > 0 ? (load / peakTss) * 100 : 12)}%`,
                      }}
                    />
                  </span>
                )}
              </span>
            )
          })
        )}
      </div>

      {sessions.some(s => s.guardrail && !s.guardrail.passed) ? (
        <>
          <AlertTriangle
            className="text-tone-alert size-3 shrink-0 sm:hidden"
            aria-hidden
          />
          <Chip tone="alert" className="hidden px-1.5 py-0 sm:inline-flex">
            blocked
          </Chip>
        </>
      ) : null}
    </button>
  )
}

function dayCellLabel(
  date: string,
  dayLabel: string,
  sessions: TodaySession[]
): string {
  const day = `${dayLabel} ${Number(date.slice(8))}`
  if (sessions.length === 0) return `${day} — rest`

  const parts = sessions.map(session => {
    const sport = SPORT_LABELS[session.sport] ?? session.sport
    return session.durationMinutes
      ? `${sport} ${session.durationMinutes} min`
      : sport
  })

  return `${day} — ${parts.join(', ')}`
}

function slotRank(slot: string): number {
  const index = SLOT_ORDER.indexOf(slot)
  return index === -1 ? SLOT_ORDER.length : index
}
