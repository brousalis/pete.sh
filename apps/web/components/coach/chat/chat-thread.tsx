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
    endRef.current?.scrollIntoView({
      behavior: messages.length > 8 ? 'auto' : 'smooth',
    })
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
        <div className="mx-auto flex min-h-full max-w-[40rem] flex-col px-4 pt-5 pb-6">
          {summary ? (
            <div className="mb-5 border-b border-line pb-4">
              <button
                type="button"
                onClick={() => setShowEarlier(value => !value)}
                className="t-micro text-ink-3 transition-colors hover:text-ink-2"
              >
                {showEarlier ? 'Hide earlier' : 'Earlier in this session'}
              </button>
              {showEarlier ? (
                <p className="mt-2 t-body text-ink-2 leading-relaxed">{summary}</p>
              ) : null}
            </div>
          ) : null}

          {messages.length === 0 ? (
            <EmptyState onPick={text => submit(text)} />
          ) : (
            <div className="flex flex-col gap-7">
              {messages.map(message => (
                <ThreadMessage
                  key={message.id}
                  message={message}
                  onOpenPanel={onOpenPanel}
                />
              ))}
            </div>
          )}

          {waitingOnFirstToken ? (
            <div className="mt-6 flex items-center gap-2 text-ink-3">
              <Loader2 className="size-3.5 animate-spin" />
              <span className="t-label">
                {deepMode ? 'Working through it…' : lookingCopy(lastTools)}
              </span>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-control border border-tone-alert/30 bg-tone-alert/10 px-3 py-2.5 t-label text-tone-alert">
              {error.message}
            </div>
          ) : null}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-line bg-surface-0/95 backdrop-blur">
        <div className="mx-auto max-w-[40rem] px-4 py-3">
          <div className="rounded-xl border border-line bg-surface-1">
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit()
                }
              }}
              placeholder="Ask about the plan, the knee, or the race."
              rows={1}
              disabled={busy && status === 'submitted'}
              className="field-sizing-content max-h-36 min-h-[2.75rem] w-full resize-none bg-transparent px-3.5 pt-3 text-[15px] leading-relaxed text-ink-1 outline-none placeholder:text-ink-3 disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <button
                type="button"
                onClick={() => onDeepModeChange(!deepMode)}
                className={cn(
                  'rounded-control px-2 py-1 t-label transition-colors',
                  deepMode
                    ? 'bg-ink-1 text-surface-0'
                    : 'text-ink-3 hover:bg-surface-2 hover:text-ink-1'
                )}
                title="Use the larger model for this turn."
              >
                {deepMode ? 'Deep on' : 'Deep'}
              </button>
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="inline-flex size-8 items-center justify-center rounded-full bg-ink-1 text-surface-0"
                  aria-label="Stop"
                >
                  <Square className="size-3 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => submit()}
                  disabled={!input.trim()}
                  className="inline-flex size-8 items-center justify-center rounded-full bg-ink-1 text-surface-0 transition-opacity disabled:opacity-25"
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
  if (tools.length === 0) return '…'
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
        <div className="max-w-[min(32rem,88%)] rounded-2xl rounded-br-md bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-1">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[36rem]">
      {tools.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="t-micro text-ink-3">Checked</span>
          {tools.map((tool, index) => {
            const panel = toolNameToPanel(tool.name)
            return (
              <span key={tool.name} className="inline-flex items-center gap-1.5">
                {index > 0 ? (
                  <span className="text-ink-3/40" aria-hidden>
                    ·
                  </span>
                ) : null}
                {panel && onOpenPanel ? (
                  <button
                    type="button"
                    onClick={() => onOpenPanel(panel)}
                    className="t-label text-ink-3 transition-colors hover:text-ink-1"
                    title={`Open ${panel}`}
                  >
                    {tool.label}
                  </button>
                ) : (
                  <span className="t-label text-ink-3">{tool.label}</span>
                )}
              </span>
            )
          })}
        </div>
      ) : null}
      <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-7 text-ink-1 [&_li]:my-0.5 [&_ol]:my-2 [&_p]:my-2.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-ink-1 [&_ul]:my-2">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-10">
      <p className="t-subtitle text-ink-1">What do you want to work through?</p>
      <p className="mt-1.5 max-w-sm t-body text-ink-3">
        Today&apos;s session, the knee, the race — or anything in between.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {STARTERS.map(starter => (
          <button
            key={starter.label}
            type="button"
            onClick={() => onPick(starter.text)}
            className="rounded-control border border-line px-3 py-1.5 t-label text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink-1"
          >
            {starter.label}
          </button>
        ))}
      </div>
    </div>
  )
}
