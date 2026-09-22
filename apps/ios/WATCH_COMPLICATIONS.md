# petehome Watch Complications

Four watch face styles driven by `SharedCoachTodayData` (App Group cache written by the watch app after each `/api/coach/watch/today` refresh).

| Style | Shows |
|-------|--------|
| **Circular** | Readiness score (or rest icon) |
| **Corner** | Score / sport icon + inline session count |
| **Rectangular** | Readiness chip + next session title + target |
| **Inline** | `2 sessions` or `Rest` |

Auto-refreshes every 15 minutes; the watch app also calls `WidgetCenter.reloadAllTimelines()` after a successful fetch.

## Files

| File | Role |
|------|------|
| `widgets/SharedCoachTodayData.swift` | Snapshot model + App Group load/save |
| `widgets/PetehomeWidgets.swift` | Timeline provider + widget config |
| `widgets/ComplicationViews.swift` | Per-family views |
| `watch/Data/SharedCoachTodayData.swift` | Mirror used by the watch target |

App Group: `group.com.petehome.app` · Widget kind: `petehomeComplication`
