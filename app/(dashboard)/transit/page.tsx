import { CTATransit } from "@/components/dashboard/cta-transit"

export default function TransitPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transit</h1>
        <p className="text-sm text-muted-foreground">Chicago CTA bus and train information</p>
      </div>
      <div className="rounded-2xl bg-card p-5 shadow-sm ">
        <CTATransit />
      </div>
    </div>
  )
}
