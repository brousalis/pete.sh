"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Music, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { apiGet } from "@/lib/api/client"

interface CallbackResponse {
  success: boolean
  returnTo?: string
  error?: string
}

function SpotifyCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Connecting to Spotify...")

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code")
      const error = searchParams.get("error")
      const state = searchParams.get("state")

      if (error) {
        setStatus("error")
        setMessage(error === "access_denied" ? "Authorization cancelled" : `Error: ${error}`)
        setTimeout(() => router.push("/music"), 2000)
        return
      }

      if (!code) {
        setStatus("error")
        setMessage("No authorization code received")
        setTimeout(() => router.push("/music"), 2000)
        return
      }

      try {
        // Exchange code for tokens via our API
        // Note: This runs on localhost after Spotify redirects here
        const response = await fetch(`/api/spotify/callback?code=${code}&state=${state || ""}`)
        const data: CallbackResponse = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to complete authorization")
        }

        setStatus("success")
        
        // Check if we should redirect back to pete.sh
        if (data.returnTo) {
          setMessage("Connected! Redirecting back...")
          setTimeout(() => {
            // Redirect back to pete.sh with success param
            const returnUrl = new URL("/music", data.returnTo)
            returnUrl.searchParams.set("spotify", "connected")
            window.location.href = returnUrl.toString()
          }, 1500)
        } else {
          setMessage("Connected to Spotify!")
          setTimeout(() => router.push("/music?spotify=connected"), 1500)
        }
      } catch (err) {
        setStatus("error")
        setMessage(err instanceof Error ? err.message : "Failed to connect")
        setTimeout(() => router.push("/music?spotify=error"), 2000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-8 shadow-lg">
        <div
          className={`rounded-full p-4 ${
            status === "loading"
              ? "bg-green-500/20"
              : status === "success"
                ? "bg-green-500/20"
                : "bg-destructive/20"
          }`}
        >
          {status === "loading" ? (
            <Loader2 className="size-8 animate-spin text-green-500" />
          ) : status === "success" ? (
            <CheckCircle className="size-8 text-green-500" />
          ) : (
            <AlertCircle className="size-8 text-destructive" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Music className="size-5 text-green-500" />
          <span className="text-lg font-semibold">Spotify</span>
        </div>

        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-8 shadow-lg">
        <div className="rounded-full bg-green-500/20 p-4">
          <Loader2 className="size-8 animate-spin text-green-500" />
        </div>
        <div className="flex items-center gap-2">
          <Music className="size-5 text-green-500" />
          <span className="text-lg font-semibold">Spotify</span>
        </div>
        <p className="text-sm text-muted-foreground">Connecting to Spotify...</p>
      </div>
    </div>
  )
}

/**
 * Spotify OAuth callback page
 * Handles the redirect from Spotify after authorization
 */
export default function SpotifyCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SpotifyCallbackContent />
    </Suspense>
  )
}
