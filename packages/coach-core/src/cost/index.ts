/**
 * Cost governance.
 *
 * Target is roughly $50/month, ceiling $100. Every model call goes through
 * `CostGovernor.run`, which decides the model before the call and records the
 * spend after it.
 *
 * The important design decision is degrade-not-fail: when a budget is
 * exhausted the coach drops to a cheaper model and a smaller context, and
 * finally to templated output from the analytics layer. It never silently
 * stops working. Safety paths — injury review and same-day downgrades — are
 * exempt from caps entirely, because a cost ceiling must never be the reason
 * a knee warning goes unsent.
 */

import {
  JOB_POLICIES,
  MODELS,
  calculateCost,
  cacheHitRatio,
  downgradeTier,
  emptyUsage,
  type CoachJob,
  type ModelTier,
  type TokenUsage,
} from '../models'

export type BudgetState = 'normal' | 'degraded' | 'capped' | 'exempt'

export interface BudgetStatus {
  daySpent: number
  dayCap: number
  monthSpent: number
  monthCap: number
  state: Exclude<BudgetState, 'exempt'>
}

export interface CostGovernorAdapter {
  /** Current spend without recording anything. */
  getBudgetStatus(): Promise<BudgetStatus>
  /** Atomically add spend and return the resulting state. */
  recordSpend(costUsd: number): Promise<BudgetStatus>
  /** Open an agent run row; returns its id. */
  startRun(input: {
    job: CoachJob
    model: string
    conversationId?: string | null
    budgetState: BudgetState
  }): Promise<string>
  /** Close the run with usage and cost. */
  finishRun(
    runId: string,
    input: {
      usage: TokenUsage
      costUsd: number
      cacheHitRatio: number | null
      durationMs: number
      status: 'success' | 'error'
      error?: string
      toolTrace?: unknown[]
    }
  ): Promise<void>
  /** Notify when a cap threshold is crossed. Optional. */
  notify?(message: string): Promise<void>
}

export interface ResolvedPlan {
  tier: ModelTier
  modelId: string
  cacheTtl: '5m' | '1h'
  maxSteps: number
  budgetState: BudgetState
  /**
   * Whether the caller should skip the model entirely and emit a templated
   * response from deterministic analytics.
   */
  useTemplateFallback: boolean
  /** Reduce context when degraded, so a cheaper model still fits its job. */
  contextBudgetTokens: number
  batchEligible: boolean
  reason: string
}

const FULL_CONTEXT_TOKENS = 12_000
const DEGRADED_CONTEXT_TOKENS = 5_000

export interface RunOptions<T> {
  job: CoachJob
  conversationId?: string | null
  /** Promote a single chat thread to the deep tier on demand. */
  deepMode?: boolean
  /** Force a tier, used by evals. */
  forceTier?: ModelTier
  execute: (plan: ResolvedPlan) => Promise<{ result: T; usage: TokenUsage; toolTrace?: unknown[] }>
  /** Produce a response without a model call when the budget is exhausted. */
  templateFallback?: () => Promise<T> | T
}

export interface RunResult<T> {
  result: T
  plan: ResolvedPlan
  usage: TokenUsage
  costUsd: number
  runId: string | null
}

export class CostGovernor {
  constructor(private readonly adapter: CostGovernorAdapter) {}

  /**
   * Choose model, cache policy and context size for a job given the budget.
   */
  async resolvePlan(
    job: CoachJob,
    options: { deepMode?: boolean; forceTier?: ModelTier } = {}
  ): Promise<ResolvedPlan> {
    const policy = JOB_POLICIES[job]

    if (policy.budgetExempt) {
      const tier = options.forceTier ?? policy.tier
      return {
        tier,
        modelId: MODELS[tier].id,
        cacheTtl: policy.cacheTtl,
        maxSteps: policy.maxSteps,
        budgetState: 'exempt',
        useTemplateFallback: false,
        contextBudgetTokens: FULL_CONTEXT_TOKENS,
        batchEligible: policy.batchEligible,
        reason: 'Safety-critical job; exempt from budget limits.',
      }
    }

    const status = await this.adapter.getBudgetStatus()

    let tier = options.forceTier ?? policy.tier
    // Deep mode promotes chat for one thread, then reverts automatically
    // because it is passed per call rather than stored.
    if (options.deepMode && !options.forceTier) tier = 'deep'

    if (status.state === 'capped') {
      return {
        tier: 'fast',
        modelId: MODELS.fast.id,
        cacheTtl: policy.cacheTtl,
        maxSteps: Math.min(policy.maxSteps, 4),
        budgetState: 'capped',
        useTemplateFallback: true,
        contextBudgetTokens: DEGRADED_CONTEXT_TOKENS,
        batchEligible: policy.batchEligible,
        reason: `Budget exhausted (day $${status.daySpent.toFixed(2)}/$${status.dayCap.toFixed(2)}, month $${status.monthSpent.toFixed(2)}/$${status.monthCap.toFixed(2)}).`,
      }
    }

    if (status.state === 'degraded') {
      const degraded = options.deepMode ? tier : downgradeTier(tier)
      return {
        tier: degraded,
        modelId: MODELS[degraded].id,
        cacheTtl: policy.cacheTtl,
        maxSteps: Math.min(policy.maxSteps, 8),
        budgetState: 'degraded',
        useTemplateFallback: false,
        contextBudgetTokens: DEGRADED_CONTEXT_TOKENS,
        batchEligible: policy.batchEligible,
        reason: `Budget at ${Math.round((status.daySpent / status.dayCap) * 100)}% of the daily cap; using a smaller model and tighter context.`,
      }
    }

    return {
      tier,
      modelId: MODELS[tier].id,
      cacheTtl: policy.cacheTtl,
      maxSteps: policy.maxSteps,
      budgetState: 'normal',
      useTemplateFallback: false,
      contextBudgetTokens: FULL_CONTEXT_TOKENS,
      batchEligible: policy.batchEligible,
      reason: options.deepMode ? 'Deep mode requested for this thread.' : 'Within budget.',
    }
  }

  /**
   * Execute a model call with accounting, degradation and fallback.
   */
  async run<T>(options: RunOptions<T>): Promise<RunResult<T>> {
    const plan = await this.resolvePlan(options.job, {
      deepMode: options.deepMode,
      forceTier: options.forceTier,
    })

    if (plan.useTemplateFallback && options.templateFallback) {
      const result = await options.templateFallback()
      return { result, plan, usage: emptyUsage(), costUsd: 0, runId: null }
    }

    const runId = await this.adapter.startRun({
      job: options.job,
      model: plan.modelId,
      conversationId: options.conversationId ?? null,
      budgetState: plan.budgetState,
    })

    const startedAt = Date.now()

    try {
      const { result, usage, toolTrace } = await options.execute(plan)
      const costUsd = calculateCost(plan.tier, usage, plan.cacheTtl)

      await this.adapter.finishRun(runId, {
        usage,
        costUsd,
        cacheHitRatio: cacheHitRatio(usage),
        durationMs: Date.now() - startedAt,
        status: 'success',
        toolTrace,
      })

      if (plan.budgetState !== 'exempt') {
        const status = await this.adapter.recordSpend(costUsd)
        await this.maybeNotify(status)
      }

      return { result, plan, usage, costUsd, runId }
    } catch (error) {
      await this.adapter.finishRun(runId, {
        usage: emptyUsage(),
        costUsd: 0,
        cacheHitRatio: null,
        durationMs: Date.now() - startedAt,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Accounting for a streaming call.
   *
   * Streaming inverts the normal flow: the response starts before usage is
   * known, so the run is opened up front and settled from the stream's finish
   * event. Returns a `settle` callback rather than exposing the adapter.
   */
  async beginStreamingRun(input: {
    job: CoachJob
    plan: ResolvedPlan
    conversationId?: string | null
  }): Promise<{
    runId: string
    settle: (outcome: {
      usage: TokenUsage
      toolTrace?: unknown[]
      error?: string
    }) => Promise<number>
  }> {
    const startedAt = Date.now()
    const runId = await this.adapter.startRun({
      job: input.job,
      model: input.plan.modelId,
      conversationId: input.conversationId ?? null,
      budgetState: input.plan.budgetState,
    })

    const settle = async (outcome: {
      usage: TokenUsage
      toolTrace?: unknown[]
      error?: string
    }): Promise<number> => {
      const costUsd = outcome.error
        ? 0
        : calculateCost(input.plan.tier, outcome.usage, input.plan.cacheTtl)

      await this.adapter.finishRun(runId, {
        usage: outcome.usage,
        costUsd,
        cacheHitRatio: cacheHitRatio(outcome.usage),
        durationMs: Date.now() - startedAt,
        status: outcome.error ? 'error' : 'success',
        error: outcome.error,
        toolTrace: outcome.toolTrace,
      })

      if (!outcome.error && input.plan.budgetState !== 'exempt') {
        const status = await this.adapter.recordSpend(costUsd)
        await this.maybeNotify(status)
      }

      return costUsd
    }

    return { runId, settle }
  }

  private async maybeNotify(status: BudgetStatus): Promise<void> {
    if (!this.adapter.notify) return

    const dayPct = status.dayCap > 0 ? (status.daySpent / status.dayCap) * 100 : 0
    const monthPct = status.monthCap > 0 ? (status.monthSpent / status.monthCap) * 100 : 0

    if (dayPct >= 100 || monthPct >= 100) {
      await this.adapter.notify(
        `petehome budget reached: $${status.daySpent.toFixed(2)} today, $${status.monthSpent.toFixed(2)} this month. Running in templated mode until it resets.`
      )
    } else if (dayPct >= 80 || monthPct >= 80) {
      await this.adapter.notify(
        `petehome at ${Math.round(Math.max(dayPct, monthPct))}% of budget ($${status.daySpent.toFixed(2)} today, $${status.monthSpent.toFixed(2)} this month). Downgrading models.`
      )
    }
  }
}

/**
 * Normalise AI SDK usage into the shape the pricing table expects.
 *
 * Provider metadata is where Anthropic reports cache reads and writes; without
 * pulling them out, cached tokens get billed at the full input rate in our
 * accounting and the reported cost drifts high while the real bill drifts low.
 */
export function usageFromAiSdk(
  usage: {
    inputTokens?: number
    outputTokens?: number
    reasoningTokens?: number
    cachedInputTokens?: number
  } | undefined,
  providerMetadata?: Record<string, unknown>
): TokenUsage {
  const anthropic = (providerMetadata?.anthropic ?? {}) as {
    cacheCreationInputTokens?: number
    cacheReadInputTokens?: number
  }

  const cacheWrite = anthropic.cacheCreationInputTokens ?? 0
  const cacheRead = anthropic.cacheReadInputTokens ?? usage?.cachedInputTokens ?? 0

  // The SDK's inputTokens already excludes cached tokens on Anthropic.
  const input = Math.max(0, usage?.inputTokens ?? 0)

  return {
    inputTokens: input,
    cacheWriteTokens: cacheWrite,
    cacheReadTokens: cacheRead,
    outputTokens: usage?.outputTokens ?? 0,
    reasoningTokens: usage?.reasoningTokens ?? 0,
  }
}

/**
 * Rough token estimate for context budgeting.
 *
 * Only used to decide what to include in a prompt, never for billing, so an
 * approximation is fine. Errs slightly high so budgets are not exceeded.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.6)
}

/**
 * Trim a list of context sections to a token budget, keeping the highest
 * priority ones. Sections are assumed to be pre-sorted by importance.
 */
export function fitToBudget(
  sections: { title: string; content: string; priority: number }[],
  budgetTokens: number
): { included: typeof sections; droppedTitles: string[]; usedTokens: number } {
  const ordered = [...sections].sort((a, b) => a.priority - b.priority)
  const included: typeof sections = []
  const droppedTitles: string[] = []
  let used = 0

  for (const section of ordered) {
    const cost = estimateTokens(section.content)
    if (used + cost <= budgetTokens) {
      included.push(section)
      used += cost
    } else {
      droppedTitles.push(section.title)
    }
  }

  return { included, droppedTitles, usedTokens: used }
}
