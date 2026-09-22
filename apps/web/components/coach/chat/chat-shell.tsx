'use client'

import { ChevronDown, Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ChatHistory } from '@/components/coach/chat/chat-history'
import { ChatThread } from '@/components/coach/chat/chat-thread'
import type { DeskPanel } from '@/components/coach/desk/desk-types'
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
} from '@/lib/types/coach-ui.types'
import { displaySessionTitle, sessionTitleFromPrompt } from '@/lib/utils/session-title'
import { cn } from '@/lib/utils'

import {
  asUiMessages,
  newConversationId,
  readActiveConversationId,
  writeActiveConversationId,
} from './chat-lib'

export function ChatShell({
  onOpenPanel,
}: {
  onOpenPanel?: (panel: DeskPanel) => void
} = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlId = searchParams.get('c')

  const [threads, setThreads] = useState<CoachConversationListItem[]>([])
  const [conversation, setConversation] = useState<CoachConversationRecord | null>(null)
  const [messages, setMessages] = useState<ReturnType<typeof asUiMessages>>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [deepMode, setDeepMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [desktopHistoryOpen, setDesktopHistoryOpen] = useState(false)
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)

  function closeHistory() {
    setDesktopHistoryOpen(false)
    setMobileHistoryOpen(false)
  }

  function toggleHistory() {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      setDesktopHistoryOpen((open) => !open)
    } else {
      setMobileHistoryOpen((open) => !open)
    }
  }

  const replaceDeskUrl = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString())
      mutate(next)
      const query = next.toString()
      router.replace(query ? `/coach?${query}` : '/coach', { scroll: false })
    },
    [router, searchParams]
  )

  const loadThreads = useCallback(async () => {
    try {
      const response = await fetch('/api/coach/conversations', { credentials: 'include' })
      const payload = await response.json()
      if (payload.success && Array.isArray(payload.data)) {
        const listed = payload.data as CoachConversationListItem[]
        setThreads(listed)
        return listed
      }
    } catch {
      // History is secondary to the open thread.
    }
    return [] as CoachConversationListItem[]
  }, [])

  const openThread = useCallback(
    async (id: string, known?: CoachConversationListItem[]) => {
      writeActiveConversationId(id)
      closeHistory()

      if (searchParams.get('c') !== id) {
        replaceDeskUrl((params) => {
          params.set('c', id)
        })
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
    [replaceDeskUrl, searchParams, threads]
  )

  const startNew = useCallback(() => {
    const id = newConversationId()
    closeHistory()
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
    replaceDeskUrl((params) => {
      params.set('c', id)
    })
    setLoading(false)
  }, [replaceDeskUrl])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!desktopHistoryOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!historyRef.current?.contains(event.target as Node)) {
        setDesktopHistoryOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setDesktopHistoryOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [desktopHistoryOpen])

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

  const heading = displaySessionTitle(
    conversation?.title ?? activeThread?.title,
    messages.length > 0 ? 'This session' : 'New session'
  )

  function handleFirstSend(text: string) {
    if (!conversationId) return
    const title = sessionTitleFromPrompt(text)
    const optimistic: CoachConversationListItem = {
      id: conversationId,
      title,
      message_count: 1,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      deep_mode: deepMode,
    }
    setThreads((current) => [optimistic, ...current.filter((thread) => thread.id !== conversationId)])
    setConversation((current) =>
      current ? { ...current, title, message_count: 1 } : current
    )
  }

  async function refreshAfterTurn() {
    const listed = await loadThreads()
    if (!conversationId) return
    const match = listed.find((thread) => thread.id === conversationId)
    if (match?.title) {
      setConversation((current) =>
        current && current.id === conversationId
          ? { ...current, title: match.title, message_count: match.message_count }
          : current
      )
    }
  }

  const historyProps = {
    compact: true as const,
    threads,
    activeId: conversationId,
    onSelect: (id: string) => {
      void openThread(id)
    },
    onNew: startNew,
    onDelete: (id: string) => void deleteThread(id),
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-line">
        <div className="relative mx-auto flex h-12 w-full max-w-[40rem] items-center gap-2 px-4">
          <div ref={historyRef} className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={toggleHistory}
              className="group inline-flex max-w-full items-center gap-2 rounded-control py-1 text-left transition-colors hover:bg-surface-2"
              aria-expanded={desktopHistoryOpen || mobileHistoryOpen}
              aria-haspopup="listbox"
              aria-label="Sessions"
            >
              <span className="min-w-0 px-2">
                <span className="t-micro block text-ink-3">Session</span>
                <span className="t-label flex items-center gap-1 font-semibold text-ink-1">
                  <span className="truncate">{heading}</span>
                  <ChevronDown
                    className={cn(
                      'size-3.5 shrink-0 text-ink-3 transition-transform',
                      (desktopHistoryOpen || mobileHistoryOpen) && 'rotate-180'
                    )}
                  />
                </span>
              </span>
            </button>

            {desktopHistoryOpen ? (
              <div className="absolute top-full left-0 z-40 mt-1 w-[18rem] overflow-hidden rounded-lg border border-line bg-surface-1 text-ink-1 shadow-md">
                <div className="max-h-[min(28rem,70vh)]">
                  <ChatHistory {...historyProps} />
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={startNew}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-control px-2.5 t-label font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1"
            aria-label="New session"
            title="New session"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </header>

      {loading || !conversationId ? (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-3">
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
            void refreshAfterTurn()
          }}
          onFirstSend={handleFirstSend}
          onOpenPanel={onOpenPanel}
        />
      )}

      <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
        <SheetContent side="left" className="w-[18rem] max-w-[85vw] bg-surface-1 p-3">
          <SheetHeader className="sr-only">
            <SheetTitle>Sessions</SheetTitle>
            <SheetDescription>Reopen a previous conversation with the coach.</SheetDescription>
          </SheetHeader>
          <ChatHistory {...historyProps} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function ChatShellFallback() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Opening the last session…
    </div>
  )
}
