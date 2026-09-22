import { redirect } from 'next/navigation'

export default function CoachFuelRedirect() {
  redirect('/coach?panel=fuel')
}
