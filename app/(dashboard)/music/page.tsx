import { SonosControls } from "@/components/dashboard/sonos-controls"
import { SpotifyPlayer } from "@/components/dashboard/spotify-player"
import { BpmFinder } from "@/components/dashboard/bpm-finder"

export default function MusicPage() {
  return (
    <div className="space-y-5">
      {/* Spotify Section */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <SpotifyPlayer />
      </div>

      {/* BPM Finder - Running Music */}
      <BpmFinder />

      {/* Sonos Section */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <SonosControls />
      </div>
    </div>
  )
}
