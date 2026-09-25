/**
 * GET/POST /api/cron/[job] — Vercel Cron + manual job trigger.
 *
 * Auth: Authorization Bearer CRON_SECRET (Vercel injects this) or the
 * existing machine API key (COACH_API_KEY / PETEWATCH_API_KEY).
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  extractBearerToken,
  tokenMatchesMachineKey,
} from '@/lib/api/machine-auth'
import {
  runBlockReview,
  runDebrief,
  runDebriefSweep,
  runEveningNudge,
  runMorningBriefing,
  runNightlyMaintenance,
  runPolarSleepSync,
  runPtReminder,
  runWeeklyPlan,
  type JobResult,
} from '@/lib/services/coach/jobs.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

type JobName =
  | 'briefing'
  | 'pt-morning'
  | 'pt-evening'
  | 'nudge'
  | 'weekly-plan'
  | 'nightly'
  | 'debrief-sweep'
  | 'debrief'
  | 'block-review'
  | 'polar-sleep'

function authorize(request: NextRequest): boolean {
  const token = extractBearerToken(
    request.headers.get('Authorization'),
    request.headers.get('X-API-Key')
  )
  if (!token) return false

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret && token === cronSecret) return true

  return tokenMatchesMachineKey(token)
}

async function runJob(job: string, request: NextRequest): Promise<JobResult> {
  switch (job as JobName) {
    case 'briefing':
      return runMorningBriefing()
    case 'pt-morning':
      return runPtReminder('morning')
    case 'pt-evening':
      return runPtReminder('evening')
    case 'nudge':
      return runEveningNudge()
    case 'weekly-plan':
      return runWeeklyPlan()
    case 'nightly':
      return runNightlyMaintenance()
    case 'polar-sleep':
      return runPolarSleepSync()
    case 'debrief-sweep':
      return runDebriefSweep()
    case 'block-review':
      return runBlockReview()
    case 'debrief': {
      let activityId: string | null = request.nextUrl.searchParams.get('activity')
      if (!activityId && request.method !== 'GET') {
        try {
          const body = (await request.json()) as { activityId?: string }
          activityId = body.activityId ?? null
        } catch {
          // Empty or non-JSON body.
        }
      }
      if (!activityId) {
        return {
          job: 'debrief',
          ok: false,
          summary: 'debrief requires ?activity=<uuid> or JSON { activityId }',
        }
      }
      return runDebrief(activityId)
    }
    default:
      return {
        job,
        ok: false,
        summary: `Unknown job "${job}". Try briefing, pt-morning, pt-evening, nudge, weekly-plan, nightly, polar-sleep, debrief-sweep, debrief, block-review.`,
      }
  }
}

async function handle(request: NextRequest, job: string): Promise<NextResponse> {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runJob(job, request)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (error) {
    console.error(`[cron] ${job} failed:`, error)
    return NextResponse.json(
      {
        job,
        ok: false,
        summary: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ job: string }> }
): Promise<NextResponse> {
  const { job } = await context.params
  return handle(request, job)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ job: string }> }
): Promise<NextResponse> {
  const { job } = await context.params
  return handle(request, job)
}
