'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { applyCommand, createInitialState, remainingMs, tick } from '@/lib/coach/pt/pt-state-machine'
import type { PtPlayerCommand, PtPlayerState, PtProtocolInput } from '@/lib/coach/pt/pt-types'

interface PtSessionContextValue {
  protocol: PtProtocolInput
  state: PtPlayerState
  sessionId: string | null
  mode: 'local' | 'synced'
  role: 'remote' | 'display'
  remaining: number | null
  dispatch: (command: PtPlayerCommand) => Promise<void>
  createSyncedSession: () => Promise<string>
  displayUrl: string | null
  loading: boolean
  error: string | null
}

const PtSessionContext = createContext<PtSessionContextValue | null>(null)

function playBeep(freq: number, durationMs: number) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    window.setTimeout(() => {
      osc.stop()
      void ctx.close()
    }, durationMs)
  } catch {
    // Audio optional — ignore failures (autoplay policy, muted tab).
  }
}

export function PtSessionProvider({
  protocol,
  role,
  initialSessionId = null,
  children,
}: {
  protocol: PtProtocolInput
  role: 'remote' | 'display'
  initialSessionId?: string | null
  children: ReactNode
}) {
  const [state, setState] = useState<PtPlayerState>(() => createInitialState(protocol))
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId)
  const [loading, setLoading] = useState(Boolean(initialSessionId))
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const stateRef = useRef(state)
  stateRef.current = state
  const lastBeepSecond = useRef<number | null>(null)

  const mode: 'local' | 'synced' = sessionId ? 'synced' : 'local'

  const displayUrl = useMemo(() => {
    if (!sessionId || typeof window === 'undefined') return null
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'display')
    url.searchParams.set('session', sessionId)
    return url.toString()
  }, [sessionId])

  const pullSession = useCallback(async (id: string) => {
    const response = await fetch(`/api/coach/pt/session/${id}?tick=1`, { credentials: 'include' })
    const payload = await response.json()
    if (!payload.success) throw new Error(payload.error ?? 'Failed to load session')
    setState(payload.data.state as PtPlayerState)
    setSessionId(payload.data.id as string)
  }, [])

  useEffect(() => {
    if (!initialSessionId) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        await pullSession(initialSessionId)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to join session')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [initialSessionId, pullSession])

  // Display polls; remote ticks locally when synced or local.
  useEffect(() => {
    if (role === 'display' && sessionId) {
      const timer = window.setInterval(() => {
        void pullSession(sessionId).catch(() => undefined)
      }, 400)
      return () => window.clearInterval(timer)
    }

    const timer = window.setInterval(() => {
      setNow(Date.now())
      const current = stateRef.current
      if (current.status !== 'running') return

      if (sessionId && role === 'remote') {
        void fetch(`/api/coach/pt/session/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ type: 'tick' }),
        })
          .then((r) => r.json())
          .then((payload) => {
            if (payload.success) setState(payload.data.state as PtPlayerState)
          })
          .catch(() => undefined)
        return
      }

      // Local mode: advance in-memory.
      const next = tick(current, new Date())
      if (next.stepIndex !== current.stepIndex || next.status !== current.status) {
        setState(next)
      }
    }, 250)

    return () => window.clearInterval(timer)
  }, [role, sessionId, pullSession])

  // Wake lock while active.
  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'paused') return
    let lock: WakeLockSentinel | null = null
    void (async () => {
      try {
        if ('wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Unsupported / denied.
      }
    })()
    return () => {
      void lock?.release()
    }
  }, [state.status])

  // Audio cues on remote when remaining hits 3/2/1/0.
  useEffect(() => {
    if (role !== 'remote' || !state.audioEnabled) return
    if (state.status !== 'running') return
    const left = remainingMs(state, new Date(now))
    if (left == null) return
    const sec = Math.ceil(left / 1000)
    if (sec <= 3 && sec >= 1 && lastBeepSecond.current !== sec) {
      lastBeepSecond.current = sec
      playBeep(sec === 1 ? 880 : 660, 80)
    }
    if (sec === 0 && lastBeepSecond.current !== 0) {
      lastBeepSecond.current = 0
      playBeep(520, 160)
    }
  }, [now, role, state])

  const dispatch = useCallback(
    async (command: PtPlayerCommand) => {
      setError(null)
      if (sessionId) {
        const response = await fetch(`/api/coach/pt/session/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(command),
        })
        const payload = await response.json()
        if (!payload.success) {
          setError(payload.error ?? 'Command failed')
          return
        }
        setState(payload.data.state as PtPlayerState)
        return
      }

      setState((prev) => applyCommand(prev, command, new Date()))
    },
    [sessionId]
  )

  const createSyncedSession = useCallback(async () => {
    const response = await fetch('/api/coach/pt/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ protocolSlug: protocol.slug }),
    })
    const payload = await response.json()
    if (!payload.success) throw new Error(payload.error ?? 'Failed to create session')
    const id = payload.data.id as string
    setSessionId(id)
    setState(payload.data.state as PtPlayerState)
    // Update URL so refresh keeps the session.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'remote')
      url.searchParams.set('session', id)
      window.history.replaceState({}, '', url.toString())
    }
    return id
  }, [protocol.slug])

  const remaining = remainingMs(state, new Date(now))

  const value: PtSessionContextValue = {
    protocol,
    state,
    sessionId,
    mode,
    role,
    remaining,
    dispatch,
    createSyncedSession,
    displayUrl,
    loading,
    error,
  }

  return <PtSessionContext.Provider value={value}>{children}</PtSessionContext.Provider>
}

export function usePtSession(): PtSessionContextValue {
  const ctx = useContext(PtSessionContext)
  if (!ctx) throw new Error('usePtSession must be used within PtSessionProvider')
  return ctx
}
