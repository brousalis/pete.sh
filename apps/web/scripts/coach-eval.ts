/**
 * Eval runner.
 *
 * Runs the golden scenarios against the live model with read-only tools, so a
 * prompt change that loosens a safety behaviour is caught before it reaches
 * the athlete. Read-only matters: an eval must never rewrite the real plan.
 *
 * Usage:
 *   yarn coach:eval                       all scenarios
 *   yarn coach:eval --scenario pain_flare_midweek
 *   yarn coach:eval --tier deep           check the deep model too
 */

import { config as loadEnv } from 'dotenv'

import {
  SCENARIOS,
  evaluateScenario,
  formatEvalReport,
  summariseEval,
  usageFromAiSdk,
  calculateCost,
  type ModelTier,
  type Scenario,
  type ScenarioOutcome,
  type ScenarioResult,
} from '@petehome/coach-core'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

interface Args {
  scenario?: string
  tier: ModelTier
}

function parseArgs(): Args {
  const args: Args = { tier: 'standard' }
  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--scenario') args.scenario = argv[++i]
    else if (argv[i] === '--tier') args.tier = argv[++i] as ModelTier
  }

  return args
}

async function runScenario(scenario: Scenario, tier: ModelTier): Promise<ScenarioResult> {
  const { generateText, stepCountIs } = await import('ai')
  const { anthropic } = await import('@ai-sdk/anthropic')
  const { MODELS } = await import('@petehome/coach-core')

  const { buildCoachContext, buildSystemMessages } = await import(
    '../lib/services/coach/runtime.service'
  )
  const { buildCoachTools } = await import('../lib/services/coach/tools.service')

  const startedAt = Date.now()

  const toolCalls: { name: string; input: unknown }[] = []

  const parts = await buildCoachContext({
    focus: scenario.userMessage,
    budgetTokens: 12_000,
  })

  // Scenario state is injected as a system note rather than written to the
  // database, so an eval run leaves no trace in the real training record.
  const stateNote = buildStateNote(scenario)

  const plan = {
    tier,
    modelId: MODELS[tier].id,
    cacheTtl: '5m' as const,
    maxSteps: 12,
    budgetState: 'normal' as const,
    useTemplateFallback: false,
    contextBudgetTokens: 12_000,
    batchEligible: false,
    reason: 'eval',
  }

  const result = await generateText({
    model: anthropic(MODELS[tier].id),
    messages: [
      ...buildSystemMessages(parts, 'chat', plan),
      ...(stateNote ? [{ role: 'system' as const, content: stateNote }] : []),
      { role: 'user' as const, content: scenario.userMessage },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any,
    // Read-only: an eval must not be able to mutate the plan.
    tools: buildCoachTools({ readOnly: true }),
    stopWhen: stepCountIs(12),
    maxOutputTokens: 2000,
  })

  for (const step of result.steps ?? []) {
    for (const call of step.toolCalls ?? []) {
      toolCalls.push({ name: call.toolName, input: (call as { input?: unknown }).input })
    }
  }

  const outcome: ScenarioOutcome = {
    text: result.text,
    toolCalls,
    // Read-only mode means no plan changes can occur; assertions about
    // guardrails check that none were applied.
    guardrailReports: [],
    planChanged: false,
  }

  const usage = usageFromAiSdk(result.usage, result.providerMetadata as Record<string, unknown>)

  return evaluateScenario(scenario, outcome, {
    costUsd: calculateCost(tier, usage),
    durationMs: Date.now() - startedAt,
  })
}

/**
 * Describe the scenario's hypothetical state to the model.
 *
 * The alternative — writing symptoms into the database — would pollute the
 * real training record and change readiness for the actual athlete.
 */
function buildStateNote(scenario: Scenario): string | null {
  const lines: string[] = []

  if (scenario.state.symptoms?.length) {
    lines.push('Symptoms logged today:')
    for (const symptom of scenario.state.symptoms) {
      const signs = [
        symptom.swelling ? 'swelling' : null,
        symptom.locking ? 'locking' : null,
        symptom.instability ? 'giving way' : null,
      ].filter(Boolean)

      lines.push(
        `  ${symptom.site}: ${symptom.painScore}/10${symptom.context ? ` (${symptom.context})` : ''}${
          signs.length ? ` with ${signs.join(' and ')}` : ''
        }`
      )
    }
  }

  if (scenario.state.acwr != null) {
    lines.push(`Current ACWR: ${scenario.state.acwr}`)
  }

  if (scenario.state.quadSymmetryPassed === false) {
    lines.push('Quad symmetry benchmarks have not been passed; run intensity is gated.')
  }

  if (lines.length === 0) return null

  return `EVALUATION SCENARIO STATE — treat the following as the current situation, overriding anything in the athlete context that conflicts with it:\n${lines.join('\n')}`
}

async function main(): Promise<void> {
  const args = parseArgs()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is required to run evals.')
    process.exit(1)
  }

  const scenarios = args.scenario
    ? SCENARIOS.filter((scenario) => scenario.id === args.scenario)
    : SCENARIOS

  if (scenarios.length === 0) {
    console.error(`No scenario matched "${args.scenario}".`)
    console.error(`Available: ${SCENARIOS.map((s) => s.id).join(', ')}`)
    process.exit(1)
  }

  console.log(`Running ${scenarios.length} scenario(s) on the ${args.tier} model…`)

  const startedAt = Date.now()
  const results: ScenarioResult[] = []

  for (const scenario of scenarios) {
    process.stdout.write(`  ${scenario.id}… `)
    try {
      const result = await runScenario(scenario, args.tier)
      results.push(result)
      console.log(result.passed ? 'pass' : 'FAIL')
    } catch (error) {
      console.log('error')
      console.error(`    ${error instanceof Error ? error.message : error}`)
    }
  }

  const report = summariseEval(results, Date.now() - startedAt)
  console.log(formatEvalReport(report))

  process.exit(report.failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('Eval run failed:', error)
  process.exit(1)
})
