'use client'

import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

function CoachLoginRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/coach'

  useEffect(() => {
    router.replace(next.startsWith('/coach') ? next : '/coach')
  }, [next, router])

  return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
}

/** Access codes are retired — bounce straight into the coach PWA. */
export default function CoachLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
        <CoachLoginRedirect />
      </Suspense>
    </div>
  )
}
