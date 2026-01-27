import { SpotifyPlayer } from "@/components/dashboard/spotify-player"

export default function MusicPage() {
  return (
    <div className="space-y-5">
      {/* Spotify Section */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <SpotifyPlayer />
      </div>
    </div>
  )
}
