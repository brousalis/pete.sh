import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { successResponse } from "@/lib/api/utils"

/**
 * Disconnect Spotify (clear tokens)
 */
export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Clear all Spotify cookies
    cookieStore.delete("spotify_access_token")
    cookieStore.delete("spotify_refresh_token")
    cookieStore.delete("spotify_expires_at")
    cookieStore.delete("spotify_auth_state")

    return successResponse({ success: true })
  } catch (error) {
    console.error("[Spotify Disconnect] Error:", error)
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    )
  }
}
