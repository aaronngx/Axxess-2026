// src/features/eye/screens/ReadingLab.tsx
// Vision Insights / Vision Age — combined ReadingLab module.
// Steps: PRD lock → near readability → contrast stripes → low-light stripes → comfort.
// Replaces separate EyeNear + EyeContrast + EyeLowLight screens.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';
import { useTracking } from '../tracking/trackingEngine';
import { TrackingOverlay } from '../tracking/TrackingOverlay';
import { speak, stopSpeech } from '../hooks/useSpeech';

type Step = 'prd' | 'near' | 'contrast' | 'lowlight' | 'comfort';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Near readability config ──────────────────────────────────────────────────
// 3 font sizes (large → small). User taps Readable / Not readable for each.
const NEAR_SIZES: { sizePt: number; label: string; vaProxy: number }[] = [
  { sizePt: 22, label: 'Large',  vaProxy: 0.8 },  // ~20/125
  { sizePt: 14, label: 'Medium', vaProxy: 0.5 },  // ~20/63
  { sizePt: 9,  label: 'Small',  vaProxy: 0.2 },  // ~20/32
];

const NEAR_TEXT = 'The quick brown fox jumps over the lazy dog.';

// ── Stripe contrast levels (10 steps) ────────────────────────────────────────
// 0 = lowest contrast (5%), 9 = highest (95%)
const CONTRAST_LEVELS = [
  0.05, 0.10, 0.18, 0.28, 0.40, 0.55, 0.68, 0.80, 0.90, 0.97,
];
const MAX_CONTRAST_TRIALS = 10;
const MAX_LOWLIGHT_TRIALS = 8;

// ── Helpers ──────────────────────────────────────────────────────────────────
function contrastLevel(trialIdx: number, maxTrials: number): number {
  // Start high contrast and step down as user succeeds
  const idx = Math.floor((trialIdx / maxTrials) * CONTRAST_LEVELS.length);
  return CONTRAST_LEVELS[Math.min(idx, CONTRAST_LEVELS.length - 1)];
}

/** Render a stripe pattern as a View with alternating colored rows */
function StripePanel({ contrast, dim = false }: { contrast: number; dim?: boolean }) {
  const bg = dim ? '#080810' : '#FFFFFF';
  const stripeColor = dim
    ? `rgba(255,255,255,${contrast})`
    : `rgba(0,0,0,${contrast})`;

  return (
    <View style={[stripStyles.panel, { backgroundColor: bg }]}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View
          key={i}
          style={[
            stripStyles.stripe,
            { backgroundColor: i % 2 === 0 ? stripeColor : 'transparent' },
          ]}
        />
      ))}
    </View>
  );
}

const stripStyles = StyleSheet.create({
  panel: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', justifyContent: 'space-around' },
  stripe: { height: 12.5 },
});

// ── Component ─────────────────────────────────────────────────────────────────
export const ReadingLab: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { session, updateSession } = useEyeSession();

  const [step, setStep] = useState<Step>('prd');
  const [debugOpen, setDebugOpen] = useState(false);
  const tracking = useTracking();

  // ── Voice guidance: fires when step changes ───────────────────────────────
  const stepScripts: Record<Step, string> = {
    prd:      'Hold the phone at your natural comfortable reading distance. Adjust the number and tap Lock Distance.',
    near:     'Now check your near vision. Look at the text and tell us if you can read it comfortably.',
    contrast: 'Contrast test. Both eyes open. Which panel has the stripes? Tap Left or Right.',
    lowlight: 'Low light test. The screen is dimmed. Which panel has the faint stripes? Tap Left or Right.',
    comfort:  'Almost done. How do your eyes feel after reading? Rate your eye strain and blur.',
  };
  useEffect(() => {
    const t = setTimeout(() => speak(stepScripts[step]), 350);
    return () => { clearTimeout(t); stopSpeech(); };
  }, [step]);

  // ── PRD step ─────────────────────────────────────────────────────────────
  const [prdCm, setPrdCm] = useState(38);

  // ── Near readability step ─────────────────────────────────────────────────
  const [nearSizeIdx, setNearSizeIdx] = useState(0);
  const [nearReadable, setNearReadable] = useState<boolean[]>([]); // per size answer

  // ── Contrast stripe step ──────────────────────────────────────────────────
  const [contrastTrial, setContrastTrial] = useState(0);
  // track which side the stripes are on for the current trial
  const [stripeSide, setStripeSide] = useState<'left' | 'right'>(() =>
    Math.random() < 0.5 ? 'left' : 'right',
  );
  const [contrastCorrect, setContrastCorrect] = useState(0);
  const [contrastDone, setContrastDone] = useState(false);
  const [contrastScore, setContrastScore] = useState<number | null>(null);
  const [contrastFeedback, setContrastFeedback] = useState<boolean | null>(null);

  // ── Low-light stripe step ─────────────────────────────────────────────────
  const [lowLightTrial, setLowLightTrial] = useState(0);
  const [llStripeSide, setLlStripeSide] = useState<'left' | 'right'>(() =>
    Math.random() < 0.5 ? 'left' : 'right',
  );
  const [lowLightCorrect, setLowLightCorrect] = useState(0);
  const [lowLightDone, setLowLightDone] = useState(false);
  const [lowLightFeedback, setLowLightFeedback] = useState<boolean | null>(null);

  // ── Comfort step ──────────────────────────────────────────────────────────
  const [strainScore, setStrainScore] = useState<number | null>(null);
  const [blurScore, setBlurScore]     = useState<number | null>(null);
  const [headache, setHeadache]       = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePrdDone = () => {
    updateSession({ functional: { ...session.functional!, preferred_reading_distance_cm: prdCm } });
    setStep('near');
  };

  const handleNearAnswer = (readable: boolean) => {
    const answers = [...nearReadable, readable];
    setNearReadable(answers);
    if (nearSizeIdx < NEAR_SIZES.length - 1) {
      setNearSizeIdx(i => i + 1);
    } else {
      // Compute near_va_proxy: smallest size readable
      let vaProxy = 1.0;
      for (let i = answers.length - 1; i >= 0; i--) {
        if (answers[i]) { vaProxy = NEAR_SIZES[i].vaProxy; break; }
      }
      updateSession({ functional: { ...session.functional!, near_va_proxy: vaProxy } });
      setStep('contrast');
    }
  };

  const handleContrastAnswer = (chosen: 'left' | 'right') => {
    const isCorrect = chosen === stripeSide;
    setContrastFeedback(isCorrect);
    const nextTrial = contrastTrial + 1;
    const nextCorrect = contrastCorrect + (isCorrect ? 1 : 0);

    setTimeout(() => {
      setContrastFeedback(null);
      if (nextTrial >= MAX_CONTRAST_TRIALS) {
        const score = nextCorrect / MAX_CONTRAST_TRIALS;
        setContrastScore(score);
        updateSession({ functional: { ...session.functional!, contrast_score: score } });
        setContrastDone(true);
      } else {
        setContrastTrial(nextTrial);
        setContrastCorrect(nextCorrect);
        setStripeSide(Math.random() < 0.5 ? 'left' : 'right');
      }
    }, 500);
  };

  const handleLowLightAnswer = (chosen: 'left' | 'right') => {
    const isCorrect = chosen === llStripeSide;
    setLowLightFeedback(isCorrect);
    const nextTrial = lowLightTrial + 1;
    const nextCorrect = lowLightCorrect + (isCorrect ? 1 : 0);

    setTimeout(() => {
      setLowLightFeedback(null);
      if (nextTrial >= MAX_LOWLIGHT_TRIALS) {
        const score = nextCorrect / MAX_LOWLIGHT_TRIALS;
        const cscore = contrastScore ?? 0.7;
        const mesoPenalty = Math.max(0, cscore - score);
        updateSession({
          functional: {
            ...session.functional!,
            low_light_score: score,
            mesopic_penalty: mesoPenalty,
          },
        });
        setLowLightDone(true);
      } else {
        setLowLightTrial(nextTrial);
        setLowLightCorrect(nextCorrect);
        setLlStripeSide(Math.random() < 0.5 ? 'left' : 'right');
      }
    }, 500);
  };

  const handleComfortDone = () => {
    updateSession({
      functional: {
        ...session.functional!,
        strain_score_0to10: strainScore,
        blur_score_0to10: blurScore,
        headache_flag: headache,
      },
    });
    navigation.navigate('EyeResults');
  };

  const stepLabels: Record<Step, string> = {
    prd:      'STEP 1 · DISTANCE LOCK',
    near:     'STEP 2 · NEAR READABILITY',
    contrast: 'STEP 3 · CONTRAST',
    lowlight: 'STEP 4 · LOW LIGHT',
    comfort:  'STEP 5 · COMFORT',
  };

  const currentContrast = contrastLevel(contrastTrial, MAX_CONTRAST_TRIALS);
  const currentLLContrast = contrastLevel(lowLightTrial, MAX_LOWLIGHT_TRIALS) * 0.55;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>VISION INSIGHTS · {stepLabels[step]}</Text>
        </View>

        {/* Tracking gate — show during active test steps */}
        {(step === 'contrast' || step === 'lowlight') && (
          <TrackingOverlay tracking={tracking} />
        )}

        {/* ── Step 1: PRD ─────────────────────────────────────────────────── */}
        {step === 'prd' && (
          <>
            <Text style={styles.title}>Reading Distance</Text>
            <Text style={styles.desc}>
              Hold the phone at your natural comfortable reading distance. Adjust if needed, then tap Lock.
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
              <Text style={styles.prdHint}>Typical: 25–40 cm</Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={handlePrdDone}>
              <Text style={styles.nextBtnText}>Lock Distance →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 2: Near readability ─────────────────────────────────────── */}
        {step === 'near' && (
          <>
            <Text style={styles.title}>Near Readability</Text>
            <Text style={styles.desc}>
              Hold at {prdCm} cm. Can you read the text below comfortably?
            </Text>
            <View style={styles.progressRow}>
              {NEAR_SIZES.map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < nearSizeIdx && styles.progressDotDone,
                    i === nearSizeIdx && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.sizeBadge}>{NEAR_SIZES[nearSizeIdx].label} text</Text>
            <View style={styles.nearTextBox}>
              <Text style={{ fontSize: NEAR_SIZES[nearSizeIdx].sizePt, color: '#000000', lineHeight: NEAR_SIZES[nearSizeIdx].sizePt * 1.4 }}>
                {NEAR_TEXT}
              </Text>
            </View>
            <View style={styles.twoChoiceRow}>
              <TouchableOpacity
                style={[styles.choiceBtn, styles.choiceBtnYes]}
                onPress={() => handleNearAnswer(true)}
              >
                <Text style={styles.choiceBtnText}>Readable</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceBtn, styles.choiceBtnNo]}
                onPress={() => handleNearAnswer(false)}
              >
                <Text style={styles.choiceBtnText}>Not readable</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 3: Contrast stripes ─────────────────────────────────────── */}
        {step === 'contrast' && !contrastDone && (
          <>
            <Text style={styles.title}>Contrast Vision</Text>
            <Text style={styles.desc}>Both eyes open. Which panel has the stripes?</Text>
            <Text style={styles.trialBadge}>{contrastTrial + 1} / {MAX_CONTRAST_TRIALS}</Text>

            <View style={styles.stripePanelRow}>
              <View style={styles.stripePanelWrap}>
                {stripeSide === 'left'
                  ? <StripePanel contrast={currentContrast} />
                  : <View style={[stripStyles.panel, { backgroundColor: '#FFFFFF' }]} />}
                <Text style={styles.stripePanelLabel}>LEFT</Text>
              </View>
              <View style={styles.stripePanelWrap}>
                {stripeSide === 'right'
                  ? <StripePanel contrast={currentContrast} />
                  : <View style={[stripStyles.panel, { backgroundColor: '#FFFFFF' }]} />}
                <Text style={styles.stripePanelLabel}>RIGHT</Text>
              </View>
            </View>

            {contrastFeedback !== null && (
              <Text style={[styles.feedbackLabel, contrastFeedback ? styles.feedbackOk : styles.feedbackWrong]}>
                {contrastFeedback ? '✓' : '✗'}
              </Text>
            )}

            <View style={styles.twoChoiceRow}>
              <TouchableOpacity
                style={[styles.sideBtn, (contrastFeedback !== null || tracking.state === 'PAUSED') && { opacity: 0.35 }]}
                onPress={() => handleContrastAnswer('left')}
                disabled={contrastFeedback !== null || tracking.state === 'PAUSED'}
              >
                <Text style={styles.sideBtnText}>← Left</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sideBtn, (contrastFeedback !== null || tracking.state === 'PAUSED') && { opacity: 0.35 }]}
                onPress={() => handleContrastAnswer('right')}
                disabled={contrastFeedback !== null || tracking.state === 'PAUSED'}
              >
                <Text style={styles.sideBtnText}>Right →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'contrast' && contrastDone && (
          <>
            <Text style={styles.title}>Contrast Complete</Text>
            <View style={styles.doneBox}>
              <Text style={styles.doneIcon}>✓</Text>
              <Text style={styles.doneTitle}>Score: {Math.round((contrastScore ?? 0) * 100)}%</Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('lowlight')}>
              <Text style={styles.nextBtnText}>Continue to Low-Light →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 4: Low-light stripes ────────────────────────────────────── */}
        {step === 'lowlight' && !lowLightDone && (
          <>
            <Text style={styles.title}>Low-Light Vision</Text>
            <View style={styles.simCard}>
              <Text style={styles.simIcon}>🌙</Text>
              <Text style={styles.simText}>
                Low-light simulated on-screen — no room dimming needed.
              </Text>
            </View>
            <Text style={styles.desc}>Which panel has the stripes?</Text>
            <Text style={styles.trialBadge}>{lowLightTrial + 1} / {MAX_LOWLIGHT_TRIALS}</Text>

            <View style={[styles.stripePanelRow, styles.dimBg]}>
              <View style={styles.stripePanelWrap}>
                {llStripeSide === 'left'
                  ? <StripePanel contrast={currentLLContrast} dim />
                  : <View style={[stripStyles.panel, { backgroundColor: '#080810' }]} />}
                <Text style={[styles.stripePanelLabel, { color: 'rgba(255,255,255,0.4)' }]}>LEFT</Text>
              </View>
              <View style={styles.stripePanelWrap}>
                {llStripeSide === 'right'
                  ? <StripePanel contrast={currentLLContrast} dim />
                  : <View style={[stripStyles.panel, { backgroundColor: '#080810' }]} />}
                <Text style={[styles.stripePanelLabel, { color: 'rgba(255,255,255,0.4)' }]}>RIGHT</Text>
              </View>
            </View>

            {lowLightFeedback !== null && (
              <Text style={[styles.feedbackLabel, lowLightFeedback ? styles.feedbackOk : styles.feedbackWrong]}>
                {lowLightFeedback ? '✓' : '✗'}
              </Text>
            )}

            <View style={styles.twoChoiceRow}>
              <TouchableOpacity
                style={[styles.sideBtn, (lowLightFeedback !== null || tracking.state === 'PAUSED') && { opacity: 0.35 }]}
                onPress={() => handleLowLightAnswer('left')}
                disabled={lowLightFeedback !== null || tracking.state === 'PAUSED'}
              >
                <Text style={styles.sideBtnText}>← Left</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sideBtn, (lowLightFeedback !== null || tracking.state === 'PAUSED') && { opacity: 0.35 }]}
                onPress={() => handleLowLightAnswer('right')}
                disabled={lowLightFeedback !== null || tracking.state === 'PAUSED'}
              >
                <Text style={styles.sideBtnText}>Right →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'lowlight' && lowLightDone && (
          <>
            <Text style={styles.title}>Low-Light Complete</Text>
            <View style={styles.doneBox}>
              <Text style={styles.doneIcon}>🌙</Text>
              <Text style={styles.doneTitle}>
                Score: {Math.round((lowLightCorrect / MAX_LOWLIGHT_TRIALS) * 100)}%
              </Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('comfort')}>
              <Text style={styles.nextBtnText}>Continue to Comfort →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 5: Comfort ──────────────────────────────────────────────── */}
        {step === 'comfort' && (
          <>
            <Text style={styles.title}>Eye Comfort</Text>
            <Text style={styles.desc}>After reading at {prdCm} cm, how do your eyes feel?</Text>

            <Text style={styles.ratingLabel}>Eye strain</Text>
            <View style={styles.choiceRow3}>
              {[
                { label: 'None', emoji: '😌', value: 0 },
                { label: 'A little', emoji: '😐', value: 4 },
                { label: 'A lot', emoji: '😣', value: 9 },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.ratingBtn, strainScore === opt.value && styles.ratingBtnSel]}
                  onPress={() => setStrainScore(opt.value)}
                >
                  <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.ratingLabel2, strainScore === opt.value && styles.ratingLabel2Sel]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingLabel}>Blur / double vision</Text>
            <View style={styles.choiceRow3}>
              {[
                { label: 'No blur', emoji: '👁', value: 0 },
                { label: 'Some', emoji: '🔸', value: 4 },
                { label: 'Significant', emoji: '🔴', value: 9 },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.ratingBtn, blurScore === opt.value && styles.ratingBtnSel]}
                  onPress={() => setBlurScore(opt.value)}
                >
                  <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.ratingLabel2, blurScore === opt.value && styles.ratingLabel2Sel]}>
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
              onPress={handleComfortDone}
              disabled={strainScore == null || blurScore == null}
            >
              <Text style={styles.nextBtnText}>Save & View Results →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Debug */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug</Text>
        </TouchableOpacity>
        {debugOpen && (
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>
              {JSON.stringify({
                step, prdCm, nearSizeIdx, nearReadable,
                contrastTrial, contrastCorrect, contrastScore,
                lowLightTrial, lowLightCorrect,
                strainScore, blurScore, headache,
              }, null, 2)}
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
    alignSelf: 'flex-start', backgroundColor: 'rgba(66,202,253,0.12)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
  },
  phaseText: { fontSize: 11, color: '#42CAFD', fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 20 },

  // PRD
  prdBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20,
    padding: 24, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  prdVal: { fontSize: 56, fontWeight: '900', color: '#42CAFD', marginBottom: 16 },
  adjRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  adjBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  adjBtnText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  prdHint: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  // Near
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.15)' },
  progressDotDone: { backgroundColor: '#2ECC71' },
  progressDotActive: { backgroundColor: '#42CAFD' },
  sizeBadge: { fontSize: 12, color: '#42CAFD', fontWeight: '700', marginBottom: 10, letterSpacing: 1 },
  nearTextBox: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20,
    minHeight: 100, justifyContent: 'center',
  },
  twoChoiceRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  choiceBtn: {
    flex: 1, borderRadius: 16, padding: 18, alignItems: 'center',
    borderWidth: 1.5,
  },
  choiceBtnYes: { backgroundColor: 'rgba(46,204,113,0.15)', borderColor: '#2ECC71' },
  choiceBtnNo: { backgroundColor: 'rgba(255,71,87,0.12)', borderColor: '#FF4757' },
  choiceBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Stripes
  trialBadge: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: 12 },
  stripePanelRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 16, padding: 20, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)' },
  dimBg: { backgroundColor: '#080810' },
  stripePanelWrap: { alignItems: 'center', gap: 8 },
  stripePanelLabel: { fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: '700' },
  feedbackLabel: { textAlign: 'center', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  feedbackOk: { color: '#2ECC71' },
  feedbackWrong: { color: '#FF4757' },
  sideBtn: {
    flex: 1, backgroundColor: 'rgba(162,155,254,0.12)', borderRadius: 16,
    padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(162,155,254,0.25)',
  },
  sideBtnText: { fontSize: 16, fontWeight: '700', color: '#A29BFE' },

  // Low-light
  simCard: {
    backgroundColor: 'rgba(162,155,254,0.07)', borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.15)',
  },
  simIcon: { fontSize: 22, marginRight: 12 },
  simText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19 },

  // Done
  doneBox: {
    backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 20,
    padding: 28, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
  },
  doneIcon: { fontSize: 36, marginBottom: 8 },
  doneTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  // Comfort
  ratingLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginBottom: 8, marginTop: 16 },
  choiceRow3: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  ratingBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  ratingBtnSel: { backgroundColor: 'rgba(66,202,253,0.18)', borderColor: '#42CAFD' },
  ratingEmoji: { fontSize: 22, marginBottom: 5 },
  ratingLabel2: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textAlign: 'center' },
  ratingLabel2Sel: { color: '#42CAFD' },
  headacheBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 12, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  headacheBtnSel: { backgroundColor: 'rgba(255,71,87,0.15)', borderColor: '#FF4757' },
  headacheBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  headacheBtnTextSel: { color: '#FF6B81' },

  // Nav
  nextBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  nextBtnDim: { backgroundColor: 'rgba(108,92,231,0.3)' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Debug
  debugToggle: { marginTop: 16, marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginBottom: 16 },
  debugText: { fontSize: 10, color: 'rgba(66,202,253,0.7)', fontFamily: 'monospace' },
});
