// src/features/hearing/engine/hearingAgeEngine.ts
// Norm-based Hearing Function Age estimate (ISO 7029-inspired, simplified).
// Transparent and deterministic — no ML.

// Approximate median PTA (dBHL) for otologically normal ears by age.
// Derived from ISO 7029 reference values (sex-averaged, 0.5/1/2/4 kHz PTA).
const AGE_NORMS: Array<{ age: number; medianPTA: number }> = [
  { age: 18, medianPTA: 2 },
  { age: 20, medianPTA: 3 },
  { age: 25, medianPTA: 5 },
  { age: 30, medianPTA: 8 },
  { age: 35, medianPTA: 11 },
  { age: 40, medianPTA: 15 },
  { age: 45, medianPTA: 19 },
  { age: 50, medianPTA: 24 },
  { age: 55, medianPTA: 29 },
  { age: 60, medianPTA: 35 },
  { age: 65, medianPTA: 41 },
  { age: 70, medianPTA: 48 },
  { age: 75, medianPTA: 55 },
  { age: 80, medianPTA: 62 },
];

const NORM_STD_DEV = 12; // Population SD in dBHL

/** Standard normal CDF approximation (Box-Muller not needed; use rational approx) */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const cdf = 1 - poly * Math.exp(-z * z / 2);
  return z >= 0 ? cdf : 1 - cdf;
}

/** Interpolate norm table to find medianPTA at any age */
function normPTAatAge(age: number): number {
  if (age <= AGE_NORMS[0].age) return AGE_NORMS[0].medianPTA;
  if (age >= AGE_NORMS[AGE_NORMS.length - 1].age) return AGE_NORMS[AGE_NORMS.length - 1].medianPTA;
  for (let i = 0; i < AGE_NORMS.length - 1; i++) {
    const lo = AGE_NORMS[i];
    const hi = AGE_NORMS[i + 1];
    if (age >= lo.age && age <= hi.age) {
      const t = (age - lo.age) / (hi.age - lo.age);
      return lo.medianPTA + t * (hi.medianPTA - lo.medianPTA);
    }
  }
  return AGE_NORMS[AGE_NORMS.length - 1].medianPTA;
}

/** Find the age whose median PTA is closest to the given burden score */
function burdenToAge(burden: number): number {
  // Search norm table for closest match
  let bestAge = AGE_NORMS[0].age;
  let bestDiff = Infinity;
  for (const { age, medianPTA } of AGE_NORMS) {
    const diff = Math.abs(medianPTA - burden);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestAge = age;
    }
  }
  // Interpolate between two closest points for finer granularity
  for (let i = 0; i < AGE_NORMS.length - 1; i++) {
    const lo = AGE_NORMS[i];
    const hi = AGE_NORMS[i + 1];
    if (burden >= lo.medianPTA && burden <= hi.medianPTA) {
      const t = (burden - lo.medianPTA) / (hi.medianPTA - lo.medianPTA);
      return Math.round(lo.age + t * (hi.age - lo.age));
    }
  }
  // Extrapolate beyond table
  if (burden < AGE_NORMS[0].medianPTA) return AGE_NORMS[0].age;
  return AGE_NORMS[AGE_NORMS.length - 1].age;
}

export interface HearingAgeResult {
  hearing_function_age: number;
  percentile_vs_age_peers: number | null;
}

/**
 * Compute Hearing Function Age estimate from burden score.
 * @param burden - Hearing Burden Score (output of featureExtraction)
 * @param userAge - Actual chronological age (nullable)
 */
export function computeHearingAge(burden: number, userAge: number | null): HearingAgeResult {
  const hearing_function_age = Math.min(85, Math.max(15, burdenToAge(burden)));

  let percentile_vs_age_peers: number | null = null;
  if (userAge != null) {
    const normAtUserAge = normPTAatAge(userAge);
    const z = (burden - normAtUserAge) / NORM_STD_DEV;
    // Percentile: higher = worse than peers
    const raw = normalCDF(z) * 100;
    percentile_vs_age_peers = Math.round(Math.max(1, Math.min(99, raw)));
  }

  return { hearing_function_age, percentile_vs_age_peers };
}
