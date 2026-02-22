// src/features/eye/models/types.ts — Data model (from Blueprint §9)

export type EyeSide = 'right' | 'left';

export interface EyeRunResult {
  eye: EyeSide;
  timestamp: string;

  sphere_d: number | null;
  cylinder_d: number | null;
  axis_deg: number | null;
  ser_d: number | null;

  far_va_proxy: number | null;
  run_confidence_0to1: number;

  staircase_trials: number;
  staircase_reversals: number;
  response_accuracy: number; // 0..1
  response_time_ms_median: number;
}

export interface EyeCombinedResult {
  eye: EyeSide;

  sphere_d: number | null;
  cylinder_d: number | null;
  axis_deg: number | null;
  ser_d: number | null;

  far_va_proxy: number | null;

  delta_ser_d: number | null;
  delta_cylinder_d: number | null;
  delta_axis_deg: number | null;

  confidence_0to1: number;
}

export interface FunctionalVisionResult {
  preferred_reading_distance_cm: number | null;
  near_va_proxy: number | null;

  strain_score_0to10: number | null;
  blur_score_0to10: number | null;
  headache_flag: boolean | null;

  contrast_score: number | null;

  low_light_score: number | null;
  mesopic_penalty: number | null;
}

export interface QualityMetrics {
  confidence_0to100: number;
  quality_label: 'High' | 'Medium' | 'Low';
  reasons: string[];

  distance_std_cm: number | null;
  valid_frame_pct: number | null;
  tilt_deg_p95: number | null;
  lighting_variance: number | null;

  repeatability_ok: boolean;
}

export interface VisionAgeResult {
  distance_age_range: [number, number] | null;
  near_age_range: [number, number] | null;
  contrast_age_range: [number, number] | null;
  low_light_age_range: [number, number] | null;

  overall_age_range: [number, number] | null;
  confidence_label: 'High' | 'Medium' | 'Low';
}

export interface EyeSessionResult {
  session_id: string;
  created_at: string;

  device_model: string;
  os_version: string;
  app_version: string;

  pd_mm: number | null;
  pd_confidence_0to1: number | null;

  runs: EyeRunResult[];
  per_eye: EyeCombinedResult[];

  functional: FunctionalVisionResult;
  quality: QualityMetrics;
  vision_age: VisionAgeResult | null;

  symptoms: {
    eye_strain: boolean;
    headaches_reading: boolean;
    night_driving_difficulty: boolean;
    glare_sensitivity: boolean;
    frequent_squinting: boolean;
    blurry_near: boolean;
    blurry_far: boolean;
    sudden_change: boolean;
  };
}

// Root stack navigation param list
export type RootStackParamList = {
  Tabs: undefined;
  // Eye Vision Screening
  EyeSafetyGate: undefined;
  EyeSetupCamera: undefined;
  EyePdLock: undefined;
  EyeFarTest: { eye: EyeSide; run: 1 | 2 };
  EyeAstigDial: { eye: EyeSide; run: 1 | 2 };
  EyeNear: undefined;
  EyeContrast: undefined;
  EyeLowLight: undefined;
  EyeResults: undefined;
  EyeHistory: undefined;
  // Hearing Screening
  HearingEntry: undefined;
  HearingPreCheck: { source: 'apple' | 'speech_in_noise' | 'symptom_only' };
  HearingAppleInput: undefined;
  HearingSpeechInNoise: undefined;
  HearingResults: undefined;
  HearingHistory: undefined;
};
