// src/features/hearing/screens/HearingResults.tsx
// Full results display — safety gate → top card → details → AI → export.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHearingSession } from '../HearingSessionContext';
import { hearingStorage } from '../storage/hearingStorage';
import { computePTA, extractPatternFlags, computeHearingBurden } from '../engine/featureExtraction';
import { computeConfidence } from '../engine/confidenceEngine';
import { computeHearingAge } from '../engine/hearingAgeEngine';
import { runSafetyRules, nextStepLabel, urgencyLabel } from '../engine/safetyRules';
import { generateHearingSummary } from '../ai/hearingExplainer';
import { exportHearingPDF } from '../report/exportPdf';
import { HearingSessionResult } from '../models/types';

function confidenceColor(c: string): string {
  if (c === 'High') return '#2ECC71';
  if (c === 'Medium') return '#FDCB6E';
  return '#FF6B81';
}

function urgencyColor(u: string): string {
  if (u === 'urgent') return '#E74C3C';
  if (u === 'soon') return '#F39C12';
  return '#2ECC71';
}

function severityLabel(band: string): string {
  return band.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const HearingResults: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { session, resetSession } = useHearingSession();

  const [result, setResult] = useState<HearingSessionResult | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSteps, setAiSteps] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Dev mode: tap title 5× within 2s to share JSON
  const devTaps = useRef(0);
  const devTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleTap = () => {
    devTaps.current += 1;
    if (devTimer.current) clearTimeout(devTimer.current);
    devTimer.current = setTimeout(() => { devTaps.current = 0; }, 2000);
    if (devTaps.current >= 5 && result) {
      devTaps.current = 0;
      Share.share({ message: JSON.stringify(result, null, 2), title: 'Hearing Session JSON' });
    }
  };

  useEffect(() => {
    // 1. Compute all engines deterministically
    const s = session;
    const leftPTA = computePTA(s.audiogram_points_left ?? null, s.left_dbhl ?? null);
    const rightPTA = computePTA(s.audiogram_points_right ?? null, s.right_dbhl ?? null);

    const pattern = extractPatternFlags({
      leftPTA,
      rightPTA,
      audiogramLeft: s.audiogram_points_left ?? null,
      audiogramRight: s.audiogram_points_right ?? null,
      sinScore: s.sin_score ?? null,
    });

    const burden = computeHearingBurden({
      leftPTA,
      rightPTA,
      audiogramLeft: s.audiogram_points_left ?? null,
      audiogramRight: s.audiogram_points_right ?? null,
      sinScore: s.sin_score ?? null,
      pattern,
    });

    const confidence = computeConfidence({
      testSource: s.test_source ?? 'apple',
      qualityContext: s.quality_context ?? {
        quiet_room: false, headphones_connected: false,
        recent_loud_noise_24h: false, cold_allergy_infection_24h: false,
      },
      hasAudiogram: !!(s.audiogram_points_left?.length || s.audiogram_points_right?.length),
      sinScore: s.sin_score ?? null,
    });

    const { hearing_function_age, percentile_vs_age_peers } =
      (s.test_source === 'symptom_only')
        ? { hearing_function_age: null, percentile_vs_age_peers: null }
        : computeHearingAge(burden, s.user_age ?? null);

    const { urgency, recommended_next_step } = runSafetyRules(
      s.symptoms ?? {
        sudden_change: false, one_ear_worse: false, tinnitus: false,
        ear_pain: false, dizziness: false, trouble_in_noise: false,
      },
      pattern,
      hearing_function_age,
      s.user_age ?? null,
    );

    const built: HearingSessionResult = {
      session_id: s.session_id ?? `hs_${Date.now()}`,
      created_at: s.created_at ?? new Date().toISOString(),
      test_source: s.test_source ?? 'apple',
      left_dbhl: s.left_dbhl ?? null,
      right_dbhl: s.right_dbhl ?? null,
      audiogram_points_left: s.audiogram_points_left ?? null,
      audiogram_points_right: s.audiogram_points_right ?? null,
      sin_score: s.sin_score ?? null,
      symptoms: s.symptoms ?? {
        sudden_change: false, one_ear_worse: false, tinnitus: false,
        ear_pain: false, dizziness: false, trouble_in_noise: false,
      },
      quality_context: s.quality_context ?? {
        quiet_room: false, headphones_connected: false,
        recent_loud_noise_24h: false, cold_allergy_infection_24h: false,
      },
      user_age: s.user_age ?? null,
      pattern_flags: pattern,
      hearing_function_age,
      percentile_vs_age_peers,
      confidence,
      urgency,
      recommended_next_step,
      ai_summary: null,
      ai_next_steps: null,
      ai_source: null,
    };

    setResult(built);
    hearingStorage.saveSession(built);

    // 2. Non-blocking AI
    generateHearingSummary(built).then(({ summary, steps, source }) => {
      setAiSummary(summary);
      setAiSteps(steps);
      setAiLoading(false);
      const updated = { ...built, ai_summary: summary, ai_next_steps: steps, ai_source: source };
      setResult(updated);
      hearingStorage.saveSession(updated);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      await exportHearingPDF(result, aiSummary ?? undefined, aiSteps ?? undefined);
    } finally {
      setExporting(false);
    }
  };

  const handleRetake = () => {
    resetSession();
    navigation.navigate('HearingEntry');
  };

  if (!result) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color="#A29BFE" />
        <Text style={styles.loadingText}>Computing results…</Text>
      </View>
    );
  }

  const pf = result.pattern_flags;
  const flagList = [
    pf.high_frequency_loss && 'High-frequency loss',
    pf.low_frequency_loss && 'Low-frequency loss',
    pf.left_right_asymmetry && `Asymmetry (${pf.asymmetry_severity})`,
    pf.speech_in_noise_difficulty && 'Speech-in-noise difficulty',
  ].filter(Boolean) as string[];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleTitleTap}>
            <Text style={styles.title}>Hearing Results</Text>
          </TouchableOpacity>
          <View style={{ width: 44 }} />
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>Screening estimate only — not a medical diagnosis</Text>
        </View>

        {/* Urgency banner */}
        {result.urgency !== 'routine' && (
          <View style={[styles.urgencyBanner, { borderColor: urgencyColor(result.urgency) }]}>
            <Text style={styles.urgencyIcon}>{result.urgency === 'urgent' ? '🚨' : '⚠️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.urgencyTitle, { color: urgencyColor(result.urgency) }]}>
                {urgencyLabel(result.urgency)}
              </Text>
              <Text style={styles.urgencyNext}>{nextStepLabel(result.recommended_next_step)}</Text>
            </View>
          </View>
        )}

        {/* Top card */}
        <View style={styles.topCard}>
          <Text style={styles.topCardLabel}>Hearing Function Age (estimate)</Text>
          {result.hearing_function_age != null ? (
            <Text style={styles.ageValue}>{result.hearing_function_age}<Text style={styles.ageUnit}> yrs</Text></Text>
          ) : (
            <Text style={styles.insufficientText}>Insufficient signal</Text>
          )}
          {result.percentile_vs_age_peers != null && (
            <Text style={styles.percentileText}>
              {result.percentile_vs_age_peers <= 50
                ? `Better than ${100 - result.percentile_vs_age_peers}% of your age group`
                : `${result.percentile_vs_age_peers}th percentile vs. age peers`}
            </Text>
          )}

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { borderColor: confidenceColor(result.confidence) }]}>
              <Text style={[styles.badgeText, { color: confidenceColor(result.confidence) }]}>
                {result.confidence} confidence
              </Text>
            </View>
            <View style={[styles.badge, { borderColor: urgencyColor(result.urgency) }]}>
              <Text style={[styles.badgeText, { color: urgencyColor(result.urgency) }]}>
                {result.urgency === 'routine' ? 'Routine' : result.urgency === 'soon' ? 'Follow up soon' : 'Urgent'}
              </Text>
            </View>
          </View>
        </View>

        {/* Measurements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hearing Measurements</Text>
          <View style={styles.earRow}>
            {result.left_dbhl != null && (
              <View style={styles.earBox}>
                <Text style={styles.earLabel}>Left (OS)</Text>
                <Text style={styles.earDbhl}>{result.left_dbhl} dBHL</Text>
              </View>
            )}
            {result.left_dbhl != null && result.right_dbhl != null && <View style={styles.earDivider} />}
            {result.right_dbhl != null && (
              <View style={styles.earBox}>
                <Text style={styles.earLabel}>Right (OD)</Text>
                <Text style={styles.earDbhl}>{result.right_dbhl} dBHL</Text>
              </View>
            )}
          </View>
          {result.sin_score != null && (
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Speech-in-noise score</Text>
              <Text style={styles.kvVal}>{result.sin_score}/100</Text>
            </View>
          )}
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Severity</Text>
            <Text style={styles.kvVal}>{severityLabel(pf.severity_band)}</Text>
          </View>
          {flagList.length > 0 && (
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Patterns</Text>
              <Text style={[styles.kvVal, { flex: 1, textAlign: 'right' }]}>{flagList.join(' · ')}</Text>
            </View>
          )}
        </View>

        {/* Next step */}
        <View style={styles.nextStepBox}>
          <Text style={styles.nextStepLabel}>Recommended Next Step</Text>
          <Text style={styles.nextStepVal}>{nextStepLabel(result.recommended_next_step)}</Text>
        </View>

        {/* AI Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What This Means</Text>
          {aiLoading ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator size="small" color="#A29BFE" />
              <Text style={styles.aiLoadingText}>Generating summary…</Text>
            </View>
          ) : (
            <>
              <View style={styles.aiBox}>
                <Text style={styles.aiText}>{aiSummary}</Text>
              </View>
              {aiSteps && (
                <View style={[styles.aiBox, { marginTop: 10 }]}>
                  <Text style={styles.aiStepsTitle}>Next Steps</Text>
                  <Text style={styles.aiText}>{aiSteps}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF} disabled={exporting}>
          <Text style={styles.exportBtnText}>{exporting ? 'Generating PDF…' : '📄 Export PDF Report'}</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('HearingHistory')}>
            <Text style={styles.secondaryBtnText}>View History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetake}>
            <Text style={styles.secondaryBtnText}>Retake</Text>
          </TouchableOpacity>
        </View>

        {/* Debug */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug</Text>
        </TouchableOpacity>
        {debugOpen && (
          <ScrollView style={styles.debugBox} horizontal>
            <Text style={styles.debugText}>{JSON.stringify(result, null, 2)}</Text>
          </ScrollView>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 15, color: '#A29BFE', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 14 },
  disclaimer: {
    backgroundColor: 'rgba(253,203,110,0.08)', borderRadius: 10, padding: 8,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(253,203,110,0.15)',
  },
  disclaimerText: { fontSize: 11, color: 'rgba(253,203,110,0.7)', textAlign: 'center' },
  urgencyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14,
    borderWidth: 1, padding: 14, marginBottom: 14,
    backgroundColor: 'rgba(231,76,60,0.07)',
  },
  urgencyIcon: { fontSize: 22, marginRight: 10 },
  urgencyTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  urgencyNext: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  topCard: {
    backgroundColor: 'rgba(108,92,231,0.15)', borderRadius: 24,
    padding: 24, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.25)',
  },
  topCardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 6 },
  ageValue: { fontSize: 64, fontWeight: '900', color: '#FFFFFF', lineHeight: 70 },
  ageUnit: { fontSize: 20, color: 'rgba(255,255,255,0.6)' },
  insufficientText: { fontSize: 22, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginBottom: 8 },
  percentileText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  section: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  sectionTitle: { fontSize: 12, color: '#A29BFE', fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  earRow: { flexDirection: 'row', marginBottom: 10 },
  earBox: { flex: 1, alignItems: 'center' },
  earLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: 4 },
  earDbhl: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  earDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 12 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kvKey: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  kvVal: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  nextStepBox: {
    backgroundColor: 'rgba(162,155,254,0.1)', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.2)',
  },
  nextStepLabel: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  nextStepVal: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  aiLoading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  aiLoadingText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginLeft: 10 },
  aiBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14 },
  aiStepsTitle: { fontSize: 12, color: '#A29BFE', fontWeight: '700', marginBottom: 6 },
  aiText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 21 },
  exportBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 12,
  },
  exportBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  secondaryBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  debugToggle: { marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, maxHeight: 200, marginBottom: 16,
  },
  debugText: { fontSize: 10, color: 'rgba(162,155,254,0.7)', fontFamily: 'monospace' },
});
