export * from './scenarios'

import type { Scenario, ScenarioOutcome } from './scenarios'

export interface AssertionResult {
  id: string
  description: string
  passed: boolean
  failure: string | null
}

export interface ScenarioResult {
  scenarioId: string
  title: string
  passed: boolean
  assertions: AssertionResult[]
  outcome: ScenarioOutcome
  costUsd: number
  durationMs: number
}

export interface EvalReport {
  results: ScenarioResult[]
  passed: number
  failed: number
  totalCostUsd: number
  durationMs: number
}

/** Run a scenario's assertions against a captured outcome. */
export function evaluateScenario(
  scenario: Scenario,
  outcome: ScenarioOutcome,
  meta: { costUsd: number; durationMs: number }
): ScenarioResult {
  const assertions: AssertionResult[] = scenario.assertions.map((assertion) => {
    const failure = assertion.check(outcome)
    return {
      id: assertion.id,
      description: assertion.description,
      passed: failure === null,
      failure,
    }
  })

  return {
    scenarioId: scenario.id,
    title: scenario.title,
    passed: assertions.every((assertion) => assertion.passed),
    assertions,
    outcome,
    costUsd: meta.costUsd,
    durationMs: meta.durationMs,
  }
}

export function summariseEval(results: ScenarioResult[], durationMs: number): EvalReport {
  return {
    results,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    totalCostUsd: Math.round(results.reduce((sum, r) => sum + r.costUsd, 0) * 1e6) / 1e6,
    durationMs,
  }
}

/** Console report. Failures print the assertion and the coach's reply. */
export function formatEvalReport(report: EvalReport): string {
  const lines: string[] = []

  lines.push('')
  lines.push('PeteCoach evaluation')
  lines.push('='.repeat(60))

  for (const result of report.results) {
    const status = result.passed ? 'PASS' : 'FAIL'
    lines.push('')
    lines.push(`${status}  ${result.title}  ($${result.costUsd.toFixed(4)}, ${result.durationMs}ms)`)

    for (const assertion of result.assertions) {
      const mark = assertion.passed ? '  ok  ' : '  FAIL'
      lines.push(`${mark} ${assertion.description}`)
      if (assertion.failure) lines.push(`        ${assertion.failure}`)
    }

    if (!result.passed) {
      lines.push('')
      lines.push('       Coach reply:')
      for (const line of result.outcome.text.split('\n').slice(0, 12)) {
        lines.push(`       | ${line}`)
      }
      if (result.outcome.toolCalls.length) {
        lines.push(
          `       Tools: ${result.outcome.toolCalls.map((call) => call.name).join(', ')}`
        )
      }
    }
  }

  lines.push('')
  lines.push('='.repeat(60))
  lines.push(
    `${report.passed} passed, ${report.failed} failed  ·  $${report.totalCostUsd.toFixed(4)}  ·  ${Math.round(report.durationMs / 1000)}s`
  )
  lines.push('')

  return lines.join('\n')
}
