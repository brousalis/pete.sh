# petehome (iOS / watchOS)

Personal training client for the petehome monorepo.

| Target | Folder | Bundle ID | Role |
|--------|--------|-----------|------|
| Watch | `watch/` | `com.petehome.watch` | Standalone watchOS workout app |
| iOS | `ios/` | `com.petehome.ios` | Phone companion + HealthKit sync |
| WidgetsExtension | `widgets/` | `com.petehome.watch.widgets` | Watch face complications |

App Group (watch ↔ widgets): `group.com.petehome.app`

Open with:

```bash
open apps/ios/petehome.xcodeproj
```

Copy `Config.xcconfig.example` → `Config.xcconfig` before building. Secrets map to
`PETEWATCH_API_KEY` (ingest) and `COACH_API_KEY` (watch plan endpoints) — different keys.

Display name on device: **petehome**.
