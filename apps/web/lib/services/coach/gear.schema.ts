import { z } from 'zod'

export const GEAR_CATEGORIES = [
  'shoes',
  'bike',
  'component',
  'wetsuit',
  'sensor',
  'apparel',
  'other',
] as const

export const GEAR_SPORTS = ['swim', 'bike', 'run', 'strength'] as const

export const GEAR_SERVICE_TYPES = [
  'bike_fit',
  'chain',
  'tune',
  'cleat',
  'inspection',
  'other',
] as const

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const gearWriteSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.enum(GEAR_CATEGORIES),
  sport: z.enum(GEAR_SPORTS).optional(),
  brand: z.string().max(60).optional(),
  model: z.string().max(80).optional(),
  purchasedOn: dateSchema.optional(),
  retiredOn: dateSchema.nullish(),
  costUsd: z.number().positive().optional(),
  /** Service life in miles; shoes are typically 300–500. */
  lifeLimitMiles: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
})

export const gearPatchSchema = gearWriteSchema.partial()

export const gearServiceSchema = z.object({
  serviceType: z.enum(GEAR_SERVICE_TYPES),
  performedOn: dateSchema.optional(),
  dueOn: dateSchema.optional(),
  intervalMiles: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
})

export type GearWriteInput = z.infer<typeof gearWriteSchema>
export type GearPatchInput = z.infer<typeof gearPatchSchema>
