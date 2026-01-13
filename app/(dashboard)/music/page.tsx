import { SonosControls } from "@/components/dashboard/sonos-controls"

export default function MusicPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Music</h1>
        <p className="text-sm text-muted-foreground">Control your Sonos players</p>
      </div>
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <SonosControls />
      </div>
    </div>
  )
}
