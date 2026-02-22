// src/features/eye/screens/EyeLowLight.tsx — Phase 9b
// Low-light gate + adaptive staircase in dim conditions + mesopic penalty.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';
import { ContrastE, randomDirection, DIR_ARROW, E_DIRECTIONS, EDirection } from '../engine/stimuli';
import { createStaircaseState, updateStaircase, LOGMAR_LEVELS } from '../engine/staircase';

type Step = 'gate' | 'staircase' | 'done';

const contrastFromLevel = (idx: number): number => {
  const LEVELS = [0.05, 0.08, 0.12, 0.18, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.82, 0.88, 0.93, 0.97];
  return LEVELS[Math.min(idx, LEVELS.length - 1)];
};

export const EyeLowLight: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { session, updateSession } = useEyeSession();

  const [step, setStep] = useState<Step>('gate');
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
    const normalContrastScore = session.functional?.contrast_score ?? 0.7;
    const threshold = sc.threshold ?? LOGMAR_LEVELS[sc.currentLevelIdx].logMAR;
    const low_light_score = Math.max(0, Math.min(1, 1 - threshold * 0.7));
    // Mesopic penalty: difference between normal and dim performance
    const mesopic_penalty = Math.max(0, normalContrastScore - low_light_score);

    updateSession({
      functional: { ...session.functional!, low_light_score, mesopic_penalty },
    });
    navigation.navigate('EyeResults');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>STEP 9 OF 11 · LOW-LIGHT VISION</Text>
        </View>

        {/* ── Gate ── */}
        {step === 'gate' && (
          <>
            <Text style={styles.title}>Dim Your Room</Text>
            <Text style={styles.desc}>
              Turn off or dim overhead lights. The test measures how well your eyes
              adapt to low-light conditions (mesopic vision).
            </Text>
            <View style={styles.gateCard}>
              <Text style={styles.gateIcon}>🌙</Text>
              <Text style={styles.gateText}>
                Room should be dim — not completely dark. Like a restaurant at night.
              </Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('staircase')}>
              <Text style={styles.nextBtnText}>Room Is Dim — Start Test →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Low-light staircase ── */}
        {step === 'staircase' && (
          <>
            <Text style={styles.title}>Low-Light Acuity</Text>
            <Text style={styles.desc}>Same test — dim lighting. Which way does the E point?</Text>

            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {sc.done ? 'Complete!' : `Reversals: ${sc.reversalLevels.length}/6 · Trial: ${sc.trials.length}`}
            </Text>

            {!sc.done ? (
              <>
                {/* Darker background for low-light simulation */}
                <View style={styles.dimOptoArea}>
                  <ContrastE sizePt={28} direction={direction} contrast={contrast * 0.6} />
                  <Text style={styles.dimHint}>Low light mode</Text>
                  {responded && lastCorrect != null && (
                    <Text style={[styles.feedback, lastCorrect ? styles.feedbackOk : styles.feedbackWrong]}>
                      {lastCorrect ? '✓' : '✗'}
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
                <Text style={styles.doneIcon}>🌙</Text>
                <Text style={styles.doneTitle}>Low-Light Test Complete</Text>
                <Text style={styles.doneVal}>
                  Threshold: {Math.round(contrastFromLevel(sc.currentLevelIdx) * 60)}% effective contrast
                </Text>
              </View>
            )}

            {sc.done && (
              <TouchableOpacity style={styles.nextBtn} onPress={handleSave}>
                <Text style={styles.nextBtnText}>Save & View Results →</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Debug */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug</Text>
        </TouchableOpacity>
        {debugOpen && (
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>
              {JSON.stringify({ step, contrast, reversals: sc.reversalLevels, threshold: sc.threshold }, null, 2)}
            </Text>
          </View>
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
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 20 },
  gateCard: {
    backgroundColor: 'rgba(162,155,254,0.07)', borderRadius: 20,
    padding: 24, alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.15)',
  },
  gateIcon: { fontSize: 44, marginBottom: 14 },
  gateText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 21 },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#A29BFE', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 20, fontFamily: 'monospace' },
  dimOptoArea: {
    backgroundColor: '#080810', borderRadius: 16,
    padding: 32, alignItems: 'center', marginBottom: 16, minHeight: 160,
    justifyContent: 'center',
  },
  dimHint: { fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 },
  feedback: { fontSize: 15, fontWeight: '700', marginTop: 6 },
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
    backgroundColor: 'rgba(162,155,254,0.08)', borderRadius: 20,
    padding: 28, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.2)',
  },
  doneIcon: { fontSize: 36, marginBottom: 8 },
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
