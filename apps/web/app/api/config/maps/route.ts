/**
 * Maps Configuration API
 * Returns public Google Maps API key for client-side rendering
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    return NextResponse.json({ apiKey: null })
  }

  return NextResponse.json({ apiKey })
}
