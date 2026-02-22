// src/features/hearing/screens/HearingEntry.tsx
// Entry screen — choose test path.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHearingSession } from '../HearingSessionContext';
import { TestSource } from '../models/types';

const PATHS: Array<{
  source: TestSource;
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  next: string;
}> = [
  {
    source: 'apple',
    icon: '🍎',
    title: 'Apple Hearing Test',
    subtitle: 'Enter your AirPods Pro 2 result from the Health app',
    badge: 'Best accuracy',
    badgeColor: '#2ECC71',
    next: 'HearingPreCheck',
  },
  {
    source: 'speech_in_noise',
    icon: '🎧',
    title: 'Speech-in-Noise Screen',
    subtitle: 'Use WHO hearWHO app and enter your score here',
    badge: 'Good fallback',
    badgeColor: '#FDCB6E',
    next: 'HearingPreCheck',
  },
  {
    source: 'symptom_only',
    icon: '📋',
    title: 'Symptoms Only',
    subtitle: 'Log symptoms without a hearing test (lowest confidence)',
    badge: 'Low confidence',
    badgeColor: '#FF6B81',
    next: 'HearingPreCheck',
  },
];

export const HearingEntry: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { updateSession, resetSession } = useHearingSession();

  const handleSelect = (source: TestSource, next: string) => {
    resetSession();
    updateSession({ test_source: source });
    navigation.navigate(next, { source });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        {/* Header */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.phaseTag}>
          <Text style={styles.phaseText}>HEARING SCREENING</Text>
        </View>
        <Text style={styles.title}>Hearing Check</Text>
        <Text style={styles.desc}>
          Select how you want to check your hearing. All results are stored on your device only.
        </Text>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Screening estimate only — not a medical diagnosis. Results may vary based on environment and equipment.
          </Text>
        </View>

        {PATHS.map(path => (
          <TouchableOpacity
            key={path.source}
            style={styles.pathCard}
            onPress={() => handleSelect(path.source, path.next)}
            activeOpacity={0.8}
          >
            <View style={styles.pathLeft}>
              <Text style={styles.pathIcon}>{path.icon}</Text>
              <View style={styles.pathInfo}>
                <Text style={styles.pathTitle}>{path.title}</Text>
                <Text style={styles.pathSubtitle}>{path.subtitle}</Text>
                <View style={[styles.pathBadge, { borderColor: path.badgeColor }]}>
                  <Text style={[styles.pathBadgeText, { color: path.badgeColor }]}>{path.badge}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* History link */}
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate('HearingHistory')}
        >
          <Text style={styles.historyBtnText}>View History →</Text>
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
  title: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 16 },
  disclaimer: {
    backgroundColor: 'rgba(253,203,110,0.1)', borderRadius: 12,
    padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(253,203,110,0.2)',
  },
  disclaimerText: { fontSize: 12, color: 'rgba(253,203,110,0.8)', lineHeight: 18 },
  pathCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18,
    padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row', alignItems: 'center',
  },
  pathLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  pathIcon: { fontSize: 28, marginRight: 14, marginTop: 2 },
  pathInfo: { flex: 1 },
  pathTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  pathSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 18, marginBottom: 8 },
  pathBadge: {
    alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  pathBadgeText: { fontSize: 11, fontWeight: '700' },
  arrow: { fontSize: 22, color: 'rgba(255,255,255,0.3)', marginLeft: 8 },
  historyBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  historyBtnText: { fontSize: 14, color: '#A29BFE', fontWeight: '600' },
});
