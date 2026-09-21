# VDOT training paces (Daniels-aligned synthesis)

- **Authors:** petehome coaching note
- **Year:** 2026
- **Type:** note
- **Source:** Original synthesis aligned to petehome analytics (Daniels & Gilbert VDOT equations in coach-core). Cite Jack Daniels, Daniels' Running Formula — this file is not a verbatim book extract.
- **DOI / URL:** petehome `computeVdot` / race projection

---

## What VDOT is for petehome

VDOT is a single fitness index derived from a recent race or time-trial performance. petehome uses it to set training paces and to project the run leg of the Olympic race. The model does **not** invent a VDOT; it requires a measured performance.

## Establishing VDOT

Prefer a recent all-out effort the athlete can complete without knee flare:

- 5K road or track time trial (common)
- 10K if aerobic enough and symptoms allow
- Avoid max testing during an active medial flare; use bike/swim quality instead until cleared

Enter the result through `/coach/tests` or the benchmarks path so analytics — not the LLM — compute VDOT and paces.

## How paces are used

Once VDOT exists, petehome can expose Easy / Marathon / Threshold / Interval / Repetition style bands for planning. Coaching rules:

- Easy means easy. If conversational pace is impossible, the run is too hard or the athlete is under-recovered.
- Quality sessions are rare while returning from injury; protect the hard days by keeping everything else truly easy.
- If VDOT is missing, say so and schedule a test in week 3+ of Block 0 when the knee allows — do not guess paces.

## Knee overlay

Medial cartilage / pes anserine irritability overrides pace ambition. Prefer:

- Soft surfaces, shorter contacts, controlled cadence
- Substituting bike Z2 or swim for run volume when pain trends up
- Never chasing a VDOT PR that costs a week of training

## Race projection link

Sub-3 run budget is roughly **57–60 minutes** for 10 km. VDOT informs whether that budget is currently realistic and which discipline should absorb training time. Swim remains the largest cheap gain and the lowest knee cost.
