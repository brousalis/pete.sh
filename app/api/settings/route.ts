/**
 * Settings API Routes
 * GET - Fetch current app settings
 * PUT - Update app settings
 */

import {
  DEFAULT_SETTINGS,
  settingsService,
} from '@/lib/services/settings.service'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const settings = await settingsService.getSettings()

    if (!settings) {
      // Return default settings when DB not available
      return NextResponse.json({
        ...DEFAULT_SETTINGS,
        id: 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[Settings API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    // Validate the update payload
    const allowedKeys = ['rounded_layout', 'theme', 'brand_color']
    const updates: Record<string, unknown> = {}

    for (const key of allowedKeys) {
      if (key in body) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid settings to update' },
        { status: 400 }
      )
    }

    // Validate values
    if (
      'rounded_layout' in updates &&
      typeof updates.rounded_layout !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'rounded_layout must be a boolean' },
        { status: 400 }
      )
    }

    if (
      'theme' in updates &&
      !['light', 'dark', 'system'].includes(updates.theme as string)
    ) {
      return NextResponse.json(
        { error: 'theme must be one of: light, dark, system' },
        { status: 400 }
      )
    }

    if (
      'brand_color' in updates &&
      !['purple', 'blue', 'teal', 'orange', 'pink', 'yellow'].includes(
        updates.brand_color as string
      )
    ) {
      return NextResponse.json(
        {
          error:
            'brand_color must be one of: purple, blue, teal, orange, pink, yellow',
        },
        { status: 400 }
      )
    }

    const settings = await settingsService.updateSettings(updates)

    if (!settings) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[Settings API] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
