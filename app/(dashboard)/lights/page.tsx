import { HueControls } from "@/components/dashboard/hue-controls"

export default function LightsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lights</h1>
        <p className="text-sm text-muted-foreground">Control your HUE light zones and scenes</p>
      </div>
      <div className="rounded-2xl bg-card p-5 shadow-sm ">
        <HueControls />
      </div>
    </div>
  )
}
