// Service for interacting with Groq for LLM and Transcription
import * as FileSystem from 'expo-file-system';

const GROQ_API_KEY = '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';
const ELEVENLABS_API_KEY = 'sk_eabcea9335c8b2721b637f42f14d777e84068a8a301e672f'; // ADDED YOUR KEY
const ELEVENLABS_VOICE_ID = 'hpp4J3VqNfWAUOO0d1Us'; // Bella - female voice
const LLM_URL = 'https://api.groq.com/openai/v1/chat/completions';
const STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

export const getAIResponse = async (messages: ChatMessage[], currentVitals?: any) => {
    if (!GROQ_API_KEY) {
        return "Please add your Groq API key in AIService.ts";
    }

    try {
        const systemPrompt = `
      You are an empathetic AI Health Partner for an iPhone app. 
      You help users manage their physical and mental well-being.
      Current User Vitals: ${JSON.stringify(currentVitals || 'Unknown')}.
      Keep your responses supportive, medical-sounding but patient-friendly, and proactive.
      If vitals look abnormal, suggest a check-in or calm breathing.
      Your responses should be relatively concise for mobile display.
    `;

        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-10).map(m => ({
                role: m.isUser ? 'user' : 'assistant',
                content: m.text
            }))
        ];

        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages: apiMessages,
                temperature: 0.7,
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error('Groq Error:', data.error);
            return "AI partner is temporarily unavailable. Please try again later.";
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error('AI Service Error:', error);
        return "I'm having trouble connecting to my brain right now. Please try again in a moment.";
    }
};

export const transcribeAudio = async (uri: string) => {
    if (!GROQ_API_KEY) return null;

    console.log('Starting transcription for URI:', uri);

    try {
        const formData = new FormData();

        // In React Native, this structure is required for file uploads with FormData
        // @ts-ignore
        formData.append('file', {
            uri: uri.startsWith('file://') ? uri : `file://${uri}`,
            type: 'audio/m4a',
            name: 'recording.m4a',
        });
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', 'en'); // Force English to prevent hallucinations

        const response = await fetch(STT_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                // Do NOT set Content-Type header; it needs to include the boundary
            },
            body: formData,
        });

        const data = await response.json();
        console.log('Groq JSON Response:', data);

        if (data.error) {
            console.error('Groq Transcription Error:', data.error);
            return null;
        }

        const transcript = data.text || '';
        console.log('Transcription Result:', transcript);

        return transcript.trim() ? transcript : null;
    } catch (error) {
        console.error('Transcription Fetch Error:', error);
        return null;
    }
};

import { encode as btoa } from 'base-64';

export const generateElevenLabsSpeech = async (text: string) => {
    if (!ELEVENLABS_API_KEY) return null;

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
                'accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('ElevenLabs API error:', error);
            return null;
        }

        console.log('ElevenLabs requested TTS successfully.');
        // Get raw audio buffer
        const arrayBuffer = await response.arrayBuffer();
        console.log('ArrayBuffer retrieved, byteLength:', arrayBuffer.byteLength);

        // Safely convert ArrayBuffer to Base64 in JavaScript 
        // string.fromCharCode.apply(null, bytes) can exceed stack size, so we iterate
        let binaryString = '';
        const bytes = new Uint8Array(arrayBuffer);
        console.log('Uint8Array created');

        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binaryString += String.fromCharCode(bytes[i]);
        }
        console.log('binaryString completed, length:', binaryString.length);

        const base64Audio = btoa(binaryString);
        console.log('btoa completed.');

        // Write to a temporary file instead of returning a data URI which can crash Expo AV
        const fileUri = FileSystem.cacheDirectory + 'elevenlabs_tts.mp3';

        await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log('Audio file saved to:', fileUri);
        return fileUri;
    } catch (error) {
        console.error('ElevenLabs TTS Error internally:', error);
        return null;
    }
};
