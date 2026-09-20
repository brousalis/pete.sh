'use client'

import { Menu, Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ChatHistory } from '@/components/coach/chat/chat-history'
import { ChatThread } from '@/components/coach/chat/chat-thread'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type {
  CoachConversationListItem,
  CoachConversationRecord,
  TodayResponse,
} from '@/lib/types/coach-ui.types'

import {
  asUiMessages,
  newConversationId,
  readActiveConversationId,
  writeActiveConversationId,
} from './chat-lib'

export function ChatShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlId = searchParams.get('c')

  const [threads, setThreads] = useState<CoachConversationListItem[]>([])
  const [conversation, setConversation] = useState<CoachConversationRecord | null>(null)
  const [messages, setMessages] = useState<ReturnType<typeof asUiMessages>>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [deepMode, setDeepMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [today, setToday] = useState<TodayResponse | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)

  const loadThreads = useCallback(async () => {
    try {
      const response = await fetch('/api/coach/conversations', { credentials: 'include' })
      const payload = await response.json()
      if (payload.success && Array.isArray(payload.data)) {
        setThreads(payload.data as CoachConversationListItem[])
        return payload.data as CoachConversationListItem[]
      }
    } catch {
      // History is secondary to the open thread.
    }
    return [] as CoachConversationListItem[]
  }, [])

  const openThread = useCallback(
    async (id: string, known?: CoachConversationListItem[]) => {
      writeActiveConversationId(id)

      const next = new URLSearchParams(searchParams.toString())
      if (next.get('c') !== id) {
        next.set('c', id)
        router.replace(`/coach/chat?${next.toString()}`, { scroll: false })
      }

      try {
        const response = await fetch(`/api/coach/conversations/${id}`, { credentials: 'include' })
        const payload = await response.json()
        if (payload.success && payload.data?.conversation) {
          const record = payload.data.conversation as CoachConversationRecord
          setConversation(record)
          setMessages(asUiMessages(payload.data.messages))
          setDeepMode(Boolean(record.deep_mode))
        } else {
          const listed = (known ?? threads).find((thread) => thread.id === id)
          setConversation(
            listed
              ? {
                  id: listed.id,
                  title: listed.title,
                  summary: null,
                  message_count: listed.message_count,
                  deep_mode: Boolean(listed.deep_mode),
                }
              : {
                  id,
                  title: null,
                  summary: null,
                  message_count: 0,
                  deep_mode: false,
                }
          )
          setMessages([])
          setDeepMode(false)
        }
      } catch {
        setConversation({
          id,
          title: null,
          summary: null,
          message_count: 0,
          deep_mode: false,
        })
        setMessages([])
      } finally {
        setConversationId(id)
        setLoading(false)
      }
    },
    [router, searchParams, threads]
  )

  const startNew = useCallback(() => {
    const id = newConversationId()
    setHistoryOpen(false)
    setConversation({
      id,
      title: null,
      summary: null,
      message_count: 0,
      deep_mode: false,
    })
    setMessages([])
    setDeepMode(false)
    setConversationId(id)
    writeActiveConversationId(id)
    router.replace(`/coach/chat?c=${id}`, { scroll: false })
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (bootstrapped) return
    let cancelled = false

    void (async () => {
      const listed = await loadThreads()
      if (cancelled) return

      const stored = readActiveConversationId()
      const resumeId = urlId ?? stored ?? listed[0]?.id

      if (resumeId) {
        await openThread(resumeId, listed)
      } else {
        startNew()
      }

      setBootstrapped(true)
    })()

    return () => {
      cancelled = true
    }
    // Bootstrap once on mount. URL changes after that are driven by the shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetch('/api/coach/today', { credentials: 'include' })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setToday(payload.data as TodayResponse)
      })
      .catch(() => undefined)
  }, [])

  async function deleteThread(id: string) {
    const next = threads.filter((thread) => thread.id !== id)
    setThreads(next)
    await fetch(`/api/coach/conversations/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (id === conversationId) {
      if (next[0]) await openThread(next[0].id, next)
      else startNew()
    }
  }

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === conversationId) ?? null,
    [threads, conversationId]
  )

  const heading = conversation?.title?.trim()
    || activeThread?.title?.trim()
    || (messages.length > 0 ? 'This session' : 'New session')

  function handleFirstSend(text: string) {
    if (!conversationId) return
    const optimistic: CoachConversationListItem = {
      id: conversationId,
      title: text.length > 72 ? `${text.slice(0, 69)}…` : text,
      message_count: 1,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      deep_mode: deepMode,
    }
    setThreads((current) => [optimistic, ...current.filter((thread) => thread.id !== conversationId)])
    setConversation((current) =>
      current ? { ...current, title: optimistic.title, message_count: 1 } : current
    )
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      <aside className="hidden w-[17.5rem] shrink-0 border-r border-border/80 bg-muted/40 md:flex md:flex-col">
        <ChatHistory
          threads={threads}
          activeId={conversationId}
          onSelect={(id) => {
            void openThread(id)
          }}
          onNew={startNew}
          onDelete={(id) => void deleteThread(id)}
        />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border/80 px-3 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Open sessions"
          >
            <Menu className="size-4" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{heading}</h1>
            <p className="truncate text-[11px] text-muted-foreground">{contextLine(today)}</p>
          </div>

          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <Plus className="size-3.5" />
            New
          </button>
        </header>

        {loading || !conversationId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Opening the last session…
          </div>
        ) : (
          <ChatThread
            key={conversationId}
            conversationId={conversationId}
            initialMessages={messages}
            deepMode={deepMode}
            summary={conversation?.summary ?? null}
            onDeepModeChange={setDeepMode}
            onSettled={() => {
              void loadThreads()
            }}
            onFirstSend={handleFirstSend}
          />
        )}
      </section>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[20rem] max-w-[85vw] p-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Sessions</SheetTitle>
            <SheetDescription>Reopen a previous conversation with the coach.</SheetDescription>
          </SheetHeader>
          <ChatHistory
            compact
            threads={threads}
            activeId={conversationId}
            onSelect={(id) => {
              setHistoryOpen(false)
              void openThread(id)
            }}
            onNew={startNew}
            onDelete={(id) => void deleteThread(id)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function contextLine(today: TodayResponse | null): string {
  if (!today) return 'The coach already has the plan, metrics, and injury record.'

  const parts: string[] = []
  if (today.readiness) {
    parts.push(`Readiness ${Math.round(today.readiness.score)}`)
  }
  if (today.block) {
    parts.push(`Block ${today.block.number}`)
  }
  const nextSession = today.sessions.find((session) => session.status === 'planned')
  if (nextSession) {
    parts.push(nextSession.title)
  }
  if (today.injuries[0]) {
    parts.push(today.injuries[0].name)
  }

  return parts.length > 0
    ? parts.join(' · ')
    : 'The coach already has the plan, metrics, and injury record.'
}

export function ChatShellFallback() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Opening the last session…
    </div>
  )
}
