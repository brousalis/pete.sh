import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { SonosService } from "@/lib/services/sonos.service"

const sonosService = new SonosService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await sonosService.play(id)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
