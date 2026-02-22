// src/features/hearing/screens/HearingAppleInput.tsx
// Manual entry of Apple Hearing Test result from Health app.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHearingSession } from '../HearingSessionContext';
import { AudiogramPoint } from '../models/types';

// WHO severity classification → midpoint dBHL for quick-pick
const CLASSIFICATIONS = [
  { label: 'Normal', dbhl: 10, color: '#2ECC71' },
  { label: 'Mild', dbhl: 28, color: '#FDCB6E' },
  { label: 'Moderate', dbhl: 43, color: '#F39C12' },
  { label: 'Mod. Severe', dbhl: 58, color: '#E67E22' },
  { label: 'Severe', dbhl: 73, color: '#E74C3C' },
];

const AUDIOGRAM_FREQS = [500, 1000, 2000, 4000, 8000];

function parseDbhl(val: string): number | null {
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return Math.max(0, Math.min(120, n));
}

export const HearingAppleInput: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { updateSession } = useHearingSession();

  const [leftDbhl, setLeftDbhl] = useState('');
  const [rightDbhl, setRightDbhl] = useState('');
  const [leftClassIdx, setLeftClassIdx] = useState<number | null>(null);
  const [rightClassIdx, setRightClassIdx] = useState<number | null>(null);

  const [userAge, setUserAge] = useState('');
  const [showAudiogram, setShowAudiogram] = useState(false);

  // Audiogram: [freq][ear] → dbhl string
  const [agLeft, setAgLeft] = useState<Record<number, string>>({});
  const [agRight, setAgRight] = useState<Record<number, string>>({});

  // Pick classification → fill dbhl field
  const pickClass = (ear: 'left' | 'right', idx: number) => {
    const dbhl = String(CLASSIFICATIONS[idx].dbhl);
    if (ear === 'left') { setLeftClassIdx(idx); setLeftDbhl(dbhl); }
    else { setRightClassIdx(idx); setRightDbhl(dbhl); }
  };

  const effectiveLeft = parseDbhl(leftDbhl);
  const effectiveRight = parseDbhl(rightDbhl);
  const canContinue = (effectiveLeft != null || effectiveRight != null);

  const handleContinue = () => {
    const audiogramLeft: AudiogramPoint[] | null = showAudiogram
      ? AUDIOGRAM_FREQS.map(hz => ({ hz, dbhl: parseDbhl(agLeft[hz] ?? '') ?? 0 })).filter(p => p.dbhl > 0)
      : null;
    const audiogramRight: AudiogramPoint[] | null = showAudiogram
      ? AUDIOGRAM_FREQS.map(hz => ({ hz, dbhl: parseDbhl(agRight[hz] ?? '') ?? 0 })).filter(p => p.dbhl > 0)
      : null;

    const age = parseInt(userAge, 10);

    updateSession({
      left_dbhl: effectiveLeft,
      right_dbhl: effectiveRight,
      audiogram_points_left: audiogramLeft && audiogramLeft.length > 0 ? audiogramLeft : null,
      audiogram_points_right: audiogramRight && audiogramRight.length > 0 ? audiogramRight : null,
      user_age: isNaN(age) || age < 5 || age > 110 ? null : age,
    });
    navigation.navigate('HearingResults');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.phaseTag}>
            <Text style={styles.phaseText}>STEP 2 · APPLE HEARING TEST RESULT</Text>
          </View>
          <Text style={styles.title}>Enter Your Result</Text>
          <Text style={styles.desc}>
            Open Health app → Hearing → your AirPods Pro 2 test. Enter the dBHL value shown for each ear, or pick the classification.
          </Text>

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>💡 The Apple Hearing Test shows results as dBHL values and a classification (Normal, Mild loss, etc.) in the Health app.</Text>
          </View>

          {/* Left ear */}
          <Text style={styles.earLabel}>Left Ear (OS)</Text>
          <TextInput
            style={styles.dbhlInput}
            placeholder="e.g. 18"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="numeric"
            value={leftDbhl}
            onChangeText={v => { setLeftDbhl(v); setLeftClassIdx(null); }}
          />
          <Text style={styles.orLabel}>— or pick classification —</Text>
          <View style={styles.classRow}>
            {CLASSIFICATIONS.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.classBtn, leftClassIdx === i && styles.classBtnSel, { borderColor: c.color }]}
                onPress={() => pickClass('left', i)}
              >
                <Text style={[styles.classBtnText, { color: leftClassIdx === i ? c.color : 'rgba(255,255,255,0.5)' }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Right ear */}
          <Text style={[styles.earLabel, { marginTop: 20 }]}>Right Ear (OD)</Text>
          <TextInput
            style={styles.dbhlInput}
            placeholder="e.g. 26"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="numeric"
            value={rightDbhl}
            onChangeText={v => { setRightDbhl(v); setRightClassIdx(null); }}
          />
          <Text style={styles.orLabel}>— or pick classification —</Text>
          <View style={styles.classRow}>
            {CLASSIFICATIONS.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.classBtn, rightClassIdx === i && styles.classBtnSel, { borderColor: c.color }]}
                onPress={() => pickClass('right', i)}
              >
                <Text style={[styles.classBtnText, { color: rightClassIdx === i ? c.color : 'rgba(255,255,255,0.5)' }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Age */}
          <Text style={[styles.earLabel, { marginTop: 20 }]}>Your Age (for norm comparison)</Text>
          <TextInput
            style={styles.dbhlInput}
            placeholder="e.g. 45"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="numeric"
            value={userAge}
            onChangeText={setUserAge}
          />

          {/* Optional audiogram */}
          <TouchableOpacity style={styles.optionalToggle} onPress={() => setShowAudiogram(o => !o)}>
            <Text style={styles.optionalToggleText}>
              {showAudiogram ? '▼' : '▶'} Optional: Enter full audiogram per frequency
            </Text>
          </TouchableOpacity>

          {showAudiogram && (
            <View style={styles.audiogramBox}>
              <Text style={styles.agHeader}>Frequency (Hz) · Left / Right dBHL</Text>
              {AUDIOGRAM_FREQS.map(hz => (
                <View key={hz} style={styles.agRow}>
                  <Text style={styles.agFreq}>{hz < 1000 ? `${hz}` : `${hz / 1000}k`} Hz</Text>
                  <TextInput
                    style={styles.agInput}
                    placeholder="L"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="numeric"
                    value={agLeft[hz] ?? ''}
                    onChangeText={v => setAgLeft(p => ({ ...p, [hz]: v }))}
                  />
                  <Text style={styles.agSlash}>/</Text>
                  <TextInput
                    style={styles.agInput}
                    placeholder="R"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="numeric"
                    value={agRight[hz] ?? ''}
                    onChangeText={v => setAgRight(p => ({ ...p, [hz]: v }))}
                  />
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.nextBtn, !canContinue && styles.nextBtnDim]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={styles.nextBtnText}>Compute Results →</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { paddingHorizontal: 20 },
  backBtn: { marginBottom: 16 },
  backBtnText: { fontSize: 15, color: '#A29BFE', fontWeight: '600' },
  phaseTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(162,155,254,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
  },
  phaseText: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 16 },
  tipBox: {
    backgroundColor: 'rgba(162,155,254,0.08)', borderRadius: 12, padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.15)',
  },
  tipText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  earLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginBottom: 8 },
  dbhlInput: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    padding: 14, fontSize: 18, color: '#FFFFFF', fontWeight: '700',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 10,
  },
  orLabel: { fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 8 },
  classRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  classBtn: {
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  classBtnSel: { backgroundColor: 'rgba(255,255,255,0.08)' },
  classBtnText: { fontSize: 12, fontWeight: '600' },
  optionalToggle: { marginTop: 20, marginBottom: 8 },
  optionalToggleText: { fontSize: 13, color: 'rgba(162,155,254,0.7)', fontWeight: '600' },
  audiogramBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  agHeader: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10, fontWeight: '600' },
  agRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  agFreq: { width: 44, fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  agInput: {
    width: 52, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8,
    padding: 8, fontSize: 14, color: '#FFFFFF', textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  agSlash: { fontSize: 16, color: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  nextBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24 },
  nextBtnDim: { backgroundColor: 'rgba(108,92,231,0.3)' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
