# petehome coaching

End-to-end brief for how petehome coaching was planned and how it actually works. Read this before
changing coaching behaviour.

petehome is not a chatbot bolted onto fitness. It is a periodized plan with a deterministic injury
layer, computed analytics, and a Claude coach that is only allowed to interpret those numbers and
propose structured changes.

---

## Athlete, race, and standing policy

One athlete: Pete, 37, Chicago 60657, 6'0", ~173–175 lb, ~10–11% BF. Knee health outranks the time
goal.

- **Race:** Supertri Chicago Olympic, Sunday 22 August 2027, 06:00. 1500 m Monroe Harbor
  (wetsuit-likely), 40 km DuSable / Lower Wacker / busway, 10 km lakefront. ~48 weeks from the plan
  date.
- **Goal:** sub-3:00. Split budget: swim 31–34 min, T1 6–8 min (long barefoot run), bike 1:15–1:19,
  T2 2–3 min, run 57–60 min. Live projection re-budgets; the swim is the largest cheapest gain
  (~2:30/100 yd pool today vs ~1:55–2:05 wetsuit).
- **Injury:** MRI — no stress fracture, no meniscus tear. Bilateral medial patellar cartilage wear,
  small plica, hamstring inflammation, Baker's cyst. PT: pes anserine + Baker's cyst. Cleared for
  graded return. PT blocks **Morning Activation** and **Evening Armor** are mandatory.
- **Devices:** Apple Watch S12 only. Garmin retired except a one-time historical export. Coospo
  sensors pair to the watch. petehome iOS is the HealthKit pipe. Strava API is not used (2026 AI
  ban).
- **Nutrition default:** periodized maintenance. Previous cut / fast-to-2pm / zero-carb-Sunday
  protocol is retired as a coaching default. Weight band 170–175 is a constraint, not a deficit
  target.

**Priority order — never invert:**

1. Knee health
2. Consistency (48 weeks uninterrupted)
3. Sub-3

Science the coach is supposed to hold: polarized/pyramidal (Seiler), ACWR (Gabbett), Daniels VDOT,
CSS, Friel/Dixon periodization, Rønnestad & Mujika strength-for-endurance, JOSPT patellofemoral CPG,
Cook & Purdam tendon loading, IOC 2023 RED-S.

---

## Locked product decisions

- Built **into petehome** (`C:\dev\petehome`), not a new repo. `apps/web` is **petehome only** —
  personal, local, not published. The old smart-home dashboard (assistant, AI Coach, AI Chef,
  fitness UI, maple, coffee, blog, homework, etc.) is gone. `/` redirects to `/coach`. There are
  **no** legacy-page redirects. Orphan Supabase tables from the old dashboard remain; no drop
  migration yet.
- **Runtime split:** chat and HTTP run in local `apps/web` (Next.js on the home PC). Long and
  scheduled work runs in `apps/coach-worker` under PM2, queued with pg-boss on Supabase Postgres.
  Vercel is **not** part of the coaching stack anymore.
- Shared logic lives in `packages/coach-core` (no Next.js deps). Web and worker must always agree.
- Vercel AI SDK 6 + `@ai-sdk/anthropic` (SDK name only — hosting is local). Models pinned: Opus 5 /
  Sonnet 5 / Haiku 4.5. Anthropic prompt caching via `providerOptions`.
- Autonomy: same-day **downgrades auto-apply**. Everything else waits for approval in `/coach/plan`.
- Auth: signed cookie (`COACH_SESSION_SECRET` + `COACH_ACCESS_CODE`), not the originally sketched
  WebAuthn. Watch/worker/MCP use `COACH_API_KEY`. Installed petehome still uses `PETEWATCH_API_KEY`
  for ingest — **do not rotate that key**.

---

## Architecture

```
petehome Watch
        │ HealthKit
        ▼
petehome iOS ──POST /api/apple-health/{sync,workout,daily}──►  apps/web (local :3000)
        │         (installed build may still target pete.sh → same Supabase)
        │ WorkoutKit / APNs (source exists; not shipped)
        ▼
   Apple Watch
                                                              packages/coach-core
                                                                    ▲
Supabase                                                            │
  apple_health_*  ──NOTIFY coach_activity──►  apps/coach-worker (PM2 :3021)
  coach_*  (plan, injury, memory, knowledge, agent_run)
  pgboss schema

Local PWA: /coach  +  /api/coach/*
```

Deterministic layer (analytics + Injury Guard) computes. The LLM interprets and proposes. The LLM
never does arithmetic on raw HR/GPS streams.

---

## Repository map

| Path                                   | Role                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `packages/coach-core`                  | Identity, context assembly, tools, guardrails, plan schemas, analytics, cost, memory ranking, evals |
| `apps/web/lib/services/coach/`         | DB adapters, runtime, plan apply, conversation, knowledge, notify, ingest                           |
| `apps/web/app/api/coach/`              | HTTP: chat, today, plan, check-in, MCP, calendar, watch, spend, …                                   |
| `apps/web/app/(dashboard)/coach/`      | PWA: Today, Plan, Chat, Analytics, Body, Gear, Settings, onboard, tests                             |
| `apps/web/components/coach/`           | Nav, session cards, check-in, chat notebook                                                         |
| `apps/coach-worker`                    | PM2 process: cron, LISTEN, `/healthz`                                                               |
| `apps/web/supabase/migrations/037–041` | Schema, views, NOTIFY, PT seed, cleanup fixes                                                       |
| `apps/ios`                             | petehome + watch. New observer/WorkoutKit/APNs code is **unshipped**                                |
| `.claude/skills`                       | `/weekly-review`, `/injury-check`, `/race-projection`                                               |

---

## Data model

Prefix `coach_`. RLS: service role only, anon denied. Raw HealthKit stays in `apple_health_*`. Coach
reads through normalising views (`coach_activity_v`, daily metric views).

**Athlete and body**

- `coach_athlete_profile` — identity, thresholds, weight band, goal
- `coach_constraint` — schedule, pool, surfaces, travel, fueling stance
- `coach_injury` + `coach_injury_event`
- `coach_symptom_log` — site, pain 0–10, context, swelling/locking/instability
- `coach_medication_log`
- `coach_pt_exercise` / `coach_pt_protocol` / `coach_pt_protocol_item` / `coach_pt_completion`

**Plan (single source of truth)**

- `coach_macrocycle` → `coach_block` → `coach_week` → `coach_planned_session`
- Session: sport, type, WorkoutKit-shaped `steps` JSON, targets, rationale, `guardrail_report`,
  status, watch sync, link to `apple_health_workouts.id`
- `coach_audible`, `coach_session_feedback`, `coach_benchmark_test`, `coach_plan_history`

**Computed**

- `coach_activity_load` — TSS + method per activity
- `coach_daily_readiness` — readiness v2 snapshot

**Gear / nutrition / knowledge**

- `coach_nutrition_day`, `coach_gear_item` / `_usage` / `_service` / `_recommendation`
- `coach_document`, `coach_chunk` (pgvector), `coach_pubmed_cache`

**Memory and cost**

- `coach_conversation`, `coach_message` (full UIMessage JSONB — never auto-deleted)
- `coach_memory` (fact / preference / episode / insight + embedding)
- `coach_journal`
- `coach_agent_run`, `coach_cost_budget`, `coach_push_subscription`

**Retention (migration 038):** run/bike/swim/strength samples are kept. Coach chats are excluded
from cleanup. The old 90-day sample wipe and 30-day chat wipe would have destroyed a year-long
coach.

---

## Ingestion

1. Watch records in Apple's Workout app (Outdoor Run, Indoor/Outdoor Bike with Coospo, Pool Swim 25
   yd, Functional Strength, worn overnight).
2. petehome iOS POSTs `/api/apple-health/{sync,workout,daily}` with `PETEWATCH_API_KEY`. The
   **installed** phone still defaults to `https://www.pete.sh` (old deploy → same Supabase). Local
   `apps/web` still owns those routes for LAN / future retargeting. Do not rotate the key.
3. Rows land in `apple_health_workouts` / samples / `apple_health_daily_metrics`.
4. Migration 038 `NOTIFY coach_activity` on insert. The worker LISTENs, waits ~2 minutes for late
   samples, then queues a singleton debrief.
5. Nightly job recomputes TSS / PMC / readiness / gear mileage.

A rebuild of current iOS source is **not** required for daily coaching and can break ingest
(Keychain / dual-key issues). See next-steps.

Fallback: FIT/GPX/TCX via `/api/coach/import`. Backfill: `yarn coach:backfill apple|files|plans`.

---

## Coach logic

This is the part later conversations must not reinvent.

### Identity (`packages/coach-core/src/prompts/identity.ts`)

`COACH_IDENTITY` is the **stable cached prefix** of every prompt. Nothing athlete-specific or
time-varying belongs here — a changing value busts the Anthropic cache and is the most expensive
mistake in the system.

The identity states:

- Elite triathlon coach, 20 years, literature-literate, subordinate to PT/MD.
- Priority order above. If Pete pushes past the plan, say no and explain the mechanism.
- Polarized ~80% easy. Progress **frequency → duration → intensity**, one variable at a time.
- Manage ACWR, not weekly volume vanity. Strength is not optional (MRI: quads). Swim wins ties.
  Transitions are free time.
- Voice: direct, cite given numbers, no hype. Never invent a metric. Clinical notes go to PT/MD.
- **Must not:** compute TSS/zones/ACWR/readiness (use provided numbers); schedule around a
  guardrail; remove PT; prescribe a calorie deficit.

`COACH_TOOL_POLICY` is appended for jobs that have tools: look things up, calendar changes **only**
via `propose_plan_change`, `remember` durable facts only, cite `search_knowledge`.

`JOB_INSTRUCTIONS` are short addenda: briefing (<200 words, phone-before-session), debrief (compare
to plan), weekly_plan (submit through the tool), block_review, injury_review, race_projection.

### A single chat turn

`POST /api/coach/chat` (`apps/web/app/api/coach/chat/route.ts`):

1. Auth cookie. Body: `messages`, optional `conversationId`, `deepMode`.
2. `getOrCreateConversation` — client may supply a UUID; server honors it so leaving the page no
   longer starts a new thread.
3. Persist `deep_mode` on the conversation if it changed.
4. `CostGovernor.resolvePlan('chat', { deepMode })` → model, cache TTL, step limit, context token
   budget. If capped, return 429 (chat pauses; scheduled briefings still template).
5. `buildCoachContext({ focus, budgetTokens, conversationSummary })` — parallel reads, then
   `assembleContext`.
6. `streamText` with:
   - cached system prefix + volatile context + last ~verbatim messages (older turns live in the
     rolling summary)
   - tools from `buildCoachTools()`
   - `stopWhen: stepCountIs(plan.maxSteps)` (chat default 12)
7. Stream metadata includes `conversationId`, model, budget, dropped context sections.
8. After the stream: `saveMessages` → `maybeSummarise` → `digestConversation`. None of that blocks
   the reply.

The UI (`components/coach/chat/`) is a **session notebook**: sidebar of threads, client-owned
conversation id in `?c=` + localStorage, resume last thread, Deep toggle, “Looked at …” for tools.

### Context assembly (`prompts/assemble.ts` + `runtime.service.ts`)

Replaces the old `assembleContext()` dump of 15–35k uncached tokens every turn.

**Cached prefix (identical every call):** identity + Injury Guard hard-constraint summary + tool
policy. Anthropic `cacheControl` TTL is `5m` for chat, `1h` for clustered jobs
(briefing/debrief/weekly).

**Volatile block, trimmed to a token budget** (12k normal, 5k degraded). Sections in drop-last-first
order:

1. Injury + 14-day symptoms (never drop first)
2. Athlete card (physiology, weight band, goal countdown)
3. Today: readiness, sessions, PT done/not
4. Load: CTL/ATL/TSB, ACWR, monotony, 7-day TSS by sport
5. Current block + next ~14 sessions (ids included so the model can propose against them)
6. Recent training (computed 14-day summaries, not raw streams)
7. Conversation rolling summary
8. Environment (NWS + Open-Meteo wind/AQI + NOAA lake)
9. Body/sleep 14-day trend
10. Race projection vs budget
11. Recalled memories
12. Knowledge snippets — first to drop; the model can `search_knowledge`

`fitToBudget` drops from the bottom. Dropped titles are recorded on the run.

### Tools (`packages/coach-core/src/tools` + `apps/web/.../tools.service.ts`)

Tools return **compact summaries**, never raw sample series. Write tools are omitted for MCP and
evals (`readOnly: true`).

**Read**

| Tool                    | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `get_athlete_profile`   | Physiology, thresholds, goal                    |
| `get_injury_status`     | Findings, contraindications, recent symptoms    |
| `query_activities`      | Date-range summaries with load/zones/decoupling |
| `get_activity_detail`   | One session: splits, drift, swim lengths        |
| `get_daily_metrics`     | HRV, RHR, sleep, resp, wrist temp, weight       |
| `get_training_load`     | CTL/ATL/TSB, ACWR, monotony, weekly by sport    |
| `get_readiness`         | Score, components, flags, recommended action    |
| `get_plan`              | Sessions in a range + guardrail status          |
| `recall`                | Semantic + keyword memory                       |
| `search_knowledge`      | Local library with citations                    |
| `search_pubmed`         | Live E-utilities                                |
| `get_weather`           | Chicago forecast, wind, AQI, daylight           |
| `get_lake_conditions`   | Nearshore temp, wetsuit legality                |
| `get_calendar`          | Schedule conflicts                              |
| `project_race`          | Sub-3 vs current CSS/VDOT/bike                  |
| `compute_zones`         | HR / pace / power from thresholds               |
| `get_benchmarks`        | CSS, FTP, run TT, quad symmetry                 |
| `get_gear`              | Inventory + mileage                             |
| `get_nutrition_targets` | Periodized day + logged                         |
| `get_pt_protocol`       | Activation / armor + today's completion         |

**Write (blocked unless the Injury Guard accepts)**

| Tool                  | Purpose                                       |
| --------------------- | --------------------------------------------- |
| `propose_plan_change` | **Only** way to mutate the calendar           |
| `log_symptom`         | Pain/mechanical signs from conversation       |
| `log_feedback`        | RPE, mood, energy, session notes              |
| `remember`            | Durable fact / preference / episode / insight |

Describing a plan change in prose does **not** schedule it.

### Plan mutations (`coach-core/plan` → `plan.service.applyProposal`)

Zod `planProposalSchema`: add / update / cancel / move sessions with structured WorkoutKit steps.
`applyProposal` is the single chokepoint used by chat, Sunday planning, and same-day auto-downgrade.

Flow:

1. Parse proposal. Schema errors return without write.
2. `buildGuardrailContext` from **real** history (not whatever the model claimed): 21 days of
   symptoms, 56 days of activities for weekly run/ride meters, current ACWR/monotony, quad-symmetry
   benchmarks, mandatory PT slugs, readiness.
3. `evaluateGuardrails`. Severity `block` or `red_flag` → reject, return the report, model must fix
   and retry.
4. On pass: write `coach_planned_session` rows, store the `guardrail_report` on each session.

Same-day downgrades (`autoDowngradeToday`) run at 05:30 **before** the briefing is written, so the
briefing describes the legal day.

### Injury Guard (`guardrails/`, ruleset `2026.09.1`)

Deterministic. The model cannot talk a violation into the plan. Severity: `info` → `warn` → `block`
→ `red_flag`.

Hard rules that matter:

| Id                              | Effect                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| `pain.mechanical_red_flag`      | Swelling / locking / giving way → stop, clinical review      |
| `pain.severe`                   | ≥6/10 → 72 h impact hold                                     |
| `pain.moderate_blocks_impact`   | ≥4/10 → no run that day; swim / high-cadence bike stay       |
| `progression.run_spacing`       | ≥48 h between runs for first 6 weeks after return-to-run     |
| `progression.weekly_run_volume` | Run volume +≤10%/week                                        |
| `progression.long_run_step`     | Long run +≤1 mi/week                                         |
| `progression.intensity_gate`    | No run intensity until quad symmetry passes (≤10% asymmetry) |
| `load.acwr_ceiling`             | ACWR ≤ 1.3 (hard 1.5)                                        |
| `load.rest_day`                 | One full rest day / 7 days                                   |
| `load.back_to_back_intensity`   | No two high-intensity days in a row                          |
| `load.two_a_day`                | Doubles only if at most one is impact or intensity           |
| `technique.long_ride_step`      | Long ride +≤15%/week (the 40-mile trigger)                   |
| `recovery.readiness_gate`       | Low readiness **reduces intensity, never adds volume**       |
| `protocol.pt_mandatory`         | Activation / armor cannot be deleted                         |

Warn/info: rising pain trend, progress-order, monotony <2.0, bike cadence ≥85 rpm in rehab, sleep <6
h, quad strength 2×/week, NSAID review.

Safe alternatives when impact is blocked: run → easy swim; brick → recovery spin; HIIT → swim
intervals.

### Memory

Four types with different half-lives (days): fact 720, preference 365, insight 180, episode 90.
Reinforcement extends half-life (capped 4×). Unused memories decay; recall floor 0.25. Supersede
leaves an audit trail instead of overwrite.

Written by:

- explicit `remember` tool
- post-turn `digestConversation` (Haiku, after the reply)
- nightly `decayMemories` + embedding backfill

Recalled by vector (Voyage, if keyed) plus keyword. Without `VOYAGE_API_KEY`, chunks and memories
still store; search is keyword-only.

Thread memory is separate: last ~12–40 messages verbatim, older folded by `maybeSummarise` into
`coach_conversation.summary`. After you leave a thread, coaching still has live plan/metrics **and**
digest memories, not only the open transcript.

### Cost (`coach-core/cost` + `cost.service.ts`)

Target ~$50/mo, ceiling ~$100. Caps in `coach_cost_budget` (~$8/day, $120/mo in the governor
defaults).

| Job                               | Default tier | Cache   | Exempt  | Notes                                  |
| --------------------------------- | ------------ | ------- | ------- | -------------------------------------- |
| chat                              | Sonnet       | 5m      | no      | Deep mode promotes that thread to Opus |
| briefing, debrief                 | Sonnet       | 1h      | no      | Template fallback if capped            |
| weekly_plan, block_review, intake | Opus         | 1h / 5m | no      | Long tool loops                        |
| injury_review                     | Opus         | 5m      | **yes** | Cost must never silence a knee warning |
| digest                            | Haiku        | 5m      | no      | Batch-eligible                         |
| journal                           | Sonnet       | 1h      | no      | Batch-eligible                         |

Degrade-not-fail: 80% of cap → cheaper tier + 5k context. 100% → templated analytics for jobs; chat
429s. Every call writes `coach_agent_run` (tokens, cache hit, `cost_usd`, tool trace). Spend panel:
`/coach/settings`.

Sustained cache-hit ratio below ~0.7 on chat means the stable prefix is being invalidated.

### Scheduled jobs (`apps/coach-worker`)

PM2 name `petehome-worker`, port 3021, cwd `apps/coach-worker`, env from `apps/web/.env`. Timezone
`America/Chicago`. Queue schema `pgboss`.

| Cron          | Job                                                                  |
| ------------- | -------------------------------------------------------------------- |
| `30 5 * * *`  | Morning briefing + auto-downgrade; write journal; push if configured |
| `15 6 * * *`  | Morning Activation reminder                                          |
| `0 20 * * *`  | Evening Armor reminder                                               |
| `30 20 * * *` | Check-in nudge if no feedback                                        |
| `0 18 * * 0`  | Sunday weekly plan (Opus) → approve in `/coach/plan`                 |
| `30 2 * * *`  | Nightly TSS/PMC/readiness, memory decay, gear mileage                |
| on NOTIFY     | Debrief ~2 min after a workout insert                                |
| on demand     | Block review (`yarn coach:job block-review`)                         |

Jobs call `runCoachJob` — same context assembly and tools as chat — so Sunday planning and a
question in the notebook produce the same coach. If Claude is capped, briefings still go out from
analytics.

Health: `GET http://localhost:3021/healthz`. CLI:
`yarn coach:job briefing|debrief|weekly-plan|nightly|…`.

If the PC sleeps, 05:30 and Sunday 18:00 do not run.

---

## Analytics (`coach-core/analytics`)

The model is forbidden from recomputing these.

**TSS ladder** (recorded on each activity so a weird CTL can be traced):

1. rTSS — run pace vs threshold
2. sTSS — swim pace vs CSS
3. pTSS — bike NP vs FTP
4. hrTSS — HR reserve vs LTHR (zones from `user_hr_zones_config`, not a hardcoded max 185)
5. estimated — duration × sport intensity constant

**PMC:** EWMA CTL τ=42, ATL τ=7, TSB = CTL − ATL. Rest days are zeros; skipping them would lie.
**ACWR** EWMA. Monotony / strain.

**Readiness v2** (replaces the old minutes + completion formula, which punished rest days):

| Component                           | Weight |
| ----------------------------------- | ------ |
| HRV SDNN vs 7-day personal baseline | 0.30   |
| RHR delta vs baseline               | 0.15   |
| Sleep duration/stages               | 0.20   |
| TSB                                 | 0.15   |
| Recent symptoms                     | 0.20   |

Scored against **this athlete's** rolling baseline, not population norms. Apple HRV is sporadic SDNN
— banded % deviation, not a twitchy z-score. Guidance: fatigued / compromised **downgrade intensity,
never add volume**.

**Race projection:** CSS → open-water (wetsuit, chop, no walls) × 1.02; VDOT 10k; bike from FTP or
threshold speed; T1/T2 measured or budget. Limiters named so the answer is not reflexively “run
more.” Until CSS/VDOT/FTP exist, splits use the budget as a placeholder.

**Performance helpers:** CSS, VDOT paces, speed-from-power, decoupling, zone seconds.

---

## Surfaces

**PWA** (`/coach`)

| Route              | What                                                               |
| ------------------ | ------------------------------------------------------------------ |
| `/coach`           | Today: briefing, readiness, sessions, PT, check-in, onboard banner |
| `/coach/plan`      | Week/block, approve Sunday draft, session rationale + guardrail    |
| `/coach/chat`      | Session notebook (history, resume, Deep)                           |
| `/coach/analytics` | PMC, ACWR, projection                                              |
| `/coach/injury`    | Body, symptoms, PT                                                 |
| `/coach/gear`      | Inventory / mileage                                                |
| `/coach/settings`  | Spend, push, caps                                                  |
| `/coach/onboard`   | Structured intake → constraints + Block 0                          |
| `/coach/tests`     | CSS, quad symmetry, indoor bike Z2 (week 3 of Block 0)             |
| `/coach/login`     | Access code                                                        |

`/fitness/*`, `/assistant`, blog, homework, and the old home APIs are **deleted**, not redirected.

**HTTP** (cookie or `Authorization: Bearer COACH_API_KEY`)

`/api/coach/{chat,today,plan,checkin,conversations,injury,gear,nutrition,readiness,load,projection,spend,benchmarks,onboard,import,push/subscribe,calendar,mcp,watch/today,watch/workouts,auth}`

Also kept: `/api/apple-health/*` (petehome ingest), `/api/health` (liveness).

- ICS: `/api/coach/calendar?key=<COACH_API_KEY>`
- MCP: `POST /api/coach/mcp` Streamable HTTP, bearer, **read-only tools** (works against local
  origin)
- Watch: `GET /api/coach/watch/today` exists on the server. **Installed watch source still
  references** `/api/fitness/workout-definitions?routineId=climber-physique`, which no longer exists
  in `apps/web` — do not rebuild expecting that path.

---

## Auth and security

- Pages + `/api/coach/*`: HMAC cookie from `/api/coach/auth` + access code. Login at `/coach/login`.
- Ingest: existing `PETEWATCH_API_KEY` on `/api/apple-health/*`. Different from `COACH_API_KEY`.
- `coach_*` and tightened `apple_health_*` RLS: anon denied.
- Medical docs intended for a private Storage bucket.
- `PETEWATCH` is still the committed public key in the installed apps. Rotating it without a
  coordinated iOS ship bricks ingest.

---

## Periodization skeleton (plan default)

Block 0 was generated at onboard (return-to-run + rehab). The 48-week sketch:

| Weeks | Phase                | Intent                                                                                               |
| ----- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| 1–8   | Return + rehab       | Swim 3×, bike 2–3× Z2 high cadence, walk/run 2× if cleared, strength 2×, PT daily, CSS + quad tests  |
| 9–20  | Base 1               | Swim to ~3500 yd, indoor bike 3× (sweet-spot from wk 14), run 3× Z2 to 15–18 mi/wk, deload every 4th |
| 21–30 | Base 2 / early build | Tempo, threshold, race-pace swim, first bricks, spring 10K C                                         |
| 31–40 | Build                | Outdoor Lakefront, OW from ~June, weekly bricks, sprint B                                            |
| 41–46 | Peak                 | Course + fuel + heat, July B                                                                         |
| 47–48 | Taper                | Race                                                                                                 |

Winter: Lakefront Dec–Mar unreliable; indoor bike; ice-day run cancels. Smart trainer recommended,
not assumed.

---

## Knowledge

Corpus lives in `apps/web/data/knowledge` (notes, papers, guidelines, MRI/PT medical). Ingest with
`yarn coach:ingest` → `coach_document` + chunked `coach_chunk`. Mark clinical notes
`--type medical --medical`.

Embeddings: Voyage `voyage-3` when `VOYAGE_API_KEY` is set. Hybrid search + citations. Live PubMed
as a tool. Environment: Open-Meteo + NWS + NOAA station `45198` via coach environment service.

Old dashboard `coaching-knowledge.md` (fasted training / recomp) is gone and is not a coaching
default.

---

## Evals

`packages/coach-core/src/evals` — golden scenarios (pain flare, missed week, travel, heat/wind, HRV
crash, plateau) asserting guardrail compliance and tone. Own budget. MCP/eval tools are read-only so
a dry run cannot rewrite the real plan.

---

## What is implemented vs what is not live

**In the tree and usable locally**

- Schema 037–041, seed profile / PT / Block 0, intake, chat, Today/Plan/Analytics/Body/Gear/Settings
- Selective cached prompts, tools, Injury Guard, cost ledger, worker jobs, ICS, MCP route, watch
  **server** endpoints
- Chat persistence + session UI (client-owned conversation ids)

**Not live / do not assume**

- Public hosting — `apps/web` is local-only; do not expect `pete.sh/coach`
- Worker — must be started (`yarn p:start:coach`) and the PC must stay awake for cron
- Voyage, VAPID web push, APNs — optional; jobs still write the briefing to the journal
- Knowledge must be **ingested** into Supabase (`yarn coach:ingest`); files on disk alone are not
  searched
- petehome rebuild / WorkoutKit on the watch / watch fetching coach sessions
- CSS / VDOT / FTP until week-3 tests

Minimum viable daily coach: home PC awake, worker + local `/coach`, installed petehome left alone.

---

## How to change coaching behaviour

| If you want to change…                | Edit                                          |
| ------------------------------------- | --------------------------------------------- |
| Voice, priorities, nutrition stance   | `packages/coach-core/src/prompts/identity.ts` |
| What the model sees each turn         | `prompts/assemble.ts` + `runtime.service.ts`  |
| Hard training rules                   | `guardrails/rules.ts` + `engine.ts`           |
| Whether a calendar write is legal     | `plan/index.ts` + `plan.service.ts`           |
| A number (TSS, readiness, projection) | `analytics/*` — never the prompt              |
| A scheduled behaviour                 | `apps/coach-worker/src/jobs.ts`               |
| What a tool returns                   | `tools.service.ts` (keep it compact)          |
| Cost / model routing                  | `models.ts` + `cost/index.ts`                 |

Do not put today's readiness, the date, or any volatile fact into `COACH_IDENTITY`. Do not let the
model invent TSS. Do not add a second path that writes `coach_planned_session` without
`applyProposal`.
