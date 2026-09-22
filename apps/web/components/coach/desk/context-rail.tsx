'use client'

import {
  CalendarRange,
  Footprints,
  MessageSquare,
  MoreHorizontal,
  Sun,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

import { ChatShell } from '@/components/coach/chat/chat-shell'
import { RailActivity } from '@/components/coach/desk/rail-activity'
import { RailFuel } from '@/components/coach/desk/rail-fuel'
import { RailMore } from '@/components/coach/desk/rail-more'
import { RailPlan } from '@/components/coach/desk/rail-plan'
import { RailToday } from '@/components/coach/desk/rail-today'
import {
  PANEL_LABELS,
  PANEL_ORDER,
  type DeskPanel,
} from '@/components/coach/desk/desk-types'
import { toneClasses, type Tone } from '@/components/coach/ui/tone'
import type { TodayResponse } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const PANEL_ICONS: Record<DeskPanel, LucideIcon> = {
  today: Sun,
  plan: CalendarRange,
  fuel: Utensils,
  activity: Footprints,
  coach: MessageSquare,
  more: MoreHorizontal,
}

export function ContextRail({
  panel,
  onPanelChange,
  today,
  todayLoading,
  todayError,
  onTodayReload,
  onSessionStatus,
  className,
}: {
  panel: DeskPanel
  onPanelChange: (panel: DeskPanel) => void
  today: TodayResponse | null
  todayLoading: boolean
  todayError: string | null
  onTodayReload: () => void
  onSessionStatus?: (
    sessionId: string,
    status: 'completed' | 'skipped'
  ) => Promise<void>
  className?: string
}) {
  const readiness = today?.readiness ?? null

  return (
    <section className={cn('flex min-h-0 min-w-0 flex-col bg-surface-0', className)}>
      <header className="shrink-0 border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-[72rem] items-center gap-4 px-5 md:px-8">
          <Wordmark onGoToday={() => onPanelChange('today')} />

          <nav
            className="hidden flex-1 items-center justify-center gap-1 md:flex"
            aria-label="Sections"
          >
            {PANEL_ORDER.map((id) => (
              <TabButton
                key={id}
                id={id}
                active={panel === id}
                onSelect={onPanelChange}
              />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 md:ml-0">
            {readiness ? (
              <button
                type="button"
                onClick={() => onPanelChange('today')}
                className="flex items-baseline gap-1.5 rounded-control px-2 py-1 transition-colors hover:bg-surface-2"
                title={`Readiness ${readiness.score} — ${readiness.guidance.summary}`}
              >
                <span
                  className={cn(
                    't-num t-num-sm',
                    toneClasses(readinessTone(readiness.score)).text
                  )}
                >
                  {readiness.score}
                </span>
                <span className="t-micro text-ink-3">ready</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className={cn(
          'relative min-h-0 flex-1',
          panel === 'coach' ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'
        )}
      >
        {panel === 'coach' ? (
          <ChatShell onOpenPanel={onPanelChange} />
        ) : (
          <div
            key={panel}
            className={cn(
              'animate-fade-in mx-auto min-h-full w-full pb-20 md:pb-0',
              panel === 'today' || panel === 'plan' || panel === 'activity'
                ? 'max-w-[72rem]'
                : 'max-w-[46rem]'
            )}
          >
            {panel === 'today' ? (
              <RailToday
                data={today}
                loading={todayLoading}
                error={todayError}
                onReload={onTodayReload}
                onSessionStatus={onSessionStatus}
              />
            ) : null}
            {panel === 'plan' ? <RailPlan /> : null}
            {panel === 'fuel' ? <RailFuel /> : null}
            {panel === 'activity' ? <RailActivity /> : null}
            {panel === 'more' ? <RailMore /> : null}
          </div>
        )}
      </div>

      <nav
        className="shrink-0 border-t border-line bg-surface-0 pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Sections"
      >
        <div className="grid grid-cols-6">
          {PANEL_ORDER.map((id) => {
            const Icon = PANEL_ICONS[id]
            const active = panel === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPanelChange(id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2.5 transition-colors',
                  active ? 'text-ink-1' : 'text-ink-3'
                )}
              >
                {active ? (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" aria-hidden />
                ) : null}
                <Icon className="size-[18px]" />
                <span className="text-[10px] leading-none font-medium">{PANEL_LABELS[id]}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </section>
  )
}

function Wordmark({ onGoToday }: { onGoToday: () => void }) {
  return (
    <button
      type="button"
      onClick={onGoToday}
      className="group -ml-1.5 flex shrink-0 items-center gap-2 rounded-control px-1.5 py-1 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand/40"
      aria-label="Today"
      title="Today"
    >
      <span className="grid size-6 place-items-center rounded-[7px] bg-brand text-brand-ink">
        <PetehomeMark className="size-3.5" />
      </span>
      <span className="t-subtitle hidden pr-0.5 sm:inline">
        pete<span className="text-ink-2 transition-colors group-hover:text-ink-1">home</span>
      </span>
    </button>
  )
}

/** Compact chronograph: instrument + hand at 3 for the sub-3 goal. */
function PetehomeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.22" />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
      <path d="M12 12h7.25" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
    </svg>
  )
}

function TabButton({
  id,
  active,
  onSelect,
}: {
  id: DeskPanel
  active: boolean
  onSelect: (panel: DeskPanel) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative shrink-0 rounded-control px-3 py-1.5 t-label font-medium transition-colors',
        active ? 'bg-surface-2 text-ink-1' : 'text-ink-3 hover:bg-surface-1 hover:text-ink-1'
      )}
    >
      {PANEL_LABELS[id]}
    </button>
  )
}

function readinessTone(score: number): Tone {
  if (score >= 75) return 'good'
  if (score >= 55) return 'info'
  if (score >= 40) return 'caution'
  return 'alert'
}
