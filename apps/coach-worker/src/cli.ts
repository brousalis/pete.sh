/**
 * Manual job runner.
 *
 * Runs any scheduled job immediately, which is how they get tested without
 * waiting for 05:30 or a Sunday evening.
 *
 * Usage:
 *   yarn job briefing
 *   yarn job debrief --activity <uuid>
 *   yarn job weekly-plan
 *   yarn job nightly
 */

import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
loadEnv({ path: fileURLToPath(new URL('../../web/.env.local', import.meta.url)) })
loadEnv({ path: fileURLToPath(new URL('../../web/.env', import.meta.url)) })

const USAGE = `
petehome job runner

  briefing                     Morning briefing (includes auto-downgrade)
  debrief --activity <uuid>    Post-session debrief
  nudge                        Evening check-in nudge
  weekly-plan                  Generate next week
  block-review                 Review the current block
  nightly                      Analytics recompute and memory maintenance
  pt-morning | pt-evening      PT block reminder
`

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv

  const flag = (name: string): string | undefined => {
    const index = rest.indexOf(`--${name}`)
    return index >= 0 ? rest[index + 1] : undefined
  }

  const jobs = await import('./jobs.js')

  switch (command) {
    case 'briefing':
      return report(await jobs.runMorningBriefing())

    case 'debrief': {
      const activityId = flag('activity')
      if (!activityId) {
        console.error('debrief requires --activity <uuid>')
        process.exit(1)
      }
      return report(await jobs.runDebrief(activityId))
    }

    case 'nudge':
      return report(await jobs.runEveningNudge())

    case 'weekly-plan':
      return report(await jobs.runWeeklyPlan())

    case 'block-review':
      return report(await jobs.runBlockReview())

    case 'nightly':
      return report(await jobs.runNightlyMaintenance())

    case 'pt-morning':
      return report(await jobs.runPtReminder('morning'))

    case 'pt-evening':
      return report(await jobs.runPtReminder('evening'))

    default:
      console.log(USAGE)
      process.exit(command ? 1 : 0)
  }
}

function report(result: { job: string; ok: boolean; summary: string; costUsd?: number; detail?: unknown }): void {
  console.log('')
  console.log(`${result.ok ? 'OK' : 'FAILED'}  ${result.job}`)
  console.log(result.summary)
  if (result.costUsd != null) console.log(`Cost: $${result.costUsd.toFixed(4)}`)
  if (result.detail) console.log(JSON.stringify(result.detail, null, 2))
  console.log('')
  process.exit(result.ok ? 0 : 1)
}

main().catch((error) => {
  console.error('Job failed:', error)
  process.exit(1)
})
