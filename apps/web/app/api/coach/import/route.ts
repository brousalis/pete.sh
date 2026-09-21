/**
 * POST /api/coach/import — fallback activity upload (GPX / TCX)
 *
 * The Apple Watch is the primary recorder; this exists for the cases it is
 * not: a dead battery mid-ride, a session recorded elsewhere, or a file from
 * the historical Garmin export. Parsed files are normalised into the same
 * workout shape petehome posts, so everything downstream is identical.
 */

import { NextRequest } from 'next/server'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { appleHealthService } from '@/lib/services/apple-health.service'
import { parseActivityFile } from '@/lib/services/coach/activity-import.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAX_BYTES = 25 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('file').filter((entry): entry is File => entry instanceof File)

    if (files.length === 0) {
      return errorResponse('No file uploaded. Send one or more files in the "file" field.', 400)
    }

    const sportOverride = formData.get('sport')
    const sport = typeof sportOverride === 'string' && sportOverride ? sportOverride : undefined

    const results: {
      filename: string
      status: 'imported' | 'failed'
      activityId?: string
      warnings?: string[]
      error?: string
    }[] = []

    for (const file of files) {
      if (file.size > MAX_BYTES) {
        results.push({
          filename: file.name,
          status: 'failed',
          error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 25 MB.`,
        })
        continue
      }

      try {
        const contents = await file.text()
        const { workout, warnings } = parseActivityFile(file.name, contents, { sport })

        // saveWorkout upserts on healthkit_id, and the importer derives a
        // stable id from file content, so re-uploading is idempotent.
        const saved = await appleHealthService.saveWorkout({ workout })

        results.push({
          filename: file.name,
          status: 'imported',
          activityId: saved.id,
          warnings: warnings.length ? warnings : undefined,
        })
      } catch (error) {
        results.push({
          filename: file.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const imported = results.filter((result) => result.status === 'imported').length

    return successResponse({
      imported,
      failed: results.length - imported,
      results,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
