'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { ArrowUp, Loader2, Square } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { cn } from '@/lib/utils'

import { extractText, STARTERS, toolLabels } from './chat-lib'

export function ChatThread({
  conversationId,
  initialMessages,
  deepMode,
  summary,
  onDeepModeChange,
  onSettled,
  onFirstSend,
}: {
  conversationId: string
  initialMessages: UIMessage[]
  deepMode: boolean
  summary: string | null
  onDeepModeChange: (value: boolean) => void
  onSettled: () => void
  onFirstSend: (text: string) => void
}) {
  const extrasRef = useRef({ conversationId, deepMode })
  extrasRef.current = { conversationId, deepMode }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/coach/chat',
        credentials: 'include',
        body: () => extrasRef.current,
      }),
    []
  )

  const { messages, sendMessage, status, error, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: () => {
      window.setTimeout(onSettled, 600)
    },
  })

  const endRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [showEarlier, setShowEarlier] = useState(false)
  const announcedFirstSend = useRef(initialMessages.length > 0)

  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: messages.length > 8 ? 'auto' : 'smooth' })
  }, [messages, status])

  function submit(text = input) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    if (!announcedFirstSend.current) {
      announcedFirstSend.current = true
      onFirstSend(trimmed)
    }
    setInput('')
    void sendMessage({ text: trimmed })
  }

  const last = messages.at(-1)
  const lastTools = last && last.role === 'assistant' ? toolLabels(last) : []
  const waitingOnFirstToken =
    busy &&
    (last?.role !== 'assistant' || extractText(last).length === 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-[42rem] flex-col px-4 pb-6 pt-5 sm:px-6">
          {summary ? (
            <div className="mb-6 rounded-xl border border-border/70 bg-background/60 px-4 py-3">
              <button
                type="button"
                onClick={() => setShowEarlier((value) => !value)}
                className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                {showEarlier ? 'Hide earlier context' : 'Earlier in this session'}
              </button>
              {showEarlier ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Older turns are folded in so the coach still has them.
                </p>
              )}
            </div>
          ) : null}

          {messages.length === 0 ? (
            <EmptyState onPick={(text) => submit(text)} />
          ) : (
            <div className="flex flex-col gap-8">
              {messages.map((message) => (
                <ThreadMessage key={message.id} message={message} />
              ))}
            </div>
          )}

          {waitingOnFirstToken ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span>{deepMode ? 'Working through it…' : lookingCopy(lastTools)}</span>
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-xl border border-accent-rose/30 bg-accent-rose/8 px-4 py-3 text-sm text-accent-rose">
              {error.message}
            </div>
          ) : null}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-[42rem] px-4 py-3 sm:px-6">
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit()
                }
              }}
              placeholder="Ask about the plan, the knee, or the race."
              rows={2}
              disabled={busy && status === 'submitted'}
              className="field-sizing-content max-h-40 min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-2">
              <button
                type="button"
                onClick={() => onDeepModeChange(!deepMode)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] transition-colors',
                  deepMode
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title="Use the larger model for this turn. Slower and more expensive; worth it for planning and injury questions."
              >
                {deepMode ? 'Deep · larger model' : 'Deep'}
              </button>
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-foreground text-background"
                  aria-label="Stop"
                >
                  <Square className="size-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => submit()}
                  disabled={!input.trim()}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
                  aria-label="Send"
                >
                  <ArrowUp className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function lookingCopy(tools: string[]): string {
  if (tools.length === 0) return 'Looking at your week…'
  if (tools.length === 1) return `Checking ${tools[0]}…`
  return `Checking ${tools.slice(0, 2).join(' and ')}…`
}

function ThreadMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  const text = extractText(message)
  const tools = isUser ? [] : toolLabels(message)

  if (!text && tools.length === 0) return null

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[34rem] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[15px] leading-relaxed text-background">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[38rem]">
      {tools.length > 0 ? (
        <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Looked at {formatToolList(tools)}
        </p>
      ) : null}
      <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-7 [&_li]:my-1 [&_ol]:my-2 [&_p]:my-2.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  )
}

function formatToolList(tools: string[]): string {
  const first = tools[0]
  if (tools.length === 1) return first ?? ''
  if (tools.length === 2) return `${first} and ${tools[1]}`
  return `${tools.slice(0, -1).join(', ')}, and ${tools.at(-1)}`
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Office hours
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        What do you want to work through?
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        This is a session, not a throwaway chat. Leave and come back — the coach
        still has the thread, plus the plan, metrics, and injury record.
      </p>
      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        {STARTERS.map((starter) => (
          <button
            key={starter.label}
            type="button"
            onClick={() => onPick(starter.text)}
            className="rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/60"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {starter.label}
            </span>
            <span className="mt-1 block text-sm leading-snug text-foreground/90">{starter.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
