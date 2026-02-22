// src/features/hearing/engine/safetyRules.ts
// Safety supervisor — runs BEFORE showing results.
// Pure deterministic rules. No LLM.

import { HearingSymptoms, HearingPatternFlags, HearingUrgency, HearingNextStep } from '../models/types';

export interface SafetyOutput {
  urgency: HearingUrgency;
  recommended_next_step: HearingNextStep;
  red_flags: string[];
}

export function runSafetyRules(
  symptoms: HearingSymptoms,
  pattern: HearingPatternFlags,
  hearingFunctionAge: number | null,
  userAge: number | null,
): SafetyOutput {
  const red_flags: string[] = [];
  let urgency: HearingUrgency = 'routine';
  let recommended_next_step: HearingNextStep = 'retest';

  // ── Urgent triggers ──────────────────────────────────────────
  if (symptoms.sudden_change) {
    red_flags.push('Sudden hearing change reported — seek evaluation promptly');
    urgency = 'urgent';
    recommended_next_step = 'urgent_evaluation';
  }

  if (symptoms.ear_pain && symptoms.dizziness) {
    red_flags.push('Ear pain combined with dizziness — see a doctor soon');
    if (urgency !== 'urgent') urgency = 'urgent';
    if (recommended_next_step === 'retest') recommended_next_step = 'doctor';
  }

  if (pattern.severity_band === 'severe' || pattern.severity_band === 'profound') {
    red_flags.push('Severe or profound hearing loss detected');
    if (urgency === 'routine') urgency = 'soon';
    if (recommended_next_step === 'retest') recommended_next_step = 'audiologist';
  }

  // ── Soon triggers ────────────────────────────────────────────
  if (pattern.asymmetry_severity === 'severe' || pattern.asymmetry_severity === 'moderate') {
    red_flags.push('Significant left-right difference — asymmetric hearing loss warrants evaluation');
    if (urgency === 'routine') urgency = 'soon';
    if (recommended_next_step === 'retest') recommended_next_step = 'audiologist';
  }

  if (symptoms.tinnitus && symptoms.dizziness) {
    red_flags.push('Tinnitus with dizziness — may indicate inner ear condition');
    if (urgency === 'routine') urgency = 'soon';
    if (recommended_next_step === 'retest') recommended_next_step = 'doctor';
  }

  if (symptoms.ear_pain) {
    red_flags.push('Ear pain noted — consider medical evaluation');
    if (urgency === 'routine') urgency = 'soon';
    if (recommended_next_step === 'retest') recommended_next_step = 'doctor';
  }

  if (pattern.severity_band === 'moderately_severe') {
    red_flags.push('Moderately severe hearing loss — audiologist evaluation recommended');
    if (urgency === 'routine') urgency = 'soon';
    if (recommended_next_step === 'retest') recommended_next_step = 'audiologist';
  }

  // ── Audiologist (routine concern) ────────────────────────────
  if (pattern.severity_band === 'moderate' && urgency === 'routine') {
    red_flags.push('Moderate hearing loss detected — audiologist check recommended');
    recommended_next_step = 'audiologist';
  }

  if (hearingFunctionAge != null && userAge != null && hearingFunctionAge > userAge + 10) {
    if (!red_flags.some(f => f.includes('hearing loss'))) {
      red_flags.push('Hearing function appears older than chronological age');
    }
    if (recommended_next_step === 'retest') recommended_next_step = 'audiologist';
  }

  // ── Tinnitus alone ───────────────────────────────────────────
  if (symptoms.tinnitus && urgency === 'routine') {
    red_flags.push('Tinnitus reported — mention to audiologist at next check');
  }

  return { urgency, recommended_next_step, red_flags };
}

export function urgencyLabel(u: HearingUrgency): string {
  if (u === 'urgent') return 'Urgent — see a doctor soon';
  if (u === 'soon') return 'Follow up soon';
  return 'Routine monitoring';
}

export function nextStepLabel(n: HearingNextStep): string {
  if (n === 'urgent_evaluation') return 'Urgent medical evaluation';
  if (n === 'doctor') return 'See your doctor';
  if (n === 'audiologist') return 'Schedule audiologist visit';
  return 'Retest in 6–12 months';
}
