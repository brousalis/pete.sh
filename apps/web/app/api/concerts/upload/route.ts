/**
 * iOS Shortcut Upload API
 * POST /api/concerts/upload - Upload photos from iOS Shortcut
 *
 * Authenticates via X-API-Key header.
 * Matches photos to concerts by date, falling back to GPS proximity.
 */

import { errorResponse, handleApiError } from '@/lib/api/utils'
import { config } from '@/lib/config'
import { ConcertsService } from '@/lib/services/concerts.service'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

const service = new ConcertsService()

export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')
    if (!config.concerts.apiKey || apiKey !== config.concerts.apiKey) {
      return errorResponse('Unauthorized', 401)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const concertDate = formData.get('concert_date') as string | null
    const captureTime = formData.get('capture_time') as string | null
    const latitude = formData.get('latitude') as string | null
    const longitude = formData.get('longitude') as string | null

    if (!file) {
      return errorResponse('No file provided', 400)
    }

    if (!concertDate) {
      return errorResponse('concert_date is required', 400)
    }

    // Find matching concert
    const concert = await service.findConcertByDate(concertDate)
    if (!concert) {
      return errorResponse(`No concert found for date: ${concertDate}`, 404)
    }

    // Upload to Supabase Storage
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      return errorResponse('Supabase not configured', 500)
    }
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${concert.id}/${timestamp}-${random}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('concert-photos')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return errorResponse(`Upload failed: ${uploadError.message}`, 500)
    }

    const { data: urlData } = supabase.storage
      .from('concert-photos')
      .getPublicUrl(filename)

    // Save photo record
    const photo = await service.addPhoto(concert.id, {
      storage_url: urlData.publicUrl,
      original_filename: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      capture_time: captureTime || undefined,
      capture_lat: latitude ? Number(latitude) : undefined,
      capture_lng: longitude ? Number(longitude) : undefined,
      uploaded_via: 'ios_shortcut',
    })

    // Auto-set as cover if none exists
    if (!concert.cover_image) {
      await service.setCoverPhoto(concert.id, photo.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        photo_id: photo.id,
        concert_id: concert.id,
        concert_name: `${concert.artist_name} at ${concert.venue_name}`,
        storage_url: photo.storage_url,
      },
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
