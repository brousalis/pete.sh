import { CoffeeBrewingAssistant } from "@/components/dashboard/coffee-brewing-assistant"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Coffee, BookOpen, Timer } from "lucide-react"

export default function CoffeePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Coffee</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your brewing routines, timing guides, and coffee assistant
        </p>
      </div>

      {/* Main Coffee Brewing Assistant */}
      <CoffeeBrewingAssistant />

      {/* Quick Reference Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Timer className="size-5 text-amber-600 dark:text-amber-400" />
              Quick Ratios
            </CardTitle>
            <CardDescription>Standard brewing ratios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">Base Ratio</div>
              <div className="text-sm font-medium">1:16</div>
              <div className="text-xs text-muted-foreground mt-1">
                Coffee to water ratio
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">Morning Batch</div>
              <div className="text-sm font-medium">62.5g : 1000g</div>
              <div className="text-xs text-muted-foreground mt-1">
                1 Liter
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">Afternoon Cup</div>
              <div className="text-sm font-medium">18.8g : 300g</div>
              <div className="text-xs text-muted-foreground mt-1">
                300 ml
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="size-5 text-amber-600 dark:text-amber-400" />
              Pro Tips
            </CardTitle>
            <CardDescription>Key reminders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs font-medium mb-1">Third Wave Water</div>
              <div className="text-xs text-muted-foreground">
                ALWAYS use for afternoon cup. Optional for morning batch.
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs font-medium mb-1">RDT (Ross Droplet Technique)</div>
              <div className="text-xs text-muted-foreground">
                Spray beans with one spritz before grinding to reduce static.
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs font-medium mb-1">Heat Management</div>
              <div className="text-xs text-muted-foreground">
                Rinse Hario Switch with hot water for 10s to pre-heat.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
