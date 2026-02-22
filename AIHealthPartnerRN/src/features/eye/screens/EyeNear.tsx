// src/features/eye/screens/EyeNear.tsx — Phase 8
// Near module: PRD lock → near acuity staircase → strain ratings.

import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';
import {
  createStaircaseState, updateStaircase, LOGMAR_LEVELS,
} from '../engine/staircase';
import { TumblingE, randomDirection, DIR_ARROW, E_DIRECTIONS, EDirection } from '../engine/stimuli';

type Step = 'prd' | 'staircase' | 'strain';

export const EyeNear: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { session, updateSession } = useEyeSession();

  const [step, setStep] = useState<Step>('prd');
  const [prdCm, setPrdCm] = useState(38);

  // Staircase state for near acuity
  const [sc, setSc] = useState(createStaircaseState);
  const [direction, setDirection] = useState<EDirection>(randomDirection);
  const [responded, setResponded] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const trialStart = useRef(Date.now());

  // Strain ratings
  const [strainScore, setStrainScore] = useState<number | null>(null);
  const [blurScore, setBlurScore] = useState<number | null>(null);
  const [headache, setHeadache] = useState(false);

  const [debugOpen, setDebugOpen] = useState(false);

  const handlePrdDone = () => {
    updateSession({ functional: { ...session.functional!, preferred_reading_distance_cm: prdCm } });
    setStep('staircase');
  };

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

  const handleStaircaseDone = () => {
    const threshold = sc.threshold ?? LOGMAR_LEVELS[sc.currentLevelIdx].logMAR;
    updateSession({ functional: { ...session.functional!, near_va_proxy: threshold } });
    setStep('strain');
  };

  const handleStrainDone = () => {
    updateSession({
      functional: {
        ...session.functional!,
        strain_score_0to10: strainScore,
        blur_score_0to10: blurScore,
        headache_flag: headache,
      },
    });
    navigation.navigate('EyeContrast');
  };

  const level = LOGMAR_LEVELS[sc.currentLevelIdx];
  const progress = Math.min(100, (sc.reversalLevels.length / 6) * 100);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>
            STEP 7 OF 11 · NEAR VISION ·{' '}
            {{ prd: 'DISTANCE LOCK', staircase: 'NEAR ACUITY', strain: 'COMFORT' }[step]}
          </Text>
        </View>

        {/* ── Step 1: PRD ── */}
        {step === 'prd' && (
          <>
            <Text style={styles.title}>Reading Distance</Text>
            <Text style={styles.desc}>
              Hold the phone at your natural comfortable reading distance and tap Lock.
            </Text>
            <View style={styles.prdBox}>
              <Text style={styles.prdVal}>{prdCm} cm</Text>
              <View style={styles.adjRow}>
                <TouchableOpacity style={styles.adjBtn} onPress={() => setPrdCm(c => Math.max(15, c - 5))}>
                  <Text style={styles.adjBtnText}>−5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjBtn} onPress={() => setPrdCm(c => Math.max(15, c - 1))}>
                  <Text style={styles.adjBtnText}>−1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjBtn} onPress={() => setPrdCm(c => Math.min(100, c + 1))}>
                  <Text style={styles.adjBtnText}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjBtn} onPress={() => setPrdCm(c => Math.min(100, c + 5))}>
                  <Text style={styles.adjBtnText}>+5</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.prdHint}>Normal reading distance: 25–40 cm</Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={handlePrdDone}>
              <Text style={styles.nextBtnText}>Lock Distance →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 2: Near staircase ── */}
        {step === 'staircase' && (
          <>
            <Text style={styles.title}>Near Acuity</Text>
            <Text style={styles.desc}>Hold at {prdCm} cm. Which way does the E point?</Text>

            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {sc.done ? 'Complete!' : `Reversals: ${sc.reversalLevels.length}/6 · Trial: ${sc.trials.length}`}
            </Text>

            {!sc.done ? (
              <>
                <View style={styles.optoArea}>
                  <TumblingE sizePt={level.sizePt} direction={direction} />
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
              <>
                <View style={styles.doneBox}>
                  <Text style={styles.doneTitle}>Near Threshold: {sc.threshold?.toFixed(2)} logMAR</Text>
                </View>
                <TouchableOpacity style={styles.nextBtn} onPress={handleStaircaseDone}>
                  <Text style={styles.nextBtnText}>Continue to Comfort Rating →</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ── Step 3: Strain ratings ── */}
        {step === 'strain' && (
          <>
            <Text style={styles.title}>Eye Comfort</Text>
            <Text style={styles.desc}>After reading at that distance, how do your eyes feel?</Text>

            <Text style={styles.ratingLabel}>Eye strain</Text>
            <View style={styles.choiceRow}>
              {[
                { label: 'None',    emoji: '😌', value: 0 },
                { label: 'A little', emoji: '😐', value: 4 },
                { label: 'A lot',   emoji: '😣', value: 9 },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.choiceBtn, strainScore === opt.value && styles.choiceBtnSel]}
                  onPress={() => setStrainScore(opt.value)}
                >
                  <Text style={styles.choiceEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.choiceLabel, strainScore === opt.value && styles.choiceLabelSel]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingLabel}>Blur / double vision</Text>
            <View style={styles.choiceRow}>
              {[
                { label: 'No blur',      emoji: '👁', value: 0 },
                { label: 'Some blur',    emoji: '🔸', value: 4 },
                { label: 'Significant', emoji: '🔴', value: 9 },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.choiceBtn, blurScore === opt.value && styles.choiceBtnSel]}
                  onPress={() => setBlurScore(opt.value)}
                >
                  <Text style={styles.choiceEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.choiceLabel, blurScore === opt.value && styles.choiceLabelSel]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.headacheBtn, headache && styles.headacheBtnSel]}
              onPress={() => setHeadache(h => !h)}
            >
              <Text style={[styles.headacheBtnText, headache && styles.headacheBtnTextSel]}>
                {headache ? '✓' : '○'}  Headache / pressure behind eyes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextBtn, (strainScore == null || blurScore == null) && styles.nextBtnDim]}
              onPress={handleStrainDone}
              disabled={strainScore == null || blurScore == null}
            >
              <Text style={styles.nextBtnText}>Save & Continue →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Debug */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug</Text>
        </TouchableOpacity>
        {debugOpen && (
          <ScrollView style={styles.debugBox} horizontal>
            <Text style={styles.debugText}>
              {JSON.stringify({ step, prdCm, near_va: sc.threshold, strainScore, blurScore, headache }, null, 2)}
            </Text>
          </ScrollView>
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
  prdBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20,
    padding: 24, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  prdVal: { fontSize: 56, fontWeight: '900', color: '#A29BFE', marginBottom: 16 },
  adjRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  adjBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  adjBtnText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  prdHint: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#A29BFE', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 16, fontFamily: 'monospace' },
  optoArea: { alignItems: 'center', minHeight: 140, justifyContent: 'center', marginBottom: 16 },
  feedback: { fontSize: 28, fontWeight: '900' },
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
    backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 16,
    padding: 20, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
  },
  doneTitle: { fontSize: 15, fontWeight: '700', color: '#2ECC71' },
  ratingLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 8, marginTop: 16 },
  choiceRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  choiceBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  choiceBtnSel: { backgroundColor: 'rgba(162,155,254,0.2)', borderColor: '#A29BFE' },
  choiceEmoji: { fontSize: 22, marginBottom: 5 },
  choiceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textAlign: 'center' },
  choiceLabelSel: { color: '#A29BFE' },
  headacheBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 12, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  headacheBtnSel: { backgroundColor: 'rgba(255,71,87,0.15)', borderColor: '#FF4757' },
  headacheBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  headacheBtnTextSel: { color: '#FF6B81' },
  debugToggle: { marginTop: 8, marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, maxHeight: 160, marginBottom: 16,
  },
  debugText: { fontSize: 10, color: 'rgba(162,155,254,0.7)', fontFamily: 'monospace' },
  nextBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  nextBtnDim: { backgroundColor: 'rgba(108,92,231,0.3)' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
