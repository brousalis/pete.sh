'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { ExerciseDemoVideo, ExerciseDemoVideoInput, VideoType } from '@/lib/types/fitness.types'
import {
    Edit2,
    ExternalLink,
    Loader2,
    Plus,
    Star,
    Trash2,
    Video,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface ExerciseVideoManagerProps {
  exerciseName: string
  currentYoutubeVideoId?: string
  onYoutubeVideoIdChange?: (videoId: string) => void
}

export function ExerciseVideoManager({
  exerciseName,
  currentYoutubeVideoId,
  onYoutubeVideoIdChange,
}: ExerciseVideoManagerProps) {
  const [videos, setVideos] = useState<ExerciseDemoVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<ExerciseDemoVideo | null>(null)
  const [newVideo, setNewVideo] = useState<Partial<ExerciseDemoVideoInput>>({
    videoType: 'youtube',
  })
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null)

  // Normalize exercise name for API calls
  const normalizedName = exerciseName.toLowerCase().trim()

  const fetchVideos = useCallback(async () => {
    if (!normalizedName) return

    setLoading(true)
    try {
      const response = await fetch(`/api/fitness/exercise-videos?exerciseName=${encodeURIComponent(normalizedName)}`)
      if (response.ok) {
        const data = await response.json()
        setVideos(data.data ?? [])
      }
    } catch (error) {
      console.error('Failed to fetch exercise videos:', error)
    } finally {
      setLoading(false)
    }
  }, [normalizedName])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  const handleAddVideo = async () => {
    if (!newVideo.videoUrl) return

    try {
      const response = await fetch('/api/fitness/exercise-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newVideo,
          exerciseName: normalizedName,
        }),
      })

      if (response.ok) {
        setIsAddDialogOpen(false)
        setNewVideo({ videoType: 'youtube' })
        await fetchVideos()
      }
    } catch (error) {
      console.error('Failed to add video:', error)
    }
  }

  const handleUpdateVideo = async () => {
    if (!editingVideo) return

    try {
      const response = await fetch(`/api/fitness/exercise-videos/${editingVideo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: editingVideo.videoUrl,
          videoType: editingVideo.videoType,
          title: editingVideo.title,
          isPrimary: editingVideo.isPrimary,
        }),
      })

      if (response.ok) {
        setEditingVideo(null)
        await fetchVideos()
      }
    } catch (error) {
      console.error('Failed to update video:', error)
    }
  }

  const handleDeleteVideo = async (id: string) => {
    try {
      const response = await fetch(`/api/fitness/exercise-videos/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchVideos()
      }
    } catch (error) {
      console.error('Failed to delete video:', error)
    } finally {
      setDeletingVideoId(null)
    }
  }

  const handleSetPrimary = async (video: ExerciseDemoVideo) => {
    try {
      const response = await fetch(`/api/fitness/exercise-videos/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      })

      if (response.ok) {
        await fetchVideos()
      }
    } catch (error) {
      console.error('Failed to set primary video:', error)
    }
  }

  const getVideoThumbnail = (video: ExerciseDemoVideo) => {
    if (video.thumbnailUrl) return video.thumbnailUrl
    if (video.videoType === 'youtube') {
      // Extract video ID and return YouTube thumbnail
      const videoId = video.videoUrl.includes('youtube.com')
        ? new URL(video.videoUrl).searchParams.get('v')
        : video.videoUrl.includes('youtu.be')
          ? video.videoUrl.split('/').pop()
          : video.videoUrl
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    }
    return null
  }

  const getVideoUrl = (video: ExerciseDemoVideo) => {
    if (video.videoType === 'youtube') {
      const videoId = video.videoUrl.includes('youtube.com')
        ? new URL(video.videoUrl).searchParams.get('v')
        : video.videoUrl.includes('youtu.be')
          ? video.videoUrl.split('/').pop()
          : video.videoUrl
      return `https://www.youtube.com/watch?v=${videoId}`
    }
    return video.videoUrl
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" />
            Demo Videos
          </Label>
          {videos.length > 0 && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {videos.length}
            </Badge>
          )}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Demo Video</DialogTitle>
              <DialogDescription>
                Add a demonstration video for {exerciseName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Video Type</Label>
                <Select
                  value={newVideo.videoType ?? 'youtube'}
                  onValueChange={(value) => setNewVideo({ ...newVideo, videoType: value as VideoType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="mp4">MP4 URL</SelectItem>
                    <SelectItem value="external">External Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Video URL or ID</Label>
                <Input
                  value={newVideo.videoUrl ?? ''}
                  onChange={(e) => setNewVideo({ ...newVideo, videoUrl: e.target.value })}
                  placeholder={newVideo.videoType === 'youtube' ? 'YouTube video ID or URL' : 'Video URL'}
                />
                <p className="text-xs text-muted-foreground">
                  {newVideo.videoType === 'youtube'
                    ? 'Enter the YouTube video ID (e.g., dQw4w9WgXcQ) or full URL'
                    : 'Enter the full video URL'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  value={newVideo.title ?? ''}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  placeholder="e.g., Proper Form Tutorial"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddVideo} disabled={!newVideo.videoUrl}>
                Add Video
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Video list */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : videos.length > 0 ? (
        <div className="space-y-2">
          {videos.map((video) => {
            const thumbnail = getVideoThumbnail(video)
            return (
              <div
                key={video.id}
                className="flex items-center gap-3 p-2 bg-muted rounded-lg group"
              >
                {/* Thumbnail */}
                {thumbnail ? (
                  <a
                    href={getVideoUrl(video)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <img
                      src={thumbnail}
                      alt={video.title ?? 'Video thumbnail'}
                      className="w-16 h-12 object-cover rounded"
                    />
                  </a>
                ) : (
                  <div className="w-16 h-12 bg-muted-foreground/20 rounded flex items-center justify-center">
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {video.title || 'Demo Video'}
                    </span>
                    {video.isPrimary && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {video.videoType}
                    </Badge>
                    <span className="truncate">{video.videoUrl}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={getVideoUrl(video)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                  {!video.isPrimary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleSetPrimary(video)}
                      title="Set as primary"
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEditingVideo(video)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeletingVideoId(video.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2">
          No demo videos added yet. Add videos to help with proper form.
        </p>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingVideo} onOpenChange={(open) => !open && setEditingVideo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Demo Video</DialogTitle>
          </DialogHeader>
          {editingVideo && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Video Type</Label>
                <Select
                  value={editingVideo.videoType}
                  onValueChange={(value) =>
                    setEditingVideo({ ...editingVideo, videoType: value as VideoType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="mp4">MP4 URL</SelectItem>
                    <SelectItem value="external">External Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Video URL or ID</Label>
                <Input
                  value={editingVideo.videoUrl}
                  onChange={(e) =>
                    setEditingVideo({ ...editingVideo, videoUrl: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  value={editingVideo.title ?? ''}
                  onChange={(e) =>
                    setEditingVideo({ ...editingVideo, title: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVideo(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateVideo}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingVideoId} onOpenChange={(open) => !open && setDeletingVideoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this demo video. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingVideoId && handleDeleteVideo(deletingVideoId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
