/**
 * CostGovernor adapter backed by Supabase.
 *
 * Spend is recorded through the coach_record_spend function rather than a
 * read-modify-write, so two jobs finishing at the same time cannot both slip
 * under the cap.
 */

import type {
  BudgetState,
  BudgetStatus,
  CoachJob,
  CostGovernorAdapter,
  TokenUsage,
} from '@petehome/coach-core'
import { CostGovernor } from '@petehome/coach-core'

import { config } from '@/lib/config'
import { coachDb } from './coach-data.service'

class SupabaseCostAdapter implements CostGovernorAdapter {
  async getBudgetStatus(): Promise<BudgetStatus> {
    const db = coachDb()
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = `${today.slice(0, 7)}-01`

    const { data } = await db
      .from('coach_cost_budget')
      .select('period, period_start, cap_usd, spent_usd, degrade_at_pct')
      .or(`and(period.eq.day,period_start.eq.${today}),and(period.eq.month,period_start.eq.${monthStart})`)

    const rows = (data ?? []) as {
      period: string
      cap_usd: number
      spent_usd: number
      degrade_at_pct: number
    }[]

    const day = rows.find((row) => row.period === 'day')
    const month = rows.find((row) => row.period === 'month')

    const daySpent = Number(day?.spent_usd ?? 0)
    const dayCap = Number(day?.cap_usd ?? config.coach.dailyBudgetUsd)
    const monthSpent = Number(month?.spent_usd ?? 0)
    const monthCap = Number(month?.cap_usd ?? config.coach.monthlyBudgetUsd)
    const degradeAt = Number(day?.degrade_at_pct ?? 80)

    const dayPct = dayCap > 0 ? (daySpent / dayCap) * 100 : 0
    const monthPct = monthCap > 0 ? (monthSpent / monthCap) * 100 : 0

    const state: BudgetStatus['state'] =
      dayPct >= 100 || monthPct >= 100
        ? 'capped'
        : dayPct >= degradeAt || monthPct >= degradeAt
          ? 'degraded'
          : 'normal'

    return { daySpent, dayCap, monthSpent, monthCap, state }
  }

  async recordSpend(costUsd: number): Promise<BudgetStatus> {
    const { data, error } = await coachDb().rpc('coach_record_spend', {
      p_cost: costUsd,
      p_day_cap: config.coach.dailyBudgetUsd,
      p_month_cap: config.coach.monthlyBudgetUsd,
    })

    if (error || !data?.[0]) {
      console.error('[coach] Failed to record spend:', error?.message)
      return this.getBudgetStatus()
    }

    const row = data[0] as {
      day_spent: number
      day_cap: number
      month_spent: number
      month_cap: number
      state: BudgetStatus['state']
    }

    return {
      daySpent: Number(row.day_spent),
      dayCap: Number(row.day_cap),
      monthSpent: Number(row.month_spent),
      monthCap: Number(row.month_cap),
      state: row.state,
    }
  }

  async startRun(input: {
    job: CoachJob
    model: string
    conversationId?: string | null
    budgetState: BudgetState
  }): Promise<string> {
    const { data, error } = await coachDb()
      .from('coach_agent_run')
      .insert({
        job: input.job,
        model: input.model,
        conversation_id: input.conversationId ?? null,
        budget_state: input.budgetState,
        status: 'running',
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to open agent run: ${error.message}`)
    return data.id as string
  }

  async finishRun(
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
  ): Promise<void> {
    const { error } = await coachDb()
      .from('coach_agent_run')
      .update({
        finished_at: new Date().toISOString(),
        duration_ms: input.durationMs,
        input_tokens: input.usage.inputTokens,
        cache_write_tokens: input.usage.cacheWriteTokens,
        cache_read_tokens: input.usage.cacheReadTokens,
        output_tokens: input.usage.outputTokens,
        reasoning_tokens: input.usage.reasoningTokens ?? 0,
        cost_usd: input.costUsd,
        cache_hit_ratio: input.cacheHitRatio,
        tool_trace: input.toolTrace ?? [],
        status: input.status,
        error: input.error ?? null,
      })
      .eq('id', runId)

    if (error) console.error('[coach] Failed to close agent run:', error.message)
  }

  async notify(message: string): Promise<void> {
    // Budget notifications go out through the worker's push channel. Recorded
    // here so they are visible even when the worker is offline.
    console.warn(`[coach][budget] ${message}`)

    try {
      const { sendCoachNotification } = await import('./notify.service')
      await sendCoachNotification({ title: 'petehome budget', body: message, tag: 'budget' })
    } catch {
      // Notification delivery is best-effort.
    }
  }
}

let governor: CostGovernor | null = null

export function getCostGovernor(): CostGovernor {
  if (!governor) governor = new CostGovernor(new SupabaseCostAdapter())
  return governor
}

export interface SpendSummary {
  day: { spent: number; cap: number; pct: number }
  month: { spent: number; cap: number; pct: number }
  projectedMonthEnd: number
  byJob: { job: string; runs: number; costUsd: number; avgCacheHitRatio: number | null }[]
  byModel: { model: string; runs: number; costUsd: number }[]
  state: BudgetStatus['state']
}

/** Spend breakdown for the settings panel and the weekly review. */
export async function getSpendSummary(): Promise<SpendSummary> {
  const db = coachDb()
  const adapter = new SupabaseCostAdapter()
  const status = await adapter.getBudgetStatus()

  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`

  const { data: runs } = await db
    .from('coach_agent_run')
    .select('job, model, cost_usd, cache_hit_ratio')
    .gte('started_at', monthStart)
    .eq('status', 'success')

  const byJob = new Map<string, { runs: number; costUsd: number; ratios: number[] }>()
  const byModel = new Map<string, { runs: number; costUsd: number }>()

  for (const run of (runs ?? []) as {
    job: string
    model: string
    cost_usd: number
    cache_hit_ratio: number | null
  }[]) {
    const jobEntry = byJob.get(run.job) ?? { runs: 0, costUsd: 0, ratios: [] }
    jobEntry.runs++
    jobEntry.costUsd += Number(run.cost_usd)
    if (run.cache_hit_ratio != null) jobEntry.ratios.push(Number(run.cache_hit_ratio))
    byJob.set(run.job, jobEntry)

    const modelEntry = byModel.get(run.model) ?? { runs: 0, costUsd: 0 }
    modelEntry.runs++
    modelEntry.costUsd += Number(run.cost_usd)
    byModel.set(run.model, modelEntry)
  }

  // Straight-line projection from spend so far this month.
  const now = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projectedMonthEnd =
    dayOfMonth > 0 ? (status.monthSpent / dayOfMonth) * daysInMonth : status.monthSpent

  return {
    day: {
      spent: round2(status.daySpent),
      cap: status.dayCap,
      pct: status.dayCap > 0 ? Math.round((status.daySpent / status.dayCap) * 100) : 0,
    },
    month: {
      spent: round2(status.monthSpent),
      cap: status.monthCap,
      pct: status.monthCap > 0 ? Math.round((status.monthSpent / status.monthCap) * 100) : 0,
    },
    projectedMonthEnd: round2(projectedMonthEnd),
    byJob: [...byJob]
      .map(([job, entry]) => ({
        job,
        runs: entry.runs,
        costUsd: round2(entry.costUsd),
        avgCacheHitRatio: entry.ratios.length
          ? Math.round((entry.ratios.reduce((a, b) => a + b, 0) / entry.ratios.length) * 100) / 100
          : null,
      }))
      .sort((a, b) => b.costUsd - a.costUsd),
    byModel: [...byModel]
      .map(([model, entry]) => ({ model, runs: entry.runs, costUsd: round2(entry.costUsd) }))
      .sort((a, b) => b.costUsd - a.costUsd),
    state: status.state,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
