# AI CODING AGENT PROMPT — Eye Screening UX Overhaul (Pixel 7 Expo Dev Build)

You are an AI coding agent working on the repo described by the PROJECT XRAY. Your job is to implement a UX overhaul for the *Eye Vision Screening* feature, prioritizing *Android Pixel 7 (Expo Dev Build)*. 

## Ground Truth / Constraints (do not violate)
- Repo: AIHealthPartnerRN (Expo SDK 51, RN 0.74.5, TypeScript 5.3)
- Primary test device: *Android Pixel 7* (Expo Dev Build / Dev Client). Expo Go is not the target.
- No backend. All session data stored locally (AsyncStorage).
- Featherless.ai is explanation-only and must have offline fallback. AI never computes clinical outputs.
- Current camera: expo-camera. The XRAY notes a future migration to react-native-vision-camera for real-time landmarks.
- Current PD on Android: touch-mark method (confusing). Must be replaced with *automatic crosshair* method (no tapping, no user PD entry).
- Current flow: ClinicalScreen → EyeSafetyGate → ...
- The user wants fewer steps, less repetition, no dim-room requirement, and reliable PDF export.

## High-Level Deliverables
1) Remove *EyeSafetyGate* from the main user flow (do not delete file, just stop using it).
2) Add *position guidance + gating* so tests pause unless user is centered/upright/steady/in-range. Camera can be visible as a small PiP or hidden; gating must still work.
3) Replace PD entry/touch-marking with *automatic pupil/eye center crosshair* + Save/Retake QC. No tapping on pupils. No user-entered PD.
4) Make the E-test faster (reduce trial count) while still supporting 2 runs and repeatability.
5) Replace confusing astig dial with a simple 2-step card UI (axis bucket + severity bucket), keeping output fields consistent.
6) Combine EyeNear + EyeContrast + EyeLowLight into a single *ReadingLab* module that computes Vision Age/functional scores with:
   - PRD lock
   - near readability (Readable/Not readable)
   - contrast (2-choice stripes)
   - simulated low-light (screen dims automatically; no room-dim gate)
   - comfort (3-choice mapping to 0/4/9)
7) Fix PDF export on Android (expo-print + expo-sharing) and keep a web fallback (window.print) if web remains supported.
😎 Update navigation + route types accordingly. Keep hearing feature unchanged.

## IMPORTANT: Sequence of Work
Implement in this order to keep the demo stable:
A) Navigation changes (skip EyeSafetyGate + add ReadingLab route)
B) Astig rewrite (fast UX win)
C) ReadingLab (remove repetitive E tasks + remove room dim gate)
D) PDF export reliability fix
E) Tracking overlay/gating (Centered/Upright/Steady/Distance)
F) E-test speed-up (7 prompts + confirm)
G) PD overhaul (automatic crosshair; then integrate real iris/pupil landmarks when feasible)

---

# PART 1 — Navigation & Flow Changes

### Current Eye flow (from XRAY)
ClinicalScreen → EyeSafetyGate → EyeSetupCamera → EyePdLock → EyeFarTest (R/L, run 1/2) → EyeAstigDial (R/L, run 1/2) → EyeNear → EyeContrast → EyeLowLight → EyeResults → EyeHistory

### Target: Split into two entry points from ClinicalScreen
- *Eye Exam* (Su-style exam): EyeSetupCamera → EyePdLock → EyeFarTest/ EyeAstigDial loops → EyeResults → EyeHistory
- *Vision Insights (Vision Age)*: ReadingLab → EyeResults (or a separate results screen) → EyeHistory

#### Tasks
1) In src/screens/ClinicalScreen.tsx:
   - Change Eye Screening entry to navigate directly to EyeSetupCamera (skip EyeSafetyGate).
   - Add a second tile/button for “Vision Insights / Vision Age” that navigates to ReadingLab.

2) In src/navigation/AppNavigator.tsx:
   - Remove the EyeSafetyGate screen registration OR keep it registered but unused. Prefer removing from main stack if no longer used.
   - Register a new screen route: ReadingLab.

3) In route types:
   - Currently, XRAY says RootStackParamList lives in src/features/eye/models/types.ts and contains all routes.
   - Update types to include ReadingLab: undefined and optionally remove EyeSafetyGate.
   - (Optional improvement): Move RootStackParamList to src/navigation/types.ts but only if it won’t break the app.

---

# PART 2 — Astigmatism UX Rewrite (EyeAstigDial)

File: src/features/eye/screens/EyeAstigDial.tsx

### Problem
Current dial is confusing; users only select “All lines equal”. 

### Replace with a 2-step card UI (keep output fields)
Output fields must remain: cylinder_d, axis_deg saved into Eye session data.

#### New UI
*Step 1 — Axis selection*
- Title: “Which lines look darkest or most distinct?”
- Cards:
  - “All lines look equal” → set cylinder_d = 0, axis_deg = null, then Save & Continue
  - “Up–Down boldest” → axis ≈ 90
  - “Left–Right boldest” → axis ≈ 180
  - “Diagonal boldest” → show follow-up: 45 vs 135

*Step 2 — Severity selection*
- Title: “How different do the lines look?”
- Cards mapping:
  - Barely noticeable → cylinder_d = -0.25
  - Clearly different → cylinder_d = -0.75
  - Very different → cylinder_d = -1.50

Save to session and navigate to next step.

---

# PART 3 — Replace EyeNear + EyeContrast + EyeLowLight with ReadingLab

Create file: src/features/eye/screens/ReadingLab.tsx

### ReadingLab steps (single screen with internal steps)
1) Lock PRD (Preferred Reading Distance):
   - Use distance gating (initially visual guidance; later real gating).
2) Near readability:
   - Present short text; user chooses Readable / Not readable across 2–3 sizes.
3) Contrast:
   - Use 2-choice stripes (Left/Right) ~10 trials max. No Tumbling-E here.
4) Simulated low-light:
   - Automatically dim screen / overlay; repeat stripes ~8 trials.
   - Do NOT ask user to dim room. Remove all “gate” steps.
5) Comfort:
   - Strain: None/A little/A lot → map to 0/4/9
   - Blur: None/Some/Significant → map to 0/4/9
   - Headache: Yes/No toggle

### Data model integration
Store into existing FunctionalVisionResult fields if present, or add fields carefully:
- preferred_reading_distance_cm
- near_va_proxy or near readability score
- contrast_score
- low_light_score
- mesopic_penalty
- strain_score_0to10
- blur_score_0to10
- headache_flag

If these already exist in the eye model, reuse them.

### Navigation
After ReadingLab completion:
- Navigate to EyeResults (or create VisionInsightsResults only if needed).
- Ensure EyeResults can display either exam+insights or insights-only.

---

# PART 4 — PDF Export Reliability Fix (Android Dev Build)

File: src/features/eye/report/exportPdf.ts

### Required behavior
- Android: use expo-print to generate PDF and expo-sharing to share.
- Must not silently fail; show alerts/toasts if sharing isn’t available.
- Web fallback (if still used): window.open + print.

#### Implementation notes
- Ensure await Print.printToFileAsync({ html }) returns a URI.
- Check Sharing.isAvailableAsync().
- Use correct mimeType application/pdf.

Also wire the “Export PDF” button from EyeResults to call this.

---

# PART 5 — Tracking Overlay + Gating (Centered/Upright/Steady/Distance)

Create:
- src/features/eye/tracking/TrackingOverlay.tsx
- src/features/eye/tracking/trackingEngine.ts

### Goal
Always show (or run) tracking so tests only proceed when the user is positioned correctly.

### Reality constraints (XRAY)
- Currently using expo-camera; VisionCamera migration is planned.
- Implement a first-pass gating that works without full landmarks:
  - Use accelerometer/gyro (expo-sensors) for steady/upright
  - Use simple “visual guide only” for centered/distance until VisionCamera face box exists
- Make gating pluggable so we can swap in VisionCamera + real face box later.

### API design
trackingEngine should output:
- state: 'LOCKED'|'PAUSED'
- reason: 'distance'|'center'|'tilt'|'shake'|'unknown'
- metrics: optional numeric stats

TrackingOverlay should accept:
- trackingState, reason, and render UI + instructions.

### Apply gating
In the following screens:
- EyeFarTest.tsx
- EyeAstigDial.tsx
- ReadingLab.tsx
Disable answer buttons and pause progress unless LOCKED.

---

# PART 6 — Speed up E-test (EyeFarTest)

File: src/features/eye/screens/EyeFarTest.tsx and/or engine/staircase.ts

### Goal
Reduce time. Keep “2 runs” but make run2 short.

Implement:
- Run 1: 7 prompts
- Run 2: 4 prompts confirm
- Only extend if mismatch beyond tolerance (cap extension)

Add progress indicator (e.g. 3/7) and ensure gating pauses input.

---

# PART 7 — PD Overhaul (Automatic Crosshair, No Tapping)

Files:
- src/features/eye/screens/EyePdLock.tsx
- src/features/eye/engine/pdEngine.ts
- src/features/eye/engine/pdEngineWeb.ts (keep web fallback)

### Replace Android PD touch-mark method
New PD pipeline:
1) Wait for tracking LOCKED
2) Sample N frames in-memory (e.g. 10 frames)
3) For each frame compute:
   - pupil center left/right (or eye center proxy until iris landmarks are integrated)
   - interpupil distance px
   - (when iris diameter available) compute mm_per_px and PD_mm
4) Aggregate:
   - PD_final = median
   - spread = max-min
5) Freeze frame and draw two green crosshairs.
6) User selects Save / Retake.

### NOTE on “true iris/pupil landmarks”
If real iris landmarks are not available yet in the current codebase, implement the UX and use a placeholder center method (eye center proxy) while leaving TODO hooks for MediaPipe Iris/VisionCamera plugin integration. Do not block demo progress on native plugin work unless it is already present.

---

# Testing & Acceptance Criteria (Pixel 7)
- Eye Exam starts from ClinicalScreen and does not show EyeSafetyGate.
- Astig screen is usable; users can pick non-equal options.
- ReadingLab replaces near/contrast/low-light; no room dimming required.
- Export PDF works on Pixel 7.
- Gating pauses tests when phone moves; resumes when stable.
- PD screen shows crosshairs automatically; no tap-to-mark; no PD entry field.

---

# Output Required From You (Agent)
1) Commit-style summary of changes (files changed + why)
2) Updated navigation flow diagram in README or XRAY notes
3) Screenshots (optional) or notes verifying Pixel 7 run-through works end-to-end.

Proceed to implement directly. Do not ask the user for additional confirmation; make reasonable default choices consistent with the XRAY and constraints above.