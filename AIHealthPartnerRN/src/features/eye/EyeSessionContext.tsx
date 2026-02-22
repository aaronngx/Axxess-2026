// src/features/eye/EyeSessionContext.tsx
// In-memory session state shared across all Eye screens during one run.

import React, { createContext, useCallback, useContext, useState } from 'react';
import { Platform } from 'react-native';
import { EyeSessionResult } from './models/types';

function makeSessionId(): string {
  return `eye-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeEmptySession(): Partial<EyeSessionResult> {
  return {
    session_id: makeSessionId(),
    created_at: new Date().toISOString(),
    device_model: 'iPhone',
    os_version: String(Platform.Version),
    app_version: '1.0.0',
    pd_mm: null,
    pd_confidence_0to1: null,
    runs: [],
    per_eye: [],
    functional: {
      preferred_reading_distance_cm: null,
      near_va_proxy: null,
      strain_score_0to10: null,
      blur_score_0to10: null,
      headache_flag: null,
      contrast_score: null,
      low_light_score: null,
      mesopic_penalty: null,
    },
    quality: {
      confidence_0to100: 0,
      quality_label: 'Low',
      reasons: [],
      distance_std_cm: null,
      valid_frame_pct: null,
      tilt_deg_p95: null,
      lighting_variance: null,
      repeatability_ok: false,
    },
    vision_age: null,
    symptoms: {
      eye_strain: false,
      headaches_reading: false,
      night_driving_difficulty: false,
      glare_sensitivity: false,
      frequent_squinting: false,
      blurry_near: false,
      blurry_far: false,
      sudden_change: false,
    },
  };
}

interface EyeSessionContextValue {
  session: Partial<EyeSessionResult>;
  updateSession: (updates: Partial<EyeSessionResult>) => void;
  resetSession: () => void;
}

const EyeSessionContext = createContext<EyeSessionContextValue | null>(null);

export const EyeSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Partial<EyeSessionResult>>(makeEmptySession);

  const updateSession = useCallback((updates: Partial<EyeSessionResult>) => {
    setSession(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSession = useCallback(() => {
    setSession(makeEmptySession());
  }, []);

  return (
    <EyeSessionContext.Provider value={{ session, updateSession, resetSession }}>
      {children}
    </EyeSessionContext.Provider>
  );
};

export function useEyeSession(): EyeSessionContextValue {
  const ctx = useContext(EyeSessionContext);
  if (!ctx) throw new Error('useEyeSession must be used inside EyeSessionProvider');
  return ctx;
}
