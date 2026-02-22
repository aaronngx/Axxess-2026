// src/features/hearing/screens/HearingPreCheck.tsx
// Pre-check gate: environment + symptoms + confounders.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHearingSession } from '../HearingSessionContext';
import { HearingSymptoms, HearingQualityContext, TestSource } from '../models/types';

type RouteParams = { source: TestSource };

const QUALITY_ITEMS: Array<{ key: keyof HearingQualityContext; label: string; icon: string; invertBad?: boolean }> = [
  { key: 'quiet_room', label: 'I am in a quiet room', icon: '🤫', invertBad: true },
  { key: 'headphones_connected', label: 'Headphones / AirPods are connected', icon: '🎧', invertBad: true },
  { key: 'recent_loud_noise_24h', label: 'Loud noise exposure in last 24 hours (concert, tools)', icon: '🔊' },
  { key: 'cold_allergy_infection_24h', label: 'Cold, allergies, or ear infection in last 24 hours', icon: '🤧' },
];

const SYMPTOM_ITEMS: Array<{ key: keyof HearingSymptoms; label: string; icon: string; isRedFlag?: boolean }> = [
  { key: 'sudden_change', label: 'Sudden hearing change (past 72 hours)', icon: '⚡', isRedFlag: true },
  { key: 'one_ear_worse', label: 'One ear feels noticeably worse', icon: '👂', isRedFlag: true },
  { key: 'tinnitus', label: 'Ringing or buzzing in ears (tinnitus)', icon: '🔔' },
  { key: 'ear_pain', label: 'Ear pain or drainage', icon: '😣', isRedFlag: true },
  { key: 'dizziness', label: 'Dizziness or balance problems', icon: '💫', isRedFlag: true },
  { key: 'trouble_in_noise', label: 'Trouble hearing in noisy places', icon: '🗣️' },
];

export const HearingPreCheck: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { session, updateSession } = useHearingSession();
  const { source } = route.params as RouteParams;

  const [quality, setQuality] = useState<HearingQualityContext>({
    quiet_room: false,
    headphones_connected: false,
    recent_loud_noise_24h: false,
    cold_allergy_infection_24h: false,
  });

  const [symptoms, setSymptoms] = useState<HearingSymptoms>({
    sudden_change: false,
    one_ear_worse: false,
    tinnitus: false,
    ear_pain: false,
    dizziness: false,
    trouble_in_noise: false,
  });

  const urgentFlag = symptoms.sudden_change || (symptoms.ear_pain && symptoms.dizziness);

  const handleContinue = () => {
    updateSession({ quality_context: quality, symptoms });
    if (source === 'apple') navigation.navigate('HearingAppleInput');
    else if (source === 'speech_in_noise') navigation.navigate('HearingSpeechInNoise');
    else navigation.navigate('HearingResults');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>STEP 1 · PRE-CHECK</Text>
        </View>
        <Text style={styles.title}>Before We Begin</Text>
        <Text style={styles.desc}>These questions help us give you a more accurate confidence score.</Text>

        {/* Environment & Quality */}
        <Text style={styles.sectionLabel}>Environment</Text>
        {QUALITY_ITEMS.map(item => {
          const checked = quality[item.key];
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.checkRow, checked && styles.checkRowActive]}
              onPress={() => setQuality(q => ({ ...q, [item.key]: !q[item.key] }))}
            >
              <Text style={styles.checkIcon}>{item.icon}</Text>
              <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{item.label}</Text>
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Symptoms */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Symptoms</Text>
        <Text style={styles.sectionHint}>Check any that apply in the past few days</Text>
        {SYMPTOM_ITEMS.map(item => {
          const checked = symptoms[item.key];
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.checkRow, checked && styles.checkRowSymptom, item.isRedFlag && checked && styles.checkRowRed]}
              onPress={() => setSymptoms(s => ({ ...s, [item.key]: !s[item.key] }))}
            >
              <Text style={styles.checkIcon}>{item.icon}</Text>
              <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{item.label}</Text>
              <View style={[styles.checkbox, checked && styles.checkboxChecked, item.isRedFlag && checked && styles.checkboxRed]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Urgent warning */}
        {urgentFlag && (
          <View style={styles.urgentBox}>
            <Text style={styles.urgentIcon}>⚠️</Text>
            <Text style={styles.urgentText}>
              You have reported a sudden hearing change or concerning symptoms. You can continue the screening, but please consider seeing a doctor promptly.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={handleContinue}>
          <Text style={styles.nextBtnText}>Continue →</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
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
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  sectionHint: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 10 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  checkRowActive: { backgroundColor: 'rgba(162,155,254,0.08)', borderColor: 'rgba(162,155,254,0.25)' },
  checkRowSymptom: { backgroundColor: 'rgba(162,155,254,0.08)', borderColor: 'rgba(162,155,254,0.25)' },
  checkRowRed: { backgroundColor: 'rgba(231,76,60,0.08)', borderColor: 'rgba(231,76,60,0.25)' },
  checkIcon: { fontSize: 18, marginRight: 12 },
  checkLabel: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  checkLabelActive: { color: '#FFFFFF' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#A29BFE', borderColor: '#A29BFE' },
  checkboxRed: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  checkmark: { fontSize: 13, color: '#FFFFFF', fontWeight: '900' },
  urgentBox: {
    backgroundColor: 'rgba(231,76,60,0.1)', borderRadius: 14,
    padding: 16, marginTop: 16, flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)',
  },
  urgentIcon: { fontSize: 20, marginRight: 10 },
  urgentText: { flex: 1, fontSize: 13, color: '#E74C3C', lineHeight: 19 },
  nextBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
