/**
 * Coffee Service
 * Handles coffee routine logic and detection
 * Based on coffee.md - The Chicago Studio Coffee Manual (2026 House p)
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

import type { CoffeeRoutine, CoffeeRoutineType } from "@/lib/types/coffee.types"

export class CoffeeService {
  /**
   * Get all coffee routines
   */
  getRoutines(): CoffeeRoutine[] {
    return [
      // ROUTINE A: THE MORNING BATCH (7:00 AM)
      {
        id: "morning-batch",
        type: "morning",
        name: "Morning Batch",
        description: "Smooth, sweet, large batch to start the day",
        batchSize: "1 Liter",
        ratio: "1:17",
        ratioNote: "Smooth & Sweet",
        water: 1000,
        coffee: 59,
        grinder: "ode",
        grinderSetting: "9",
        filter: "No. 4 Paper Filter",
        waterNote: "Default Machine Temp",
        steps: [
          {
            id: "water",
            order: 1,
            title: "Prepare the Water",
            description: "Place the glass carafe on your scale and press 'Tare' (Zero). Fill with cold water until the scale reads 1000g. Pour this into the machine reservoir.",
            action: "Fill reservoir with 1000g water",
          },
          {
            id: "filter",
            order: 2,
            title: "Prepare the Filter",
            description: "Take a No. 4 Paper Filter. Fold the crimped seams (bottom and side) firmly to create a crease. Place in the basket and rinse with hot water. Dump the rinse water out of the carafe.",
            action: "Rinse filter and dump water",
            tips: ["Paper filters taste like cardboard - ALWAYS rinse before brewing"],
          },
          {
            id: "machine-setup",
            order: 3,
            title: "Machine Setup",
            description: "Set the basket switch to the Open Circle (Full Jug). Push the carafe firmly against the button at the base.",
            action: "Set to Full Jug mode",
          },
          {
            id: "grind",
            order: 4,
            title: "Grind (Ode Setting 9)",
            description: "Weigh 59g of beans. Spray with one spritz of water (RDT). Shake the cup to coat them. Grind on Ode Setting 9. Pour into the basket and shake to level.",
            action: "Grind 59g at setting 9",
            tips: ["RDT (spray) is MANDATORY - prevents static and mess"],
          },
          {
            id: "brew-start",
            order: 5,
            title: "The Brew",
            description: "Turn the machine ON. Watch the water fill the basket.",
            action: "Turn on Moccamaster",
            timing: {
              start: 0,
            },
          },
          {
            id: "stir",
            order: 6,
            title: "The Barista Stir",
            description: "At the 0:45 mark, use a spoon to gently stir the wet grounds (3 circles) to break up any dry crust.",
            action: "Stir gently (3 circles)",
            timing: {
              start: 45,
              alert: true,
            },
          },
          {
            id: "finish",
            order: 7,
            title: "Finish",
            description: "When the machine stops gurgling, remove the carafe, swirl it to mix the layers, and serve.",
            action: "Swirl and serve",
            tips: ["Pro Tip: For max 10 cups (1.25L), use 73.5g coffee and coarsen to Setting 10"],
          },
        ],
        tips: [
          "Filtered tap water is fine for morning batch",
          "RDT spray is MANDATORY before grinding",
        ],
        beanRecommendation: {
          source: "Metric Coffee",
          location: "West Fulton Market",
          type: "Single Origin Washed Process",
          origins: ["Peru", "Colombia", "Honduras"],
          flavor: "Clean, chocolate, citrus, structured",
        },
      },
      // ROUTINE B: THE AFTERNOON CUP (2:00 PM) - "Sweet Hybrid" Method
      {
        id: "afternoon-cup",
        type: "afternoon",
        name: "Afternoon Cup",
        description: "Solo, high-clarity coffee emphasizing fruit and sweetness",
        batchSize: "300 ml",
        ratio: "1:16",
        ratioNote: "High Clarity",
        water: 300,
        coffee: 18.8,
        grinder: "s3",
        grinderSetting: "7.5",
        filter: "Cafec Abaca",
        waterTemp: 200,
        waterNote: "Cooler = Sweeter",
        totalTime: 150, // 2:30 target
        steps: [
          {
            id: "heat-prep",
            order: 1,
            title: "Heat & Prep",
            description: "Set Kettle to 200°F. Place Hario Switch on the server. Insert Cafec Abaca filter. Rinse and dump the water.",
            action: "Rinse filter and dump water",
            tips: ["IMPORTANT: Flip the Switch Lever DOWN (OPEN)"],
          },
          {
            id: "grind",
            order: 2,
            title: "Grind (Timemore S3 Setting 7.5)",
            description: "Weigh 18.8g of beans. Spray with one spritz of water (RDT). Grind on S3 Setting 7.5.",
            action: "Grind 18.8g at setting 7.5",
            tips: ["Hold the grinder at a 45-degree angle while grinding for more consistent particle size"],
          },
          {
            id: "phase-1",
            order: 3,
            title: "Phase 1: The Flush (0:00 - 0:45)",
            description: "Place everything on the scale and Tare. Start Timer. Pour 60g of water vigorously and fast. Let it drain completely.",
            action: "Pour 60g fast, let drain",
            timing: {
              start: 0,
            },
            tips: ["WHY: This washes away the sour fines and dust"],
          },
          {
            id: "phase-2",
            order: 4,
            title: "Phase 2: The Sugar Bath (0:45 - 2:30)",
            description: "Flip the Switch Lever UP (CLOSED). Pour remaining water until scale reads 300g total. Give the brewer one gentle swirl (3 seconds). DO NOT STIR. Let it steep undisturbed.",
            action: "Close lever, pour to 300g, swirl once",
            timing: {
              start: 45,
              alert: true,
            },
            tips: ["DO NOT STIR - just one gentle swirl"],
          },
          {
            id: "release",
            order: 5,
            title: "The Release (2:30)",
            description: "At 2:30, flip the Lever DOWN (OPEN). Let it drain.",
            action: "Flip lever DOWN (open)",
            timing: {
              start: 150,
              alert: true,
            },
          },
          {
            id: "finish",
            order: 6,
            title: "Finish",
            description: "Let it drain completely. Swirl and enjoy.",
            action: "Swirl and enjoy",
          },
        ],
        tips: [
          "ALWAYS use distilled water with Third Wave Water mineral packets",
          "Third Wave Water unlocks 'High Definition' fruit flavors",
        ],
        beanRecommendation: {
          source: "Dark Matter or Dayglow",
          type: "Natural or Anaerobic Process",
          origins: ["Ethiopia", "Costa Rica"],
          flavor: "Berry jam, wine, tropical fruit, funk",
        },
      },
      // ROUTINE C: THE SUNDAY THEATER (BRUNCH)
      {
        id: "sunday-theater",
        type: "sunday",
        name: "Sunday Theater",
        description: "Manual brewing a large 1L batch for guests",
        batchSize: "1 Liter",
        ratio: "1:16",
        ratioNote: "Rich Body",
        water: 1000,
        coffee: 62.5,
        grinder: "ode",
        grinderSetting: "10",
        filter: "Size 03 Filter",
        waterTemp: 212,
        waterNote: "Boiling",
        totalTime: 300, // ~4-5 mins
        steps: [
          {
            id: "heat-prep",
            order: 1,
            title: "Heat & Prep",
            description: "Set Kettle to 212°F (Boiling). Rinse the Size 03 Filter heavily with hot water to pre-heat the glass server. Dump the water.",
            action: "Rinse filter and pre-heat server",
            tips: ["IMPORTANT: Lock the Switch Lever DOWN (OPEN)"],
          },
          {
            id: "grind",
            order: 2,
            title: "Grind (Ode Setting 10)",
            description: "Weigh 62.5g of beans. Spray with one spritz of water (RDT). Grind on Ode Setting 10 (Texture: Kosher Salt).",
            action: "Grind 62.5g at setting 10",
            tips: ["WHY: We grind coarse so the deep bed of coffee doesn't clog"],
          },
          {
            id: "bloom",
            order: 3,
            title: "The Bloom (0:00)",
            description: "Start Timer. Pour 180g water. Use a spoon to dig to the bottom of the cone to ensure all grounds are wet.",
            action: "Pour 180g, stir to bottom",
            timing: {
              start: 0,
            },
          },
          {
            id: "pour-1",
            order: 4,
            title: "First Pulse Pour (0:45)",
            description: "At 0:45: Pour slow circles until scale reads 500g.",
            action: "Pour to 500g",
            timing: {
              start: 45,
              alert: true,
            },
          },
          {
            id: "pour-2",
            order: 5,
            title: "Second Pulse Pour (1:45)",
            description: "At 1:45: Pour slow circles until scale reads 800g.",
            action: "Pour to 800g",
            timing: {
              start: 105,
              alert: true,
            },
          },
          {
            id: "pour-3",
            order: 6,
            title: "Final Pulse Pour (2:30)",
            description: "At 2:30: Pour slow circles until scale reads 1000g.",
            action: "Pour to 1000g",
            timing: {
              start: 150,
              alert: true,
            },
          },
          {
            id: "finish",
            order: 7,
            title: "Finish",
            description: "Allow it to drain (approx 4-5 mins total). Swirl and serve.",
            action: "Swirl and serve",
          },
        ],
        tips: [
          "Use distilled water with Third Wave Water mineral packets",
          "Coarse grind prevents the deep bed from clogging",
        ],
        beanRecommendation: {
          source: "Metric Coffee",
          location: "West Fulton Market",
          type: "Single Origin Washed Process",
          origins: ["Peru", "Colombia", "Honduras"],
          flavor: "Clean, chocolate, citrus, structured",
        },
      },
    ]
  }

  /**
   * Get recommended routine based on current time and day
   */
  getRecommendedRoutine(): CoffeeRoutineType | null {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay() // 0 = Sunday, 6 = Saturday

    // Sunday Brunch
    if (day === 0) {
      return "sunday"
    }

    // Morning routine (7:00 AM)
    if (hour >= 5 && hour < 12) {
      return "morning"
    }

    // Afternoon routine (2:00 PM)
    if (hour >= 12 && hour < 18) {
      return "afternoon"
    }

    return null
  }

  /**
   * Get routine by type
   */
  getRoutineByType(type: CoffeeRoutineType): CoffeeRoutine | null {
    return this.getRoutines().find((r) => r.type === type) || null
  }

  /**
   * Get routine by ID
   */
  getRoutineById(id: string): CoffeeRoutine | null {
    return this.getRoutines().find((r) => r.id === id) || null
  }
}
