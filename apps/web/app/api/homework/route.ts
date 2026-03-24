import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type { HomeworkResponseRow } from '@/lib/supabase/types'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const homeworkId = searchParams.get('homework_id')
    const respondentId = searchParams.get('respondent_id')

    if (!homeworkId || !respondentId) {
      return NextResponse.json(
        { error: 'homework_id and respondent_id are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      return NextResponse.json({ responses: {} })
    }

    const { data, error } = await supabase
      .from('homework_responses')
      .select('*')
      .eq('homework_id', homeworkId)
      .eq('respondent_id', respondentId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[Homework API] GET error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch responses' },
        { status: 500 }
      )
    }

    const row = data as HomeworkResponseRow | null
    return NextResponse.json({ responses: row?.responses ?? {} })
  } catch (error) {
    console.error('[Homework API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { homework_id, respondent_id, responses } = body

    if (!homework_id || !respondent_id || typeof responses !== 'object') {
      return NextResponse.json(
        { error: 'homework_id, respondent_id, and responses object are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { error } = await supabase
      .from('homework_responses')
      .upsert(
        {
          homework_id,
          respondent_id,
          responses,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'homework_id,respondent_id' }
      )

    if (error) {
      console.error('[Homework API] PUT error:', error)
      return NextResponse.json(
        { error: 'Failed to save responses' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Homework API] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to save responses' },
      { status: 500 }
    )
  }
}
