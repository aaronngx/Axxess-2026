// src/features/hearing/engine/featureExtraction.ts
// Deterministic feature extraction from audiogram / dBHL inputs.
// No LLM here.

import { AudiogramPoint, HearingPatternFlags, SeverityBand, AsymmetrySeverity } from '../models/types';

const PTA_FREQS = [500, 1000, 2000, 4000]; // Standard 4-frequency PTA

/** Compute pure-tone average from audiogram points at standard PTA frequencies */
export function computePTA(points: AudiogramPoint[] | null, fallback: number | null): number | null {
  if (!points || points.length === 0) return fallback;
  const ptaPoints = points.filter(p => PTA_FREQS.includes(p.hz));
  if (ptaPoints.length === 0) return fallback;
  return ptaPoints.reduce((sum, p) => sum + p.dbhl, 0) / ptaPoints.length;
}

/** Better ear = lower PTA (less loss) */
export function betterEarPTA(leftPTA: number | null, rightPTA: number | null): number | null {
  if (leftPTA == null && rightPTA == null) return null;
  if (leftPTA == null) return rightPTA;
  if (rightPTA == null) return leftPTA;
  return Math.min(leftPTA, rightPTA);
}

/** WHO severity band classification (better ear PTA) */
export function classifySeverity(pta: number | null): SeverityBand {
  if (pta == null) return 'normal';
  if (pta <= 20) return 'normal';
  if (pta <= 35) return 'mild';
  if (pta <= 50) return 'moderate';
  if (pta <= 65) return 'moderately_severe';
  if (pta <= 80) return 'severe';
  return 'profound';
}

/** Check for high-frequency drop-off pattern (4kHz much worse than 1kHz) */
export function hasHighFrequencyLoss(points: AudiogramPoint[] | null): boolean {
  if (!points || points.length === 0) return false;
  const hz1k = points.find(p => p.hz === 1000);
  const hz4k = points.find(p => p.hz === 4000);
  if (!hz1k || !hz4k) return false;
  return hz4k.dbhl - hz1k.dbhl > 15;
}

/** Check for low-frequency pattern (250-500Hz worse than 1kHz) */
export function hasLowFrequencyLoss(points: AudiogramPoint[] | null): boolean {
  if (!points || points.length === 0) return false;
  const hz250 = points.find(p => p.hz === 250);
  const hz1k = points.find(p => p.hz === 1000);
  if (!hz250 || !hz1k) return false;
  return hz250.dbhl - hz1k.dbhl > 15;
}

/** Left-right asymmetry classification */
export function classifyAsymmetry(leftPTA: number | null, rightPTA: number | null): AsymmetrySeverity {
  if (leftPTA == null || rightPTA == null) return 'none';
  const diff = Math.abs(leftPTA - rightPTA);
  if (diff < 10) return 'none';
  if (diff < 20) return 'mild';
  if (diff < 30) return 'moderate';
  return 'severe';
}

/** Full pattern extraction from all inputs */
export function extractPatternFlags(params: {
  leftPTA: number | null;
  rightPTA: number | null;
  audiogramLeft: AudiogramPoint[] | null;
  audiogramRight: AudiogramPoint[] | null;
  sinScore: number | null;
}): HearingPatternFlags {
  const { leftPTA, rightPTA, audiogramLeft, audiogramRight, sinScore } = params;

  const bestEar = betterEarPTA(leftPTA, rightPTA);
  const asymSeverity = classifyAsymmetry(leftPTA, rightPTA);

  // High-frequency: check audiogram, or use heuristic if only dBHL summary available
  const highFreqLeft = hasHighFrequencyLoss(audiogramLeft);
  const highFreqRight = hasHighFrequencyLoss(audiogramRight);
  const highFreqFallback =
    bestEar != null && bestEar > 15 && (!audiogramLeft && !audiogramRight);

  const lowFreqLeft = hasLowFrequencyLoss(audiogramLeft);
  const lowFreqRight = hasLowFrequencyLoss(audiogramRight);

  return {
    high_frequency_loss: highFreqLeft || highFreqRight || highFreqFallback,
    low_frequency_loss: lowFreqLeft || lowFreqRight,
    left_right_asymmetry: asymSeverity !== 'none',
    asymmetry_severity: asymSeverity,
    severity_band: classifySeverity(bestEar),
    speech_in_noise_difficulty: sinScore != null && sinScore < 50,
  };
}

/** Compute the hearing burden score (0–100+) used for age mapping */
export function computeHearingBurden(params: {
  leftPTA: number | null;
  rightPTA: number | null;
  audiogramLeft: AudiogramPoint[] | null;
  audiogramRight: AudiogramPoint[] | null;
  sinScore: number | null;
  pattern: HearingPatternFlags;
}): number {
  const { leftPTA, rightPTA, pattern, sinScore } = params;
  const bestEar = betterEarPTA(leftPTA, rightPTA);
  let burden = bestEar ?? 0;

  // High-frequency penalty
  if (pattern.high_frequency_loss) burden += 5;

  // Asymmetry penalty
  if (pattern.asymmetry_severity === 'mild') burden += 3;
  if (pattern.asymmetry_severity === 'moderate') burden += 7;
  if (pattern.asymmetry_severity === 'severe') burden += 12;

  // Speech-in-noise adjustment
  if (sinScore != null) {
    // WHO hearWHO score 0-100; 50 = pass threshold
    const sinPenalty = Math.max(0, (50 - sinScore) * 0.4);
    burden += sinPenalty;
  }

  return Math.max(0, burden);
}
