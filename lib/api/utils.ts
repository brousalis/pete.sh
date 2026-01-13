/**
 * API utility functions for Next.js API routes
 */

import { NextResponse } from "next/server"
import type { ApiResponse, ApiError } from "@/lib/types/api.types"

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

/**
 * Create an error API response
 */
export function errorResponse(
  error: string | ApiError,
  status = 500
): NextResponse<ApiResponse> {
  const errorObj = typeof error === "string" ? { code: "UNKNOWN", message: error } : error

  return NextResponse.json(
    {
      success: false,
      error: errorObj.message,
      ...(errorObj.code && { code: errorObj.code }),
      ...(errorObj.details && { details: errorObj.details }),
    },
    { status }
  )
}

/**
 * Handle API route errors
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error("API Error:", error)

  if (error instanceof Error) {
    return errorResponse(error.message, 500)
  }

  return errorResponse("An unexpected error occurred", 500)
}

/**
 * Validate request method
 */
export function validateMethod(request: Request, allowedMethods: string[]): boolean {
  return allowedMethods.includes(request.method)
}

/**
 * Get JSON body from request
 */
export async function getJsonBody<T = unknown>(request: Request): Promise<T> {
  try {
    return await request.json()
  } catch {
    throw new Error("Invalid JSON body")
  }
}
