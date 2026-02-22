<div align="center">

# 🏥 AI Health Partner

### Your AI-Powered Health Companion

![React Native](https://img.shields.io/badge/React_Native-0.74.5-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo_SDK-51-000020?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-green?style=for-the-badge&logo=apple&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)
![Hackathon](https://img.shields.io/badge/🏆_Axxess-2026_Hackathon-gold?style=for-the-badge)

<br/>

> 🩺 A fullscreen, dark-themed health companion app with **AI-powered chat**, **real-time vitals monitoring**, **eye tracking**, and **voice call mode** — built for the Axxess 2026 Hackathon.

<br/>

![AI](https://img.shields.io/badge/🤖_AI-Groq_LLama_3.3_70B-orange?style=flat-square)
![Voice](https://img.shields.io/badge/🗣️_Voice-ElevenLabs_TTS-purple?style=flat-square)
![STT](https://img.shields.io/badge/🎙️_STT-Whisper_Large_v3-blue?style=flat-square)
![Camera](https://img.shields.io/badge/👁️_Eye_Tracking-VisionCamera-green?style=flat-square)

</div>

---

## 📱 Screens & Features

| Tab | Screen | Description |
|:---:|--------|-------------|
| ❤️ | **Vitals Dashboard** | Live heart rate, respiratory rate, SpO₂ — auto-refreshes every 5s with anomaly detection & animated pulse alerts |
| 🧠 | **Mental Health** | AI chat companion (Groq LLama 3.3) + mood journal + full voice call mode with ElevenLabs neural TTS |
| 🌿 | **Recovery** | Daily recovery task checklist with progress tracking, categories (exercise/nutrition/mental/sleep) |
| 🏥 | **Clinical** | Appointment scheduler with push notification reminders + symptom logger |
| 🆘 | **Emergency SOS** | One-tap SOS button, direct 911 call, emergency contact management with call/SMS |

### 👁️ Eye Tracking (Bonus Feature)
- Real-time face-to-phone distance monitoring via **VisionCamera + MLKit**
- Distance zones: too close (<35cm) · ok (35-50cm) · too far (>50cm)
- HUD overlay with distance bar visualization

---

## 🏗️ Architecture

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
         │    ┌────┴────┐     │           │     ┌────┴─────┐
         │    │AI Chat  │     │           │     │Emergency │
         │    │Voice Call│    │           │     │Contacts  │
         │    └────┬────┘     │           │     └──────────┘
         │         │          │           │
         └─────────┼──────────┼───────────┘
                   │          │
              ┌────┴──────────┴────┐
              │    AppContext      │
              │  (Global State)   │
              │  + AsyncStorage   │
              └───────┬───────────┘
                      │
            ┌─────────┼─────────┐
            │         │         │
       ┌────┴───┐ ┌───┴───┐ ┌──┴──────────┐
       │AIService│ │Mock   │ │useHealthData│
       │(Groq)   │ │DataSvc│ │(Vitals Hook)│
       └─────────┘ └───────┘ └─────────────┘
```

---

## 🗣️ Voice Pipeline

```
🎙️ User speaks → expo-av Recording → audio file
        ↓
  Groq Whisper API (STT) → transcript text
        ↓
  Groq LLama 3.3 API (Chat) → AI response
        ↓
  ElevenLabs API (TTS) → MP3 audio
        ↓
  🔊 expo-av Playback → auto-restart listening (loop)
```

---

## 📊 Codebase Metrics

| Metric | Count |
|--------|:-----:|
| 📄 Source Files | 19 |
| 📱 Screens | 5 |
| 🧩 Components | 5 |
| 🪝 Custom Hooks | 2 |
| ⚙️ Services | 2 |
| 📦 Dependencies | 25 |
| 📏 Lines of Code | ~2,800 |

---

## 📦 Tech Stack

### Core
| Package | Purpose |
|---------|---------|
| `react-native` 0.74.5 | Cross-platform UI framework |
| `expo` SDK 51 | Managed workflow, dev server, OTA updates |
| `typescript` 5.3 | Type-safe development |
| `@react-navigation/bottom-tabs` v6 | 5-tab bottom navigation |

### AI & Voice
| Package | Purpose |
|---------|---------|
| 🤖 **Groq API** (LLama 3.3 70B) | AI chat completions |
| 🎙️ **Groq Whisper** (large-v3-turbo) | Speech-to-text transcription |
| 🗣️ **ElevenLabs** (Bella voice) | Neural text-to-speech |
| `expo-av` | Audio recording & playback |
| `expo-speech` | Fallback system TTS |

### Eye Tracking
| Package | Purpose |
|---------|---------|
| `react-native-vision-camera` | Camera frame access |
| `react-native-worklets-core` | Native frame processing |
| MLKit Face Detector | Face distance measurement |

### UI & UX
| Package | Purpose |
|---------|---------|
| `expo-linear-gradient` | Gradient backgrounds |
| `expo-blur` | Frosted glass tab bar |
| `react-native-reanimated` | Smooth animations |
| `react-native-chart-kit` | Heart rate trend charts |
| `expo-haptics` | Haptic feedback |
| `expo-notifications` | Appointment reminders |

---

## 📁 Project Structure

```
AIHealthPartnerRN/
├── 📄 App.tsx                    # Entry point
├── 📄 app.json                   # Expo config
├── 📄 package.json               # Dependencies
├── 📄 tsconfig.json              # TypeScript config (@/* alias)
│
├── 📂 src/
│   ├── 📂 navigation/
│   │   └── AppNavigator.tsx      # Bottom tab navigator (5 tabs)
│   │
│   ├── 📂 screens/
│   │   ├── VitalsDashboard.tsx   # ❤️ Live vitals + charts
│   │   ├── MentalHealthScreen.tsx# 🧠 AI chat + mood journal
│   │   ├── RecoveryScreen.tsx    # 🌿 Task checklist
│   │   ├── ClinicalScreen.tsx    # 🏥 Appointments + symptoms
│   │   └── EmergencyScreen.tsx   # 🆘 SOS + contacts
│   │
│   ├── 📂 components/
│   │   ├── VitalsCard.tsx        # Vital metric card with pulse
│   │   ├── AnomalyBanner.tsx     # Alert banner for anomalies
│   │   ├── ChatBubble.tsx        # Chat message bubble
│   │   ├── MoodSelector.tsx      # Emoji mood picker
│   │   └── VoiceCallModal.tsx    # Full-screen voice call UI
│   │
│   ├── 📂 context/
│   │   └── AppContext.tsx        # Global state + AsyncStorage
│   │
│   ├── 📂 hooks/
│   │   └── useHealthData.ts      # Mock vitals generator
│   │
│   ├── 📂 services/
│   │   ├── AIService.ts          # Groq + ElevenLabs integration
│   │   └── MockDataService.ts    # Mock data & type definitions
│   │
│   ├── 📂 theme/
│   │   └── Theme.ts              # Colors & spacing constants
│   │
│   └── 📂 features/eye/
│       └── 📂 tracking/
│           ├── useDistanceMonitor.ts  # VisionCamera distance
│           ├── EsdHud.tsx             # Distance HUD overlay
│           └── DevStepOverlay.tsx     # Dev debug banner
│
└── 📂 android/                   # Native Android project
```

---

## 🚀 Quick Start

### Prerequisites

![Node](https://img.shields.io/badge/Node.js-≥18-339933?style=flat-square&logo=node.js&logoColor=white)
![npm](https://img.shields.io/badge/npm-≥9-CB3837?style=flat-square&logo=npm&logoColor=white)

- **Node.js** ≥ 18
- **Expo Go** app on your device (for quick testing)
- **Android Studio** (for native Android builds)
- **Xcode** (for iOS builds, macOS only)

### 📱 Run with Expo Go (Fastest)

```bash
cd AIHealthPartnerRN
npm install
npx expo start
```
Scan the QR code with **Expo Go** on your phone.

### 🤖 Run on Android Device

```bash
cd AIHealthPartnerRN
npm install
npx expo run:android
```

> ⚠️ Requires USB debugging enabled on your device

### 🍎 Run on iOS

```bash
cd AIHealthPartnerRN
npm install
npx expo run:ios
```

> ⚠️ Requires macOS + Xcode

---

## 🔑 API Keys

The app requires API keys in `src/services/AIService.ts`:

| Key | Service | Purpose |
|-----|---------|---------|
| `GROQ_API_KEY` | [Groq](https://console.groq.com) | AI chat + speech-to-text |
| `ELEVENLABS_API_KEY` | [ElevenLabs](https://elevenlabs.io) | Neural text-to-speech (optional) |

---

## 🎨 Design System

| Token | Color | Usage |
|-------|-------|-------|
| `background` | `#161925` | App background |
| `primary` | `#235789` | Primary actions |
| `secondary` | `#42CAFD` | Highlights, accents |
| `accent` | `#DBCFB0` | Warm accent tones |
| `alert` | `#D33F49` | Warnings, anomalies |

**Theme:** Dark mode only · Portrait locked · Emoji icons throughout

---

## ⚠️ Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| 🔧 Ninja/CMake build error on Windows | ✅ Fixed | Add Windows Defender exclusion for project folder |
| 📱 HealthKit mock only | ⏳ | Uses simulated vitals data |
| 🔑 API keys hardcoded | ⏳ | Move to `.env` file |
| 🍎 iOS build error | ⏳ | Use Expo Go for iOS testing |

---

## 📄 Scripts

```bash
npm start        # Start Expo dev server
npm run android  # Build & run on Android
npm run ios      # Build & run on iOS
npm run web      # Start web version
```

---

<div align="center">

### Built with ❤️ for the Axxess 2026 Hackathon

![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-AI-orange?style=flat-square)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-TTS-purple?style=flat-square)

</div>
