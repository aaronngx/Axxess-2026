// src/features/hearing/models/types.ts — Hearing Feature Data Model

export type TestSource = 'apple' | 'speech_in_noise' | 'symptom_only';
export type HearingConfidence = 'High' | 'Medium' | 'Low';
export type HearingUrgency = 'routine' | 'soon' | 'urgent';
export type HearingNextStep = 'retest' | 'audiologist' | 'doctor' | 'urgent_evaluation';
export type AsymmetrySeverity = 'none' | 'mild' | 'moderate' | 'severe';
export type SeverityBand =
  | 'normal'
  | 'mild'
  | 'moderate'
  | 'moderately_severe'
  | 'severe'
  | 'profound';

export interface AudiogramPoint {
  hz: number;    // e.g. 250, 500, 1000, 2000, 4000, 8000
  dbhl: number;  // hearing threshold in dB HL
}

export interface HearingSymptoms {
  sudden_change: boolean;
  one_ear_worse: boolean;
  tinnitus: boolean;
  ear_pain: boolean;
  dizziness: boolean;
  trouble_in_noise: boolean;
}

export interface HearingQualityContext {
  quiet_room: boolean;
  headphones_connected: boolean;
  recent_loud_noise_24h: boolean;
  cold_allergy_infection_24h: boolean;
}

export interface HearingPatternFlags {
  high_frequency_loss: boolean;
  low_frequency_loss: boolean;
  left_right_asymmetry: boolean;
  asymmetry_severity: AsymmetrySeverity;
  severity_band: SeverityBand;
  speech_in_noise_difficulty: boolean;
}

export interface HearingSessionResult {
  session_id: string;
  created_at: string;

  test_source: TestSource;

  // Raw inputs
  left_dbhl: number | null;
  right_dbhl: number | null;
  audiogram_points_left: AudiogramPoint[] | null;
  audiogram_points_right: AudiogramPoint[] | null;
  sin_score: number | null;   // WHO hearWHO score 0–100

  symptoms: HearingSymptoms;
  quality_context: HearingQualityContext;

  user_age: number | null;

  // Computed outputs
  pattern_flags: HearingPatternFlags;
  hearing_function_age: number | null;
  percentile_vs_age_peers: number | null;
  confidence: HearingConfidence;
  urgency: HearingUrgency;
  recommended_next_step: HearingNextStep;

  // AI
  ai_summary: string | null;
  ai_next_steps: string | null;
  ai_source: 'ai' | 'offline' | null;
}
