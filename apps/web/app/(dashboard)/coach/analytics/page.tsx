import { redirect } from 'next/navigation'

export default function CoachAnalyticsRedirect() {
  redirect('/coach?panel=plan')
}
