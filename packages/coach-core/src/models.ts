/**
 * Model registry and pricing.
 *
 * Model IDs are pinned rather than aliased so a provider-side default change
 * can never silently alter coaching behaviour or cost. Prices are USD per
 * million tokens and must be updated together with the IDs.
 */

export type ModelTier = 'deep' | 'standard' | 'fast'

export interface ModelPricing {
  /** USD per million input tokens */
  input: number
  /** USD per million tokens written to a 5-minute cache */
  cacheWrite5m: number
  /** USD per million tokens written to a 1-hour cache */
  cacheWrite1h: number
  /** USD per million tokens read from cache */
  cacheRead: number
  /** USD per million output tokens */
  output: number
}

export interface ModelSpec {
  id: string
  tier: ModelTier
  label: string
  contextWindow: number
  maxOutputTokens: number
  supportsCaching: boolean
  pricing: ModelPricing
}

export const MODELS = {
  deep: {
    id: 'claude-opus-5',
    tier: 'deep',
    label: 'Claude Opus 5',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    supportsCaching: true,
    pricing: {
      input: 5,
      cacheWrite5m: 6.25,
      cacheWrite1h: 10,
      cacheRead: 0.5,
      output: 25,
    },
  },
  standard: {
    id: 'claude-sonnet-5',
    tier: 'standard',
    label: 'Claude Sonnet 5',
    contextWindow: 1_000_000,
    maxOutputTokens: 16_000,
    supportsCaching: true,
    pricing: {
      input: 2,
      cacheWrite5m: 2.5,
      cacheWrite1h: 4,
      cacheRead: 0.2,
      output: 10,
    },
  },
  fast: {
    id: 'claude-haiku-4-5',
    tier: 'fast',
    label: 'Claude Haiku 4.5',
    contextWindow: 200_000,
    maxOutputTokens: 8_000,
    supportsCaching: true,
    pricing: {
      input: 1,
      cacheWrite5m: 1.25,
      cacheWrite1h: 2,
      cacheRead: 0.1,
      output: 5,
    },
  },
} as const satisfies Record<ModelTier, ModelSpec>

/** Jobs the coach runs, each with a default tier and cache policy. */
export type CoachJob =
  | 'chat'
  | 'briefing'
  | 'debrief'
  | 'weekly_plan'
  | 'block_review'
  | 'injury_review'
  | 'race_projection'
  | 'digest'
  | 'journal'
  | 'intake'
  | 'eval'
  | 'fuel_estimate'

export interface JobPolicy {
  tier: ModelTier
  /**
   * Cache TTL for the stable system prefix. Jobs that fire in clusters (a
   * briefing followed by debriefs) reuse a 1-hour cache; interactive chat uses
   * the cheaper 5-minute write since turns arrive seconds apart.
   */
  cacheTtl: '5m' | '1h'
  /** Exempt from budget caps — safety paths must never be silenced by cost. */
  budgetExempt: boolean
  /** Eligible for the 50%-off Batch API (non-interactive only). */
  batchEligible: boolean
  maxSteps: number
}

export const JOB_POLICIES = {
  chat: { tier: 'standard', cacheTtl: '5m', budgetExempt: false, batchEligible: false, maxSteps: 12 },
  briefing: { tier: 'standard', cacheTtl: '1h', budgetExempt: false, batchEligible: false, maxSteps: 8 },
  debrief: { tier: 'standard', cacheTtl: '1h', budgetExempt: false, batchEligible: false, maxSteps: 8 },
  weekly_plan: { tier: 'deep', cacheTtl: '1h', budgetExempt: false, batchEligible: false, maxSteps: 24 },
  block_review: { tier: 'deep', cacheTtl: '1h', budgetExempt: false, batchEligible: false, maxSteps: 20 },
  // Injury reasoning is a safety path: never downgrade, never cap.
  injury_review: { tier: 'deep', cacheTtl: '5m', budgetExempt: true, batchEligible: false, maxSteps: 16 },
  race_projection: { tier: 'standard', cacheTtl: '1h', budgetExempt: false, batchEligible: false, maxSteps: 8 },
  digest: { tier: 'fast', cacheTtl: '5m', budgetExempt: false, batchEligible: true, maxSteps: 2 },
  journal: { tier: 'standard', cacheTtl: '1h', budgetExempt: false, batchEligible: true, maxSteps: 4 },
  intake: { tier: 'deep', cacheTtl: '5m', budgetExempt: false, batchEligible: false, maxSteps: 16 },
  eval: { tier: 'standard', cacheTtl: '5m', budgetExempt: false, batchEligible: true, maxSteps: 12 },
  // Tiny isolated meal estimate — never attach coach context.
  fuel_estimate: { tier: 'fast', cacheTtl: '5m', budgetExempt: false, batchEligible: false, maxSteps: 1 },
} as const satisfies Record<CoachJob, JobPolicy>

export function getModel(tier: ModelTier): ModelSpec {
  return MODELS[tier]
}

/** One step down the tier ladder, used when the budget governor degrades. */
export function downgradeTier(tier: ModelTier): ModelTier {
  if (tier === 'deep') return 'standard'
  if (tier === 'standard') return 'fast'
  return 'fast'
}

export interface TokenUsage {
  inputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
  outputTokens: number
  reasoningTokens?: number
}

export function emptyUsage(): TokenUsage {
  return { inputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 0, reasoningTokens: 0 }
}

/** Cost in USD for a single call. Output tokens include reasoning tokens. */
export function calculateCost(
  tier: ModelTier,
  usage: TokenUsage,
  cacheTtl: '5m' | '1h' = '5m'
): number {
  const { pricing } = MODELS[tier]
  const perMillion = 1_000_000

  const cacheWriteRate = cacheTtl === '1h' ? pricing.cacheWrite1h : pricing.cacheWrite5m

  const cost =
    (usage.inputTokens * pricing.input +
      usage.cacheWriteTokens * cacheWriteRate +
      usage.cacheReadTokens * pricing.cacheRead +
      (usage.outputTokens + (usage.reasoningTokens ?? 0)) * pricing.output) /
    perMillion

  // Round to the sixth decimal, matching the DECIMAL(10,6) column.
  return Math.round(cost * 1_000_000) / 1_000_000
}

/**
 * Share of prompt tokens served from cache. A sustained value below ~0.7 on
 * chat means the stable prefix is being invalidated and cost will climb.
 */
export function cacheHitRatio(usage: TokenUsage): number | null {
  const promptTokens = usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
  if (promptTokens === 0) return null
  return Math.round((usage.cacheReadTokens / promptTokens) * 10_000) / 10_000
}
