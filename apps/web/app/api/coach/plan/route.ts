/**
 * GET  /api/coach/plan — sessions in a date range, grouped by week
 * POST /api/coach/plan — apply a plan change from the UI
 *
 * The POST path runs through the same guardrail validation the coach uses,
 * so dragging a session in the calendar cannot create a plan the coach would
 * have refused to write.
 */

import { NextRequest } from 'next/server'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import {
  getCurrentBlock,
  getMacrocycle,
  getSessionsInRange,
} from '@/lib/services/coach/coach-data.service'
import { getDayActualsByDate } from '@/lib/services/coach/day-actuals.service'
import { applyProposal, buildGuardrailContext } from '@/lib/services/coach/plan.service'
import { enrichSessionsWithActivity } from '@/lib/services/coach/session-activity-glance.service'
import { YEAR_PLAN_PHASES } from '@/lib/types/coach-ui.types'
import { applyChanges, evaluateGuardrails, isoWeekStart, planProposalSchema } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    const from = params.get('from') ?? isoWeekStart(today)
    const to = params.get('to') ?? addDays(from, 27)

    const [sessions, macrocycle, block, dayActualsByDate] = await Promise.all([
      getSessionsInRange(from, to),
      getMacrocycle(),
      getCurrentBlock(),
      getDayActualsByDate(from, to).catch(() => ({})),
    ])

    const uiSessions = await enrichSessionsWithActivity(sessions)

    const weeks = new Map<string, typeof uiSessions>()
    for (const session of uiSessions) {
      const week = isoWeekStart(session.sessionDate ?? from)
      const list = weeks.get(week) ?? []
      list.push(session)
      weeks.set(week, list)
    }

    return successResponse({
      from,
      to,
      weeks: [...weeks]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekStart, weekSessions]) => ({
          weekStart,
          plannedTss: weekSessions.reduce((sum, session) => sum + (session.plannedLoad ?? 0), 0),
          sessions: weekSessions,
        })),
      dayActualsByDate,
      yearPlan: macrocycle ? buildYearPlan(macrocycle, block, today) : null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // `dryRun` powers the live guardrail feedback shown while dragging a
    // session, before the drop is committed.
    if (body?.dryRun === true) {
      const parsed = planProposalSchema.safeParse(body.proposal)
      if (!parsed.success) {
        return errorResponse(
          parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
          400
        )
      }

      const dates = parsed.data.changes
        .map((change) =>
          'session' in change ? change.session.sessionDate : 'toDate' in change ? change.toDate : null
        )
        .filter((date): date is string => Boolean(date))
        .sort()

      const from = dates[0] ?? new Date().toISOString().slice(0, 10)
      const to = dates[dates.length - 1] ?? from

      const existing = await getSessionsInRange(from, to)
      const context = await buildGuardrailContext(from, to)
      const projected = applyChanges(existing, parsed.data.changes)
      const report = evaluateGuardrails({ ...context, sessions: projected })

      return successResponse({ dryRun: true, guardrailReport: report })
    }

    const result = await applyProposal(body.proposal ?? body, {
      actor: 'athlete',
      force: body?.force === true,
    })

    return successResponse(result, result.applied ? 200 : 409)
  } catch (error) {
    return handleApiError(error)
  }
}

function buildYearPlan(
  macrocycle: NonNullable<Awaited<ReturnType<typeof getMacrocycle>>>,
  block: Awaited<ReturnType<typeof getCurrentBlock>>,
  today: string
) {
  const raceMs = new Date(`${macrocycle.goalRaceDate}T12:00:00Z`).getTime()
  const todayMs = new Date(`${today}T12:00:00Z`).getTime()
  const daysToRace = Math.max(0, Math.round((raceMs - todayMs) / 86_400_000))

  const startMs = new Date(`${macrocycle.startDate}T12:00:00Z`).getTime()
  const weekIndex = Math.floor((todayMs - startMs) / (7 * 86_400_000)) + 1
  // Before the start date, treat as week 1 so the opening phase is highlighted.
  const currentWeek = weekIndex < 1 ? 1 : weekIndex > 48 ? 48 : weekIndex

  return {
    name: macrocycle.name,
    goalRaceName: macrocycle.goalRaceName,
    goalRaceDate: macrocycle.goalRaceDate,
    goalTimeSeconds: macrocycle.goalTimeSeconds,
    startDate: macrocycle.startDate,
    daysToRace,
    currentWeek,
    currentBlock: block
      ? {
          name: block.name,
          phase: block.phase,
          number: block.blockNumber,
          goals: block.goals,
        }
      : null,
    phases: YEAR_PLAN_PHASES.map((phase) => ({
      weekFrom: phase.weekFrom,
      weekTo: phase.weekTo,
      label: phase.label,
      intent: phase.intent,
      current:
        currentWeek != null && currentWeek >= phase.weekFrom && currentWeek <= phase.weekTo,
    })),
  }
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}
