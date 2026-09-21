import { redirect } from 'next/navigation'

export default async function CoachChatRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') next.set(key, value)
    else if (Array.isArray(value) && value[0]) next.set(key, value[0])
  }
  const query = next.toString()
  redirect(query ? `/coach?${query}` : '/coach')
}
