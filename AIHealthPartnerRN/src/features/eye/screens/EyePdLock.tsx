// src/features/eye/screens/EyePdLock.tsx — Phase 3
// PD measurement: population average | manual entry | MediaPipe (web) | touch-mark (native).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Dimensions, Platform, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Circle, Ellipse, Line } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';

// Web-only import — tree-shaken on native
import type { WebPdFrame, WebPdResult, LoadStatus } from '../engine/pdEngineWeb';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_PD = 63;
const MIN_PD = 52;
const MAX_PD = 74;
const FRAME_COUNT = 3;
const FRAME_INTERVAL_MS = 700;

const { width: SCREEN_W } = Dimensions.get('window');
const DISPLAY_W = SCREEN_W - 48;
const DISPLAY_H = Math.round(DISPLAY_W * 0.75); // 4:3

type Mode          = 'default' | 'manual' | 'measure';
type MeasureState  = 'idle' | 'initialising' | 'capturing' | 'qc';
// Android touch-mark steps: take photo → tap left pupil → right pupil → iris L edge → iris R edge → result
type AndroidStep   = 'camera' | 'left-pupil' | 'right-pupil' | 'iris-left' | 'iris-right' | 'result';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Component ─────────────────────────────────────────────────────────────────

export const EyePdLock: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const { updateSession } = useEyeSession();
  const cameraRef  = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Mode
  const [mode,    setMode]    = useState<Mode>('default');
  const [pdText,  setPdText]  = useState(String(DEFAULT_PD));
  const [locked,  setLocked]  = useState(false);

  // Measure sub-flow
  const [measureState,    setMeasureState]    = useState<MeasureState>('idle');
  const [captureProgress, setCaptureProgress] = useState(0);
  const [loadStatus,      setLoadStatus]      = useState<LoadStatus>('idle');
  const [bestFrameUri,    setBestFrameUri]    = useState<string | null>(null);
  const [captureResult,   setCaptureResult]   = useState<WebPdResult | null>(null);
  const [debugOpen,       setDebugOpen]       = useState(false);

  // Android touch-mark sub-flow
  const [androidStep,    setAndroidStep]    = useState<AndroidStep>('camera');
  const [androidPhotoUri, setAndroidPhotoUri] = useState<string | null>(null);
  const [androidPD,      setAndroidPD]      = useState<number | null>(null);
  const [pts, setPts] = useState<{
    lp: { x: number; y: number } | null; // left pupil
    rp: { x: number; y: number } | null; // right pupil
    il: { x: number; y: number } | null; // iris left edge
    ir: { x: number; y: number } | null; // iris right edge
  }>({ lp: null, rp: null, il: null, ir: null });

  // Pre-warm MediaPipe as soon as Measure tab is selected (web only)
  useEffect(() => {
    if (mode !== 'measure' || Platform.OS !== 'web') return;
    if (loadStatus !== 'idle') return;
    import('../engine/pdEngineWeb').then(({ initDetector }) => {
      initDetector(setLoadStatus).catch(() => {});
    });
  }, [mode]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const parsedPD = parseFloat(pdText);
  const pdValid  = !isNaN(parsedPD) && parsedPD >= MIN_PD && parsedPD <= MAX_PD;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLock = (overridePd?: number, overrideConf?: number) => {
    let pd   = DEFAULT_PD;
    let conf = 0.75;

    if (overridePd !== undefined) {
      pd   = overridePd;
      conf = overrideConf ?? 0.80;
    } else if (mode === 'manual' && pdValid) {
      pd   = parsedPD;
      conf = 0.95;
    } else if (mode === 'measure' && captureResult) {
      pd   = captureResult.pdMm;
      conf = captureResult.confidence === 'High'   ? 0.93
           : captureResult.confidence === 'Medium' ? 0.80 : 0.62;
    }

    updateSession({ pd_mm: pd, pd_confidence_0to1: conf });
    setLocked(true);
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setLocked(false);
    setMeasureState('idle');
    setCaptureProgress(0);
    setBestFrameUri(null);
    setCaptureResult(null);
    // Android touch-mark reset
    setAndroidStep('camera');
    setAndroidPhotoUri(null);
    setAndroidPD(null);
    setPts({ lp: null, rp: null, il: null, ir: null });
  };

  const startCapture = useCallback(async () => {
    if (Platform.OS !== 'web') return;

    // Ensure camera permission
    if (permission && !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera needed', 'Grant camera access to measure PD.');
        return;
      }
    }

    // Wait for detector if still loading
    if (loadStatus !== 'ready') {
      setMeasureState('initialising');
      const { initDetector } = await import('../engine/pdEngineWeb');
      try { await initDetector(setLoadStatus); }
      catch {
        Alert.alert('Failed to load face detector', 'Check your internet connection and try again.');
        setMeasureState('idle');
        return;
      }
    }

    setMeasureState('capturing');
    setCaptureProgress(0);

    const { captureAndDetect, aggregateWebFrames } = await import('../engine/pdEngineWeb');

    const frames:   WebPdFrame[] = [];
    const uris:     string[]     = [];

    for (let i = 0; i < FRAME_COUNT; i++) {
      setCaptureProgress(i + 1);
      try {
        const { uri, frame } = await captureAndDetect(cameraRef);
        uris.push(uri);
        if (frame) frames.push(frame);
      } catch { uris.push(''); }
      if (i < FRAME_COUNT - 1) await sleep(FRAME_INTERVAL_MS);
    }

    if (frames.length === 0) {
      Alert.alert(
        'No face detected',
        'Make sure your face is well-lit, the camera faces you, and your eyes are fully visible.',
      );
      setMeasureState('idle');
      return;
    }

    const result = aggregateWebFrames(frames, uris);

    // Pick the URI matching the best frame
    const bestIdx = frames.indexOf(result.bestFrame);
    setBestFrameUri(uris[bestIdx >= 0 ? bestIdx : 0] ?? uris[0]);
    setCaptureResult(result);
    setMeasureState('qc');
  }, [permission, requestPermission, loadStatus]);

  // ── Android: take photo ────────────────────────────────────────────────────
  const takeAndroidPhoto = useCallback(async () => {
    if (permission && !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera needed', 'Grant camera access to measure PD.');
        return;
      }
    }
    try {
      const photo = await (cameraRef.current as any).takePictureAsync({ quality: 0.85, skipProcessing: true });
      setAndroidPhotoUri(photo.uri);
      setAndroidStep('left-pupil');
    } catch {
      Alert.alert('Failed to take photo', 'Try again.');
    }
  }, [permission, requestPermission]);

  // ── Android: handle tap on photo — 4-step marking sequence ────────────────
  // Uses iris diameter = 12 mm (Calossi 2007) as scale reference.
  const handleImageTap = useCallback((evt: any) => {
    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;

    if (androidStep === 'left-pupil') {
      setPts(p => ({ ...p, lp: { x, y } }));
      setAndroidStep('right-pupil');
    } else if (androidStep === 'right-pupil') {
      setPts(p => ({ ...p, rp: { x, y } }));
      setAndroidStep('iris-left');
    } else if (androidStep === 'iris-left') {
      setPts(p => ({ ...p, il: { x, y } }));
      setAndroidStep('iris-right');
    } else if (androidStep === 'iris-right') {
      setPts(prev => {
        const ir = { x, y };
        const { lp, rp, il } = prev;
        if (!lp || !rp || !il) return prev;
        const irisWidthPx = Math.sqrt((ir.x - il.x) ** 2 + (ir.y - il.y) ** 2);
        if (irisWidthPx < 4) return prev; // bad tap
        const mmPerPx = 12.0 / irisWidthPx;
        const pdPx    = Math.sqrt((rp.x - lp.x) ** 2 + (rp.y - lp.y) ** 2);
        const pd      = Math.round(pdPx * mmPerPx * 10) / 10;
        setAndroidPD(pd);
        setAndroidStep('result');
        return { ...prev, ir };
      });
    }
  }, [androidStep]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderTabs = () => (
    <View style={styles.modeRow}>
      {(['default', 'manual', 'measure'] as Mode[]).map(m => (
        <TouchableOpacity
          key={m}
          style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
          onPress={() => handleModeChange(m)}
        >
          <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
            {m === 'default' ? 'Average' : m === 'manual' ? 'Enter' : 'Measure'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDefault = () => (
    <View style={styles.pdBox}>
      <Text style={styles.pdIcon}>👁</Text>
      <Text style={styles.pdBig}>{DEFAULT_PD} mm</Text>
      <Text style={styles.pdSub}>Population average · works for most users</Text>
      {!locked
        ? <TouchableOpacity style={styles.lockBtn} onPress={() => handleLock()}>
            <Text style={styles.lockBtnText}>Lock PD →</Text>
          </TouchableOpacity>
        : <View style={styles.lockedRow}><Text style={styles.lockedText}>✓ PD locked: {DEFAULT_PD} mm</Text></View>
      }
    </View>
  );

  const renderManual = () => (
    <View style={styles.pdBox}>
      <Text style={styles.pdIcon}>👁</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.pdInput}
          value={pdText}
          onChangeText={t => { setPdText(t); setLocked(false); }}
          keyboardType="decimal-pad"
          placeholder="e.g. 63"
          placeholderTextColor="rgba(255,255,255,0.3)"
          maxLength={4}
        />
        <Text style={styles.pdUnit}>mm</Text>
      </View>
      {!pdValid && pdText.length > 0 &&
        <Text style={styles.pdError}>Enter {MIN_PD}–{MAX_PD} mm</Text>}
      {!locked
        ? <TouchableOpacity
            style={[styles.lockBtn, !pdValid && styles.lockBtnDim]}
            onPress={() => handleLock()} disabled={!pdValid}
          >
            <Text style={styles.lockBtnText}>Lock PD →</Text>
          </TouchableOpacity>
        : <View style={styles.lockedRow}>
            <Text style={styles.lockedText}>✓ PD locked: {parsedPD} mm</Text>
          </View>
      }
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Where to find your PD</Text>
        <Text style={styles.infoText}>
          On your glasses prescription: "PD: 63" or two monocular values "31 / 32".
          Average adult PD is 58–68 mm.
        </Text>
      </View>
    </View>
  );

  // ── Android: touch-mark PD measurement ────────────────────────────────────

  const ANDROID_STEP_LABEL: Record<AndroidStep, string> = {
    'camera':      '',
    'left-pupil':  '1 / 4  ·  Tap the CENTER of your LEFT pupil',
    'right-pupil': '2 / 4  ·  Tap the CENTER of your RIGHT pupil',
    'iris-left':   '3 / 4  ·  Tap the LEFT EDGE of your left iris (colored ring)',
    'iris-right':  '4 / 4  ·  Tap the RIGHT EDGE of your left iris',
    'result':      '',
  };

  const resetAndroid = () => {
    setAndroidStep('camera');
    setAndroidPhotoUri(null);
    setAndroidPD(null);
    setPts({ lp: null, rp: null, il: null, ir: null });
  };

  const renderMeasureAndroid = () => {
    // ── Step 0: camera viewfinder ───────────────────────────────────────────
    if (androidStep === 'camera') {
      return (
        <>
          <View style={[styles.cameraContainer, { width: DISPLAY_W, height: DISPLAY_H }]}>
            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
            <Svg style={StyleSheet.absoluteFill} width={DISPLAY_W} height={DISPLAY_H} pointerEvents="none">
              <Ellipse
                cx={DISPLAY_W / 2} cy={DISPLAY_H * 0.46}
                rx={DISPLAY_W * 0.26} ry={DISPLAY_H * 0.38}
                stroke="rgba(162,155,254,0.55)" strokeWidth={2}
                fill="none" strokeDasharray="6 4"
              />
            </Svg>
            <View style={styles.cameraOverlay} pointerEvents="none">
              <Text style={styles.cameraHint}>
                Hold phone at arm's length · Centre face in the oval
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.captureBtn} onPress={takeAndroidPhoto}>
            <Text style={styles.captureBtnText}>📷  Take Photo</Text>
          </TouchableOpacity>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works (4 taps)</Text>
            <Text style={styles.infoText}>
              Take a selfie → tap left pupil → right pupil → two edges of one iris.
              App uses 12 mm iris diameter (clinical standard) to convert pixels → mm.
            </Text>
          </View>
        </>
      );
    }

    // ── Result ───────────────────────────────────────────────────────────────
    if (androidStep === 'result') {
      const pdOk = androidPD !== null && androidPD >= MIN_PD && androidPD <= MAX_PD;
      return (
        <>
          <View style={[styles.qcImageWrap, { width: DISPLAY_W, height: DISPLAY_H }]}>
            {androidPhotoUri && (
              <Image
                source={{ uri: androidPhotoUri }}
                style={{ width: DISPLAY_W, height: DISPLAY_H, borderRadius: 12 }}
                resizeMode="cover"
              />
            )}
            <Svg style={StyleSheet.absoluteFill} width={DISPLAY_W} height={DISPLAY_H} pointerEvents="none">
              {pts.lp && <Circle cx={pts.lp.x} cy={pts.lp.y} r={9} fill="rgba(46,204,113,0.85)" />}
              {pts.rp && <Circle cx={pts.rp.x} cy={pts.rp.y} r={9} fill="rgba(46,204,113,0.85)" />}
              {pts.lp && pts.rp && (
                <Line
                  x1={pts.lp.x} y1={pts.lp.y} x2={pts.rp.x} y2={pts.rp.y}
                  stroke="rgba(162,155,254,0.65)" strokeWidth={1.5} strokeDasharray="5 4"
                />
              )}
              {pts.il && pts.ir && (
                <Line
                  x1={pts.il.x} y1={pts.il.y} x2={pts.ir.x} y2={pts.ir.y}
                  stroke="rgba(253,203,110,0.7)" strokeWidth={1.5}
                />
              )}
            </Svg>
          </View>
          <View style={styles.qcResult}>
            <Text style={styles.qcPd}>PD ≈ {androidPD} mm</Text>
            <Text style={[styles.qcConf, { color: pdOk ? '#2ECC71' : '#FF4757' }]}>
              {pdOk ? 'Within typical adult range (52–74 mm)' : 'Outside range — please retake'}
            </Text>
          </View>
          <View style={styles.qcBtnRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={resetAndroid}>
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.lockBtn, { flex: 1 }, !pdOk && styles.lockBtnDim]}
              disabled={!pdOk}
              onPress={() => handleLock(androidPD!, 0.80)}
            >
              <Text style={styles.lockBtnText}>Save & Lock →</Text>
            </TouchableOpacity>
          </View>
          {locked && (
            <View style={styles.lockedRow}>
              <Text style={styles.lockedText}>✓ PD locked: {androidPD} mm</Text>
            </View>
          )}
        </>
      );
    }

    // ── Touch-mark steps 1–4 ─────────────────────────────────────────────────
    const dotColor = (androidStep === 'left-pupil' || androidStep === 'right-pupil')
      ? '#2ECC71' : '#FDCB6E';
    return (
      <>
        <View style={styles.stepBanner}>
          <Text style={styles.stepBannerText}>{ANDROID_STEP_LABEL[androidStep]}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.95}
          style={[styles.qcImageWrap, { width: DISPLAY_W, height: DISPLAY_H }]}
          onPress={handleImageTap}
        >
          {androidPhotoUri && (
            <Image
              source={{ uri: androidPhotoUri }}
              style={{ width: DISPLAY_W, height: DISPLAY_H, borderRadius: 12 }}
              resizeMode="cover"
            />
          )}
          <Svg style={StyleSheet.absoluteFill} width={DISPLAY_W} height={DISPLAY_H} pointerEvents="none">
            {pts.lp && <Circle cx={pts.lp.x} cy={pts.lp.y} r={9} fill="rgba(46,204,113,0.85)" />}
            {pts.rp && <Circle cx={pts.rp.x} cy={pts.rp.y} r={9} fill="rgba(46,204,113,0.85)" />}
            {pts.il && <Circle cx={pts.il.x} cy={pts.il.y} r={6} fill="rgba(253,203,110,0.85)" />}
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.retakeBtn, { marginTop: 10 }]} onPress={resetAndroid}>
          <Text style={styles.retakeBtnText}>← Start Over</Text>
        </TouchableOpacity>
        <Text style={styles.tapHint}>Tap directly on the point described above</Text>
      </>
    );
  };

  const renderMeasureIdle = () => (
    <>
      {loadStatus === 'loading' && (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>⏳ Loading face detector…</Text>
          <Text style={styles.loadingSubText}>First run downloads ~6 MB model</Text>
        </View>
      )}
      {loadStatus === 'error' && (
        <View style={[styles.loadingCard, styles.errorCard]}>
          <Text style={styles.loadingText}>⚠ Could not load face detector</Text>
          <Text style={styles.loadingSubText}>Check your internet connection</Text>
        </View>
      )}
      <View style={[styles.cameraContainer, { width: DISPLAY_W, height: DISPLAY_H }]}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.cameraOverlay} pointerEvents="none">
          <Text style={styles.cameraHint}>
            Face the camera · arm's length · good lighting
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.captureBtn, loadStatus === 'error' && styles.captureBtnDim]}
        onPress={startCapture}
        disabled={loadStatus === 'error'}
      >
        <Text style={styles.captureBtnText}>
          {loadStatus === 'loading' ? 'Loading detector…' : 'Measure PD (3 frames)'}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderMeasureCapturing = () => (
    <View style={styles.capturingWrap}>
      <View style={[styles.cameraContainer, { width: DISPLAY_W, height: DISPLAY_H }]}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
      </View>
      <View style={styles.frameDotsRow}>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.frameDot, captureProgress >= i && styles.frameDotDone]} />
        ))}
      </View>
      <Text style={styles.capturingLabel}>
        {measureState === 'initialising'
          ? 'Starting detector…'
          : `Capturing frame ${captureProgress} of ${FRAME_COUNT}…`}
      </Text>
    </View>
  );

  const renderMeasureQC = () => {
    if (!captureResult || !bestFrameUri) return null;
    const bf = captureResult.bestFrame;

    // Map normalised landmark coords → display pixel positions
    const lx  = bf.leftCenter.x  * DISPLAY_W;
    const ly  = bf.leftCenter.y  * DISPLAY_H;
    const rx  = bf.rightCenter.x * DISPLAY_W;
    const ry  = bf.rightCenter.y * DISPLAY_H;
    // Average H and V radius for the circle on screen
    const lrx = bf.leftRadiusNormX  * DISPLAY_W;
    const lry = bf.leftRadiusNormY  * DISPLAY_H;
    const rrx = bf.rightRadiusNormX * DISPLAY_W;
    const rry = bf.rightRadiusNormY * DISPLAY_H;
    const lr  = (lrx + lry) / 2;
    const rr  = (rrx + rry) / 2;

    const confColor =
      captureResult.confidence === 'High'   ? '#2ECC71' :
      captureResult.confidence === 'Medium' ? '#FDCB6E' : '#FF4757';

    return (
      <>
        {/* Photo + overlay */}
        <View style={[styles.qcImageWrap, { width: DISPLAY_W, height: DISPLAY_H }]}>
          <Image
            source={{ uri: bestFrameUri }}
            style={{ width: DISPLAY_W, height: DISPLAY_H, borderRadius: 12 }}
            resizeMode="cover"
          />
          <Svg style={StyleSheet.absoluteFill} width={DISPLAY_W} height={DISPLAY_H}>
            {/* Left eye */}
            <Circle cx={lx} cy={ly} r={lr} stroke="#2ECC71" strokeWidth={2} fill="none" opacity={0.85} />
            <Line x1={lx-12} y1={ly} x2={lx+12} y2={ly} stroke="#2ECC71" strokeWidth={2} />
            <Line x1={lx} y1={ly-12} x2={lx} y2={ly+12} stroke="#2ECC71" strokeWidth={2} />
            {/* Right eye */}
            <Circle cx={rx} cy={ry} r={rr} stroke="#2ECC71" strokeWidth={2} fill="none" opacity={0.85} />
            <Line x1={rx-12} y1={ry} x2={rx+12} y2={ry} stroke="#2ECC71" strokeWidth={2} />
            <Line x1={rx} y1={ry-12} x2={rx} y2={ry+12} stroke="#2ECC71" strokeWidth={2} />
            {/* PD span */}
            <Line x1={lx} y1={ly} x2={rx} y2={ry} stroke="rgba(162,155,254,0.55)" strokeWidth={1.5} strokeDasharray="5 4" />
          </Svg>
        </View>

        {/* Result */}
        <View style={styles.qcResult}>
          <Text style={styles.qcPd}>PD ≈ {captureResult.pdMm} mm</Text>
          <Text style={[styles.qcConf, { color: confColor }]}>
            Confidence: {captureResult.confidence}
            {captureResult.variationMm > 0 ? `  ·  ±${captureResult.variationMm} mm variation` : ''}
          </Text>
        </View>

        {captureResult.flags.map((f, i) => (
          <View key={i} style={styles.flagRow}>
            <Text style={styles.flagText}>⚠  {f}</Text>
          </View>
        ))}

        <Text style={styles.qcPrompt}>
          Are the green circles centred on your irises?
        </Text>

        <View style={styles.qcBtnRow}>
          <TouchableOpacity style={styles.retakeBtn} onPress={() => {
            setBestFrameUri(null); setCaptureResult(null); setMeasureState('idle');
          }}>
            <Text style={styles.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.lockBtn, { flex: 1 }]}
            onPress={() => handleLock(
              captureResult.pdMm,
              captureResult.confidence === 'High'   ? 0.93
              : captureResult.confidence === 'Medium' ? 0.80 : 0.62,
            )}
          >
            <Text style={styles.lockBtnText}>Save & Lock →</Text>
          </TouchableOpacity>
        </View>

        {locked && (
          <View style={styles.lockedRow}>
            <Text style={styles.lockedText}>✓ PD locked: {captureResult.pdMm} mm</Text>
          </View>
        )}
      </>
    );
  };

  const renderMeasure = () => {
    if (Platform.OS === 'web') {
      if (measureState === 'qc')                        return renderMeasureQC();
      if (measureState === 'capturing' ||
          measureState === 'initialising')              return renderMeasureCapturing();
      return renderMeasureIdle();
    }
    // Native (Android / iOS): touch-mark approach
    return renderMeasureAndroid();
  };

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>STEP 3 OF 11 · PUPIL DISTANCE</Text>
        </View>

        <Text style={styles.title}>Pupil Distance (PD)</Text>
        <Text style={styles.desc}>
          PD calibrates optotype sizes to your eyes.
        </Text>

        {renderTabs()}

        {mode === 'default' && renderDefault()}
        {mode === 'manual'  && renderManual()}
        {mode === 'measure' && renderMeasure()}

        {/* Debug */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug</Text>
        </TouchableOpacity>
        {debugOpen && (
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>
              {JSON.stringify({
                mode, locked, measureState, loadStatus,
                result: captureResult ? {
                  pdMm: captureResult.pdMm,
                  conf: captureResult.confidence,
                  frames: captureResult.frames.length,
                  flags: captureResult.flags,
                } : null,
              }, null, 2)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, !locked && styles.nextBtnDim]}
          onPress={() => navigation.navigate('EyeFarTest', { eye: 'right', run: 1 })}
          disabled={!locked}
        >
          <Text style={styles.nextBtnText}>
            {locked ? 'Start Eye Tests →' : 'Lock PD to continue'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { paddingHorizontal: 24 },
  phaseTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(162,155,254,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20,
  },
  phaseText: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  desc:  { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 21, marginBottom: 20 },

  modeRow:          { flexDirection: 'row', gap: 8, marginBottom: 20 },
  modeBtn:          { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modeBtnActive:    { backgroundColor: 'rgba(108,92,231,0.22)', borderColor: '#6C5CE7' },
  modeBtnText:      { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  modeBtnTextActive:{ color: '#A29BFE' },

  pdBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  pdIcon:{ fontSize: 40, marginBottom: 14 },
  pdBig: { fontSize: 48, fontWeight: '900', color: '#A29BFE', marginBottom: 6 },
  pdSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16 },

  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pdInput:  { fontSize: 48, fontWeight: '900', color: '#A29BFE', borderBottomWidth: 2, borderBottomColor: '#6C5CE7', minWidth: 100, textAlign: 'center', paddingHorizontal: 8 },
  pdUnit:   { fontSize: 20, color: 'rgba(255,255,255,0.5)', marginLeft: 6 },
  pdError:  { fontSize: 12, color: '#FF4757', marginBottom: 12 },

  lockBtn:    { backgroundColor: '#6C5CE7', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8, alignItems: 'center' },
  lockBtnDim: { backgroundColor: 'rgba(108,92,231,0.3)' },
  lockBtnText:{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  lockedRow: { backgroundColor: 'rgba(46,204,113,0.15)', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 12 },
  lockedText:{ fontSize: 15, color: '#2ECC71', fontWeight: '700' },

  infoCard:  { backgroundColor: 'rgba(162,155,254,0.08)', borderRadius: 14, padding: 14, marginTop: 18, alignSelf: 'stretch', borderWidth: 1, borderColor: 'rgba(162,155,254,0.15)' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#A29BFE', marginBottom: 5 },
  infoText:  { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },

  nativeNotice: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 20, textAlign: 'center', marginTop: 8 },

  loadingCard:   { backgroundColor: 'rgba(162,155,254,0.08)', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(162,155,254,0.15)', alignItems: 'center' },
  errorCard:     { backgroundColor: 'rgba(255,71,87,0.08)', borderColor: 'rgba(255,71,87,0.2)' },
  loadingText:   { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  loadingSubText:{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 },

  cameraContainer: { borderRadius: 14, overflow: 'hidden', marginBottom: 12, alignSelf: 'center' },
  camera:          { flex: 1 },
  cameraOverlay:   { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 10 },
  cameraHint:      { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', backgroundColor: 'rgba(10,10,26,0.65)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },

  captureBtn:    { backgroundColor: '#A29BFE', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  captureBtnDim: { backgroundColor: 'rgba(162,155,254,0.3)' },
  captureBtnText:{ fontSize: 15, fontWeight: '700', color: '#0A0A1A' },

  capturingWrap:  { alignItems: 'center' },
  frameDotsRow:   { flexDirection: 'row', gap: 12, marginVertical: 12 },
  frameDot:       { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' },
  frameDotDone:   { backgroundColor: '#2ECC71' },
  capturingLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },

  qcImageWrap:  { alignSelf: 'center', marginBottom: 14, borderRadius: 12, overflow: 'hidden' },
  qcResult:     { alignItems: 'center', marginBottom: 8 },
  qcPd:         { fontSize: 28, fontWeight: '900', color: '#A29BFE', marginBottom: 4 },
  qcConf:       { fontSize: 13, fontWeight: '700' },
  flagRow:      { backgroundColor: 'rgba(253,203,110,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(253,203,110,0.2)' },
  flagText:     { fontSize: 12, color: '#FDCB6E' },
  qcPrompt:     { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 10, marginBottom: 12 },
  qcBtnRow:     { flexDirection: 'row', gap: 10, marginBottom: 8 },
  retakeBtn:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  retakeBtnText:{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },

  debugToggle:     { marginTop: 16, marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox:        { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginBottom: 16 },
  debugText:       { fontSize: 11, color: 'rgba(162,155,254,0.7)', fontFamily: 'monospace' },

  stepBanner:     { backgroundColor: 'rgba(108,92,231,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(108,92,231,0.35)', alignSelf: 'stretch' },
  stepBannerText: { fontSize: 13, color: '#A29BFE', fontWeight: '700', textAlign: 'center' },
  tapHint:        { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 6 },

  nextBtn:     { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center' },
  nextBtnDim:  { backgroundColor: 'rgba(108,92,231,0.3)' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
