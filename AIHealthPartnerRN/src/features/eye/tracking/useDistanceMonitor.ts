// src/features/eye/tracking/useDistanceMonitor.ts
// Real-time face-to-phone distance via react-native-vision-camera + MLKit face detector.
// Attach the returned frameProcessor to a <Camera> component.
// NO takePictureAsync — no shutter, no flash.
//
// distance_cm = CALIBRATION_K / face_width_px
// CALIBRATION_K ≈ 6200 for Pixel 7 front cam at ~720px-wide frame resolution.
// Validate with ruler: at 40 cm the reading should show ~40.  Adjust K if off.
//
// GRACEFUL DEGRADATION: if the native Worklets module (react-native-worklets-core)
// isn't compiled into the current dev build, the hook returns NO_FACE + a no-op
// frameProcessor so exam screens still render and function without distance monitoring.

import { useCallback, useRef, useState } from 'react';
import { TurboModuleRegistry } from 'react-native';

export type DistanceZone = 'too_close' | 'ok' | 'too_far' | 'no_face';

export interface DistanceOutput {
  distance_cm: number | null;
  zone: DistanceZone;
  face_detected: boolean;
}

const NO_FACE: DistanceOutput = { distance_cm: null, zone: 'no_face', face_detected: false };

const CALIBRATION_K   = 6200;  // px·cm — tune if readings are systematically off
const TARGET_MIN_CM   = 35;
const TARGET_MAX_CM   = 50;
const NO_FACE_TIMEOUT = 1200;  // ms — reset to no_face if absent this long

// Check at module-load time whether the Worklets native module is present.
// react-native-worklets-core must be compiled into the native binary.
// TurboModuleRegistry.get() returns null (no throw) when module is absent.
const WORKLETS_AVAILABLE: boolean = (() => {
  try {
    return !!(TurboModuleRegistry as any).get('Worklets');
  } catch {
    return false;
  }
})();

// ── Fallback hook — no frame processor, always returns NO_FACE ───────────────
// Used when Worklets native module is absent (older dev build).
function useDistanceMonitorFallback(_active: boolean) {
  const [output] = useState<DistanceOutput>(NO_FACE);
  // Stable no-op so Camera prop doesn't change identity on every render
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const frameProcessor = useCallback((_frame: any) => {}, []) as any;
  return { output, frameProcessor };
}

// ── Real hook — requires react-native-worklets-core in native binary ──────────
function useDistanceMonitorReal(active: boolean) {
  // Dynamic imports so the module-level code of worklets deps is only evaluated
  // on devices where WORKLETS_AVAILABLE is true (avoids TurboModule crash).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { runOnJS, useFrameProcessor } = require('react-native-vision-camera');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useFaceDetector } = require('react-native-vision-camera-face-detector');

  const [output, setOutput] = useState<DistanceOutput>(NO_FACE);
  const lastFaceMs = useRef<number>(0);

  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    landmarkMode: 'none',
    contourMode: 'none',
    classificationMode: 'none',
    cameraFacing: 'front',
  });

  const handleFaces = useCallback((faces: any[]) => {
    if (!faces || faces.length === 0) {
      if (Date.now() - lastFaceMs.current > NO_FACE_TIMEOUT) setOutput(NO_FACE);
      return;
    }
    lastFaceMs.current = Date.now();

    const face = faces.reduce((a: any, b: any) => a.bounds.width > b.bounds.width ? a : b);
    const faceWidthPx = face.bounds.width;
    if (faceWidthPx < 20) return;

    const dist_cm = Math.round(CALIBRATION_K / faceWidthPx);
    const zone: DistanceZone =
      dist_cm < TARGET_MIN_CM ? 'too_close' :
      dist_cm > TARGET_MAX_CM ? 'too_far'   : 'ok';

    setOutput({ distance_cm: dist_cm, zone, face_detected: true });
  }, []);

  const frameProcessor = useFrameProcessor((frame: any) => {
    'worklet';
    if (!active) return;
    const faces = detectFaces(frame);
    runOnJS(handleFaces)(faces ?? []);
  }, [active, detectFaces, handleFaces]);

  return { output, frameProcessor };
}

// Select implementation once at module load — React's rules of hooks are satisfied
// because the same function reference is always used for the lifetime of the app.
export const useDistanceMonitor = WORKLETS_AVAILABLE
  ? useDistanceMonitorReal
  : useDistanceMonitorFallback;
