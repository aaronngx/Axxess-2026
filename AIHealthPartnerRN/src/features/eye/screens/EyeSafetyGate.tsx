// src/features/eye/screens/EyeSafetyGate.tsx — STUB Phase 1
// Real Phase: Safety Gate — red-flag symptom check before starting test.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEyeSession } from '../EyeSessionContext';

const RED_FLAG_SYMPTOMS = [
  { key: 'sudden_change', label: 'Sudden vision loss or change' },
  { key: 'eye_strain', label: 'Severe eye pain' },
  { key: 'blurry_far', label: 'Curtain / shadow across vision' },
  { key: 'glare_sensitivity', label: 'Flashes of light + many floaters' },
] as const;

export const EyeSafetyGate: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { session, updateSession } = useEyeSession();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [debugOpen, setDebugOpen] = useState(false);

  const anyFlagged = Object.values(flags).some(Boolean);

  const toggle = (key: string) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
    updateSession({
      symptoms: { ...session.symptoms, [key]: !flags[key] } as any,
    });
  };

  const handleContinue = () => {
    navigation.navigate('EyeSetupCamera');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        {/* Phase tag */}
        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>STEP 1 OF 11 · SAFETY CHECK</Text>
        </View>

        <Text style={styles.title}>Before we begin</Text>
        <Text style={styles.desc}>
          Are you experiencing any of the following right now? If yes, please skip this test
          and see a doctor promptly.
        </Text>

        {/* Symptoms */}
        {RED_FLAG_SYMPTOMS.map(s => (
          <View key={s.key} style={styles.symptomRow}>
            <Text style={styles.symptomLabel}>{s.label}</Text>
            <Switch
              value={!!flags[s.key]}
              onValueChange={() => toggle(s.key)}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#FF4757' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}

        {anyFlagged && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              You've flagged a red-flag symptom. Please do not proceed — contact a doctor or
              emergency services if symptoms are severe.
            </Text>
          </View>
        )}

        {/* Debug panel */}
        <TouchableOpacity onPress={() => setDebugOpen(o => !o)} style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>{debugOpen ? '▼' : '▶'} Debug · Session State</Text>
        </TouchableOpacity>
        {debugOpen && (
          <ScrollView style={styles.debugBox} horizontal>
            <Text style={styles.debugText}>{JSON.stringify(session, null, 2)}</Text>
          </ScrollView>
        )}

        {/* Action */}
        {anyFlagged ? (
          <TouchableOpacity style={styles.exitBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.exitBtnText}>Exit — Seek Medical Advice</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={handleContinue}>
            <Text style={styles.nextBtnText}>No symptoms — Continue →</Text>
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
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(162,155,254,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20,
  },
  phaseText: { fontSize: 11, color: '#A29BFE', fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  desc: { fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 22, marginBottom: 28 },
  symptomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  symptomLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)', flex: 1, marginRight: 12 },
  warningBox: {
    flexDirection: 'row', backgroundColor: 'rgba(255,71,87,0.12)',
    borderRadius: 14, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)', alignItems: 'flex-start',
  },
  warningIcon: { fontSize: 20, marginRight: 12 },
  warningText: { fontSize: 14, color: '#FF6B81', lineHeight: 20, flex: 1 },
  debugToggle: { marginTop: 24, marginBottom: 8 },
  debugToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  debugBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, maxHeight: 160, marginBottom: 16,
  },
  debugText: { fontSize: 11, color: 'rgba(162,155,254,0.7)', fontFamily: 'monospace' },
  nextBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 8,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  exitBtn: {
    backgroundColor: 'rgba(255,71,87,0.2)', borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(255,71,87,0.4)',
  },
  exitBtnText: { fontSize: 16, fontWeight: '700', color: '#FF4757' },
});
