# Pete Train Watch Complications Setup Guide

## 📱 What You're Getting

Four watch face complication styles:

| Style           | Description                         | Best For                           |
| --------------- | ----------------------------------- | ---------------------------------- |
| **Circular**    | Progress ring with completion count | Infograph corners, Modular Compact |
| **Corner**      | Day number with progress arc        | Infograph corners                  |
| **Rectangular** | Full workout info with progress bar | Modular Large, Infograph Modular   |
| **Inline**      | Text-only: "Day 1 • 5/12"           | Utility, Simple                    |

### Features

- ✅ Real-time progress updates when you complete exercises
- ✅ Shows "active workout" state when live workout is running
- ✅ Recovery days show walking icon
- ✅ Complete workouts show green checkmark
- ✅ Auto-refreshes every 15 minutes (backup)

---

## 🔧 Setup Instructions (5 minutes)

### Step 1: Add Widget Extension Target

1. Open `PeteTrain.xcodeproj` in Xcode
2. **File → New → Target...**
3. In the template chooser:
   - Platform: **watchOS**
   - Search for **Widget Extension**
   - Select it and click **Next**
4. Configure the target:
   - Product Name: `PeteTrainWidgets`
   - Team: Your team
   - Bundle Identifier: `com.petetrain.app.widgets`
   - ☑️ Include Configuration App Intent: **Unchecked** (we don't need it)
5. Click **Finish**
6. When asked "Activate scheme?", click **Cancel** (we'll build from main scheme)

### Step 2: Delete Auto-Generated Files

Xcode creates template files we don't need. Delete these from the new PeteTrainWidgets folder:

- `PeteTrainWidgets.swift` (we have our own)
- `PeteTrainWidgetsBundle.swift` (if created)
- `AppIntent.swift` (if created)

### Step 3: Add Our Widget Files

1. In Xcode's Project Navigator, right-click on **PeteTrainWidgets** folder
2. **Add Files to "PeteTrain"...**
3. Navigate to the `PeteTrainWidgets` folder in Finder
4. Select all these files:
   - `PeteTrainWidgets.swift`
   - `ComplicationViews.swift`
   - `SharedWorkoutData.swift`
   - `Info.plist`
   - `PeteTrainWidgets.entitlements`
   - `Assets.xcassets` folder
5. ✅ Make sure **PeteTrainWidgets** target is checked
6. Click **Add**

### Step 4: Configure App Groups

**For PeteTrainWidgets target:**

1. Select **PeteTrainWidgets** target in Project Navigator
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **App Groups**
5. Click the **+** under App Groups
6. Add: `group.com.petetrain.app`

**Verify PeteTrain (main app) has it too:**

1. Select **PeteTrain** target
2. **Signing & Capabilities** → **App Groups**
3. Ensure `group.com.petetrain.app` is listed and checked

### Step 5: Embed Widget in Watch App

1. Select **PeteTrain** target (the main watch app)
2. Go to **General** tab
3. Scroll to **Frameworks, Libraries, and Embedded Content**
4. If **PeteTrainWidgets.appex** isn't listed:
   - Click **+**
   - Select **PeteTrainWidgets.appex**
   - Set Embed to **Embed Without Signing**

### Step 6: Build & Test

1. Select **PeteTrain** scheme (main app)
2. Build (⌘B) to verify no errors
3. Run on Apple Watch or Simulator

---

## 🎯 Testing Complications

### In Simulator

1. Run the app once
2. Press **⌘⇧H** twice to go to watch face
3. Force touch (long press) on watch face
4. Tap **Customize**
5. Swipe to complication slots
6. Find "Pete Train" in the list

### On Real Watch

1. On iPhone, open **Watch** app
2. Tap your watch face
3. Tap **Edit**
4. Add Pete Train to a complication slot

---

## 📁 File Structure

```
PeteTrainWidgets/
├── PeteTrainWidgets.swift       # Widget configuration & timeline provider
├── ComplicationViews.swift      # All 4 complication style views
├── SharedWorkoutData.swift      # Data model for app→widget sync
├── Info.plist                   # Widget extension config
├── PeteTrainWidgets.entitlements # App Groups entitlement
└── Assets.xcassets/             # Widget colors
```

**Main App Files Added:**

```
PeteTrain/Data/
└── WidgetDataSync.swift         # Syncs workout data to widget
```

---

## 🔄 How Data Syncs

1. **WorkoutViewModel** calls `WidgetDataSync.shared.updateWidget(...)` when:

   - Exercises are completed/uncompleted
   - Sections are completed
   - Day refreshes

2. **HealthKitManager** calls `WidgetDataSync.shared.setWorkoutActive(...)` when:

   - Live workout starts
   - Live workout ends

3. **Widget Timeline** refreshes every 15 minutes as backup

Data flows through **App Groups** (`group.com.petetrain.app`) using UserDefaults.

---

## 🐛 Troubleshooting

### Widget shows placeholder data

- Make sure App Groups are configured on BOTH targets
- Run the main app at least once to initialize data
- Force refresh: Settings → General → Reset → Reset Home Screen Layout

### "Cannot find type 'WidgetDataSync'"

- Make sure `WidgetDataSync.swift` is only in PeteTrain target, not the widget

### Widget doesn't update

- Check Console.app for "WidgetDataSync" logs
- Verify UserDefaults is being written:
  ```swift
  UserDefaults(suiteName: "group.com.petetrain.app")?.dictionaryRepresentation()
  ```

### Build errors about @main

- Only `PeteTrainWidgets.swift` should have `@main`
- Delete any auto-generated bundle files from Xcode template

---

## ✅ Success Checklist

- [ ] Widget Extension target added
- [ ] Auto-generated template files deleted
- [ ] Our 3 Swift files added to widget target
- [ ] App Groups configured on both targets
- [ ] Widget embedded in watch app
- [ ] Builds without errors
- [ ] Complication visible on watch face

---

## 🎨 Complication Previews

You can preview complications in Xcode:

1. Open `ComplicationViews.swift`
2. Editor → Canvas (or ⌥⌘↩)
3. See all 4 styles with different states

---

**Ready to build!** 🎉

Follow the 5 steps above and you'll have working watch complications in minutes.

