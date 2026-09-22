/**
 * Context assembly.
 *
 * Replaces the previous approach of concatenating the full knowledge base,
 * every workout definition and a fortnight of raw metrics into every turn —
 * roughly 15–35k tokens, uncached, on every message.
 *
 * Two changes matter here. First, the stable prefix (identity, guardrails,
 * tool policy) is separated from volatile context so it can be cached. Second,
 * volatile context is assembled as prioritised sections and trimmed to a token
 * budget, so a degraded budget produces a smaller prompt rather than a failure.
 */

import { fitToBudget } from '../cost/index'
import type {
  Activity,
  DailyMetric,
  InjuryStatus,
  PlannedSession,
  RaceProjection,
  Readiness,
  SymptomLog,
} from '../types'
import { formatTime } from '../analytics/projection'

export interface AthleteCard {
  name: string
  age: number | null
  heightCm: number | null
  currentWeightLbs: number | null
  weightBand: [number, number] | null
  maxHr: number | null
  restingHr: number | null
  lthr: number | null
  cssPacePer100yd: number | null
  vdot: number | null
  ftpWatts: number | null
  goalRace: string | null
  goalDate: string | null
  goalTimeSeconds: number | null
  daysToRace: number | null
}

export interface BlockCard {
  name: string
  phase: string
  blockNumber: number
  weekInBlock: number
  totalWeeks: number
  goals: string[]
}

export interface LoadCard {
  ctl: number | null
  atl: number | null
  tsb: number | null
  acwr: number | null
  monotony: number | null
  weeklyTss: number
  weeklyTssBySport: Record<string, number>
}

export interface EnvironmentCard {
  weatherSummary?: string
  temperatureF?: number
  windMph?: number
  precipitationChance?: number
  airQuality?: number
  lakeTempF?: number
  sunrise?: string
  sunset?: string
  alerts?: string[]
}

export interface MemoryItem {
  content: string
  memoryType: string
  tags: string[]
}

export interface KnowledgeSnippet {
  title: string
  citation: string | null
  heading: string | null
  content: string
}

export interface FeedbackCard {
  feedbackDate: string
  sessionTitle: string | null
  sport: string | null
  rpe: number | null
  maxPain: number | null
  notes: string | null
}

export interface AdherenceCard {
  from: string
  to: string
  planned: number
  completed: number
  skipped: number
  missed: number
  completionRate: number | null
  meanRpe: number | null
  ptMisses: number
  ptStreakDays: number
}

export interface FuelCard {
  fuellingWindow: 'high' | 'moderate' | 'low'
  plannedTss: number
  targets: { kcal: number; proteinG: number; carbsG: number; fatG: number }
  logged: {
    kcal: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
    hydrationMl: number | null
    entryCount: number
  } | null
  flags: string[]
  recentBlurbs: string[]
}

export interface AssembleInput {
  athlete: AthleteCard
  injuries: InjuryStatus[]
  recentSymptoms: SymptomLog[]
  block: BlockCard | null
  upcomingSessions: PlannedSession[]
  recentActivities: Activity[]
  recentMetrics: DailyMetric[]
  readiness: Readiness | null
  load: LoadCard | null
  projection: RaceProjection | null
  environment: EnvironmentCard | null
  memories: MemoryItem[]
  knowledge: KnowledgeSnippet[]
  conversationSummary: string | null
  ptProtocols: { name: string; timeOfDay: string; itemCount: number; completedToday: boolean }[]
  recentFeedback: FeedbackCard[]
  adherence: AdherenceCard | null
  /** Today's fuelling — folded into the Today section, not a separate priority band. */
  fuel?: FuelCard | null
  today: string
}

export interface AssembledContext {
  /** Volatile content, appended after the cached prefix. */
  content: string
  usedTokens: number
  droppedSections: string[]
}

/**
 * Build the athlete context block.
 *
 * Section priority is ordered by what the coach cannot function without:
 * injury status first (it constrains everything), then today's state, then
 * history, then supporting material. Under a tight budget the coach loses
 * background reading before it loses the knee's status.
 */
export function assembleContext(
  input: AssembleInput,
  budgetTokens: number
): AssembledContext {
  const sections: { title: string; content: string; priority: number }[] = []

  // 1. Injury — the hardest constraint in the system.
  sections.push({
    title: 'injury',
    priority: 1,
    content: renderInjury(input.injuries, input.recentSymptoms, input.today),
  })

  // 2. Athlete card.
  sections.push({ title: 'athlete', priority: 2, content: renderAthlete(input.athlete) })

  // 3. Today: readiness, sessions, PT.
  sections.push({
    title: 'today',
    priority: 3,
    content: renderToday(input, input.today),
  })

  // 4. Training load.
  if (input.load) {
    sections.push({ title: 'load', priority: 4, content: renderLoad(input.load) })
  }

  // 5. Current block and upcoming week.
  if (input.block || input.upcomingSessions.length) {
    sections.push({
      title: 'plan',
      priority: 5,
      content: renderPlan(input.block, input.upcomingSessions, input.today),
    })
  }

  // 6. Recent training, as a computed summary rather than raw sessions.
  sections.push({
    title: 'recent_training',
    priority: 6,
    content: renderRecentTraining(input.recentActivities, input.recentFeedback, input.adherence),
  })

  // 7. Conversation summary, so a long thread keeps its thread.
  if (input.conversationSummary) {
    sections.push({
      title: 'conversation_summary',
      priority: 7,
      content: `## Earlier in this conversation\n\n${input.conversationSummary}`,
    })
  }

  // 8. Environment.
  if (input.environment) {
    sections.push({
      title: 'environment',
      priority: 8,
      content: renderEnvironment(input.environment),
    })
  }

  // 9. Body composition and sleep trend.
  sections.push({
    title: 'body',
    priority: 9,
    content: renderBody(input.recentMetrics),
  })

  // 10. Race projection.
  if (input.projection) {
    sections.push({
      title: 'projection',
      priority: 10,
      content: renderProjection(input.projection),
    })
  }

  // 11. Recalled memories.
  if (input.memories.length) {
    sections.push({ title: 'memory', priority: 11, content: renderMemories(input.memories) })
  }

  // 12. Knowledge snippets — the first thing to drop under budget pressure,
  // because the coach can retrieve them on demand with search_knowledge.
  if (input.knowledge.length) {
    sections.push({
      title: 'knowledge',
      priority: 12,
      content: renderKnowledge(input.knowledge),
    })
  }

  const { included, droppedTitles, usedTokens } = fitToBudget(sections, budgetTokens)

  return {
    content: included.map((section) => section.content).join('\n\n'),
    usedTokens,
    droppedSections: droppedTitles,
  }
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

function renderInjury(
  injuries: InjuryStatus[],
  symptoms: SymptomLog[],
  today: string
): string {
  if (injuries.length === 0 && symptoms.length === 0) {
    return '## Injury status\n\nNo active injuries and no symptoms logged.'
  }

  const lines = ['## Injury status']

  for (const injury of injuries) {
    lines.push(`\n### ${injury.name} (${injury.status})`)
    if (injury.sites.length) lines.push(`Sites: ${injury.sites.join(', ')}`)

    const findings = injury.diagnosis?.findings
    if (Array.isArray(findings)) {
      lines.push('Findings:')
      for (const finding of findings) lines.push(`  - ${finding}`)
    }

    if (injury.contraindications.length) {
      lines.push('Contraindicated:')
      for (const item of injury.contraindications) lines.push(`  - ${item}`)
    }

    const conditions = (injury.clearances as { conditions?: unknown })?.conditions
    if (Array.isArray(conditions)) {
      lines.push('Cleared to train, conditional on:')
      for (const condition of conditions) lines.push(`  - ${condition}`)
    }
  }

  const recent = symptoms
    .filter((symptom) => daysBetween(symptom.logDate, today) <= 14)
    .sort((a, b) => b.logDate.localeCompare(a.logDate))
    .slice(0, 10)

  if (recent.length) {
    lines.push('\n### Symptoms, last 14 days')
    for (const symptom of recent) {
      const markers = [
        symptom.swelling ? 'swelling' : null,
        symptom.locking ? 'locking' : null,
        symptom.instability ? 'instability' : null,
      ].filter(Boolean)

      lines.push(
        `  ${symptom.logDate}  ${symptom.site}  ${symptom.painScore}/10` +
          (symptom.context ? ` (${symptom.context})` : '') +
          (markers.length ? `  [${markers.join(', ')}]` : '') +
          (symptom.notes ? `  — ${symptom.notes}` : '')
      )
    }
  } else {
    lines.push('\nNo symptoms logged in the last 14 days.')
  }

  return lines.join('\n')
}

function renderAthlete(athlete: AthleteCard): string {
  const lines = ['## Athlete']

  lines.push(`${athlete.name}${athlete.age ? `, ${athlete.age}` : ''}`)
  if (athlete.heightCm) lines.push(`Height: ${(athlete.heightCm / 2.54).toFixed(0)} in`)
  if (athlete.currentWeightLbs) {
    const band = athlete.weightBand ? ` (target band ${athlete.weightBand[0]}–${athlete.weightBand[1]} lb)` : ''
    lines.push(`Weight: ${athlete.currentWeightLbs.toFixed(1)} lb${band}`)
  }

  const physiology: string[] = []
  if (athlete.maxHr) physiology.push(`max HR ${athlete.maxHr}`)
  if (athlete.restingHr) physiology.push(`resting HR ${athlete.restingHr}`)
  if (athlete.lthr) physiology.push(`LTHR ${athlete.lthr}`)
  if (athlete.cssPacePer100yd) physiology.push(`CSS ${formatPace(athlete.cssPacePer100yd)}/100yd`)
  if (athlete.vdot) physiology.push(`VDOT ${athlete.vdot.toFixed(1)}`)
  if (athlete.ftpWatts) physiology.push(`FTP ${athlete.ftpWatts} W`)
  if (physiology.length) lines.push(`Physiology: ${physiology.join(', ')}`)

  if (athlete.goalRace && athlete.goalDate) {
    const goal = athlete.goalTimeSeconds ? ` in under ${formatTime(athlete.goalTimeSeconds)}` : ''
    const countdown = athlete.daysToRace != null ? ` — ${athlete.daysToRace} days away` : ''
    lines.push(`Goal: ${athlete.goalRace} on ${athlete.goalDate}${goal}${countdown}`)
  }

  return lines.join('\n')
}

function renderToday(input: AssembleInput, today: string): string {
  const lines = [`## Today (${today})`]

  if (input.readiness) {
    lines.push(
      `\nReadiness: ${input.readiness.score}/100 (${input.readiness.level})`
    )
    for (const component of input.readiness.components) {
      lines.push(`  ${component.label}: ${component.score} — ${component.detail}`)
    }
    if (input.readiness.flags.length) {
      lines.push(`  Flags: ${input.readiness.flags.join(', ')}`)
    }
  } else {
    lines.push('\nReadiness: not computed (insufficient data)')
  }

  const todaySessions = input.upcomingSessions.filter(
    (session) => session.sessionDate === today
  )

  if (todaySessions.length) {
    lines.push('\nScheduled today:')
    for (const session of todaySessions) {
      lines.push(`  ${renderSessionLine(session)}`)
    }
  } else {
    lines.push('\nNothing scheduled today.')
  }

  if (input.ptProtocols.length) {
    lines.push('\nPT blocks (mandatory):')
    for (const protocol of input.ptProtocols) {
      lines.push(
        `  ${protocol.name} (${protocol.timeOfDay}, ${protocol.itemCount} exercises) — ${protocol.completedToday ? 'done' : 'not yet done'}`
      )
    }
  }

  if (input.fuel) {
    const fuel = input.fuel
    const t = fuel.targets
    const logged = fuel.logged
    lines.push(
      `\nFuel (${fuel.fuellingWindow} day, ${fuel.plannedTss} TSS planned): target ${t.kcal} kcal / P ${t.proteinG}g / C ${t.carbsG}g / F ${t.fatG}g`
    )
    if (logged && (logged.kcal != null || logged.entryCount > 0)) {
      lines.push(
        `  Logged: ${logged.kcal ?? 0} kcal / P ${logged.proteinG ?? 0}g / C ${logged.carbsG ?? 0}g / F ${logged.fatG ?? 0}g (${logged.entryCount} entries)`
      )
      if (logged.hydrationMl != null) {
        lines.push(`  Hydration: ${logged.hydrationMl} ml`)
      }
    } else {
      lines.push('  Logged: nothing yet')
    }
    if (fuel.recentBlurbs.length) {
      lines.push(`  Recent: ${fuel.recentBlurbs.join('; ')}`)
    }
    if (fuel.flags.length) {
      lines.push(`  Flags: ${fuel.flags.join(', ')}`)
    }
  }

  return lines.join('\n')
}

function renderLoad(load: LoadCard): string {
  const lines = ['## Training load']

  const pmc: string[] = []
  if (load.ctl != null) pmc.push(`fitness (CTL) ${load.ctl.toFixed(0)}`)
  if (load.atl != null) pmc.push(`fatigue (ATL) ${load.atl.toFixed(0)}`)
  if (load.tsb != null) pmc.push(`form (TSB) ${load.tsb > 0 ? '+' : ''}${load.tsb.toFixed(0)}`)
  if (pmc.length) lines.push(pmc.join(', '))

  if (load.acwr != null) {
    const verdict =
      load.acwr > 1.5
        ? ' — above the injury-risk threshold'
        : load.acwr > 1.3
          ? ' — above the working ceiling'
          : load.acwr < 0.8
            ? ' — detraining'
            : ' — in range'
    lines.push(`ACWR ${load.acwr.toFixed(2)}${verdict}`)
  }

  if (load.monotony != null) lines.push(`Monotony ${load.monotony.toFixed(1)}`)

  lines.push(`Last 7 days: ${load.weeklyTss.toFixed(0)} TSS`)
  const bySport = Object.entries(load.weeklyTssBySport)
    .filter(([, value]) => value > 0)
    .map(([sport, value]) => `${sport} ${value.toFixed(0)}`)
  if (bySport.length) lines.push(`  by sport: ${bySport.join(', ')}`)

  return lines.join('\n')
}

function renderPlan(
  block: BlockCard | null,
  sessions: PlannedSession[],
  today: string
): string {
  const lines = ['## Plan']

  if (block) {
    lines.push(
      `Block ${block.blockNumber}: ${block.name} (${block.phase}), week ${block.weekInBlock} of ${block.totalWeeks}`
    )
    if (block.goals.length) {
      lines.push('Goals:')
      for (const goal of block.goals) lines.push(`  - ${goal}`)
    }
  }

  const upcoming = sessions
    .filter((session) => session.sessionDate >= today)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.sortOrder - b.sortOrder)
    .slice(0, 14)

  if (upcoming.length) {
    lines.push('\nUpcoming sessions:')
    let currentDate = ''
    for (const session of upcoming) {
      if (session.sessionDate !== currentDate) {
        currentDate = session.sessionDate
        lines.push(`  ${currentDate}`)
      }
      lines.push(`    ${renderSessionLine(session)}`)
    }
  }

  return lines.join('\n')
}

function renderSessionLine(session: PlannedSession): string {
  const parts = [`[${session.id}]`, session.sport, session.sessionType, `"${session.title}"`]

  if (session.plannedDurationSeconds) {
    parts.push(`${Math.round(session.plannedDurationSeconds / 60)} min`)
  }
  if (session.plannedDistanceMeters) {
    parts.push(
      session.sport === 'swim'
        ? `${Math.round(session.plannedDistanceMeters * 1.09361)} yd`
        : `${(session.plannedDistanceMeters / 1609.344).toFixed(1)} mi`
    )
  }
  if (session.plannedLoad) parts.push(`${session.plannedLoad} TSS`)
  if (session.status !== 'planned') parts.push(`(${session.status})`)

  return parts.join(' · ')
}

function renderRecentTraining(
  activities: Activity[],
  feedback: FeedbackCard[],
  adherence: AdherenceCard | null
): string {
  const lines = ['## Recent training (last 14 days)']

  if (adherence) {
    lines.push(
      `Adherence: ${adherence.completed}/${adherence.planned} completed` +
        (adherence.completionRate != null
          ? ` (${Math.round(adherence.completionRate * 100)}%)`
          : '') +
        `, ${adherence.skipped} skipped, ${adherence.missed} missed`
    )
    if (adherence.meanRpe != null) {
      lines.push(`Mean RPE ${adherence.meanRpe.toFixed(1)}`)
    }
    lines.push(
      `PT: ${adherence.ptMisses} day(s) with misses · current full-compliance streak ${adherence.ptStreakDays}`
    )
  }

  if (feedback.length) {
    lines.push('\nSession feedback:')
    for (const row of feedback.slice(0, 10)) {
      const parts = [
        row.feedbackDate,
        row.sport ?? row.sessionTitle ?? 'session',
        row.rpe != null ? `RPE ${row.rpe}` : null,
        row.maxPain != null ? `pain ${row.maxPain}/10` : null,
        row.notes ? `— ${row.notes.slice(0, 100)}` : null,
      ].filter(Boolean)
      lines.push(`  ${parts.join(' · ')}`)
    }
  }

  if (activities.length === 0) {
    lines.push('\nNo Apple Health activities recorded.')
    return lines.join('\n')
  }

  lines.push('\nActivities:')
  const recent = activities.slice(0, 20)

  for (const activity of recent) {
    const parts = [activity.activityDate, activity.sport]

    parts.push(`${Math.round(activity.durationSeconds / 60)} min`)

    if (activity.distanceMeters) {
      parts.push(
        activity.sport === 'swim'
          ? `${Math.round(activity.distanceMeters * 1.09361)} yd`
          : `${(activity.distanceMeters / 1609.344).toFixed(2)} mi`
      )
    }
    if (activity.hrAverage) parts.push(`${activity.hrAverage} bpm avg`)
    if (activity.tss != null) parts.push(`${activity.tss.toFixed(0)} TSS (${activity.tssMethod})`)
    if (activity.decouplingPct != null) {
      parts.push(`drift ${activity.decouplingPct > 0 ? '+' : ''}${activity.decouplingPct.toFixed(1)}%`)
    }

    lines.push(`  ${parts.join(' · ')}`)
  }

  return lines.join('\n')
}

function renderBody(metrics: DailyMetric[]): string {
  if (metrics.length === 0) return '## Body\n\nNo metrics recorded.'

  const recent = metrics.slice(-14)
  const last = recent[recent.length - 1]
  const lines = ['## Body and sleep (14-day trend)']

  const weights = recent
    .map((metric) => metric.bodyMassLbs)
    .filter((value): value is number => value != null)
  if (weights.length >= 2) {
    const first = weights[0]!
    const lastWeight = weights[weights.length - 1]!
    lines.push(
      `Weight: ${lastWeight.toFixed(1)} lb (${lastWeight > first ? '+' : ''}${(lastWeight - first).toFixed(1)} over the window)`
    )
  }

  const bodyFat = recent
    .map((metric) => metric.bodyFatPercentage)
    .filter((value): value is number => value != null)
  if (bodyFat.length) {
    lines.push(`Body fat: ${bodyFat[bodyFat.length - 1]!.toFixed(1)}%`)
  }

  if (last?.sleepSeconds != null) {
    const hours = (last.sleepSeconds / 3600).toFixed(1)
    const stages: string[] = []
    if (last.sleepDeep != null) stages.push(`deep ${Math.round(last.sleepDeep / 60)}m`)
    if (last.sleepRem != null) stages.push(`REM ${Math.round(last.sleepRem / 60)}m`)
    if (last.sleepCore != null) stages.push(`core ${Math.round(last.sleepCore / 60)}m`)
    if (last.sleepAwake != null) stages.push(`awake ${Math.round(last.sleepAwake / 60)}m`)
    if (last.sleepUnspecified != null) {
      stages.push(`unspecified ${Math.round(last.sleepUnspecified / 60)}m`)
    }

    let lastNight = `Last night: ${hours} h asleep`
    if (
      last.sleepInBed != null &&
      last.sleepInBed > 0 &&
      last.sleepSeconds != null
    ) {
      const efficiency = Math.round((last.sleepSeconds / last.sleepInBed) * 100)
      lastNight += ` (${efficiency}% efficiency)`
    }
    if (last.sleepStart && last.sleepEnd) {
      lastNight += `, ${formatClock(last.sleepStart)}–${formatClock(last.sleepEnd)}`
    }
    lines.push(lastNight)
    if (stages.length) lines.push(`Stages: ${stages.join(', ')}`)
  }

  const sleep = recent
    .map((metric) => metric.sleepSeconds)
    .filter((value): value is number => value != null)
  if (sleep.length) {
    const avg = sleep.reduce((a, b) => a + b, 0) / sleep.length / 3600
    lines.push(`Sleep: ${avg.toFixed(1)} h average over ${sleep.length} nights`)
  }

  const rmssd = recent
    .map((metric) => metric.hrvRmssd)
    .filter((value): value is number => value != null)
  const hrv = recent
    .map((metric) => metric.hrvSdnn)
    .filter((value): value is number => value != null)
  if (rmssd.length) {
    const avg = rmssd.reduce((a, b) => a + b, 0) / rmssd.length
    lines.push(`HRV (RMSSD overnight): ${avg.toFixed(0)} ms average`)
  } else if (hrv.length) {
    const avg = hrv.reduce((a, b) => a + b, 0) / hrv.length
    lines.push(`HRV (SDNN): ${avg.toFixed(0)} ms average`)
  }

  if (last?.respiratoryRate != null) {
    lines.push(`Respiratory rate (last night): ${last.respiratoryRate.toFixed(1)} breaths/min`)
  }
  if (last?.wristTempDelta != null) {
    const sign = last.wristTempDelta >= 0 ? '+' : ''
    lines.push(`Wrist temp delta: ${sign}${last.wristTempDelta.toFixed(2)}°C`)
  }
  if (last?.spo2 != null) {
    lines.push(`Overnight SpO2: ${last.spo2.toFixed(1)}%`)
  }
  if (last?.breathingDisturbancesElevated === true) {
    lines.push(
      `Breathing disturbances: elevated${last.breathingDisturbances != null ? ` (${last.breathingDisturbances})` : ''}`
    )
  } else if (last?.breathingDisturbances != null) {
    lines.push(`Breathing disturbances: ${last.breathingDisturbances} (not elevated)`)
  }
  if (last?.sleepApneaEventCount != null && last.sleepApneaEventCount > 0) {
    lines.push(`Sleep apnea events (rare clinical): ${last.sleepApneaEventCount}`)
  }

  const vo2 = recent.map((metric) => metric.vo2Max).filter((value): value is number => value != null)
  if (vo2.length) lines.push(`VO2max estimate: ${vo2[vo2.length - 1]!.toFixed(1)}`)

  return lines.join('\n')
}

function formatClock(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  })
}

function renderEnvironment(environment: EnvironmentCard): string {
  const lines = ['## Conditions']

  if (environment.weatherSummary) lines.push(environment.weatherSummary)

  const details: string[] = []
  if (environment.temperatureF != null) details.push(`${Math.round(environment.temperatureF)}°F`)
  if (environment.windMph != null) details.push(`wind ${Math.round(environment.windMph)} mph`)
  if (environment.precipitationChance != null) {
    details.push(`${Math.round(environment.precipitationChance)}% precipitation`)
  }
  if (environment.airQuality != null) details.push(`AQI ${Math.round(environment.airQuality)}`)
  if (details.length) lines.push(details.join(', '))

  if (environment.lakeTempF != null) {
    const wetsuit = environment.lakeTempF < 78 ? ' (wetsuit legal)' : ''
    lines.push(`Lake Michigan: ${Math.round(environment.lakeTempF)}°F${wetsuit}`)
  }

  if (environment.sunrise && environment.sunset) {
    lines.push(`Daylight: ${environment.sunrise} to ${environment.sunset}`)
  }

  if (environment.alerts?.length) {
    lines.push(`Alerts: ${environment.alerts.join('; ')}`)
  }

  return lines.join('\n')
}

function renderProjection(projection: RaceProjection): string {
  const lines = ['## Race projection']

  const delta = projection.projectedSeconds - projection.goalSeconds
  lines.push(
    `Projected ${formatTime(projection.projectedSeconds)} against a goal of ${formatTime(projection.goalSeconds)} (${delta > 0 ? '+' : ''}${formatTime(delta)})`
  )
  lines.push(
    `Range: ${formatTime(projection.confidenceLow)} to ${formatTime(projection.confidenceHigh)}`
  )

  lines.push('\nSplits (projected vs budget):')
  for (const split of projection.splits) {
    lines.push(
      `  ${split.discipline.padEnd(5)} ${formatTime(split.projectedSeconds)} vs ${formatTime(split.budgetSeconds)}  ${split.deltaSeconds > 0 ? '+' : ''}${formatTime(split.deltaSeconds)}  — ${split.basis}`
    )
  }

  if (projection.limiters.length) {
    lines.push('\nLimiters:')
    for (const limiter of projection.limiters) lines.push(`  - ${limiter}`)
  }

  return lines.join('\n')
}

function renderMemories(memories: MemoryItem[]): string {
  const lines = ['## What you remember about this athlete']
  for (const memory of memories) {
    lines.push(`  - [${memory.memoryType}] ${memory.content}`)
  }
  return lines.join('\n')
}

function renderKnowledge(snippets: KnowledgeSnippet[]): string {
  const lines = ['## Relevant reference material']
  for (const snippet of snippets) {
    const source = snippet.citation ?? snippet.title
    const heading = snippet.heading ? ` — ${snippet.heading}` : ''
    lines.push(`\n### ${source}${heading}\n${snippet.content}`)
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime()
  const b = new Date(`${to}T00:00:00Z`).getTime()
  return Math.round(Math.abs(b - a) / 86_400_000)
}

function formatPace(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}:${String(secs).padStart(2, '0')}`
}
