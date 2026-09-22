/**
 * Turn a first user message into a short, scannable session title.
 *
 * Prefer topic labels ("Sleep tracking") over truncated questions.
 */

const FILLER_PREFIX =
  /^(?:hey|hi|hello|yo|sup|so|um|uh|ok|okay|well|anyway|quick(?:\s+question)?|question|can\s+you|could\s+you|would\s+you|will\s+you|please|help\s+me|walk\s+me\s+through|i(?:'m| am)\s+(?:wondering|curious|thinking|trying\s+to\s+figure\s+out)|i(?:'d| would)\s+like\s+to\s+(?:talk|ask|know|chat)(?:\s+about)?|lets?'?\s+talk\s+about|talk\s+(?:to\s+me\s+)?about|tell\s+me\s+about|what(?:'s|\s+is|\s+are)\s+(?:your\s+)?take\s+on|how\s+(?:is|are|do|does|should|can|could)\s+(?:the\s+|my\s+|a\s+)?)\s*/i

const ABOUT_PREFIX = /^(?:about|regarding|re:?)\s+/i

const FINDING_PREFIX = /^i(?:'m| am)\s+finding\s+(?:it\s+|that\s+)?/i

/** Soften question leftovers when the whole prompt is a question. */
const QUESTION_TRIM = /^(?:why|when|where|should|is|are|do|does|did|will|would|could|can)\s+/i

const MAX_LEN = 42

export function sessionTitleFromPrompt(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim()
  if (!t) return 'New session'

  const firstSentence = t.split(/(?<=[.?!])\s+/)[0] ?? t
  t = firstSentence.replace(/[.?!]+$/, '').trim()

  for (let i = 0; i < 3; i++) {
    const next = t
      .replace(FILLER_PREFIX, '')
      .replace(ABOUT_PREFIX, '')
      .replace(FINDING_PREFIX, '')
      .replace(QUESTION_TRIM, '')
    if (next === t) break
    t = next.trim()
  }

  t = t.replace(/^[,:;\-–—]+\s*/, '').trim()
  if (!t) return 'New session'

  t = t.charAt(0).toUpperCase() + t.slice(1)

  if (t.length <= MAX_LEN) return t

  const cut = t.slice(0, MAX_LEN)
  const lastSpace = cut.lastIndexOf(' ')
  const clipped = (lastSpace > 18 ? cut.slice(0, lastSpace) : cut).replace(/[,:;\-–—]+$/, '')
  return `${clipped}…`
}

/**
 * Present a stored title. Older rows used truncated first messages — clean those
 * on read so history stays scannable without a migration.
 */
export function displaySessionTitle(
  title: string | null | undefined,
  fallback = 'New session'
): string {
  const raw = title?.trim()
  if (!raw) return fallback

  const looksLikeDump =
    (raw.endsWith('…') || raw.endsWith('...')) &&
    raw.length > 36 &&
    /^[a-z]/.test(raw)

  if (looksLikeDump) {
    return sessionTitleFromPrompt(raw.replace(/\.{2,3}$|…$/, ''))
  }

  return raw
}
