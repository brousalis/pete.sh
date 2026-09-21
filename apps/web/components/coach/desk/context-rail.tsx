'use client'

import {
  Activity,
  CalendarRange,
  MessageSquare,
  MoreHorizontal,
  Sun,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

import { ChatShell } from '@/components/coach/chat/chat-shell'
import { RailKnee } from '@/components/coach/desk/rail-knee'
import { RailLoad } from '@/components/coach/desk/rail-load'
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
  knee: Activity,
  load: TrendingUp,
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
  className,
}: {
  panel: DeskPanel
  onPanelChange: (panel: DeskPanel) => void
  today: TodayResponse | null
  todayLoading: boolean
  todayError: string | null
  onTodayReload: () => void
  className?: string
}) {
  const kneeTone = deriveKneeTone(today)
  const readiness = today?.readiness ?? null

  return (
    <section className={cn('flex min-h-0 min-w-0 flex-col bg-surface-0', className)}>
      <header className="shrink-0 border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-[72rem] items-center gap-4 px-5 md:px-8">
          <Wordmark />

          <nav
            className="hidden flex-1 items-center justify-center gap-1 md:flex"
            aria-label="Sections"
          >
            {PANEL_ORDER.map((id) => (
              <TabButton
                key={id}
                id={id}
                active={panel === id}
                alert={id === 'knee' && kneeTone === 'alert'}
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
            <button
              type="button"
              onClick={() => onPanelChange('knee')}
              className="flex items-center gap-1.5 rounded-control px-2 py-1 transition-colors hover:bg-surface-2"
              title="Knee status"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  toneClasses(kneeTone).dot,
                  kneeTone === 'alert' && 'animate-pulse-subtle'
                )}
                aria-hidden
              />
              <span className="t-micro text-ink-3">knee</span>
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'min-h-0 flex-1',
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
              panel === 'today' || panel === 'plan' ? 'max-w-[72rem]' : 'max-w-[46rem]'
            )}
          >
            {panel === 'today' ? (
              <RailToday
                data={today}
                loading={todayLoading}
                error={todayError}
                onReload={onTodayReload}
              />
            ) : null}
            {panel === 'plan' ? <RailPlan /> : null}
            {panel === 'knee' ? <RailKnee /> : null}
            {panel === 'load' ? <RailLoad /> : null}
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
                <span className="relative">
                  <Icon className="size-[18px]" />
                  {id === 'knee' && kneeTone === 'alert' ? (
                    <span className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-tone-alert" />
                  ) : null}
                </span>
                <span className="text-[10px] leading-none font-medium">{PANEL_LABELS[id]}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </section>
  )
}

function Wordmark() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="grid size-6 place-items-center rounded-[7px] bg-brand">
        <span className="t-num text-[11px] font-semibold text-brand-ink">3</span>
      </span>
      <span className="t-subtitle hidden sm:inline">petehome</span>
    </div>
  )
}

function TabButton({
  id,
  active,
  alert,
  onSelect,
}: {
  id: DeskPanel
  active: boolean
  alert: boolean
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
      {alert ? (
        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-tone-alert" />
      ) : null}
    </button>
  )
}

function readinessTone(score: number): Tone {
  if (score >= 75) return 'good'
  if (score >= 55) return 'info'
  if (score >= 40) return 'caution'
  return 'alert'
}

/**
 * Knee state is the product's top-priority signal, so it stays visible in the
 * chrome on every screen rather than living only inside the Knee tab.
 */
function deriveKneeTone(today: TodayResponse | null): Tone {
  if (!today) return 'neutral'
  const mechanical = today.symptomsToday.some(
    (symptom) => symptom.swelling || symptom.locking || symptom.instability
  )
  const redFlag = today.sessions.some((session) => session.guardrail?.severity === 'red_flag')
  if (mechanical || redFlag) return 'alert'

  const peakPain = today.symptomsToday.reduce((max, s) => Math.max(max, s.painScore), 0)
  if (peakPain >= 4) return 'alert'
  if (peakPain >= 2) return 'caution'
  return 'good'
}
