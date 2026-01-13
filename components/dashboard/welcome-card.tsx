"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Thermometer } from "lucide-react"
import type { WeatherObservation } from "@/lib/types/weather.types"

export function WelcomeCard() {
  const [weather, setWeather] = useState<WeatherObservation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch("/api/weather/current")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setWeather(data.data)
          }
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchWeather()
  }, [])

  const temp = weather?.properties.temperature.value
  const tempF = temp ? Math.round((temp * 9) / 5 + 32) : null
  const feelsLike = weather?.properties.heatIndex?.value || weather?.properties.windChill?.value
  const feelsLikeF = feelsLike ? Math.round((feelsLike * 9) / 5 + 32) : null

  return (
    <section className="relative overflow-hidden rounded-3xl bg-card border border-border shadow-sm p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left Side (Text) */}
        <div className="max-w-xl md:w-3/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-2 rounded-full bg-brand" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Welcome</span>
          </div>
          <h1 className="text-balance text-3xl font-semibold text-foreground">Welcome back, Pete</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Control your smart home with ease. Monitor devices, manage your routine, and stay connected.
          </p>
          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-muted/50 border border-border/50 px-4 py-3.5 text-sm backdrop-blur-sm">
            <div className="flex items-center justify-center size-12 rounded-xl bg-brand/10 border border-brand/20">
              {loading ? (
                <Thermometer className="size-6 text-brand animate-pulse" />
              ) : (
                <span className="text-2xl font-semibold text-brand">
                  {tempF !== null ? `${tempF}°` : "--"}
                </span>
              )}
            </div>
            <div>
              <div className="font-medium text-foreground">Outdoor temperature</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                {feelsLikeF !== null ? `Feels like ${feelsLikeF}°` : weather?.properties.textDescription || "Loading..."}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Image fills 50%) */}
        <div className="relative lg:w-2/5">
          <div className="relative w-full h-64 md:h-full min-h-[250px] rounded-2xl overflow-hidden border border-border/50 shadow-sm">
            <Image
              src="/images/smart-home-reference.jpg"
              alt="Petehome illustration"
              fill
              className="object-cover"
              sizes="50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/20 to-transparent" />
          </div>
        </div>
      </div>

      {/* Subtle accent decoration */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-brand/5 blur-3xl" />
    </section>
  )
}
