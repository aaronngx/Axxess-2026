// src/features/eye/ai/explainers.ts
// Language-layer: AI coaching + plain-language result summaries.
// Always provides offline fallback. AI call is optional.

import { EyeSessionResult } from '../models/types';
import { callFeatherless } from './featherlessClient';

// ── Offline fallbacks ────────────────────────────────────────────────────────

function offlineSummary(session: Partial<EyeSessionResult>): string {
  const q = session.quality;
  const perEye = session.per_eye ?? [];
  const qualityNote = q?.quality_label === 'High'
    ? 'Your test quality was high — results are reliable.'
    : q?.quality_label === 'Medium'
    ? 'Test quality was medium. Consider retesting for more reliable results.'
    : 'Test quality was low. Please retest in better lighting conditions.';

  const eyeLines = perEye.map(e => {
    const side = e.eye === 'right' ? 'Right' : 'Left';
    const ser = e.ser_d != null ? `${e.ser_d > 0 ? '+' : ''}${e.ser_d.toFixed(2)} D` : '—';
    return `${side} eye SER: ${ser}`;
  }).join('\n');

  return `${qualityNote}\n\n${eyeLines || 'No per-eye data collected.'}\n\nThis is a screening-grade estimate. Always consult an optometrist for a full examination.`;
}

function offlineNextSteps(session: Partial<EyeSessionResult>): string[] {
  const steps: string[] = [];
  const q = session.quality;

  if (q?.quality_label === 'Low' || q?.quality_label === 'Medium') {
    steps.push('Retest in a brighter, stable environment for higher quality results.');
  }
  if ((session.functional?.strain_score_0to10 ?? 0) >= 5) {
    steps.push('Significant eye strain detected. Take regular breaks using the 20-20-20 rule.');
  }
  if ((session.functional?.preferred_reading_distance_cm ?? 0) > 50) {
    steps.push('Your preferred reading distance suggests you may benefit from reading glasses.');
  }
  if ((session.functional?.low_light_score ?? 1) < 0.6) {
    steps.push('Low-light vision is reduced. Avoid driving at night without further evaluation.');
  }

  const serValues = (session.per_eye ?? []).map(e => e.ser_d).filter(v => v != null) as number[];
  const worstSer = serValues.length > 0 ? Math.min(...serValues) : 0;
  if (worstSer < -1.5) {
    steps.push('Significant myopia detected. Schedule an optometrist appointment for prescription verification.');
  }

  if (steps.length === 0) {
    steps.push('Results look reasonable. Continue monitoring with regular check-ins.');
  }

  return steps;
}

// ── AI-enhanced (with offline fallback) ──────────────────────────────────────

export async function generateSummary(
  session: Partial<EyeSessionResult>,
): Promise<{ summary: string; steps: string[]; source: 'ai' | 'offline' }> {
  try {
    const systemPrompt = `You are a friendly, empathetic vision health assistant.
You explain vision screening results in plain language.
You always clarify results are screening-grade estimates, not medical diagnoses.
Be concise and reassuring. Max 3 sentences for summary.`;

    const eyeData = (session.per_eye ?? []).map(e =>
      `${e.eye} eye: SER=${e.ser_d ?? 'N/A'} D, Cyl=${e.cylinder_d ?? 'N/A'} D, ` +
      `Axis=${e.axis_deg ?? 'N/A'}°, Confidence=${Math.round((e.confidence_0to1 ?? 0) * 100)}%`
    ).join('; ');

    const userPrompt = `Vision screening results:
Quality: ${session.quality?.quality_label ?? 'Unknown'} (${session.quality?.confidence_0to100 ?? 0}/100)
${eyeData}
Near VA proxy: ${session.functional?.near_va_proxy ?? 'N/A'}
Contrast score: ${session.functional?.contrast_score ?? 'N/A'}
Low-light score: ${session.functional?.low_light_score ?? 'N/A'}
Strain: ${session.functional?.strain_score_0to10 ?? 'N/A'}/10

Write a 2-3 sentence plain-language summary and then list 2-4 actionable next steps as bullet points.`;

    const raw = await callFeatherless(systemPrompt, userPrompt, 350);

    // Parse: split summary from bullet points
    const lines = raw.split('\n').filter(l => l.trim());
    const bulletStart = lines.findIndex(l => l.match(/^[-•*\d]/));
    const summary = bulletStart > 0
      ? lines.slice(0, bulletStart).join(' ')
      : lines.slice(0, 2).join(' ');
    const steps = lines
      .slice(bulletStart > 0 ? bulletStart : 2)
      .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
      .filter(l => l.length > 10);

    return { summary, steps: steps.slice(0, 4), source: 'ai' };
  } catch {
    return {
      summary: offlineSummary(session),
      steps: offlineNextSteps(session),
      source: 'offline',
    };
  }
}
