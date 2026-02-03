/**
 * Custom Backfill: Mark daily routines (morning/night) as complete
 * POST - Backfill routines for a date range
 *
 * This is a one-time administrative endpoint.
 */

import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { NextRequest, NextResponse } from 'next/server'

interface BackfillRoutinesRequest {
  startDate: string  // ISO date string (e.g., "2026-01-01")
  endDate: string    // ISO date string (e.g., "2026-01-31")
  types?: ('morning' | 'night')[]  // Which routines to mark complete, defaults to both
  dryRun?: boolean
}

interface BackfillResult {
  success: boolean
  daysProcessed: number
  routinesCompleted: number
  details: Array<{
    date: string
    dayOfWeek: DayOfWeek
    weekNumber: number
    year: number
    morning?: boolean
    night?: boolean
  }>
  errors: string[]
}

function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()] ?? 'monday'
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

/**
 * POST /api/fitness/backfill-routines
 * Mark morning/night routines as complete for a date range
 *
 * Example curl:
 * curl -X POST "http://localhost:3000/api/fitness/backfill-routines" \
 *   -H "Content-Type: application/json" \
 *   -d '{"startDate": "2026-01-01", "endDate": "2026-01-31"}'
 */
export async function POST(request: NextRequest) {
  try {
    const body: BackfillRoutinesRequest = await request.json()

    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(body.startDate)
    const endDate = new Date(body.endDate)
    const types = body.types || ['morning', 'night']
    const dryRun = body.dryRun ?? false

    console.log(`[Backfill Routines] Processing ${startDate.toISOString()} to ${endDate.toISOString()}`)
    console.log(`[Backfill Routines] Types: ${types.join(', ')}, Dry run: ${dryRun}`)

    const result: BackfillResult = {
      success: true,
      daysProcessed: 0,
      routinesCompleted: 0,
      details: [],
      errors: [],
    }

    const adapter = getFitnessAdapter()

    // Iterate through each day in the range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dayOfWeek = getDayOfWeek(currentDate)
      const weekNumber = getWeekNumber(currentDate)
      const year = currentDate.getFullYear()
      const dateStr = currentDate.toISOString().split('T')[0]

      const detail: BackfillResult['details'][0] = {
        date: dateStr!,
        dayOfWeek,
        weekNumber,
        year,
      }

      try {
        if (!dryRun) {
          // Mark morning routine complete
          if (types.includes('morning')) {
            await adapter.markRoutineComplete('morning', dayOfWeek, weekNumber)
            detail.morning = true
            result.routinesCompleted++
          }

          // Mark night routine complete
          if (types.includes('night')) {
            await adapter.markRoutineComplete('night', dayOfWeek, weekNumber)
            detail.night = true
            result.routinesCompleted++
          }
        } else {
          // Dry run - just mark what would happen
          if (types.includes('morning')) detail.morning = true
          if (types.includes('night')) detail.night = true
          result.routinesCompleted += types.length
        }

        result.details.push(detail)
        result.daysProcessed++
      } catch (err) {
        result.errors.push(`Error on ${dateStr}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log(`[Backfill Routines] Complete: ${result.daysProcessed} days, ${result.routinesCompleted} routines`)

    return NextResponse.json({
      success: result.success,
      data: {
        summary: {
          daysProcessed: result.daysProcessed,
          routinesCompleted: result.routinesCompleted,
          types,
          dryRun,
          dateRange: {
            start: body.startDate,
            end: body.endDate,
          },
        },
        errors: result.errors,
        // Show first 10 details as sample
        sampleDetails: result.details.slice(0, 10),
        totalDays: result.details.length,
      },
    })
  } catch (error) {
    console.error('[Backfill Routines] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
