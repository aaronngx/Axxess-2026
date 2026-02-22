import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Animated, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { getAIResponse, transcribeAudio, generateElevenLabsSpeech, ChatMessage } from '../services/AIService';

interface VoiceCallModalProps {
    visible: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onNewMessage: (msg: ChatMessage) => void;
    currentVitals: any;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
    visible, onClose, messages, onNewMessage, currentVitals
}) => {
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const [preferredVoice, setPreferredVoice] = useState<string | undefined>();
    const [volume, setVolume] = useState(0);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [debugText, setDebugText] = useState('');
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const isActiveRef = useRef(true);

    useEffect(() => {
        isActiveRef.current = visible;

        // Find best voice
        const setupVoice = async () => {
            try {
                // @ts-ignore
                if (Speech.getVoicesAsync) {
                    // @ts-ignore
                    const voices = await Speech.getVoicesAsync();
                    // Look for high quality English female voices
                    // Preferred order: Siri, Samantha, or any en-us female
                    const bestVoice = voices.find((v: any) => v.name.includes('Siri') && v.language.includes('en-US')) ||
                        voices.find((v: any) => v.name.includes('Samantha') && v.language.includes('en-US')) ||
                        voices.find((v: any) => v.language.includes('en-US') && v.quality === 'Enhanced') ||
                        voices.find((v: any) => v.language.includes('en-US'));

                    if (bestVoice) setPreferredVoice(bestVoice.identifier);
                }
            } catch (e) {
                console.warn('Speech voices error:', e);
            }
        };

        setupVoice();

        // Initial audio mode setup
        const initAudio = async () => {
            try {
                await Audio.requestPermissionsAsync();
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                    interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
                    shouldDuckAndroid: true,
                    interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
                    playThroughEarpieceAndroid: false,
                });
            } catch (e) {
                console.warn('Audio init error:', e);
            }
        };

        if (visible) {
            initAudio();
            startPulse();
            if (messages.length <= 1) {
                speakResponse("Hi! I'm your AI Health Partner. I'm listening, how are you feeling?");
            } else {
                startListening(); // Start listening immediately when call starts
            }
        } else {
            stopAll();
        }
        return () => { isActiveRef.current = false; };
    }, [visible]);

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    };

    const stopAll = async () => {
        if (recordingRef.current) {
            try {
                await recordingRef.current.stopAndUnloadAsync();
            } catch (e) { }
            recordingRef.current = null;
            setRecording(null);
        }
        if (soundRef.current) {
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch (e) { }
            soundRef.current = null;
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        Speech.stop();
        setStatus('idle');
    };

    const toggleSpeaker = async () => {
        const nextState = !isSpeakerOn;
        setIsSpeakerOn(nextState);
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true, // Always true to hear AI in silent mode
                staysActiveInBackground: true,
                interruptionModeIOS: 1, // DoNotMix
                shouldDuckAndroid: true,
                interruptionModeAndroid: 1,
                playThroughEarpieceAndroid: !nextState, // Force loudspeaker if On
            });
            // Haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
            console.error("Failed to toggle speaker:", e);
        }
    };

    const startListening = async () => {
        if (!isActiveRef.current) return;
        try {
            Speech.stop();

            // 1. Unload any existing recording first
            if (recordingRef.current) {
                try {
                    await recordingRef.current.stopAndUnloadAsync();
                } catch (e) { }
                recordingRef.current = null;
                setRecording(null);
            }

            const { status: permStatus } = await Audio.requestPermissionsAsync();
            if (permStatus !== 'granted') {
                Alert.alert("Permission Denied", "Microphone access is required for voice calls. Please enable it in Settings.");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
                shouldDuckAndroid: true,
                interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
                playThroughEarpieceAndroid: !isSpeakerOn
            });

            // Give iOS a moment to switch audio sessions
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Create and prepare recording
            const newRecording = new Audio.Recording();
            setDebugText('Preparing microphone...');

            await newRecording.prepareToRecordAsync({
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                isMeteringEnabled: true,
            });

            newRecording.setOnRecordingStatusUpdate((status) => {
                if (status.canRecord && status.isRecording && status.metering !== undefined) {
                    const normalizedVolume = Math.min(1, Math.max(0, (status.metering + 60) / 60));
                    setVolume(normalizedVolume);

                    if (normalizedVolume < 0.1) {
                        if (!silenceTimerRef.current) {
                            silenceTimerRef.current = setTimeout(() => {
                                stopListeningAndProcess();
                            }, 3000);
                        }
                    } else {
                        if (silenceTimerRef.current) {
                            clearTimeout(silenceTimerRef.current);
                            silenceTimerRef.current = null;
                        }
                    }
                }
            });

            // 3. Start recording
            await newRecording.startAsync();

            setRecording(newRecording);
            recordingRef.current = newRecording;
            setStatus('listening');
            setDebugText('I am listening...');
        } catch (err) {
            console.error('Failed to start recording', err);
            setStatus('idle');
            setDebugText('Mic Error');
            Alert.alert("Mic Error", "Could not start microphone. Ensure Mac Input settings allow microphone access if on a simulator.");
        }
    };

    const stopListeningAndProcess = async () => {
        const currentRec = recordingRef.current;
        if (!currentRec) return;

        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        setStatus('processing');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            await currentRec.stopAndUnloadAsync();
        } catch (e) {
            console.error('Stop error:', e);
        }

        const uri = currentRec.getURI();
        recordingRef.current = null;
        setRecording(null);

        if (uri) {
            setDebugText('Transcribing your voice...');
            const transcript = await transcribeAudio(uri);
            if (transcript) {
                setDebugText(`You said: "${transcript.substring(0, 40)}${transcript.length > 40 ? '...' : ''}"`);
                const userMsg: ChatMessage = {
                    id: Date.now().toString(),
                    text: transcript,
                    isUser: true,
                    timestamp: new Date(),
                };
                onNewMessage(userMsg);

                setDebugText('AI is thinking...');
                const aiText = await getAIResponse([...messages, userMsg], currentVitals);
                setDebugText('AI is responding...');

                const aiMsg: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    text: aiText,
                    isUser: false,
                    timestamp: new Date(),
                };
                onNewMessage(aiMsg);
                speakResponse(aiText);
            } else {
                setStatus('idle');
                setDebugText('Failed to hear you.');
                if (isActiveRef.current) {
                    Alert.alert("Listening Error", "I couldn't hear that. Check your Groq API key for transcription.");
                }
            }
        }
    };

    const speakResponse = async (text: string) => {
        if (!isActiveRef.current) return;
        setStatus('speaking');
        setVolume(0);
        setDebugText('AI is speaking...');

        // Try ElevenLabs first
        const neuralAudioUri = await generateElevenLabsSpeech(text);

        if (neuralAudioUri) {
            try {
                // If there's an existing sound, unload it
                if (soundRef.current) {
                    await soundRef.current.unloadAsync();
                }

                const { sound } = await Audio.Sound.createAsync(
                    { uri: neuralAudioUri },
                    { shouldPlay: true }
                );

                soundRef.current = sound;

                sound.setOnPlaybackStatusUpdate((playbackStatus) => {
                    if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
                        setDebugText('I am listening...');
                        if (isActiveRef.current) startListening();
                    }
                });

                return; // Exit if ElevenLabs succeeded
            } catch (error) {
                console.error('ElevenLabs playback error:', error);
            }
        }

        // Fallback to robotic voice if ElevenLabs fails or has no key
        Speech.speak(text, {
            voice: preferredVoice,
            pitch: 1.05,
            rate: 0.98,
            onDone: () => {
                setDebugText('I am listening...');
                if (isActiveRef.current) startListening();
            },
            onError: (e) => {
                console.error('Speech error:', e);
                setDebugText('Speech error.');
                setStatus('idle');
            },
        });
    };

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
                <LinearGradient colors={['rgba(26,26,46,0.8)', 'rgba(15,15,30,0.9)']} style={styles.content}>

                    <View style={styles.header}>
                        <Text style={styles.aiName}>AI Health Partner</Text>
                        <Text style={styles.statusText}>
                            {status === 'idle' && 'Ready to chat'}
                            {status === 'listening' && 'Listening...'}
                            {status === 'processing' && 'Thinking...'}
                            {status === 'speaking' && 'Speaking...'}
                        </Text>
                        {debugText ? <Text style={styles.debugText}>{debugText}</Text> : null}
                    </View>

                    <View style={styles.visualizerContainer}>
                        <Animated.View style={[
                            styles.pulseCircle,
                            {
                                transform: [{ scale: pulseAnim }],
                                opacity: status === 'listening' ? 1 : 0.5,
                                borderColor: status === 'listening' ? `rgba(108,92,231,${0.2 + volume})` : 'transparent',
                                borderWidth: status === 'listening' ? 15 * volume : 0
                            }
                        ]}>
                            <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.innerCircle}>
                                {status === 'processing' ? (
                                    <ActivityIndicator color="#FFF" size="large" />
                                ) : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={styles.icon}>{status === 'speaking' ? '🔊' : '🤖'}</Text>
                                        {status === 'listening' && (
                                            <Text style={styles.volText}>{Math.round(volume * 100)}%</Text>
                                        )}
                                    </View>
                                )}
                            </LinearGradient>
                        </Animated.View>
                    </View>

                    <View style={styles.controls}>
                        {status === 'listening' && (
                            <TouchableOpacity style={styles.doneBtn} onPress={stopListeningAndProcess}>
                                <LinearGradient colors={['#4CD137', '#44BD32']} style={styles.doneBtnGradient}>
                                    <Text style={styles.doneBtnText}>Finish Speaking</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        <View style={styles.secondaryControls}>
                            <TouchableOpacity
                                style={[styles.controlCircle, isSpeakerOn && styles.activeControl]}
                                onPress={toggleSpeaker}
                            >
                                <Text style={styles.controlIcon}>{isSpeakerOn ? '🔊' : '🔈'}</Text>
                                <Text style={styles.controlLabel}>Speaker</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statusBadge}>
                            <View style={[styles.statusDot, { backgroundColor: status === 'listening' ? '#4CD137' : '#FF4757' }]} />
                            <Text style={styles.statusBadgeText}>
                                {status === 'listening' ? 'LIVE LISTENING' : 'ALEXA MODE'}
                            </Text>
                        </View>

                        <Text style={styles.hintText}>
                            {status === 'listening' ? 'Speak now, then pause for 3s or tap Finish' : 'Wait for AI to finish...'}
                        </Text>

                        <TouchableOpacity style={styles.endBtn} onPress={onClose}>
                            <Text style={styles.endBtnText}>End Call</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 80 },
    header: { alignItems: 'center', paddingHorizontal: 20 },
    aiName: { fontSize: 28, fontWeight: '800', color: '#FFF' },
    statusText: { fontSize: 16, color: '#A29BFE', marginTop: 10, fontWeight: '600', letterSpacing: 1 },
    debugText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
    visualizerContainer: { flex: 1, justifyContent: 'center' },
    pulseCircle: { width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(108,92,231,0.2)', padding: 15 },
    innerCircle: { flex: 1, borderRadius: 90, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
    icon: { fontSize: 60 },
    volText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '800', marginTop: 4 },
    dbText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', marginTop: 5 },
    controls: { alignItems: 'center', width: '100%', paddingHorizontal: 40 },
    doneBtn: { width: '80%', height: 60, borderRadius: 30, overflow: 'hidden', marginBottom: 20, elevation: 5, shadowColor: '#4CD137', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    doneBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    doneBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    hintText: { color: 'rgba(255,255,255,0.4)', marginTop: 10, fontSize: 14, fontWeight: '500' },
    endBtn: { marginTop: 40, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, backgroundColor: 'rgba(255,71,87,0.15)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)' },
    endBtnText: { color: '#FF4757', fontSize: 17, fontWeight: '700' },
    secondaryControls: { flexDirection: 'row', justifyContent: 'center', marginBottom: 25, width: '100%' },
    controlCircle: { alignItems: 'center', justifyContent: 'center', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    activeControl: { backgroundColor: 'rgba(108,92,231,0.3)', borderColor: '#6C5CE7' },
    controlIcon: { fontSize: 24, marginBottom: 2 },
    controlLabel: { color: '#FFF', fontSize: 10, fontWeight: '700', opacity: 0.8 },
});
