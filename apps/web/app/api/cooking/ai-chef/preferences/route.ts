/**
 * AI Chef Preferences API
 * GET  - Read food preferences
 * PUT  - Update food preferences
 */

import { NextRequest } from 'next/server'
import { getPreferences, updatePreferences } from '@/lib/services/ai-chef.service'
import { CookingPreferencesSchema } from '@/lib/types/ai-chef.types'

export async function GET() {
  try {
    const preferences = await getPreferences()
    return Response.json({ success: true, data: preferences })
  } catch (error) {
    console.error('Error reading cooking preferences:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CookingPreferencesSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: 'Invalid preferences format',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const updated = await updatePreferences(parsed.data)
    return Response.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating cooking preferences:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
