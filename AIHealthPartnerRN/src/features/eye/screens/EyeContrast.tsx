// src/features/eye/screens/EyeContrast.tsx — Phase 9a
// Adaptive contrast staircase using ContrastE stimulus (both eyes open).

import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';
import { ContrastE, randomDirection, DIR_ARROW, E_DIRECTIONS, EDirection } from '../engine/stimuli';
import { createStaircaseState, updateStaircase, LOGMAR_LEVELS } from '../engine/staircase';

// Contrast levels for testing — mapped from staircase level index.
// High logMAR index = easier (high contrast); low = harder (low contrast).
// We use the staircase level index as a proxy: level 0 = 5% contrast, level 13 = 95%.
const contrastFromLevel = (idx: number): number => {
  const CONTRAST_LEVELS = [
    0.05, 0.08, 0.12, 0.18, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.82, 0.88, 0.93, 0.97,
  ];
  return CONTRAST_LEVELS[Math.min(idx, CONTRAST_LEVELS.length - 1)];
};

// Fixed optotype size for contrast test (20/60 — visible to all)
const CONTRAST_OPTO_SIZE = 28;

export const EyeContrast: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { session, updateSession } = useEyeSession();

  const [sc, setSc] = useState(createStaircaseState);
  const [direction, setDirection] = useState<EDirection>(randomDirection);
  const [responded, setResponded] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const trialStart = useRef(Date.now());

  const contrast = contrastFromLevel(sc.currentLevelIdx);
  const progress = Math.min(100, (sc.reversalLevels.length / 6) * 100);

  const handleResponse = useCallback((chosen: EDirection) => {
    if (responded || sc.done) return;
    const rt = Date.now() - trialStart.current;
    const correct = chosen === direction;
    setLastCorrect(correct);
    setResponded(true);
    const next = updateStaircase(sc, correct, rt);
    setSc(next);
    if (!next.done) {
      setTimeout(() => {
        setDirection(randomDirection());
        setResponded(false);
        setLastCorrect(null);
        trialStart.current = Date.now();
      }, 500);
    }
  }, [sc, direction, responded]);

  const handleSave = () => {
    const threshold = sc.threshold ?? LOGMAR_LEVELS[sc.currentLevelIdx].logMAR;
    // Map threshold to contrast score: lower logMAR threshold = better contrast sensitivity
    const contrastScore = Math.max(0, Math.min(1, 1 - threshold * 0.7));
    updateSession({ functional: { ...session.functional!, contrast_score: contrastScore } });
    navigation.navigate('EyeLowLight');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>STEP 8 OF 11 · CONTRAST SENSITIVITY</Text>
        </View>
        <Text style={styles.title}>Contrast Vision</Text>
        <Text style={styles.desc}>Both eyes open. Which way does the E point?</Text>

        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {sc.done
            ? `Complete · contrast threshold ~${Math.round(contrastFromLevel(sc.currentLevelIdx) * 100)}%`
            : `Reversals: ${sc.reversalLevels.length}/6 · Trial: ${sc.trials.length}`}
        </Text>

        {!sc.done ? (
          <>
            <View style={styles.optoArea}>
              <View style={styles.optoBg}>
                <ContrastE
                  sizePt={CONTRAST_OPTO_SIZE}
                  direction={direction}
                  contrast={contrast}
                />
              </View>
              <Text style={styles.contrastHint}>
                Contrast: {Math.round(contrast * 100)}%
              </Text>
              {responded && lastCorrect != null && (
                <Text style={[styles.feedback, lastCorrect ? styles.feedbackOk : styles.feedbackWrong]}>
                  {lastCorrect ? '✓ Correct' : '✗ Incorrect'}
                </Text>
              )}
            </View>

            <View style={styles.btnGrid}>
              {E_DIRECTIONS.map(dir => (
                <TouchableOpacity
                  key={dir}
                  style={[styles.dirBtn, responded && styles.dirBtnDim]}
                  onPress={() => handleResponse(dir)}
                  disabled={responded}
                >
                  <Text style={styles.dirBtnText}>{DIR_ARROW[dir]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.doneBox}>
            <Text style={styles.doneIcon}>✓</Text>
            <Text style={styles.doneTitle}>Contrast Test Complete</Text>
            <Text style={styles.doneVal}>
              Threshold: {Math.round(contrastFromLevel(sc.currentLevelIdx) * 100)}% contrast
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug</Text>
        </TouchableOpacity>
        {debugOpen && (
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>
              {JSON.stringify({ contrast, reversals: sc.reversalLevels, threshold: sc.threshold, trials: sc.trials.length }, null, 2)}
            </Text>
          </View>
        )}

        {sc.done && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleSave}>
            <Text style={styles.nextBtnText}>Save & Continue →</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { paddingHorizontal: 24 },
  phaseTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(162,155,254,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
  },
  phaseText: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 16 },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#A29BFE', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 20, fontFamily: 'monospace' },
  optoArea: { alignItems: 'center', marginBottom: 16 },
  optoBg: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    width: 160, height: 160,
  },
  contrastHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 },
  feedback: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  feedbackOk: { color: '#2ECC71' },
  feedbackWrong: { color: '#FF4757' },
  btnGrid: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 20 },
  dirBtn: {
    width: 68, height: 68, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  dirBtnDim: { opacity: 0.4 },
  dirBtnText: { fontSize: 26, color: '#FFFFFF' },
  doneBox: {
    backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 20,
    padding: 28, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
  },
  doneIcon: { fontSize: 36, color: '#2ECC71', marginBottom: 8 },
  doneTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  doneVal: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  debugToggle: { marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  debugText: { fontSize: 11, color: 'rgba(162,155,254,0.7)', fontFamily: 'monospace' },
  nextBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
