# AI Health Partner — React Native (Expo)

Fullscreen, dark-themed health companion app built with React Native + Expo for the Axxess Hackathon.

## Quick Start (iPhone — Expo Go)

```bash
cd AIHealthPartnerRN
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your iPhone. No build step needed.

## Screens

| Screen | Description |
|--------|-------------|
| ❤️ Vitals | Live heart rate, respiratory rate, O₂ — auto-refreshes every 5s |
| 🧠 Mental | AI chat companion + daily mood journal |
| 🌿 Recovery | Task checklist + patient-friendly medical summary |
| 🆘 Emergency | One-tap SOS + emergency contacts with call/SMS |

## Notes

- **HealthKit** requires a physical device + native build (`npx expo run:ios`). Expo Go uses mock data automatically.
- All AI responses are mocked in `src/services/MockDataService.ts` — swap in your real API there.
- Emergency calls use `Linking.openURL('tel:...')` — works on real devices only.

## Folder Structure

```
src/
  screens/       — 4 fullscreen views
  components/    — Reusable UI pieces (VitalsCard, ChatBubble, etc.)
  hooks/         — useHealthData (HealthKit + mock fallback)
  services/      — MockDataService (swap for real APIs)
  navigation/    — Bottom tab navigator
```
