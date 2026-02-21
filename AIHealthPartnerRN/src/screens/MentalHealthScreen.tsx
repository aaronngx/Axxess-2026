// MentalHealthScreen.tsx — AI Chat + Mood Journal (fullscreen)
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, FlatList, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { getMockChatHistory } from '../services/MockDataService';
import { MoodSelector } from '../components/MoodSelector';
import { ChatBubble } from '../components/ChatBubble';
import { useHealthData } from '../hooks/useHealthData';
import { getAIResponse, transcribeAudio, ChatMessage } from '../services/AIService';
import { VoiceCallModal } from '../components/VoiceCallModal';

type Tab = 'chat' | 'mood';

export const MentalHealthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const health = useHealthData();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(getMockChatHistory());
  const [inputText, setInputText] = useState('');
  const [selectedMood, setSelectedMood] = useState<number | undefined>();
  const [moodNote, setMoodNote] = useState('');
  const [moodSaved, setMoodSaved] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceCallVisible, setIsVoiceCallVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async (textOverride?: string) => {
    const text = textOverride || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: text,
      isUser: true,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    // Call real LLM API with full conversation context (JSON)
    const aiText = await getAIResponse(newMessages, {
      heartRate: health.heartRate,
      stepCount: health.stepCount,
      isAnomalous: health.isAnomalous
    });

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: aiText,
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);

    // Voice feedback
    Speech.speak(aiText, {
      pitch: 1.1,
      rate: 1.0,
    });

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setRecording(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      setIsTyping(true); // Show loader for transcription
      const transcript = await transcribeAudio(uri);
      if (transcript) {
        sendMessage(transcript);
      } else {
        setIsTyping(false);
      }
    }
  };

  const saveMood = () => {
    if (!selectedMood) return;
    setMoodSaved(true);
    setTimeout(() => setMoodSaved(false), 2000);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0A1A', '#130D2E', '#0A0A1A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Mental Wellness</Text>
            <Text style={styles.headerSub}>Your AI companion is here for you</Text>
          </View>
          <TouchableOpacity
            style={styles.callIconButton}
            onPress={() => setIsVoiceCallVisible(true)}
          >
            <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.callIconGradient}>
              <Text style={styles.callIconEmoji}>📞</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['chat', 'mood'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'chat' ? '💬 AI Chat' : '📔 Mood Journal'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
          <View style={[styles.inputRow, { paddingBottom: insets.bottom + 90 }]}>
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Text style={styles.micIcon}>{isRecording ? '⏺' : '🎤'}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isRecording ? "Listening..." : "Share how you're feeling..."}
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              maxLength={400}
            />

            <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()} disabled={!inputText.trim() || isTyping}>
              {isTyping ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.sendIcon}>➤</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mood Tab */}
      {activeTab === 'mood' && (
        <ScrollView
          contentContainerStyle={[styles.moodScroll, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
        >
          <MoodSelector onSelect={setSelectedMood} selected={selectedMood} />

          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Add a note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              value={moodNote}
              onChangeText={setMoodNote}
              placeholder="What's on your mind today?"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={4}
              maxLength={300}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !selectedMood && styles.saveBtnDisabled]}
            onPress={saveMood}
            disabled={!selectedMood}
          >
            <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.saveBtnGradient}>
              <Text style={styles.saveBtnText}>{moodSaved ? '✓ Saved!' : 'Save Entry'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Mood history hint */}
          <View style={styles.streakCard}>
            <Text style={styles.streakIcon}>🔥</Text>
            <View>
              <Text style={styles.streakTitle}>3-Day Streak</Text>
              <Text style={styles.streakSub}>Keep logging daily for personalized insights</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Voice Call Interface */}
      <VoiceCallModal
        visible={isVoiceCallVisible}
        onClose={() => setIsVoiceCallVisible(false)}
        messages={messages}
        onNewMessage={(msg) => setMessages(prev => [...prev, msg])}
        currentVitals={{
          heartRate: health.heartRate,
          stepCount: health.stepCount,
          isAnomalous: health.isAnomalous
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  callIconButton: { borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  callIconGradient: { padding: 12, alignItems: 'center', justifyContent: 'center' },
  callIconEmoji: { fontSize: 22 },
  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  activeTab: { backgroundColor: 'rgba(108,92,231,0.6)' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  activeTabText: { color: '#FFFFFF' },
  chatContainer: { flex: 1 },
  chatList: { paddingHorizontal: 16, paddingVertical: 8 },
  inputRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'flex-end',
  },
  textInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 12, color: '#FFFFFF',
    fontSize: 15, maxHeight: 100, marginHorizontal: 8,
  },
  micBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: '#FF4757',
    transform: [{ scale: 1.1 }],
  },
  micIcon: { fontSize: 22 },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: '#FFFFFF', fontSize: 18, marginLeft: 2 },
  moodScroll: { paddingHorizontal: 20, paddingTop: 8 },
  noteContainer: { marginTop: 8 },
  noteLabel: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    padding: 16, color: '#FFFFFF', fontSize: 15, minHeight: 100, textAlignVertical: 'top',
  },
  saveBtn: { marginTop: 20, borderRadius: 20, overflow: 'hidden' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  streakCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,165,0,0.1)', borderRadius: 18,
    padding: 18, marginTop: 20, gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,165,0,0.2)',
  },
  streakIcon: { fontSize: 32 },
  streakTitle: { fontSize: 16, fontWeight: '700', color: '#FFA500' },
  streakSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
});
