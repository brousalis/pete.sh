/**
 * GET /api/mode - Get deployment mode information
 */

import { successResponse } from "@/lib/api/utils"
import { getModeInfo } from "@/lib/utils/mode"

export async function GET() {
  const modeInfo = getModeInfo()
  return successResponse(modeInfo)
}
