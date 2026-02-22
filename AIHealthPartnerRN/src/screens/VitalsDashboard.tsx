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

const { width } = Dimensions.get('window');

export const VitalsDashboard: React.FC = () => {
  const health = useHealthData();
  const [anomalyDismissed, setAnomalyDismissed] = useState(false);
  const insets = useSafeAreaInsets();

  const chartData = {
    labels: [],
    datasets: [{ data: health.heartRateHistory }],
  };

  const showAnomaly = health.isAnomalous && !anomalyDismissed;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#161925', '#235789', '#161925']} style={StyleSheet.absoluteFill} />

      {showAnomaly && (
        <AnomalyBanner
          onDismiss={() => setAnomalyDismissed(true)}
          onCallEmergency={() => setAnomalyDismissed(true)}
        />
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 80 }]}
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
            gradientColors={health.isAnomalous ? ['#D33F49', '#7f0000'] : ['#235789', '#42CAFD']}
            isAnomalous={health.isAnomalous}
          />
          <VitalsCard
            label="Resp. Rate"
            value={health.isLoading ? '--' : health.respiratoryRate}
            unit="br/min"
            icon="🌬️"
            gradientColors={['#235789', '#42CAFD']}
          />
        </View>
        <View style={styles.cardRow}>
          <VitalsCard
            label="Blood Oxygen"
            value={health.isLoading ? '--' : `${health.oxygenSaturation}`}
            unit="%"
            icon="💧"
            gradientColors={['#42CAFD', '#DBCFB0']}
          />
          <VitalsCard
            label="Status"
            value={health.isAnomalous ? '⚠️' : '✓'}
            unit=""
            icon="🛡️"
            gradientColors={health.isAnomalous ? ['#D33F49', '#7f0000'] : ['#235789', '#42CAFD']}
          />
        </View>

        {/* Heart Rate Trend */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Heart Rate · Last 20 readings</Text>
          {health.heartRateHistory.length > 0 && (
            <LineChart
              data={chartData}
              width={width - 88}
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
                backgroundGradientFromOpacity: 0,
                backgroundGradientToOpacity: 0,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(66, 202, 253, ${opacity})`,
                labelColor: () => 'rgba(255,255,255,0.4)',
                propsForBackgroundLines: { stroke: 'transparent' },
              }}
              bezier
              style={styles.chart}
            />
          )}
        </View>

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
  root: { flex: 1, backgroundColor: '#161925' },
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
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#DBCFB0', marginBottom: 4 },
  tipText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
});
