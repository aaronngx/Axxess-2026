# PROJECT XRAY — AI Health Partner (Axxess 2026)
> Living reference doc. Last updated: 2026-02-22

---

## What This App Is

A proactive health companion for iPhone (Axxess Hackathon). Monitors vitals via HealthKit, provides AI-driven mental health support, and delivers clinical-grade screening features — all on-device with no backend.

**Pitch:** Think "annual physical in your pocket" — eye + hearing screenings, vitals anomaly detection, recovery tracking, and an AI chat companion.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 51 |
| Language | TypeScript 5.3 |
| React | 18.2, RN 0.74.5 |
| Navigation | @react-navigation/stack + bottom-tabs |
| State | React Context API + hooks (no Redux) |
| Health data | react-native-health (HealthKit) |
| AI/LLM | Featherless API (explanation layer only) |
| Storage | AsyncStorage (per-feature) |
| UI theme | Midnight Prism — dark (#161925 base), accent #42CAFD |

**No backend.** All data is local/mock. API key: `process.env.EXPO_PUBLIC_FEATHERLESS_API_KEY ?? ''`

---

## App Entry & Provider Hierarchy

```
App.tsx
└── EyeSessionProvider
    └── HearingSessionProvider
        └── NavigationContainer
            └── Stack.Navigator
                ├── Tabs (bottom tabs)
                └── [all feature screens]
```

**5 Bottom Tabs:** Vitals ❤️ | Mental 🧠 | Recovery 🌿 | Clinical 🏥 | Emergency 🆘

---

## Project Structure

```
AIHealthPartnerRN/
├── App.tsx
├── app.json                    # Expo config (expo-camera, expo-av, expo-font, expo-notifications)
├── build-android.bat           # Clears Gradle cache + runs npx expo run:android
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx    # All routes registered here
│   ├── screens/                # Core tab screens
│   │   ├── VitalsDashboard.tsx
│   │   ├── MentalHealthScreen.tsx
│   │   ├── RecoveryScreen.tsx
│   │   ├── ClinicalScreen.tsx  # Hub → launches Eye + Hearing flows
│   │   └── EmergencyScreen.tsx
│   ├── components/
│   │   ├── VitalsCard.tsx
│   │   ├── MoodSelector.tsx
│   │   ├── ChatBubble.tsx
│   │   ├── AnomalyBanner.tsx
│   │   └── VoiceCallModal.tsx
│   ├── context/
│   │   └── AppContext.tsx
│   ├── hooks/
│   │   └── useHealthData.ts    # HealthKit integration
│   ├── services/
│   │   ├── MockDataService.ts
│   │   └── AIService.ts
│   ├── theme/
│   │   └── Theme.ts            # Midnight Prism palette + typography
│   └── features/
│       ├── eye/                # Vision Screening (✅ complete, Phases 1–13)
│       └── hearing/            # Hearing Screening (✅ complete, Phases 1–6)
```

---

## Feature: Eye Vision Screening ✅

**Entry point:** ClinicalScreen → EyeSafetyGate

**Screen flow (15 route instances, 10 unique components):**
```
EyeSafetyGate → EyeSetupCamera → EyePdLock
  → EyeFarTest (right/run1) → EyeAstigDial (right/run1)
  → EyeFarTest (right/run2) → EyeAstigDial (right/run2)
  → EyeFarTest (left/run1)  → EyeAstigDial (left/run1)
  → EyeFarTest (left/run2)  → EyeAstigDial (left/run2)
  → EyeNear → EyeContrast → EyeLowLight
  → EyeResults → EyeHistory
```

**Key engine files:**
- `src/features/eye/engine/staircase.ts` — QUEST staircase algorithm
- `src/features/eye/engine/scoring.ts` — sphere/cylinder/axis scoring
- `src/features/eye/engine/pdEngine.ts` — native PD measurement (face landmarks)
- `src/features/eye/engine/pdEngineWeb.ts` — web fallback PD
- `src/features/eye/engine/stimuli.tsx` — optotype rendering
- `src/features/eye/camera/quality.ts` — frame quality assessment
- `src/features/eye/ai/featherlessClient.ts` — LLM explanation
- `src/features/eye/ai/explainers.ts` — offline fallback explanations
- `src/features/eye/storage/eyeStorage.ts` — AsyncStorage CRUD
- `src/features/eye/report/reportTemplate.ts` — PDF report template
- `src/features/eye/report/exportPdf.ts` — PDF export

**Models:** `src/features/eye/models/types.ts` — also holds `RootStackParamList` for ALL routes

**Web bypass:** `EyeSetupCamera` detects `Platform.OS === 'web'`, skips accelerometer, shows Continue button.

**PD measurement:** Touch-mark method on Android (commit `281ad67a`). Face-landmark method requires native camera (iOS EAS build).

---

## Feature: Hearing Screening ✅

**Entry point:** ClinicalScreen → HearingEntry

**3 test paths:**
1. Apple Hearing Test (import audiogram from Health app)
2. WHO hearWHO speech-in-noise (live audio test)
3. Symptoms-only (questionnaire fallback)

**Screen flow:**
```
HearingEntry → HearingPreCheck
  ├─ apple path    → HearingAppleInput
  ├─ speech path   → HearingSpeechInNoise
  └─ (symptom only skips to Results)
                  → HearingResults → HearingHistory
```

**Key engine files (all deterministic, no LLM):**
- `src/features/hearing/engine/featureExtraction.ts`
- `src/features/hearing/engine/confidenceEngine.ts`
- `src/features/hearing/engine/hearingAgeEngine.ts`
- `src/features/hearing/engine/safetyRules.ts`

**AI layer:** `src/features/hearing/ai/hearingExplainer.ts` — Featherless explanation only; offline fallback always provided.

**Storage:** `src/features/hearing/storage/hearingStorage.ts`

**Models:** `src/features/hearing/models/types.ts`

---

## Navigation Route Registry

All routes defined in `RootStackParamList` (`src/features/eye/models/types.ts`):

| Route | Params |
|---|---|
| Tabs | — |
| EyeSafetyGate | — |
| EyeSetupCamera | — |
| EyePdLock | — |
| EyeFarTest | `{ eye: EyeSide; run: 1 \| 2 }` |
| EyeAstigDial | `{ eye: EyeSide; run: 1 \| 2 }` |
| EyeNear | — |
| EyeContrast | — |
| EyeLowLight | — |
| EyeResults | — |
| EyeHistory | — |
| HearingEntry | — |
| HearingPreCheck | `{ source: 'apple' \| 'speech_in_noise' \| 'symptom_only' }` |
| HearingAppleInput | — |
| HearingSpeechInNoise | — |
| HearingResults | — |
| HearingHistory | — |

---

## Running the App

| Target | Command |
|---|---|
| Web (90% coverage) | `npx expo start --web` (no native camera/accel) |
| Android emulator | `npx expo start --go` → Expo Go on Medium_Phone_API_36.1 |
| iPhone on hotspot | `npx expo start` → open `http://172.20.10.3:8081` in Safari |
| Android native build | Run `build-android.bat` (clears Gradle cache, then `npx expo run:android`) |
| iOS native | Requires Mac (EAS Build, friend's Mac, or cloud Mac rental) |

**Expo Go APK:** `Exponent-2.31.2.apk` installed on emulator via ADB.

---

## Environment Variables

```
EXPO_PUBLIC_FEATHERLESS_API_KEY   # Optional — app works offline without it
```
Copy `.env.example` → `.env` and fill in key.

---

## app.json Plugins

- `expo-camera` (camera permission for eye screening)
- `expo-av` (audio for hearing test)
- `expo-font`
- `expo-notifications`

**Android package:** `com.axxess.aihealthpartner`
**iOS bundle ID:** `com.axxess.aihealthpartner`

---

## Android Native Build (`build-android.bat`)

The bat file:
1. Clears `%USERPROFILE%\.gradle\caches\8.6\scripts`
2. Runs `npx expo run:android`

**When you need to re-run it:**
- Added/removed a native module (new npm package with native code)
- Changed `android/` folder config
- Added/changed plugins in `app.json`
- First time setting up on a new machine

**When you do NOT need to re-run it:**
- JS/TS code changes only (hot reload handles this)
- Changing screen logic, UI, or feature code
- Updating `src/` files with no native dependency changes

---

## Known TODOs (priority order)

1. Unit tests for engine logic (`hearingAgeEngine`, `confidenceEngine`, `safetyRules`)
2. Replace hardcoded "Jerome" greeting with dynamic user profile
3. Add "screening only — not a medical device" disclaimer to results screens
4. Migrate camera to `react-native-vision-camera` for real-time face landmarks
5. Add server-side proxy for Featherless API key (v2 security)

---

## Git Branches

| Branch | Purpose |
|---|---|
| `frontend` | Main branch (PR target) |
| `feature` | Current working branch — all features merged here |

Recent merges into `feature`:
- `vision-screening` (eye feature, Phases 1–13)
- `hearing-test` (hearing feature, Phases 1–6)
- `data-exploration`
- Android touch-mark PD measurement (`281ad67a`)
- Midnight Prism UI consolidation (`9465706c`)
