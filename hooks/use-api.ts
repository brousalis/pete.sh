"use client"

/**
 * Hook for making API calls with automatic base URL routing
 * 
 * Uses the connectivity context to determine whether to call
 * the local instance or the production API.
 */

import { useCallback } from "react"
import { useConnectivity } from "@/components/connectivity-provider"

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface UseApiOptions {
  /** Custom timeout in ms (default: 30000) */
  timeout?: number
}

/**
 * Hook that provides API fetch functions with automatic base URL routing
 */
export function useApi(options: UseApiOptions = {}) {
  const { apiBaseUrl, isLocalAvailable, isInitialized } = useConnectivity()
  const { timeout = 30_000 } = options

  /**
   * Make a GET request
   */
  const get = useCallback(
    async <T = unknown>(path: string): Promise<ApiResponse<T>> => {
      return fetchApi<T>(`${apiBaseUrl}${path}`, { method: "GET" }, timeout)
    },
    [apiBaseUrl, timeout]
  )

  /**
   * Make a POST request
   */
  const post = useCallback(
    async <T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
      return fetchApi<T>(
        `${apiBaseUrl}${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
        timeout
      )
    },
    [apiBaseUrl, timeout]
  )

  /**
   * Make a PUT request
   */
  const put = useCallback(
    async <T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
      return fetchApi<T>(
        `${apiBaseUrl}${path}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
        timeout
      )
    },
    [apiBaseUrl, timeout]
  )

  /**
   * Make a PATCH request
   */
  const patch = useCallback(
    async <T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
      return fetchApi<T>(
        `${apiBaseUrl}${path}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
        timeout
      )
    },
    [apiBaseUrl, timeout]
  )

  /**
   * Make a DELETE request
   */
  const del = useCallback(
    async <T = unknown>(path: string): Promise<ApiResponse<T>> => {
      return fetchApi<T>(`${apiBaseUrl}${path}`, { method: "DELETE" }, timeout)
    },
    [apiBaseUrl, timeout]
  )

  return {
    get,
    post,
    put,
    patch,
    delete: del,
    /** The current API base URL */
    baseUrl: apiBaseUrl,
    /** Whether local instance is available */
    isLocal: isLocalAvailable,
    /** Whether connectivity has been checked */
    isReady: isInitialized,
  }
}

/**
 * Internal fetch helper with timeout support
 */
async function fetchApi<T>(
  url: string,
  init: RequestInit,
  timeout: number
): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

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
