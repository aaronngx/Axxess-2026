// src/features/eye/screens/EyeAstigDial.tsx — Phases 5 & 7 (Runs 1 & 2)
// Su-style astigmatism dial: coarse axis selection + cylinder severity rating.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';
import { AstigDial } from '../engine/stimuli';
import { astigSeverityToCylinder } from '../engine/scoring';
import { EyeRunResult, RootStackParamList } from '../models/types';

type Route = RouteProp<RootStackParamList, 'EyeAstigDial'>;

type Severity = 0 | 1 | 2 | 3;

function nextScreen(eye: 'right' | 'left', run: 1 | 2): { screen: string; params?: object } {
  if (eye === 'right') return { screen: 'EyeAstigDial', params: { eye: 'left', run } };
  if (run === 1)       return { screen: 'EyeFarTest', params: { eye: 'right', run: 2 } };
  return                      { screen: 'EyeNear' };
}

function stepLabel(eye: 'right' | 'left', run: 1 | 2): string {
  const base = run === 1 ? (eye === 'right' ? 5 : 6) : (eye === 'right' ? 10 : 11);
  return `RUN ${run} · STEP ${base} OF 11 · ASTIG DIAL`;
}

const SEVERITY_LABELS: Record<Severity, string> = {
  0: 'All lines look equal — no astigmatism',
  1: 'Slightly sharper in one direction (mild)',
  2: 'Clearly sharper in one direction (moderate)',
  3: 'Much sharper in one direction (strong)',
};

const SEVERITY_CYL: Record<Severity, string> = {
  0: '0.00 D', 1: '−0.50 D', 2: '−1.00 D', 3: '−2.00 D',
};

export const EyeAstigDial: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { eye, run } = route.params;
  const insets = useSafeAreaInsets();
  const { session, updateSession } = useEyeSession();

  const [selectedAxis, setSelectedAxis] = useState<number | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const noAstig = severity === 0;
  const done = severity !== null && (noAstig || selectedAxis !== null);

  const handleSave = () => {
    if (!done) return;

    const cylinder_d = astigSeverityToCylinder(severity!);
    const axis_deg = noAstig ? null : selectedAxis;

    // Patch the most recent run result for this eye with astig data
    const runs = [...(session.runs ?? [])];
    // Find the matching run (same eye, should be the last one for this eye)
    const matchIdx = [...runs].reverse().findIndex(r => r.eye === eye);
    if (matchIdx >= 0) {
      const realIdx = runs.length - 1 - matchIdx;
      const existing = runs[realIdx];
      const sphere_d = existing.ser_d != null
        ? existing.ser_d - cylinder_d / 2
        : existing.sphere_d;
      runs[realIdx] = {
        ...existing,
        cylinder_d,
        axis_deg,
        sphere_d,
      };
      updateSession({ runs });
    }

    const { screen, params } = nextScreen(eye, run);
    navigation.navigate(screen, params);
  };

  const { screen, params } = nextScreen(eye, run);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>{stepLabel(eye, run)}</Text>
        </View>
        <Text style={styles.coverInstr}>
          {eye === 'right' ? 'Cover your LEFT eye' : 'Cover your RIGHT eye'}
        </Text>

        <Text style={styles.title}>Astigmatism Check</Text>
        <Text style={styles.desc}>
          Look at the dial. Do any lines appear darker or sharper than others?
          Tap the sharpest line, then rate how different it looks.
        </Text>

        {/* Astig Dial */}
        <View style={styles.dialWrap}>
          <AstigDial
            size={240}
            selectedAxis={selectedAxis}
            onSelect={axis => {
              setSelectedAxis(axis);
              if (severity === 0) setSeverity(null);
            }}
          />
        </View>
        {selectedAxis !== null && (
          <Text style={styles.axisLabel}>Selected axis: {selectedAxis}°</Text>
        )}

        {/* No astigmatism option */}
        <TouchableOpacity
          style={[styles.equalBtn, noAstig && styles.equalBtnSelected]}
          onPress={() => { setSeverity(0); setSelectedAxis(null); }}
        >
          <Text style={[styles.equalBtnText, noAstig && styles.equalBtnTextSelected]}>
            All lines look equal (no astigmatism)
          </Text>
        </TouchableOpacity>

        {/* Severity rating */}
        {!noAstig && (
          <View style={styles.severitySection}>
            <Text style={styles.severityTitle}>How different does the sharpest line look?</Text>
            {([0, 1, 2, 3] as Severity[]).filter(s => s > 0).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.severityBtn, severity === s && styles.severityBtnSelected]}
                onPress={() => setSeverity(s)}
              >
                <Text style={[styles.severityBtnText, severity === s && styles.severityBtnTextSelected]}>
                  {SEVERITY_LABELS[s]}
                </Text>
                <Text style={styles.severityCyl}>{SEVERITY_CYL[s]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Result preview */}
        {done && (
          <View style={styles.resultRow}>
            <Text style={styles.resultText}>
              Cylinder: {SEVERITY_CYL[severity!]}
              {!noAstig && selectedAxis !== null ? `  ·  Axis: ${selectedAxis}°` : ''}
            </Text>
          </View>
        )}

        {/* Debug */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug</Text>
        </TouchableOpacity>
        {debugOpen && (
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>
              {JSON.stringify({ eye, run, selectedAxis, severity, cyl: severity != null ? astigSeverityToCylinder(severity) : null }, null, 2)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, !done && styles.nextBtnDim]}
          onPress={handleSave}
          disabled={!done}
        >
          <Text style={styles.nextBtnText}>
            {done ? 'Save & Continue →' : 'Rate severity to continue'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { paddingHorizontal: 24 },
  phaseTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(162,155,254,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 8,
  },
  phaseText: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1 },
  coverInstr: {
    fontSize: 13, color: '#FDCB6E', fontWeight: '700',
    backgroundColor: 'rgba(253,203,110,0.12)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 20 },
  dialWrap: { alignItems: 'center', marginBottom: 10 },
  axisLabel: { fontSize: 13, color: '#A29BFE', fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  equalBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  equalBtnSelected: { backgroundColor: 'rgba(46,204,113,0.15)', borderColor: '#2ECC71' },
  equalBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  equalBtnTextSelected: { color: '#2ECC71' },
  severitySection: { marginBottom: 16 },
  severityTitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 10, fontWeight: '600' },
  severityBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  severityBtnSelected: { backgroundColor: 'rgba(162,155,254,0.2)', borderColor: '#A29BFE' },
  severityBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  severityBtnTextSelected: { color: '#A29BFE' },
  severityCyl: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  resultRow: {
    backgroundColor: 'rgba(162,155,254,0.1)', borderRadius: 12,
    padding: 12, alignItems: 'center', marginBottom: 16,
  },
  resultText: { fontSize: 14, color: '#A29BFE', fontWeight: '700' },
  debugToggle: { marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  debugText: { fontSize: 11, color: 'rgba(162,155,254,0.7)', fontFamily: 'monospace' },
  nextBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center' },
  nextBtnDim: { backgroundColor: 'rgba(108,92,231,0.3)' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
