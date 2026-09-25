'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Metric, MetricRow, StatLine } from '@/components/coach/ui/metric'
import { Chip, EmptyNote, Panel, PanelHeader, Track } from '@/components/coach/ui/panel'
import { TermTip } from '@/components/coach/ui/term-tip'
import { acwrTone, tsbTone, toneClasses } from '@/components/coach/ui/tone'
import type { LoadSummary } from '@petehome/coach-core'
import { cn } from '@/lib/utils'

interface ProjectionView {
  raceDate: string
  goalSeconds: number
  projectedSeconds: number
  confidenceLow: number
  confidenceHigh: number
  splits: {
    discipline: string
    budgetSeconds: number
    projectedSeconds: number
    deltaSeconds: number
    basis: string
  }[]
  leverage: {
    discipline: string
    secondsAvailable: number
    kneeRisk: 'none' | 'low' | 'moderate' | 'high'
    note: string
  }[]
}

const SERIES = [
  { key: 'fitness', label: 'Fitness (CTL)', tip: 'ctl' as const, colour: 'var(--sport-swim)' },
  { key: 'fatigue', label: 'Fatigue (ATL)', tip: 'atl' as const, colour: 'var(--sport-run)' },
  { key: 'form', label: 'Form (TSB)', tip: 'tsb' as const, colour: 'var(--ink-3)' },
]

/** Load + race projection block — rendered above the Plan calendar. */
export function LoadSection() {
  const [load, setLoad] = useState<LoadSummary | null>(null)
  const [projection, setProjection] = useState<ProjectionView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [loadResponse, projectionResponse] = await Promise.all([
          fetch('/api/coach/load?days=90', { credentials: 'include' }).then((r) => r.json()),
          fetch('/api/coach/projection', { credentials: 'include' }).then((r) => r.json()),
        ])
        if (loadResponse.success) setLoad(loadResponse.data)
        if (projectionResponse.success) setProjection(projectionResponse.data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6" aria-busy aria-label="Loading training load">
        <Panel className="px-5 py-5" aria-hidden>
          <div className="grid grid-flow-col auto-cols-fr divide-x divide-line">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2 px-3 first:pl-0 last:pr-0">
                <div className="h-8 w-14 animate-pulse rounded-chip bg-surface-3" />
                <div className="h-3 w-16 animate-pulse rounded-chip bg-surface-3" />
                <div className="h-3 w-12 animate-pulse rounded-chip bg-surface-3" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="px-3 py-4" aria-hidden>
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <div className="h-3 w-40 animate-pulse rounded-chip bg-surface-3" />
            <div className="h-3 w-48 animate-pulse rounded-chip bg-surface-3" />
          </div>
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="size-4 animate-spin text-ink-3" />
          </div>
        </Panel>
      </div>
    )
  }

  const chartData =
    load?.pmc.slice(-42).map((point) => ({
      date: point.date.slice(5),
      fitness: point.ctl,
      fatigue: point.atl,
      form: point.tsb,
    })) ?? []

  const acwr = acwrTone(load?.acwr)
  const monotony = load?.monotony == null ? 'neutral' : load.monotony > 2 ? 'caution' : 'good'

  return (
    <div className="space-y-6">
      {load ? (
        <Panel className="px-5 py-5">
          <MetricRow stack>
            <Metric
              label="Fitness"
              value={load.current?.ctl ?? null}
              size="lg"
              hint="CTL · 42d"
              tip="ctl"
            />
            <Metric
              label="Fatigue"
              value={load.current?.atl ?? null}
              size="lg"
              hint="ATL · 7d"
              tip="atl"
            />
            <Metric
              label="Form"
              value={load.current?.tsb ?? null}
              size="lg"
              signed
              tone={tsbTone(load.current?.tsb)}
              hint="TSB"
              tip="tsb"
            />
            <Metric
              label="Ramp"
              value={load.acwr}
              size="lg"
              decimals={2}
              tone={acwr}
              hint="ACWR"
              tip="acwr"
            />
          </MetricRow>
        </Panel>
      ) : null}

      <Panel className="px-3 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
          <TermTip term="pmc" className="t-micro text-ink-3">
            Performance management · 42 days
          </TermTip>
          <div className="flex flex-wrap items-center gap-3">
            {SERIES.map((series) => (
              <span key={series.key} className="inline-flex items-center gap-1.5 t-label text-ink-3">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: series.colour }}
                  aria-hidden
                />
                <TermTip term={series.tip} className="t-label text-ink-3">
                  {series.label}
                </TermTip>
              </span>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <EmptyNote>No load history yet.</EmptyNote>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="ctlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--sport-swim)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--sport-swim)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--ink-3)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--ink-3)' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <ReferenceLine y={0} stroke="var(--line-strong)" />
                <Tooltip
                  cursor={{ stroke: 'var(--line-strong)' }}
                  contentStyle={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line-strong)',
                    borderRadius: 'var(--r-control)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--ink-3)', fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="fitness"
                  stroke="var(--sport-swim)"
                  strokeWidth={2}
                  fill="url(#ctlFill)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fatigue"
                  stroke="var(--sport-run)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="form"
                  stroke="var(--ink-3)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {load ? (
        <Panel>
          <PanelHeader label="Safety" className="mb-1.5" />
          <div className="divide-y divide-line">
            <StatLine
              label="Ramp rate"
              value={load.acwr?.toFixed(2) ?? '—'}
              tone={acwr}
              tip="acwr"
              note={acwrNote(load.acwr)}
            />
            <StatLine
              label="Monotony"
              value={load.monotony?.toFixed(1) ?? '—'}
              tone={monotony}
              tip="monotony"
              note={
                load.monotony != null && load.monotony > 2
                  ? 'Make the easy days easier.'
                  : 'Good contrast between days.'
              }
            />
          </div>
        </Panel>
      ) : null}

      {projection ? <ProjectionPanel projection={projection} /> : null}
    </div>
  )
}

function ProjectionPanel({ projection }: { projection: ProjectionView }) {
  const ahead = projection.projectedSeconds <= projection.goalSeconds
  const delta = Math.abs(projection.projectedSeconds - projection.goalSeconds)
  const lead = projection.leverage[0]

  return (
    <Panel className="px-5 py-5">
      <PanelHeader label="Race projection" className="mb-3" />

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="t-num t-num-xl text-ink-1">{formatTime(projection.projectedSeconds)}</span>
        <Chip tone={ahead ? 'good' : 'caution'}>
          {ahead ? '−' : '+'}
          {formatTime(delta)} vs goal
        </Chip>
      </div>
      <p className="mt-1.5 t-label text-ink-3">
        Goal {formatTime(projection.goalSeconds)} · range {formatTime(projection.confidenceLow)}–
        {formatTime(projection.confidenceHigh)}
      </p>

      {projection.splits.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-line pt-3.5">
          {projection.splits.map((split) => {
            const over = split.deltaSeconds > 0
            return (
              <div key={split.discipline} className="flex items-baseline gap-3">
                <span className="t-label w-20 shrink-0 text-ink-2 capitalize">
                  {split.discipline}
                </span>
                <span className="t-num t-num-sm w-16 shrink-0 text-ink-1">
                  {formatTime(split.projectedSeconds)}
                </span>
                <span
                  className={cn(
                    't-num t-num-sm w-14 shrink-0',
                    over ? toneClasses('caution').text : toneClasses('good').text
                  )}
                >
                  {over ? '+' : '−'}
                  {formatTime(Math.abs(split.deltaSeconds))}
                </span>
                <span className="hidden t-label min-w-0 flex-1 truncate text-ink-3 sm:block">
                  {split.basis}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      {lead ? (
        <div className="mt-4 rounded-control bg-surface-2 px-3.5 py-3">
          <div className="flex items-center gap-2">
            <p className="t-micro text-ink-3">Best return on time</p>
            <span className="t-subtitle capitalize">{lead.discipline}</span>
            <Chip
              tone={
                lead.kneeRisk === 'none' || lead.kneeRisk === 'low'
                  ? 'good'
                  : lead.kneeRisk === 'moderate'
                    ? 'caution'
                    : 'alert'
              }
              className="ml-auto"
            >
              {lead.kneeRisk} knee risk
            </Chip>
          </div>
          <p className="mt-1.5 t-body text-ink-2">{lead.note}</p>
          {lead.secondsAvailable > 0 ? (
            <div className="mt-2.5">
              <Track
                pct={Math.min(100, (lead.secondsAvailable / Math.max(1, delta)) * 100)}
                tone="good"
              />
              <p className="mt-1.5 t-label text-ink-3">
                {formatTime(lead.secondsAvailable)} available here
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  )
}

function acwrNote(acwr: number | null | undefined): string {
  if (acwr == null) return 'Needs more history.'
  if (acwr > 1.5) return 'Cut volume this week.'
  if (acwr > 1.3) return 'Hold volume flat.'
  if (acwr < 0.8) return 'Load is falling off.'
  return 'In the safe range.'
}

function formatTime(seconds: number): string {
  const abs = Math.abs(Math.round(seconds))
  const hours = Math.floor(abs / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const secs = abs % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}
