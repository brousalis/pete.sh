import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"

const hueService = new HueService()

/**
 * GET /api/hue/entertainment/[id] - Get entertainment area status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const { id } = await params
    const status = await hueService.getEntertainmentStatus(id)
    return successResponse(status)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/hue/entertainment/[id] - Toggle entertainment mode
 * 
 * Note: Entertainment streaming requires special API permissions.
 * The API user must be created with generateclientkey: true
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const { id } = await params
    const body = await request.json()
    const { active } = body

    if (typeof active !== "boolean") {
      return errorResponse("'active' must be a boolean", 400)
    }

    const result = await hueService.setEntertainmentMode(id, active)
    
    // Check for Hue API errors in the response
    // Hue API returns 200 OK but includes error objects in the response body
    if (Array.isArray(result)) {
      const hueError = result.find((r: unknown) => 
        r && typeof r === 'object' && 'error' in r
      )
      if (hueError && typeof hueError === 'object' && 'error' in hueError) {
        const err = hueError.error as { type: number; description: string }
        
        // Type 1 = unauthorized user - needs entertainment permissions
        if (err.type === 1 && err.description?.includes('unauthorized')) {
          return errorResponse(
            "Entertainment streaming requires special API permissions. " +
            "You need to create a new Hue API user with 'generateclientkey: true'. " +
            "See the Hue Entertainment API documentation.",
            403
          )
        }
        
        return errorResponse(err.description || "Hue API error", 400)
      }
    }
    
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
