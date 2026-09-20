/**
 * Bridge into apps/web coach services.
 *
 * apps/web is not `"type": "module"`, so under tsx those files compile as CJS.
 * Named ESM imports then fail with "does not provide an export named …".
 * Default-import interop works; this module re-exports the named bindings the
 * worker jobs need.
 */

import analytics from '@/lib/services/coach/analytics.service'
import coachData from '@/lib/services/coach/coach-data.service'
import plan from '@/lib/services/coach/plan.service'
import runtime from '@/lib/services/coach/runtime.service'
import notify from '@/lib/services/coach/notify.service'
import memory from '@/lib/services/coach/memory.service'
import environment from '@/lib/services/coach/environment.service'

export const computeAndStoreReadiness = analytics.computeAndStoreReadiness
export const getLoadSummary = analytics.getLoadSummary
export const getRaceProjection = analytics.getRaceProjection
export const nightlyRecompute = analytics.nightlyRecompute

export const coachDb = coachData.coachDb
export const getActivity = coachData.getActivity
export const getCurrentBlock = coachData.getCurrentBlock
export const getPtProtocols = coachData.getPtProtocols
export const getSessionsInRange = coachData.getSessionsInRange
export const getSymptoms = coachData.getSymptoms

export const autoDowngradeToday = plan.autoDowngradeToday

export const runCoachJob = runtime.runCoachJob

export const sendCoachNotification = notify.sendCoachNotification

export const backfillMemoryEmbeddings = memory.backfillMemoryEmbeddings
export const decayMemories = memory.decayMemories

export const getWeatherContext = environment.getWeatherContext
