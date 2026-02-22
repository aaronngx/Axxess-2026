// src/features/eye/tracking/DevStepOverlay.tsx
// Dev-only step breadcrumb shown as a yellow banner at the top of each exam screen.
// Renders nothing in production builds (__DEV__ === false).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  step: number;
  total: number;
  eye?: 'right' | 'left' | null;
  run?: 1 | 2 | null;
  routeName: string;
}

export const DevStepOverlay: React.FC<Props> = ({ step, total, eye, run, routeName }) => {
  if (!__DEV__) return null;
  return (
    <View style={styles.root} pointerEvents="none">
      <Text style={styles.text}>
        DEV · Step {step}/{total} · {routeName}
        {eye ? ` · ${eye}` : ''}
        {run  ? ` run${run}` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
    backgroundColor: 'rgba(255,200,0,0.90)',
    paddingVertical: 3, paddingHorizontal: 10,
  },
  text: { fontSize: 10, color: '#000000', fontWeight: '700', fontFamily: 'monospace' },
});

