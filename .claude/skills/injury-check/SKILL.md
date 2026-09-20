---
name: injury-check
description: Analyse a knee symptom or pain pattern against training history. Use when the knee flares, pain is reported, or a symptom trend needs interpreting before changing the plan.
---

# Injury check

The athlete is returning from a bilateral medial knee injury: cartilage wear
on the medial patella, a small medial plica, hamstring tendon inflammation and
a Baker's cyst. The physical therapist identified the pes anserine as the
primary pain generator. Another layoff ends the season.

This skill produces a coaching opinion. It does not replace the PT or the
sports MD, and the report must say so.

## Stop first

If any of these are present, the analysis stops and the answer is "contact
your clinician before the next session":

- Swelling, locking, or the knee giving way. These are mechanical signs, not
  soreness.
- Pain at or above 6/10.
- Pain that is worse the morning after than it was during the session, three
  or more times in a fortnight.
- Any new symptom the MRI did not account for.

## Gather

1. `get_injury_status` — findings, contraindications, clearance conditions and
   the full recent symptom log.
2. `query_activities` for the 21 days before onset — this is where the cause
   usually is.
3. `get_training_load` — was there a ramp? Check ACWR in the two weeks prior.
4. `get_benchmarks` with `quad_symmetry` — quad strength is the MRI's stated
   remedy for the cartilage wear.
5. `search_knowledge` for the structure involved before making any mechanistic
   claim, and cite what you find.

## Analyse

Work through mechanism, not just correlation:

- **What loaded the structure?** Pes anserine pain points at the medial
  hamstring and adductor insertion: low-cadence cycling, sudden mileage,
  downhill running, or a change in saddle height or cleat position.
- **What changed in the two weeks before?** Volume, intensity, surface,
  footwear, bike position, or a gap followed by a return at the previous load.
- **Does the load data support it?** An ACWR above 1.3 in the prior fortnight
  is a strong candidate. So is a long-run or long-ride jump beyond the limits.
- **Is quad strength adequate?** If symmetry has not been tested or has not
  passed, that is a standing contributor rather than a one-off cause.

The original injury came from a 40-mile ride the week after a 7-mile PR run.
Check for that shape specifically: a hard effort in one discipline followed by
a long effort in another.

## Report

- What you think happened and why, with the specific sessions named.
- What to change now, concretely, for the next seven days.
- What would confirm or rule out your explanation.
- What warrants clinical review, stated plainly.
- An explicit note that this is a coaching opinion and the PT or MD decides.
