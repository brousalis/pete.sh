# Critical Swim Speed (CSS) protocol and pacing for Olympic triathlon

- **Authors:** petehome coaching note
- **Year:** 2026
- **Type:** note
- **Source:** Original synthesis for petehome (not a Maglischo verbatim extract)
- **DOI / URL:** Used by petehome analytics `computeCss` (400/200 pair)

---

## What CSS is

Critical Swim Speed is the slope between two maximal continuous efforts (classically 400 and 200 of the same unit). It estimates the highest speed that can be held without progressive fatigue accumulation — a practical swim-threshold proxy.

petehome stores CSS as speed (distance/time) and derives pace per 100 from it. Easy and race paces are expressed as multiples of CSS pace.

## How to test (pool)

1. Full warm-up, then full recovery between efforts.
2. Swim a maximal continuous **400** (yards or metres — stay consistent).
3. Rest 5–10 minutes.
4. Swim a maximal continuous **200** in the same unit.
5. Record both times. Re-test every 6–8 weeks in Block 0 only if the knee allows pool volume; do not force a CSS test over a flare.

CSS speed = (d400 − d200) / (t400 − t200).  
Pace per 100 = 100 / CSS speed.

## Pacing bands (working defaults)

Use until athlete-specific bands are tuned from race data:

| Purpose | Relative to CSS pace /100 |
| --- | --- |
| Easy / technique | ~1.10–1.15× CSS |
| CSS / threshold sets | ~1.00× CSS |
| Fast / race-prep | ~0.94–0.97× CSS |

## Why this matters for Chicago 2027

The Olympic swim (1500 m Monroe Harbor, wetsuit-likely) is the largest cheap time gain versus the current pool baseline (~2:30/100 yd toward ~1:55–2:05 wetsuit race pace). Swim volume does not load the medial knee the way run volume does, so when session choice is ambiguous, prefer the pool.

Race goal band for the swim split is roughly 31–34 minutes. Translate CSS into continuous 1500 m pace in training, then add open-water and wetsuit factors separately (see `note__ow-swim__chicago-monroe-harbor.md`).

## Coaching rules

- Progress frequency before duration before intensity in the water.
- Technique focus (catch, body position, restrained kick) protects both economy and the knee.
- Do not invent a CSS number. If no test is on file, say so and schedule the 400/200 pair.
