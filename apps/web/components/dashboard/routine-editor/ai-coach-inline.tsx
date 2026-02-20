'use client'

import {
  RoutineDismissedBadge,
  RoutineErrorBadge,
  RoutineVersionPreviewCard,
  type RoutineProposal,
} from '@/components/dashboard/ai-coach-routine-card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { DayOfWeek, Workout } from '@/lib/types/fitness.types'
import {
  applyRoutineChanges,
  type RoutineChangeDiffEntry,
} from '@/lib/utils/routine-change-utils'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Hash,
  Loader2,
  RotateCcw,
  Send,
  Undo2,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

const TOOL_LABELS: Record<string, { label: string }> = {
  getExerciseHistory: { label: 'Exercise History' },
  getBodyCompositionTrend: { label: 'Body Composition' },
  getDailyMetrics: { label: 'Daily Metrics' },
  getTrainingReadiness: { label: 'Training Readiness' },
  proposeRoutineVersion: { label: 'Preparing Routine Update' },
}

function ToolBadge({
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
          <span className="truncate text-white/30">
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
      {state === 'result' && result !== undefined && (
        <div className="mt-1.5 max-h-20 overflow-y-auto font-mono text-[10px] leading-relaxed text-white/40">
          {typeof result === 'object'
            ? JSON.stringify(result, null, 1).slice(0, 200)
            : String(result).slice(0, 200)}
        </div>
      )}
    </div>
  )
}

function MsgMeta({ metadata }: { metadata?: Record<string, unknown> }) {
  if (!metadata) return null
  const tokens = metadata.totalTokens as number | undefined
  const model = metadata.model as string | undefined
  const createdAt = metadata.createdAt as number | undefined
  if (!tokens && !model && !createdAt) return null

  return (
    <div className="mt-1 flex items-center gap-3 text-[10px] text-white/20">
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

const QUICK_ACTIONS = [
  {
    label: 'Review my routine',
    prompt:
      'Review my current routine and suggest any improvements or changes you think would help.',
  },
  {
    label: 'Progressive overload',
    prompt:
      'Based on my recent workout data, suggest progressive overload adjustments for my exercises.',
  },
  {
    label: 'Check readiness',
    prompt:
      'Check my training readiness based on HRV, sleep, and recent training load.',
  },
  {
    label: 'Swap an exercise',
    prompt:
      'I want to swap out an exercise that feels stale. What do you recommend based on my goals?',
  },
]

export interface AiCoachInlineProps {
  open: boolean
  onClose: () => void
  onApplyChanges: (
    updatedDefs: Record<DayOfWeek, Workout>,
    commitMessage: string,
    diff: RoutineChangeDiffEntry[]
  ) => void
  currentWorkoutDefs: Record<DayOfWeek, Workout>
  undoAvailable: boolean
  onUndo: () => void
}

export function AiCoachInline({
  open,
  onClose,
  onApplyChanges,
  currentWorkoutDefs,
  undoAvailable,
  onUndo,
}: AiCoachInlineProps) {
  const [chatId, setChatId] = useState<string>(() => crypto.randomUUID())
  const [chatError, setChatError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [routineApplying, setRoutineApplying] = useState<string | null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())

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
      setChatError(err.message || 'Something went wrong with the AI coach.')
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    if (input.length > 0 && chatError) setChatError(null)
  }, [input, chatError])

  // Restore previous chat on first open
  useEffect(() => {
    if (open && messages.length === 0) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
    const newId = crypto.randomUUID()
    setChatId(newId)
    setMessages([])
    setChatError(null)
    setDismissed(new Set())
    setApplied(new Set())
  }, [setMessages])

  const handleApplyRoutineVersion = useCallback(
    (toolResult: RoutineProposal, toolCallId: string) => {
      setRoutineApplying(toolCallId)
      try {
        const clonedDefs = structuredClone(currentWorkoutDefs)
        const { updatedDefs, changesApplied, diff } = applyRoutineChanges(
          clonedDefs,
          toolResult.routineChanges ?? [],
          toolResult.progressiveOverload
        )

        if (changesApplied === 0) {
          toast({
            title: 'No changes applied',
            description:
              'The proposed changes did not match any exercises in the current routine.',
            variant: 'destructive',
          })
          return
        }

        onApplyChanges(
          updatedDefs as Record<DayOfWeek, Workout>,
          toolResult.commitMessage ?? 'AI Coach changes',
          diff
        )
        setApplied((prev) => new Set(prev).add(toolCallId))
        sendMessage({
          text: `Applied ${changesApplied} change${changesApplied !== 1 ? 's' : ''} to the routine. The editor has been updated.`,
        })
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
    [currentWorkoutDefs, onApplyChanges, sendMessage, toast]
  )

  if (!open) return null

  return (
    <div className="flex h-full w-[400px] shrink-0 flex-col border-l border-white/10 bg-zinc-950/80">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">AI Coach</span>
        </div>
        <div className="flex items-center gap-1.5">
          {undoAvailable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-amber-400 hover:text-amber-300"
              onClick={onUndo}
              title="Undo last AI change"
            >
              <Undo2 className="h-3 w-3" />
              Undo
            </Button>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/50 hover:text-white"
              onClick={handleNewChat}
              title="New conversation"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-white/50 hover:text-white"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Scrollable chat area */}
      <div className="flex-1 overflow-y-auto px-4" ref={scrollRef}>
        <div className="space-y-4 py-4">
          {/* Quick actions when no messages */}
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="mb-2 text-xs text-white/60">
                  Chat with your AI coach to review and update your routine.
                  Changes are applied directly to the editor.
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="h-auto justify-start border-white/10 px-2.5 py-2 text-left text-[11px] text-white/70 hover:text-white"
                      onClick={() => handleQuickAction(action.prompt)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-purple-600/30 text-white'
                        : 'border border-white/10 bg-white/5 text-white/80'
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
                                    <h1 className="mb-1.5 mt-3 text-base font-bold text-white first:mt-0">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="mb-1 mt-3 text-sm font-semibold text-white first:mt-0">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="mb-1 mt-2 text-sm font-medium text-white/90 first:mt-0">
                                      {children}
                                    </h3>
                                  ),
                                  p: ({ children }) => (
                                    <p className="mb-2 text-sm leading-relaxed text-white/80 last:mb-0">
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
                                    <ul className="mb-2 list-inside list-disc space-y-0.5 text-sm text-white/80">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="mb-2 list-inside list-decimal space-y-0.5 text-sm text-white/80">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-white/80">
                                      {children}
                                    </li>
                                  ),
                                  code: ({ children }) => (
                                    <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs text-purple-300">
                                      {children}
                                    </code>
                                  ),
                                  hr: () => (
                                    <hr className="my-3 border-white/10" />
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
                              ? (toolPart.toolName ?? 'unknown')
                              : toolPart.type.slice(5)
                          const badgeState =
                            toolPart.state === 'input-streaming'
                              ? 'partial-call'
                              : toolPart.state === 'input-available'
                                ? 'call'
                                : toolPart.state
                          const isComplete =
                            badgeState === 'result' ||
                            badgeState === 'output-available'
                          const toolCallId =
                            toolPart.toolCallId || `tool-${index}`

                          if (
                            toolName === 'proposeRoutineVersion' &&
                            isComplete &&
                            toolPart.output
                          ) {
                            const result = toolPart.output as RoutineProposal
                            if (applied.has(toolCallId)) {
                              return (
                                <div
                                  key={index}
                                  className="my-2 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2.5"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                                  <span className="text-xs font-medium text-green-300">
                                    Changes applied to editor
                                  </span>
                                  <span className="ml-1 text-[11px] text-white/40">
                                    {result.commitMessage}
                                  </span>
                                </div>
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
                                  onApply={() =>
                                    handleApplyRoutineVersion(
                                      result,
                                      toolCallId
                                    )
                                  }
                                  onDismiss={() =>
                                    setDismissed(
                                      (prev) =>
                                        new Set(prev).add(toolCallId)
                                    )
                                  }
                                  applying={routineApplying === toolCallId}
                                />
                              )
                            }
                            if (result.status === 'error') {
                              return (
                                <RoutineErrorBadge
                                  key={index}
                                  message={result.message}
                                />
                              )
                            }
                          }

                          return (
                            <ToolBadge
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
                      <MsgMeta
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
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Error display */}
          {(chatError || error) && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {chatError || error?.message || 'An error occurred'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim()) {
            setChatError(null)
            sendMessage({ text: input })
            setInput('')
          }
        }}
        className="border-t border-white/10 px-4 py-3"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your routine..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            disabled={status !== 'ready'}
          />
          <Button
            type="submit"
            size="sm"
            disabled={status !== 'ready' || !input.trim()}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
