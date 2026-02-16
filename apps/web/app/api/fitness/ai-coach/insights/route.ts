/**
 * AI Coach Insights API
 * GET - Retrieve persisted AI coach insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { getInsights, getLatestInsight } from '@/lib/services/ai-coach.service'
import type { AnalysisTrigger } from '@/lib/types/ai-coach.types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const latest = searchParams.get('latest') === 'true'
    const triggerType = searchParams.get('type') as AnalysisTrigger | null
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (latest) {
      const insight = await getLatestInsight()
      return NextResponse.json({
        success: true,
        data: insight,
      })
    }

    const insights = await getInsights(limit, triggerType || undefined)
    return NextResponse.json({
      success: true,
      data: insights,
    })
  } catch (error) {
    console.error('Error fetching AI coach insights:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
