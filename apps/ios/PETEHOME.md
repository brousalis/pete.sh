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
aliases). Set `PETEHOME_SERVER_URL` to your PC’s LAN IP (e.g. `http://192.168.1.4:3000`),
not `boufos.local` — on this machine `.local` resolves to IPv6 link-local / WSL
addresses that time out. `http://localhost:3000` is fine on the PC only.

The dev server is plain HTTP now. iOS blocks cleartext by default, so the app needs an
`NSAppTransportSecurity` exception for the LAN host, or run `yarn dev:https` when syncing
from the phone.

If Keychain already has an old URL/key from a prior install, clear it or call
`KeychainHelper.setServerURL` / `setAPIKey` — Config only seeds empty Keychain.

Display name on device: **petehome**.
