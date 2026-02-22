// src/features/eye/tracking/trackingEngine.ts
// Accelerometer-based position gating for eye tests.
// Outputs LOCKED (phone is steady + upright) or PAUSED (moving / tilted).
//
// expo-sensors Accelerometer returns m/s² on Android (~9.81 at rest) and G's
// on iOS (~1.0 at rest). We normalize by vector magnitude so the same math
// works on both platforms.
//
// Upright portrait: y ≈ -1G (normalized), x ≈ 0, z ≈ 0
// Tilt measured as the X-axis lean from vertical: asin(xNorm) → degrees.
//
// NOTE: Center/distance gating requires VisionCamera face box — pluggable via
// the optional centerOk / distanceOk props on TrackingOverlay.

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';

export type TrackingState = 'LOCKED' | 'PAUSED';
export type TrackingReason = 'tilt' | 'shake' | 'distance' | 'center' | 'unknown';

export interface TrackingMetrics {
  tiltDeg: number;    // degrees of X-axis lean from vertical
  shakeMag: number;   // rolling standard deviation of normalized magnitude
}

export interface TrackingOutput {
  state: TrackingState;
  reason: TrackingReason | null;
  metrics: TrackingMetrics;
}

// Tuning constants
const UPDATE_MS        = 80;   // accelerometer poll interval
const TILT_THRESHOLD   = 28;  // degrees — max lean before PAUSED
const SHAKE_WINDOW     = 8;   // samples for rolling shake window
const SHAKE_THRESHOLD  = 0.06; // std-dev of normalized magnitude — phones jitter ~0.02 at rest

const LOCKED_OUTPUT: TrackingOutput = {
  state: 'LOCKED',
  reason: null,
  metrics: { tiltDeg: 0, shakeMag: 0 },
};

function safeDeg(normalizedVal: number): number {
  // normalizedVal must be in [-1, 1]; clamp to avoid NaN
  return Math.asin(Math.max(-1, Math.min(1, normalizedVal))) * (180 / Math.PI);
}

/**
 * Hook that subscribes to the device accelerometer and returns a
 * TrackingOutput describing whether the phone is stable and upright.
 * On web, sensor is unavailable — always returns LOCKED so tests proceed.
 */
export function useTracking(): TrackingOutput {
  const [output, setOutput] = useState<TrackingOutput>(LOCKED_OUTPUT);
  // rolling window of normalized magnitudes for shake detection
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    // Web: no accelerometer — always locked
    if (Platform.OS === 'web') return;

    Accelerometer.setUpdateInterval(UPDATE_MS);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      // Normalize to unit vector so math is platform-independent
      // (Android: m/s² ≈ 9.81 at rest; iOS: G's ≈ 1.0 at rest)
      const rawMag = Math.sqrt(x * x + y * y + z * z);
      if (rawMag < 0.01) return; // guard against zero division

      const xN = x / rawMag; // normalized x component

      // Tilt: how far the phone leans left/right from vertical
      const tiltDeg = Math.abs(safeDeg(xN));

      // Shake: track rolling std-dev of normalized magnitude
      // (normalized mag is always ≈ 1.0 at rest; deviates when accelerated)
      const normMag = 1.0; // by definition after normalization
      // Use raw delta-magnitude (unnormalized) scaled to G's for shake
      const history = historyRef.current;
      history.push(rawMag);
      if (history.length > SHAKE_WINDOW) history.shift();

      let shakeMag = 0;
      if (history.length >= 3) {
        const mean = history.reduce((a, b) => a + b, 0) / history.length;
        // Express variance relative to gravity magnitude so it's unit-independent
        const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length;
        // Normalize by mean² so SHAKE_THRESHOLD works regardless of m/s² vs G's
        shakeMag = mean > 0.01 ? Math.sqrt(variance) / mean : 0;
      }

      if (tiltDeg > TILT_THRESHOLD) {
        setOutput({ state: 'PAUSED', reason: 'tilt', metrics: { tiltDeg, shakeMag } });
      } else if (shakeMag > SHAKE_THRESHOLD) {
        setOutput({ state: 'PAUSED', reason: 'shake', metrics: { tiltDeg, shakeMag } });
      } else {
        setOutput({ state: 'LOCKED', reason: null, metrics: { tiltDeg, shakeMag } });
      }
    });

    return () => sub.remove();
  }, []);

  return output;
}
