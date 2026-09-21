import { redirect } from 'next/navigation'

export default function CoachPlanRedirect() {
  redirect('/coach?panel=plan')
}
