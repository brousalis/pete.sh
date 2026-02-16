/**
 * Vault Attachment Upload API
 * POST: Upload file to Supabase Storage (localhost only)
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
]

const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const BUCKET_NAME = 'vault-attachments'

/**
 * Check if request is from localhost
 */
function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0] ?? ''
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local')
  )
}

/**
 * Generate a unique filename
 */
function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()?.toLowerCase() || 'bin'
  return `${timestamp}-${randomString}.${extension}`
}

/**
 * Check if a MIME type is an image
 */
function isImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType)
}

/**
 * POST /api/vault/upload
 * Upload a file to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    if (!isLocalhostRequest(request)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'File upload is only available on localhost',
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

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: `Invalid file type: ${file.type}. Allowed types: images, PDFs, documents, text files.`,
          },
          { status: 400 }
        )
      )
    }

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

    const filename = generateFilename(file.name)
    const path = `uploads/${filename}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading vault attachment:', error)
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

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    return withCors(
      NextResponse.json({
        success: true,
        data: {
          url: publicUrlData.publicUrl,
          path: data.path,
          filename: file.name,
          size: file.size,
          type: file.type,
          isImage: isImageType(file.type),
        },
      })
    )
  } catch (error) {
    console.error('Error processing vault upload:', error)
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
