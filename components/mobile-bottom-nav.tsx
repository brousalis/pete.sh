"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Grid3x3,
  Lightbulb,
  Music,
  Calendar,
  Bus,
  Dumbbell,
  Coffee,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// Mobile nav items - excluding Deck for single-row layout
const mobileNavItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/lights", label: "Lights", icon: Lightbulb },
  { href: "/music", label: "Music", icon: Music },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/transit", label: "Transit", icon: Bus },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
  { href: "/coffee", label: "Coffee", icon: Coffee },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 shadow-lg">
      <div className="flex items-center justify-between h-16 safe-area-inset-bottom px-1 overflow-x-hidden">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname?.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 transition-all touch-manipulation flex-shrink-0 flex-1 min-w-0 rounded-t-lg pt-1 pb-1",
                active
                  ? "text-brand bg-brand/10"
                  : "text-muted-foreground active:text-foreground active:bg-muted/30"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand rounded-full" />
              )}
              <Icon className={cn("size-4 shrink-0", active && "text-brand")} />
              <span className={cn(
                "text-[9px] font-medium leading-tight text-center truncate w-full px-0.5",
                active && "font-semibold"
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
