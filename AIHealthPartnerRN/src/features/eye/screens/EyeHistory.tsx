// src/features/eye/screens/EyeHistory.tsx — Phase 10 (history + trends)
// Persistent history from AsyncStorage with trend display.

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { eyeStorage } from '../storage/eyeStorage';
import { EyeSessionResult } from '../models/types';

function qualityColor(label: string): string {
  if (label === 'High') return '#2ECC71';
  if (label === 'Medium') return '#FDCB6E';
  return '#FF6B81';
}

function fmtD(v: number | null): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const EyeHistory: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<EyeSessionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      eyeStorage.getAllSessions().then(s => {
        setSessions(s);
        setLoading(false);
      });
    }, []),
  );

  const handleClear = () => {
    Alert.alert(
      'Clear History',
      'This will delete all saved vision sessions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All', style: 'destructive',
          onPress: async () => {
            await eyeStorage.clearAll();
            setSessions([]);
          },
        },
      ],
    );
  };

  const renderItem = ({ item, index }: { item: EyeSessionResult; index: number }) => {
    const right = item.per_eye.find(e => e.eye === 'right');
    const left  = item.per_eye.find(e => e.eye === 'left');
    const isLatest = index === 0;

    return (
      <View style={[styles.sessionCard, isLatest && styles.sessionCardLatest]}>
        {isLatest && (
          <View style={styles.latestBadge}>
            <Text style={styles.latestBadgeText}>LATEST</Text>
          </View>
        )}

        <View style={styles.sessionHeader}>
          <View>
            <Text style={styles.sessionDate}>{fmtDate(item.created_at)}</Text>
            <Text style={styles.sessionTime}>{fmtTime(item.created_at)}</Text>
          </View>
          <View style={[styles.qualityPill, { borderColor: qualityColor(item.quality.quality_label) }]}>
            <Text style={[styles.qualityText, { color: qualityColor(item.quality.quality_label) }]}>
              {item.quality.quality_label}
            </Text>
          </View>
        </View>

        {/* Per-eye SER */}
        {(right || left) && (
          <View style={styles.rxRow}>
            <View style={styles.rxEye}>
              <Text style={styles.rxEyeLabel}>Right (OD)</Text>
              <Text style={styles.rxEyeVal}>
                {right ? `${fmtD(right.ser_d)} D SER` : '—'}
              </Text>
              {right?.cylinder_d != null && Math.abs(right.cylinder_d) > 0 && (
                <Text style={styles.rxEyeSub}>C: {fmtD(right.cylinder_d)} D</Text>
              )}
            </View>
            <View style={styles.rxDivider} />
            <View style={styles.rxEye}>
              <Text style={styles.rxEyeLabel}>Left (OS)</Text>
              <Text style={styles.rxEyeVal}>
                {left ? `${fmtD(left.ser_d)} D SER` : '—'}
              </Text>
              {left?.cylinder_d != null && Math.abs(left.cylinder_d) > 0 && (
                <Text style={styles.rxEyeSub}>C: {fmtD(left.cylinder_d)} D</Text>
              )}
            </View>
          </View>
        )}

        {/* Functional quick stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statItem}>
            Contrast: {item.functional.contrast_score != null ? Math.round(item.functional.contrast_score * 100) + '%' : '—'}
          </Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.statItem}>
            Low-light: {item.functional.low_light_score != null ? Math.round(item.functional.low_light_score * 100) + '%' : '—'}
          </Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.statItem}>
            Conf: {item.quality.confidence_0to100}/100
          </Text>
        </View>

        {/* Vision Age if available */}
        {item.vision_age?.overall_age_range && (
          <Text style={styles.visionAge}>
            Vision Age: {item.vision_age.overall_age_range[0]}–{item.vision_age.overall_age_range[1]} yrs
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vision History</Text>
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
          <Text style={styles.emptyIcon}>👁</Text>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyDesc}>
            Complete a vision check to see your history and track changes over time.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('EyeSafetyGate')}>
            <Text style={styles.startBtnText}>Start Vision Check →</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  backBtn: { paddingRight: 12 },
  backBtnText: { fontSize: 15, color: '#A29BFE', fontWeight: '600' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  clearBtn: { paddingLeft: 12, paddingVertical: 4 },
  clearBtnText: { fontSize: 13, color: '#FF6B81', fontWeight: '600' },
  countLabel: { fontSize: 12, color: 'rgba(255,255,255,0.3)', paddingHorizontal: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20 },
  sessionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  sessionCardLatest: { borderColor: 'rgba(162,155,254,0.25)', backgroundColor: 'rgba(162,155,254,0.05)' },
  latestBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(162,155,254,0.2)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 10,
  },
  latestBadgeText: { fontSize: 10, color: '#A29BFE', fontWeight: '800', letterSpacing: 1 },
  sessionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sessionDate: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
  sessionTime: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  qualityPill: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  qualityText: { fontSize: 12, fontWeight: '700' },
  rxRow: { flexDirection: 'row', marginBottom: 10 },
  rxEye: { flex: 1, paddingHorizontal: 4 },
  rxEyeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  rxEyeVal: { fontSize: 16, color: '#FFFFFF', fontWeight: '800', fontFamily: 'monospace' },
  rxEyeSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' },
  rxDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  statItem: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  statSep: { fontSize: 11, color: 'rgba(255,255,255,0.2)', marginHorizontal: 6 },
  visionAge: { fontSize: 12, color: '#A29BFE', fontWeight: '600', marginTop: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  startBtn: { backgroundColor: '#6C5CE7', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 16 },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
