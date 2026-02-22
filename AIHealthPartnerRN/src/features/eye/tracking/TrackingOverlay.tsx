// src/features/eye/tracking/TrackingOverlay.tsx
// Displays a compact status bar showing LOCKED / PAUSED state + instructions.
// Renders nothing (null) when LOCKED to stay out of the way.
// Optionally accepts centerOk / distanceOk for future VisionCamera integration.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrackingOutput } from './trackingEngine';

const REASON_MSG: Record<string, string> = {
  tilt:     'Hold phone more upright',
  shake:    'Hold phone steady',
  distance: 'Move phone to correct distance',
  center:   'Centre your face in the oval',
  unknown:  'Adjust phone position',
};

interface Props {
  tracking: TrackingOutput;
  /** Future: pass true when VisionCamera confirms face is centered */
  centerOk?: boolean;
  /** Future: pass true when VisionCamera confirms correct distance */
  distanceOk?: boolean;
}

export const TrackingOverlay: React.FC<Props> = ({ tracking, centerOk, distanceOk }) => {
  // Future gating: if centerOk or distanceOk is explicitly false, override to PAUSED
  const isLocked = tracking.state === 'LOCKED'
    && centerOk !== false
    && distanceOk !== false;

  if (isLocked) {
    return (
      <View style={[styles.bar, styles.barLocked]}>
        <Text style={styles.dotLocked}>●</Text>
        <Text style={styles.labelLocked}>LOCKED</Text>
      </View>
    );
  }

  const reason = tracking.reason
    ?? (centerOk === false ? 'center' : distanceOk === false ? 'distance' : 'unknown');
  const msg = REASON_MSG[reason] ?? REASON_MSG.unknown;

  return (
    <View style={[styles.bar, styles.barPaused]}>
      <Text style={styles.dotPaused}>●</Text>
      <Text style={styles.labelPaused}>PAUSED · {msg}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    marginBottom: 12, gap: 8,
  },
  barLocked: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.3)',
  },
  barPaused: {
    backgroundColor: 'rgba(255,71,87,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)',
  },
  dotLocked:  { fontSize: 10, color: '#2ECC71' },
  dotPaused:  { fontSize: 10, color: '#FF4757' },
  labelLocked: { fontSize: 12, color: '#2ECC71', fontWeight: '700', letterSpacing: 0.5 },
  labelPaused: { fontSize: 12, color: '#FF6B81', fontWeight: '700', flex: 1 },
});
