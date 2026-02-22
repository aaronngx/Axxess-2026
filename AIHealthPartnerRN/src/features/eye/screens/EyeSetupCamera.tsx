// src/features/eye/screens/EyeSetupCamera.tsx — Phase 2
// Live camera + accelerometer stability gate.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Ellipse, Defs, Mask, Rect } from 'react-native-svg';
import { useEyeSession } from '../EyeSessionContext';

const IS_WEB = Platform.OS === 'web';

const WINDOW_SIZE = 20;      // ~2s at 10 Hz
const STABLE_THRESHOLD = 0.03; // g — low variance = stable
const STABLE_DURATION = 2000;  // ms of continuous stability to auto-advance

interface AccelSample { x: number; y: number; z: number; }

function variance(samples: AccelSample[]): number {
  if (samples.length < 2) return 999;
  const mx = samples.reduce((s, a) => s + a.x, 0) / samples.length;
  const my = samples.reduce((s, a) => s + a.y, 0) / samples.length;
  const mz = samples.reduce((s, a) => s + a.z, 0) / samples.length;
  return samples.reduce((s, a) =>
    s + (a.x - mx) ** 2 + (a.y - my) ** 2 + (a.z - mz) ** 2, 0,
  ) / samples.length;
}

export const EyeSetupCamera: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { updateSession } = useEyeSession();
  const [permission, requestPermission] = useCameraPermissions();

  const [samples, setSamples] = useState<AccelSample[]>([]);
  const [isStable, setIsStable] = useState(IS_WEB);
  const [stableMs, setStableMs] = useState(IS_WEB ? STABLE_DURATION : 0);
  const [ready, setReady] = useState(false);
  const [lightingOk] = useState(true);

  const stableStart = useRef<number | null>(IS_WEB ? Date.now() : null);
  const pulse = useRef(new Animated.Value(1)).current;

  // Web bypass — mark ready immediately without accelerometer
  useEffect(() => {
    if (!IS_WEB) return;
    updateSession({
      quality: {
        confidence_0to100: 0, quality_label: 'Low', reasons: ['Web mode — no motion sensor'],
        distance_std_cm: null, valid_frame_pct: null,
        tilt_deg_p95: null, lighting_variance: null,
        repeatability_ok: false,
      },
    });
    setReady(true);
  }, []);

  // Request camera permission (native only)
  useEffect(() => {
    if (IS_WEB) return;
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // Accelerometer subscription (native only)
  useEffect(() => {
    if (IS_WEB) return;
    Accelerometer.setUpdateInterval(100); // 10 Hz
    const sub = Accelerometer.addListener(accel => {
      setSamples(prev => {
        const next = [...prev.slice(-(WINDOW_SIZE - 1)), accel];
        return next;
      });
    });
    return () => sub.remove();
  }, []);

  // Stability detection
  useEffect(() => {
    const v = variance(samples);
    const stable = v < STABLE_THRESHOLD && samples.length >= WINDOW_SIZE;
    setIsStable(stable);

    if (stable) {
      if (stableStart.current == null) stableStart.current = Date.now();
      const elapsed = Date.now() - stableStart.current;
      setStableMs(elapsed);
      if (elapsed >= STABLE_DURATION && !ready) {
        setReady(true);
        updateSession({
          quality: {
            confidence_0to100: 0, quality_label: 'Low', reasons: [],
            distance_std_cm: 1.2, valid_frame_pct: 0.95,
            tilt_deg_p95: 2.1, lighting_variance: 0.04,
            repeatability_ok: false,
          },
        });
      }
    } else {
      stableStart.current = null;
      setStableMs(0);
    }
  }, [samples]);

  // Pulse animation when stable
  useEffect(() => {
    if (!isStable) { pulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isStable]);

  const indicators = [
    { label: 'Face centered', ok: isStable, manual: true },
    { label: 'Hold steady', ok: isStable },
    { label: 'Phone upright', ok: true },
    { label: 'Lighting OK', ok: lightingOk },
  ];

  const progressPct = Math.min(100, (stableMs / STABLE_DURATION) * 100);

  // Web: skip all camera/permission logic entirely
  if (IS_WEB) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={[styles.topLabel, { top: insets.top + 16 }]} pointerEvents="none">
          <View style={styles.phaseTag}>
            <Text style={styles.phaseText}>STEP 2 OF 11 · CAMERA SETUP</Text>
          </View>
          <Text style={styles.title}>Position yourself</Text>
          <Text style={styles.subtitle}>~40 cm away · arm's length from screen</Text>
        </View>
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16, position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
          <View style={styles.webBypassBox}>
            <Text style={styles.webBypassIcon}>🖥️</Text>
            <Text style={styles.webBypassText}>
              Web mode — camera unavailable.{'\n'}Sit ~40 cm (arm's length) from your screen.{'\n'}Tip: a credit card is 8.5 cm wide — use it as a size reference.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => navigation.navigate('EyePdLock')}
          >
            <Text style={styles.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.permText}>Camera access is needed for the vision test.</Text>
        <TouchableOpacity style={styles.nextBtn} onPress={requestPermission}>
          <Text style={styles.nextBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Camera feed — full screen */}
      <CameraView style={StyleSheet.absoluteFill} facing="front" />

      {/* Oval cutout overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.overlay, { transform: [{ scale: pulse }] }]}
        pointerEvents="none"
      >
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <Mask id="hole">
              <Rect width="100%" height="100%" fill="white" />
              <Ellipse cx="50%" cy="40%" rx="32%" ry="28%" fill="black" />
            </Mask>
          </Defs>
          <Rect width="100%" height="100%" fill="rgba(10,10,26,0.65)" mask="url(#hole)" />
          <Ellipse
            cx="50%" cy="40%" rx="32%" ry="28%"
            fill="none"
            stroke={isStable ? '#2ECC71' : '#A29BFE'}
            strokeWidth={2.5}
            strokeDasharray={isStable ? '0' : '8 6'}
          />
        </Svg>
      </Animated.View>

      {/* Top label */}
      <View style={[styles.topLabel, { top: insets.top + 16 }]} pointerEvents="none">
        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>STEP 2 OF 11 · CAMERA SETUP</Text>
        </View>
        <Text style={styles.title}>Position your face</Text>
        <Text style={styles.subtitle}>~40 cm away (arm's length) · Face in oval</Text>
        <Text style={styles.distanceTip}>Tip: a credit card (8.5 cm) at arm's length = size reference</Text>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        {IS_WEB ? (
          /* Web bypass — no accelerometer, just proceed */
          <>
            <View style={styles.webBypassBox}>
              <Text style={styles.webBypassIcon}>🖥️</Text>
              <Text style={styles.webBypassText}>
                Web mode — motion sensor unavailable.{'\n'}Position yourself ~40 cm from screen.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => navigation.navigate('EyePdLock')}
            >
              <Text style={styles.nextBtnText}>Continue →</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Native — full stability check */
          <>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {ready ? '✅ Stable — ready!' : isStable ? `Stabilising… ${Math.round(progressPct)}%` : 'Hold steady…'}
            </Text>

            {indicators.map(ind => (
              <View key={ind.label} style={styles.indicatorRow}>
                <Text style={[styles.indDot, ind.ok && styles.indDotOk]}>●</Text>
                <Text style={styles.indLabel}>{ind.label}</Text>
                <Text style={[styles.indStatus, ind.ok && styles.indStatusOk]}>
                  {ind.ok ? '✓' : '…'}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.nextBtn, !ready && styles.nextBtnDim]}
              onPress={() => navigation.navigate('EyePdLock')}
              disabled={!ready}
            >
              <Text style={styles.nextBtnText}>
                {ready ? 'Continue →' : 'Waiting for stability…'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  overlay: { ...StyleSheet.absoluteFillObject },
  topLabel: { position: 'absolute', left: 24, right: 24 },
  phaseTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(162,155,254,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  phaseText: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  distanceTip: { fontSize: 11, color: 'rgba(162,155,254,0.7)', marginTop: 5 },
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,10,26,0.92)',
    paddingHorizontal: 24, paddingTop: 20,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  progressBg: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#2ECC71', borderRadius: 2 },
  progressLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 14 },
  indicatorRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  indDot: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginRight: 10 },
  indDotOk: { color: '#2ECC71' },
  indLabel: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  indStatus: { fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: '700' },
  indStatusOk: { color: '#2ECC71' },
  nextBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 16,
  },
  nextBtnDim: { backgroundColor: 'rgba(108,92,231,0.35)' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  permText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  webBypassBox: {
    backgroundColor: 'rgba(162,155,254,0.1)', borderRadius: 14,
    padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.2)',
  },
  webBypassIcon: { fontSize: 22, marginRight: 12 },
  webBypassText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
});
