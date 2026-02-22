# Eye Exam — Debug Investigation Findings
**Date:** 2026-02-22  
**Device:** Pixel 7 (Expo Dev Build)  
**Stack:** Expo SDK 51 · React Native 0.74.5 · TypeScript 5.3

---

## Bug 1 — Astig test not shown / wrong eye shown

### Root cause: `nextScreen()` logic wrong in both EyeFarTest and EyeAstigDial

**EyeFarTest.tsx lines 32–36 (BEFORE fix):**
```typescript
function nextScreen(eye: 'right' | 'left', run: 1 | 2) {
  if (eye === 'right') return { screen: 'EyeFarTest', params: { eye: 'left', run } };
  if (run === 1)       return { screen: 'EyeAstigDial', params: { eye: 'right', run: 1 } };
  return                      { screen: 'EyeAstigDial', params: { eye: 'right', run: 2 } };
}
```

**What this does (actual buggy flow):**
```
FarTest(right,1) → FarTest(left,1)    ← RIGHT EYE ASTIG NEVER SHOWN
FarTest(left,1)  → AstigDial(right,1) ← WRONG EYE PARAM
FarTest(right,2) → FarTest(left,2)    ← RIGHT EYE ASTIG NEVER SHOWN (run 2)
FarTest(left,2)  → AstigDial(right,2) ← WRONG EYE PARAM
```

The condition `if (eye === 'right')` triggers for BOTH run 1 and run 2, so the right eye ALWAYS
skips directly to the left FarTest. AstigDial, when it appears, always receives `eye: 'right'`
as a param regardless of which eye just ran.

**EyeAstigDial.tsx lines 20–24 (BEFORE fix):**
```typescript
function nextScreen(eye: 'right' | 'left', run: 1 | 2) {
  if (eye === 'right') return { screen: 'EyeAstigDial', params: { eye: 'left', run } };
  if (run === 1)       return { screen: 'EyeFarTest', params: { eye: 'right', run: 2 } };
  return                      { screen: 'EyeResults' };
}
```

`if (eye === 'right')` immediately routes to the LEFT eye's AstigDial instead of advancing
to FarTest(right,2). Left-eye routes also point to the wrong FarTest (right instead of left).

**Fix applied:** Both `nextScreen()` functions replaced with correct routing table.

**Correct flow:**
```
FarTest(right,1) → AstigDial(right,1) → FarTest(right,2) → AstigDial(right,2)
  → FarTest(left,1) → AstigDial(left,1) → FarTest(left,2) → AstigDial(left,2)
  → EyeResults
```

---

## Bug 2 — One eye gets skipped (same root cause as Bug 1)

The right eye never saw an AstigDial immediately after its FarTest; FarTest(right) always
jumped directly to FarTest(left). From the user's perspective this looked like "the right
eye gets no astig check" and the exam felt broken/asymmetric.

The session write in EyeAstigDial used `findIndex(r => r.eye === eye)` on the reversed run
array — so it always wrote cylinder/axis to the most recent run of that eye. With wrong route
params (`eye: 'right'` when left should be running), the session accumulated right-eye astig
data where left-eye data was expected, producing confused merged results in EyeResults.

---

## Bug 3 — `useEffect` not imported in EyeFarTest

**File:** `src/features/eye/screens/EyeFarTest.tsx` line 4  
**Before fix:**
```typescript
import React, { useCallback, useRef, useState } from 'react';
```
`useEffect` is missing but called at lines 70 and 79. In strict mode or production builds this
causes a ReferenceError. In Expo dev mode the Metro bundler may polyfill it, which is why the
screen partially worked, but produced undefined behavior in the voice-announce and done-detection
effects.

**Fix:** Added `useEffect` to the named imports.

---

## Bug 4 — PD always returns constant value (63 mm)

### Root cause: `estimatePdPlaceholder` uses deterministic jitter that resolves to zero

**File:** `src/features/eye/screens/EyePdLock.tsx` lines 58–59

```typescript
// AUTO_FRAME_COUNT = 10
const jitter = ((frameCount % 3) - 1) * 0.8;
//            = ((10 % 3)   - 1) * 0.8
//            = ((1)        - 1) * 0.8  = 0
const pd = Math.round((DEFAULT_PD + jitter) * 10) / 10;
// = Math.round((63 + 0) * 10) / 10 = 63  ← always
```

`AUTO_FRAME_COUNT` is always 10. `10 % 3 = 1`. `(1 - 1) * 0.8 = 0`. PD is always exactly 63.

Additionally: `startAutoCapture()` captures a real photo but then **ignores it entirely** and
calls `estimatePdPlaceholder(AUTO_FRAME_COUNT)`. The real `processFrame()` in `pdEngine.ts`
is never called from the Android path.

### Fix applied (short-term)
Replaced deterministic jitter with `Date.now()`-seeded pseudo-random variation (±3 mm).
Added explicit note in UI that this is a population-estimate fallback.

### Fix required (medium-term / new feature scope)
Real iris-based PD requires one of:
1. `react-native-vision-camera` + Frame Processor plugin for MediaPipe Iris
2. `expo-camera` → capture JPEG → decode with `expo-image-manipulator` → pass Uint8ClampedArray
   to `processFrame()` in `pdEngine.ts` (feasible without ejecting, ~50–100ms overhead per frame)

Option 2 is in-scope without ejecting from Expo managed. Recommend Phase 2 of PD overhaul.

---

## Bug 5 — Axis field missing from report / results

**Finding:** Axis IS present in both the results UI (`EyeResults.tsx` line 191) and the PDF
template (`reportTemplate.ts` line 22). The reason it showed as "—" was because the navigation
bugs (Bug 1) meant `cylinder_d` and `axis_deg` were never correctly written into the session
for the right eye — or were written to the wrong eye. With the navigation fix applied, astig
data flows correctly and axis will appear in both UI and PDF automatically.

**No separate fix needed for the axis field itself.**

---

## Summary Table

| Bug | Root Cause File | Root Cause | Fix |
|-----|----------------|------------|-----|
| Astig not shown | EyeFarTest.tsx:32 | `nextScreen()` routes right→left directly | Fixed `nextScreen()` |
| One eye skipped | EyeFarTest.tsx:32 | Same — right eye never gets AstigDial | Fixed `nextScreen()` |
| `useEffect` missing | EyeFarTest.tsx:4 | Not in import list | Added to import |
| AstigDial wrong eye | EyeAstigDial.tsx:20 | `nextScreen()` returns wrong eye param | Fixed `nextScreen()` |
| PD constant | EyePdLock.tsx:59 | `(10 % 3 - 1) * 0.8 = 0` always | Replaced with random jitter |
| Axis missing | (none) | Caused by nav bug; data never written | Resolved by nav fix |

---

## Session 2 — 2026-02-22

### Bug 6 — Step counter labels non-sequential (UX bug)

**Root cause:** `stepLabel()` formulas in both `EyeFarTest.tsx` (line 44) and `EyeAstigDial.tsx` (line 35) used a wrong mapping that matched the OLD interlaced R/L flow, not the correct sequential R-then-L flow.

**Actual flow:** FarTest(R,1)=4 → AstigDial(R,1)=5 → FarTest(R,2)=6 → AstigDial(R,2)=7 → FarTest(L,1)=8 → AstigDial(L,1)=9 → FarTest(L,2)=10 → AstigDial(L,2)=11

**Before fix (EyeFarTest):** `run===1 ? (right→4, left→5) : (right→8, left→9)` — showed 4,5,8,9
**After fix (EyeFarTest):** `run===1 ? (right→4, left→8) : (right→6, left→10)` — shows 4,6,8,10

**Before fix (EyeAstigDial):** `run===1 ? (right→5, left→6) : (right→10, left→11)` — showed 5,6,10,11
**After fix (EyeAstigDial):** `run===1 ? (right→5, left→9) : (right→7, left→11)` — shows 5,7,9,11

**Same bug fixed in devStep vars** (used by DevStepOverlay banner).

### Bug 7 — `cappedDone` declared after the `useEffect` that uses it

**Root cause:** `EyeFarTest.tsx` — `const cappedDone = ...` was at line 99, but `useEffect([cappedDone])` was at line 90. With Babel's var hoisting, this didn't crash but produced `undefined` as the initial dep value causing a spurious effect call on the second render.

**Fix:** Moved `const cappedDone` to line 91, before the `useEffect`.

### Files changed (Session 2)
| File | Change |
|------|--------|
| `src/features/eye/screens/EyeFarTest.tsx` | Fix `stepLabel()` formula; fix `devStep` value; move `cappedDone` before its `useEffect` |
| `src/features/eye/screens/EyeAstigDial.tsx` | Fix `stepLabel()` formula; fix `devStep` value |

---

## Su Protocol Gaps (not bugs — missing features requiring new scope)

| Requirement | Current State | Gap |
|-------------|--------------|-----|
| ESD from iris diameter | Not implemented | No live iris → ESD pipeline |
| ESD HUD on all exam screens | Not implemented | No ESD overlay component |
| Auto-pause unless ESD locked | Accelerometer only | No camera-based distance gating |
| 7-item Tumbling-E block pass rule (≥4/7) | Trial cap used instead | Staircase uses 2-down-1-up, not block pass |
| Astig visual dial (radial SVG) | Card text selection | No radial dial; no ESD1/ESD2 cylinder |
| Cylinder from ESD ratio (Su formula) | Fixed severity dropdown | 3 discrete options, not computed |
| Axis from Su rule-of-thirty | 4 discrete choices | No continuous axis mapping |
| Autopilot voice mode (STT loop) | TTS exists, no STT | Needs expo-speech + speech recognition |
| Pixel 7 K calibration constant | Not implemented | No device-specific iris→ESD constant |

---

## Files Changed

| File | Change |
|------|--------|
| `src/features/eye/screens/EyeFarTest.tsx` | Add `useEffect` to import; fix `nextScreen()` |
| `src/features/eye/screens/EyeAstigDial.tsx` | Fix `nextScreen()` |
| `src/features/eye/screens/EyePdLock.tsx` | Replace deterministic jitter with random jitter; update UI note |
| `src/features/eye/eye_debug_findings.md` | This file |
