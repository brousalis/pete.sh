/**
 * AI Coach Types
 * Zod schemas for structured LLM output and service types
 */

import { z } from 'zod'

// ============================================
// ZOD SCHEMAS FOR STRUCTURED LLM OUTPUT
// ============================================

export const DayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])

export const SignalStatusSchema = z.enum(['good', 'warning', 'concern'])

export const ReadinessLevelSchema = z.enum([
  'fresh',
  'moderate',
  'fatigued',
  'overtrained',
])

export const BodyCompositionAnalysisSchema = z.object({
  currentWeight: z.number().describe('Current body weight in lbs'),
  currentBodyFat: z
    .number()
    .optional()
    .describe('Current body fat percentage from Fitindex scale'),
  currentLeanMass: z
    .number()
    .optional()
    .describe('Current lean body mass in lbs from Fitindex scale'),
  weightTrend: z
    .enum(['losing', 'maintaining', 'gaining'])
    .describe('7-day weight trend direction'),
  leanMassTrend: z
    .enum(['gaining', 'maintaining', 'losing'])
    .optional()
    .describe('7-day lean mass trend direction'),
  weeklyRate: z.number().describe('Rate of weight change in lbs/week'),
  projectedGoalDate: z
    .string()
    .optional()
    .describe('Projected date to reach goal weight at current rate'),
  isCleanCut: z
    .boolean()
    .describe(
      'True if losing fat while maintaining/gaining lean mass (ideal recomp)'
    ),
  recommendation: z
    .string()
    .describe('Specific recommendation for body composition goals'),
})

export const TrainingReadinessSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe('Composite training readiness score'),
  level: ReadinessLevelSchema.describe('Readiness category'),
  signals: z.array(
    z.object({
      metric: z
        .string()
        .describe('Recovery metric name (HRV, Resting HR, Sleep, etc.)'),
      status: SignalStatusSchema.describe('Status of this metric'),
      detail: z
        .string()
        .describe(
          'Specific detail with numbers (e.g. "HRV dropped 15% vs 7-day baseline")'
        ),
    })
  ),
  todayRecommendation: z
    .string()
    .describe(
      'Specific recommendation for today (e.g. "Train as planned" or "Consider swapping to recovery")'
    ),
})

export const RoutineChangeSchema = z.object({
  day: DayOfWeekSchema.describe('Day of the week to modify'),
  section: z
    .enum(['warmup', 'exercises', 'finisher', 'metabolicFlush', 'mobility'])
    .describe('Workout section to modify'),
  action: z
    .enum(['add', 'remove', 'modify', 'swap', 'reorder'])
    .describe('Type of change'),
  exerciseId: z
    .string()
    .optional()
    .describe('ID of existing exercise to modify/remove'),
  exerciseName: z
    .string()
    .optional()
    .describe('Name of the exercise being changed'),
  newExerciseName: z
    .string()
    .optional()
    .describe('Name of replacement exercise (for swap/add)'),
  sets: z.number().optional().describe('Suggested sets'),
  reps: z.number().optional().describe('Suggested reps'),
  weight: z.number().optional().describe('Suggested weight in lbs'),
  duration: z.number().optional().describe('Suggested duration in seconds'),
  rest: z.number().optional().describe('Suggested rest in seconds'),
  form: z.string().optional().describe('Form cues'),
  reasoning: z
    .string()
    .describe('Why this change is recommended, with specific data references'),
  priority: z
    .enum(['immediate', 'next_version', 'consider'])
    .describe('How urgently this change should be applied'),
})

export const ProgressiveOverloadSchema = z.object({
  exerciseName: z.string().describe('Exercise name'),
  exerciseId: z.string().optional().describe('Exercise ID'),
  currentWeight: z
    .number()
    .optional()
    .describe('Current weight from recent logs'),
  suggestedWeight: z.number().optional().describe('Suggested new weight'),
  currentReps: z
    .number()
    .optional()
    .describe('Current reps from recent logs'),
  suggestedReps: z.number().optional().describe('Suggested new reps'),
  currentSets: z
    .number()
    .optional()
    .describe('Current sets from recent logs'),
  suggestedSets: z.number().optional().describe('Suggested new sets'),
  reasoning: z
    .string()
    .describe(
      'Why this progression is recommended, referencing specific workout history'
    ),
})

export const InjuryUpdateSchema = z.object({
  elbowStatus: z
    .string()
    .describe("Current golfer's elbow status assessment"),
  elbowProgressionReady: z
    .boolean()
    .describe('Whether ready to progress elbow rehab'),
  achillesStatus: z.string().describe('Current Achilles tendon status'),
  nextRehabStep: z
    .string()
    .optional()
    .describe('Next step in rehab progression if ready'),
})

export const FullAnalysisSchema = z.object({
  progressSummary: z
    .string()
    .describe(
      'Brief overall progress summary (2-3 sentences) with key metrics'
    ),
  bodyComposition: BodyCompositionAnalysisSchema,
  trainingReadiness: TrainingReadinessSchema,
  routineChanges: z
    .array(RoutineChangeSchema)
    .describe('Suggested changes to the workout routine'),
  progressiveOverload: z
    .array(ProgressiveOverloadSchema)
    .describe('Specific weight/rep progression recommendations'),
  injuryUpdate: InjuryUpdateSchema,
  weeklyFocus: z
    .string()
    .describe(
      'One sentence describing what to prioritize this week'
    ),
})

export const PostWorkoutAnalysisSchema = z.object({
  workoutSummary: z
    .string()
    .describe('Brief summary of the completed workout'),
  performanceNotes: z
    .string()
    .describe('Notable performance observations from the workout data'),
  recoveryAdvice: z
    .string()
    .describe('Recovery advice for the rest of the day'),
  nextWorkoutPreview: z
    .string()
    .describe("Brief preview of tomorrow's workout with any adjustments"),
})

// ============================================
// TYPESCRIPT TYPES (inferred from Zod)
// ============================================

export type BodyCompositionAnalysis = z.infer<
  typeof BodyCompositionAnalysisSchema
>
export type TrainingReadiness = z.infer<typeof TrainingReadinessSchema>
export type RoutineChange = z.infer<typeof RoutineChangeSchema>
export type ProgressiveOverload = z.infer<typeof ProgressiveOverloadSchema>
export type InjuryUpdate = z.infer<typeof InjuryUpdateSchema>
export type FullAnalysis = z.infer<typeof FullAnalysisSchema>
export type PostWorkoutAnalysis = z.infer<typeof PostWorkoutAnalysisSchema>

// ============================================
// SERVICE TYPES
// ============================================

export type AnalysisTrigger =
  | 'post_workout'
  | 'weekly_review'
  | 'manual'
  | 'readiness_check'

export interface AiCoachInsight {
  id: string
  routineId: string
  triggerType: AnalysisTrigger
  triggerContext?: {
    workoutId?: string
    day?: string
    week?: number
    healthkitId?: string
  }
  analysis: FullAnalysis | PostWorkoutAnalysis
  trainingReadinessScore?: number
  hasRoutineSuggestions: boolean
  model: string
  inputTokens?: number
  outputTokens?: number
  createdAt: string
}

export interface AiCoachConversation {
  id: string
  title?: string
  messages: ConversationMessage[]
  contextSnapshot?: string
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface TrainingReadinessInput {
  hrvValues: number[] // last 7 days
  restingHrValues: number[] // last 7 days
  sleepDurations: number[] // last 7 days in hours
  recentTrainingLoad: number // total minutes last 3 days
  completionRate: number // 0-1, last 7 days
  skippedDays: number // last 7 days
}
