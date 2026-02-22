// src/features/eye/screens/EyePdLock.tsx — Phase 3
// PD measurement: camera frame + manual entry with 63mm default.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';

const DEFAULT_PD = 63;
const MIN_PD = 52;
const MAX_PD = 74;

export const EyePdLock: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { updateSession } = useEyeSession();

  const [mode, setMode] = useState<'default' | 'manual'>('default');
  const [pdText, setPdText] = useState(String(DEFAULT_PD));
  const [locked, setLocked] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  const parsedPD = parseFloat(pdText);
  const pdValid = !isNaN(parsedPD) && parsedPD >= MIN_PD && parsedPD <= MAX_PD;

  const handleLock = () => {
    const pd = pdValid ? parsedPD : DEFAULT_PD;
    updateSession({
      pd_mm: pd,
      pd_confidence_0to1: mode === 'manual' ? 0.95 : 0.75,
    });
    setLocked(true);
  };

  const pdDisplay = pdValid ? parsedPD : DEFAULT_PD;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>STEP 3 OF 11 · PUPIL DISTANCE</Text>
        </View>

        <Text style={styles.title}>Pupil Distance (PD)</Text>
        <Text style={styles.desc}>
          PD calibrates optotype sizes to your eyes. Use the population average (63 mm) or
          enter your prescription PD if you know it.
        </Text>

        {/* Mode selector */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'default' && styles.modeBtnActive]}
            onPress={() => { setMode('default'); setPdText(String(DEFAULT_PD)); setLocked(false); }}
          >
            <Text style={[styles.modeBtnText, mode === 'default' && styles.modeBtnTextActive]}>
              Use Average (63 mm)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
            onPress={() => { setMode('manual'); setLocked(false); }}
          >
            <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>
              Enter My PD
            </Text>
          </TouchableOpacity>
        </View>

        {/* PD display / input */}
        <View style={styles.pdBox}>
          <Text style={styles.pdIcon}>👁</Text>

          {mode === 'manual' ? (
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
          ) : (
            <Text style={styles.pdBig}>{DEFAULT_PD} mm</Text>
          )}

          {mode === 'manual' && !pdValid && pdText.length > 0 && (
            <Text style={styles.pdError}>Enter a value between {MIN_PD}–{MAX_PD} mm</Text>
          )}

          {!locked ? (
            <TouchableOpacity
              style={[styles.lockBtn, (!pdValid && mode === 'manual') && styles.lockBtnDim]}
              onPress={handleLock}
              disabled={mode === 'manual' && !pdValid}
            >
              <Text style={styles.lockBtnText}>Lock PD →</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.lockedRow}>
              <Text style={styles.lockedText}>✓ PD locked: {pdDisplay} mm</Text>
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Where to find your PD</Text>
          <Text style={styles.infoText}>
            Your PD is printed on your glasses prescription (usually "PD: 63" or two values
            like "31 / 32" for each eye). Average adult PD is 58–68 mm.
          </Text>
        </View>

        {/* Debug */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug</Text>
        </TouchableOpacity>
        {debugOpen && (
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>
              {JSON.stringify({ mode, pd: pdDisplay, valid: pdValid, locked }, null, 2)}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { paddingHorizontal: 24 },
  phaseTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(162,155,254,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20,
  },
  phaseText: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 21, marginBottom: 24 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  modeBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modeBtnActive: { backgroundColor: 'rgba(108,92,231,0.2)', borderColor: '#6C5CE7' },
  modeBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  modeBtnTextActive: { color: '#A29BFE' },
  pdBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20,
    padding: 28, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  pdIcon: { fontSize: 40, marginBottom: 16 },
  pdBig: { fontSize: 48, fontWeight: '900', color: '#A29BFE', marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pdInput: {
    fontSize: 48, fontWeight: '900', color: '#A29BFE',
    borderBottomWidth: 2, borderBottomColor: '#6C5CE7',
    minWidth: 100, textAlign: 'center', paddingHorizontal: 8,
  },
  pdUnit: { fontSize: 20, color: 'rgba(255,255,255,0.5)', marginLeft: 6 },
  pdError: { fontSize: 12, color: '#FF4757', marginBottom: 12 },
  lockBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
  },
  lockBtnDim: { backgroundColor: 'rgba(108,92,231,0.3)' },
  lockBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  lockedRow: {
    backgroundColor: 'rgba(46,204,113,0.15)', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  lockedText: { fontSize: 15, color: '#2ECC71', fontWeight: '700' },
  infoCard: {
    backgroundColor: 'rgba(162,155,254,0.08)', borderRadius: 16,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.15)',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#A29BFE', marginBottom: 6 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19 },
  debugToggle: { marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  debugText: { fontSize: 11, color: 'rgba(162,155,254,0.7)', fontFamily: 'monospace' },
  nextBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center',
  },
  nextBtnDim: { backgroundColor: 'rgba(108,92,231,0.3)' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
