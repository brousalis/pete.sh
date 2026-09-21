/**
 * GET /api/coach/benchmarks — recorded tests
 * POST /api/coach/benchmarks — log a CSS, quad, bike or run time trial
 *
 * CSS and time-trial results write through to the athlete profile so load
 * and the race projection update immediately.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { getAthleteProfile, getBenchmarks, saveBenchmark } from '@/lib/services/coach/coach-data.service'
import { remember } from '@/lib/services/coach/memory.service'
import { computeCss, computeVdot, pacePer100Yards } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const benchmarkSchema = z.object({
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  testType: z.enum(['css', 'quad_symmetry', 'bike_z2', 'run_tt', 'ftp_20min', 'step_down', 'single_leg_squat']),
  notes: z.string().max(1000).optional(),
  css: z
    .object({
      time400Seconds: z.number().positive(),
      time200Seconds: z.number().positive(),
      unit: z.enum(['yards', 'meters']).optional(),
    })
    .optional(),
  quad: z
    .object({
      left: z.number().positive(),
      right: z.number().positive(),
      painFree: z.boolean(),
      test: z.enum(['step_down', 'single_leg_squat', 'leg_press']).optional(),
    })
    .optional(),
  bike: z
    .object({
      durationSeconds: z.number().positive(),
      avgHr: z.number().int().min(80).max(220),
      cadence: z.number().int().min(40).max(140),
      distanceMeters: z.number().positive().optional(),
    })
    .optional(),
  run: z
    .object({
      distanceMeters: z.number().positive(),
      timeSeconds: z.number().positive(),
    })
    .optional(),
  ftp: z
    .object({
      /** Mean power from a continuous 20-minute all-out effort (watts). */
      averageWatts20Min: z.number().positive(),
      /** Optional override; defaults to 0.95 × 20-min average. */
      ftpWatts: z.number().positive().optional(),
    })
    .optional(),
})

export async function GET(request: NextRequest) {
  try {
    const testType = request.nextUrl.searchParams.get('type') ?? undefined
    const tests = await getBenchmarks(testType)
    return successResponse({ tests })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = benchmarkSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    const input = parsed.data
    const testDate =
      input.testDate ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    let result: Record<string, unknown> = {}
    let passed: boolean | null = null
    let sport: string | null = null
    let summary = ''

    if (input.testType === 'css') {
      if (!input.css) return errorResponse('css times are required', 400)
      const yards = (input.css.unit ?? 'yards') === 'yards'
      const css = computeCss(400, input.css.time400Seconds, 200, input.css.time200Seconds)
      if (!css) return errorResponse('400 must be slower than 200 for CSS to be valid', 400)

      // computeCss uses whatever unit the distances are in. Yard tests already
      // produce seconds/100 yd; metre tests convert from m/s.
      const pacePer100yd = yards ? css.pacePer100 : pacePer100Yards(css.speed)
      result = {
        time400Seconds: input.css.time400Seconds,
        time200Seconds: input.css.time200Seconds,
        unit: input.css.unit ?? 'yards',
        speed: css.speed,
        pacePer100: css.pacePer100,
        pacePer100yd,
      }
      passed = true
      sport = 'swim'
      summary = `CSS ${formatPace(pacePer100yd)} /100 yd`
    } else if (input.testType === 'quad_symmetry' || input.testType === 'step_down' || input.testType === 'single_leg_squat') {
      if (!input.quad) return errorResponse('left and right measurements are required', 400)
      const weaker = Math.min(input.quad.left, input.quad.right)
      const stronger = Math.max(input.quad.left, input.quad.right)
      const ratio = stronger > 0 ? weaker / stronger : 0
      const within10 = ratio >= 0.9
      passed = input.quad.painFree && within10
      result = {
        left: input.quad.left,
        right: input.quad.right,
        ratio: Math.round(ratio * 1000) / 1000,
        deltaPct: Math.round((1 - ratio) * 1000) / 10,
        painFree: input.quad.painFree,
        test: input.quad.test ?? 'step_down',
      }
      sport = 'strength'
      summary = `Quad symmetry ${(ratio * 100).toFixed(0)}%${input.quad.painFree ? ', pain-free' : ', pain present'}`
    } else if (input.testType === 'bike_z2') {
      if (!input.bike) return errorResponse('bike Z2 fields are required', 400)
      passed = input.bike.cadence >= 85
      result = { ...input.bike }
      sport = 'bike'
      summary = `Bike Z2 ${Math.round(input.bike.durationSeconds / 60)} min @ ${input.bike.avgHr} bpm, ${input.bike.cadence} rpm`
    } else if (input.testType === 'run_tt') {
      if (!input.run) return errorResponse('run distance and time are required', 400)
      const vdot = computeVdot(input.run.distanceMeters, input.run.timeSeconds)
      result = { ...input.run, vdot }
      passed = vdot != null
      sport = 'run'
      summary = vdot
        ? `Run TT VDOT ${vdot}`
        : `Run TT ${input.run.distanceMeters} m in ${input.run.timeSeconds}s`
    } else if (input.testType === 'ftp_20min') {
      if (!input.ftp) return errorResponse('20-minute average watts are required', 400)
      const ftpWatts =
        input.ftp.ftpWatts ?? Math.round(input.ftp.averageWatts20Min * 0.95)
      result = {
        averageWatts20Min: input.ftp.averageWatts20Min,
        ftpWatts,
        factor: input.ftp.ftpWatts ? null : 0.95,
      }
      passed = ftpWatts > 0
      sport = 'bike'
      summary = `FTP ${ftpWatts} W (from ${input.ftp.averageWatts20Min} W × 20 min)`
    } else {
      return errorResponse(`Unsupported test type ${input.testType}`, 400)
    }

    const id = await saveBenchmark({
      testDate,
      testType: input.testType,
      sport,
      result,
      passed,
      notes: input.notes ?? null,
    })

    await remember({
      content: `${testDate}: ${summary}`,
      memoryType: 'fact',
      tags: ['benchmark', input.testType],
      confidence: 0.95,
      source: 'baseline_test',
    }).catch(() => undefined)

    const profile = await getAthleteProfile()

    return successResponse({
      id,
      testDate,
      testType: input.testType,
      result,
      passed,
      summary,
      profile: profile
        ? {
            cssPacePer100yd: profile.cssPacePer100yd,
            vdot: profile.vdot,
            ftpWatts: profile.ftpWatts,
          }
        : null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

function formatPace(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}
