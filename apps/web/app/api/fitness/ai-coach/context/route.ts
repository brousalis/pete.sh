/**
 * AI Coach Context Export API
 * GET - Export assembled context as markdown
 * Replaces the static workout-llm.md with auto-generated live data
 */

import { NextResponse } from 'next/server'
import { exportContextAsMarkdown } from '@/lib/services/ai-coach.service'

export async function GET() {
  try {
    const markdown = await exportContextAsMarkdown()

    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error exporting AI coach context:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
