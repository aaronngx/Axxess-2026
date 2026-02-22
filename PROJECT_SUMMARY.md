# AI Health Partner - Project Overview

An empathetic, proactive health companion built for iOS during the Axxess Hackathon. The app monitors user vitals in real-time and provides a 360-degree view of physical and mental well-being through AI-driven insights and gamified interaction — built with React Native for rapid cross-platform deployment and fullscreen immersive UI.

## 🚀 Key Features

- **Real-time Vitals Monitoring**: Live streaming of Heart Rate and Respiratory Rate via HealthKit (iOS) using `react-native-health`.
- **AI Mental Health Companion**: Interactive AI Chat (mocked) and Daily Mood Journaling with fullscreen card-based UI.
- **Cognitive Assessments**: On-device gamified memory and reaction tests to track mental clarity.
- **Proactive Anomaly Detection**: Automatic triggers for high heart rate or unusual health patterns with emergency contact integration.
- **Recovery Management**: Patient-friendly summaries that "translate" medical status into actionable daily tasks and progress tracking.

## 🛠 Tech Stack

- **Framework**: React Native (Expo) — fullscreen immersive UI
- **Data**: `react-native-health` (HealthKit on iOS), `react-native-chart-kit` (Trends)
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **State**: React Context API + `useState`/`useEffect` hooks
- **Architecture**: Shared hooks, services, and mock data layer

## 📂 Project Structure

```
AIHealthPartnerRN/
├── App.tsx                   # Root entry point & navigation setup
├── app.json                  # Expo config
├── package.json
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx  # Bottom tab + stack navigation
│   ├── screens/
│   │   ├── VitalsDashboard.tsx
│   │   ├── MentalHealthScreen.tsx
│   │   ├── RecoveryScreen.tsx
│   │   └── EmergencyScreen.tsx
│   ├── components/
│   │   ├── VitalsCard.tsx
│   │   ├── MoodSelector.tsx
│   │   ├── ChatBubble.tsx
│   │   └── AnomalyBanner.tsx
│   ├── hooks/
│   │   └── useHealthData.ts  # HealthKit integration hook
│   └── services/
│       └── MockDataService.ts
```

## 🏃 Getting Started

1. Install [Node.js](https://nodejs.org/) and [Expo CLI](https://expo.dev/):
   ```bash
   npm install -g expo-cli
   ```
2. Navigate to the project folder:
   ```bash
   cd AIHealthPartnerRN
   npm install
   ```
3. Start the dev server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with the **Expo Go** app on your iPhone, or run on a simulator.
5. For live HealthKit data, build to a physical device:
   ```bash
   npx expo run:ios
   ```

> **Note**: HealthKit requires a physical iPhone. Simulator uses mock data automatically.
