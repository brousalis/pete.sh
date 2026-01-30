/**
 * API Client with Dynamic Base URL
 * 
 * This module provides a unified way to make API calls that automatically
 * uses the correct base URL based on connectivity status:
 * - When local instance is reachable: calls go to local URL
 * - When local is unreachable: calls go to current host (Vercel/production)
 */

// ============================================
// Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  /** Request body - will be JSON stringified if object */
  body?: unknown
  /** Custom timeout in ms (default: 30000) */
  timeout?: number
  /** Skip the connectivity-based URL routing */
  useRelativeUrl?: boolean
}

// ============================================
// State Management (for non-React contexts)
// ============================================

let currentApiBaseUrl = ""

/**
 * Set the API base URL (called by ConnectivityProvider)
 */
export function setApiBaseUrl(url: string): void {
  if (currentApiBaseUrl !== url) {
    console.log(`[API Client] Base URL changed: "${currentApiBaseUrl || '(relative)'}" -> "${url || '(relative)'}"`)
  }
  currentApiBaseUrl = url
}

/**
 * Get the current API base URL
 */
export function getApiBaseUrl(): string {
  return currentApiBaseUrl
}

// ============================================
// Core Fetch Function
// ============================================

/**
 * Make an API request with automatic base URL routing
 * 
 * @param path - API path (e.g., "/api/hue/lights")
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    body,
    timeout = 30_000,
    useRelativeUrl = false,
    ...fetchOptions
  } = options

  // Determine the full URL
  const baseUrl = useRelativeUrl ? "" : currentApiBaseUrl
  const url = `${baseUrl}${path}`

  // Set up headers
  const headers = new Headers(fetchOptions.headers)
  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  // Set up abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Parse response
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        code: data.code,
      }
    }

    return data as ApiResponse<T>
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: "Request timed out",
          code: "TIMEOUT",
        }
      }
      return {
        success: false,
        error: error.message,
        code: "NETWORK_ERROR",
      }
    }

    return {
      success: false,
      error: "Unknown error",
      code: "UNKNOWN",
    }
  }
}

// ============================================
// Convenience Methods
// ============================================

/**
 * GET request
 */
export function apiGet<T = unknown>(
  path: string,
  options?: Omit<FetchOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { ...options, method: "GET" })
}

/**
 * POST request
 */
export function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  options?: Omit<FetchOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { ...options, method: "POST", body })
}

/**
 * PUT request
 */
export function apiPut<T = unknown>(
  path: string,
  body?: unknown,
  options?: Omit<FetchOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { ...options, method: "PUT", body })
}

/**
 * PATCH request
 */
export function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  options?: Omit<FetchOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { ...options, method: "PATCH", body })
}

/**
 * DELETE request
 */
export function apiDelete<T = unknown>(
  path: string,
  options?: Omit<FetchOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { ...options, method: "DELETE" })
}
