'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { ArrowUp, Loader2, Square } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import type { DeskPanel } from '@/components/coach/desk/desk-types'
import { toolNameToPanel } from '@/components/coach/desk/desk-types'
import { cn } from '@/lib/utils'

import { extractText, STARTERS, toolLabels, toolRefs } from './chat-lib'

export function ChatThread({
  conversationId,
  initialMessages,
  deepMode,
  summary,
  onDeepModeChange,
  onSettled,
  onFirstSend,
  onOpenPanel,
}: {
  conversationId: string
  initialMessages: UIMessage[]
  deepMode: boolean
  summary: string | null
  onDeepModeChange: (value: boolean) => void
  onSettled: () => void
  onFirstSend: (text: string) => void
  onOpenPanel?: (panel: DeskPanel) => void
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
    busy && (last?.role !== 'assistant' || extractText(last).length === 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-[40rem] flex-col px-4 pb-4 pt-4">
          {summary ? (
            <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <button
                type="button"
                onClick={() => setShowEarlier((value) => !value)}
                className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
              >
                {showEarlier ? 'Hide earlier' : 'Earlier in this session'}
              </button>
              {showEarlier ? (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{summary}</p>
              ) : null}
            </div>
          ) : null}

          {messages.length === 0 ? (
            <EmptyState onPick={(text) => submit(text)} />
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((message) => (
                <ThreadMessage
                  key={message.id}
                  message={message}
                  onOpenPanel={onOpenPanel}
                />
              ))}
            </div>
          )}

          {waitingOnFirstToken ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span>{deepMode ? 'Working through it…' : lookingCopy(lastTools)}</span>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-accent-rose/30 bg-accent-rose/8 px-3 py-2.5 text-sm text-accent-rose">
              {error.message}
            </div>
          ) : null}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-[40rem] px-4 py-2">
          <div className="rounded-xl border border-border/80 bg-card">
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
              rows={1}
              disabled={busy && status === 'submitted'}
              className="field-sizing-content max-h-36 min-h-[2.75rem] w-full resize-none bg-transparent px-3 pt-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
              <button
                type="button"
                onClick={() => onDeepModeChange(!deepMode)}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] transition-colors',
                  deepMode
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title="Use the larger model for this turn."
              >
                {deepMode ? 'Deep on' : 'Deep'}
              </button>
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="inline-flex size-8 items-center justify-center rounded-full bg-foreground text-background"
                  aria-label="Stop"
                >
                  <Square className="size-3 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => submit()}
                  disabled={!input.trim()}
                  className="inline-flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
                  aria-label="Send"
                >
                  <ArrowUp className="size-3.5" />
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

function ThreadMessage({
  message,
  onOpenPanel,
}: {
  message: UIMessage
  onOpenPanel?: (panel: DeskPanel) => void
}) {
  const isUser = message.role === 'user'
  const text = extractText(message)
  const tools = isUser ? [] : toolRefs(message)

  if (!text && tools.length === 0) return null

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[32rem] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-[14px] leading-relaxed text-background">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[36rem]">
      {tools.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Looked at
          </span>
          {tools.map((tool) => {
            const panel = toolNameToPanel(tool.name)
            if (panel && onOpenPanel) {
              return (
                <button
                  key={tool.name}
                  type="button"
                  onClick={() => onOpenPanel(panel)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={`Open ${panel} in context`}
                >
                  {tool.label}
                </button>
              )
            }
            return (
              <span
                key={tool.name}
                className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tool.label}
              </span>
            )
          })}
        </div>
      ) : null}
      <div className="prose prose-sm dark:prose-invert max-w-none text-[14px] leading-6 [&_li]:my-0.5 [&_ol]:my-1.5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1.5">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-6">
      <p className="text-[15px] leading-relaxed text-muted-foreground">Ask about today, the knee, or the race.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {STARTERS.map((starter) => (
          <button
            key={starter.label}
            type="button"
            onClick={() => onPick(starter.text)}
            className="rounded-full border border-border/80 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            {starter.label}
          </button>
        ))}
      </div>
    </div>
  )
}
