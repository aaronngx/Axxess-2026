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
import { useAppContext } from '../context/AppContext';

type Tab = 'chat' | 'mood';

// Mood history is now handled by AppContext

const MOODS = [
  { value: 1, emoji: '😞', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Great' },
];

interface PendingAction {
  type: 'ADD_TASK' | 'REMOVE_TASK';
  data: any;
  messageId: string;
}

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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const {
    moodHistory,
    addMood,
    symptomLog,
    appointment,
    recoveryTasks,
    toggleRecoveryTask,
    addRecoveryTask,
    removeRecoveryTask,
    emergencyContacts
  } = useAppContext();

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
      vitals: {
        heartRate: health.heartRate,
        stepCount: health.stepCount,
        isAnomalous: health.isAnomalous
      },
      moodHistory,
      symptomLog,
      appointment,
      recoveryTasks,
      emergencyContacts
    });

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: aiText,
      isUser: false,
      timestamp: new Date(),
    };

    // Check for Action Tags with robust regex
    console.log('AI Response:', aiText);
    console.log('User Input:', text);

    const addTaskMatch = aiText.match(/\[\[\s*ADD_TASK\s*:\s*(.*?)\s*\]\]/i);
    const removeTaskMatch = aiText.match(/\[\[\s*REMOVE_TASK\s*:\s*(.*?)\s*\]\]/i);

    // Keyword detection — check BOTH user input AND AI response
    const lowerUserText = text.toLowerCase();
    const lowerAiText = aiText.toLowerCase();
    const userWantsAdd = lowerUserText.includes('add') && lowerUserText.includes('task');
    const userWantsDelete = (lowerUserText.includes('delete') || lowerUserText.includes('remove')) && lowerUserText.includes('task');
    const aiMentionsAdd = lowerAiText.includes('add') && lowerAiText.includes('task');
    const aiMentionsDelete = (lowerAiText.includes('delete') || lowerAiText.includes('remove')) && lowerAiText.includes('task');

    if (addTaskMatch || userWantsAdd || aiMentionsAdd) {
      let taskTitle = 'New Task';
      let taskDesc = 'Suggested by AI';
      let taskCategory = 'exercise';

      if (addTaskMatch) {
        const parts = addTaskMatch[1].split('|').map((p: string) => p.trim());
        taskTitle = parts[0] || taskTitle;
        taskDesc = parts[1] || taskDesc;
        taskCategory = (parts[2] || taskCategory).toLowerCase();
      } else {
        // Try to extract a task description from AI text
        const descPatterns = [
          /(?:add|suggest|recommend).*?(?:task|activity).*?(?:called |like |for |to )[""]?(.*?)[""]?(?:\.|,|!|\?|$)/i,
          /[""]([^""]+)[""]/,
        ];
        for (const pattern of descPatterns) {
          const m = aiText.match(pattern);
          if (m && m[1] && m[1].length > 3) {
            taskTitle = m[1].trim();
            break;
          }
        }
      }

      setPendingAction({
        type: 'ADD_TASK',
        messageId: aiMsg.id,
        data: { title: taskTitle, description: taskDesc, category: taskCategory }
      });
      console.log('Detected ADD_TASK:', taskTitle);
    } else if (removeTaskMatch || userWantsDelete || aiMentionsDelete) {
      let taskId = '';
      let title = 'Selected Task';

      if (removeTaskMatch) {
        taskId = removeTaskMatch[1].trim();
        const task = recoveryTasks.find(t => t.id === taskId);
        title = task?.title || 'Unknown Task';
      } else {
        // Try to find a task mentioned in either user or AI text
        const combinedText = (lowerUserText + ' ' + lowerAiText);
        const mentionedTask = recoveryTasks.find(t =>
          combinedText.includes(t.title.toLowerCase())
        );
        if (mentionedTask) {
          taskId = mentionedTask.id;
          title = mentionedTask.title;
        } else if (recoveryTasks.length > 0) {
          // If user said "delete task" but no specific match, show the first incomplete task
          const incompleteTask = recoveryTasks.find(t => !t.completed);
          if (incompleteTask) {
            taskId = incompleteTask.id;
            title = incompleteTask.title;
          }
        }
      }

      if (taskId) {
        setPendingAction({
          type: 'REMOVE_TASK',
          messageId: aiMsg.id,
          data: { id: taskId, title }
        });
        console.log('Detected REMOVE_TASK:', taskId, title);
      }
    }

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

  const handleAction = async (confirmed: boolean) => {
    if (!pendingAction) return;

    console.log('handleAction called, confirmed:', confirmed, 'action:', JSON.stringify(pendingAction));

    if (confirmed) {
      try {
        if (pendingAction.type === 'ADD_TASK') {
          // Sanitize category to valid values
          const validCategories = ['exercise', 'nutrition', 'mental', 'sleep'];
          const rawCategory = (pendingAction.data.category || 'exercise').toLowerCase().trim();
          const category = validCategories.includes(rawCategory) ? rawCategory : 'exercise';

          const taskData = {
            title: pendingAction.data.title || 'New Task',
            description: pendingAction.data.description || 'Suggested by AI',
            category: category as 'exercise' | 'nutrition' | 'mental' | 'sleep',
          };
          console.log('Adding recovery task:', JSON.stringify(taskData));
          await addRecoveryTask(taskData);
          console.log('Task added successfully!');
        } else if (pendingAction.type === 'REMOVE_TASK') {
          console.log('Removing recovery task:', pendingAction.data.id);
          await removeRecoveryTask(pendingAction.data.id);
          console.log('Task removed successfully!');
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error in handleAction:', error);
      }
    }

    setPendingAction(null);
  };

  const saveMood = () => {
    if (!selectedMood) return;

    const moodInfo = MOODS.find(m => m.value === selectedMood);

    addMood({
      emoji: moodInfo?.emoji || '😐',
      note: moodNote,
    });

    setMoodSaved(true);

    // Reset form
    setTimeout(() => {
      setMoodSaved(false);
      setSelectedMood(undefined);
      setMoodNote('');
    }, 1500);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#161925', '#FF758C', '#161925']} style={StyleSheet.absoluteFill} />

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
            <LinearGradient colors={['#FF758C', '#FF7EB3']} style={styles.callIconGradient}>
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
            renderItem={({ item }) => (
              <ChatBubble message={{
                ...item,
                text: item.text.replace(/\[\[.*?\]\]/g, '').trim()
              }} />
            )}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
          <View style={[styles.inputRow, { paddingBottom: insets.bottom + 110 }]}>
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
          contentContainerStyle={[styles.moodScroll, { paddingBottom: insets.bottom + 130 }]}
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
            <LinearGradient colors={['#FF758C', '#FF7EB3']} style={styles.saveBtnGradient}>
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

          {/* Mood History */}
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Recent Entries</Text>
            {moodHistory.map(entry => (
              <View key={entry.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyEmoji}>{entry.emoji}</Text>
                  <View>
                    <Text style={styles.historyDate}>
                      {new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Voice Call Interface */}
      {/* Top Pop-up Action Overlay */}
      {pendingAction && (
        <View style={[styles.topPopup, { top: insets.top + 10 }]}>
          <LinearGradient
            colors={pendingAction.type === 'ADD_TASK' ? ['#6C5CE7', '#4834D4'] : ['#FF4757', '#C0392B']}
            style={styles.popupGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.popupContent}>
              <View style={styles.popupTextContainer}>
                <Text style={styles.popupTitle}>
                  {pendingAction.type === 'ADD_TASK' ? '➕ Add the following task?' : '🗑️ Remove the following task?'}
                </Text>
                <Text style={styles.popupDesc} numberOfLines={2}>
                  {pendingAction.data.title}
                </Text>
              </View>
              <View style={styles.popupActions}>
                <TouchableOpacity
                  style={styles.popupBtnSmall}
                  onPress={() => handleAction(false)}
                >
                  <Text style={styles.popupBtnTextSmall}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.popupBtnSmall, styles.popupConfirmBtn]}
                  onPress={() => handleAction(true)}
                >
                  <Text style={[
                    styles.popupConfirmText,
                    pendingAction.type === 'REMOVE_TASK' && { color: '#FF4757' }
                  ]}>
                    {pendingAction.type === 'ADD_TASK' ? 'Accept' : 'Remove'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      <VoiceCallModal
        visible={isVoiceCallVisible}
        onClose={() => setIsVoiceCallVisible(false)}
        messages={messages}
        onNewMessage={(msg) => setMessages(prev => [...prev, msg])}
        currentVitals={{
          vitals: {
            heartRate: health.heartRate,
            stepCount: health.stepCount,
            isAnomalous: health.isAnomalous
          },
          moodHistory,
          symptomLog,
          appointment,
          recoveryTasks,
          emergencyContacts
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#161925' },
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
  activeTab: { backgroundColor: 'rgba(255, 117, 140, 0.4)' },
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
    backgroundColor: '#FF758C', alignItems: 'center', justifyContent: 'center',
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
  historyContainer: { marginTop: 24 },
  historyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  historyEmoji: { fontSize: 24, marginRight: 12 },
  historyDate: { fontSize: 13, color: '#FF758C', fontWeight: '600' },
  historyNote: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  actionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  actionEmoji: { fontSize: 24, marginRight: 12 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  actionDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginBottom: 16 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 44, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cancelBtnText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  confirmBtn: {},
  confirmBtnGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: '800' },
  topPopup: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  popupGradient: {
    padding: 16,
  },
  popupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  popupTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  popupDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  popupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  popupBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  popupConfirmBtn: {
    backgroundColor: '#FFF',
  },
  popupBtnTextSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  popupConfirmText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C5CE7',
  },
});
