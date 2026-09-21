import { redirect } from 'next/navigation'

/** Home is petehome. Old dashboard v3 has been removed. */
export default function HomePage() {
  redirect('/coach')
}
