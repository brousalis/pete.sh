/**
 * Re-export job runners from the web app.
 *
 * Jobs live in apps/web so Vercel cron and chat share one implementation.
 * The CLI keeps this path for `yarn coach:job …`.
 */

export {
  runBlockReview,
  runDebrief,
  runDebriefSweep,
  runEveningNudge,
  runMorningBriefing,
  runNightlyMaintenance,
  runPolarSleepSync,
  runPtReminder,
  runWeeklyPlan,
  type JobResult,
} from '@/lib/services/coach/jobs.service'
