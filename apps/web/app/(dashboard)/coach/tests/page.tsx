'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface TestRow {
  id: string
  testDate: string
  testType: string
  result: Record<string, unknown>
  passed: boolean | null
  notes: string | null
}

interface OnboardStatus {
  intakeComplete: boolean
  missingTests: string[]
  tests: TestRow[]
  profile: {
    cssPacePer100yd: number | null
    vdot: number | null
    ftpWatts: number | null
  } | null
}

export default function CoachTestsPage() {
  const [status, setStatus] = useState<OnboardStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const response = await fetch('/api/coach/onboard', { credentials: 'include' })
    const payload = await response.json()
    if (payload.success) setStatus(payload.data as OnboardStatus)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || !status) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Onboarding</p>
        <h1 className="text-lg font-semibold">Baseline tests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Week 3 of Block 0 is the official test week. Logging them earlier is fine if the knee
          agrees. Until they exist, swim load and the race projection use conservative estimates.
        </p>
      </header>

      {!status.intakeComplete ? (
        <Card>
          <CardContent className="pt-6 text-sm">
            Finish the{' '}
            <Link href="/coach/onboard" className="underline">
              intake interview
            </Link>{' '}
            first so these numbers have context.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Threshold label="CSS" value={formatCss(status.profile?.cssPacePer100yd)} />
        <Threshold label="VDOT" value={status.profile?.vdot?.toFixed(1) ?? '—'} />
        <Threshold label="FTP" value={status.profile?.ftpWatts ? `${status.profile.ftpWatts} W` : '—'} />
      </div>

      <CssForm onSaved={() => void load()} />
      <QuadForm onSaved={() => void load()} />
      <BikeForm onSaved={() => void load()} />

      {status.tests.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recorded</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {status.tests.map((test) => (
              <div key={test.id} className="flex items-start justify-between gap-3 text-xs">
                <div>
                  <p className="font-medium">{labelFor(test.testType)}</p>
                  <p className="text-muted-foreground">
                    {test.testDate} · {summarize(test)}
                  </p>
                </div>
                {test.passed ? (
                  <CheckCircle2 className="size-4 shrink-0 text-accent-sage" />
                ) : (
                  <span className="text-muted-foreground">logged</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/coach" className="underline">
          Back to today
        </Link>
      </p>
    </div>
  )
}

function CssForm({ onSaved }: { onSaved: () => void }) {
  const [time400, setTime400] = useState('')
  const [time200, setTime200] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit() {
    const t400 = parseClock(time400)
    const t200 = parseClock(time200)
    if (t400 == null || t200 == null) {
      setMessage('Use mm:ss or seconds for both efforts.')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const payload = await postBenchmark({
        testType: 'css',
        css: { time400Seconds: t400, time200Seconds: t200, unit: 'yards' },
      })
      setMessage(payload.summary ?? 'Saved')
      setTime400('')
      setTime200('')
      onSaved()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Critical swim speed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          400 yd all-out, rest a few minutes, 200 yd all-out. Same effort, not a warmup. Open
          turns are fine.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="400 yd">
            <Input value={time400} onChange={(event) => setTime400(event.target.value)} placeholder="8:20" />
          </Field>
          <Field label="200 yd">
            <Input value={time200} onChange={(event) => setTime200(event.target.value)} placeholder="3:50" />
          </Field>
        </div>
        <SaveRow saving={saving} message={message} onClick={() => void submit()} />
      </CardContent>
    </Card>
  )
}

function QuadForm({ onSaved }: { onSaved: () => void }) {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [painFree, setPainFree] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit() {
    const l = Number(left)
    const r = Number(right)
    if (!Number.isFinite(l) || !Number.isFinite(r) || l <= 0 || r <= 0) {
      setMessage('Enter a positive number for each side.')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const payload = await postBenchmark({
        testType: 'quad_symmetry',
        quad: { left: l, right: r, painFree, test: 'step_down' },
      })
      setMessage(payload.summary ?? 'Saved')
      onSaved()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Quad symmetry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Pain-free single-leg step-downs, or a strength number from the PT (reps or load).
          Intensity running stays locked until the sides are within 10% and pain-free.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Left">
            <Input value={left} onChange={(event) => setLeft(event.target.value)} placeholder="12" />
          </Field>
          <Field label="Right">
            <Input value={right} onChange={(event) => setRight(event.target.value)} placeholder="10" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={painFree}
            onChange={(event) => setPainFree(event.target.checked)}
          />
          Completely pain-free
        </label>
        <SaveRow saving={saving} message={message} onClick={() => void submit()} />
      </CardContent>
    </Card>
  )
}

function BikeForm({ onSaved }: { onSaved: () => void }) {
  const [minutes, setMinutes] = useState('40')
  const [hr, setHr] = useState('')
  const [cadence, setCadence] = useState('92')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit() {
    const duration = Number(minutes) * 60
    const avgHr = Number(hr)
    const rpm = Number(cadence)
    if (!duration || !avgHr || !rpm) {
      setMessage('Duration, heart rate and cadence are required.')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const payload = await postBenchmark({
        testType: 'bike_z2',
        bike: { durationSeconds: duration, avgHr, cadence: rpm },
      })
      setMessage(payload.summary ?? 'Saved')
      onSaved()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Bike Z2 benchmark</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Steady indoor spin, 90+ rpm, conversational. This is a baseline, not an FTP test.
          Cadence below 85 fails the rehab rule even if the heart rate looks fine.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Minutes">
            <Input value={minutes} onChange={(event) => setMinutes(event.target.value)} />
          </Field>
          <Field label="Avg HR">
            <Input value={hr} onChange={(event) => setHr(event.target.value)} placeholder="138" />
          </Field>
          <Field label="Cadence">
            <Input value={cadence} onChange={(event) => setCadence(event.target.value)} />
          </Field>
        </div>
        <SaveRow saving={saving} message={message} onClick={() => void submit()} />
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function SaveRow({
  saving,
  message,
  onClick,
}: {
  saving: boolean
  message: string | null
  onClick: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className={cn('text-xs', message?.startsWith('Failed') ? 'text-destructive' : 'text-muted-foreground')}>
        {message}
      </p>
      <Button size="sm" onClick={onClick} disabled={saving}>
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
      </Button>
    </div>
  )
}

function Threshold({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm font-semibold tabular-nums">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

async function postBenchmark(body: Record<string, unknown>): Promise<{ summary?: string }> {
  const response = await fetch('/api/coach/benchmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const payload = await response.json()
  if (!payload.success) throw new Error(payload.error ?? 'Failed')
  return payload.data
}

function parseClock(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  const match = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function formatCss(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

function labelFor(type: string): string {
  if (type === 'css') return 'CSS'
  if (type === 'quad_symmetry' || type === 'step_down') return 'Quad symmetry'
  if (type === 'bike_z2') return 'Bike Z2'
  if (type === 'run_tt') return 'Run time trial'
  return type
}

function summarize(test: TestRow): string {
  const result = test.result
  if (test.testType === 'css' && typeof result.pacePer100yd === 'number') {
    return `${formatCss(result.pacePer100yd)} /100 yd`
  }
  if (typeof result.ratio === 'number') {
    return `${(result.ratio * 100).toFixed(0)}% symmetry`
  }
  if (typeof result.avgHr === 'number') {
    return `${result.avgHr} bpm @ ${result.cadence ?? '—'} rpm`
  }
  if (typeof result.vdot === 'number') return `VDOT ${result.vdot}`
  return test.notes ?? ''
}
