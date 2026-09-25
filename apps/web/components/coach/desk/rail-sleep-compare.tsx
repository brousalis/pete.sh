'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Metric, MetricRow } from '@/components/coach/ui/metric'
import {
  Chip,
  Disclosure,
  EmptyNote,
  Panel,
  PanelHeader,
  Section,
} from '@/components/coach/ui/panel'
import { toneClasses, type Tone } from '@/components/coach/ui/tone'
import type {
  SleepCompareDetailView,
  SleepNightAgreement,
  SleepNightCompareRow,
  SleepStageAverageMinutes,
} from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const APPLE_STROKE = 'var(--ink-1)'
const POLAR_STROKE = 'var(--accent-teal)'

const STAGE_COLORS = {
  deep: 'var(--accent-azure)',
  rem: 'var(--accent-violet)',
  light: 'var(--accent-slate)',
  awake: 'var(--tone-caution)',
  unknown: 'var(--ink-3)',
} as const

function leanTone(verdict: SleepCompareDetailView['lean']['verdict']): Tone {
  switch (verdict) {
    case 'agree':
      return 'good'
    case 'insufficient':
      return 'neutral'
    case 'stages_diverge':
      return 'info'
    case 'polar_longer':
    case 'polar_shorter':
      return 'caution'
    default:
      return 'neutral'
  }
}

function agreementChip(agreement: SleepNightAgreement): { label: string; tone: Tone } {
  switch (agreement) {
    case 'close':
      return { label: 'Close', tone: 'good' }
    case 'off':
      return { label: 'Off', tone: 'caution' }
    case 'polar_only':
      return { label: 'Polar only', tone: 'info' }
    case 'apple_only':
      return { label: 'Apple only', tone: 'neutral' }
  }
}

function formatSigned(value: number, unit: string, decimals = 0): string {
  const rounded =
    decimals > 0 ? value.toFixed(decimals) : String(Math.round(value))
  const sign = value > 0 ? '+' : ''
  return `${sign}${rounded}${unit}`
}

function formatClock(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function formatDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y!, m! - 1, d!))
  return utc.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}

function StageBar({
  label,
  stages,
  lightLabel,
}: {
  label: string
  stages: SleepStageAverageMinutes
  lightLabel: string
}) {
  const parts = [
    { key: 'deep', minutes: stages.deepMinutes, color: STAGE_COLORS.deep, name: 'Deep' },
    { key: 'rem', minutes: stages.remMinutes, color: STAGE_COLORS.rem, name: 'REM' },
    {
      key: 'light',
      minutes: stages.lightOrCoreMinutes,
      color: STAGE_COLORS.light,
      name: lightLabel,
    },
    { key: 'awake', minutes: stages.awakeMinutes, color: STAGE_COLORS.awake, name: 'Awake' },
    {
      key: 'unknown',
      minutes: stages.unrecognizedMinutes,
      color: STAGE_COLORS.unknown,
      name: 'Unknown',
    },
  ].filter((p) => p.minutes != null && p.minutes > 0)

  const total = parts.reduce((sum, p) => sum + (p.minutes ?? 0), 0)

  if (total <= 0) {
    return (
      <div>
        <p className="t-label text-ink-2">{label}</p>
        <p className="mt-1 t-label text-ink-3">No stage data yet</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="t-label text-ink-2">{label}</p>
        <p className="t-label text-ink-3">avg night</p>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-surface-3">
        {parts.map((part) => (
          <div
            key={part.key}
            title={`${part.name} ${part.minutes}m`}
            style={{
              width: `${((part.minutes ?? 0) / total) * 100}%`,
              background: part.color,
            }}
          />
        ))}
      </div>
      <p className="mt-1.5 t-label text-ink-3">
        {parts.map((p) => `${p.name} ${p.minutes}m`).join(' · ')}
      </p>
    </div>
  )
}

function NightRow({ night }: { night: SleepNightCompareRow }) {
  const chip = agreementChip(night.agreement)
  const deltaHours = night.deltas?.asleepHours

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="t-label font-medium text-ink-1">{formatDateLabel(night.date)}</p>
        <Chip tone={chip.tone}>{chip.label}</Chip>
      </div>

      <div className="mt-2 grid gap-1 t-label text-ink-2 sm:grid-cols-2">
        <p>
          Apple {night.apple?.hours != null ? `${night.apple.hours.toFixed(1)}h` : '—'}
          {night.apple ? (
            <span className="text-ink-3">
              {' '}
              · {formatClock(night.apple.start)}–{formatClock(night.apple.end)}
            </span>
          ) : null}
        </p>
        <p>
          Polar {night.polar?.hours != null ? `${night.polar.hours.toFixed(1)}h` : '—'}
          {night.polar ? (
            <span className="text-ink-3">
              {' '}
              · {formatClock(night.polar.start)}–{formatClock(night.polar.end)}
            </span>
          ) : null}
        </p>
      </div>

      {deltaHours != null ? (
        <p className="mt-1 t-label text-ink-3">
          Δ asleep {formatSigned(deltaHours, 'h', 1)}
          {night.deltas?.bedtimeOffsetMinutes != null
            ? ` · bed ${formatSigned(night.deltas.bedtimeOffsetMinutes, 'm')}`
            : ''}
        </p>
      ) : null}

      {(night.apple || night.polar) && (
        <Disclosure label="Stages" className="mt-2">
          <div className="space-y-1.5 t-label text-ink-2">
            {night.apple ? (
              <p>
                Apple — Deep {night.apple.deepMinutes ?? '—'}m · REM{' '}
                {night.apple.remMinutes ?? '—'}m · Core {night.apple.coreMinutes ?? '—'}m ·
                Awake {night.apple.awakeMinutes ?? '—'}m
              </p>
            ) : null}
            {night.polar ? (
              <p>
                Polar — Deep {night.polar.deepMinutes ?? '—'}m · REM{' '}
                {night.polar.remMinutes ?? '—'}m · Light {night.polar.lightMinutes ?? '—'}m ·
                Awake {night.polar.awakeMinutes ?? '—'}m
                {night.polar.sleepScore != null ? ` · Score ${night.polar.sleepScore}` : ''}
                {night.polarContinuity != null
                  ? ` · Continuity ${night.polarContinuity.toFixed(1)}`
                  : ''}
              </p>
            ) : null}
          </div>
        </Disclosure>
      )}
    </div>
  )
}

export function RailSleepCompare() {
  const [data, setData] = useState<SleepCompareDetailView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/coach/sleep-compare?days=28', {
          credentials: 'include',
        })
        const payload = await response.json()
        if (payload.success) {
          setData(payload.data as SleepCompareDetailView)
        } else {
          setError(payload.error ?? 'Could not load sleep comparison')
        }
      } catch {
        setError('Could not load sleep comparison')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.series.map((point) => ({
      ...point,
      label: shortDate(point.date),
    }))
  }, [data])

  const overlapSeriesCount = useMemo(
    () =>
      chartData.filter((p) => p.appleHours != null && p.polarHours != null).length,
    [chartData]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-4 animate-spin text-ink-3" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Section title="Sleep devices">
        <EmptyNote>{error ?? 'No sleep comparison data.'}</EmptyNote>
      </Section>
    )
  }

  const { lean, summary, stageAverages, nights } = data
  const tone = leanTone(lean.verdict)

  return (
    <div className="space-y-6">
      <Section title="Sleep devices">
        <Panel className="space-y-3">
          <p className="t-body text-ink-2">
            Both bands estimate sleep from movement and heart rate — not a medical sleep
            study. Coach still uses <span className="text-ink-1">Apple Watch</span> only.
            This page compares nights where both recorded data.
          </p>
        </Panel>
      </Section>

      <Section title="The lean">
        <Panel tone={tone === 'neutral' ? 'default' : tone} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn('t-title', toneClasses(tone).text)}>{lean.headline}</p>
            <Chip tone="neutral">{data.overlappingNights} nights compared</Chip>
            <Chip tone="info">Apple still drives coach</Chip>
          </div>
          <ul className="space-y-1.5">
            {lean.bullets.map((bullet) => (
              <li key={bullet} className="t-body text-ink-2">
                {bullet}
              </li>
            ))}
          </ul>
        </Panel>
      </Section>

      <Section title="Total sleep">
        <Panel>
          {overlapSeriesCount < 2 ? (
            <EmptyNote>
              Need at least two nights with both devices to draw a trend.
            </EmptyNote>
          ) : (
            <>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--ink-3)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--ink-3)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                      unit="h"
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--line-strong)',
                        borderRadius: 'var(--r-control)',
                        fontSize: 12,
                      }}
                      labelStyle={{ color: 'var(--ink-3)', fontSize: 11 }}
                      formatter={(value, name) => {
                        const n = typeof value === 'number' ? value : Number(value)
                        const label = name === 'appleHours' ? 'Apple' : 'Polar'
                        return [
                          Number.isFinite(n) ? `${n.toFixed(1)}h` : '—',
                          label,
                        ]
                      }}
                    />
                    <Legend
                      formatter={(value) => (value === 'appleHours' ? 'Apple' : 'Polar')}
                      wrapperStyle={{ fontSize: 12, color: 'var(--ink-3)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="appleHours"
                      name="appleHours"
                      stroke={APPLE_STROKE}
                      strokeWidth={1.75}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="polarHours"
                      name="polarHours"
                      stroke={POLAR_STROKE}
                      strokeWidth={1.75}
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 t-label text-ink-3">
                Closer lines = more agreement on how long you slept.
              </p>
            </>
          )}
        </Panel>
      </Section>

      <Section title="Where they differ">
        <Panel>
          <MetricRow stack>
            <div className="min-w-0 flex-1 space-y-1">
              <Metric
                label="Sleep length"
                value={summary.meanAsleepDeltaH}
                unit="h"
                size="md"
                align="center"
                decimals={1}
                signed
                hint="Polar − Apple"
              />
              <p className="text-center t-label text-ink-3">Good ≈ within 20 min</p>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Metric
                label="Fell asleep"
                value={summary.medianBedOffsetMin}
                unit="m"
                size="md"
                align="center"
                signed
                hint="median"
              />
              <p className="text-center t-label text-ink-3">Good ≈ within 25 min</p>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Metric
                label="Woke up"
                value={summary.medianWakeOffsetMin}
                unit="m"
                size="md"
                align="center"
                signed
                hint="median"
              />
              <p className="text-center t-label text-ink-3">Good ≈ within 25 min</p>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Metric
                label="Deep share"
                value={summary.meanDeepPctDelta}
                unit="pp"
                size="md"
                align="center"
                signed
                hint="Polar − Apple"
              />
              <p className="text-center t-label text-ink-3">Stages often disagree</p>
            </div>
          </MetricRow>
        </Panel>
      </Section>

      <Section title="Stage mix">
        <Panel className="space-y-4">
          <StageBar label="Apple Watch" stages={stageAverages.apple} lightLabel="Core" />
          <StageBar label="Polar Loop" stages={stageAverages.polar} lightLabel="Light" />
          <p className="t-label text-ink-3">
            Light on Polar ≈ Core on Apple — same idea, different name. Algorithms still
            disagree on boundaries.
          </p>
        </Panel>
      </Section>

      <Section title="Night by night">
        <Panel>
          {nights.length === 0 ? (
            <EmptyNote>No sleep nights in this window.</EmptyNote>
          ) : (
            <div className="divide-y divide-line">
              {nights.map((night) => (
                <NightRow key={night.date} night={night} />
              ))}
            </div>
          )}
        </Panel>
      </Section>

      <Section title="How to read this">
        <Panel>
          <Disclosure label="Plain definitions" defaultOpen={false}>
            <dl className="space-y-3 t-body text-ink-2">
              <div>
                <dt className="t-label font-medium text-ink-1">Asleep</dt>
                <dd className="mt-0.5">Time the device thinks you were sleeping.</dd>
              </div>
              <div>
                <dt className="t-label font-medium text-ink-1">Deep / REM / Light·Core</dt>
                <dd className="mt-0.5">
                  Rough stages from wrist sensors. Algorithms differ — treat large gaps as
                  noise, not a diagnosis.
                </dd>
              </div>
              <div>
                <dt className="t-label font-medium text-ink-1">Awake / interruptions</dt>
                <dd className="mt-0.5">Brief wakes inside the night.</dd>
              </div>
              <div>
                <dt className="t-label font-medium text-ink-1">Efficiency</dt>
                <dd className="mt-0.5">
                  Asleep ÷ time in bed (Apple) or asleep ÷ bedtime-to-wake (Polar).
                </dd>
              </div>
              <div>
                <dt className="t-label font-medium text-ink-1">Polar score</dt>
                <dd className="mt-0.5">
                  Polar’s 1–100 quality summary. Apple has no equivalent on this page.
                </dd>
              </div>
            </dl>
          </Disclosure>
          <PanelHeader label={`${data.days}-day window · Polar − Apple`} className="mt-3" />
        </Panel>
      </Section>
    </div>
  )
}
