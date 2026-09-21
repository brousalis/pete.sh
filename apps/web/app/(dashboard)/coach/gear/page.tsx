import { redirect } from 'next/navigation'

export default function CoachGearRedirect() {
  redirect('/coach?panel=more')
}
