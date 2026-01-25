/**
 * GET /api/health - Health check endpoint for connectivity detection
 * 
 * This endpoint is used by the client to determine if the local instance
 * is reachable. When accessible, the client can use local APIs directly.
 * 
 * The response includes:
 * - mode: 'local' if any local services are reachable, 'production' otherwise
 * - instanceId: Identifier to verify it's the correct instance
 * - services: Status of each service's availability (cached results)
 */

import { NextResponse } from "next/server"
import { getHueAdapter } from "@/lib/adapters/hue.adapter"
import { getServiceAvailabilityStatus, isAnyLocalServiceAvailable } from "@/lib/adapters/base.adapter"

export async function GET() {
  // Trigger a Hue bridge check if not already cached
  // This is the primary indicator of "local mode" since Hue requires local network
  const hueAdapter = getHueAdapter()
  
  // Check if Hue is reachable (this will cache the result)
  let hueAvailable = false
  try {
    // Use the adapter's availability check
    hueAvailable = await hueAdapter['isLocalServiceAvailable']()
  } catch {
    // Ignore errors - just means not available
  }

  // Determine mode based on service availability
  const isLocal = hueAvailable || isAnyLocalServiceAvailable()
  
  return NextResponse.json({
    ok: true,
    mode: isLocal ? "local" : "production",
    timestamp: new Date().toISOString(),
    // Include a unique identifier so the client can verify it's the right instance
    instanceId: "petehome-local",
    // Include service availability status for debugging
    services: getServiceAvailabilityStatus(),
  }, {
    headers: {
      // Allow cross-origin requests from production domain
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      // Prevent caching of health checks
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
