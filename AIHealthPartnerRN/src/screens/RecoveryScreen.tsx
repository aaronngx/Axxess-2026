// RecoveryScreen.tsx — Recovery plan & task tracker (fullscreen)
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMockRecoveryTasks, RecoveryTask } from '../services/MockDataService';

const CATEGORY_COLORS: Record<RecoveryTask['category'], [string, string]> = {
  exercise: ['#F7971E', '#FFD200'],
  nutrition: ['#56AB2F', '#A8E063'],
  mental: ['#8E54E9', '#4776E6'],
  sleep: ['#1A1A2E', '#4776E6'],
};

const CATEGORY_ICONS: Record<RecoveryTask['category'], string> = {
  exercise: '🏃',
  nutrition: '🥗',
  mental: '🧘',
  sleep: '😴',
};

export const RecoveryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<RecoveryTask[]>(getMockRecoveryTasks());

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completed = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? completed / tasks.length : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0A1A', '#0D1F1A', '#0A0A1A']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Recovery Plan</Text>
        <Text style={styles.subtitle}>Your personalized daily tasks</Text>

        {/* Progress ring card */}
        <LinearGradient colors={['rgba(46,204,113,0.15)', 'rgba(46,204,113,0.05)']} style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressTextBlock}>
              <Text style={styles.progressBig}>{completed}/{tasks.length}</Text>
              <Text style={styles.progressLabel}>Tasks complete</Text>
            </View>
            <View style={styles.progressBarWrap}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>
          {progress === 1 && (
            <Text style={styles.congratsText}>🎉 All tasks complete! Great work today.</Text>
          )}
        </LinearGradient>

        {/* Medical summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📋 Your Recovery Summary</Text>
          <Text style={styles.summaryText}>
            Based on your recent vitals and activity, you're in the early phase of cardiovascular recovery. Focus on consistent light movement, hydration, and maintaining a regular sleep schedule. Avoid high-intensity exercise for the next 5 days.
          </Text>
        </View>

        {/* Tasks */}
        <Text style={styles.sectionTitle}>Today's Tasks</Text>
        {tasks.map(task => (
          <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => toggleTask(task.id)} activeOpacity={0.8}>
            <LinearGradient
              colors={task.completed ? ['rgba(46,204,113,0.12)', 'rgba(46,204,113,0.06)'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.taskGradient}
            >
              <View style={styles.taskLeft}>
                <Text style={styles.taskIcon}>{CATEGORY_ICONS[task.category]}</Text>
                <View style={styles.taskText}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>{task.title}</Text>
                  <Text style={styles.taskDesc}>{task.description}</Text>
                </View>
              </View>
              <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
                {task.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 4, marginBottom: 20 },
  progressCard: {
    borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)', marginBottom: 16,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTextBlock: {},
  progressBig: { fontSize: 42, fontWeight: '800', color: '#2ECC71' },
  progressLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  progressBarWrap: { flex: 1, marginLeft: 20 },
  progressBarTrack: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: { height: 8, backgroundColor: '#2ECC71', borderRadius: 4 },
  progressPct: { fontSize: 13, color: '#2ECC71', fontWeight: '700', marginTop: 6, textAlign: 'right' },
  congratsText: { fontSize: 14, color: '#2ECC71', marginTop: 12, fontWeight: '600', textAlign: 'center' },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 20,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  summaryText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  taskCard: { marginBottom: 12, borderRadius: 20, overflow: 'hidden' },
  taskGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18,
  },
  taskLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  taskIcon: { fontSize: 28, marginRight: 14 },
  taskText: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  taskTitleDone: { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.4)' },
  taskDesc: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 3 },
  checkbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#2ECC71', borderColor: '#2ECC71' },
  checkmark: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});
