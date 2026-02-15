/**
 * Blog Image Upload API
 * POST: Upload image to Supabase Storage (localhost only)
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const BUCKET_NAME = 'blog-images'

/**
 * Check if request is from localhost
 */
function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0] ?? ''
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')
}

/**
 * Generate a unique filename
 */
function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  return `${timestamp}-${randomString}.${extension}`
}

/**
 * POST /api/blog/upload
 * Upload an image file to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    // Check localhost
    if (!isLocalhostRequest(request)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Image upload is only available on localhost',
          },
          { status: 403 }
        )
      )
    }

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Storage not configured',
          },
          { status: 500 }
        )
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'No file provided',
          },
          { status: 400 }
        )
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
          },
          { status: 400 }
        )
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          },
          { status: 400 }
        )
      )
    }

    // Generate unique filename
    const filename = generateFilename(file.name)
    const path = `uploads/${filename}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading image:', error)
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: `Upload failed: ${error.message}`,
          },
          { status: 500 }
        )
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    return withCors(
      NextResponse.json({
        success: true,
        data: {
          url: publicUrlData.publicUrl,
          path: data.path,
          filename,
        },
      })
    )
  } catch (error) {
    console.error('Error processing upload:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
