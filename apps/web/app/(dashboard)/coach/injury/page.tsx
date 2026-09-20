'use client'

import { Activity, AlertTriangle, CheckCircle2, Loader2, Pill } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SYMPTOM_SITES } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

interface InjuryResponse {
  injuries: {
    name: string
    status: string
    severity: string | null
    sites: string[]
    contraindications: string[]
    diagnosis: { findings?: string[] }
    clearances: { conditions?: string[] }
  }[]
  siteTrends: {
    site: string
    series: { date: string; pain: number }[]
    latest: number | null
    max: number
    trend: 'improving' | 'stable' | 'worsening' | 'unknown'
  }[]
  painFreeDays: number
  quadSymmetry: {
    passed: boolean
    latest: { testDate: string; result: Record<string, unknown>; notes: string | null } | null
  }
  clinicalEvents: {
    event_date: string
    event_type: string
    provider: string | null
    summary: string
  }[]
  medication: { nsaidDaysInWindow: number; reviewSuggested: boolean }
  body: {
    date: string
    weightLbs: number | null
    bodyFatPct: number | null
    hrvSdnn: number | null
    restingHr: number | null
    sleepHours: number | null
  }[]
}

const SITE_LABELS = new Map<string, string>(
  SYMPTOM_SITES.map((site) => [site.value, site.label])
)

export default function CoachInjuryPage() {
  const [data, setData] = useState<InjuryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/coach/injury?days=90', { credentials: 'include' })
        const payload = await response.json()
        if (payload.success) setData(payload.data as InjuryResponse)
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

  if (!data) return null

  const latestBody = [...data.body].reverse().find((entry) => entry.weightLbs != null)

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-lg font-semibold">Body</h1>

      {data.injuries.map((injury) => (
        <Card key={injury.name}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{injury.name}</CardTitle>
              <Badge variant={injury.status === 'active' ? 'destructive' : 'secondary'}>
                {injury.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {injury.diagnosis?.findings?.length ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Imaging findings</p>
                <ul className="mt-1 space-y-0.5">
                  {injury.diagnosis.findings.map((finding) => (
                    <li key={finding} className="text-xs">
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {injury.contraindications.length ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Contraindicated</p>
                <ul className="mt-1 space-y-0.5">
                  {injury.contraindications.map((item) => (
                    <li key={item} className="flex gap-1.5 text-xs">
                      <span className="text-accent-rose">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {injury.clearances?.conditions?.length ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Cleared to train, conditional on
                </p>
                <ul className="mt-1 space-y-0.5">
                  {injury.clearances.conditions.map((condition) => (
                    <li key={condition} className="flex gap-1.5 text-xs">
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-accent-sage" />
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4" />
            Symptom trend, 90 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            {data.painFreeDays} pain-free days recorded in the window.
          </p>

          {data.siteTrends.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No symptoms logged. That is the goal.
            </p>
          ) : (
            <div className="space-y-3">
              {data.siteTrends.map((trend) => (
                <div key={trend.site} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <p className="truncate text-xs font-medium">
                      {SITE_LABELS.get(trend.site) ?? trend.site}
                    </p>
                    <p
                      className={cn(
                        'text-[10px]',
                        trend.trend === 'worsening'
                          ? 'text-accent-rose'
                          : trend.trend === 'improving'
                            ? 'text-accent-sage'
                            : 'text-muted-foreground'
                      )}
                    >
                      {trend.trend}
                      {trend.latest != null ? ` · now ${trend.latest}/10` : ''}
                    </p>
                  </div>

                  <div className="h-10 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend.series}>
                        <YAxis domain={[0, 10]} hide />
                        <Tooltip
                          contentStyle={{ fontSize: 11 }}
                          formatter={(value) => [`${value}/10`, 'pain']}
                        />
                        <Line
                          type="monotone"
                          dataKey="pain"
                          dot={false}
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className={
                            trend.max >= 4 ? 'stroke-accent-rose' : 'stroke-accent-sage'
                          }
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quad symmetry gate</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {data.quadSymmetry.latest ? (
            <div className="flex items-start gap-2">
              {data.quadSymmetry.passed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-sage" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-gold" />
              )}
              <div>
                <p>
                  {data.quadSymmetry.passed
                    ? 'Passed. Running intensity is unlocked.'
                    : 'Not yet passed. Running stays aerobic until single-leg strength is within 10% side to side.'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Last tested {data.quadSymmetry.latest.testDate}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Not tested yet. This gates running intensity, so it is worth doing early.
            </p>
          )}
        </CardContent>
      </Card>

      {data.medication.reviewSuggested ? (
        <Card className="border-accent-gold/40">
          <CardContent className="flex gap-2 pt-5 text-sm">
            <Pill className="mt-0.5 size-4 shrink-0 text-accent-gold" />
            <p>
              Anti-inflammatories logged on {data.medication.nsaidDaysInWindow} days in this window.
              Worth raising with your sports MD: sustained use during endurance training carries
              considerations that belong with a clinician.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {latestBody ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Composition</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums">
                {latestBody.weightLbs?.toFixed(1) ?? '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">lb</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">
                {latestBody.bodyFatPct?.toFixed(1) ?? '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">% fat</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">
                {latestBody.hrvSdnn?.toFixed(0) ?? '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">HRV ms</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data.clinicalEvents.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Clinical history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.clinicalEvents.map((event, index) => (
              <div key={index} className="border-l-2 border-border pl-3 text-xs">
                <p className="font-medium">
                  {event.event_date} · {event.event_type}
                  {event.provider ? ` · ${event.provider}` : ''}
                </p>
                <p className="mt-0.5 text-muted-foreground">{event.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
