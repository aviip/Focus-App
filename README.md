# Focus — React Native + Expo

Port of the native Android Focus MVP. UI is React Native (TypeScript); Accessibility service,
usage-access check, app discovery and block screen live in a local Expo module
(`modules/focus-native`, Kotlin).

## Structure
- `App.tsx` — dashboard, focus session, app picker, limits, permission status
- `src/store.ts` — AsyncStorage persistence (replaces SharedPreferences settings)
- `modules/focus-native/` — local Expo native module
  - `FocusNativeModule.kt` — JS bridge (apps, permissions, settings intents, config, usage)
  - `FocusAccessibilityService.kt` — foreground tracking + enforcement
  - `BlockActivity.kt` — block screen
  - `Prefs.kt` — native-side config and per-day usage counters

## Run
This **cannot run in Expo Go** (custom native code). Use a dev build:

    npm install
    npx expo run:android      # real device recommended

Then in the app: grant Usage access, enable "Focus app monitor" in Accessibility settings,
pick apps, set a small limit (e.g. 5m) and open the app to test.

## Notes
- Android only. iOS would need the Screen Time / FamilyControls APIs (special Apple entitlement) — not included.
- Same limitations as the original: counting can have gaps and the block screen is not tamper-proof.
- Not compiled or device-tested here. Pinned to Expo SDK 52 (matches Kotlin 2.0.21 / AGP 8.7 from your Gradle files).
- Review Google Play's Accessibility API policy before publishing.
