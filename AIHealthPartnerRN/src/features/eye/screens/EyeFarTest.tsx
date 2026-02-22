// src/features/eye/screens/EyeFarTest.tsx — Phases 4 & 5 (Run 1) + Phase 6 (Run 2)
// Adaptive staircase with Tumbling E.  Run 1: cap at 7 trials.  Run 2: cap at 4.
// Gated by accelerometer tracking (hold phone steady + upright).

import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';
import {
  createStaircaseState, updateStaircase, getAccuracy, getMedianRT,
  LOGMAR_LEVELS,
} from '../engine/staircase';
import { TumblingE, randomDirection, DIR_ARROW, E_DIRECTIONS, EDirection } from '../engine/stimuli';
import { logMARtoSER } from '../engine/scoring';
import { EyeRunResult, RootStackParamList } from '../models/types';
import { useTracking } from '../tracking/trackingEngine';
import { TrackingOverlay } from '../tracking/TrackingOverlay';
import { useSpeech, speak } from '../hooks/useSpeech';

type Route = RouteProp<RootStackParamList, 'EyeFarTest'>;

const { width } = Dimensions.get('window');

const EYE_COVER: Record<string, string> = { right: 'Cover your LEFT eye', left: 'Cover your RIGHT eye' };

// Trial caps per run: run 1 = 7 prompts, run 2 = 4 prompts
const TRIAL_CAP: Record<1 | 2, number> = { 1: 7, 2: 4 };

function nextScreen(eye: 'right' | 'left', run: 1 | 2): { screen: string; params?: object } {
  if (eye === 'right') return { screen: 'EyeFarTest', params: { eye: 'left', run } };
  if (run === 1)       return { screen: 'EyeAstigDial', params: { eye: 'right', run: 1 } };
  return                      { screen: 'EyeAstigDial', params: { eye: 'right', run: 2 } };
}

function stepLabel(eye: 'right' | 'left', run: 1 | 2): string {
  const base = run === 1 ? (eye === 'right' ? 4 : 5) : (eye === 'right' ? 8 : 9);
  return `RUN ${run} · STEP ${base} OF 11 · FAR TEST`;
}

export const EyeFarTest: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { eye, run } = route.params;
  const insets = useSafeAreaInsets();
  const { session, updateSession } = useEyeSession();
  const tracking = useTracking();

  const trialCap = TRIAL_CAP[run];

  const [sc, setSc] = useState(createStaircaseState);
  const [direction, setDirection] = useState<EDirection>(randomDirection);
  const [responded, setResponded] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const trialStart = useRef(Date.now());

  // Voice: announce eye + instruction on mount
  const eyeWord = eye === 'right' ? 'left' : 'right';
  useSpeech(
    `Cover your ${eyeWord} eye. A letter E will appear. Tap the arrow that matches which way it points.`,
    [eye],
  );

  // Voice: announce PAUSED transitions (debounced — only fire once per switch)
  const prevTrackState = useRef<string | null>(null);
  useEffect(() => {
    if (prevTrackState.current === tracking.state) return;
    if (tracking.state === 'PAUSED' && prevTrackState.current === 'LOCKED') {
      speak('Hold the phone steady and upright.');
    }
    prevTrackState.current = tracking.state;
  }, [tracking.state]);

  // Voice: announce test completion
  const doneSpeechFired = useRef(false);
  useEffect(() => {
    if (cappedDone && !doneSpeechFired.current) {
      doneSpeechFired.current = true;
      const eyeName = eye === 'right' ? 'Right' : 'Left';
      speak(`${eyeName} eye complete. Tap Save and Continue.`);
    }
  }, [cappedDone]);

  // Consider test done when staircase finishes OR we hit the run-specific cap
  const cappedDone = sc.done || sc.trials.length >= trialCap;
  const isLocked = tracking.state === 'LOCKED';

  const handleResponse = useCallback((chosen: EDirection) => {
    if (responded || cappedDone) return;
    if (!isLocked) return; // gated — ignore input while moving

    const rt = Date.now() - trialStart.current;
    const correct = chosen === direction;

    setLastCorrect(correct);
    setResponded(true);

    const next = updateStaircase(sc, correct, rt);
    setSc(next);

    const willBeDone = next.done || next.trials.length >= trialCap;
    if (!willBeDone) {
      setTimeout(() => {
        setDirection(randomDirection());
        setResponded(false);
        setLastCorrect(null);
        trialStart.current = Date.now();
      }, 600);
    }
  }, [sc, direction, responded, cappedDone, isLocked, trialCap]);

  const handleFinish = useCallback(() => {
    const threshold = sc.threshold ?? LOGMAR_LEVELS[sc.currentLevelIdx].logMAR;
    const ser = logMARtoSER(threshold);

    const runResult: EyeRunResult = {
      eye,
      timestamp: new Date().toISOString(),
      sphere_d: ser,
      cylinder_d: null,
      axis_deg: null,
      ser_d: ser,
      far_va_proxy: threshold,
      run_confidence_0to1: getAccuracy(sc),
      staircase_trials: sc.trials.length,
      staircase_reversals: sc.reversalLevels.length,
      response_accuracy: getAccuracy(sc),
      response_time_ms_median: getMedianRT(sc),
    };

    updateSession({ runs: [...(session.runs ?? []), runResult] });

    const { screen, params } = nextScreen(eye, run);
    navigation.navigate(screen, params);
  }, [sc, eye, run, session, updateSession, navigation]);

  const level = LOGMAR_LEVELS[sc.currentLevelIdx];
  const trialsCompleted = sc.trials.length;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        scrollEnabled={false}
      >
        {/* Header */}
        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>{stepLabel(eye, run)}</Text>
        </View>
        <Text style={styles.coverInstr}>{EYE_COVER[eye]}</Text>

        {/* Tracking gate */}
        <TrackingOverlay tracking={tracking} />

        {/* Trial progress bar (X / cap) */}
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (trialsCompleted / trialCap) * 100)}%` }]} />
          </View>
          <Text style={styles.progressCount}>
            {cappedDone ? 'Complete' : `${trialsCompleted} / ${trialCap}`}
          </Text>
        </View>

        {/* Optotype area */}
        {!cappedDone ? (
          <View style={styles.optoArea}>
            <View style={styles.optoContainer}>
              <TumblingE sizePt={level.sizePt} direction={direction} />
              {responded && lastCorrect != null && (
                <Text style={[styles.feedback, lastCorrect ? styles.feedbackOk : styles.feedbackWrong]}>
                  {lastCorrect ? '✓' : '✗'}
                </Text>
              )}
            </View>
            <Text style={styles.levelLabel}>{level.label} · {level.logMAR.toFixed(1)} logMAR</Text>
          </View>
        ) : (
          <View style={styles.doneBox}>
            <Text style={styles.doneIcon}>✓</Text>
            <Text style={styles.doneTitle}>{eye === 'right' ? 'Right' : 'Left'} Eye Complete</Text>
            <Text style={styles.doneVal}>
              Threshold: {(sc.threshold ?? LOGMAR_LEVELS[sc.currentLevelIdx].logMAR).toFixed(2)} logMAR · {trialsCompleted} trials
            </Text>
            <Text style={styles.doneSER}>
              Estimated SER: {logMARtoSER(sc.threshold ?? LOGMAR_LEVELS[sc.currentLevelIdx].logMAR).toFixed(2)} D
            </Text>
          </View>
        )}

        {/* Direction buttons — disabled when paused or already responded */}
        {!cappedDone && (
          <View style={styles.btnGrid}>
            {E_DIRECTIONS.map(dir => (
              <TouchableOpacity
                key={dir}
                style={[
                  styles.dirBtn,
                  (responded || !isLocked) && styles.dirBtnDim,
                ]}
                onPress={() => handleResponse(dir)}
                disabled={responded || !isLocked}
              >
                <Text style={styles.dirBtnText}>{DIR_ARROW[dir]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Debug */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug · Staircase</Text>
        </TouchableOpacity>
        {debugOpen && (
          <ScrollView style={styles.debugBox} horizontal>
            <Text style={styles.debugText}>
              {JSON.stringify({
                eye, run, trialCap,
                level: level.label,
                reversals: sc.reversalLevels,
                threshold: sc.threshold,
                trials: sc.trials.length,
                accuracy: (getAccuracy(sc) * 100).toFixed(0) + '%',
                median_rt: getMedianRT(sc) + 'ms',
                tracking: tracking.state,
              }, null, 2)}
            </Text>
          </ScrollView>
        )}

        {cappedDone && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleFinish}>
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
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 8,
  },
  phaseText: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1 },
  coverInstr: {
    fontSize: 13, color: '#FDCB6E', fontWeight: '700',
    backgroundColor: 'rgba(253,203,110,0.12)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 14,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  progressBg: {
    flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#A29BFE', borderRadius: 2 },
  progressCount: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontFamily: 'monospace', minWidth: 60, textAlign: 'right' },
  optoArea: { alignItems: 'center', marginBottom: 20 },
  optoContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 12, minHeight: 160 },
  feedback: { position: 'absolute', fontSize: 28, fontWeight: '900', right: -40 },
  feedbackOk: { color: '#2ECC71' },
  feedbackWrong: { color: '#FF4757' },
  levelLabel: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' },
  doneBox: {
    backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 20,
    padding: 28, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
  },
  doneIcon: { fontSize: 36, color: '#2ECC71', marginBottom: 8 },
  doneTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  doneVal: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  doneSER: { fontSize: 16, fontWeight: '700', color: '#A29BFE' },
  btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 },
  dirBtn: {
    width: (width - 48 - 36) / 4, height: (width - 48 - 36) / 4,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  dirBtnDim: { opacity: 0.35 },
  dirBtnText: { fontSize: 28, color: '#FFFFFF' },
  debugToggle: { marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, maxHeight: 180, marginBottom: 16,
  },
  debugText: { fontSize: 10, color: 'rgba(162,155,254,0.7)', fontFamily: 'monospace' },
  nextBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
