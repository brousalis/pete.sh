import { HueControls } from "@/components/dashboard/hue-controls"

export default function LightsPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-card p-5 shadow-sm ">
        <HueControls />
      </div>
    </div>
  )
}
