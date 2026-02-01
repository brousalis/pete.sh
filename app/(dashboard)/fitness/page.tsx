'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FitnessSingleView } from '@/components/dashboard/fitness-single-view'
import { RoutineEditor } from '@/components/dashboard/routine-editor'
import { Dumbbell, Settings, Watch, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type FitnessTab = 'today' | 'edit'

export default function FitnessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<FitnessTab>(
    tabParam === 'edit' ? 'edit' : 'today'
  )

  const handleTabChange = (value: string) => {
    setActiveTab(value as FitnessTab)
    // Update URL without full navigation
    const newUrl = value === 'today' ? '/fitness' : `/fitness?tab=${value}`
    window.history.replaceState(null, '', newUrl)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange}
        className="flex h-full min-h-0 flex-col"
      >
        {/* Tab Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsList>
            <TabsTrigger value="today" className="gap-2">
              <Dumbbell className="h-4 w-4" />
              Today
            </TabsTrigger>
            <TabsTrigger value="edit" className="gap-2">
              <Settings className="h-4 w-4" />
              Edit Routine
            </TabsTrigger>
          </TabsList>
          
          <Link href="/fitness/watch">
            <Button variant="outline" size="sm" className="gap-2">
              <Watch className="h-4 w-4" />
              Watch Data
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Button>
          </Link>
        </div>

        {/* Tab Content */}
        <TabsContent value="today" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
          <FitnessSingleView />
        </TabsContent>

        <TabsContent value="edit" className="flex-1 min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
          <RoutineEditor />
        </TabsContent>
      </Tabs>
    </div>
  )
}
