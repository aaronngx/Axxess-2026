// src/features/hearing/screens/HearingHistory.tsx
// Persistent history from AsyncStorage with trend display.

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hearingStorage } from '../storage/hearingStorage';
import { HearingSessionResult } from '../models/types';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function confidenceColor(c: string): string {
  if (c === 'High') return '#2ECC71';
  if (c === 'Medium') return '#FDCB6E';
  return '#FF6B81';
}

function urgencyColor(u: string): string {
  if (u === 'urgent') return '#E74C3C';
  if (u === 'soon') return '#F39C12';
  return '#2ECC71';
}

function sourceLabel(s: string): string {
  if (s === 'apple') return 'Apple';
  if (s === 'speech_in_noise') return 'SIN';
  return 'Symptoms';
}

export const HearingHistory: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<HearingSessionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      hearingStorage.getAllSessions().then(s => {
        setSessions(s);
        setLoading(false);
      });
    }, []),
  );

  const handleClear = () => {
    Alert.alert(
      'Clear History',
      'This will delete all saved hearing sessions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All', style: 'destructive',
          onPress: async () => { await hearingStorage.clearAll(); setSessions([]); },
        },
      ],
    );
  };

  const renderItem = ({ item, index }: { item: HearingSessionResult; index: number }) => {
    const isLatest = index === 0;
    return (
      <View style={[styles.card, isLatest && styles.cardLatest]}>
        {isLatest && (
          <View style={styles.latestBadge}>
            <Text style={styles.latestBadgeText}>LATEST</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardDate}>{fmtDate(item.created_at)}</Text>
            <Text style={styles.cardTime}>{fmtTime(item.created_at)}</Text>
          </View>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>{sourceLabel(item.test_source)}</Text>
          </View>
        </View>

        {/* Hearing Age */}
        <View style={styles.ageRow}>
          {item.hearing_function_age != null ? (
            <>
              <Text style={styles.ageVal}>{item.hearing_function_age}</Text>
              <Text style={styles.ageLabel}> yrs hearing age</Text>
            </>
          ) : (
            <Text style={styles.ageInsuff}>Insufficient signal</Text>
          )}
          {item.percentile_vs_age_peers != null && (
            <Text style={styles.percentile}> · {item.percentile_vs_age_peers}th pct</Text>
          )}
        </View>

        {/* L/R dBHL */}
        {(item.left_dbhl != null || item.right_dbhl != null) && (
          <View style={styles.dbhlRow}>
            {item.left_dbhl != null && <Text style={styles.dbhlItem}>L: {item.left_dbhl} dBHL</Text>}
            {item.left_dbhl != null && item.right_dbhl != null && <Text style={styles.dbhlSep}>·</Text>}
            {item.right_dbhl != null && <Text style={styles.dbhlItem}>R: {item.right_dbhl} dBHL</Text>}
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { borderColor: confidenceColor(item.confidence) }]}>
            <Text style={[styles.badgeText, { color: confidenceColor(item.confidence) }]}>{item.confidence}</Text>
          </View>
          {item.urgency !== 'routine' && (
            <View style={[styles.badge, { borderColor: urgencyColor(item.urgency) }]}>
              <Text style={[styles.badgeText, { color: urgencyColor(item.urgency) }]}>
                {item.urgency === 'urgent' ? '🚨 Urgent' : '⚠ Follow up'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Hearing History</Text>
        {sessions.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.countLabel}>
        {loading ? 'Loading…' : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`}
      </Text>

      {!loading && sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👂</Text>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyDesc}>
            Complete a hearing check to see your history and track changes over time.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('HearingEntry')}>
            <Text style={styles.startBtnText}>Start Hearing Check →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={s => s.session_id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 4 },
  backBtn: { paddingRight: 12 },
  backBtnText: { fontSize: 15, color: '#A29BFE', fontWeight: '600' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  clearBtn: { paddingLeft: 12, paddingVertical: 4 },
  clearBtnText: { fontSize: 13, color: '#FF6B81', fontWeight: '600' },
  countLabel: { fontSize: 12, color: 'rgba(255,255,255,0.3)', paddingHorizontal: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  cardLatest: { borderColor: 'rgba(162,155,254,0.25)', backgroundColor: 'rgba(162,155,254,0.05)' },
  latestBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(162,155,254,0.2)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 10,
  },
  latestBadgeText: { fontSize: 10, color: '#A29BFE', fontWeight: '800', letterSpacing: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  cardDate: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
  cardTime: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  sourceBadge: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  sourceBadgeText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  ageRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  ageVal: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  ageLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  ageInsuff: { fontSize: 14, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' },
  percentile: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  dbhlRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dbhlItem: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  dbhlSep: { fontSize: 12, color: 'rgba(255,255,255,0.2)', marginHorizontal: 6 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  startBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 16 },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
