// AnomalyBanner.tsx — Fullscreen alert overlay
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  onDismiss: () => void;
  onCallEmergency: () => void;
}

export const AnomalyBanner: React.FC<Props> = ({ onDismiss, onCallEmergency }) => {
  const slideAnim = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80 }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient colors={['#FF4757', '#C0392B']} style={styles.banner}>
        <Text style={styles.title}>⚠️  Anomaly Detected</Text>
        <Text style={styles.subtitle}>Your heart rate is outside normal range. Would you like to contact emergency services?</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>I'm Fine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emergencyBtn} onPress={onCallEmergency}>
            <Text style={styles.emergencyText}>🆘 Alert Contact</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  banner: { padding: 20, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  dismissBtn: {
    flex: 1, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center',
  },
  dismissText: { color: '#FFFFFF', fontWeight: '700' },
  emergencyBtn: {
    flex: 1, padding: 14, borderRadius: 14,
    backgroundColor: '#FFFFFF', alignItems: 'center',
  },
  emergencyText: { color: '#C0392B', fontWeight: '800' },
});
