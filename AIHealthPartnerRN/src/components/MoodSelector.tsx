// MoodSelector.tsx — Emoji-based mood picker
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Great' },
];

interface Props {
  onSelect: (mood: number) => void;
  selected?: number;
}

export const MoodSelector: React.FC<Props> = ({ onSelect, selected }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How are you feeling?</Text>
      <View style={styles.row}>
        {MOODS.map(m => (
          <TouchableOpacity
            key={m.value}
            style={[styles.moodBtn, selected === m.value && styles.selectedBtn]}
            onPress={() => onSelect(m.value)}
            activeOpacity={0.75}
          >
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={[styles.moodLabel, selected === m.value && styles.selectedLabel]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 16, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: {
    alignItems: 'center', padding: 12, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)', flex: 1, marginHorizontal: 4,
  },
  selectedBtn: { backgroundColor: 'rgba(35, 87, 137, 0.4)', borderWidth: 2, borderColor: '#235789' },
  emoji: { fontSize: 28 },
  moodLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, fontWeight: '600' },
  selectedLabel: { color: '#42CAFD' },
});
