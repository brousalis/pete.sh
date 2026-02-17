'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ConcertPhoto } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { Camera, ImagePlus, Loader2, Star, Trash2, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

interface ConcertPhotoGalleryProps {
  concertId: string
  photos: ConcertPhoto[]
  onPhotosUploaded: (photos: ConcertPhoto[]) => void
  onPhotoDeleted: (photoId: string) => void
  onCoverSet: (photoId: string) => void
  className?: string
}

export function ConcertPhotoGallery({
  concertId,
  photos,
  onPhotosUploaded,
  onPhotoDeleted,
  onCoverSet,
  className,
}: ConcertPhotoGalleryProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      setUploading(true)
      setUploadProgress(`Uploading ${fileArray.length} file${fileArray.length > 1 ? 's' : ''}...`)

      try {
        const formData = new FormData()
        for (const file of fileArray) {
          formData.append('files', file)
        }

        const response = await fetch(`/api/concerts/${concertId}/photos`, {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()
        if (result.success && result.data) {
          setUploadProgress(
            `${result.data.uploaded} uploaded, ${result.data.failed} failed`
          )
          // Refresh photos
          const photosResponse = await fetch(`/api/concerts/${concertId}/photos`)
          const photosResult = await photosResponse.json()
          if (photosResult.success) {
            onPhotosUploaded(photosResult.data)
          }
        }
      } catch (err) {
        setUploadProgress('Upload failed')
        console.error('Upload error:', err)
      } finally {
        setUploading(false)
        setTimeout(() => setUploadProgress(null), 3000)
      }
    },
    [concertId, onPhotosUploaded]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDelete = async (photoId: string) => {
    try {
      await fetch(`/api/concerts/${concertId}/photos?photoId=${photoId}`, {
        method: 'DELETE',
      })
      onPhotoDeleted(photoId)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-pink-500/10">
            <Camera className="size-4 text-pink-500" />
          </div>
          <CardTitle className="text-base">Photos</CardTitle>
          {photos.length > 0 && (
            <span className="text-muted-foreground text-xs">{photos.length}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-1 size-3 animate-spin" />
          ) : (
            <Upload className="mr-1 size-3" />
          )}
          Upload
        </Button>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        {/* Upload progress */}
        {uploadProgress && (
          <div className="bg-muted mb-3 rounded-lg p-2 text-center text-sm">
            {uploadProgress}
          </div>
        )}

        {/* Photo grid */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
                onClick={() => setLightboxIndex(index)}
              >
                <Image
                  src={photo.thumbnail_url || photo.storage_url}
                  alt={photo.caption || `Photo ${index + 1}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 33vw, 25vw"
                />
                {photo.is_cover && (
                  <div className="absolute left-1 top-1">
                    <Star className="size-4 fill-amber-400 text-amber-400 drop-shadow" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="rounded bg-black/50 p-1 text-white hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCoverSet(photo.id)
                    }}
                    title="Set as cover"
                  >
                    <Star className="size-3" />
                  </button>
                  <button
                    className="rounded bg-black/50 p-1 text-white hover:bg-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(photo.id)
                    }}
                    title="Delete"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Drop zone / empty state
          <div
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              dragOver ? 'border-brand bg-brand/5' : 'border-muted-foreground/20'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <ImagePlus className="text-muted-foreground/50 mb-3 size-8" />
            <p className="text-muted-foreground text-sm">
              Drop photos here or{' '}
              <button
                className="text-brand underline"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-muted-foreground/70 mt-1 text-xs">
              JPEG, PNG, WebP, HEIC, MP4
            </p>
          </div>
        )}

        {/* Lightbox */}
        {lightboxIndex !== null && photos[lightboxIndex] && (
          <Lightbox
            photos={photos}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </CardContent>
    </Card>
  )
}

function Lightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
}: {
  photos: ConcertPhoto[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const photo = photos[currentIndex]
  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <button className="absolute right-4 top-4 z-50 text-white" onClick={onClose}>
        <X className="size-6" />
      </button>

      {/* Navigation */}
      {currentIndex > 0 && (
        <button
          className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex - 1)
          }}
        >
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex + 1)
          }}
        >
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.storage_url}
          alt={photo.caption || `Photo ${currentIndex + 1}`}
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
        {photo.caption && (
          <p className="mt-2 text-center text-sm text-white">{photo.caption}</p>
        )}
        <p className="text-center text-xs text-white/50">
          {currentIndex + 1} / {photos.length}
        </p>
      </div>
    </div>
  )
}
