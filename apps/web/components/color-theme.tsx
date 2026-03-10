"use client"

import { useEffect, useState } from "react"

const BRANDS = [
  { key: "purple", label: "Purple", color: "hsl(280, 65%, 55%)" },
  { key: "blue", label: "Blue", color: "hsl(222, 60%, 55%)" },
  { key: "teal", label: "Teal", color: "hsl(178, 45%, 48%)" },
  { key: "orange", label: "Orange", color: "hsl(30, 75%, 52%)" },
  { key: "pink", label: "Pink", color: "hsl(348, 70%, 58%)" },
  { key: "yellow", label: "Yellow", color: "hsl(45, 80%, 55%)" },
] as const

export function ColorThemePicker() {
  const [current, setCurrent] = useState<string>("yellow")

  useEffect(() => {
    const saved = localStorage.getItem("brand") || "yellow"
    setCurrent(saved)
    document.documentElement.setAttribute("data-brand", saved)
  }, [])

  function setBrand(key: string) {
    setCurrent(key)
    document.documentElement.setAttribute("data-brand", key)
    localStorage.setItem("brand", key)
  }

  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">Color theme</p>
      <div className="flex items-center gap-2">
        {BRANDS.map((b) => (
          <button
            key={b.key}
            aria-label={`Use ${b.label} theme`}
            onClick={() => setBrand(b.key)}
            className={`size-6 rounded-full ring-2 transition ${current === b.key ? "ring-ring" : "ring-transparent"} outline-none focus-visible:ring-2`}
            style={{ backgroundColor: b.color }}
          />
        ))}
      </div>
    </div>
  )
}
