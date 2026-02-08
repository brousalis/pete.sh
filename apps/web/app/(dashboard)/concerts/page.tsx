'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fadeUpVariants } from '@/lib/animations'
import { motion } from 'framer-motion'
import { CalendarDays, MapPin, Music, Ticket } from 'lucide-react'

export default function ConcertsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-3"
      >
        <div className="bg-brand/10 flex size-12 items-center justify-center rounded-xl">
          <Ticket className="text-brand size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Concerts</h1>
          <p className="text-muted-foreground text-sm">
            Upcoming shows and events
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
              <Music className="size-4" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              This page will display your upcoming concerts, shows, and music
              events. Features will include:
            </p>
            <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                Integration with Songkick or Bandsintown
              </li>
              <li className="flex items-center gap-2">
                <Ticket className="size-4" />
                Ticket tracking and reminders
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4" />
                Venue information and directions
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
