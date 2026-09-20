'use client'

import { Loader2, Target, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  limiters: string[]
  leverage: {
    discipline: string
    secondsAvailable: number
    kneeRisk: 'none' | 'low' | 'moderate' | 'high'
    note: string
  }[]
}

export default function CoachAnalyticsPage() {
  const [load, setLoad] = useState<LoadSummary | null>(null)
  const [projection, setProjection] = useState<ProjectionView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [loadResponse, projectionResponse] = await Promise.all([
          fetch('/api/coach/load?days=180', { credentials: 'include' }).then((r) => r.json()),
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const chartData =
    load?.pmc.slice(-120).map((point) => ({
      date: point.date.slice(5),
      fitness: point.ctl,
      fatigue: point.atl,
      form: point.tsb,
    })) ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Analytics</h1>
        <Link href="/coach/tests" className="text-xs text-muted-foreground underline">
          Baseline tests
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="size-4" />
            Fitness, fatigue and form
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No training load recorded yet.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  {/* Below -30 is the range where injury risk climbs. */}
                  <ReferenceLine y={0} className="stroke-border" />
                  <Tooltip
                    contentStyle={{ fontSize: 11 }}
                    labelStyle={{ fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fitness"
                    dot={false}
                    strokeWidth={2}
                    className="stroke-accent-azure"
                    stroke="currentColor"
                  />
                  <Line
                    type="monotone"
                    dataKey="fatigue"
                    dot={false}
                    strokeWidth={1.5}
                    className="stroke-accent-ember"
                    stroke="currentColor"
                  />
                  <Line
                    type="monotone"
                    dataKey="form"
                    dot={false}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    className="stroke-muted-foreground"
                    stroke="currentColor"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {load ? (
            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
              <Stat label="Fitness" value={load.current?.ctl ?? null} />
              <Stat label="Fatigue" value={load.current?.atl ?? null} />
              <Stat label="Form" value={load.current?.tsb ?? null} signed />
              <Stat label="Weekly TSS" value={load.weeklyTss} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {load ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Load safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <SafetyRow
              label="Acute:chronic ratio"
              value={load.acwr?.toFixed(2) ?? '—'}
              status={
                load.acwr == null
                  ? 'neutral'
                  : load.acwr > 1.5
                    ? 'bad'
                    : load.acwr > 1.3
                      ? 'warn'
                      : load.acwr < 0.8
                        ? 'warn'
                        : 'good'
              }
              note={
                load.acwr == null
                  ? 'Needs three weeks of history.'
                  : load.acwr > 1.5
                    ? 'Past the injury-risk threshold. Cut this week.'
                    : load.acwr > 1.3
                      ? 'Above the working ceiling. Hold volume flat.'
                      : load.acwr < 0.8
                        ? 'Load is falling; fitness is being lost.'
                        : 'In range.'
              }
            />
            <SafetyRow
              label="Monotony"
              value={load.monotony?.toFixed(1) ?? '—'}
              status={load.monotony == null ? 'neutral' : load.monotony > 2 ? 'warn' : 'good'}
              note={
                load.monotony != null && load.monotony > 2
                  ? 'Days are too similar. Make easy days easier.'
                  : 'Good contrast between hard and easy days.'
              }
            />
            <div className="pt-1">
              <p className="mb-1 text-xs text-muted-foreground">Weekly load by sport</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(load.weeklyTssBySport)
                  .filter(([, value]) => value && value > 0)
                  .map(([sport, value]) => (
                    <span key={sport} className="rounded bg-muted px-2 py-0.5 text-xs">
                      {sport} <span className="tabular-nums">{Math.round(value as number)}</span>
                    </span>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {projection ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="size-4" />
              Race projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold tabular-nums">
                {formatTime(projection.projectedSeconds)}
              </span>
              <span className="text-sm text-muted-foreground">
                goal {formatTime(projection.goalSeconds)}
              </span>
              <span
                className={cn(
                  'text-sm font-medium tabular-nums',
                  projection.projectedSeconds <= projection.goalSeconds
                    ? 'text-accent-sage'
                    : 'text-accent-rose'
                )}
              >
                {projection.projectedSeconds > projection.goalSeconds ? '+' : '−'}
                {formatTime(Math.abs(projection.projectedSeconds - projection.goalSeconds))}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Range {formatTime(projection.confidenceLow)} to{' '}
              {formatTime(projection.confidenceHigh)}
            </p>

            <div className="mt-4 space-y-1.5">
              {projection.splits.map((split) => (
                <div key={split.discipline} className="text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="w-10 shrink-0 font-medium uppercase">{split.discipline}</span>
                    <span className="w-14 shrink-0 tabular-nums">
                      {formatTime(split.projectedSeconds)}
                    </span>
                    <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
                      {formatTime(split.budgetSeconds)}
                    </span>
                    <span
                      className={cn(
                        'w-14 shrink-0 tabular-nums',
                        split.deltaSeconds > 0 ? 'text-accent-rose' : 'text-accent-sage'
                      )}
                    >
                      {split.deltaSeconds > 0 ? '+' : ''}
                      {formatTime(split.deltaSeconds)}
                    </span>
                  </div>
                  <p className="pl-12 text-[11px] text-muted-foreground">{split.basis}</p>
                </div>
              ))}
            </div>

            {projection.leverage.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium">
                  Where the time is, weighed against knee risk
                </p>
                <div className="space-y-1.5">
                  {projection.leverage.map((item) => (
                    <div key={item.discipline} className="flex items-start gap-2 text-xs">
                      <span
                        className={cn(
                          'mt-0.5 rounded px-1.5 py-0.5 text-[10px] uppercase',
                          item.kneeRisk === 'none'
                            ? 'bg-accent-sage/15 text-accent-sage'
                            : item.kneeRisk === 'moderate'
                              ? 'bg-accent-gold/15 text-accent-gold'
                              : item.kneeRisk === 'high'
                                ? 'bg-accent-rose/15 text-accent-rose'
                                : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {item.kneeRisk === 'none' ? 'no risk' : `${item.kneeRisk} risk`}
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium uppercase">{item.discipline}</span>
                        {item.secondsAvailable > 0 ? (
                          <span className="ml-1.5 tabular-nums text-muted-foreground">
                            up to {formatTime(item.secondsAvailable)}
                          </span>
                        ) : null}
                        <p className="text-muted-foreground">{item.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Stat({ label, value, signed }: { label: string; value: number | null; signed?: boolean }) {
  return (
    <div>
      <p className="text-sm font-bold tabular-nums">
        {value == null ? '—' : `${signed && value > 0 ? '+' : ''}${Math.round(value)}`}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}

function SafetyRow({
  label,
  value,
  status,
  note,
}: {
  label: string
  value: string
  status: 'good' | 'warn' | 'bad' | 'neutral'
  note: string
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span
        className={cn(
          'w-12 shrink-0 font-medium tabular-nums',
          status === 'good' && 'text-accent-sage',
          status === 'warn' && 'text-accent-gold',
          status === 'bad' && 'text-accent-rose'
        )}
      >
        {value}
      </span>
      <span className="min-w-0 flex-1 text-xs text-muted-foreground">{note}</span>
    </div>
  )
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
