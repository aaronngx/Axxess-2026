// src/features/eye/tracking/EsdHud.tsx
// Real-time face-to-phone distance HUD.
// Shows distance in cm, zone indicator, and a progress arc.
// Compact mode (compact=true) shows a single-line badge for use inside exam screens.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DistanceOutput } from './useDistanceMonitor';

interface Props {
  distance: DistanceOutput;
  /** If true, renders a compact single-row badge instead of the full card. */
  compact?: boolean;
}

const ZONE_COLOR: Record<string, string> = {
  too_close: '#FF6B6B',
  ok:        '#2ECC71',
  too_far:   '#A29BFE',
  no_face:   'rgba(255,255,255,0.25)',
};

const ZONE_LABEL: Record<string, string> = {
  too_close: '← Too close · move back',
  ok:        '✅ Good distance',
  too_far:   'Too far · move closer →',
  no_face:   'No face detected',
};

export const EsdHud: React.FC<Props> = ({
  distance,
  compact = false,
}) => {
  const { distance_cm, zone, face_detected } = distance;
  const color = ZONE_COLOR[zone];
  const label = ZONE_LABEL[zone];
  const distText = face_detected && distance_cm != null
    ? `${distance_cm} cm`
    : '—';

  if (compact) {
    return (
      <View style={[styles.compact, { borderColor: color + '60' }]}>
        <Text style={styles.compactIcon}>📏</Text>
        <Text style={[styles.compactDist, { color }]}>{distText}</Text>
        <Text style={[styles.compactLabel, { color: color + 'BB' }]}>
          {zone === 'ok' ? '✅' : zone === 'no_face' ? '?' : zone === 'too_close' ? '⬅' : '➡'}
        </Text>
      </View>
    );
  }

  // ── Full card ──
  // Distance bar: 20 cm = left edge, 70 cm = right edge, target zone = green band
  const BAR_MIN = 20;
  const BAR_MAX = 70;
  const targetMinPct = ((35 - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100; // 30%
  const targetMaxPct = ((50 - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100; // 60%
  const pointerPct = distance_cm != null
    ? Math.min(100, Math.max(0, ((distance_cm - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100))
    : null;

  return (
    <View style={[styles.card, { borderColor: color + '40' }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>📏 Distance</Text>
        <Text style={[styles.distValue, { color }]}>{distText}</Text>
      </View>

      {/* Zone label */}
      <Text style={[styles.zoneLabel, { color }]}>{label}</Text>

      {/* Distance bar */}
      <View style={styles.barBg}>
        {/* Green target zone */}
        <View
          style={[
            styles.barTarget,
            { left: `${targetMinPct}%`, width: `${targetMaxPct - targetMinPct}%` },
          ]}
        />
        {/* Current position pointer */}
        {pointerPct != null && (
          <View style={[styles.barPointer, { left: `${pointerPct}%`, backgroundColor: color }]} />
        )}
      </View>

      {/* Bar axis labels */}
      <View style={styles.barAxis}>
        <Text style={styles.axisLabel}>20 cm</Text>
        <Text style={[styles.axisLabel, styles.axisTarget]}>35–50 cm target</Text>
        <Text style={styles.axisLabel}>70 cm</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ── Full card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: 'rgba(10,10,26,0.9)',
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  distValue: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  zoneLabel: { fontSize: 12, fontWeight: '700', marginTop: 2, marginBottom: 10 },

  barBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4, overflow: 'visible', position: 'relative', marginBottom: 4,
  },
  barTarget: {
    position: 'absolute', top: 0, bottom: 0,
    backgroundColor: 'rgba(46,204,113,0.25)', borderRadius: 4,
  },
  barPointer: {
    position: 'absolute', top: -4, width: 4, height: 16,
    borderRadius: 2, marginLeft: -2,
  },
  barAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 9, color: 'rgba(255,255,255,0.25)' },
  axisTarget: { color: 'rgba(46,204,113,0.5)', fontWeight: '700' },

  // ── Compact badge ──────────────────────────────────────────────────────────
  compact: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(10,10,26,0.85)',
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  compactIcon:  { fontSize: 12 },
  compactDist:  { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  compactLabel: { fontSize: 14, fontWeight: '700' },

});
