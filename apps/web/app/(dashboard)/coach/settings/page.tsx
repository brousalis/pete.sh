'use client'

import { AlertTriangle, Bell, DollarSign, Loader2, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SpendSummaryView } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

export default function CoachSettingsPage() {
  const [spend, setSpend] = useState<SpendSummaryView | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dailyCap, setDailyCap] = useState('')
  const [monthlyCap, setMonthlyCap] = useState('')
  const [pushState, setPushState] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>(
    'unknown'
  )

  useEffect(() => {
    void loadSpend()

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushState(Notification.permission === 'granted' ? 'granted' : 'unknown')
    } else {
      setPushState('unsupported')
    }
  }, [])

  async function loadSpend() {
    try {
      const response = await fetch('/api/coach/spend', { credentials: 'include' })
      const payload = await response.json()
      if (payload.success) {
        const data = payload.data as SpendSummaryView
        setSpend(data)
        setDailyCap(String(data.day.cap))
        setMonthlyCap(String(data.month.cap))
      }
    } finally {
      setLoading(false)
    }
  }

  async function saveCaps() {
    setSaving(true)
    try {
      const response = await fetch('/api/coach/spend', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dailyCapUsd: Number(dailyCap),
          monthlyCapUsd: Number(monthlyCap),
        }),
      })
      const payload = await response.json()
      if (payload.success) setSpend(payload.data as SpendSummaryView)
    } finally {
      setSaving(false)
    }
  }

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setPushState('denied')
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/coach-sw.js')
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!publicKey) {
        setPushState('unsupported')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      })

      await fetch('/api/coach/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(subscription.toJSON()),
      })

      setPushState('granted')
    } catch {
      setPushState('denied')
    }
  }

  async function signOut() {
    await fetch('/api/coach/auth', { method: 'DELETE', credentials: 'include' })
    window.location.href = '/coach/login'
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-lg font-semibold">Settings</h1>

      {spend ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="size-4" />
              Claude spend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {spend.state !== 'normal' ? (
              <div
                className={cn(
                  'flex gap-2 rounded-md p-2.5 text-xs',
                  spend.state === 'capped'
                    ? 'bg-accent-rose/10 text-accent-rose'
                    : 'bg-accent-gold/10 text-accent-gold'
                )}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  {spend.state === 'capped'
                    ? 'Budget exhausted. Briefings continue from computed analytics; chat is paused until the budget resets or the cap is raised.'
                    : 'Above the degrade threshold. Smaller models and tighter context are in use.'}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <SpendBar label="Today" spent={spend.day.spent} cap={spend.day.cap} pct={spend.day.pct} />
              <SpendBar
                label="This month"
                spent={spend.month.spent}
                cap={spend.month.cap}
                pct={spend.month.pct}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Projected month end: ${spend.projectedMonthEnd.toFixed(2)}
            </p>

            {spend.byJob.length > 0 ? (
              <div className="border-t border-border pt-3">
                <p className="mb-1.5 text-xs font-medium">By job, this month</p>
                <div className="space-y-1">
                  {spend.byJob.map((job) => (
                    <div key={job.job} className="flex items-baseline gap-2 text-xs">
                      <span className="w-28 shrink-0 text-muted-foreground">{job.job}</span>
                      <span className="w-14 shrink-0 tabular-nums">${job.costUsd.toFixed(2)}</span>
                      <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                        {job.runs} run{job.runs === 1 ? '' : 's'}
                      </span>
                      {job.avgCacheHitRatio != null ? (
                        <span
                          className={cn(
                            'tabular-nums',
                            job.avgCacheHitRatio < 0.7
                              ? 'text-accent-gold'
                              : 'text-muted-foreground'
                          )}
                          title="Share of prompt tokens served from cache. Below 70% means the stable prefix is being invalidated."
                        >
                          {Math.round(job.avgCacheHitRatio * 100)}% cached
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <Label className="text-xs">Daily cap (USD)</Label>
                <Input
                  type="number"
                  value={dailyCap}
                  onChange={(event) => setDailyCap(event.target.value)}
                  className="mt-1"
                  min={1}
                  step={1}
                />
              </div>
              <div>
                <Label className="text-xs">Monthly cap (USD)</Label>
                <Input
                  type="number"
                  value={monthlyCap}
                  onChange={(event) => setMonthlyCap(event.target.value)}
                  className="mt-1"
                  min={10}
                  step={10}
                />
              </div>
            </div>
            <Button size="sm" onClick={saveCaps} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
              Save caps
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Injury review and same-day downgrades are exempt from caps. A budget limit never
              silences a safety warning.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="size-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Morning briefings, post-session debriefs and same-day plan changes.
          </p>
          {pushState === 'granted' ? (
            <p className="text-sm text-accent-sage">Enabled on this device.</p>
          ) : pushState === 'unsupported' ? (
            <p className="text-sm text-muted-foreground">
              Not supported in this browser. On iOS, add the app to your home screen first.
            </p>
          ) : (
            <Button size="sm" variant="outline" onClick={enablePush}>
              Enable on this device
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link href="/coach/onboard" className="block underline">
            Intake interview
          </Link>
          <Link href="/coach/tests" className="block underline">
            Baseline tests
          </Link>
          <p className="text-xs text-muted-foreground">
            Cost caps above default to $8/day and $120/month. Injury red-flags stay exempt.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1.5 size-3.5" />
            Sign out of PeteCoach
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function SpendBar({
  label,
  spent,
  cap,
  pct,
}: {
  label: string
  spent: number
  cap: number
  pct: number
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          ${spent.toFixed(2)} / ${cap.toFixed(2)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 100 ? 'bg-accent-rose' : pct >= 80 ? 'bg-accent-gold' : 'bg-accent-sage'
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}
