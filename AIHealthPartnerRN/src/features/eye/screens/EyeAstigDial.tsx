// src/features/eye/screens/EyeAstigDial.tsx — Phases 5 & 7 (Runs 1 & 2)
// Card-based astig screen: axis direction → optional diagonal follow-up → severity.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';
import { RootStackParamList } from '../models/types';

type Route = RouteProp<RootStackParamList, 'EyeAstigDial'>;
type AxisChoice = 'equal' | 'updown' | 'leftright' | 'diagonal';
type DiagChoice = 'ne' | 'nw'; // ↗ or ↘

function nextScreen(eye: 'right' | 'left', run: 1 | 2): { screen: string; params?: object } {
  if (eye === 'right') return { screen: 'EyeAstigDial', params: { eye: 'left', run } };
  if (run === 1)       return { screen: 'EyeFarTest', params: { eye: 'right', run: 2 } };
  return                      { screen: 'EyeNear' };
}

function stepLabel(eye: 'right' | 'left', run: 1 | 2): string {
  const base = run === 1 ? (eye === 'right' ? 5 : 6) : (eye === 'right' ? 10 : 11);
  return `RUN ${run} · STEP ${base} OF 11 · ASTIG CHECK`;
}

// Map axis choice + diagonal refinement to degrees
function resolveAxis(axis: AxisChoice, diag: DiagChoice | null): number | null {
  if (axis === 'equal') return null;
  if (axis === 'updown') return 90;
  if (axis === 'leftright') return 180;
  if (axis === 'diagonal') return diag === 'ne' ? 45 : diag === 'nw' ? 135 : null;
  return null;
}

const AXIS_OPTIONS: { id: AxisChoice; symbol: string; label: string; sub: string }[] = [
  { id: 'equal',     symbol: '◎', label: 'All lines look equal',       sub: 'No astigmatism detected' },
  { id: 'updown',    symbol: '↕', label: 'Up–Down lines boldest',      sub: 'Axis ≈ 90°' },
  { id: 'leftright', symbol: '↔', label: 'Left–Right lines boldest',   sub: 'Axis ≈ 180°' },
  { id: 'diagonal',  symbol: '✕', label: 'Diagonal lines boldest',     sub: 'Will ask which one' },
];

const DIAG_OPTIONS: { id: DiagChoice; symbol: string; label: string; sub: string }[] = [
  { id: 'ne', symbol: '↗', label: 'Bottom-left to top-right',  sub: 'Axis ≈ 45°' },
  { id: 'nw', symbol: '↘', label: 'Top-left to bottom-right',  sub: 'Axis ≈ 135°' },
];

const SEVERITY_OPTIONS: { label: string; sub: string; cyl: number }[] = [
  { label: 'Barely noticeable', sub: 'Mild',     cyl: -0.25 },
  { label: 'Clearly different', sub: 'Moderate', cyl: -0.75 },
  { label: 'Very different',    sub: 'Strong',   cyl: -1.50 },
];

export const EyeAstigDial: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { eye, run } = route.params;
  const insets = useSafeAreaInsets();
  const { session, updateSession } = useEyeSession();

  const [axisChoice, setAxisChoice] = useState<AxisChoice | null>(null);
  const [diagChoice, setDiagChoice] = useState<DiagChoice | null>(null);
  const [cylChoice, setCylChoice] = useState<number | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const noAstig = axisChoice === 'equal';
  const needDiagFollowUp = axisChoice === 'diagonal';
  const axis_deg = axisChoice ? resolveAxis(axisChoice, diagChoice) : null;

  // Ready to save when:
  // - "equal" selected (no further steps), OR
  // - axis resolved (non-diagonal, or diagonal with diag choice) AND severity chosen
  const done = noAstig || (axis_deg !== null && cylChoice !== null);

  const handleSave = () => {
    if (!done) return;
    const cylinder_d = noAstig ? 0 : (cylChoice ?? 0);

    const runs = [...(session.runs ?? [])];
    const matchIdx = [...runs].reverse().findIndex(r => r.eye === eye);
    if (matchIdx >= 0) {
      const realIdx = runs.length - 1 - matchIdx;
      const existing = runs[realIdx];
      const sphere_d = existing.ser_d != null
        ? existing.ser_d - cylinder_d / 2
        : existing.sphere_d;
      runs[realIdx] = { ...existing, cylinder_d, axis_deg, sphere_d };
      updateSession({ runs });
    }

    const { screen, params } = nextScreen(eye, run);
    navigation.navigate(screen, params);
  };

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
          Look at a distant edge or line (e.g. a door frame). Which direction looks darkest or sharpest?
        </Text>

        {/* ── Step 1: Axis direction ── */}
        <Text style={styles.sectionTitle}>Which lines look DARKEST or most distinct?</Text>
        {AXIS_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.card, axisChoice === opt.id && styles.cardSelected]}
            onPress={() => {
              setAxisChoice(opt.id);
              setDiagChoice(null);
              setCylChoice(null);
            }}
          >
            <Text style={[styles.cardSymbol, axisChoice === opt.id && styles.cardSymbolSelected]}>
              {opt.symbol}
            </Text>
            <View style={styles.cardBody}>
              <Text style={[styles.cardLabel, axisChoice === opt.id && styles.cardLabelSelected]}>
                {opt.label}
              </Text>
              <Text style={styles.cardSub}>{opt.sub}</Text>
            </View>
            {axisChoice === opt.id && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}

        {/* ── Step 1b: Diagonal follow-up ── */}
        {needDiagFollowUp && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Which diagonal is darker?</Text>
            {DIAG_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.card, diagChoice === opt.id && styles.cardSelected]}
                onPress={() => setDiagChoice(opt.id)}
              >
                <Text style={[styles.cardSymbol, diagChoice === opt.id && styles.cardSymbolSelected]}>
                  {opt.symbol}
                </Text>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardLabel, diagChoice === opt.id && styles.cardLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.cardSub}>{opt.sub}</Text>
                </View>
                {diagChoice === opt.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Step 2: Severity ── */}
        {!noAstig && axis_deg !== null && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              How different does the boldest line look?
            </Text>
            {SEVERITY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.cyl}
                style={[styles.card, cylChoice === opt.cyl && styles.cardSelected]}
                onPress={() => setCylChoice(opt.cyl)}
              >
                <View style={styles.cardBody}>
                  <Text style={[styles.cardLabel, cylChoice === opt.cyl && styles.cardLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.cardSub}>{opt.sub} · {opt.cyl} D</Text>
                </View>
                {cylChoice === opt.cyl && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Result preview */}
        {done && (
          <View style={styles.resultRow}>
            <Text style={styles.resultText}>
              {noAstig
                ? 'No astigmatism — Cylinder: 0.00 D'
                : `Cylinder: ${cylChoice} D  ·  Axis: ${axis_deg}°`}
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
              {JSON.stringify({ eye, run, axisChoice, diagChoice, axis_deg, cylChoice }, null, 2)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, !done && styles.nextBtnDim]}
          onPress={handleSave}
          disabled={!done}
        >
          <Text style={styles.nextBtnText}>
            {done ? 'Save & Continue →' : 'Select an option to continue'}
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
  sectionTitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '700',
    marginBottom: 10, letterSpacing: 0.3,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardSelected: {
    backgroundColor: 'rgba(162,155,254,0.18)', borderColor: '#A29BFE',
  },
  cardSymbol: {
    fontSize: 24, color: 'rgba(255,255,255,0.35)', marginRight: 14, width: 30, textAlign: 'center',
  },
  cardSymbolSelected: { color: '#A29BFE' },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  cardLabelSelected: { color: '#FFFFFF' },
  cardSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  checkmark: { fontSize: 16, color: '#A29BFE', fontWeight: '700', marginLeft: 8 },
  resultRow: {
    backgroundColor: 'rgba(162,155,254,0.1)', borderRadius: 12,
    padding: 12, alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  resultText: { fontSize: 14, color: '#A29BFE', fontWeight: '700' },
  debugToggle: { marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  debugText: { fontSize: 11, color: 'rgba(162,155,254,0.7)', fontFamily: 'monospace' },
  nextBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  nextBtnDim: { backgroundColor: 'rgba(108,92,231,0.3)' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
