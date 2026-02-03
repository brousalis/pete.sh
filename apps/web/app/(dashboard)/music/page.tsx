'use client'

import { SpotifyHistory } from '@/components/dashboard/spotify-history'
import { SpotifyPlayer } from '@/components/dashboard/spotify-player'
import { apiPost } from '@/lib/api/client'
import { useCallback, useState } from 'react'

export default function MusicPage() {
  const [playerKey, setPlayerKey] = useState(0)

  // Play track handler that communicates with the player
  const handlePlayTrack = useCallback(async (uri: string) => {
    try {
      await apiPost('/api/spotify/player/play', { uris: [uri] })
      // Trigger player refresh
      setPlayerKey(prev => prev + 1)
    } catch (error) {
      console.error('Failed to play track:', error)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Spotify Player Section */}
      <div className="bg-card rounded-2xl p-5 shadow-sm">
        <SpotifyPlayer key={playerKey} />
      </div>

      {/* Listening History - Enhanced */}
      <div className="bg-card rounded-2xl p-5 shadow-sm">
        <SpotifyHistory onPlayTrack={handlePlayTrack} />
      </div>
    </div>
  )
}
