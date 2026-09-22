import type { FuelDraft } from './fuel-types'

/**
 * One-tap staples for meals you drink/eat every day.
 * Macros are fixed so logging skips the LLM.
 */
export const FUEL_STAPLES = [
  {
    id: 'lmnt-collagen',
    label: 'LMNT + collagen',
    draft: {
      kind: 'drink' as const,
      descriptionRaw: 'LMNT mix with a scoop of Momentous collagen peptides',
      items: [
        {
          name: 'LMNT electrolyte mix',
          portion: '1 packet',
          kcal: 10,
          proteinG: 0,
          carbsG: 2,
          fatG: 0,
        },
        {
          name: 'Momentous collagen peptides',
          portion: '1 scoop (~11g)',
          kcal: 40,
          proteinG: 10,
          carbsG: 0,
          fatG: 0,
        },
      ],
      kcal: 50,
      proteinG: 10,
      carbsG: 2,
      fatG: 0,
      assumptions: 'Standard LMNT packet + one Momentous collagen scoop.',
      confidence: 1,
      source: 'reuse' as const,
    } satisfies FuelDraft,
  },
] as const

export type FuelStapleId = (typeof FUEL_STAPLES)[number]['id']
