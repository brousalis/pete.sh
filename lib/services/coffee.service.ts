/**
 * Coffee Service
 * Handles coffee routine logic and detection
 * Based on coffee.md - comprehensive coffee routine system
 */

import type { CoffeeRoutine, CoffeeRoutineType } from "@/lib/types/coffee.types"

export class CoffeeService {
  /**
   * Get all coffee routines
   */
  getRoutines(): CoffeeRoutine[] {
    return [
      {
        id: "morning-household",
        type: "morning",
        name: "7:00 AM Household Split",
        description: "Fast, high-volume, consistently excellent",
        batchSize: "1 Liter",
        water: 1000,
        coffee: 62.5,
        grinder: "ode",
        grinderSetting: "8",
        filter: "Moccamaster/Filpa No. 4",
        steps: [
          {
            id: "water",
            order: 1,
            title: "Measure Water",
            description: "Place carafe on scale. Tare. Fill to 1000g. Pour into reservoir.",
            action: "Fill reservoir with 1000g water",
          },
          {
            id: "filter",
            order: 2,
            title: "Prepare Filter",
            description: "Fold No. 4 filter edges. Place in basket. Rinse with hot water. Dump water from carafe.",
            action: "Rinse filter and dump water",
          },
          {
            id: "machine-setup",
            order: 3,
            title: "Machine Setup",
            description: "Set switch to Full Jug (Open Circle). Ensure carafe is fully pressed in.",
            action: "Configure machine settings",
          },
          {
            id: "grind",
            order: 4,
            title: "Grind Coffee",
            description: "Weigh 62.5g. Grind in Ode (Setting 8). Load basket. Shake to level.",
            action: "Grind 62.5g at setting 8",
            tips: ["Spray beans with one spritz of water before grinding (RDT)"],
          },
          {
            id: "brew-start",
            order: 5,
            title: "Start Brew",
            description: "Turn on machine. Watch basket fill.",
            action: "Turn on Moccamaster",
            timing: {
              start: 0,
            },
          },
          {
            id: "stir",
            order: 6,
            title: "The Barista Stir",
            description: "At 0:45, grounds should be fully submerged. Stir slurry gently with spoon (3 circles) to break up dry clumps.",
            action: "Stir gently (3 circles)",
            timing: {
              start: 45,
              alert: true,
            },
          },
          {
            id: "finish",
            order: 7,
            title: "Finish & Serve",
            description: "When machine gurgles, remove carafe, swirl, and serve.",
            action: "Swirl and serve",
          },
        ],
        tips: [
          "Optional: Use Third Wave Water to prevent limescale buildup",
          "Spray beans with water before grinding to reduce static (RDT)",
        ],
      },
      {
        id: "afternoon-god-switch",
        type: "afternoon",
        name: "2:00 PM God Switch",
        description: "The dedicated solo ritual. Uses the S3.",
        batchSize: "300 ml",
        water: 300,
        coffee: 18.8,
        grinder: "s3",
        grinderSetting: "6.0",
        filter: "Cafec Abaca (Yellow Bag)",
        waterTemp: 205,
        totalTime: 210, // 3:30 target
        steps: [
          {
            id: "setup",
            order: 1,
            title: "Setup Switch",
            description: "Place Switch on Hario Server. Insert Cafec Abaca filter. Rinse & dump.",
            action: "Rinse filter and dump water",
            tips: ["Rinse with hot water for 10s to pre-heat"],
          },
          {
            id: "mode",
            order: 2,
            title: "Set Mode",
            description: "Flip Switch Lever UP (CLOSED) for immersion mode.",
            action: "Flip lever UP (closed)",
          },
          {
            id: "grind",
            order: 3,
            title: "Grind Coffee",
            description: "Weigh 18.8g. Set Timemore S3 external dial to 6.0. Grind beans (~30 seconds).",
            action: "Grind 18.8g at setting 6.0",
          },
          {
            id: "pour",
            order: 4,
            title: "Pour Water",
            description: "Start timer. Pour 300g of 205°F water. Pour fast to create turbulence.",
            action: "Pour 300g at 205°F",
            timing: {
              start: 0,
            },
            tips: ["ALWAYS use Third Wave Water for afternoon cup"],
          },
          {
            id: "stir-crust",
            order: 5,
            title: "Stir Crust",
            description: "At 2:00, gently stir the crust.",
            action: "Gently stir crust",
            timing: {
              start: 120,
              alert: true,
            },
          },
          {
            id: "flip-switch",
            order: 6,
            title: "Open Switch",
            description: "At 2:15, flip Switch Lever DOWN (OPEN) to drain.",
            action: "Flip lever DOWN (open)",
            timing: {
              start: 135,
              alert: true,
            },
          },
          {
            id: "finish",
            order: 7,
            title: "Finish",
            description: "Let it drain. Target time: 3:00-3:30 total. Swirl and drink.",
            action: "Swirl and serve",
            timing: {
              start: 180,
              duration: 30,
            },
          },
        ],
        tips: [
          "ALWAYS use Third Wave Water for the afternoon cup",
          "Ensure S3 dial '0' means burrs are touching (closed)",
        ],
      },
      {
        id: "sunday-brunch",
        type: "sunday",
        name: "Sunday Brunch",
        description: "The theater of pour-over for a crowd.",
        batchSize: "1 Liter",
        water: 1000,
        coffee: 62.5,
        grinder: "ode",
        grinderSetting: "9",
        filter: "Hario Size 03 (White/Bleached)",
        waterTemp: 212,
        totalTime: 180, // ~3:00
        steps: [
          {
            id: "setup",
            order: 1,
            title: "Setup",
            description: "Place Switch on Server. Insert Hario Size 03 Filter. Rinse thoroughly to heat heavy glass. Dump water.",
            action: "Rinse filter and pre-heat",
            tips: ["Rinse for 10s to pre-heat the heavy glass"],
          },
          {
            id: "mode",
            order: 2,
            title: "Set Mode",
            description: "Lock Switch Lever DOWN (OPEN) for pour-over mode.",
            action: "Lock lever DOWN (open)",
          },
          {
            id: "grind",
            order: 3,
            title: "Grind Coffee",
            description: "Weigh 62.5g. Grind in Ode (Setting 9 - coarser to prevent stalling).",
            action: "Grind 62.5g at setting 9",
          },
          {
            id: "bloom",
            order: 4,
            title: "The Bloom",
            description: "Pour 180g boiling water (212°F). Stir vigorously, digging deep to hit bottom. Wait until 0:45.",
            action: "Pour 180g and stir vigorously",
            timing: {
              start: 0,
            },
          },
          {
            id: "pour-1",
            order: 5,
            title: "First Pulse Pour",
            description: "At 0:45, pour circles until scale reads 500g.",
            action: "Pour to 500g",
            timing: {
              start: 45,
              alert: true,
            },
          },
          {
            id: "pour-2",
            order: 6,
            title: "Second Pulse Pour",
            description: "At 1:45, pour gently until scale reads 800g.",
            action: "Pour to 800g",
            timing: {
              start: 105,
              alert: true,
            },
          },
          {
            id: "pour-3",
            order: 7,
            title: "Final Pulse Pour",
            description: "At 2:30, pour gently until scale reads 1000g.",
            action: "Pour to 1000g",
            timing: {
              start: 150,
              alert: true,
            },
          },
          {
            id: "finish",
            order: 8,
            title: "Finish",
            description: "Give brewer a gentle 'Raft' swirl. Serve.",
            action: "Swirl and serve",
          },
        ],
        tips: [
          "Use coarser grind (9) to prevent large batch from stalling",
          "Perfect for crowd-pleasing without being boring",
        ],
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
