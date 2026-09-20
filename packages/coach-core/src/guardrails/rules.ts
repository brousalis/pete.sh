/**
 * Injury Guard ruleset.
 *
 * Health outranks the sub-3 goal, so these rules run deterministically before
 * and after the model rather than being written into a prompt the model can
 * talk itself out of. Every rule is versioned and carries its clinical
 * rationale, because these are the constraints to review with the PT and
 * sports MD — not implementation details.
 *
 * Severity ladder:
 *   info     recorded, no change
 *   warn     allowed, surfaced to the athlete
 *   block    the proposed session is rejected and must be replaced
 *   red_flag stop training and contact a clinician
 */

import type { GuardrailSeverity, SessionType, Sport } from '../types'

export const RULESET_VERSION = '2026.09.1'

export interface RuleDefinition {
  id: string
  category: 'pain' | 'progression' | 'load' | 'recovery' | 'technique' | 'protocol'
  severity: GuardrailSeverity
  summary: string
  /** Why this exists clinically. Shown in the UI and in prompts. */
  rationale: string
  /** Numeric parameters, kept separate so they can be tuned without code changes. */
  params?: Record<string, number>
}

export const RULES: RuleDefinition[] = [
  // --- Pain -------------------------------------------------------------
  {
    id: 'pain.mechanical_red_flag',
    category: 'pain',
    severity: 'red_flag',
    summary: 'Swelling, locking or giving way stops training immediately.',
    rationale:
      'These are mechanical signs, not soreness. With existing medial patellar cartilage wear and a Baker\'s cyst, they warrant clinical review before any further loading.',
  },
  {
    id: 'pain.severe',
    category: 'pain',
    severity: 'red_flag',
    summary: 'Pain of 6/10 or higher holds all impact for 72 hours.',
    rationale:
      'Pain at this level during a graded return indicates the tissue was loaded beyond its current tolerance. The 72-hour window covers the delayed-onset response.',
    params: { threshold: 6, holdHours: 72 },
  },
  {
    id: 'pain.moderate_blocks_impact',
    category: 'pain',
    severity: 'block',
    summary: 'Pain of 4/10 or higher blocks running for the day.',
    rationale:
      'The PT threshold for stopping and reassessing. Swimming and high-cadence spinning stay available, so the aerobic stimulus is kept without loading the knee.',
    params: { threshold: 4 },
  },
  {
    id: 'pain.trend_rising',
    category: 'pain',
    severity: 'warn',
    summary: 'Pain rising across three consecutive sessions.',
    rationale:
      'A slow upward drift is how the original injury developed. Catching the trend is more useful than reacting to any single day.',
    params: { sessions: 3 },
  },

  // --- Return-to-run progression ----------------------------------------
  {
    id: 'progression.run_spacing',
    category: 'progression',
    severity: 'block',
    summary: 'At least 48 hours between runs for the first six weeks.',
    rationale:
      'Cartilage and tendon adapt more slowly than the cardiovascular system. Spacing gives the medial compartment time to respond before it is loaded again.',
    params: { minHours: 48, weeks: 6 },
  },
  {
    id: 'progression.weekly_run_volume',
    category: 'progression',
    severity: 'block',
    summary: 'Weekly running volume may not rise more than 10%.',
    rationale:
      'The standard progression limit, and the one that was breached before the injury: a 7-mile PR run followed by a 40-mile ride the next week.',
    params: { maxIncreasePct: 10 },
  },
  {
    id: 'progression.long_run_step',
    category: 'progression',
    severity: 'block',
    summary: 'The long run may not grow by more than one mile per week.',
    rationale:
      'Weekly percentage limits still allow a large single-session jump. The long run is where that risk concentrates.',
    params: { maxIncreaseMiles: 1 },
  },
  {
    id: 'progression.intensity_gate',
    category: 'progression',
    severity: 'block',
    summary: 'No running intensity until quad symmetry benchmarks pass.',
    rationale:
      'The MRI remedy for the cartilage wear is quad strength. Intervals before the quad can absorb load puts it through the patellofemoral joint instead.',
    params: { maxAsymmetryPct: 10 },
  },
  {
    id: 'progression.order',
    category: 'progression',
    severity: 'warn',
    summary: 'Progress frequency, then duration, then intensity.',
    rationale:
      'Standard return-to-run sequencing. Advancing two variables in the same week makes it impossible to tell which one caused a flare.',
  },

  // --- Load -------------------------------------------------------------
  {
    id: 'load.acwr_ceiling',
    category: 'load',
    severity: 'block',
    summary: 'Acute:chronic workload ratio must stay at or below 1.3.',
    rationale:
      'Above roughly 1.5 injury risk rises sharply. 1.3 is the working ceiling for an athlete already managing a knee.',
    params: { max: 1.3, hardMax: 1.5 },
  },
  {
    id: 'load.acwr_floor',
    category: 'load',
    severity: 'info',
    summary: 'An ACWR below 0.8 means fitness is being lost.',
    rationale:
      'Detraining is also a risk: it lowers the load the tissue can tolerate when training resumes.',
    params: { min: 0.8 },
  },
  {
    id: 'load.monotony',
    category: 'load',
    severity: 'warn',
    summary: 'Weekly monotony should stay below 2.0.',
    rationale:
      'Uniform daily load is associated with illness and overreaching even at modest volume. Hard days must be hard and easy days genuinely easy.',
    params: { max: 2.0 },
  },
  {
    id: 'load.rest_day',
    category: 'load',
    severity: 'block',
    summary: 'At least one full rest day every seven days.',
    rationale:
      'Non-negotiable during a return from injury, and the point at which connective tissue does most of its remodelling.',
  },
  {
    id: 'load.back_to_back_intensity',
    category: 'load',
    severity: 'block',
    summary: 'No two high-intensity days in a row.',
    rationale:
      'The second session is performed on incomplete recovery, which raises injury risk without adding adaptation.',
  },
  {
    id: 'load.two_a_day',
    category: 'load',
    severity: 'block',
    summary: 'Doubles only when at most one session is impact or intensity.',
    rationale:
      'Two-a-days are allowed, but not two loading sessions. A swim plus strength is fine; a run plus intervals is not.',
  },

  // --- Cycling technique -------------------------------------------------
  {
    id: 'technique.bike_cadence',
    category: 'technique',
    severity: 'warn',
    summary: 'Keep cycling cadence at or above 85 rpm during rehab blocks.',
    rationale:
      'Low cadence means high pedal force, which loads the patellofemoral joint and the pes anserine insertion. This is the mechanism that aggravated the original injury.',
    params: { minRpm: 85 },
  },
  {
    id: 'technique.long_ride_step',
    category: 'progression',
    severity: 'block',
    summary: 'The long ride may not grow by more than 15% per week.',
    rationale:
      'The injury was triggered by a 40-mile ride the week after a running PR. Ride duration is progressed as carefully as running.',
    params: { maxIncreasePct: 15 },
  },
  {
    id: 'technique.bike_fit_review',
    category: 'technique',
    severity: 'info',
    summary: 'Recheck the bike fit if medial knee pain recurs on the bike.',
    rationale:
      'Medial knee and pes anserine pain while cycling is classically a saddle height, fore-aft or cleat rotation problem. Worth excluding before changing the plan.',
  },

  // --- Recovery -----------------------------------------------------------
  {
    id: 'recovery.readiness_gate',
    category: 'recovery',
    severity: 'block',
    summary: 'Low readiness reduces intensity; it never adds volume.',
    rationale:
      'The correct response to poor recovery is a lower stimulus. Substituting extra easy volume compounds fatigue instead of relieving it.',
    params: { fatiguedBelow: 58, compromisedBelow: 38 },
  },
  {
    id: 'recovery.sleep_debt',
    category: 'recovery',
    severity: 'warn',
    summary: 'Under six hours of sleep removes quality work from the day.',
    rationale:
      'Sleep restriction measurably reduces tissue repair and raises perceived effort. A quality session run on it costs more than it returns.',
    params: { minHours: 6 },
  },

  // --- Protocol -----------------------------------------------------------
  {
    id: 'protocol.pt_mandatory',
    category: 'protocol',
    severity: 'block',
    summary: 'PT activation and armor blocks cannot be removed from the plan.',
    rationale:
      'These are the prescribed treatment, not optional extras. The planner may move them; it may not delete them.',
  },
  {
    id: 'protocol.quad_strength_frequency',
    category: 'protocol',
    severity: 'warn',
    summary: 'Quad-focused strength at least twice a week, year round.',
    rationale:
      'Stated directly in the MRI report as the primary remedy for the cartilage wear. It stays in the plan through race week.',
    params: { perWeek: 2 },
  },
  {
    id: 'protocol.nsaid_review',
    category: 'protocol',
    severity: 'info',
    summary: 'Sustained anti-inflammatory use should be reviewed with the MD.',
    rationale:
      'The MD advised consistency with anti-inflammatories during the build. Prolonged use during endurance training carries GI and renal considerations that belong with a clinician, not a coach.',
    params: { daysPerMonth: 15 },
  },
]

export const RULES_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]))

export function getRule(id: string): RuleDefinition {
  const rule = RULES_BY_ID.get(id)
  if (!rule) throw new Error(`Unknown guardrail rule: ${id}`)
  return rule
}

/** Sports that remain available when impact is blocked. */
export const SAFE_ALTERNATIVES: Record<string, { sport: Sport; type: SessionType; note: string }> = {
  run: {
    sport: 'swim',
    type: 'z2',
    note: 'Swim keeps the aerobic stimulus with zero knee load and is currently the highest-leverage discipline anyway.',
  },
  brick: {
    sport: 'bike',
    type: 'recovery',
    note: 'High-cadence, low-torque spin preserves the session without the impact leg.',
  },
  hiit: {
    sport: 'swim',
    type: 'intervals',
    note: 'Swim intervals deliver the intensity without loading the knee.',
  },
}

/** A concise summary of the active ruleset, for the cached prompt prefix. */
export function rulesetSummary(): string {
  const byCategory = new Map<string, RuleDefinition[]>()
  for (const rule of RULES) {
    const list = byCategory.get(rule.category) ?? []
    list.push(rule)
    byCategory.set(rule.category, list)
  }

  const sections: string[] = []
  for (const [category, rules] of byCategory) {
    const lines = rules
      .filter((rule) => rule.severity === 'block' || rule.severity === 'red_flag')
      .map((rule) => `  - ${rule.summary}`)
    if (lines.length) {
      sections.push(`${category}:\n${lines.join('\n')}`)
    }
  }

  return `Injury Guard ${RULESET_VERSION} — hard constraints:\n${sections.join('\n')}`
}
