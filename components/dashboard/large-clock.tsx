"use client"

import { useEffect, useState } from "react"

export function LargeClock() {
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
      <div className="rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-24 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  const hours = time.getHours()
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()

  const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  const dateString = time.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="text-center">
          <div className="text-7xl font-bold tracking-tight text-foreground lg:text-8xl">
            {timeString}
          </div>
          <div className="mt-4 text-xl font-medium text-muted-foreground lg:text-2xl">
            {dateString}
          </div>
        </div>
      </div>
    </div>
  )
}
