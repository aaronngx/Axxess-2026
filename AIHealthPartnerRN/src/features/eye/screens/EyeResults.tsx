// src/features/eye/screens/EyeResults.tsx — Phase 10 + 11 + 12 + 13
// Full results: merge runs, quality score, Vision Age, AI summary, PDF export, dev mode.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import { useEyeSession } from '../EyeSessionContext';
import { eyeStorage } from '../storage/eyeStorage';
import { mergeEyeRuns, computeVisionAge } from '../engine/scoring';
import { computeQuality } from '../camera/quality';
import { generateSummary } from '../ai/explainers';
import { exportSessionPDF } from '../report/exportPdf';
import { EyeSessionResult, EyeCombinedResult } from '../models/types';

function qualityColor(label: string): string {
  if (label === 'High') return '#2ECC71';
  if (label === 'Medium') return '#FDCB6E';
  return '#FF6B81';
}

function fmtD(v: number | null): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)} D`;
}

function fmtPct(v: number | null): string {
  return v != null ? `${Math.round(v * 100)}%` : '—';
}

export const EyeResults: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { session, resetSession } = useEyeSession();

  const [finalSession, setFinalSession] = useState<EyeSessionResult | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSteps, setAiSteps] = useState<string[]>([]);
  const [aiSource, setAiSource] = useState<'ai' | 'offline' | null>(null);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  // Phase 13: Developer mode — long-press title 5x
  const devTapCount = useRef(0);
  const devTapTimer = useRef<any>(null);
  const handleDevTap = () => {
    devTapCount.current += 1;
    clearTimeout(devTapTimer.current);
    devTapTimer.current = setTimeout(() => { devTapCount.current = 0; }, 2000);
    if (devTapCount.current >= 5) {
      devTapCount.current = 0;
      if (finalSession) {
        Share.share({ message: JSON.stringify(finalSession, null, 2), title: 'Debug Session JSON' })
          .catch(() => {});
      }
    }
  };

  // Compute final results on mount
  useEffect(() => {
    const runs = session.runs ?? [];
    const rightRuns = runs.filter(r => r.eye === 'right');
    const leftRuns  = runs.filter(r => r.eye === 'left');

    const perEye: EyeCombinedResult[] = [];
    if (rightRuns.length >= 2) perEye.push(mergeEyeRuns(rightRuns[0], rightRuns[1]));
    else if (rightRuns.length === 1) perEye.push(mergeEyeRuns(rightRuns[0], rightRuns[0]));

    if (leftRuns.length >= 2) perEye.push(mergeEyeRuns(leftRuns[0], leftRuns[1]));
    else if (leftRuns.length === 1) perEye.push(mergeEyeRuns(leftRuns[0], leftRuns[0]));

    const rightPair = rightRuns.length >= 2 ? mergeEyeRuns(rightRuns[0], rightRuns[1]) : null;
    const leftPair  = leftRuns.length >= 2  ? mergeEyeRuns(leftRuns[0], leftRuns[1])   : null;

    const quality = computeQuality({
      distance_std_cm: session.quality?.distance_std_cm ?? 1.5,
      valid_frame_pct: session.quality?.valid_frame_pct ?? 0.92,
      tilt_deg_p95: session.quality?.tilt_deg_p95 ?? 3,
      lighting_variance: session.quality?.lighting_variance ?? 0.05,
      staircaseStates: [],  // already baked into run accuracy
      delta_ser_r: rightPair?.delta_ser_d ?? null,
      delta_ser_l: leftPair?.delta_ser_d ?? null,
      delta_cyl_r: rightPair?.delta_cylinder_d ?? null,
      delta_cyl_l: leftPair?.delta_cylinder_d ?? null,
      delta_axis_r: rightPair?.delta_axis_deg ?? null,
      delta_axis_l: leftPair?.delta_axis_deg ?? null,
    });

    const vision_age = computeVisionAge(perEye, session.functional!, quality.confidence_0to100);

    const full: EyeSessionResult = {
      session_id: session.session_id!,
      created_at: session.created_at!,
      device_model: Device.modelName ?? 'iPhone',
      os_version: session.os_version!,
      app_version: session.app_version!,
      pd_mm: session.pd_mm ?? null,
      pd_confidence_0to1: session.pd_confidence_0to1 ?? null,
      runs,
      per_eye: perEye,
      functional: session.functional!,
      quality,
      vision_age,
      symptoms: session.symptoms!,
    };

    setFinalSession(full);

    // Auto-save
    eyeStorage.saveSession(full).then(() => setSaved(true));

    // AI summary (non-blocking)
    generateSummary(full).then(res => {
      setAiSummary(res.summary);
      setAiSteps(res.steps);
      setAiSource(res.source);
    });
  }, []);

  const handleExportPDF = async () => {
    if (!finalSession) return;
    setExporting(true);
    try {
      await exportSessionPDF(finalSession, aiSummary ?? undefined, aiSteps.length > 0 ? aiSteps : undefined);
    } catch (e: any) {
      Alert.alert('Export failed', e.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const handleDone = () => {
    resetSession();
    navigation.navigate('Tabs');
  };

  if (!finalSession) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.loading}>Computing results…</Text>
      </View>
    );
  }

  const q = finalSession.quality;
  const f = finalSession.functional;
  const va = finalSession.vision_age;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>

        {/* Header — tap 5x for dev mode */}
        <TouchableOpacity onPress={handleDevTap} activeOpacity={1}>
          <View style={styles.phaseTag}>
            <Text style={styles.phaseText}>STEP 11 OF 11 · RESULTS</Text>
          </View>
          <Text style={styles.title}>Your Vision Results</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle}>{new Date(finalSession.created_at).toLocaleDateString()}</Text>

        {/* ── Quality badge ── */}
        <View style={[styles.qualityCard, { borderColor: qualityColor(q.quality_label) }]}>
          <View style={styles.qualityRow}>
            <View style={[styles.qualityBadge, { backgroundColor: qualityColor(q.quality_label) + '22' }]}>
              <Text style={[styles.qualityBadgeText, { color: qualityColor(q.quality_label) }]}>
                {q.quality_label} Quality
              </Text>
            </View>
            <Text style={styles.qualityConf}>{q.confidence_0to100}/100</Text>
          </View>
          {q.reasons.length > 0 && (
            <Text style={styles.qualityReasons}>{q.reasons.join(' · ')}</Text>
          )}
        </View>

        {/* ── Per-eye results ── */}
        <Text style={styles.sectionTitle}>Per-Eye Refraction (Screening Grade)</Text>
        {finalSession.per_eye.map(e => (
          <View key={e.eye} style={styles.eyeCard}>
            <Text style={styles.eyeCardTitle}>
              {e.eye === 'right' ? '👁 Right Eye (OD)' : '👁 Left Eye (OS)'}
            </Text>
            <View style={styles.rxGrid}>
              <View style={styles.rxItem}><Text style={styles.rxLabel}>Sphere</Text><Text style={styles.rxVal}>{fmtD(e.sphere_d)}</Text></View>
              <View style={styles.rxItem}><Text style={styles.rxLabel}>Cylinder</Text><Text style={styles.rxVal}>{fmtD(e.cylinder_d)}</Text></View>
              <View style={styles.rxItem}><Text style={styles.rxLabel}>Axis</Text><Text style={styles.rxVal}>{e.axis_deg != null ? `${e.axis_deg}°` : '—'}</Text></View>
              <View style={styles.rxItem}><Text style={styles.rxLabel}>SER</Text><Text style={styles.rxVal}>{fmtD(e.ser_d)}</Text></View>
              <View style={styles.rxItem}><Text style={styles.rxLabel}>Far VA</Text><Text style={styles.rxVal}>{e.far_va_proxy != null ? `${e.far_va_proxy.toFixed(2)} logMAR` : '—'}</Text></View>
              <View style={styles.rxItem}><Text style={styles.rxLabel}>Confidence</Text><Text style={styles.rxVal}>{Math.round(e.confidence_0to1 * 100)}%</Text></View>
            </View>
            {e.delta_ser_d != null && (
              <Text style={styles.deltaText}>
                Run-to-run ΔSER: {e.delta_ser_d.toFixed(2)} D
                {e.delta_cylinder_d != null ? ` · ΔCyl: ${e.delta_cylinder_d.toFixed(2)} D` : ''}
              </Text>
            )}
          </View>
        ))}

        {/* ── Functional ── */}
        <Text style={styles.sectionTitle}>Functional Vision</Text>
        <View style={styles.funcCard}>
          {[
            ['Reading Distance', `${f?.preferred_reading_distance_cm ?? '—'} cm`],
            ['Near VA',          `${f?.near_va_proxy != null ? f.near_va_proxy.toFixed(2) + ' logMAR' : '—'}`],
            ['Contrast',         fmtPct(f?.contrast_score)],
            ['Low-Light',        fmtPct(f?.low_light_score)],
            ['Mesopic Penalty',  fmtPct(f?.mesopic_penalty)],
            ['Eye Strain',       `${f?.strain_score_0to10 ?? '—'}/10`],
            ['Blur',             `${f?.blur_score_0to10 ?? '—'}/10`],
            ['PD',               `${finalSession.pd_mm ?? '—'} mm`],
          ].map(([label, val]) => (
            <View key={label} style={styles.funcRow}>
              <Text style={styles.funcLabel}>{label}</Text>
              <Text style={styles.funcVal}>{val}</Text>
            </View>
          ))}
        </View>

        {/* ── Vision Age ── */}
        {va && q.quality_label !== 'Low' && (
          <>
            <Text style={styles.sectionTitle}>Vision Age</Text>
            <View style={styles.ageCard}>
              {[
                ['Distance', va.distance_age_range],
                ['Near',     va.near_age_range],
                ['Contrast', va.contrast_age_range],
                ['Low-Light', va.low_light_age_range],
              ].map(([label, range]) => range && (
                <View key={label as string} style={styles.ageRow}>
                  <Text style={styles.ageLabel}>{label as string}</Text>
                  <Text style={styles.ageVal}>{(range as [number,number])[0]}–{(range as [number,number])[1]} yrs</Text>
                </View>
              ))}
              {va.overall_age_range && (
                <View style={[styles.ageRow, styles.ageRowOverall]}>
                  <Text style={[styles.ageLabel, styles.ageLabelOverall]}>Overall Vision Age</Text>
                  <Text style={[styles.ageVal, styles.ageValOverall]}>
                    {va.overall_age_range[0]}–{va.overall_age_range[1]} yrs
                  </Text>
                </View>
              )}
              <Text style={styles.ageDisclaimer}>Functional index for self-tracking only.</Text>
            </View>
          </>
        )}

        {/* ── AI Summary ── */}
        {aiSummary && (
          <>
            <Text style={styles.sectionTitle}>
              Summary {aiSource === 'ai' ? '· AI-generated' : '· Offline'}
            </Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{aiSummary}</Text>
              {aiSteps.length > 0 && (
                <View style={styles.stepsList}>
                  {aiSteps.map((s, i) => (
                    <View key={i} style={styles.stepRow}>
                      <Text style={styles.stepBullet}>→</Text>
                      <Text style={styles.stepText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Debug JSON ── */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug · Full Session JSON</Text>
        </TouchableOpacity>
        {debugOpen && (
          <ScrollView style={styles.debugBox} horizontal>
            <Text style={styles.debugText}>{JSON.stringify(finalSession, null, 2)}</Text>
          </ScrollView>
        )}

        {/* ── Actions ── */}
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDim]}
          onPress={handleExportPDF}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>
            {exporting ? 'Generating PDF…' : '📄 Export PDF Report'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('EyeHistory')}>
          <Text style={styles.historyBtnText}>View History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done — Back to Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Screening-grade estimate only. Not a medical prescription. Consult an optometrist for clinical evaluation.
        </Text>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  center: { alignItems: 'center', justifyContent: 'center' },
  loading: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  scroll: { paddingHorizontal: 24 },
  phaseTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(162,155,254,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  phaseText: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 },
  qualityCard: {
    borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  qualityBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  qualityBadgeText: { fontSize: 14, fontWeight: '800' },
  qualityConf: { fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  qualityReasons: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 18 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5, marginBottom: 10, marginTop: 20, textTransform: 'uppercase',
  },
  eyeCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  eyeCardTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  rxGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  rxItem: { minWidth: '30%', flex: 1 },
  rxLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '700', letterSpacing: 0.8 },
  rxVal: { fontSize: 15, color: '#FFFFFF', fontWeight: '700', fontFamily: 'monospace' },
  deltaText: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' },
  funcCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  funcRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  funcLabel: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  funcVal: { fontSize: 13, color: '#FFFFFF', fontWeight: '700', fontFamily: 'monospace' },
  ageCard: {
    backgroundColor: 'rgba(162,155,254,0.06)', borderRadius: 16,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(162,155,254,0.15)',
  },
  ageRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(162,155,254,0.08)',
  },
  ageRowOverall: { borderBottomWidth: 0, marginTop: 4 },
  ageLabel: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  ageLabelOverall: { fontWeight: '700', color: '#FFFFFF' },
  ageVal: { fontSize: 13, color: '#A29BFE', fontWeight: '700' },
  ageValOverall: { fontSize: 15 },
  ageDisclaimer: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 },
  summaryCard: {
    backgroundColor: 'rgba(108,92,231,0.08)', borderRadius: 16,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(108,92,231,0.2)',
  },
  summaryText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 21 },
  stepsList: { marginTop: 12 },
  stepRow: { flexDirection: 'row', marginBottom: 6 },
  stepBullet: { fontSize: 13, color: '#A29BFE', marginRight: 8, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19 },
  debugToggle: { marginTop: 16, marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    padding: 12, maxHeight: 200, marginBottom: 16,
  },
  debugText: { fontSize: 10, color: 'rgba(162,155,254,0.6)', fontFamily: 'monospace' },
  exportBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 8, marginBottom: 10,
  },
  exportBtnDim: { backgroundColor: 'rgba(108,92,231,0.4)' },
  exportBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  historyBtn: {
    backgroundColor: 'rgba(162,155,254,0.1)', borderRadius: 16, padding: 16,
    alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.2)',
  },
  historyBtnText: { fontSize: 15, fontWeight: '600', color: '#A29BFE' },
  doneBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  doneBtnText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  disclaimer: { fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 16, marginBottom: 8 },
});
