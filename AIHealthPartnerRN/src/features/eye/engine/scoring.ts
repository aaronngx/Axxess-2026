// src/features/eye/engine/scoring.ts
// Deterministic computation of refraction outputs from staircase thresholds.
// All outputs are screening-grade estimates, not guaranteed prescriptions.

import { EyeRunResult, EyeCombinedResult, FunctionalVisionResult, VisionAgeResult, EyeSide } from '../models/types';

// --- Refraction estimation ---

// Convert logMAR threshold → SER (spherical equivalent refraction), screening-grade.
// Rough heuristic for myopia: SER ≈ -logMAR * 3, rounded to 0.25 D steps.
// logMAR ≤ 0 (20/20 or better) → plano (0.00 D).
export function logMARtoSER(logMAR: number): number {
  if (logMAR <= 0) return 0;
  const raw = -logMAR * 3;
  return Math.round(raw * 4) / 4;
}

// Round to nearest 0.25 D clinical step.
export function round25(v: number | null): number | null {
  return v == null ? null : Math.round(v * 4) / 4;
}

// Cylinder magnitude from astig severity rating (0–3).
// 0 = no astig, 1 = mild (−0.50), 2 = moderate (−1.00), 3 = strong (−2.00)
export function astigSeverityToCylinder(severity: 0 | 1 | 2 | 3): number {
  const map: Record<number, number> = { 0: 0, 1: -0.5, 2: -1.0, 3: -2.0 };
  return map[severity] ?? 0;
}

// Sphere from SER + cylinder: sphere = SER - cylinder/2
export function serToSphere(ser: number, cylinder: number): number {
  return round25(ser - cylinder / 2) ?? ser;
}

// --- Circular statistics for axis ---

// Circular mean for astigmatism axes (0–179°, doubles to 0–360° internally).
export function circularMeanAxis(axes: number[]): number {
  const valid = axes.filter(a => a != null);
  if (valid.length === 0) return 0;
  const sin = valid.reduce((s, a) => s + Math.sin((a * 2 * Math.PI) / 180), 0);
  const cos = valid.reduce((s, a) => s + Math.cos((a * 2 * Math.PI) / 180), 0);
  let result = (Math.atan2(sin, cos) * 180) / (2 * Math.PI);
  if (result < 0) result += 180;
  return Math.round(result);
}

// Shortest angular distance between two axes (0–179°).
export function axisCircularDiff(a1: number, a2: number): number {
  const diff = Math.abs(a1 - a2) % 180;
  return diff > 90 ? 180 - diff : diff;
}

// --- Run merge (2 runs → 1 combined result) ---

export function mergeEyeRuns(run1: EyeRunResult, run2: EyeRunResult): EyeCombinedResult {
  const avg = (a: number | null, b: number | null): number | null => {
    if (a == null && b == null) return null;
    if (a == null) return b;
    if (b == null) return a;
    return (a + b) / 2;
  };

  const sphere = avg(run1.sphere_d, run2.sphere_d);
  const cylinder = avg(run1.cylinder_d, run2.cylinder_d);
  const ser = avg(run1.ser_d, run2.ser_d);
  const far_va_proxy = avg(run1.far_va_proxy, run2.far_va_proxy);

  // Axis: only meaningful when cylinder is significant
  const CYL_THRESHOLD = 0.75;
  let axis: number | null = null;
  let delta_axis: number | null = null;
  if (
    cylinder != null && Math.abs(cylinder) >= CYL_THRESHOLD &&
    run1.axis_deg != null && run2.axis_deg != null
  ) {
    axis = circularMeanAxis([run1.axis_deg, run2.axis_deg]);
    delta_axis = axisCircularDiff(run1.axis_deg, run2.axis_deg);
  }

  const delta_ser = (run1.ser_d != null && run2.ser_d != null)
    ? Math.abs(run1.ser_d - run2.ser_d) : null;
  const delta_cylinder = (run1.cylinder_d != null && run2.cylinder_d != null)
    ? Math.abs(run1.cylinder_d - run2.cylinder_d) : null;

  // Per-eye confidence based on between-run agreement
  let confidence = 0.85;
  if (delta_ser != null && delta_ser > 0.5) confidence -= 0.20;
  if (delta_cylinder != null && delta_cylinder > 0.5) confidence -= 0.10;
  if (delta_axis != null && delta_axis > 15) confidence -= 0.10;
  confidence = Math.max(0.1, Math.min(1, confidence));

  return {
    eye: run1.eye,
    sphere_d: round25(sphere),
    cylinder_d: round25(cylinder),
    axis_deg: axis,
    ser_d: round25(ser),
    far_va_proxy,
    delta_ser_d: delta_ser != null ? round25(delta_ser) : null,
    delta_cylinder_d: delta_cylinder != null ? round25(delta_cylinder) : null,
    delta_axis_deg: delta_axis,
    confidence_0to1: confidence,
  };
}

// --- Vision Age ---

// Maps domain scores to a functional age range.
// Domain score: 0 (worst) to 1 (best).
// Age range is purely functional (self-tracking), not medical.
function scoreToAgeRange(score: number): [number, number] {
  if (score >= 0.95) return [18, 25];
  if (score >= 0.85) return [25, 35];
  if (score >= 0.72) return [35, 45];
  if (score >= 0.57) return [45, 55];
  if (score >= 0.40) return [55, 65];
  return [65, 80];
}

function ageRangeMidpoint(range: [number, number]): number {
  return (range[0] + range[1]) / 2;
}

export function computeVisionAge(
  perEye: EyeCombinedResult[],
  functional: FunctionalVisionResult,
  qualityConf: number, // 0–100
): VisionAgeResult {
  const qualityOk = qualityConf >= 60;

  // Distance clarity: based on best-eye far VA proxy (logMAR → score)
  const vaProxies = perEye.map(e => e.far_va_proxy).filter(v => v != null) as number[];
  const bestVA = vaProxies.length > 0 ? Math.min(...vaProxies) : null;
  const distScore = bestVA != null ? Math.max(0, 1 - bestVA * 1.2) : null;

  // Near focus: based on PRD (shorter = better; normal near is ~25–35cm)
  const prd = functional.preferred_reading_distance_cm;
  const nearScore = prd != null
    ? Math.max(0, Math.min(1, 1 - (prd - 25) / 55))
    : null;

  // Contrast
  const contrastScore = functional.contrast_score;

  // Low-light
  const llScore = functional.low_light_score != null && functional.mesopic_penalty != null
    ? Math.max(0, functional.low_light_score - functional.mesopic_penalty)
    : functional.low_light_score;

  const distAge = distScore != null ? scoreToAgeRange(distScore) : null;
  const nearAge = nearScore != null ? scoreToAgeRange(nearScore) : null;
  const contrastAge = contrastScore != null ? scoreToAgeRange(contrastScore) : null;
  const llAge = llScore != null ? scoreToAgeRange(llScore) : null;

  // Overall: average midpoints of available domains
  const domainMids = [distAge, nearAge, contrastAge, llAge]
    .filter(r => r != null)
    .map(r => ageRangeMidpoint(r!));

  let overall: [number, number] | null = null;
  if (domainMids.length >= 2) {
    const avg = domainMids.reduce((a, b) => a + b, 0) / domainMids.length;
    const spread = qualityOk ? 5 : 10;
    overall = [Math.round(avg - spread), Math.round(avg + spread)];
  }

  const confLabel = qualityConf >= 80 ? 'High' : qualityConf >= 60 ? 'Medium' : 'Low';

  return {
    distance_age_range: distAge,
    near_age_range: nearAge,
    contrast_age_range: contrastAge,
    low_light_age_range: llAge,
    overall_age_range: overall,
    confidence_label: confLabel,
  };
}
