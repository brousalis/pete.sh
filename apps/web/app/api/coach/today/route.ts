/**
 * GET /api/coach/today — everything the Today screen and the watch need.
 *
 * One request rather than six, because the watch is on cellular and the PWA
 * is opened before a session when the athlete is not inclined to wait.
 */

import { NextRequest } from 'next/server'

import { handleApiError, successResponse } from '@/lib/api/utils'
import { computeAndStoreReadiness, getLoadSummary } from '@/lib/services/coach/analytics.service'
import {
  coachDb,
  getActiveInjuries,
  getCurrentBlock,
  getDailyMetrics,
  getPtProtocols,
  getSessionsInRange,
  getSymptoms,
  isIntakeComplete,
  getBenchmarks,
} from '@/lib/services/coach/coach-data.service'
import { getLakeConditions, getWeatherContext } from '@/lib/services/coach/environment.service'
import { getDayActuals } from '@/lib/services/coach/day-actuals.service'
import { enrichSessionsWithActivity } from '@/lib/services/coach/session-activity-glance.service'
import { readinessGuidance } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const date =
      request.nextUrl.searchParams.get('date') ??
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    const [sessions, protocols, injuries, symptoms, block, intakeComplete, tests] = await Promise.all([
      getSessionsInRange(date, date),
      getPtProtocols(),
      getActiveInjuries(),
      getSymptoms(date, date),
      getCurrentBlock(),
      isIntakeComplete().catch(() => false),
      getBenchmarks().catch(() => []),
    ])

    // These can each fail without making the screen useless.
    const [readiness, load, weather, lake, completions, briefing, dailyMetrics] = await Promise.all([
      computeAndStoreReadiness(date).catch(() => null),
      getLoadSummary(60).catch(() => null),
      getWeatherContext(date).catch(() => null),
      getLakeConditions().catch(() => null),
      coachDb()
        .from('coach_pt_completion')
        .select('protocol_id, skipped')
        .eq('completed_date', date)
        .then((result: { data: unknown }) => result.data as { protocol_id: string; skipped: boolean }[] | null)
        .catch(() => null),
      coachDb()
        .from('coach_journal')
        .select('entry')
        .eq('week_start', date)
        .maybeSingle()
        .then((result: { data: { entry?: string } | null }) => result.data?.entry ?? null)
        .catch(() => null),
      getDailyMetrics(date, date).catch(() => []),
    ])

    const night = dailyMetrics.find((m) => m.metricDate === date)
    const lastNightSleep =
      night?.metricDate === date && night.sleepSeconds != null
        ? {
            hours: Math.round((night.sleepSeconds / 3600) * 10) / 10,
            inBedHours:
              night.sleepInBed != null
                ? Math.round((night.sleepInBed / 3600) * 10) / 10
                : null,
            efficiencyPct:
              night.sleepInBed != null && night.sleepInBed > night.sleepSeconds
                ? Math.round((night.sleepSeconds / night.sleepInBed) * 100)
                : null,
            deepMinutes: night.sleepDeep != null ? Math.round(night.sleepDeep / 60) : null,
            remMinutes: night.sleepRem != null ? Math.round(night.sleepRem / 60) : null,
            coreMinutes: night.sleepCore != null ? Math.round(night.sleepCore / 60) : null,
            awakeMinutes: night.sleepAwake != null ? Math.round(night.sleepAwake / 60) : null,
            start: night.sleepStart ?? null,
            end: night.sleepEnd ?? null,
            breathingDisturbancesElevated: night.breathingDisturbancesElevated ?? null,
          }
        : null

    const completed = new Map<string, boolean>(
      (completions ?? []).map((row: { protocol_id: string; skipped: boolean }) => [
        row.protocol_id,
        row.skipped,
      ])
    )

    // Only surface protocols that actually apply today.
    const hasRun = sessions.some((session) => session.sport === 'run')
    const applicableProtocols = protocols.filter((protocol) => {
      if (protocol.cadence === 'daily') return true
      if (protocol.cadence === 'run_days') return hasRun
      if (protocol.cadence === 'training_days') return sessions.length > 0
      return true
    })

    const [uiSessions, dayActuals] = await Promise.all([
      enrichSessionsWithActivity(sessions),
      getDayActuals(date, date).catch(() => []),
    ])

    return successResponse({
      date,
      briefing,
      readiness: readiness
        ? { ...readiness, guidance: readinessGuidance(readiness.level) }
        : null,
      lastNightSleep,
      sessions: uiSessions,
      dayActuals,
      ptProtocols: applicableProtocols.map((protocol) => ({
        id: protocol.id,
        slug: protocol.slug,
        name: protocol.name,
        timeOfDay: protocol.timeOfDay,
        durationMinutes: protocol.durationMinutes,
        mandatory: protocol.isMandatory,
        completed: completed.has(protocol.id) && completed.get(protocol.id) === false,
        skipped: completed.get(protocol.id) === true,
        exercises: protocol.items,
      })),
      symptomsToday: symptoms,
      injuries: injuries.map((injury) => ({
        name: injury.name,
        status: injury.status,
        sites: injury.sites,
      })),
      block: block
        ? { name: block.name, phase: block.phase, number: block.blockNumber, goals: block.goals }
        : null,
      load: load
        ? {
            ctl: load.current?.ctl ?? null,
            atl: load.current?.atl ?? null,
            tsb: load.current?.tsb ?? null,
            acwr: load.acwr,
            weeklyTss: load.weeklyTss,
          }
        : null,
      conditions: weather
        ? {
            summary: weather.summary,
            temperatureF: weather.temperatureF,
            windMph: weather.windMph,
            windDirection: weather.windDirection,
            precipitationChance: weather.precipitationChance,
            airQuality: weather.airQuality,
            sunrise: weather.sunrise,
            sunset: weather.sunset,
            notes: weather.trainingNotes,
            lakeTempF: lake?.waterTempF ?? null,
            lakeNote: lake?.note ?? null,
          }
        : null,
      onboard: {
        intakeComplete,
        missingTests: ['css', 'quad_symmetry', 'bike_z2'].filter((type) => {
          if (type === 'quad_symmetry') {
            return !tests.some((test) => test.testType === 'quad_symmetry' || test.testType === 'step_down')
          }
          return !tests.some((test) => test.testType === type)
        }),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
