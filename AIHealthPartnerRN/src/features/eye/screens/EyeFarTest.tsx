// src/features/eye/screens/EyeFarTest.tsx — Phases 4 & 5 (Run 1) + Phase 6 (Run 2)
// Real 2-down-1-up adaptive staircase with Tumbling E optotype.

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
import { logMARtoSER, serToSphere } from '../engine/scoring';
import { EyeRunResult, RootStackParamList } from '../models/types';

type Route = RouteProp<RootStackParamList, 'EyeFarTest'>;

const { width } = Dimensions.get('window');

const EYE_COVER: Record<string, string> = { right: 'Cover your LEFT eye', left: 'Cover your RIGHT eye' };

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

  const [sc, setSc] = useState(createStaircaseState);
  const [direction, setDirection] = useState<EDirection>(randomDirection);
  const [responded, setResponded] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const trialStart = useRef(Date.now());

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
      }, 600);
    }
  }, [sc, direction, responded]);

  const handleFinish = useCallback(() => {
    const threshold = sc.threshold ?? LOGMAR_LEVELS[sc.currentLevelIdx].logMAR;
    const ser = logMARtoSER(threshold);
    // Cylinder from astig runs (will be filled in EyeAstigDial)
    const sphere = ser; // no cylinder yet at this step

    const runResult: EyeRunResult = {
      eye,
      timestamp: new Date().toISOString(),
      sphere_d: sphere,
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
  const progress = Math.min(100, (sc.reversalLevels.length / 6) * 100);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        scrollEnabled={false}>

        {/* Header */}
        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>{stepLabel(eye, run)}</Text>
        </View>
        <Text style={styles.coverInstr}>{EYE_COVER[eye]}</Text>

        {/* Progress */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {sc.done
            ? `Complete · ${sc.trials.length} trials · threshold ${sc.threshold?.toFixed(2)} logMAR`
            : `Reversals: ${sc.reversalLevels.length}/6 · Trial: ${sc.trials.length}`}
        </Text>

        {/* Optotype area */}
        {!sc.done ? (
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
              Threshold: {sc.threshold?.toFixed(2)} logMAR ({
                LOGMAR_LEVELS.find(l => Math.abs(l.logMAR - (sc.threshold ?? 0)) < 0.05)?.label ?? '—'
              })
            </Text>
            <Text style={styles.doneSER}>
              Estimated SER: {logMARtoSER(sc.threshold ?? 0).toFixed(2)} D
            </Text>
          </View>
        )}

        {/* Direction buttons */}
        {!sc.done && (
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
        )}

        {/* Debug */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug · Staircase State</Text>
        </TouchableOpacity>
        {debugOpen && (
          <ScrollView style={styles.debugBox} horizontal>
            <Text style={styles.debugText}>
              {JSON.stringify({
                eye, run,
                level: level.label,
                reversals: sc.reversalLevels,
                threshold: sc.threshold,
                trials: sc.trials.length,
                accuracy: (getAccuracy(sc) * 100).toFixed(0) + '%',
                median_rt: getMedianRT(sc) + 'ms',
              }, null, 2)}
            </Text>
          </ScrollView>
        )}

        {sc.done && (
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
  progressBg: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: '#A29BFE', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 20, fontFamily: 'monospace' },
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
  dirBtnDim: { opacity: 0.4 },
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
