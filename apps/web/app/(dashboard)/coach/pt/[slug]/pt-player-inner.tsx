'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

import { PtDisplay } from '@/components/coach/pt/pt-display'
import { PtRemote } from '@/components/coach/pt/pt-remote'
import { PtSessionProvider } from '@/components/coach/pt/pt-session-provider'
import type { PtProtocolInput } from '@/lib/coach/pt/pt-types'
import { Button } from '@/components/ui/button'

export default function PtPlayerInner() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const slug = params.slug
  const viewParam = searchParams.get('view')
  const sessionId = searchParams.get('session')
  const view: 'remote' | 'display' = viewParam === 'display' ? 'display' : 'remote'

  const [protocol, setProtocol] = useState<PtProtocolInput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(`/api/coach/pt/protocol/${slug}`, { credentials: 'include' })
        const payload = await response.json()
        if (!payload.success) throw new Error(payload.error ?? 'Protocol not found')
        if (!cancelled) setProtocol(payload.data.protocol as PtProtocolInput)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-0">
        <Loader2 className="size-5 animate-spin text-ink-3" />
      </div>
    )
  }

  if (error || !protocol) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface-0 px-6 text-center">
        <p className="t-body text-ink-2">{error ?? 'Protocol not found'}</p>
        <Button asChild variant="outline">
          <Link href="/coach">Back to today</Link>
        </Button>
      </div>
    )
  }

  return (
    <PtSessionProvider protocol={protocol} role={view} initialSessionId={sessionId}>
      {view === 'display' ? <PtDisplay /> : <PtRemote />}
    </PtSessionProvider>
  )
}
