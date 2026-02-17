/**
 * Fridge Scan API Routes
 * POST - Analyze a fridge photo or voice transcript to identify ingredients
 * GET  - Retrieve latest scan or scan history
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeImage,
  parseVoiceTranscript,
  saveScan,
  getLatestScan,
  getScanHistory,
} from '@/lib/services/fridge-scan.service'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * POST /api/cooking/fridge-scan
 * Accepts { type: 'voice'|'photo', transcript?: string, image?: string }
 * Returns { scan: FridgeScan }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, transcript, image } = body as {
      type: 'voice' | 'photo'
      transcript?: string
      image?: string
    }

    if (!type || !['voice', 'photo'].includes(type)) {
      return withCors(
        NextResponse.json(
          { success: false, error: 'Invalid scan type. Must be "voice" or "photo".' },
          { status: 400 }
        )
      )
    }

    let identifiedItems: string[] = []

    if (type === 'photo') {
      if (!image) {
        return withCors(
          NextResponse.json(
            { success: false, error: 'Image data is required for photo scans.' },
            { status: 400 }
          )
        )
      }
      identifiedItems = await analyzeImage(image)
    } else {
      if (!transcript) {
        return withCors(
          NextResponse.json(
            { success: false, error: 'Transcript is required for voice scans.' },
            { status: 400 }
          )
        )
      }
      identifiedItems = await parseVoiceTranscript(transcript)
    }

    const scan = await saveScan({
      scan_type: type,
      raw_transcript: transcript || undefined,
      identified_items: identifiedItems,
    })

    return withCors(
      NextResponse.json({
        success: true,
        data: scan,
      })
    )
  } catch (error) {
    console.error('[Fridge Scan API] POST error:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    )
  }
}

/**
 * GET /api/cooking/fridge-scan
 * Query params:
 *   - latest=true  -> returns the most recent scan
 *   - limit=N      -> returns N most recent scans (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    if (searchParams.get('latest') === 'true') {
      const scan = await getLatestScan()
      return withCors(
        NextResponse.json({
          success: true,
          data: scan,
        })
      )
    }

    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const scans = await getScanHistory(limit)

    return withCors(
      NextResponse.json({
        success: true,
        data: scans,
      })
    )
  } catch (error) {
    console.error('[Fridge Scan API] GET error:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}

// Body size: App Router route handlers use streaming and don't enforce
// a hard body limit by default. Vercel serverless allows up to 4.5MB.
// Image payloads are compressed to ~100-200KB by the native/web clients.
