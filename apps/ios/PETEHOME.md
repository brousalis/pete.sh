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

Copy `Config.xcconfig.example` → `Config.xcconfig` before building. One machine
key (`PETEHOME_API_KEY`) covers ingest and coach bearers — same value as
`PETEWATCH_API_KEY` / `COACH_API_KEY` in `apps/web/.env` (server treats them as
aliases). Set `PETEHOME_SERVER_URL` to your local HTTPS origin
(`https://boufos.local:3000`), not pete.sh.

If Keychain already has an old URL/key from a prior install, clear it or call
`KeychainHelper.setServerURL` / `setAPIKey` — Config only seeds empty Keychain.

Display name on device: **petehome**.
