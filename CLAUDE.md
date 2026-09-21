# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

**petehome `apps/web` is PeteCoach only** — a personal local PWA. The old smart-home dashboard
(Hue, Spotify, CTA, coffee, maple, cooking AI chef, unified assistant, climber-physique AI Coach,
fitness routine editor, blog, homework) has been removed. There is no Vercel publish path for this
app anymore.

- **Web App** (`apps/web/`) — PeteCoach PWA at `/coach` plus `/api/coach/*` and `/api/apple-health/*`
- **Coach worker** (`apps/coach-worker/`) — PM2 scheduled jobs + activity LISTEN
- **Shared core** (`packages/coach-core/`) — analytics, guardrails, prompts, tools
- **iOS** (`apps/ios/`) — PeteTrain HealthKit sync (installed build still points at pete.sh for ingest)
- **Desktop / other apps** — legacy monorepo leftovers; not part of the coach product surface

There is **no** unified assistant and **no** `/api/fitness/*`. Training chat is only
`/coach/chat` → `/api/coach/chat`.

## PeteCoach

Read [`PETECOACH.md`](./PETECOACH.md) before changing coaching behaviour. Ops leftovers:
[`PETECOACH-NEXT-STEPS.md`](./PETECOACH-NEXT-STEPS.md).

### Non-negotiable ordering

Knee health, then consistency, then the sub-3 goal. The athlete is returning from a bilateral
medial knee injury (cartilage wear, medial plica, hamstring tendon inflammation, Baker's cyst).
Code that lets training override a guardrail is a bug, regardless of how reasonable the training
looks.

### Architecture

```
packages/coach-core/     Shared, no framework deps. Imported by web AND worker.
  analytics/             TSS, PMC, ACWR, CSS, VDOT, readiness, race projection
  guardrails/            Injury Guard rules + evaluation engine
  plan/                  Zod schemas for plan mutations
  prompts/               Coach identity (cached prefix) + context assembly
  tools/                 Tool definitions; host supplies data access
  memory/                Typed, decaying, supersedable memory model
  cost/                  CostGovernor: model routing, caps, accounting
  evals/                 Golden scenarios

apps/web/lib/services/coach/   Data access + runtime, backed by Supabase
apps/web/app/api/coach/        HTTP surface (chat, plan, watch, MCP, ICS)
apps/web/app/api/apple-health/ PeteTrain ingest
apps/web/app/(dashboard)/coach/  PWA (route-group name only — not a home dashboard)
apps/coach-worker/       PM2 worker: scheduled jobs, activity listener
```

### Rules that are easy to break accidentally

- **The LLM never computes training metrics.** TSS, zones, ACWR and readiness are calculated in
  `coach-core/analytics`, persisted, and handed to the model as finished numbers.
- **Every plan change goes through `applyProposal`.** It is the only path that runs the Injury
  Guard. Do not write to `coach_planned_session` directly.
- **The system prompt is split in two.** The stable prefix (identity, guardrails, tool policy) is
  cache-marked; volatile athlete context is appended after it. Putting anything time-varying in the
  prefix invalidates the cache on every turn.
- **`coach_*` and `apple_health_*` are service_role only.** Use `getSupabaseMedicalClient()`; never
  the anon client.
- **Nothing under `coach_*` is ever auto-deleted.** The retention job deliberately excludes it.
- **Safety paths are budget-exempt.** Injury review and same-day downgrades bypass cost caps.

### Commands

```bash
yarn coach:test           # analytics + guardrail unit tests
yarn coach:type-check
yarn coach:worker         # run the worker in watch mode
yarn coach:job briefing   # run any scheduled job now (from apps/coach-worker)
yarn p:start:coach        # start the worker under PM2

cd apps/web
yarn coach:eval           # golden scenarios against the live model
yarn coach:backfill       # import historical training data
yarn coach:ingest --list  # knowledge base contents
yarn type-check
```

### Required environment

`ANTHROPIC_API_KEY`, `COACH_SESSION_SECRET` (32+ chars), `COACH_ACCESS_CODE`, `COACH_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` (worker). Optional: `VOYAGE_API_KEY` (embeddings),
`VAPID_*` (web push), `APNS_*` (iOS). Do not rotate `PETEWATCH_API_KEY` without a coordinated iOS
ship.

## Common Commands

```bash
# Development (from root)
yarn dev                    # Start web on 0.0.0.0:3000
yarn build                  # Build web app
yarn p:start                # Start local HTTPS Next via PM2 (apps/web)
yarn p:start:coach          # Start petecoach-worker via PM2
yarn p:logs:coach
yarn p:status

# Code Quality
yarn lint
yarn lint:fix
yarn format
yarn type-check

# Cleanup
yarn clean
```

`yarn p:start` runs local HTTPS Next for `apps/web`. `yarn p:start:coach` runs the worker.

## Architecture

### Monorepo Structure

```
petehome/
├── apps/
│   ├── web/                    # Next.js PeteCoach PWA + apple-health APIs
│   │   ├── app/(dashboard)/coach/  Coach UI
│   │   ├── app/api/coach/          Coach HTTP
│   │   ├── app/api/apple-health/   PeteTrain ingest
│   │   ├── app/api/health/         Liveness
│   │   ├── components/coach/       Coach UI
│   │   ├── components/ui/          Shared primitives still used by coach
│   │   ├── lib/services/coach/     Coach data + runtime
│   │   ├── data/knowledge/         Corpus for ingest
│   │   └── supabase/               Migrations (coach_* + orphaned legacy tables)
│   ├── coach-worker/           PM2 scheduled coach jobs
│   ├── ios/                    PeteTrain HealthKit
│   └── …
├── packages/coach-core/        Shared analytics, guardrails, prompts, tools
├── PETECOACH.md
├── PETECOACH-NEXT-STEPS.md
└── CLAUDE.md
```

### Web App Structure (`apps/web/`)

- `app/` — App Router. Pages are `/` → `/coach`, coach routes, and `/coach/login`.
- `app/api/` — **only** `coach`, `apple-health`, and `health`.
- `components/coach/` — PWA UI; `components/ui/` — button/card/sheet/etc.
- `lib/services/` — `coach/*`, `apple-health.service`, `calendar.service`, `token-storage`
- `lib/config.ts` — Zod-validated env (Google Calendar for `get_calendar`, weather, coach keys)
- `proxy.ts` — CORS + no-store for coach / apple-health / health (local + LAN origins)

### Key Patterns

- React Server Components by default; `"use client"` only when needed
- Coach DB access via `getSupabaseMedicalClient()` / service role
- Plan writes only through `applyProposal` + Injury Guard
- Path alias: `@/*` → `apps/web/` root

### Integrations that still matter

- **Apple Health / PeteTrain** — ingest into `apple_health_*`
- **Google Calendar** — coach `get_calendar` tool (optional OAuth tokens in `.tokens.json`)
- **Weather / lake** — Open-Meteo, NWS, NOAA for environment tools
- **Anthropic** — chat + worker jobs via AI SDK
- **Voyage** — optional embeddings for knowledge/memory

## Runtime

- **Local Next** for `/coach` and APIs (`yarn dev` / PM2 `petehome` HTTPS)
- **PM2 `petecoach-worker`** for cron + NOTIFY debriefs
- Supabase Postgres for data + pg-boss

## Code Style

### TypeScript

- Strict mode enabled
- Prefer explicit types for function parameters and return types
- Use interfaces for object shapes, types for unions/intersections
- Avoid `any` - use `unknown` when type is truly unknown

### React

- Functional components with hooks
- Prefer named exports for components
- Keep components small and focused
- Extract custom hooks for reusable logic

### Naming Conventions

- Components: PascalCase (`SessionCard`)
- Functions: camelCase (`handleClick`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Files: kebab-case (`session-card.tsx`)

### Import Order

1. React/Next.js imports
2. Third-party library imports
3. Internal imports (components, hooks, utils)
4. Type imports (use `import type` when possible)
5. Relative imports last
