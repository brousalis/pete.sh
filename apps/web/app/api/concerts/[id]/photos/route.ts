/**
 * Concert Photos API
 * GET /api/concerts/[id]/photos - List photos for a concert
 * POST /api/concerts/[id]/photos - Upload photos to a concert
 * DELETE /api/concerts/[id]/photos?photoId=xxx - Delete a photo
 */

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { ConcertsService } from '@/lib/services/concerts.service'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

const service = new ConcertsService()

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const photos = await service.getPhotos(id)
    return successResponse(photos)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: concertId } = await params

    // Verify concert exists
    const concert = await service.getConcert(concertId)
    if (!concert) {
      return errorResponse('Concert not found', 404)
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return errorResponse('No files provided', 400)
    }

    const results = []
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      return errorResponse('Supabase not configured', 500)
    }

    for (const file of files) {
      try {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          results.push({
            id: '',
            storage_url: '',
            thumbnail_url: null,
            success: false,
            error: `Unsupported file type: ${file.type}`,
          })
          continue
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          results.push({
            id: '',
            storage_url: '',
            thumbnail_url: null,
            success: false,
            error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
          })
          continue
        }

        // Generate unique filename
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const filename = `${concertId}/${timestamp}-${random}.${ext}`

        // Upload to Supabase Storage
        const buffer = Buffer.from(await file.arrayBuffer())
        const { error: uploadError } = await supabase.storage
          .from('concert-photos')
          .upload(filename, buffer, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          results.push({
            id: '',
            storage_url: '',
            thumbnail_url: null,
            success: false,
            error: `Upload failed: ${uploadError.message}`,
          })
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('concert-photos')
          .getPublicUrl(filename)

        // Parse EXIF metadata from form data headers
        const captureTime = formData.get(`capture_time_${files.indexOf(file)}`) as string | null
        const captureLat = formData.get(`capture_lat_${files.indexOf(file)}`) as string | null
        const captureLng = formData.get(`capture_lng_${files.indexOf(file)}`) as string | null

        // Save photo record
        const photo = await service.addPhoto(concertId, {
          storage_url: urlData.publicUrl,
          thumbnail_url: undefined, // TODO: Generate thumbnail with sharp
          original_filename: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
          capture_time: captureTime || undefined,
          capture_lat: captureLat ? Number(captureLat) : undefined,
          capture_lng: captureLng ? Number(captureLng) : undefined,
          uploaded_via: 'web',
        })

        // If this is the first photo and no cover is set, make it the cover
        if (!concert.cover_image) {
          await service.setCoverPhoto(concertId, photo.id)
        }

        results.push({
          id: photo.id,
          storage_url: photo.storage_url,
          thumbnail_url: photo.thumbnail_url,
          success: true,
        })
      } catch (err) {
        results.push({
          id: '',
          storage_url: '',
          thumbnail_url: null,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        uploaded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      },
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params // consume params
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return errorResponse('photoId is required', 400)
    }

    await service.deletePhoto(photoId)
    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
