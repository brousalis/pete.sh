# Scripts

Coach tooling for the local PeteCoach app. Home-sync / Spotify / Trader Joe’s /
dashboard scripts were removed with the teardown.

## Coach

From `apps/web`:

```bash
yarn coach:doctor
yarn coach:backfill plans
yarn coach:backfill apple --file <export.xml>
yarn coach:backfill files --dir <tcx-dir>
yarn coach:ingest --list
yarn coach:ingest --dir ./data/knowledge
yarn coach:eval
yarn export:swim
```

From repo root (worker):

```bash
yarn p:start:coach
yarn coach:job briefing
```

See `PETECOACH.md` and `PETECOACH-NEXT-STEPS.md` at the monorepo root.
