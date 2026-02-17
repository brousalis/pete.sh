import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TJ_BASE_URL = 'https://www.traderjoes.com'

/**
 * Resolve a recipe image URL. Handles relative TJ paths
 * (e.g. /content/dam/trjo/...) by prepending the TJ base URL.
 */
export function resolveRecipeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  if (url.startsWith('/content/dam/trjo')) return `${TJ_BASE_URL}${url}`
  if (url.startsWith('/')) return url
  return url
}
