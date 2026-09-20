/**
 * Coach tool registry.
 *
 * Tools are defined here, once, and given their data access by the host
 * (apps/web for chat, apps/coach-worker for scheduled jobs). That means the
 * Sunday planning loop and an ad-hoc chat question have identical capabilities
 * and identical guardrails, which is the whole point of a shared core.
 *
 * Two rules shape every tool below:
 *
 *   Results are bounded. Each one returns a summary sized for a prompt, never
 *   a raw sample series. A single long ride holds thousands of heart rate
 *   points; the model needs the computed numbers, not the samples.
 *
 *   Mutations go through the guardrails. propose_plan_change is the only way
 *   to alter the calendar, and it validates before writing.
 */

import { tool, type Tool } from 'ai'
import { z } from 'zod'

import type { GuardrailReport } from '../types'
import { planProposalSchema } from '../plan/index'

/**
 * Data access the tools require. Implemented by the host application.
 * Every method returns prompt-ready, already-computed values.
 */
export interface CoachToolDeps {
  getAthleteProfile(): Promise<unknown>
  getInjuryStatus(): Promise<unknown>
  queryActivities(input: {
    from?: string
    to?: string
    sports?: string[]
    limit?: number
  }): Promise<unknown>
  getActivityDetail(activityId: string): Promise<unknown>
  getDailyMetrics(input: { days: number }): Promise<unknown>
  getTrainingLoad(input: { days: number }): Promise<unknown>
  getReadiness(input: { date?: string }): Promise<unknown>
  getPlan(input: { from: string; to: string }): Promise<unknown>
  proposePlanChange(proposal: unknown): Promise<{
    applied: boolean
    guardrailReport: GuardrailReport | null
    schemaErrors: string[]
    summary: string
  }>
  logSymptom(input: {
    site: string
    painScore: number
    context?: string
    swelling?: boolean
    instability?: boolean
    locking?: boolean
    notes?: string
  }): Promise<unknown>
  logFeedback(input: {
    sessionId?: string
    rpe?: number
    mood?: number
    energy?: number
    sleepQuality?: number
    maxPain?: number
    notes?: string
  }): Promise<unknown>
  remember(input: {
    content: string
    memoryType: 'fact' | 'preference' | 'episode' | 'insight'
    tags?: string[]
    confidence?: number
  }): Promise<unknown>
  recall(input: { query: string; limit?: number }): Promise<unknown>
  searchKnowledge(input: { query: string; limit?: number }): Promise<unknown>
  searchPubmed(input: { query: string; limit?: number }): Promise<unknown>
  getWeather(input: { date?: string }): Promise<unknown>
  getLakeConditions(): Promise<unknown>
  getCalendar(input: { days: number }): Promise<unknown>
  projectRace(): Promise<unknown>
  computeZones(): Promise<unknown>
  getBenchmarks(input: { testType?: string }): Promise<unknown>
  getGear(): Promise<unknown>
  recommendGear(input: {
    title: string
    category: string
    rationale: string
    estimatedCostUsd?: number
    estimatedSecondsSaved?: number
  }): Promise<unknown>
  getNutritionTargets(input: { date?: string }): Promise<unknown>
  getPtProtocol(): Promise<unknown>
  scheduleReminder(input: { message: string; at: string }): Promise<unknown>
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

/**
 * Build the tool set.
 *
 * `readOnly` drops every mutating tool, which is what the MCP endpoint and
 * the eval harness use so an experiment cannot rewrite the real plan.
 */
export function createCoachTools(
  deps: CoachToolDeps,
  options: { readOnly?: boolean } = {}
): Record<string, Tool> {
  const readTools: Record<string, Tool> = {
    get_athlete_profile: tool({
      description:
        'Physiology, thresholds, weight band and goal race. Use before prescribing paces or zones.',
      inputSchema: z.object({}),
      execute: async () => deps.getAthleteProfile(),
    }),

    get_injury_status: tool({
      description:
        'Current injuries with clinical findings, contraindications, clearance conditions, and recent symptom logs. Check this before proposing any change to training.',
      inputSchema: z.object({}),
      execute: async () => deps.getInjuryStatus(),
    }),

    query_activities: tool({
      description:
        'Completed sessions in a date range, with computed load, zone distribution and decoupling. Returns summaries, not raw samples.',
      inputSchema: z.object({
        from: dateSchema.optional().describe('Start date, defaults to 28 days ago'),
        to: dateSchema.optional().describe('End date, defaults to today'),
        sports: z
          .array(z.enum(['swim', 'bike', 'run', 'strength', 'walk', 'hiit', 'cross', 'other']))
          .optional(),
        limit: z.number().int().min(1).max(100).default(30),
      }),
      execute: async (input) => deps.queryActivities(input),
    }),

    get_activity_detail: tool({
      description:
        'Full analysis of one session: splits, zone time, cardiac drift, swim lengths and SWOLF where available.',
      inputSchema: z.object({ activityId: z.string() }),
      execute: async ({ activityId }) => deps.getActivityDetail(activityId),
    }),

    get_daily_metrics: tool({
      description:
        'Daily health metrics: HRV against baseline, resting heart rate, sleep with stages, respiratory rate, wrist temperature, weight and body composition.',
      inputSchema: z.object({
        days: z.number().int().min(1).max(90).default(14),
      }),
      execute: async (input) => deps.getDailyMetrics(input),
    }),

    get_training_load: tool({
      description:
        'CTL, ATL, TSB, ACWR, monotony and weekly load by sport. These are computed; do not recalculate them.',
      inputSchema: z.object({
        days: z.number().int().min(7).max(365).default(90),
      }),
      execute: async (input) => deps.getTrainingLoad(input),
    }),

    get_readiness: tool({
      description:
        'Readiness score with its component breakdown and flags, plus the recommended training response.',
      inputSchema: z.object({ date: dateSchema.optional() }),
      execute: async (input) => deps.getReadiness(input),
    }),

    get_plan: tool({
      description: 'Scheduled sessions in a date range, with their rationale and guardrail status.',
      inputSchema: z.object({
        from: dateSchema.describe('Start date'),
        to: dateSchema.describe('End date'),
      }),
      execute: async (input) => deps.getPlan(input),
    }),

    recall: tool({
      description:
        'Search what you remember about this athlete: preferences, constraints, what worked, what caused problems.',
      inputSchema: z.object({
        query: z.string().min(2),
        limit: z.number().int().min(1).max(20).default(8),
      }),
      execute: async (input) => deps.recall(input),
    }),

    search_knowledge: tool({
      description:
        'Search the training science library (books, papers, clinical guidelines, the athlete\'s own medical notes). Returns passages with citations. Use this before making a claim about training science.',
      inputSchema: z.object({
        query: z.string().min(3),
        limit: z.number().int().min(1).max(10).default(6),
      }),
      execute: async (input) => deps.searchKnowledge(input),
    }),

    search_pubmed: tool({
      description:
        'Search PubMed for current research. Use when the local library does not cover a question, particularly for injury or clinical topics.',
      inputSchema: z.object({
        query: z.string().min(3),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async (input) => deps.searchPubmed(input),
    }),

    get_weather: tool({
      description:
        'Chicago forecast including wind, which materially changes required power on the Lakefront, plus air quality and daylight.',
      inputSchema: z.object({ date: dateSchema.optional() }),
      execute: async (input) => deps.getWeather(input),
    }),

    get_lake_conditions: tool({
      description:
        'Lake Michigan nearshore water temperature and wetsuit legality, for open-water swim decisions.',
      inputSchema: z.object({}),
      execute: async () => deps.getLakeConditions(),
    }),

    get_calendar: tool({
      description:
        'The athlete\'s calendar, to find schedule conflicts and available training windows before proposing session times.',
      inputSchema: z.object({
        days: z.number().int().min(1).max(30).default(7),
      }),
      execute: async (input) => deps.getCalendar(input),
    }),

    project_race: tool({
      description:
        'Projected finish against the sub-3 split budget, with per-discipline leverage weighed against knee risk.',
      inputSchema: z.object({}),
      execute: async () => deps.projectRace(),
    }),

    compute_zones: tool({
      description: 'Current heart rate, pace and power zones derived from the athlete\'s thresholds.',
      inputSchema: z.object({}),
      execute: async () => deps.computeZones(),
    }),

    get_benchmarks: tool({
      description:
        'Benchmark test history: CSS, FTP, run time trials, and the quad symmetry tests that gate running intensity.',
      inputSchema: z.object({
        testType: z
          .enum(['css', 'ftp_20min', 'run_tt', 'quad_symmetry', 'step_down', 'single_leg_squat'])
          .optional(),
      }),
      execute: async (input) => deps.getBenchmarks(input),
    }),

    get_gear: tool({
      description: 'Gear inventory with accumulated mileage and service intervals.',
      inputSchema: z.object({}),
      execute: async () => deps.getGear(),
    }),

    get_nutrition_targets: tool({
      description:
        'Fuelling targets for a date, periodised to that day\'s training load, plus what was actually logged.',
      inputSchema: z.object({ date: dateSchema.optional() }),
      execute: async (input) => deps.getNutritionTargets(input),
    }),

    get_pt_protocol: tool({
      description:
        'The prescribed physical therapy blocks with their exercises and today\'s completion status. These blocks are mandatory and cannot be removed from the plan.',
      inputSchema: z.object({}),
      execute: async () => deps.getPtProtocol(),
    }),
  }

  if (options.readOnly) return readTools

  const writeTools: Record<string, Tool> = {
    propose_plan_change: tool({
      description:
        'The only way to change the calendar. Every proposal is validated against the Injury Guard before it is written. If it is rejected, read the violation, address the cause, and propose again — do not attempt to work around it.',
      inputSchema: planProposalSchema,
      execute: async (proposal) => deps.proposePlanChange(proposal),
    }),

    log_symptom: tool({
      description:
        'Record a symptom the athlete reports in conversation. Swelling, locking or giving way are mechanical signs and will trigger a red flag.',
      inputSchema: z.object({
        site: z
          .string()
          .describe('e.g. r_knee_medial, l_knee_medial, pes_anserine, hamstring_tendon'),
        painScore: z.number().int().min(0).max(10),
        context: z.enum(['during', 'after', 'next_morning', 'rest']).optional(),
        swelling: z.boolean().default(false),
        instability: z.boolean().default(false),
        locking: z.boolean().default(false),
        notes: z.string().max(500).optional(),
      }),
      execute: async (input) => deps.logSymptom(input),
    }),

    log_feedback: tool({
      description: 'Record session feedback the athlete gives in conversation.',
      inputSchema: z.object({
        sessionId: z.string().uuid().optional(),
        rpe: z.number().int().min(1).max(10).optional(),
        mood: z.number().int().min(1).max(5).optional(),
        energy: z.number().int().min(1).max(5).optional(),
        sleepQuality: z.number().int().min(1).max(5).optional(),
        maxPain: z.number().int().min(0).max(10).optional(),
        notes: z.string().max(1000).optional(),
      }),
      execute: async (input) => deps.logFeedback(input),
    }),

    remember: tool({
      description:
        'Store a durable fact about the athlete: a preference, a constraint, something that worked, something that caused a flare. Do not store transient state that is already in the data, such as today\'s readiness.',
      inputSchema: z.object({
        content: z.string().min(10).max(500),
        memoryType: z.enum(['fact', 'preference', 'episode', 'insight']),
        tags: z.array(z.string()).max(8).default([]),
        confidence: z.number().min(0).max(1).default(0.8),
      }),
      execute: async (input) => deps.remember(input),
    }),

    recommend_gear: tool({
      description:
        'Propose a gear purchase. Justify it in seconds saved over the race against its cost, and be honest when the answer is that training time would buy more.',
      inputSchema: z.object({
        title: z.string().min(3).max(120),
        category: z.enum(['shoes', 'bike', 'component', 'wetsuit', 'sensor', 'apparel', 'other']),
        rationale: z.string().min(20).max(1000),
        estimatedCostUsd: z.number().positive().optional(),
        estimatedSecondsSaved: z.number().int().optional(),
      }),
      execute: async (input) => deps.recommendGear(input),
    }),

    schedule_reminder: tool({
      description: 'Schedule a push notification to the athlete at a specific time.',
      inputSchema: z.object({
        message: z.string().min(5).max(300),
        at: z.string().describe('ISO 8601 timestamp'),
      }),
      execute: async (input) => deps.scheduleReminder(input),
    }),
  }

  return { ...readTools, ...writeTools }
}

/** Tool names, for permission scoping and cost accounting. */
export const READ_TOOL_NAMES = [
  'get_athlete_profile',
  'get_injury_status',
  'query_activities',
  'get_activity_detail',
  'get_daily_metrics',
  'get_training_load',
  'get_readiness',
  'get_plan',
  'recall',
  'search_knowledge',
  'search_pubmed',
  'get_weather',
  'get_lake_conditions',
  'get_calendar',
  'project_race',
  'compute_zones',
  'get_benchmarks',
  'get_gear',
  'get_nutrition_targets',
  'get_pt_protocol',
] as const

export const WRITE_TOOL_NAMES = [
  'propose_plan_change',
  'log_symptom',
  'log_feedback',
  'remember',
  'recommend_gear',
  'schedule_reminder',
] as const
