/**
 * AI Coach Analyze API
 * POST - Run a full or post-workout analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  runFullAnalysis,
  runPostWorkoutAnalysis,
  saveInsight,
} from '@/lib/services/ai-coach.service'
import { config } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    if (!config.aiCoach.isConfigured) {
      return NextResponse.json(
        { success: false, error: 'AI Coach is not configured. Set ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const analysisType = body.type || 'full'
    const routineId = body.routineId || 'climber-physique'

    if (analysisType === 'post_workout') {
      const { analysis, inputTokens, outputTokens } =
        await runPostWorkoutAnalysis(body.workoutContext)

      const insightId = await saveInsight(
        routineId,
        'post_workout',
        analysis,
        config.aiCoach.defaultModel,
        inputTokens,
        outputTokens,
        body.triggerContext
      )

      return NextResponse.json({
        success: true,
        data: { analysis, insightId, inputTokens, outputTokens },
      })
    }

    // Default: full analysis
    const { analysis, inputTokens, outputTokens } = await runFullAnalysis()

    const insightId = await saveInsight(
      routineId,
      body.triggerType || 'manual',
      analysis,
      config.aiCoach.defaultModel,
      inputTokens,
      outputTokens,
      body.triggerContext
    )

    return NextResponse.json({
      success: true,
      data: { analysis, insightId, inputTokens, outputTokens },
    })
  } catch (error) {
    console.error('Error running AI coach analysis:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
