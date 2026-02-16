'use client'

/**
 * Dedicated AI Coach page — full-screen chat + readiness + insights
 * without Sheet overlay for easier debugging and a first-class experience.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import ReactMarkdown from 'react-markdown'
import {
  Brain,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Zap,
  ArrowLeft,
  Wrench,
  Clock,
  Hash,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { TrainingReadiness } from '@/lib/types/ai-coach.types'

// ============================================
// TOOL CALL LABELS
// ============================================

const TOOL_LABELS: Record<string, { label: string }> = {
  getExerciseHistory: { label: 'Exercise History' },
  getBodyCompositionTrend: { label: 'Body Composition' },
  getDailyMetrics: { label: 'Daily Metrics' },
  getTrainingReadiness: { label: 'Training Readiness' },
}

// ============================================
// TOOL INVOCATION DISPLAY
// ============================================

function ToolInvocationBadge({
  toolName,
  state,
  args,
  result,
}: {
  toolName: string
  state: string
  args: Record<string, unknown>
  result?: unknown
}) {
  const meta = TOOL_LABELS[toolName] || { label: toolName }
  const isRunning = state === 'call' || state === 'partial-call'

  return (
    <div className="my-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
        ) : (
          <Wrench className="h-3 w-3 text-green-400" />
        )}
        <span className="font-medium text-white/80">{meta.label}</span>
        {Object.keys(args).length > 0 && (
          <span className="text-white/30">
            ({Object.entries(args)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')})
          </span>
        )}
        {isRunning ? (
          <span className="ml-auto text-purple-400/70">querying...</span>
        ) : (
          <CheckCircle2 className="ml-auto h-3 w-3 text-green-400/70" />
        )}
      </div>
      {(state === 'result' && result && (
        <div className="mt-1.5 max-h-20 overflow-y-auto text-[10px] text-white/40 font-mono leading-relaxed">
          {Array.isArray(result)
            ? result.slice(0, 5).map((r, i) => <div key={i}>{String(r)}</div>)
            : typeof result === 'object'
              ? JSON.stringify(result, null, 1).slice(0, 200)
              : String(result).slice(0, 200)}
          {Array.isArray(result) && result.length > 5 && (
            <div className="text-white/20">...and {result.length - 5} more</div>
          )}
        </div>
      )) as React.ReactNode}
    </div>
  )
}

// ============================================
// MESSAGE METADATA
// ============================================

function MessageMetadata({ metadata }: { metadata?: Record<string, unknown> }) {
  if (!metadata) return null

  const tokens = metadata.totalTokens as number | undefined
  const model = metadata.model as string | undefined
  const createdAt = metadata.createdAt as number | undefined

  if (!tokens && !model && !createdAt) return null

  return (
    <div className="flex items-center gap-3 mt-1 text-[10px] text-white/20">
      {model && (
        <span className="flex items-center gap-0.5">
          <Brain className="h-2.5 w-2.5" />
          {model.replace('claude-', '').replace('-latest', '')}
        </span>
      )}
      {tokens != null && (
        <span className="flex items-center gap-0.5">
          <Hash className="h-2.5 w-2.5" />
          {tokens.toLocaleString()} tokens
        </span>
      )}
      {createdAt && (
        <span className="flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          {new Date(createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
    </div>
  )
}

// ============================================
// READINESS BAR (compact)
// ============================================

function ReadinessBar({ readiness }: { readiness: TrainingReadiness }) {
  const color =
    readiness.score >= 80
      ? 'text-green-400'
      : readiness.score >= 60
        ? 'text-yellow-400'
        : readiness.score >= 40
          ? 'text-orange-400'
          : 'text-red-400'
  const bg =
    readiness.score >= 80
      ? 'bg-green-400'
      : readiness.score >= 60
        ? 'bg-yellow-400'
        : readiness.score >= 40
          ? 'bg-orange-400'
          : 'bg-red-400'

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Zap className={`h-4 w-4 ${color}`} />
        <span className={`text-lg font-bold tabular-nums ${color}`}>
          {readiness.score}
        </span>
        <span className="text-xs text-white/40 capitalize">
          {readiness.level}
        </span>
      </div>
      <div className="h-2 w-32 rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${bg}`}
          style={{ width: `${readiness.score}%` }}
        />
      </div>
      <span className="text-xs text-white/40 max-w-xs truncate">
        {readiness.todayRecommendation}
      </span>
    </div>
  )
}

// ============================================
// QUICK ACTIONS
// ============================================

const QUICK_ACTIONS = [
  {
    label: 'How was my week?',
    prompt:
      'Give me a summary of my training this week. How did I do?',
  },
  {
    label: 'Should I deload?',
    prompt:
      'Based on my recent HRV, sleep, and training data, should I take a deload this week?',
  },
  {
    label: 'Progress to 185?',
    prompt:
      "How am I progressing toward my 185 lb goal? What's my projected timeline?",
  },
  {
    label: 'Next workout tips',
    prompt:
      'What should I focus on in my next workout based on recent performance?',
  },
]

// ============================================
// PAGE COMPONENT
// ============================================

export default function AiCoachPage() {
  const [readiness, setReadiness] = useState<TrainingReadiness | null>(null)
  const [chatId, setChatId] = useState<string>(() => crypto.randomUUID())
  const [chatError, setChatError] = useState<string | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/fitness/ai-coach/chat',
        body: { chatId },
      }),
    [chatId]
  )

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    experimental_throttle: 50,
    onError: (err) => {
      console.error('[AI Coach] useChat error:', err)
      setChatError(err.message || 'Something went wrong with the AI coach.')
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Clear error on input
  useEffect(() => {
    if (input.length > 0 && chatError) setChatError(null)
  }, [input, chatError])

  // Load readiness
  useEffect(() => {
    fetch('/api/fitness/ai-coach/readiness')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setReadiness(data.data)
      })
      .catch(console.error)
  }, [])

  // Restore previous chat
  useEffect(() => {
    if (historyLoaded) return
    setHistoryLoaded(true)

    fetch('/api/fitness/ai-coach/history')
      .then((r) => r.json())
      .then((data) => {
        if (
          data.success &&
          data.data?.chatId &&
          data.data.messages?.length > 0
        ) {
          setChatId(data.data.chatId)
          setMessages(data.data.messages)
        }
      })
      .catch(console.error)
  }, [historyLoaded, setMessages])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleQuickAction = useCallback(
    (prompt: string) => {
      setChatError(null)
      sendMessage({ text: prompt })
    },
    [sendMessage]
  )

  const handleNewChat = useCallback(() => {
    setChatId(crypto.randomUUID())
    setMessages([])
    setChatError(null)
  }, [setMessages])

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-3">
        <Link href="/fitness">
          <Button variant="ghost" size="sm" className="gap-1.5 text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Fitness
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-semibold text-white">AI Coach</h1>
        </div>
        <div className="flex-1" />
        {readiness && <ReadinessBar readiness={readiness} />}
        <div className="flex-1" />
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-white/50 hover:text-white"
            onClick={handleNewChat}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Chat
          </Button>
        )}
        <div className="text-[10px] text-white/20 font-mono">
          status: {status} | msgs: {messages.length} | id: {chatId.slice(0, 8)}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-4" ref={scrollRef}>
        {/* Quick actions when empty */}
        {messages.length === 0 && (
          <div className="mx-auto max-w-2xl mt-8">
            <div className="text-center mb-8">
              <Brain className="h-12 w-12 text-purple-400/50 mx-auto mb-3" />
              <h2 className="text-xl font-medium text-white/70 mb-1">
                What would you like to know?
              </h2>
              <p className="text-sm text-white/30">
                Ask about your training, body composition, readiness, or get
                coaching advice.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="h-auto py-3 px-4 text-left justify-start text-white/70 hover:text-white border-white/10 hover:border-white/20"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2 flex-shrink-0 text-purple-400/70" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                    message.role === 'user'
                      ? 'bg-purple-600/30 text-white'
                      : 'bg-white/5 text-white/80 border border-white/10'
                  }`}
                >
                  <div>
                    {message.parts.map((part, index) => {
                      if (part.type === 'text') {
                        return message.role === 'user' ? (
                          <span key={index}>{part.text}</span>
                        ) : (
                          <div key={index} className="ai-coach-markdown">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-sm font-semibold text-white mt-3 mb-1 first:mt-0">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-medium text-white/90 mt-2 mb-1 first:mt-0">{children}</h3>,
                                p: ({ children }) => <p className="text-sm text-white/80 mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                em: ({ children }) => <em className="text-purple-300">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside text-sm text-white/80 mb-2 space-y-0.5">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-white/80 mb-2 space-y-0.5">{children}</ol>,
                                li: ({ children }) => <li className="text-white/80">{children}</li>,
                                code: ({ children }) => <code className="bg-white/10 rounded px-1 py-0.5 text-xs font-mono text-purple-300">{children}</code>,
                                hr: () => <hr className="border-white/10 my-3" />,
                              }}
                            >
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        )
                      }
                      if (
                        part.type.startsWith('tool-') ||
                        part.type === 'dynamic-tool'
                      ) {
                        const toolPart = part as {
                          type: string
                          toolName?: string
                          state: string
                          input?: unknown
                          output?: unknown
                        }
                        const toolName =
                          toolPart.type === 'dynamic-tool'
                            ? toolPart.toolName ?? 'unknown'
                            : toolPart.type.slice(5)
                        const badgeState =
                          toolPart.state === 'input-streaming'
                            ? 'partial-call'
                            : toolPart.state === 'input-available'
                              ? 'call'
                              : toolPart.state
                        return (
                          <ToolInvocationBadge
                            key={index}
                            toolName={toolName}
                            state={badgeState}
                            args={
                              (toolPart.input as Record<string, unknown>) ??
                              {}
                            }
                            result={toolPart.output}
                          />
                        )
                      }
                      return null
                    })}
                  </div>
                  {message.role === 'assistant' && (
                    <MessageMetadata
                      metadata={
                        message.metadata as
                          | Record<string, unknown>
                          | undefined
                      }
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Streaming indicator */}
            {isLoading &&
              !messages.some(
                (m) =>
                  m.role === 'assistant' &&
                  m.parts.some((p) => {
                    if (
                      p.type.startsWith('tool-') ||
                      p.type === 'dynamic-tool'
                    ) {
                      const tp = p as { state: string }
                      return (
                        tp.state === 'input-streaming' ||
                        tp.state === 'input-available'
                      )
                    }
                    return false
                  })
              ) && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Error */}
        {(chatError || error) && (
          <div className="mx-auto max-w-2xl mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                {chatError || error?.message || 'An error occurred'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) {
              setChatError(null)
              sendMessage({ text: input })
              setInput('')
            }
          }}
          className="mx-auto max-w-2xl flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI coach..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={status !== 'ready'}
          />
          <Button
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
