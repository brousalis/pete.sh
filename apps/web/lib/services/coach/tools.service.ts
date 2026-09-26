/**
 * Tool implementations.
 *
 * Supplies the data access that coach-core's tool definitions declare. Every
 * method returns a compact, prompt-shaped result: computed numbers and short
 * summaries, never raw sample series. A single long ride holds thousands of
 * heart rate points and none of them belong in a context window.
 */

import {
  createCoachTools,
  daysAgo,
  formatTime,
  improvementLeverage,
  readinessGuidance,
  vdotPaces,
  type CoachToolDeps,
} from '@petehome/coach-core'
import type { Tool } from 'ai'

import {
  computeAndStoreReadiness,
  getLoadSummary,
  getRaceProjection,
  resolveThresholds,
} from './analytics.service'
import {
  coachDb,
  getActiveInjuries,
  getActivity,
  getAthleteProfile,
  getBenchmarks,
  getHrZoneConfig,
  getPtProtocols,
  getSessionsInRange,
  getSymptoms,
  logSymptom as persistSymptom,
  queryActivities,
} from './coach-data.service'
import { getCalendarWindows, getLakeConditions, getWeatherContext } from './environment.service'
import { searchKnowledge, searchPubmed } from './knowledge.service'
import { recall as recallMemories, remember as storeMemory } from './memory.service'
import { applyProposal } from './plan.service'

export function createToolDeps(): CoachToolDeps {
  return {
    async getAthleteProfile() {
      const [profile, thresholds] = await Promise.all([getAthleteProfile(), resolveThresholds()])
      if (!profile) return { error: 'No athlete profile configured.' }

      const age = profile.birthDate
        ? Math.floor(
            (Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 86_400_000)
          )
        : null

      return {
        name: profile.name,
        age,
        heightInches: profile.heightCm ? Math.round(profile.heightCm / 2.54) : null,
        weightBandLbs: [profile.weightTargetLowLbs, profile.weightTargetHighLbs],
        maxHr: profile.maxHr,
        restingHr: profile.restingHrBaseline,
        lthr: thresholds.lthr,
        cssPacePer100yd: profile.cssPacePer100yd,
        cssSpeedMps: thresholds.cssSpeed,
        vdot: thresholds.vdot,
        ftpWatts: thresholds.ftpWatts,
        goalRace: profile.goalRaceName,
        goalDate: profile.goalRaceDate,
        goalTime: profile.goalTimeSeconds ? formatTime(profile.goalTimeSeconds) : null,
        notes: profile.notes,
      }
    },

    async getInjuryStatus() {
      const [injuries, symptoms] = await Promise.all([
        getActiveInjuries(),
        getSymptoms(daysAgo(30)),
      ])

      return {
        injuries: injuries.map((injury) => ({
          name: injury.name,
          status: injury.status,
          severity: injury.severity,
          sites: injury.sites,
          findings: injury.diagnosis?.findings ?? null,
          contraindications: injury.contraindications,
          clearanceConditions:
            (injury.clearances as { conditions?: unknown })?.conditions ?? null,
        })),
        symptomsLast30Days: symptoms.map((symptom) => ({
          date: symptom.logDate,
          site: symptom.site,
          pain: symptom.painScore,
          context: symptom.context,
          mechanicalSigns: [
            symptom.swelling ? 'swelling' : null,
            symptom.locking ? 'locking' : null,
            symptom.instability ? 'instability' : null,
          ].filter(Boolean),
          notes: symptom.notes,
        })),
        maxPain30Days: symptoms.length
          ? Math.max(...symptoms.map((symptom) => symptom.painScore))
          : 0,
      }
    },

    async queryActivities(input) {
      const activities = await queryActivities({
        from: input.from ?? daysAgo(28),
        to: input.to,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sports: input.sports as any,
        limit: input.limit ?? 30,
      })

      return activities.map((activity) => ({
        id: activity.id,
        date: activity.activityDate,
        sport: activity.sport,
        durationMinutes: Math.round(activity.durationSeconds / 60),
        distance: formatDistance(activity.distanceMeters, activity.sport),
        avgHr: activity.hrAverage,
        maxHr: activity.hrMax,
        tss: activity.tss,
        tssMethod: activity.tssMethod,
        decouplingPct: activity.decouplingPct,
        zoneSeconds: activity.zoneSeconds,
        indoor: activity.isIndoor,
      }))
    },

    async getActivityDetail(activityId) {
      const activity = await getActivity(activityId)
      if (!activity) return { error: 'Activity not found.' }

      const db = coachDb()

      const [{ data: splits }, { data: lengths }] = await Promise.all([
        db
          .from('apple_health_splits')
          .select('split_number, split_type, time_seconds, avg_pace, avg_hr, avg_cadence')
          .eq('workout_id', activityId)
          .order('split_number'),
        activity.sport === 'swim'
          ? db
              .from('apple_health_swim_lengths')
              .select('length_number, duration_seconds, stroke_count, stroke_style, swolf, is_rest')
              .eq('workout_id', activityId)
              .order('length_number')
          : Promise.resolve({ data: null }),
      ])

      return {
        id: activity.id,
        date: activity.activityDate,
        sport: activity.sport,
        durationMinutes: Math.round(activity.durationSeconds / 60),
        distance: formatDistance(activity.distanceMeters, activity.sport),
        avgHr: activity.hrAverage,
        maxHr: activity.hrMax,
        tss: activity.tss,
        tssMethod: activity.tssMethod,
        intensityFactor: activity.intensityFactor,
        decouplingPct: activity.decouplingPct,
        zoneSeconds: activity.zoneSeconds,
        cadence: activity.cadenceAverage,
        runningPower: activity.runningPowerAvg,
        elevationGainMeters: activity.elevationGainMeters,
        splits: splits ?? [],
        swimLengths: lengths ?? null,
      }
    },

    async getDailyMetrics(input) {
      const { getDailyMetrics } = await import('./coach-data.service')
      const metrics = await getDailyMetrics(daysAgo(input.days), new Date().toISOString().slice(0, 10))

      return metrics.map((metric) => {
        const sleepHours = metric.sleepSeconds
          ? Math.round((metric.sleepSeconds / 3600) * 10) / 10
          : null
        const inBedHours = metric.sleepInBed
          ? Math.round((metric.sleepInBed / 3600) * 10) / 10
          : null
        const efficiency =
          metric.sleepSeconds != null && metric.sleepInBed != null && metric.sleepInBed > 0
            ? Math.round((metric.sleepSeconds / metric.sleepInBed) * 100)
            : null

        return {
          date: metric.metricDate,
          hrvSdnn: metric.hrvSdnn,
          hrvRmssd: metric.hrvRmssd ?? null,
          hrvOvernightAvg: metric.hrvOvernightAvg ?? null,
          hrvMorning: metric.hrvMorning ?? null,
          restingHr: metric.restingHeartRate,
          sleepHours,
          sleepInBedHours: inBedHours,
          sleepEfficiencyPct: efficiency,
          sleepStart: metric.sleepStart ?? null,
          sleepEnd: metric.sleepEnd ?? null,
          sleepDeepMinutes: metric.sleepDeep ? Math.round(metric.sleepDeep / 60) : null,
          sleepRemMinutes: metric.sleepRem ? Math.round(metric.sleepRem / 60) : null,
          sleepCoreMinutes: metric.sleepCore ? Math.round(metric.sleepCore / 60) : null,
          sleepAwakeMinutes: metric.sleepAwake ? Math.round(metric.sleepAwake / 60) : null,
          sleepUnspecifiedMinutes: metric.sleepUnspecified
            ? Math.round(metric.sleepUnspecified / 60)
            : null,
          respiratoryRate: metric.respiratoryRate,
          wristTempDelta: metric.wristTempDelta,
          spo2: metric.spo2,
          breathingDisturbances: metric.breathingDisturbances ?? null,
          breathingDisturbancesElevated: metric.breathingDisturbancesElevated ?? null,
          sleepApneaEventCount: metric.sleepApneaEventCount ?? null,
          weightLbs: metric.bodyMassLbs,
          bodyFatPct: metric.bodyFatPercentage,
          vo2Max: metric.vo2Max,
        }
      })
    },

    async getTrainingLoad(input) {
      const summary = await getLoadSummary(input.days)

      return {
        current: summary.current
          ? {
              fitnessCtl: summary.current.ctl,
              fatigueAtl: summary.current.atl,
              formTsb: summary.current.tsb,
            }
          : null,
        acwr: summary.acwr,
        acwrInterpretation:
          summary.acwr == null
            ? 'Not enough history for a reliable ratio.'
            : summary.acwr > 1.5
              ? 'Above the injury-risk threshold.'
              : summary.acwr > 1.3
                ? 'Above the working ceiling for an athlete in rehab.'
                : summary.acwr < 0.8
                  ? 'Detraining.'
                  : 'In range.',
        monotony: summary.monotony,
        weeklyTss: summary.weeklyTss,
        weeklyTssBySport: summary.weeklyTssBySport,
        // Weekly points only; a daily series would dominate the context.
        trend: summary.pmc
          .filter((_, index, array) => index % 7 === 0 || index === array.length - 1)
          .slice(-12)
          .map((point) => ({ date: point.date, ctl: point.ctl, atl: point.atl, tsb: point.tsb })),
      }
    },

    async getReadiness(input) {
      const readiness = await computeAndStoreReadiness(input.date)
      return { ...readiness, guidance: readinessGuidance(readiness.level) }
    },

    async getPlan(input) {
      const sessions = await getSessionsInRange(input.from, input.to)

      return sessions.map((session) => ({
        id: session.id,
        date: session.sessionDate,
        slot: session.slot,
        sport: session.sport,
        type: session.sessionType,
        title: session.title,
        durationMinutes: session.plannedDurationSeconds
          ? Math.round(session.plannedDurationSeconds / 60)
          : null,
        distance: formatDistance(session.plannedDistanceMeters, session.sport),
        plannedTss: session.plannedLoad,
        targets: session.targets,
        rationale: session.rationale,
        status: session.status,
      }))
    },

    async proposePlanChange(proposal) {
      const result = await applyProposal(proposal, { actor: 'coach' })

      return {
        applied: result.applied,
        guardrailReport: result.guardrailReport,
        schemaErrors: result.schemaErrors,
        summary: result.summary,
      }
    },

    async logSymptom(input) {
      const id = await persistSymptom(input)

      // Recompute immediately: a symptom changes readiness and may open a
      // guardrail violation for a session later the same day.
      const readiness = await computeAndStoreReadiness().catch(() => null)

      return {
        id,
        recorded: true,
        readinessAfter: readiness ? { score: readiness.score, level: readiness.level } : null,
        note:
          input.swelling || input.locking || input.instability
            ? 'Mechanical signs recorded. This triggers a red flag: training is held until a clinician reviews it.'
            : input.painScore >= 4
              ? 'At or above the 4/10 threshold; running is blocked for today.'
              : undefined,
      }
    },

    async logFeedback(input) {
      const { error } = await coachDb()
        .from('coach_session_feedback')
        .insert({
          session_id: input.sessionId ?? null,
          rpe: input.rpe ?? null,
          mood: input.mood ?? null,
          energy: input.energy ?? null,
          sleep_quality: input.sleepQuality ?? null,
          max_pain: input.maxPain ?? null,
          notes: input.notes ?? null,
        })

      if (error) return { recorded: false, error: error.message }
      return { recorded: true }
    },

    async remember(input) {
      return storeMemory({
        content: input.content,
        memoryType: input.memoryType,
        tags: input.tags,
        confidence: input.confidence,
        source: 'tool',
      })
    },

    async recall(input) {
      const memories = await recallMemories(input.query, input.limit ?? 8)

      return memories.map((memory) => ({
        content: memory.content,
        type: memory.memoryType,
        tags: memory.tags,
        confidence: memory.confidence,
        lastReinforced: memory.lastReinforcedAt.slice(0, 10),
      }))
    },

    async searchKnowledge(input) {
      const results = await searchKnowledge(input.query, input.limit ?? 6)

      return results.map((result) => ({
        source: result.citation ?? result.title,
        heading: result.heading,
        // Trimmed: full chunks are up to 2,400 characters and six of them
        // would dominate the volatile context budget.
        excerpt: result.content.slice(0, 900),
        matchType: result.matchType,
      }))
    },

    async searchPubmed(input) {
      const results = await searchPubmed(input.query, input.limit ?? 5)

      return results.map((result) => ({
        pmid: result.pmid,
        title: result.title,
        journal: result.journal,
        year: result.year,
        authors: result.authors,
        url: result.url,
      }))
    },

    async getWeather(input) {
      return getWeatherContext(input.date)
    },

    async getLakeConditions() {
      return getLakeConditions()
    },

    async getCalendar(input) {
      const windows = await getCalendarWindows(input.days)
      if (windows.length === 0) {
        return { available: false, note: 'Calendar is not connected; assume normal availability.' }
      }

      return {
        available: true,
        days: windows.map((window) => ({
          date: window.date,
          longestFreeMinutes: window.longestFreeMinutes,
          busy: window.busyBlocks.map(
            (block) => `${block.start.slice(11, 16)}–${block.end.slice(11, 16)} ${block.summary}`
          ),
        })),
      }
    },

    async projectRace() {
      const projection = await getRaceProjection()
      if (!projection) return { error: 'No active macrocycle configured.' }

      return {
        projected: formatTime(projection.projectedSeconds),
        goal: formatTime(projection.goalSeconds),
        deltaSeconds: projection.projectedSeconds - projection.goalSeconds,
        range: [formatTime(projection.confidenceLow), formatTime(projection.confidenceHigh)],
        splits: projection.splits.map((split) => ({
          discipline: split.discipline,
          projected: formatTime(split.projectedSeconds),
          budget: formatTime(split.budgetSeconds),
          deltaSeconds: split.deltaSeconds,
          basis: split.basis,
        })),
        limiters: projection.limiters,
        leverage: improvementLeverage(projection),
      }
    },

    async computeZones() {
      const [zones, thresholds] = await Promise.all([getHrZoneConfig(), resolveThresholds()])

      return {
        heartRate: {
          maxHr: zones.maxHr,
          restingHr: zones.restingHr,
          z1: `< ${zones.z2}`,
          z2: `${zones.z2}–${zones.z3 - 1}`,
          z3: `${zones.z3}–${zones.z4 - 1}`,
          z4: `${zones.z4}–${zones.z5 - 1}`,
          z5: `${zones.z5}+`,
        },
        runPaces: thresholds.vdot
          ? formatVdotPaces(thresholds.vdot)
          : { note: 'No VDOT on record. Run a time trial to establish training paces.' },
        swim: thresholds.cssSpeed
          ? {
              cssPacePer100yd: formatPace((100 * 0.9144) / thresholds.cssSpeed),
              easyPer100yd: formatPace(((100 * 0.9144) / thresholds.cssSpeed) * 1.12),
              thresholdPer100yd: formatPace((100 * 0.9144) / thresholds.cssSpeed),
              fastPer100yd: formatPace(((100 * 0.9144) / thresholds.cssSpeed) * 0.94),
            }
          : { note: 'No CSS on record. Run a 400/200 time trial.' },
        bike: thresholds.ftpWatts
          ? { ftp: thresholds.ftpWatts, z2: `${Math.round(thresholds.ftpWatts * 0.65)} W` }
          : { note: 'No power meter. Bike sessions are prescribed by heart rate and cadence.' },
      }
    },

    async getBenchmarks(input) {
      const benchmarks = await getBenchmarks(input.testType)

      return benchmarks.map((benchmark) => ({
        date: benchmark.testDate,
        type: benchmark.testType,
        result: benchmark.result,
        passed: benchmark.passed,
        notes: benchmark.notes,
      }))
    },

    async getGear() {
      const { listGear, getGearAlerts, listRecommendations } = await import('./gear.service')

      const [items, alerts, recommendations] = await Promise.all([
        listGear(),
        getGearAlerts(),
        listRecommendations(),
      ])

      return {
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          sport: item.sport,
          miles: item.totalMiles,
          lifeRemainingPct: item.lifeRemainingPct,
          status: item.status,
          serviceDue: item.serviceDue,
        })),
        alerts,
        // Existing recommendations, so the coach does not propose the same
        // upgrade twice.
        openRecommendations: recommendations
          .filter((recommendation) => recommendation.status === 'proposed')
          .map((recommendation) => ({
            title: recommendation.title,
            costUsd: recommendation.estimatedCostUsd,
            secondsSaved: recommendation.estimatedSecondsSaved,
            costPerSecond: recommendation.costPerSecond,
          })),
      }
    },

    async recommendGear(input) {
      const { data, error } = await coachDb()
        .from('coach_gear_recommendation')
        .insert({
          title: input.title,
          category: input.category,
          rationale: input.rationale,
          estimated_cost_usd: input.estimatedCostUsd ?? null,
          estimated_seconds_saved: input.estimatedSecondsSaved ?? null,
          // Cheap time is high priority; expensive marginal gains are not.
          priority:
            input.estimatedSecondsSaved && input.estimatedCostUsd
              ? Math.max(1, Math.min(10, Math.round(input.estimatedCostUsd / Math.max(1, input.estimatedSecondsSaved))))
              : 5,
        })
        .select('id')
        .single()

      if (error) return { recorded: false, error: error.message }
      return { recorded: true, id: data.id }
    },

    async getNutritionTargets(input) {
      const { getNutritionTargets: resolve } = await import('./nutrition.service')
      const targets = await resolve(input.date)

      return {
        ...targets,
        note: 'Maintenance fuelling, periodised to load. No calorie deficit: the athlete is at goal weight and is healing cartilage and tendon.',
      }
    },

    async getPtProtocol() {
      const protocols = await getPtProtocols()
      const today = new Date().toISOString().slice(0, 10)

      const { data: completions } = await coachDb()
        .from('coach_pt_completion')
        .select('protocol_id, skipped')
        .eq('completed_date', today)

      const completedIds = new Set(
        ((completions ?? []) as { protocol_id: string; skipped: boolean }[])
          .filter((row) => !row.skipped)
          .map((row) => row.protocol_id)
      )

      return protocols.map((protocol) => ({
        slug: protocol.slug,
        name: protocol.name,
        timeOfDay: protocol.timeOfDay,
        cadence: protocol.cadence,
        mandatory: protocol.isMandatory,
        completedToday: completedIds.has(protocol.id),
        exercises: protocol.items.map((item) => ({
          name: item.name,
          prescription: item.prescription,
          cues: item.cues,
        })),
      }))
    },

    async scheduleReminder(input) {
      // Push reminders are not wired; do not pollute coach_audible (plan audit log).
      console.warn(
        '[coach] schedule_reminder is not configured yet:',
        input.at,
        input.message
      )
      return {
        scheduled: false,
        error: 'Push reminders are not configured yet.',
      }
    },
  }
}

export function buildCoachTools(options: { readOnly?: boolean } = {}): Record<string, Tool> {
  return createCoachTools(createToolDeps(), options)
}

// ---------------------------------------------------------------------------

function formatDistance(meters: number | null | undefined, sport: string): string | null {
  if (!meters || meters <= 0) return null
  if (sport === 'swim') return `${Math.round(meters * 1.09361)} yd`
  return `${(meters / 1609.344).toFixed(2)} mi`
}

function formatPace(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function formatVdotPaces(vdot: number): Record<string, string> {
  const paces = vdotPaces(vdot)
  return {
    easy: `${formatPace(paces.easy[1])}–${formatPace(paces.easy[0])}/mi`,
    marathon: `${formatPace(paces.marathon)}/mi`,
    threshold: `${formatPace(paces.threshold)}/mi`,
    interval: `${formatPace(paces.interval)}/mi`,
    repetition: `${formatPace(paces.repetition)}/mi`,
  }
}
