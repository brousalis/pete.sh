'use client'

import { Bell, ChevronRight, History, Loader2, RefreshCw, Settings, Smartphone } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { GearSection } from '@/components/coach/desk/gear-section'
import { RailKnee } from '@/components/coach/desk/rail-knee'
import { Chip, Panel, Section, Track } from '@/components/coach/ui/panel'
import { type Tone } from '@/components/coach/ui/tone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNativeBridge } from '@/hooks/use-native-bridge'
import type { SpendSummaryView } from '@/lib/types/coach-ui.types'

export function RailMore() {
  const native = useNativeBridge()
  const [spend, setSpend] = useState<SpendSummaryView | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dailyCap, setDailyCap] = useState('')
  const [monthlyCap, setMonthlyCap] = useState('')
  const [pushState, setPushState] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>(
    'unknown'
  )

  useEffect(() => {
    void (async () => {
      try {
        const spendRes = await fetch('/api/coach/spend', { credentials: 'include' }).then((r) =>
          r.json()
        )
        if (spendRes.success) {
          const data = spendRes.data as SpendSummaryView
          setSpend(data)
          setDailyCap(String(data.day.cap))
          setMonthlyCap(String(data.month.cap))
        }
      } finally {
        setLoading(false)
      }
    })()

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushState(Notification.permission === 'granted' ? 'granted' : 'unknown')
    } else {
      setPushState('unsupported')
    }
  }, [])

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
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
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

  return (
    <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
      <h1 className="t-display">More</h1>

      <RailKnee />

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-4 animate-spin text-ink-3" />
        </div>
      ) : null}

      {!loading ? <GearSection /> : null}

      {!loading && spend ? (
        <Section title="Claude budget">
          <Panel className="space-y-4">
            {spend.state !== 'normal' ? (
              <Chip tone={spend.state === 'capped' ? 'alert' : 'caution'}>
                {spend.state === 'capped'
                  ? 'Budget exhausted — chat paused'
                  : 'Degraded models in use'}
              </Chip>
            ) : null}

            <SpendBar label="Today" spent={spend.day.spent} cap={spend.day.cap} pct={spend.day.pct} />
            <SpendBar
              label="This month"
              spent={spend.month.spent}
              cap={spend.month.cap}
              pct={spend.month.pct}
              projection={spend.projectedMonthEnd}
            />

            <div className="flex items-end gap-3 border-t border-line pt-3.5">
              <div className="min-w-0 flex-1">
                <Label className="t-micro text-ink-3">Daily cap $</Label>
                <Input
                  type="number"
                  value={dailyCap}
                  onChange={(e) => setDailyCap(e.target.value)}
                  className="mt-1.5 h-9 t-num"
                  min={1}
                />
              </div>
              <div className="min-w-0 flex-1">
                <Label className="t-micro text-ink-3">Monthly cap $</Label>
                <Input
                  type="number"
                  value={monthlyCap}
                  onChange={(e) => setMonthlyCap(e.target.value)}
                  className="mt-1.5 h-9 t-num"
                  min={10}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => void saveCaps()}
                disabled={saving}
              >
                {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </Panel>
        </Section>
      ) : null}

      {native.isNative ? (
        <Section title="iPhone">
          <Panel className="divide-y divide-line py-0">
            <div className="flex items-center gap-3 py-3.5">
              <Smartphone className="size-4 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="t-body text-ink-1">HealthKit sync</p>
                <p className="mt-0.5 t-label text-ink-3">
                  {native.syncStatus?.inProgress
                    ? 'Syncing…'
                    : native.syncStatus?.error
                      ? native.syncStatus.error
                      : native.syncStatus?.lastSync
                        ? `Last synced ${formatSyncAge(native.syncStatus.lastSync)}`
                        : 'Not yet synced this session'}
                </p>
              </div>
              {native.syncStatus?.inProgress ? (
                <RefreshCw className="size-4 animate-spin text-brand" />
              ) : null}
            </div>
            <div className="flex items-center gap-3 py-3.5">
              <RefreshCw className="size-4 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="t-body text-ink-1">Sync now</p>
                <p className="mt-0.5 t-label text-ink-3">Recent workouts + today's metrics</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={native.syncNow}
                disabled={native.syncStatus?.inProgress}
              >
                Sync
              </Button>
            </div>
            <div className="flex items-center gap-3 py-3.5">
              <History className="size-4 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="t-body text-ink-1">Full sync sheet</p>
                <p className="mt-0.5 t-label text-ink-3">Sync history, advanced controls</p>
              </div>
              <Button size="sm" variant="outline" onClick={native.openSync}>
                Open
              </Button>
            </div>
            <div className="flex items-center gap-3 py-3.5">
              <Settings className="size-4 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="t-body text-ink-1">iPhone settings</p>
                <p className="mt-0.5 t-label text-ink-3">Server URL, API key</p>
              </div>
              <Button size="sm" variant="outline" onClick={native.openSettings}>
                Open
              </Button>
            </div>
          </Panel>
        </Section>
      ) : null}

      {!loading ? (
        <Section title="Device">
          <Panel className="divide-y divide-line py-0">
            <div className="flex items-center gap-3 py-3.5">
              <Bell className="size-4 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="t-body text-ink-1">Push notifications</p>
                <p className="mt-0.5 t-label text-ink-3">
                  {pushState === 'granted'
                    ? 'Enabled on this device.'
                    : pushState === 'unsupported'
                      ? 'Not supported in this browser.'
                      : pushState === 'denied'
                        ? 'Blocked — enable in browser settings.'
                        : 'Briefings and guardrail alerts.'}
                </p>
              </div>
              {pushState === 'granted' ? (
                <Chip tone="good">On</Chip>
              ) : pushState === 'unsupported' ? null : (
                <Button size="sm" variant="outline" onClick={() => void enablePush()}>
                  Enable
                </Button>
              )}
            </div>

            <NavRow href="/coach/onboard" label="Intake interview" />
            <NavRow href="/coach/tests" label="Baseline tests" />
          </Panel>
        </Section>
      ) : null}
    </div>
  )
}

function NavRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 py-3.5 transition-colors hover:text-ink-1"
    >
      <span className="t-body flex-1 text-ink-1">{label}</span>
      <ChevronRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function SpendBar({
  label,
  spent,
  cap,
  pct,
  projection,
}: {
  label: string
  spent: number
  cap: number
  pct: number
  projection?: number
}) {
  const tone: Tone = pct >= 100 ? 'alert' : pct >= 80 ? 'caution' : 'good'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-label text-ink-2">{label}</span>
        <span className="t-num t-num-sm text-ink-1">
          ${spent.toFixed(2)}
          <span className="text-ink-3"> / ${cap.toFixed(2)}</span>
        </span>
      </div>
      <Track pct={pct} tone={tone} className="mt-2" />
      {projection != null ? (
        <p className="mt-1.5 t-label text-ink-3">
          Tracking to ${projection.toFixed(2)} by month end
        </p>
      ) : null}
    </div>
  )
}

function formatSyncAge(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}
