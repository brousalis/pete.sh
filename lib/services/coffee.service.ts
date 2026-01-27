/**
 * Coffee Service
 * Based on coffee-v2.md - The Chicago Studio Coffee Guide (2026)
 *
 * Equipment:
 * - Machine: Technivorm Moccamaster KBGV Select (Matte Black)
 * - Batch Grinder: Fellow Ode Gen 2
 * - Solo Grinder: Timemore S3
 * - Brewer: Hario Switch (Size 03)
 * - Server: Hario V60 Glass Server (1000ml)
 * - Scale: Acaia Pearl
 * - Kettle: Fellow Stagg EKG
 */

import type {
  BrewMethod,
  CoffeeGuideData,
  CoffeeRecipe,
  CupSize,
  GoldenRule,
  QuickDose,
  RoastLevel,
  RoastStrategy,
} from '@/lib/types/coffee.types'

export class CoffeeService {
  /**
   * Roast Strategy Key - general rules for each roast type
   */
  getRoastStrategies(): RoastStrategy[] {
    return [
      {
        roast: 'light',
        goal: 'Acidity & Complexity',
        temp: '212°F (Boiling)',
        technique: 'High Agitation. Pour aggressively. Stir blooms.',
        ratio: '1:16 or 1:17',
      },
      {
        roast: 'medium',
        goal: 'Sweetness & Body',
        temp: '200°F – 205°F',
        technique: 'Gentle Agitation. Pour steadily. Minimal stirring.',
        ratio: '1:16 or 1:17',
      },
      {
        roast: 'dark',
        goal: 'Light & Sweet (No Bitterness)',
        temp: '195°F (Manual) or Default (Machine)',
        technique: 'Zero Agitation. Do not stir. Let gravity do the work.',
        ratio: '1:18 (less coffee)',
      },
    ]
  }

  /**
   * Hario Switch recipes by cup size and roast
   */
  getSwitchRecipes(): CoffeeRecipe[] {
    return [
      // 1 CUP (300ml) - "The Hybrid" method
      {
        id: 'switch-1-light',
        method: 'switch',
        cupSize: '1-cup',
        cupSizeLabel: '1 Cup (300ml)',
        waterMl: 300,
        roast: 'light',
        ratio: '1:16',
        coffee: 18.8,
        temp: '212°F',
        technique: 'Aggressive Flush. Brisk swirl during steep.',
        switchSetting: 'hybrid',
        timingCues: [
          { time: 0, label: 'Flush', action: 'Pour 60g fast with switch DOWN' },
          { time: 45, label: 'Steep', action: 'Switch UP, pour to 300g, swirl' },
          { time: 150, label: 'Release', action: 'Switch DOWN, let drain' },
        ],
      },
      {
        id: 'switch-1-medium',
        method: 'switch',
        cupSize: '1-cup',
        cupSizeLabel: '1 Cup (300ml)',
        waterMl: 300,
        roast: 'medium',
        ratio: '1:16',
        coffee: 18.8,
        temp: '200°F',
        technique: 'Gentle Flush. One soft swirl during steep.',
        switchSetting: 'hybrid',
        timingCues: [
          { time: 0, label: 'Flush', action: 'Pour 60g gently with switch DOWN' },
          { time: 45, label: 'Steep', action: 'Switch UP, pour to 300g, one soft swirl' },
          { time: 150, label: 'Release', action: 'Switch DOWN, let drain' },
        ],
      },
      {
        id: 'switch-1-dark',
        method: 'switch',
        cupSize: '1-cup',
        cupSizeLabel: '1 Cup (300ml)',
        waterMl: 300,
        roast: 'dark',
        ratio: '1:18',
        coffee: 16.5,
        temp: '195°F',
        technique: 'V60 Mode Only. Switch OPEN. Pour slowly center. No immersion.',
        switchSetting: 'open',
      },
      // 2 CUPS (600ml) - Standard V60 Pour-Over
      {
        id: 'switch-2-light',
        method: 'switch',
        cupSize: '2-cup',
        cupSizeLabel: '2 Cups (600ml)',
        waterMl: 600,
        roast: 'light',
        ratio: '1:16',
        coffee: 37.5,
        temp: '212°F',
        technique: '5 Pours. Bloom + 4 aggressive pulses. Keep heat high.',
        switchSetting: 'open',
        timingCues: [
          { time: 0, label: 'Bloom', action: 'Pour ~100g, stir' },
          { time: 45, label: 'Pour 1', action: 'Pour to ~200g' },
          { time: 75, label: 'Pour 2', action: 'Pour to ~350g' },
          { time: 105, label: 'Pour 3', action: 'Pour to ~500g' },
          { time: 135, label: 'Pour 4', action: 'Pour to 600g' },
        ],
      },
      {
        id: 'switch-2-medium',
        method: 'switch',
        cupSize: '2-cup',
        cupSizeLabel: '2 Cups (600ml)',
        waterMl: 600,
        roast: 'medium',
        ratio: '1:16',
        coffee: 37.5,
        temp: '205°F',
        technique: '3 Pours. Bloom → to 350g → to 600g. Pour in center at end.',
        switchSetting: 'open',
        timingCues: [
          { time: 0, label: 'Bloom', action: 'Pour ~100g' },
          { time: 45, label: 'Pour 1', action: 'Pour to 350g' },
          { time: 90, label: 'Pour 2', action: 'Pour to 600g, center pour' },
        ],
      },
      {
        id: 'switch-2-dark',
        method: 'switch',
        cupSize: '2-cup',
        cupSizeLabel: '2 Cups (600ml)',
        waterMl: 600,
        roast: 'dark',
        ratio: '1:18',
        coffee: 33,
        temp: '195°F',
        technique: 'Center Pour Only. Steady in center (quarter size). No stir.',
        switchSetting: 'open',
      },
      // 3-4 CUPS (1000ml) - "The Sunday Theater"
      {
        id: 'switch-3-4-light',
        method: 'switch',
        cupSize: '3-4-cup',
        cupSizeLabel: '3–4 Cups (1000ml)',
        waterMl: 1000,
        roast: 'light',
        ratio: '1:16',
        coffee: 62.5,
        temp: '212°F',
        technique: 'Excavate Bloom. Stir bottom vigorously. High pour height.',
        switchSetting: 'open',
        timingCues: [
          { time: 0, label: 'Bloom', action: 'Pour 180g, dig to bottom' },
          { time: 45, label: 'Pour 1', action: 'Pour to 500g' },
          { time: 105, label: 'Pour 2', action: 'Pour to 800g' },
          { time: 150, label: 'Pour 3', action: 'Pour to 1000g' },
        ],
      },
      {
        id: 'switch-3-4-medium',
        method: 'switch',
        cupSize: '3-4-cup',
        cupSizeLabel: '3–4 Cups (1000ml)',
        waterMl: 1000,
        roast: 'medium',
        ratio: '1:16',
        coffee: 62.5,
        temp: '212°F',
        technique: 'Dig Bloom Only. Gentle spiral pours after bloom.',
        switchSetting: 'open',
        timingCues: [
          { time: 0, label: 'Bloom', action: 'Pour 180g, dig bloom' },
          { time: 45, label: 'Pour 1', action: 'Gentle spiral to 500g' },
          { time: 105, label: 'Pour 2', action: 'Gentle spiral to 800g' },
          { time: 150, label: 'Pour 3', action: 'Gentle spiral to 1000g' },
        ],
      },
      {
        id: 'switch-3-4-dark',
        method: 'switch',
        cupSize: '3-4-cup',
        cupSizeLabel: '3–4 Cups (1000ml)',
        waterMl: 1000,
        roast: 'dark',
        ratio: '1:18',
        coffee: 56,
        temp: '195°F',
        technique: 'No Stir. Gentle bloom. Pour very slowly center to avoid overflow.',
        switchSetting: 'open',
      },
    ]
  }

  /**
   * Moccamaster recipes by cup size and roast
   */
  getMoccamasterRecipes(): CoffeeRecipe[] {
    return [
      // 2 CUPS (600ml) - Half Jug / Pulse Flow
      {
        id: 'mocca-2-light',
        method: 'moccamaster',
        cupSize: '2-cup',
        cupSizeLabel: '2 Cups (600ml)',
        waterMl: 600,
        roast: 'light',
        ratio: '1:17',
        coffee: 35,
        temp: 'Default',
        technique: 'Stir at 0:30. Pulse flow is slow, so help it get wet.',
        moccaSetting: 'half',
        timingCues: [{ time: 30, label: 'Stir', action: 'Stir wet grounds' }],
      },
      {
        id: 'mocca-2-medium',
        method: 'moccamaster',
        cupSize: '2-cup',
        cupSizeLabel: '2 Cups (600ml)',
        waterMl: 600,
        roast: 'medium',
        ratio: '1:17',
        coffee: 35,
        temp: 'Default',
        technique: 'No Stir. Agitation makes medium roast bitter.',
        moccaSetting: 'half',
      },
      {
        id: 'mocca-2-dark',
        method: 'moccamaster',
        cupSize: '2-cup',
        cupSizeLabel: '2 Cups (600ml)',
        waterMl: 600,
        roast: 'dark',
        ratio: '1:18',
        coffee: 33,
        temp: 'Default',
        technique: 'NO STIR. Use 1:18 ratio. Let pulse flow handle it.',
        moccaSetting: 'half',
      },
      // 8 CUPS / 1L - Standard Batch (Full Jug / Open Flow)
      {
        id: 'mocca-8-light',
        method: 'moccamaster',
        cupSize: '8-cup',
        cupSizeLabel: '8 Cups (1 Liter)',
        waterMl: 1000,
        roast: 'light',
        ratio: '1:17',
        coffee: 59,
        temp: 'Default',
        technique: 'Stir at 0:45. Break the crust thoroughly.',
        moccaSetting: 'full',
        timingCues: [{ time: 45, label: 'Stir', action: 'Break the crust (3 circles)' }],
      },
      {
        id: 'mocca-8-medium',
        method: 'moccamaster',
        cupSize: '8-cup',
        cupSizeLabel: '8 Cups (1 Liter)',
        waterMl: 1000,
        roast: 'medium',
        ratio: '1:17',
        coffee: 59,
        temp: 'Default',
        technique: 'Gentle Stir at 0:45. Just 3 circles to mix.',
        moccaSetting: 'full',
        timingCues: [{ time: 45, label: 'Stir', action: 'Gentle stir (3 circles)' }],
      },
      {
        id: 'mocca-8-dark',
        method: 'moccamaster',
        cupSize: '8-cup',
        cupSizeLabel: '8 Cups (1 Liter)',
        waterMl: 1000,
        roast: 'dark',
        ratio: '1:18',
        coffee: 56,
        temp: 'Default',
        technique: 'NO STIR. Use 1:18. Stirring will cause clogging and ashiness.',
        moccaSetting: 'full',
      },
      // 10 CUPS / 1.25L - Max Batch
      {
        id: 'mocca-10-light',
        method: 'moccamaster',
        cupSize: '10-cup',
        cupSizeLabel: '10 Cups (1.25 Liters)',
        waterMl: 1250,
        roast: 'light',
        ratio: '1:17',
        coffee: 73.5,
        temp: 'Default',
        technique: 'Safety Stir at 1:00. Watch for overflow. Fold filter edges HARD.',
        moccaSetting: 'full',
        timingCues: [{ time: 60, label: 'Stir', action: 'Safety stir, watch overflow' }],
      },
      {
        id: 'mocca-10-medium',
        method: 'moccamaster',
        cupSize: '10-cup',
        cupSizeLabel: '10 Cups (1.25 Liters)',
        waterMl: 1250,
        roast: 'medium',
        ratio: '1:17',
        coffee: 73.5,
        temp: 'Default',
        technique: 'Safety Stir at 1:00. Be careful if beans are fresh/bloomy.',
        moccaSetting: 'full',
        timingCues: [{ time: 60, label: 'Stir', action: 'Safety stir if needed' }],
      },
      {
        id: 'mocca-10-dark',
        method: 'moccamaster',
        cupSize: '10-cup',
        cupSizeLabel: '10 Cups (1.25 Liters)',
        waterMl: 1250,
        roast: 'dark',
        ratio: '1:18',
        coffee: 69,
        temp: 'Default',
        technique: 'ABSOLUTELY NO STIR. Basket full of foam. Stirring causes overflow.',
        moccaSetting: 'full',
      },
    ]
  }

  /**
   * Quick reference dose numbers for Hario Switch
   */
  getSwitchDoses(): QuickDose[] {
    return [
      { label: '1 Cup (Standard)', grams: 18.8 },
      { label: '2 Cups (Standard)', grams: 37.5 },
      { label: '2 Cups (Dark)', grams: 33 },
      { label: '3 Cups (Standard)', grams: 56 },
      { label: '4 Cups (Standard)', grams: 62.5 },
    ]
  }

  /**
   * Quick reference dose numbers for Moccamaster
   */
  getMoccamasterDoses(): QuickDose[] {
    return [
      { label: '2 Cups (Standard)', grams: 35 },
      { label: '2 Cups (Dark)', grams: 33 },
      { label: '4 Cups (Standard)', grams: 47 },
      { label: '6 Cups (Standard)', grams: 59 },
      { label: '8 Cups (Standard)', grams: 65 },
      { label: '8 Cups (Dark)', grams: 56 },
      { label: '10 Cups (Standard)', grams: 73.5 },
      { label: '10 Cups (Dark)', grams: 69 },
    ]
  }

  /**
   * Golden Rules that apply to every cup
   */
  getGoldenRules(): GoldenRule[] {
    return [
      {
        title: 'RDT Spray',
        description: 'Spray beans with one spritz of water before grinding. Shake to coat. Prevents static.',
      },
      {
        title: 'Filter Rinse',
        description: 'ALWAYS rinse paper filters with hot water before adding coffee. Removes cardboard taste.',
      },
      {
        title: 'Water Quality',
        description: 'Moccamaster: Filtered tap is fine. Switch: Use Third Wave Water for fruit clarity.',
      },
      {
        title: 'Bean Storage',
        description: 'Keep in original bag, squeezed tight, in cupboard. Freeze if not finishing in 3 weeks.',
      },
    ]
  }

  /**
   * Get all recipes for a specific method
   */
  getRecipesByMethod(method: BrewMethod): CoffeeRecipe[] {
    return method === 'switch' ? this.getSwitchRecipes() : this.getMoccamasterRecipes()
  }

  /**
   * Get a recipe by method, cup size, and roast
   */
  getRecipe(method: BrewMethod, cupSize: CupSize, roast: RoastLevel): CoffeeRecipe | null {
    const recipes = this.getRecipesByMethod(method)
    return recipes.find((r) => r.cupSize === cupSize && r.roast === roast) || null
  }

  /**
   * Get available cup sizes for a method
   */
  getCupSizes(method: BrewMethod): { value: CupSize; label: string }[] {
    if (method === 'switch') {
      return [
        { value: '1-cup', label: '1 Cup (300ml)' },
        { value: '2-cup', label: '2 Cups (600ml)' },
        { value: '3-4-cup', label: '3–4 Cups (1L)' },
      ]
    }
    return [
      { value: '2-cup', label: '2 Cups (600ml)' },
      { value: '8-cup', label: '8 Cups (1L)' },
      { value: '10-cup', label: '10 Cups (1.25L)' },
    ]
  }

  /**
   * Get recommended recipe based on time of day
   */
  getRecommendedRecipe(): { method: BrewMethod; cupSize: CupSize; roast: RoastLevel } {
    const hour = new Date().getHours()
    const day = new Date().getDay()

    // Sunday brunch - big batch
    if (day === 0 && hour >= 8 && hour < 14) {
      return { method: 'switch', cupSize: '3-4-cup', roast: 'light' }
    }

    // Morning - Moccamaster batch
    if (hour >= 5 && hour < 12) {
      return { method: 'moccamaster', cupSize: '8-cup', roast: 'medium' }
    }

    // Afternoon - single cup pour-over
    if (hour >= 12 && hour < 18) {
      return { method: 'switch', cupSize: '1-cup', roast: 'medium' }
    }

    // Default
    return { method: 'moccamaster', cupSize: '8-cup', roast: 'medium' }
  }

  /**
   * Get all guide data
   */
  getGuideData(): CoffeeGuideData {
    return {
      roastStrategies: this.getRoastStrategies(),
      switchRecipes: this.getSwitchRecipes(),
      moccamasterRecipes: this.getMoccamasterRecipes(),
      switchDoses: this.getSwitchDoses(),
      moccamasterDoses: this.getMoccamasterDoses(),
    }
  }
}
