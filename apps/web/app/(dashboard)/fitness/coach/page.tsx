import { redirect } from 'next/navigation'

/** The gym-recomp AI Coach was replaced by PeteCoach. */
export default function LegacyFitnessCoachRedirect() {
  redirect('/coach/chat')
}
