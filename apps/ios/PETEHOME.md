# petehome (iOS / watchOS)

Personal training client for the petehome monorepo.

| Target | Folder | Role |
|--------|--------|------|
| Watch | `watch/` | Standalone watchOS workout app |
| iOS | `ios/` | Phone companion + HealthKit → local server sync |
| WidgetsExtension | `widgets/` | Watch face complications |

Open with:

```bash
open apps/ios/petehome.xcodeproj
```

Copy `Config.xcconfig.example` → `Config.xcconfig` before building. Secrets map to
`PETEWATCH_API_KEY` (ingest) and `COACH_API_KEY` (watch plan endpoints) — different keys.

**Do not change** bundle IDs (`com.petetrain.*`), the App Group, HealthKit metadata key names, or
the widget `kind` string without a coordinated migration. Display name and user-facing copy are
**petehome**.
