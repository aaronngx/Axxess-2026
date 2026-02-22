# 🔬 PROJECT X-RAY: AI Health Partner

Generated: 2026-02-21 (updated 2026-02-21)
By: Vibecode Kit v4.0 — XRAY Protocol

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [Feature Modules](#4-feature-modules)
5. [Key Components](#5-key-components)
6. [Navigation Reference](#6-navigation-reference)
7. [Data Models](#7-data-models)
8. [Environment & Config](#8-environment--config)
9. [Common Tasks](#9-common-tasks)
10. [Code Health](#10-code-health)
11. [Future Improvements](#11-future-improvements)

---

## 1. Overview

### What is this project?

**AI Health Partner** is a mobile health monitoring app for iOS (target: latest iPhone Pro Max). It reads real-time vitals from Apple Watch via HealthKit and provides two in-app clinical screening tools: an **Eye Vision Screening** flow and a **Hearing Screening** flow. All data stays on-device — no backend, no network calls (except optional AI summaries via Featherless.ai).

The app is being built for **Axxess 2026** as a demo/prototype of AI-assisted personal health screening.

> **Offline-first rule:** Core eye and hearing results must work with no internet connection. Featherless.ai is non-blocking — if AI fails, offline fallback templates are shown automatically.

### Tech Stack

| Category | Technology |
|---|---|
| Framework | React Native 0.74.5 + Expo SDK 51 |
| Language | TypeScript 5.3 |
| UI | React 18.2, Expo Vector Icons, Linear Gradient, BlurView |
| Navigation | @react-navigation/stack + @react-navigation/bottom-tabs |
| State Management | React Context API + hooks (no Redux) |
| Health Data | react-native-health (HealthKit), fallback to mock |
| Charts | react-native-chart-kit + react-native-svg |
| Storage | AsyncStorage (@react-native-async-storage/async-storage) |
| PDF/Export | expo-print + expo-sharing |
| AI | Featherless.ai (optional, offline fallback always active) |
| Camera | expo-camera (preview + capture only — not frame processing) |
| Sensors | expo-sensors (Accelerometer for stability detection) |
| Target Platform | iOS (portrait, dark UI) — Android emulator also supported |
| Bundle ID | com.axxess.aihealthpartner |

> **Camera note:** `expo-camera` is used for basic preview and the alignment overlay. It does **not** support high-frequency frame processing or real-time landmark detection. For iris/face landmarks in a future phase, migrate to **react-native-vision-camera** with frame processor plugins (requires dev client build — cannot run in Expo Go).

### Project History

- Created: ~2026-01 (initial frontend commit)
- Last feature: Hearing Screening + XRAY patches (2026-02-21)
- Built iteratively: Vitals → Eye Vision → Hearing
- Git branches: `frontend` (main) → `vision-screening` → current branch

---

## 2. Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS device or simulator (HealthKit requires physical device)
- Xcode (for native iOS builds)

### Installation

```bash
# Clone repo
git clone <repo-url>
cd Axxess-2026/AIHealthPartnerRN

# Install dependencies
npm install

# Copy env file (optional — needed only for AI features)
cp .env.example .env
# Edit .env and add your EXPO_PUBLIC_FEATHERLESS_API_KEY

# Start Expo dev server
npm start

# Web browser (fastest for UI iteration — no native modules)
npx expo start --web

# Android emulator (full native on Windows — no Mac needed)
npx expo run:android

# iOS device (requires Mac + Xcode)
npx expo run:ios --device
```

### Running Modes

| Mode | Command | HealthKit | Camera | Notes |
|---|---|---|---|---|
| Web browser | `npx expo start --web` | ❌ Mock | ⚠️ Basic (no accelerometer) | Best for UI iteration on Windows |
| Expo Go | `npx expo start --go` | ❌ Mock | ⚠️ Preview only | UI testing — landmarks not supported |
| Android emulator | `npx expo run:android` | ❌ Mock | ⚠️ Simulated | Full native on Windows |
| iOS device (dev) | `npx expo run:ios --device` | ✅ Real | ✅ Full | Requires Mac + Xcode |

> **Important for Eye Vision testing:**
> - Camera preview and stability gate: works in Expo Go and web (with bypass)
> - Real camera-dependent phases (landmarks, PD measurement): require a **dev client build** (`expo run:ios --device`)
> - Expo Go cannot validate camera-intensive phases

---

## 3. Architecture

### Directory Structure

```
AIHealthPartnerRN/
├── App.tsx                          # Entry point — SafeAreaProvider → AppNavigator
├── app.json                         # Expo config (bundle ID, HealthKit, camera plugin)
├── .env.example                     # Environment variable template (copy to .env)
├── package.json                     # Dependencies
│
└── src/
    ├── navigation/
    │   └── AppNavigator.tsx         # Root Stack + Bottom Tabs + all screen registrations
    │
    ├── screens/                     # 4 core tab screens
    │   ├── VitalsDashboard.tsx      # ❤️ Tab 1 — live vitals + screening entry cards
    │   ├── MentalHealthScreen.tsx   # 🧠 Tab 2
    │   ├── RecoveryScreen.tsx       # 🌿 Tab 3
    │   └── EmergencyScreen.tsx      # 🆘 Tab 4 — SOS
    │
    ├── components/                  # Shared UI components
    │   ├── VitalsCard.tsx           # Gradient metric card
    │   ├── AnomalyBanner.tsx        # Red-alert banner when vitals anomalous
    │   ├── ChatBubble.tsx           # AI chat bubble
    │   └── MoodSelector.tsx         # Mood input widget (Mental tab)
    │
    ├── hooks/
    │   └── useHealthData.ts         # HealthKit + mock polling hook (5s interval)
    │
    ├── services/
    │   └── MockDataService.ts       # Mock vitals generator (simulator fallback)
    │
    └── features/
        ├── eye/                     # Eye Vision Screening (Phases 1–13 complete)
        │   ├── EyeSessionContext.tsx
        │   ├── models/types.ts      # Also contains RootStackParamList
        │   ├── screens/             # 10 unique screen components (see flow below)
        │   ├── engine/              # Staircase + scoring + stimuli (SVG)
        │   ├── camera/              # Frame quality checker
        │   ├── ai/                  # Featherless.ai client + explainers
        │   ├── report/              # PDF template + export
        │   └── storage/             # eyeStorage.ts (AsyncStorage-backed)
        │
        └── hearing/                 # Hearing Screening (Phases 1–6 complete)
            ├── HearingSessionContext.tsx
            ├── models/types.ts
            ├── screens/             # 6 unique screen components
            ├── engine/              # Feature extraction + confidence + hearing age + safety
            ├── ai/                  # hearingExplainer.ts
            ├── report/              # PDF template + export
            └── storage/             # hearingStorage.ts (AsyncStorage-backed)
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                       App.tsx                           │
│              SafeAreaProvider                           │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  AppNavigator.tsx                       │
│         EyeSessionProvider                              │
│           HearingSessionProvider                        │
│             NavigationContainer                         │
│               RootStack                                 │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  TabsNavigator  │  │  Eye Screens │  │Hearing Scrns│ │
│  │  (4 tabs)       │  │  (10 unique) │  │(6 unique)   │ │
│  └────────┬────────┘  └──────────────┘  └─────────────┘ │
└───────────┼─────────────────────────────────────────────┘
            │
    ┌───────▼──────────────────────┐
    │     useHealthData hook        │
    │  ┌───────────┐ ┌──────────┐  │
    │  │ HealthKit │ │  Mock    │  │
    │  │ (device)  │ │(fallback)│  │
    │  └───────────┘ └──────────┘  │
    └──────────────────────────────┘
```

### Data Flow

```
User opens app
  → App.tsx mounts SafeAreaProvider
  → AppNavigator registers all screens + wraps session contexts
  → VitalsDashboard mounts → useHealthData starts polling (5s)
     → HealthKit available? → fetch real Apple Watch data
     → Not available?      → MockDataService generates mock readings
  → User taps "Eye Vision Check" card → navigates to EyeSafetyGate
     → flows through screens → writes to EyeSessionContext
     → EyeResults screen reads context → computes all engines → saves to AsyncStorage
  → User taps "Hearing Check" card → navigates to HearingEntry
     → flows through screens → writes to HearingSessionContext
     → HearingResults screen reads context → computes all engines → saves to AsyncStorage
```

---

## 4. Feature Modules

### 4a. Vitals Dashboard

Real-time health monitoring from Apple Watch. Polls every 5 seconds.

**Reads from HealthKit:**
- Heart Rate, Respiratory Rate, Blood Oxygen (SpO2)
- Heart Rate Variability (HRV), Resting Heart Rate, Step Count

**Anomaly Detection:** flags when HR > 100 or < 45, RR > 20 or < 10

**Fallback:** `MockDataService.ts` generates realistic synthetic readings for simulator use

---

### 4b. Eye Vision Screening

Full refractive screening flow. Phases 1–13 complete and TypeScript-clean.

**Unique screen components: 10**
**Route instances in full flow: 15** (EyeFarTest and EyeAstigDial reused 4× each with `{eye, run}` params)

**Navigation flow:**
```
EyeSafetyGate
  → EyeSetupCamera
  → EyePdLock
  → EyeFarTest {eye:'right', run:1}   ← EyeFarTest reused ×4
  → EyeAstigDial {eye:'right', run:1} ← EyeAstigDial reused ×4
  → EyeFarTest {eye:'left', run:1}
  → EyeAstigDial {eye:'left', run:1}
  → EyeFarTest {eye:'right', run:2}
  → EyeAstigDial {eye:'right', run:2}
  → EyeFarTest {eye:'left', run:2}
  → EyeAstigDial {eye:'left', run:2}
  → EyeNear
  → EyeContrast
  → EyeLowLight
  → EyeResults
  → EyeHistory (optional)
```

**What each screen does:**
| Screen | Purpose | Web/Expo Go |
|---|---|---|
| EyeSafetyGate | Red-flag symptom gate | ✅ |
| EyeSetupCamera | Camera preview + stability (accelerometer) | ⚠️ Web bypass active |
| EyePdLock | Pupillary distance (manual entry) | ✅ |
| EyeFarTest | Tumbling-E staircase for distance VA | ✅ |
| EyeAstigDial | Su-style astigmatism dial | ✅ |
| EyeNear | Near VA + reading distance + strain ratings | ✅ |
| EyeContrast | Contrast sensitivity forced-choice | ✅ |
| EyeLowLight | Dim environment gate + low-light vision test | ✅ |
| EyeResults | Full results + Vision Age + PDF + dev mode | ✅ |
| EyeHistory | Past sessions from AsyncStorage | ✅ |

**State:** `EyeSessionContext` holds the in-progress `EyeSessionResult`
**Storage:** `eyeStorage.ts` — AsyncStorage-backed, max 50 sessions, in-memory cache

---

### 4c. Hearing Screening

6-screen hearing assessment. Supports 3 input modes. Phases 1–6 complete.

**Navigation flow:**
```
HearingEntry
  → HearingPreCheck {source: 'apple'|'speech_in_noise'|'symptom_only'}
  → HearingAppleInput   (if source='apple')
  → HearingSpeechInNoise (if source='speech_in_noise')
  → HearingResults
  → HearingHistory (optional)
```

**Engine (all deterministic — no LLM in scoring):**
- `featureExtraction.ts` — PTA, pattern flags, hearing burden score
- `confidenceEngine.ts` — High/Medium/Low confidence from quality context
- `hearingAgeEngine.ts` — ISO 7029-inspired norm-based hearing age estimate
- `safetyRules.ts` — urgency + referral triggers (sudden loss, asymmetry, severe loss)

**AI:** `hearingExplainer.ts` — Featherless.ai for natural language; offline fallback always active

**State:** `HearingSessionContext`
**Storage:** `hearingStorage.ts` — AsyncStorage-backed, max 50 sessions

---

## 5. Key Components

### VitalsCard

**Location:** `src/components/VitalsCard.tsx`
**Props:** `label`, `value`, `unit`, `icon`, `gradientColors[]`, `isAnomalous?`

---

### AnomalyBanner

**Location:** `src/components/AnomalyBanner.tsx`
**Props:** `onDismiss`, `onCallEmergency`

---

### useHealthData

**Location:** `src/hooks/useHealthData.ts`
**Returns:** `heartRate`, `respiratoryRate`, `oxygenSaturation`, `heartRateHistory`, `isAnomalous`, `isLoading`, `lastUpdated`, `dataSource`
**Behavior:** Tries HealthKit first, falls back to mock. Polls every 5 seconds.

---

## 6. Navigation Reference

### Root Stack Screens

| Screen Name | Component | Params |
|---|---|---|
| `Tabs` | TabsNavigator | — |
| `EyeSafetyGate` | EyeSafetyGate | — |
| `EyeSetupCamera` | EyeSetupCamera | — |
| `EyePdLock` | EyePdLock | — |
| `EyeFarTest` | EyeFarTest | `{ eye: 'right'|'left', run: 1|2 }` |
| `EyeAstigDial` | EyeAstigDial | `{ eye: 'right'|'left', run: 1|2 }` |
| `EyeNear` | EyeNear | — |
| `EyeContrast` | EyeContrast | — |
| `EyeLowLight` | EyeLowLight | — |
| `EyeResults` | EyeResults | — |
| `EyeHistory` | EyeHistory | — |
| `HearingEntry` | HearingEntry | — |
| `HearingPreCheck` | HearingPreCheck | `{ source: 'apple'|'speech_in_noise'|'symptom_only' }` |
| `HearingAppleInput` | HearingAppleInput | — |
| `HearingSpeechInNoise` | HearingSpeechInNoise | — |
| `HearingResults` | HearingResults | — |
| `HearingHistory` | HearingHistory | — |

### Bottom Tabs

| Tab | Icon | Screen |
|---|---|---|
| Vitals | ❤️ | VitalsDashboard |
| Mental | 🧠 | MentalHealthScreen |
| Recovery | 🌿 | RecoveryScreen |
| Emergency | 🆘 | EmergencyScreen |

---

## 7. Data Models

### EyeSessionResult (abbreviated)

```typescript
{
  session_id: string;
  created_at: string;           // ISO date
  pd_mm: number | null;         // Pupillary distance
  runs: EyeRunResult[];         // Per-eye, per-run staircase data
  per_eye: EyeCombinedResult[]; // Averaged across 2 runs per eye
  functional: FunctionalVisionResult; // Near VA, strain, contrast, low-light
  quality: QualityMetrics;      // confidence_0to100, quality_label, reasons
  vision_age: VisionAgeResult | null;
  symptoms: { eye_strain, headaches_reading, ... }
}
```

### HearingSessionResult (abbreviated)

```typescript
{
  session_id: string;
  created_at: string;
  test_source: 'apple' | 'speech_in_noise' | 'symptom_only';
  left_dbhl: number | null;
  right_dbhl: number | null;
  audiogram_points_left: AudiogramPoint[] | null;
  sin_score: number | null;           // WHO hearWHO score 0–100
  symptoms: HearingSymptoms;
  pattern_flags: HearingPatternFlags;
  hearing_function_age: number | null;
  confidence: 'High' | 'Medium' | 'Low';
  urgency: 'routine' | 'soon' | 'urgent';
  recommended_next_step: 'retest' | 'audiologist' | 'doctor' | 'urgent_evaluation';
  ai_summary: string | null;
  ai_next_steps: string | null;
}
```

---

## 8. Environment & Config

### API Key Setup (required for AI features)

```bash
cp .env.example .env
# Edit .env:
# EXPO_PUBLIC_FEATHERLESS_API_KEY=your_key_here
```

> **Security rule:** Never hardcode API keys in source files. Use `EXPO_PUBLIC_*` env vars (Expo SDK 49+). The `.env` file is gitignored. The `.env.example` file (no real values) is safe to commit.

The app works fully offline without a key — offline fallback summaries are always active.

### app.json key settings

| Key | Value | Notes |
|---|---|---|
| `orientation` | portrait | Locked — vision tests require portrait |
| `userInterfaceStyle` | dark | Dark-only UI |
| `ios.bundleIdentifier` | com.axxess.aihealthpartner | Required for native build |
| `android.package` | com.axxess.aihealthpartner | Required for Android build |
| `plugins[expo-camera]` | cameraPermission set | iOS permission string for camera |
| `NSHealthShareUsageDescription` | set | HealthKit read permission |

---

## 9. Common Tasks

### Add a new screening feature (e.g. "Blood Pressure Check")

1. Create `src/features/bp/` mirroring `eye/` or `hearing/` structure
2. Add `BpSessionContext.tsx` using same pattern as `EyeSessionContext`
3. Create screens in `src/features/bp/screens/`
4. Register screens in `AppNavigator.tsx` → add to `RootStackParamList` in `types.ts`
5. Add entry card to `VitalsDashboard.tsx`

### Modify anomaly thresholds

Edit `checkAnomaly()` in `src/hooks/useHealthData.ts:86`

### Change the hardcoded user name

`src/screens/VitalsDashboard.tsx:53` — replace `"Good morning, Jerome 👋"` with dynamic user profile.

---

## 10. Code Health

### Status: 🟢 Prototype — Phases 1–13 Complete

```
🟢 TypeScript — 0 errors across all files
🟢 Navigation type-safe (RootStackParamList)
🟢 HealthKit graceful fallback to mock
🟢 Context API cleanly separates Eye and Hearing session state
🟢 AsyncStorage persistence implemented (Eye + Hearing history survives restart)
🟢 PDF export wired in EyeResults + HearingResults
🟢 Featherless.ai with offline fallback (both Eye + Hearing)
🟢 API keys read from EXPO_PUBLIC_* env vars (not hardcoded)
🟢 expo-camera plugin declared in app.json
🟢 Web bypass for accelerometer in EyeSetupCamera
🟡 No tests (unit or integration)
🟡 Hardcoded user name ("Jerome") in VitalsDashboard
🟡 Camera stability uses accelerometer only (no face landmarks)
🔴 Real-time landmarks/PD require react-native-vision-camera (future phase)
```

### Known TODOs (priority order)

**Priority 1 — Demo-critical:**
- [ ] Replace hardcoded "Jerome" greeting with dynamic user name
- [ ] Add "screening only — not a diagnosis" disclaimer to all results screens

**Priority 2 — Experience quality:**
- [ ] Replace accelerometer stability with real face detection (react-native-vision-camera)
- [ ] Add "uncorrected / with correction" tag to eye session + report
- [ ] Implement fast threshold strategy to reduce E-test trial count

**Priority 3 — Polish:**
- [ ] Add eslint + prettier config
- [ ] Add unit tests for engine logic (staircase, scoring, confidenceEngine, hearingAgeEngine)
- [ ] Replace `useNavigation<any>()` with typed navigation hooks throughout

---

## 11. Future Improvements

### Camera Upgrade Path

For real-time face landmarks and iris tracking (needed for accurate PD measurement):

1. Replace `expo-camera` with `react-native-vision-camera` v4
2. Add frame processor plugin (e.g. `vision-camera-face-detector`)
3. Requires **dev client build** — cannot run in Expo Go
4. Migrate `EyeSetupCamera` to use face bounding box instead of accelerometer

### Planned Feature Phases (Eye)

| Phase | Description | Status |
|---|---|---|
| 1 | Navigation + data model | ✅ Done |
| 2 | Camera + accelerometer stability | ✅ Done |
| 3 | PD Lock (manual entry) | ✅ Done |
| 4–6 | Staircase engine + TumblingE + AstigDial | ✅ Done |
| 7 | Merge runs + quality scoring | ✅ Done |
| 8 | Near module | ✅ Done |
| 9 | Contrast + low-light | ✅ Done |
| 10 | AsyncStorage history | ✅ Done |
| 11 | PDF export | ✅ Done |
| 12 | Featherless.ai integration | ✅ Done |
| 13 | Developer mode JSON export | ✅ Done |
| 14 | Real face landmarks (VisionCamera) | ⬜ Future |
| 15 | Real PD measurement via landmarks | ⬜ Future |

### Technical Debt

- [ ] Add unit tests for all engine modules
- [ ] Upgrade to Expo SDK 52+ (brings RN 0.76 with new architecture)
- [ ] Add EAS Build configuration for CI/CD

---

## Appendix

### Git Branch Structure

```
frontend (main)
  └── vision-screening
        └── current branch
```

### Key File Locations

| What | Where |
|---|---|
| App entry | `App.tsx` |
| Navigation + all routes | `src/navigation/AppNavigator.tsx` |
| Route type definitions | `src/features/eye/models/types.ts` → `RootStackParamList` |
| Vitals dashboard | `src/screens/VitalsDashboard.tsx` |
| HealthKit hook | `src/hooks/useHealthData.ts` |
| Eye session state | `src/features/eye/EyeSessionContext.tsx` |
| Hearing session state | `src/features/hearing/HearingSessionContext.tsx` |
| Eye staircase engine | `src/features/eye/engine/staircase.ts` |
| Eye scoring | `src/features/eye/engine/scoring.ts` |
| Hearing confidence engine | `src/features/hearing/engine/confidenceEngine.ts` |
| Hearing age engine | `src/features/hearing/engine/hearingAgeEngine.ts` |
| Safety rules (hearing) | `src/features/hearing/engine/safetyRules.ts` |
| AI client (eye) | `src/features/eye/ai/featherlessClient.ts` |
| AI client (hearing) | `src/features/hearing/ai/hearingExplainer.ts` |
| Env template | `.env.example` |

### Handover Checklist

```
DOCUMENTATION:
✅ PROJECT_XRAY.md — this file (up to date)
✅ .env.example — API key template committed
⬜ CHANGELOG.md — not present

CODE QUALITY:
✅ TypeScript — 0 errors
✅ No committed .env files
✅ API keys via EXPO_PUBLIC_* env vars
✅ AsyncStorage persistence implemented
⬜ No tests

BUILD:
✅ npx expo start --web — works
✅ npx expo start --go — works for UI
✅ npx expo run:android — works (requires Android Studio + emulator)
✅ npx expo run:ios --device — works (requires Mac + Xcode)
⬜ EAS Build — not configured
```

---

*Generated by Vibecode Kit v4.0 — XRAY Protocol*
*Project: AI Health Partner | Type: Mobile Health App | Complexity: Medium-High*
*Estimated onboarding time: 2–3 hours to understand, 1 day to be productive*
