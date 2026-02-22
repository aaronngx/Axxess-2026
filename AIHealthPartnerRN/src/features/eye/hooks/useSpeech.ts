// src/features/eye/hooks/useSpeech.ts
// Thin wrapper around expo-speech for eye-test voice guidance.
// Cancels any in-flight utterance before speaking the next line.
// Auto-stops on component unmount.

import { useEffect } from 'react';
import * as Speech from 'expo-speech';

const DEFAULT_RATE  = 0.90; // slightly slower for clarity
const DEFAULT_PITCH = 1.0;

/** Stop whatever is currently playing. */
export function stopSpeech() {
  Speech.stop();
}

/**
 * Speak text immediately, stopping any prior utterance.
 * Safe to call from event handlers or useEffect.
 */
export function speak(
  text: string,
  opts?: { rate?: number; pitch?: number },
) {
  Speech.stop();
  Speech.speak(text, {
    rate:  opts?.rate  ?? DEFAULT_RATE,
    pitch: opts?.pitch ?? DEFAULT_PITCH,
  });
}

/**
 * Hook: speaks `text` once after a short delay when the hook mounts
 * (or whenever `deps` change). Cancels speech on unmount / dep change.
 *
 * Returns { speak, stop } for on-demand calls from event handlers.
 */
export function useSpeech(text?: string, deps: unknown[] = []) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => speak(text), 380);
    return () => {
      clearTimeout(t);
      stopSpeech();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { speak, stop: stopSpeech };
}
