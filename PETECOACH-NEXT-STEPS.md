# PeteCoach next steps

Daily coaching is blocked by the home-machine worker being off, not by Xcode. `pete.sh/coach` is still a 404 — keep using local `/coach`. Leave PeteTrain and `PETEWATCH_API_KEY` alone.

## Already done — do not redo

- Code lives in this repo (`apps/web` `/coach`, `packages/coach-core`, `apps/coach-worker`, iOS source). Almost all of it is still uncommitted; production does not have it.
- `yarn install`, migrations **037–041**, athlete profile, PT blocks, Block 0 sessions, intake, local chat.
- Local auth is set: `COACH_SESSION_SECRET`, `COACH_ACCESS_CODE`, `COACH_API_KEY`. Anthropic + Supabase + `SUPABASE_DB_URL` are in `apps/web/.env`.
- Installed PeteTrain still posts workouts and daily metrics to `https://www.pete.sh` `/api/apple-health/{sync,workout,daily}` with the existing key. That pipe works without a new build.
- Last `yarn coach:doctor`: **16 ok, 7 warnings, 1 FAIL** (`PETEWATCH_API_KEY` still the committed public key). Leave that FAIL.

## Must run vs optional

| Loop | Needs | If it's off |
| --- | --- | --- |
| Chat, Today, Plan, check-in | Local `yarn dev` **or** a Vercel deploy | You cannot open `/coach` |
| Workouts landing in the DB | Installed PeteTrain → existing `pete.sh` ingest | No new activities |
| 05:30 briefing, PT reminders, 20:30 nudge, Sunday 18:00 plan, post-workout debrief, 02:30 nightly recompute | **PM2 worker on the home PC, awake 24/7** | Chat still works. You can still ask chat to plan. No morning brief, no auto-debrief, no Sunday draft, no nightly PMC/memory refresh |
| Voyage / VAPID / APNs / knowledge books / Garmin export / iOS rebuild | Optional | See [Secrets](#secrets-still-missing) and [One-time data](#one-time-data) |

The worker talks to Supabase directly. It does **not** need Vercel. Debriefs fire because migration 038 `NOTIFY`s on `apple_health_workouts` insert — production ingest already hits that table.

---

## Now

From `C:\dev\petehome`:

```bash
yarn p:start:coach
yarn p:logs:coach
```

Or from the petehome CLI (`petehome` / `yarn cli`):

```text
coach start
coach doctor
coach job briefing
coach status
coach today
coach ask "what should I do today?"
```

`start coach` / `start all` also start `petecoach-worker`. `coach health` hits `http://localhost:3021/healthz`. API commands (`today`, `ask`, …) need local `yarn dev` (or hybrid HTTPS) and `COACH_API_KEY` in `apps/web/.env`.

Wait until you see `ready` and `listening for new activities`. Then:

```bash
yarn coach:doctor
yarn coach:job briefing
```

Ignore the PETEWATCH doctor FAIL. Keep `yarn dev` (or `yarn p:start` if that is how you already run hybrid HTTPS). Stay on `https://localhost:3000/coach` or `https://boufos.local:3000/coach`. Do **not** look for `/coach` on pete.sh. Do **not** open Xcode. Do **not** rotate keys.

Prove a job without waiting for the clock:

```bash
yarn coach:job nightly
yarn coach:job weekly-plan
```

Health check: `GET http://localhost:3021/healthz` should be `200` with `listenerConnected: true` and `stale: false`. After the worker stays up:

```bash
pm2 save
```

so it returns after reboot (`pm2 startup` if that is not already set for petehome).

`yarn p:start` is the **old** local HTTPS petehome process (hybrid Hue/etc.). It is not the coach worker. Foreground instead of PM2: `yarn coach:worker`.

---

## This week

1. Commit/push the PeteCoach tree if you do not want it only on this disk. Then deploy `apps/web` and add the three `COACH_*` vars on Vercel if you want pete.sh.
2. Optional: `yarn coach:backfill plans`. Garmin/Apple export only if the 90-day hole bothers you.
3. Optional: drop a couple of PT/MRI notes plus one book into `apps/web/data/knowledge` and ingest. Voyage can wait.
4. Subscribe the ICS feed from the origin you actually use (local or pete.sh after deploy).

Knowledge / history (from `apps/web`, not repo root):

```bash
cd apps/web
yarn coach:ingest --list
yarn coach:ingest --dir ./data/knowledge
yarn coach:backfill plans
yarn coach:backfill apple --file <export.xml>
yarn coach:backfill files --dir <garmin-export>
```

ICS (after the web app you use has `/api/coach/calendar`):

```text
https://<origin>/api/coach/calendar?key=<COACH_API_KEY>
```

---

## Later / skip honestly

- Voyage, VAPID, APNs — niceties. Open the PWA instead of waiting for a banner.
- PeteTrain rebuild — after (a) dual-key ingest vs coach is fixed, (b) `Config.xcconfig` is real, (c) watch actually calls `/api/coach/watch/today`, (d) `/api/coach` is live on the phone’s server URL.
- `PETEWATCH` rotation — same moment as that rebuild, not before.
- MCP / claude.ai remote — after Vercel. `POST /api/coach/mcp` with bearer `COACH_API_KEY`. Useless on pete.sh until deploy.
- Baseline tests — week 3 of Block 0 at `/coach/tests`. Knee vetoes. Do not rush a CSS test.

---

## Rebuild PeteTrain iOS + watch? No. Skip.

The installed apps already ingest. New native work is **only in the working tree** and has never been installed:

- Phone: `HealthKitObserver` (faster sync), extra metrics (sleep stages, resp, wrist temp, SpO2, SWOLF), `CoachWorkoutScheduler` (WorkoutKit), `CoachPushManager` (APNs).
- Watch: still fetches `GET /api/fitness/workout-definitions?routineId=climber-physique`. Server has `/api/coach/watch/today`, but the watch client does not call it. A rebuild of current source would **not** put coach sessions on the watch face.
- Hardcoded key was moved to Keychain, but `apps/ios/Config.xcconfig` does not exist, and Info.plist has no `PETEHOME_API_KEY` seed. A rebuild now can ship with **no key** and break ingest.
- Phone uses **one** Keychain key for ingest and coach. Ingest auth is `PETEWATCH_API_KEY`; `/api/coach/*` wants `COACH_API_KEY`. Those two are **different**. Rebuild would 401 one of the two paths.

WorkoutKit + APNs also need `/api/coach/*` on the URL the phone already uses (`https://www.pete.sh`), which is still 404.

**Do not rotate `PETEWATCH_API_KEY`.** That is the only thing the installed apps have.

---

## Vercel deploy

**Not required** if you keep using local HTTPS `/coach`.

**Required** when you want `https://pete.sh/coach`, remote MCP, or a future phone hitting production `/api/coach/*`.

Production is the last pushed `main`. PeteCoach is uncommitted, so a deploy today would not ship `/coach`. Project root is `apps/web`.

**Put on Vercel** (chat/UI/ingest):

- Already likely there from the old stack: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PETEWATCH_API_KEY`
- Must add for `/coach`: `COACH_SESSION_SECRET`, `COACH_ACCESS_CODE`, `COACH_API_KEY`
- Optional on Vercel: `VOYAGE_API_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

**Worker-only — do not put on Vercel:** `SUPABASE_DB_URL`, `VAPID_PRIVATE_KEY`, `APNS_*`

Local `.env.production` already has the `COACH_*` names; it does not have Anthropic (dashboard copy of the old AI Coach key is enough). `COACH_WORKER_URL` is unused. NOAA falls back to station `45198`.

---

## Worker

```bash
yarn p:start:coach
```

Or in petehome-cli: `coach start` (alias `pc start`). Same process: `petecoach-worker`.

That starts `petecoach-worker` (`tsx` → `apps/coach-worker/src/index.ts`, port **3021**, cwd `apps/coach-worker`). It loads `apps/web/.env` (there is no worker `.env`).

**Schedule (America/Chicago):**

- `30 5 * * *` morning briefing + auto-downgrade
- `15 6 * * *` morning activation reminder
- `0 20 * * *` evening armor reminder
- `30 20 * * *` check-in nudge
- `0 18 * * 0` Sunday weekly plan (needs your approval in `/coach/plan`)
- `30 2 * * *` nightly analytics / memory / gear mileage
- Debrief: LISTEN `coach_activity` → queue after ~2 minutes

If the PC sleeps, Sunday 18:00 and 05:30 simply do not run.

If it dies on start (Windows): dotenv is loaded via `new URL(...).pathname`, which can become `/C:/...` and miss `SUPABASE_DB_URL`. Symptom: process exits with “SUPABASE_DB_URL is required”. Fix later if that happens; don’t block on it until you see it.

---

## Secrets still missing

| Missing | Breaks | Skip? |
| --- | --- | --- |
| `VOYAGE_API_KEY` | Semantic knowledge + memory embeddings. Keyword search still works | Yes |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push. Jobs still write the briefing to the journal; Settings → Enable does nothing | Yes — open `/coach` in the morning |
| `APNS_KEY_ID` / `TEAM_ID` / `PRIVATE_KEY` | iPhone push. Also needs a new iOS build + production `aps-environment` (source still says `development`) | Yes |
| `PETEWATCH` rotation | Doctor FAIL only. Rotating now bricks the installed apps | **Do not** |
| Knowledge corpus (`data/knowledge` does not exist) | Coach cannot cite books/papers. Chat still coaches from your data + PubMed | Yes for now |
| CSS / VDOT / FTP | Race projection uses placeholders; load falls back to HR | Week 3 |

---

## One-time data

- **Garmin Connect export** (and/or Apple Health `export.xml`): only if you want streams older than ~90 days. Safe to re-run; it dedupes on time overlap. Skip if current Apple year of aggregates is enough.
- **`yarn coach:backfill plans`:** imports `fitness_routine_versions` → `coach_plan_history`. Cheap; do whenever.
- **Knowledge:** put licensed files in `apps/web/data/knowledge`, then ingest. Mark MRI/PT `--type medical --medical`. Without Voyage, chunks store; search is keyword-only.
- **Baseline tests:** `/coach/tests` — CSS, quad symmetry, indoor bike Z2. Product copy says **week 3 of Block 0**.

---

## Minimum viable daily coach

Home PC stays awake, worker + local `/coach` running, installed PeteTrain left untouched. Everything else is polish.
