---
name: race-projection
description: Assess where the sub-3 goal stands and where to spend training time. Use when asked about race pace, goal feasibility, or which discipline to prioritise.
---

# Race projection

Target: Supertri Chicago, Olympic distance, 22 August 2027, under 3:00:00.

Course: 1500 m in Monroe Harbor (wetsuit likely, 65–74°F), 40 km on closed
roads via DuSable Lake Shore Drive, Lower Wacker and the McCormick busway
(flat, technical, no drafting), 10 km flat on the lakefront path.

## Gather

1. `project_race` — current projection, per-split budget, and the leverage
   table weighing seconds available against knee risk.
2. `get_benchmarks` — CSS, FTP, run time trials. These drive the projection,
   so note which are stale or missing.
3. `get_training_load` — is fitness actually trending up?
4. `get_injury_status` — what constrains the run build.

## The split budget

The plan works backwards from 2:57:00, leaving three minutes of slack:

| Leg   | Budget | Requires                                  |
|-------|--------|-------------------------------------------|
| Swim  | 33:00  | ~2:03/100 yd race pace with a wetsuit     |
| T1    | 7:00   | Long barefoot run to DuSable Harbor       |
| Bike  | 1:18:00| ~19.1 mph sustained                       |
| T2    | 2:30   |                                           |
| Run   | 58:30  | ~9:25/mi off the bike                     |

## How to reason about where to spend time

Seconds available is only half the answer. The other half is what those
seconds cost the knee. Rank by return per unit of risk:

- **Swim** — largest gap at baseline pace, zero impact load. Technique work
  costs nothing physically and the ceiling is high. This is almost always the
  right answer.
- **T1** — rehearsal alone typically saves one to two minutes and carries no
  training cost at all. Free time that athletes routinely ignore.
- **Bike** — real gains available, but low-cadence torque is the mechanism
  that aggravated this knee. Progress through cadence and duration, not force.
- **Run** — constrained by the return-to-run progression. Gains must come from
  consistency, not from volume increases the rules do not allow.

If the honest answer is that the goal is at risk, say so and say what would
change it. Moving the projection is acceptable; moving the rehab is not.

## Report

- Current projection against the goal, with the confidence range.
- The limiting split and by how much.
- Where the next block's time should go and why, in seconds.
- Which benchmark is stale and should be retested.
