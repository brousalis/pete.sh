"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

// Redirect old /fitness/watch route to new /fitness/activity
export default function WatchPageRedirect() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const workoutId = searchParams.get('workout')

  useEffect(() => {
    const newUrl = workoutId 
      ? `/fitness/activity?workout=${workoutId}`
      : '/fitness/activity'
    router.replace(newUrl)
  }, [router, workoutId])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-muted-foreground">Redirecting...</div>
    </div>
  )
}
