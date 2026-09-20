'use client'

import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const STEPS = ['Confirm', 'Knee', 'Schedule', 'Fueling'] as const

interface IntakeForm {
  kneeStatus: 'cleared_full' | 'cleared_graded' | 'still_limited' | 'flare'
  kneeNotes: string
  weekdayWindow: string
  weekendWindow: string
  poolAccess: 'regular' | 'limited' | 'none'
  iceFallback: 'treadmill' | 'indoor_track' | 'cancel' | 'other'
  iceFallbackNote: string
  twoADays: 'yes' | 'low_impact_only' | 'no'
  nutritionStance: 'maintenance' | 'discuss' | 'keep_deficit'
  nsaidUse: 'as_needed' | 'daily' | 'none'
}

const DEFAULTS: IntakeForm = {
  kneeStatus: 'cleared_graded',
  kneeNotes: '',
  weekdayWindow: 'Before work or evening, Chicago time',
  weekendWindow: 'Longer sessions Saturday morning',
  poolAccess: 'regular',
  iceFallback: 'cancel',
  iceFallbackNote: '',
  twoADays: 'low_impact_only',
  nutritionStance: 'maintenance',
  nsaidUse: 'as_needed',
}

export default function CoachOnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<IntakeForm>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [profileName, setProfileName] = useState('Pete')
  const [race, setRace] = useState('Supertri Chicago — Olympic · Aug 22, 2027')

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/coach/onboard', { credentials: 'include' })
        const payload = await response.json()
        if (payload.success) {
          setAlreadyDone(Boolean(payload.data.intakeComplete))
          if (payload.data.profile?.name) setProfileName(payload.data.profile.name)
          if (payload.data.profile?.goalRaceName && payload.data.profile?.goalRaceDate) {
            setRace(`${payload.data.profile.goalRaceName} · ${payload.data.profile.goalRaceDate}`)
          }
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function patch<K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/coach/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!payload.success) {
        setError(payload.error ?? 'Unable to save intake')
        return
      }
      router.replace('/coach/tests')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
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
        <h1 className="text-lg font-semibold">Intake interview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Four short steps. The planner reads these as hard constraints, not suggestions.
        </p>
      </header>

      {alreadyDone ? (
        <Card>
          <CardContent className="flex items-start gap-3 pt-6 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-sage" />
            <div>
              <p>Intake is already on file. You can update the answers below and save again.</p>
              <Link href="/coach/tests" className="mt-2 inline-block text-xs underline">
                Skip to baseline tests
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-1">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={cn(
              'flex-1 rounded-md px-2 py-1.5 text-[11px]',
              index === step ? 'bg-muted font-medium' : 'text-muted-foreground'
            )}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 ? (
            <div className="space-y-3 text-sm">
              <p>
                This coach is for <span className="font-medium">{profileName}</span>, targeting{' '}
                <span className="font-medium">{race}</span>, sub-3:00.
              </p>
              <p className="text-muted-foreground">
                Ordering is fixed: knee health, then consistency, then the time. Nothing in the
                next year will override that, including a Sunday planning job.
              </p>
              <p className="text-muted-foreground">
                Block 0 (return-to-run and rehab) is already on the calendar. After this interview,
                log the three baseline tests so the race projection stops using placeholders.
              </p>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-3">
              <Field label="Current knee status">
                <Select
                  value={form.kneeStatus}
                  onChange={(value) => patch('kneeStatus', value as IntakeForm['kneeStatus'])}
                  options={[
                    { value: 'cleared_full', label: 'PT cleared me for full training' },
                    { value: 'cleared_graded', label: 'Cleared for a graded return (current)' },
                    { value: 'still_limited', label: 'Still limited — keep impact very low' },
                    { value: 'flare', label: 'In a flare right now' },
                  ]}
                />
              </Field>
              <Field label="Anything the PT or MD said this week">
                <Input
                  value={form.kneeNotes}
                  onChange={(event) => patch('kneeNotes', event.target.value)}
                  placeholder="Optional. Goes into coach memory."
                />
              </Field>
              <Field label="NSAID use">
                <Select
                  value={form.nsaidUse}
                  onChange={(value) => patch('nsaidUse', value as IntakeForm['nsaidUse'])}
                  options={[
                    { value: 'as_needed', label: 'As needed (MD advised consistency while training)' },
                    { value: 'daily', label: 'Daily while training' },
                    { value: 'none', label: 'None' },
                  ]}
                />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <Field label="Weekday training window">
                <Input
                  value={form.weekdayWindow}
                  onChange={(event) => patch('weekdayWindow', event.target.value)}
                />
              </Field>
              <Field label="Weekend training window">
                <Input
                  value={form.weekendWindow}
                  onChange={(event) => patch('weekendWindow', event.target.value)}
                />
              </Field>
              <Field label="25 yd pool access">
                <Select
                  value={form.poolAccess}
                  onChange={(value) => patch('poolAccess', value as IntakeForm['poolAccess'])}
                  options={[
                    { value: 'regular', label: 'Regular — several times a week' },
                    { value: 'limited', label: 'Limited — a couple of sessions a week' },
                    { value: 'none', label: 'No reliable pool right now' },
                  ]}
                />
              </Field>
              <Field label="Icy Lakefront run fallback">
                <Select
                  value={form.iceFallback}
                  onChange={(value) => patch('iceFallback', value as IntakeForm['iceFallback'])}
                  options={[
                    { value: 'treadmill', label: 'Treadmill' },
                    { value: 'indoor_track', label: 'Indoor track' },
                    { value: 'cancel', label: 'Cancel the run that day' },
                    { value: 'other', label: 'Other (note below)' },
                  ]}
                />
              </Field>
              {form.iceFallback === 'other' ? (
                <Field label="Fallback note">
                  <Input
                    value={form.iceFallbackNote}
                    onChange={(event) => patch('iceFallbackNote', event.target.value)}
                  />
                </Field>
              ) : null}
              <Field label="Two-a-days">
                <Select
                  value={form.twoADays}
                  onChange={(value) => patch('twoADays', value as IntakeForm['twoADays'])}
                  options={[
                    { value: 'yes', label: 'Fine whenever the plan asks' },
                    { value: 'low_impact_only', label: 'Only if one session is swim/bike/PT' },
                    { value: 'no', label: 'One session a day' },
                  ]}
                />
              </Field>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You are already inside the 170–175 lb band at ~10–11% body fat. A 300–400 kcal
                deficit plus fasting to 2 PM fights tendon and cartilage healing. The coach
                default is maintenance fueling, with carbs around key sessions.
              </p>
              <Field label="Fueling stance">
                <Select
                  value={form.nutritionStance}
                  onChange={(value) =>
                    patch('nutritionStance', value as IntakeForm['nutritionStance'])
                  }
                  options={[
                    { value: 'maintenance', label: 'Accept maintenance. Keep the aesthetic band.' },
                    { value: 'discuss', label: 'I want to talk this through in chat first.' },
                    { value: 'keep_deficit', label: 'Keep the cut. Challenge me if it is a problem.' },
                  ]}
                />
              </Field>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={step === 0}
              onClick={() => setStep((value) => value - 1)}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" size="sm" onClick={() => setStep((value) => value + 1)}>
                Next
                <ChevronRight className="ml-1 size-3.5" />
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => void submit()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
                Save and go to tests
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
