/**
 * Nutrition Enrichment API - Batch (All Recipes)
 * POST - Enrich all recipes missing nutrition data
 *
 * Query params:
 *   force=true  — re-enrich all recipes, even ones already enriched
 *
 * Returns Server-Sent Events stream with progress updates.
 */

import { NextRequest } from 'next/server'
import { corsOptionsResponse } from '@/lib/api/cors'
import { enrichAllRecipes } from '@/lib/services/nutrition.service'

export async function POST(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === 'true'

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const result = await enrichAllRecipes(
          (progress) => {
            sendEvent({
              type: 'progress',
              ...progress,
            })
          },
          force
        )

        sendEvent({
          type: 'complete',
          ...result,
        })
      } catch (error) {
        sendEvent({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
