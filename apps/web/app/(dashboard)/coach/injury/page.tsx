import { redirect } from 'next/navigation'

export default function CoachInjuryRedirect() {
  redirect('/coach?panel=knee')
}
