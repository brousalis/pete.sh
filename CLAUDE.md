# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

**petehome `apps/web`** — coaching PWA + APIs, deployed on Vercel. The old smart-home dashboard
(Hue, Spotify, CTA, coffee, maple, cooking AI chef, unified assistant, climber-physique AI Coach,
fitness routine editor, blog, homework) has been removed.

- **Web App** (`apps/web/`) — petehome PWA at `/coach` plus `/api/coach/*`, `/api/apple-health/*`,
  and `/api/cron/*` (Vercel Cron)
- **Coach worker** (`apps/coach-worker/`) — CLI only (`yarn coach:job`); do not run the old PM2
  scheduler alongside production
- **Shared core** (`packages/coach-core/`) — analytics, guardrails, prompts, tools
- **iOS** (`apps/ios/`) — petehome watch + phone HealthKit sync (installed build may still point at
  pete.sh)
- **Desktop / other apps** — legacy monorepo leftovers; not part of the coach product surface

There is **no** unified assistant and **no** `/api/fitness/*`. Training chat is only `/coach/chat` →
`/api/coach/chat`.

## petehome

Read [`petehome.md`](./petehome.md) before changing coaching behaviour.

### Non-negotiable ordering

Knee health, then consistency, then the sub-3 goal. The athlete is returning from a bilateral medial
knee injury (cartilage wear, medial plica, hamstring tendon inflammation, Baker's cyst). Code that
lets training override a guardrail is a bug, regardless of how reasonable the training looks.

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

apps/web/lib/services/coach/   Data access + runtime + jobs.service, backed by Supabase
apps/web/app/api/coach/        HTTP surface (chat, plan, watch, MCP, ICS)
apps/web/app/api/cron/         Vercel Cron job triggers
apps/web/app/api/apple-health/ petehome ingest
apps/web/app/(dashboard)/coach/  PWA (route-group name only — not a home dashboard)
apps/coach-worker/       CLI job runner (scheduler disabled; crons on Vercel)
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
yarn coach:job briefing   # run any job now (from apps/coach-worker CLI)
# Scheduled jobs: Vercel Cron → /api/cron/[job] (see apps/web/vercel.json)

cd apps/web
yarn coach:eval           # golden scenarios against the live model
yarn coach:backfill       # import historical training data
yarn coach:ingest --list  # knowledge base contents
yarn type-check
```

### Required environment

`ANTHROPIC_API_KEY`, `COACH_SESSION_SECRET` (32+ chars), `COACH_ACCESS_CODE`,
`COACH_API_KEY` and/or `PETEWATCH_API_KEY` (aliases — one machine key is enough),
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (Vercel Cron bearer). Optional: `VOYAGE_API_KEY`,
`VAPID_*`, `APNS_*`. Local CLI may still use `SUPABASE_DB_URL`; cron jobs do not need it.

## Common Commands

```bash
# Development (from root)
yarn dev                    # Start web on 0.0.0.0:7331
yarn build                  # Build web app
yarn p:start                # Start local Next via PM2 (apps/web)
yarn p:status

# Code Quality
yarn lint
yarn lint:fix
yarn format
yarn type-check

# Cleanup
yarn clean
```

`yarn p:start` runs local Next for `apps/web`. Scheduled coach jobs run on Vercel Cron — do not
leave `petehome-worker` scheduling alongside production.

Dev serves plain HTTP on `http://localhost:7331`. TLS is opt-in — `yarn dev:https`, or
`PETEHOME_HTTPS=1` for the PM2 app — and needs mkcert certs in `apps/web/certs/`.

## Architecture

### Monorepo Structure

```
petehome/
├── apps/
│   ├── web/                    # Next.js petehome PWA + apple-health APIs
│   │   ├── app/(dashboard)/coach/  Coach UI
│   │   ├── app/api/coach/          Coach HTTP
│   │   ├── app/api/cron/           Vercel Cron jobs
│   │   ├── app/api/apple-health/   petehome ingest
│   │   ├── app/api/health/         Liveness
│   │   ├── components/coach/       Coach UI
│   │   ├── components/ui/          Shared primitives still used by coach
│   │   ├── lib/services/coach/     Coach data + runtime + jobs
│   │   ├── data/knowledge/         Corpus for ingest
│   │   └── supabase/               Migrations (coach_* + orphaned legacy tables)
│   ├── coach-worker/           CLI job runner (crons on Vercel)
│   ├── ios/                    petehome HealthKit
│   └── …
├── packages/coach-core/        Shared analytics, guardrails, prompts, tools
├── petehome.md
└── CLAUDE.md
```

### Web App Structure (`apps/web/`)

- `app/` — App Router. Pages are `/` → `/coach`, coach routes, and `/coach/login`.
- `app/api/` — `coach`, `cron`, `apple-health`, and `health`.
- `components/coach/` — PWA UI; `components/ui/` — button/card/sheet/etc.
- `lib/services/` — `coach/*`, `apple-health.service`, `calendar.service`, `token-storage`
- `lib/config.ts` — Zod-validated env (Google Calendar for `get_calendar`, weather, coach keys)
- `vercel.json` — cron schedules for `/api/cron/*`
- `proxy.ts` — CORS + no-store for coach / apple-health / health (local + LAN origins)

### Key Patterns

- React Server Components by default; `"use client"` only when needed
- Coach DB access via `getSupabaseMedicalClient()` / service role
- Plan writes only through `applyProposal` + Injury Guard
- Path alias: `@/*` → `apps/web/` root

### Integrations that still matter

- **Apple Health / petehome** — ingest into `apple_health_*`
- **Google Calendar** — coach `get_calendar` tool (optional OAuth tokens in `.tokens.json`)
- **Weather / lake** — Open-Meteo, NWS, NOAA for environment tools
- **Anthropic** — chat + cron jobs via AI SDK
- **Voyage** — optional embeddings for knowledge/memory

## Runtime

- **Vercel** for `/coach`, APIs, and cron (`apps/web/vercel.json`)
- **Local Next** optional for LAN (`yarn dev` / PM2 `petehome`)
- Supabase Postgres for data
- Do not run the old PM2 coach-worker scheduler alongside production crons

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
