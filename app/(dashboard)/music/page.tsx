import { SonosControls } from "@/components/dashboard/sonos-controls"
import { SpotifyPlayer } from "@/components/dashboard/spotify-player"

export default function MusicPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Music</h1>
        <p className="text-sm text-muted-foreground">Control your music playback</p>
      </div>
      
      {/* Spotify Section */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <SpotifyPlayer />
      </div>

      {/* Sonos Section */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <SonosControls />
      </div>
    </div>
  )
}
