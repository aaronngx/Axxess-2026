// src/features/hearing/engine/confidenceEngine.ts
// Weighted confidence scoring from test quality and context.

import { HearingConfidence, HearingQualityContext, TestSource } from '../models/types';

interface ConfidenceInput {
  testSource: TestSource;
  qualityContext: HearingQualityContext;
  hasAudiogram: boolean;
  sinScore: number | null;
}

export function computeConfidence(input: ConfidenceInput): HearingConfidence {
  let score = 100;

  // Test source baseline
  if (input.testSource === 'apple') score -= 0;         // Best: validated hardware
  else if (input.testSource === 'speech_in_noise') score -= 15; // Good fallback
  else score -= 45;                                      // Symptom-only → Low

  // Headphones not connected — big hit
  if (!input.qualityContext.headphones_connected) score -= 20;

  // Noisy room
  if (!input.qualityContext.quiet_room) score -= 15;

  // Confounders
  if (input.qualityContext.recent_loud_noise_24h) score -= 15;
  if (input.qualityContext.cold_allergy_infection_24h) score -= 10;

  // Audiogram data present — boost confidence
  if (input.hasAudiogram) score += 10;

  // SIN score corroborates audiogram
  if (input.sinScore != null) score += 5;

  score = Math.max(0, Math.min(100, score));

  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}
