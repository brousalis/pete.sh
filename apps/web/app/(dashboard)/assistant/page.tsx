'use client'

/**
 * Unified Assistant — single never-ending conversation by default.
 * One continuous thread; History drawer and New conversation as secondary.
 */

import { Button } from '@/components/ui/button'
import {
  RoutineDismissedBadge,
  RoutineErrorBadge,
  RoutineVersionPreviewCard,
  type RoutineProposal,
} from '@/components/dashboard/ai-coach-routine-card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CookingProvider, useCooking } from '@/hooks/use-cooking-data'
import type { WeekPlanSuggestion } from '@/lib/types/ai-chef.types'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  History,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react'
import type { AssistantConversationSummary } from '@/lib/services/assistant-memory.service'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

// Approximate Claude Sonnet cost (input $3/M, output $15/M; assume ~75% input, ~25% output)
const COST_PER_MILLION_TOKENS = 0.75 * 3 + 0.25 * 15

// ============================================
// TOOL LABELS
// ============================================

const TOOL_LABELS: Record<string, { label: string }> = {
  searchRecipes: { label: 'Searching Recipes' },
  suggestWeekPlan: { label: 'Planning Your Week' },
  setMealSlot: { label: 'Updating Meal Plan' },
  getExerciseHistory: { label: 'Exercise History' },
  getBodyCompositionTrend: { label: 'Body Composition' },
  getDailyMetrics: { label: 'Daily Metrics' },
  getTrainingReadiness: { label: 'Training Readiness' },
  proposeRoutineVersion: { label: 'Preparing Routine Update' },
}

// ============================================
// WEEK PLAN PREVIEW (uses CookingProvider)
// ============================================

function WeekPlanPreview({ plan }: { plan: WeekPlanSuggestion }) {
  const { updateMealPlanBulk } = useCooking()
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  const dayLabels: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
    friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  }

  const dayMap = new Map<string, typeof plan.days[0][]>()
  for (const d of plan.days) {
    const existing = dayMap.get(d.day) || []
    existing.push(d)
    dayMap.set(d.day, existing)
  }

  const handleApplyAll = useCallback(async () => {
    setApplying(true)
    try {
      const updates: Record<string, Record<string, string>> = {}
      for (const suggestion of plan.days) {
        const dayKey = suggestion.day
        if (!updates[dayKey]) updates[dayKey] = {}
        updates[dayKey][suggestion.mealType] = suggestion.recipeId
      }
      await updateMealPlanBulk(updates)
      setApplied(true)
    } catch (err) {
      console.error('Failed to apply meal plan:', err)
    } finally {
      setApplying(false)
    }
  }, [plan.days, updateMealPlanBulk])

  return (
    <div className="my-3 rounded-lg border border-accent-gold/20 bg-gradient-to-b from-accent-gold/5 to-transparent overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-accent-gold" />
            <span className="text-sm font-semibold text-white/90">
              {plan.weekTheme || 'Suggested Meal Plan'}
            </span>
          </div>
          {plan.estimatedPrepTime && (
            <span className="text-xs text-white/40 mt-0.5">{plan.estimatedPrepTime}</span>
          )}
        </div>
        {applied ? (
          <div className="flex items-center gap-1.5 text-xs text-accent-sage">
            <Check className="h-3.5 w-3.5" />
            Applied
          </div>
        ) : (
          <Button
            size="sm"
            className="h-7 gap-1.5 bg-accent-gold hover:bg-accent-gold/90 text-white text-xs"
            onClick={handleApplyAll}
            disabled={applying}
          >
            {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Apply All
          </Button>
        )}
      </div>
      <div className="grid grid-cols-7 divide-x divide-white/5">
        {dayOrder.map((day) => {
          const meals = dayMap.get(day)
          return (
            <div key={day} className="p-2 min-w-0">
              <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 text-center">
                {dayLabels[day]}
              </div>
              {meals?.length ? (
                <div className="space-y-1">
                  {meals.map((m, i) => (
                    <div key={i} className="rounded-md bg-white/5 px-1.5 py-1.5" title={m.reasoning}>
                      <div className="text-[11px] font-medium text-white/80 leading-tight line-clamp-2">
                        {m.recipeName}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-10 flex items-center justify-center">
                  <span className="text-[10px] text-white/15">—</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// TOOL BADGE
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
  const isRunning = state === 'call' || state === 'partial-call' || state === 'input-streaming' || state === 'input-available'

  return (
    <div className="my-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Loader2 className="h-3 w-3 animate-spin text-accent-violet" />
        ) : (
          <Wrench className="h-3 w-3 text-accent-sage" />
        )}
        <span className="font-medium text-white/80">{meta.label}</span>
        {Object.keys(args).length > 0 && toolName !== 'suggestWeekPlan' && (
          <span className="text-white/30 truncate">
            ({Object.entries(args).filter(([k]) => k !== 'plan').map(([k, v]) => `${k}: ${v}`).join(', ')})
          </span>
        )}
        {!isRunning && <CheckCircle2 className="ml-auto h-3 w-3 text-accent-sage/70" />}
      </div>
    </div>
  )
}

// ============================================
// DATE GROUPING
// ============================================

function getTimeGroup(msg: UIMessage): string {
  const meta = msg.metadata as { createdAt?: number } | undefined
  const ts = meta?.createdAt
  if (ts == null) return 'Recent'
  const date = new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  if (date >= today) return 'Today'
  if (date >= yesterday) return 'Yesterday'
  if (date >= weekAgo) return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ============================================
// HISTORY DRAWER (Sheet)
// ============================================

function HistoryDrawer({
  conversations,
  activeChatId,
  onSelect,
  onNewChat,
  onDelete,
  open,
  onOpenChange,
}: {
  conversations: AssistantConversationSummary[]
  activeChatId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete: (id: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-white/60 hover:text-white">
          <History className="h-4 w-4" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-white/10 bg-card">
        <SheetHeader>
          <SheetTitle className="text-white">Conversations</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-white/10 text-white/70 hover:text-white"
            onClick={() => {
              onNewChat()
              onOpenChange(false)
            }}
          >
            <Plus className="h-4 w-4" />
            New conversation
          </Button>
          <p className="text-xs text-white/40 px-1">
            Your memory is shared across all conversations.
          </p>
          <div className="mt-2 flex-1 overflow-y-auto space-y-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer',
                  c.id === activeChatId ? 'bg-accent-violet/20 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                )}
              >
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left truncate"
                  onClick={() => {
                    onSelect(c.id)
                    onOpenChange(false)
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 inline mr-1.5 opacity-50" />
                  {c.title}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-white/40 hover:text-accent-rose"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(c.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================
// QUICK ACTIONS
// ============================================

const QUICK_ACTIONS = [
  { label: 'Plan my week', prompt: 'Plan my dinners for this week based on my fitness routine.' },
  { label: 'How was my week?', prompt: 'Give me a summary of my training this week.' },
  { label: 'Suggest meals', prompt: 'Suggest some high-protein dinners for the next few days.' },
  { label: 'Routine check', prompt: 'Based on my recent data, should I deload or push this week?' },
]

// ============================================
// PAGE (with CookingProvider for week plan apply)
// ============================================

const INITIAL_MESSAGES_LIMIT = 50
const LOAD_OLDER_LIMIT = 30

export function AssistantPageContent({
  onClose,
  fullScreen = false,
}: { onClose?: () => void; fullScreen?: boolean }) {
  const contentWidthClass = fullScreen ? 'w-full max-w-full' : 'max-w-2xl'
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [olderMessages, setOlderMessages] = useState<UIMessage[]>([])
  const [hasMoreOlder, setHasMoreOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const { toast } = useToast()

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [routineApplying, setRoutineApplying] = useState<string | null>(null)
  const [applied, setApplied] = useState<Map<string, { versionNumber: number }>>(new Map())

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/assistant/chat',
        body: { ...(chatId != null ? { chatId } : {}) },
      }),
    [chatId]
  )

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    experimental_throttle: 50,
    onError: (err) => {
      setChatError(err.message || 'Something went wrong.')
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    if (input.length > 0 && chatError) setChatError(null)
  }, [input, chatError])

  const refreshConversations = useCallback(() => {
    fetch('/api/assistant/history/list')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) setConversations(data.data)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  // Initial load: latest conversation (single never-ending default)
  useEffect(() => {
    if (!historyLoaded) {
      setHistoryLoaded(true)
      fetch(`/api/assistant/history?limit=${INITIAL_MESSAGES_LIMIT}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            if (data.data.chatId) {
              setChatId(data.data.chatId)
              setMessages(data.data.messages ?? [])
              setHasMoreOlder(!!data.data.hasMore)
            }
          }
        })
        .catch(console.error)
    }
  }, [historyLoaded, setMessages])

  // After first message without chatId, sync chatId from latest (backend created new thread)
  const prevMessageCountRef = useRef(0)
  useEffect(() => {
    if (chatId == null && messages.length > 0 && messages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length
      fetch('/api/assistant/history')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data?.chatId) setChatId(data.data.chatId)
        })
        .catch(console.error)
    } else if (messages.length > 0) {
      prevMessageCountRef.current = messages.length
    }
  }, [chatId, messages.length])

  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(refreshConversations, 2000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [messages.length, refreshConversations])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleNewChat = useCallback(() => {
    setChatId(null)
    setMessages([])
    setOlderMessages([])
    setHasMoreOlder(false)
    setChatError(null)
  }, [setMessages])

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === chatId) return
      setChatId(id)
      setChatError(null)
      setMessages([])
      setOlderMessages([])
      setHasMoreOlder(false)
      fetch(`/api/assistant/history?chatId=${id}&limit=${INITIAL_MESSAGES_LIMIT}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            setMessages(data.data.messages ?? [])
            setHasMoreOlder(!!data.data.hasMore)
          }
        })
        .catch(console.error)
    },
    [chatId, setMessages]
  )

  const handleDeleteConversation = useCallback(
    (id: string) => {
      fetch(`/api/assistant/history/${id}`, { method: 'DELETE' })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setConversations((prev) => prev.filter((c) => c.id !== id))
            if (id === chatId) handleNewChat()
          }
        })
        .catch(console.error)
    },
    [chatId, handleNewChat]
  )

  const loadOlder = useCallback(() => {
    const currentChatId = chatId
    const firstInView = olderMessages.length > 0 ? olderMessages[0] : messages[0]
    if (!currentChatId || !firstInView?.id) return
    const firstId = firstInView.id
    setLoadingOlder(true)
    fetch(`/api/assistant/history?chatId=${currentChatId}&before=${encodeURIComponent(firstId)}&limit=${LOAD_OLDER_LIMIT}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.messages?.length) {
          setOlderMessages((prev) => [...(data.data.messages as UIMessage[]), ...prev])
          setHasMoreOlder(!!data.data.hasMore)
        } else {
          setHasMoreOlder(false)
        }
      })
      .catch(console.error)
      .finally(() => setLoadingOlder(false))
  }, [chatId, olderMessages.length, messages])

  const handleApplyRoutineVersion = useCallback(
    async (toolResult: RoutineProposal, toolCallId: string) => {
      setRoutineApplying(toolCallId)
      try {
        const res = await fetch('/api/fitness/ai-coach/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routineChanges: toolResult.routineChanges ?? [],
            progressiveOverload: toolResult.progressiveOverload ?? [],
            dailyRoutineChanges: toolResult.dailyRoutineChanges ?? [],
            changeSummary: `Assistant: ${toolResult.commitMessage}`,
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
    },
    [sendMessage, toast]
  )

  // Strict chronological order: olderMessages (oldest first) then messages. No grouping by date that could reorder.
  const allMessages = useMemo(() => [...olderMessages, ...messages], [olderMessages, messages])

  // Session usage: sum tokens from assistant message metadata (main-stream only; router/digest not included)
  const sessionUsage = useMemo(() => {
    let total = 0
    for (const msg of allMessages) {
      if (msg.role !== 'assistant') continue
      const tokens = (msg.metadata as { totalTokens?: number } | undefined)?.totalTokens
      if (typeof tokens === 'number') total += tokens
    }
    const cost = (total / 1_000_000) * COST_PER_MILLION_TOKENS
    return { totalTokens: total, estimatedCostUsd: cost }
  }, [allMessages])

  return (
    <div className={cn('flex h-full flex-col bg-card', fullScreen && 'w-full')}>
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        {onClose ? (
            <Button variant="ghost" size="sm" className="gap-1.5 text-white/60 hover:text-white" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
              Close
            </Button>
          ) : (
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-white/60 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Home
              </Button>
            </Link>
          )}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-violet" />
          <h1 className="text-lg font-semibold text-white">Assistant</h1>
        </div>
        <div className="flex-1" />
        {sessionUsage.totalTokens > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-white/40 tabular-nums">
            <span>~{(sessionUsage.totalTokens / 1000).toFixed(1)}k tokens</span>
            <span>·</span>
            <span>~${sessionUsage.estimatedCostUsd.toFixed(3)}</span>
          </div>
        )}
        <HistoryDrawer
          conversations={conversations}
          activeChatId={chatId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          onDelete={handleDeleteConversation}
          open={historyDrawerOpen}
          onOpenChange={setHistoryDrawerOpen}
        />
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-white/50 hover:text-white" onClick={handleNewChat}>
            <Plus className="h-3.5 w-3.5" />
            New conversation
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4" ref={scrollRef}>
        {allMessages.length === 0 && (
          <div className={cn('mx-auto mt-8', contentWidthClass)}>
            <div className="text-center mb-8">
              <Sparkles className="h-12 w-12 text-accent-violet/50 mx-auto mb-3" />
              <h2 className="text-xl font-medium text-white/70 mb-1">What can I help with?</h2>
              <p className="text-sm text-white/30 mb-1">
                I remember our conversations and get better over time.
              </p>
              <p className="text-xs text-white/25">
                I know your routines, goals, and preferences across meals and fitness.
              </p>
            </div>
            <div className={cn('grid grid-cols-2 gap-3 mx-auto', fullScreen ? 'max-w-xl' : 'max-w-lg')}>
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="h-auto py-3 px-4 text-left justify-start text-white/70 hover:text-white border-white/10 hover:border-white/20"
                  onClick={() => {
                    setChatError(null)
                    sendMessage({ text: action.prompt })
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2 flex-shrink-0 text-accent-violet/70" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {allMessages.length > 0 && (
          <div className={cn('mx-auto space-y-6', contentWidthClass)}>
            {hasMoreOlder && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/50 hover:text-white"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load older messages'}
                </Button>
              </div>
            )}
            {allMessages.map((message, idx) => {
              const prevMsg = idx > 0 ? allMessages[idx - 1] : undefined
              const prevGroup = prevMsg !== undefined ? getTimeGroup(prevMsg) : null
              const thisGroup = getTimeGroup(message)
              const showDateDivider = prevGroup !== thisGroup
              const key = message.id && String(message.id).trim() ? message.id : `msg-${idx}`
              return (
                <div key={key}>
                  {showDateDivider && (
                    <div className="sticky top-0 z-10 py-1 flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                        {thisGroup}
                      </span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}
                  <div className={showDateDivider ? 'mt-2' : ''}>
                    <div
                      className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-4 py-3 text-sm',
                          message.role === 'user'
                            ? 'bg-accent-violet/30 text-white'
                            : 'bg-white/5 text-white/80 border border-white/10'
                        )}
                      >
                        <div>
                          {message.parts.map((part, index) => {
                            if (part.type === 'text') {
                              return message.role === 'user' ? (
                                <span key={index} className="whitespace-pre-wrap break-words">
                                  {part.text}
                                </span>
                              ) : (
                                <div key={index} className="prose prose-invert prose-sm max-w-none">
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => <p className="text-sm text-white/80 mb-2 last:mb-0">{children}</p>,
                                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                      ul: ({ children }) => <ul className="list-disc list-inside text-sm text-white/80 mb-2">{children}</ul>,
                                      ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-white/80 mb-2">{children}</ol>,
                                      li: ({ children }) => <li className="text-white/80">{children}</li>,
                                      code: ({ children }) => <code className="bg-white/10 rounded px-1 py-0.5 text-xs">{children}</code>,
                                    }}
                                  >
                                    {part.text}
                                  </ReactMarkdown>
                                </div>
                              )
                            }
                            if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
                              const toolPart = part as {
                                type: string
                                toolCallId?: string
                                toolName?: string
                                state: string
                                input?: unknown
                                output?: unknown
                              }
                              const toolName = toolPart.type === 'dynamic-tool' ? toolPart.toolName ?? 'unknown' : toolPart.type.slice(5)
                              const badgeState =
                                toolPart.state === 'input-streaming' ? 'partial-call'
                                : toolPart.state === 'input-available' ? 'call'
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
                                if (dismissed.has(toolCallId)) return <RoutineDismissedBadge key={index} />
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

                              if (toolName === 'suggestWeekPlan' && isComplete && (toolPart.output || (toolPart as { input?: { plan?: unknown } }).input?.plan)) {
                                const plan = (toolPart.output ?? (toolPart as { input?: { plan?: WeekPlanSuggestion } }).input?.plan) as WeekPlanSuggestion
                                return <WeekPlanPreview key={index} plan={plan} />
                              }

                              return (
                                <ToolInvocationBadge
                                  key={index}
                                  toolName={toolName}
                                  state={badgeState}
                                  args={(toolPart.input as Record<string, unknown>) ?? {}}
                                  result={toolPart.output}
                                />
                              )
                            }
                            return null
                          })}
                        </div>
                        {message.role === 'assistant' && (message.metadata as Record<string, unknown>)?.totalTokens != null && (
                          <div className="mt-1 text-[10px] text-white/20">
                            {(message.metadata as Record<string, unknown>).totalTokens as number} tokens
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-accent-violet" />
                </div>
              </div>
            )}
          </div>
        )}

        {(chatError || error) && (
          <div className={cn('mx-auto mt-4 rounded-lg border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose flex items-center gap-2', contentWidthClass)}>
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{chatError || error?.message || 'An error occurred'}</span>
          </div>
        )}
      </div>

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
            className={cn('mx-auto flex gap-3 items-end', contentWidthClass)}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (input.trim()) {
                    setChatError(null)
                    sendMessage({ text: input })
                    setInput('')
                  }
                }
              }}
              placeholder="Ask about meals, workouts, or anything... (Shift+Enter for new line)"
              rows={2}
              className="flex-1 min-h-[2.5rem] max-h-32 resize-y overflow-y-auto bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent-violet/50"
              disabled={status !== 'ready'}
            />
            <Button type="submit" disabled={status !== 'ready' || !input.trim()} className="bg-accent-violet hover:bg-accent-violet/90 text-white px-6 shrink-0 self-end">
              <Send className="h-4 w-4" />
            </Button>
          </form>
      </div>
    </div>
  )
}

export default function AssistantPage() {
  return (
    <CookingProvider>
      <AssistantPageContent />
    </CookingProvider>
  )
}
