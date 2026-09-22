'use client'

import { AlertTriangle, Check, ClipboardCheck, Loader2, Pill, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

import { CheckInSheet } from '@/components/coach/check-in-sheet'
import { Metric, MetricRow } from '@/components/coach/ui/metric'
import { Chip, EmptyNote, Panel, Section } from '@/components/coach/ui/panel'
import { painTone, toneClasses } from '@/components/coach/ui/tone'
import { Button } from '@/components/ui/button'
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
  medication: { nsaidDaysInWindow: number; reviewSuggested: boolean }
  body: {
    date: string
    weightLbs: number | null
    bodyFatPct: number | null
    hrvSdnn: number | null
  }[]
}

const SITE_LABELS = new Map<string, string>(SYMPTOM_SITES.map((site) => [site.value, site.label]))

export function RailKnee() {
  const [data, setData] = useState<InjuryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkInOpen, setCheckInOpen] = useState(false)

  async function load() {
    try {
      const response = await fetch('/api/coach/injury?days=14', { credentials: 'include' })
      const payload = await response.json()
      if (payload.success) setData(payload.data as InjuryResponse)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-4 animate-spin text-ink-3" />
      </div>
    )
  }

  if (!data) return null

  const latestBody = [...data.body].reverse().find((entry) => entry.weightLbs != null)
  const primary = data.injuries[0]
  const worstPain = data.siteTrends.reduce<number | null>(
    (max, trend) => (trend.latest == null ? max : Math.max(max ?? 0, trend.latest)),
    null
  )

  return (
    <div className="space-y-6">
      <Section
        title="Knee"
        action={
          <Button size="sm" variant="outline" onClick={() => setCheckInOpen(true)}>
            <ClipboardCheck className="mr-1.5 size-4" />
            Log symptom
          </Button>
        }
      >
        <Panel className="px-5 py-5">
          <MetricRow>
            <Metric
              label="Pain-free days"
              value={data.painFreeDays}
              size="lg"
              tone={
                data.painFreeDays >= 7 ? 'good' : data.painFreeDays >= 3 ? 'neutral' : 'caution'
              }
            />
            <Metric
              label="Today's peak"
              value={worstPain == null ? '—' : `${worstPain}`}
              unit={worstPain == null ? undefined : '/10'}
              size="lg"
              tone={painTone(worstPain)}
            />
            <Metric
              label="NSAID days"
              value={data.medication.nsaidDaysInWindow}
              size="lg"
              tone={data.medication.reviewSuggested ? 'caution' : 'neutral'}
              hint="14d window"
            />
          </MetricRow>
        </Panel>

        {data.medication.reviewSuggested ? (
          <Panel tone="caution" className="mt-2.5 flex gap-3">
            <Pill className="mt-0.5 size-4 shrink-0 text-tone-caution" />
            <p className="t-body text-ink-2">
              NSAIDs on {data.medication.nsaidDaysInWindow} days in this window — worth raising
              with the sports MD.
            </p>
          </Panel>
        ) : null}
      </Section>

      {primary ? (
        <Section title="Diagnosis">
          <Panel>
            <div className="flex flex-wrap items-center gap-2">
              <p className="t-title">{primary.name}</p>
              <Chip tone={primary.status === 'active' ? 'alert' : 'neutral'}>{primary.status}</Chip>
              {primary.severity ? (
                <span className="t-label text-ink-3">{primary.severity}</span>
              ) : null}
            </div>

            {primary.contraindications.length > 0 ? (
              <div className="mt-3.5">
                <p className="t-micro mb-2 text-ink-3">Do not</p>
                <ul className="space-y-1.5">
                  {primary.contraindications.slice(0, 5).map((item) => (
                    <li key={item} className="flex gap-2 t-label text-ink-2">
                      <X className="mt-0.5 size-3.5 shrink-0 text-tone-alert" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {primary.clearances?.conditions?.length ? (
              <div className="mt-3.5 border-t border-line pt-3.5">
                <p className="t-micro mb-2 text-ink-3">Cleared for</p>
                <ul className="space-y-1.5">
                  {primary.clearances.conditions.slice(0, 4).map((condition) => (
                    <li key={condition} className="flex gap-2 t-label text-ink-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-tone-good" />
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>
        </Section>
      ) : (
        <EmptyNote>No active injury record.</EmptyNote>
      )}

      <Section title="Pain by site · 14 days">
        <Panel>
          {data.siteTrends.length === 0 ? (
            <EmptyNote>No symptoms logged.</EmptyNote>
          ) : (
            <div className="divide-y divide-line">
              {data.siteTrends.map((trend) => {
                const tone = painTone(trend.latest)
                return (
                  <div key={trend.site} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-32 shrink-0">
                      <p className="t-label truncate text-ink-1">
                        {SITE_LABELS.get(trend.site) ?? trend.site}
                      </p>
                      <p
                        className={cn(
                          't-label',
                          trend.trend === 'worsening'
                            ? toneClasses('alert').text
                            : trend.trend === 'improving'
                              ? toneClasses('good').text
                              : 'text-ink-3'
                        )}
                      >
                        {trend.trend}
                      </p>
                    </div>

                    <div className="h-9 min-w-0 flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trend.series} margin={{ top: 4, bottom: 4 }}>
                          <YAxis domain={[0, 10]} hide />
                          <Tooltip
                            contentStyle={{
                              background: 'var(--surface-2)',
                              border: '1px solid var(--line-strong)',
                              borderRadius: 'var(--r-control)',
                              fontSize: 12,
                            }}
                            labelStyle={{ color: 'var(--ink-3)', fontSize: 11 }}
                            formatter={(value) => [`${value}/10`, 'pain']}
                          />
                          <Line
                            type="monotone"
                            dataKey="pain"
                            dot={false}
                            strokeWidth={1.75}
                            stroke={
                              trend.max >= 4 ? 'var(--tone-alert)' : 'var(--tone-good)'
                            }
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <span className={cn('t-num t-num-md w-10 shrink-0 text-right', toneClasses(tone).text)}>
                      {trend.latest ?? '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </Section>

      <Section title="Gates">
        <Panel>
          <div className="flex items-start gap-3">
            {data.quadSymmetry.latest ? (
              data.quadSymmetry.passed ? (
                <Check className="mt-0.5 size-4 shrink-0 text-tone-good" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tone-caution" />
              )
            ) : (
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ink-3" />
            )}
            <div className="min-w-0">
              <p className="t-subtitle">Quad symmetry</p>
              <p className="mt-0.5 t-body text-ink-2">
                {!data.quadSymmetry.latest
                  ? 'Not tested yet — running intensity stays locked until it is.'
                  : data.quadSymmetry.passed
                    ? 'Passed. Running intensity is unlocked.'
                    : 'Not passed. Running stays aerobic.'}
              </p>
              {data.quadSymmetry.latest ? (
                <p className="mt-1 t-label text-ink-3">
                  Last tested {data.quadSymmetry.latest.testDate}
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      </Section>

      {latestBody ? (
        <Section title="Body">
          <Panel className="px-5 py-4">
            <MetricRow>
              <Metric label="Weight" value={latestBody.weightLbs} unit="lb" decimals={1} />
              <Metric label="Body fat" value={latestBody.bodyFatPct} unit="%" decimals={1} />
              <Metric label="HRV" value={latestBody.hrvSdnn} unit="ms" />
            </MetricRow>
          </Panel>
        </Section>
      ) : null}

      <CheckInSheet
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        onSubmitted={() => {
          setLoading(true)
          void load()
        }}
      />
    </div>
  )
}
