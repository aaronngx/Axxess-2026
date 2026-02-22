// src/features/hearing/screens/HearingSpeechInNoise.tsx
// WHO hearWHO redirect + score entry fallback path.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHearingSession } from '../HearingSessionContext';

const WHO_HEARWHO_URL = Platform.OS === 'android'
  ? 'https://play.google.com/store/apps/details?id=com.who.hearwho'
  : 'https://apps.apple.com/app/hearwho/id1506463301';

export const HearingSpeechInNoise: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { updateSession } = useHearingSession();

  const [sinScore, setSinScore] = useState('');
  const [userAge, setUserAge] = useState('');
  const [testDone, setTestDone] = useState(false);

  const score = parseInt(sinScore, 10);
  const validScore = !isNaN(score) && score >= 0 && score <= 100;

  const handleContinue = () => {
    const age = parseInt(userAge, 10);
    updateSession({
      sin_score: validScore ? score : null,
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
            <Text style={styles.phaseText}>STEP 2 · SPEECH-IN-NOISE TEST</Text>
          </View>
          <Text style={styles.title}>WHO hearWHO Test</Text>
          <Text style={styles.desc}>
            The WHO hearWHO app runs a validated digits-in-noise hearing screen. Take the test then enter your score below.
          </Text>

          {/* Steps */}
          {[
            { step: '1', text: 'Put on your headphones or earbuds' },
            { step: '2', text: 'Open the hearWHO app (tap button below)' },
            { step: '3', text: 'Complete the test — it takes about 5 minutes' },
            { step: '4', text: 'Come back here and enter your score (0–100)' },
          ].map(item => (
            <View key={item.step} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{item.step}</Text>
              </View>
              <Text style={styles.stepText}>{item.text}</Text>
            </View>
          ))}

          {/* Open hearWHO */}
          <TouchableOpacity
            style={styles.whoBtn}
            onPress={() => { Linking.openURL(WHO_HEARWHO_URL); setTestDone(true); }}
          >
            <Text style={styles.whoBtnIcon}>🎧</Text>
            <Text style={styles.whoBtnText}>Open hearWHO {Platform.OS === 'android' ? 'Play Store' : 'App Store'} Page</Text>
          </TouchableOpacity>

          {testDone && (
            <View style={styles.doneNote}>
              <Text style={styles.doneNoteText}>Done with the test? Enter your score below.</Text>
            </View>
          )}

          {/* Score entry */}
          <Text style={styles.inputLabel}>Your hearWHO Score (0–100)</Text>
          <TextInput
            style={styles.scoreInput}
            placeholder="e.g. 72"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="numeric"
            value={sinScore}
            onChangeText={setSinScore}
          />
          <Text style={styles.scoreHint}>Pass threshold: 50 or above (WHO standard)</Text>

          {/* Age */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Your Age (for norm comparison)</Text>
          <TextInput
            style={styles.scoreInput}
            placeholder="e.g. 45"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="numeric"
            value={userAge}
            onChangeText={setUserAge}
          />

          <TouchableOpacity
            style={[styles.nextBtn, !validScore && styles.nextBtnDim]}
            onPress={handleContinue}
            disabled={!validScore}
          >
            <Text style={styles.nextBtnText}>Compute Results →</Text>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity style={styles.skipBtn} onPress={() => { updateSession({ sin_score: null }); navigation.navigate('HearingResults'); }}>
            <Text style={styles.skipBtnText}>Skip — continue without score</Text>
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
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 20 },
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(162,155,254,0.2)', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, marginTop: 1,
  },
  stepNumText: { fontSize: 13, color: '#A29BFE', fontWeight: '800' },
  stepText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 21 },
  whoBtn: {
    backgroundColor: 'rgba(162,155,254,0.15)', borderRadius: 16, padding: 18,
    alignItems: 'center', marginVertical: 20, flexDirection: 'row', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(162,155,254,0.3)',
  },
  whoBtnIcon: { fontSize: 20, marginRight: 10 },
  whoBtnText: { fontSize: 15, fontWeight: '700', color: '#A29BFE' },
  doneNote: {
    backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 10, padding: 10, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
  },
  doneNoteText: { fontSize: 13, color: '#2ECC71', fontWeight: '600', textAlign: 'center' },
  inputLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginBottom: 8 },
  scoreInput: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    padding: 14, fontSize: 18, color: '#FFFFFF', fontWeight: '700',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 },
  nextBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24 },
  nextBtnDim: { backgroundColor: 'rgba(108,92,231,0.3)' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  skipBtn: { alignItems: 'center', padding: 14 },
  skipBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
});
