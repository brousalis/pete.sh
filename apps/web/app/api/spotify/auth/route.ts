import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SpotifyService } from "@/lib/services/spotify.service"
import { getSpotifyTokens } from "@/lib/services/token-storage"

/**
 * Initiate Spotify OAuth flow
 * Redirects user to Spotify's authorization page
 * 
 * Dynamically determines the redirect URI from the request origin so that:
 * - From pete.sh → redirect goes back to pete.sh/spotify/callback
 * - From localhost → redirect goes back to localhost:3000/spotify/callback
 * 
 * Supports a `returnTo` query param to redirect back after OAuth
 * (useful when initiating from pete.sh via localhost)
 */
export async function GET(request: NextRequest) {
  try {
    // Derive the redirect URI from the incoming request URL
    // This ensures the OAuth callback returns to the same origin the user initiated from
    const requestUrl = new URL(request.url)
    const origin = requestUrl.origin
    const redirectUri = `${origin}/spotify/callback`

    console.log("[Spotify Auth] Derived redirect URI from request:", {
      requestUrl: request.url,
      origin,
      redirectUri,
    })

    const spotifyService = new SpotifyService(redirectUri)

    if (!spotifyService.isConfigured()) {
      return NextResponse.json(
        { error: "Spotify not configured. Check NEXT_SPOTIFY_CLIENT_ID and NEXT_SPOTIFY_CLIENT_SECRET" },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    
    // Check if we already have valid tokens (in file storage or cookies)
    const fileTokens = getSpotifyTokens()
    const cookieAccessToken = cookieStore.get("spotify_access_token")?.value
    const cookieExpiresAt = cookieStore.get("spotify_expires_at")?.value
    
    const hasValidToken = (fileTokens.accessToken && fileTokens.expiryDate && fileTokens.expiryDate > Date.now()) ||
                          (cookieAccessToken && cookieExpiresAt && parseInt(cookieExpiresAt, 10) > Date.now())

    // If we have a valid non-expired token, redirect to music page
    if (hasValidToken) {
      const returnTo = request.nextUrl.searchParams.get("returnTo")
      if (returnTo) {
        return NextResponse.redirect(new URL("/music?spotify=connected", returnTo))
      }
      return NextResponse.redirect(new URL("/music?spotify=connected", origin))
    }

    // Store returnTo URL if provided (for redirecting back after OAuth)
    const returnTo = request.nextUrl.searchParams.get("returnTo") || request.headers.get("referer")
    if (returnTo && returnTo.includes("pete.sh")) {
      cookieStore.set("spotify_return_to", returnTo, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10, // 10 minutes
        path: "/",
      })
      console.log("[Spotify Auth] Stored returnTo URL:", returnTo)
    }

    // Generate a state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15)
    
    // Store state in cookie for verification
    cookieStore.set("spotify_auth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    })

    const authUrl = spotifyService.getAuthUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("[Spotify Auth] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate OAuth" },
      { status: 500 }
    )
  }
}
