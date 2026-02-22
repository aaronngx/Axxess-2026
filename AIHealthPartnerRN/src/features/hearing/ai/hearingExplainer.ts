// src/features/hearing/ai/hearingExplainer.ts
// Jamie / Featherless layer — explanation and coaching only.
// LLM does NOT compute the hearing score.

import { HearingSessionResult } from '../models/types';
import { nextStepLabel } from '../engine/safetyRules';

const FEATHERLESS_API_KEY = ''; // Set your Featherless API key here
const FEATHERLESS_URL = 'https://api.featherless.ai/v1/chat/completions';
const MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';

async function callFeatherless(system: string, user: string, maxTokens = 300): Promise<string | null> {
  if (!FEATHERLESS_API_KEY) return null;
  try {
    const res = await fetch(FEATHERLESS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

function buildPayload(session: HearingSessionResult): string {
  return JSON.stringify({
    hearing_function_age: session.hearing_function_age,
    user_age: session.user_age,
    percentile: session.percentile_vs_age_peers,
    confidence: session.confidence,
    pattern_flags: session.pattern_flags,
    urgency: session.urgency,
    next_step: session.recommended_next_step,
    symptom_context: session.symptoms,
    test_source: session.test_source,
  }, null, 2);
}

const SYSTEM_PROMPT = `You are Jamie, a supportive health assistant.
You explain hearing screening results in plain, empathetic language.
Rules:
- NEVER use the word "diagnosis" or claim to diagnose anything
- Keep language accessible (8th-grade reading level)
- Be reassuring but honest about red flags
- Do NOT override safety rules from the structured data
- Response must be 2-3 short sentences only`;

const STEPS_PROMPT = `You are Jamie. Based on this structured hearing screening result,
list 2-3 concrete next steps the user should take.
Format as a short bulleted list. No diagnosis wording.`;

function offlineSummary(session: Partial<HearingSessionResult>): string {
  const age = session.hearing_function_age;
  const conf = session.confidence;
  const band = session.pattern_flags?.severity_band ?? 'normal';

  if (session.test_source === 'symptom_only') {
    return 'Based on your symptoms alone, we can\'t estimate hearing age. Taking a proper hearing test will give you a clearer picture of your hearing health.';
  }

  if (band === 'normal') {
    return `Your hearing results look healthy${age ? ` (function age ~${age})` : ''}. Keep protecting your hearing from loud noise and retest in 6–12 months to track any changes over time.`;
  }

  if (band === 'mild') {
    return `Your results show mild hearing difficulty${age ? ` (function age ~${age})` : ''}. This is common and manageable — an audiologist can help confirm and advise on next steps. Confidence: ${conf}.`;
  }

  return `Your results suggest moderate or greater hearing difficulty${age ? ` (function age ~${age})` : ''}. Following up with an audiologist is recommended. Remember: this is a screening estimate, not a diagnosis.`;
}

function offlineNextSteps(session: Partial<HearingSessionResult>): string {
  const steps: string[] = [];
  const nextStep = session.recommended_next_step ?? 'retest';
  const symptoms = session.symptoms;

  steps.push(`• ${nextStepLabel(nextStep)}`);

  if (symptoms?.tinnitus) {
    steps.push('• Mention tinnitus to your audiologist or doctor');
  }
  if (session.quality_context?.recent_loud_noise_24h) {
    steps.push('• Wait 48 hours after loud noise exposure before retesting for accuracy');
  }
  if (session.quality_context?.cold_allergy_infection_24h) {
    steps.push('• Retest after your cold/allergy symptoms clear for a more reliable result');
  }

  steps.push('• Protect your hearing: use earplugs at concerts and limit headphone volume');

  return steps.join('\n');
}

export async function generateHearingSummary(session: HearingSessionResult): Promise<{
  summary: string;
  steps: string;
  source: 'ai' | 'offline';
}> {
  const payload = buildPayload(session);

  const [aiSummary, aiSteps] = await Promise.all([
    callFeatherless(SYSTEM_PROMPT, `Here is the hearing screening result:\n${payload}\n\nWrite a plain-language summary.`),
    callFeatherless(STEPS_PROMPT, `Here is the hearing screening result:\n${payload}\n\nList 2-3 next steps.`),
  ]);

  if (aiSummary && aiSteps) {
    return { summary: aiSummary, steps: aiSteps, source: 'ai' };
  }

  return {
    summary: offlineSummary(session),
    steps: offlineNextSteps(session),
    source: 'offline',
  };
}
