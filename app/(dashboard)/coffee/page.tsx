import { CoffeeBrewingAssistant } from '@/components/dashboard/coffee-brewing-assistant'
import { CoffeeStopwatch } from '@/components/dashboard/coffee-stopwatch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BookOpen, Timer } from 'lucide-react'

export default function CoffeePage() {
  return (
    <div className="space-y-6">
      {/* Stopwatch */}
      <CoffeeStopwatch />

      {/* Main Coffee Brewing Assistant */}
      <CoffeeBrewingAssistant />

      {/* Quick Reference Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Timer className="size-5 text-amber-600 dark:text-amber-400" />
              Cheat Sheet
            </CardTitle>
            <CardDescription>Quick reference for daily use</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 rounded-lg border p-3">
              <div className="text-muted-foreground mb-1 text-xs">
                Morning Batch (7:00 AM)
              </div>
              <div className="text-sm font-medium">59g : 1000g (1:17)</div>
              <div className="text-muted-foreground mt-1 text-xs">
                Ode Setting 9 • Moccamaster • Smooth & Sweet
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg border p-3">
              <div className="text-muted-foreground mb-1 text-xs">
                Afternoon Cup (2:00 PM)
              </div>
              <div className="text-sm font-medium">18.8g : 300g (1:16)</div>
              <div className="text-muted-foreground mt-1 text-xs">
                S3 Setting 7.5 • Hario Switch • 200°F • High Clarity
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg border p-3">
              <div className="text-muted-foreground mb-1 text-xs">
                Sunday Theater (Brunch)
              </div>
              <div className="text-sm font-medium">62.5g : 1000g (1:16)</div>
              <div className="text-muted-foreground mt-1 text-xs">
                Ode Setting 10 • Manual Switch • 212°F • Rich Body
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="size-5 text-amber-600 dark:text-amber-400" />
              Golden Rules
            </CardTitle>
            <CardDescription>These apply to every cup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 rounded-lg border p-3">
              <div className="mb-1 text-xs font-medium">RDT Spray is Mandatory</div>
              <div className="text-muted-foreground text-xs">
                Always spray beans with one spritz of water before grinding. Shake to coat. Prevents static and mess.
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg border p-3">
              <div className="mb-1 text-xs font-medium">Filter Hygiene</div>
              <div className="text-muted-foreground text-xs">
                Paper filters taste like cardboard. ALWAYS rinse every filter with hot water before adding coffee.
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg border p-3">
              <div className="mb-1 text-xs font-medium">Water Chemistry</div>
              <div className="text-muted-foreground text-xs">
                Morning: Filtered tap water is fine. Afternoon & Sunday: Use Third Wave Water for HD fruit flavors.
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg border p-3">
              <div className="mb-1 text-xs font-medium">Bean Storage</div>
              <div className="text-muted-foreground text-xs">
                Keep in original bag, squeezed tight, in cupboard. Freeze if not finishing within 3 weeks.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
