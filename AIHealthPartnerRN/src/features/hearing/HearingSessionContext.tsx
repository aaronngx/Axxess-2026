// src/features/hearing/HearingSessionContext.tsx
// Holds in-progress hearing session state across all intake screens.

import React, { createContext, useContext, useRef, useState } from 'react';
import { HearingSessionResult, HearingSymptoms, HearingQualityContext, HearingPatternFlags } from './models/types';

const EMPTY_SYMPTOMS: HearingSymptoms = {
  sudden_change: false,
  one_ear_worse: false,
  tinnitus: false,
  ear_pain: false,
  dizziness: false,
  trouble_in_noise: false,
};

const EMPTY_QUALITY: HearingQualityContext = {
  quiet_room: false,
  headphones_connected: false,
  recent_loud_noise_24h: false,
  cold_allergy_infection_24h: false,
};

const EMPTY_PATTERN: HearingPatternFlags = {
  high_frequency_loss: false,
  low_frequency_loss: false,
  left_right_asymmetry: false,
  asymmetry_severity: 'none',
  severity_band: 'normal',
  speech_in_noise_difficulty: false,
};

function makeEmptySession(): Partial<HearingSessionResult> {
  return {
    session_id: `hs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    test_source: 'apple',
    left_dbhl: null,
    right_dbhl: null,
    audiogram_points_left: null,
    audiogram_points_right: null,
    sin_score: null,
    symptoms: { ...EMPTY_SYMPTOMS },
    quality_context: { ...EMPTY_QUALITY },
    user_age: null,
    pattern_flags: { ...EMPTY_PATTERN },
    hearing_function_age: null,
    percentile_vs_age_peers: null,
    confidence: 'Low',
    urgency: 'routine',
    recommended_next_step: 'retest',
    ai_summary: null,
    ai_next_steps: null,
    ai_source: null,
  };
}

interface HearingSessionCtx {
  session: Partial<HearingSessionResult>;
  updateSession: (patch: Partial<HearingSessionResult>) => void;
  resetSession: () => void;
}

const HearingSessionContext = createContext<HearingSessionCtx | null>(null);

export const HearingSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Partial<HearingSessionResult>>(makeEmptySession);

  const updateSession = (patch: Partial<HearingSessionResult>) =>
    setSession(prev => ({ ...prev, ...patch }));

  const resetSession = () => setSession(makeEmptySession());

  return (
    <HearingSessionContext.Provider value={{ session, updateSession, resetSession }}>
      {children}
    </HearingSessionContext.Provider>
  );
};

export function useHearingSession(): HearingSessionCtx {
  const ctx = useContext(HearingSessionContext);
  if (!ctx) throw new Error('useHearingSession must be used inside HearingSessionProvider');
  return ctx;
}
