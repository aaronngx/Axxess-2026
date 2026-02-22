# 🔬 PROJECT XRAY — AI Health Partner RN

> **Scan Date:** 2025-07-21
> **Scanner:** Codebase Analyst XRAY v4
> **Project Root:** `AIHealthPartnerRN/`

---

## 1. PROJECT OVERVIEW

| Property             | Value                                          |
|----------------------|------------------------------------------------|
| **Project Name**     | AI Health Partner                               |
| **Type**             | Mobile Application (iOS + Android)              |
| **Framework**        | React Native 0.74.5 + Expo SDK 51               |
| **Language**         | TypeScript 5.3 (strict mode)                    |
| **Styling**          | React Native StyleSheet + expo-linear-gradient   |
| **State Management** | React Context API + AsyncStorage persistence     |
| **Navigation**       | React Navigation v6 (Bottom Tabs)                |
| **AI Backend**       | Groq API (LLama 3.3 70B) + Whisper STT           |
| **Voice TTS**        | ElevenLabs API (Bella voice) + expo-speech fallback |
| **Build System**     | Expo CLI / Metro Bundler                         |
| **UI Theme**         | Dark mode only (`#161925` base)                  |
| **Bundle ID**        | `com.axxess.aihealthpartner`                     |
| **Target**           | Axxess 2026 Hackathon                            |

---

## 2. CODEBASE METRICS

| Metric                     | Count |
|----------------------------|-------|
| **Total Source Files (src/)** | 19 (14 .tsx + 5 .ts) |
| **Root Config Files**       | 7 (App.tsx, package.json, tsconfig.json, app.json, babel.config.js, metro.config.js, .gitignore) |
| **Screens**                 | 5     |
| **Reusable Components**     | 5     |
| **Custom Hooks**            | 2 (useHealthData, useDistanceMonitor) |
| **Services**                | 2 (AIService, MockDataService) |
| **Context Providers**       | 1 (AppContext) |
| **Feature Modules**         | 1 (eye tracking) |
| **Estimated LoC (src/)**    | ~2,800 |
| **Dependencies**            | 21 production + 4 dev |
| **Nav Tabs**                | 5     |

---

## 3. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx (Entry)                         │
│   SafeAreaProvider → AppProvider (Context) → AppNavigator       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   AppNavigator.tsx   │
                    │  (Bottom Tab Nav)    │
                    └──────────┬──────────┘
                               │
          ┌────────┬───────────┼───────────┬──────────┐
          │        │           │           │          │
     ┌────┴───┐ ┌──┴──┐  ┌────┴───┐  ┌────┴───┐ ┌───┴────┐
     │ Vitals │ │Mental│  │Recovery│  │Clinical│ │  SOS   │
     │  ❤️    │ │ 🧠   │  │  🌿    │  │  🏥    │ │  🆘   │
     └───┬────┘ └──┬──┘  └────┬───┘  └────┬───┘ └───┬────┘
         │         │          │           │          │
    ┌────┴────┐  ┌─┴──────────┴───┐  ┌────┴────┐  ┌─┴─────────┐
    │VitalsCard│  │  AppContext    │  │Symptom  │  │Emergency  │
    │Anomaly   │  │  (Global      │  │Logger   │  │Contacts   │
    │Banner    │  │   State)      │  │DateTime │  │SOS Alert  │
    │LineChart │  │               │  │Picker   │  │Call/SMS   │
    └─────────┘  └───────┬───────┘  └─────────┘  └───────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────┴────┐ ┌───┴───┐ ┌───┴──────────┐
         │AI Chat  │ │Mood   │ │VoiceCallModal│
         │(Groq)   │ │Journal│ │(ElevenLabs   │
         │         │ │       │ │ + Whisper)    │
         └────┬────┘ └───────┘ └──────────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───┴────┐ ┌──┴──┐ ┌───┴──────────┐
│AIService│ │Mock │ │useHealthData │
│(Groq   │ │Data │ │(Vitals Hook) │
│ API)   │ │Svc  │ │              │
└────────┘ └─────┘ └──────────────┘

┌─────────────────────────────────────────────┐
│        features/eye/ (Eye Tracking)         │
│                                             │
│  tracking/                                  │
│  ├─ useDistanceMonitor.ts (VisionCamera)    │
│  ├─ EsdHud.tsx (Distance HUD)              │
│  ├─ DevStepOverlay.tsx (Dev debug banner)   │
│  └─ eye_debug_findings.md (Bug docs)       │
└─────────────────────────────────────────────┘
```

---

## 4. KEY DEPENDENCIES

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~51.0.0 | Core SDK — managed workflow, dev server, OTA updates |
| `react-native` | 0.74.5 | Cross-platform UI framework |
| `react` | 18.2.0 | Component-based UI library |
| `@react-navigation/native` | ^6.1.17 | Navigation container & core |
| `@react-navigation/bottom-tabs` | ^6.5.20 | Bottom tab navigator (5 tabs) |
| `@react-navigation/stack` | ^6.3.29 | Stack navigator (declared, used by eye exam flow) |
| `@react-native-async-storage/async-storage` | 1.23.1 | Persistent key-value storage for user data |
| `@react-native-community/datetimepicker` | 8.0.1 | Native date/time picker for appointments |
| `expo-av` | ~14.0.7 | Audio recording (mic) + playback (TTS audio files) |
| `expo-speech` | ~12.0.2 | Fallback text-to-speech (system voices) |
| `expo-haptics` | ~13.0.1 | Haptic feedback on interactions |
| `expo-notifications` | ~0.28.19 | Appointment reminders / push notifications |
| `expo-file-system` | ~17.0.1 | File I/O for TTS audio cache |
| `expo-blur` | ~13.0.2 | Blur effects on tab bar + voice modal |
| `expo-linear-gradient` | ~13.0.2 | Gradient backgrounds on all screens |
| `expo-status-bar` | ~1.12.1 | Status bar styling |
| `expo-font` | ~12.0.10 | Custom font loading |
| `react-native-chart-kit` | ^6.12.0 | Heart rate trend line chart |
| `react-native-gesture-handler` | ~2.16.1 | Gesture system for navigation |
| `react-native-reanimated` | ~3.10.1 | Performant animations (pulse effects, slide-ins) |
| `react-native-safe-area-context` | 4.10.5 | Safe area insets for notch devices |
| `react-native-screens` | ~3.31.1 | Native screen containers |
| `react-native-svg` | 15.2.0 | SVG rendering (used by chart-kit) |
| `@expo/vector-icons` | ^14.0.2 | Icon library (available but emoji used primarily) |
| `@expo/ngrok` | ^4.1.3 | Tunnel for remote device testing |
| `base-64` | ^1.0.0 | Base64 encoding for ElevenLabs audio conversion |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@babel/core` | ^7.24.0 | Babel transpiler core |
| `@types/base-64` | ^1.0.2 | TypeScript types for base-64 |
| `@types/react` | ~18.2.79 | TypeScript types for React |
| `typescript` | ~5.3.3 | TypeScript compiler |

---

## 5. CONFIGURATION FILES

### `app.json`
- **App name:** "AI Health Partner"
- **Orientation:** Portrait locked
- **UI Style:** Dark mode only
- **Splash background:** `#0A0A1A`
- **iOS permissions:** Microphone, Speech Recognition
- **Android permissions:** RECORD_AUDIO, MODIFY_AUDIO_SETTINGS
- **Plugins:** expo-av, expo-font

### `tsconfig.json`
- Extends `expo/tsconfig.base`
- **Strict mode** enabled
- Path alias: `@/*` → `src/*`

### `babel.config.js`
- Preset: `babel-preset-expo`
- Plugin: `react-native-reanimated/plugin` (must be last)

### `metro.config.js`
- Default Expo Metro config (no customizations)

### `.gitignore`
- Ignores `node_modules/` and `.expo/`

---

## 6. FEATURE MAP

### ❤️ Vitals Dashboard (`VitalsDashboard.tsx`)
- **Live vitals display** — Heart rate, respiratory rate, blood oxygen, status
- **Real-time chart** — Bezier line chart showing last 20 heart rate readings
- **Anomaly detection** — Visual alerts when HR > 100 or < 45, RR out of range
- **Auto-refresh** — Data updates every 5 seconds via `useHealthData` hook
- **Animated pulse** — Cards pulse when anomalous readings detected
- **AnomalyBanner** — Slide-down alert offering emergency contact

### 🧠 Mental Health (`MentalHealthScreen.tsx`)
- **AI Chat** — Full conversational AI powered by Groq (LLama 3.3 70B)
  - System prompt includes full user health context (vitals, mood, symptoms, tasks)
  - Context-aware responses referencing user's actual data
  - Tag-based action system: `[[ADD_TASK:...]]` and `[[REMOVE_TASK:...]]` parsed from AI responses
  - Keyword detection fallback for task management intents
- **Voice Input** — Hold-to-record microphone, Whisper transcription via Groq
- **Voice Call Mode** — Full-screen modal simulating a phone call with AI
  - ElevenLabs neural TTS (Bella voice) with expo-speech fallback
  - Auto-listen after AI finishes speaking (Alexa-style)
  - Silence detection (3s timeout) auto-processes speech
  - Speaker toggle, volume visualization, status indicators
- **Mood Journal** — Emoji-based mood selector (5 levels) with notes
  - Persistent mood history via AppContext + AsyncStorage
  - Streak tracking display
- **Action Overlays** — Popup confirmations for AI-suggested task add/remove

### 🌿 Recovery (`RecoveryScreen.tsx`)
- **Task checklist** — Daily recovery tasks with toggle completion
- **Progress tracking** — Visual progress bar with completion percentage
- **Category system** — Tasks categorized as exercise/nutrition/mental/sleep with icons
- **Recovery summary** — Medical context card with guidance
- **AI integration** — Tasks can be added/removed via AI chat

### 🏥 Clinical (`ClinicalScreen.tsx`)
- **Appointment scheduler** — Date/time picker for next doctor visit
- **Notification reminders** — 1-hour-before push notification via expo-notifications
- **Symptom logger** — Free-text symptom tracking with timestamps
- **Symptom management** — Add/remove symptoms, persistent via AppContext

### 🆘 Emergency (`EmergencyScreen.tsx`)
- **SOS button** — Large emergency button sending alerts to all contacts
- **Direct 911 call** — One-tap `tel:911` link
- **Contact management** — Full CRUD for emergency contacts (modal form)
- **Call/SMS actions** — Direct call or pre-written SMS to any contact
- **Haptic feedback** — Warning haptics on SOS activation

### 👁️ Eye Tracking Feature (`features/eye/`)
- **Distance monitoring** — Real-time face-to-phone distance via VisionCamera
  - MLKit face detector measures face width in pixels
  - Distance formula: `distance_cm = CALIBRATION_K / face_width_px`
  - Calibration constant: K=6200 (tuned for Pixel 7 front camera)
  - Zone system: too_close (<35cm), ok (35-50cm), too_far (>50cm), no_face
- **ESD HUD** — Distance overlay with bar visualization and zone labels
  - Full card mode with distance bar (20-70cm range)
  - Compact badge mode for exam screens
- **Dev Step Overlay** — Yellow debug banner showing step/total/eye/run (dev only)
- **Graceful degradation** — Falls back to no-op when Worklets native module unavailable

---

## 7. DATA FLOW

```
┌──────────────┐     5s interval      ┌──────────────────┐
│ MockDataSvc  │ ──────────────────── │  useHealthData   │
│ (Vitals Gen) │                      │  (Custom Hook)   │
└──────────────┘                      └────────┬─────────┘
                                               │ returns HealthData
                                               ▼
                                      ┌────────────────────┐
                                      │   Screen Components │
                                      │  (consume via hook) │
                                      └────────┬───────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                              ▼                ▼                ▼
                     ┌────────────┐   ┌──────────────┐  ┌───────────┐
                     │ VitalsDash │   │ MentalHealth │  │ VoiceCall │
                     │  (display) │   │  (AI context)│  │  (vitals  │
                     └────────────┘   └──────┬───────┘  │  context) │
                                             │          └─────┬─────┘
                                             ▼                │
                                      ┌──────────────┐       │
                                      │  AIService    │◄──────┘
                                      │  (Groq API)   │
                                      └──────┬───────┘
                                             │ response text
                                             ▼
                                    ┌──────────────────┐
                                    │ Parse Action Tags │
                                    │ [[ADD_TASK:...]]  │
                                    │ [[REMOVE_TASK:..]]│
                                    └──────┬───────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     AppContext (React Context)                │
│                                                              │
│  State:                        Persistence:                  │
│  ├─ moodHistory[]              AsyncStorage                  │
│  ├─ symptomLog[]               key: @ai_health_partner_data_v2│
│  ├─ appointment{}              ┌──────────────────┐          │
│  ├─ recoveryTasks[]  ◄────────►│  AsyncStorage    │          │
│  └─ emergencyContacts[]        │  (JSON blob)     │          │
│                                └──────────────────┘          │
│  Actions:                                                    │
│  addMood, addSymptom, removeSymptom, updateAppointment,      │
│  toggleRecoveryTask, addRecoveryTask, removeRecoveryTask,    │
│  addEmergencyContact, updateEmergencyContact,                │
│  deleteEmergencyContact                                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────── Voice Pipeline ────────────────────────┐
│                                                            │
│  User speaks → expo-av Recording → audio file URI          │
│       │                                                    │
│       ▼                                                    │
│  Groq Whisper API (STT) → transcript text                  │
│       │                                                    │
│       ▼                                                    │
│  Groq LLama 3.3 API (Chat) → AI response text             │
│       │                                                    │
│       ▼                                                    │
│  ElevenLabs API (TTS) → MP3 → expo-file-system cache       │
│       │                                                    │
│       ▼                                                    │
│  expo-av Sound playback → audio out                        │
│       │                                                    │
│       ▼                                                    │
│  onFinish → auto-restart listening (loop)                  │
└────────────────────────────────────────────────────────────┘
```

---

## 8. KEY FILES

### Root Level

| File | Purpose |
|------|---------|
| `App.tsx` | Entry point — wraps app in SafeAreaProvider → AppProvider → AppNavigator |
| `package.json` | Dependencies, scripts (`start`, `android`, `ios`, `web`) |
| `app.json` | Expo config — permissions, bundle ID, plugins, splash |
| `tsconfig.json` | TypeScript strict config with `@/*` path alias |
| `babel.config.js` | Babel preset + Reanimated plugin |
| `metro.config.js` | Default Expo Metro bundler config |
| `build_log.txt` | iOS build log (contains known xcodebuild error) |

### `src/navigation/`

| File | Purpose |
|------|---------|
| `AppNavigator.tsx` | Bottom tab navigator with 5 tabs (Vitals, Mental, Recovery, Clinical, Emergency). Uses emoji icons with blur tab bar background. |

### `src/screens/`

| File | Lines | Purpose |
|------|-------|---------|
| `VitalsDashboard.tsx` | ~170 | Live vitals dashboard with heart rate chart, anomaly detection, health tips |
| `MentalHealthScreen.tsx` | ~650 | AI chat + mood journal with voice input, action tag parsing, voice call trigger |
| `RecoveryScreen.tsx` | ~146 | Recovery task checklist with progress tracking and categories |
| `ClinicalScreen.tsx` | ~253 | Appointment scheduling with reminders + symptom logger |
| `EmergencyScreen.tsx` | ~360 | SOS button, 911 call, emergency contact CRUD with call/SMS |

### `src/components/`

| File | Purpose |
|------|---------|
| `VitalsCard.tsx` | Gradient card displaying a single vital metric with anomaly pulse animation |
| `AnomalyBanner.tsx` | Slide-down alert banner when vital anomalies detected |
| `ChatBubble.tsx` | Chat message bubble (user=purple right, AI=translucent left with 🤖 avatar) |
| `MoodSelector.tsx` | 5-emoji mood picker row (😞😕😐😊🤩) |
| `VoiceCallModal.tsx` | Full-screen voice call interface with ElevenLabs TTS, Whisper STT, auto-listen loop |

### `src/context/`

| File | Purpose |
|------|---------|
| `AppContext.tsx` | Global state provider — mood history, symptoms, appointments, tasks, contacts. Auto-persists to AsyncStorage. |

### `src/hooks/`

| File | Purpose |
|------|---------|
| `useHealthData.ts` | Mock vitals generator — simulates heart rate, respiratory rate, SpO2, HRV, steps. Polls every 5s. Anomaly detection logic. |

### `src/services/`

| File | Purpose |
|------|---------|
| `AIService.ts` | Groq API integration — LLM chat (LLama 3.3 70B), Whisper STT, ElevenLabs TTS. Full health context injected into system prompt. |
| `MockDataService.ts` | Mock data generators — vitals, mood history, chat history, recovery tasks, emergency contacts. Type definitions for shared interfaces. |

### `src/theme/`

| File | Purpose |
|------|---------|
| `Theme.ts` | Color palette (background: `#161925`, primary: `#235789`, secondary: `#42CAFD`, accent: `#DBCFB0`, alert: `#D33F49`) + spacing constants |

### `src/features/eye/tracking/`

| File | Purpose |
|------|---------|
| `useDistanceMonitor.ts` | Real-time face distance via VisionCamera + MLKit face detector. Graceful fallback when Worklets unavailable. |
| `EsdHud.tsx` | Distance HUD component — full card with distance bar or compact badge mode |
| `DevStepOverlay.tsx` | Dev-only yellow banner showing current exam step/eye/run |

### `src/features/eye/`

| File | Purpose |
|------|---------|
| `eye_debug_findings.md` | Detailed bug investigation log documenting 7 bugs found and fixed in the eye exam flow |

---

## 9. NAVIGATION STRUCTURE

```
BottomTabNavigator
├── ❤️ "Vitals"     → VitalsDashboard
├── 🧠 "Mental"     → MentalHealthScreen
│   ├── Tab: "💬 AI Chat"
│   │   └── VoiceCallModal (full-screen modal)
│   └── Tab: "📔 Mood Journal"
├── 🌿 "Recovery"   → RecoveryScreen
├── 🏥 "Clinical"   → ClinicalScreen
└── 🆘 "SOS"        → EmergencyScreen
    └── Modal: Add/Edit Contact
```

- Tab bar uses `expo-blur` for frosted glass effect
- Each tab has a custom active color and emoji icon
- Tab bar height: 96px, positioned absolutely at bottom
- No nested stack navigators in main app (stack navigator dependency exists for eye exam flow)

---

## 10. API INTEGRATIONS

### Groq API (LLM + STT)
- **Chat Completion:** `https://api.groq.com/openai/v1/chat/completions`
  - Model: `llama-3.3-70b-versatile`
  - Temperature: 0.7
  - Last 10 messages sent as context
  - Full health profile injected in system prompt
- **Speech-to-Text:** `https://api.groq.com/openai/v1/audio/transcriptions`
  - Model: `whisper-large-v3-turbo`
  - Language: English (forced)
  - Input: m4a audio from expo-av recording

### ElevenLabs API (TTS)
- **Endpoint:** `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Voice:** Bella (`hpp4J3VqNfWAUOO0d1Us`) — female
- **Model:** `eleven_multilingual_v2`
- **Output:** ArrayBuffer → Base64 → file URI via expo-file-system
- **Fallback:** expo-speech system TTS when ElevenLabs fails

---

## 11. ENVIRONMENT SETUP

### Prerequisites
- **Node.js** ≥ 18
- **npm** or **yarn**
- **Expo CLI** (comes with `npx expo`)
- **Expo Go** app on iOS/Android device (for managed workflow)
- For native builds: Xcode (iOS) or Android Studio (Android)

### API Keys Required (in `src/services/AIService.ts`)
- `GROQ_API_KEY` — for LLM chat and Whisper transcription
- `ELEVENLABS_API_KEY` — for neural TTS (optional, falls back to system voice)

### Device Permissions
- **Microphone** — Voice recording for AI chat and voice call
- **Speech Recognition** — iOS speech recognition usage
- **Notifications** — Appointment reminders

---

## 12. HOW TO RUN

### Quick Start (Expo Go — No Build)
```bash
cd AIHealthPartnerRN
npm install
npx expo start
```
Scan QR code with Expo Go app on your device.

### iOS Native Build
```bash
cd AIHealthPartnerRN
npm install
npx expo run:ios
```
> ⚠️ Requires macOS + Xcode. See Known Issues for build error.

### Android Native Build
```bash
cd AIHealthPartnerRN
npm install
npx expo run:android
```

### Development Scripts
```bash
npm start        # Start Expo dev server
npm run android  # Build & run on Android
npm run ios      # Build & run on iOS
npm run web      # Start web version
```

---

## 13. KNOWN ISSUES

### 🔴 iOS Build Error — Missing `main.jsbundle`
**File:** `build_log.txt`
```
❌ error: lstat(.../ios/main.jsbundle): No such file or directory (2)
   (in target 'AIHealthPartner' from project 'AIHealthPartner')
CommandError: Failed to build iOS project. "xcodebuild" exited with error code 65.
```
**Cause:** The JavaScript bundle wasn't generated before the native build step.
**Fix:** Run `npx expo export` first, or ensure the bundle phase completes before linking.

### 🟡 VisionCamera Frame Processors — Windows/ninja/CMake Build Issue
The eye tracking feature (`useDistanceMonitor.ts`) depends on `react-native-vision-camera` with frame processors powered by `react-native-worklets-core`. On **Windows**, the native build for Worklets can fail due to:
- **ninja** build system not found or not in PATH
- **CMake** version incompatibilities with the Worklets C++ code
- Missing Visual Studio C++ build tools

The code includes **graceful degradation**: when the Worklets TurboModule isn't available, `useDistanceMonitor` falls back to a no-op implementation that always returns `no_face`. This means the eye exam screens still render and function — they just don't have real-time distance monitoring.

**Workaround:** Build on macOS (for iOS) or ensure Android NDK + CMake are properly configured on Windows.

### 🟡 API Keys Hardcoded
`AIService.ts` contains API keys inline. These should be moved to environment variables (`.env` file with `expo-constants` or `react-native-dotenv`).

### 🟡 PD Measurement Always 63mm
The pupillary distance measurement in the eye exam uses a placeholder algorithm that always returns 63mm due to deterministic jitter resolving to zero (`(10 % 3 - 1) * 0.8 = 0`). A random jitter fix was applied, but real iris-based PD measurement requires a VisionCamera + MediaPipe Iris pipeline. See `eye_debug_findings.md` Bug 4 for full analysis.

### 🟡 Mock Data Only
`useHealthData.ts` only returns mock (simulated) vitals. Real Apple HealthKit / Google Fit integration would require a native build + appropriate libraries (`react-native-health` for iOS, `react-native-google-fit` for Android).

### 🟡 Emergency Calls on Simulator
`Linking.openURL('tel:...')` and `sms:` URLs only work on real devices — they do nothing on simulators/emulators.

---

## 14. DIRECTORY TREE

```
AIHealthPartnerRN/
├── App.tsx                          # Entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config (strict)
├── babel.config.js                  # Babel + Reanimated plugin
├── metro.config.js                  # Metro bundler config
├── build_log.txt                    # iOS build log (error)
├── README.md                        # Quick start guide
├── .gitignore                       # node_modules, .expo
├── assets/
│   └── icon.png                     # App icon
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx         # Bottom tab navigator (5 tabs)
│   ├── screens/
│   │   ├── VitalsDashboard.tsx      # Live vitals + chart
│   │   ├── MentalHealthScreen.tsx   # AI chat + mood journal
│   │   ├── RecoveryScreen.tsx       # Task checklist
│   │   ├── ClinicalScreen.tsx       # Appointments + symptoms
│   │   └── EmergencyScreen.tsx      # SOS + contacts
│   ├── components/
│   │   ├── VitalsCard.tsx           # Vitals display tile
│   │   ├── AnomalyBanner.tsx        # Anomaly alert overlay
│   │   ├── ChatBubble.tsx           # Chat message bubble
│   │   ├── MoodSelector.tsx         # Emoji mood picker
│   │   └── VoiceCallModal.tsx       # Voice call interface
│   ├── context/
│   │   └── AppContext.tsx           # Global state + AsyncStorage
│   ├── hooks/
│   │   └── useHealthData.ts         # Mock vitals generator
│   ├── services/
│   │   ├── AIService.ts             # Groq + ElevenLabs APIs
│   │   └── MockDataService.ts       # Mock data generators
│   ├── theme/
│   │   └── Theme.ts                 # Color palette + spacing
│   └── features/
│       └── eye/
│           ├── eye_debug_findings.md # Bug investigation log
│           └── tracking/
│               ├── useDistanceMonitor.ts  # VisionCamera distance
│               ├── EsdHud.tsx             # Distance HUD
│               └── DevStepOverlay.tsx     # Dev step banner
├── android/                         # Android native project
├── ios/                             # iOS native project
└── node_modules/                    # Dependencies
```

---

## 15. THEME & DESIGN SYSTEM

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#161925` | Base background color (all screens) |
| `primary` | `#235789` | Primary brand blue |
| `secondary` | `#42CAFD` | Accent cyan (tabs, links, buttons) |
| `accent` | `#DBCFB0` | Warm accent (tips, highlights) |
| `alert` | `#D33F49` | Error/emergency red |
| `text` | `#FFFFFF` | Primary text color |
| `textSecondary` | `rgba(255,255,255,0.65)` | Secondary text |
| `cardBackground` | `rgba(255,255,255,0.05)` | Card surfaces |
| `border` | `rgba(255,255,255,0.1)` | Card borders |

Each screen uses a unique gradient overlay via `expo-linear-gradient`:
- **Vitals:** `#161925 → #235789 → #161925` (blue)
- **Mental:** `#161925 → #FF758C → #161925` (pink)
- **Recovery:** `#161925 → #128208 → #161925` (green)
- **Clinical:** `#161925 → #235789 → #161925` (blue)
- **Emergency:** `#161925 → #D33F49 → #161925` (red)

---

## 16. STATE PERSISTENCE

All user data is persisted to `AsyncStorage` under the key `@ai_health_partner_data_v2`:

```json
{
  "moodHistory": [{ "id": "...", "emoji": "😊", "note": "...", "timestamp": "..." }],
  "symptomLog": [{ "id": "...", "text": "...", "timestamp": "..." }],
  "appointment": { "date": "ISO string", "reminderEnabled": true },
  "recoveryTasks": [{ "id": "...", "title": "...", "description": "...", "completed": false, "category": "exercise" }],
  "emergencyContacts": [{ "id": "...", "name": "...", "relationship": "...", "phone": "..." }]
}
```

- **Auto-save:** `useEffect` triggers save on any state change
- **Auto-load:** Data loaded from storage on app launch
- **Loading state:** `isLoading` flag prevents premature saves during initialization

---

*Generated by XRAY Codebase Analyst — scan complete.*
