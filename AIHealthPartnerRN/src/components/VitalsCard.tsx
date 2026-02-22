// VitalsCard.tsx — Fullscreen-friendly vitals tile
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  label: string;
  value: number | string;
  unit: string;
  icon: string;
  gradientColors: [string, string];
  isAnomalous?: boolean;
}

export const VitalsCard: React.FC<Props> = ({
  label, value, unit, icon, gradientColors, isAnomalous = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isAnomalous) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isAnomalous]);

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient colors={gradientColors} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {isAnomalous && <View style={styles.anomalyRing} />}
        <Text style={styles.icon}>{icon}</Text>
<<<<<<< HEAD
        <Text style={styles.value}>{value}</Text>
=======
        <Text
          style={styles.value}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.5}
        >
          {value}
        </Text>
>>>>>>> origin/frontend-UI-fixed
        <Text style={styles.unit}>{unit}</Text>
        <Text style={styles.label}>{label}</Text>
        {isAnomalous && <Text style={styles.alert}>⚠ Alert</Text>}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, margin: 8 },
  card: {
    borderRadius: 24,
<<<<<<< HEAD
    padding: 20,
=======
    padding: 16,
>>>>>>> origin/frontend-UI-fixed
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    overflow: 'hidden',
  },
  anomalyRing: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
<<<<<<< HEAD
    borderRadius: 24, borderWidth: 2, borderColor: '#FF4757',
  },
  icon: { fontSize: 32, marginBottom: 8 },
  value: { fontSize: 42, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  unit: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },
  label: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },
  alert: { fontSize: 12, color: '#FF4757', marginTop: 8, fontWeight: '700' },
=======
    borderRadius: 24, borderWidth: 2, borderColor: '#D33F49',
  },
  icon: { fontSize: 28, marginBottom: 4 },
  value: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textAlign: 'center',
    width: '100%',
  },
  unit: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  alert: { fontSize: 11, color: '#FFFFFF', marginTop: 8, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
>>>>>>> origin/frontend-UI-fixed
});
