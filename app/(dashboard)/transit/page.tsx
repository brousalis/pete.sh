import { CTATransit } from "@/components/dashboard/cta-transit"
import { RideShareCard } from "@/components/dashboard/ride-share-card"

export default function TransitPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <CTATransit />
      </div>
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <RideShareCard />
      </div>
    </div>
  )
}
