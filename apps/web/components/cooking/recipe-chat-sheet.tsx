'use client'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import { apiPut } from '@/lib/api/client'
import type { RecipeWithIngredients } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChefHat,
  Loader2,
  Minus,
  Plus,
  Send,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

// ============================================
// TYPES
// ============================================

interface RecipeChatSheetProps {
  recipe: RecipeWithIngredients
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecipeUpdated?: (updated: RecipeWithIngredients) => void
}

interface ProposedVersion {
  status: string
  commitMessage: string
  recipeId: string
  proposed: {
    name: string
    description?: string
    prep_time?: number
    cook_time?: number
    servings?: number
    notes?: string
    tags?: string[]
    ingredients: { name: string; amount?: number; unit?: string; notes?: string; order_index: number }[]
    instructions: { step_number: number; instruction: string; duration?: number }[]
  }
  current: {
    name: string
    description?: string
    prep_time?: number
    cook_time?: number
    servings?: number
    notes?: string
    tags?: string[]
    ingredients: { name: string; amount?: number; unit?: string; notes?: string }[]
    instructions: { step_number: number; instruction: string; duration?: number }[]
  }
}

// ============================================
// TOOL BADGE
// ============================================

const TOOL_LABELS: Record<string, { label: string }> = {
  proposeRecipeVersion: { label: 'Preparing Recipe Update' },
}

function ToolBadge({
  toolName,
  state,
}: {
  toolName: string
  state: string
}) {
  const meta = TOOL_LABELS[toolName] || { label: toolName }
  const isRunning = state === 'call' || state === 'partial-call' || state === 'input-streaming' || state === 'input-available'
  const isComplete = state === 'result' || state === 'output-available'

  return (
    <div className="my-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
        ) : isComplete ? (
          <Wrench className="h-3 w-3 text-green-400" />
        ) : (
          <Wrench className="h-3 w-3 text-white/30" />
        )}
        <span className="font-medium text-white/80">{meta.label}</span>
        {isRunning ? (
          <span className="ml-auto text-amber-400/70">working...</span>
        ) : isComplete ? (
          <CheckCircle2 className="ml-auto h-3 w-3 text-green-400/70" />
        ) : null}
      </div>
    </div>
  )
}

// ============================================
// VERSION PREVIEW CARD
// ============================================

function VersionPreviewCard({
  proposal,
  onApply,
  onDismiss,
  applying,
}: {
  proposal: ProposedVersion
  onApply: () => void
  onDismiss: () => void
  applying: boolean
}) {
  const { current, proposed, commitMessage } = proposal

  const addedIngredients = proposed.ingredients.filter(
    (pi) => !current.ingredients.some((ci) => ci.name.toLowerCase() === pi.name.toLowerCase())
  )
  const removedIngredients = current.ingredients.filter(
    (ci) => !proposed.ingredients.some((pi) => pi.name.toLowerCase() === ci.name.toLowerCase())
  )
  const modifiedIngredients = proposed.ingredients.filter((pi) => {
    const match = current.ingredients.find((ci) => ci.name.toLowerCase() === pi.name.toLowerCase())
    if (!match) return false
    return match.amount !== pi.amount || match.unit !== pi.unit || match.notes !== pi.notes
  })

  const instructionsChanged = proposed.instructions.length !== current.instructions.length ||
    proposed.instructions.some((pi, i) => {
      const ci = current.instructions[i]
      return !ci || ci.instruction !== pi.instruction
    })

  const metaChanges: string[] = []
  if (proposed.name !== current.name) metaChanges.push(`Name → "${proposed.name}"`)
  if (proposed.prep_time !== current.prep_time) metaChanges.push(`Prep: ${current.prep_time ?? '?'} → ${proposed.prep_time ?? '?'} min`)
  if (proposed.cook_time !== current.cook_time) metaChanges.push(`Cook: ${current.cook_time ?? '?'} → ${proposed.cook_time ?? '?'} min`)
  if (proposed.servings !== current.servings) metaChanges.push(`Servings: ${current.servings ?? '?'} → ${proposed.servings ?? '?'}`)

  return (
    <div className="my-2 rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/20 bg-amber-500/10">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-semibold text-amber-300">Proposed Changes</span>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Commit message */}
        <p className="text-xs font-medium text-white/90">{commitMessage}</p>

        {/* Meta changes */}
        {metaChanges.length > 0 && (
          <div className="space-y-0.5">
            {metaChanges.map((c) => (
              <div key={c} className="text-[11px] text-blue-300/80 flex items-center gap-1.5">
                <span className="text-blue-400">~</span> {c}
              </div>
            ))}
          </div>
        )}

        {/* Ingredient changes */}
        {(addedIngredients.length > 0 || removedIngredients.length > 0 || modifiedIngredients.length > 0) && (
          <div className="space-y-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">Ingredients</span>
            {addedIngredients.map((ing) => (
              <div key={`add-${ing.name}`} className="text-[11px] text-green-300/80 flex items-center gap-1.5">
                <Plus className="h-2.5 w-2.5 text-green-400" />
                {ing.name}{ing.amount ? ` — ${ing.amount} ${ing.unit || ''}` : ''}{ing.notes ? ` (${ing.notes})` : ''}
              </div>
            ))}
            {removedIngredients.map((ing) => (
              <div key={`rem-${ing.name}`} className="text-[11px] text-red-300/80 flex items-center gap-1.5 line-through">
                <Minus className="h-2.5 w-2.5 text-red-400" />
                {ing.name}
              </div>
            ))}
            {modifiedIngredients.map((ing) => {
              const orig = current.ingredients.find((ci) => ci.name.toLowerCase() === ing.name.toLowerCase())
              return (
                <div key={`mod-${ing.name}`} className="text-[11px] text-blue-300/80 flex items-center gap-1.5">
                  <span className="text-blue-400">~</span>
                  {ing.name}: {orig?.amount ?? '?'} {orig?.unit ?? ''} → {ing.amount ?? '?'} {ing.unit ?? ''}
                </div>
              )
            })}
          </div>
        )}

        {/* Instructions changed */}
        {instructionsChanged && (
          <div className="space-y-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">Instructions</span>
            <div className="text-[11px] text-blue-300/80">
              {proposed.instructions.length} steps (was {current.instructions.length})
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5"
            onClick={onApply}
            disabled={applying}
          >
            {applying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Apply Changes
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-white/10 text-white/60 hover:text-white"
            onClick={onDismiss}
            disabled={applying}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function RecipeChatSheet({
  recipe,
  open,
  onOpenChange,
  onRecipeUpdated,
}: RecipeChatSheetProps) {
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/cooking/ai-chef/chat',
        body: { recipeId: recipe.id },
      }),
    [recipe.id]
  )

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    experimental_throttle: 50,
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Reset chat when recipe changes or sheet opens
  useEffect(() => {
    if (open) {
      setMessages([])
      setInput('')
      setDismissed(new Set())
      setApplying(null)
    }
  }, [open, recipe.id, setMessages])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const quickActions = useMemo(() => [
    { label: 'How can I improve this?', prompt: `How can I improve the "${recipe.name}" recipe? Suggest concrete changes to make it better.` },
    { label: 'Suggest substitutions', prompt: `What ingredient substitutions would you recommend for "${recipe.name}"? I'm open to alternatives that enhance flavor or nutrition.` },
    { label: 'Make it healthier', prompt: `How can I make "${recipe.name}" healthier without sacrificing too much flavor?` },
    { label: 'Simplify it', prompt: `Can you simplify "${recipe.name}"? Reduce the number of ingredients or steps while keeping the core flavors.` },
  ], [recipe.name])

  const handleSend = useCallback(
    (text: string) => {
      sendMessage({ text })
      setInput('')
    },
    [sendMessage]
  )

  const handleApplyVersion = useCallback(
    async (proposal: ProposedVersion, toolCallId: string) => {
      setApplying(toolCallId)
      try {
        const updatePayload = {
          name: proposal.proposed.name,
          description: proposal.proposed.description,
          prep_time: proposal.proposed.prep_time,
          cook_time: proposal.proposed.cook_time,
          servings: proposal.proposed.servings,
          notes: proposal.proposed.notes,
          tags: proposal.proposed.tags,
          ingredients: proposal.proposed.ingredients,
          instructions: proposal.proposed.instructions,
          commit_message: `AI Chef: ${proposal.commitMessage}`,
        }

        const response = await apiPut<{ success: boolean; data: RecipeWithIngredients }>(
          `/api/cooking/recipes/${proposal.recipeId}`,
          updatePayload
        )

        if (response.success && response.data) {
          toast({
            title: 'Recipe updated!',
            description: proposal.commitMessage,
          })
          onRecipeUpdated?.(response.data.data)
        } else {
          throw new Error('Failed to update recipe')
        }
      } catch (err) {
        toast({
          title: 'Failed to apply changes',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        })
      } finally {
        setApplying(null)
      }
    },
    [toast, onRecipeUpdated]
  )

  const handleDismiss = useCallback((toolCallId: string) => {
    setDismissed((prev) => new Set(prev).add(toolCallId))
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col bg-zinc-950 border-l border-white/10"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>AI Chef — {recipe.name}</SheetTitle>
          <SheetDescription>Discuss and improve this recipe with the AI Chef</SheetDescription>
        </SheetHeader>

        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3 shrink-0">
          <ChefHat className="h-4 w-4 text-amber-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white truncate">AI Chef</h2>
            <p className="text-[11px] text-white/40 truncate">Discussing: {recipe.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-white/40 hover:text-white shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat area */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
          ref={scrollRef}
        >
          {/* Quick actions when empty */}
          {messages.length === 0 && (
            <div className="mt-4">
              <div className="text-center mb-5">
                <ChefHat className="h-8 w-8 text-amber-400/40 mx-auto mb-2" />
                <p className="text-xs text-white/30">
                  Ask me anything about this recipe — improvements, substitutions, or variations.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2.5 px-3 text-left justify-start text-[11px] text-white/60 hover:text-white border-white/10 hover:border-white/20"
                    onClick={() => handleSend(action.prompt)}
                    disabled={isLoading}
                  >
                    <Sparkles className="h-3 w-3 mr-1.5 flex-shrink-0 text-amber-400/60" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2.5 text-sm',
                      message.role === 'user'
                        ? 'bg-amber-600/30 text-white'
                        : 'bg-white/5 text-white/80 border border-white/10'
                    )}
                  >
                    {message.parts.map((part, index) => {
                      if (part.type === 'text') {
                        return message.role === 'user' ? (
                          <span key={index} className="text-[13px]">{part.text}</span>
                        ) : (
                          <div key={index} className="recipe-chat-markdown">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => <h1 className="text-sm font-bold text-white mt-2.5 mb-1 first:mt-0">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-[13px] font-semibold text-white mt-2.5 mb-1 first:mt-0">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-[13px] font-medium text-white/90 mt-2 mb-0.5 first:mt-0">{children}</h3>,
                                p: ({ children }) => <p className="text-[13px] text-white/80 mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                em: ({ children }) => <em className="text-amber-300">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside text-[13px] text-white/80 mb-1.5 space-y-0.5">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside text-[13px] text-white/80 mb-1.5 space-y-0.5">{children}</ol>,
                                li: ({ children }) => <li className="text-white/80">{children}</li>,
                                code: ({ children }) => <code className="bg-white/10 rounded px-1 py-0.5 text-xs font-mono text-amber-300">{children}</code>,
                                hr: () => <hr className="border-white/10 my-2" />,
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
                        const toolName = toolPart.type === 'dynamic-tool'
                          ? toolPart.toolName ?? 'unknown'
                          : toolPart.type.slice(5)
                        const badgeState = toolPart.state === 'input-streaming'
                          ? 'partial-call'
                          : toolPart.state === 'input-available'
                            ? 'call'
                            : toolPart.state
                        const isComplete = badgeState === 'result' || badgeState === 'output-available'
                        const toolCallId = toolPart.toolCallId || `tool-${index}`

                        if (toolName === 'proposeRecipeVersion' && isComplete && toolPart.output) {
                          const result = toolPart.output as ProposedVersion
                          if (result.status === 'pending_confirmation' && !dismissed.has(toolCallId)) {
                            return (
                              <VersionPreviewCard
                                key={index}
                                proposal={result}
                                onApply={() => handleApplyVersion(result, toolCallId)}
                                onDismiss={() => handleDismiss(toolCallId)}
                                applying={applying === toolCallId}
                              />
                            )
                          }
                          if (dismissed.has(toolCallId)) {
                            return (
                              <div key={index} className="my-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                                <div className="flex items-center gap-2 text-white/40">
                                  <X className="h-3 w-3" />
                                  <span>Proposed changes dismissed</span>
                                </div>
                              </div>
                            )
                          }
                          if (result.status === 'error') {
                            return (
                              <div key={index} className="my-1.5 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{(result as unknown as { message: string }).message}</span>
                                </div>
                              </div>
                            )
                          }
                        }

                        return (
                          <ToolBadge
                            key={index}
                            toolName={toolName}
                            state={badgeState}
                          />
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading &&
                !messages.some(
                  (m) =>
                    m.role === 'assistant' &&
                    m.parts.some((p) => {
                      if (p.type.startsWith('tool-') || p.type === 'dynamic-tool') {
                        const tp = p as { state: string }
                        return tp.state === 'input-streaming' || tp.state === 'input-available'
                      }
                      return false
                    })
                ) && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{error.message || 'An error occurred'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 px-4 py-3 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (input.trim()) handleSend(input)
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${recipe.name}...`}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              disabled={status !== 'ready'}
            />
            <Button
              type="submit"
              disabled={status !== 'ready' || !input.trim()}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 h-auto"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
