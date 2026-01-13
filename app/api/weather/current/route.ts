import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { WeatherService } from "@/lib/services/weather.service"

const weatherService = new WeatherService()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined
    const lon = searchParams.get("lon") ? parseFloat(searchParams.get("lon")!) : undefined

    const current = await weatherService.getCurrentWeather(lat, lon)
    return successResponse(current)
  } catch (error) {
    return handleApiError(error)
  }
}
