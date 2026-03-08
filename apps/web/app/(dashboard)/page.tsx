import { DashboardV2 } from '@/components/dashboard-v2/dashboard-v2'

// V1 dashboard preserved at @/components/dashboard/main-dashboard
// import { MainDashboard } from '@/components/dashboard/main-dashboard'

export default function Page() {
  return (
    <div className="-m-3 sm:-m-5 md:-mx-6 md:-my-6 h-[calc(100%+1.5rem)] sm:h-[calc(100%+2.5rem)] md:h-[calc(100%+3rem)]">
      <DashboardV2 />
    </div>
  )
}
