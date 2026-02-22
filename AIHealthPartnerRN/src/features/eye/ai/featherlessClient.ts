// src/features/eye/ai/featherlessClient.ts
// Featherless.ai language layer — optional, offline fallback always provided.
// v1: direct device call (key exposure risk; v2 add proxy).
// Key management: set FEATHERLESS_API_KEY env or leave blank for offline mode.

const FEATHERLESS_BASE = 'https://api.featherless.ai/v1';
const MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';

// Set your API key here. Leave empty to always use offline fallback.
const API_KEY = '';

export async function callFeatherless(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 400,
): Promise<string> {
  if (!API_KEY) throw new Error('No API key configured');

  const res = await fetch(`${FEATHERLESS_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!res.ok) throw new Error(`Featherless error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
