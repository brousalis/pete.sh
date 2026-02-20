'use client'

/**
 * Dedicated AI Coach page — full-screen chat with history sidebar,
 * readiness bar, quick actions, and message rendering.
 */

import { Button } from '@/components/ui/button'
import {
  RoutineDismissedBadge,
  RoutineErrorBadge,
  RoutineVersionPreviewCard,
  type RoutineProposal,
} from '@/components/dashboard/ai-coach-routine-card'
import { useToast } from '@/hooks/use-toast'
import type { TrainingReadiness } from '@/lib/types/ai-coach.types'
import { cn } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
    AlertTriangle,
    ArrowLeft,
    Brain,
    CheckCircle2,
    Clock,
    Hash,
    Loader2,
    MessageSquare,
    PanelLeft,
    Plus,
    Send,
    Sparkles,
    Trash2,
    Wrench,
    Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

// ============================================
// TYPES
// ============================================

interface ConversationSummary {
  id: string
  title: string
  messageCount: number
  updatedAt: string
  createdAt: string
}

// ============================================
// TOOL CALL LABELS
// ============================================

const TOOL_LABELS: Record<string, { label: string }> = {
  getExerciseHistory: { label: 'Exercise History' },
  getBodyCompositionTrend: { label: 'Body Composition' },
  getDailyMetrics: { label: 'Daily Metrics' },
  getTrainingReadiness: { label: 'Training Readiness' },
  proposeRoutineVersion: { label: 'Preparing Routine Update' },
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
    prompt: 'Give me a summary of my training this week. How did I do?',
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
// TIME GROUPING HELPERS
// ============================================

function getTimeGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  if (date >= today) return 'Today'
  if (date >= yesterday) return 'Yesterday'
  if (date >= weekAgo) return 'Previous 7 Days'
  return 'Older'
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ============================================
// CHAT HISTORY SIDEBAR
// ============================================

function ChatHistorySidebar({
  conversations,
  activeChatId,
  onSelect,
  onNewChat,
  onDelete,
  isOpen,
}: {
  conversations: ConversationSummary[]
  activeChatId: string
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete: (id: string) => void
  isOpen: boolean
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const groups: Record<string, ConversationSummary[]> = {}
    for (const conv of conversations) {
      const group = getTimeGroup(conv.updatedAt)
      if (!groups[group]) groups[group] = []
      groups[group].push(conv)
    }
    return groups
  }, [conversations])

  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Older']

  if (!isOpen) return null

  return (
    <div className="flex w-[260px] flex-shrink-0 flex-col border-r border-white/10 bg-zinc-900/50">
      {/* Sidebar header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-white/50" />
          <span className="text-xs font-semibold text-white/70">History</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-white/50 hover:text-white"
          onClick={onNewChat}
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-8 w-8 text-white/10 mb-2" />
            <p className="text-xs text-white/30">No conversations yet</p>
            <p className="text-[10px] text-white/20 mt-1">
              Start a chat to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupOrder.map((groupName) => {
              const items = grouped[groupName]
              if (!items || items.length === 0) return null
              return (
                <div key={groupName}>
                  <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-white/25">
                    {groupName}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((conv) => {
                      const isActive = conv.id === activeChatId
                      const isConfirming = confirmDeleteId === conv.id
                      return (
                        <div
                          key={conv.id}
                          className={cn(
                            'group relative flex items-center rounded-md px-2 py-2 cursor-pointer transition-all',
                            isActive
                              ? 'bg-white/10 border-l-2 border-purple-500 pl-1.5'
                              : 'hover:bg-white/5 border-l-2 border-transparent'
                          )}
                          onClick={() => onSelect(conv.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-xs font-medium text-white/70 group-hover:text-white/90">
                              {conv.title}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-white/25">
                                {formatRelativeTime(conv.updatedAt)}
                              </span>
                              <span className="text-[10px] text-white/20">
                                {conv.messageCount} msgs
                              </span>
                            </div>
                          </div>
                          {/* Delete button */}
                          {isConfirming ? (
                            <div className="flex items-center gap-1 ml-1">
                              <button
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(conv.id)
                                  setConfirmDeleteId(null)
                                }}
                              >
                                Delete
                              </button>
                              <button
                                className="rounded px-1.5 py-0.5 text-[10px] text-white/40 hover:text-white/60 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmDeleteId(null)
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="ml-1 rounded p-1 text-white/0 group-hover:text-white/30 hover:!text-red-400 hover:bg-red-500/10 transition-all"
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmDeleteId(conv.id)
                              }}
                              title="Delete conversation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// PAGE COMPONENT
// ============================================

export default function AiCoachPage() {
  const [readiness, setReadiness] = useState<TrainingReadiness | null>(null)
  const [chatId, setChatId] = useState<string>(() => crypto.randomUUID())
  const [chatError, setChatError] = useState<string | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const { toast } = useToast()

  // Routine version proposal state
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [routineApplying, setRoutineApplying] = useState<string | null>(null)
  const [applied, setApplied] = useState<Map<string, { versionNumber: number }>>(new Map())

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

  // Load conversation list
  const refreshConversations = useCallback(() => {
    fetch('/api/fitness/ai-coach/history/list')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setConversations(data.data)
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  // Restore previous chat on first load
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

  // Refresh sidebar when messages change (new messages saved = new/updated conversation)
  const prevMessageCountRef = useRef(0)
  useEffect(() => {
    if (messages.length > 0 && messages.length !== prevMessageCountRef.current) {
      // Debounce the refresh slightly to let the server persist first
      const timer = setTimeout(refreshConversations, 2000)
      prevMessageCountRef.current = messages.length
      return () => clearTimeout(timer)
    }
    return undefined
  }, [messages.length, refreshConversations])

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

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === chatId) return
      setChatId(id)
      setChatError(null)
      setMessages([])

      fetch(`/api/fitness/ai-coach/history?chatId=${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data?.messages) {
            setMessages(data.data.messages)
          }
        })
        .catch(console.error)
    },
    [chatId, setMessages]
  )

  const handleDeleteConversation = useCallback(
    (id: string) => {
      fetch(`/api/fitness/ai-coach/history/${id}`, { method: 'DELETE' })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setConversations((prev) => prev.filter((c) => c.id !== id))
            if (id === chatId) {
              handleNewChat()
            }
          }
        })
        .catch(console.error)
    },
    [chatId, handleNewChat]
  )

  const handleApplyRoutineVersion = useCallback(async (
    toolResult: RoutineProposal,
    toolCallId: string,
  ) => {
    setRoutineApplying(toolCallId)
    try {
      const res = await fetch('/api/fitness/ai-coach/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routineChanges: toolResult.routineChanges ?? [],
          progressiveOverload: toolResult.progressiveOverload ?? [],
          changeSummary: `AI Coach: ${toolResult.commitMessage}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setApplied((prev) => new Map(prev).set(toolCallId, { versionNumber: data.data.versionNumber }))
        toast({ title: 'Routine updated', description: `Draft v${data.data.versionNumber} created` })
        sendMessage({ text: `Applied routine changes. ${data.data.message}` })
      } else {
        throw new Error(data.error || 'Failed to apply')
      }
    } catch (err) {
      toast({
        title: 'Failed to apply changes',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setRoutineApplying(null)
    }
  }, [sendMessage, toast])

  return (
    <div className="flex h-full bg-zinc-950">
      {/* Sidebar */}
      <ChatHistorySidebar
        conversations={conversations}
        activeChatId={chatId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/50 hover:text-white"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Link href="/fitness">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Fitness
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <h1 className="text-lg font-semibold text-white">AI Coach</h1>
          </div>
          <div className="flex-1" />
          {readiness && (
            <div className="hidden lg:flex">
              <ReadinessBar readiness={readiness} />
            </div>
          )}
          <div className="flex-1" />
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-white/50 hover:text-white"
              onClick={handleNewChat}
            >
              <Plus className="h-3.5 w-3.5" />
              New Chat
            </Button>
          )}
        </div>

        {/* Chat area */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-6 py-4"
          ref={scrollRef}
        >
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
                                  h1: ({ children }) => (
                                    <h1 className="text-base font-bold text-white mt-3 mb-1.5 first:mt-0">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-sm font-semibold text-white mt-3 mb-1 first:mt-0">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-sm font-medium text-white/90 mt-2 mb-1 first:mt-0">
                                      {children}
                                    </h3>
                                  ),
                                  p: ({ children }) => (
                                    <p className="text-sm text-white/80 mb-2 last:mb-0 leading-relaxed">
                                      {children}
                                    </p>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-white">
                                      {children}
                                    </strong>
                                  ),
                                  em: ({ children }) => (
                                    <em className="text-purple-300">
                                      {children}
                                    </em>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc list-inside text-sm text-white/80 mb-2 space-y-0.5">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal list-inside text-sm text-white/80 mb-2 space-y-0.5">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-white/80">
                                      {children}
                                    </li>
                                  ),
                                  code: ({ children }) => (
                                    <code className="bg-white/10 rounded px-1 py-0.5 text-xs font-mono text-purple-300">
                                      {children}
                                    </code>
                                  ),
                                  hr: () => (
                                    <hr className="border-white/10 my-3" />
                                  ),
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
                            toolCallId?: string
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
                          const isComplete = badgeState === 'result' || badgeState === 'output-available'
                          const toolCallId = toolPart.toolCallId || `tool-${index}`

                          if (toolName === 'proposeRoutineVersion' && isComplete && toolPart.output) {
                            const result = toolPart.output as RoutineProposal
                            if (applied.has(toolCallId)) {
                              return (
                                <RoutineVersionPreviewCard
                                  key={index}
                                  proposal={result}
                                  appliedVersion={applied.get(toolCallId)!}
                                />
                              )
                            }
                            if (dismissed.has(toolCallId)) {
                              return <RoutineDismissedBadge key={index} />
                            }
                            if (result.status === 'pending_confirmation') {
                              return (
                                <RoutineVersionPreviewCard
                                  key={index}
                                  proposal={result}
                                  onApply={() => handleApplyRoutineVersion(result, toolCallId)}
                                  onDismiss={() => setDismissed((prev) => new Set(prev).add(toolCallId))}
                                  applying={routineApplying === toolCallId}
                                />
                              )
                            }
                            if (result.status === 'error') {
                              return <RoutineErrorBadge key={index} message={result.message} />
                            }
                          }

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
    </div>
  )
}
