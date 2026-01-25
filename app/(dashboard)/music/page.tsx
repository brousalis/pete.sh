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

      {/* GetSongBPM Attribution - Server rendered for crawler visibility */}
      <footer className="py-4 text-center text-sm text-muted-foreground">
        BPM data powered by{" "}
        <a
          href="https://getsongbpm.com"
          target="_blank"
          rel="noopener"
          className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
        >
          GetSongBPM.com
        </a>
      </footer>
    </div>
  )
}
