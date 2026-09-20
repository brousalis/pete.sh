/**
 * GET /api/coach/injury — injury record, symptom history and body trend
 *
 * Symptoms are returned as a per-site series so the Body page can show
 * whether a site is trending up or settling. A single number hides exactly
 * the pattern that matters.
 */

import { NextRequest } from 'next/server'

import { handleApiError, successResponse } from '@/lib/api/utils'
import {
  coachDb,
  getActiveInjuries,
  getBenchmarks,
  getDailyMetrics,
  getSymptoms,
} from '@/lib/services/coach/coach-data.service'
import { daysAgo } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const days = Number(request.nextUrl.searchParams.get('days') ?? '90')
    const from = daysAgo(Number.isFinite(days) ? days : 90)
    const today = new Date().toISOString().slice(0, 10)

    const [injuries, symptoms, metrics, quadTests, events, medications] = await Promise.all([
      getActiveInjuries(),
      getSymptoms(from),
      getDailyMetrics(from, today),
      getBenchmarks('quad_symmetry'),
      coachDb()
        .from('coach_injury_event')
        .select('event_date, event_type, provider, summary, findings')
        .gte('event_date', daysAgo(400))
        .order('event_date', { ascending: false }),
      coachDb()
        .from('coach_medication_log')
        .select('log_date, medication, dose_mg, reason')
        .gte('log_date', from)
        .order('log_date', { ascending: false }),
    ])

    // Group symptoms by site so each one gets its own trend line.
    const bySite = new Map<string, { date: string; pain: number }[]>()
    for (const symptom of symptoms) {
      const series = bySite.get(symptom.site) ?? []
      series.push({ date: symptom.logDate, pain: symptom.painScore })
      bySite.set(symptom.site, series)
    }

    const siteTrends = [...bySite].map(([site, series]) => {
      const ordered = series.sort((a, b) => a.date.localeCompare(b.date))
      const recent = ordered.slice(-5)
      const earlier = ordered.slice(-10, -5)

      const recentAvg = average(recent.map((point) => point.pain))
      const earlierAvg = average(earlier.map((point) => point.pain))

      return {
        site,
        series: ordered,
        latest: ordered[ordered.length - 1]?.pain ?? null,
        max: Math.max(...ordered.map((point) => point.pain)),
        // Needs both windows to call a direction; otherwise it is just noise.
        trend:
          recentAvg == null || earlierAvg == null
            ? 'unknown'
            : recentAvg > earlierAvg + 0.5
              ? 'worsening'
              : recentAvg < earlierAvg - 0.5
                ? 'improving'
                : 'stable',
      }
    })

    // NSAID use is tracked because the MD advised consistency during the
    // build, and sustained use warrants a clinical conversation.
    const nsaidDays = new Set(
      ((medications.data ?? []) as { log_date: string; medication: string }[])
        .filter((row) => /ibuprofen|naproxen|aspirin|nsaid|advil|aleve/i.test(row.medication))
        .map((row) => row.log_date)
    ).size

    return successResponse({
      injuries,
      siteTrends,
      symptomCount: symptoms.length,
      painFreeDays: countPainFreeDays(symptoms, from, today),
      quadSymmetry: {
        latest: quadTests[0] ?? null,
        passed: quadTests[0]?.passed ?? false,
        history: quadTests,
      },
      clinicalEvents: events.data ?? [],
      medication: {
        entries: medications.data ?? [],
        nsaidDaysInWindow: nsaidDays,
        // 15+ days in a month is where it stops being "as needed".
        reviewSuggested: nsaidDays >= 15,
      },
      body: metrics.map((metric) => ({
        date: metric.metricDate,
        weightLbs: metric.bodyMassLbs,
        bodyFatPct: metric.bodyFatPercentage,
        leanMassLbs: metric.leanBodyMassLbs,
        hrvSdnn: metric.hrvSdnn,
        restingHr: metric.restingHeartRate,
        sleepHours: metric.sleepSeconds ? metric.sleepSeconds / 3600 : null,
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Days in the window with no symptom logged above zero. */
function countPainFreeDays(
  symptoms: { logDate: string; painScore: number }[],
  from: string,
  to: string
): number {
  const painDays = new Set(
    symptoms.filter((symptom) => symptom.painScore > 0).map((symptom) => symptom.logDate)
  )

  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1

  return Math.max(0, totalDays - painDays.size)
}
