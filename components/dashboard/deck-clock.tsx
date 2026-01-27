"use client"

import { useEffect, useState } from "react"

export function DeckClock() {
  const [time, setTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!mounted) {
    return (
      <div className="rounded-2xl bg-card p-3 shadow-lg ">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const hours = time.getHours()
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()

  const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  const dateString = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return (
    <div className="flex h-full rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 py-3.5 shadow-lg ">
      <div className="flex flex-col items-center justify-center space-y-0.5">
        <div className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl tabular-nums">
          {timeString}
        </div>
        <div className="text-xs font-medium text-muted-foreground sm:text-sm">
          {dateString}
        </div>
      </div>
    </div>
  )
}
