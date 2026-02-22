// VitalsDashboard.tsx — Fullscreen Vitals with live chart
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { useHealthData } from '../hooks/useHealthData';
import { VitalsCard } from '../components/VitalsCard';
import { AnomalyBanner } from '../components/AnomalyBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { eyeStorage } from '../features/eye/storage/eyeStorage';
import { hearingStorage } from '../features/hearing/storage/hearingStorage';

const { width } = Dimensions.get('window');

export const VitalsDashboard: React.FC = () => {
  const health = useHealthData();
  const [anomalyDismissed, setAnomalyDismissed] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const lastEyeSession = eyeStorage.getAllSessionsSync()[0] ?? null;
  const lastHearingSession = hearingStorage.getAllSessionsSync()[0] ?? null;

  const chartData = {
    labels: [],
    datasets: [{ data: health.heartRateHistory }],
  };

  const showAnomaly = health.isAnomalous && !anomalyDismissed;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0A1A', '#0D1B2A', '#0A0A1A']} style={StyleSheet.absoluteFill} />

      {showAnomaly && (
        <AnomalyBanner
          onDismiss={() => setAnomalyDismissed(true)}
          onCallEmergency={() => setAnomalyDismissed(true)}
        />
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning, Jerome 👋</Text>
            <Text style={styles.subtitle}>Here's your real-time health snapshot</Text>
          </View>
          {health.lastUpdated && (
            <Text style={styles.timestamp}>
              {health.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {/* Live indicator */}
        <View style={styles.liveRow}>
          <View style={[styles.liveDot, { backgroundColor: health.isAnomalous ? '#FF4757' : '#2ECC71' }]} />
          <Text style={styles.liveText}>{health.isLoading ? 'Connecting...' : 'Live · Streaming'}</Text>
        </View>

        {/* Vitals Cards */}
        <View style={styles.cardRow}>
          <VitalsCard
            label="Heart Rate"
            value={health.isLoading ? '--' : health.heartRate}
            unit="BPM"
            icon="❤️"
            gradientColors={health.isAnomalous ? ['#C0392B', '#922B21'] : ['#E55D87', '#5FC3E4']}
            isAnomalous={health.isAnomalous}
          />
          <VitalsCard
            label="Resp. Rate"
            value={health.isLoading ? '--' : health.respiratoryRate}
            unit="br/min"
            icon="🌬️"
            gradientColors={['#4776E6', '#8E54E9']}
          />
        </View>
        <View style={styles.cardRow}>
          <VitalsCard
            label="Blood Oxygen"
            value={health.isLoading ? '--' : `${health.oxygenSaturation}`}
            unit="%"
            icon="💧"
            gradientColors={['#1CD8D2', '#93EDC7']}
          />
          <VitalsCard
            label="Status"
            value={health.isAnomalous ? '⚠️' : '✓'}
            unit=""
            icon="🛡️"
            gradientColors={health.isAnomalous ? ['#C0392B', '#922B21'] : ['#11998e', '#38ef7d']}
          />
        </View>

        {/* Heart Rate Trend */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Heart Rate · Last 20 readings</Text>
          {health.heartRateHistory.length > 0 && (
            <LineChart
              data={chartData}
              width={width - 48}
              height={180}
              withDots={false}
              withInnerLines={false}
              withOuterLines={false}
              withHorizontalLabels={true}
              withVerticalLabels={false}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'transparent',
                backgroundGradientTo: 'transparent',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(229,93,135,${opacity})`,
                labelColor: () => 'rgba(255,255,255,0.4)',
                propsForBackgroundLines: { stroke: 'transparent' },
              }}
              bezier
              style={styles.chart}
            />
          )}
        </View>

        {/* Eye Vision Check card */}
        <TouchableOpacity
          style={styles.eyeCard}
          onPress={() => navigation.navigate('EyeSetupCamera')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['rgba(108,92,231,0.18)', 'rgba(162,155,254,0.08)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.eyeCardLeft}>
            <Text style={styles.eyeCardIcon}>👁</Text>
            <View>
              <Text style={styles.eyeCardTitle}>Eye Vision Check</Text>
              {lastEyeSession ? (
                <Text style={styles.eyeCardMeta}>
                  Last: {new Date(lastEyeSession.created_at).toLocaleDateString()} ·{' '}
                  <Text style={{ color: lastEyeSession.quality.quality_label === 'High' ? '#2ECC71' : '#FDCB6E' }}>
                    {lastEyeSession.quality.quality_label}
                  </Text>
                </Text>
              ) : (
                <Text style={styles.eyeCardMeta}>No previous runs</Text>
              )}
            </View>
          </View>
          <View style={styles.eyeStartBtn}>
            <Text style={styles.eyeStartBtnText}>Start →</Text>
          </View>
        </TouchableOpacity>

        {/* Hearing Check card */}
        <TouchableOpacity
          style={styles.eyeCard}
          onPress={() => navigation.navigate('HearingEntry')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['rgba(46,204,113,0.15)', 'rgba(39,174,96,0.06)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.eyeCardLeft}>
            <Text style={styles.eyeCardIcon}>👂</Text>
            <View>
              <Text style={styles.eyeCardTitle}>Hearing Check</Text>
              {lastHearingSession ? (
                <Text style={styles.eyeCardMeta}>
                  Last: {new Date(lastHearingSession.created_at).toLocaleDateString()} ·{' '}
                  {lastHearingSession.hearing_function_age != null
                    ? `${lastHearingSession.hearing_function_age} yr hearing age`
                    : lastHearingSession.confidence}
                </Text>
              ) : (
                <Text style={styles.eyeCardMeta}>No previous checks</Text>
              )}
            </View>
          </View>
          <View style={[styles.eyeStartBtn, { backgroundColor: '#27AE60' }]}>
            <Text style={styles.eyeStartBtnText}>Start →</Text>
          </View>
        </TouchableOpacity>

        {/* Health tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Today's Insight</Text>
            <Text style={styles.tipText}>
              Your resting heart rate this morning is within a healthy range. Consistent sleep before midnight contributes to better HRV scores.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  timestamp: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  liveText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  cardRow: { flexDirection: 'row', marginBottom: 0 },
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24, padding: 20, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chartTitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 12 },
  chart: { borderRadius: 16 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(108,92,231,0.12)', borderRadius: 20,
    padding: 18, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.25)',
  },
  tipIcon: { fontSize: 24, marginRight: 14 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#A29BFE', marginBottom: 4 },
  tipText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
  eyeCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 18, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.3)',
    overflow: 'hidden',
  },
  eyeCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  eyeCardIcon: { fontSize: 28, marginRight: 14 },
  eyeCardTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  eyeCardMeta: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  eyeStartBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  eyeStartBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
