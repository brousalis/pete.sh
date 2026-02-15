'use client'

import { useRoundedLayout } from '@/components/settings-provider'
import { MobileBottomNavigation, TopNavigation } from '@/components/top-navigation'
import { cn } from '@/lib/utils'
import type React from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isRounded = useRoundedLayout()

  return (
    <div className="bg-background flex flex-col">
      {/* Outer container with padding (only when rounded) */}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          // isRounded && 'p-2 pb-0 sm:p-3 sm:pb-0 md:pb-3'
        )}
      >
        {/* Card wrapper - flex column to contain nav + content + footer */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col ',
            // 'bg-card ring-border flex min-h-0 flex-1 flex-col overflow-hidden shadow-sm ring-1',
            // isRounded && 'rounded-2xl sm:rounded-3xl'
          )}
        >
          {/* Top Navigation - fixed height, shrink-0 to prevent compression */}
          <div className="shrink-0">
            <TopNavigation />
          </div>

          {/* Main Content - scrollable, hide scrollbar for cleaner look */}
          <main className="scrollbar-hide bg-muted relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 md:px-6 md:py-6">
            <div className="h-full">{children}</div>
          </main>

          {/* Mobile bottom navigation - icon-based tab bar */}
          <MobileBottomNavigation />
        </div>
      </div>
    </div>
  )
}


// export default function DashboardLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   const isRounded = useRoundedLayout()

//   return (
//     <div className="bg-background fixed inset-0 flex flex-col overflow-hidden">
//       {/* Outer container with padding (only when rounded) */}
//       <div
//         className={cn(
//           'flex min-h-0 flex-1 flex-col',
//           isRounded && 'p-2 pb-0 sm:p-3 sm:pb-0 md:pb-3'
//         )}
//       >
//         {/* Card wrapper - flex column to contain nav + content + footer */}
//         <div
//           className={cn(
//             'bg-card ring-border flex min-h-0 flex-1 flex-col overflow-hidden shadow-sm ring-1',
//             isRounded && 'rounded-2xl sm:rounded-3xl'
//           )}
//         >
//           {/* Top Navigation - fixed height, shrink-0 to prevent compression */}
//           <div className="shrink-0">
//             <TopNavigation />
//           </div>

//           {/* Main Content - scrollable, hide scrollbar for cleaner look */}
//           <main className="scrollbar-hide bg-muted relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 md:px-6 md:py-6">
//             <div className="h-full">{children}</div>
//           </main>

//           {/* Mobile bottom navigation - icon-based tab bar */}
//           <MobileBottomNavigation />
//         </div>
//       </div>
//     </div>
//   )
// }
