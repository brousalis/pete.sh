/**
 * Shared utilities for AI message processing.
 * Used by both ai-coach.service and ai-chef.service.
 */
import type { ModelMessage } from 'ai'

/**
 * Anthropic rejects requests where any two `tool_use` blocks share an `id`.
 * In long-lived conversations restored from the DB the same tool invocation
 * can appear more than once within a single assistant message (e.g. a
 * save/load round-trip that duplicates a tool part).
 *
 * Rather than re-IDing the duplicate (which leaves an orphaned tool-result),
 * this removes duplicate tool-call entries and their matching tool-result
 * entries entirely.
 */
export function deduplicateToolCallIds(
  messages: ModelMessage[],
  label = 'AI'
): ModelMessage[] {
  // First pass: detect all duplicate toolCallIds
  const idCount = new Map<string, number>()
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) continue
    for (const part of msg.content) {
      if (part.type === 'tool-call' && part.toolCallId) {
        idCount.set(part.toolCallId, (idCount.get(part.toolCallId) ?? 0) + 1)
      }
    }
  }

  const duplicateIds = new Set<string>()
  for (const [id, count] of idCount) {
    if (count > 1) duplicateIds.add(id)
  }

  if (duplicateIds.size === 0) return messages

  // Debug: log what we found
  console.warn(`[${label}] ⚠ Found duplicate tool_use id(s): ${[...duplicateIds].join(', ')}`)

  // Log full message structure for debugging
  console.warn(`[${label}] Full message structure (${messages.length} model messages):`)
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (!msg) continue
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const parts = msg.content
        .map((p) => {
          if (p.type === 'tool-call') return `tool-call(${p.toolName}:${p.toolCallId})`
          if (p.type === 'text') return `text(${(p.text as string).slice(0, 40)}…)`
          return p.type
        })
        .join(', ')
      console.warn(`  [${i}] assistant: ${parts}`)
    } else if (msg.role === 'tool' && Array.isArray(msg.content)) {
      const parts = msg.content
        .map((p) => {
          if (p.type === 'tool-result') return `tool-result(${p.toolName}:${p.toolCallId})`
          return p.type
        })
        .join(', ')
      console.warn(`  [${i}] tool: ${parts}`)
    } else {
      const preview =
        msg.role === 'user' && Array.isArray(msg.content)
          ? msg.content
              .map((p) => {
                if (p.type === 'text') return `text(${(p.text as string).slice(0, 30)}…)`
                return p.type
              })
              .join(', ')
          : typeof msg.content === 'string'
            ? msg.content.slice(0, 40)
            : '…'
      console.warn(`  [${i}] ${msg.role}: ${preview}`)
    }
  }

  // Second pass: for each duplicate ID, keep only the FIRST occurrence
  // of the tool-call and the FIRST occurrence of the tool-result, remove the rest.
  const seenToolCall = new Set<string>()
  const seenToolResult = new Set<string>()

  const patched = messages.map((msg) => {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const filtered = msg.content.filter((part) => {
        if (part.type !== 'tool-call' || !duplicateIds.has(part.toolCallId)) return true
        if (seenToolCall.has(part.toolCallId)) {
          console.warn(`[${label}] Removing duplicate tool-call: ${part.toolName}:${part.toolCallId}`)
          return false
        }
        seenToolCall.add(part.toolCallId)
        return true
      })
      if (filtered.length === 0) {
        filtered.push({ type: 'text' as const, text: '(continued)' })
      }
      return filtered.length !== msg.content.length ? { ...msg, content: filtered } : msg
    }

    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      const filtered = msg.content.filter((part) => {
        if (part.type !== 'tool-result' || !duplicateIds.has(part.toolCallId)) return true
        if (seenToolResult.has(part.toolCallId)) {
          console.warn(`[${label}] Removing duplicate tool-result: ${part.toolName}:${part.toolCallId}`)
          return false
        }
        seenToolResult.add(part.toolCallId)
        return true
      })
      if (filtered.length === 0) return null // Remove empty tool messages entirely
      return filtered.length !== msg.content.length ? { ...msg, content: filtered } : msg
    }

    return msg
  }).filter((msg): msg is ModelMessage => msg !== null)

  console.warn(`[${label}] Removed ${[...duplicateIds].length} duplicate tool invocation(s)`)
  return patched
}
