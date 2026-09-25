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
aliases). Set `PETEHOME_SERVER_URL` to your PC’s LAN IP (e.g. `http://192.168.1.4:1337`),
not `boufos.local` — on this machine `.local` resolves to IPv6 link-local / WSL
addresses that time out. `http://localhost:1337` is fine on the PC only.

The dev server is plain HTTP now. iOS blocks cleartext by default, so the app needs an
`NSAppTransportSecurity` exception for the LAN host, or run `yarn dev:https` when syncing
from the phone.

If Keychain already has an old URL/key from a prior install, clear it or call
`KeychainHelper.setServerURL` / `setAPIKey` — Config only seeds empty Keychain.

Display name on device: **petehome**.

## iPhone app (hybrid coach)

Four tabs:

| Tab | Surface |
|-----|---------|
| **Today** | Native coach day — `GET /api/coach/today`, check-in, session done/skip, PT checklist |
| **Sync** | HealthKit ingest controls (unchanged pipeline → `/api/apple-health/*`) |
| **Activity** | Server-backed workout list/detail |
| **Coach** | WKWebView at `{PETEHOME_SERVER_URL}/coach` (plan, fuel, chat, load, more) |

Removed from phone: shopping list, fridge scan, HR BLE broadcast, legacy pete.sh “Home” tab.

Push notifications deep-link into the **Coach** tab (`CoachPushManager` → `AppNavigation`).

WorkoutKit scheduling (`CoachWorkoutScheduler`) and APNs registration still run on launch.

Watch app overhaul is tracked separately; watch target unchanged in this pass.

## Manual QA (sync + coach)

1. HealthKit authorize → Sync tab → workouts + daily land in web Activity.
2. Background: new Watch workout triggers observer sync within debounce window.
3. Backgrounding schedules `BGAppRefreshTask` (`com.petehome.dailyMetricsSync`).
4. Today tab loads sessions/readiness when LAN server is up (cached fallback offline).
5. Coach tab loads `/coach`; notification tap opens the pushed path.
6. WorkoutKit sync on foreground (iOS 18+).
7. APNs token POSTs to `/api/coach/push/subscribe`.
