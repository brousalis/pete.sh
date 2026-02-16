/**
 * AI Coach Training Readiness API
 * GET - Get current training readiness score and signals
 */

import { NextResponse } from 'next/server'
import { getTrainingReadinessFromData } from '@/lib/services/ai-coach.service'

export async function GET() {
  try {
    const readiness = await getTrainingReadinessFromData()

    return NextResponse.json({
      success: true,
      data: readiness,
    })
  } catch (error) {
    console.error('Error computing training readiness:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
