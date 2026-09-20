/**
 * Coach runtime.
 *
 * Assembles the prompt, resolves the model through the cost governor, and
 * runs the call. Shared by chat, the scheduled jobs and the eval harness so
 * every surface gets the same coach.
 *
 * The prompt is deliberately split in two: a stable prefix marked for
 * Anthropic prompt caching, and volatile athlete context appended after it.
 * The previous implementation sent one 15–35k-token block with no caching on
 * every turn; separating them is the single largest cost lever in the system.
 */

import { anthropic } from '@ai-sdk/anthropic'
import {
  assembleContext,
  buildSystemPrefix,
  daysAgo,
  formatTime,
  JOB_INSTRUCTIONS,
  usageFromAiSdk,
  type AssembleInput,
  type CoachJob,
  type ResolvedPlan,
} from '@petehome/coach-core'

import {
  computeAndStoreReadiness,
  getLoadSummary,
  getRaceProjection,
  resolveThresholds,
} from './analytics.service'
import {
  coachDb,
  getActiveInjuries,
  getAthleteProfile,
  getCurrentBlock,
  getDailyMetrics,
  getMacrocycle,
  getPtProtocols,
  getSessionsInRange,
  getSymptoms,
  queryActivities,
} from './coach-data.service'
import { getCostGovernor } from './cost.service'
import { getLakeConditions, getWeatherContext } from './environment.service'
import { searchKnowledge } from './knowledge.service'
import { recall } from './memory.service'

export interface CoachContextOptions {
  /** Seeds memory and knowledge retrieval; usually the athlete's message. */
  focus?: string
  includeKnowledge?: boolean
  includeEnvironment?: boolean
  conversationSummary?: string | null
  budgetTokens?: number
}

export interface CoachPromptParts {
  /** Cached prefix: identity, guardrails, tool policy. */
  systemPrefix: string
  /** Volatile athlete context. */
  context: string
  usedTokens: number
  droppedSections: string[]
}

/**
 * Gather everything the coach needs to know right now.
 *
 * Runs the independent reads in parallel: serially this would take several
 * seconds and it sits in front of every chat turn.
 */
export async function buildCoachContext(
  options: CoachContextOptions = {}
): Promise<CoachPromptParts> {
  const today = new Date().toISOString().slice(0, 10)
  const budget = options.budgetTokens ?? 12_000

  const [
    profile,
    thresholds,
    injuries,
    symptoms,
    block,
    macrocycle,
    sessions,
    activities,
    metrics,
    load,
    protocols,
  ] = await Promise.all([
    getAthleteProfile(),
    resolveThresholds(),
    getActiveInjuries(),
    getSymptoms(daysAgo(21)),
    getCurrentBlock(),
    getMacrocycle(),
    getSessionsInRange(today, daysAgo(-14)),
    queryActivities({ from: daysAgo(14), limit: 40 }),
    getDailyMetrics(daysAgo(21), today),
    getLoadSummary(90),
    getPtProtocols(),
  ])

  // These can fail independently without breaking the turn.
  const [readiness, projection, weather, lake, memories, knowledge, ptCompletions] =
    await Promise.all([
      computeAndStoreReadiness(today).catch(() => null),
      getRaceProjection().catch(() => null),
      options.includeEnvironment !== false ? getWeatherContext(today).catch(() => null) : null,
      options.includeEnvironment !== false ? getLakeConditions().catch(() => null) : null,
      options.focus ? recall(options.focus, 8).catch(() => []) : [],
      options.focus && options.includeKnowledge !== false
        ? searchKnowledge(options.focus, 4).catch(() => [])
        : [],
      (async () => {
        try {
          const { data } = await coachDb()
            .from('coach_pt_completion')
            .select('protocol_id, skipped')
            .eq('completed_date', today)
          return (data ?? null) as { protocol_id: string; skipped: boolean }[] | null
        } catch {
          return null
        }
      })(),
    ])

  const completedProtocolIds = new Set(
    (ptCompletions ?? []).filter((row) => !row.skipped).map((row) => row.protocol_id)
  )

  const age = profile?.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 86_400_000))
    : null

  const daysToRace = macrocycle
    ? Math.max(
        0,
        Math.round(
          (new Date(`${macrocycle.goalRaceDate}T00:00:00Z`).getTime() - Date.now()) / 86_400_000
        )
      )
    : null

  const latestWeight = [...metrics]
    .reverse()
    .find((metric) => metric.bodyMassLbs != null)?.bodyMassLbs

  const input: AssembleInput = {
    athlete: {
      name: profile?.name ?? 'Athlete',
      age,
      heightCm: profile?.heightCm ?? null,
      currentWeightLbs: latestWeight ?? null,
      weightBand:
        profile?.weightTargetLowLbs != null && profile?.weightTargetHighLbs != null
          ? [profile.weightTargetLowLbs, profile.weightTargetHighLbs]
          : null,
      maxHr: profile?.maxHr ?? null,
      restingHr: profile?.restingHrBaseline ?? null,
      lthr: thresholds.lthr,
      cssPacePer100yd: profile?.cssPacePer100yd ?? null,
      vdot: thresholds.vdot,
      ftpWatts: thresholds.ftpWatts,
      goalRace: macrocycle?.name ?? profile?.goalRaceName ?? null,
      goalDate: macrocycle?.goalRaceDate ?? profile?.goalRaceDate ?? null,
      goalTimeSeconds: macrocycle?.goalTimeSeconds ?? profile?.goalTimeSeconds ?? null,
      daysToRace,
    },
    injuries,
    recentSymptoms: symptoms,
    block: block
      ? {
          name: block.name,
          phase: block.phase,
          blockNumber: block.blockNumber,
          weekInBlock: weekIndex(block.startDate, today),
          totalWeeks: weekSpan(block.startDate, block.endDate),
          goals: block.goals,
        }
      : null,
    upcomingSessions: sessions,
    recentActivities: activities,
    recentMetrics: metrics,
    readiness,
    load: {
      ctl: load.current?.ctl ?? null,
      atl: load.current?.atl ?? null,
      tsb: load.current?.tsb ?? null,
      acwr: load.acwr,
      monotony: load.monotony,
      weeklyTss: load.weeklyTss,
      weeklyTssBySport: load.weeklyTssBySport as Record<string, number>,
    },
    projection,
    environment: weather
      ? {
          weatherSummary: weather.summary,
          temperatureF: weather.temperatureF ?? undefined,
          windMph: weather.windMph ?? undefined,
          precipitationChance: weather.precipitationChance ?? undefined,
          airQuality: weather.airQuality ?? undefined,
          lakeTempF: lake?.waterTempF ?? undefined,
          sunrise: weather.sunrise ?? undefined,
          sunset: weather.sunset ?? undefined,
          alerts: [...weather.alerts, ...weather.trainingNotes],
        }
      : null,
    memories: memories.map((memory) => ({
      content: memory.content,
      memoryType: memory.memoryType,
      tags: memory.tags,
    })),
    knowledge: knowledge.map((result) => ({
      title: result.title,
      citation: result.citation,
      heading: result.heading,
      content: result.content.slice(0, 900),
    })),
    conversationSummary: options.conversationSummary ?? null,
    ptProtocols: protocols.map((protocol) => ({
      name: protocol.name,
      timeOfDay: protocol.timeOfDay,
      itemCount: protocol.items.length,
      completedToday: completedProtocolIds.has(protocol.id),
    })),
    today,
  }

  const assembled = assembleContext(input, budget)

  return {
    systemPrefix: buildSystemPrefix({ includeTools: true }),
    context: assembled.content,
    usedTokens: assembled.usedTokens,
    droppedSections: assembled.droppedSections,
  }
}

/**
 * System messages for the AI SDK, with the stable prefix cache-marked.
 *
 * The prefix is identical on every call, so after the first write each
 * subsequent turn reads it at a tenth of the input price.
 */
export function buildSystemMessages(
  parts: CoachPromptParts,
  job: CoachJob,
  plan: ResolvedPlan
): { role: 'system'; content: string; providerOptions?: Record<string, unknown> }[] {
  const messages: { role: 'system'; content: string; providerOptions?: Record<string, unknown> }[] = [
    {
      role: 'system',
      content: parts.systemPrefix,
      providerOptions: {
        anthropic: {
          cacheControl: { type: 'ephemeral', ttl: plan.cacheTtl === '1h' ? '1h' : '5m' },
        },
      },
    },
    { role: 'system', content: parts.context },
  ]

  const instruction = JOB_INSTRUCTIONS[job]
  if (instruction) messages.push({ role: 'system', content: instruction })

  return messages
}

export function resolveModel(plan: ResolvedPlan) {
  return anthropic(plan.modelId)
}

// ---------------------------------------------------------------------------
// Non-streaming job runner
// ---------------------------------------------------------------------------

export interface RunJobOptions {
  job: CoachJob
  prompt: string
  focus?: string
  conversationId?: string
  deepMode?: boolean
  maxOutputTokens?: number
  /** Templated output used when the budget is exhausted. */
  templateFallback?: () => Promise<string> | string
}

export interface RunJobResult {
  text: string
  job: CoachJob
  model: string
  costUsd: number
  budgetState: string
  droppedSections: string[]
  usedTemplate: boolean
}

/**
 * Run a non-interactive coaching job: briefing, debrief, block review.
 */
export async function runCoachJob(options: RunJobOptions): Promise<RunJobResult> {
  const { generateText, stepCountIs } = await import('ai')
  const { buildCoachTools } = await import('./tools.service')

  const governor = getCostGovernor()
  let usedTemplate = false
  let droppedSections: string[] = []

  const run = await governor.run<string>({
    job: options.job,
    conversationId: options.conversationId,
    deepMode: options.deepMode,
    templateFallback: options.templateFallback
      ? async () => {
          usedTemplate = true
          return options.templateFallback!()
        }
      : undefined,
    execute: async (plan) => {
      const parts = await buildCoachContext({
        focus: options.focus ?? options.prompt,
        budgetTokens: plan.contextBudgetTokens,
        includeKnowledge: plan.budgetState === 'normal',
      })
      droppedSections = parts.droppedSections

      const result = await generateText({
        model: resolveModel(plan),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: [...buildSystemMessages(parts, options.job, plan), { role: 'user', content: options.prompt }] as any,
        tools: buildCoachTools(),
        stopWhen: stepCountIs(plan.maxSteps),
        maxOutputTokens: options.maxOutputTokens ?? 4000,
      })

      return {
        result: result.text,
        usage: usageFromAiSdk(result.usage, result.providerMetadata as Record<string, unknown>),
        toolTrace: result.steps?.flatMap((step) =>
          step.toolCalls?.map((call) => ({ tool: call.toolName })) ?? []
        ),
      }
    },
  })

  return {
    text: run.result,
    job: options.job,
    model: run.plan.modelId,
    costUsd: run.costUsd,
    budgetState: run.plan.budgetState,
    droppedSections,
    usedTemplate,
  }
}

// ---------------------------------------------------------------------------

function weekIndex(startDate: string, today: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime()
  const now = new Date(`${today}T00:00:00Z`).getTime()
  return Math.max(1, Math.floor((now - start) / (7 * 86_400_000)) + 1)
}

function weekSpan(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime()
  const end = new Date(`${endDate}T00:00:00Z`).getTime()
  return Math.max(1, Math.round((end - start) / (7 * 86_400_000)))
}

export { formatTime }
