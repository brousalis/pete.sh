'use client'

import { Loader2, Lock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function CoachLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/coach'
  const safeNext = next.startsWith('/coach') ? next : '/coach'

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch('/api/coach/auth', { credentials: 'include' })
        const payload = (await response.json()) as {
          success?: boolean
          data?: { authenticated?: boolean; gate?: string }
        }
        if (cancelled) return
        if (payload.data?.authenticated) {
          router.replace(safeNext)
          return
        }
      } catch {
        // Fall through to the form.
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, safeNext])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/coach/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })
      const payload = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !payload.success) {
        setError(payload.error ?? 'Unable to sign in')
        return
      }

      router.replace(safeNext)
      router.refresh()
    } catch {
      setError('Network error. Is the server reachable?')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Lock className="h-5 w-5" />
        </div>
        <CardTitle>petehome</CardTitle>
        <CardDescription>
          Enter your PIN. This device stays signed in for about 90 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={code}
            onChange={event => setCode(event.target.value)}
            placeholder="PIN"
            autoComplete="one-time-code"
            autoFocus
            disabled={submitting}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting || code.length === 0}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function CoachLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
        <CoachLoginForm />
      </Suspense>
    </div>
  )
}
