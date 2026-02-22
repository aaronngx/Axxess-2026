// src/features/eye/camera/quality.ts
// Quality scoring from collected session metrics.
// Weights from Blueprint §7.3

import { QualityMetrics, EyeSessionResult, EyeRunResult } from '../models/types';
import { getAccuracy, getTooFastRate, StaircaseState } from '../engine/staircase';

export interface SessionQualityInputs {
  // Camera / environment
  distance_std_cm: number | null;
  valid_frame_pct: number | null;
  tilt_deg_p95: number | null;
  lighting_variance: number | null;

  // Per-run staircase states
  staircaseStates: StaircaseState[];

  // Repeatability deltas (from mergeRuns)
  delta_ser_r: number | null;
  delta_ser_l: number | null;
  delta_cyl_r: number | null;
  delta_cyl_l: number | null;
  delta_axis_r: number | null;
  delta_axis_l: number | null;
}

export function computeQuality(inputs: SessionQualityInputs): QualityMetrics {
  const reasons: string[] = [];

  // ── 1. Repeatability (30%) ───────────────────────────────────────────────
  let repeatScore = 1.0;
  const deltas = [inputs.delta_ser_r, inputs.delta_ser_l];
  const cylDeltas = [inputs.delta_cyl_r, inputs.delta_cyl_l];
  const axisDeltas = [inputs.delta_axis_r, inputs.delta_axis_l];

  const maxSerDelta = Math.max(...deltas.filter(d => d != null) as number[], 0);
  const maxCylDelta = Math.max(...cylDeltas.filter(d => d != null) as number[], 0);
  const maxAxisDelta = Math.max(...axisDeltas.filter(d => d != null) as number[], 0);

  if (maxSerDelta > 0.50) { repeatScore -= 0.4; reasons.push('SER inconsistent between runs'); }
  else if (maxSerDelta > 0.25) { repeatScore -= 0.2; }

  if (maxCylDelta > 0.50) { repeatScore -= 0.3; reasons.push('Cylinder inconsistent between runs'); }
  if (maxAxisDelta > 15)  { repeatScore -= 0.2; reasons.push('Axis unstable due to low cylinder'); }

  repeatScore = Math.max(0, repeatScore);
  const repeatabilityOk = maxSerDelta <= 0.5 && maxCylDelta <= 0.5;

  // ── 2. Distance stability (25%) ──────────────────────────────────────────
  let distScore = 1.0;
  if (inputs.distance_std_cm != null) {
    if (inputs.distance_std_cm > 4) { distScore = 0.3; reasons.push('Distance unstable — moved too much'); }
    else if (inputs.distance_std_cm > 2) { distScore = 0.65; reasons.push('Distance moderately unstable'); }
    else if (inputs.distance_std_cm > 1) { distScore = 0.85; }
  }

  // ── 3. Tracking validity (20%) ───────────────────────────────────────────
  let trackScore = 1.0;
  if (inputs.valid_frame_pct != null) {
    if (inputs.valid_frame_pct < 0.6) { trackScore = 0.3; reasons.push('Tracking unstable — check alignment'); }
    else if (inputs.valid_frame_pct < 0.8) { trackScore = 0.7; }
  }

  // ── 4. Lighting stability (15%) ──────────────────────────────────────────
  let lightScore = 1.0;
  if (inputs.lighting_variance != null) {
    if (inputs.lighting_variance > 0.15) { lightScore = 0.3; reasons.push('Lighting fluctuated during test'); }
    else if (inputs.lighting_variance > 0.07) { lightScore = 0.7; }
  }

  // ── 5. Response consistency (10%) ────────────────────────────────────────
  let responseScore = 1.0;
  for (const sc of inputs.staircaseStates) {
    const acc = getAccuracy(sc);
    const tooFast = getTooFastRate(sc);
    if (acc < 0.5) { responseScore = Math.min(responseScore, 0.4); reasons.push('Inconsistent answers — possible guessing'); break; }
    if (tooFast > 0.3) { responseScore = Math.min(responseScore, 0.6); reasons.push('Many very-fast responses detected'); break; }
  }

  // ── Weighted sum → 0–100 ─────────────────────────────────────────────────
  const confidence_0to100 = Math.round(
    repeatScore  * 30 +
    distScore    * 25 +
    trackScore   * 20 +
    lightScore   * 15 +
    responseScore * 10,
  );

  const quality_label =
    confidence_0to100 >= 80 ? 'High' :
    confidence_0to100 >= 60 ? 'Medium' : 'Low';

  return {
    confidence_0to100,
    quality_label,
    reasons: [...new Set(reasons)], // deduplicate
    distance_std_cm: inputs.distance_std_cm,
    valid_frame_pct: inputs.valid_frame_pct,
    tilt_deg_p95: inputs.tilt_deg_p95,
    lighting_variance: inputs.lighting_variance,
    repeatability_ok: repeatabilityOk,
  };
}
