/**
 * Injury Guard evaluation engine.
 *
 * Runs before a proposed plan change is accepted and again after the model
 * responds, so a violation cannot be argued into the plan. Produces a
 * structured report that is stored with the session, making every scheduling
 * decision auditable after the fact.
 */

import {
  HIGH_INTENSITY_TYPES,
  IMPACT_SPORTS,
  type GuardrailReport,
  type GuardrailSeverity,
  type GuardrailViolation,
  type InjuryStatus,
  type PlannedSession,
  type Readiness,
  type SessionType,
  type Sport,
  type SymptomLog,
} from '../types'
import { RULESET_VERSION, SAFE_ALTERNATIVES, getRule } from './rules'

export interface GuardrailContext {
  /** Sessions being evaluated (usually a week). */
  sessions: PlannedSession[]
  /** Sessions already on the calendar around the evaluated window. */
  existingSessions?: PlannedSession[]

  symptoms: SymptomLog[]
  injuries: InjuryStatus[]
  readiness?: Readiness | null

  acwr?: number | null
  monotony?: number | null

  /** Actual running distance per ISO week, in metres. */
  weeklyRunMeters?: { weekStart: string; meters: number }[]
  /** Longest single run per ISO week, in metres. */
  weeklyLongRunMeters?: { weekStart: string; meters: number }[]
  /** Longest single ride per ISO week, in metres. */
  weeklyLongRideMeters?: { weekStart: string; meters: number }[]

  /** Whether quad symmetry benchmarks have been passed. */
  quadSymmetryPassed?: boolean
  /** Date running resumed, for the six-week spacing window. */
  returnToRunStartDate?: string | null

  /** Protocols that must appear in the plan. */
  mandatoryProtocolSlugs?: string[]
  /** Protocol slugs actually scheduled in the evaluated window. */
  scheduledProtocolSlugs?: string[]

  today?: string
}

const SEVERITY_ORDER: Record<GuardrailSeverity, number> = {
  ok: 0,
  info: 1,
  warn: 2,
  block: 3,
  red_flag: 4,
}

export function evaluateGuardrails(context: GuardrailContext): GuardrailReport {
  const violations: GuardrailViolation[] = []
  const today = context.today ?? new Date().toISOString().slice(0, 10)

  checkRedFlags(context, violations, today)
  checkPain(context, violations, today)
  checkRunProgression(context, violations, today)
  checkLoad(context, violations)
  checkScheduleShape(context, violations)
  checkCycling(context, violations)
  checkReadiness(context, violations)
  checkProtocols(context, violations)

  const severity = violations.reduce<GuardrailSeverity>(
    (worst, violation) =>
      SEVERITY_ORDER[violation.severity] > SEVERITY_ORDER[worst] ? violation.severity : worst,
    'ok'
  )

  return {
    passed: severity !== 'block' && severity !== 'red_flag',
    severity,
    violations,
    evaluatedAt: new Date().toISOString(),
    rulesetVersion: RULESET_VERSION,
  }
}

// ---------------------------------------------------------------------------

function checkRedFlags(
  context: GuardrailContext,
  violations: GuardrailViolation[],
  today: string
): void {
  const recent = context.symptoms.filter((symptom) => daysBetween(symptom.logDate, today) <= 3)

  const mechanical = recent.find(
    (symptom) => symptom.swelling || symptom.locking || symptom.instability
  )
  if (mechanical) {
    const rule = getRule('pain.mechanical_red_flag')
    const signs = [
      mechanical.swelling ? 'swelling' : null,
      mechanical.locking ? 'locking' : null,
      mechanical.instability ? 'giving way' : null,
    ].filter(Boolean)

    violations.push({
      ruleId: rule.id,
      severity: 'red_flag',
      message: `${capitalise(signs.join(' and '))} reported at ${mechanical.site} on ${mechanical.logDate}.`,
      remedy:
        'Stop training and contact the physical therapist or sports MD before the next session. These are mechanical signs, not soreness.',
      data: { site: mechanical.site, date: mechanical.logDate, signs },
    })
  }

  const severe = recent.find((symptom) => symptom.painScore >= 6)
  if (severe) {
    const rule = getRule('pain.severe')
    violations.push({
      ruleId: rule.id,
      severity: 'red_flag',
      message: `Pain of ${severe.painScore}/10 at ${severe.site} on ${severe.logDate}.`,
      remedy: 'Hold all impact for 72 hours and review with the PT. Swimming stays available if pain-free.',
      data: { painScore: severe.painScore, site: severe.site },
    })
  }
}

function checkPain(
  context: GuardrailContext,
  violations: GuardrailViolation[],
  today: string
): void {
  const rule = getRule('pain.moderate_blocks_impact')
  const threshold = rule.params?.threshold ?? 4

  const todayPain = context.symptoms
    .filter((symptom) => symptom.logDate === today)
    .reduce((max, symptom) => Math.max(max, symptom.painScore), 0)

  if (todayPain >= threshold) {
    const impactToday = context.sessions.filter(
      (session) => session.sessionDate === today && IMPACT_SPORTS.includes(session.sport)
    )

    for (const session of impactToday) {
      const alternative = SAFE_ALTERNATIVES[session.sport]
      violations.push({
        ruleId: rule.id,
        severity: 'block',
        message: `Pain is ${todayPain}/10 today; "${session.title}" loads the knee through impact.`,
        remedy: alternative
          ? `Replace with a ${alternative.sport} ${alternative.type} session. ${alternative.note}`
          : 'Replace with a non-impact session.',
        data: { sessionId: session.id, painScore: todayPain, sport: session.sport },
      })
    }
  }

  // Rising trend across the last three logged sessions.
  const trendRule = getRule('pain.trend_rising')
  const sessionsToCheck = trendRule.params?.sessions ?? 3
  const ordered = [...context.symptoms]
    .filter((symptom) => daysBetween(symptom.logDate, today) <= 14)
    .sort((a, b) => a.logDate.localeCompare(b.logDate))
    .slice(-sessionsToCheck)

  if (ordered.length === sessionsToCheck) {
    const rising = ordered.every(
      (symptom, index) => index === 0 || symptom.painScore > ordered[index - 1]!.painScore
    )
    if (rising && ordered[ordered.length - 1]!.painScore > 1) {
      violations.push({
        ruleId: trendRule.id,
        severity: 'warn',
        message: `Pain has risen across the last ${sessionsToCheck} logs (${ordered.map((s) => s.painScore).join(' → ')}).`,
        remedy:
          'Hold the current volume rather than progressing this week, and review the trend with the PT if it continues.',
        data: { scores: ordered.map((symptom) => symptom.painScore) },
      })
    }
  }
}

function checkRunProgression(
  context: GuardrailContext,
  violations: GuardrailViolation[],
  today: string
): void {
  const runs = [...context.sessions, ...(context.existingSessions ?? [])]
    .filter((session) => session.sport === 'run' && session.status !== 'cancelled')
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))

  // --- 48-hour spacing during the first six weeks back ---------------------
  const spacingRule = getRule('progression.run_spacing')
  const withinReturnWindow =
    context.returnToRunStartDate == null ||
    daysBetween(context.returnToRunStartDate, today) <= (spacingRule.params?.weeks ?? 6) * 7

  if (withinReturnWindow) {
    for (let i = 1; i < runs.length; i++) {
      const previous = runs[i - 1]!
      const current = runs[i]!
      const gapDays = daysBetween(previous.sessionDate, current.sessionDate)

      if (gapDays < 2) {
        violations.push({
          ruleId: spacingRule.id,
          severity: 'block',
          message: `"${current.title}" on ${current.sessionDate} is only ${gapDays} day(s) after the run on ${previous.sessionDate}.`,
          remedy: 'Move one run so there are at least 48 hours between them, or swap it for a swim.',
          data: { sessionId: current.id, gapDays },
        })
      }
    }
  }

  // --- Weekly volume ramp ---------------------------------------------------
  const volumeRule = getRule('progression.weekly_run_volume')
  const maxIncrease = (volumeRule.params?.maxIncreasePct ?? 10) / 100

  const plannedByWeek = new Map<string, number>()
  for (const run of context.sessions.filter((session) => session.sport === 'run')) {
    const week = isoWeekStart(run.sessionDate)
    plannedByWeek.set(week, (plannedByWeek.get(week) ?? 0) + (run.plannedDistanceMeters ?? 0))
  }

  const history = context.weeklyRunMeters ?? []
  for (const [weekStart, plannedMeters] of plannedByWeek) {
    if (plannedMeters <= 0) continue

    const priorWeek = shiftWeek(weekStart, -1)
    const prior = history.find((entry) => entry.weekStart === priorWeek)?.meters ?? 0

    // Coming back from zero, any first week is by definition a large increase;
    // the spacing and long-run rules govern that case instead.
    if (prior <= 0) continue

    const increase = (plannedMeters - prior) / prior
    if (increase > maxIncrease) {
      violations.push({
        ruleId: volumeRule.id,
        severity: 'block',
        message: `Week of ${weekStart} plans ${toMiles(plannedMeters)} mi of running against ${toMiles(prior)} mi last week (+${Math.round(increase * 100)}%).`,
        remedy: `Cap the week at ${toMiles(prior * (1 + maxIncrease))} mi.`,
        data: { weekStart, plannedMeters, priorMeters: prior },
      })
    }
  }

  // --- Long run step --------------------------------------------------------
  const longRunRule = getRule('progression.long_run_step')
  const maxStepMeters = (longRunRule.params?.maxIncreaseMiles ?? 1) * 1609.344

  const longestByWeek = new Map<string, number>()
  for (const run of context.sessions.filter((session) => session.sport === 'run')) {
    const week = isoWeekStart(run.sessionDate)
    longestByWeek.set(
      week,
      Math.max(longestByWeek.get(week) ?? 0, run.plannedDistanceMeters ?? 0)
    )
  }

  for (const [weekStart, longest] of longestByWeek) {
    if (longest <= 0) continue

    const priorWeek = shiftWeek(weekStart, -1)
    const prior = context.weeklyLongRunMeters?.find((entry) => entry.weekStart === priorWeek)?.meters ?? 0
    if (prior <= 0) continue

    if (longest - prior > maxStepMeters) {
      violations.push({
        ruleId: longRunRule.id,
        severity: 'block',
        message: `Long run for week of ${weekStart} is ${toMiles(longest)} mi against ${toMiles(prior)} mi last week.`,
        remedy: `Cap the long run at ${toMiles(prior + maxStepMeters)} mi.`,
        data: { weekStart, longest, prior },
      })
    }
  }

  // --- Intensity gate -------------------------------------------------------
  const gateRule = getRule('progression.intensity_gate')
  if (context.quadSymmetryPassed === false) {
    const intenseRuns = context.sessions.filter(
      (session) =>
        session.sport === 'run' && HIGH_INTENSITY_TYPES.includes(session.sessionType)
    )

    for (const session of intenseRuns) {
      violations.push({
        ruleId: gateRule.id,
        severity: 'block',
        message: `"${session.title}" is a hard run, but quad symmetry benchmarks have not been passed.`,
        remedy:
          'Keep runs aerobic until single-leg strength is within 10% side to side. Put the intensity on the bike or in the pool instead.',
        data: { sessionId: session.id },
      })
    }
  }
}

function checkLoad(context: GuardrailContext, violations: GuardrailViolation[]): void {
  const acwrRule = getRule('load.acwr_ceiling')
  const max = acwrRule.params?.max ?? 1.3
  const hardMax = acwrRule.params?.hardMax ?? 1.5

  if (context.acwr != null) {
    if (context.acwr > hardMax) {
      violations.push({
        ruleId: acwrRule.id,
        severity: 'block',
        message: `Acute:chronic workload ratio is ${context.acwr.toFixed(2)}, past the ${hardMax} risk threshold.`,
        remedy: 'Cut this week\'s planned load until the ratio returns below 1.3.',
        data: { acwr: context.acwr },
      })
    } else if (context.acwr > max) {
      violations.push({
        ruleId: acwrRule.id,
        severity: 'warn',
        message: `Acute:chronic workload ratio is ${context.acwr.toFixed(2)}, above the ${max} working ceiling.`,
        remedy: 'Hold volume flat next week rather than progressing.',
        data: { acwr: context.acwr },
      })
    } else if (context.acwr < (getRule('load.acwr_floor').params?.min ?? 0.8)) {
      violations.push({
        ruleId: 'load.acwr_floor',
        severity: 'info',
        message: `Acute:chronic workload ratio is ${context.acwr.toFixed(2)}; training load is falling.`,
        remedy: 'A small, controlled increase is appropriate if symptoms allow.',
        data: { acwr: context.acwr },
      })
    }
  }

  const monotonyRule = getRule('load.monotony')
  const monotonyMax = monotonyRule.params?.max ?? 2
  if (context.monotony != null && context.monotony > monotonyMax) {
    violations.push({
      ruleId: monotonyRule.id,
      severity: 'warn',
      message: `Training monotony is ${context.monotony.toFixed(1)}, above ${monotonyMax}.`,
      remedy: 'Add more contrast: make the easy days easier and concentrate intensity into fewer sessions.',
      data: { monotony: context.monotony },
    })
  }
}

function checkScheduleShape(context: GuardrailContext, violations: GuardrailViolation[]): void {
  const all = [...context.sessions].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
  if (all.length === 0) return

  const byWeek = new Map<string, PlannedSession[]>()
  for (const session of all) {
    const week = isoWeekStart(session.sessionDate)
    const list = byWeek.get(week) ?? []
    list.push(session)
    byWeek.set(week, list)
  }

  // --- Rest day -------------------------------------------------------------
  const restRule = getRule('load.rest_day')
  for (const [weekStart, sessions] of byWeek) {
    const trainingDays = new Set(
      sessions
        .filter((session) => session.sport !== 'rest' && session.sport !== 'pt')
        .map((session) => session.sessionDate)
    )

    if (trainingDays.size >= 7) {
      violations.push({
        ruleId: restRule.id,
        severity: 'block',
        message: `Week of ${weekStart} has training on all seven days.`,
        remedy: 'Make one day full rest. PT blocks may stay; everything else comes out.',
        data: { weekStart, trainingDays: trainingDays.size },
      })
    }
  }

  // --- Back-to-back intensity ------------------------------------------------
  const intensityRule = getRule('load.back_to_back_intensity')
  const hardDays = [
    ...new Set(
      all
        .filter((session) => HIGH_INTENSITY_TYPES.includes(session.sessionType))
        .map((session) => session.sessionDate)
    ),
  ].sort()

  for (let i = 1; i < hardDays.length; i++) {
    if (daysBetween(hardDays[i - 1]!, hardDays[i]!) === 1) {
      violations.push({
        ruleId: intensityRule.id,
        severity: 'block',
        message: `Hard sessions on consecutive days: ${hardDays[i - 1]} and ${hardDays[i]}.`,
        remedy: 'Put an easy or rest day between them.',
        data: { dates: [hardDays[i - 1], hardDays[i]] },
      })
    }
  }

  // --- Two-a-days -----------------------------------------------------------
  const doubleRule = getRule('load.two_a_day')
  const byDate = new Map<string, PlannedSession[]>()
  for (const session of all) {
    const list = byDate.get(session.sessionDate) ?? []
    list.push(session)
    byDate.set(session.sessionDate, list)
  }

  for (const [date, sessions] of byDate) {
    const loading = sessions.filter(
      (session) =>
        session.sport !== 'pt' &&
        session.sport !== 'rest' &&
        (IMPACT_SPORTS.includes(session.sport) ||
          HIGH_INTENSITY_TYPES.includes(session.sessionType))
    )

    if (loading.length > 1) {
      violations.push({
        ruleId: doubleRule.id,
        severity: 'block',
        message: `${date} has ${loading.length} impact or high-intensity sessions: ${loading.map((s) => s.title).join(', ')}.`,
        remedy: 'Keep one, and make the other low-impact (swim, easy spin) or move it to another day.',
        data: { date, sessions: loading.map((session) => session.id) },
      })
    }
  }
}

function checkCycling(context: GuardrailContext, violations: GuardrailViolation[]): void {
  const cadenceRule = getRule('technique.bike_cadence')
  const minRpm = cadenceRule.params?.minRpm ?? 85

  // Only enforced while an injury is still being actively managed.
  const inRehab = context.injuries.some((injury) => injury.status !== 'resolved')
  if (!inRehab) return

  for (const session of context.sessions.filter((s) => s.sport === 'bike')) {
    const cadence = session.targets?.cadenceRange
    if (!cadence) {
      violations.push({
        ruleId: cadenceRule.id,
        severity: 'warn',
        message: `"${session.title}" has no cadence target.`,
        remedy: `Set a floor of ${minRpm} rpm. Low cadence means high pedal force, which is what aggravated the knee.`,
        data: { sessionId: session.id },
      })
      continue
    }

    if (cadence[0] < minRpm) {
      violations.push({
        ruleId: cadenceRule.id,
        severity: 'warn',
        message: `"${session.title}" allows cadence down to ${cadence[0]} rpm.`,
        remedy: `Raise the floor to ${minRpm} rpm and reduce resistance to match.`,
        data: { sessionId: session.id, cadence },
      })
    }
  }

  // --- Long ride step --------------------------------------------------------
  const rideRule = getRule('technique.long_ride_step')
  const maxIncrease = (rideRule.params?.maxIncreasePct ?? 15) / 100

  const longestByWeek = new Map<string, number>()
  for (const ride of context.sessions.filter((session) => session.sport === 'bike')) {
    const week = isoWeekStart(ride.sessionDate)
    longestByWeek.set(week, Math.max(longestByWeek.get(week) ?? 0, ride.plannedDistanceMeters ?? 0))
  }

  for (const [weekStart, longest] of longestByWeek) {
    if (longest <= 0) continue
    const prior =
      context.weeklyLongRideMeters?.find((entry) => entry.weekStart === shiftWeek(weekStart, -1))
        ?.meters ?? 0
    if (prior <= 0) continue

    const increase = (longest - prior) / prior
    if (increase > maxIncrease) {
      violations.push({
        ruleId: rideRule.id,
        severity: 'block',
        message: `Long ride for week of ${weekStart} is ${toMiles(longest)} mi against ${toMiles(prior)} mi last week (+${Math.round(increase * 100)}%).`,
        remedy: `Cap it at ${toMiles(prior * (1 + maxIncrease))} mi. The original injury came from a long ride the week after a running PR.`,
        data: { weekStart, longest, prior },
      })
    }
  }
}

function checkReadiness(context: GuardrailContext, violations: GuardrailViolation[]): void {
  const readiness = context.readiness
  if (!readiness) return

  const rule = getRule('recovery.readiness_gate')
  const fatiguedBelow = rule.params?.fatiguedBelow ?? 58
  const compromisedBelow = rule.params?.compromisedBelow ?? 38

  if (readiness.score >= fatiguedBelow) {
    checkSleepDebt(context, violations)
    return
  }

  const today = readiness.metricDate
  const todaySessions = context.sessions.filter((session) => session.sessionDate === today)

  for (const session of todaySessions) {
    if (session.sport === 'pt' || session.sport === 'rest') continue

    const isHard = HIGH_INTENSITY_TYPES.includes(session.sessionType)

    if (readiness.score < compromisedBelow && (isHard || IMPACT_SPORTS.includes(session.sport))) {
      violations.push({
        ruleId: rule.id,
        severity: 'block',
        message: `Readiness is ${readiness.score}/100 (${readiness.level}); "${session.title}" is too demanding today.`,
        remedy:
          'Downgrade to an easy swim, a high-cadence spin, or full rest. Do not substitute extra easy volume.',
        data: { sessionId: session.id, readiness: readiness.score },
      })
    } else if (isHard) {
      violations.push({
        ruleId: rule.id,
        severity: 'block',
        message: `Readiness is ${readiness.score}/100 (${readiness.level}); "${session.title}" is a quality session.`,
        remedy: 'Keep the duration, drop the intensity. Convert intervals to steady aerobic work.',
        data: { sessionId: session.id, readiness: readiness.score },
      })
    }
  }

  checkSleepDebt(context, violations)
}

/** Warn when recent sleep averages under six hours — never blocks the plan. */
function checkSleepDebt(context: GuardrailContext, violations: GuardrailViolation[]): void {
  const readiness = context.readiness
  if (!readiness) return

  const hasDebt =
    readiness.flags.includes('sleep_debt') ||
    (readiness.inputs.sleepSeconds != null && readiness.inputs.sleepSeconds < 6 * 3600)

  if (!hasDebt) return

  const rule = getRule('recovery.sleep_debt')
  const minHours = rule.params?.minHours ?? 6
  const hours =
    readiness.inputs.sleepSeconds != null
      ? Math.round((readiness.inputs.sleepSeconds / 3600) * 10) / 10
      : null

  const today = readiness.metricDate
  const qualityToday = context.sessions.filter(
    (session) =>
      session.sessionDate === today &&
      HIGH_INTENSITY_TYPES.includes(session.sessionType) &&
      session.sport !== 'pt' &&
      session.sport !== 'rest'
  )

  for (const session of qualityToday) {
    violations.push({
      ruleId: rule.id,
      severity: 'warn',
      message:
        hours != null
          ? `Recent sleep is about ${hours} h (under ${minHours} h); "${session.title}" is quality work.`
          : `Sleep debt flagged; "${session.title}" is quality work.`,
      remedy: 'Consider converting intervals to steady aerobic work, or keep the session but drop intensity.',
      data: { sessionId: session.id, sleepSeconds: readiness.inputs.sleepSeconds },
    })
  }
}

function checkProtocols(context: GuardrailContext, violations: GuardrailViolation[]): void {
  const required = context.mandatoryProtocolSlugs ?? []

  if (required.length > 0) {
    const scheduled = new Set(context.scheduledProtocolSlugs ?? [])
    const missing = required.filter((slug) => !scheduled.has(slug))

    if (missing.length > 0) {
      violations.push({
        ruleId: 'protocol.pt_mandatory',
        severity: 'block',
        message: `Mandatory PT blocks missing from the plan: ${missing.join(', ')}.`,
        remedy:
          'Re-add them. These are the prescribed treatment for the cartilage wear and pes anserine; the planner may move them but not delete them.',
        data: { missing },
      })
    }
  }

  // Quad strength twice weekly, year round.
  const quadRule = getRule('protocol.quad_strength_frequency')
  const perWeek = quadRule.params?.perWeek ?? 2

  const strengthByWeek = new Map<string, number>()
  for (const session of context.sessions.filter((s) => s.sport === 'strength')) {
    const week = isoWeekStart(session.sessionDate)
    strengthByWeek.set(week, (strengthByWeek.get(week) ?? 0) + 1)
  }

  for (const [weekStart, count] of strengthByWeek) {
    if (count < perWeek) {
      violations.push({
        ruleId: quadRule.id,
        severity: 'warn',
        message: `Week of ${weekStart} has ${count} strength session(s); the standing minimum is ${perWeek}.`,
        remedy:
          'Add a quad-focused session. The MRI report names quad strength as the primary remedy for the cartilage wear.',
        data: { weekStart, count },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Downgrade helper
// ---------------------------------------------------------------------------

export interface SessionDowngrade {
  sport: Sport
  sessionType: SessionType
  title: string
  rationale: string
}

/**
 * The safe replacement for a session that failed the guardrails.
 *
 * Downgrades preserve the aerobic stimulus where possible and remove impact
 * and intensity first, because those are what the knee cannot currently
 * absorb. Duration is preserved, not extended.
 */
export function downgradeSession(
  session: PlannedSession,
  reason: string
): SessionDowngrade {
  if (IMPACT_SPORTS.includes(session.sport)) {
    const alternative = SAFE_ALTERNATIVES[session.sport] ?? SAFE_ALTERNATIVES.run!
    return {
      sport: alternative.sport,
      sessionType: alternative.type,
      title: `${capitalise(alternative.sport)} (swapped from ${session.sport})`,
      rationale: `${reason} ${alternative.note}`,
    }
  }

  if (HIGH_INTENSITY_TYPES.includes(session.sessionType)) {
    return {
      sport: session.sport,
      sessionType: 'z2',
      title: `${session.title} — aerobic version`,
      rationale: `${reason} Same duration and sport, intensity removed.`,
    }
  }

  return {
    sport: session.sport,
    sessionType: 'recovery',
    title: `${session.title} — recovery version`,
    rationale: `${reason} Reduced to a recovery effort.`,
  }
}

// ---------------------------------------------------------------------------

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime()
  const b = new Date(`${to}T00:00:00Z`).getTime()
  return Math.round(Math.abs(b - a) / 86_400_000)
}

/** Monday of the ISO week containing the given date. */
export function isoWeekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  const day = d.getUTCDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function toMiles(meters: number): string {
  return (meters / 1609.344).toFixed(1)
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
