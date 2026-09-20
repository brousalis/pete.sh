---
name: weekly-review
description: Review the training week and plan the next one. Use when asked to review the week, plan next week, or check whether training is on track for the Chicago triathlon.
---

# Weekly training review

Run this on Sunday, or whenever the plan needs revisiting.

## Gather

Use the PeteCoach MCP tools in this order. Do not skip to conclusions from
memory; the numbers move week to week.

1. `get_readiness` — today's state and its component breakdown.
2. `get_training_load` with 90 days — CTL, ATL, TSB, ACWR, monotony.
3. `query_activities` for the last 14 days — what actually happened.
4. `get_injury_status` — symptom history and any clearance conditions.
5. `get_plan` for the last week and the coming one.
6. `project_race` — where the sub-3 goal stands and which split is limiting.

## Assess

Answer these in order, with numbers:

- **Did the week happen as planned?** Compare completed sessions against the
  plan. Note what was missed and why, not just that it was missed.
- **What does the load say?** Is ACWR inside 0.8–1.3? Is CTL moving in the
  intended direction for this block's phase? Is monotony under 2.0?
- **What does the knee say?** Any symptom above 2/10, any upward trend, any
  session followed by next-morning pain. This outranks everything below it.
- **What improved?** Point at a measurement, not a feeling: swim pace per 100,
  decoupling on a long session, quad symmetry, resting heart rate.
- **What is the limiter?** From the race projection, which split is furthest
  over budget and what would close it.

## Decide

Propose next week through `propose_plan_change`. Before you do, check it
against the progression rules yourself:

- Weekly running volume increase at or under 10%.
- Long run increase at or under one mile.
- At least 48 hours between runs if still inside the first six weeks back.
- No run intensity unless quad symmetry has passed.
- One full rest day.
- No back-to-back hard days.
- Cycling cadence floor at 85 rpm while the injury is still managed.
- Both PT blocks present every day.

If the Injury Guard rejects the proposal, read the violation, fix its cause,
and resubmit. Do not restructure the week to route around a rule.

## Report

Lead with the decision for the coming week and the reason. Then the evidence.
Keep it under 400 words — this is read on a Sunday evening, not studied.
