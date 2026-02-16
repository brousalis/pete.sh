"use client"

/**
 * AI Coach Panel
 * Slide-over panel with chat interface, training readiness gauge,
 * insight cards, tool call visualization, and quick actions.
 *
 * Leverages AI SDK features:
 * - useChat with DefaultChatTransport + experimental_throttle
 * - Tool call visualization (tool-invocation parts)
 * - Message metadata (token usage, model, timestamps)
 * - Chat persistence via chatId + server-side onFinish
 * - Error handling surfaced from stream
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import ReactMarkdown from "react-markdown"
import {
  Brain,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ChevronDown,
  Zap,
  ArrowRight,
  Wrench,
  Clock,
  Hash,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TrainingReadiness } from "@/lib/types/ai-coach.types"
import type { FullAnalysis } from "@/lib/types/ai-coach.types"

// ============================================
// TOOL CALL LABELS (human-readable names)
// ============================================

const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  getExerciseHistory: { label: "Exercise History", icon: "barbell" },
  getBodyCompositionTrend: { label: "Body Composition", icon: "scale" },
  getDailyMetrics: { label: "Daily Metrics", icon: "heart" },
  getTrainingReadiness: { label: "Training Readiness", icon: "gauge" },
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
  const meta = TOOL_LABELS[toolName] || { label: toolName, icon: "tool" }
  const isRunning = state === "call" || state === "partial-call"

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
              .join(", ")})
          </span>
        )}
        {isRunning ? (
          <span className="ml-auto text-purple-400/70">querying...</span>
        ) : (
          <CheckCircle2 className="ml-auto h-3 w-3 text-green-400/70" />
        )}
      </div>
      {(state === "result" && result && (
        <div className="mt-1.5 max-h-20 overflow-y-auto text-[10px] text-white/40 font-mono leading-relaxed">
          {Array.isArray(result)
            ? result.slice(0, 5).map((r, i) => <div key={i}>{String(r)}</div>)
            : typeof result === "object"
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
// MESSAGE METADATA DISPLAY
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
          {model.replace("claude-", "").replace("-latest", "")}
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
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  )
}

// ============================================
// TRAINING READINESS GAUGE
// ============================================

function ReadinessGauge({ readiness }: { readiness: TrainingReadiness }) {
  const colorMap = {
    fresh: "text-green-400",
    moderate: "text-yellow-400",
    fatigued: "text-orange-400",
    overtrained: "text-red-400",
  }
  const bgMap = {
    fresh: "bg-green-400/20",
    moderate: "bg-yellow-400/20",
    fatigued: "bg-orange-400/20",
    overtrained: "bg-red-400/20",
  }
  const iconMap = {
    good: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />,
    concern: <AlertTriangle className="h-3.5 w-3.5 text-red-400" />,
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-white/50">
          Training Readiness
        </span>
        <span
          className={`text-2xl font-bold tabular-nums ${colorMap[readiness.level]}`}
        >
          {readiness.score}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-white/10 mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            readiness.score >= 80
              ? "bg-green-400"
              : readiness.score >= 60
                ? "bg-yellow-400"
                : readiness.score >= 40
                  ? "bg-orange-400"
                  : "bg-red-400"
          }`}
          style={{ width: `${readiness.score}%` }}
        />
      </div>

      {/* Level badge */}
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${bgMap[readiness.level]} ${colorMap[readiness.level]} mb-3`}
      >
        <Zap className="h-3 w-3" />
        {readiness.level.charAt(0).toUpperCase() + readiness.level.slice(1)}
      </div>

      {/* Signals */}
      <div className="space-y-1.5">
        {readiness.signals.map((signal, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {iconMap[signal.status]}
            <span className="text-white/70">{signal.detail}</span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <p className="mt-3 text-xs text-white/50 border-t border-white/10 pt-3">
        {readiness.todayRecommendation}
      </p>
    </div>
  )
}

// ============================================
// INSIGHT CARD
// ============================================

function InsightCard({
  analysis,
  onApply,
  isApplying,
}: {
  analysis: FullAnalysis
  onApply?: () => void
  isApplying?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const trendIcon = {
    losing: <TrendingDown className="h-4 w-4 text-green-400" />,
    maintaining: <Minus className="h-4 w-4 text-yellow-400" />,
    gaining: <TrendingUp className="h-4 w-4 text-red-400" />,
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-white">AI Analysis</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-white/50"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      <p className="text-xs text-white/70 mb-3">{analysis.progressSummary}</p>

      {/* Body composition snapshot */}
      <div className="flex items-center gap-3 text-xs mb-3">
        {trendIcon[analysis.bodyComposition.weightTrend]}
        <span className="text-white/70">
          {analysis.bodyComposition.currentWeight} lbs
          {analysis.bodyComposition.isCleanCut && (
            <span className="text-green-400 ml-1">(clean cut)</span>
          )}
        </span>
        {analysis.bodyComposition.weeklyRate !== 0 && (
          <span className="text-white/50">
            {analysis.bodyComposition.weeklyRate > 0 ? "+" : ""}
            {analysis.bodyComposition.weeklyRate.toFixed(1)} lbs/wk
          </span>
        )}
      </div>

      {/* Weekly focus */}
      <div className="rounded bg-purple-500/10 border border-purple-500/20 p-2 mb-3">
        <p className="text-xs text-purple-300">{analysis.weeklyFocus}</p>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-white/10 pt-3">
          {/* Progressive overload suggestions */}
          {analysis.progressiveOverload.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-white/50 mb-1.5">
                Progressive Overload
              </h4>
              {analysis.progressiveOverload.map((po, i) => (
                <div key={i} className="text-xs text-white/70 flex items-center gap-1 mb-1">
                  <ArrowRight className="h-3 w-3 text-blue-400" />
                  <span>
                    {po.exerciseName}:{" "}
                    {po.currentWeight && po.suggestedWeight
                      ? `${po.currentWeight} → ${po.suggestedWeight} lbs`
                      : po.reasoning}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Routine changes */}
          {analysis.routineChanges.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-white/50 mb-1.5">
                Routine Suggestions
              </h4>
              {analysis.routineChanges.map((change, i) => (
                <div key={i} className="text-xs text-white/70 mb-1">
                  <span className="capitalize">{change.day}</span>{" "}
                  <span className="text-white/40">{change.section}</span>:{" "}
                  {change.action} {change.exerciseName || change.newExerciseName}
                  <span className="text-white/40 block ml-2">
                    {change.reasoning}
                  </span>
                </div>
              ))}
              {onApply && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={onApply}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Apply to Routine
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Injury update */}
          <div>
            <h4 className="text-xs font-medium text-white/50 mb-1.5">
              Injury Status
            </h4>
            <p className="text-xs text-white/70">
              Elbow: {analysis.injuryUpdate.elbowStatus}
              {analysis.injuryUpdate.elbowProgressionReady && (
                <span className="text-green-400 ml-1">(ready to progress)</span>
              )}
            </p>
            <p className="text-xs text-white/70">
              Achilles: {analysis.injuryUpdate.achillesStatus}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// QUICK ACTIONS
// ============================================

const QUICK_ACTIONS = [
  { label: "How was my week?", prompt: "Give me a summary of my training this week. How did I do?" },
  { label: "Should I deload?", prompt: "Based on my recent HRV, sleep, and training data, should I take a deload this week?" },
  { label: "Progress to 185?", prompt: "How am I progressing toward my 185 lb goal? What's my projected timeline?" },
  { label: "Next workout tips", prompt: "What should I focus on in my next workout based on recent performance?" },
]

// ============================================
// MAIN PANEL COMPONENT
// ============================================

interface AiCoachPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AiCoachPanel({ open, onOpenChange }: AiCoachPanelProps) {
  const [readiness, setReadiness] = useState<TrainingReadiness | null>(null)
  const [latestAnalysis, setLatestAnalysis] = useState<FullAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [loadingReadiness, setLoadingReadiness] = useState(false)
  const [chatId, setChatId] = useState<string>(() => crypto.randomUUID())
  const [chatError, setChatError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [input, setInput] = useState("")

  // Memoize transport so it doesn't re-create on every render
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/fitness/ai-coach/chat",
        body: { chatId },
      }),
    [chatId]
  )

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    experimental_throttle: 50,
    onError: (err) => {
      setChatError(err.message || "Something went wrong with the AI coach.")
    },
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Clear error when user starts typing
  useEffect(() => {
    if (input.length > 0 && chatError) setChatError(null)
  }, [input, chatError])

  // Load readiness on open
  useEffect(() => {
    if (open && !readiness) {
      setLoadingReadiness(true)
      fetch("/api/fitness/ai-coach/readiness")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setReadiness(data.data)
        })
        .catch(console.error)
        .finally(() => setLoadingReadiness(false))
    }
  }, [open, readiness])

  // Load latest insight on open
  useEffect(() => {
    if (open && !latestAnalysis) {
      fetch("/api/fitness/ai-coach/insights?latest=true")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data?.analysis) {
            setLatestAnalysis(data.data.analysis as FullAnalysis)
          }
        })
        .catch(console.error)
    }
  }, [open, latestAnalysis])

  // Restore previous chat on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      fetch("/api/fitness/ai-coach/history")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data?.chatId && data.data.messages?.length > 0) {
            setChatId(data.data.chatId)
            setMessages(data.data.messages)
          }
        })
        .catch(console.error)
    }
    // Only on first open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Auto-scroll on new messages
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
  }, [setMessages])

  const handleRunAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    try {
      const res = await fetch("/api/fitness/ai-coach/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "full" }),
      })
      const data = await res.json()
      if (data.success) {
        setLatestAnalysis(data.data.analysis)
        const readinessRes = await fetch("/api/fitness/ai-coach/readiness")
        const readinessData = await readinessRes.json()
        if (readinessData.success) setReadiness(readinessData.data)
      }
    } catch (err) {
      console.error("Error running analysis:", err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const handleApplySuggestions = useCallback(async () => {
    if (!latestAnalysis) return
    setIsApplying(true)
    try {
      const res = await fetch("/api/fitness/ai-coach/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routineChanges: latestAnalysis.routineChanges,
          progressiveOverload: latestAnalysis.progressiveOverload,
          changeSummary: `AI Coach: ${latestAnalysis.routineChanges.length} routine changes, ${latestAnalysis.progressiveOverload.length} overload updates. ${latestAnalysis.weeklyFocus}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        sendMessage({
          text: `I just applied your routine suggestions. ${data.data.message}`,
        })
      }
    } catch (err) {
      console.error("Error applying suggestions:", err)
    } finally {
      setIsApplying(false)
    }
  }, [latestAnalysis, sendMessage])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] sm:max-w-[480px] bg-zinc-950 border-white/10 p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Brain className="h-5 w-5 text-purple-400" />
              AI Coach
            </SheetTitle>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-white/50 hover:text-white"
                  onClick={handleNewChat}
                  title="New conversation"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Analyze
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {/* Training Readiness */}
            {loadingReadiness ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white/50 mr-2" />
                <span className="text-xs text-white/50">
                  Loading readiness...
                </span>
              </div>
            ) : readiness ? (
              <ReadinessGauge readiness={readiness} />
            ) : null}

            {/* Latest Analysis */}
            {latestAnalysis && (
              <InsightCard
                analysis={latestAnalysis}
                onApply={
                  latestAnalysis.routineChanges.length > 0 ||
                  latestAnalysis.progressiveOverload.length > 0
                    ? handleApplySuggestions
                    : undefined
                }
                isApplying={isApplying}
              />
            )}

            {/* Quick Actions (only show when no messages) */}
            {messages.length === 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 px-3 text-left justify-start text-white/70 hover:text-white"
                      onClick={() => handleQuickAction(action.prompt)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages with Tool Call Visualization */}
            {messages.length > 0 && (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        message.role === "user"
                          ? "bg-purple-600/30 text-white"
                          : "bg-white/5 text-white/80 border border-white/10"
                      }`}
                    >
                      <div>
                        {message.parts.map((part, index) => {
                          if (part.type === "text") {
                            return message.role === "user" ? (
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
                            part.type.startsWith("tool-") ||
                            part.type === "dynamic-tool"
                          ) {
                            const toolPart = part as {
                              type: string
                              toolName?: string
                              state: string
                              input?: unknown
                              output?: unknown
                            }
                            const toolName =
                              toolPart.type === "dynamic-tool"
                                ? toolPart.toolName ?? "unknown"
                                : toolPart.type.slice(5)
                            const badgeState =
                              toolPart.state === "input-streaming"
                                ? "partial-call"
                                : toolPart.state === "input-available"
                                  ? "call"
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
                      {/* Metadata for assistant messages */}
                      {message.role === "assistant" && (
                        <MessageMetadata
                          metadata={message.metadata as Record<string, unknown> | undefined}
                        />
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming indicator */}
                {isLoading && !messages.some(
                  (m) =>
                    m.role === "assistant" &&
                    m.parts.some((p) => {
                      if (
                        p.type.startsWith("tool-") ||
                        p.type === "dynamic-tool"
                      ) {
                        const tp = p as { state: string }
                        return (
                          tp.state === "input-streaming" ||
                          tp.state === "input-available"
                        )
                      }
                      return false
                    })
                ) && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
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
                  <span>{chatError || error?.message || "An error occurred"}</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) {
              setChatError(null)
              sendMessage({ text: input })
              setInput("")
            }
          }}
          className="px-4 py-3 border-t border-white/10"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your AI coach..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              disabled={status !== "ready"}
            />
            <Button
              type="submit"
              size="sm"
              disabled={status !== "ready" || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ============================================
// AI COACH TRIGGER BUTTON (for the header)
// ============================================

export function AiCoachButton({
  onClick,
  readinessScore,
}: {
  onClick: () => void
  readinessScore?: number
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs"
      onClick={onClick}
    >
      <Brain className="h-3.5 w-3.5 text-purple-400" />
      AI Coach
      {readinessScore !== undefined && (
        <span
          className={`ml-1 tabular-nums font-medium ${
            readinessScore >= 80
              ? "text-green-400"
              : readinessScore >= 60
                ? "text-yellow-400"
                : readinessScore >= 40
                  ? "text-orange-400"
                  : "text-red-400"
          }`}
        >
          {readinessScore}
        </span>
      )}
    </Button>
  )
}
